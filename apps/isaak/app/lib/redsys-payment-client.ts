// Redsys payment adapter.
// Gateway bancario español; procesa ~90% del e-commerce en España. Integra Bizum y SEPA.
// API docs: https://pagosonline.redsys.es/desarrolladores.html
// Auth: Merchant code + HMAC-SHA256 signature over base64-encoded parameters.
// Stored credential format: "merchantCode:secretKey" (split at first colon).
// Base URL prod: https://sis.redsys.es  /  test: https://sis-t.redsys.es:25443

import { createCipheriv, createHmac } from 'crypto';

import type {
  ListTransactionsParams,
  PaymentBalance,
  PaymentClient,
  PaymentCustomer,
  PaymentPayout,
  PaymentTransaction,
} from './payment-client';

// ── Redsys API shapes ──────────────────────────────────────────────────────────

type RdOperationItem = {
  Ds_Order?: string;
  Ds_MerchantCode?: string;
  Ds_TransactionType?: string;
  Ds_Amount?: string;
  Ds_Currency?: string;
  Ds_Date?: string;
  Ds_Hour?: string;
  Ds_Response?: string;
  Ds_AuthorisationCode?: string;
  Ds_Card_Number?: string;
};

type RdQueryResponse = {
  Ds_ErrorCode?: string;
  Operations?: RdOperationItem | RdOperationItem[];
  TotalNumOperations?: string;
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function encryptWith3Des(key: Buffer, data: Buffer): Buffer {
  const cipher = createCipheriv('des-ede3-cbc', key, Buffer.alloc(8));
  return Buffer.concat([cipher.update(data), cipher.final()]);
}

function signRequest(merchantParams: string, key: Buffer): string {
  // Redsys SHA-256 signature: HMAC-SHA256(base64(key_3des_encrypted_with_order), params)
  // For the query endpoint with no order, we sign directly with a fixed order value.
  const fixedOrder = '0000000001';
  const encKey = encryptWith3Des(key, Buffer.from(fixedOrder));
  return createHmac('sha256', encKey).update(merchantParams).digest('base64');
}

// ── Client ─────────────────────────────────────────────────────────────────────

export class RedsysPaymentClient implements PaymentClient {
  readonly provider = 'redsys' as const;
  private readonly baseUrl: string;
  private readonly merchantCode: string;
  private readonly secretKey: Buffer;

  constructor(credential: string) {
    // Format: "merchantCode:secretKey" or "merchantCode:secretKey:test"
    const parts = credential.split(':');
    this.merchantCode = parts[0] ?? '';
    const rawKey = parts[1] ?? '';
    const isTest = parts[2] === 'test';
    this.baseUrl = isTest ? 'https://sis-t.redsys.es:25443' : 'https://sis.redsys.es';
    // Redsys merchant key is base64-encoded — decode to raw bytes for HMAC
    try {
      this.secretKey = Buffer.from(rawKey, 'base64');
    } catch {
      this.secretKey = Buffer.from(rawKey);
    }
  }

  private buildParams(params: Record<string, string>): { encoded: string; signature: string } {
    const json = JSON.stringify(params);
    const encoded = Buffer.from(json).toString('base64');
    const signature = signRequest(encoded, this.secretKey);
    return { encoded, signature };
  }

  private async query(body: Record<string, unknown>): Promise<RdQueryResponse> {
    const res = await fetch(`${this.baseUrl}/sis/rest/pe/operationQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Redsys error ${res.status}: ${text.slice(0, 200)}`);
    }
    return res.json() as Promise<RdQueryResponse>;
  }

  private mapResponse(code?: string): PaymentTransaction['status'] {
    const c = Number(code ?? 9999);
    if (c >= 0 && c <= 99) return 'succeeded';
    if (c === 400) return 'refunded';
    if (c >= 900 && c <= 999) return 'pending';
    return 'failed';
  }

  async listTransactions(params?: ListTransactionsParams): Promise<PaymentTransaction[]> {
    const now = new Date();
    const from = params?.from
      ? new Date(params.from)
      : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const merchantParams = {
      DS_MERCHANT_MERCHANTCODE: this.merchantCode,
      DS_MERCHANT_DATEFROM: from.toISOString().slice(0, 10).replace(/-/g, ''),
      DS_MERCHANT_DATETO: (params?.to ? new Date(params.to) : now)
        .toISOString()
        .slice(0, 10)
        .replace(/-/g, ''),
      DS_MERCHANT_NUMOPERATIONS: String(params?.limit ?? 100),
    };

    const { encoded, signature } = this.buildParams(merchantParams);
    const data = await this.query({
      DS_SIGNATUREVERSION: 'HMAC_SHA256_V1',
      DS_MERCHANTPARAMETERS: encoded,
      DS_SIGNATURE: signature,
    });

    if (data.Ds_ErrorCode) {
      throw new Error(`Redsys query error: ${data.Ds_ErrorCode}`);
    }

    const ops = data.Operations
      ? Array.isArray(data.Operations)
        ? data.Operations
        : [data.Operations]
      : [];

    return ops.map((op) => ({
      id: op.Ds_Order ?? '',
      amount: Number(op.Ds_Amount ?? 0) / 100,
      currency: op.Ds_Currency === '978' ? 'EUR' : (op.Ds_Currency ?? 'EUR'),
      status: this.mapResponse(op.Ds_Response),
      description: null,
      customerId: null,
      createdAt: op.Ds_Date
        ? `${op.Ds_Date.slice(0, 4)}-${op.Ds_Date.slice(4, 6)}-${op.Ds_Date.slice(6, 8)}`
        : '',
    }));
  }

  // Redsys does not expose a customer list.
  async listCustomers(): Promise<PaymentCustomer[]> {
    return [];
  }

  // Redsys does not expose payout information via API.
  async listPayouts(): Promise<PaymentPayout[]> {
    return [];
  }

  // Redsys does not expose a balance endpoint.
  async getBalance(): Promise<PaymentBalance> {
    return { available: 0, pending: 0, currency: 'EUR' };
  }
}
