export type VerifactuOpsResponse = {
  ok: boolean;
  certPath?: string;
  certFound?: boolean;
  passLength?: number;
  wsdlUrl?: string | null;
  operations?: Array<{ service: string; port: string; operation: string }>;
  error?: string;
};

type RegisterInvoiceResponse = {
  ok: boolean;
  data?: unknown;
  error?: string;
};

export type DashboardSummaryResponse = {
  totals?: {
    sales?: number;
    expenses?: number;
    profit?: number;
  };
  activity?: Array<{ title: string; time: string; tone?: "ok" | "warn" }>;
  deadlines?: Array<{ name: string; dateLabel: string }>;
  error?: string;
};

function getApiBase(): string {
  return (
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.NEXT_PUBLIC_API_BASE ||
    process.env.API_BASE ||
    "https://api.verifactu.business"
  ).replace(/\/$/, "");
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const base = getApiBase();
  const url = path.startsWith("http") ? path : `${base}${path}`;

  const res = await fetch(url, {
    ...init,
    credentials: init?.credentials ?? "include",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API error ${res.status}: ${text}`);
  }

  // /api/healthz devuelve texto plano
  const contentType = res.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    return (await res.text()) as unknown as T;
  }

  return (await res.json()) as T;
}

export const apiClient = {
  getHealth(): Promise<string> {
    return apiFetch<string>("/api/healthz");
  },

  getVerifactuOps(): Promise<VerifactuOpsResponse> {
    return apiFetch<VerifactuOpsResponse>("/api/verifactu/ops");
  },

  registerInvoice(): Promise<RegisterInvoiceResponse> {
    // Backend actual no consume body; no inventamos payload.
    return apiFetch<RegisterInvoiceResponse>("/api/verifactu/register-invoice", {
      method: "POST",
      body: JSON.stringify({}),
    });
  },

  getDashboardSummary(period: string): Promise<DashboardSummaryResponse> {
    const search = new URLSearchParams({ period }).toString();
    return apiFetch<DashboardSummaryResponse>(`/api/dashboard/summary?${search}`);
  },
};
