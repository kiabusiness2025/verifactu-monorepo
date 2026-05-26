// WooCommerce ERP adapter — stub pending client API access.
// API docs: https://woocommerce.github.io/woocommerce-rest-api-docs/
// Auth: Basic (Consumer Key + Secret) or OAuth 1.0a. Base URL: {siteUrl}/wp-json/wc/v3/

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

export class WooCommerceErpClient implements ErpClient {
  readonly provider = 'woocommerce' as const;

  constructor(private readonly _apiKey: string) {}

  listInvoices(_params?: ListInvoicesParams): Promise<ErpInvoice[]> {
    throw new Error('WooCommerce connector not yet implemented — awaiting API access');
  }
  getInvoice(_id: string): Promise<ErpInvoice | null> {
    throw new Error('WooCommerce connector not yet implemented — awaiting API access');
  }
  listContacts(_params?: ListContactsParams): Promise<ErpContact[]> {
    throw new Error('WooCommerce connector not yet implemented — awaiting API access');
  }
  listProducts(): Promise<ErpProduct[]> {
    throw new Error('WooCommerce connector not yet implemented — awaiting API access');
  }
  listAccountEntries(): Promise<ErpAccountEntry[]> {
    throw new Error('WooCommerce connector not yet implemented — awaiting API access');
  }
  getSnapshot(): Promise<ErpSnapshot> {
    throw new Error('WooCommerce connector not yet implemented — awaiting API access');
  }
}
