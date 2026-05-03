import { chromium } from 'playwright';

const DEFAULT_BASE_URL = 'https://holded.verifactu.business';

const routes = [
  {
    path: '/',
    checks: ['Holded', 'Claude', 'ChatGPT'],
  },
  {
    path: '/conectores/chatgpt',
    checks: ['Trabaja con datos clave de Holded desde ChatGPT', 'holded_list_invoices'],
    forbidden: [
      'Acceso completo a Holded',
      'RRHH',
      'almacenes',
      'project tasks',
      'time records',
      'Analisis de archivos',
    ],
  },
  {
    path: '/conectores/claude',
    checks: ['Trabaja con datos clave de Holded desde Claude', 'list_documents'],
    forbidden: ['Acceso completo a Holded', 'RRHH', 'almacenes', 'project tasks', 'time records'],
  },
  {
    path: '/demo-recording',
    checks: ['Biblioteca de demos del conector Holded', 'OpenAI review demo'],
    mustHaveVideo: true,
    forbidden: ['clip en preparacion', 'proyectos activos y horas'],
  },
  {
    path: '/conectores/chatgpt/openai-review-demo',
    checks: ['Demo para revision OpenAI Platform', 'Flujos mostrados en la demo'],
    mustHaveVideo: true,
    forbidden: ['Consulta de proyectos activos', 'horas registradas'],
  },
  {
    path: '/conectores/chatgpt/soporte',
    checks: ['Centro de soporte', 'Chat con Isaak', 'Formulario autenticado', 'Email directo'],
    mustHaveStandaloneChat: true,
  },
  {
    path: '/conectores/claude/soporte',
    checks: ['Centro de soporte', 'Chat con Isaak', 'Formulario autenticado', 'Email directo'],
    mustHaveStandaloneChat: true,
  },
  {
    path: '/privacy',
    checks: ['Privacidad'],
  },
  {
    path: '/terms',
    checks: ['Terminos'],
  },
];

const viewports = [
  { name: 'desktop', width: 1440, height: 1000 },
  { name: 'mobile', width: 390, height: 844, isMobile: true },
];

function parseArgs() {
  const args = new Map();
  for (const arg of process.argv.slice(2)) {
    const [key, value] = arg.split('=');
    args.set(key.replace(/^--/, ''), value ?? true);
  }
  return args;
}

function joinUrl(baseUrl, path) {
  return new URL(path, baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`).toString();
}

async function visibleText(page) {
  const text = await page
    .locator('body')
    .innerText({ timeout: 5000 })
    .catch(() => '');
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function assertText(route, viewport, text, expected, anyCheck = false) {
  const missing = expected.filter((item) => !text.includes(item));
  if (!anyCheck && missing.length > 0) {
    throw new Error(`${viewport.name} ${route.path}: missing text ${missing.join(', ')}`);
  }
  if (anyCheck && missing.length === expected.length) {
    throw new Error(`${viewport.name} ${route.path}: none of the expected texts were found`);
  }
}

function assertForbidden(route, viewport, text) {
  const forbidden = route.forbidden ?? [];
  const found = forbidden.filter((item) => text.includes(item));
  if (found.length > 0) {
    throw new Error(`${viewport.name} ${route.path}: forbidden text found ${found.join(', ')}`);
  }
}

async function assertVideo(page, route, viewport) {
  const count = await page.locator('video').count();
  if (count < 1) {
    throw new Error(`${viewport.name} ${route.path}: expected at least one video element`);
  }
}

async function assertStandaloneChat(page, route, viewport) {
  const chatLink = page.locator('a[href*="/support/chat"]').first();
  if ((await chatLink.count()) < 1) {
    throw new Error(`${viewport.name} ${route.path}: missing support chat link`);
  }
  const target = await chatLink.getAttribute('target');
  if (target !== '_blank') {
    throw new Error(`${viewport.name} ${route.path}: support chat must open in a new window/tab`);
  }
}

async function run() {
  const args = parseArgs();
  const baseUrl = String(
    args.get('base-url') || process.env.HOLDED_QA_BASE_URL || DEFAULT_BASE_URL
  );
  const browser = await chromium.launch({ headless: true });
  const failures = [];

  for (const viewport of viewports) {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      isMobile: Boolean(viewport.isMobile),
    });
    const page = await context.newPage();
    const pageErrors = [];

    page.on('pageerror', (error) => pageErrors.push(error.message));

    for (const route of routes) {
      const url = joinUrl(baseUrl, route.path);
      try {
        const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        const status = response?.status() ?? 0;
        if (status >= 400 || status === 0) {
          throw new Error(`${viewport.name} ${route.path}: HTTP ${status}`);
        }

        await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
        const text = await visibleText(page);
        assertText(route, viewport, text, route.checks, Boolean(route.anyCheck));
        assertForbidden(route, viewport, text);
        if (route.mustHaveVideo) await assertVideo(page, route, viewport);
        if (route.mustHaveStandaloneChat) await assertStandaloneChat(page, route, viewport);

        console.log(`[ok] ${viewport.name} ${route.path}`);
      } catch (error) {
        failures.push(error instanceof Error ? error.message : String(error));
        console.error(
          `[fail] ${viewport.name} ${route.path}:`,
          error instanceof Error ? error.message : error
        );
      }
    }

    if (pageErrors.length > 0) {
      failures.push(`${viewport.name}: page errors: ${pageErrors.slice(0, 5).join(' | ')}`);
    }

    await context.close();
  }

  await browser.close();

  if (failures.length > 0) {
    console.error('\nHolded landing QA failed:');
    for (const failure of failures) console.error(`- ${failure}`);
    process.exit(1);
  }

  console.log(`\nHolded landing QA passed against ${baseUrl}`);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
