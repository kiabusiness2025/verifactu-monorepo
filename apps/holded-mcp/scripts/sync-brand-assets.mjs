import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appDir = path.resolve(__dirname, '..');
const repoRoot = path.resolve(appDir, '..', '..');
const publicDir = path.join(appDir, 'public');

const assets = [
  {
    source: path.join(repoRoot, 'apps', 'holded', 'public', 'brand', 'holded', 'holded-diamond-logo.png'),
    target: path.join(publicDir, 'holded-diamond-logo.png'),
  },
  {
    source: path.join(
      repoRoot,
      'apps',
      'holded',
      'public',
      'Holded',
      'Corporativo',
      'MARKETING',
      'Holded Logo',
      'Holded Logo',
      'Holded_Diamond',
      'SVG',
      'Holded-Diamond-Red.svg'
    ),
    target: path.join(publicDir, 'logo.svg'),
  },
  {
    source: path.join(repoRoot, 'brand', 'claude_logo_3ec57d87f2.svg'),
    target: path.join(publicDir, 'claude.svg'),
  },
];

function readPngDimension(buffer, offset) {
  return buffer.readUInt32BE(offset);
}

function createIcoFromPng(pngPath, icoPath) {
  const png = readFileSync(pngPath);
  const signature = png.subarray(0, 8).toString('hex');
  if (signature !== '89504e470d0a1a0a') {
    throw new Error(`Expected PNG source for favicon.ico: ${pngPath}`);
  }

  const width = readPngDimension(png, 16);
  const height = readPngDimension(png, 20);
  const header = Buffer.alloc(22);

  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type = icon
  header.writeUInt16LE(1, 4); // one image
  header.writeUInt8(width >= 256 ? 0 : width, 6);
  header.writeUInt8(height >= 256 ? 0 : height, 7);
  header.writeUInt8(0, 8); // palette
  header.writeUInt8(0, 9); // reserved
  header.writeUInt16LE(1, 10); // color planes
  header.writeUInt16LE(32, 12); // bits per pixel
  header.writeUInt32LE(png.length, 14);
  header.writeUInt32LE(header.length, 18);

  writeFileSync(icoPath, Buffer.concat([header, png]));
}

mkdirSync(publicDir, { recursive: true });

for (const asset of assets) {
  if (!existsSync(asset.source)) {
    throw new Error(`Missing brand source asset: ${asset.source}`);
  }

  cpSync(asset.source, asset.target);
  console.log(`Synced ${path.relative(repoRoot, asset.target)} <- ${path.relative(repoRoot, asset.source)}`);
}

createIcoFromPng(path.join(publicDir, 'holded-diamond-logo.png'), path.join(publicDir, 'favicon.ico'));
console.log(`Generated ${path.relative(repoRoot, path.join(publicDir, 'favicon.ico'))} from holded-diamond-logo.png`);
