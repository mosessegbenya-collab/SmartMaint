const fs = require('node:fs'), cp = require('node:child_process'), path = require('node:path');
const adb = path.join(process.env.LOCALAPPDATA, 'Android', 'Sdk', 'platform-tools', 'adb.exe');
const serial = process.env.SMARTMAINT_DEVICE || 'emulator-5556';
const run = (...args) => cp.execFileSync(adb, ['-s', serial, ...args], { encoding: 'utf8', timeout: 30000 });
const action = (...args) => cp.execFileSync(process.execPath, ['scripts/native-validation.cjs', ...args], { encoding: 'utf8', timeout: 60000 });
const wait = (ms = 1000) => new Promise((resolve) => setTimeout(resolve, ms));
const checks = [], base = 'validation/current';
const setting = (area, key) => run('shell', 'settings', 'get', area, key).trim();
const original = { fontScale: setting('system', 'font_scale'), services: setting('secure', 'enabled_accessibility_services'), accessibility: setting('secure', 'accessibility_enabled') };
function restore(area, key, value) { if (value === 'null') run('shell', 'settings', 'delete', area, key); else run('shell', 'settings', 'put', area, key, value); }
function capture(name, scenario) { action('capture', name, scenario); return JSON.parse(fs.readFileSync(`${base}/${name}.json`, 'utf8')); }
async function main() {
  try {
    action('open', '/diagnostics'); await wait();
    action('tap', 'Verify native storage probe'); await wait();
    const before = capture('recovery-final-before-remove', 'Synthetic native recovery probe before explicit removal');
    checks.push({ scenario: 'probe restart persistence recheck', passed: before.labels.some((n) => n.text?.includes('PROBE VERIFIED')), evidence: 'recovery-final-before-remove.json' });
    action('tap', 'Remove native storage probe'); await wait(); action('tap', 'Verify native storage probe'); await wait();
    const after = capture('recovery-final-removed', 'Expected probe-missing failure after explicit removal; no live data affected');
    checks.push({ scenario: 'probe removal', passed: after.labels.some((n) => n.text?.includes('PROBE FAILED: Probe is missing')), evidence: 'recovery-final-removed.json' });
    run('shell', 'settings', 'put', 'system', 'font_scale', '2.0'); await wait();
    action('open', '/flow/settings'); await wait(); capture('settings-font-2x', 'Native system font_scale 2.0; synthetic settings top');
    action('scroll', 'up'); capture('settings-font-2x-bottom', 'Native system font_scale 2.0; scrolled settings');
    checks.push({ scenario: '2x font setting applied', passed: setting('system', 'font_scale') === '2.0', evidence: ['settings-font-2x.json', 'settings-font-2x-bottom.json'], limitation: 'Requires visual review; this is not all-screen text acceptance.' });
    restore('system', 'font_scale', original.fontScale); await wait();
    action('open', '/access/register'); await wait();
    const fields = JSON.parse(action('dump')); const name = fields.find((n) => /^(Full name|Full Name|Name)$/.test(n.label || ''));
    if (name) {
      action('tap', name.label); run('shell', 'input', 'text', 'TEST_NATIVE_ACCESSIBILITY'); await wait();
      capture('registration-keyboard', 'Synthetic full-name entry only; no registration submitted');
      const keyboard = run('shell', 'dumpsys', 'input_method'); run('shell', 'input', 'keyevent', '4');
      checks.push({ scenario: 'keyboard input', passed: /mInputShown=true|isInputViewShown\(\)=true|mIsInputViewShown=true/.test(keyboard), evidence: 'registration-keyboard.json', limitation: 'Focused-field visibility requires screenshot review.' });
    } else checks.push({ scenario: 'keyboard input', passed: false, limitation: 'Full-name control not found in the visible hierarchy; inspect registration manually.' });
    action('open', '/diagnostics'); await wait();
    const talkback = 'com.google.android.marvin.talkback/com.google.android.marvin.talkback.TalkBackService';
    run('shell', 'settings', 'put', 'secure', 'enabled_accessibility_services', original.services === 'null' || !original.services ? talkback : original.services.includes(talkback) ? original.services : `${original.services}:${talkback}`);
    run('shell', 'settings', 'put', 'secure', 'accessibility_enabled', '1'); await wait(2500);
    capture('talkback-enabled', 'TalkBack enabled on isolated diagnostics; inspect tutorial or accessibility focus');
    run('shell', 'input', 'swipe', '200', '1000', '850', '1000', '180'); await wait();
    capture('talkback-next-focus', 'TalkBack right-swipe focus traversal attempt; spoken output not recorded');
    checks.push({ scenario: 'TalkBack service activation and traversal attempt', passed: setting('secure', 'enabled_accessibility_services').includes('TalkBackService'), evidence: ['talkback-enabled.json', 'talkback-next-focus.json'], limitation: 'Service activation and screenshots do not prove speech correctness or all-screen reading/focus order.' });
  } finally {
    restore('system', 'font_scale', original.fontScale); restore('secure', 'enabled_accessibility_services', original.services); restore('secure', 'accessibility_enabled', original.accessibility);
    fs.writeFileSync(`${base}/native-accessibility-results.json`, JSON.stringify({ at: new Date().toISOString(), device: serial, original, restored: { fontScale: setting('system', 'font_scale'), services: setting('secure', 'enabled_accessibility_services'), accessibility: setting('secure', 'accessibility_enabled') }, checks }, null, 2));
  }
  console.log(JSON.stringify(checks.map(({ scenario, passed }) => ({ scenario, passed }))));
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; });
