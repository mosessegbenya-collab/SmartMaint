import { EncryptedReportQueue, publicationFailure, requireMatchingReceipt, type PendingPublication } from "./report-queue";

export const MAX_PUBLICATION_ATTEMPTS = 5;
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
  constructor(private queue: EncryptedReportQueue, private owner: string, private send: (row: PendingPublication) => Promise<string>, private current: () => boolean, private changed: (rows: PendingPublication[]) => void, private now = Date.now, private message = (error: unknown) => error instanceof Error ? error.message : String(error)) {}
  private assertCurrent() { if (!this.current()) throw new PublicationPaused(); }
  private async update(change: (rows: PendingPublication[]) => PendingPublication[]) {
    const rows = await this.queue.update(this.owner, change);
    if (this.current()) this.changed(rows);
    return rows;
  }
  async load() { this.assertCurrent(); const rows = await this.queue.load(this.owner); this.assertCurrent(); this.changed(rows); return rows; }
  sendEntry(id: string): Promise<string> {
    const existing = this.inFlight.get(id); if (existing) return existing;
    const work = this.serial.catch(() => {}).then(async () => {
      this.assertCurrent();
      const row = (await this.queue.load(this.owner)).find((item) => item.id === id);
      this.assertCurrent();
      if (!row) throw Error("Saved submission is unavailable.");
      if (row.state === "SYNCED" && row.serverId === row.reportId) return row.serverId;
      if (!duePublication(row, this.now())) throw Error(row.state === "CONFLICT" ? "Review the conflicting draft before resubmission." : "Retry is not due or the attempt limit has been reached. Review the saved draft.");
      const attempt = { ...row, state: "SYNCING" as const, retryCount: row.retryCount + 1, lastAttempt: this.now(), updatedAt: this.now(), nextRetryAt: undefined, retryable: undefined, serverId: undefined };
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
  async enqueue(reportId: string, revision: number, attachmentRevision: number, operationId: string) {
    this.assertCurrent();
    if (this.inFlight.size) throw Error("A submission is in progress. Wait for its result before reviewing another snapshot.");
    const rows = await this.update((items) => {
      const prior = items.find((item) => item.reportId === reportId);
      if (prior?.state === "SYNCED") return items;
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
