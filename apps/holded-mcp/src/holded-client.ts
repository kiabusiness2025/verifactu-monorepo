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

export class HoldedClient {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.baseUrl = config.HOLDED_API_BASE;
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    logger.debug(`Holded API → ${options.method ?? 'GET'} ${path}`);

    const res = await fetch(url, {
      ...options,
      headers: {
        key: this.apiKey,
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...options.headers,
      },
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new HoldedApiError(
        `Holded API ${res.status}: ${res.statusText}${body ? ` — ${body}` : ''}`,
        res.status,
        path
      );
    }

    return res.json() as Promise<T>;
  }

  // ── Facturación / Documentos ─────────────────────────────────────────────

  async listDocuments(docType: string, params?: Record<string, string>) {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.request<unknown[]>(`/api/invoicing/v1/documents/${docType}${qs}`);
  }

  async getDocument(docType: string, documentId: string) {
    return this.request<unknown>(`/api/invoicing/v1/documents/${docType}/${documentId}`);
  }

  async createDocument(docType: string, body: unknown) {
    return this.request<unknown>(`/api/invoicing/v1/documents/${docType}`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async sendDocument(docType: string, documentId: string, body: unknown) {
    return this.request<unknown>(`/api/invoicing/v1/documents/${docType}/${documentId}/send`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  // ── Contactos / CRM ──────────────────────────────────────────────────────

  async listContacts(params?: Record<string, string>) {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.request<unknown[]>(`/api/invoicing/v1/contacts${qs}`);
  }

  async getContact(contactId: string) {
    return this.request<unknown>(`/api/invoicing/v1/contacts/${contactId}`);
  }

  async createContact(body: unknown) {
    return this.request<unknown>('/api/invoicing/v1/contacts', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async listContactFunnels() {
    return this.request<unknown[]>('/api/crm/v1/funnels');
  }

  async listLeads(funnelId?: string) {
    const path = funnelId ? `/api/crm/v1/funnels/${funnelId}/deals` : '/api/crm/v1/deals';
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

  async listWarehouses() {
    return this.request<unknown[]>('/api/invoicing/v1/warehouses');
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
    return this.request<unknown[]>(`/api/projects/v1/projects/${projectId}/timerecords`);
  }

  // ── Contabilidad ─────────────────────────────────────────────────────────

  async getChartOfAccounts() {
    return this.request<unknown[]>('/api/accounting/v1/chartofaccounts?includeEmpty=1');
  }

  async getJournal(params?: Record<string, string>) {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.request<unknown[]>(`/api/accounting/v1/journal${qs}`);
  }

  async getDailyBook(params?: Record<string, string>) {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.request<unknown[]>(`/api/accounting/v1/dailybook${qs}`);
  }

  // ── Compras / Gastos ─────────────────────────────────────────────────────

  async listPurchases(params?: Record<string, string>) {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.request<unknown[]>(`/api/invoicing/v1/documents/purchase${qs}`);
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

  // ── Utilidad: validar API key ─────────────────────────────────────────────

  async validateApiKey(): Promise<boolean> {
    try {
      await this.listContacts({ page: '1' });
      return true;
    } catch {
      return false;
    }
  }
}
