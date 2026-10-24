import { expect, test } from "vitest";
import { EncryptedReportQueue, publicationFailure, requireMatchingReceipt, type PendingPublication, type PrivateStore } from "../../src/domain/report-queue";
function memory() { const values = new Map<string, string>(); const store: PrivateStore = { get: async (key) => values.get(key) ?? null, set: async (key, value) => { values.set(key, value); }, remove: async (key) => { values.delete(key); } }; let generation = 0; return { values, store, queue: new EncryptedReportQueue(store, () => `generation-${++generation}`) }; }
const entry = (owner = "TEST_OWNER", id = "TEST_OPERATION"): PendingPublication => ({ id, owner, reportId: "TEST_REPORT", expectedRevision: 1, createdAt: 1, updatedAt: 1, state: "PENDING", retryCount: 0 });

test('all publication transports require the exact report receipt before acknowledging submission', () => {
  expect(requireMatchingReceipt('TEST_REPORT', 'TEST_REPORT')).toBe('TEST_REPORT');
  for (const receipt of [undefined, null, true, { id: 'TEST_REPORT' }, 'OTHER_REPORT']) expect(() => requireMatchingReceipt('TEST_REPORT', receipt)).toThrow(/unexpected report receipt/);
});
test("private queue survives a new adapter instance, isolates owners and preserves all sync states", async () => {
  const f = memory(); await f.queue.update("TEST_OWNER", () => [entry()]);
  let generation = 0; const restored = new EncryptedReportQueue(f.store, () => `new-generation-${++generation}`); expect(await restored.load("TEST_OWNER")).toEqual([entry()]); expect(await restored.load("OTHER_OWNER")).toEqual([]);
  for (const state of ["SYNCING", "SYNCED", "FAILED", "CONFLICT"] as const) { await restored.update("TEST_OWNER", (rows) => rows.map((r) => ({ ...r, state, serverId: state === "SYNCED" ? r.reportId : undefined }))); expect((await restored.load("TEST_OWNER"))[0].state).toBe(state); }
});
test("failed chunk writes retain the last complete queue; missing chunks never become empty success", async () => {
  const f = memory(); await f.queue.update("TEST_OWNER", () => [entry()]); let fail = true; const set = f.store.set;
  f.store.set = async (key, value) => { if (fail && !key.endsWith("TEST_OWNER")) throw Error("Storage unavailable"); return set(key, value); };
  await expect(f.queue.update("TEST_OWNER", () => [entry("TEST_OWNER", "REPLACEMENT")])).rejects.toThrow(/Storage/); fail = false; expect((await f.queue.load("TEST_OWNER"))[0].id).toBe("TEST_OPERATION");
  const chunk = [...f.values.keys()].find((key) => key.endsWith(".0"))!; f.values.delete(chunk); await expect(f.queue.load("TEST_OWNER")).rejects.toThrow(/incomplete/);
});
test("concurrent updates preserve records, queue overflow never discards pending work, and conflicts are explicit", async () => {
  const f = memory(); await Promise.all([f.queue.update("TEST_OWNER", (rows) => [...rows, entry("TEST_OWNER", "A")]), f.queue.update("TEST_OWNER", (rows) => [...rows, { ...entry("TEST_OWNER", "B"), reportId: "TEST_REPORT_B" }])]); expect(await f.queue.load("TEST_OWNER")).toHaveLength(2);
  await expect(f.queue.update("TEST_OWNER", () => Array.from({ length: 21 }, (_, i) => entry("TEST_OWNER", `OP-${i}`)))).rejects.toThrow(/full/); expect(await f.queue.load("TEST_OWNER")).toHaveLength(2);
  expect(publicationFailure(Error("Draft revision changed"))).toBe("CONFLICT"); expect(publicationFailure(Error("Network unavailable"))).toBe("FAILED");
});
test("Unicode error messages round-trip without splitting code points or oversizing secure-store chunks", async () => {
  const f = memory(); await f.queue.update("TEST_OWNER", () => [{ ...entry(), lastError: "🔧修理".repeat(500) }]);
  expect((await f.queue.load("TEST_OWNER"))[0].lastError).toBe("🔧修理".repeat(500));
  expect([...f.values.values()].every((value) => new TextEncoder().encode(value).length <= 1536)).toBe(true);
});

test('reading a queue cannot race replacement and deletion of its storage generation', async () => {
  const f = memory(); await f.queue.update('TEST_OWNER', () => [entry()]);
  const original = f.store.get;
  let release!: () => void, reading!: () => void;
  const paused = new Promise<void>((resolve) => { release = resolve; });
  const started = new Promise<void>((resolve) => { reading = resolve; });
  let block = true;
  f.store.get = async (key) => {
    const value = await original(key);
    if (block && key === 'smartmaint.queue.TEST_OWNER') { block = false; reading(); await paused; }
    return value;
  };
  const reader = f.queue.load('TEST_OWNER'); await started;
  const writer = f.queue.update('TEST_OWNER', (rows) => rows.map((row) => ({ ...row, retryCount: 1 })));
  const whileReading = await Promise.race([writer.then(() => 'writer completed'), new Promise<string>((resolve) => setTimeout(() => resolve('reader holds generation'), 25))]);
  release();
  expect(whileReading).toBe('reader holds generation');
  expect((await reader)[0].retryCount).toBe(0);
  await writer;
  expect((await f.queue.load('TEST_OWNER'))[0].retryCount).toBe(1);
});
