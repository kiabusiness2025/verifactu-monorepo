/**
 * Admin API Client
 * Type-safe fetch wrappers for admin endpoints
 */

/**
 * Generic GET request to admin API
 */
export async function adminGet<T>(path: string): Promise<T> {
  const res = await fetch(path, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    const msg = await res.text().catch(() => "Unknown error");
    throw new Error(`Admin API error ${res.status}: ${msg}`);
  }

  return res.json() as Promise<T>;
}

/**
 * Generic POST request to admin API
 */
export async function adminPost<T>(path: string, body: any): Promise<T> {
  const res = await fetch(path, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const msg = await res.text().catch(() => "Unknown error");
    throw new Error(`Admin API error ${res.status}: ${msg}`);
  }

  return res.json() as Promise<T>;
}

/**
 * Generic PATCH request to admin API
 */
export async function adminPatch<T>(path: string, body: any): Promise<T> {
  const res = await fetch(path, {
    method: "PATCH",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const msg = await res.text().catch(() => "Unknown error");
    throw new Error(`Admin API error ${res.status}: ${msg}`);
  }

  return res.json() as Promise<T>;
}

/**
 * Generic DELETE request to admin API
 */
export async function adminDelete<T>(path: string): Promise<T> {
  const res = await fetch(path, {
    method: "DELETE",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    const msg = await res.text().catch(() => "Unknown error");
    throw new Error(`Admin API error ${res.status}: ${msg}`);
  }

  return res.json() as Promise<T>;
}

/**
 * Type definitions for admin API responses
 */
export type TenantRow = {
  id: string;
  legalName: string;
  taxId: string;
  address?: string | null;
  cnae?: string | null;
  createdAt?: string;
};

export type UserRow = {
  id: string;
  email: string;
  displayName: string | null;
  createdAt: string;
  tenants: Array<{
    tenantId: string;
    legalName: string;
    role: string;
  }>;
};

export type AccountingData = {
  period: {
    from: string;
    to: string;
  };
  totals: {
    revenue: number;
    invoices: number;
    expenses: number;
    profit: number;
  };
  monthly: Array<{
    month: string;
    revenue: number;
    invoices: number;
  }>;
  byTenant?: Array<{
    tenantId: string;
    legalName: string;
    revenue: number;
    invoices: number;
  }>;
};
