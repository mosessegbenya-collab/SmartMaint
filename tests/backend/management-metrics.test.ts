import { expect, test, vi } from "vitest";
import { collectManagementMetrics, metricSources, type MetricsPage } from "../../src/domain/management-metrics";
import { deliverAuthorizedExport } from "../../src/domain/export-delivery";

const empty: MetricsPage = { isDone: true, continueCursor: "", counts: {}, ids: [] };

test("management reads every source and department, including beyond the first hundred records", async () => {
  const progress = vi.fn();
  const read = vi.fn(async (department: string, source: string, cursor: string | null) => {
    if (source !== "equipment") return empty;
    const ids = Array.from({ length: cursor ? 25 : 100 }, (_, i) => `${department}-${cursor ?? 'first'}-${i}`);
    return { ids, counts: { equipment: ids.length }, isDone: cursor !== null, continueCursor: cursor ? "" : "next" };
  });
  const result = await collectManagementMetrics(["A", "B"], read, () => true, progress);
  expect(result.equipment).toBe(250);
  expect(result.reports).toBe(0);
  expect(result.timedRepairs).toBe(0);
  for (const department of ["A", "B"]) for (const source of metricSources) expect(read).toHaveBeenCalledWith(department, source, null);
  expect(progress).toHaveBeenCalledWith(expect.objectContaining({ department: 2, departments: 2 }));
});

test("calculation rejects duplicate records, repeated cursors, malformed counts and partial failures", async () => {
  const page = { ...empty, isDone: false, continueCursor: "same", ids: ["A"], counts: { equipment: 1 } };
  await expect(collectManagementMetrics(["A"], async () => page, () => true)).rejects.toThrow(/repeated/);
  await expect(collectManagementMetrics(["A"], async () => ({ ...page, ids: [] }), () => true)).rejects.toThrow(/progressing/);
  await expect(collectManagementMetrics(["A"], async () => ({ ...empty, ids: ["A", "A"] }), () => true)).rejects.toThrow(/repeated/);
  const invalid: Record<string, number>[] = [{ equipment: -1 }, { equipment: NaN }, { equipment: 1.5 }, { unknown: 1 }];
  for (const counts of invalid) await expect(collectManagementMetrics(["A"], async () => ({ ...empty, counts }), () => true)).rejects.toThrow(/invalid counts/);
  await expect(collectManagementMetrics(["A"], async () => { throw Error("Access revoked"); }, () => true)).rejects.toThrow(/revoked/);
  await expect(collectManagementMetrics(["A", "A"], async () => empty, () => true)).rejects.toThrow(/department/);
});

test("account changes during the final metrics page cannot publish stale totals", async () => {
  let current = true;
  await expect(collectManagementMetrics(["A"], async () => { current = false; return empty; }, () => current)).rejects.toThrow(/session changed/);
});

test("export reauthorizes after the destination dialog and writes once", async () => {
  const authorize = vi.fn(async () => {}), write = vi.fn(async () => {});
  expect(await deliverAuthorizedExport({ current: () => true, authorize, chooseDestination: async () => "folder", write })).toBe("written");
  expect(authorize).toHaveBeenCalledTimes(2);
  expect(write).toHaveBeenCalledExactlyOnceWith("folder");
  expect(authorize.mock.invocationCallOrder[1]).toBeLessThan(write.mock.invocationCallOrder[0]);
});

test("export cannot write after sign-out, a selection change or revoked authorization during the dialog", async () => {
  const write = vi.fn(async () => {});
  let current = true;
  await expect(deliverAuthorizedExport({ current: () => current, authorize: async () => {}, chooseDestination: async () => { current = false; return "folder"; }, write })).rejects.toThrow(/session or selection/);
  const authorize = vi.fn().mockResolvedValueOnce(undefined).mockRejectedValueOnce(Error("Export access changed"));
  await expect(deliverAuthorizedExport({ current: () => true, authorize, chooseDestination: async () => "folder", write })).rejects.toThrow(/access changed/);
  expect(write).not.toHaveBeenCalled();
});

test("cancelled dialogs never write a file and write failures never report success", async () => {
  const write = vi.fn(async () => {});
  expect(await deliverAuthorizedExport({ current: () => true, authorize: async () => {}, chooseDestination: async () => null, write })).toBe("cancelled");
  expect(write).not.toHaveBeenCalled();
  await expect(deliverAuthorizedExport({ current: () => true, authorize: async () => {}, chooseDestination: async () => "folder", write: async () => { throw Error("Disk full"); } })).rejects.toThrow(/Disk full/);
});
