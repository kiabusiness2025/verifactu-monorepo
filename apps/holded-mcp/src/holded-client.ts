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
    return this.request<unknown[]>(`/api/invoicing/v1/documents/${docType}${qs}`);
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
    return this.request<unknown[]>('/api/invoicing/v1/numberingseries');
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
    return this.request<unknown[]>(`/api/accounting/v1/dailyledger${qs}`);
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
