export const MAX_RECOVERY_STORAGE_BYTES = 128 * 1024 * 1024;
export const MAX_RECOVERY_STORAGE_FILES = 512;

/** Includes immutable replacement generations and uncertain orphans; never deletes evidence for space. */
export function assertRecoveryStorageCapacity(sizes: readonly number[], incoming: number) {
  if (!Number.isSafeInteger(incoming) || incoming < 1 || sizes.some((size) => !Number.isSafeInteger(size) || size < 0)) throw Error("Device recovery storage size could not be verified.");
  if (sizes.length >= MAX_RECOVERY_STORAGE_FILES || sizes.reduce((total, size) => total + size, incoming) > MAX_RECOVERY_STORAGE_BYTES) throw Error("Encrypted device recovery storage is full. Existing work has been preserved; review saved copies before adding more.");
}
