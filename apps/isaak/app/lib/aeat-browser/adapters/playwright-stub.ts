// PlaywrightBrowserAdapter — implementación real con Playwright.
//
// IMPORTANTE: stub v1. Para que funcione hay que:
//   1. Añadir 'playwright' como dependencia (no en este package — en el
//      worker que lo consume, porque pesa ~300MB con binarios).
//   2. Definir los selectores reales del portal AEAT (requiere acceso
//      a pre-producción para inspeccionar el DOM).
//   3. Probar contra pre-pro AEAT antes de cualquier uso real.
//
// El cliente cert auth con Playwright se hace vía launchOptions:
//   {
//     clientCertificates: [{
//       origin: 'https://prewww1.aeat.es',
//       certPath: '/tmp/cert.pem',
//       keyPath: '/tmp/key.pem',
//     }]
//   }
//
// O alternativamente vía context.setExtraHTTPHeaders + custom HTTPS
// agent — depende de la versión Playwright.

import type { BrowserAdapter } from '../index';

const AEAT_URLS = {
  pre: {
    login: 'https://prewww1.aeat.es/wlpl/Inicio/ses',
    modelo303Upload:
      'https://prewww1.aeat.es/wlpl/SSII-PRES/PresPorFich303',
  },
  prod: {
    login: 'https://www1.agenciatributaria.gob.es/wlpl/Inicio/ses',
    modelo303Upload:
      'https://www1.agenciatributaria.gob.es/wlpl/SSII-PRES/PresPorFich303',
  },
};

export class PlaywrightBrowserAdapter implements BrowserAdapter {
  // En v1 mantenemos referencias internas como `unknown` para no
  // forzar la dependencia de playwright en este package. El worker
  // que importe este adapter sí lo tendrá instalado.
  private playwright: unknown = null;
  private browser: unknown = null;
  private context: unknown = null;
  private page: unknown = null;
  private env: 'pre' | 'prod' = 'pre';

  async init(
    cert: { certPem: string; keyPem: string },
    environment: 'pre' | 'prod',
  ): Promise<void> {
    this.env = environment;
    // Lazy import — solo carga playwright si se invoca init().
    // En tests con MockBrowserAdapter, este código nunca se ejecuta.
    const { chromium } = (await import('playwright').catch(() => {
      throw new Error(
        'PlaywrightBrowserAdapter requires `playwright` installed. ' +
          'Run `pnpm add -D playwright` y `npx playwright install chromium` ' +
          'en el worker que ejecuta este código.',
      );
    })) as { chromium: { launch: (opts: unknown) => Promise<unknown> } };

    // Escribir cert/key a archivos temporales para que Playwright los
    // pase al engine. (Playwright requiere paths, no buffers).
    const { writeFileSync, mkdtempSync } = await import('node:fs');
    const { join } = await import('node:path');
    const { tmpdir } = await import('node:os');
    const dir = mkdtempSync(join(tmpdir(), 'aeat-cert-'));
    const certPath = join(dir, 'cert.pem');
    const keyPath = join(dir, 'key.pem');
    writeFileSync(certPath, cert.certPem);
    writeFileSync(keyPath, cert.keyPem);

    const origin = new URL(AEAT_URLS[this.env].login).origin;
    this.browser = await chromium.launch({ headless: true });
    const browserAny = this.browser as { newContext: (opts: unknown) => Promise<unknown> };
    this.context = await browserAny.newContext({
      clientCertificates: [{ origin, certPath, keyPath }],
    });
    const ctxAny = this.context as { newPage: () => Promise<unknown> };
    this.page = await ctxAny.newPage();
    this.playwright = { dir }; // guardamos el dir para limpieza en close()
  }

  async login(): Promise<void> {
    const page = this.page as { goto: (url: string) => Promise<unknown>; waitForLoadState: (s: string) => Promise<unknown> } | null;
    if (!page) throw new Error('Browser no inicializado');
    await page.goto(AEAT_URLS[this.env].login);
    await page.waitForLoadState('networkidle');
    // TODO: detectar si AEAT pidió un segundo factor o redirigió a un
    // landing distinto. En v1 asumimos que el cert auto-loguea.
  }

  async navigateToModeloUpload(
    modelo: '303' | '130' | '111' | '115' | '349' | '347' | '180' | '190',
  ): Promise<void> {
    if (modelo !== '303') {
      throw new Error(`PlaywrightBrowserAdapter v1 solo soporta modelo 303, recibió ${modelo}`);
    }
    const page = this.page as { goto: (url: string) => Promise<unknown> } | null;
    if (!page) throw new Error('Browser no inicializado');
    await page.goto(AEAT_URLS[this.env].modelo303Upload);
    // TODO: localizar el input file + botón submit. Los selectores
    // específicos hay que validar con pre-pro AEAT.
  }

  async uploadFichero(
    ficheroPath: string,
  ): Promise<{ html: string; status: 'ok' | 'error' }> {
    const page = this.page as {
      setInputFiles: (sel: string, path: string) => Promise<unknown>;
      click: (sel: string) => Promise<unknown>;
      waitForLoadState: (s: string) => Promise<unknown>;
      content: () => Promise<string>;
    } | null;
    if (!page) throw new Error('Browser no inicializado');
    // TODO: los selectores reales hay que validarlos en el portal AEAT.
    await page.setInputFiles('input[type="file"]', ficheroPath);
    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');
    const html = await page.content();
    const status = /error|incorrec/i.test(html) ? 'error' : 'ok';
    return { html, status };
  }

  async close(): Promise<void> {
    if (this.browser) {
      const browserAny = this.browser as { close: () => Promise<unknown> };
      try {
        await browserAny.close();
      } catch {
        // ignore
      }
    }
    // Cleanup temp cert files
    if (this.playwright) {
      const { rmSync } = await import('node:fs');
      try {
        rmSync((this.playwright as { dir: string }).dir, { recursive: true, force: true });
      } catch {
        // ignore
      }
    }
  }
}
