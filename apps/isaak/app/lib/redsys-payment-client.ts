// Redsys payment adapter — stub pending client API access.
// Gateway bancario español; procesa ~90% del e-commerce en España. Integra Bizum y SEPA.
// API docs: https://pagosonline.redsys.es/desarrolladores.html
// Auth: Merchant code + SHA-256 HMAC signature. Base URL: https://sis.redsys.es/

import type {
  ListTransactionsParams,
  PaymentBalance,
  PaymentClient,
  PaymentCustomer,
  PaymentPayout,
  PaymentTransaction,
} from './payment-client';

export class RedsysPaymentClient implements PaymentClient {
  readonly provider = 'redsys' as const;

  constructor(private readonly _apiKey: string) {}

  listTransactions(_params?: ListTransactionsParams): Promise<PaymentTransaction[]> {
    throw new Error('Redsys connector not yet implemented — awaiting API access');
  }
  listCustomers(): Promise<PaymentCustomer[]> {
    throw new Error('Redsys connector not yet implemented — awaiting API access');
  }
  listPayouts(): Promise<PaymentPayout[]> {
    throw new Error('Redsys connector not yet implemented — awaiting API access');
  }
  getBalance(): Promise<PaymentBalance> {
    throw new Error('Redsys connector not yet implemented — awaiting API access');
  }
}
