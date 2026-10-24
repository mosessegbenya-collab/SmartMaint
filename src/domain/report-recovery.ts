import type { PrivateStore } from "./report-queue";
export type RecoveryFields = { category: string; symptoms: string; description: string; priority: "Urgent" | "High" | "Routine"; condition: string; inUse: "" | "Yes" | "No"; noticedAt: string; emergency: boolean };
export type RecoveryPhoto = { operationId: string; contentType: "image/jpeg" | "image/png" | "image/webp"; base64: string };
export type RecoveryDraft = { owner: string; operationId: string; equipmentId: string; departmentId: string; updatedAt: number; fields: RecoveryFields; server?: { id: string; revision: number }; photos: { operationId: string; contentType: RecoveryPhoto["contentType"]; size: number }[] };
const id = (s: unknown): s is string => typeof s === "string" && /^[A-Za-z0-9_-]{1,160}$/.test(s);
export class ReportRecoveryRepository {
  private serial: Promise<unknown> = Promise.resolve();
  constructor(private store: PrivateStore) {}
  private root(owner: string) { if (!id(owner)) throw Error("Invalid recovery owner."); return `smartmaint.recovery.${owner}`; }
  private validate(value: unknown, owner: string): asserts value is RecoveryDraft[] {
    if (!Array.isArray(value) || value.length > 5) throw Error("Device draft storage is full or invalid.");
    const operations = new Set<string>();
    for (const row of value) {
      const f = row?.fields;
      if (!row || row.owner !== owner || !id(row.operationId) || !id(row.equipmentId) || !id(row.departmentId) || operations.has(row.operationId) || !Number.isFinite(row.updatedAt) || !f
        || !["Urgent", "High", "Routine"].includes(f.priority) || !["", "Yes", "No"].includes(f.inUse) || typeof f.emergency !== "boolean"
        || !['category','symptoms','description','condition','noticedAt'].every((key) => typeof f[key] === "string")
        || f.symptoms.length > 300 || f.description.length > 2000 || f.category.length > 120 || f.condition.length > 120 || f.noticedAt.length > 100
        || (row.server && (!id(row.server.id) || !Number.isSafeInteger(row.server.revision) || row.server.revision < 1))
        || !Array.isArray(row.photos) || row.photos.length > 5 || new Set(row.photos.map((p: { operationId: string }) => p.operationId)).size !== row.photos.length
        || row.photos.some((p: { operationId: unknown; size: number; contentType: string }) => !id(p.operationId) || !Number.isSafeInteger(p.size) || p.size < 1 || p.size > 2*1024*1024 || !["image/jpeg", "image/png", "image/webp"].includes(p.contentType))) throw Error("Device recovery contents are invalid.");
      operations.add(row.operationId);
    }
    if (value.reduce((total, draft) => total + draft.photos.reduce((sum: number, photo: { size: number }) => sum + photo.size, 0), 0) > 30*1024*1024) throw Error("Device photo recovery exceeds the 30 MB account limit.");
  }
  async list(owner: string) {
    const raw = await this.store.get(this.root(owner)); if (raw === null) return [];
    const rows: unknown = JSON.parse(raw); this.validate(rows, owner); return rows;
  }
  private exclusive<T>(work: () => Promise<T>): Promise<T> { const operation = this.serial.catch(() => {}).then(work); this.serial = operation; return operation; }
  private async commit(owner: string, rows: RecoveryDraft[]) { this.validate(rows, owner); await this.store.set(this.root(owner), JSON.stringify(rows)); }
  saveDraft(draft: Omit<RecoveryDraft, "photos">) {
    return this.exclusive(async () => {
      const rows = await this.list(draft.owner); const prior = rows.find((row) => row.operationId === draft.operationId);
      const record = { ...draft, photos: prior?.photos ?? [] };
      if (prior && (prior.equipmentId !== draft.equipmentId || prior.departmentId !== draft.departmentId)) throw Error("Keep the original equipment and department identity for a recovered draft.");
      await this.commit(draft.owner, [...rows.filter((row) => row.operationId !== draft.operationId), record]);
      return record;
    });
  }
  savePhoto(owner: string, operationId: string, photo: RecoveryPhoto) {
    return this.exclusive(async () => {
      if (!id(operationId) || !id(photo.operationId) || !/^[A-Za-z0-9+/]+={0,2}$/.test(photo.base64) || photo.base64.length % 4 !== 0) throw Error("Invalid recovery photo.");
      const rows = await this.list(owner); const draft = rows.find((row) => row.operationId === operationId); if (!draft) throw Error("Save the report details on this device before adding photos.");
      const size = photo.base64.length / 4 * 3 - (photo.base64.endsWith('==') ? 2 : photo.base64.endsWith('=') ? 1 : 0);
      const record = { operationId: photo.operationId, contentType: photo.contentType, size };
      const updated = rows.map((row) => row.operationId === operationId ? { ...row, photos: [...row.photos.filter((p) => p.operationId !== photo.operationId), record] } : row);
      this.validate(updated, owner);
      const key = `${this.root(owner)}.${operationId}.${photo.operationId}`;
      if (draft.photos.some((p) => p.operationId === photo.operationId)) throw Error("A saved photo operation cannot be replaced. Restore or remove it first.");
      try { await this.store.set(key, photo.base64); }
      catch (failure) {
        // A lost file-pointer completion can still leave a complete photo. Finish indexing only after verifying it.
        try { if (await this.store.get(key) !== photo.base64) throw failure; }
        catch { throw failure; }
      }
      try { await this.commit(owner, updated); } catch (error) {
        // A rejected write may already have committed. Preserve any referenced or uncertain photo.
        try {
          const committed = await this.list(owner);
          if (!committed.some((row) => row.operationId === operationId && row.photos.some((p) => p.operationId === photo.operationId))) await this.store.remove(key);
        } catch { /* Preserve evidence when the index cannot be checked. */ }
        throw error;
      }
    });
  }
  async readPhoto(owner: string, operationId: string, photoId: string): Promise<RecoveryPhoto> {
    if (!id(operationId) || !id(photoId)) throw Error("Invalid recovery photo reference.");
    const photo = (await this.list(owner)).find((row) => row.operationId === operationId)?.photos.find((p) => p.operationId === photoId);
    if (!photo) throw Error("Saved photo is unavailable for this account.");
    const base64 = await this.store.get(`${this.root(owner)}.${operationId}.${photoId}`);
    if (!base64 || base64.length / 4 * 3 - (base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0) !== photo.size) throw Error("Saved photo is incomplete. It has not been acknowledged by the server.");
    return { operationId: photoId, contentType: photo.contentType, base64 };
  }
  removePhoto(owner: string, operationId: string, photoId: string) {
    return this.exclusive(async () => {
      if (!id(operationId) || !id(photoId)) throw Error("Invalid recovery reference.");
      const rows = await this.list(owner);
      await this.commit(owner, rows.map((row) => row.operationId === operationId ? { ...row, photos: row.photos.filter((photo) => photo.operationId !== photoId) } : row));
      await this.store.remove(`${this.root(owner)}.${operationId}.${photoId}`);
    });
  }
  removeDraft(owner: string, operationId: string) {
    return this.exclusive(async () => {
      if (!id(operationId)) throw Error("Invalid recovery reference.");
      const rows = await this.list(owner); const prior = rows.find((row) => row.operationId === operationId);
      await this.commit(owner, rows.filter((row) => row.operationId !== operationId));
      for (const photo of prior?.photos ?? []) await this.store.remove(`${this.root(owner)}.${operationId}.${photo.operationId}`);
    });
  }
}
