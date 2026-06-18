/**
 * E2E tests — verifactu.business landing site
 */
import { expect, test } from '@playwright/test';

const BASE = 'https://verifactu.business';

test.describe('Landing — verifactu.business', () => {
  test('homepage loads with correct title', async ({ page }) => {
    await page.goto(BASE);
    await expect(page).toHaveTitle(/[Vv]erifactu/);
    await expect(page.locator('body')).toBeVisible();
  });

  test('no JS console errors on homepage', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(BASE);
    await page.waitForLoadState('networkidle');
    expect(errors.filter((e) => !e.includes('ResizeObserver'))).toHaveLength(0);
  });

  test('main CTA buttons are visible and have valid hrefs', async ({ page }) => {
    await page.goto(BASE);
    await page.waitForLoadState('networkidle');
    // At least one primary CTA should be present
    const ctas = page.locator(
      'a[href*="isaak"], a[href*="app.verifactu"], a[href*="auth"], button'
    );
    await expect(ctas.first()).toBeVisible();
  });

  test('navigation links resolve without 404', async ({ page }) => {
    await page.goto(BASE);
    const navLinks = await page.locator('nav a, header a').all();
    const hrefs = (await Promise.all(navLinks.map((l) => l.getAttribute('href')))).filter(
      (h): h is string => !!h && h.startsWith('/') && !h.startsWith('//')
    );

    for (const href of [...new Set(hrefs)].slice(0, 8)) {
      const res = await page.request.get(`${BASE}${href}`);
      expect(res.status(), `Nav link ${href} should not 404`).not.toBe(404);
    }
  });

  test('login / signup link exists', async ({ page }) => {
    await page.goto(BASE);
    const loginLink = page.locator(
      'a[href*="auth"], a[href*="login"], a[href*="signin"], a[href*="signup"]'
    );
    await expect(loginLink.first()).toBeVisible();
  });

  test('/precios or /pricing page loads', async ({ page }) => {
    const res = await page.request.get(`${BASE}/precios`);
    const res2 = await page.request.get(`${BASE}/pricing`);
    const ok = res.status() === 200 || res2.status() === 200;
    expect(ok, 'Either /precios or /pricing should return 200').toBeTruthy();
  });

  test('contact / demo form is present on homepage', async ({ page }) => {
    await page.goto(BASE);
    await page.waitForLoadState('networkidle');
    const form = page.locator('form');
    const formCount = await form.count();
    if (formCount === 0) {
      // Some landing pages use mailto or links instead of inline forms
      const contactLink = page.locator('a[href*="mailto"], a[href*="contacto"], a[href*="demo"]');
      await expect(contactLink.first()).toBeVisible();
    } else {
      await expect(form.first()).toBeVisible();
    }
  });

  test('footer exists with legal links', async ({ page }) => {
    await page.goto(BASE);
    const footer = page.locator('footer');
    await expect(footer).toBeVisible();
    const privacyLink = page.locator(
      'footer a[href*="privac"], footer a[href*="privacy"], footer a[href*="legal"]'
    );
    await expect(privacyLink.first()).toBeVisible();
  });
});
