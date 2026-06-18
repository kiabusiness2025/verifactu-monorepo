/**
 * Step 1: Submit magic-link email form on isaak.chat/auth
 * Run: npx ts-node e2e/scripts/submit-magic-link.ts
 */
import { chromium } from '@playwright/test';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  console.log('[1] Navigating to isaak.chat/auth ...');
  await page.goto('https://isaak.chat/auth', { waitUntil: 'networkidle' });

  const emailInput = page.locator('input[type="email"], input[name="email"]').first();
  await emailInput.waitFor({ state: 'visible', timeout: 15000 });
  await emailInput.fill('soporte@verifactu.business');

  console.log('[2] Submitting email form ...');
  const submitBtn = page
    .locator(
      'button[type="submit"], button:has-text("Continuar"), button:has-text("Acceder"), button:has-text("Enviar")'
    )
    .first();
  await submitBtn.click();

  await page.waitForTimeout(3000);
  const bodyText = await page.locator('body').innerText();
  console.log('[3] Page after submit (first 300 chars):', bodyText.slice(0, 300));
  console.log(
    '[DONE] Magic link email should be on its way. Check soporte@verifactu.business inbox.'
  );

  await ctx.close();
  await browser.close();
})();
