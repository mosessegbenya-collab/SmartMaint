const fs = require('node:fs');
const cp = require('node:child_process');
const crypto = require('node:crypto');
const hash = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
function snapshot() {
  const paths = cp.execFileSync('git', ['ls-files', '-co', '--exclude-standard', '--', 'src', 'convex', 'tests', 'scripts', 'plugins', 'package.json', 'package-lock.json', 'app.json', 'app.config.ts', 'tsconfig.json', 'metro.config.js', 'babel.config.js'], { encoding: 'utf8' }).split(/\r?\n/).filter(Boolean);
  const files = [...new Set(paths)].sort().filter((p) => fs.existsSync(p) && fs.statSync(p).isFile()).map((p) => ({ path: p.replaceAll('\\', '/'), sha256: hash(fs.readFileSync(p)) }));
  return { at: new Date().toISOString(), head: cp.execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), sourceSha256: hash(JSON.stringify(files)), files, note: 'Includes uncommitted tracked and untracked source; excludes credentials, screenshots and validation logs.' };
}
module.exports = { snapshot };
if (require.main === module) {
  const target = 'validation/current/workspace-state.json';
  fs.mkdirSync('validation/current', { recursive: true });
  const state = snapshot(); fs.writeFileSync(target, JSON.stringify(state, null, 2));
  console.log(JSON.stringify({ target, head: state.head, sourceSha256: state.sourceSha256, files: state.files.length }));
}
