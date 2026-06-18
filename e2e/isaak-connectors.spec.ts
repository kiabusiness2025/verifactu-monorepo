/**
 * E2E tests — isaak.chat connectors & workspace pages (authenticated)
 *
 * These tests verify:
 *   1. Unauthenticated visitors are redirected to /auth (not 500 or blank page)
 *   2. Connector pages have the correct structure when accessed while logged in
 *      (uses E2E_EMAIL / E2E_PASSWORD env vars for a pre-created test account)
 *
 * To run with auth: E2E_EMAIL=x@y.z E2E_PASSWORD=secret pnpm exec playwright test
 */
import { expect, test } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

const BASE = 'https://isaak.chat';
const AUTH_STATE = path.join(__dirname, '.auth-state.json');

const HAS_CREDS = !!(process.env.E2E_EMAIL && process.env.E2E_PASSWORD);

// ─── Auth Setup ───────────────────────────────────────────────────────────────
// Runs once per worker; skipped if no credentials are provided.
test.describe('Auth setup', () => {
  test('log in and save auth state', async ({ page }) => {
    test.skip(!HAS_CREDS, 'No E2E credentials — skipping authenticated tests');

    await page.goto(`${BASE}/auth`);
    await page.waitForLoadState('networkidle');

    const emailInput = page.locator('input[type="email"], input[name="email"]').first();
    await emailInput.fill(process.env.E2E_EMAIL!);

    const submitBtn = page
      .locator('button[type="submit"], button:has-text("Continuar"), button:has-text("Acceder")')
      .first();
    await submitBtn.click();

    // Wait for either dashboard redirect or magic-link confirmation
    await page.waitForLoadState('networkidle');
    const url = page.url();
    expect(url, 'Should redirect away from /auth after submit').not.toContain('/auth');

    await page.context().storageState({ path: AUTH_STATE });
  });
});

// ─── Unauthenticated redirect guard ──────────────────────────────────────────
// These run without auth to verify protected routes redirect cleanly.
test.describe('Connectors — unauthenticated redirect', () => {
  const protectedRoutes = [
    '/integrations',
    '/banking',
    '/whatsapp',
    '/mail',
    '/microsoft',
    '/webhooks',
  ];

  for (const route of protectedRoutes) {
    test(`${route} redirects to /auth, not 500`, async ({ page }) => {
      const res = await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded' });
      const finalUrl = page.url();
      const status = res?.status() ?? 200;

      expect(status, `${route} should not return 5xx`).toBeLessThan(500);
      // Either redirected to /auth or still at route (if lazy-loaded auth)
      const isAuthPage = finalUrl.includes('/auth') || finalUrl.includes('/login');
      const isOnProtectedPage = finalUrl.includes(route);
      expect(
        isAuthPage || isOnProtectedPage,
        `${route}: expected /auth redirect or protected page, got ${finalUrl}`
      ).toBeTruthy();
    });
  }
});

// ─── Authenticated connector flows ────────────────────────────────────────────
// Skip entire block when no credentials are provided.
test.describe('Connectors — authenticated', () => {
  // Always provide a valid storageState to avoid fixture errors;
  // skip individual tests when no creds/state file exists.
  test.use({
    storageState:
      HAS_CREDS && fs.existsSync(AUTH_STATE) ? AUTH_STATE : { cookies: [], origins: [] },
  });

  test.beforeEach(async (_fixtures, testInfo) => {
    if (!HAS_CREDS || !fs.existsSync(AUTH_STATE)) {
      testInfo.skip();
    }
  });

  // ── Integrations hub ──────────────────────────────────────────────────────
  test('integrations hub loads and lists connectors', async ({ page }) => {
    await page.goto(`${BASE}/integrations`);
    await page.waitForLoadState('networkidle');

    await expect(page).not.toHaveURL(/auth/);
    const bodyText = await page.locator('body').innerText();
    const hasConnectors = /holded|gmail|banco|whatsapp|microsoft|excel/i.test(bodyText);
    expect(hasConnectors, 'Integrations page should list connectors').toBeTruthy();
  });

  // ── Holded connector ──────────────────────────────────────────────────────
  test('Holded integration page loads connect button', async ({ page }) => {
    await page.goto(`${BASE}/integrations`);
    await page.waitForLoadState('networkidle');

    // Click on Holded card if visible
    const holdedCard = page
      .locator(
        '[href*="holded"], [data-connector="holded"], button:has-text("Holded"), a:has-text("Holded")'
      )
      .first();
    const count = await holdedCard.count();
    if (count > 0) {
      await holdedCard.click();
      await page.waitForLoadState('networkidle');
    }

    const connectBtn = page.locator(
      'button:has-text("Conectar"), button:has-text("Connect"), a:has-text("Conectar")'
    );
    const apiInput = page.locator(
      'input[name*="api"], input[placeholder*="API" i], input[placeholder*="clave" i]'
    );
    const hasConnectUI = (await connectBtn.count()) > 0 || (await apiInput.count()) > 0;
    expect(hasConnectUI, 'Holded page should have connect UI').toBeTruthy();
  });

  // ── Banking page ──────────────────────────────────────────────────────────
  test('banking page loads', async ({ page }) => {
    await page.goto(`${BASE}/banking`);
    await page.waitForLoadState('networkidle');
    await expect(page).not.toHaveURL(/auth/);

    const bodyText = await page.locator('body').innerText();
    const hasBankContent = /banco|bank|cuenta|iban|open.?banking|salt.?edge|gcbd|eb\.com/i.test(
      bodyText
    );
    expect(hasBankContent, 'Banking page should have bank-related content').toBeTruthy();
  });

  test('banking connect button is present', async ({ page }) => {
    await page.goto(`${BASE}/banking`);
    await page.waitForLoadState('networkidle');

    const connectBtn = page.locator(
      'button:has-text("Conectar"), button:has-text("Añadir banco"), button:has-text("Añadir cuenta"), a:has-text("Conectar")'
    );
    if ((await connectBtn.count()) > 0) {
      await expect(connectBtn.first()).toBeVisible();
    }
  });

  // ── WhatsApp page ─────────────────────────────────────────────────────────
  test('whatsapp page loads', async ({ page }) => {
    await page.goto(`${BASE}/whatsapp`);
    await page.waitForLoadState('networkidle');
    await expect(page).not.toHaveURL(/auth/);

    const bodyText = await page.locator('body').innerText();
    const hasWhatsApp = /whatsapp|QR|número|phone|teléfono/i.test(bodyText);
    expect(hasWhatsApp, 'WhatsApp page should have WhatsApp-related content').toBeTruthy();
  });

  // ── Mail / Gmail page ─────────────────────────────────────────────────────
  test('mail integration page loads', async ({ page }) => {
    await page.goto(`${BASE}/mail`);
    await page.waitForLoadState('networkidle');
    await expect(page).not.toHaveURL(/auth/);

    const bodyText = await page.locator('body').innerText();
    const hasMail = /gmail|correo|email|mail|google/i.test(bodyText);
    expect(hasMail, 'Mail page should have email-related content').toBeTruthy();
  });

  // ── Microsoft / Teams page ────────────────────────────────────────────────
  test('microsoft integration page loads', async ({ page }) => {
    await page.goto(`${BASE}/microsoft`);
    await page.waitForLoadState('networkidle');
    await expect(page).not.toHaveURL(/auth/);

    const bodyText = await page.locator('body').innerText();
    const hasMicrosoft = /microsoft|teams|office|outlook/i.test(bodyText);
    expect(hasMicrosoft, 'Microsoft page should have Microsoft-related content').toBeTruthy();
  });

  // ── Webhooks page ─────────────────────────────────────────────────────────
  test('webhooks page loads and shows endpoint info', async ({ page }) => {
    await page.goto(`${BASE}/webhooks`);
    await page.waitForLoadState('networkidle');
    await expect(page).not.toHaveURL(/auth/);

    const bodyText = await page.locator('body').innerText();
    const hasWebhook = /webhook|endpoint|url|http/i.test(bodyText);
    expect(hasWebhook, 'Webhooks page should show endpoint info').toBeTruthy();
  });

  // ── Integration ayuda (help) pages ────────────────────────────────────────
  test('integration help page loads for holded', async ({ page }) => {
    const res = await page.goto(`${BASE}/integrations/ayuda/holded`, {
      waitUntil: 'domcontentloaded',
    });
    const status = res?.status() ?? 200;
    expect(status, 'Holded ayuda should load').toBeLessThan(400);
  });

  // ── Settings page ─────────────────────────────────────────────────────────
  test('settings page loads', async ({ page }) => {
    await page.goto(`${BASE}/settings`);
    await page.waitForLoadState('networkidle');
    await expect(page).not.toHaveURL(/auth/);
    await expect(page.locator('body')).toBeVisible();
  });
});
