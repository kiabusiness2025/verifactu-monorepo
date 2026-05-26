// Revo XEF ERP adapter — stub pending API access.
// API docs available at developer.revo.works (requires Revo account).
// Auth: Bearer token. Base URL: https://revoxef.works/api/external/v1/

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

export class RevoErpClient implements ErpClient {
  readonly provider = 'revo' as const;

  constructor(private readonly _apiKey: string) {}

  listInvoices(_params?: ListInvoicesParams): Promise<ErpInvoice[]> {
    throw new Error('Revo XEF connector not yet implemented — awaiting API access');
  }
  getInvoice(_id: string): Promise<ErpInvoice | null> {
    throw new Error('Revo XEF connector not yet implemented — awaiting API access');
  }
  listContacts(_params?: ListContactsParams): Promise<ErpContact[]> {
    throw new Error('Revo XEF connector not yet implemented — awaiting API access');
  }
  listProducts(): Promise<ErpProduct[]> {
    throw new Error('Revo XEF connector not yet implemented — awaiting API access');
  }
  listAccountEntries(): Promise<ErpAccountEntry[]> {
    throw new Error('Revo XEF connector not yet implemented — awaiting API access');
  }
  getSnapshot(): Promise<ErpSnapshot> {
    throw new Error('Revo XEF connector not yet implemented — awaiting API access');
  }
}
