// PrestaShop ERP adapter — stub pending client API access.
// API docs: https://devdocs.prestashop-project.org/8/webservice/
// Auth: API key as Basic auth username (password empty). Base URL: {shopUrl}/api/

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

export class PrestaShopErpClient implements ErpClient {
  readonly provider = 'prestashop' as const;

  constructor(private readonly _apiKey: string) {}

  listInvoices(_params?: ListInvoicesParams): Promise<ErpInvoice[]> {
    throw new Error('PrestaShop connector not yet implemented — awaiting API access');
  }
  getInvoice(_id: string): Promise<ErpInvoice | null> {
    throw new Error('PrestaShop connector not yet implemented — awaiting API access');
  }
  listContacts(_params?: ListContactsParams): Promise<ErpContact[]> {
    throw new Error('PrestaShop connector not yet implemented — awaiting API access');
  }
  listProducts(): Promise<ErpProduct[]> {
    throw new Error('PrestaShop connector not yet implemented — awaiting API access');
  }
  listAccountEntries(): Promise<ErpAccountEntry[]> {
    throw new Error('PrestaShop connector not yet implemented — awaiting API access');
  }
  getSnapshot(): Promise<ErpSnapshot> {
    throw new Error('PrestaShop connector not yet implemented — awaiting API access');
  }
}
