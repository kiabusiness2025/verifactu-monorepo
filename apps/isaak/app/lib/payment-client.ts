// PaymentClient interface — abstraction over payment gateways (Stripe, Redsys, Mollie, etc.)
// Analogous to ErpClient but for payment/billing data.

export type PaymentTransaction = {
  id: string;
  amount: number;
  currency: string;
  status: 'succeeded' | 'pending' | 'failed' | 'refunded';
  description: string | null;
  customerId: string | null;
  createdAt: string;
  metadata?: Record<string, string>;
};

export type PaymentCustomer = {
  id: string;
  name: string | null;
  email: string | null;
  createdAt: string;
};

export type PaymentPayout = {
  id: string;
  amount: number;
  currency: string;
  status: string;
  arrivalDate: string | null;
};

export type PaymentBalance = {
  available: number;
  pending: number;
  currency: string;
};

export type ListTransactionsParams = {
  from?: string;
  to?: string;
  limit?: number;
  cursor?: string;
};

export interface PaymentClient {
  readonly provider: string;
  listTransactions(params?: ListTransactionsParams): Promise<PaymentTransaction[]>;
  listCustomers(): Promise<PaymentCustomer[]>;
  listPayouts(): Promise<PaymentPayout[]>;
  getBalance(): Promise<PaymentBalance>;
}
