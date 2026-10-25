export type QueueState = "PENDING" | "SYNCING" | "SYNCED" | "FAILED" | "CONFLICT";
export type PendingPublication = { id: string; owner: string; reportId: string; expectedRevision: number; expectedAttachmentRevision?: number; createdAt: number; updatedAt: number; state: QueueState; retryCount: number; lastAttempt?: number; lastError?: string; serverId?: string; retryable?: boolean; nextRetryAt?: number; reconciliationCount?: number; recoveryCount?: number; recoveryEligible?: boolean };
export type PrivateStore = { get: (key: string) => Promise<string | null>; set: (key: string, value: string) => Promise<void>; remove: (key: string) => Promise<void>; prune?: (key: string, value: string, removeKeys: string[]) => Promise<void> };
export function requireMatchingReceipt(reportId: string, receipt: unknown): string {
  if (receipt !== reportId) throw Error("The server returned an unexpected report receipt.");
  return reportId;
}
export function validatePublicationRows(rows: unknown, owner: string): asserts rows is PendingPublication[] {
  const validId = (value: unknown) => typeof value === "string" && /^[A-Za-z0-9_-]{1,160}$/.test(value);
  if (!Array.isArray(rows) || rows.length > 20) throw Error("Private queue is full or invalid.");
  const ids = new Set<string>(), reports = new Set<string>();
  for (const row of rows) {
    if (!row || row.owner !== owner || !validId(row.id) || !validId(row.reportId) || ids.has(row.id) || reports.has(row.reportId)
      || !["PENDING", "SYNCING", "SYNCED", "FAILED", "CONFLICT"].includes(row.state)
      || !Number.isSafeInteger(row.expectedRevision) || row.expectedRevision < 1
      || (row.expectedAttachmentRevision !== undefined && (!Number.isSafeInteger(row.expectedAttachmentRevision) || row.expectedAttachmentRevision < 0))
      || (row.state === "SYNCED" && row.serverId !== row.reportId)
      || !Number.isSafeInteger(row.retryCount) || row.retryCount < 0
      || (row.reconciliationCount !== undefined && (!Number.isSafeInteger(row.reconciliationCount) || row.reconciliationCount < 0 || row.reconciliationCount > 3))
      || (row.recoveryCount !== undefined && (!Number.isSafeInteger(row.recoveryCount) || row.recoveryCount < 0 || row.recoveryCount > 1))
      || (row.recoveryEligible !== undefined && typeof row.recoveryEligible !== "boolean")
      || !Number.isFinite(row.createdAt) || !Number.isFinite(row.updatedAt)
      || (row.lastAttempt !== undefined && !Number.isFinite(row.lastAttempt))
      || (row.nextRetryAt !== undefined && (!Number.isFinite(row.nextRetryAt) || row.nextRetryAt < 0))
      || (row.retryable !== undefined && typeof row.retryable !== "boolean")
      || (row.lastError !== undefined && (typeof row.lastError !== "string" || row.lastError.length > 4000))) throw Error("Private queue contents are invalid or duplicated.");
    ids.add(row.id); reports.add(row.reportId);
  }
}

type Manifest = { generation: string; count: number };
// Every chunk is at most 1536 UTF-8 bytes, including non-ASCII text. The manifest changes last.
export class EncryptedReportQueue {
  private serial: Promise<unknown> = Promise.resolve();
  constructor(private store: PrivateStore, private generation: () => string) {}
  private key(owner: string) { if (!/^[A-Za-z0-9_-]{1,160}$/.test(owner)) throw Error("Invalid private queue owner."); return `smartmaint.queue.${owner}`; }
  private async manifest(key: string): Promise<Manifest | null> {
    const raw = await this.store.get(key); if (!raw) return null; const value = JSON.parse(raw);
    if (!value || !/^[A-Za-z0-9_-]+$/.test(value.generation) || !Number.isInteger(value.count) || value.count < 1 || value.count > 100) throw Error("Private queue metadata is invalid.");
    return value;
  }
  private async read(owner: string): Promise<PendingPublication[]> {
    const key = this.key(owner); const manifest = await this.manifest(key); if (!manifest) return [];
    const chunks = await Promise.all(Array.from({ length: manifest.count }, (_, i) => this.store.get(`${key}.${manifest.generation}.${i}`)));
    if (chunks.some((chunk) => chunk === null)) throw Error("Private queue is incomplete. Do not assume pending reports were received.");
    const rows: unknown = JSON.parse(chunks.join(""));
    validatePublicationRows(rows, owner);
    return rows as PendingPublication[];
  }
  load(owner: string): Promise<PendingPublication[]> {
    const operation = this.serial.catch(() => {}).then(() => this.read(owner));
    this.serial = operation;
    return operation;
  }
  update(owner: string, change: (rows: PendingPublication[]) => PendingPublication[]): Promise<PendingPublication[]> {
    const operation = this.serial.catch(() => {}).then(async () => {
      const key = this.key(owner); const prior = await this.manifest(key); const rows = change(await this.read(owner));
      validatePublicationRows(rows, owner);
      const characters = Array.from(JSON.stringify(rows)); const chunks = Array.from({ length: Math.max(1, Math.ceil(characters.length / 384)) }, (_, i) => characters.slice(i * 384, (i + 1) * 384).join(""));
      if (chunks.length > 100) throw Error("Private queue exceeds its storage limit.");
      const generation = this.generation();
      if (!/^[A-Za-z0-9_-]+$/.test(generation) || prior?.generation === generation) throw Error("Private storage generation must be unique.");
      try { for (let i = 0; i < chunks.length; i++) await this.store.set(`${key}.${generation}.${i}`, chunks[i]); await this.store.set(key, JSON.stringify({ generation, count: chunks.length })); }
      catch (error) {
        try { const committed = await this.manifest(key); if (committed?.generation !== generation) await Promise.all(chunks.map((_, i) => this.store.remove(`${key}.${generation}.${i}`).catch(() => {}))); } catch { /* Preserve uncertain writes and surface the original storage failure. */ }
        throw error;
      }
      if (prior) await Promise.all(Array.from({ length: prior.count }, (_, i) => this.store.remove(`${key}.${prior.generation}.${i}`).catch(() => {})));
      return rows;
    });
    this.serial = operation; return operation;
  }
}
export function publicationFailure(error: unknown): "FAILED" | "CONFLICT" {
  return /conflict|revision|changed/i.test(error instanceof Error ? error.message : String(error)) ? "CONFLICT" : "FAILED";
}
