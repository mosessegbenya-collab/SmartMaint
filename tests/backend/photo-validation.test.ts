import { expect, test } from "vitest";
import { photoDimensions } from "../../src/domain/photo-validation";
test("image dimensions reject oversized or truncated decoder inputs before native image rendering", () => {
  const png = Uint8Array.from(atob("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/pZkAAAAASUVORK5CYII="), (c) => c.charCodeAt(0));
  expect(photoDimensions(png, "image/png")).toEqual({ width: 1, height: 1 });
  new DataView(png.buffer).setUint32(16, 100000); expect(photoDimensions(png, "image/png")).toBeNull(); expect(photoDimensions(new Uint8Array([255, 216, 255]), "image/jpeg")).toBeNull();
  const jpeg = new Uint8Array([255, 216, 255, 192, 0, 8, 8, 0, 24, 0, 32, 0, 255, 217]); expect(photoDimensions(jpeg, "image/jpeg")).toEqual({ width: 32, height: 24 });
});
