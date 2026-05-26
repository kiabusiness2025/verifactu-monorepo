// Mindbody ERP adapter — stub pending client API access.
// API docs: https://developers.mindbodyonline.com/
// Auth: API key + SiteId header. Base URL: https://api.mindbodyonline.com/public/v6/

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

export class MindbodyErpClient implements ErpClient {
  readonly provider = 'mindbody' as const;

  constructor(private readonly _apiKey: string) {}

  listInvoices(_params?: ListInvoicesParams): Promise<ErpInvoice[]> {
    throw new Error('Mindbody connector not yet implemented — awaiting API access');
  }
  getInvoice(_id: string): Promise<ErpInvoice | null> {
    throw new Error('Mindbody connector not yet implemented — awaiting API access');
  }
  listContacts(_params?: ListContactsParams): Promise<ErpContact[]> {
    throw new Error('Mindbody connector not yet implemented — awaiting API access');
  }
  listProducts(): Promise<ErpProduct[]> {
    throw new Error('Mindbody connector not yet implemented — awaiting API access');
  }
  listAccountEntries(): Promise<ErpAccountEntry[]> {
    throw new Error('Mindbody connector not yet implemented — awaiting API access');
  }
  getSnapshot(): Promise<ErpSnapshot> {
    throw new Error('Mindbody connector not yet implemented — awaiting API access');
  }
}
