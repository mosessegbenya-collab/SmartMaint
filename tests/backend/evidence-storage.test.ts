import { expect, test, vi } from "vitest";
import { finishStoredEvidence } from "../../convex/lib/evidence_storage";

test('lost upload finalization responses preserve committed blobs and the original error', async () => {
  const failure = Error('Transport lost after commit');
  const discard = vi.fn(async () => {});
  await expect(finishStoredEvidence(async () => { throw failure; }, async () => true, discard)).rejects.toBe(failure);
  expect(discard).not.toHaveBeenCalled();
});

test('failed finalization discards a blob only when a fresh authorized read proves it unreferenced', async () => {
  const failure = Error('Photo limit rejected');
  const discard = vi.fn(async () => {});
  await expect(finishStoredEvidence(async () => { throw failure; }, async () => false, discard)).rejects.toBe(failure);
  expect(discard).toHaveBeenCalledOnce();
});

test('revocation or network failure while checking a commit keeps uncertain evidence', async () => {
  const failure = Error('Unknown commit result');
  for (const reason of ['Permission revoked', 'Network unavailable']) {
    const discard = vi.fn(async () => {});
    await expect(finishStoredEvidence(async () => { throw failure; }, async () => { throw Error(reason); }, discard)).rejects.toBe(failure);
    expect(discard).not.toHaveBeenCalled();
  }
});

test('cleanup failure does not replace the operation error and success never performs failure cleanup', async () => {
  const failure = Error('Original rejection');
  await expect(finishStoredEvidence(async () => { throw failure; }, async () => false, async () => { throw Error('Cleanup failed'); })).rejects.toBe(failure);
  const check = vi.fn(async () => false), discard = vi.fn(async () => {});
  expect(await finishStoredEvidence(async () => 'receipt', check, discard)).toBe('receipt');
  expect(check).not.toHaveBeenCalled(); expect(discard).not.toHaveBeenCalled();
});
