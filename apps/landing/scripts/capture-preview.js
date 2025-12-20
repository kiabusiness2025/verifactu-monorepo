import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { chromium } from "playwright";

const url = process.argv[2] || process.env.LANDING_URL || "http://localhost:3000";
const outputPath = process.argv[3] || process.env.OUTPUT_PATH || "artifacts/landing-preview.png";

async function capture() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  await page.goto(url, { waitUntil: "networkidle" });
  await page.waitForTimeout(2000);

  const absoluteOutput = resolve(outputPath);
  await mkdir(dirname(absoluteOutput), { recursive: true });
  await page.screenshot({ path: absoluteOutput, fullPage: true });

  await browser.close();
  console.log(`Screenshot saved to ${absoluteOutput}`);
}

capture().catch((error) => {
  console.error("Failed to capture preview", error);
  process.exitCode = 1;
});
