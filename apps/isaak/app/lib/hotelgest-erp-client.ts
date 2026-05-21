// Hotelgest ERP adapter — pending implementation (waiting for API docs from client).
// Stub exported so erp-client-factory.ts compiles. Auth TBD (API key or OAuth).

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

export class HotelgestErpClient implements ErpClient {
  readonly provider = 'hotelgest' as const;

  // Auth TBD: likely API key passed as header. Update once docs arrive.
  constructor(private readonly _apiKey: string) {}

  listInvoices(_params?: ListInvoicesParams): Promise<ErpInvoice[]> {
    throw new Error('Hotelgest connector not yet implemented — awaiting API docs');
  }
  getInvoice(_id: string): Promise<ErpInvoice | null> {
    throw new Error('Hotelgest connector not yet implemented — awaiting API docs');
  }
  listContacts(_params?: ListContactsParams): Promise<ErpContact[]> {
    throw new Error('Hotelgest connector not yet implemented — awaiting API docs');
  }
  listProducts(): Promise<ErpProduct[]> {
    throw new Error('Hotelgest connector not yet implemented — awaiting API docs');
  }
  listAccountEntries(): Promise<ErpAccountEntry[]> {
    throw new Error('Hotelgest connector not yet implemented — awaiting API docs');
  }
  getSnapshot(): Promise<ErpSnapshot> {
    throw new Error('Hotelgest connector not yet implemented — awaiting API docs');
  }
}
