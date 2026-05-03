import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { installTestEnv, startTestServer } from './helpers.ts';

installTestEnv();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(__dirname, '../public');
const diamondPath = path.join(publicDir, 'holded-diamond-logo.png');
const faviconPath = path.join(publicDir, 'favicon.ico');
const diamondBytes = readFileSync(diamondPath);
const faviconBytes = readFileSync(faviconPath);
const diamondSize = diamondBytes.length;
const faviconSize = faviconBytes.length;

/**
 * El icono de la app DEBE ser el diamante de Holded (holded-diamond-logo.png),
 * no la "V" del logotipo SVG. Si alguien cambia las rutas para servir el SVG
 * por error, este test salta.
 */
test('icon endpoints serve the Holded diamond assets with correct content types', async () => {
  const runtime = await startTestServer();

  try {
    const pngCases: Array<{ path: string; contentType: string }> = [
      { path: '/favicon.png', contentType: 'image/png' },
      { path: '/logo.png', contentType: 'image/png' },
      { path: '/icon.png', contentType: 'image/png' },
      { path: '/apple-touch-icon.png', contentType: 'image/png' },
      { path: '/holded-diamond-logo.png', contentType: 'image/png' },
    ];
    for (const { path: endpoint, contentType } of pngCases) {
      const res = await fetch(`${runtime.baseUrl}${endpoint}`);
      assert.equal(res.status, 200, `${endpoint} should return 200`);
      assert.equal(
        res.headers.get('content-type'),
        contentType,
        `${endpoint} must declare Content-Type: ${contentType} (was: ${res.headers.get('content-type')})`
      );
      const buf = Buffer.from(await res.arrayBuffer());
      assert.equal(
        buf.length,
        diamondSize,
        `${endpoint} must serve the same bytes as public/holded-diamond-logo.png`
      );
      // PNG magic number: 89 50 4E 47.
      assert.equal(buf[0], 0x89);
      assert.equal(buf[1], 0x50);
      assert.equal(buf[2], 0x4e);
      assert.equal(buf[3], 0x47);
    }

    const faviconRes = await fetch(`${runtime.baseUrl}/favicon.ico`);
    assert.equal(faviconRes.status, 200, '/favicon.ico should return 200');
    assert.equal(
      faviconRes.headers.get('content-type'),
      'image/x-icon',
      `/favicon.ico must declare Content-Type: image/x-icon (was: ${faviconRes.headers.get(
        'content-type'
      )})`
    );
    const faviconBuf = Buffer.from(await faviconRes.arrayBuffer());
    assert.equal(faviconBuf.length, faviconSize, '/favicon.ico must serve public/favicon.ico');
    assert.equal(faviconBuf[0], 0x00);
    assert.equal(faviconBuf[1], 0x00);
    assert.equal(faviconBuf[2], 0x01);
    assert.equal(faviconBuf[3], 0x00);
  } finally {
    await runtime.close();
  }
});
