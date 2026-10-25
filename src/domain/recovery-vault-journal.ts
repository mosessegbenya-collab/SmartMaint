import type { PrivateStore } from "./report-queue";

type Format = { formatVersion?: number; minReaderVersion?: number };
export type FilePointer = Format & { file: string; key: string };
export type JournalPointer = Format & { generation: string; count: number; key: string; cleanupComplete: boolean };
export type RecoveryPointer = FilePointer | JournalPointer;

/** Deletion uses small vault chunks, without allocating another ciphertext file. */
export class RecoveryVaultJournal {
  constructor(private vault: PrivateStore) {}
  private chunk(key: string, pointer: JournalPointer, i: number) { return `${key}.deletion.${pointer.generation}.${i}`; }
  async write(key: string, pointer: JournalPointer, bytes: Uint8Array) {
    const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
    if (Math.ceil(hex.length / 1024) !== pointer.count || pointer.count > 256) throw Error("Recovery deletion journal exceeds its limit.");
    for (let i = 0; i < pointer.count; i++) await this.vault.set(this.chunk(key, pointer, i), hex.slice(i * 1024, (i + 1) * 1024));
  }
  async read(key: string, pointer: JournalPointer) {
    const chunks: string[] = [];
    for (let i = 0; i < pointer.count; i++) {
      const chunk = await this.vault.get(this.chunk(key, pointer, i));
      if (!chunk || !/^(?:[a-f0-9]{2})+$/.test(chunk) || chunk.length > 1024 || (i < pointer.count - 1 && chunk.length !== 1024)) throw Error("Recovery deletion journal is incomplete or corrupt.");
      chunks.push(chunk);
    }
    return Uint8Array.from(chunks.join("").match(/../g)!, (byte) => parseInt(byte, 16));
  }
  async remove(key: string, pointer: JournalPointer) {
    for (let i = 0; i < pointer.count; i++) await this.vault.remove(this.chunk(key, pointer, i));
  }
}
