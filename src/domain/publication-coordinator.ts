import { EncryptedReportQueue, publicationFailure, requireMatchingReceipt, type PendingPublication } from "./report-queue";

export const MAX_PUBLICATION_ATTEMPTS = 5;
export const MAX_RECEIPT_CHECKS = 3;
export const MAX_RECOVERY_ATTEMPTS = 1;
export const retryDelay = (attempt: number) => Math.min(60_000, 1000 * 2 ** Math.max(0, attempt - 1));
export class PublicationPaused extends Error { constructor() { super("Submission paused. Reconnect and restore approved staff access before retrying."); } }
export function transientPublicationFailure(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  // A server rejection must never be treated as a transport failure because its message mentions a network.
  if (typeof error === "object" && error !== null && ("data" in error || "code" in error)) return false;
  return /network|fetch failed|failed to fetch|timed? ?out|connection (lost|closed|unavailable)|offline|transport|websocket/i.test(message);
}
export function duePublication(row: PendingPublication, now: number): boolean {
  if (row.state === "SYNCED" || row.state === "CONFLICT" || row.retryCount >= MAX_PUBLICATION_ATTEMPTS) return false;
  if (row.state === "FAILED" && !row.retryable) return false;
  const due = row.nextRetryAt ?? (row.state === "SYNCING" && row.lastAttempt !== undefined ? row.lastAttempt + retryDelay(row.retryCount) : 0);
  return due <= now;
}
/** One instance per authorized session. Requests for the same report share one promise. */
export class PublicationCoordinator {
  private inFlight = new Map<string, Promise<string>>();
  private serial: Promise<unknown> = Promise.resolve();
  constructor(private queue: EncryptedReportQueue, private owner: string, private send: (row: PendingPublication) => Promise<string>, private current: () => boolean, private changed: (rows: PendingPublication[]) => void, private now = Date.now, private message = (error: unknown) => error instanceof Error ? error.message : String(error), private receipt?: (row: PendingPublication) => Promise<string | null>) {}
  private assertCurrent() { if (!this.current()) throw new PublicationPaused(); }
  private async update(change: (rows: PendingPublication[]) => PendingPublication[]) {
    const rows = await this.queue.update(this.owner, change);
    if (this.current()) this.changed(rows);
    return rows;
  }
  async load() { this.assertCurrent(); const rows = await this.queue.load(this.owner); this.assertCurrent(); this.changed(rows); return rows; }
  sendEntry(id: string, recover = false): Promise<string> {
    const existing = this.inFlight.get(id); if (existing) return existing;
    const work = this.serial.catch(() => {}).then(async () => {
      this.assertCurrent();
      const row = (await this.queue.load(this.owner)).find((item) => item.id === id);
      this.assertCurrent();
      if (!row) throw Error("Saved submission is unavailable.");
      if (row.state === "SYNCED" && row.serverId === row.reportId) return row.serverId;
      const exhausted = row.retryCount >= MAX_PUBLICATION_ATTEMPTS;
      if (exhausted && !recover) return this.reconcile(row);
      if (recover && (!exhausted || !row.recoveryEligible || (row.recoveryCount ?? 0) >= MAX_RECOVERY_ATTEMPTS)) throw Error("The bounded recovery attempt is unavailable. Check the server receipt and review the saved draft.");
      if (!recover && !duePublication(row, this.now())) throw Error(row.state === "CONFLICT" ? "Review the conflicting draft before resubmission." : "Retry is not due or the attempt limit has been reached. Review the saved draft.");
      const attempt = { ...row, state: "SYNCING" as const, retryCount: recover ? row.retryCount : row.retryCount + 1, recoveryCount: (row.recoveryCount ?? 0) + (recover ? 1 : 0), recoveryEligible: false, lastAttempt: this.now(), updatedAt: this.now(), nextRetryAt: undefined, retryable: undefined, serverId: undefined };
      await this.update((items) => items.map((item) => item.id === id ? attempt : item));
      this.assertCurrent();
      try {
        const receipt = requireMatchingReceipt(row.reportId, await this.send(attempt));
        await this.update((items) => items.map((item) => item.id === id ? { ...item, state: "SYNCED", serverId: receipt, lastError: undefined, retryable: false, nextRetryAt: undefined, updatedAt: this.now() } : item));
        return receipt;
      } catch (failure) {
        const state = publicationFailure(failure);
        const retryable = state !== "CONFLICT" && transientPublicationFailure(failure) && attempt.retryCount < MAX_PUBLICATION_ATTEMPTS;
        const message = this.message(failure).slice(0, 4000);
        await this.update((items) => items.map((item) => item.id === id && item.state !== "SYNCED" && item.expectedRevision === attempt.expectedRevision && item.expectedAttachmentRevision === attempt.expectedAttachmentRevision && item.retryCount === attempt.retryCount ? { ...item, state, lastError: message, retryable, nextRetryAt: retryable ? this.now() + retryDelay(attempt.retryCount) : undefined, updatedAt: this.now() } : item));
        throw failure;
      }
    });
    this.serial = work;
    this.inFlight.set(id, work);
    void work.finally(() => this.inFlight.delete(id)).catch(() => {}); // Caller receives the original rejection.
    return work;
  }
  private async reconcile(row: PendingPublication): Promise<string> {
    if (!this.receipt || (row.reconciliationCount ?? 0) >= MAX_RECEIPT_CHECKS) throw Error("Submission attempt limit reached; receipt check limit reached or reconciliation unavailable. Review the server report; attempts have not been reset.");
    await this.update((items) => items.map((item) => item.id === row.id ? { ...item, reconciliationCount: (item.reconciliationCount ?? 0) + 1, recoveryEligible: false, updatedAt: this.now() } : item));
    this.assertCurrent();
    let receipt: string | null;
    try { receipt = await this.receipt(row); }
    catch (failure) {
      const conflict = publicationFailure(failure) === "CONFLICT";
      await this.update((items) => items.map((item) => item.id === row.id && item.state !== "SYNCED" ? { ...item, state: conflict ? "CONFLICT" : item.state, recoveryEligible: false, lastError: `Receipt check failed: ${this.message(failure)}`.slice(0, 4000), updatedAt: this.now() } : item));
      throw failure;
    }
    if (receipt !== null) {
      requireMatchingReceipt(row.reportId, receipt);
      await this.update((items) => items.map((item) => item.id === row.id ? { ...item, state: "SYNCED", serverId: receipt!, lastError: undefined, retryable: false, recoveryEligible: false, nextRetryAt: undefined, updatedAt: this.now() } : item));
      return receipt;
    }
    const recoveryEligible = (row.recoveryCount ?? 0) < MAX_RECOVERY_ATTEMPTS;
    await this.update((items) => items.map((item) => item.id === row.id && item.state !== "SYNCED" ? { ...item, state: "FAILED", retryable: false, recoveryEligible, lastError: recoveryEligible ? "The server still has a draft. Five submission attempts are exhausted. Review it, then explicitly confirm the single recovery attempt; no new report will be created." : "The server still has a draft. Submission and explicit recovery attempts are exhausted. Review the server report; no further automatic send is authorized.", updatedAt: this.now() } : item));
    throw Error(recoveryEligible ? "Attempt limit reached. Server draft reconciled; explicit bounded recovery is available after review." : "Attempt limit reached. Server draft reconciled; explicit bounded recovery is exhausted.");
  }
  async enqueue(reportId: string, revision: number, attachmentRevision: number, operationId: string) {
    this.assertCurrent();
    if (this.inFlight.size) throw Error("A submission is in progress. Wait for its result before reviewing another snapshot.");
    const rows = await this.update((items) => {
      const prior = items.find((item) => item.reportId === reportId);
      if (prior?.state === "SYNCED") return items;
      if (prior && prior.retryCount >= MAX_PUBLICATION_ATTEMPTS && prior.expectedRevision === revision && (prior.expectedAttachmentRevision ?? 0) === attachmentRevision) throw Error("Attempt limit reached. Reconcile the saved submission and explicitly confirm bounded recovery; do not reset its attempts.");
      if (prior && ["PENDING", "SYNCING"].includes(prior.state)) {
        if (prior.expectedRevision !== revision || (prior.expectedAttachmentRevision ?? 0) !== attachmentRevision) throw Error("A different snapshot is pending. Review the saved submission first.");
        return items;
      }
      const entry: PendingPublication = { id: prior?.id ?? operationId, owner: this.owner, reportId, expectedRevision: revision, expectedAttachmentRevision: attachmentRevision, createdAt: prior?.createdAt ?? this.now(), updatedAt: this.now(), state: "PENDING", retryCount: 0 };
      return [...items.filter((item) => item.reportId !== reportId && item.state !== "SYNCED"), entry];
    });
    this.assertCurrent();
    return this.sendEntry(rows.find((item) => item.reportId === reportId)!.id);
  }
}
