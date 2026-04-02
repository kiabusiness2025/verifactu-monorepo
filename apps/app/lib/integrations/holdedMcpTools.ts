import { holdedAdapter } from '@/lib/integrations/accounting';

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
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
    additionalProperties?: boolean;
  };
};

type HoldedMcpToolHandler = (
  apiKey: string,
  input: Record<string, unknown>
) => Promise<Record<string, unknown>>;

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
      products: documentLineItemProperty(
        'Compatibility alias accepted by the connector. It is normalized to lines before sending the payload to Holded.'
      ),
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

function readTool(
  name: string,
  title: string,
  description: string,
  inputSchema: HoldedMcpToolDefinition['inputSchema']
): HoldedMcpToolDefinition {
  return {
    name,
    title,
    description,
    annotations: readOnlyAnnotations,
    inputSchema,
  };
}

function writeTool(
  name: string,
  title: string,
  description: string,
  inputSchema: HoldedMcpToolDefinition['inputSchema'],
  options?: { destructiveHint?: boolean }
): HoldedMcpToolDefinition {
  return {
    name,
    title,
    description,
    annotations: writeAnnotations(options?.destructiveHint ?? false),
    inputSchema,
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
    throw new Error('confirm=true is required for write operations');
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

function normalizeDocumentLineItem(item: unknown, sourceKey: 'lines' | 'products', index: number) {
  if (!item || typeof item !== 'object' || Array.isArray(item)) {
    throw new Error(`payload.${sourceKey}[${index}] must be an object`);
  }

  const rawItem = item as Record<string, unknown>;
  const desc =
    optionalString(rawItem, 'desc') ||
    optionalString(rawItem, 'name') ||
    optionalString(rawItem, 'title');
  const units = readFiniteNumber(rawItem.units) ?? readFiniteNumber(rawItem.quantity);
  const price =
    readFiniteNumber(rawItem.price) ??
    readFiniteNumber(rawItem.unitPrice) ??
    readFiniteNumber(rawItem.amount);
  const tax = readFiniteNumber(rawItem.tax) ?? readFiniteNumber(rawItem.taxPercent);

  if (!desc || units === undefined || price === undefined) {
    throw new Error(
      `payload.${sourceKey}[${index}] must include desc/name, units/quantity, and price`
    );
  }

  return {
    ...rawItem,
    desc,
    units,
    price,
    ...(tax !== undefined ? { tax } : {}),
  };
}

function normalizeDocumentCreatePayload(payload: Record<string, unknown>) {
  if (typeof payload.contactId !== 'string' || !payload.contactId.trim()) {
    throw new Error('payload.contactId is required');
  }

  const sourceKey =
    Array.isArray(payload.lines) && payload.lines.length > 0
      ? 'lines'
      : Array.isArray(payload.products) && payload.products.length > 0
        ? 'products'
        : null;

  if (!sourceKey) {
    throw new Error('payload.lines or payload.products must be a non-empty array');
  }

  const rawLines = payload[sourceKey] as unknown[];
  const { lines: _lines, products: _products, ...rest } = payload;

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
    return { items };
  },

  async holded_get_invoice(apiKey, input) {
    const item = await holdedAdapter.getInvoice(apiKey, requiredString(input, 'invoiceId'));
    return { item };
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
    const item = await holdedAdapter.getDocument(
      apiKey,
      requiredString(input, 'docType'),
      requiredString(input, 'documentId')
    );
    return { item };
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
    const pdf = await holdedAdapter.getDocumentPdf(
      apiKey,
      requiredString(input, 'docType'),
      requiredString(input, 'documentId')
    );
    return { pdf };
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
    const items = await holdedAdapter.listContacts(apiKey, {
      page: readPage(input),
      limit: readLimit(input),
    });
    return { items };
  },

  async holded_get_contact(apiKey, input) {
    const item = await holdedAdapter.getContact(apiKey, requiredString(input, 'contactId'));
    return { item };
  },

  async holded_list_contact_attachments(apiKey, input) {
    const items = await holdedAdapter.listContactAttachments(
      apiKey,
      requiredString(input, 'contactId')
    );
    return { items };
  },

  async holded_get_contact_attachment(apiKey, input) {
    const attachment = await holdedAdapter.getContactAttachment(
      apiKey,
      requiredString(input, 'contactId'),
      requiredString(input, 'fileName')
    );
    return { attachment };
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
    const item = await holdedAdapter.getTreasuryAccount(
      apiKey,
      requiredString(input, 'treasuryAccountId')
    );
    return { item };
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
    const item = await holdedAdapter.getExpenseAccount(
      apiKey,
      requiredString(input, 'expenseAccountId')
    );
    return { item };
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
    const item = await holdedAdapter.getProduct(apiKey, requiredString(input, 'productId'));
    return { item };
  },

  async holded_get_product_main_image(apiKey, input) {
    const image = await holdedAdapter.getProductMainImage(
      apiKey,
      requiredString(input, 'productId')
    );
    return { image };
  },

  async holded_list_product_images(apiKey, input) {
    const items = await holdedAdapter.listProductImages(apiKey, requiredString(input, 'productId'));
    return { items };
  },

  async holded_get_product_secondary_image(apiKey, input) {
    const image = await holdedAdapter.getProductSecondaryImage(
      apiKey,
      requiredString(input, 'productId'),
      requiredString(input, 'imageFileName')
    );
    return { image };
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
    const item = await holdedAdapter.getSalesChannel(
      apiKey,
      requiredString(input, 'salesChannelId')
    );
    return { item };
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
    const item = await holdedAdapter.getWarehouse(apiKey, requiredString(input, 'warehouseId'));
    return { item };
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
    });
    return { items };
  },

  async holded_get_payment(apiKey, input) {
    const item = await holdedAdapter.getPayment(apiKey, requiredString(input, 'paymentId'));
    return { item };
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
    const item = await holdedAdapter.getContactGroup(
      apiKey,
      requiredString(input, 'contactGroupId')
    );
    return { item };
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
    const item = await holdedAdapter.getRemittance(apiKey, requiredString(input, 'remittanceId'));
    return { item };
  },

  async holded_list_services(apiKey, input) {
    const items = await holdedAdapter.listServices(apiKey, {
      page: readPage(input),
      limit: readLimit(input),
    });
    return { items };
  },

  async holded_get_service(apiKey, input) {
    const item = await holdedAdapter.getService(apiKey, requiredString(input, 'serviceId'));
    return { item };
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

  async holded_list_daily_ledger(apiKey, input) {
    const items = await holdedAdapter.listDailyLedger(apiKey, {
      page: readPage(input),
      starttmp: optionalUnixTimestamp(input, 'startTimestamp'),
      endtmp: optionalUnixTimestamp(input, 'endTimestamp'),
    });
    return { items };
  },

  async holded_list_accounts(apiKey, input) {
    const items = await holdedAdapter.listAccounts(apiKey, {
      page: readPage(input),
      limit: readLimit(input),
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

  async holded_list_projects(apiKey, input) {
    const items = await holdedAdapter.listProjects(apiKey, {
      page: readPage(input),
      limit: readLimit(input),
    });
    return { items };
  },

  async holded_get_project(apiKey, input) {
    const item = await holdedAdapter.getProject(apiKey, requiredString(input, 'projectId'));
    return { item };
  },

  async holded_list_project_tasks(apiKey, input) {
    const items = await holdedAdapter.listProjectTasks(apiKey, requiredString(input, 'projectId'), {
      page: readPage(input),
      limit: readLimit(input),
    });
    return { items };
  },

  async holded_create_invoice_draft(apiKey, input) {
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
};

export const holdedMcpTools: HoldedMcpToolDefinition[] = [
  readTool(
    'holded_list_invoices',
    'List invoices in Holded',
    'List invoice documents for the currently authorized tenant connected to Holded. Use year or from/to when you need older history such as 2025.',
    listSchema({
      status: stringProperty(
        'Optional Holded invoice status filter, if supported by the tenant account.'
      ),
      year: yearProperty,
      from: isoDateProperty,
      to: isoDateProperty,
    })
  ),
  readTool(
    'holded_get_invoice',
    'Get one invoice from Holded',
    'Retrieve a single invoice document from Holded by its invoice id.',
    simpleSchema(
      {
        invoiceId: stringProperty(
          'The Holded invoice identifier returned by a previous invoice listing.'
        ),
      },
      ['invoiceId']
    )
  ),
  readTool(
    'holded_list_documents',
    'List documents in Holded',
    'List invoice and sales documents from Holded for the currently authorized tenant. Use year or from/to when you need older history such as 2025.',
    listSchema({
      status: stringProperty('Optional Holded document status filter.'),
      docType: stringProperty('Optional Holded document type filter such as invoice or estimate.'),
      year: yearProperty,
      from: isoDateProperty,
      to: isoDateProperty,
    })
  ),
  readTool(
    'holded_get_document',
    'Get one document from Holded',
    'Retrieve a single Holded document by type and id.',
    simpleSchema(
      {
        docType: stringProperty('The Holded document type, for example invoice or estimate.'),
        documentId: stringProperty('The Holded document identifier.'),
      },
      ['docType', 'documentId']
    )
  ),
  writeTool(
    'holded_create_document',
    'Create a document in Holded',
    'Create a document in Holded with explicit confirmation.',
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
    'Update an existing Holded document with explicit confirmation.',
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
    'Delete an existing Holded document with explicit confirmation.',
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
    'Send an existing Holded document by email with explicit confirmation.',
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
    'Register a payment for an existing Holded document with explicit confirmation.',
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
    'Retrieve a Holded document PDF as base64 together with filename and content type metadata.',
    simpleSchema(
      {
        docType: stringProperty('The Holded document type, for example invoice or estimate.'),
        documentId: stringProperty('The Holded document identifier.'),
      },
      ['docType', 'documentId']
    )
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
    'List customer or supplier contacts from Holded for the currently authorized tenant.',
    listSchema()
  ),
  readTool(
    'holded_get_contact',
    'Get one contact from Holded',
    'Retrieve a single Holded contact by id.',
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
    'Delete a Holded contact with explicit confirmation.',
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
    'Delete a Holded product with explicit confirmation.',
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
    'Delete a Holded warehouse with explicit confirmation.',
    writeSchema({ warehouseId: stringProperty('The Holded warehouse identifier.') }, [
      'warehouseId',
    ]),
    { destructiveHint: true }
  ),
  readTool(
    'holded_list_payments',
    'List payments in Holded',
    'List payments from Holded for the currently authorized tenant.',
    listSchema()
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
    'Delete a Holded payment with explicit confirmation.',
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
    'Delete a Holded contact group with explicit confirmation.',
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
    'Delete a Holded service with explicit confirmation.',
    writeSchema({ serviceId: stringProperty('The Holded service identifier.') }, ['serviceId']),
    { destructiveHint: true }
  ),
  readTool(
    'holded_list_accounts',
    'List accounting accounts in Holded',
    'List accounting accounts available in Holded for the currently authorized tenant.',
    listSchema()
  ),
  readTool(
    'holded_list_daily_ledger',
    'List daily ledger entries in Holded',
    'List daily ledger entries from Holded. Use timestamps when you need a bounded accounting window.',
    listSchema({
      startTimestamp: unixTimestampProperty,
      endTimestamp: unixTimestampProperty,
    })
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
    'Create a draft invoice in Holded for the currently authorized tenant. This is kept for backward compatibility and requires explicit confirmation.',
    writeSchema(
      {
        docType: stringProperty('Document type to create in Holded.', { defaultValue: 'invoice' }),
        payload: documentCreatePayloadProperty(
          'Draft invoice payload for Holded. It must include contactId plus at least one line item. Prefer lines with desc, units, price and tax. The connector also accepts products as a compatibility alias and fills date automatically when omitted.'
        ),
      },
      ['payload']
    )
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
