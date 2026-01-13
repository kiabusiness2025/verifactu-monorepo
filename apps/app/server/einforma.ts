import "server-only";

type TokenCache = { accessToken: string; expiresAt: number };

let tokenCache: TokenCache | null = null;

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env var ${name}`);
  return value;
}

async function fetchWithTimeout(
  input: RequestInfo,
  init: RequestInit = {},
  timeoutMs = 8000
) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}

async function getAccessToken(): Promise<string> {
  const now = Date.now();
  if (tokenCache && tokenCache.expiresAt > now + 30_000) {
    return tokenCache.accessToken;
  }

  const tokenUrl = requireEnv("EINFORMA_TOKEN_URL");
  const clientId = requireEnv("EINFORMA_CLIENT_ID");
  const clientSecret = requireEnv("EINFORMA_CLIENT_SECRET");
  const timeoutMs = Number(process.env.EINFORMA_TIMEOUT_MS ?? 8000);

  const body = new URLSearchParams();
  body.set("grant_type", "client_credentials");
  body.set("client_id", clientId);
  body.set("client_secret", clientSecret);

  const res = await fetchWithTimeout(
    tokenUrl,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    },
    timeoutMs
  );

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`eInforma token error ${res.status}: ${text}`);
  }

  const json = (await res.json()) as {
    access_token: string;
    expires_in?: number;
  };
  const expiresInMs = (json.expires_in ?? 3600) * 1000;
  tokenCache = { accessToken: json.access_token, expiresAt: now + expiresInMs };
  return json.access_token;
}

export type EinformaSearchItem = {
  name: string;
  nif?: string;
  province?: string;
  id?: string;
};

export type EinformaCompanyProfile = {
  name: string;
  legalName?: string;
  nif?: string;
  cnae?: string;
  address?: {
    street?: string;
    zip?: string;
    city?: string;
    province?: string;
    country?: string;
  };
  constitutionDate?: string;
  representatives?: Array<{ name: string; role?: string }>;
  raw?: unknown;
};

async function einformaRequest<T>(path: string, params?: Record<string, string>) {
  const base = requireEnv("EINFORMA_API_BASE_URL");
  const token = await getAccessToken();
  const timeoutMs = Number(process.env.EINFORMA_TIMEOUT_MS ?? 8000);

  const url = new URL(path, base);
  if (params) {
    Object.entries(params).forEach(([key, value]) =>
      url.searchParams.set(key, value)
    );
  }

  const res = await fetchWithTimeout(
    url.toString(),
    {
      headers: { Authorization: `Bearer ${token}` },
    },
    timeoutMs
  );

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`eInforma API error ${res.status}: ${text}`);
  }

  return res.json() as Promise<T>;
}

export async function searchCompanies(q: string): Promise<EinformaSearchItem[]> {
  const data = await einformaRequest<any>("/search", { q });
  return (data?.items ?? []).map((item: any) => ({
    name: item?.name ?? item?.denominacion ?? "",
    nif: item?.nif ?? item?.cif,
    province: item?.province ?? item?.provincia,
    id: item?.id ?? item?.codigo,
  }));
}

export async function getCompanyProfileByNif(
  nif: string
): Promise<EinformaCompanyProfile> {
  const data = await einformaRequest<any>("/company", { nif });
  return {
    name: data?.name ?? data?.denominacion ?? "",
    legalName: data?.legalName ?? data?.razonSocial,
    nif: data?.nif ?? data?.cif,
    cnae: data?.cnae ?? data?.codigoCnae,
    address: {
      street: data?.address?.street ?? data?.domicilio,
      zip: data?.address?.zip ?? data?.cp,
      city: data?.address?.city ?? data?.municipio,
      province: data?.address?.province ?? data?.provincia,
      country: data?.address?.country ?? "ES",
    },
    constitutionDate: data?.constitutionDate ?? data?.fechaConstitucion,
    representatives: (data?.representatives ?? data?.administradores ?? []).map(
      (rep: any) => ({
        name: rep?.name ?? rep?.nombre,
        role: rep?.role ?? rep?.cargo,
      })
    ),
    raw: data,
  };
}
