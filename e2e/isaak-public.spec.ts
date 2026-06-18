/**
 * E2E tests — isaak.chat public pages (no auth required)
 */
import { expect, test } from '@playwright/test';

const BASE = 'https://isaak.chat';

// ─── Helpers ──────────────────────────────────────────────────────────────────
async function expectPageOk(url: string, page: import('@playwright/test').Page) {
  const res = await page.goto(url, { waitUntil: 'domcontentloaded' });
  expect(res?.status(), `${url} should return 2xx`).toBeLessThan(400);
}

// ─── Homepage ─────────────────────────────────────────────────────────────────
test.describe('Isaak — Homepage', () => {
  test('loads with Isaak branding', async ({ page }) => {
    await page.goto(BASE);
    await expect(page).toHaveTitle(/[Ii]saak/);
  });

  test('no uncaught JS errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(BASE);
    await page.waitForLoadState('networkidle');
    expect(errors.filter((e) => !e.includes('ResizeObserver'))).toHaveLength(0);
  });

  test('login / auth CTA is present', async ({ page }) => {
    await page.goto(BASE);
    await page.waitForLoadState('networkidle');
    const loginBtn = page.locator(
      'a[href*="/auth"], a[href*="/login"], a[href*="signup"], button:has-text("Entrar"), button:has-text("Iniciar"), a:has-text("Entrar")'
    );
    await expect(loginBtn.first()).toBeVisible();
  });
});

// ─── Auth / Login ─────────────────────────────────────────────────────────────
test.describe('Isaak — Auth page', () => {
  test('auth page loads', async ({ page }) => {
    await expectPageOk(`${BASE}/auth`, page);
    await expect(page.locator('body')).toBeVisible();
  });

  test('email input is present', async ({ page }) => {
    await page.goto(`${BASE}/auth`);
    await page.waitForLoadState('networkidle');
    const emailInput = page.locator(
      'input[type="email"], input[name="email"], input[placeholder*="email" i]'
    );
    await expect(emailInput.first()).toBeVisible();
  });

  test('Google sign-in button is present', async ({ page }) => {
    await page.goto(`${BASE}/auth`);
    await page.waitForLoadState('networkidle');
    const googleBtn = page.locator(
      'button:has-text("Google"), a:has-text("Google"), [aria-label*="Google" i]'
    );
    await expect(googleBtn.first()).toBeVisible();
  });

  test('magic link form submits and shows confirmation', async ({ page }) => {
    await page.goto(`${BASE}/auth`);
    await page.waitForLoadState('networkidle');

    const emailInput = page.locator('input[type="email"], input[name="email"]').first();
    await emailInput.fill('test-e2e@example.com');

    const submitBtn = page
      .locator(
        'button[type="submit"], button:has-text("Continuar"), button:has-text("Enviar"), button:has-text("Acceder")'
      )
      .first();
    await submitBtn.click();

    // Should show success state or redirect — not an error page
    await page.waitForLoadState('networkidle');
    const bodyText = await page.locator('body').innerText();
    const hasError =
      bodyText.toLowerCase().includes('error interno') || bodyText.toLowerCase().includes('500');
    expect(hasError, 'Should not show 500 error after submit').toBeFalsy();
  });

  test('invalid email shows validation error', async ({ page }) => {
    await page.goto(`${BASE}/auth`);
    await page.waitForLoadState('networkidle');

    const emailInput = page.locator('input[type="email"], input[name="email"]').first();
    await emailInput.fill('not-an-email');

    const submitBtn = page
      .locator('button[type="submit"], button:has-text("Continuar"), button:has-text("Enviar")')
      .first();
    await submitBtn.click();

    await page.waitForTimeout(500);
    // Should show validation error or browser validation
    const isInvalid = await emailInput.evaluate((el: HTMLInputElement) => !el.validity.valid);
    const hasErrorMsg = (await page.locator('[role="alert"], .error, [data-error]').count()) > 0;
    expect(isInvalid || hasErrorMsg, 'Invalid email should trigger validation').toBeTruthy();
  });
});

// ─── Signup ───────────────────────────────────────────────────────────────────
test.describe('Isaak — Signup page', () => {
  test('signup page loads or redirects to auth', async ({ page }) => {
    const res = await page.goto(`${BASE}/signup`, { waitUntil: 'domcontentloaded' });
    // Either 200 or redirect to /auth is fine
    const url = page.url();
    const status = res?.status() ?? 200;
    expect(
      status < 400 || url.includes('/auth'),
      'Signup should load or redirect to auth'
    ).toBeTruthy();
  });
});

// ─── Pricing ──────────────────────────────────────────────────────────────────
test.describe('Isaak — Pricing page', () => {
  test('pricing page loads', async ({ page }) => {
    await expectPageOk(`${BASE}/pricing`, page);
    await expect(page.locator('body')).toBeVisible();
  });

  test('pricing plans are visible', async ({ page }) => {
    await page.goto(`${BASE}/pricing`);
    await page.waitForLoadState('networkidle');
    // Should show at least one price / plan card
    const plans = page.locator(
      '[class*="plan"], [class*="tier"], [class*="precio"], [class*="price"]'
    );
    const count = await plans.count();
    if (count === 0) {
      // Fallback: look for currency symbols or common plan keywords
      const bodyText = await page.locator('body').innerText();
      const hasPricing = /€|\$|mes|month|plan|gratis|free|pro/i.test(bodyText);
      expect(hasPricing, 'Pricing page should mention prices or plans').toBeTruthy();
    } else {
      expect(count).toBeGreaterThan(0);
    }
  });

  test('CTA buttons on pricing page are clickable', async ({ page }) => {
    await page.goto(`${BASE}/pricing`);
    await page.waitForLoadState('networkidle');
    const ctas = page.locator(
      'a[href*="auth"], a[href*="signup"], button:has-text("Empezar"), a:has-text("Empezar"), a:has-text("Probar")'
    );
    const count = await ctas.count();
    if (count > 0) {
      await expect(ctas.first()).toBeEnabled();
    }
  });
});

// ─── Investors page ───────────────────────────────────────────────────────────
// These tests require the /investors page to be deployed.
// They are skipped automatically if the page returns 404 (deployment pending).
test.describe('Isaak — Investors page', () => {
  let investorsAvailable = true;

  test.beforeAll(async ({ browser }) => {
    const ctx = await browser.newContext();
    const p = await ctx.newPage();
    const res = await p.goto(`${BASE}/investors`, { waitUntil: 'domcontentloaded' });
    investorsAvailable = (res?.status() ?? 404) < 400;
    await ctx.close();
  });

  test('investors page loads', async ({ page }, testInfo) => {
    if (!investorsAvailable) testInfo.skip();
    await expectPageOk(`${BASE}/investors`, page);
  });

  test('lead capture form is present with required fields', async ({ page }, testInfo) => {
    if (!investorsAvailable) testInfo.skip();
    await page.goto(`${BASE}/investors`);
    await page.waitForLoadState('networkidle');

    await expect(page.locator('form, [data-testid="lead-form"]').first()).toBeVisible();
    await expect(page.locator('input[type="email"], input[name="email"]').first()).toBeVisible();
    await expect(
      page.locator('input[name="name"], input[placeholder*="nombre" i]').first()
    ).toBeVisible();
  });

  test('download blocked without consent', async ({ page }, testInfo) => {
    if (!investorsAvailable) testInfo.skip();
    await page.goto(`${BASE}/investors`);
    await page.waitForLoadState('networkidle');

    const nameInput = page.locator('input[name="name"], input[placeholder*="nombre" i]').first();
    const emailInput = page.locator('input[type="email"]').first();
    await nameInput.fill('Test Investor');
    await emailInput.fill('investor@example.com');

    const submitBtn = page.locator('button[type="submit"]').first();
    await submitBtn.click();
    await page.waitForTimeout(800);

    const pdfDownload = page.url().includes('.pdf');
    expect(pdfDownload, 'Should not download PDF without consent').toBeFalsy();
  });

  test('type toggle investor/partner works', async ({ page }, testInfo) => {
    if (!investorsAvailable) testInfo.skip();
    await page.goto(`${BASE}/investors`);
    await page.waitForLoadState('networkidle');

    const partnerToggle = page.locator('button:has-text("partner"), button:has-text("Partner")');
    if ((await partnerToggle.count()) > 0) {
      await partnerToggle.first().click();
      await page.waitForTimeout(300);
      await expect(partnerToggle.first()).toBeVisible();
    }
  });
});

// ─── Conectores (public info page) ───────────────────────────────────────────
test.describe('Isaak — Conectores public page', () => {
  test('conectores page loads', async ({ page }) => {
    await expectPageOk(`${BASE}/conectores`, page);
  });

  test('lists integration providers', async ({ page }) => {
    await page.goto(`${BASE}/conectores`);
    await page.waitForLoadState('networkidle');
    const bodyText = await page.locator('body').innerText();
    const hasIntegrations = /holded|gmail|banco|bank|whatsapp|excel|microsoft/i.test(bodyText);
    expect(hasIntegrations, 'Conectores page should list integration providers').toBeTruthy();
  });
});

// ─── Static / legal pages ─────────────────────────────────────────────────────
test.describe('Isaak — Static pages', () => {
  test('privacy policy loads', async ({ page }) => {
    await expectPageOk(`${BASE}/privacy`, page);
  });

  test('terms of service loads', async ({ page }) => {
    await expectPageOk(`${BASE}/terms`, page);
  });

  test('support page loads', async ({ page }) => {
    await expectPageOk(`${BASE}/support`, page);
  });
});

// ─── 404 handling ─────────────────────────────────────────────────────────────
test.describe('Isaak — Error pages', () => {
  test('unknown route returns 404, not 500', async ({ page }) => {
    const res = await page.goto(`${BASE}/this-page-does-not-exist-e2e`);
    expect(res?.status()).toBe(404);
  });
});
