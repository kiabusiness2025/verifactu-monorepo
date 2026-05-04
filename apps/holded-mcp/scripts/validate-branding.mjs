import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, '../public');
const srcDir = path.join(__dirname, '../src');

let passed = 0;
let failed = 0;

function check(name, condition, detail = '') {
  if (condition) {
    console.log(`PASS: ${name}${detail ? ' — ' + detail : ''}`);
    passed++;
  } else {
    console.error(`FAIL: ${name}${detail ? ' — ' + detail : ''}`);
    failed++;
  }
}

// 1. Check all expected files exist
const expected = ['favicon.ico','favicon.png','icon.png','logo.png','apple-touch-icon.png','holded-diamond-logo.png'];
for (const f of expected) {
  const fp = path.join(publicDir, f);
  check(`File exists: ${f}`, fs.existsSync(fp));
  if (fs.existsSync(fp)) {
    check(`File not empty: ${f}`, fs.statSync(fp).size > 0);
  }
}

// 2. Check PNG dimensions using ImageMagick
const pngChecks = [
  { file: 'favicon.png', w: 64, h: 64 },
  { file: 'icon.png', w: 64, h: 64 },
  { file: 'logo.png', w: 256, h: 256 },
  { file: 'apple-touch-icon.png', w: 180, h: 180 },
];
for (const { file, w, h } of pngChecks) {
  try {
    const out = execSync(`magick identify -format "%wx%h" "${path.join(publicDir, file)}"`).toString().trim();
    check(`Dimensions ${file}`, out === `${w}x${h}`, `got ${out}, expected ${w}x${h}`);
  } catch { check(`Dimensions ${file}`, false, 'magick failed'); }
}

// 3. Check favicon.ico magic bytes and frame count
const icoPath = path.join(publicDir, 'favicon.ico');
if (fs.existsSync(icoPath)) {
  const buf = fs.readFileSync(icoPath);
  check('favicon.ico magic bytes', buf[0]===0 && buf[1]===0 && buf[2]===1 && buf[3]===0, `bytes: ${[...buf.slice(0,4)].map(b=>b.toString(16).padStart(2,'0')).join(' ')}`);
  const count = buf.readUInt16LE(4);
  check('favicon.ico has 4 frames', count === 4, `found ${count} frames`);
}

// 4. Check app.ts has icon routes BEFORE express.static
// Use app.use(express.static to avoid matching the string in comments.
// Use app.get('ROUTE' to avoid matching the same route string in comments.
const appTs = fs.readFileSync(path.join(srcDir, 'app.ts'), 'utf8');
const staticPos = appTs.indexOf('app.use(express.static');
const iconRoutes = ['/favicon.ico', '/favicon.png', '/icon.png', '/logo.png', '/apple-touch-icon.png', '/holded-diamond-logo.png'];
for (const route of iconRoutes) {
  const needle = `app.get('${route}'`;
  const routePos = appTs.indexOf(needle);
  check(`Route ${route} defined before express.static`, routePos !== -1 && routePos < staticPos);
}

// 5. Check app.ts has cache and versioning headers
// Icons use 1-day public cache (immutable) so Google s2 favicons proxy can index for Anthropic directory
check('app.ts has public max-age cache for icons', appTs.includes('max-age=86400') || appTs.includes('max-age=3600'));
check('app.ts has X-Icon-Version header', appTs.includes('X-Icon-Version'));

// 6. Check manifest.json has only Holded diamond icons
const manifest = JSON.parse(fs.readFileSync(path.join(publicDir, 'manifest.json'), 'utf8'));
const iconSrcs = (manifest.icons || []).map(i => i.src);
check('manifest.json has icons', iconSrcs.length > 0);
const oldAssets = iconSrcs.filter(s => !s.includes('holded-diamond') && !s.includes('icon.png') && !s.includes('logo.png') && !s.includes('apple-touch-icon.png'));
check('manifest.json has no unknown icon paths', oldAssets.length === 0, oldAssets.join(', ') || 'ok');
check('manifest.json holded-diamond entry has version query', iconSrcs.some(s => s.includes('holded-diamond') && s.includes('?v=')));
check('manifest.json has description field', !!manifest.description);

// 7. Check logo_uri points to holded-diamond with version query
check('app.ts logo_uri references holded-diamond-logo.png', appTs.includes('holded-diamond-logo.png'));
check('app.ts logo_uri has version query param', appTs.includes('holded-diamond-logo.png?v='));

// 8. Check favicon.ico is served as image/x-icon (not image/png) in app.ts
check('app.ts favicon.ico uses image/x-icon Content-Type', appTs.includes('image/x-icon'));

console.log(`\n${passed + failed} checks — ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
