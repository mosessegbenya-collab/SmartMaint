import { expect, test } from "vitest";
import { DraftWriter } from "../../src/domain/draft-writer";
import { ReportRecoveryRepository, recoveryForReport, type RecoveryDraft, type RecoveryFields } from "../../src/domain/report-recovery";
import { compareReportFields, reportFieldsFromServer } from "../../src/domain/report-field-comparison";

const fields: RecoveryFields = { category: "Electrical/Power", symptoms: "Fictional power fault", description: "Training example", priority: "High", condition: "Unknown", inUse: "No", noticedAt: "2026-10-27T10:00:00Z", emergency: false };
const draft: Omit<RecoveryDraft, "photos"> = { owner: "OWNER", operationId: "OP", equipmentId: "DEVICE", departmentId: "DEPARTMENT", updatedAt: 1, fields };
function repository() {
  const data = new Map<string, string>();
  return new ReportRecoveryRepository({ get: async key => data.get(key) ?? null, set: async (key, value) => { data.set(key, value); }, remove: async key => { data.delete(key); } });
}
function gate() {
  let resolve!: () => void;
  const promise = new Promise<void>(done => { resolve = done; });
  return { promise, resolve };
}

test("a confirmed submission drains its in-flight autosave before removing the device draft", async () => {
  const repo = repository(), entered = gate(), release = gate();
  const writer = new DraftWriter<typeof draft>(async value => { entered.resolve(); await release.promise; await repo.saveDraft(value); }, () => {});
  writer.schedule(draft);
  const inFlight = writer.flush(); await entered.promise;
  writer.schedule({ ...draft, updatedAt: 2 });
  const cleanup = writer.close().then(() => repo.removeDraft(draft.owner, draft.operationId));
  writer.schedule({ ...draft, updatedAt: 3 }); // An old render or background event cannot reopen it.
  release.resolve(); await inFlight; await cleanup; await writer.flush();
  expect(await repo.list(draft.owner)).toEqual([]);
  await expect(writer.writeNow(draft)).rejects.toThrow(/closed/);
  expect(await repo.list(draft.owner)).toEqual([]);
});

test("an explicit server-revision save follows in-flight typing and replaces the pending snapshot", async () => {
  const repo = repository(), entered = gate(), release = gate();
  const writes: number[] = [];
  const writer = new DraftWriter<typeof draft>(async value => {
    if (value.updatedAt === 1) { entered.resolve(); await release.promise; }
    writes.push(value.updatedAt); await repo.saveDraft(value);
  }, () => {});
  writer.schedule(draft); const first = writer.flush(); await entered.promise;
  writer.schedule({ ...draft, updatedAt: 2 });
  const latest = { ...draft, updatedAt: 3, server: { id: "REPORT", revision: 2 } };
  const saved = writer.writeNow(latest);
  release.resolve(); await first; await saved; await writer.flush();
  expect(writes).toEqual([1, 3]);
  expect((await repo.list(draft.owner))[0].server).toEqual(latest.server);
});

test("failed autosaves cannot prevent closing and explicit cleanup retry removes only its owned draft", async () => {
  const repo = repository(); await repo.saveDraft(draft); await repo.saveDraft({ ...draft, owner: "OTHER" });
  const writer = new DraftWriter<typeof draft>(async () => { throw Error("Storage full"); }, () => {});
  writer.schedule(draft); await expect(writer.flush()).rejects.toThrow(/Storage full/);
  await writer.close(); await repo.removeDraft(draft.owner, draft.operationId);
  await writer.close(); await repo.removeDraft(draft.owner, draft.operationId);
  expect(await repo.list(draft.owner)).toEqual([]);
  expect(await repo.list("OTHER")).toHaveLength(1);
});

test("conflict comparison covers every report field, including priority, condition, in-use state and urgent mode", () => {
  const changed: RecoveryFields = { category: "Other/Unknown", symptoms: "Different", description: "Revised", priority: "Urgent", condition: "Functioning with concern", inUse: "Yes", noticedAt: "2026-10-27T11:00:00Z", emergency: true };
  const rows = compareReportFields(fields, changed);
  expect(rows).toHaveLength(8);
  expect(rows.every(row => row.changed)).toBe(true);
  expect(rows.map(row => row.key).sort()).toEqual(Object.keys(fields).sort());
  expect(rows.find(row => row.key === "description")).toMatchObject({ left: "Training example", right: "Revised" });
});

test("equivalent timestamp formats compare equal without hiding missing values or other changed fields", () => {
  expect(compareReportFields(fields, { ...fields, noticedAt: "2026-10-27T12:00:00+02:00" }).some(row => row.changed)).toBe(false);
  expect(compareReportFields(fields, { ...fields, inUse: "", description: "" }).filter(row => row.changed).map(row => row.key)).toEqual(["description", "inUse"]);
  expect(compareReportFields(fields, { ...fields, noticedAt: "invalid" }).find(row => row.key === "noticedAt")?.changed).toBe(true);
});

test("server conversion preserves false in-use state and missing urgent mode as explicit values", () => {
  const normalized = reportFieldsFromServer({ ...fields, inUse: false, noticedAt: Date.parse(fields.noticedAt), emergency: undefined });
  expect(normalized.inUse).toBe("No"); expect(normalized.emergency).toBe(false);
  expect(compareReportFields(fields, normalized).some(row => row.changed)).toBe(false);
});

test("recovery of a submitted report matches owner, operation, equipment, department and any stored server identity", () => {
  const copy = { ...draft, photos: [] };
  const report = { id: "REPORT", reporterId: draft.owner, operationId: draft.operationId, equipmentId: draft.equipmentId, departmentId: draft.departmentId };
  expect(recoveryForReport([copy], draft.owner, report)).toBe(copy);
  expect(recoveryForReport([{ ...copy, server: { id: "DIFFERENT", revision: 1 } }], draft.owner, report)).toBeNull();
  for (const change of [{ reporterId: "OTHER" }, { operationId: "OTHER" }, { equipmentId: "OTHER" }, { departmentId: "OTHER" }]) expect(recoveryForReport([copy], draft.owner, { ...report, ...change })).toBeNull();
  expect(recoveryForReport([copy], "OTHER", report)).toBeNull();
});

test("discarding a reviewed device copy cannot delete newer edits that arrived after review", async () => {
  const repo = repository(); await repo.saveDraft(draft);
  const [reviewed] = await repo.list(draft.owner);
  await repo.saveDraft({ ...draft, fields: { ...fields, priority: 'Urgent', symptoms: 'New local findings' }, updatedAt: 2 });
  await expect(repo.removeDraft(draft.owner, draft.operationId, reviewed)).rejects.toThrow(/changed after review/);
  const [latest] = await repo.list(draft.owner); expect(latest.fields.symptoms).toBe('New local findings');
  await repo.removeDraft(draft.owner, draft.operationId, latest); expect(await repo.list(draft.owner)).toEqual([]);
});
