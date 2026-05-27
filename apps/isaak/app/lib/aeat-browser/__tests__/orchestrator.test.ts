import {
  extractCsvJustificante,
  parseAeatErrorResponse,
  submitModelo303,
  type Modelo303SubmissionInput,
} from '../index';
import { MockBrowserAdapter } from '../adapters/mock';

const SAMPLE_INPUT: Modelo303SubmissionInput = {
  ficheroPath: '/tmp/B12345678-303-2026-2T.303',
  declaranteNif: 'B12345678',
  cert: {
    certPem: '-----BEGIN CERTIFICATE-----\nfake\n-----END CERTIFICATE-----',
    keyPem: '-----BEGIN PRIVATE KEY-----\nfake\n-----END PRIVATE KEY-----',
  },
  environment: 'pre',
};

describe('extractCsvJustificante', () => {
  it('extrae el CSV de la respuesta "CSV: XXXXX"', () => {
    const html =
      '<p>Su declaración fue presentada con éxito. CSV: ABC123XYZ7890DEF456 fin</p>';
    expect(extractCsvJustificante(html)).toBe('ABC123XYZ7890DEF456');
  });

  it('extrae el CSV de un <span class="csv">XXXXX</span>', () => {
    const html = '<span class="csv">ABCDEFGH12345678JKLM</span>';
    expect(extractCsvJustificante(html)).toBe('ABCDEFGH12345678JKLM');
  });

  it('extrae el CSV con prefijo y minúsculas en el label', () => {
    const html = 'Presentación correcta. csv: AAAA1111BBBB2222';
    expect(extractCsvJustificante(html)).toBe('AAAA1111BBBB2222');
  });

  it('devuelve null si no hay CSV reconocible', () => {
    const html = '<p>No hay nada útil aquí</p>';
    expect(extractCsvJustificante(html)).toBeNull();
  });
});

describe('parseAeatErrorResponse', () => {
  it('extrae código + mensaje de "Error NNN: descripción"', () => {
    const html =
      '<div class="aeat-error">Error 1015: La fecha de devengo no es válida</div>';
    const parsed = parseAeatErrorResponse(html);
    expect(parsed.code).toBe('1015');
    expect(parsed.message).toContain('fecha de devengo');
  });

  it('extrae el texto de un div .error si no hay código', () => {
    const html = '<div class="error">El fichero no respeta el diseño de registro</div>';
    const parsed = parseAeatErrorResponse(html);
    expect(parsed.code).toBeUndefined();
    expect(parsed.message).toContain('fichero');
  });

  it('devuelve mensaje genérico si no encuentra nada', () => {
    const html = '<html></html>';
    const parsed = parseAeatErrorResponse(html);
    expect(parsed.message).toContain('no parseable');
  });
});

describe('submitModelo303 — orquestación con adapter mock', () => {
  it('upload OK + HTML con CSV → status accepted', async () => {
    const adapter = new MockBrowserAdapter({
      uploadStatus: 'ok',
      uploadHtml:
        '<p>Presentación correcta. CSV: ABCDEFGH12345678JKLM</p>',
    });
    const result = await submitModelo303(SAMPLE_INPUT, adapter);
    expect(result.status).toBe('accepted');
    if (result.status !== 'accepted') return;
    expect(result.csvJustificante).toBe('ABCDEFGH12345678JKLM');
    expect(adapter.initCalls).toBe(1);
    expect(adapter.loginCalls).toBe(1);
    expect(adapter.navigateCalls).toEqual(['303']);
    expect(adapter.uploadCalls).toEqual(['/tmp/B12345678-303-2026-2T.303']);
    expect(adapter.closeCalls).toBe(1);
  });

  it('upload status=error → rejected con código AEAT', async () => {
    const adapter = new MockBrowserAdapter({
      uploadStatus: 'error',
      uploadHtml:
        '<div class="error">Error 2001: NIF declarante no coincide con cert</div>',
    });
    const result = await submitModelo303(SAMPLE_INPUT, adapter);
    expect(result.status).toBe('rejected');
    if (result.status !== 'rejected') return;
    expect(result.errorCode).toBe('2001');
    expect(result.errorMessage).toContain('NIF');
  });

  it('upload OK pero sin CSV reconocible → rejected con motivo genérico', async () => {
    const adapter = new MockBrowserAdapter({
      uploadStatus: 'ok',
      uploadHtml: '<p>respuesta vacía</p>',
    });
    const result = await submitModelo303(SAMPLE_INPUT, adapter);
    expect(result.status).toBe('rejected');
    if (result.status !== 'rejected') return;
    expect(result.errorMessage).toContain('sin CSV justificante');
  });

  it('init falla (cert inválido) → status=error', async () => {
    const adapter = new MockBrowserAdapter({ failInit: true });
    const result = await submitModelo303(SAMPLE_INPUT, adapter);
    expect(result.status).toBe('error');
    if (result.status !== 'error') return;
    expect(result.errorMessage).toContain('cert');
    // Aún así llamó close() para limpiar
    expect(adapter.closeCalls).toBe(1);
  });

  it('login falla → status=error', async () => {
    const adapter = new MockBrowserAdapter({ failLogin: true });
    const result = await submitModelo303(SAMPLE_INPUT, adapter);
    expect(result.status).toBe('error');
    if (result.status !== 'error') return;
    expect(result.errorMessage).toContain('auth AEAT');
  });

  it('navigate falla → status=error', async () => {
    const adapter = new MockBrowserAdapter({ failNavigate: true });
    const result = await submitModelo303(SAMPLE_INPUT, adapter);
    expect(result.status).toBe('error');
    if (result.status !== 'error') return;
    expect(result.errorMessage).toContain('portal AEAT');
  });

  it('siempre llama close() al final, incluso tras excepción', async () => {
    const adapter = new MockBrowserAdapter({ failLogin: true });
    await submitModelo303(SAMPLE_INPUT, adapter);
    expect(adapter.closeCalls).toBe(1);
  });

  it('aeatResponseSnippet trunca a 2000 chars el HTML', async () => {
    const longHtml = '<html>CSV: ABCDEFGH12345678JKLM ' + 'x'.repeat(5000) + '</html>';
    const adapter = new MockBrowserAdapter({
      uploadStatus: 'ok',
      uploadHtml: longHtml,
    });
    const result = await submitModelo303(SAMPLE_INPUT, adapter);
    if (result.status !== 'accepted') throw new Error('should accept');
    expect(result.aeatResponseSnippet.length).toBe(2000);
  });
});
