// Generuje PWA ikony (PNG) z pixel loga SoloPixel — bez externích závislostí.
// Spuštění: node scripts/generate-icons.mjs
import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

// Barvy
const NAVY = [0x0b, 0x12, 0x20, 255]; // pozadí ikony (#0b1220)
const WHITE = [0xf8, 0xfa, 0xfc, 255]; // čtverce loga (slate-50)
const MINT = [0x5e, 0xea, 0xd4, 255]; // akcent (#5eead4)

// CRC32 (PNG)
const crcTable = new Int32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const t = Buffer.from(type, "ascii");
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])));
  return Buffer.concat([len, t, data, crc]);
}

function encodePng(size, pixelAt) {
  // raw scanlines: filtr 0 + RGBA
  const raw = Buffer.alloc(size * (1 + size * 4));
  for (let y = 0; y < size; y++) {
    const row = y * (1 + size * 4);
    raw[row] = 0;
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = pixelAt(x, y);
      const o = row + 1 + x * 4;
      raw[o] = r;
      raw[o + 1] = g;
      raw[o + 2] = b;
      raw[o + 3] = a;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// Mřížka loga: 8 čtverců, střed prázdný, pravý horní mint
const CELLS = [
  [0, 0], [1, 0], [2, 0],
  [0, 1],         [2, 1],
  [0, 2], [1, 2], [2, 2],
];

/** Ikona: navy pozadí, logo vycentrované na `scale` násobku velikosti. */
function makeIcon(size, scale) {
  const grid = Math.round(size * scale);
  const cell = Math.floor(grid / 3);
  const start = Math.round((size - cell * 3) / 2);
  return encodePng(size, (x, y) => {
    const cx = Math.floor((x - start) / cell);
    const cy = Math.floor((y - start) / cell);
    if (x >= start && y >= start && cx < 3 && cy < 3) {
      if (CELLS.some(([a, b]) => a === cx && b === cy)) {
        return cx === 2 && cy === 0 ? MINT : WHITE;
      }
    }
    return NAVY;
  });
}

mkdirSync(join(root, "public/icons"), { recursive: true });
for (const [name, size, scale] of [
  ["icon-192.png", 192, 0.58],
  ["icon-512.png", 512, 0.58],
  ["apple-icon-180.png", 180, 0.55],
]) {
  writeFileSync(join(root, "public/icons", name), makeIcon(size, scale));
  console.log(`✓ public/icons/${name}`);
}
