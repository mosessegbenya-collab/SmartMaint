const cp = require('node:child_process');
const role = process.argv[2];
const roles = ['Clinician', 'Biomedical Technician', 'Unit Head', 'Maintenance Supervisor', 'Equipment Department Head', 'Technical Services Director', 'Administrator', 'Registration Approver'];
if (!roles.includes(role)) throw Error('Specify an existing fictional preview role. This helper grants no live access.');
const action = (...args) => cp.execFileSync(process.execPath, ['scripts/native-validation.cjs', ...args], { encoding: 'utf8', timeout: 60000 });
const pause = () => new Promise((resolve) => setTimeout(resolve, 1000));
async function main() {
  action('open', '/access/sign-in'); await pause();
  for (let i = 0; i < 3; i++) {
    const nodes = JSON.parse(action('dump'));
    const picker = nodes.find((n) => n.label?.startsWith('Preview role:') && Number(n.bounds.match(/\d+/g)?.[3]) > Number(n.bounds.match(/\d+/g)?.[1]));
    if (picker) { action('tap', picker.label); await pause(); action('tap', role); await pause(); break; }
    if (i === 2) throw Error('Existing preview picker is unavailable; identity may be loading or signed in. Do not bypass authorization.');
    action('scroll', 'up'); await pause();
  }
  for (let i = 0; i < 3; i++) {
    const nodes = JSON.parse(action('dump'));
    if (nodes.some((n) => n.label === 'Open development preview')) { action('tap', 'Open development preview'); await pause(); console.log('Entered fictional preview role: ' + role); return; }
    action('scroll', 'up'); await pause();
  }
  throw Error('Preview entry button unavailable.');
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; });
