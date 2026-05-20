import { config } from './config.js';
import { logger } from './logger.js';

export class HoldedApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public endpoint: string
  ) {
    super(message);
    this.name = 'HoldedApiError';
  }
}

/**
 * Tipos de documento aceptados por la API de Holded.
 * Fuente: https://developers.holded.com/reference/documents
 *
 * Esta lista es la única referencia válida; los nombres usados en el resto
 * del servidor (tools/invoicing.ts) deben coincidir 1:1 con esta lista.
 */
export const HOLDED_DOC_TYPES = [
  'invoice',
  'salesreceipt',
  'creditnote',
  'salesorder',
  'proform',
  'waybill',
  'estimate',
  'purchase',
  'purchaseorder',
  'purchaserefund',
] as const;

export type HoldedDocType = (typeof HOLDED_DOC_TYPES)[number];

const RETRYABLE_STATUS = new Set([429, 502, 503, 504]);
const MAX_RETRIES = 2;

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

function backoffDelayMs(attempt: number) {
  // Exponencial 200ms · 2^n con jitter ±50%.
  const base = 200 * 2 ** attempt;
  const jitter = base * (Math.random() - 0.5);
  return Math.max(50, Math.floor(base + jitter));
}

export class HoldedClient {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.baseUrl = config.HOLDED_API_BASE;
  }

  private async request<T>(
    path: string,
    options: RequestInit = {},
    opts: { expectBinary?: boolean } = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const method = options.method ?? 'GET';

    let lastError: unknown;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      logger.debug(`Holded API → ${method} ${path} (attempt ${attempt + 1})`);

      try {
        const res = await fetch(url, {
          ...options,
          headers: {
            key: this.apiKey,
            'Content-Type': 'application/json',
            Accept: opts.expectBinary ? 'application/pdf, application/json' : 'application/json',
            // Bug 2026-05-18 (soporte audit): Node.js fetch (undici) envía por
            // defecto `Accept-Encoding: br, gzip, deflate`. Algunos uplinks de
            // Holded (especialmente para respuestas grandes como /documents y
            // /dailyledger) devuelven brotli, y la decompresión transparente de
            // undici a veces falla en silencio detrás de Vercel
            // edge proxies — el cliente recibe bytes truncados o un JSON
            // vacío en vez de la lista real. El cliente del proxy ChatGPT
            // (`apps/holded/app/lib/holded-api-client.ts`) ya forzaba identity
            // por este motivo; lo replicamos aquí. Ver memoria `feedback_proxy_brotli`.
            'Accept-Encoding': 'identity',
            ...options.headers,
          },
        });

        if (!res.ok) {
          if (RETRYABLE_STATUS.has(res.status) && attempt < MAX_RETRIES) {
            await sleep(backoffDelayMs(attempt));
            continue;
          }
          const body = await res.text().catch(() => '');
          throw new HoldedApiError(
            `Holded API ${res.status}: ${res.statusText}${body ? ` — ${body}` : ''}`,
            res.status,
            path
          );
        }

        if (opts.expectBinary) {
          const ab = await res.arrayBuffer();
          return Buffer.from(ab) as unknown as T;
        }

        const data = (await res.json().catch(() => null)) as unknown;

        // Error blando: Holded devuelve a veces 200 OK con {status:0, info:"..."}
        // en operaciones de escritura fallidas. Tratarlo como error duro.
        if (
          data &&
          typeof data === 'object' &&
          !Array.isArray(data) &&
          'status' in data &&
          (data as { status?: unknown }).status === 0
        ) {
          const info =
            (data as { info?: string; errors?: unknown }).info ??
            (data as { errors?: unknown }).errors ??
            'unknown soft error';
          throw new HoldedApiError(
            `Holded soft error on ${method} ${path}: ${typeof info === 'string' ? info : JSON.stringify(info)}`,
            200,
            path
          );
        }

        return data as T;
      } catch (err) {
        lastError = err;
        if (err instanceof HoldedApiError) {
          // Errores duros y blandos: no reintentar.
          throw err;
        }
        // Errores de red genuinos (DNS, ECONNRESET, etc.): reintentar.
        if (attempt < MAX_RETRIES) {
          await sleep(backoffDelayMs(attempt));
          continue;
        }
        throw err;
      }
    }

    // Inalcanzable, pero TypeScript pide cobertura explícita.
    throw lastError instanceof Error ? lastError : new Error(`Holded API request failed: ${path}`);
  }

  // ── Facturación / Documentos ─────────────────────────────────────────────

  async listDocuments(docType: HoldedDocType, params?: Record<string, string>) {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    const data = await this.request<unknown>(`/api/invoicing/v1/documents/${docType}${qs}`);
    // Defensivo: si Holded devuelve algo distinto de un array (p.ej. objeto
    // de error blando, null por brotli mal decodificado, o envuelto en
    // `{ data: [...] }`), lo logueamos con contexto. El handler de la tool
    // ya hace Array.isArray ? raw : [] así que el modelo no rompe, pero sin
    // este log el síntoma "0 documentos" era invisible. Ver soporte audit
    // 2026-05-18.
    if (!Array.isArray(data)) {
      logger.warn(
        `Holded /documents/${docType} returned a non-array response — treating as empty. ` +
          `Type: ${typeof data}, keys: ${
            data && typeof data === 'object' ? Object.keys(data).slice(0, 8).join(',') : 'n/a'
          }, qs: ${qs}`
      );
    }
    return data as unknown[];
  }

  async getDocument(docType: HoldedDocType, documentId: string) {
    return this.request<unknown>(`/api/invoicing/v1/documents/${docType}/${documentId}`);
  }

  /**
   * Crea un documento. Para invoices, salesreceipts, creditnotes, etc., el
   * caller del MCP DEBE pasar approveDoc: false si quiere mantener el
   * documento en estado borrador. La tool create_invoice_draft del MCP
   * fuerza ese flag explícitamente — ver tools/invoicing.ts.
   */
  async createDocument(docType: HoldedDocType, body: Record<string, unknown>) {
    return this.request<unknown>(`/api/invoicing/v1/documents/${docType}`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async getDocumentPdf(docType: HoldedDocType, documentId: string): Promise<Buffer> {
    return this.request<Buffer>(
      `/api/invoicing/v1/documents/${docType}/${documentId}/pdf`,
      {},
      { expectBinary: true }
    );
  }

  // ── Contactos / CRM ──────────────────────────────────────────────────────

  async listContacts(params?: Record<string, string>) {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.request<unknown[]>(`/api/invoicing/v1/contacts${qs}`);
  }

  async getContact(contactId: string) {
    return this.request<unknown>(`/api/invoicing/v1/contacts/${contactId}`);
  }

  async listContactFunnels() {
    return this.request<unknown[]>('/api/crm/v1/funnels');
  }

  /**
   * Lista leads del CRM.
   * Holded usa /leads como recurso, no /deals. Si se pasa funnelId, filtra
   * por funnel. Fuente: https://developers.holded.com/reference/leads
   */
  async listLeads(funnelId?: string) {
    const path = funnelId
      ? `/api/crm/v1/leads?funnelId=${encodeURIComponent(funnelId)}`
      : '/api/crm/v1/leads';
    return this.request<unknown[]>(path);
  }

  // ── Productos / Inventario ───────────────────────────────────────────────

  async listProducts(params?: Record<string, string>) {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.request<unknown[]>(`/api/invoicing/v1/products${qs}`);
  }

  async getProduct(productId: string) {
    return this.request<unknown>(`/api/invoicing/v1/products/${productId}`);
  }

  async listProductsStock(params?: Record<string, string>) {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.request<unknown[]>(`/api/invoicing/v1/products/stock${qs}`);
  }

  async listWarehouses() {
    return this.request<unknown[]>('/api/invoicing/v1/warehouses');
  }

  // ── Catálogos auxiliares (taxes, series numéricas) ───────────────────────

  async listTaxes() {
    return this.request<unknown[]>('/api/invoicing/v1/taxes');
  }

  async listNumberingSeries() {
    // Holded's base /numberingseries endpoint returns HTML; type-specific ones return JSON.
    const [invoiceSeries, estimateSeries] = await Promise.all([
      this.request<unknown[]>('/api/invoicing/v1/numberingseries/invoice').catch(() => []),
      this.request<unknown[]>('/api/invoicing/v1/numberingseries/estimate').catch(() => []),
    ]);
    return [
      ...(Array.isArray(invoiceSeries) ? invoiceSeries : []),
      ...(Array.isArray(estimateSeries) ? estimateSeries : []),
    ];
  }

  // ── Proyectos y Tareas ───────────────────────────────────────────────────

  async listProjects() {
    return this.request<unknown[]>('/api/projects/v1/projects');
  }

  async getProject(projectId: string) {
    return this.request<unknown>(`/api/projects/v1/projects/${projectId}`);
  }

  async listTasks(projectId: string) {
    return this.request<unknown[]>(`/api/projects/v1/projects/${projectId}/tasks`);
  }

  async listTimeRecords(projectId: string) {
    return this.request<unknown[]>(`/api/projects/v1/projects/${projectId}/times`);
  }

  // ── Contabilidad ─────────────────────────────────────────────────────────

  async getChartOfAccounts() {
    return this.request<unknown[]>('/api/accounting/v1/chartofaccounts?includeEmpty=1');
  }

  /**
   * El libro diario de Holded vive en /dailyledger. Anteriormente este
   * cliente usaba /journal y /dailybook, que no son endpoints documentados.
   * Fuente: https://developers.holded.com/reference/listdailyledger
   */
  async getDailyLedger(params?: Record<string, string>) {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    const data = await this.request<unknown>(`/api/accounting/v1/dailyledger${qs}`);
    if (!Array.isArray(data)) {
      logger.warn(
        `Holded /dailyledger returned a non-array response — treating as empty. ` +
          `Type: ${typeof data}, keys: ${
            data && typeof data === 'object' ? Object.keys(data).slice(0, 8).join(',') : 'n/a'
          }, qs: ${qs}`
      );
    }
    return data as unknown[];
  }

  // ── Equipo / Empleados ───────────────────────────────────────────────────

  async listEmployees() {
    return this.request<unknown[]>('/api/team/v1/employees');
  }

  async getEmployee(employeeId: string) {
    return this.request<unknown>(`/api/team/v1/employees/${employeeId}`);
  }

  // ── Tesorería ────────────────────────────────────────────────────────────

  async listTreasuryAccounts() {
    return this.request<unknown[]>('/api/invoicing/v1/treasury');
  }

  // ── Utilidad: validar API key ────────────────────────────────────────────

  async validateApiKey(): Promise<boolean> {
    try {
      await this.listContacts({ page: '1' });
      return true;
    } catch {
      return false;
    }
  }
}
