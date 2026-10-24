const fs = require('node:fs'), cp = require('node:child_process'), path = require('node:path');
const adb = path.join(process.env.LOCALAPPDATA, 'Android', 'Sdk', 'platform-tools', 'adb.exe');
const serial = process.env.SMARTMAINT_DEVICE || 'emulator-5556';
const run = (...args) => cp.execFileSync(adb, ['-s', serial, ...args], { encoding: 'utf8', timeout: 30000 });
const action = (...args) => cp.execFileSync(process.execPath, ['scripts/native-validation.cjs', ...args], { encoding: 'utf8', timeout: 60000 });
const pause = () => new Promise((resolve) => setTimeout(resolve, 1500));
const results = [];
const originalScale = run('shell', 'settings', 'get', 'system', 'font_scale').trim();
function capture(name, scenario) { action('capture', name, scenario); return JSON.parse(fs.readFileSync(`validation/current/${name}.json`, 'utf8')); }
async function waitForProbe() {
  for (let attempt = 0; attempt < 10; attempt++) {
    try { if (JSON.parse(action('dump')).some((n) => n.label === 'Verify native storage probe')) return; }
    catch { /* Startup may not yet expose a UI hierarchy. The final timeout remains a failure. */ }
    await pause();
    if (attempt % 3 === 2) action('open', '/diagnostics');
  }
  throw Error('The storage probe UI did not become ready after restart. No storage acceptance was recorded.');
}
async function main() {
  try {
    action('open', '/'); await pause(); capture('welcome-final-1x', 'Final source; public synthetic-runtime welcome, font scale 1x');
    run('shell', 'settings', 'put', 'system', 'font_scale', '2.0'); await pause();
    action('open', '/'); await pause(); capture('welcome-final-2x', 'Final source; 2x system font; verify wrapped brand/date and button labels');
    results.push({ scenario: 'welcome header 2x', evidence: ['welcome-final-1x.json', 'welcome-final-2x.json'], status: 'captured; visual review required' });
  } finally {
    if (originalScale === 'null') run('shell', 'settings', 'delete', 'system', 'font_scale'); else run('shell', 'settings', 'put', 'system', 'font_scale', originalScale);
  }
  await pause(); action('open', '/diagnostics'); await waitForProbe();
  action('tap', 'Save native storage probe'); await pause();
  const saved = capture('recovery-final-budget-saved', 'Final bounded native storage adapter saved synthetic draft/photo');
  results.push({ scenario: 'native quota adapter save', passed: saved.labels.some((n) => n.text?.includes('PROBE SAVED')), evidence: 'recovery-final-budget-saved.json' });
  run('shell', 'am', 'force-stop', 'com.anonymous.SmartMaint');
  run('shell', 'am', 'start', '-a', 'android.intent.action.VIEW', '-d', 'smartmaint://expo-development-client/?url=http%3A%2F%2F127.0.0.1%3A8083', '-p', 'com.anonymous.SmartMaint');
  await pause(); action('open', '/diagnostics'); await waitForProbe();
  action('tap', 'Verify native storage probe'); await pause();
  const verified = capture('recovery-final-budget-restarted', 'Final adapter; real force-stop/relaunch; native encrypted contents and owner isolation');
  results.push({ scenario: 'final native restart', passed: verified.labels.some((n) => n.text?.includes('PROBE VERIFIED')), evidence: 'recovery-final-budget-restarted.json' });
  action('tap', 'Remove native storage probe'); await pause();
  action('tap', 'Verify native storage probe'); await pause();
  const removed = capture('recovery-final-budget-removed', 'Expected missing probe after explicit synthetic cleanup');
  results.push({ scenario: 'final synthetic cleanup', passed: removed.labels.some((n) => n.text?.includes('PROBE FAILED: Probe is missing')), evidence: 'recovery-final-budget-removed.json' });
  fs.writeFileSync('validation/current/native-final-results.json', JSON.stringify({ at: new Date().toISOString(), device: serial, originalScale, restoredScale: run('shell', 'settings', 'get', 'system', 'font_scale').trim(), source: require('./validation-state.cjs').snapshot(), results }, null, 2));
  console.log(JSON.stringify(results));
  if (results.some((r) => r.passed === false)) process.exitCode = 1;
}
main().catch((error) => { fs.writeFileSync('validation/current/native-final-error.json', JSON.stringify({ error: error.message, completed: results }, null, 2)); console.error(error.message); process.exitCode = 1; });
