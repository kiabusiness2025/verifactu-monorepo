// Regenerate apps/holded-mcp/public/favicon.ico from holded-diamond-logo.png
// as a multi-resolution PNG-encoded ICO (16/32/48/64 px). Run from repo root:
//   node apps/holded-mcp/scripts/regen-favicon.mjs
//
// Why this exists: the legacy favicon.ico in the repo was the Verifactu "V"
// from when this MCP server was branded under verifactu.business. The PNG
// asset (holded-diamond-logo.png) was updated to the Holded diamond, but
// favicon.ico was never re-derived from it, so claude.ai showed the wrong
// icon in the connector list and tool chips. This script is the canonical
// regenerator — invoke it after any update to holded-diamond-logo.png.

import sharp from 'sharp';
import fs from 'node:fs/promises';

const SRC = 'apps/holded-mcp/public/holded-diamond-logo.png';
const DST = 'apps/holded-mcp/public/favicon.ico';
const SIZES = [16, 32, 48, 64];

// Generate PNG buffers at each size.
const pngs = await Promise.all(
  SIZES.map(async (size) => {
    const buf = await sharp(SRC)
      .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();
    return { size, buf };
  })
);

// Build ICO container:
//   ICONDIR (6 bytes) + N * ICONDIRENTRY (16 bytes each) + PNG payloads.
const headerSize = 6 + SIZES.length * 16;
let dataOffset = headerSize;
const header = Buffer.alloc(headerSize);

header.writeUInt16LE(0, 0);             // reserved
header.writeUInt16LE(1, 2);             // type = 1 (icon)
header.writeUInt16LE(SIZES.length, 4);  // count

pngs.forEach((entry, i) => {
  const off = 6 + i * 16;
  const w = entry.size >= 256 ? 0 : entry.size;
  const h = entry.size >= 256 ? 0 : entry.size;
  header.writeUInt8(w, off + 0);                  // width
  header.writeUInt8(h, off + 1);                  // height
  header.writeUInt8(0, off + 2);                  // color count (0 = no palette)
  header.writeUInt8(0, off + 3);                  // reserved
  header.writeUInt16LE(1, off + 4);               // planes
  header.writeUInt16LE(32, off + 6);              // bits per pixel
  header.writeUInt32LE(entry.buf.length, off + 8); // bytes in resource
  header.writeUInt32LE(dataOffset, off + 12);     // offset
  dataOffset += entry.buf.length;
});

const out = Buffer.concat([header, ...pngs.map((p) => p.buf)]);
await fs.writeFile(DST, out);
console.log('wrote', DST, out.length, 'bytes');
console.log('sizes:', SIZES.join(','));
