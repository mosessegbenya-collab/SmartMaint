const fs = require('node:fs');
const base = 'validation/current';
const target = `${base}/screens.json`;
const inventory = JSON.parse(fs.readFileSync(target, 'utf8'));
const files = fs.readdirSync(base).filter((f) => /^reference-captures-.*\.json$/.test(f));
const captures = files.flatMap((file) => JSON.parse(fs.readFileSync(`${base}/${file}`, 'utf8')));
if (fs.existsSync(`${base}/welcome-final-1x.json`)) {
  const record = JSON.parse(fs.readFileSync(`${base}/welcome-final-1x.json`, 'utf8'));
  captures.push({ number: 65, role: 'public-final', evidence: 'welcome-final-1x.json', labels: record.labels.map((n) => n.text || n.label).filter(Boolean) });
}
let captured = 0, reached = 0;
for (const item of inventory.screens) {
  const attempts = captures.filter((c) => c.number === item.number && c.evidence && fs.existsSync(`${base}/${c.evidence}`));
  const good = attempts.filter((c) => {
    const labels = c.labels.join('\n');
    const signInPage = labels.includes('Staff Sign In') && labels.includes('Access your account to continue to SmartMaint.');
    return item.number !== 41 && !(item.number !== 16 && signInPage) && !/System UI isn't responding|EXPO_UNMATCHED_ROUTE/.test(labels);
  });
  const last = good.at(-1);
  if (attempts.length) captured++;
  if (last) reached++;
  item.android = {
    status: last ? 'Native synthetic/public variant captured; matching-state acceptance pending' : attempts.length ? 'Attempt captured a redirect or wrong state; excluded from coverage' : 'Not captured in this pass',
    evidence: attempts.map((c) => `${base}/${c.evidence}`),
    preferredEvidence: last ? `${base}/${last.evidence}` : null,
    matchingStateAccepted: false,
    liveAccepted: false,
  };
  item.accessibility.keyboard = 'pending per-state native input/focus test';
  item.accessibility.safeAreas = 'pending per-state comparison';
  item.accessibility.labels = last ? 'Native hierarchy captured; spoken labels not yet accepted' : 'not run';
  if (item.number === 65) item.accessibility.textScaling = '2x native header regression fixed and captured in welcome-final-2x.json; full screen scaling acceptance pending';
  if (item.number === 40) item.accessibility.keyboard = 'Native keyboard and visible focused field captured in equipment-keyboard.json; other fields and devices pending';
  if (item.number === 72) item.accessibility.cameraPermission = 'Android denial captured in camera-denied.json; physical camera and gallery acceptance pending';
  item.blockers = ['Exact reference-state and full accessibility comparison remains pending', 'Live integration requires selected deployment and approved accounts/policy'];
  if (item.number === 41) item.blockers.unshift('Distinct splash reference not captured: its mapped / route shows welcome');
}
inventory.updatedAt = new Date().toISOString();
inventory.coverage = { total: 73, requestedRoutesWithArtifacts: captured, nativeVariantsReached: reached, matchingStatesAccepted: 0, liveStatesAccepted: 0, note: 'Native synthetic variants and auth denials are separate from matching-state or live acceptance.' };
fs.writeFileSync(target, JSON.stringify(inventory, null, 2));
const header = '# SmartMaint current acceptance checklist\n\nUpdated '+inventory.updatedAt+'. All 73 references remain tracked. Native variants and denial captures do not establish matching-state, accessibility or live acceptance. See `ACCEPTANCE_PLAN.md`, `FINAL_ACCEPTANCE_PASS.md` and `screens.json` for scenarios, prerequisites and evidence.\n\n';
const columns = '| No. | Reference | Route | Native Android evidence | Matching state | iOS / live |\n| --- | --- | --- | --- | --- | --- |\n';
const rows = inventory.screens.map((s) => `| ${s.number} | ${s.reference} | ${s.route} | ${s.android.preferredEvidence ? `[Synthetic/public variant](${s.android.preferredEvidence.split('/').at(-1)})` : s.android.evidence.length ? 'Redirect/wrong state captured; excluded' : 'Pending'} | Pending | Pending supported iOS device / approved deployment |`).join('\n');
fs.writeFileSync(`${base}/CHECKLIST.md`, header + columns + rows + '\n');
console.log(JSON.stringify(inventory.coverage));
