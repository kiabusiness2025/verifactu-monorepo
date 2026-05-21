// ERP abstraction layer — provider-agnostic interface for Isaak chat and dashboard.
// Holded is implemented directly; Sage 200c and a3innuva via OAuth adapters (P3-4-A/B).

export type ErpProvider = 'holded' | 'sage_200c' | 'a3innuva';

export interface ErpInvoiceLine {
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  total: number;
}

export interface ErpInvoice {
  id: string;
  number: string;
  date: string;
  dueDate?: string;
  contactId: string;
  contactName: string;
  subtotal: number;
  tax: number;
  total: number;
  currency: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled' | 'unknown';
  type: 'invoice' | 'purchase' | 'creditnote' | 'estimate' | 'other';
  lines: ErpInvoiceLine[];
}

export interface ErpContact {
  id: string;
  name: string;
  nif?: string;
  email?: string;
  phone?: string;
  type: 'client' | 'supplier' | 'both' | 'other';
  balance?: number;
}

export interface ErpProduct {
  id: string;
  name: string;
  sku?: string;
  price: number;
  stock?: number;
  taxRate?: number;
}

export interface ErpAccountEntry {
  id: string;
  date: string;
  description: string;
  account: string;
  debit: number;
  credit: number;
}

export interface ErpSnapshot {
  invoices: ErpInvoice[];
  contacts: ErpContact[];
  products?: ErpProduct[];
  entries?: ErpAccountEntry[];
  period: { from: string; to: string };
  fetchedAt: string;
}

export interface ListInvoicesParams {
  type?: ErpInvoice['type'];
  from?: string;
  to?: string;
  contactId?: string;
  limit?: number;
}

export interface ListContactsParams {
  type?: ErpContact['type'];
  limit?: number;
}

export interface ErpClient {
  readonly provider: ErpProvider;

  listInvoices(params?: ListInvoicesParams): Promise<ErpInvoice[]>;
  getInvoice(id: string, type?: ErpInvoice['type']): Promise<ErpInvoice | null>;
  listContacts(params?: ListContactsParams): Promise<ErpContact[]>;
  listProducts(params?: { limit?: number }): Promise<ErpProduct[]>;
  listAccountEntries(params?: {
    from?: string;
    to?: string;
    account?: string;
  }): Promise<ErpAccountEntry[]>;

  // Convenience: fetch a combined snapshot for the system prompt / dashboard.
  getSnapshot(params?: { from?: string; to?: string }): Promise<ErpSnapshot>;
}
