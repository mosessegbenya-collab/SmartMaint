export function photoDimensions(bytes: Uint8Array, type: string): { width: number; height: number } | null {
  let width = 0; let height = 0;
  if (type === "image/png" && bytes.length >= 24 && String.fromCharCode(...bytes.slice(12, 16)) === "IHDR") {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength); width = view.getUint32(16); height = view.getUint32(20);
  } else if (type === "image/jpeg") {
    let offset = 2; let segments = 0;
    while (offset + 4 <= bytes.length && ++segments <= 512) {
      if (bytes[offset++] !== 255) return null;
      while (bytes[offset] === 255) offset++;
      const marker = bytes[offset++]; if (marker === 217 || marker === 218) break;
      const size = (bytes[offset] << 8) | bytes[offset + 1]; if (size < 2 || offset + size > bytes.length) return null;
      if ([192, 193, 194, 195, 197, 198, 199, 201, 202, 203, 205, 206, 207].includes(marker) && size >= 8) { height = (bytes[offset + 3] << 8) | bytes[offset + 4]; width = (bytes[offset + 5] << 8) | bytes[offset + 6]; break; }
      offset += size;
    }
  } else if (type === "image/webp" && bytes.length >= 30) {
    const chunk = String.fromCharCode(...bytes.slice(12, 16));
    if (chunk === "VP8X") { width = 1 + bytes[24] + (bytes[25] << 8) + (bytes[26] << 16); height = 1 + bytes[27] + (bytes[28] << 8) + (bytes[29] << 16); }
    else if (chunk === "VP8 " && bytes[23] === 157 && bytes[24] === 1 && bytes[25] === 42) { width = (bytes[26] | (bytes[27] << 8)) & 16383; height = (bytes[28] | (bytes[29] << 8)) & 16383; }
    else if (chunk === "VP8L" && bytes[20] === 47) { width = 1 + bytes[21] + ((bytes[22] & 63) << 8); height = 1 + (bytes[22] >> 6) + (bytes[23] << 2) + ((bytes[24] & 15) << 10); }
  }
  return width > 0 && height > 0 && width <= 4096 && height <= 4096 && width * height <= 16777216 ? { width, height } : null;
}
