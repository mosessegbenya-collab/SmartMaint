const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');

const files = [...new Set(execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '--', 'src', 'convex', 'tests', 'package.json', 'package-lock.json', 'tsconfig.json', 'eslint.config.js', 'app.json'], { encoding: 'utf8' }).trim().split(/\r?\n/))].sort();
const sha256 = (file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const logs = ['before-fixes.log', 'before-safety.log', 'before-photo-ui.log', 'reconciliation-conflict-before.log', 'focused-fixes.log', 'photo-ui-fixes.log', 'full-tests.log', 'lint.log', 'typecheck.log'];
const record = {
  recordedAt: new Date().toISOString(),
  head: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  installed: { expo: require('expo/package.json').version, convex: require('convex/package.json').version, vitest: require('vitest/package.json').version },
  purpose: 'Hashes only. This recorder does not run or certify tests; outcomes and execution context are recorded in README.md and the linked logs.',
  files: Object.fromEntries(files.map((file) => [file, sha256(file)])),
  logs: Object.fromEntries(logs.map((file) => [file, sha256(path.join(__dirname, file))])),
};
fs.writeFileSync(path.join(__dirname, 'source-manifest.json'), JSON.stringify(record, null, 2) + '\n');
console.log(`Recorded ${files.length} source/configuration hashes for ${record.head}.`);
