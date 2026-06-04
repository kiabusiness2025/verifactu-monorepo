#!/usr/bin/env node
/**
 * scripts/holded-purchases-smoke.mjs
 *
 * Smoke test específico para verificar qué endpoint Holded devuelve las
 * facturas de compras del tenant. El usuario reportó que Nova Gestión SL
 * tiene facturas de compras visibles en /expenses/list (UI) pero nuestro
 * conector las pedía vía /documents/purchase — comprobamos si ese endpoint
 * REALMENTE devuelve datos en este tenant, o si Holded usa un endpoint
 * distinto para "expenses".
 *
 * Uso:
 *   HOLDED_TEST_API_KEY=<key> node scripts/holded-purchases-smoke.mjs
 *
 * Salida: cuenta + sample de hasta 3 documentos por cada endpoint que
 * pruebe, para que puedas comparar empíricamente cuál coincide con lo
 * que ves en la UI.
 */

import { loadHoldedEnvConfig } from './holded-env.mjs';

const envConfig = loadHoldedEnvConfig(process.cwd());
const apiKey = envConfig.apiKey;
const baseUrl = envConfig.baseUrl || 'https://api.holded.com';

if (!apiKey) {
  console.error('Missing HOLDED_TEST_API_KEY in env.');
  process.exit(1);
}

const endpoints = [
  // Documentos por docType — lo que usamos actualmente
  { label: 'documents/purchase (current)', path: '/api/invoicing/v1/documents/purchase' },
  { label: 'documents/purchaseorder', path: '/api/invoicing/v1/documents/purchaseorder' },
  { label: 'documents/purchaserefund', path: '/api/invoicing/v1/documents/purchaserefund' },

  // Variantes que el research agent puede sugerir
  { label: 'expenses (singular)', path: '/api/invoicing/v1/expense' },
  { label: 'expenses (plural)', path: '/api/invoicing/v1/expenses' },
  { label: 'documents/expense', path: '/api/invoicing/v1/documents/expense' },
  { label: 'documents/bill', path: '/api/invoicing/v1/documents/bill' },
  { label: 'documents/supplierinvoice', path: '/api/invoicing/v1/documents/supplierinvoice' },

  // Recientes (V2 si existe)
  { label: 'v2/documents/purchase', path: '/api/v2/documents/purchase' },
  { label: 'v2/expenses', path: '/api/v2/expenses' },

  // Año actual con filtro de fecha (por si la API requiere rango para purchases)
  {
    label: 'documents/purchase?year=2025',
    path: '/api/invoicing/v1/documents/purchase',
    query: { year: '2025' },
  },
  {
    label: 'documents/purchase con rango Q1-Q4 2025',
    path: '/api/invoicing/v1/documents/purchase',
    query: { from: '2025-01-01', to: '2025-12-31' },
  },
];

console.log(`Smoke test purchases — ${new Date().toISOString()}`);
console.log(`Base URL: ${baseUrl}`);
console.log();

let hits = 0;
for (const ep of endpoints) {
  const qs = ep.query ? '?' + new URLSearchParams(ep.query).toString() : '';
  const url = `${baseUrl}${ep.path}${qs}`;
  try {
    const res = await fetch(url, {
      headers: {
        key: apiKey,
        Accept: 'application/json',
        'Accept-Encoding': 'identity',
      },
    });
    const text = await res.text();
    let body;
    try {
      body = JSON.parse(text);
    } catch {
      body = text.slice(0, 200);
    }
    const count = Array.isArray(body) ? body.length : null;
    const status = res.status;
    const ok = res.ok ? 'OK' : 'ERR';

    if (count !== null && count > 0) {
      hits++;
      console.log(`✓ ${ep.label} → HTTP ${status} ${ok} · ${count} items`);
      const sample = body.slice(0, 2);
      console.log(`  sample[0]: ${JSON.stringify(sample[0]).slice(0, 200)}...`);
      if (sample[1]) {
        console.log(`  sample[1]: ${JSON.stringify(sample[1]).slice(0, 200)}...`);
      }
    } else if (count === 0) {
      console.log(`· ${ep.label} → HTTP ${status} ${ok} · empty array`);
    } else if (res.ok) {
      // 2xx pero respuesta no-array (probablemente JSON con error suave)
      console.log(
        `? ${ep.label} → HTTP ${status} · non-array body: ${JSON.stringify(body).slice(0, 200)}`
      );
    } else {
      console.log(
        `✗ ${ep.label} → HTTP ${status} ${ok} · ${typeof body === 'string' ? body.slice(0, 100) : JSON.stringify(body).slice(0, 100)}`
      );
    }
  } catch (err) {
    console.log(`✗ ${ep.label} → fetch error: ${err.message}`);
  }
}

console.log();
console.log(`Resumen: ${hits} endpoints con datos.`);
if (hits === 0) {
  console.log(
    '⚠ Ningún endpoint devolvió purchases. Verifica en la UI Holded:'
  );
  console.log('  1. Que el tenant realmente tiene purchases en /expenses/list.');
  console.log('  2. Que la API key tiene scope/permission para leer purchases.');
  console.log('  3. Que las purchases no estén archivadas/borradas.');
}
