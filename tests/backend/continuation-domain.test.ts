import { expect, test, vi } from "vitest";
import { DraftWriter } from "../../src/domain/draft-writer";
import { collectReportExport } from "../../src/domain/paged-export";

test('navigation flush saves only the latest pending snapshot and preserves serial ordering', async () => {
  vi.useFakeTimers();
  try {
    const values: string[] = [];
    const writer = new DraftWriter<string>(async (value) => { values.push(value); }, () => { throw Error('Unexpected failure'); });
    writer.schedule('old'); writer.schedule('latest');
    await writer.flush(); expect(values).toEqual(['latest']);
    await vi.runAllTimersAsync(); expect(values).toEqual(['latest']);
    writer.schedule('next owner-scoped snapshot'); await writer.flush(); expect(values).toHaveLength(2);
  } finally { vi.useRealTimers(); }
});

test('draft flush failures are visible and later explicit writes still work', async () => {
  const write = vi.fn().mockRejectedValueOnce(Error('Allocation failed')).mockResolvedValueOnce(undefined);
  const writer = new DraftWriter<string>(write, () => {});
  writer.schedule('first'); await expect(writer.flush()).rejects.toThrow(/Allocation/);
  writer.schedule('second'); await writer.flush(); expect(write).toHaveBeenLastCalledWith('second');
});

test('export rejects duplicate pages, pagination loops, and account changes without accepting partial CSV', async () => {
  const page = { count: 1, ids: ['A'], csv: 'A,B,C,D', isDone: false, continueCursor: 'cursor' };
  await expect(collectReportExport(async () => page)).rejects.toThrow(/repeated/);
  let active = true;
  await expect(collectReportExport(async () => { active = false; return { ...page, isDone: true }; }, () => active)).rejects.toThrow(/session changed/);
  const empty = { ...page, count: 0, ids: [], csv: '' };
  await expect(collectReportExport(async () => empty)).rejects.toThrow(/progress/);
});
