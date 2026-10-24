const fs = require('node:fs');
const cp = require('node:child_process');
const [role, selected] = process.argv.slice(2);
if (!/^[a-z-]+$/.test(role || '') || !/^\d+(,\d+)*$/.test(selected || '')) throw Error('Usage: node scripts/native-reference-capture.cjs role 1,2,3');
const screens = JSON.parse(fs.readFileSync('validation/current/screens.json', 'utf8')).screens;
const numbers = selected.split(',').map(Number);
const results = [];
function action(...args) { return cp.execFileSync(process.execPath, ['scripts/native-validation.cjs', ...args], { encoding: 'utf8', timeout: 60000 }); }
async function main() {
  await new Promise((resolve) => setTimeout(resolve, 2000));
  for (const number of numbers) {
    const item = screens.find((s) => s.number === number); if (!item) throw Error('Unknown reference ' + number);
    const name = `reference-${String(number).padStart(2, '0')}-${role}`;
    try {
      action('open', item.route);
      await new Promise((resolve) => setTimeout(resolve, 1500));
      action('capture', name, `Reference ${number}; ${role}; synthetic-only data; capture requires separate matching-state and visual review`);
      let evidence = JSON.parse(fs.readFileSync(`validation/current/${name}.json`, 'utf8'));
      if (number !== 16 && evidence.labels.some((n) => n.text === 'Staff Sign In') && evidence.labels.some((n) => n.text === 'Access your account to continue to SmartMaint.')) {
        console.log(`Retrying ${number}: navigation was still on sign-in; no coverage granted for that capture`);
        action('open', item.route);
        await new Promise((resolve) => setTimeout(resolve, 1500));
        action('capture', name, `Reference ${number}; ${role}; synthetic-only; navigation retry after sign-in capture; requires separate comparison`);
        evidence = JSON.parse(fs.readFileSync(`validation/current/${name}.json`, 'utf8'));
      }
      results.push({ number, role, reference: item.reference, route: item.route, evidence: `${name}.json`, labels: evidence.labels.filter((n) => n.text).map((n) => n.text), status: 'captured; comparison pending; synthetic only' });
      console.log(`Captured ${number}: ${item.screen}`);
    } catch (error) { results.push({ number, role, status: 'capture failed', error: error.message }); console.log(`Failed ${number}: ${error.message.split('\n')[0]}`); }
    fs.writeFileSync(`validation/current/reference-captures-${role}.json`, JSON.stringify(results, null, 2));
  }
}
main().catch((e) => { console.error(e); process.exitCode = 1; });
