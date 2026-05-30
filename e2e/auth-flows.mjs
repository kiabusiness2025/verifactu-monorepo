// E2E auth flows — landing http://localhost:3001
//
// Verifica:
//  1. /auth/isaak renderiza Google + Microsoft + magic link
//  2. POST /api/auth/magic-link acepta isaak.chat como continueUrl
//     (cuando deveulve 503 significa que pasa la whitelist y solo falla
//     en Firebase Admin por falta de keys reales en local).
//  3. Click en "Continuar con Google" dispara el error legible cuando
//     Firebase config es incompleta.
//
// Usar: node e2e/auth-flows.mjs

import { chromium } from 'playwright';

const BASE = process.env.E2E_LANDING_BASE ?? 'http://localhost:3001';
const CHROMIUM_PATH =
  process.env.PLAYWRIGHT_CHROMIUM ??
  '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

const results = [];
const ok = (name, detail = '') => {
  results.push({ name, status: 'PASS', detail });
  console.log(`  ✓ ${name}${detail ? ' — ' + detail : ''}`);
};
const fail = (name, detail) => {
  results.push({ name, status: 'FAIL', detail });
  console.log(`  ✗ ${name} — ${detail}`);
};

const browser = await chromium.launch({ headless: true, executablePath: CHROMIUM_PATH });
const ctx = await browser.newContext({ bypassCSP: true });
const page = await ctx.newPage();

console.log(`\n[1] GET /auth/isaak — UI elements`);
await page.goto(`${BASE}/auth/isaak`, { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(1200);

const visibleText = await page.evaluate(() => document.body.innerText);
const buttons = await page.$$eval('button', (bs) => bs.map((b) => b.innerText.trim()));

const hasGoogle = /Continuar con Google/i.test(visibleText);
const hasMicrosoft = /Continuar con Microsoft/i.test(visibleText);
const hasMagic = /enlace de acceso|Sin contraseña/i.test(visibleText);
const hasEmailInput = (await page.$$('input[type="email"]')).length > 0;

hasGoogle ? ok('Botón Google visible') : fail('Botón Google visible', 'no encontrado');
hasMicrosoft ? ok('Botón Microsoft visible') : fail('Botón Microsoft visible', 'no encontrado en la página — verifica /auth/isaak/page.tsx');
hasMagic ? ok('Magic link visible') : fail('Magic link visible', 'no encontrado');
hasEmailInput ? ok('Input email visible') : fail('Input email visible', 'no encontrado');

console.log(`\n[2] Magic link POST contra /api/auth/magic-link`);

const apiOk = await page.evaluate(async () => {
  const responses = {};
  // isaak.chat — debe pasar la whitelist
  const r1 = await fetch('/api/auth/magic-link', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'test@example.com', continueUrl: 'https://isaak.chat/chat' }),
  });
  responses.isaak_chat = { status: r1.status, body: await r1.text() };
  // evil.com — debe rechazar 400
  const r2 = await fetch('/api/auth/magic-link', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'test@example.com', continueUrl: 'https://evil.com/chat' }),
  });
  responses.evil = { status: r2.status, body: await r2.text() };
  return responses;
});

if (apiOk.isaak_chat.status === 503) {
  ok('isaak.chat origin pasa whitelist', '503 = falla solo Firebase Admin (esperado)');
} else if (apiOk.isaak_chat.status === 400) {
  fail('isaak.chat origin pasa whitelist', '400 = la whitelist lo rechaza — revisar route.ts');
} else {
  fail('isaak.chat origin pasa whitelist', `status inesperado ${apiOk.isaak_chat.status}`);
}

if (apiOk.evil.status === 400) {
  ok('Whitelist sigue rechazando orígenes no permitidos', `evil.com → 400`);
} else {
  fail('Whitelist sigue rechazando orígenes no permitidos', `evil.com → ${apiOk.evil.status}`);
}

console.log(`\n[3] Click Google muestra error de config legible`);
await page.goto(`${BASE}/auth/isaak`, { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(1000);
const googleBtns = await page.$$('button:has-text("Google")');
if (googleBtns.length > 0) {
  await googleBtns[0].click().catch(() => {});
  await page.waitForTimeout(2000);
  const text = await page.evaluate(() => document.body.innerText);
  const errMatch = text.match(/Autenticaci[óo]n no disponible[^\n]{0,250}/i);
  if (errMatch) {
    const enumeratesEnvVars = /NEXT_PUBLIC_FIREBASE_/.test(errMatch[0]);
    if (enumeratesEnvVars) {
      ok('Error Firebase enumera env vars faltantes', errMatch[0].slice(0, 150));
    } else {
      ok('Error Firebase visible', errMatch[0].slice(0, 150));
    }
  } else {
    fail('Click Google muestra error', 'sin popup, sin mensaje');
  }
} else {
  fail('Botón Google click', 'no encontrado');
}

await browser.close();

const passed = results.filter((r) => r.status === 'PASS').length;
const failed = results.filter((r) => r.status === 'FAIL').length;
console.log(`\n──── SUMMARY: PASS ${passed} · FAIL ${failed} ────`);
process.exit(failed > 0 ? 1 : 0);
