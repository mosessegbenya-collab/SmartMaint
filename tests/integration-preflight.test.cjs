const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { preflight } = require('../scripts/integration-preflight.cjs');

test('preflight respects Expo environment precedence, explicit empty process values and local-only issuer limits', (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'smartmaint-preflight-'));
  t.after(() => { assert.ok(path.resolve(root).startsWith(path.resolve(os.tmpdir()) + path.sep)); fs.rmSync(root, { recursive: true }); });
  fs.writeFileSync(path.join(root, '.env'), 'EXPO_PUBLIC_CONVEX_URL=https://base.invalid\nEXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=invalid\n');
  fs.writeFileSync(path.join(root, '.env.local'), 'EXPO_PUBLIC_CONVEX_URL=https://local.invalid\nEXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_fixture\n');
  fs.writeFileSync(path.join(root, '.env.development.local'), 'EXPO_PUBLIC_CONVEX_URL=invalid\n');
  const result = preflight(root, {});
  assert.equal(result.checks.find((c) => c.name === 'EXPO_PUBLIC_CONVEX_URL').shapeValid, false);
  assert.equal(result.checks.find((c) => c.name === 'EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY').shapeValid, true);
  assert.equal(preflight(root, { EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY: '' }).checks[0].present, false);
  assert.equal(result.deploymentIssuerVerified, false);
  assert.equal(result.externalCalls, false);
  assert.ok(!JSON.stringify(result).includes('pk_test_fixture'));
});

test('preflight rejects credential-bearing and path-bearing service URLs without printing values', () => {
  const result = preflight('.', { EXPO_NO_DOTENV: '1', EXPO_PUBLIC_CONVEX_URL: 'https://user:secret@example.invalid/', CLERK_JWT_ISSUER_DOMAIN: 'https://example.invalid/wrong-path', EXPO_PUBLIC_CLERK_SECRET: 'never-log-this' });
  assert.equal(result.checks.find((c) => c.name === 'EXPO_PUBLIC_CONVEX_URL').shapeValid, false);
  assert.equal(result.checks.find((c) => c.name === 'CLERK_JWT_ISSUER_DOMAIN').shapeValid, false);
  assert.deepEqual(result.unsafePublicVariableNames, ['EXPO_PUBLIC_CLERK_SECRET']);
  assert.ok(!JSON.stringify(result).includes('never-log-this'));
  assert.ok(!JSON.stringify(result).includes('user:secret'));
});
