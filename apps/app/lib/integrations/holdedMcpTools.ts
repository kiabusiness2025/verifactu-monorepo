import { holdedAdapter } from '@/lib/integrations/accounting';

export type HoldedMcpJsonSchema = {
  type: 'object';
  properties: Record<string, unknown>;
  required?: string[];
  additionalProperties?: boolean;
};

export type HoldedMcpToolDefinition = {
  name: string;
  title: string;
  description: string;
  annotations?: {
    readOnlyHint?: boolean;
    destructiveHint?: boolean;
    idempotentHint?: boolean;
    openWorldHint?: boolean;
  };
  inputSchema: HoldedMcpJsonSchema;
  /**
   * V3.H (2026-06-01) — Per MCP spec draft, tools MAY declare an `outputSchema`
   * describing the shape of `structuredContent` returned in tools/call results.
   * OpenAI App Review recommends it ("Add an outputSchema so models can better
   * understand this tool's results"). The route returns `structuredContent` as
   * the raw handler payload (see formatToolResult in app/api/mcp/holded/route.ts)
   * so the schema must describe that object.
   *
   * Optional — only present on the public preset tools where OpenAI/Anthropic
   * reviewers benefit from the additional structure. Other tools keep the
   * minimal definition.
   *
   * Spec: https://modelcontextprotocol.io/specification/draft/server/tools#tool
   */
  outputSchema?: HoldedMcpJsonSchema;
};

type HoldedMcpToolHandler = (
  apiKey: string,
  input: Record<string, unknown>
) => Promise<Record<string, unknown>>;

/**
 * Error de usuario en una tool: input inválido, falta confirmación, recurso no
 * encontrado, etc. NO es un fallo del conector ni de Holded; es una condición
 * esperada que el route debe transformar en un resultado MCP legible
 * (`content`+`structuredContent`) en vez de un error JSON-RPC genérico.
 *
 * El route.ts inspecciona `instanceof HoldedUserError` y devuelve un resultado
 * normal con `structuredContent.error = code`, evitando que ChatGPT/Claude
 * vean "Internal MCP error" para casos que son claramente del lado del input.
 */
export class HoldedUserError extends Error {
  code: string;
  data: Record<string, unknown>;
  constructor(code: string, message: string, data: Record<string, unknown> = {}) {
    super(message);
    this.name = 'HoldedUserError';
    this.code = code;
    this.data = data;
  }
}

const readOnlyAnnotations = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
} as const;

function writeAnnotations(destructiveHint = false) {
  return {
    readOnlyHint: false,
    destructiveHint,
    idempotentHint: false,
    openWorldHint: false,
  } as const;
}

const pageProperty = {
  type: 'number',
  minimum: 1,
  default: 1,
  description: 'Results page number to fetch from Holded pagination.',
};

const limitProperty = {
  type: 'number',
  minimum: 1,
  maximum: 100,
  default: 25,
  description: 'Maximum number of items to return.',
};

const yearProperty = {
  type: 'number',
  minimum: 2000,
  maximum: 2100,
  description:
    'Optional calendar year to search, for example 2025. When provided, the connector scans additional Holded pages to reach older history.',
};

const isoDateProperty = {
  type: 'string',
  description:
    'Optional date filter in YYYY-MM-DD or ISO 8601 format. When used, the connector scans additional Holded pages to find matching history.',
};

const confirmProperty = {
  type: 'boolean',
  description: 'Must be true to confirm that the user explicitly approved this write action.',
};

const unixTimestampProperty = {
  type: 'number',
  description: 'Unix timestamp in seconds. If omitted, the connector uses the current time.',
};

const quantityProperty = {
  type: 'number',
  minimum: 0,
  description: 'Number of units for the line item.',
};

const moneyProperty = {
  type: 'number',
  description: 'Unit price before taxes for the line item.',
};

const percentProperty = {
  type: 'number',
  description: 'Tax percentage applied to the line item, for example 21.',
};

function stringProperty(description: string, options?: { defaultValue?: string }) {
  return {
    type: 'string',
    ...(options?.defaultValue ? { default: options.defaultValue } : {}),
    description,
  };
}

function payloadProperty(description: string) {
  return {
    type: 'object',
    description,
  };
}

function documentLineItemProperty(description: string) {
  return {
    type: 'array',
    description,
    minItems: 1,
    items: {
      type: 'object',
      properties: {
        desc: stringProperty('Line description shown in Holded.'),
        name: stringProperty(
          'Compatibility alias for desc if the caller uses product-shaped items.'
        ),
        title: stringProperty('Compatibility alias for desc.'),
        units: quantityProperty,
        quantity: {
          ...quantityProperty,
          description: 'Compatibility alias for units.',
        },
        price: moneyProperty,
        unitPrice: {
          ...moneyProperty,
          description: 'Compatibility alias for price.',
        },
        amount: {
          ...moneyProperty,
          description: 'Compatibility alias for price.',
        },
        tax: percentProperty,
        taxPercent: {
          ...percentProperty,
          description: 'Compatibility alias for tax.',
        },
      },
      additionalProperties: true,
    },
  };
}

function documentCreatePayloadProperty(description: string) {
  return {
    type: 'object',
    description,
    properties: {
      contactId: stringProperty('Holded contact identifier for the document recipient.'),
      date: unixTimestampProperty,
      subject: stringProperty('Optional subject or title shown in the draft document.'),
      notes: stringProperty('Optional internal note stored in Holded for this draft.'),
      lines: documentLineItemProperty(
        'Preferred Holded line format. Each item should include desc, units, price and usually tax.'
      ),
      // `products` se sigue aceptando en runtime como alias de `lines` por
      // retrocompatibilidad, pero NO lo anunciamos en el inputSchema: cuando
      // ChatGPT lo veía con `minItems: 1`, generaba a veces `products: []`
      // junto a un `lines` válido y la validación lo rechazaba en lugar de
      // aceptar el draft correcto. El normalizador interno lo absorbe si llega.
    },
    additionalProperties: true,
  };
}

function buildSchema(
  properties: Record<string, unknown>,
  required: string[] = []
): HoldedMcpToolDefinition['inputSchema'] {
  return {
    type: 'object',
    properties,
    ...(required.length > 0 ? { required } : {}),
    additionalProperties: false,
  };
}

function listSchema(extraProperties: Record<string, unknown> = {}) {
  return buildSchema({
    page: pageProperty,
    limit: limitProperty,
    ...extraProperties,
  });
}

function listSchemaWithRequired(
  extraProperties: Record<string, unknown> = {},
  required: string[] = []
) {
  return buildSchema(
    {
      page: pageProperty,
      limit: limitProperty,
      ...extraProperties,
    },
    required
  );
}

function simpleSchema(extraProperties: Record<string, unknown> = {}, required: string[] = []) {
  return buildSchema(extraProperties, required);
}

function writeSchema(extraProperties: Record<string, unknown>, required: string[] = []) {
  return buildSchema(
    {
      confirm: confirmProperty,
      ...extraProperties,
    },
    ['confirm', ...required]
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// V3.H (2026-06-01) — outputSchema reusables para las 10 tools del preset
// `openai_review_invoicing_v1`. Spec MCP draft, sección "Tool":
// https://modelcontextprotocol.io/specification/draft/server/tools#tool
//
// Estos schemas describen `structuredContent` (la forma del payload JSON que
// devuelve el handler). El formatToolResult de route.ts ya expone el handler
// payload directamente como structuredContent, así que el schema describe
// {items}, {item}, {created}, {pdf}, etc. con campos concretos para que el
// modelo (ChatGPT, Claude) pueda predecir la estructura sin tener que
// inferirla de ejemplos.
// ─────────────────────────────────────────────────────────────────────────────

const errorOutputSchemaFragment = {
  error: {
    type: 'string',
    description:
      'Present when the resource was not found or another expected condition prevented the read. The structured tool result is still valid; the caller should branch on `error` before trusting other fields.',
  },
  code: { type: 'string' },
  id: { type: 'string' },
} as const;

const holdedInvoiceItemSchema = {
  type: 'object' as const,
  properties: {
    id: { type: 'string', description: 'Internal Holded cuid (24 hex chars).' },
    docNumber: {
      type: 'string',
      description: 'Visible invoice number (e.g. "F0030"). Stable across edits.',
    },
    contactId: { type: 'string' },
    contactName: { type: 'string' },
    date: {
      type: 'number',
      description: 'Issue date as Unix timestamp in seconds.',
    },
    dueDate: { type: 'number' },
    total: { type: 'number' },
    subtotal: { type: 'number' },
    tax: { type: 'number' },
    currency: { type: 'string' },
    status: { type: 'string', description: 'Holded status string (e.g. "approved", "paid").' },
    description: { type: 'string' },
  },
  additionalProperties: true,
};

const holdedDocumentItemSchema = {
  type: 'object' as const,
  properties: {
    ...holdedInvoiceItemSchema.properties,
    docType: {
      type: 'string',
      description: 'Document type (invoice, estimate, purchase, purchaseorder, purchaserefund).',
    },
  },
  additionalProperties: true,
};

const holdedContactItemSchema = {
  type: 'object' as const,
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    tradeName: { type: 'string' },
    code: { type: 'string' },
    email: { type: 'string' },
    phone: { type: 'string' },
    mobile: { type: 'string' },
    vatnumber: { type: 'string', description: 'Spanish tax id (CIF/NIF/NIE).' },
    type: { type: 'string', description: '"client", "supplier" or "lead".' },
    clientRecord: {
      type: ['number', 'object', 'null'],
      description: 'Truthy when this contact has active sales activity.',
    },
    supplierRecord: {
      type: ['number', 'object', 'null'],
      description: 'Truthy when this contact has active purchase activity.',
    },
  },
  additionalProperties: true,
};

const holdedAccountItemSchema = {
  type: 'object' as const,
  properties: {
    id: { type: 'string' },
    num: { type: ['string', 'number'], description: 'Chart of accounts code (e.g. "70500000").' },
    name: { type: 'string' },
    debe: { type: 'number', description: 'Debit balance.' },
    haber: { type: 'number', description: 'Credit balance.' },
    saldo: { type: 'number', description: 'Net balance (debe - haber).' },
  },
  additionalProperties: true,
};

const holdedJournalEntrySchema = {
  type: 'object' as const,
  properties: {
    id: { type: 'string' },
    number: { type: ['string', 'number'], description: 'Entry number, used for ordering.' },
    date: { type: 'number', description: 'Entry date as Unix seconds.' },
    description: { type: 'string' },
    lines: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          account: { type: ['string', 'number'] },
          debit: { type: 'number' },
          credit: { type: 'number' },
          description: { type: 'string' },
        },
        additionalProperties: true,
      },
    },
  },
  additionalProperties: true,
};

function listOutputSchema(
  itemSchema: typeof holdedInvoiceItemSchema | typeof holdedDocumentItemSchema | typeof holdedContactItemSchema | typeof holdedAccountItemSchema | typeof holdedJournalEntrySchema
): HoldedMcpJsonSchema {
  return {
    type: 'object',
    properties: {
      items: {
        type: 'array',
        items: itemSchema,
        description:
          'Array of items returned by Holded for this page. Empty array means no records matched the query (not an error). Pagination is client-side; call with higher `page` numbers to advance.',
      },
      history: {
        type: 'object',
        description:
          'Present when the connector fell back to the historical scan (year/from/to). Includes `total` and `scannedPages` so the caller knows whether the listing is exhaustive.',
        additionalProperties: true,
      },
    },
    required: ['items'],
    additionalProperties: true,
  };
}

function singleOutputSchema(
  itemSchema: typeof holdedInvoiceItemSchema | typeof holdedDocumentItemSchema | typeof holdedContactItemSchema
): HoldedMcpJsonSchema {
  return {
    type: 'object',
    properties: {
      item: itemSchema,
      ...errorOutputSchemaFragment,
    },
    additionalProperties: true,
  };
}

const pdfOutputSchema: HoldedMcpJsonSchema = {
  type: 'object',
  properties: {
    pdf: {
      type: 'object',
      properties: {
        base64: {
          type: 'string',
          description:
            'PDF rendering encoded in base64. Validated against the %PDF- magic bytes before being returned; an HTTP 200 with a JSON error body from Holded is rejected with a meaningful error message instead of being passed through as a fake PDF.',
        },
        contentType: { type: 'string', description: 'Always "application/pdf" on success.' },
        fileName: {
          type: ['string', 'null'],
          description: 'Recommended filename (defaults to `{docType}-{documentId}.pdf`).',
        },
        size: { type: 'number', description: 'Byte size of the decoded PDF.' },
      },
      required: ['base64', 'contentType', 'size'],
      additionalProperties: true,
    },
  },
  required: ['pdf'],
  additionalProperties: true,
};

const createInvoiceDraftOutputSchema: HoldedMcpJsonSchema = {
  type: 'object',
  properties: {
    created: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description:
            'Internal Holded cuid of the newly created draft. The draft is created with approveDoc:false hardcoded — never sent, finalized, charged, emailed, nor AEAT/Verifactu-submitted.',
        },
        docNumber: { type: 'string' },
        status: {
          type: 'string',
          description: 'Should be "draft" or equivalent on creation. User confirms in Holded UI.',
        },
      },
      additionalProperties: true,
    },
  },
  required: ['created'],
  additionalProperties: true,
};

function readTool(
  name: string,
  title: string,
  description: string,
  inputSchema: HoldedMcpToolDefinition['inputSchema'],
  outputSchema?: HoldedMcpToolDefinition['outputSchema']
): HoldedMcpToolDefinition {
  return {
    name,
    title,
    description,
    annotations: readOnlyAnnotations,
    inputSchema,
    ...(outputSchema ? { outputSchema } : {}),
  };
}

function writeTool(
  name: string,
  title: string,
  description: string,
  inputSchema: HoldedMcpToolDefinition['inputSchema'],
  options?: { destructiveHint?: boolean; outputSchema?: HoldedMcpToolDefinition['outputSchema'] }
): HoldedMcpToolDefinition {
  return {
    name,
    title,
    description,
    annotations: writeAnnotations(options?.destructiveHint ?? false),
    inputSchema,
    ...(options?.outputSchema ? { outputSchema: options.outputSchema } : {}),
  };
}

function readPage(input: Record<string, unknown>) {
  const value = Number(input.page ?? 1);
  return Number.isFinite(value) && value >= 1 ? Math.trunc(value) : 1;
}

function readLimit(input: Record<string, unknown>) {
  const value = Number(input.limit ?? 25);
  if (!Number.isFinite(value)) return 25;
  return Math.max(1, Math.min(100, Math.trunc(value)));
}

function optionalString(input: Record<string, unknown>, key: string) {
  const value = input[key];
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function optionalYear(input: Record<string, unknown>, key: string) {
  const value = input[key];
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  const parsed = readFiniteNumber(value);
  if (parsed === undefined) {
    throw new Error(`${key} must be a valid year`);
  }

  const normalized = Math.trunc(parsed);
  if (normalized < 2000 || normalized > 2100) {
    throw new Error(`${key} must be between 2000 and 2100`);
  }

  return normalized;
}

function requiredString(input: Record<string, unknown>, key: string) {
  const value = optionalString(input, key);
  if (!value) {
    throw new Error(`${key} is required`);
  }
  return value;
}

function requiredPayload(input: Record<string, unknown>) {
  const payload = input.payload;
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error('payload is required');
  }
  return payload as Record<string, unknown>;
}

function optionalPayload(input: Record<string, unknown>) {
  const payload = input.payload;
  if (payload === undefined || payload === null) {
    return {};
  }

  if (typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error('payload must be an object');
  }

  return payload as Record<string, unknown>;
}

function optionalBoolean(input: Record<string, unknown>, key: string, defaultValue?: boolean) {
  const value = input[key];
  if (value === undefined || value === null || value === '') {
    return defaultValue;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return value !== 0;
  }

  if (typeof value === 'string' && value.trim()) {
    const normalized = value.trim().toLowerCase();
    if (['1', 'true', 'yes', 'si'].includes(normalized)) return true;
    if (['0', 'false', 'no'].includes(normalized)) return false;
  }

  throw new Error(`${key} must be a boolean`);
}

function requiredEnumString(
  input: Record<string, unknown>,
  key: string,
  allowedValues: readonly string[]
) {
  const value = requiredString(input, key);
  if (!allowedValues.includes(value)) {
    throw new Error(`${key} must be one of: ${allowedValues.join(', ')}`);
  }
  return value;
}

function requireConfirm(input: Record<string, unknown>) {
  if (input.confirm !== true) {
    // Instructional message — ChatGPT and Claude treat this text as a normal
    // tool response and surface it to the user for confirmation. Without this
    // friendly phrasing the model often interprets the error as a hard failure
    // and gives up instead of asking the user to confirm.
    //
    // A5 (auditoria OpenAI 2026-05-07): el wording previo se interpretaba a
    // veces como un error duro durante review (revisor escribia "tool returned
    // an error, app does not work"). Reescrito para (1) afirmar claramente
    // que NO se ha cambiado nada, (2) pedir al modelo que repita la llamada
    // con confirm:true cuando el usuario diga "si"/"yes"/"confirm", y (3)
    // dejar al usuario una salida explicita ("if you don't want to proceed,
    // tell me and I will discard this draft").
    throw new HoldedUserError(
      'confirmation_required',
      'Awaiting your confirmation. Nothing has been written to Holded yet — no changes have been made. ' +
        'If you want to proceed, please confirm explicitly (for example: "Yes, create the draft"). ' +
        'On confirmation, the assistant should call this same tool again with the identical input plus confirm: true. ' +
        "If you don't want to proceed, tell me and I will discard the request."
    );
  }
}

function readFiniteNumber(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value.trim());
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return undefined;
}

function buildDefaultDocumentDate() {
  return Math.floor(Date.now() / 1000);
}

function normalizeDocumentDate(value: unknown) {
  if (typeof value === 'string' && value.trim()) {
    return readFiniteNumber(value) ?? value.trim();
  }

  return readFiniteNumber(value) ?? buildDefaultDocumentDate();
}

function normalizeDocumentLineItem(
  item: unknown,
  sourceKey: 'lines' | 'products' | 'items',
  index: number
) {
  if (!item || typeof item !== 'object' || Array.isArray(item)) {
    throw new Error(`payload.${sourceKey}[${index}] must be an object`);
  }

  const rawItem = item as Record<string, unknown>;
  const desc =
    optionalString(rawItem, 'desc') ||
    optionalString(rawItem, 'name') ||
    optionalString(rawItem, 'title');
  const units = readFiniteNumber(rawItem.units) ?? readFiniteNumber(rawItem.quantity);
  // V3.G.11 — subtotal/total aceptados como aliases de price. ChatGPT a
  // veces emite { name, units, subtotal, tax } en vez de la forma
  // canónica { desc, units, price, tax }.
  const price =
    readFiniteNumber(rawItem.price) ??
    readFiniteNumber(rawItem.unitPrice) ??
    readFiniteNumber(rawItem.amount) ??
    readFiniteNumber(rawItem.subtotal) ??
    readFiniteNumber(rawItem.total);
  const tax = readFiniteNumber(rawItem.tax) ?? readFiniteNumber(rawItem.taxPercent);

  if (!desc || units === undefined || price === undefined) {
    throw new Error(
      `payload.${sourceKey}[${index}] must include desc/name, units/quantity, and price`
    );
  }

  // V3.G.4: enforce units > 0 y price > 0 para no crear drafts vacíos.
  if (units <= 0) {
    throw new Error(
      `payload.${sourceKey}[${index}].units must be greater than 0 (got ${units}). Please specify how many units/hours/items are being invoiced.`
    );
  }
  if (price <= 0) {
    throw new Error(
      `payload.${sourceKey}[${index}].price must be greater than 0 (got ${price}). Please specify the unit price in EUR (or the document currency).`
    );
  }

  // V3.G.12 — CRÍTICO: emitir SÓLO los campos canónicos al wire.
  // El spread previo {...rawItem,...} dejaba pasar al body de Holded
  // campos del input como `name`/`sku`/`subtotal` que Holded interpreta
  // como referencia al catálogo de productos. Al no encontrar match,
  // descarta la línea entera silenciosamente (200 OK pero draft con
  // products:[]). Limitamos al set documentado de Holded.
  const cleanLine: Record<string, unknown> = { desc, units, price };
  if (tax !== undefined) cleanLine.tax = tax;
  if (typeof rawItem.productId === 'string' && rawItem.productId.trim()) {
    cleanLine.productId = rawItem.productId.trim();
  }
  return cleanLine;
}

function normalizeDocumentCreatePayload(payload: Record<string, unknown>) {
  if (typeof payload.contactId !== 'string' || !payload.contactId.trim()) {
    throw new Error('payload.contactId is required');
  }

  // V3.G.11 — `items` aceptado como tercer source key. Holded espera
  // `lines[]` en el body, pero ChatGPT a veces emite el array como
  // `items` (vocabulario heredado de otras integraciones del modelo).
  // El output siempre emite `lines` que es lo que Holded acepta.
  const sourceKey: 'lines' | 'products' | 'items' | null =
    Array.isArray(payload.lines) && payload.lines.length > 0
      ? 'lines'
      : Array.isArray(payload.products) && payload.products.length > 0
        ? 'products'
        : Array.isArray(payload.items) && payload.items.length > 0
          ? 'items'
          : null;

  if (!sourceKey) {
    throw new Error('payload.lines, payload.products or payload.items must be a non-empty array');
  }

  const rawLines = payload[sourceKey] as unknown[];
  const { lines: _lines, products: _products, items: _items, ...rest } = payload;

  return {
    ...rest,
    contactId: payload.contactId.trim(),
    date: normalizeDocumentDate(payload.date),
    lines: rawLines.map((item, index) => normalizeDocumentLineItem(item, sourceKey, index)),
  };
}

function normalizeUnixTimestamp(value: unknown, key: string) {
  const parsed = readFiniteNumber(value);
  if (parsed === undefined) {
    throw new Error(`${key} must be a valid unix timestamp`);
  }
  return Math.trunc(parsed);
}

function optionalUnixTimestamp(input: Record<string, unknown>, key: string) {
  const value = input[key];
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  return normalizeUnixTimestamp(value, key);
}

function requiredUnixTimestamp(input: Record<string, unknown>, key: string) {
  const value = input[key];
  if (value === undefined || value === null || value === '') {
    throw new Error(`${key} is required`);
  }
  return normalizeUnixTimestamp(value, key);
}

/**
 * Parse an ISO 8601 date string (YYYY-MM-DD) into Unix seconds at UTC midnight.
 * Returns undefined if the value is missing or unparseable.
 */
function parseIsoDateToUnix(value: unknown): number | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;

  // V3.G.5 (auditoría 2026-06-01): YYYY-MM-DD se interpreta como
  // medianoche LOCAL Europe/Madrid, NO UTC.
  //
  // BUG REPRO: Holded almacena las fechas de los documentos al timestamp
  // de medianoche LOCAL del tenant (Madrid → UTC+1 invierno / UTC+2 verano).
  // Doc P250001 fechado 2025-01-01 tenía date=1735686000 (= 2025-01-01
  // 00:00 Madrid = 2024-12-31 23:00 UTC).
  //
  // ANTES interpretábamos "2025-01-01" como UTC midnight = 1735689600,
  // que en Madrid son las 01:00 del 01/01/2025 — 1 HORA DESPUÉS del doc.
  // Resultado: range filter con starttmp=1735689600 EXCLUÍA silenciosamente
  // el doc P250001. Cada corte de ejercicio/trimestre perdía las facturas
  // del primer día. Daño en auditorías reales.
  //
  // AHORA "2025-01-01" → 1735686000 (Madrid midnight) → doc P250001 incluido.
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return parseDateAsMadridMidnight(trimmed);
  }

  // ISO completo con tiempo/timezone explícito → respetamos la conversión nativa.
  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) return undefined;
  return Math.floor(date.getTime() / 1000);
}

/**
 * "YYYY-MM-DD" → segundos epoch de las 00:00:00 LOCAL Europe/Madrid de ese día.
 * Maneja correctamente las transiciones DST (CET → CEST en marzo, vuelta en octubre)
 * porque computa el offset dinámicamente para la fecha exacta.
 */
function parseDateAsMadridMidnight(isoDate: string): number {
  const utcMidnightMs = Date.parse(`${isoDate}T00:00:00Z`);
  if (!Number.isFinite(utcMidnightMs)) return NaN;
  const sample = new Date(utcMidnightMs);
  const tzPart = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Madrid',
    timeZoneName: 'shortOffset',
  })
    .formatToParts(sample)
    .find((p) => p.type === 'timeZoneName')?.value;
  // tzPart parecido a "GMT+1" o "GMT+2". Fallback CET (+1) si fail.
  const match = tzPart?.match(/GMT([+-])(\d+)(?::(\d+))?/);
  const offsetMin = match
    ? (match[1] === '-' ? -1 : 1) *
      (Number(match[2]) * 60 + (match[3] ? Number(match[3]) : 0))
    : 60;
  return Math.floor(utcMidnightMs / 1000) - offsetMin * 60;
}

/**
 * Resolve a date input that can be either:
 *  - A Unix timestamp (number or numeric string), via the *Timestamp key
 *  - An ISO date string YYYY-MM-DD, via the *Date key (preferred for ChatGPT)
 *
 * The endOfDay flag bumps the result to 23:59:59 UTC when parsing a date — useful
 * for endDate parameters so the range is inclusive of the last calendar day.
 */
function resolveDateInput(
  input: Record<string, unknown>,
  options: {
    timestampKey: string;
    dateKey: string;
    required: boolean;
    endOfDay?: boolean;
  }
): number | undefined {
  // Prefer Unix timestamp when supplied (backwards compatible).
  const tsValue = input[options.timestampKey];
  if (tsValue !== undefined && tsValue !== null && tsValue !== '') {
    return normalizeUnixTimestamp(tsValue, options.timestampKey);
  }

  // Fall back to ISO date string — easier for ChatGPT to produce reliably.
  const isoUnix = parseIsoDateToUnix(input[options.dateKey]);
  if (isoUnix !== undefined) {
    return options.endOfDay ? isoUnix + 86399 : isoUnix;
  }

  if (options.required) {
    throw new Error(
      `Either ${options.timestampKey} (Unix seconds) or ${options.dateKey} (YYYY-MM-DD) is required`
    );
  }
  return undefined;
}

function splitStringList(value: string) {
  return value
    .split(/[;,]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeRequiredStringArray(value: unknown, key: string) {
  const items =
    typeof value === 'string'
      ? splitStringList(value)
      : Array.isArray(value)
        ? value.map((item) => (typeof item === 'string' ? item.trim() : '')).filter(Boolean)
        : null;

  if (!items || items.length === 0) {
    throw new Error(`${key} must be a non-empty array of strings`);
  }

  return items;
}

function normalizeOptionalStringArray(value: unknown, key: string) {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  const items =
    typeof value === 'string'
      ? splitStringList(value)
      : Array.isArray(value)
        ? value.map((item) => (typeof item === 'string' ? item.trim() : '')).filter(Boolean)
        : null;

  if (!items) {
    throw new Error(`${key} must be an array of strings`);
  }

  return items;
}

function normalizeDailyLedgerEntryPayload(payload: Record<string, unknown>) {
  const date = normalizeUnixTimestamp(payload.date, 'payload.date');

  if (!Array.isArray(payload.lines) || payload.lines.length < 2) {
    throw new Error('payload.lines must include at least 2 entry lines');
  }

  const lines = payload.lines.map((line, index) => {
    if (!line || typeof line !== 'object' || Array.isArray(line)) {
      throw new Error(`payload.lines[${index}] must be an object`);
    }
    return line as Record<string, unknown>;
  });

  const { date: _date, lines: _lines, notes: _notes, ...rest } = payload;
  const notes = optionalString(payload, 'notes');

  return {
    ...rest,
    date,
    lines,
    ...(notes ? { notes } : {}),
  };
}

function normalizeAccountingAccountPayload(payload: Record<string, unknown>) {
  const prefixValue = readFiniteNumber(payload.prefix);
  if (prefixValue === undefined || !Number.isInteger(prefixValue)) {
    throw new Error('payload.prefix must be a 4 digit integer');
  }

  const prefix = Math.trunc(prefixValue);
  if (prefix < 1000 || prefix > 9999) {
    throw new Error('payload.prefix must be a 4 digit integer');
  }

  const { prefix: _prefix, name: _name, color: _color, ...rest } = payload;
  const name = optionalString(payload, 'name');
  const color = optionalString(payload, 'color');

  return {
    ...rest,
    prefix,
    ...(name ? { name } : {}),
    ...(color ? { color } : {}),
  };
}

function normalizeDocumentSendPayload(payload: Record<string, unknown>) {
  const { emails: _emails, docIds: _docIds, ...rest } = payload;
  const emails = normalizeRequiredStringArray(payload.emails, 'payload.emails');
  const docIds = normalizeOptionalStringArray(payload.docIds, 'payload.docIds');
  const mailTemplateId = optionalString(payload, 'mailTemplateId');
  const subject = optionalString(payload, 'subject');
  const message = optionalString(payload, 'message');

  return {
    ...rest,
    emails,
    ...(docIds ? { docIds } : {}),
    ...(mailTemplateId ? { mailTemplateId } : {}),
    ...(subject ? { subject } : {}),
    ...(message ? { message } : {}),
  };
}

function normalizePayDocumentPayload(payload: Record<string, unknown>) {
  const date = normalizeUnixTimestamp(payload.date, 'payload.date');
  const amount = readFiniteNumber(payload.amount);
  if (amount === undefined) {
    throw new Error('payload.amount must be a valid number');
  }

  const { amount: _amount, date: _date, treasury: _treasury, desc: _desc, ...rest } = payload;
  const treasury = optionalString(payload, 'treasury');
  const desc = optionalString(payload, 'desc');

  return {
    ...rest,
    date,
    amount,
    ...(treasury ? { treasury } : {}),
    ...(desc ? { desc } : {}),
  };
}

function normalizeFlexibleDateValue(value: unknown, key: string) {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  if (typeof value === 'string' && value.trim()) {
    return readFiniteNumber(value) ?? value.trim();
  }

  const parsed = readFiniteNumber(value);
  if (parsed === undefined) {
    throw new Error(`${key} must be a string or timestamp`);
  }

  return Math.trunc(parsed);
}

function normalizeDocumentTrackingPayload(payload: Record<string, unknown>) {
  const key = optionalString(payload, 'key') || optionalString(payload, 'carrierKey');
  const name = optionalString(payload, 'name') || optionalString(payload, 'carrierName');
  const num = optionalString(payload, 'num') || optionalString(payload, 'trackingNumber');
  const pickUpDate = normalizeFlexibleDateValue(payload.pickUpDate, 'payload.pickUpDate');
  const deliveryDate = normalizeFlexibleDateValue(payload.deliveryDate, 'payload.deliveryDate');
  const notes = optionalString(payload, 'notes');

  if (!key && !name && !num && pickUpDate === undefined && deliveryDate === undefined && !notes) {
    throw new Error(
      'payload must include at least one tracking field such as key, name, num, pickUpDate, deliveryDate, or notes'
    );
  }

  const {
    key: _key,
    carrierKey: _carrierKey,
    name: _name,
    carrierName: _carrierName,
    num: _num,
    trackingNumber: _trackingNumber,
    pickUpDate: _pickUpDate,
    deliveryDate: _deliveryDate,
    notes: _notes,
    ...rest
  } = payload;

  return {
    ...rest,
    ...(key ? { key } : {}),
    ...(name ? { name } : {}),
    ...(num ? { num } : {}),
    ...(pickUpDate !== undefined ? { pickUpDate } : {}),
    ...(deliveryDate !== undefined ? { deliveryDate } : {}),
    ...(notes ? { notes } : {}),
  };
}

function normalizeShipByLinesPayload(payload: Record<string, unknown>) {
  if (!Array.isArray(payload.lines) || payload.lines.length === 0) {
    throw new Error('payload.lines must be a non-empty array');
  }

  const lines = payload.lines.map((line, index) => {
    if (!line || typeof line !== 'object' || Array.isArray(line)) {
      throw new Error(`payload.lines[${index}] must be an object`);
    }
    return line as Record<string, unknown>;
  });

  const { lines: _lines, ...rest } = payload;
  return { ...rest, lines };
}

function normalizeDocumentAttachmentPayload(payload: Record<string, unknown>) {
  return {
    fileName: requiredString(payload, 'fileName'),
    base64: requiredString(payload, 'base64'),
    ...(optionalString(payload, 'contentType')
      ? { contentType: optionalString(payload, 'contentType') }
      : {}),
    ...(typeof payload.setMain === 'boolean' ? { setMain: payload.setMain } : {}),
  };
}

function normalizeProductStockPayload(payload: Record<string, unknown>) {
  if (!payload.stock || typeof payload.stock !== 'object' || Array.isArray(payload.stock)) {
    throw new Error('payload.stock must be an object');
  }

  return payload;
}

/**
 * Detecta el caso "el ID que pasaste no apunta a un recurso accesible". Cubre:
 *   - 404 (Holded confirmó que no existe)
 *   - 400 (Holded rechazó el ID porque está mal formado, p. ej. no es un
 *     ObjectId válido — el revisor de OpenAI pasa cosas como
 *     "test-invalid-id"; sin este caso Holded responde 400 y el route lo
 *     convertía en "Internal MCP error" genérico).
 */
function isHoldedNotFound(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as { status?: number; message?: string };
  if (e.status === 404 || e.status === 400) return true;
  return typeof e.message === 'string' && /\b(?:400|404)\b/.test(e.message);
}

function notFoundResponse(entity: string, id: string) {
  return {
    error: 'not_found' as const,
    entity,
    id,
    message: `${entity} con id "${id}" no existe en Holded o no es accesible con esta API key.`,
  };
}

function hasHistoricalFilters(input: Record<string, unknown>) {
  return (
    input.year !== undefined ||
    (typeof input.from === 'string' && input.from.trim().length > 0) ||
    (typeof input.to === 'string' && input.to.trim().length > 0)
  );
}

const toolHandlers: Record<string, HoldedMcpToolHandler> = {
  async holded_list_invoices(apiKey, input) {
    const args = {
      page: readPage(input),
      limit: readLimit(input),
      status: optionalString(input, 'status'),
      year: optionalYear(input, 'year'),
      from: optionalString(input, 'from'),
      to: optionalString(input, 'to'),
    };

    if (hasHistoricalFilters(input)) {
      const result = await holdedAdapter.listInvoicesHistory(apiKey, args);
      return { items: result.items, history: result.history };
    }

    const items = await holdedAdapter.listInvoices(apiKey, args);

    // Fallback: if the default listInvoices call returns nothing and no
    // explicit filters were provided, retry against the current year via
    // the historical endpoint. This protects POS-01 ("List my latest N
    // invoices") on tenants where Holded's default scope is restrictive.
    if (Array.isArray(items) && items.length === 0) {
      const currentYear = new Date().getUTCFullYear();
      const fallback = await holdedAdapter.listInvoicesHistory(apiKey, {
        ...args,
        year: currentYear,
      });
      if (Array.isArray(fallback.items) && fallback.items.length > 0) {
        return { items: fallback.items, history: fallback.history };
      }
      // Try previous year too — the demo tenant may have been quiet this year.
      const previousYear = currentYear - 1;
      const previousFallback = await holdedAdapter.listInvoicesHistory(apiKey, {
        ...args,
        year: previousYear,
      });
      if (Array.isArray(previousFallback.items) && previousFallback.items.length > 0) {
        return { items: previousFallback.items, history: previousFallback.history };
      }
    }

    return { items };
  },

  async holded_get_invoice(apiKey, input) {
    const idOrNumber = requiredString(input, 'invoiceId');

    // B5 (sesion 7 hardening): smart lookup. Holded tiene 2 identificadores
    // por documento: el `id` interno (cuid de 24 chars hex) y el docNumber
    // visible (ej. "F0030"). ChatGPT casi siempre intenta llamar este tool
    // pasando el docNumber porque es lo que ve en la respuesta de
    // holded_list_invoices. Antes el handler exigia el cuid → 404 desde
    // Holded → respuesta sin contenido → ChatGPT frontend mostraba "Cannot
    // read properties of undefined (reading 'role')" y se quedaba colgado.
    //
    // Logica:
    //   1. Si parece un cuid (24 hex chars) → llamada directa.
    //   2. Si parece un docNumber → listar y matchear, despues llamada con
    //      el id resuelto.
    //   3. Si nada matchea → error claro indicando como buscar.
    if (/^[a-f0-9]{24}$/i.test(idOrNumber)) {
      try {
        const item = await holdedAdapter.getInvoice(apiKey, idOrNumber);
        return { item };
      } catch (err) {
        if (isHoldedNotFound(err)) return notFoundResponse('invoice', idOrNumber);
        throw err;
      }
    }

    type InvoiceLike = {
      id?: string;
      _id?: string;
      docNumber?: string;
      number?: string;
    };

    const matchByDocNumber = (items: unknown): InvoiceLike | undefined => {
      if (!Array.isArray(items)) return undefined;
      return (items as InvoiceLike[]).find(
        (inv) =>
          inv?.docNumber === idOrNumber ||
          inv?.number === idOrNumber ||
          inv?.docNumber?.toLowerCase() === idOrNumber.toLowerCase() ||
          inv?.number?.toLowerCase() === idOrNumber.toLowerCase()
      );
    };

    const defaultList = await holdedAdapter.listInvoices(apiKey, { page: 1, limit: 100 });
    let candidate = matchByDocNumber(defaultList);

    if (!candidate) {
      const currentYear = new Date().getUTCFullYear();
      const historyResult = await holdedAdapter.listInvoicesHistory(apiKey, {
        page: 1,
        limit: 100,
        year: currentYear,
      });
      candidate = matchByDocNumber(historyResult?.items);

      if (!candidate) {
        const previousResult = await holdedAdapter.listInvoicesHistory(apiKey, {
          page: 1,
          limit: 100,
          year: currentYear - 1,
        });
        candidate = matchByDocNumber(previousResult?.items);
      }
    }

    if (!candidate) {
      // Antes lanzábamos `throw new Error(...)`, que el route convertía en
      // "Internal MCP error -32000" por la R4 hardening (no expone mensajes
      // crudos). Devolvemos notFoundResponse para que ChatGPT/Claude vean un
      // resultado MCP normal con `error: not_found` y el id consultado.
      return notFoundResponse('invoice', idOrNumber);
    }

    const resolvedId = candidate.id ?? candidate._id ?? idOrNumber;
    try {
      const item = await holdedAdapter.getInvoice(apiKey, resolvedId);
      return { item };
    } catch (err) {
      if (isHoldedNotFound(err)) return notFoundResponse('invoice', idOrNumber);
      throw err;
    }
  },

  async holded_list_documents(apiKey, input) {
    const args = {
      page: readPage(input),
      limit: readLimit(input),
      status: optionalString(input, 'status'),
      docType: optionalString(input, 'docType'),
      year: optionalYear(input, 'year'),
      from: optionalString(input, 'from'),
      to: optionalString(input, 'to'),
    };

    if (hasHistoricalFilters(input)) {
      const result = await holdedAdapter.listDocumentsHistory(apiKey, args);
      return { items: result.items, history: result.history };
    }

    const items = await holdedAdapter.listDocuments(apiKey, args);
    return { items };
  },

  async holded_get_document(apiKey, input) {
    const docType = requiredString(input, 'docType');
    const documentId = requiredString(input, 'documentId');

    // V3.F.II (auditoría 2026-06-01): mismo smart lookup que holded_get_invoice.
    // Holded mantiene dos identificadores: cuid interno (24 hex) y docNumber
    // visible (ej. "P0045"). ChatGPT/Claude tienden a pasar el docNumber
    // porque es lo que ven en holded_list_documents. Antes daba 404 directo.
    //
    // Logica:
    //   1. Si parece cuid (24 hex) → llamada directa.
    //   2. Si parece docNumber → listar (incluyendo año/año-1) y matchear.
    //   3. Si nada matchea → notFoundResponse legible.
    if (/^[a-f0-9]{24}$/i.test(documentId)) {
      try {
        const item = await holdedAdapter.getDocument(apiKey, docType, documentId);
        return { item };
      } catch (err) {
        if (isHoldedNotFound(err)) return notFoundResponse('document', documentId);
        throw err;
      }
    }

    type DocLike = {
      id?: string;
      _id?: string;
      docNumber?: string;
      number?: string;
    };

    const matchByDocNumber = (items: unknown): DocLike | undefined => {
      if (!Array.isArray(items)) return undefined;
      return (items as DocLike[]).find(
        (doc) =>
          doc?.docNumber === documentId ||
          doc?.number === documentId ||
          doc?.docNumber?.toLowerCase() === documentId.toLowerCase() ||
          doc?.number?.toLowerCase() === documentId.toLowerCase()
      );
    };

    const defaultList = await holdedAdapter.listDocuments(apiKey, {
      page: 1,
      limit: 100,
      docType,
    });
    let candidate = matchByDocNumber(defaultList);

    if (!candidate) {
      const currentYear = new Date().getUTCFullYear();
      const historyResult = await holdedAdapter.listDocumentsHistory(apiKey, {
        page: 1,
        limit: 100,
        docType,
        year: currentYear,
      });
      candidate = matchByDocNumber(historyResult?.items);

      if (!candidate) {
        const previousResult = await holdedAdapter.listDocumentsHistory(apiKey, {
          page: 1,
          limit: 100,
          docType,
          year: currentYear - 1,
        });
        candidate = matchByDocNumber(previousResult?.items);
      }
    }

    if (!candidate) {
      return notFoundResponse('document', documentId);
    }

    const resolvedId = candidate.id ?? candidate._id ?? documentId;
    try {
      const item = await holdedAdapter.getDocument(apiKey, docType, resolvedId);
      return { item };
    } catch (err) {
      if (isHoldedNotFound(err)) return notFoundResponse('document', documentId);
      throw err;
    }
  },

  async holded_create_document(apiKey, input) {
    requireConfirm(input);
    const docType = optionalString(input, 'docType') || 'invoice';
    const payload = requiredPayload(input);
    const created = await holdedAdapter.createDocument(
      apiKey,
      docType,
      normalizeDocumentCreatePayload(payload)
    );
    return { created };
  },

  async holded_update_document(apiKey, input) {
    requireConfirm(input);
    const updated = await holdedAdapter.updateDocument(
      apiKey,
      requiredString(input, 'docType'),
      requiredString(input, 'documentId'),
      requiredPayload(input)
    );
    return { updated };
  },

  async holded_delete_document(apiKey, input) {
    requireConfirm(input);
    const deleted = await holdedAdapter.deleteDocument(
      apiKey,
      requiredString(input, 'docType'),
      requiredString(input, 'documentId')
    );
    return { deleted };
  },

  async holded_send_document(apiKey, input) {
    requireConfirm(input);
    const sent = await holdedAdapter.sendDocument(
      apiKey,
      requiredString(input, 'docType'),
      requiredString(input, 'documentId'),
      normalizeDocumentSendPayload(requiredPayload(input))
    );
    return { sent };
  },

  async holded_get_document_pdf(apiKey, input) {
    const docType = requiredString(input, 'docType');
    const documentId = requiredString(input, 'documentId');

    // V3.G.5 (auditoría 2026-06-01): Holded distingue dos cosas:
    //   1. PDF renderizado del documento (/pdf endpoint, generado del contenido)
    //   2. Archivos adjuntos por el usuario (/attachments endpoint)
    //
    // ANTES solo intentábamos /pdf. Si el documento no tenía PDF renderizado
    // (frecuente en datos demo o purchases del proveedor), devolvíamos
    // `no_attachment` aunque el usuario hubiese subido manualmente el PDF
    // del proveedor en la UI. El reviewer reportó este caso con P250001 en
    // Nova Gestión.
    //
    // AHORA: intentamos /pdf primero. Si falla porque el body no es binario,
    // hacemos fallback a /attachments/list + /attachments/get del primer
    // archivo subido. Si tampoco hay attachments → notFoundResponse legible.
    try {
      const pdf = await holdedAdapter.getDocumentPdf(apiKey, docType, documentId);
      return { pdf, source: 'rendered' };
    } catch (renderedErr) {
      const message = renderedErr instanceof Error ? renderedErr.message : '';
      const looksLikeNoPdf = /non-binary response|no PDF|No attachments/i.test(message);
      if (!looksLikeNoPdf) throw renderedErr;

      // Fallback: PDF/file subido manualmente al documento.
      try {
        const attachments = await holdedAdapter.listDocumentAttachments(
          apiKey,
          docType,
          documentId
        );
        if (attachments.length > 0) {
          // V3.G.7 (2026-06-01): Holded devuelve `attachments` como array de
          // STRINGS (nombres de archivo), NO array de objetos. En V3.G.5 lo
          // trataba como objeto y leía `first.fileName` que daba undefined →
          // fileName quedaba vacío → no se descargaba el adjunto.
          //
          // Verificado empíricamente contra P250001 en Nova Gestión:
          //   `{"status":1,"attachments":["31PTaxInvoice299055226B001260000000235.pdf"]}`
          //
          // Aceptamos ambas formas (string o objeto con fileName/name/filename)
          // por defensa — algunos endpoints Holded podrían devolver objetos
          // (no documentado, mejor curarse en salud).
          const first = attachments[0] as unknown;
          let fileName = '';
          if (typeof first === 'string') {
            fileName = first.trim();
          } else if (first && typeof first === 'object') {
            const obj = first as Record<string, unknown>;
            fileName = String(obj.fileName ?? obj.name ?? obj.filename ?? '').trim();
          }
          if (fileName) {
            const file = await holdedAdapter.getDocumentAttachment(
              apiKey,
              docType,
              documentId,
              fileName
            );
            return { pdf: file, source: 'attachment', attachmentMeta: { fileName } };
          }
        }
      } catch {
        // Si attachments también falla, propagamos el error original.
      }
      throw renderedErr;
    }
  },

  async holded_update_document_tracking(apiKey, input) {
    requireConfirm(input);
    const updated = await holdedAdapter.updateDocumentTracking(
      apiKey,
      requiredEnumString(input, 'docType', ['salesorder', 'waybill']),
      requiredString(input, 'documentId'),
      normalizeDocumentTrackingPayload(requiredPayload(input))
    );
    return { updated };
  },

  async holded_update_document_pipeline(apiKey, input) {
    requireConfirm(input);
    const updated = await holdedAdapter.updateDocumentPipeline(
      apiKey,
      requiredString(input, 'docType'),
      requiredString(input, 'documentId'),
      requiredString(input, 'pipeline')
    );
    return { updated };
  },

  async holded_ship_document_all_items(apiKey, input) {
    requireConfirm(input);
    const shipped = await holdedAdapter.shipDocumentAllItems(
      apiKey,
      requiredString(input, 'documentId')
    );
    return { shipped };
  },

  async holded_ship_document_by_lines(apiKey, input) {
    requireConfirm(input);
    const shipped = await holdedAdapter.shipDocumentByLines(
      apiKey,
      requiredString(input, 'documentId'),
      normalizeShipByLinesPayload(requiredPayload(input))
    );
    return { shipped };
  },

  async holded_get_document_shipped_items(apiKey, input) {
    const items = await holdedAdapter.getDocumentShippedItems(
      apiKey,
      requiredEnumString(input, 'docType', ['salesorder', 'order']),
      requiredString(input, 'documentId')
    );
    return { items };
  },

  async holded_attach_document_file(apiKey, input) {
    requireConfirm(input);
    const attached = await holdedAdapter.attachDocumentFile(
      apiKey,
      requiredString(input, 'docType'),
      requiredString(input, 'documentId'),
      normalizeDocumentAttachmentPayload(requiredPayload(input))
    );
    return { attached };
  },

  async holded_list_contacts(apiKey, input) {
    const typeRaw = optionalString(input, 'type');
    const type =
      typeRaw === 'client' || typeRaw === 'supplier' || typeRaw === 'lead' ? typeRaw : undefined;
    const items = await holdedAdapter.listContacts(apiKey, {
      page: readPage(input),
      limit: readLimit(input),
      name: optionalString(input, 'name'),
      type,
    });
    return { items };
  },

  async holded_get_contact(apiKey, input) {
    const contactId = requiredString(input, 'contactId');
    // V3.F (auditoría 2026-06-01): los contact IDs que vienen embebidos en
    // documentos (campo `contact` de /documents/{type}/{id}) NO siempre son
    // resolubles vía /contacts/{id} — Holded mantiene IDs internos legacy
    // de versiones históricas del contacto que difieren de los IDs vivos
    // del CRM. El docNumber/contactName es estable; el ID no.
    //
    // Fallback en cadena cuando el lookup directo da 404:
    //   1. Si el caller pasó `contactName` o `name` como hint, buscarlo vía
    //      listContacts({name}) y devolver la primera coincidencia exacta.
    //   2. Si no hay name, retornar un notFoundResponse explícito que
    //      indique al modelo que llame holded_list_contacts y vuelva con
    //      un contactId fresco.
    try {
      const item = await holdedAdapter.getContact(apiKey, contactId);
      return { item };
    } catch (err) {
      if (!isHoldedNotFound(err)) throw err;

      const fallbackName =
        optionalString(input, 'contactName') ?? optionalString(input, 'name');
      if (fallbackName && fallbackName.trim().length > 0) {
        const name = fallbackName.trim();
        const matches = await holdedAdapter.listContacts(apiKey, { page: 1, name });
        const items: Array<Record<string, unknown>> = Array.isArray(matches)
          ? (matches as Array<Record<string, unknown>>)
          : [];
        const exact = items.find(
          (c) => typeof c.name === 'string' && c.name.toLowerCase() === name.toLowerCase()
        );
        const chosen = exact ?? items[0];
        if (chosen) return { item: chosen };
      }

      return notFoundResponse('contact', contactId);
    }
  },

  async holded_list_contact_attachments(apiKey, input) {
    const items = await holdedAdapter.listContactAttachments(
      apiKey,
      requiredString(input, 'contactId')
    );
    return { items };
  },

  async holded_get_contact_attachment(apiKey, input) {
    const contactId = requiredString(input, 'contactId');
    const fileName = requiredString(input, 'fileName');
    try {
      const attachment = await holdedAdapter.getContactAttachment(apiKey, contactId, fileName);
      return { attachment };
    } catch (err) {
      if (isHoldedNotFound(err))
        return notFoundResponse('contact_attachment', `${contactId}/${fileName}`);
      throw err;
    }
  },

  async holded_create_contact(apiKey, input) {
    requireConfirm(input);
    const created = await holdedAdapter.createContact(apiKey, requiredPayload(input));
    return { created };
  },

  async holded_update_contact(apiKey, input) {
    requireConfirm(input);
    const updated = await holdedAdapter.updateContact(
      apiKey,
      requiredString(input, 'contactId'),
      requiredPayload(input)
    );
    return { updated };
  },

  async holded_delete_contact(apiKey, input) {
    requireConfirm(input);
    const deleted = await holdedAdapter.deleteContact(apiKey, requiredString(input, 'contactId'));
    return { deleted };
  },

  async holded_list_treasury_accounts(apiKey) {
    const items = await holdedAdapter.listTreasuryAccounts(apiKey);
    return { items };
  },

  async holded_get_treasury_account(apiKey, input) {
    const treasuryAccountId = requiredString(input, 'treasuryAccountId');
    try {
      const item = await holdedAdapter.getTreasuryAccount(apiKey, treasuryAccountId);
      return { item };
    } catch (err) {
      if (isHoldedNotFound(err)) return notFoundResponse('treasury_account', treasuryAccountId);
      throw err;
    }
  },

  async holded_create_treasury_account(apiKey, input) {
    requireConfirm(input);
    const created = await holdedAdapter.createTreasuryAccount(apiKey, requiredPayload(input));
    return { created };
  },

  async holded_update_treasury_account(apiKey, input) {
    requireConfirm(input);
    const updated = await holdedAdapter.updateTreasuryAccount(
      apiKey,
      requiredString(input, 'treasuryAccountId'),
      requiredPayload(input)
    );
    return { updated };
  },

  async holded_list_expense_accounts(apiKey, input) {
    const items = await holdedAdapter.listExpenseAccounts(apiKey, {
      page: readPage(input),
      limit: readLimit(input),
    });
    return { items };
  },

  async holded_get_expense_account(apiKey, input) {
    const expenseAccountId = requiredString(input, 'expenseAccountId');
    try {
      const item = await holdedAdapter.getExpenseAccount(apiKey, expenseAccountId);
      return { item };
    } catch (err) {
      if (isHoldedNotFound(err)) return notFoundResponse('expense_account', expenseAccountId);
      throw err;
    }
  },

  async holded_create_expense_account(apiKey, input) {
    requireConfirm(input);
    const created = await holdedAdapter.createExpenseAccount(apiKey, requiredPayload(input));
    return { created };
  },

  async holded_update_expense_account(apiKey, input) {
    requireConfirm(input);
    const updated = await holdedAdapter.updateExpenseAccount(
      apiKey,
      requiredString(input, 'expenseAccountId'),
      requiredPayload(input)
    );
    return { updated };
  },

  async holded_delete_expense_account(apiKey, input) {
    requireConfirm(input);
    const deleted = await holdedAdapter.deleteExpenseAccount(
      apiKey,
      requiredString(input, 'expenseAccountId')
    );
    return { deleted };
  },

  async holded_list_numbering_series(apiKey, input) {
    const items = await holdedAdapter.listNumberingSeries(
      apiKey,
      requiredString(input, 'seriesType')
    );
    return { items };
  },

  async holded_create_numbering_series(apiKey, input) {
    requireConfirm(input);
    const created = await holdedAdapter.createNumberingSeries(
      apiKey,
      requiredString(input, 'seriesType'),
      requiredPayload(input)
    );
    return { created };
  },

  async holded_update_numbering_series(apiKey, input) {
    requireConfirm(input);
    const updated = await holdedAdapter.updateNumberingSeries(
      apiKey,
      requiredString(input, 'seriesType'),
      requiredString(input, 'seriesId'),
      requiredPayload(input)
    );
    return { updated };
  },

  async holded_delete_numbering_series(apiKey, input) {
    requireConfirm(input);
    const deleted = await holdedAdapter.deleteNumberingSeries(
      apiKey,
      requiredString(input, 'seriesType'),
      requiredString(input, 'seriesId')
    );
    return { deleted };
  },

  async holded_list_products(apiKey, input) {
    const items = await holdedAdapter.listProducts(apiKey, {
      page: readPage(input),
      limit: readLimit(input),
    });
    return { items };
  },

  async holded_get_product(apiKey, input) {
    const productId = requiredString(input, 'productId');
    try {
      const item = await holdedAdapter.getProduct(apiKey, productId);
      return { item };
    } catch (err) {
      if (isHoldedNotFound(err)) return notFoundResponse('product', productId);
      throw err;
    }
  },

  async holded_get_product_main_image(apiKey, input) {
    const productId = requiredString(input, 'productId');
    try {
      const image = await holdedAdapter.getProductMainImage(apiKey, productId);
      return { image };
    } catch (err) {
      if (isHoldedNotFound(err)) return notFoundResponse('product', productId);
      throw err;
    }
  },

  async holded_list_product_images(apiKey, input) {
    const items = await holdedAdapter.listProductImages(apiKey, requiredString(input, 'productId'));
    return { items };
  },

  async holded_get_product_secondary_image(apiKey, input) {
    const productId = requiredString(input, 'productId');
    const imageFileName = requiredString(input, 'imageFileName');
    try {
      const image = await holdedAdapter.getProductSecondaryImage(apiKey, productId, imageFileName);
      return { image };
    } catch (err) {
      if (isHoldedNotFound(err)) return notFoundResponse('product', productId);
      throw err;
    }
  },

  async holded_update_product_stock(apiKey, input) {
    requireConfirm(input);
    const updated = await holdedAdapter.updateProductStock(
      apiKey,
      requiredString(input, 'productId'),
      normalizeProductStockPayload(requiredPayload(input))
    );
    return { updated };
  },

  async holded_create_product(apiKey, input) {
    requireConfirm(input);
    const created = await holdedAdapter.createProduct(apiKey, requiredPayload(input));
    return { created };
  },

  async holded_update_product(apiKey, input) {
    requireConfirm(input);
    const updated = await holdedAdapter.updateProduct(
      apiKey,
      requiredString(input, 'productId'),
      requiredPayload(input)
    );
    return { updated };
  },

  async holded_delete_product(apiKey, input) {
    requireConfirm(input);
    const deleted = await holdedAdapter.deleteProduct(apiKey, requiredString(input, 'productId'));
    return { deleted };
  },

  async holded_list_sales_channels(apiKey, input) {
    const items = await holdedAdapter.listSalesChannels(apiKey, {
      page: readPage(input),
      limit: readLimit(input),
    });
    return { items };
  },

  async holded_get_sales_channel(apiKey, input) {
    const salesChannelId = requiredString(input, 'salesChannelId');
    try {
      const item = await holdedAdapter.getSalesChannel(apiKey, salesChannelId);
      return { item };
    } catch (err) {
      if (isHoldedNotFound(err)) return notFoundResponse('sales_channel', salesChannelId);
      throw err;
    }
  },

  async holded_create_sales_channel(apiKey, input) {
    requireConfirm(input);
    const created = await holdedAdapter.createSalesChannel(apiKey, requiredPayload(input));
    return { created };
  },

  async holded_update_sales_channel(apiKey, input) {
    requireConfirm(input);
    const updated = await holdedAdapter.updateSalesChannel(
      apiKey,
      requiredString(input, 'salesChannelId'),
      requiredPayload(input)
    );
    return { updated };
  },

  async holded_delete_sales_channel(apiKey, input) {
    requireConfirm(input);
    const deleted = await holdedAdapter.deleteSalesChannel(
      apiKey,
      requiredString(input, 'salesChannelId')
    );
    return { deleted };
  },

  async holded_list_warehouses(apiKey, input) {
    const items = await holdedAdapter.listWarehouses(apiKey, {
      page: readPage(input),
      limit: readLimit(input),
    });
    return { items };
  },

  async holded_get_warehouse(apiKey, input) {
    const warehouseId = requiredString(input, 'warehouseId');
    try {
      const item = await holdedAdapter.getWarehouse(apiKey, warehouseId);
      return { item };
    } catch (err) {
      if (isHoldedNotFound(err)) return notFoundResponse('warehouse', warehouseId);
      throw err;
    }
  },

  async holded_list_warehouse_stock(apiKey, input) {
    const items = await holdedAdapter.listWarehouseStock(
      apiKey,
      requiredString(input, 'warehouseId')
    );
    return { items };
  },

  async holded_create_warehouse(apiKey, input) {
    requireConfirm(input);
    const created = await holdedAdapter.createWarehouse(apiKey, requiredPayload(input));
    return { created };
  },

  async holded_update_warehouse(apiKey, input) {
    requireConfirm(input);
    const updated = await holdedAdapter.updateWarehouse(
      apiKey,
      requiredString(input, 'warehouseId'),
      requiredPayload(input)
    );
    return { updated };
  },

  async holded_delete_warehouse(apiKey, input) {
    requireConfirm(input);
    const deleted = await holdedAdapter.deleteWarehouse(
      apiKey,
      requiredString(input, 'warehouseId')
    );
    return { deleted };
  },

  async holded_list_payments(apiKey, input) {
    const items = await holdedAdapter.listPayments(apiKey, {
      page: readPage(input),
      limit: readLimit(input),
      starttmp: optionalUnixTimestamp(input, 'startTimestamp'),
      endtmp: optionalUnixTimestamp(input, 'endTimestamp'),
    });
    return { items };
  },

  async holded_get_payment(apiKey, input) {
    const paymentId = requiredString(input, 'paymentId');
    try {
      const item = await holdedAdapter.getPayment(apiKey, paymentId);
      return { item };
    } catch (err) {
      if (isHoldedNotFound(err)) return notFoundResponse('payment', paymentId);
      throw err;
    }
  },

  async holded_create_payment(apiKey, input) {
    requireConfirm(input);
    const created = await holdedAdapter.createPayment(apiKey, requiredPayload(input));
    return { created };
  },

  async holded_update_payment(apiKey, input) {
    requireConfirm(input);
    const updated = await holdedAdapter.updatePayment(
      apiKey,
      requiredString(input, 'paymentId'),
      requiredPayload(input)
    );
    return { updated };
  },

  async holded_delete_payment(apiKey, input) {
    requireConfirm(input);
    const deleted = await holdedAdapter.deletePayment(apiKey, requiredString(input, 'paymentId'));
    return { deleted };
  },

  async holded_pay_document(apiKey, input) {
    requireConfirm(input);
    const paid = await holdedAdapter.payDocument(
      apiKey,
      requiredString(input, 'docType'),
      requiredString(input, 'documentId'),
      normalizePayDocumentPayload(requiredPayload(input))
    );
    return { paid };
  },

  async holded_list_taxes(apiKey) {
    const items = await holdedAdapter.listTaxes(apiKey);
    return { items };
  },

  async holded_list_payment_methods(apiKey) {
    const items = await holdedAdapter.listPaymentMethods(apiKey);
    return { items };
  },

  async holded_list_contact_groups(apiKey, input) {
    const items = await holdedAdapter.listContactGroups(apiKey, {
      page: readPage(input),
      limit: readLimit(input),
    });
    return { items };
  },

  async holded_get_contact_group(apiKey, input) {
    const contactGroupId = requiredString(input, 'contactGroupId');
    try {
      const item = await holdedAdapter.getContactGroup(apiKey, contactGroupId);
      return { item };
    } catch (err) {
      if (isHoldedNotFound(err)) return notFoundResponse('contact_group', contactGroupId);
      throw err;
    }
  },

  async holded_create_contact_group(apiKey, input) {
    requireConfirm(input);
    const created = await holdedAdapter.createContactGroup(apiKey, requiredPayload(input));
    return { created };
  },

  async holded_update_contact_group(apiKey, input) {
    requireConfirm(input);
    const updated = await holdedAdapter.updateContactGroup(
      apiKey,
      requiredString(input, 'contactGroupId'),
      requiredPayload(input)
    );
    return { updated };
  },

  async holded_delete_contact_group(apiKey, input) {
    requireConfirm(input);
    const deleted = await holdedAdapter.deleteContactGroup(
      apiKey,
      requiredString(input, 'contactGroupId')
    );
    return { deleted };
  },

  async holded_list_remittances(apiKey) {
    const items = await holdedAdapter.listRemittances(apiKey);
    return { items };
  },

  async holded_get_remittance(apiKey, input) {
    const remittanceId = requiredString(input, 'remittanceId');
    try {
      const item = await holdedAdapter.getRemittance(apiKey, remittanceId);
      return { item };
    } catch (err) {
      if (isHoldedNotFound(err)) return notFoundResponse('remittance', remittanceId);
      throw err;
    }
  },

  async holded_list_services(apiKey, input) {
    const items = await holdedAdapter.listServices(apiKey, {
      page: readPage(input),
      limit: readLimit(input),
    });
    return { items };
  },

  async holded_get_service(apiKey, input) {
    const serviceId = requiredString(input, 'serviceId');
    try {
      const item = await holdedAdapter.getService(apiKey, serviceId);
      return { item };
    } catch (err) {
      if (isHoldedNotFound(err)) return notFoundResponse('service', serviceId);
      throw err;
    }
  },

  async holded_create_service(apiKey, input) {
    requireConfirm(input);
    const created = await holdedAdapter.createService(apiKey, requiredPayload(input));
    return { created };
  },

  async holded_update_service(apiKey, input) {
    requireConfirm(input);
    const updated = await holdedAdapter.updateService(
      apiKey,
      requiredString(input, 'serviceId'),
      requiredPayload(input)
    );
    return { updated };
  },

  async holded_delete_service(apiKey, input) {
    requireConfirm(input);
    const deleted = await holdedAdapter.deleteService(apiKey, requiredString(input, 'serviceId'));
    return { deleted };
  },

  async holded_list_employees(apiKey, input) {
    const items = await holdedAdapter.listEmployees(apiKey, {
      page: readPage(input),
      limit: readLimit(input),
    });
    return { items };
  },

  async holded_get_employee(apiKey, input) {
    const employeeId = requiredString(input, 'employeeId');
    try {
      const item = await holdedAdapter.getEmployee(apiKey, employeeId);
      return { item };
    } catch (err) {
      if (isHoldedNotFound(err)) return notFoundResponse('employee', employeeId);
      throw err;
    }
  },

  async holded_create_employee(apiKey, input) {
    requireConfirm(input);
    const created = await holdedAdapter.createEmployee(apiKey, requiredPayload(input));
    return { created };
  },

  async holded_update_employee(apiKey, input) {
    requireConfirm(input);
    const updated = await holdedAdapter.updateEmployee(
      apiKey,
      requiredString(input, 'employeeId'),
      requiredPayload(input)
    );
    return { updated };
  },

  async holded_clock_in_employee(apiKey, input) {
    requireConfirm(input);
    const clockIn = await holdedAdapter.clockInEmployee(
      apiKey,
      requiredString(input, 'employeeId'),
      optionalPayload(input)
    );
    return { clockIn };
  },

  async holded_clock_out_employee(apiKey, input) {
    requireConfirm(input);
    const clockOut = await holdedAdapter.clockOutEmployee(
      apiKey,
      requiredString(input, 'employeeId'),
      optionalPayload(input)
    );
    return { clockOut };
  },

  async holded_list_daily_ledger(apiKey, input) {
    // Accepts either Unix timestamps (startTimestamp/endTimestamp) or ISO dates
    // (startDate/endDate, format YYYY-MM-DD). ChatGPT produces ISO dates more
    // reliably than Unix seconds — this avoids the OpenAI POS-06 review failure
    // where the model had to compute timestamps mentally and could get them wrong.
    const starttmp = resolveDateInput(input, {
      timestampKey: 'startTimestamp',
      dateKey: 'startDate',
      required: true,
    });
    const endtmp = resolveDateInput(input, {
      timestampKey: 'endTimestamp',
      dateKey: 'endDate',
      required: true,
      endOfDay: true,
    });
    const items = await holdedAdapter.listDailyLedger(apiKey, {
      page: readPage(input),
      limit: readLimit(input),
      starttmp: starttmp!,
      endtmp: endtmp!,
    });
    return { items };
  },

  async holded_list_accounts(apiKey, input) {
    // El plan contable español (PGC) puede tener cientos de cuentas — el tenant
    // de demo devuelve ~206 con includeEmpty=1. Antes la paginación solo se
    // activaba si el caller pasaba page/limit, así que una llamada sin args
    // devolvía las 206 cuentas enteras dentro de structuredContent y ChatGPT
    // rechazaba el payload. Ahora paginamos SIEMPRE con defaults (page 1,
    // limit 25); el caller puede pedir más con page/limit explícitos.
    //
    // V3.G.2 (2026-06-01): acepta tambien ISO dates startDate/endDate, mas
    // intuitivas para ChatGPT/Claude que los Unix timestamps. Necesarios
    // para scopear el balance a un ejercicio fiscal especifico — sin esto
    // Holded usa el rango default del tenant que casi nunca cuadra.
    const starttmp =
      resolveDateInput(input, {
        timestampKey: 'startTimestamp',
        dateKey: 'startDate',
        required: false,
      }) ?? undefined;
    const endtmp =
      resolveDateInput(input, {
        timestampKey: 'endTimestamp',
        dateKey: 'endDate',
        required: false,
        endOfDay: true,
      }) ?? undefined;
    const items = await holdedAdapter.listAccounts(apiKey, {
      page: readPage(input),
      limit: readLimit(input),
      starttmp,
      endtmp,
      includeEmpty: optionalBoolean(input, 'includeEmpty', true),
    });
    return { items };
  },

  async holded_create_daily_ledger_entry(apiKey, input) {
    requireConfirm(input);
    const created = await holdedAdapter.createDailyLedgerEntry(
      apiKey,
      normalizeDailyLedgerEntryPayload(requiredPayload(input))
    );
    return { created };
  },

  async holded_create_accounting_account(apiKey, input) {
    requireConfirm(input);
    const created = await holdedAdapter.createAccountingAccount(
      apiKey,
      normalizeAccountingAccountPayload(requiredPayload(input))
    );
    return { created };
  },

  async holded_list_bookings(apiKey, input) {
    const items = await holdedAdapter.listBookings(apiKey, {
      page: readPage(input),
      limit: readLimit(input),
    });
    return { items };
  },

  async holded_list_crm_funnels(apiKey) {
    const items = await holdedAdapter.listCrmFunnels(apiKey);
    return { items };
  },

  async holded_list_leads(apiKey, input) {
    const items = await holdedAdapter.listLeads(apiKey, {
      page: readPage(input),
      limit: readLimit(input),
      funnelId: optionalString(input, 'funnelId'),
    });
    return { items };
  },

  async holded_list_time_records(apiKey, input) {
    const items = await holdedAdapter.listProjectTimeRecords(
      apiKey,
      requiredString(input, 'projectId'),
      {
        page: readPage(input),
        limit: readLimit(input),
      }
    );
    return { items };
  },

  async holded_list_projects(apiKey, input) {
    const items = await holdedAdapter.listProjects(apiKey, {
      page: readPage(input),
      limit: readLimit(input),
    });
    return { items };
  },

  async holded_get_project(apiKey, input) {
    const projectId = requiredString(input, 'projectId');
    try {
      const item = await holdedAdapter.getProject(apiKey, projectId);
      return { item };
    } catch (err) {
      if (isHoldedNotFound(err)) return notFoundResponse('project', projectId);
      throw err;
    }
  },

  async holded_list_project_tasks(apiKey, input) {
    const projectId = requiredString(input, 'projectId');
    try {
      const items = await holdedAdapter.listProjectTasks(apiKey, projectId, {
        page: readPage(input),
        limit: readLimit(input),
      });
      return { items };
    } catch (err) {
      // El projectId puede ser inválido o inexistente — devolvemos un not_found
      // legible en vez de dejar que el route lo convierta en "Internal MCP error".
      if (isHoldedNotFound(err)) return notFoundResponse('project', projectId);
      throw err;
    }
  },

  async holded_create_invoice_draft(apiKey, input) {
    requireConfirm(input);
    const docType = optionalString(input, 'docType') || 'invoice';

    // Accept BOTH the legacy nested shape (input.payload = {...}) and a flat
    // shape where contactId, contactName, subject, lines, date live at the top
    // level. ChatGPT review prompts produce the flat shape more reliably; the
    // nested wrapper was a frequent failure mode in the OpenAI POS-07B test.
    let payload: Record<string, unknown>;
    if (input.payload && typeof input.payload === 'object' && !Array.isArray(input.payload)) {
      payload = input.payload as Record<string, unknown>;
    } else {
      const flat: Record<string, unknown> = {};
      const keys = [
        'contactId',
        'contactName',
        'subject',
        'desc',
        'date',
        'dueDate',
        'lines',
        'products',
        'items',
        'currency',
        'language',
        'notes',
      ] as const;
      for (const key of keys) {
        if (input[key] !== undefined) flat[key] = input[key];
      }
      // Bare convenience: if the caller provided a single line at the top
      // level (desc, units, price, tax) without wrapping in lines[], wrap it.
      if (
        !flat.lines &&
        !flat.products &&
        !flat.items &&
        (input.desc !== undefined ||
          input.units !== undefined ||
          input.price !== undefined ||
          input.tax !== undefined)
      ) {
        flat.lines = [
          {
            desc: input.desc,
            units: input.units,
            price: input.price,
            tax: input.tax,
          },
        ];
      }
      payload = flat;
    }

    // contactName → contactId resolution: if the caller gave us a name but no
    // id, try to find the contact via search. This makes ChatGPT's life much
    // easier — it can pass "Kappa Digital Zaragoza SL" instead of needing to
    // call holded_list_contacts first to grab an opaque mongo id.
    //
    // V3.G.9 (2026-06-01) — defensa contra MISMATCH:
    // Si el modelo pasa BOTH contactId Y contactName y los dos NO coinciden
    // (el id resuelve a un contacto cuyo nombre no contiene/no es el nombre
    // dado), throw "contact_id_name_mismatch". Esto cubre casos donde
    // ChatGPT contamina contexto desde conversaciones anteriores y manda
    // un contactId de otro cliente con un contactName distinto.
    //
    // CASO QUE NO CUBRE: si el modelo manda contactId+contactName que SÍ
    // coinciden entre sí (los dos son "Beta" en este ejemplo) pero el
    // usuario pidió otro cliente ("Alfa"), no podemos detectarlo desde
    // el backend porque no conocemos la intención del usuario. La
    // mitigación de ese caso es la tarjeta de consent (el usuario ve
    // "Beta" y deniega) + las descriptions explícitas que añadimos.
    if (
      typeof payload.contactId === 'string' &&
      payload.contactId.trim() &&
      typeof payload.contactName === 'string' &&
      payload.contactName.trim()
    ) {
      const declaredName = payload.contactName.trim();
      try {
        const resolved = (await holdedAdapter.getContact(
          apiKey,
          payload.contactId.trim()
        )) as Record<string, unknown> | null;
        const canonicalName =
          resolved && typeof resolved.name === 'string' ? resolved.name : '';
        const matches =
          canonicalName.toLowerCase() === declaredName.toLowerCase() ||
          canonicalName.toLowerCase().includes(declaredName.toLowerCase()) ||
          declaredName.toLowerCase().includes(canonicalName.toLowerCase());
        if (canonicalName && !matches) {
          throw new HoldedUserError(
            'contact_id_name_mismatch',
            `The provided contactId resolves to "${canonicalName}" but contactName was "${declaredName}". These look like different contacts — please verify which one you intended (the contactId may be stale from a previous conversation). To proceed, pass ONLY contactName="${declaredName}" and the connector will resolve it freshly, OR pass ONLY the contactId you trust.`
          );
        }
        // Match confirmado — sobrescribimos contactName con el canónico para
        // que el consent card muestre el nombre exacto que Holded tiene.
        if (canonicalName) {
          payload.contactName = canonicalName;
        }
      } catch (err) {
        if (err instanceof HoldedUserError) throw err;
        // getContact falló (404 u otro). Asumimos que el id es legacy y
        // hacemos fallback a resolución por nombre.
        payload.contactId = '';
      }
    }

    if (
      (typeof payload.contactId !== 'string' || !payload.contactId.trim()) &&
      typeof payload.contactName === 'string' &&
      payload.contactName.trim()
    ) {
      const name = payload.contactName.trim();
      const matches = await holdedAdapter.listContacts(apiKey, { page: 1, name });
      const items: Array<Record<string, unknown>> = Array.isArray(matches)
        ? (matches as Array<Record<string, unknown>>)
        : [];

      // V3.G.4 (2026-06-01) — BUG CRÍTICO arreglado:
      //
      // ANTES: `const chosen = exact ?? items[0]` — si no había match exacto
      // por nombre, cogíamos el primer contacto que Holded devolviese. Holded
      // /contacts ordena por insertion order (no por relevancia al filtro),
      // así que para el prompt "Alfa Retail Madrid SL" Holded podía devolver
      // "Beta Eventos Barcelona SL" como items[0] y ese era el cliente al
      // que se creaba la factura. EL USUARIO confirmó en producción contra
      // Nova Gestion SL: factura del cliente equivocado creada en Holded.
      //
      // AHORA: solo aceptamos:
      //   1) Match EXACTO por nombre (case-insensitive).
      //   2) Match parcial UNICO: solo 1 contacto contiene el nombre.
      //
      // Cualquier otro caso (0 matches, múltiples partials no exactos) →
      // HoldedUserError con un mensaje claro que el modelo puede mostrar al
      // usuario para que confirme cuál es el contacto correcto antes de
      // reintentar. Mejor "no encontré, ¿cuál?" que "creé para otro cliente".
      const exact = items.find(
        (c) => typeof c.name === 'string' && c.name.toLowerCase() === name.toLowerCase()
      );
      let chosen: Record<string, unknown> | undefined = exact;
      if (!chosen) {
        const partialMatches = items.filter(
          (c) =>
            typeof c.name === 'string' &&
            c.name.toLowerCase().includes(name.toLowerCase())
        );
        if (partialMatches.length === 1) {
          chosen = partialMatches[0];
        } else if (partialMatches.length > 1) {
          const sample = partialMatches
            .slice(0, 5)
            .map((c) => `"${c.name}"`)
            .join(', ');
          throw new HoldedUserError(
            'contact_ambiguous',
            `Multiple Holded contacts match "${name}": ${sample}. Please specify the exact contact name or pass the contactId from holded_list_contacts to disambiguate.`
          );
        }
      }
      const chosenId = chosen?.id ?? chosen?._id;
      if (typeof chosenId === 'string' && chosenId.trim()) {
        payload.contactId = chosenId.trim();
        // V3.G.4: sobrescribimos contactName con el nombre canónico del
        // contacto encontrado, para que el ChatGPT consent card muestre el
        // nombre real al usuario (en vez del que escribió, que puede ser
        // un alias o variante). Si el usuario ve "Beta Eventos Barcelona"
        // en la card cuando escribió "Alfa Retail Madrid", sabe que algo
        // no cuadra y deniega.
        if (typeof chosen?.name === 'string') {
          payload.contactName = chosen.name;
        }
      } else {
        throw new HoldedUserError(
          'contact_not_found',
          `No Holded contact found matching "${name}". Please verify the customer name (case-insensitive exact match is required when partial matches are ambiguous) or call holded_list_contacts first and pass the contactId explicitly.`
        );
      }
    }

    const normalizedPayload = normalizeDocumentCreatePayload(payload);
    const wireBody = {
      ...normalizedPayload,
      approveDoc: false,
    };

    // V3.G.13 diagnóstico (2026-06-03): log granular del body que vamos a
    // mandar a Holded para diagnosticar por qué los drafts entran sin
    // líneas pese a V3.G.12. Una línea por campo crítico — la vista
    // tabular de Vercel Logs trunca, así esto sale legible.
    console.info(
      `[create_invoice_draft] wire body — keys=${Object.keys(wireBody).join(',')}`
    );
    console.info(
      `[create_invoice_draft] wire body — contactId=${String(wireBody.contactId ?? '')}`
    );
    console.info(
      `[create_invoice_draft] wire body — lines count=${
        Array.isArray((wireBody as { lines?: unknown[] }).lines)
          ? (wireBody as { lines: unknown[] }).lines.length
          : 0
      }`
    );
    console.info(
      `[create_invoice_draft] wire body — lines[0]=${JSON.stringify(
        ((wireBody as { lines?: unknown[] }).lines || [])[0] ?? null
      )}`
    );

    const createResponse = await holdedAdapter.createDocument(apiKey, docType, wireBody);

    // Log de la respuesta del POST.
    const createdShape = createResponse as {
      id?: string;
      products?: unknown[];
      subtotal?: number;
      total?: number;
    };
    console.info(
      `[create_invoice_draft] holded POST — id=${String(createdShape.id ?? '')} products.length=${
        Array.isArray(createdShape.products) ? createdShape.products.length : 'n/a'
      } subtotal=${String(createdShape.subtotal ?? 'n/a')} total=${String(
        createdShape.total ?? 'n/a'
      )}`
    );

    // V3.G.14 (2026-06-03) — WORKAROUND del quirk Holded.
    //
    // Verificado contra el tenant Nova Gestión: POST /documents/{type} con
    // `approveDoc:false` crea el shell pero DESCARTA las líneas. El draft
    // sale con products:[], subtotal:0, total:0 aunque mandemos lines con
    // desc/units/price/tax idéntico al seed que sí funciona (sin approveDoc).
    //
    // Workaround respeta la policy "approveDoc:false hardcoded a wire": NO
    // aprobamos el documento en ningún momento. Solo añadimos un segundo
    // round-trip PUT con los products ahora que el shell existe. Holded
    // acepta PUT sobre drafts y persiste las líneas correctamente.
    //
    // Si el PUT falla, devolvemos el create response sin bloquear — el
    // usuario podrá completar manualmente en Holded UI.
    const newDocId =
      typeof createdShape.id === 'string' ? createdShape.id : null;
    const linesArr =
      Array.isArray((wireBody as { lines?: unknown[] }).lines)
        ? (wireBody as { lines: unknown[] }).lines
        : [];

    let created: unknown = createResponse;
    if (newDocId && linesArr.length > 0) {
      try {
        // V3.G.15 — PUT con `products` (key del GET), body completo, lines de backup.
        const updateResp = await holdedAdapter.updateDocument(apiKey, docType, newDocId, {
          contactId: (wireBody as { contactId?: string }).contactId,
          date: (wireBody as { date?: unknown }).date,
          products: linesArr,
          lines: linesArr,
        });
        const updatedShape = updateResp as {
          products?: unknown[];
          subtotal?: number;
          total?: number;
        };
        console.info(
          `[create_invoice_draft] holded PUT update — products.length=${
            Array.isArray(updatedShape.products) ? updatedShape.products.length : 'n/a'
          } subtotal=${String(updatedShape.subtotal ?? 'n/a')} total=${String(
            updatedShape.total ?? 'n/a'
          )}`
        );
        created =
          updateResp && typeof updateResp === 'object'
            ? { ...(createResponse as Record<string, unknown>), ...(updateResp as Record<string, unknown>) }
            : createResponse;
      } catch (err) {
        console.warn('[create_invoice_draft] PUT update lines failed', {
          documentId: newDocId,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    return { created };
  },
};

export const holdedMcpTools: HoldedMcpToolDefinition[] = [
  readTool(
    'holded_list_invoices',
    'List invoices in Holded',
    'List SALES invoice documents (issued invoices, Holded docType=invoice) for the currently authorized tenant. ' +
      'BEHAVIOR: if the default scope returns 0 invoices (tenant has restrictive default scope), the connector automatically retries against the current year and then the previous year via Holded history. So an empty result means the tenant truly has no invoices in recent history, not a connector failure. ' +
      'Use `year` or explicit `from`/`to` ISO dates only when you need OLDER history (e.g. 2024). ' +
      'This tool does NOT list received supplier invoices: for PURCHASES / SUPPLIER BILLS / EXPENSES call `holded_list_documents` with `docType: "purchase"`.',
    listSchema({
      status: stringProperty(
        'Optional Holded invoice status filter, if supported by the tenant account.'
      ),
      year: yearProperty,
      from: isoDateProperty,
      to: isoDateProperty,
    }),
    listOutputSchema(holdedInvoiceItemSchema)
  ),
  readTool(
    'holded_get_invoice',
    'Get one invoice from Holded',
    // B5 (sesion 7 hardening): description actualizada para que ChatGPT
    // entienda que puede pasar tanto el id interno (cuid 24 hex) como el
    // docNumber visible (e.g. "F0030"). El handler resuelve el lookup
    // automaticamente.
    'Retrieve a single invoice document from Holded. Accepts EITHER the internal Holded invoice id (a 24-character hex string returned by a previous listing) OR the visible document number such as "F0030" / "F-0030". When you receive a list of invoices from holded_list_invoices, you can pass the value of the `docNumber` field directly here — the connector resolves it to the internal id automatically.',
    simpleSchema(
      {
        invoiceId: stringProperty(
          'Either the internal Holded invoice id (24-char hex) or the visible docNumber (e.g. "F0030"). The connector accepts both.'
        ),
      },
      ['invoiceId']
    ),
    singleOutputSchema(holdedInvoiceItemSchema)
  ),
  readTool(
    'holded_list_documents',
    'List documents in Holded',
    'List commercial documents (sales invoices/estimates by default, OR purchases when docType is specified) for the currently authorized Holded tenant. ' +
      'PASS `docType: "purchase"` (or `"purchaseorder"`, `"purchaserefund"`) when the user asks for SUPPLIER documents, BILLS, EXPENSES or PURCHASES. Without docType, the tool returns sales invoices + estimates merged. ' +
      'Use `year` (e.g. 2025) or explicit `from`/`to` ISO dates if you need older history; otherwise the default scope is recent.',
    listSchema({
      status: stringProperty('Optional Holded document status filter.'),
      docType: stringProperty(
        'Holded document type. For sales: "invoice" or "estimate" (default if omitted = invoices + estimates). For purchases / supplier bills: "purchase", "purchaseorder" or "purchaserefund".'
      ),
      year: yearProperty,
      from: isoDateProperty,
      to: isoDateProperty,
    }),
    listOutputSchema(holdedDocumentItemSchema)
  ),
  readTool(
    'holded_get_document',
    'Get one document from Holded',
    'Retrieve a single Holded document by type. Accepts EITHER the internal Holded document id (24-character hex cuid returned by previous listings) OR the visible document number such as "P0045" / "P-0045" / "F0030". When you receive a list of documents from holded_list_documents you can pass the `docNumber` field directly here — the connector resolves it to the internal id automatically (scanning the current page and recent historical years).',
    simpleSchema(
      {
        docType: stringProperty(
          'The Holded document type. Sales: "invoice", "estimate". Purchases / supplier bills: "purchase", "purchaseorder", "purchaserefund".'
        ),
        documentId: stringProperty(
          'The Holded document identifier — either the internal cuid (24 hex chars) OR the visible docNumber (e.g. "P0045"). The connector resolves docNumbers automatically.'
        ),
      },
      ['docType', 'documentId']
    ),
    singleOutputSchema(holdedDocumentItemSchema)
  ),
  writeTool(
    'holded_create_document',
    'Create a document in Holded',
    'Create a document in Holded with explicit confirmation. Supported supplier document types include purchase, purchaseorder and purchaserefund.',
    writeSchema(
      {
        docType: stringProperty('The Holded document type to create.', { defaultValue: 'invoice' }),
        payload: documentCreatePayloadProperty(
          'Document payload for Holded. It must include contactId plus at least one line item. Prefer lines with desc, units, price and tax. The connector also accepts products as a compatibility alias and fills date automatically when omitted.'
        ),
      },
      ['payload']
    )
  ),
  writeTool(
    'holded_update_document',
    'Update a document in Holded',
    // B2 (auditoría 2026-05-11): wording explícito para revisor OpenAI.
    "Update fields on an existing Holded document (invoice, estimate, purchase, etc.) in the user's connected Holded account. " +
      'This is a WRITE operation that modifies persistent business data. If the document has already been approved/issued (i.e., not a draft), modifications may have legal/accounting implications and cannot always be cleanly rolled back. ' +
      'The connector does NOT change document status by itself; status fields stay as the caller passes them. ' +
      'Requires explicit user confirmation: the assistant MUST first show the user what will change and call this tool with `confirm: true` only after the user has explicitly approved.',
    writeSchema(
      {
        docType: stringProperty('The Holded document type to update.'),
        documentId: stringProperty('The Holded document identifier.'),
        payload: payloadProperty('Document fields to update in Holded.'),
      },
      ['docType', 'documentId', 'payload']
    )
  ),
  writeTool(
    'holded_delete_document',
    'Delete a document in Holded',
    // B2 (auditoría 2026-05-11): destructive irreversible.
    "Permanently delete an existing Holded document (invoice, estimate, etc.) from the user's connected Holded account. " +
      'This operation is IRREVERSIBLE: once deleted, the document cannot be recovered through this connector. Holded may retain a soft-delete record server-side for accounting compliance, but the document will no longer be visible in lists, exports, or downloads via the Holded UI or API. ' +
      'For approved/issued invoices already submitted to AEAT/Verifactu, deletion does NOT cancel the fiscal submission — the user must issue a rectifying invoice through Holded separately if legally required. ' +
      'Requires explicit user confirmation: the assistant MUST clearly describe the document being deleted (number, recipient, amount) and call this tool with `confirm: true` only after the user has explicitly approved the deletion.',
    writeSchema(
      {
        docType: stringProperty('The Holded document type to delete.'),
        documentId: stringProperty('The Holded document identifier.'),
      },
      ['docType', 'documentId']
    ),
    { destructiveHint: true }
  ),
  writeTool(
    'holded_send_document',
    'Send a document from Holded',
    // B2 (auditoría 2026-05-11): email immediately sent, no preview, no recall.
    "Send an existing Holded document to the recipient(s) by email immediately from the user's connected Holded account. " +
      'This operation is IRREVERSIBLE in the sense that the email is delivered to the recipient(s) the moment the call succeeds — there is no scheduled send, no preview, and no recall mechanism. ' +
      'The email goes out from the user`s configured Holded sender identity, not from the assistant. ' +
      'For invoices, sending also typically marks the document as `sent` in Holded, which may have downstream effects (CRM stage, billing automations). ' +
      'Requires explicit user confirmation: the assistant MUST show the recipient list and subject/message before calling, and pass `confirm: true` only after the user has explicitly approved sending.',
    writeSchema(
      {
        docType: stringProperty('The Holded document type to send.'),
        documentId: stringProperty('The Holded document identifier.'),
        payload: payloadProperty(
          'Delivery payload for Holded. Include emails as a non-empty array and optionally mailTemplateId, subject, message and docIds.'
        ),
      },
      ['docType', 'documentId', 'payload']
    )
  ),
  writeTool(
    'holded_pay_document',
    'Register a document payment in Holded',
    // B2 (auditoría 2026-05-11): records financial payment; not a card charge.
    "Register a payment row against an existing Holded document (invoice, purchase, purchase order) in the user's connected Holded account. " +
      'IMPORTANT — this does NOT charge a card, initiate a bank transfer, or move money. It records that a payment was received/made for the document, updating Holded`s accounts-receivable/payable status. ' +
      'This is a WRITE operation against financial books: the payment row is persisted into Holded`s accounting and the document`s outstanding balance is adjusted. Reverting this requires manually editing or deleting the payment row in the Holded UI, which can complicate audit trails. ' +
      'The connector does not call any payment processor, so the assistant must NEVER use this tool to "charge a customer" — it is exclusively for marking a payment as already received/made through external means (bank transfer, cash, Stripe webhook, etc.). ' +
      'Requires explicit user confirmation: the assistant MUST state the amount, date and account before calling, and pass `confirm: true` only after the user has explicitly approved.',
    writeSchema(
      {
        docType: stringProperty(
          'The Holded document type to pay, for example invoice, purchase or purchaseorder.'
        ),
        documentId: stringProperty('The Holded document identifier.'),
        payload: payloadProperty(
          'Payment payload for Holded. It must include date as unix seconds and amount, and can optionally include treasury and desc.'
        ),
      },
      ['docType', 'documentId', 'payload']
    )
  ),
  readTool(
    'holded_get_document_pdf',
    'Get a document PDF from Holded',
    'Retrieve a Holded document PDF as base64 together with filename and content type metadata. ' +
      'The connector validates the PDF magic bytes ("%PDF-") and content-type before returning so that a Holded JSON error body cannot be passed back as a fake PDF; if the document has no PDF attached, the call fails with a meaningful error instead of returning bogus base64.',
    simpleSchema(
      {
        docType: stringProperty('The Holded document type, for example invoice or estimate.'),
        documentId: stringProperty('The Holded document identifier.'),
      },
      ['docType', 'documentId']
    ),
    pdfOutputSchema
  ),
  writeTool(
    'holded_update_document_tracking',
    'Update document tracking in Holded',
    'Update tracking details for a Holded sales order or waybill with explicit confirmation.',
    writeSchema(
      {
        docType: {
          type: 'string',
          enum: ['salesorder', 'waybill'],
          description: 'Holded document type accepted for tracking updates.',
        },
        documentId: stringProperty('The Holded document identifier.'),
        payload: payloadProperty(
          'Tracking payload for Holded. You can send key or carrierKey, name or carrierName, num or trackingNumber, plus pickUpDate, deliveryDate and notes.'
        ),
      },
      ['docType', 'documentId', 'payload']
    )
  ),
  writeTool(
    'holded_update_document_pipeline',
    'Update document pipeline in Holded',
    'Move a Holded document to another pipeline stage with explicit confirmation.',
    writeSchema(
      {
        docType: stringProperty('The Holded document type to update.'),
        documentId: stringProperty('The Holded document identifier.'),
        pipeline: stringProperty('Target Holded pipeline identifier or value.'),
      },
      ['docType', 'documentId', 'pipeline']
    )
  ),
  writeTool(
    'holded_ship_document_all_items',
    'Ship all sales order items in Holded',
    'Ship all items of a Holded sales order with explicit confirmation.',
    writeSchema(
      {
        documentId: stringProperty('The Holded sales order identifier.'),
      },
      ['documentId']
    )
  ),
  writeTool(
    'holded_ship_document_by_lines',
    'Ship sales order lines in Holded',
    'Ship specific sales order lines in Holded with explicit confirmation.',
    writeSchema(
      {
        documentId: stringProperty('The Holded sales order identifier.'),
        payload: payloadProperty(
          'Shipment payload for Holded. Include a non-empty lines array using the line positions and quantities expected by Holded.'
        ),
      },
      ['documentId', 'payload']
    )
  ),
  readTool(
    'holded_get_document_shipped_items',
    'Get shipped units by item from Holded',
    'Retrieve shipped or received units per item for a Holded sales or purchase order.',
    simpleSchema(
      {
        docType: {
          type: 'string',
          enum: ['salesorder', 'order'],
          description: 'Holded document type accepted by the shipped items endpoint.',
        },
        documentId: stringProperty('The Holded document identifier.'),
      },
      ['docType', 'documentId']
    )
  ),
  writeTool(
    'holded_attach_document_file',
    'Attach a file to a Holded document',
    'Attach a file to an existing Holded document with explicit confirmation.',
    writeSchema(
      {
        docType: stringProperty('The Holded document type to update.'),
        documentId: stringProperty('The Holded document identifier.'),
        payload: payloadProperty(
          'Attachment payload for Holded. Include base64, fileName, optional contentType and optional setMain.'
        ),
      },
      ['docType', 'documentId', 'payload']
    )
  ),
  readTool(
    'holded_list_contacts',
    'List contacts in Holded',
    'List customer or supplier contacts from Holded for the currently authorized tenant. ' +
      'Use `type: "client"` to list only CUSTOMERS with active sales records, `type: "supplier"` to list only SUPPLIERS with active purchase records, or omit `type` to list everyone. ' +
      'The connector applies a client-side role filter after Holded\'s server-side filter to drop contacts whose role record is empty (Holded\'s server filter sometimes returns historical/inactive role assignments). ' +
      'Use the optional `name` filter when the user mentions a customer or supplier by name to avoid scanning every page.',
    listSchema({
      name: stringProperty(
        'Optional case-insensitive substring search by contact name, trade name, code, tax id or email (e.g. "Garcia"). The connector also applies this filter locally when Holded returns an unfiltered page.'
      ),
      type: stringProperty(
        'Optional contact role filter. Valid values: "client" (customers only — clientRecord present), "supplier" (suppliers only — supplierRecord present), "lead" (sales leads). Omit to list all contacts regardless of role.'
      ),
    }),
    listOutputSchema(holdedContactItemSchema)
  ),
  readTool(
    'holded_get_contact',
    'Get one contact from Holded',
    'Retrieve a single Holded contact by id. ' +
      'IMPORTANT: contact IDs embedded inside document responses (e.g. the `contact` field of an invoice) are NOT always resolvable here — Holded keeps legacy IDs for historical document versions that differ from live CRM IDs. ' +
      'For best reliability ALSO pass `contactName` (when known from the prior document or list context). If the direct id lookup fails, the connector will retry by name match. If neither id nor name resolves, the response will indicate not_found and the caller should call holded_list_contacts to look up a fresh id. ' +
      '⚠ FIELDS QUIRKS (verified empirically against Nova Gestión SL, V3.G.8 audit 2026-06-01):\n' +
      '  • The Spanish tax ID (CIF/NIF/NIE — needed for modelo 347 reports) lives in the `code` field, NOT `vatnumber`. ' +
      'The `vatnumber` field is intended for EU VIES VAT numbers (intracommunity) and is usually empty for domestic Spanish contacts.\n' +
      '  • The `type` field is UNRELIABLE — Holded often returns it as an empty string even when the contact is clearly a supplier or client. ' +
      'To determine role reliably, check whether `supplierRecord` is populated (supplier) or `clientRecord` is populated (client). Both can be present if the contact acts in both roles.',
    simpleSchema(
      {
        contactId: stringProperty(
          'The Holded contact identifier returned by a previous contact listing OR embedded in a document. May refer to a legacy/historical id; see contactName fallback.'
        ),
        contactName: stringProperty(
          'Optional fallback contact name (e.g. "Kappa Digital Zaragoza SL"). Used to recover when the contactId is a legacy id that no longer resolves to a live contact.'
        ),
      },
      ['contactId']
    ),
    singleOutputSchema(holdedContactItemSchema)
  ),
  readTool(
    'holded_list_contact_attachments',
    'List contact attachments in Holded',
    'List attachment metadata available on a Holded contact.',
    simpleSchema(
      {
        contactId: stringProperty(
          'The Holded contact identifier returned by a previous contact listing.'
        ),
      },
      ['contactId']
    )
  ),
  readTool(
    'holded_get_contact_attachment',
    'Get a contact attachment from Holded',
    'Retrieve one Holded contact attachment as base64 together with filename and content type metadata.',
    simpleSchema(
      {
        contactId: stringProperty(
          'The Holded contact identifier returned by a previous contact listing.'
        ),
        fileName: stringProperty(
          'Exact attachment filename returned by holded_list_contact_attachments.'
        ),
      },
      ['contactId', 'fileName']
    )
  ),
  writeTool(
    'holded_create_contact',
    'Create a contact in Holded',
    'Create a contact in Holded with explicit confirmation.',
    writeSchema({ payload: payloadProperty('Contact payload for Holded.') }, ['payload'])
  ),
  writeTool(
    'holded_update_contact',
    'Update a contact in Holded',
    'Update a Holded contact with explicit confirmation.',
    writeSchema(
      {
        contactId: stringProperty('The Holded contact identifier.'),
        payload: payloadProperty('Contact fields to update in Holded.'),
      },
      ['contactId', 'payload']
    )
  ),
  writeTool(
    'holded_delete_contact',
    'Delete a contact in Holded',
    // B2 (auditoría 2026-05-11): destructive irreversible.
    'IRREVERSIBLE — Permanently delete a contact from the connected Holded account. The contact, including its associated email/phone/address records, will no longer appear in lists, exports, or related-record lookups via the Holded UI or API. Historical documents (invoices, estimates) that referenced this contact are preserved in Holded but lose their live link to the contact. Requires explicit user confirmation: the assistant MUST show the contact name/CIF before calling, and pass `confirm: true` only after the user has explicitly approved.',
    writeSchema({ contactId: stringProperty('The Holded contact identifier.') }, ['contactId']),
    { destructiveHint: true }
  ),
  readTool(
    'holded_list_treasury_accounts',
    'List treasury accounts in Holded',
    'List treasury accounts available in Holded for the currently authorized tenant.',
    simpleSchema()
  ),
  readTool(
    'holded_get_treasury_account',
    'Get one treasury account from Holded',
    'Retrieve a single Holded treasury account by id.',
    simpleSchema({ treasuryAccountId: stringProperty('The Holded treasury account identifier.') }, [
      'treasuryAccountId',
    ])
  ),
  writeTool(
    'holded_create_treasury_account',
    'Create a treasury account in Holded',
    'Create a treasury account in Holded with explicit confirmation.',
    writeSchema({ payload: payloadProperty('Treasury account payload for Holded.') }, ['payload'])
  ),
  writeTool(
    'holded_update_treasury_account',
    'Update a treasury account in Holded',
    'Update a Holded treasury account with explicit confirmation.',
    writeSchema(
      {
        treasuryAccountId: stringProperty('The Holded treasury account identifier.'),
        payload: payloadProperty('Treasury account fields to update in Holded.'),
      },
      ['treasuryAccountId', 'payload']
    )
  ),
  readTool(
    'holded_list_expense_accounts',
    'List expense accounts in Holded',
    'List expense accounts from Holded for the currently authorized tenant.',
    listSchema()
  ),
  readTool(
    'holded_get_expense_account',
    'Get one expense account from Holded',
    'Retrieve a single Holded expense account by id.',
    simpleSchema({ expenseAccountId: stringProperty('The Holded expense account identifier.') }, [
      'expenseAccountId',
    ])
  ),
  writeTool(
    'holded_create_expense_account',
    'Create an expense account in Holded',
    'Create an expense account in Holded with explicit confirmation.',
    writeSchema({ payload: payloadProperty('Expense account payload for Holded.') }, ['payload'])
  ),
  writeTool(
    'holded_update_expense_account',
    'Update an expense account in Holded',
    'Update a Holded expense account with explicit confirmation.',
    writeSchema(
      {
        expenseAccountId: stringProperty('The Holded expense account identifier.'),
        payload: payloadProperty('Expense account fields to update in Holded.'),
      },
      ['expenseAccountId', 'payload']
    )
  ),
  writeTool(
    'holded_delete_expense_account',
    'Archive an expense account in Holded',
    'Archive an expense account in Holded with explicit confirmation. Holded keeps it as archived instead of hard-deleting it.',
    writeSchema({ expenseAccountId: stringProperty('The Holded expense account identifier.') }, [
      'expenseAccountId',
    ]),
    { destructiveHint: true }
  ),
  readTool(
    'holded_list_numbering_series',
    'List numbering series in Holded',
    'List numbering series in Holded for a specific document type.',
    simpleSchema(
      {
        seriesType: stringProperty(
          'The Holded numbering series type, for example invoice or estimate.'
        ),
      },
      ['seriesType']
    )
  ),
  writeTool(
    'holded_create_numbering_series',
    'Create a numbering series in Holded',
    'Create a numbering series in Holded with explicit confirmation.',
    writeSchema(
      {
        seriesType: stringProperty('The Holded numbering series type.'),
        payload: payloadProperty('Numbering series payload for Holded.'),
      },
      ['seriesType', 'payload']
    )
  ),
  writeTool(
    'holded_update_numbering_series',
    'Update a numbering series in Holded',
    'Update a Holded numbering series with explicit confirmation.',
    writeSchema(
      {
        seriesType: stringProperty('The Holded numbering series type.'),
        seriesId: stringProperty('The Holded numbering series identifier.'),
        payload: payloadProperty('Numbering series fields to update in Holded.'),
      },
      ['seriesType', 'seriesId', 'payload']
    )
  ),
  writeTool(
    'holded_delete_numbering_series',
    'Delete a numbering series in Holded',
    'Delete a Holded numbering series with explicit confirmation.',
    writeSchema(
      {
        seriesType: stringProperty('The Holded numbering series type.'),
        seriesId: stringProperty('The Holded numbering series identifier.'),
      },
      ['seriesType', 'seriesId']
    ),
    { destructiveHint: true }
  ),
  readTool(
    'holded_list_products',
    'List products in Holded',
    'List products from Holded for the currently authorized tenant.',
    listSchema()
  ),
  readTool(
    'holded_get_product',
    'Get one product from Holded',
    'Retrieve a single Holded product by id.',
    simpleSchema({ productId: stringProperty('The Holded product identifier.') }, ['productId'])
  ),
  readTool(
    'holded_get_product_main_image',
    'Get a product main image from Holded',
    'Retrieve the main image of a Holded product as base64 together with filename and content type metadata.',
    simpleSchema({ productId: stringProperty('The Holded product identifier.') }, ['productId'])
  ),
  readTool(
    'holded_list_product_images',
    'List product images in Holded',
    'List secondary image metadata exposed by Holded for a product.',
    simpleSchema({ productId: stringProperty('The Holded product identifier.') }, ['productId'])
  ),
  readTool(
    'holded_get_product_secondary_image',
    'Get a product secondary image from Holded',
    'Retrieve one secondary Holded product image as base64 together with filename and content type metadata.',
    simpleSchema(
      {
        productId: stringProperty('The Holded product identifier.'),
        imageFileName: stringProperty(
          'Exact secondary image filename returned by holded_list_product_images.'
        ),
      },
      ['productId', 'imageFileName']
    )
  ),
  writeTool(
    'holded_update_product_stock',
    'Update product stock in Holded',
    'Update the stock object of a Holded product with explicit confirmation.',
    writeSchema(
      {
        productId: stringProperty('The Holded product identifier.'),
        payload: payloadProperty(
          'Stock payload for Holded. It must include the stock object documented by Holded for this endpoint.'
        ),
      },
      ['productId', 'payload']
    )
  ),
  writeTool(
    'holded_create_product',
    'Create a product in Holded',
    'Create a product in Holded with explicit confirmation.',
    writeSchema({ payload: payloadProperty('Product payload for Holded.') }, ['payload'])
  ),
  writeTool(
    'holded_update_product',
    'Update a product in Holded',
    'Update a Holded product with explicit confirmation.',
    writeSchema(
      {
        productId: stringProperty('The Holded product identifier.'),
        payload: payloadProperty('Product fields to update in Holded.'),
      },
      ['productId', 'payload']
    )
  ),
  writeTool(
    'holded_delete_product',
    'Delete a product in Holded',
    // B2 (auditoría 2026-05-11): destructive irreversible.
    'IRREVERSIBLE — Permanently delete a product from the connected Holded catalog. Stock movements, prices, and product images linked to this SKU will no longer be queryable. Existing document lines that referenced this product are preserved as historical line items but lose their live product link. Requires explicit user confirmation: the assistant MUST show the product name/SKU and current stock before calling, and pass `confirm: true` only after the user has explicitly approved.',
    writeSchema({ productId: stringProperty('The Holded product identifier.') }, ['productId']),
    { destructiveHint: true }
  ),
  readTool(
    'holded_list_sales_channels',
    'List sales channels in Holded',
    'List sales channels from Holded for the currently authorized tenant.',
    listSchema()
  ),
  readTool(
    'holded_get_sales_channel',
    'Get one sales channel from Holded',
    'Retrieve a single Holded sales channel by id.',
    simpleSchema({ salesChannelId: stringProperty('The Holded sales channel identifier.') }, [
      'salesChannelId',
    ])
  ),
  writeTool(
    'holded_create_sales_channel',
    'Create a sales channel in Holded',
    'Create a sales channel in Holded with explicit confirmation.',
    writeSchema({ payload: payloadProperty('Sales channel payload for Holded.') }, ['payload'])
  ),
  writeTool(
    'holded_update_sales_channel',
    'Update a sales channel in Holded',
    'Update a Holded sales channel with explicit confirmation.',
    writeSchema(
      {
        salesChannelId: stringProperty('The Holded sales channel identifier.'),
        payload: payloadProperty('Sales channel fields to update in Holded.'),
      },
      ['salesChannelId', 'payload']
    )
  ),
  writeTool(
    'holded_delete_sales_channel',
    'Archive a sales channel in Holded',
    'Archive a sales channel in Holded with explicit confirmation. Holded keeps it as archived instead of hard-deleting it.',
    writeSchema({ salesChannelId: stringProperty('The Holded sales channel identifier.') }, [
      'salesChannelId',
    ]),
    { destructiveHint: true }
  ),
  readTool(
    'holded_list_warehouses',
    'List warehouses in Holded',
    'List warehouses from Holded for the currently authorized tenant.',
    listSchema()
  ),
  readTool(
    'holded_get_warehouse',
    'Get one warehouse from Holded',
    'Retrieve a single Holded warehouse by id.',
    simpleSchema({ warehouseId: stringProperty('The Holded warehouse identifier.') }, [
      'warehouseId',
    ])
  ),
  readTool(
    'holded_list_warehouse_stock',
    'List warehouse stock in Holded',
    'List stock entries for a specific Holded warehouse.',
    simpleSchema(
      {
        warehouseId: stringProperty('The Holded warehouse identifier.'),
      },
      ['warehouseId']
    )
  ),
  writeTool(
    'holded_create_warehouse',
    'Create a warehouse in Holded',
    'Create a warehouse in Holded with explicit confirmation.',
    writeSchema({ payload: payloadProperty('Warehouse payload for Holded.') }, ['payload'])
  ),
  writeTool(
    'holded_update_warehouse',
    'Update a warehouse in Holded',
    'Update a Holded warehouse with explicit confirmation.',
    writeSchema(
      {
        warehouseId: stringProperty('The Holded warehouse identifier.'),
        payload: payloadProperty('Warehouse fields to update in Holded.'),
      },
      ['warehouseId', 'payload']
    )
  ),
  writeTool(
    'holded_delete_warehouse',
    'Delete a warehouse in Holded',
    // B2 (auditoría 2026-05-11): destructive irreversible.
    'IRREVERSIBLE — Permanently delete a warehouse from Holded. All stock movement history attributed to this warehouse becomes orphan. Cannot be undone via this connector. Requires explicit user confirmation: the assistant MUST show the warehouse name and current stock summary before calling, and pass `confirm: true` only after the user has explicitly approved.',
    writeSchema({ warehouseId: stringProperty('The Holded warehouse identifier.') }, [
      'warehouseId',
    ]),
    { destructiveHint: true }
  ),
  readTool(
    'holded_list_payments',
    'List payments in Holded',
    'List payments from Holded for the currently authorized tenant.',
    listSchema({
      startTimestamp: unixTimestampProperty,
      endTimestamp: unixTimestampProperty,
    })
  ),
  readTool(
    'holded_get_payment',
    'Get one payment from Holded',
    'Retrieve a single Holded payment by id.',
    simpleSchema({ paymentId: stringProperty('The Holded payment identifier.') }, ['paymentId'])
  ),
  writeTool(
    'holded_create_payment',
    'Create a payment in Holded',
    'Create a payment in Holded with explicit confirmation.',
    writeSchema({ payload: payloadProperty('Payment payload for Holded.') }, ['payload'])
  ),
  writeTool(
    'holded_update_payment',
    'Update a payment in Holded',
    'Update a Holded payment with explicit confirmation.',
    writeSchema(
      {
        paymentId: stringProperty('The Holded payment identifier.'),
        payload: payloadProperty('Payment fields to update in Holded.'),
      },
      ['paymentId', 'payload']
    )
  ),
  writeTool(
    'holded_delete_payment',
    'Delete a payment in Holded',
    // B2 (auditoría 2026-05-11): destructive irreversible against financial books.
    'IRREVERSIBLE — Permanently delete a payment record from Holded`s books. This modifies financial/accounting history: the related document (invoice/purchase) regains its outstanding balance and AR/AP totals are recomputed. Audit trails preserved by Holded server-side may not be visible through this connector after deletion. Does NOT initiate a refund or chargeback in any payment processor — this is purely a bookkeeping operation. Requires explicit user confirmation: the assistant MUST show the payment amount, date and related document before calling, and pass `confirm: true` only after the user has explicitly approved.',
    writeSchema({ paymentId: stringProperty('The Holded payment identifier.') }, ['paymentId']),
    { destructiveHint: true }
  ),
  readTool(
    'holded_list_taxes',
    'List taxes in Holded',
    'List taxes available in Holded for the currently authorized tenant.',
    simpleSchema()
  ),
  readTool(
    'holded_list_payment_methods',
    'List payment methods in Holded',
    'List payment methods available in Holded for the currently authorized tenant.',
    simpleSchema()
  ),
  readTool(
    'holded_list_contact_groups',
    'List contact groups in Holded',
    'List contact groups from Holded for the currently authorized tenant.',
    listSchema()
  ),
  readTool(
    'holded_get_contact_group',
    'Get one contact group from Holded',
    'Retrieve a single Holded contact group by id.',
    simpleSchema({ contactGroupId: stringProperty('The Holded contact group identifier.') }, [
      'contactGroupId',
    ])
  ),
  writeTool(
    'holded_create_contact_group',
    'Create a contact group in Holded',
    'Create a contact group in Holded with explicit confirmation.',
    writeSchema({ payload: payloadProperty('Contact group payload for Holded.') }, ['payload'])
  ),
  writeTool(
    'holded_update_contact_group',
    'Update a contact group in Holded',
    'Update a Holded contact group with explicit confirmation.',
    writeSchema(
      {
        contactGroupId: stringProperty('The Holded contact group identifier.'),
        payload: payloadProperty('Contact group fields to update in Holded.'),
      },
      ['contactGroupId', 'payload']
    )
  ),
  writeTool(
    'holded_delete_contact_group',
    'Delete a contact group in Holded',
    // B2 (auditoría 2026-05-11): destructive irreversible.
    'IRREVERSIBLE — Permanently delete a contact group from Holded. Contacts assigned to the group will lose this label/segment; they are NOT deleted themselves. Cannot be undone via this connector. Requires explicit user confirmation: the assistant MUST show the group name and member count before calling, and pass `confirm: true` only after the user has explicitly approved.',
    writeSchema({ contactGroupId: stringProperty('The Holded contact group identifier.') }, [
      'contactGroupId',
    ]),
    { destructiveHint: true }
  ),
  readTool(
    'holded_list_remittances',
    'List remittances in Holded',
    'List remittances from Holded for the currently authorized tenant.',
    simpleSchema()
  ),
  readTool(
    'holded_get_remittance',
    'Get one remittance from Holded',
    'Retrieve a single Holded remittance by id.',
    simpleSchema({ remittanceId: stringProperty('The Holded remittance identifier.') }, [
      'remittanceId',
    ])
  ),
  readTool(
    'holded_list_services',
    'List services in Holded',
    'List services from Holded for the currently authorized tenant.',
    listSchema()
  ),
  readTool(
    'holded_get_service',
    'Get one service from Holded',
    'Retrieve a single Holded service by id.',
    simpleSchema({ serviceId: stringProperty('The Holded service identifier.') }, ['serviceId'])
  ),
  writeTool(
    'holded_create_service',
    'Create a service in Holded',
    'Create a service in Holded with explicit confirmation.',
    writeSchema({ payload: payloadProperty('Service payload for Holded.') }, ['payload'])
  ),
  writeTool(
    'holded_update_service',
    'Update a service in Holded',
    'Update a Holded service with explicit confirmation.',
    writeSchema(
      {
        serviceId: stringProperty('The Holded service identifier.'),
        payload: payloadProperty('Service fields to update in Holded.'),
      },
      ['serviceId', 'payload']
    )
  ),
  writeTool(
    'holded_delete_service',
    'Delete a service in Holded',
    // B2 (auditoría 2026-05-11): destructive irreversible.
    'IRREVERSIBLE — Permanently delete a service definition from Holded`s catalog. Existing document lines that referenced this service are preserved as historical line items but lose their live service link. Cannot be undone via this connector. Requires explicit user confirmation: the assistant MUST show the service name and current price before calling, and pass `confirm: true` only after the user has explicitly approved.',
    writeSchema({ serviceId: stringProperty('The Holded service identifier.') }, ['serviceId']),
    { destructiveHint: true }
  ),
  readTool(
    'holded_list_employees',
    'List employees in Holded',
    'List employees from Holded for the currently authorized tenant.',
    listSchema()
  ),
  readTool(
    'holded_get_employee',
    'Get one employee from Holded',
    'Retrieve a single Holded employee by id.',
    simpleSchema({ employeeId: stringProperty('The Holded employee identifier.') }, ['employeeId'])
  ),
  writeTool(
    'holded_create_employee',
    'Create an employee in Holded',
    'Create an employee in Holded with explicit confirmation.',
    writeSchema({ payload: payloadProperty('Employee payload for Holded.') }, ['payload'])
  ),
  writeTool(
    'holded_update_employee',
    'Update an employee in Holded',
    'Update a Holded employee with explicit confirmation.',
    writeSchema(
      {
        employeeId: stringProperty('The Holded employee identifier.'),
        payload: payloadProperty('Employee fields to update in Holded.'),
      },
      ['employeeId', 'payload']
    )
  ),
  writeTool(
    'holded_clock_in_employee',
    'Clock in an employee in Holded',
    'Start employee time tracking in Holded with explicit confirmation.',
    writeSchema(
      {
        employeeId: stringProperty('The Holded employee identifier.'),
        payload: payloadProperty(
          'Optional clock-in payload for Holded, for example location when available.'
        ),
      },
      ['employeeId']
    )
  ),
  writeTool(
    'holded_clock_out_employee',
    'Clock out an employee in Holded',
    'End employee time tracking in Holded with explicit confirmation.',
    writeSchema(
      {
        employeeId: stringProperty('The Holded employee identifier.'),
        payload: payloadProperty(
          'Optional clock-out payload for Holded, for example latitude and longitude when available.'
        ),
      },
      ['employeeId']
    )
  ),
  readTool(
    'holded_list_accounts',
    'List accounting accounts in Holded',
    'List the Holded chart of accounts (Spanish PGC) for the currently authorized tenant. Returns each account code plus the **pre-computed balance** from Holded for the selected fiscal range. ' +
      'Results are paginated (default 25 per page); pass page and limit to walk the full chart. By default the connector calls chartofaccounts with includeEmpty=1 so empty accounts are not silently omitted. ' +
      '⚠ KNOWN HOLDED LIMITATION (audit 2026-06-01): the balances returned by Holded\'s /chartofaccounts EXCLUDE manual closing/regularization journal entries by design (see https://help.holded.com/en/articles/6895943). If you need the **real balance** including manual entries (amortizations, year-end closings, capital contributions), re-aggregate from holded_list_daily_ledger across the full fiscal year. ' +
      'PASS `startTimestamp` and `endTimestamp` (or the ISO `startDate`/`endDate`) to scope the balance to a specific fiscal year — otherwise Holded uses the tenant default (often current year only, missing prior-year closings).',
    simpleSchema({
      page: pageProperty,
      limit: limitProperty,
      startDate: stringProperty(
        'Start of the fiscal range as an ISO date YYYY-MM-DD (e.g. 2025-01-01). Preferred for ChatGPT and Claude. Either startDate OR startTimestamp may be provided; omit both to use Holded\'s tenant default.'
      ),
      endDate: stringProperty(
        'End of the fiscal range as an ISO date YYYY-MM-DD (e.g. 2025-12-31). Preferred for ChatGPT and Claude.'
      ),
      startTimestamp: unixTimestampProperty,
      endTimestamp: unixTimestampProperty,
      includeEmpty: {
        type: 'boolean',
        default: true,
        description:
          'Whether to include empty accounting accounts. Defaults to true to avoid partial chart-of-accounts views.',
      },
    }),
    listOutputSchema(holdedAccountItemSchema)
  ),
  readTool(
    'holded_list_daily_ledger',
    'List daily ledger entries in Holded',
    'List daily ledger entries from Holded for a bounded accounting window. Provide the range as either ISO dates (startDate / endDate, format YYYY-MM-DD — preferred for assistants) or Unix seconds (startTimestamp / endTimestamp). Either pair is required because this endpoint rejects unbounded requests in production tenants. ' +
      'Entries are returned sorted by date ascending (oldest first) then by entry number ascending — a stable, reconciliation-friendly order. Holded\'s native response is in Mongo insertion order without guarantees; the connector reorders client-side before returning.',
    listSchemaWithRequired(
      {
        startDate: stringProperty(
          'Start of the range as an ISO date YYYY-MM-DD (e.g. 2026-03-01). Preferred for ChatGPT and Claude. Either startDate OR startTimestamp must be provided.'
        ),
        endDate: stringProperty(
          'End of the range as an ISO date YYYY-MM-DD (e.g. 2026-03-31). Preferred for ChatGPT and Claude. Either endDate OR endTimestamp must be provided.'
        ),
        startTimestamp: unixTimestampProperty,
        endTimestamp: unixTimestampProperty,
      },
      []
    ),
    listOutputSchema(holdedJournalEntrySchema)
  ),
  writeTool(
    'holded_create_daily_ledger_entry',
    'Create a daily ledger entry in Holded',
    'Create a daily ledger entry in Holded with explicit confirmation.',
    writeSchema(
      {
        payload: payloadProperty(
          'Daily ledger payload for Holded. It must include date as unix seconds plus at least two line objects. The connector validates the required top-level shape and forwards the line details.'
        ),
      },
      ['payload']
    )
  ),
  writeTool(
    'holded_create_accounting_account',
    'Create an accounting account in Holded',
    'Create a Holded accounting account with explicit confirmation.',
    writeSchema(
      {
        payload: payloadProperty(
          'Accounting account payload for Holded. Include prefix as a 4 digit integer and optionally name and color.'
        ),
      },
      ['payload']
    )
  ),
  readTool(
    'holded_list_bookings',
    'List CRM bookings in Holded',
    'List CRM bookings and agenda items from Holded for the currently authorized tenant.',
    listSchema()
  ),
  readTool(
    'holded_list_crm_funnels',
    'List CRM funnels in Holded',
    'List the CRM funnels (sales pipelines) configured in Holded for the currently authorized tenant. Use the returned funnel id to filter holded_list_leads.',
    simpleSchema()
  ),
  readTool(
    'holded_list_leads',
    'List CRM leads in Holded',
    'List CRM leads from Holded for the currently authorized tenant. Optionally filter by funnelId returned by holded_list_crm_funnels. Read-only.',
    listSchemaWithRequired(
      {
        funnelId: stringProperty(
          'Optional Holded funnel identifier. When omitted, returns leads across all funnels.'
        ),
      },
      []
    )
  ),
  readTool(
    'holded_list_time_records',
    'List time records for a Holded project',
    'List time-tracking records imputed against a specific Holded project. Useful for explaining hours spent per task / employee.',
    buildSchema(
      {
        projectId: stringProperty(
          'The Holded project identifier to fetch time records for. Returned by holded_list_projects.'
        ),
        page: pageProperty,
        limit: limitProperty,
      },
      ['projectId']
    )
  ),
  readTool(
    'holded_list_projects',
    'List projects in Holded',
    'List projects from Holded for the currently authorized tenant so Isaak can explain workload and profitability context.',
    listSchema()
  ),
  readTool(
    'holded_get_project',
    'Get one project from Holded',
    'Retrieve a single project from Holded by id for the currently authorized tenant.',
    simpleSchema(
      {
        projectId: stringProperty(
          'The Holded project identifier returned by a previous project listing.'
        ),
      },
      ['projectId']
    )
  ),
  readTool(
    'holded_list_project_tasks',
    'List project tasks in Holded',
    'List tasks for a specific Holded project so Isaak can explain project progress in plain language.',
    buildSchema(
      {
        projectId: stringProperty('The Holded project identifier to inspect.'),
        page: pageProperty,
        limit: limitProperty,
      },
      ['projectId']
    )
  ),
  writeTool(
    'holded_create_invoice_draft',
    'Create invoice draft in Holded',
    // M1 (auditoria OpenAI 2026-05-07): wording explicito para que el revisor
    // no tenga dudas sobre la naturaleza de la unica operacion de escritura
    // expuesta en el preset openai_review_v2.
    "Create a DRAFT invoice in the user's connected Holded account. " +
      'The server forces Holded `approveDoc: false` at the wire level, so the draft is NEVER sent, finalized, charged, emailed, or otherwise irreversibly transmitted. ' +
      'No payment is taken, no email is sent to the recipient, and no AEAT/Verifactu submission is triggered. ' +
      'After creation the user can review, edit, or discard the draft from the Holded UI before issuing it. ' +
      'Requires explicit user confirmation: the assistant must call this tool with `confirm: true` only after the user has explicitly approved the action. ' +
      'The connector accepts two input shapes:\n\n' +
      '  • FLAT (preferred for ChatGPT and Claude): pass contactId or contactName, subject, and lines (or a single desc/units/price/tax) at the top level.\n' +
      '  • NESTED (legacy): pass a payload object with contactId, subject, lines, etc.\n\n' +
      'When contactName is provided without contactId, the connector resolves it via holded_list_contacts automatically.',
    writeSchema(
      {
        docType: stringProperty('Document type to create in Holded.', { defaultValue: 'invoice' }),
        // Flat shape — preferred. Either contactId OR contactName is required.
        contactId: stringProperty(
          'Holded contact identifier for the recipient. Provide either contactId or contactName.'
        ),
        contactName: stringProperty(
          'Recipient name (e.g. "Kappa Digital Zaragoza SL"). The connector resolves it to a contactId automatically. Provide either contactId or contactName.'
        ),
        subject: stringProperty(
          'Optional document subject / description visible on the draft invoice.'
        ),
        date: stringProperty(
          'Optional document date as ISO YYYY-MM-DD or Unix seconds. Defaults to today.'
        ),
        lines: {
          type: 'array',
          description:
            'Line items for the invoice. Each item must include desc, units and price; tax (e.g. 21 for 21% VAT) is optional.',
          items: {
            type: 'object',
            properties: {
              desc: { type: 'string', description: 'Concept / description of the line.' },
              units: { type: 'number', description: 'Quantity of units.' },
              price: { type: 'number', description: 'Unit price before tax (EUR).' },
              tax: { type: 'number', description: 'Tax percent (e.g. 21 for 21% VAT).' },
            },
            required: ['desc', 'units', 'price'],
          },
        },
        // Single-line shorthand (only used if lines is omitted).
        desc: stringProperty(
          'Single-line shortcut: line description. Only used if lines is omitted.'
        ),
        units: { type: 'number', description: 'Single-line shortcut: quantity of units.' },
        price: { type: 'number', description: 'Single-line shortcut: unit price before tax.' },
        tax: {
          type: 'number',
          description: 'Single-line shortcut: tax percent (e.g. 21 for 21% VAT).',
        },
        // Nested shape — kept for backward compatibility.
        payload: documentCreatePayloadProperty(
          'Legacy nested payload. Prefer the flat shape (contactId/contactName, subject, lines). When provided, top-level flat fields are ignored.'
        ),
      },
      []
    ),
    { outputSchema: createInvoiceDraftOutputSchema }
  ),
];

export async function callHoldedMcpTool(
  apiKey: string,
  name: string,
  args: Record<string, unknown> | undefined
) {
  const handler = toolHandlers[name];
  if (!handler) {
    throw new Error(`Tool not found: ${name}`);
  }

  return handler(apiKey, args || {});
}
