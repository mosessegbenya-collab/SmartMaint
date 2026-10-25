import { test, expect } from "vitest";
import { convexTest } from "convex-test";
import schema from "../../convex/schema";
import { staffApi as api } from "../../src/services/staff-api";
import { POLICY_VERSION, roleCapabilities } from "../../src/domain/role-policy";
import type { Role } from "../../src/domain/models";
import type { FunctionReturnType } from "convex/server";
import { EncryptedReportQueue } from "../../src/domain/report-queue";
import { PublicationCoordinator } from "../../src/domain/publication-coordinator";

const modules = { "./extensions.ts": () => import("../../convex/extensions"), "./staff.ts": () => import("../../convex/staff"), "./administration.ts": () => import("../../convex/administration"), "./operations.ts": () => import("../../convex/operations"), "./workflows.ts": () => import("../../convex/workflows"), "./reporting.ts": () => import("../../convex/reporting"), "./attachments.ts": () => import("../../convex/attachments"), "./safety.ts": () => import("../../convex/safety"), "./preventive.ts": () => import("../../convex/preventive"), "./_generated/loader-marker.js": async () => ({}) };
const identity = (subject: string) => ({ subject, tokenIdentifier: `https://test.invalid|${subject}`, email: `${subject}@example.invalid`, emailVerified: true });
async function setup() {
  const t = convexTest(schema, modules);
  const records = await t.run(async (ctx) => {
    const a = await ctx.db.insert("departments", { code: "A", name: "Test A", active: true }); const b = await ctx.db.insert("departments", { code: "B", name: "Test B", active: true });
    await ctx.db.insert("accessPolicy", { key: "staff-access", version: POLICY_VERSION, institutionalPolicyReference: "TEST-ONLY", manualVerificationEnabled: false, configuredAt: Date.now() });
    const seed = (subject: string, role: Role, scope = [a]) => ctx.db.insert("staffAccounts", { identity: identity(subject).tokenIdentifier, clerkUserId: subject, email: identity(subject).email, verifiedStaffId: `TEST-${subject}`, fullName: subject, departmentId: scope[0], role, capabilities: roleCapabilities[role], scope, grantableRoles: [], status: "approved", approvedAt: 1, createdAt: 1, updatedAt: 1, revision: 1 });
    const admin = await seed("admin", "Administrator"); const reporter = await seed("reporter", "Clinician"); const other = await seed("other", "Clinician", [b]); const tech = await seed("tech", "Biomedical Technician"); const verifier = await seed("verifier", "Biomedical Technician"); const supervisor = await seed("supervisor", "Maintenance Supervisor");
    const equipment = await ctx.db.insert("equipment", { assetId: "TEST-DEVICE", name: "Test equipment", model: "Test", location: "Test room", departmentId: a, identityVerified: true });
    return { a, b, admin, reporter, other, tech, verifier, supervisor, equipment };
  });
  return { t, ...records, user: (name: string) => t.withIdentity(identity(name)) };
}

test('continuation: notification preferences persist per owner and reject stale revisions', async () => {
  const f = await setup(); const initial = await f.user('reporter').query(api.extensions.preferences, {});
  const { revision, ...fields } = initial;
  expect(await f.user('reporter').mutation(api.extensions.savePreferences, { ...fields, reportUpdates: false, expectedRevision: revision })).toBe(1);
  expect((await f.user('reporter').query(api.extensions.preferences, {})).reportUpdates).toBe(false);
  expect((await f.user('tech').query(api.extensions.preferences, {})).reportUpdates).toBe(true);
  await expect(f.user('reporter').mutation(api.extensions.savePreferences, { ...fields, expectedRevision: 0 })).rejects.toThrow(/changed/);
  await expect(f.t.query(api.extensions.preferences, {})).rejects.toThrow(/Sign in/);
});

test('continuation: waiting for parts blocks stale clients from work and closure never bypasses unapproved safety', async () => {
  const f = await setup();
  const id = await f.t.run((ctx) => ctx.db.insert('maintenanceTasks', { equipmentId: f.equipment, departmentId: f.a, assigneeId: f.tech, state: 'Assigned', diagnosis: '', notes: '', parts: [], cycle: 1, revision: 1, dueAt: Date.now() + 10000, createdAt: 1, updatedAt: 1 }));
  const change = { id, expectedRevision: 1, expectedWorkflowRevision: 0, action: 'accept' as const, reason: 'TEST acceptance' };
  await expect(f.user('verifier').mutation(api.extensions.transition, change)).rejects.toThrow(/assigned/);
  await f.user('tech').mutation(api.extensions.transition, change);
  await f.user('tech').mutation(api.extensions.transition, { ...change, expectedWorkflowRevision: 1, action: 'await_parts' });
  await expect(f.user('tech').mutation(api.operations.recordWork, { id, expectedRevision: 1, diagnosis: 'Test', notes: '', parts: [], complete: true })).rejects.toThrow(/parts/);
  await expect(f.user('tech').mutation(api.extensions.transition, { ...change, action: 'resume' })).rejects.toThrow(/revision/);
  await f.user('tech').mutation(api.extensions.transition, { ...change, expectedWorkflowRevision: 2, action: 'resume' });
  await f.user('tech').mutation(api.operations.recordWork, { id, expectedRevision: 1, diagnosis: 'Test', notes: '', parts: [], complete: true });
  const task = (await f.t.run((ctx) => ctx.db.get(id)))!;
  expect(task.workflowPhase).toBe('awaiting_verification');
  await expect(f.user('supervisor').mutation(api.extensions.transition, { id, expectedRevision: task.revision, expectedWorkflowRevision: task.workflowRevision!, action: 'close', reason: 'TEST' })).rejects.toThrow(/independent/);
});

test('continuation: paginated export reaches all 125 submitted reports and inventory edit preserves identity and scope', async () => {
  const f = await setup();
  await f.t.run(async (ctx) => { for (let i = 0; i < 125; i++) await ctx.db.insert('faultReports', { equipmentId: f.equipment, departmentId: f.a, reporterId: f.reporter, operationId: `EXPORT-${i}`, category: 'Other/Unknown', symptoms: 'TEST', description: '', priority: 'High', condition: 'Unknown', inUse: false, noticedAt: 1, createdAt: i + 1, submissionState: i === 124 ? 'draft' : 'submitted' }); });
  const { collectReportExport } = await import('../../src/domain/paged-export');
  const result = await collectReportExport((cursor) => f.user('admin').query(api.extensions.exportPage, { departmentId: f.a, paginationOpts: { cursor, numItems: 20 } }));
  expect(result.count).toBe(124); expect(result.csv.split('\r\n')).toHaveLength(125);
  await expect(f.user('other').query(api.extensions.exportPage, { departmentId: f.a, paginationOpts: { cursor: null, numItems: 20 } })).rejects.toThrow();
  const edit = { id: f.equipment, expectedRevision: 1, name: 'Corrected TEST name', model: 'TEST', location: 'TEST room', reason: 'TEST correction' };
  await expect(f.user('tech').mutation(api.extensions.editEquipment, edit)).rejects.toThrow(/administrator/);
  expect(await f.user('admin').mutation(api.extensions.editEquipment, edit)).toBe(2);
  const item = (await f.t.run((ctx) => ctx.db.get(f.equipment)))!;
  expect([item.assetId, item.departmentId, item.identityVerified]).toEqual(['TEST-DEVICE', f.a, true]);
  await expect(f.user('admin').mutation(api.extensions.editEquipment, edit)).rejects.toThrow(/changed/);
});

test('continuation: inventory imports are atomic, idempotent, scoped and never verify identity', async () => {
  const f = await setup();
  const batch = { departmentId: f.a, operationId: 'TEST-IMPORT', reason: 'TEST import', rows: [{ assetId: 'TEST-NEW', name: 'TEST', model: 'TEST', location: 'TEST' }] };
  await expect(f.user('tech').mutation(api.extensions.importInventory, batch)).rejects.toThrow(/administrator/);
  const ids = await f.user('admin').mutation(api.extensions.importInventory, batch);
  expect(await f.user('admin').mutation(api.extensions.importInventory, batch)).toEqual(ids);
  expect((await f.t.run((ctx) => ctx.db.get(ids[0])))?.identityVerified).toBe(false);
  await expect(f.user('admin').mutation(api.extensions.importInventory, { ...batch, rows: [{ ...batch.rows[0], model: 'Changed' }] })).rejects.toThrow(/different records/);
  await expect(f.user('admin').mutation(api.extensions.importInventory, { ...batch, departmentId: f.b })).rejects.toThrow(/scope/);
  await expect(f.user('admin').mutation(api.extensions.importInventory, { ...batch, operationId: 'NEW', rows: [{ ...batch.rows[0], assetId: 'BEFORE-COLLISION' }, { ...batch.rows[0], assetId: 'TEST-DEVICE' }] })).rejects.toThrow(/exists/);
  expect(await f.t.run((ctx) => ctx.db.query('equipment').withIndex('by_asset', (q) => q.eq('assetId', 'BEFORE-COLLISION')).first())).toBeNull();
});

test('continuation: overdue notices deduplicate repeated sweeps and due/cancel events remain recipient scoped', async () => {
  const f = await setup();
  const id = await f.t.run((ctx) => ctx.db.insert('maintenanceTasks', { equipmentId: f.equipment, departmentId: f.a, assigneeId: f.tech, state: 'Assigned', diagnosis: '', notes: '', parts: [], cycle: 1, revision: 1, dueAt: 1, createdAt: 1, updatedAt: 1 }));
  const sweep = { departmentId: f.a, paginationOpts: { cursor: null, numItems: 20 } };
  expect((await f.user('supervisor').mutation(api.extensions.overdue, sweep)).notified).toBe(1);
  expect((await f.user('supervisor').mutation(api.extensions.overdue, sweep)).notified).toBe(0);
  await f.user('supervisor').mutation(api.operations.changeDue, { id, expectedRevision: 1, dueAt: Date.now() + 10000, reason: 'TEST extension' });
  await f.user('supervisor').mutation(api.operations.cancelTask, { id, expectedRevision: 2, reason: 'TEST cancellation' });
  const notices = await f.t.run((ctx) => ctx.db.query('notifications').collect());
  expect(notices.map((n) => n.title)).toEqual(expect.arrayContaining(['Maintenance overdue', 'Maintenance due date changed', 'Maintenance cancelled']));
  expect(notices.every((n) => n.recipientId === f.tech && n.departmentId === f.a)).toBe(true);
});

test.each([false, true])('review 4: interrupted fifth publication reconciles a real saved report (server committed: %s)', async (committed) => {
  const f = await setup();
  const saved = await f.user('reporter').mutation(api.reporting.saveDraft, draftFields(f.equipment));
  const args = { id: saved.id, expectedRevision: saved.revision, expectedAttachmentRevision: 0 };
  if (committed) await f.user('reporter').mutation(api.reporting.publish, args);
  const values = new Map<string, string>(); let generation = 0, sends = 0;
  const queue = new EncryptedReportQueue({ get: async (key) => values.get(key) ?? null, set: async (key, value) => { values.set(key, value); }, remove: async (key) => { values.delete(key); } }, () => `g${++generation}`);
  await queue.update(String(f.reporter), () => [{ id: 'OP', owner: String(f.reporter), reportId: String(saved.id), expectedRevision: saved.revision, expectedAttachmentRevision: 0, createdAt: 1, updatedAt: 1, state: 'SYNCING', retryCount: 5 }]);
  const worker = new PublicationCoordinator(queue, String(f.reporter), async () => { sends++; return f.user('reporter').mutation(api.reporting.publish, args); }, () => true, () => {}, Date.now, undefined, async () => f.user('reporter').query(api.reporting.publicationReceipt, args));
  if (committed) expect(await worker.sendEntry('OP')).toBe(saved.id);
  else { await expect(worker.sendEntry('OP')).rejects.toThrow(/explicit bounded recovery/); expect(sends).toBe(0); expect(await worker.sendEntry('OP', true)).toBe(saved.id); }
  expect(sends).toBe(committed ? 0 : 1);
  expect(await f.t.run((ctx) => ctx.db.query('faultReports').collect())).toHaveLength(1);
  expect((await f.t.run((ctx) => ctx.db.query('notifications').collect())).filter((n) => n.title === 'Fault report received')).toHaveLength(1);
  expect((await queue.load(String(f.reporter)))[0]).toMatchObject({ state: 'SYNCED', retryCount: 5, reportId: saved.id, serverId: saved.id });
  await expect(f.user('other').query(api.reporting.publicationReceipt, args)).rejects.toThrow();
  await f.t.run((ctx) => ctx.db.patch(f.reporter, { status: 'revoked' }));
  await expect(f.user('reporter').query(api.reporting.publicationReceipt, args)).rejects.toThrow();
});

test('an uncertain draft update retries the identical snapshot without another revision or report', async () => {
  const f = await setup();
  const fields = { equipmentId: f.equipment, operationId: 'UNCERTAIN-DRAFT', category: 'Other/Unknown', symptoms: 'Initial symptoms', description: '', priority: 'High' as const, condition: 'Unknown', inUse: false, noticedAt: 1, emergency: false };
  const created = await f.user('reporter').mutation(api.reporting.saveDraft, fields);
  const update = { ...fields, symptoms: 'Reviewed symptoms', expectedRevision: created.revision };
  const committed = await f.user('reporter').mutation(api.reporting.saveDraft, update);
  expect(await f.user('reporter').mutation(api.reporting.saveDraft, update)).toEqual(committed);
  await expect(f.user('reporter').mutation(api.reporting.saveDraft, { ...update, symptoms: 'Different contents' })).rejects.toThrow(/conflict/);
  expect(await f.t.run((ctx) => ctx.db.query('faultReports').collect())).toHaveLength(1);
  expect((await f.t.run((ctx) => ctx.db.get(committed.id)))?.revision).toBe(2);
  await f.t.run((ctx) => ctx.db.patch(f.reporter, { status: 'revoked' }));
  await expect(f.user('reporter').mutation(api.reporting.saveDraft, update)).rejects.toThrow();
});
test('inbox filters paginate matching notices and preserve recipient and department isolation', async () => {
  const f = await setup();
  const unread = await f.t.run(async (ctx) => {
    const base = { recipientId: f.reporter, departmentId: f.a, title: 'Test notice', body: 'Test activity', targetKind: 'task' as const, targetId: String(f.equipment), dispatchState: 'in_app' as const, createdAt: 1 };
    const wanted = await ctx.db.insert('notifications', base);
    for (let i = 0; i < 105; i++) await ctx.db.insert('notifications', { ...base, createdAt: i + 2, readAt: i + 2 });
    await ctx.db.insert('notifications', { ...base, recipientId: f.other });
    await ctx.db.insert('notifications', { ...base, departmentId: f.b });
    await ctx.db.insert('notifications', { ...base, targetKind: 'report' });
    return wanted;
  });
  const args = { paginationOpts: { cursor: null, numItems: 20 }, unreadOnly: true, targetKind: 'task' as const };
  const page = await f.user('reporter').query(api.workflows.inbox, args);
  expect(page.page.map((r) => r._id)).toEqual([unread]);
  await expect(f.t.query(api.workflows.inbox, args)).rejects.toThrow(/Sign in/);
  await f.user('reporter').mutation(api.workflows.markRead, { id: unread, read: true });
  expect((await f.user('reporter').query(api.workflows.inbox, args)).page).toHaveLength(0);
});

test('task filters apply before pagination and overdue excludes completed and cancelled work', async () => {
  const f = await setup();
  const wanted = await f.t.run(async (ctx) => {
    const base = { equipmentId: f.equipment, departmentId: f.a, assigneeId: f.tech, dueAt: 100, diagnosis: '', notes: '', parts: [], cycle: 1, revision: 1, createdAt: 1, updatedAt: 1 };
    const id = await ctx.db.insert('maintenanceTasks', { ...base, state: 'Assigned' });
    for (let i = 0; i < 105; i++) await ctx.db.insert('maintenanceTasks', { ...base, state: 'Completed' });
    await ctx.db.insert('maintenanceTasks', { ...base, state: 'Cancelled' });
    await ctx.db.insert('maintenanceTasks', { ...base, state: 'Assigned', dueAt: 1000 });
    await ctx.db.insert('maintenanceTasks', { ...base, state: 'Assigned', assigneeId: f.verifier });
    return id;
  });
  const args = { departmentId: f.a, paginationOpts: { cursor: null, numItems: 20 }, state: 'Assigned' as const, overdueBefore: 500 };
  const page = await f.user('tech').query(api.workflows.taskPage, args);
  expect(page.page.map((r) => r._id)).toEqual([wanted]);
  expect(page.page[0].equipment).toEqual({ assetId: 'TEST-DEVICE', name: 'Test equipment', location: 'Test room' });
  const overdue = await f.user('tech').query(api.workflows.taskPage, { ...args, state: undefined });
  expect(overdue.page.map((r) => r._id)).toEqual([wanted]);
  await expect(f.user('other').query(api.workflows.taskPage, args)).rejects.toThrow(/scope/);
});

test('equipment name, model and exact identifier searches remain department scoped', async () => {
  const f = await setup();
  await f.t.run(async (ctx) => {
    await ctx.db.insert('equipment', { assetId: 'TEST-VENT', name: 'Ventilator', model: 'VX200', location: 'Test bay', departmentId: f.a, identityVerified: true });
    await ctx.db.insert('equipment', { assetId: 'OTHER-VENT', name: 'Ventilator', model: 'VX200', location: 'Other bay', departmentId: f.b, identityVerified: true });
  });
  const args = { departmentId: f.a, paginationOpts: { cursor: null, numItems: 20 } };
  expect((await f.user('reporter').query(api.workflows.equipmentPage, { ...args, search: 'vent', searchBy: 'name' })).page.map((r) => r.assetId)).toEqual(['TEST-VENT']);
  expect((await f.user('reporter').query(api.workflows.equipmentPage, { ...args, search: 'vx2', searchBy: 'model' })).page.map((r) => r.assetId)).toEqual(['TEST-VENT']);
  expect((await f.user('reporter').query(api.workflows.equipmentPage, { ...args, search: 'OTHER-VENT', searchBy: 'assetId' })).page).toHaveLength(0);
  await expect(f.user('other').query(api.workflows.equipmentPage, { ...args, search: 'vent', searchBy: 'name' })).rejects.toThrow(/scope/);
});

test('diagnostic evidence and cause are revisioned, retained by older clients and require supporting evidence for confirmation', async () => {
  const f = await setup();
  const task = await f.t.run((ctx) => ctx.db.insert('maintenanceTasks', { equipmentId: f.equipment, departmentId: f.a, assigneeId: f.tech, dueAt: Date.now() + 60000, diagnosis: '', notes: '', parts: [], cycle: 1, revision: 1, createdAt: 1, updatedAt: 1, state: 'Assigned' }));
  const args = { id: task, expectedRevision: 1, diagnosis: 'Observed failure', notes: '', parts: [], complete: false };
  await expect(f.user('tech').mutation(api.operations.recordWork, { ...args, causeAssessment: 'Confirmed by testing' })).rejects.toThrow(/supporting evidence/);
  await f.user('tech').mutation(api.operations.recordWork, { ...args, diagnosisEvidence: 'Recorded electrical measurements', causeAssessment: 'Suspected cause' });
  await f.user('tech').mutation(api.operations.recordWork, { ...args, expectedRevision: 2, notes: 'Further inspection' });
  const current = await f.user('tech').query(api.workflows.taskDetail, { id: task });
  expect(current.diagnosisEvidence).toBe('Recorded electrical measurements');
  expect(current.causeAssessment).toBe('Suspected cause');
  const history = await f.user('tech').query(api.workflows.workHistory, { id: task, paginationOpts: { cursor: null, numItems: 20 } });
  expect(history.page.map((r) => [r.revision, r.diagnosisEvidence])).toEqual([[3, 'Recorded electrical measurements'], [2, 'Recorded electrical measurements'], [1, undefined]]);
  await expect(f.user('verifier').mutation(api.operations.recordWork, { ...args, expectedRevision: 3, diagnosisEvidence: 'Unauthorized edit' })).rejects.toThrow();
});

test("every new public query/mutation authenticates before reading protected records", async () => {
  const f = await setup(); const paginationOpts = { cursor: null, numItems: 20 };
  await expect(f.t.query(api.workflows.equipmentPage, { departmentId: f.a, paginationOpts })).rejects.toThrow(/Sign in/);
  await expect(f.t.query(api.workflows.reportPage, { departmentId: f.a, paginationOpts })).rejects.toThrow(/Sign in/);
  await expect(f.t.query(api.workflows.taskPage, { departmentId: f.a, paginationOpts })).rejects.toThrow(/Sign in/);
  await expect(f.t.query(api.workflows.provisionalPage, { departmentId: f.a, paginationOpts })).rejects.toThrow(/Sign in/);
  await expect(f.t.query(api.workflows.equipmentDetail, { id: f.equipment })).rejects.toThrow(/Sign in/);
  await expect(f.t.query(api.workflows.equipmentHistory, { id: f.equipment, paginationOpts })).rejects.toThrow(/Sign in/);
  await expect(f.t.query(api.workflows.lookup, { identifier: "TEST-DEVICE" })).rejects.toThrow(/Sign in/);
  await expect(f.t.query(api.workflows.inbox, { paginationOpts })).rejects.toThrow(/Sign in/);
  await expect(f.t.query(api.workflows.hasUnreadNotice, {})).rejects.toThrow(/Sign in/);
  await expect(f.user("other").query(api.workflows.equipmentDetail, { id: f.equipment })).rejects.toThrow(/scope/);
  await expect(f.user("other").query(api.workflows.lookup, { identifier: "TEST-DEVICE" })).resolves.toBeNull();
  await expect(f.user("other").mutation(api.workflows.submitProvisional, { departmentId: f.b, rawIdentifier: "TEST-DEVICE", equipmentType: "Test", location: "Test", symptoms: "Test", priority: "High", operationId: "TEST-NO-EXISTENCE-ORACLE" })).resolves.toBeTypeOf("string");
});
test("report filters use triaged priority, retain legacy submissions and never expose another owner's draft", async () => {
  const f = await setup();
  const ids = await f.t.run(async (ctx) => {
    const base = { equipmentId: f.equipment, departmentId: f.a, category: "Other/Unknown", symptoms: "Test", description: "", priority: "Routine" as const, condition: "Unknown", inUse: false, noticedAt: 1, createdAt: 1, reporterId: f.reporter };
    const legacy = await ctx.db.insert("faultReports", { ...base, operationId: "LEGACY" });
    const triaged = await ctx.db.insert("faultReports", { ...base, operationId: "TRIAGED", triagedPriority: "Urgent", submissionState: "submitted" });
    const ownDraft = await ctx.db.insert("faultReports", { ...base, operationId: "OWN-DRAFT", submissionState: "draft" });
    await ctx.db.insert("faultReports", { ...base, reporterId: f.supervisor, operationId: "PRIVATE-DRAFT", submissionState: "draft" });
    return { legacy, triaged, ownDraft };
  });
  const args = { departmentId: f.a, paginationOpts: { cursor: null, numItems: 20 } };
  expect((await f.user("reporter").query(api.workflows.reportPage, { ...args, priority: "Urgent" })).page.map((r) => r._id)).toEqual([ids.triaged]);
  expect((await f.user("reporter").query(api.workflows.reportPage, { ...args, priority: "Routine", submission: "submitted" })).page.map((r) => r._id)).toEqual([ids.legacy]);
  expect((await f.user("reporter").query(api.workflows.reportPage, { ...args, submission: "draft" })).page.map((r) => r._id)).toEqual([ids.ownDraft]);
  expect((await f.user("supervisor").query(api.workflows.reportPage, { ...args, submission: "draft" })).page).toHaveLength(1);
});
test("verifier queues exclude own and unfinished work; equipment history returns scoped summaries without work notes", async () => {
  const f = await setup();
  const ids = await f.t.run(async (ctx) => {
    const base = { equipmentId: f.equipment, departmentId: f.a, dueAt: Date.now() + 60000, diagnosis: "PRIVATE-DIAGNOSIS", notes: "PRIVATE-NOTES", parts: [], cycle: 1, revision: 1, createdAt: 1, updatedAt: 1 };
    const complete = await ctx.db.insert("maintenanceTasks", { ...base, state: "Completed", assigneeId: f.tech });
    await ctx.db.insert("maintenanceTasks", { ...base, state: "Completed", assigneeId: f.verifier });
    await ctx.db.insert("maintenanceTasks", { ...base, state: "In progress", assigneeId: f.tech });
    return { complete };
  });
  const args = { departmentId: f.a, paginationOpts: { cursor: null, numItems: 20 }, verification: "technical" as const };
  expect((await f.user("verifier").query(api.workflows.taskPage, args)).page.map((r) => r._id)).toEqual([ids.complete]);
  await expect(f.user("reporter").query(api.workflows.taskPage, args)).rejects.toThrow(/verifier/);
  const historyArgs = { id: f.equipment, paginationOpts: args.paginationOpts };
  const history = await f.user("reporter").query(api.workflows.equipmentHistory, historyArgs);
  expect(history.page).toHaveLength(3); expect(history.page.every((r) => r.canOpen === (r.state === "Completed"))).toBe(true); expect(JSON.stringify(history)).not.toMatch(/PRIVATE/);
  await f.t.run((ctx) => ctx.db.patch(f.reporter, { capabilities: ["report"] }));
  expect((await f.user("reporter").query(api.workflows.equipmentHistory, historyArgs)).page.every((r) => !r.canOpen)).toBe(true);
  await expect(f.user("other").query(api.workflows.equipmentHistory, historyArgs)).rejects.toThrow(/scope/);
});
test("pagination reaches equipment beyond 100 and details do not depend on list position", async () => {
  const f = await setup(); await f.t.run(async (ctx) => { for (let i = 0; i < 123; i++) await ctx.db.insert("equipment", { assetId: `TEST-${i}`, name: "Test", model: "Test", location: "Test", departmentId: f.a, identityVerified: true }); });
  let cursor: string | null = null; let done = false; const ids: string[] = [];
  while (!done) { const page: FunctionReturnType<typeof api.workflows.equipmentPage> = await f.user("reporter").query(api.workflows.equipmentPage, { departmentId: f.a, paginationOpts: { cursor, numItems: 20 } }); ids.push(...page.page.map((r) => r._id)); cursor = page.continueCursor; done = page.isDone; }
  expect(new Set(ids).size).toBe(124); expect((await f.user("reporter").query(api.workflows.equipmentDetail, { id: f.equipment })).assetId).toBe("TEST-DEVICE");
  await expect(f.user("other").query(api.workflows.equipmentPage, { departmentId: f.a, paginationOpts: { cursor: null, numItems: 20 } })).rejects.toThrow(/scope/);
});
test("own reports remain discoverable after 100 newer reports belonging to another account", async () => {
  const f = await setup(); const own = await f.t.run(async (ctx) => {
    const base = { equipmentId: f.equipment, departmentId: f.a, category: "Other/Unknown", symptoms: "Test", description: "", priority: "Routine" as const, condition: "Unknown", inUse: false, noticedAt: 1, createdAt: 1 };
    const id = await ctx.db.insert("faultReports", { ...base, operationId: "OWN", reporterId: f.reporter });
    for (let i = 0; i < 110; i++) await ctx.db.insert("faultReports", { ...base, operationId: `OTHER-${i}`, reporterId: f.supervisor });
    return id;
  });
  const page = await f.user("reporter").query(api.workflows.reportPage, { departmentId: f.a, paginationOpts: { cursor: null, numItems: 20 } });
  expect(page.page.map((r) => r._id)).toEqual([own]); expect((await f.user("reporter").query(api.workflows.reportDetail, { id: own }))._id).toBe(own);
  await expect(f.user("other").query(api.workflows.reportDetail, { id: own })).rejects.toThrow(/scope/);
});
test("inventory registration is scoped, administrator-only, duplicate-safe and audited", async () => {
  const f = await setup(); const args = { assetId: "TEST-NEW", name: "Test", model: "Test", location: "Test", departmentId: f.a, evidenceReference: "TEST-INVENTORY-REVIEW" };
  await expect(f.user("tech").mutation(api.workflows.registerEquipment, args)).rejects.toThrow(/administrator/);
  await expect(f.user("admin").mutation(api.workflows.registerEquipment, { ...args, departmentId: f.b })).rejects.toThrow(/scope/);
  const results = await Promise.allSettled([f.user("admin").mutation(api.workflows.registerEquipment, args), f.user("admin").mutation(api.workflows.registerEquipment, args)]);
  expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
  expect(await f.t.run((ctx) => ctx.db.query("authorizationAudit").collect())).toEqual(expect.arrayContaining([expect.objectContaining({ action: "equipment.register" })]));
});
test("provisional submissions are idempotent and never create verified inventory", async () => {
  const f = await setup(); const args = { departmentId: f.a, rawIdentifier: " UNKNOWN-TEST ", equipmentType: "Test", location: "Test", symptoms: "Test fault", priority: "High" as const, operationId: "TEST-UNIQUE" };
  const [a, b] = await Promise.all([f.user("reporter").mutation(api.workflows.submitProvisional, args), f.user("reporter").mutation(api.workflows.submitProvisional, args)]);
  expect(a).toBe(b); expect((await f.t.run((ctx) => ctx.db.get(a)))?.status).toBe("unverified");
  expect((await f.t.run((ctx) => ctx.db.get(a)))?.rawIdentifier).toBe(args.rawIdentifier);
  expect(await f.t.run((ctx) => ctx.db.query("equipment").collect())).toHaveLength(1);
  await expect(f.user("other").mutation(api.workflows.submitProvisional, args)).rejects.toThrow(/scope/);
});
test("work revisions preserve prior content and assignment inbox entries are recipient-only", async () => {
  const f = await setup(); const report = await f.user("reporter").mutation(api.operations.submitReport, { equipmentId: f.equipment, operationId: "TEST-R", category: "Other/Unknown", symptoms: "Test", description: "", priority: "Routine", condition: "Unknown", inUse: false, noticedAt: Date.now() - 1 });
  const task = await f.user("supervisor").mutation(api.operations.createTask, { reportId: report, dueAt: Date.now() + 100000 });
  await f.user("supervisor").mutation(api.operations.assign, { id: task, expectedRevision: 1, assigneeId: f.tech, dueAt: Date.now() + 100000, reason: "Test assignment" });
  await f.user("tech").mutation(api.operations.recordWork, { id: task, expectedRevision: 2, diagnosis: "Original diagnosis", notes: "Original notes", parts: ["Test part"], complete: false });
  await f.user("tech").mutation(api.operations.recordWork, { id: task, expectedRevision: 3, diagnosis: "Updated diagnosis", notes: "Updated notes", parts: [], complete: true });
  const paginationOpts = { cursor: null, numItems: 20 };
  const history = await f.user("tech").query(api.workflows.workHistory, { id: task, paginationOpts });
  expect(history.page.map((r) => r.notes)).toContain("Original notes"); expect(history.page.map((r) => r.notes)).toContain("Updated notes"); expect(history.page).toHaveLength(3);
  expect((await f.user("reporter").query(api.workflows.taskDetail, { id: task })).state).toBe("Completed"); // Approved clinical reviewer.
  await f.t.run((ctx) => ctx.db.patch(f.reporter, { capabilities: ["report"] }));
  await expect(f.user("reporter").query(api.workflows.taskDetail, { id: task })).rejects.toThrow();
  const inbox = await f.user("tech").query(api.workflows.inbox, { paginationOpts }); expect(inbox.page).toHaveLength(1); expect(inbox.page[0].dispatchState).toBe("in_app");
  await expect(f.user("other").mutation(api.workflows.markRead, { id: inbox.page[0]._id, read: true })).rejects.toThrow();
  await f.user("tech").mutation(api.workflows.markRead, { id: inbox.page[0]._id, read: true }); expect((await f.user("tech").query(api.workflows.inbox, { paginationOpts })).page[0].readAt).toBeTypeOf("number");
  await f.t.run((ctx) => ctx.db.patch(f.tech, { status: "revoked" })); await expect(f.user("tech").query(api.workflows.inbox, { paginationOpts })).rejects.toThrow(/approved staff/);
});
const draftFields = (equipmentId: Awaited<ReturnType<typeof setup>>["equipment"]) => ({ equipmentId, operationId: "TEST-DRAFT", category: "Other/Unknown", symptoms: "Test fault", description: "Equipment only", priority: "High" as const, condition: "Unknown", inUse: false, noticedAt: Date.now() - 1, emergency: false });
test("private drafts survive reload, detect conflicts and publish once without early workflow entry", async () => {
  const f = await setup(); const fields = draftFields(f.equipment);
  const draft = await f.user("reporter").mutation(api.reporting.saveDraft, fields);
  expect(await f.user("reporter").mutation(api.reporting.saveDraft, fields)).toEqual(draft);
  expect((await f.user("reporter").query(api.workflows.reportDetail, { id: draft.id })).submissionState).toBe("draft");
  await expect(f.user("supervisor").query(api.workflows.reportDetail, { id: draft.id })).rejects.toThrow(/private/);
  await expect(f.user("supervisor").mutation(api.operations.createTask, { reportId: draft.id, dueAt: Date.now() + 100000 })).rejects.toThrow(/draft/);
  const updated = await f.user("reporter").mutation(api.reporting.saveDraft, { ...fields, symptoms: "Updated fault", expectedRevision: 1 }); expect(updated.revision).toBe(2);
  await expect(f.user("reporter").mutation(api.reporting.saveDraft, { ...fields, expectedRevision: 1 })).rejects.toThrow(/conflict/);
  await expect(f.user("reporter").mutation(api.reporting.publish, { id: draft.id, expectedRevision: 1 })).rejects.toThrow(/conflict/);
  await f.user("reporter").mutation(api.reporting.publish, { id: draft.id, expectedRevision: 2 });
  await f.user("reporter").mutation(api.reporting.publish, { id: draft.id, expectedRevision: 2 });
  expect((await f.user("reporter").query(api.workflows.reportDetail, { id: draft.id })).submissionState).toBe("submitted");
  const paginationOpts = { cursor: null, numItems: 20 }; expect((await f.user("reporter").query(api.workflows.inbox, { paginationOpts })).page).toHaveLength(1);
});
test("equipment photos require authenticated report ownership, validate content and never return public URLs", async () => {
  const f = await setup(); const draft = await f.user("reporter").mutation(api.reporting.saveDraft, draftFields(f.equipment));
  const args = { reportId: draft.id, operationId: "TEST-PHOTO", contentType: "image/png", base64: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/pZkAAAAASUVORK5CYII=" };
  await expect(f.t.action(api.attachments.upload, args)).rejects.toThrow(/Sign in/);
  await expect(f.user("other").action(api.attachments.upload, args)).rejects.toThrow(/authorized/);
  await expect(f.user("reporter").action(api.attachments.upload, { ...args, contentType: "image/jpeg" })).rejects.toThrow(/contents/);
  const uploaded = await f.user("reporter").action(api.attachments.upload, args);
  expect(await f.user("reporter").action(api.attachments.upload, args)).toEqual(uploaded);
  const snapshot = await f.user("reporter").query(api.attachments.list, { reportId: draft.id }); const list = snapshot.items; expect(list).toHaveLength(1); expect(list[0]).not.toHaveProperty("storageId"); expect(list[0]).not.toHaveProperty("url");
  expect((await f.user("reporter").action(api.attachments.read, { id: uploaded.id })).dataUri).toBe(`data:image/png;base64,${args.base64}`);
  await expect(f.user("other").action(api.attachments.read, { id: uploaded.id })).rejects.toThrow(/authorized/);
  await f.user("reporter").mutation(api.attachments.remove, { id: uploaded.id });
  expect((await f.user("reporter").query(api.attachments.list, { reportId: draft.id })).items).toHaveLength(0);
  await expect(f.user("reporter").action(api.attachments.read, { id: uploaded.id })).rejects.toThrow(/unavailable/);
});
test("oversized/unsupported photos and revoked sessions cannot create attachments", async () => {
  const f = await setup(); const draft = await f.user("reporter").mutation(api.reporting.saveDraft, draftFields(f.equipment));
  const args = { reportId: draft.id, operationId: "TEST-BAD", contentType: "text/html", base64: "PHNjcmlwdD4=" };
  await expect(f.user("reporter").action(api.attachments.upload, args)).rejects.toThrow(/JPEG/);
  await expect(f.user("reporter").action(api.attachments.upload, { ...args, contentType: "image/png", base64: "A".repeat(2800000) })).rejects.toThrow(/2 MB/);
  await f.t.run((ctx) => ctx.db.patch(f.reporter, { status: "suspended" }));
  await expect(f.user("reporter").action(api.attachments.upload, args)).rejects.toThrow(/approved staff/);
});
async function repaired(f: Awaited<ReturnType<typeof setup>>) {
  const { emergency, ...fields } = draftFields(f.equipment); void emergency;
  const report = await f.user("reporter").mutation(api.operations.submitReport, fields);
  const task = await f.user("supervisor").mutation(api.operations.createTask, { reportId: report, dueAt: Date.now() + 100000 });
  await f.user("supervisor").mutation(api.operations.assign, { id: task, expectedRevision: 1, assigneeId: f.tech, dueAt: Date.now() + 100000, reason: "TEST-ONLY" });
  await f.user("tech").mutation(api.operations.recordWork, { id: task, expectedRevision: 2, diagnosis: "Test repair", notes: "Test notes", parts: [], complete: true });
  return task;
}
async function testSafetyPolicy(f: Awaited<ReturnType<typeof setup>>) {
  return await f.t.run((ctx) => ctx.db.insert("safetyPolicies", { departmentId: f.a, active: true, version: "smartmaint-safety-v1", approvalReference: "TEST-ONLY-NOT-INSTITUTIONAL-APPROVAL", technicalChecks: ["TEST technical check"], clinicalChecks: ["TEST clinical check"], clinicalRequired: true, releaseRoles: ["Maintenance Supervisor"], configuredAt: Date.now() }));
}
const verification = (taskId: Awaited<ReturnType<typeof repaired>>, kind: "technical" | "clinical", outcome: "pass" | "fail" = "pass") => ({ taskId, expectedRevision: 3, kind, outcome, checks: [{ label: kind === "technical" ? "TEST technical check" : "TEST clinical check", passed: outcome === "pass" }], notes: outcome === "pass" ? "Test findings" : "Test failure", evidenceReference: "TEST-EVIDENCE", operationId: `TEST-${kind}-${outcome}`, reworkDueAt: outcome === "fail" ? Date.now() + 100000 : undefined });
test("safety decisions remain disabled without policy and repair completion never releases equipment", async () => {
  const f = await setup(); const task = await repaired(f);
  expect((await f.user("reporter").query(api.safety.releaseStatus, { equipmentId: f.equipment })).available).toBe(false);
  await expect(f.user("verifier").mutation(api.safety.verify, verification(task, "technical"))).rejects.toThrow(/policy/);
  await expect(f.user("supervisor").mutation(api.safety.release, { equipmentId: f.equipment, expectedTaskRevision: 3, reason: "Test" })).rejects.toThrow(/authority/);
});
test("independent ordered verification and authorized release are atomic, idempotent and invalidated by new holds/faults", async () => {
  const f = await setup(); const task = await repaired(f); await testSafetyPolicy(f);
  await expect(f.user("tech").mutation(api.safety.verify, verification(task, "technical"))).rejects.toThrow(/independent/);
  await expect(f.user("reporter").mutation(api.safety.verify, verification(task, "clinical"))).rejects.toThrow(/technical pass/);
  await f.user("verifier").mutation(api.safety.verify, verification(task, "technical"));
  expect((await f.user("reporter").query(api.safety.releaseStatus, { equipmentId: f.equipment })).eligible).toBe(false);
  await f.user("reporter").mutation(api.safety.verify, verification(task, "clinical"));
  const release = { equipmentId: f.equipment, expectedTaskRevision: 3, expectedEvidence: (await f.user("supervisor").query(api.safety.releaseStatus, { equipmentId: f.equipment })).evidenceSnapshot, reason: "TEST approved release evidence" };
  await expect(f.user("reporter").mutation(api.safety.release, release)).rejects.toThrow(/authority/);
  const [a, b] = await Promise.all([f.user("supervisor").mutation(api.safety.release, release), f.user("supervisor").mutation(api.safety.release, release)]); expect(a).toBe(b);
  expect((await f.user("reporter").query(api.safety.releaseStatus, { equipmentId: f.equipment })).available).toBe(true);
  const hold = await f.user("supervisor").mutation(api.operations.placeHold, { equipmentId: f.equipment, reason: "TEST hold" });
  expect((await f.user("reporter").query(api.safety.releaseStatus, { equipmentId: f.equipment })).available).toBe(false);
  await expect(f.user("reporter").mutation(api.safety.resolveHold, { id: hold, reason: "Test" })).rejects.toThrow();
  await f.user("supervisor").mutation(api.safety.resolveHold, { id: hold, reason: "TEST resolution evidence" });
  expect((await f.user("reporter").query(api.safety.releaseStatus, { equipmentId: f.equipment })).available).toBe(false); // Clearance is not release.
  await expect(f.user("supervisor").mutation(api.safety.release, release)).rejects.toThrow(/changed|review/);
  await f.user("supervisor").mutation(api.safety.release, { ...release, expectedEvidence: (await f.user("supervisor").query(api.safety.releaseStatus, { equipmentId: f.equipment })).evidenceSnapshot });
  expect((await f.user("reporter").query(api.safety.releaseStatus, { equipmentId: f.equipment })).available).toBe(true);
  const { emergency, ...newFault } = draftFields(f.equipment); void emergency;
  await f.user("reporter").mutation(api.operations.submitReport, { ...newFault, operationId: "TEST-NEW-FAULT" });
  expect((await f.user("reporter").query(api.safety.releaseStatus, { equipmentId: f.equipment })).available).toBe(false);
});
test("failed verification creates one linked rework and never overwrites the completed repair or failed decision", async () => {
  const f = await setup(); const task = await repaired(f); await testSafetyPolicy(f);
  const args = verification(task, "technical", "fail"); const first = await f.user("verifier").mutation(api.safety.verify, args); expect(await f.user("verifier").mutation(api.safety.verify, args)).toBe(first);
  const children = await f.t.run((ctx) => ctx.db.query("maintenanceTasks").withIndex("by_parent", (q) => q.eq("parentTaskId", task)).collect()); expect(children).toHaveLength(1); expect(children[0].failureAttemptId).toBe(first);
  expect((await f.t.run((ctx) => ctx.db.get(task)))?.state).toBe("Completed");
  await expect(f.user("verifier").mutation(api.safety.verify, verification(task, "technical"))).rejects.toThrow(/original failed repair/);
  expect((await f.user("reporter").query(api.safety.releaseStatus, { equipmentId: f.equipment })).available).toBe(false);
});
test("operational notices stay recipient-scoped, reflect rework/holds and do not claim external delivery", async () => {
  const f = await setup(); const task = await repaired(f); await testSafetyPolicy(f);
  const reportId = (await f.t.run((ctx) => ctx.db.get(task)))!.reportId!;
  await f.user("supervisor").mutation(api.operations.triage, { id: reportId, priority: "Urgent", reason: "TEST triage" });
  const args = verification(task, "technical", "fail"); await f.user("verifier").mutation(api.safety.verify, args);
  const pageArgs = { paginationOpts: { cursor: null, numItems: 100 } };
  const inbox = await f.user("reporter").query(api.workflows.inbox, pageArgs);
  expect(inbox.page.map((r) => r.title)).toEqual(expect.arrayContaining(["Fault report triaged", "Repair completed — verification pending", "Verification requires linked rework"]));
  expect(inbox.page.every((r) => r.recipientId === f.reporter && r.dispatchState === "in_app" && r.targetKind === "report")).toBe(true);
  await f.user("verifier").mutation(api.safety.verify, args);
  expect((await f.user("reporter").query(api.workflows.inbox, pageArgs)).page).toHaveLength(inbox.page.length);
  expect(await f.user("reporter").query(api.workflows.hasUnreadNotice, {})).toBe(true);
  for (const notice of inbox.page) await f.user("reporter").mutation(api.workflows.markRead, { id: notice._id, read: true });
  expect(await f.user("reporter").query(api.workflows.hasUnreadNotice, {})).toBe(false);
  expect((await f.user("other").query(api.workflows.inbox, pageArgs)).page).toHaveLength(0);
  await f.t.run((ctx) => ctx.db.patch(f.reporter, { status: "suspended" }));
  await f.user("supervisor").mutation(api.operations.placeHold, { equipmentId: f.equipment, reason: "TEST hold" });
  const records = await f.t.run((ctx) => ctx.db.query("notifications").withIndex("by_recipient", (q) => q.eq("recipientId", f.reporter)).collect()); expect(records).toHaveLength(inbox.page.length);
  expect((await f.user("tech").query(api.workflows.inbox, pageArgs)).page.some((r) => r.title === "Equipment safety hold placed")).toBe(true);
});
test("verification requests require approved policy, current repair and independent scoped recipients and deduplicate retries", async () => {
  const f = await setup(); const task = await repaired(f);
  const request = { taskId: task, expectedRevision: 3, kind: "technical" as const, recipientId: f.verifier };
  await expect(f.t.query(api.safety.verificationRequestContext, { taskId: task })).rejects.toThrow(/Sign in/);
  await expect(f.t.query(api.safety.verifierPage, { taskId: task, kind: "technical", paginationOpts: { cursor: null, numItems: 20 } })).rejects.toThrow(/Sign in/);
  await expect(f.t.mutation(api.safety.requestVerification, request)).rejects.toThrow(/Sign in/);
  expect((await f.user("tech").query(api.safety.verificationRequestContext, { taskId: task })).approved).toBe(false);
  await expect(f.user("tech").mutation(api.safety.requestVerification, request)).rejects.toThrow(/Approved policy/);
  await testSafetyPolicy(f);
  await expect(f.user("reporter").mutation(api.safety.requestVerification, request)).rejects.toThrow(/repairer|supervisor/);
  await expect(f.user("tech").mutation(api.safety.requestVerification, { ...request, recipientId: f.tech })).rejects.toThrow(/independent/);
  const page = await f.user("tech").query(api.safety.verifierPage, { taskId: task, kind: "technical", paginationOpts: { cursor: null, numItems: 20 } });
  expect(page.page.map((r) => r.id)).toEqual([f.verifier]);
  const [a, b] = await Promise.all([f.user("tech").mutation(api.safety.requestVerification, request), f.user("supervisor").mutation(api.safety.requestVerification, request)]); expect(a).toBe(b);
  await expect(f.user("tech").mutation(api.safety.requestVerification, { ...request, expectedRevision: 2 })).rejects.toThrow(/current/);
  const clinicalRequest = { ...request, kind: "clinical" as const, recipientId: f.reporter };
  await expect(f.user("tech").mutation(api.safety.requestVerification, { ...clinicalRequest, recipientId: f.other })).rejects.toThrow(/scope/);
  await expect(f.user("tech").mutation(api.safety.requestVerification, clinicalRequest)).rejects.toThrow(/technical pass/);
  await f.user("verifier").mutation(api.safety.verify, verification(task, "technical"));
  const clinicalNotice = await f.user("tech").mutation(api.safety.requestVerification, clinicalRequest);
  expect((await f.t.run((ctx) => ctx.db.get(clinicalNotice)))?.title).toBe("Clinical verification requested");
  expect((await f.t.run((ctx) => ctx.db.query("safetyAttempts").collect()))).toHaveLength(1); // Requesting is not verification.
  await f.t.run((ctx) => ctx.db.patch(f.verifier, { status: "suspended" }));
  await expect(f.user("tech").mutation(api.safety.requestVerification, request)).rejects.toThrow(/authorized/);
});
test("publication requires the reviewed photo revision and submitted evidence cannot be mutated", async () => {
  const f = await setup(); const draft = await f.user("reporter").mutation(api.reporting.saveDraft, draftFields(f.equipment));
  const photo = await f.user("reporter").action(api.attachments.upload, { reportId: draft.id, operationId: "TEST-REVIEW-PHOTO", contentType: "image/png", base64: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/pZkAAAAASUVORK5CYII=" });
  await expect(f.user("reporter").mutation(api.reporting.publish, { id: draft.id, expectedRevision: 1, expectedAttachmentRevision: 0 })).rejects.toThrow(/Photo conflict/);
  await f.user("reporter").mutation(api.reporting.publish, { id: draft.id, expectedRevision: 1, expectedAttachmentRevision: 1 });
  await expect(f.user("reporter").mutation(api.attachments.remove, { id: photo.id })).rejects.toThrow(/immutable/);
  expect((await f.user("reporter").action(api.attachments.read, { id: photo.id })).dataUri).toMatch(/^data:image\/png/);
});
test("preventive schedules enforce scoped supervisor authority and occurrence generation is duplicate-safe", async () => {
  const f = await setup(); const dueAt = Date.now() + 100000; const args = { equipmentId: f.equipment, title: "TEST schedule", approvedReference: "TEST-MAINTENANCE-PROCEDURE", intervalDays: 30, nextDueAt: dueAt, checklist: ["TEST maintenance check"], operationId: "TEST-SCHEDULE-RETRY" };
  await expect(f.user("reporter").mutation(api.preventive.create, args)).rejects.toThrow();
  const id = await f.user("supervisor").mutation(api.preventive.create, args);
  expect(await f.user("supervisor").mutation(api.preventive.create, args)).toBe(id);
  expect(await f.t.run((ctx) => ctx.db.query("preventiveSchedules").collect())).toHaveLength(1);
  const occurrence = { id, expectedRevision: 1, scheduledDueAt: dueAt };
  const [a, b] = await Promise.all([f.user("supervisor").mutation(api.preventive.materialize, occurrence), f.user("supervisor").mutation(api.preventive.materialize, occurrence)]); expect(a).toBe(b);
  expect((await f.t.run((ctx) => ctx.db.get(a)))?.reportId).toBeUndefined(); // No fabricated fault report.
  await f.user("supervisor").mutation(api.operations.assign, { id: a, expectedRevision: 1, assigneeId: f.tech, dueAt, reason: "TEST assignment" });
  const work = { id: a, expectedRevision: 2, diagnosis: "Test preventive work", notes: "Test observations", parts: [], complete: true };
  await expect(f.user("tech").mutation(api.operations.recordWork, work)).rejects.toThrow(/checklist/);
  await expect(f.user("tech").mutation(api.operations.recordWork, { ...work, preventiveResults: [{ label: "TEST maintenance check", passed: false }] })).rejects.toThrow(/checklist/);
  await f.user("tech").mutation(api.operations.recordWork, { ...work, preventiveResults: [{ label: "TEST maintenance check", passed: true }] });
  const history = await f.user("tech").query(api.workflows.workHistory, { id: a, paginationOpts: { cursor: null, numItems: 20 } }); expect(history.page[0].preventiveResults?.[0].passed).toBe(true);
  await expect(f.user("supervisor").mutation(api.preventive.reschedule, { id, expectedRevision: 1, nextDueAt: dueAt, active: false, reason: "Test" })).rejects.toThrow(/changed/);
});

test('management overview counts only scoped operational records and excludes private drafts', async () => {
  const f = await setup();
  await f.t.run(async (ctx) => {
    await ctx.db.insert('equipment', { assetId: 'TEST-INCOMPLETE', name: 'Test', model: '', location: '', departmentId: f.a, identityVerified: false });
    await ctx.db.insert('equipment', { assetId: 'OTHER-SCOPE', name: 'Other', model: 'Other', location: 'Other', departmentId: f.b, identityVerified: true });
    const base = { equipmentId: f.equipment, departmentId: f.a, reporterId: f.reporter, operationId: 'overview', category: 'Other', symptoms: 'Test only', description: '', priority: 'Routine' as const, condition: 'Unknown', inUse: false, noticedAt: 1, createdAt: 1 };
    await ctx.db.insert('faultReports', { ...base, submissionState: 'submitted', triagedPriority: 'Urgent' });
    await ctx.db.insert('faultReports', { ...base, operationId: 'private', submissionState: 'draft' });
    await ctx.db.insert('safetyHolds', { equipmentId: f.equipment, departmentId: f.a, active: true, reason: 'Test hold', createdBy: f.admin, createdAt: 1 });
  });
  const result = await f.user('admin').query(api.operations.managementSummary);
  expect(result).toMatchObject({ equipment: 2, reports: 1, completeRecords: 1, incompleteRecords: 1, activeHolds: 1, verifiedIdentities: 1, limited: false });
  expect(result.priorities).toContainEqual({ label: 'Urgent', count: 1 });
  expect(result.priorities).toContainEqual({ label: 'Routine', count: 0 });
  await expect(f.user('reporter').query(api.operations.managementSummary)).rejects.toThrow();
  await expect(f.t.query(api.operations.managementSummary)).rejects.toThrow(/Sign in/);
});

test('report exports enforce scope, effective priority and chronological dates before generating CSV', async () => {
  const f = await setup();
  await f.t.run(async (ctx) => {
    const base = { equipmentId: f.equipment, departmentId: f.a, reporterId: f.reporter, category: '=TEST()', symptoms: 'Test only', description: '', priority: 'Routine' as const, condition: 'Unknown', inUse: false, noticedAt: 1, submissionState: 'submitted' as const };
    await ctx.db.insert('faultReports', { ...base, operationId: 'one', createdAt: 100, triagedPriority: 'Urgent' });
    await ctx.db.insert('faultReports', { ...base, operationId: 'two', createdAt: 200 });
    await ctx.db.insert('faultReports', { ...base, operationId: 'three', createdAt: 100, submissionState: 'draft', triagedPriority: 'Urgent' });
  });
  const args = { departmentId: f.a, from: 100, to: 100, priority: 'Urgent' as const };
  const result = await f.user('admin').query(api.operations.exportReports, args);
  expect(result.count).toBe(1);
  expect(result.csv).toContain("'=TEST()");
  expect((await f.user('admin').query(api.operations.exportReports, { ...args, from: 101, to: 200 })).count).toBe(0);
  await expect(f.user('admin').query(api.operations.exportReports, { ...args, from: 200, to: 100 })).rejects.toThrow(/date range/);
  await expect(f.user('admin').query(api.operations.exportReports, { ...args, departmentId: f.b })).rejects.toThrow(/scope/);
  await expect(f.t.query(api.operations.exportReports, args)).rejects.toThrow(/Sign in/);
});

test('equipment status orders real events while keeping drafts and other reporters private', async () => {
  const f = await setup();
  await f.t.run(async (ctx) => {
    const base = { equipmentId: f.equipment, departmentId: f.a, category: 'Other', description: '', priority: 'Routine' as const, condition: 'Unknown', inUse: false, noticedAt: 1 };
    await ctx.db.insert('faultReports', { ...base, reporterId: f.reporter, operationId: 'own', symptoms: 'Own report', createdAt: 100, submissionState: 'submitted' });
    await ctx.db.insert('faultReports', { ...base, reporterId: f.tech, operationId: 'other', symptoms: 'Other staff report', createdAt: 200, submissionState: 'submitted' });
    await ctx.db.insert('faultReports', { ...base, reporterId: f.reporter, operationId: 'draft', symptoms: 'PRIVATE DRAFT', createdAt: 300, submissionState: 'draft' });
    await ctx.db.insert('safetyHolds', { equipmentId: f.equipment, departmentId: f.a, active: false, reason: 'Test restriction', createdBy: f.admin, createdAt: 400, resolvedAt: 500, resolvedBy: f.admin, resolutionReason: 'Test resolution' });
  });
  const result = await f.user('reporter').query(api.workflows.equipmentStatus, { id: f.equipment });
  expect(result.events.map((event) => event.at)).toEqual([500, 400, 100]);
  expect(JSON.stringify(result)).not.toContain('PRIVATE DRAFT');
  expect(JSON.stringify(result)).not.toContain('Other staff report');
  const supervisor = await f.user('supervisor').query(api.workflows.equipmentStatus, { id: f.equipment });
  expect(supervisor.events.map((event) => event.at)).toEqual([500, 400, 200, 100]);
  await expect(f.user('other').query(api.workflows.equipmentStatus, { id: f.equipment })).rejects.toThrow(/scope/);
  await expect(f.t.query(api.workflows.equipmentStatus, { id: f.equipment })).rejects.toThrow(/Sign in/);
});
