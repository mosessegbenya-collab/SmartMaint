const fs = require('node:fs'), cp = require('node:child_process'), path = require('node:path');
const base = 'validation/continuation-2026-10-25';
const serial = process.env.SMARTMAINT_DEVICE || 'emulator-5556';
const adb = path.join(process.env.LOCALAPPDATA, 'Android/Sdk/platform-tools/adb.exe');
const run = (args, binary = false) => cp.execFileSync(adb, ['-s', serial, ...args], { timeout: 30000, maxBuffer: 16 * 1024 * 1024, ...(binary ? {} : { encoding: 'utf8' }) });
const dump = () => require('./native-hierarchy.cjs').readFreshHierarchy(run);
const nodes = (xml) => [...xml.matchAll(/<node\b[^>]+>/g)].map((m) => Object.fromEntries([...m[0].matchAll(/([\w-]+)="([^"]*)"/g)].map((a) => [a[1], a[2].replaceAll('&amp;', '&').replaceAll('&quot;', '"')])));
const [action, arg] = process.argv.slice(2);
if (action === 'open') { if (!arg?.startsWith('/')) throw Error('App route required'); run(['shell', 'am', 'start', '-a', 'android.intent.action.VIEW', '-d', `"smartmaint:/${arg}"`, '-p', 'com.anonymous.SmartMaint']); }
else if (action === 'dump') console.log(JSON.stringify(nodes(dump()).filter((n) => n.text || n['content-desc']).map((n) => ({ text: n.text, label: n['content-desc'], bounds: n.bounds })), null, 2));
else if (action === 'tap') { const n = nodes(dump()).find((n) => n['content-desc'] === arg || n.text === arg); if (!n) throw Error('Control missing: ' + arg); const b = n.bounds.match(/\d+/g).map(Number); run(['shell', 'input', 'tap', String((b[0] + b[2]) / 2 | 0), String((b[1] + b[3]) / 2 | 0)]); }
else if (action === 'capture') {
  if (!/^[a-z0-9-]+$/.test(arg || '')) throw Error('Capture name required');
  const xml = dump(); fs.writeFileSync(`${base}/${arg}.xml`, xml); fs.writeFileSync(`${base}/${arg}.png`, run(['exec-out', 'screencap', '-p'], true));
  fs.writeFileSync(`${base}/${arg}.json`, JSON.stringify({ at: new Date().toISOString(), serial, source: require('./validation-state.cjs').snapshot(), labels: nodes(xml).filter((n) => n.text || n['content-desc']).map((n) => ({ text: n.text, label: n['content-desc'] })) }, null, 2)); console.log(`${base}/${arg}.png`);
} else throw Error('Use open, dump, tap or capture');
