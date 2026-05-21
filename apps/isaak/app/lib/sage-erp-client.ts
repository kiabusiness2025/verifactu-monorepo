// Sage 200c ERP adapter — P3-4-A implementation pending.
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

export class SageErpClient implements ErpClient {
  readonly provider = 'sage_200c' as const;

  constructor(private readonly _accessToken: string) {}

  listInvoices(_params?: ListInvoicesParams): Promise<ErpInvoice[]> {
    throw new Error('Sage 200c connector not yet implemented (P3-4-A)');
  }
  getInvoice(_id: string): Promise<ErpInvoice | null> {
    throw new Error('Sage 200c connector not yet implemented (P3-4-A)');
  }
  listContacts(_params?: ListContactsParams): Promise<ErpContact[]> {
    throw new Error('Sage 200c connector not yet implemented (P3-4-A)');
  }
  listProducts(): Promise<ErpProduct[]> {
    throw new Error('Sage 200c connector not yet implemented (P3-4-A)');
  }
  listAccountEntries(): Promise<ErpAccountEntry[]> {
    throw new Error('Sage 200c connector not yet implemented (P3-4-A)');
  }
  getSnapshot(): Promise<ErpSnapshot> {
    throw new Error('Sage 200c connector not yet implemented (P3-4-A)');
  }
}
