import { cpSync, existsSync } from 'node:fs';
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

for (const asset of assets) {
  if (!existsSync(asset.source)) {
    throw new Error(`Missing brand source asset: ${asset.source}`);
  }

  cpSync(asset.source, asset.target);
  console.log(`Synced ${path.relative(repoRoot, asset.target)} <- ${path.relative(repoRoot, asset.source)}`);
}
