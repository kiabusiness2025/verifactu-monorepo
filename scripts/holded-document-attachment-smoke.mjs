#!/usr/bin/env node
/**
 * scripts/holded-document-attachment-smoke.mjs
 *
 * Reviewer report 2026-06-01: P250001 (purchase document en Nova Gestión SL)
 * tiene un PDF adjunto visible en Holded UI pero el conector no lo recupera.
 * Solo intentábamos /attachments/list que parece no existir como tal en
 * Holded. El usuario sugiere que el endpoint correcto puede ser otro.
 *
 * Este smoke prueba TODAS las variantes plausibles contra el endpoint live
 * de Holded para que veamos empíricamente cuál devuelve el archivo de
 * P250001 (o si Holded retorna metadata de attachments en el GET principal
 * del documento).
 *
 * Uso:
 *   HOLDED_TEST_API_KEY=<key> node scripts/holded-document-attachment-smoke.mjs
 *
 * Output por endpoint:
 *   - HTTP status
 *   - Content-Type
 *   - Body sample (truncado a 300 chars JSON o magic bytes binario)
 */

import { loadHoldedEnvConfig } from './holded-env.mjs';

const envConfig = loadHoldedEnvConfig(process.cwd());
const apiKey = envConfig.apiKey;
const baseUrl = envConfig.baseUrl || 'https://api.holded.com';

if (!apiKey) {
  console.error('Missing HOLDED_TEST_API_KEY in env.');
  process.exit(1);
}

// IDs reales que el reviewer reportó
const DOC_ID = process.env.HOLDED_TEST_DOC_ID || '69fe16f919098de62508fa64';
const DOC_TYPE = process.env.HOLDED_TEST_DOC_TYPE || 'purchase';

const endpoints = [
  // GET principal del documento — primero, para ver si Holded incluye attachments en metadata
  {
    label: 'GET document detail (does it include attachment metadata?)',
    path: `/api/invoicing/v1/documents/${DOC_TYPE}/${DOC_ID}`,
    method: 'GET',
  },

  // Variantes plurales (que probamos en V3.G.5)
  {
    label: '/attachments/list (plural + /list — el que ya probamos)',
    path: `/api/invoicing/v1/documents/${DOC_TYPE}/${DOC_ID}/attachments/list`,
    method: 'GET',
  },
  {
    label: '/attachments (plural, sin /list)',
    path: `/api/invoicing/v1/documents/${DOC_TYPE}/${DOC_ID}/attachments`,
    method: 'GET',
  },

  // Variante singular sugerida por el usuario
  {
    label: '/attachment (singular, sin nada más)',
    path: `/api/invoicing/v1/documents/${DOC_TYPE}/${DOC_ID}/attachment`,
    method: 'GET',
  },
  {
    label: '/attachment/list (singular + /list)',
    path: `/api/invoicing/v1/documents/${DOC_TYPE}/${DOC_ID}/attachment/list`,
    method: 'GET',
  },

  // Variantes "files"
  {
    label: '/files (plural)',
    path: `/api/invoicing/v1/documents/${DOC_TYPE}/${DOC_ID}/files`,
    method: 'GET',
  },
  {
    label: '/file (singular)',
    path: `/api/invoicing/v1/documents/${DOC_TYPE}/${DOC_ID}/file`,
    method: 'GET',
  },

  // /attach (mismo que usamos para upload via POST — quizá GET también lista)
  {
    label: '/attach (mismo que upload, pero GET)',
    path: `/api/invoicing/v1/documents/${DOC_TYPE}/${DOC_ID}/attach`,
    method: 'GET',
  },

  // /download
  {
    label: '/download',
    path: `/api/invoicing/v1/documents/${DOC_TYPE}/${DOC_ID}/download`,
    method: 'GET',
  },

  // API v2 hypothesis
  {
    label: 'v2 /documents/{id}/attachments',
    path: `/api/v2/documents/${DOC_ID}/attachments`,
    method: 'GET',
  },
];

console.log(`Smoke test document attachments — ${new Date().toISOString()}`);
console.log(`Target document: ${DOC_TYPE}/${DOC_ID}`);
console.log(`Base URL: ${baseUrl}`);
console.log();

let hits = 0;
for (const ep of endpoints) {
  const url = `${baseUrl}${ep.path}`;
  try {
    const res = await fetch(url, {
      method: ep.method,
      headers: {
        key: apiKey,
        Accept: 'application/json, application/pdf, application/octet-stream, */*',
        'Accept-Encoding': 'identity',
      },
    });
    const contentType = res.headers.get('content-type') ?? 'unknown';

    // Detecta binary vs JSON
    if (contentType.includes('pdf') || contentType.includes('octet-stream')) {
      const buf = Buffer.from(await res.arrayBuffer());
      const magic = buf.subarray(0, 5).toString('latin1');
      const isPdf = magic.startsWith('%PDF-');
      console.log(
        `${isPdf ? '✓' : '?'} ${ep.label} → HTTP ${res.status} · ${contentType} · ${buf.length}B · magic=${JSON.stringify(magic)}`
      );
      if (isPdf) hits++;
    } else {
      const text = await res.text();
      let body;
      try {
        body = JSON.parse(text);
      } catch {
        body = text;
      }
      const isArray = Array.isArray(body);
      const isObject = body && typeof body === 'object' && !isArray;
      const sample = JSON.stringify(body).slice(0, 300);

      // Check si el GET principal incluye metadata de attachments
      if (ep.label.startsWith('GET document detail') && isObject) {
        const attachmentFields = Object.keys(body).filter((k) =>
          /attach|file|document|upload/i.test(k)
        );
        if (attachmentFields.length > 0) {
          console.log(`✓ ${ep.label} → HTTP ${res.status} · CONTIENE: ${attachmentFields.join(', ')}`);
          for (const f of attachmentFields) {
            console.log(`    ${f}: ${JSON.stringify(body[f]).slice(0, 200)}`);
          }
          hits++;
        } else {
          console.log(`· ${ep.label} → HTTP ${res.status} · sin campos attachment/file en root`);
          console.log(`    keys: ${Object.keys(body).slice(0, 20).join(', ')}`);
        }
      } else if (res.ok && (isArray || isObject)) {
        console.log(`✓ ${ep.label} → HTTP ${res.status} · ${contentType} · ${sample}`);
        hits++;
      } else if (res.ok) {
        console.log(`? ${ep.label} → HTTP ${res.status} · text body: ${sample}`);
      } else {
        console.log(`✗ ${ep.label} → HTTP ${res.status} · ${sample}`);
      }
    }
  } catch (err) {
    console.log(`✗ ${ep.label} → fetch error: ${err.message}`);
  }
}

console.log();
console.log(`Resumen: ${hits} endpoints devolvieron datos útiles.`);
if (hits === 0) {
  console.log(
    'ℹ Sin hits — Holded puede usar un endpoint que no está en esta lista.'
  );
  console.log('   Comparte el log para iterar las variantes a probar.');
}
