/** Cleanup is safe only after a fresh read proves that the failed operation did not commit. */
export async function finishStoredEvidence<T>(finish: () => Promise<T>, isReferenced: () => Promise<boolean>, discard: () => Promise<void>): Promise<T> {
  try { return await finish(); }
  catch (failure) {
    try { if (!await isReferenced()) await discard(); }
    catch { /* Keep uncertain evidence and preserve the original finalization failure. */ }
    throw failure;
  }
}
