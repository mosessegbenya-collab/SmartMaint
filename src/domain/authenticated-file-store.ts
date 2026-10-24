import type { PrivateStore } from "./report-queue";
export type CipherFiles = { read: (name: string) => Promise<Uint8Array>; write: (name: string, bytes: Uint8Array) => Promise<void>; remove: (name: string) => Promise<void> };
export type AuthenticatedCipher = { createKey: () => Promise<string>; encrypt: (text: string, key: string, context: string) => Promise<Uint8Array>; decrypt: (bytes: Uint8Array, key: string, context: string) => Promise<string> };
/** Ciphertext is immutable. A small encrypted pointer is committed last in the native key vault. */
export class AuthenticatedFileStore implements PrivateStore {
  private serial: Promise<unknown> = Promise.resolve();
  constructor(private vault: PrivateStore, private files: CipherFiles, private cipher: AuthenticatedCipher, private generation: () => string) {}
  private key(key: string) { if (!/^smartmaint\.recovery\.[A-Za-z0-9_.-]{1,500}$/.test(key)) throw Error("Invalid private file key."); return key; }
  private async pointer(key: string): Promise<{ file: string; key: string } | null> {
    const raw = await this.vault.get(this.key(key)); if (raw === null) return null;
    const pointer = JSON.parse(raw);
    if (!pointer || typeof pointer.key !== 'string' || !/^[a-f0-9]{64}$/i.test(pointer.key) || typeof pointer.file !== 'string' || !/^[A-Za-z0-9_-]+\.bin$/.test(pointer.file)) throw Error("Private recovery metadata is invalid.");
    return pointer;
  }
  get(key: string): Promise<string | null> { const work = this.serial.catch(() => {}).then(async () => { const pointer = await this.pointer(key); return pointer ? this.cipher.decrypt(await this.files.read(pointer.file), pointer.key, key) : null; }); this.serial = work; return work; }
  set(key: string, value: string) {
    const work = this.serial.catch(() => {}).then(async () => {
      this.key(key); const prior = await this.pointer(key); const generation = this.generation(); if (!/^[A-Za-z0-9_-]{1,160}$/.test(generation)) throw Error("Invalid recovery generation.");
      const file = `${generation}.bin`; if (prior?.file === file) throw Error("Recovery generation must be unique.");
      const encryptionKey = await this.cipher.createKey();
      const bytes = await this.cipher.encrypt(value, encryptionKey, key);
      try { await this.files.write(file, bytes); await this.vault.set(key, JSON.stringify({ file, key: encryptionKey })); }
      catch (error) {
        // A rejected write may have committed before its result was lost. Never remove a referenced generation.
        try { const committed = await this.pointer(key); if (committed?.file !== file) await this.files.remove(file); } catch { /* Preserve the uncertain ciphertext; report the original storage failure. */ }
        throw error;
      }
      if (prior) await this.files.remove(prior.file).catch(() => {}); // Committed generation remains readable if orphan cleanup fails.
    }); this.serial = work; return work;
  }
  remove(key: string) {
    const work = this.serial.catch(() => {}).then(async () => { const prior = await this.pointer(key); await this.vault.remove(key); if (prior) await this.files.remove(prior.file); });
    this.serial = work; return work;
  }
}
