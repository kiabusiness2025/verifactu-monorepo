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
  body.set("scope", process.env.EINFORMA_SCOPE ?? "buscar:consultar:empresas");

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

  // Construir la URL y codificar parámetros manualmente para evitar problemas de encoding
  const url = new URL(path, base);
  if (params && Object.keys(params).length > 0) {
    // Usar URLSearchParams para codificar correctamente
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        searchParams.append(key, value);
      }
    }
    url.search = searchParams.toString();
  }

  const res = await fetchWithTimeout(
    url.toString(),
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    },
    timeoutMs
  );

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`eInforma API error ${res.status}: ${text}`);
  }

  return res.json() as Promise<T>;
}

function normalizeSearchResults(data: any): Array<any> {
  return (
    data?.resultado?.empresaResultado ??
    data?.empresaResultado ??
    data?.resultado?.empresa ??
    data?.empresa ??
    data?.items ??
    []
  );
}

export async function searchCompanies(q: string): Promise<EinformaSearchItem[]> {
  let lastError: unknown = null;

  // 1. Buscar por companySearch (nombre, marca, etc.)
  try {
    const data = await einformaRequest<any>("/companies", { companySearch: q });
    const items = normalizeSearchResults(data);
    if (Array.isArray(items) && items.length > 0) {
      return items.map((item: any) => ({
        name: item?.denominacion ?? item?.name ?? item?.denominacionBusqueda ?? "",
        nif: item?.identificativo ?? item?.nif ?? item?.cif,
        province: item?.provincia ?? item?.province,
        id: item?.id ?? item?.identificativo ?? item?.codigo,
      }));
    }
  } catch (error) {
    lastError = error;
  }

  // 2. Si no hay resultados, buscar por NIF (opcional, si la API lo soporta)
  try {
    const data = await einformaRequest<any>("/companies", { companySearch: q });
    const items = normalizeSearchResults(data);
    if (Array.isArray(items) && items.length > 0) {
      return items.map((item: any) => ({
        name: item?.denominacion ?? item?.name ?? item?.denominacionBusqueda ?? "",
        nif: item?.identificativo ?? item?.nif ?? item?.cif,
        province: item?.provincia ?? item?.province,
        id: item?.id ?? item?.identificativo ?? item?.codigo,
      }));
    }
  } catch (error) {
    lastError = error;
  }

  if (lastError) {
    throw lastError;
  }

  return [];
}

export async function getCompanyProfileByNif(
  nifOrId: string
): Promise<EinformaCompanyProfile> {
  const data = await einformaRequest<any>(`/companies/${encodeURIComponent(nifOrId)}/report`);
  const item = data?.empresa ?? data?.company ?? data;
  return {
    name: item?.denominacion ?? item?.name ?? "",
    legalName: item?.razonSocial ?? item?.legalName,
    nif: item?.identificativo ?? item?.nif ?? item?.cif,
    cnae: item?.cnae ?? item?.codigoCnae,
    address: {
      street: item?.domicilioSocial ?? item?.address?.street,
      zip: item?.cp ?? item?.address?.zip,
      city: item?.localidad ?? item?.address?.city,
      province: item?.provincia ?? item?.address?.province,
      country: item?.address?.country ?? "ES",
    },
    constitutionDate: item?.fechaConstitucion ?? item?.constitutionDate,
    representatives: (item?.administradores ?? item?.representatives ?? []).map(
      (rep: any) => ({
        name: rep?.nombre ?? rep?.name,
        role: rep?.cargo ?? rep?.role,
      })
    ),
    raw: data,
  };
}
