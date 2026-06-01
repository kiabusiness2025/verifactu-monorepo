const HOLDED_BASE = process.env.HOLDED_API_BASE ?? 'https://api.holded.com';
const HOLDED_TIMEOUT_MS = 10_000;

const RETRYABLE = new Set([429, 502, 503, 504]);

function holdedBackoffMs(attempt: number) {
  const base = 300 * 2 ** attempt;
  return Math.max(50, Math.floor(base + base * (Math.random() - 0.5)));
}

async function holdedFetch(apiKey: string, path: string): Promise<unknown> {
  const url = `${HOLDED_BASE}${path}`;
  let lastErr: unknown;
  for (let attempt = 0; attempt <= 2; attempt++) {
    if (attempt > 0) await new Promise<void>((r) => setTimeout(r, holdedBackoffMs(attempt)));
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), HOLDED_TIMEOUT_MS);
    try {
      const res = await fetch(url, {
        headers: {
          key: apiKey,
          Accept: 'application/json',
          // Node.js fetch sends Accept-Encoding: br by default; some Holded proxies
          // return brotli-encoded bodies that undici fails to decompress silently.
          'Accept-Encoding': 'identity',
        },
        signal: controller.signal,
      });
      if (!res.ok) {
        if (RETRYABLE.has(res.status) && attempt < 2) continue;
        const err = new Error(`Holded API ${res.status} at ${path}`);
        lastErr = err;
        throw err;
      }
      const data = await res.json().catch(() => null);
      if (
        data &&
        typeof data === 'object' &&
        !Array.isArray(data) &&
        'status' in data &&
        (data as { status?: unknown }).status === 0
      ) {
        throw new Error(
          `Holded soft error at ${path}: ${JSON.stringify((data as { info?: unknown }).info ?? '')}`
        );
      }
      return data;
    } catch (err) {
      lastErr = err;
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastErr ?? new Error(`Holded API request failed: ${path}`);
}

async function holdedPost(
  apiKey: string,
  path: string,
  body: Record<string, unknown>
): Promise<unknown> {
  const url = `${HOLDED_BASE}${path}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), HOLDED_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        key: apiKey,
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'Accept-Encoding': 'identity',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!res.ok) {
      throw new Error(`Holded API ${res.status} at ${path}`);
    }
    const data = await res.json().catch(() => null);
    if (
      data &&
      typeof data === 'object' &&
      !Array.isArray(data) &&
      'status' in data &&
      (data as { status?: unknown }).status === 0
    ) {
      throw new Error(
        `Holded soft error at ${path}: ${JSON.stringify((data as { info?: unknown }).info ?? '')}`
      );
    }
    return data;
  } finally {
    clearTimeout(timer);
  }
}

function toUnix(value: string | number | undefined): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value === 'number') return String(value);
  const n = Number(value);
  if (!isNaN(n) && n > 1e9) return String(Math.floor(n));
  const ms = Date.parse(value);
  if (!isNaN(ms)) return String(Math.floor(ms / 1000));
  return undefined;
}

function defaultDocRange() {
  const now = Math.floor(Date.now() / 1000);
  const prevYearStart = new Date(new Date().getFullYear() - 1, 0, 1);
  return {
    starttmp: String(Math.floor(prevYearStart.getTime() / 1000)),
    endtmp: String(now),
  };
}

export async function holdedListDocuments(
  apiKey: string,
  params: {
    docType: string;
    starttmp?: string;
    endtmp?: string;
    contactId?: string;
    limit?: number;
  }
) {
  const range = defaultDocRange();
  const qs = new URLSearchParams({
    starttmp: toUnix(params.starttmp) ?? range.starttmp,
    endtmp: toUnix(params.endtmp) ?? range.endtmp,
    ...(params.contactId ? { contactId: params.contactId } : {}),
  });
  const raw = (await holdedFetch(
    apiKey,
    `/api/invoicing/v1/documents/${params.docType}?${qs}`
  )) as unknown[];
  const all = Array.isArray(raw) ? raw : [];
  const limit = params.limit ?? 50;
  return { documents: all.slice(0, limit), total: all.length, truncated: all.length > limit };
}

export async function holdedGetDocument(apiKey: string, docType: string, documentId: string) {
  return holdedFetch(apiKey, `/api/invoicing/v1/documents/${docType}/${documentId}`);
}

export async function holdedListContacts(
  apiKey: string,
  params?: { type?: string; limit?: number }
) {
  const qs = new URLSearchParams(params?.type ? { type: params.type } : {});
  const raw = (await holdedFetch(
    apiKey,
    `/api/invoicing/v1/contacts${qs.toString() ? '?' + qs : ''}`
  )) as unknown[];
  const all = Array.isArray(raw) ? raw : [];
  const limit = params?.limit ?? 50;
  return { contacts: all.slice(0, limit), total: all.length, truncated: all.length > limit };
}

export async function holdedGetContact(apiKey: string, contactId: string) {
  return holdedFetch(apiKey, `/api/invoicing/v1/contacts/${contactId}`);
}

export async function holdedGetChartOfAccounts(apiKey: string) {
  return holdedFetch(apiKey, '/api/accounting/v1/chartofaccounts?includeEmpty=1');
}

export async function holdedGetJournal(
  apiKey: string,
  params?: { starttmp?: string; endtmp?: string }
) {
  const range = defaultDocRange();
  const qs = new URLSearchParams({
    starttmp: toUnix(params?.starttmp) ?? range.starttmp,
    endtmp: toUnix(params?.endtmp) ?? range.endtmp,
  });
  const raw = (await holdedFetch(apiKey, `/api/accounting/v1/dailyledger?${qs}`)) as unknown[];
  const all = Array.isArray(raw) ? raw : [];
  return { entries: all.slice(0, 100), total: all.length, truncated: all.length > 100 };
}

export async function holdedListTreasuryAccounts(apiKey: string) {
  const raw = await holdedFetch(apiKey, '/api/invoicing/v1/treasury');
  return Array.isArray(raw) ? raw : [];
}

export async function holdedListProducts(apiKey: string, params?: { limit?: number }) {
  const raw = (await holdedFetch(apiKey, '/api/invoicing/v1/products')) as unknown[];
  const all = Array.isArray(raw) ? raw : [];
  const limit = params?.limit ?? 50;
  return { products: all.slice(0, limit), total: all.length, truncated: all.length > limit };
}

export async function holdedListProjects(apiKey: string) {
  const raw = await holdedFetch(apiKey, '/api/projects/v1/projects');
  return Array.isArray(raw) ? raw : [];
}

export async function holdedListEmployees(apiKey: string) {
  const raw = await holdedFetch(apiKey, '/api/team/v1/employees');
  return Array.isArray(raw) ? raw : [];
}

// ── Verifactu / SII ───────────────────────────────────────────────────────────

export type VerifactuStatus = {
  invoiceId: string;
  active: boolean;
  uuid?: string | null;
  qrBase64?: string | null;
  huella?: string | null;
  sentAt?: string | null;
  raw: Record<string, unknown>;
};

export async function holdedGetVerifactuStatus(
  apiKey: string,
  invoiceId: string
): Promise<VerifactuStatus> {
  const raw = (await holdedFetch(
    apiKey,
    `/api/invoicing/v1/documents/invoice/${invoiceId}`
  )) as Record<string, unknown>;

  // Holded embeds Verifactu data in the document response when Verifactu is active.
  // Field names vary by Holded version: verifactu, verifactuData, qrCode, qr_base64.
  const vf =
    (raw?.verifactu as Record<string, unknown> | undefined) ||
    (raw?.verifactuData as Record<string, unknown> | undefined) ||
    {};

  return {
    invoiceId,
    active: Boolean(vf?.uuid || raw?.verifactuUuid || raw?.qrCode),
    uuid: (vf?.uuid || raw?.verifactuUuid || null) as string | null,
    qrBase64: (vf?.qr || vf?.qr_base64 || raw?.qrCode || null) as string | null,
    huella: (vf?.huella || vf?.hash || null) as string | null,
    sentAt: (vf?.sentAt || vf?.fecha || null) as string | null,
    raw,
  };
}

// ── P&L sintético desde dailyledger ──────────────────────────────────────────

export type PnLSummary = {
  period: { from: string; to: string };
  income: number;
  expenses: number;
  grossProfit: number;
  margin: number | null;
  incomeByAccount: Record<string, number>;
  expensesByAccount: Record<string, number>;
  entriesProcessed: number;
};

export async function holdedGetPnL(
  apiKey: string,
  params?: { starttmp?: string; endtmp?: string; year?: number }
): Promise<PnLSummary> {
  const now = Math.floor(Date.now() / 1000);
  const year = params?.year ?? new Date().getFullYear();
  const from =
    params?.starttmp ?? String(Math.floor(new Date(year, 0, 1).getTime() / 1000));
  const to = params?.endtmp ?? String(now);

  const qs = new URLSearchParams({ starttmp: from, endtmp: to });
  const raw = (await holdedFetch(
    apiKey,
    `/api/accounting/v1/dailyledger?${qs}`
  )) as unknown[];
  const entries = Array.isArray(raw) ? raw : [];

  const incomeByAccount: Record<string, number> = {};
  const expensesByAccount: Record<string, number> = {};

  for (const entry of entries) {
    const e = entry as Record<string, unknown>;
    const account = String(e.account || e.accountCode || e.num || '');
    const credit = Number(e.credit ?? e.haber ?? 0);
    const debit = Number(e.debit ?? e.debe ?? 0);
    const net = credit - debit;

    // Spanish PGC: 7xx = income, 6xx = expenses
    if (account.startsWith('7')) {
      incomeByAccount[account] = (incomeByAccount[account] ?? 0) + net;
    } else if (account.startsWith('6')) {
      expensesByAccount[account] = (expensesByAccount[account] ?? 0) + Math.abs(net);
    }
  }

  const income = Object.values(incomeByAccount).reduce((s, v) => s + v, 0);
  const expenses = Object.values(expensesByAccount).reduce((s, v) => s + v, 0);
  const grossProfit = income - expenses;

  return {
    period: {
      from: new Date(Number(from) * 1000).toISOString().slice(0, 10),
      to: new Date(Number(to) * 1000).toISOString().slice(0, 10),
    },
    income: Math.round(income * 100) / 100,
    expenses: Math.round(expenses * 100) / 100,
    grossProfit: Math.round(grossProfit * 100) / 100,
    margin: income > 0 ? Math.round((grossProfit / income) * 10000) / 100 : null,
    incomeByAccount,
    expensesByAccount,
    entriesProcessed: entries.length,
  };
}

// ── Envío de documentos ───────────────────────────────────────────────────────

export type SendDocumentParams = {
  emails: string[];
  subject?: string;
  body?: string;
  cc?: string[];
};

export async function holdedSendDocument(
  apiKey: string,
  docType: string,
  documentId: string,
  params: SendDocumentParams
): Promise<{ ok: boolean; raw: unknown }> {
  const payload: Record<string, unknown> = { emails: params.emails };
  if (params.subject) payload.subject = params.subject;
  if (params.body) payload.body = params.body;
  if (params.cc?.length) payload.cc = params.cc;

  const raw = await holdedPost(
    apiKey,
    `/api/invoicing/v1/documents/${docType}/${documentId}/send`,
    payload
  );
  return { ok: true, raw };
}

// ── Crear gasto (para OCR → Holded) ──────────────────────────────────────────

export type CreateExpenseParams = {
  contactId?: string;
  contactName?: string;
  date: number; // Unix timestamp
  notes?: string;
  items: Array<{
    name: string;
    units: number;
    subtotal: number;
    tax?: number;
    taxAmount?: number;
    account?: string;
  }>;
  currency?: string;
  paymentMethodId?: string;
};

export async function holdedCreateExpense(
  apiKey: string,
  params: CreateExpenseParams
): Promise<{ id: string; docNumber?: string; raw: unknown }> {
  const payload: Record<string, unknown> = {
    date: params.date,
    notes: params.notes ?? '',
    currency: params.currency ?? 'EUR',
    items: params.items.map((item) => ({
      name: item.name,
      units: item.units,
      subtotal: item.subtotal,
      ...(item.tax !== undefined ? { tax: item.tax } : {}),
      ...(item.taxAmount !== undefined ? { taxAmount: item.taxAmount } : {}),
      ...(item.account ? { account: item.account } : {}),
    })),
  };
  if (params.contactId) payload.contactId = params.contactId;
  if (params.paymentMethodId) payload.paymentMethodId = params.paymentMethodId;

  const raw = (await holdedPost(
    apiKey,
    '/api/invoicing/v1/documents/purchase',
    payload
  )) as Record<string, unknown>;

  return {
    id: String(raw?.id ?? raw?.docId ?? ''),
    docNumber: raw?.docNumber as string | undefined,
    raw,
  };
}

// ── Pagos ─────────────────────────────────────────────────────────────────────

export async function holdedListPayments(
  apiKey: string,
  params?: { starttmp?: string; endtmp?: string; limit?: number }
) {
  const now = Math.floor(Date.now() / 1000);
  const threeMonthsAgo = now - 90 * 24 * 3600;
  const qs = new URLSearchParams({
    starttmp: params?.starttmp ?? String(threeMonthsAgo),
    endtmp: params?.endtmp ?? String(now),
  });
  const raw = (await holdedFetch(
    apiKey,
    `/api/invoicing/v1/payments?${qs}`
  )) as unknown[];
  const all = Array.isArray(raw) ? raw : [];
  const limit = params?.limit ?? 50;
  return { payments: all.slice(0, limit), total: all.length, truncated: all.length > limit };
}

// ── Crear factura de venta ────────────────────────────────────────────────────

export type CreateInvoiceParams = {
  contactId: string;
  date?: number;   // Unix timestamp — default: today
  notes?: string;
  currency?: string;
  items: Array<{
    name: string;
    units: number;
    subtotal: number; // unit price before tax
    tax?: number;     // VAT %, default 21
  }>;
};

export async function holdedCreateInvoice(
  apiKey: string,
  params: CreateInvoiceParams
): Promise<{ id: string; docNumber?: string; raw: unknown }> {
  const payload: Record<string, unknown> = {
    contactId: params.contactId,
    date: params.date ?? Math.floor(Date.now() / 1000),
    notes: params.notes ?? '',
    currency: params.currency ?? 'EUR',
    items: params.items.map((item) => ({
      name: item.name,
      units: item.units,
      subtotal: item.subtotal,
      tax: item.tax ?? 21,
    })),
  };

  const raw = (await holdedPost(
    apiKey,
    '/api/invoicing/v1/documents/invoice',
    payload
  )) as Record<string, unknown>;

  return {
    id: String(raw?.id ?? raw?.docId ?? ''),
    docNumber: raw?.docNumber as string | undefined,
    raw,
  };
}

// ── Registrar cobro en factura ────────────────────────────────────────────────

export type RegisterPaymentParams = {
  docType?: string;  // default 'invoice'
  documentId: string;
  date?: number;     // Unix timestamp — default: today
  amount: number;
  accountId?: string; // treasury account ID (optional)
};

export async function holdedRegisterPayment(
  apiKey: string,
  params: RegisterPaymentParams
): Promise<{ success: boolean; raw: unknown }> {
  const docType = params.docType ?? 'invoice';
  const payload: Record<string, unknown> = {
    date: params.date ?? Math.floor(Date.now() / 1000),
    amount: params.amount,
  };
  if (params.accountId) payload.accountId = params.accountId;

  const raw = await holdedPost(
    apiKey,
    `/api/invoicing/v1/documents/${docType}/${params.documentId}/pay`,
    payload
  );

  return { success: true, raw };
}

// ── Crear contacto ────────────────────────────────────────────────────────────

export type CreateContactParams = {
  name: string;
  email?: string;
  phone?: string;
  nif?: string;                              // 'code' in Holded API
  type?: 'client' | 'supplier' | 'both';    // 1 | 2 | 3
  address?: string;
  city?: string;
  postalCode?: string;
  country?: string; // ISO 2-letter, default 'ES'
};

export async function holdedCreateContact(
  apiKey: string,
  params: CreateContactParams
): Promise<{ id: string; raw: unknown }> {
  const typeMap: Record<string, number> = { client: 1, supplier: 2, both: 3 };
  const payload: Record<string, unknown> = {
    name: params.name,
    country: params.country ?? 'ES',
    type: typeMap[params.type ?? 'client'] ?? 1,
  };
  if (params.email) payload.email = params.email;
  if (params.phone) payload.phone = params.phone;
  if (params.nif) payload.code = params.nif;
  if (params.address) payload.address = params.address;
  if (params.city) payload.city = params.city;
  if (params.postalCode) payload.cp = params.postalCode;

  const raw = (await holdedPost(
    apiKey,
    '/api/invoicing/v1/contacts',
    payload
  )) as Record<string, unknown>;

  return {
    id: String(raw?.id ?? raw?.contactId ?? ''),
    raw,
  };
}

// ─── V1 LAUNCH (2026-05-28) — tools nuevas ────────────────────────────────────
//
// Las siguientes funciones complementan el catálogo de tools para el lanzamiento
// V1 (ver docs/product/ISAAK_LAUNCH_V1_2026-05-28.md). Cubren los huecos de
// invoicing + contabilidad que necesitamos exponer al chat con Holded.

/** Lista de impuestos (IVA, IRPF) configurados en el ERP. */
export async function holdedListTaxes(apiKey: string) {
  const raw = await holdedFetch(apiKey, '/api/invoicing/v1/taxes');
  return Array.isArray(raw) ? raw : [];
}

/** Series de numeración para facturas y presupuestos. */
export async function holdedListNumberingSeries(apiKey: string) {
  // El endpoint base /numberingseries devuelve HTML; usamos los específicos
  // por tipo, que sí devuelven JSON. Si Holded no tiene series configuradas
  // usará la default automáticamente al crear documentos.
  const [invoiceSeries, estimateSeries] = await Promise.all([
    holdedFetch(apiKey, '/api/invoicing/v1/numberingseries/invoice').catch(() => []),
    holdedFetch(apiKey, '/api/invoicing/v1/numberingseries/estimate').catch(() => []),
  ]);
  return [
    ...(Array.isArray(invoiceSeries) ? invoiceSeries : []),
    ...(Array.isArray(estimateSeries) ? estimateSeries : []),
  ];
}

/**
 * Devuelve el PDF de un documento Holded codificado en base64. Lo devolvemos
 * como string para que la tool del chat pueda pasarlo directamente al modelo
 * como `type: 'document'` content block.
 */
export async function holdedGetDocumentPdf(
  apiKey: string,
  docType: string,
  documentId: string
): Promise<{ base64: string; bytes: number }> {
  const url = `${HOLDED_BASE}/api/invoicing/v1/documents/${docType}/${documentId}/pdf`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), HOLDED_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: {
        key: apiKey,
        Accept: 'application/pdf,application/octet-stream,*/*',
        'Accept-Encoding': 'identity',
      },
      signal: controller.signal,
    });
    if (!res.ok) {
      throw new Error(`Holded API ${res.status} at /documents/${docType}/${documentId}/pdf`);
    }
    const buf = Buffer.from(await res.arrayBuffer());

    // V3.F.II (auditoría 2026-06-01): mismo patrón que el bug ya cerrado en
    // apps/app/lib/integrations/accounting.ts. Holded a veces devuelve 200 OK
    // con body JSON `{"status":0,"error":"..."}` cuando el documento no tiene
    // PDF — sin esta validación, encodeábamos ese JSON como base64 con
    // mimeType: 'application/pdf' mentiroso (ver holded-tools.ts:539).
    //
    // Magic bytes de un PDF real: %PDF- (bytes 0x25 0x50 0x44 0x46 0x2D).
    // Si los primeros 5 bytes NO coinciden Y el content-type devuelto por
    // Holded no es application/pdf, propagamos el error real de Holded.
    const contentType = (res.headers.get('content-type') || '').toLowerCase();
    const magic = buf.subarray(0, 5).toString('latin1');
    const isPdfMagic = magic.startsWith('%PDF-');
    const isPdfContentType = contentType.startsWith('application/pdf');

    if (!isPdfMagic && !isPdfContentType) {
      const bodyText = buf.toString('utf8');
      let parsedMessage: string | null = null;
      try {
        const parsed = JSON.parse(bodyText) as { error?: string; message?: string };
        parsedMessage = parsed?.error ?? parsed?.message ?? null;
      } catch {
        // Body no es JSON parseable, dejamos parsedMessage null.
      }
      throw new Error(
        parsedMessage
          ? `Holded returned no PDF for ${docType}/${documentId}: ${parsedMessage}`
          : `Holded returned no PDF for ${docType}/${documentId}. The document may not have an attached PDF or may not be in a printable state.`
      );
    }

    return { base64: buf.toString('base64'), bytes: buf.byteLength };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Crea una factura en estado borrador (approveDoc: false). El usuario revisa
 * y aprueba manualmente en Holded — Isaak NO emite a AEAT directamente.
 * V1 reemplaza a holdedCreateInvoice como acción por defecto del chat.
 */
export async function holdedCreateInvoiceDraft(
  apiKey: string,
  params: CreateInvoiceParams
): Promise<{ id: string; docNumber?: string; raw: unknown }> {
  const payload: Record<string, unknown> = {
    contactId: params.contactId,
    date: params.date ?? Math.floor(Date.now() / 1000),
    notes: params.notes ?? '',
    currency: params.currency ?? 'EUR',
    items: params.items.map((item) => ({
      name: item.name,
      units: item.units,
      subtotal: item.subtotal,
      tax: item.tax ?? 21,
    })),
    // approveDoc: false fuerza el documento a borrador a nivel de wire. NUNCA
    // mover esta línea: si alguna llamada del modelo añadiera approveDoc:true
    // por error, esto la sobrescribe.
    approveDoc: false,
  };

  const raw = (await holdedPost(
    apiKey,
    '/api/invoicing/v1/documents/invoice',
    payload
  )) as Record<string, unknown>;

  return {
    id: String(raw?.id ?? raw?.docId ?? ''),
    docNumber: raw?.docNumber as string | undefined,
    raw,
  };
}
