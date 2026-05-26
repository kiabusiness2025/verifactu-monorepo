// MockBrowserAdapter — para tests sin browser real.
//
// Permite testear la orquestación (submitModelo303) controlando qué
// HTML "devuelve" AEAT, sin tener que arrancar Playwright ni acceso
// a AEAT real.

import type { BrowserAdapter } from '../index';

export type MockBrowserConfig = {
  // HTML que devuelve uploadFichero. Si tiene un CSV reconocible, el
  // orchestrator interpreta como 'accepted'.
  uploadHtml?: string;
  uploadStatus?: 'ok' | 'error';
  // Si true, init() throws (simula cert inválido)
  failInit?: boolean;
  // Si true, login() throws (simula auth fallido)
  failLogin?: boolean;
  // Si true, navigate() throws (simula portal AEAT inaccesible)
  failNavigate?: boolean;
};

export class MockBrowserAdapter implements BrowserAdapter {
  initCalls = 0;
  loginCalls = 0;
  navigateCalls: string[] = [];
  uploadCalls: string[] = [];
  closeCalls = 0;

  constructor(private config: MockBrowserConfig = {}) {}

  async init(_cert: { certPem: string; keyPem: string }, _env: 'pre' | 'prod'): Promise<void> {
    this.initCalls++;
    if (this.config.failInit) {
      throw new Error('Mock: cert inválido (failInit=true)');
    }
  }

  async login(): Promise<void> {
    this.loginCalls++;
    if (this.config.failLogin) {
      throw new Error('Mock: auth AEAT falló (failLogin=true)');
    }
  }

  async navigateToModeloUpload(modelo: string): Promise<void> {
    this.navigateCalls.push(modelo);
    if (this.config.failNavigate) {
      throw new Error('Mock: portal AEAT inaccesible (failNavigate=true)');
    }
  }

  async uploadFichero(path: string): Promise<{ html: string; status: 'ok' | 'error' }> {
    this.uploadCalls.push(path);
    return {
      html: this.config.uploadHtml ?? '<html>Mock empty response</html>',
      status: this.config.uploadStatus ?? 'ok',
    };
  }

  async close(): Promise<void> {
    this.closeCalls++;
  }
}
