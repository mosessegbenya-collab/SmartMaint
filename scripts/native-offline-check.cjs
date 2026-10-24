const fs = require('node:fs'), cp = require('node:child_process'), path = require('node:path');
const serial = process.env.SMARTMAINT_DEVICE || 'emulator-5556';
const adb = path.join(process.env.LOCALAPPDATA, 'Android', 'Sdk', 'platform-tools', 'adb.exe');
const run = (...args) => cp.execFileSync(adb, ['-s', serial, ...args], { encoding: 'utf8', timeout: 30000 });
const action = (...args) => cp.execFileSync(process.execPath, ['scripts/native-validation.cjs', ...args], { encoding: 'utf8', timeout: 60000 });
const pause = () => new Promise((resolve) => setTimeout(resolve, 1500));
const setting = (key) => run('shell', 'settings', 'get', 'global', key).trim();
const original = { airplane: setting('airplane_mode_on'), wifi: setting('wifi_on'), mobile: setting('mobile_data') };
const results = [];
async function ready() {
  action('open', '/diagnostics');
  for (let i = 0; i < 10; i++) {
    try { if (JSON.parse(action('dump')).some((n) => n.label === 'Verify native storage probe')) return; } catch { /* Startup may not expose a hierarchy yet. */ }
    await pause(); if (i % 3 === 2) action('open', '/diagnostics');
  }
  throw Error('Native probe UI did not become ready; no recovery acceptance recorded.');
}
function capture(name, scenario) { action('capture', name, scenario); return JSON.parse(fs.readFileSync(`validation/current/${name}.json`, 'utf8')); }
async function main() {
  try {
    await ready(); action('tap', 'Save native storage probe'); await pause();
    capture('final-offline-before', 'Final source encrypted draft/photo saved before offline restart');
    run('shell', 'cmd', 'connectivity', 'airplane-mode', 'enable'); run('shell', 'svc', 'wifi', 'disable'); run('shell', 'svc', 'data', 'disable');
    results.push({ scenario: 'network disabled', settings: { airplane: setting('airplane_mode_on'), wifi: setting('wifi_on'), mobile: setting('mobile_data') } });
    run('shell', 'am', 'force-stop', 'com.anonymous.SmartMaint');
    run('shell', 'am', 'start', '-a', 'android.intent.action.VIEW', '-d', 'smartmaint://expo-development-client/?url=http%3A%2F%2F127.0.0.1%3A8083', '-p', 'com.anonymous.SmartMaint');
    await pause(); await ready(); action('tap', 'Verify native storage probe'); await pause();
    const verified = capture('final-offline-restarted', 'Final source; real restart with airplane mode enabled and WiFi/mobile disabled; synthetic local recovery via adb-reversed Metro');
    results.push({ scenario: 'final offline restart recovery', passed: verified.labels.some((n) => n.text?.includes('PROBE VERIFIED')), evidence: 'final-offline-restarted.json' });
    action('tap', 'Remove native storage probe'); await pause(); action('tap', 'Verify native storage probe'); await pause();
    const removed = capture('final-offline-cleanup', 'Expected missing-probe result after explicit synthetic cleanup');
    results.push({ scenario: 'synthetic probe cleanup', passed: removed.labels.some((n) => n.text?.includes('PROBE FAILED: Probe is missing')), evidence: 'final-offline-cleanup.json' });
  } finally {
    run('shell', 'cmd', 'connectivity', 'airplane-mode', original.airplane === '1' ? 'enable' : 'disable');
    run('shell', 'svc', 'wifi', original.wifi === '1' ? 'enable' : 'disable'); run('shell', 'svc', 'data', original.mobile === '1' ? 'enable' : 'disable');
    fs.writeFileSync('validation/current/final-offline-results.json', JSON.stringify({ at: new Date().toISOString(), device: serial, original, restored: { airplane: setting('airplane_mode_on'), wifi: setting('wifi_on'), mobile: setting('mobile_data') }, source: require('./validation-state.cjs').snapshot(), results }, null, 2));
  }
  console.log(JSON.stringify(results)); if (results.some((r) => r.passed === false)) process.exitCode = 1;
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; });
