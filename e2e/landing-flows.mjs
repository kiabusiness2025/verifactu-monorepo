// E2E landing flows — isaak http://localhost:3012
//
// Verifica:
//  1. La home renderiza el badge "Holded Solution Partner", el pricing
//     menciona "Requiere licencia de Holded" y la FAQ enlaza a holded.com.
//  2. POST /api/holded-trial valida nombre, email, tamaño y devuelve 503
//     cuando RESEND_API_KEY no está (= toda la validación previa pasó).
//
// Usar: node e2e/landing-flows.mjs

import { chromium } from 'playwright';

const BASE = process.env.E2E_ISAAK_BASE ?? 'http://localhost:3012';
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

console.log(`\n[1] GET / — landing signatures`);
await page.goto(`${BASE}/`, { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(1500);

const html = await page.content();
const checks = [
  { name: 'Badge Holded Solution Partner presente', re: /Holded Solution Partner|holded.com\/es\/directorio-solution-partners/ },
  { name: 'Pricing menciona "Requiere licencia de Holded"', re: /Requiere licencia de Holded/i },
  { name: 'Pricing tiene CTA Solicita prueba Holded', re: /Solicita.*prueba|solicitar-holded/i },
  { name: 'FAQ enlaza a holded.com/es', re: /holded\.com\/es/ },
  { name: 'FAQ explica qué es Holded', re: /¿Qué es Holded/i },
  { name: 'Formulario solicitar Holded presente', re: /Solicita una prueba gratuita|Solicitar prueba de Holded/i },
  { name: 'Logo Holded servido', re: /\/brand\/holded\/holded-logo\.svg/ },
];
for (const c of checks) {
  c.re.test(html) ? ok(c.name) : fail(c.name, 'no match en HTML');
}

console.log(`\n[2] POST /api/holded-trial — validación`);
const trialResults = await page.evaluate(async () => {
  const post = async (body) => {
    const r = await fetch('/api/holded-trial', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return { status: r.status, body: await r.text() };
  };
  return {
    valid: await post({ name: 'Test User', email: 'test@example.com', companySize: '1-5' }),
    badEmail: await post({ name: 'Test', email: 'no-es-email' }),
    noName: await post({ email: 'test@example.com' }),
    badSize: await post({ name: 'Test', email: 'test@example.com', companySize: '100' }),
  };
});

if (trialResults.valid.status === 503) {
  ok('POST válido pasa validación', '503 = sin RESEND_API_KEY (esperado en local)');
} else if (trialResults.valid.status === 200) {
  ok('POST válido envía email', '200 OK');
} else {
  fail('POST válido pasa validación', `status inesperado ${trialResults.valid.status}: ${trialResults.valid.body.slice(0, 120)}`);
}
trialResults.badEmail.status === 400
  ? ok('Email inválido devuelve 400')
  : fail('Email inválido devuelve 400', `got ${trialResults.badEmail.status}`);
trialResults.noName.status === 400
  ? ok('Sin nombre devuelve 400')
  : fail('Sin nombre devuelve 400', `got ${trialResults.noName.status}`);
trialResults.badSize.status === 400
  ? ok('Tamaño inválido devuelve 400')
  : fail('Tamaño inválido devuelve 400', `got ${trialResults.badSize.status}`);

await browser.close();

const passed = results.filter((r) => r.status === 'PASS').length;
const failed = results.filter((r) => r.status === 'FAIL').length;
console.log(`\n──── SUMMARY: PASS ${passed} · FAIL ${failed} ────`);
process.exit(failed > 0 ? 1 : 0);
