// Reproducible evidence baseline. This never marks a screen verified from source presence.
const fs = require('node:fs');
const path = require('node:path');
const inventory = JSON.parse(fs.readFileSync('artifacts/design-inventory.json', 'utf8'));
if (inventory.length !== 73 || new Set(inventory.map(r => r.reference)).size !== 73) throw Error('Expected 73 distinct approved reference files');
const scan = [];
const dispatcher = fs.readFileSync('src/features/staff/workspace.tsx', 'utf8').split('export function LiveFlow')[1];
const liveRoutes = new Set([...dispatcher.matchAll(/screen === ["']([^"']+)["']/g)].map((m) => m[1]));
for (const group of dispatcher.matchAll(/\[([^\]]+)\]\.includes\(screen\)/g)) for (const quoted of group[1].matchAll(/["']([^"']+)["']/g)) liveRoutes.add(quoted[1]);
for (const shared of ['settings', 'notification-settings', 'help']) liveRoutes.add(shared);
function walk(dir) { return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]); }
for (const file of [...walk('src'), ...walk('convex')].filter(f => /\.(tsx?|cjs)$/.test(f))) {
  fs.readFileSync(file, 'utf8').split(/\r?\n/).forEach((line, i) => {
    if (/Workflow unavailable|Coming soon|TODO|FIXME|Not implemented|Placeholder|\bMock\b|Preview only|Simulated acknowledgment|=>\s*\{\s*\}|return\s*\{\s*success\s*:\s*true/i.test(line)) scan.push({ file, line: i + 1, text: line.trim(), classification: /placeholder(?:=|TextColor)/i.test(line) ? 'Input hint/style (not a backend stub)' : /fixtures|development|features[\\/]workflows|features[\\/]workspace/.test(file) ? 'Preview or shared source; inspect live dispatcher' : /models|report-queue/.test(file) && /Simulated acknowledgment|catch\(\(\) => \{\}\)/.test(line) ? 'Preview contract or storage error continuation; not a visible success control' : 'Live/shared source or unavailable-context default; requires review' });
  });
}
fs.mkdirSync('validation', { recursive: true });
fs.writeFileSync('validation/placeholder-scan.json', JSON.stringify(scan, null, 2) + '\n');
const rows = inventory.map((r, index) => {
  const number = String(index + 1).padStart(2, '0');
  const directory = `validation/screens/${number}`;
  if (!fs.existsSync(r.reference)) throw Error(`Missing reference: ${r.reference}`);
  fs.mkdirSync(directory, { recursive: true });
  fs.copyFileSync(r.reference, `${directory}/reference${path.extname(r.reference)}`);
  const component = r.screen === 'welcome' ? 'src/features/access/screens.tsx (WelcomeScreen)' : /access/.test(r.route) ? 'src/features/access/screens.tsx + email-auth.tsx'
    : r.screen === 'home' ? 'src/features/staff/dashboard-screens.tsx (role-specific live grids; runtime fidelity pending)'
    : r.screen === 'emergency' ? 'src/features/staff/emergency-introduction.tsx'
    : /^(role|suspend|audit|staff-)/.test(r.screen) ? 'src/features/staff/administration.tsx'
    : /^(technical|clinical)-queue$/.test(r.screen) ? 'src/features/staff/operational-screens.tsx (shared verifier list)'
    : /technical|clinical|verification|release|availability/.test(r.screen) ? 'src/features/staff/safety-screens.tsx'
    : /^(camera|attachments|fault-details|review)$/.test(r.screen) ? 'src/features/staff/reporting-journey.tsx + report-photos.tsx'
    : /^(sync|queue|conflict|upload-failed)$/.test(r.screen) ? 'src/features/staff/report-queue.tsx'
    : /scan|manual|provisional|hold|report-detail|triage|equipment-history|status-timeline|equipment-detail|reconcile|filters|submitted|emergency-result/.test(r.screen) ? 'src/features/staff/operational-screens.tsx'
    : 'src/features/staff/workspace.tsx (shared live workflow; reference-specific fidelity pending)';
  const prior = fs.existsSync(`${directory}/evidence.json`) ? JSON.parse(fs.readFileSync(`${directory}/evidence.json`, 'utf8')) : {};
  const hasLiveBranch = !r.route.startsWith('/flow/') || liveRoutes.has(r.route.slice('/flow/'.length));
  const implementation = hasLiveBranch ? 'Partial' : 'No branch at mapped live route; preview/candidate source exists';
  const record = { number, ...r, component, sourceStatus: implementation, authenticatedAccess: 'Requires configured backend and approved account where protected; runtime role-route testing pending', controls: prior.controls ?? 'Not tested on live deployment', backend: 'Blocked: no deployment', authorization: 'Mock tests only; live validation pending', offline: 'Not accepted', screenshot: prior.screenshot ?? null, comparison: prior.comparison ?? null, visual: prior.visual ?? 'Not tested', accessibility: prior.accessibility ?? 'Not tested', discrepancies: prior.discrepancies, runtime: prior.runtime, supplementalScreenshots: prior.supplementalScreenshots ?? [], finalStatus: 'Partial / Blocked' };
  fs.writeFileSync(`${directory}/evidence.json`, JSON.stringify(record, null, 2) + '\n');
  return `| ${number} | ${path.basename(r.reference)} | ${r.route} | ${component} | ${implementation} | Not verified | ${record.controls} | Blocked | Mock tests only | Not accepted | ${record.screenshot ?? 'None'} | ${record.visual} | ${record.accessibility} | Partial / Blocked |`;
});
const header = '# SmartMaint 73-screen matrix\n\nCorrective baseline: 2026-10-24. All 73 source files exist and were copied to numbered validation/screens folders. Numbering follows the actual inventory; reference names are unchanged. No runtime screenshots, controls, accessibility or visual passes are inferred from source. “Not tested” is used rather than inventing a pass/fail.\n\n| No. | Approved reference | Route | Component / source | Implemented | Authenticated access | Controls | Backend | Authorization | Offline | Screenshot | Visual | Accessibility | Final status |\n| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |\n';
fs.writeFileSync('SMARTMAINT_73_SCREEN_MATRIX.md', header + rows.join('\n') + '\n');
fs.writeFileSync('validation/live-route-scan.json', JSON.stringify({ implementedFlowBranchNames: [...liveRoutes].sort(), mappedReferencesWithoutLiveBranch: inventory.filter((r) => r.route.startsWith('/flow/') && !liveRoutes.has(r.route.slice('/flow/'.length))) }, null, 2) + '\n');
fs.writeFileSync('SMARTMAINT_IMPLEMENTATION_AUDIT.md', '# SmartMaint corrective implementation audit\n\nSee SMARTMAINT_73_SCREEN_MATRIX.md for all 73 actual reference identities, routes and acceptance gaps. See validation/placeholder-scan.json for every matched source occurrence and its initial classification. Placeholder input hints are not classified as fake backend implementations.\n\nThe live dispatcher is independent of preview workflow source. All mapped reference routes now have dispatcher branches, including shared work-order, verifier, account-control and reporting views. A branch is not a distinct faithful screen or accepted workflow. Missing required record IDs lead to authorized lists; no fictional record is substituted. Reconciliation is a real read-only provisional-report review while policy remains disabled.\n\nCorrective source adds paginated scoped inventory/reports/tasks, server-side report filters, independent verifier queues, equipment timelines, private resumable reporting drafts, authenticated photos, review/publication conflicts, immutable work and verification history, linked rework, atomic policy-bound release/hold controls, preventive schedules, Inter font assets and an encrypted native publication queue. The queue only publishes already-saved server drafts; full offline reporting is unfinished. All newly wired views still require native control, visual and accessibility acceptance.\n\nNo deployment or approved verification policy exists; live integration remains unaccepted. Two public screens were captured and compared, both need visual correction; seven public controls were sampled successfully. See the workflow, native build and remaining-issues reports for current results. No full screen is accepted.\n');
console.log(`Inventoried ${inventory.length} references; recorded ${scan.length} source matches. No acceptance gates fabricated.`);
