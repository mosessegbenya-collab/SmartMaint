const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFreshHierarchy } = require('../scripts/native-hierarchy.cjs');

test('a failed Android dump cannot reuse an old successful hierarchy even when the command exits successfully', () => {
  const calls = [];
  const run = (args) => { calls.push(args); if (args[1] === 'uiautomator') return 'ERROR: null root node returned by UiTestAutomationBridge.'; return '<hierarchy><node text="STALE" /></hierarchy>'; };
  assert.throws(() => readFreshHierarchy(run, () => 'failed-dump'), /no stale file/);
  assert.ok(!calls.some((args) => args[0] === 'exec-out'));
  assert.deepEqual(calls.at(-1), ['shell', 'rm', '-f', '/sdcard/smartmaint-current-failed-dump.xml']);
});

test('each successful hierarchy reads its unique generated file and cleans only that temporary path', () => {
  const reads = [], removed = [];
  const run = (args) => {
    if (args[1] === 'uiautomator') return `UI hierchary dumped to: ${args[3]}`;
    if (args[0] === 'exec-out') { reads.push(args[2]); return '<hierarchy><node text="CURRENT" /></hierarchy>'; }
    removed.push(args[3]); return '';
  };
  for (const id of ['first', 'second']) assert.ok(readFreshHierarchy(run, () => id).includes('CURRENT'));
  assert.deepEqual(reads, ['/sdcard/smartmaint-current-first.xml', '/sdcard/smartmaint-current-second.xml']);
  assert.deepEqual(removed, reads);
});
