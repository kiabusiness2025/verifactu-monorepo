// a3innuva ERP adapter — P3-4-B implementation pending.
// Stub exported so erp-client-factory.ts compiles. Throws if called before implementation.

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

export class A3ErpClient implements ErpClient {
  readonly provider = 'a3innuva' as const;

  constructor(
    private readonly _accessToken: string,
    private readonly _subscriptionKey: string
  ) {}

  listInvoices(_params?: ListInvoicesParams): Promise<ErpInvoice[]> {
    throw new Error('a3innuva connector not yet implemented (P3-4-B)');
  }
  getInvoice(_id: string): Promise<ErpInvoice | null> {
    throw new Error('a3innuva connector not yet implemented (P3-4-B)');
  }
  listContacts(_params?: ListContactsParams): Promise<ErpContact[]> {
    throw new Error('a3innuva connector not yet implemented (P3-4-B)');
  }
  listProducts(): Promise<ErpProduct[]> {
    throw new Error('a3innuva connector not yet implemented (P3-4-B)');
  }
  listAccountEntries(): Promise<ErpAccountEntry[]> {
    throw new Error('a3innuva connector not yet implemented (P3-4-B)');
  }
  getSnapshot(): Promise<ErpSnapshot> {
    throw new Error('a3innuva connector not yet implemented (P3-4-B)');
  }
}
