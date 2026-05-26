// Loyverse POS ERP adapter — stub pending client API access.
// API docs: https://developer.loyverse.com/docs/
// Auth: Bearer token (OAuth 2.0). Base URL: https://api.loyverse.com/v1.0/

import type {
  ErpAccountEntry,
  ErpClient,
  ErpContact,
  ErpInvoice,
  ErpProduct,
  ErpSnapshot,
  ListContactsParams,
  ListInvoicesParams,
} from './erp-client';

export class LoyverseErpClient implements ErpClient {
  readonly provider = 'loyverse' as const;

  constructor(private readonly _apiKey: string) {}

  listInvoices(_params?: ListInvoicesParams): Promise<ErpInvoice[]> {
    throw new Error('Loyverse connector not yet implemented — awaiting API access');
  }
  getInvoice(_id: string): Promise<ErpInvoice | null> {
    throw new Error('Loyverse connector not yet implemented — awaiting API access');
  }
  listContacts(_params?: ListContactsParams): Promise<ErpContact[]> {
    throw new Error('Loyverse connector not yet implemented — awaiting API access');
  }
  listProducts(): Promise<ErpProduct[]> {
    throw new Error('Loyverse connector not yet implemented — awaiting API access');
  }
  listAccountEntries(): Promise<ErpAccountEntry[]> {
    throw new Error('Loyverse connector not yet implemented — awaiting API access');
  }
  getSnapshot(): Promise<ErpSnapshot> {
    throw new Error('Loyverse connector not yet implemented — awaiting API access');
  }
}
