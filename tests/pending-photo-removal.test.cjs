const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');

test('review 6: confirmed removal is available from pending metadata even when restoring a photo fails', async () => {
  const pending = [{ operationId: 'INTACT', size: 12, contentType: 'image/png' }, { operationId: 'MISSING', size: 12, contentType: 'image/png' }];
  const state = [pending, true, null, null, '', false];
  let hook = 0, effectHook = 0, eligibleCount, decrypts = 0;
  const effects = [];
  const account = { id: 'OWNER', scope: ['DEPT'] };
  const repo = {
    list: async () => [{ operationId: 'DRAFT', departmentId: 'DEPT', photos: state[0] }],
    readPhoto: async () => { decrypts++; throw Error('Missing/corrupt ciphertext'); },
    removePhoto: async (owner, draft, id) => {
      assert.equal(owner, 'OWNER'); assert.equal(draft, 'DRAFT');
      state[0] = state[0].filter((p) => p.operationId !== id);
    },
  };
  const jsx = (type, props) => ({ type, props });
  const mocks = {
    react: { useState: () => { const index = hook++; return [state[index], (value) => { state[index] = value; }]; }, useEffect: (effect, deps) => { const index = effectHook++; if (!effects[index] || deps.some((value, i) => value !== effects[index][i])) { effects[index] = deps; effect(); } } },
    'react/jsx-runtime': { jsx, jsxs: jsx, Fragment: 'Fragment' },
    'react-native': { Image: 'Image' }, 'expo-image-picker': {}, 'expo-crypto': {},
    'convex/react': { useQuery: () => ({ items: [], revision: 0 }), useAction: () => async () => {}, useMutation: () => async () => {} },
    '@/components/smart/ui': Object.fromEntries(['Button', 'Card', 'Detail', 'Notice', 'Txt'].map((n) => [n, n])),
    '@/services/staff-api': { staffApi: { attachments: { list: {}, upload: {}, read: {}, remove: {} } } },
    '@/features/access/auth-policy': { authErrorMessage: (error) => error.message },
    '@/services/report-recovery': { reportRecovery: repo },
    './provider': { useStaffAccess: () => ({ account }) },
    './ui': { ConfirmAction: 'ConfirmAction' },
  };
  const output = ts.transpileModule(fs.readFileSync('src/features/staff/report-photos.tsx', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const mod = { exports: {} };
  new Function('require', 'exports', 'module', output)((id) => { assert.ok(id in mocks, `Unexpected dependency ${id}`); return mocks[id]; }, mod.exports, mod);
  const props = { reportId: 'REPORT', editable: true, recoveryOperationId: 'DRAFT', onPendingChange: (count) => { eligibleCount = count; } };
  function render() { hook = 0; effectHook = 0; return mod.exports.ReportPhotos(props); }
  function nodes(root) {
    if (!root || typeof root !== 'object') return [];
    if (Array.isArray(root)) return root.flatMap(nodes);
    return [root, ...nodes(root.props?.children)];
  }
  let tree = render();
  assert.equal(eligibleCount, 2);
  const restore = nodes(tree).find((n) => n.props?.label === 'Restore pending photo 2');
  restore.props.onPress();
  await new Promise(setImmediate);
  tree = render();
  assert.equal(decrypts, 1);
  const remove = nodes(tree).find((n) => n.type === 'ConfirmAction' && n.props.label === 'Remove pending photo 2');
  assert.ok(remove, 'Unavailable pending photo needs its own confirmation directly from metadata');
  assert.match(remove.props.detail, /pending|device/i);
  assert.deepEqual(state[0].map((p) => p.operationId), ['INTACT', 'MISSING']); // Merely showing confirmation deletes nothing.
  await remove.props.onConfirm();
  render();
  assert.equal(decrypts, 1, 'Removal must not require decryption');
  assert.deepEqual(state[0].map((p) => p.operationId), ['INTACT']);
  assert.equal(eligibleCount, 1, 'Intact pending photo still blocks publication');
});
