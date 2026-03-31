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

const confirmProperty = {
  type: 'boolean',
  description: 'Must be true to confirm that the user explicitly approved this write action.',
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

function requireConfirm(input: Record<string, unknown>) {
  if (input.confirm !== true) {
    throw new Error('confirm=true is required for write operations');
  }
}

function ensureDocumentCreatePayload(payload: Record<string, unknown>) {
  if (typeof payload.contactId !== 'string' || !payload.contactId.trim()) {
    throw new Error('payload.contactId is required');
  }

  if (!Array.isArray(payload.lines) || payload.lines.length === 0) {
    throw new Error('payload.lines must be a non-empty array');
  }
}

const toolHandlers: Record<string, HoldedMcpToolHandler> = {
  async holded_list_invoices(apiKey, input) {
    const items = await holdedAdapter.listInvoices(apiKey, {
      page: readPage(input),
      limit: readLimit(input),
      status: optionalString(input, 'status'),
    });
    return { items };
  },

  async holded_get_invoice(apiKey, input) {
    const item = await holdedAdapter.getInvoice(apiKey, requiredString(input, 'invoiceId'));
    return { item };
  },

  async holded_list_documents(apiKey, input) {
    const items = await holdedAdapter.listDocuments(apiKey, {
      page: readPage(input),
      limit: readLimit(input),
      status: optionalString(input, 'status'),
      docType: optionalString(input, 'docType'),
    });
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
    ensureDocumentCreatePayload(payload);
    const created = await holdedAdapter.createDocument(apiKey, docType, payload);
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

  async holded_list_accounts(apiKey, input) {
    const items = await holdedAdapter.listAccounts(apiKey, {
      page: readPage(input),
      limit: readLimit(input),
    });
    return { items };
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
    ensureDocumentCreatePayload(payload);
    const created = await holdedAdapter.createDocument(apiKey, docType, payload);
    return { created };
  },
};

export const holdedMcpTools: HoldedMcpToolDefinition[] = [
  readTool(
    'holded_list_invoices',
    'List invoices in Holded',
    'List invoice documents for the currently authorized tenant connected to Holded.',
    listSchema({
      status: stringProperty(
        'Optional Holded invoice status filter, if supported by the tenant account.'
      ),
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
    'List invoice and sales documents from Holded for the currently authorized tenant.',
    listSchema({
      status: stringProperty('Optional Holded document status filter.'),
      docType: stringProperty('Optional Holded document type filter such as invoice or estimate.'),
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
        payload: payloadProperty(
          'Document payload for Holded. It must include contactId and a non-empty lines array.'
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
        payload: payloadProperty(
          'Draft invoice payload for Holded. It must include contactId and a non-empty lines array.'
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
