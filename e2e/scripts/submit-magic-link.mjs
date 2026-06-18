/**
 * Step 1: Submit magic-link email form on isaak.chat/auth
 */
import { chromium } from '@playwright/test';

const EMAIL = 'soporte@verifactu.business';

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext();
const page = await ctx.newPage();

console.log('[1] Navigating to isaak.chat/auth ...');
await page.goto('https://isaak.chat/auth', { waitUntil: 'networkidle' });

const emailInput = page.locator('input[type="email"], input[name="email"]').first();
await emailInput.waitFor({ state: 'visible', timeout: 15000 });
await emailInput.fill(EMAIL);

console.log('[2] Submitting email:', EMAIL);
const submitBtn = page
  .locator('button[type="submit"], button:has-text("Continuar"), button:has-text("Acceder"), button:has-text("Enviar")')
  .first();
await submitBtn.click();

await page.waitForTimeout(3000);
const bodyText = await page.locator('body').innerText();
console.log('[3] Page after submit:\n', bodyText.slice(0, 400));

await ctx.close();
await browser.close();
