import { expect, test } from "vitest";
import { assertRecoveryStorageCapacity, MAX_RECOVERY_STORAGE_BYTES, MAX_RECOVERY_STORAGE_FILES } from "../../src/domain/recovery-capacity";

test('replacement generations and uncertain orphan ciphertext count toward the physical storage budget', () => {
  const retained = [MAX_RECOVERY_STORAGE_BYTES - 1024, 512];
  expect(() => assertRecoveryStorageCapacity(retained, 512)).not.toThrow();
  expect(() => assertRecoveryStorageCapacity(retained, 513)).toThrow(/full/);
  expect(retained).toEqual([MAX_RECOVERY_STORAGE_BYTES - 1024, 512]);
});

test('the file-count limit and unreadable sizes fail visibly without deleting any existing evidence', () => {
  expect(() => assertRecoveryStorageCapacity(Array(MAX_RECOVERY_STORAGE_FILES).fill(1), 1)).toThrow(/full/);
  for (const sizes of [[NaN], [-1], [Infinity], [0.5]]) expect(() => assertRecoveryStorageCapacity(sizes, 1)).toThrow(/could not be verified/);
  expect(() => assertRecoveryStorageCapacity([], 0)).toThrow(/could not be verified/);
});
