import type { PrivateStore } from "./report-queue";
import { RecoveryVaultJournal, type RecoveryPointer, type JournalPointer } from "./recovery-vault-journal";
export type CipherFiles = { read: (name: string) => Promise<Uint8Array>; write: (name: string, bytes: Uint8Array) => Promise<void>; remove: (name: string) => Promise<void> };
export type AuthenticatedCipher = { createKey: () => Promise<string>; encrypt: (text: string, key: string, context: string) => Promise<Uint8Array>; decrypt: (bytes: Uint8Array, key: string, context: string) => Promise<string> };
/** Immutable ciphertext; a small vault pointer commits last. Legacy file pointers remain readable. */
export class AuthenticatedFileStore implements PrivateStore {
  private serial: Promise<unknown> = Promise.resolve();
  private journal: RecoveryVaultJournal;
  constructor(private vault: PrivateStore, private files: CipherFiles, private cipher: AuthenticatedCipher, private generation: () => string) { this.journal = new RecoveryVaultJournal(vault); }
  private key(key: string) { if (!/^smartmaint\.recovery\.[A-Za-z0-9_.-]{1,500}$/.test(key)) throw Error("Invalid private file key."); return key; }
  private validPointer(value: unknown): value is RecoveryPointer {
    if (!value || typeof value !== "object") return false;
    const p = value as Record<string, unknown>;
    if ((p.formatVersion !== undefined && p.formatVersion !== 2) || (p.minReaderVersion !== undefined && p.minReaderVersion !== 2)) return false;
    if (typeof p.key !== "string" || !/^[a-f0-9]{64}$/i.test(p.key)) return false;
    return typeof p.file === "string" ? /^[A-Za-z0-9_-]+\.bin$/.test(p.file)
      : typeof p.generation === "string" && /^[A-Za-z0-9_-]{1,160}$/.test(p.generation) && Number.isSafeInteger(p.count) && (p.count as number) > 0 && (p.count as number) <= 256 && typeof p.cleanupComplete === "boolean";
  }
  private async pointer(key: string): Promise<RecoveryPointer | null> {
    const raw = await this.vault.get(this.key(key)); if (raw === null) return null;
    const pointer: unknown = JSON.parse(raw);
    if (!this.validPointer(pointer)) throw Error("Private recovery metadata is invalid.");
    return pointer;
  }
  private exclusive<T>(work: () => Promise<T>): Promise<T> { const operation = this.serial.catch(() => {}).then(work); this.serial = operation; return operation; }
  private async removeGeneration(key: string, pointer: RecoveryPointer) {
    if ("file" in pointer) await this.files.remove(pointer.file);
    else await this.journal.remove(key, pointer);
  }
  private async removeRaw(key: string) {
    const pointer = await this.pointer(key);
    if (pointer) {
      if (!("file" in pointer)) await this.readRaw(key, pointer);
      await this.removeGeneration(key, pointer);
    }
    // Keep the pointer until unlink completes so interruption cannot orphan selected evidence.
    await this.vault.remove(key);
  }
  private async readRaw(key: string, pointer: RecoveryPointer): Promise<string> {
    if ("file" in pointer) return this.cipher.decrypt(await this.files.read(pointer.file), pointer.key, key);
    const text = await this.cipher.decrypt(await this.journal.read(key, pointer), pointer.key, key);
    const envelope = JSON.parse(text);
    if (!envelope || typeof envelope.value !== "string" || !Array.isArray(envelope.removeKeys) || envelope.removeKeys.length > 5 || envelope.removeKeys.some((child: unknown) => typeof child !== "string" || !child.startsWith(`${key}.`)) || (envelope.prior !== null && !this.validPointer(envelope.prior))) throw Error("Invalid recovery deletion journal.");
    if (!pointer.cleanupComplete) {
      for (const child of envelope.removeKeys) await this.removeRaw(child);
      if (envelope.prior) await this.removeGeneration(key, envelope.prior);
      await this.vault.set(key, JSON.stringify({ ...pointer, cleanupComplete: true }));
    }
    return envelope.value;
  }
  get(key: string): Promise<string | null> { return this.exclusive(async () => { const pointer = await this.pointer(key); return pointer ? this.readRaw(key, pointer) : null; }); }
  set(key: string, value: string) {
    return this.exclusive(async () => {
      this.key(key); const prior = await this.pointer(key);
      if (prior && !("file" in prior)) await this.readRaw(key, prior);
      const generation = this.generation(); if (!/^[A-Za-z0-9_-]{1,160}$/.test(generation)) throw Error("Invalid recovery generation.");
      const file = `${generation}.bin`; if (prior && ("file" in prior ? prior.file === file : prior.generation === generation)) throw Error("Recovery generation must be unique.");
      const encryptionKey = await this.cipher.createKey();
      const bytes = await this.cipher.encrypt(value, encryptionKey, key);
      try { await this.files.write(file, bytes); await this.vault.set(key, JSON.stringify({ file, key: encryptionKey, formatVersion: 2, minReaderVersion: 2 })); }
      catch (error) {
        try { const committed = await this.pointer(key); if (!committed || !("file" in committed) || committed.file !== file) await this.files.remove(file); } catch { /* Preserve uncertain writes and report the original failure. */ }
        throw error;
      }
      if (prior) await this.removeGeneration(key, prior).catch(() => {});
    });
  }
  /** Reduced index + deletion intent use bounded vault chunks, independent of ciphertext file quota. */
  prune(key: string, value: string, removeKeys: string[]) {
    return this.exclusive(async () => {
      this.key(key);
      if (removeKeys.length > 5 || new Set(removeKeys).size !== removeKeys.length || removeKeys.some((child) => !child.startsWith(`${key}.`))) throw Error("Invalid explicit recovery deletion.");
      for (const child of removeKeys) this.key(child);
      const prior = await this.pointer(key); if (prior) await this.readRaw(key, prior);
      const generation = this.generation(); if (!/^[A-Za-z0-9_-]{1,160}$/.test(generation) || (prior && !("file" in prior) && generation === prior.generation)) throw Error("Invalid recovery generation.");
      const encryptionKey = await this.cipher.createKey();
      const bytes = await this.cipher.encrypt(JSON.stringify({ value, removeKeys, prior }), encryptionKey, key);
      const pointer: JournalPointer = { generation, count: Math.ceil(bytes.length / 512), key: encryptionKey, cleanupComplete: false, formatVersion: 2, minReaderVersion: 2 };
      try { await this.journal.write(key, pointer, bytes); await this.vault.set(key, JSON.stringify(pointer)); }
      catch (error) {
        try { const committed = await this.pointer(key); if (!committed || "file" in committed || committed.generation !== generation) await this.journal.remove(key, pointer); } catch { /* Preserve uncertain committed intent. */ }
        throw error;
      }
      await this.readRaw(key, pointer);
    });
  }
  remove(key: string) { return this.exclusive(() => this.removeRaw(key)); }
}
