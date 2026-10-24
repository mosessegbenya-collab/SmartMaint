import { Platform } from "react-native";
import { Directory, File, Paths } from "expo-file-system";
import { AESEncryptionKey, AESSealedData, aesEncryptAsync, aesDecryptAsync, randomUUID } from "expo-crypto";
import * as SecureStore from "expo-secure-store";
import { AuthenticatedFileStore } from "@/domain/authenticated-file-store";
import { ReportRecoveryRepository } from "@/domain/report-recovery";
import { assertRecoveryStorageCapacity } from "@/domain/recovery-capacity";

const encoder = new TextEncoder();
function directory() { const folder = new Directory(Paths.document, "smartmaint-encrypted-recovery"); folder.create({ intermediates: true, idempotent: true }); return folder; }
const files = {
  read: async (name: string) => { const file = new File(directory(), name); if (!file.exists || file.size > 16*1024*1024) throw Error("Private recovery file is missing or exceeds its limit."); return file.bytes(); },
  write: async (name: string, bytes: Uint8Array) => {
    if (bytes.length > 16*1024*1024) throw Error("Private recovery file exceeds its limit.");
    const folder = directory();
    assertRecoveryStorageCapacity(folder.list().map((entry) => entry instanceof File ? entry.size : NaN), bytes.length);
    const file = new File(folder, name); file.create(); file.write(bytes);
  },
  remove: async (name: string) => { const file = new File(directory(), name); if (file.exists) file.delete(); },
};
export const reportRecovery = Platform.OS === "web" ? null : new ReportRecoveryRepository(new AuthenticatedFileStore({
  get: (key) => SecureStore.getItemAsync(key),
  set: (key, value) => SecureStore.setItemAsync(key, value, { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY }),
  remove: (key) => SecureStore.deleteItemAsync(key),
}, files, {
  createKey: async () => (await AESEncryptionKey.generate()).encoded("hex"),
  encrypt: async (text, hex, context) => { const key = await AESEncryptionKey.import(hex, "hex"); const sealed = await aesEncryptAsync(encoder.encode(text), key, { additionalData: encoder.encode(context) }); return sealed.combined(); },
  decrypt: async (bytes, hex, context) => { const key = await AESEncryptionKey.import(hex, "hex"); const text = await aesDecryptAsync(AESSealedData.fromCombined(bytes), key, { additionalData: encoder.encode(context) }); return new TextDecoder().decode(text); },
}, randomUUID));
