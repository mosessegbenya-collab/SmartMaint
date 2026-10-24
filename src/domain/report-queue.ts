export type QueueState = "PENDING" | "SYNCING" | "SYNCED" | "FAILED" | "CONFLICT";
export type PendingPublication = { id: string; owner: string; reportId: string; expectedRevision: number; expectedAttachmentRevision?: number; createdAt: number; updatedAt: number; state: QueueState; retryCount: number; lastAttempt?: number; lastError?: string; serverId?: string };
export type PrivateStore = { get: (key: string) => Promise<string | null>; set: (key: string, value: string) => Promise<void>; remove: (key: string) => Promise<void> };
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
  async load(owner: string): Promise<PendingPublication[]> {
    const key = this.key(owner); const manifest = await this.manifest(key); if (!manifest) return [];
    const chunks = await Promise.all(Array.from({ length: manifest.count }, (_, i) => this.store.get(`${key}.${manifest.generation}.${i}`)));
    if (chunks.some((chunk) => chunk === null)) throw Error("Private queue is incomplete. Do not assume pending reports were received.");
    const rows: unknown = JSON.parse(chunks.join(""));
    if (!Array.isArray(rows) || rows.length > 20 || rows.some((r) => !r || r.owner !== owner || typeof r.id !== "string" || typeof r.reportId !== "string" || !["PENDING", "SYNCING", "SYNCED", "FAILED", "CONFLICT"].includes(r.state) || !Number.isSafeInteger(r.expectedRevision) || r.expectedRevision < 1 || (r.expectedAttachmentRevision !== undefined && (!Number.isSafeInteger(r.expectedAttachmentRevision) || r.expectedAttachmentRevision < 0)) || (r.state === "SYNCED" && r.serverId !== r.reportId) || !Number.isSafeInteger(r.retryCount) || r.retryCount < 0 || !Number.isFinite(r.createdAt) || !Number.isFinite(r.updatedAt))) throw Error("Private queue contents are invalid.");
    return rows as PendingPublication[];
  }
  update(owner: string, change: (rows: PendingPublication[]) => PendingPublication[]): Promise<PendingPublication[]> {
    const operation = this.serial.catch(() => {}).then(async () => {
      const key = this.key(owner); const prior = await this.manifest(key); const rows = change(await this.load(owner));
      if (rows.length > 20 || rows.some((r) => r.owner !== owner)) throw Error("Private queue is full or owner does not match.");
      const characters = Array.from(JSON.stringify(rows)); const chunks = Array.from({ length: Math.max(1, Math.ceil(characters.length / 384)) }, (_, i) => characters.slice(i * 384, (i + 1) * 384).join(""));
      if (chunks.length > 100) throw Error("Private queue exceeds its storage limit.");
      const generation = this.generation();
      if (!/^[A-Za-z0-9_-]+$/.test(generation) || prior?.generation === generation) throw Error("Private storage generation must be unique.");
      try { for (let i = 0; i < chunks.length; i++) await this.store.set(`${key}.${generation}.${i}`, chunks[i]); await this.store.set(key, JSON.stringify({ generation, count: chunks.length })); }
      catch (error) { await Promise.all(chunks.map((_, i) => this.store.remove(`${key}.${generation}.${i}`).catch(() => {}))); throw error; }
      if (prior) await Promise.all(Array.from({ length: prior.count }, (_, i) => this.store.remove(`${key}.${prior.generation}.${i}`).catch(() => {})));
      return rows;
    });
    this.serial = operation; return operation;
  }
}
export function publicationFailure(error: unknown): "FAILED" | "CONFLICT" {
  return /conflict|revision|changed/i.test(error instanceof Error ? error.message : String(error)) ? "CONFLICT" : "FAILED";
}
