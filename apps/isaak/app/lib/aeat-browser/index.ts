// AEAT Browser — automatización de presentación vía portal AEAT.
//
// Estrategia: usar un navegador (headless) que se loguea con el cert
// del tenant, navega a "Presentación por fichero" del modelo X, sube
// el fichero BOE generado por nuestro serializer, y captura el
// justificante (CSV) que AEAT devuelve.
//
// ESTADO: foundation v1.
//   * Arquitectura completa: BrowserAdapter (interface) + orchestrator
//   * MockBrowserAdapter para tests
//   * PlaywrightBrowserAdapter declarado pero requiere instalar
//     playwright y desarrollar los selectores específicos del portal
//     AEAT (necesita acceso a pre-producción)
//
// LIMITACIONES:
//   * Playwright (~300MB con binarios) no cabe en Vercel serverless.
//     El AeatBrowserWorker debe correr en un host con disco persistente
//     (Cloud Run, Fly.io, EC2, GitHub Actions, máquina local del usuario).
//   * AEAT puede cambiar el HTML del portal en cualquier momento. Los
//     selectores son frágiles por naturaleza. Hay que mantenerlos.
//   * Status legal/TOS: la automatización con cert del propio
//     contribuyente es legítima (no estamos suplantando a nadie). Pero
//     conviene leer los términos AEAT antes de scalar.

// ─── Estado de envío ───────────────────────────────────────────────────

export type SubmissionAttemptStatus =
  | 'queued' // listo para enviar, esperando worker
  | 'submitting' // worker procesando ahora
  | 'submitted' // upload OK, esperando ACK AEAT
  | 'accepted' // AEAT devolvió CSV justificante
  | 'rejected' // AEAT rechazó (errorMessage tiene el motivo)
  | 'error'; // fallo de transporte/auth antes de llegar a AEAT

// ─── Entrada del orchestrator ─────────────────────────────────────────

export type Modelo303SubmissionInput = {
  // Path absoluto al fichero .303 (BOE TXT) generado previamente
  ficheroPath: string;
  // NIF del declarante (para validar que coincide con el cert)
  declaranteNif: string;
  // Cert PEM + key PEM (decodificados desde el TenantCertificate)
  cert: {
    certPem: string;
    keyPem: string;
  };
  // Entorno AEAT: 'pre' (sandbox) o 'prod'
  environment: 'pre' | 'prod';
};

// ─── Resultado del orchestrator ────────────────────────────────────────

export type Modelo303SubmissionResult =
  | {
      status: 'accepted';
      csvJustificante: string;
      submittedAt: Date;
      aeatResponseSnippet: string;
    }
  | {
      status: 'rejected';
      errorCode?: string;
      errorMessage: string;
      submittedAt: Date;
      aeatResponseSnippet: string;
    }
  | {
      status: 'error';
      errorMessage: string;
      attemptedAt: Date;
    };

// ─── BrowserAdapter interface ──────────────────────────────────────────
//
// Cualquier implementación (Playwright, Puppeteer, mock) cumple este
// contrato. Permite testear la orquestación sin browser real.

export interface BrowserAdapter {
  // Inicializa el browser con el cert del tenant. Throws si el cert
  // es inválido o no puede establecerse mTLS.
  init(cert: { certPem: string; keyPem: string }, environment: 'pre' | 'prod'): Promise<void>;

  // Navega al portal AEAT y se autentica con el cert. Throws si auth
  // falla (cert revocado, expirado, no autorizado).
  login(): Promise<void>;

  // Navega a "Presentación por fichero" del modelo indicado.
  navigateToModeloUpload(modelo: '303' | '130' | '111' | '115' | '349' | '347' | '180' | '190'): Promise<void>;

  // Sube el fichero BOE. Retorna la respuesta cruda de AEAT (HTML del
  // resultado). El orchestrator parsea para extraer CSV/error.
  uploadFichero(ficheroPath: string): Promise<{ html: string; status: 'ok' | 'error' }>;

  // Cierra browser, libera recursos.
  close(): Promise<void>;
}

// ─── Orchestrator principal ────────────────────────────────────────────

export async function submitModelo303(
  input: Modelo303SubmissionInput,
  adapter: BrowserAdapter,
): Promise<Modelo303SubmissionResult> {
  const attemptedAt = new Date();
  try {
    await adapter.init(input.cert, input.environment);
    await adapter.login();
    await adapter.navigateToModeloUpload('303');
    const { html, status } = await adapter.uploadFichero(input.ficheroPath);

    if (status === 'error') {
      const parsed = parseAeatErrorResponse(html);
      return {
        status: 'rejected',
        errorCode: parsed.code,
        errorMessage: parsed.message,
        submittedAt: new Date(),
        aeatResponseSnippet: html.slice(0, 2000),
      };
    }

    const csv = extractCsvJustificante(html);
    if (csv) {
      return {
        status: 'accepted',
        csvJustificante: csv,
        submittedAt: new Date(),
        aeatResponseSnippet: html.slice(0, 2000),
      };
    }

    return {
      status: 'rejected',
      errorMessage: 'AEAT respondió sin CSV justificante ni mensaje de error reconocido.',
      submittedAt: new Date(),
      aeatResponseSnippet: html.slice(0, 2000),
    };
  } catch (err) {
    return {
      status: 'error',
      errorMessage: err instanceof Error ? err.message : String(err),
      attemptedAt,
    };
  } finally {
    try {
      await adapter.close();
    } catch {
      // ignore close errors
    }
  }
}

// ─── Parsers (puros, testables sin browser) ────────────────────────────

const CSV_REGEX = /\b([A-Z0-9]{16,20})\b/;

export function extractCsvJustificante(html: string): string | null {
  // AEAT devuelve el CSV justificante como un código alfanumérico 16-20
  // caracteres en mayúsculas. Suele aparecer marcado como "CSV: XXXXX"
  // o dentro de un elemento <span class="csv">XXXXX</span>.
  const labeled = /CSV[:\s]*([A-Z0-9]{16,20})/i.exec(html);
  if (labeled?.[1]) return labeled[1];
  const inSpan = /<span[^>]*csv[^>]*>([A-Z0-9]{16,20})<\/span>/i.exec(html);
  if (inSpan?.[1]) return inSpan[1];
  // Fallback: buscar cualquier código aislado que parezca CSV
  const fallback = CSV_REGEX.exec(html);
  if (fallback?.[1] && /^[A-Z0-9]+$/.test(fallback[1])) return fallback[1];
  return null;
}

export function parseAeatErrorResponse(html: string): {
  code?: string;
  message: string;
} {
  // AEAT muestra los errores como "ERROR XXX: descripción"
  const labeled = /Error\s+(\d+)[:\s]*([^<\n]{5,300})/i.exec(html);
  if (labeled) {
    return { code: labeled[1], message: labeled[2]!.trim() };
  }
  // Fallback: extraer cualquier texto dentro de un .error o .alert
  const inDiv = /<div[^>]*(?:error|alert)[^>]*>([\s\S]{5,500}?)<\/div>/i.exec(html);
  if (inDiv?.[1]) {
    const stripped = inDiv[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    return { message: stripped.slice(0, 300) };
  }
  return { message: 'AEAT respondió con un error no parseable.' };
}
