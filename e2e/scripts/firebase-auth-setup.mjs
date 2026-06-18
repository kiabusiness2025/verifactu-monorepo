/**
 * E2E auth setup — bypasses magic-link email using Firebase Admin custom token.
 * Reads credentials from env vars (load from apps/landing/.env.vercel.production).
 *
 * Usage:
 *   $env:FIREBASE_PRIVATE_KEY = (gc apps\landing\.env.vercel.production | sls 'FIREBASE_ADMIN_PRIVATE_KEY').ToString().split('=',2)[1].Trim('"')
 *   node --env-file=apps/landing/.env.vercel.production e2e/scripts/firebase-auth-setup.mjs
 */
import { chromium } from '@playwright/test';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createSign } from 'crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const AUTH_STATE_PATH = resolve(__dirname, '../.auth-state.json');

// ── Read credentials from environment ─────────────────────────────────────
const PROJECT_ID = process.env.FIREBASE_ADMIN_PROJECT_ID;
const CLIENT_EMAIL = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
const PRIVATE_KEY = (process.env.FIREBASE_ADMIN_PRIVATE_KEY || '').replace(/\\n/g, '\n').replace(/^"|"$/g, '');
const WEB_API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
const TEST_UID = process.env.E2E_FIREBASE_UID || process.env.E2E_EMAIL || 'soporte@verifactu.business';
const LANDING_BASE = process.env.NEXT_PUBLIC_SITE_URL || 'https://verifactu.business';
const ISAAK_BASE = 'https://isaak.chat';

if (!PROJECT_ID || !CLIENT_EMAIL || !PRIVATE_KEY || !WEB_API_KEY) {
  console.error('[ERROR] Missing env vars. Run with: node --env-file=apps/landing/.env.vercel.production ...');
  process.exit(1);
}

// ── Step 1: Create Firebase custom token (signed JWT) ─────────────────────
function createCustomToken(uid) {
  const header = { alg: 'RS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: CLIENT_EMAIL,
    sub: CLIENT_EMAIL,
    aud: 'https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit',
    iat: now,
    exp: now + 3600,
    uid,
    claims: {},
  };
  const enc = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const input = `${enc(header)}.${enc(payload)}`;
  const sign = createSign('RSA-SHA256');
  sign.update(input);
  return `${input}.${sign.sign(PRIVATE_KEY, 'base64url')}`;
}

// ── Step 2: Exchange custom token → ID token ──────────────────────────────
async function exchangeToken(customToken) {
  const url = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${WEB_API_KEY}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: customToken, returnSecureToken: true }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`Firebase: ${body?.error?.message || res.status}`);
  return body.idToken;
}

// ── Step 3: Mint session cookie on landing app ─────────────────────────────
async function mintSession(idToken) {
  const res = await fetch(`${LANDING_BASE}/api/auth/session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken, rememberDevice: true }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Session: ${body?.error || res.status}`);
  if (!body.token) throw new Error(`No token in response: ${JSON.stringify(body)}`);
  return body.token;
}

// ── Step 4: Save browser auth state ──────────────────────────────────────
async function saveState(sessionToken) {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  const acceptUrl = `${ISAAK_BASE}/api/auth/accept?_t=${encodeURIComponent(sessionToken)}&next=/chat`;
  const res = await page.goto(acceptUrl, { waitUntil: 'networkidle' });
  const finalUrl = page.url();
  console.log('[accept] →', finalUrl, 'status:', res?.status());

  if (finalUrl.includes('/auth')) {
    throw new Error(`Session rejected — redirected to auth. Token may be invalid.`);
  }

  await ctx.storageState({ path: AUTH_STATE_PATH });
  await ctx.close();
  await browser.close();
  console.log('[✓] Saved auth state to', AUTH_STATE_PATH);
}

// ── Main ──────────────────────────────────────────────────────────────────
console.log('[1] Creating custom token for UID:', TEST_UID);
const customToken = createCustomToken(TEST_UID);

console.log('[2] Exchanging for ID token...');
const idToken = await exchangeToken(customToken);

console.log('[3] Minting session cookie...');
const sessionToken = await mintSession(idToken);

console.log('[4] Saving auth state...');
await saveState(sessionToken);

console.log('\n[DONE] Run authenticated tests:');
console.log('  pnpm exec playwright test e2e/isaak-connectors.spec.ts --project=chromium');
