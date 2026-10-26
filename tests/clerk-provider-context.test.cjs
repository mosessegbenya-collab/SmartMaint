const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const { Module } = require('node:module');
const ts = require('typescript');
const React = require('react');
const { renderToString } = require('react-dom/server');
// This is the same CommonJS context used by @clerk/expo's provider.
const { ClerkInstanceContext } = require('@clerk/shared/react');

const adapterPath = path.resolve('src/features/access/clerk-web-tasks.ts');
const adapterSource = fs.readFileSync(adapterPath, 'utf8');
const compiled = ts.transpileModule(adapterSource, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
});
const adapter = new Module(adapterPath, module);
adapter.filename = adapterPath;
adapter.paths = Module._nodeModulePaths(path.dirname(adapterPath));
adapter._compile(compiled.outputText, adapterPath);

function renderTask(Component) {
  return renderToString(React.createElement(ClerkInstanceContext.Provider,
    { value: { value: { loaded: false } } },
    React.createElement(Component, { fallback: React.createElement('span', null, 'Loading task') })));
}

for (const name of ['TaskChooseOrganization', 'TaskResetPassword', 'TaskSetupMFA']) {
  test(`${name} uses Expo's provider context; the ES-module variant reproduces the missing-provider error`, async () => {
    const esm = await import('@clerk/react');
    assert.throws(() => renderTask(esm[name]), /can only be used within the <ClerkProvider/);
    assert.equal(renderTask(adapter.exports[name]), '<span>Loading task</span>');
  });
}

test('web continuation keeps task imports on the SDK-compatible adapter', () => {
  const screen = fs.readFileSync('src/features/access/sso-continuation.web.tsx', 'utf8');
  assert.match(screen, /from ["']\.\/clerk-web-tasks["']/);
  for (const source of [screen, adapterSource]) {
    const ast = ts.createSourceFile('task.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    for (const statement of ast.statements) {
      if (ts.isImportDeclaration(statement) && statement.moduleSpecifier.text === '@clerk/react') {
        assert.ok(statement.importClause?.isTypeOnly, 'Runtime task imports must use the CommonJS adapter');
      }
    }
  }
  assert.match(adapterSource, /require\(["']@clerk\/react["']\)/);
});
