const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('Convex source modules and directories use deployment-safe path components', () => {
  const invalid = [];
  const root = path.resolve(__dirname, '../convex');
  const moduleExtension = /\.(?:js|mjs|cjs|ts|tsx|mts|cts|jsx)$/;
  function inspect(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const fullPath = path.join(directory, entry.name);
      if ((entry.isDirectory() || moduleExtension.test(entry.name)) && !/^[A-Za-z0-9_.]+$/.test(entry.name)) {
        invalid.push(path.relative(root, fullPath).replaceAll('\\', '/'));
      }
      // Inspect generated directories too, but non-module metadata (JSON/Markdown)
      // is not uploaded as a JavaScript module and is not subject to this rule.
      if (entry.isDirectory()) inspect(fullPath);
    }
  }
  inspect(root);
  assert.deepEqual(invalid, [], 'Convex module paths allow only alphanumeric characters, underscores, or periods');
});
