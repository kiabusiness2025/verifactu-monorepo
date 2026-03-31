import { encryptIntegrationSecret } from '@/lib/integrations/secretCrypto';

const HOLDED_API_BASE_URL = process.env.HOLDED_API_BASE_URL?.trim() || 'https://api.holded.com';
const HOLDED_TIMEOUT_MS = Number(process.env.HOLDED_TIMEOUT_MS || '10000');

export { encryptIntegrationSecret };

export function maskSecret(value: string) {
  const normalized = value.trim();
  if (normalized.length <= 8) {
    return '*'.repeat(Math.max(normalized.length, 4));
  }

  return `${normalized.slice(0, 4)}${'*'.repeat(Math.max(normalized.length - 8, 4))}${normalized.slice(-4)}`;
}

export type HoldedProbeResult = {
  ok: boolean;
  provider: 'holded';
  invoiceApi: {
    ok: boolean;
    status: number | null;
  };
  accountingApi: {
    ok: boolean;
    status: number | null;
  };
  crmApi: {
    ok: boolean;
    status: number | null;
  };
  projectsApi: {
    ok: boolean;
    status: number | null;
  };
  teamApi: {
    ok: boolean;
    status: number | null;
  };
  error?: string | null;
};

type HoldedRequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  apiKey: string;
  query?: Record<string, string | number | boolean | null | undefined>;
  body?: unknown;
  timeoutMs?: number;
};

type HoldedApiErrorPayload = {
  error?: string;
  message?: string;
};

function buildHoldedUrl(
  path: string,
  query?: Record<string, string | number | boolean | null | undefined>
) {
  const url = new URL(path.startsWith('http') ? path : `${HOLDED_API_BASE_URL}${path}`);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === null || value === undefined || value === '') continue;
      url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

async function holdedRequest<T>(options: HoldedRequestOptions): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? HOLDED_TIMEOUT_MS);

  try {
    const response = await fetch(buildHoldedUrl(options.path, options.query), {
      method: options.method ?? 'GET',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        key: options.apiKey,
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
      cache: 'no-store',
    });

    const rawText = await response.text();
    const parsed = rawText ? safeJsonParse(rawText) : null;

    if (!response.ok) {
      const payload =
        parsed && typeof parsed === 'object' ? (parsed as HoldedApiErrorPayload) : null;
      const message =
        payload?.error ||
        payload?.message ||
        `Holded API request failed with status ${response.status}`;
      throw new Error(message);
    }

    return (parsed as T) ?? (null as T);
  } finally {
    clearTimeout(timeout);
  }
}

function safeJsonParse(raw: string) {
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return raw;
  }
}

async function probeEndpoint(apiKey: string, path: string, query?: HoldedRequestOptions['query']) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), HOLDED_TIMEOUT_MS);

  try {
    const response = await fetch(buildHoldedUrl(path, query), {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        key: apiKey,
      },
      signal: controller.signal,
      cache: 'no-store',
    });

    return {
      ok: response.ok,
      status: response.status,
    };
  } catch {
    return {
      ok: false,
      status: null,
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function probeAccountingApiConnection(apiKey: string): Promise<HoldedProbeResult> {
  const normalizedApiKey = apiKey.trim();

  const [invoiceApi, accountingApi, crmApi, projectsApi, teamApi] = await Promise.all([
    probeEndpoint(normalizedApiKey, '/api/invoicing/v1/documents', { limit: 1, page: 1 }),
    probeEndpoint(normalizedApiKey, '/api/accounting/v1/accounts', { limit: 1, page: 1 }),
    probeEndpoint(normalizedApiKey, '/api/crm/v1/bookings', { limit: 1, page: 1 }),
    probeEndpoint(normalizedApiKey, '/api/projects/v1/projects', { limit: 1, page: 1 }),
    probeEndpoint(normalizedApiKey, '/api/team/v1/employees', { limit: 1, page: 1 }),
  ]);

  const ok = invoiceApi.ok || accountingApi.ok || crmApi.ok || projectsApi.ok || teamApi.ok;
  const error = ok
    ? null
    : 'No se pudo validar acceso a ninguna API principal de Holded con la API key proporcionada';

  return {
    ok,
    provider: 'holded',
    invoiceApi,
    accountingApi,
    crmApi,
    projectsApi,
    teamApi,
    error,
  };
}

export type HoldedInvoiceDocument = {
  id?: string;
  docNumber?: string;
  contactId?: string;
  total?: number;
  date?: string;
  status?: string;
};

export type HoldedContact = {
  id?: string;
  name?: string;
  code?: string;
  email?: string;
  mobile?: string;
  phone?: string;
};

export type HoldedAccount = {
  id?: string;
  name?: string;
  code?: string;
  balance?: number;
};

export type HoldedContactGroup = {
  id?: string;
  name?: string;
  description?: string;
};

export type HoldedBooking = {
  id?: string;
  title?: string;
  description?: string;
  date?: string;
  contactId?: string;
  ownerId?: string;
  status?: string;
};

export type HoldedProject = {
  id?: string;
  name?: string;
  code?: string;
  description?: string;
  status?: string;
  customerId?: string;
};

export type HoldedProjectTask = {
  id?: string;
  name?: string;
  description?: string;
  status?: string;
  projectId?: string;
  assigneeId?: string;
};

export type HoldedEmployee = {
  id?: string;
  name?: string;
  firstname?: string;
  lastname?: string;
  email?: string;
  status?: string;
};

export type HoldedTimeEntry = {
  id?: string;
  employeeId?: string;
  projectId?: string;
  taskId?: string;
  date?: string;
  hours?: number;
  description?: string;
};

type HoldedPaginationArgs = {
  page?: number;
  limit?: number;
};

type HoldedEntityPayload = Record<string, unknown>;

function buildPagingQuery(args?: HoldedPaginationArgs) {
  return {
    page: args?.page ?? 1,
    limit: args?.limit ?? 25,
  };
}

function invoicingPath(resource: string, id?: string) {
  return id ? `/api/invoicing/v1/${resource}/${id}` : `/api/invoicing/v1/${resource}`;
}

async function listInvoicingResource<T>(
  apiKey: string,
  resource: string,
  args?: HoldedPaginationArgs
) {
  return holdedRequest<T[]>({
    apiKey,
    path: invoicingPath(resource),
    query: buildPagingQuery(args),
  });
}

async function listSimpleInvoicingResource<T>(apiKey: string, resource: string) {
  return holdedRequest<T[]>({
    apiKey,
    path: invoicingPath(resource),
  });
}

async function getInvoicingResource<T>(apiKey: string, resource: string, id: string) {
  return holdedRequest<T>({
    apiKey,
    path: invoicingPath(resource, id),
  });
}

async function createInvoicingResource(
  apiKey: string,
  resource: string,
  payload: HoldedEntityPayload
) {
  return holdedRequest<Record<string, unknown>>({
    apiKey,
    method: 'POST',
    path: invoicingPath(resource),
    body: payload,
  });
}

async function updateInvoicingResource(
  apiKey: string,
  resource: string,
  id: string,
  payload: HoldedEntityPayload
) {
  return holdedRequest<Record<string, unknown>>({
    apiKey,
    method: 'PUT',
    path: invoicingPath(resource, id),
    body: payload,
  });
}

async function deleteInvoicingResource(apiKey: string, resource: string, id: string) {
  return holdedRequest<Record<string, unknown>>({
    apiKey,
    method: 'DELETE',
    path: invoicingPath(resource, id),
  });
}

async function listTypedDocuments(
  apiKey: string,
  docType: string,
  args?: { page?: number; limit?: number; status?: string }
) {
  return holdedRequest<Record<string, unknown>[]>({
    apiKey,
    path: `/api/invoicing/v1/documents/${docType}`,
    query: {
      page: args?.page ?? 1,
      limit: args?.limit ?? 25,
      status: args?.status,
    },
  });
}

function attachDocType(items: Record<string, unknown>[], docType: string) {
  return items.map((item) => ({ ...item, docType }));
}

export const holdedAdapter = {
  async listInvoices(apiKey: string, args?: { page?: number; limit?: number; status?: string }) {
    return listTypedDocuments(apiKey, 'invoice', args);
  },

  async getInvoice(apiKey: string, invoiceId: string) {
    return holdedRequest<HoldedInvoiceDocument>({
      apiKey,
      path: `/api/invoicing/v1/documents/invoice/${invoiceId}`,
    });
  },

  async listDocuments(
    apiKey: string,
    args?: { page?: number; limit?: number; status?: string; docType?: string }
  ) {
    if (args?.docType) {
      return listTypedDocuments(apiKey, args.docType, args);
    }

    const [invoices, estimates] = await Promise.all([
      listTypedDocuments(apiKey, 'invoice', args),
      listTypedDocuments(apiKey, 'estimate', args),
    ]);

    return [...attachDocType(invoices, 'invoice'), ...attachDocType(estimates, 'estimate')];
  },

  async getDocument(apiKey: string, docType: string, documentId: string) {
    return holdedRequest<Record<string, unknown>>({
      apiKey,
      path: `/api/invoicing/v1/documents/${docType}/${documentId}`,
    });
  },

  async listContacts(apiKey: string, args?: { page?: number; limit?: number }) {
    return holdedRequest<HoldedContact[]>({
      apiKey,
      path: '/api/invoicing/v1/contacts',
      query: {
        page: args?.page ?? 1,
        limit: args?.limit ?? 25,
      },
    });
  },

  async getContact(apiKey: string, contactId: string) {
    return holdedRequest<HoldedContact>({
      apiKey,
      path: `/api/invoicing/v1/contacts/${contactId}`,
    });
  },

  async createDocument(apiKey: string, docType: string, payload: Record<string, unknown>) {
    return holdedRequest<Record<string, unknown>>({
      apiKey,
      method: 'POST',
      path: `/api/invoicing/v1/documents/${docType}`,
      body: payload,
    });
  },

  async updateDocument(
    apiKey: string,
    docType: string,
    documentId: string,
    payload: Record<string, unknown>
  ) {
    return holdedRequest<Record<string, unknown>>({
      apiKey,
      method: 'PUT',
      path: `/api/invoicing/v1/documents/${docType}/${documentId}`,
      body: payload,
    });
  },

  async deleteDocument(apiKey: string, docType: string, documentId: string) {
    return holdedRequest<Record<string, unknown>>({
      apiKey,
      method: 'DELETE',
      path: `/api/invoicing/v1/documents/${docType}/${documentId}`,
    });
  },

  async listAccounts(apiKey: string, args?: { page?: number; limit?: number }) {
    return holdedRequest<HoldedAccount[]>({
      apiKey,
      path: '/api/accounting/v1/accounts',
      query: {
        page: args?.page ?? 1,
        limit: args?.limit ?? 25,
      },
    });
  },

  async listContactGroups(apiKey: string, args?: { page?: number; limit?: number }) {
    return listInvoicingResource<HoldedContactGroup>(apiKey, 'contacts/groups', args);
  },

  async createContact(apiKey: string, payload: HoldedEntityPayload) {
    return createInvoicingResource(apiKey, 'contacts', payload);
  },

  async updateContact(apiKey: string, contactId: string, payload: HoldedEntityPayload) {
    return updateInvoicingResource(apiKey, 'contacts', contactId, payload);
  },

  async deleteContact(apiKey: string, contactId: string) {
    return deleteInvoicingResource(apiKey, 'contacts', contactId);
  },

  async listTreasuryAccounts(apiKey: string) {
    return listSimpleInvoicingResource<Record<string, unknown>>(apiKey, 'treasury');
  },

  async getTreasuryAccount(apiKey: string, treasuryId: string) {
    return getInvoicingResource<Record<string, unknown>>(apiKey, 'treasury', treasuryId);
  },

  async createTreasuryAccount(apiKey: string, payload: HoldedEntityPayload) {
    return createInvoicingResource(apiKey, 'treasury', payload);
  },

  async updateTreasuryAccount(apiKey: string, treasuryId: string, payload: HoldedEntityPayload) {
    return updateInvoicingResource(apiKey, 'treasury', treasuryId, payload);
  },

  async listExpenseAccounts(apiKey: string, args?: HoldedPaginationArgs) {
    return listInvoicingResource<Record<string, unknown>>(apiKey, 'expensesaccounts', args);
  },

  async getExpenseAccount(apiKey: string, expenseAccountId: string) {
    return getInvoicingResource<Record<string, unknown>>(
      apiKey,
      'expensesaccounts',
      expenseAccountId
    );
  },

  async createExpenseAccount(apiKey: string, payload: HoldedEntityPayload) {
    return createInvoicingResource(apiKey, 'expensesaccounts', payload);
  },

  async updateExpenseAccount(
    apiKey: string,
    expenseAccountId: string,
    payload: HoldedEntityPayload
  ) {
    return updateInvoicingResource(apiKey, 'expensesaccounts', expenseAccountId, payload);
  },

  async deleteExpenseAccount(apiKey: string, expenseAccountId: string) {
    return deleteInvoicingResource(apiKey, 'expensesaccounts', expenseAccountId);
  },

  async listNumberingSeries(apiKey: string, seriesType: string) {
    return holdedRequest<Record<string, unknown>[]>({
      apiKey,
      path: `/api/invoicing/v1/numberingseries/${seriesType}`,
    });
  },

  async createNumberingSeries(apiKey: string, seriesType: string, payload: HoldedEntityPayload) {
    return holdedRequest<Record<string, unknown>>({
      apiKey,
      method: 'POST',
      path: `/api/invoicing/v1/numberingseries/${seriesType}`,
      body: payload,
    });
  },

  async updateNumberingSeries(
    apiKey: string,
    seriesType: string,
    seriesId: string,
    payload: HoldedEntityPayload
  ) {
    return holdedRequest<Record<string, unknown>>({
      apiKey,
      method: 'PUT',
      path: `/api/invoicing/v1/numberingseries/${seriesType}/${seriesId}`,
      body: payload,
    });
  },

  async deleteNumberingSeries(apiKey: string, seriesType: string, seriesId: string) {
    return holdedRequest<Record<string, unknown>>({
      apiKey,
      method: 'DELETE',
      path: `/api/invoicing/v1/numberingseries/${seriesType}/${seriesId}`,
    });
  },

  async listProducts(apiKey: string, args?: HoldedPaginationArgs) {
    return listInvoicingResource<Record<string, unknown>>(apiKey, 'products', args);
  },

  async getProduct(apiKey: string, productId: string) {
    return getInvoicingResource<Record<string, unknown>>(apiKey, 'products', productId);
  },

  async createProduct(apiKey: string, payload: HoldedEntityPayload) {
    return createInvoicingResource(apiKey, 'products', payload);
  },

  async updateProduct(apiKey: string, productId: string, payload: HoldedEntityPayload) {
    return updateInvoicingResource(apiKey, 'products', productId, payload);
  },

  async deleteProduct(apiKey: string, productId: string) {
    return deleteInvoicingResource(apiKey, 'products', productId);
  },

  async listSalesChannels(apiKey: string, args?: HoldedPaginationArgs) {
    return listInvoicingResource<Record<string, unknown>>(apiKey, 'saleschannels', args);
  },

  async getSalesChannel(apiKey: string, salesChannelId: string) {
    return getInvoicingResource<Record<string, unknown>>(apiKey, 'saleschannels', salesChannelId);
  },

  async createSalesChannel(apiKey: string, payload: HoldedEntityPayload) {
    return createInvoicingResource(apiKey, 'saleschannels', payload);
  },

  async updateSalesChannel(apiKey: string, salesChannelId: string, payload: HoldedEntityPayload) {
    return updateInvoicingResource(apiKey, 'saleschannels', salesChannelId, payload);
  },

  async deleteSalesChannel(apiKey: string, salesChannelId: string) {
    return deleteInvoicingResource(apiKey, 'saleschannels', salesChannelId);
  },

  async listWarehouses(apiKey: string, args?: HoldedPaginationArgs) {
    return listInvoicingResource<Record<string, unknown>>(apiKey, 'warehouses', args);
  },

  async getWarehouse(apiKey: string, warehouseId: string) {
    return getInvoicingResource<Record<string, unknown>>(apiKey, 'warehouses', warehouseId);
  },

  async createWarehouse(apiKey: string, payload: HoldedEntityPayload) {
    return createInvoicingResource(apiKey, 'warehouses', payload);
  },

  async updateWarehouse(apiKey: string, warehouseId: string, payload: HoldedEntityPayload) {
    return updateInvoicingResource(apiKey, 'warehouses', warehouseId, payload);
  },

  async deleteWarehouse(apiKey: string, warehouseId: string) {
    return deleteInvoicingResource(apiKey, 'warehouses', warehouseId);
  },

  async listPayments(apiKey: string, args?: HoldedPaginationArgs) {
    return listInvoicingResource<Record<string, unknown>>(apiKey, 'payments', args);
  },

  async getPayment(apiKey: string, paymentId: string) {
    return getInvoicingResource<Record<string, unknown>>(apiKey, 'payments', paymentId);
  },

  async createPayment(apiKey: string, payload: HoldedEntityPayload) {
    return createInvoicingResource(apiKey, 'payments', payload);
  },

  async updatePayment(apiKey: string, paymentId: string, payload: HoldedEntityPayload) {
    return updateInvoicingResource(apiKey, 'payments', paymentId, payload);
  },

  async deletePayment(apiKey: string, paymentId: string) {
    return deleteInvoicingResource(apiKey, 'payments', paymentId);
  },

  async listTaxes(apiKey: string) {
    return listSimpleInvoicingResource<Record<string, unknown>>(apiKey, 'taxes');
  },

  async listPaymentMethods(apiKey: string) {
    return listSimpleInvoicingResource<Record<string, unknown>>(apiKey, 'paymentmethods');
  },

  async getContactGroup(apiKey: string, contactGroupId: string) {
    return getInvoicingResource<Record<string, unknown>>(apiKey, 'contacts/groups', contactGroupId);
  },

  async createContactGroup(apiKey: string, payload: HoldedEntityPayload) {
    return createInvoicingResource(apiKey, 'contacts/groups', payload);
  },

  async updateContactGroup(apiKey: string, contactGroupId: string, payload: HoldedEntityPayload) {
    return updateInvoicingResource(apiKey, 'contacts/groups', contactGroupId, payload);
  },

  async deleteContactGroup(apiKey: string, contactGroupId: string) {
    return deleteInvoicingResource(apiKey, 'contacts/groups', contactGroupId);
  },

  async listRemittances(apiKey: string) {
    return listSimpleInvoicingResource<Record<string, unknown>>(apiKey, 'remittances');
  },

  async getRemittance(apiKey: string, remittanceId: string) {
    return getInvoicingResource<Record<string, unknown>>(apiKey, 'remittances', remittanceId);
  },

  async listServices(apiKey: string, args?: HoldedPaginationArgs) {
    return listInvoicingResource<Record<string, unknown>>(apiKey, 'services', args);
  },

  async getService(apiKey: string, serviceId: string) {
    return getInvoicingResource<Record<string, unknown>>(apiKey, 'services', serviceId);
  },

  async createService(apiKey: string, payload: HoldedEntityPayload) {
    return createInvoicingResource(apiKey, 'services', payload);
  },

  async updateService(apiKey: string, serviceId: string, payload: HoldedEntityPayload) {
    return updateInvoicingResource(apiKey, 'services', serviceId, payload);
  },

  async deleteService(apiKey: string, serviceId: string) {
    return deleteInvoicingResource(apiKey, 'services', serviceId);
  },

  async listBookings(apiKey: string, args?: { page?: number; limit?: number }) {
    return holdedRequest<HoldedBooking[]>({
      apiKey,
      path: '/api/crm/v1/bookings',
      query: {
        page: args?.page ?? 1,
        limit: args?.limit ?? 25,
      },
    });
  },

  async listProjects(apiKey: string, args?: { page?: number; limit?: number }) {
    return holdedRequest<HoldedProject[]>({
      apiKey,
      path: '/api/projects/v1/projects',
      query: {
        page: args?.page ?? 1,
        limit: args?.limit ?? 25,
      },
    });
  },

  async getProject(apiKey: string, projectId: string) {
    return holdedRequest<HoldedProject>({
      apiKey,
      path: '/api/projects/v1/projects/' + projectId,
    });
  },

  async listProjectTasks(
    apiKey: string,
    projectId: string,
    args?: { page?: number; limit?: number }
  ) {
    return holdedRequest<HoldedProjectTask[]>({
      apiKey,
      path: '/api/projects/v1/projects/' + projectId + '/tasks',
      query: {
        page: args?.page ?? 1,
        limit: args?.limit ?? 25,
      },
    });
  },

  async listEmployees(apiKey: string, args?: { page?: number; limit?: number }) {
    return holdedRequest<HoldedEmployee[]>({
      apiKey,
      path: '/api/team/v1/employees',
      query: {
        page: args?.page ?? 1,
        limit: args?.limit ?? 25,
      },
    });
  },

  async listTimeEntries(
    apiKey: string,
    args?: { page?: number; limit?: number; employeeId?: string }
  ) {
    return holdedRequest<HoldedTimeEntry[]>({
      apiKey,
      path: '/api/team/v1/times',
      query: {
        page: args?.page ?? 1,
        limit: args?.limit ?? 25,
        employeeId: args?.employeeId,
      },
    });
  },
};
