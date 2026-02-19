#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

function hasBinary(name) {
  const result = spawnSync('bash', ['-lc', `command -v ${name}`], {
    stdio: 'ignore',
  });
  return result.status === 0;
}

function run(cmd, args, opts = {}) {
  const result = spawnSync(cmd, args, {
    stdio: 'inherit',
    ...opts,
  });
  if (result.status !== 0) {
    throw new Error(`Command failed: ${cmd} ${args.join(' ')}`);
  }
}

function resolveSystemChromiumPath() {
  const candidates = [
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ];
  return candidates.find((candidate) => fs.existsSync(candidate)) || null;
}

function updateHeroSourcesToPng() {
  const uiFile = path.resolve(process.cwd(), 'apps/landing/app/lib/home/ui.tsx');
  const raw = fs.readFileSync(uiFile, 'utf8');
  const updated = raw
    .replace('/assets/hero/demo-overview.svg', '/assets/hero/demo-overview.png')
    .replace('/assets/hero/demo-invoices.svg', '/assets/hero/demo-invoices.png')
    .replace('/assets/hero/demo-isaak.svg', '/assets/hero/demo-isaak.png');
  if (updated !== raw) {
    fs.writeFileSync(uiFile, updated, 'utf8');
    console.log('Updated landing hero sources to PNG in apps/landing/app/lib/home/ui.tsx');
  }
}

function parseArgs(argv) {
  const args = {
    baseUrl: process.env.DEMO_BASE_URL || 'http://127.0.0.1:3000',
    outDir: 'apps/landing/public/assets/hero/generated',
    replaceHero: false,
    makeVideo: true,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--base-url') {
      args.baseUrl = argv[i + 1];
      i += 1;
      continue;
    }
    if (token === '--out-dir') {
      args.outDir = argv[i + 1];
      i += 1;
      continue;
    }
    if (token === '--replace-hero') {
      args.replaceHero = true;
      continue;
    }
    if (token === '--no-video') {
      args.makeVideo = false;
      continue;
    }
    if (token === '--help' || token === '-h') {
      console.log(`\nUsage:\n  node scripts/capture-demo-mockups.mjs [options]\n\nOptions:\n  --base-url <url>     Demo URL base (default: http://127.0.0.1:3000)\n  --out-dir <path>     Output directory\n  --replace-hero       Copy PNGs to /assets/hero/demo-*.png\n  --no-video           Skip GIF/MP4 generation\n`);
      process.exit(0);
    }
  }

  return args;
}

const routes = [
  {
    id: 'overview',
    path: '/demo',
    readyText: 'Modo demo',
  },
  {
    id: 'invoices',
    path: '/demo/invoices',
    readyText: 'facturas',
  },
  {
    id: 'isaak',
    path: '/demo',
    readyText: 'Modo demo',
    withIsaak: true,
  },
];

async function loadPlaywright() {
  try {
    const mod = await import('playwright');
    return mod;
  } catch (error) {
    console.error('Playwright is not installed in this workspace.');
    console.error('Run: pnpm add -Dw playwright && pnpm exec playwright install chromium');
    throw error;
  }
}

async function captureScreenshots(args) {
  const { chromium } = await loadPlaywright();

  const outDirAbs = path.resolve(process.cwd(), args.outDir);
  fs.mkdirSync(outDirAbs, { recursive: true });

  let browser;
  try {
    browser = await chromium.launch({ headless: true });
  } catch (error) {
    const systemChromium = resolveSystemChromiumPath();
    if (!systemChromium) {
      throw error;
    }
    console.warn(`Playwright bundled browser unavailable. Falling back to system Chromium: ${systemChromium}`);
    browser = await chromium.launch({ headless: true, executablePath: systemChromium });
  }
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });

  for (let i = 0; i < routes.length; i += 1) {
    const route = routes[i];
    const url = `${args.baseUrl}${route.path}`;
    const outputFile = path.join(outDirAbs, `demo-${route.id}.png`);

    console.log(`Capturing ${url} -> ${path.relative(process.cwd(), outputFile)}`);
    await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });

    if (route.readyText) {
      await page.getByText(route.readyText, { exact: false }).first().waitFor({ timeout: 15000 });
    }

    if (route.withIsaak) {
      const isaakButton = page.locator('button[aria-label="Abrir chat con Isaak"]').first();
      if (await isaakButton.isVisible()) {
        await isaakButton.click();
        await page.waitForTimeout(800);
      }
    }

    await page.screenshot({ path: outputFile, fullPage: false });
  }

  await browser.close();

  if (args.replaceHero) {
    const heroDir = path.resolve(process.cwd(), 'apps/landing/public/assets/hero');
    fs.copyFileSync(path.join(outDirAbs, 'demo-overview.png'), path.join(heroDir, 'demo-overview.png'));
    fs.copyFileSync(path.join(outDirAbs, 'demo-invoices.png'), path.join(heroDir, 'demo-invoices.png'));
    fs.copyFileSync(path.join(outDirAbs, 'demo-isaak.png'), path.join(heroDir, 'demo-isaak.png'));
    console.log('Updated hero PNG assets in apps/landing/public/assets/hero');
    updateHeroSourcesToPng();
  }

  return outDirAbs;
}

function generateVideoAssets(outDirAbs) {
  if (!hasBinary('ffmpeg')) {
    console.warn('ffmpeg not found. Skipping GIF/MP4 generation.');
    return;
  }

  const frameDir = path.join(outDirAbs, 'frames');
  fs.mkdirSync(frameDir, { recursive: true });

  const framePlan = [
    { source: 'demo-overview.png', repeat: 12 },
    { source: 'demo-invoices.png', repeat: 12 },
    { source: 'demo-isaak.png', repeat: 12 },
  ];

  let frameIndex = 1;
  for (const item of framePlan) {
    for (let r = 0; r < item.repeat; r += 1) {
      const target = path.join(frameDir, `frame-${String(frameIndex).padStart(3, '0')}.png`);
      fs.copyFileSync(path.join(outDirAbs, item.source), target);
      frameIndex += 1;
    }
  }

  const mp4Path = path.join(outDirAbs, 'demo-hero.mp4');
  const gifPath = path.join(outDirAbs, 'demo-hero.gif');

  run('ffmpeg', [
    '-y',
    '-framerate', '6',
    '-i', path.join(frameDir, 'frame-%03d.png'),
    '-vf', 'scale=1280:-2:flags=lanczos,format=yuv420p',
    '-movflags', '+faststart',
    mp4Path,
  ]);

  run('ffmpeg', [
    '-y',
    '-framerate', '6',
    '-i', path.join(frameDir, 'frame-%03d.png'),
    '-vf', 'fps=12,scale=1200:-2:flags=lanczos',
    gifPath,
  ]);

  console.log(`Generated ${path.relative(process.cwd(), mp4Path)}`);
  console.log(`Generated ${path.relative(process.cwd(), gifPath)}`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const outDirAbs = await captureScreenshots(args);
  if (args.makeVideo) {
    generateVideoAssets(outDirAbs);
  }
  console.log('Done.');
}

main().catch((error) => {
  console.error(error?.message || error);
  process.exit(1);
});
