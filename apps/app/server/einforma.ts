import 'server-only';
import { prisma } from '@/lib/prisma';

type TokenCache = { accessToken: string; expiresAt: number };

let tokenCache: TokenCache | null = null;

function looksLikeAudience(value: string) {
  return value.startsWith('http://') || value.startsWith('https://') || value.includes('/');
}

function isInvalidGrant(status: number, text: string) {
  return status === 400 && text.includes('invalid_grant');
}

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env var ${name}`);
  return value;
}

async function fetchWithTimeout(input: RequestInfo, init: RequestInit = {}, timeoutMs = 8000) {
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

  const tokenUrl = requireEnv('EINFORMA_TOKEN_URL');
  const clientId = requireEnv('EINFORMA_CLIENT_ID');
  const clientSecret = requireEnv('EINFORMA_CLIENT_SECRET');
  const timeoutMs = Number(process.env.EINFORMA_TIMEOUT_MS ?? 8000);

  const scope = process.env.EINFORMA_SCOPE?.trim();
  const audience = process.env.EINFORMA_AUDIENCE?.trim();
  const legacyScopeOrAudience = process.env.EINFORMA_AUDIENCE_OR_SCOPE?.trim();
  const basePayload: Record<string, string> = {
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret,
  };

  const candidates: Record<string, string>[] = [];
  if (scope || audience) {
    candidates.push({
      ...basePayload,
      ...(scope ? { scope } : {}),
      ...(audience ? { audience } : {}),
    });
  } else if (legacyScopeOrAudience) {
    candidates.push({
      ...basePayload,
      ...(looksLikeAudience(legacyScopeOrAudience)
        ? { audience: legacyScopeOrAudience }
        : { scope: legacyScopeOrAudience }),
    });
    candidates.push({
      ...basePayload,
      ...(looksLikeAudience(legacyScopeOrAudience)
        ? { scope: legacyScopeOrAudience }
        : { audience: legacyScopeOrAudience }),
    });
  } else {
    candidates.push({ ...basePayload, scope: 'buscar:consultar:empresas' });
  }
  candidates.push(basePayload);

  let lastError = '';
  for (const payload of candidates) {
    const body = new URLSearchParams(payload);
    const res = await fetchWithTimeout(
      tokenUrl,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
      },
      timeoutMs
    );

    if (res.ok) {
      const json = (await res.json()) as {
        access_token: string;
        expires_in?: number;
      };
      const expiresInMs = (json.expires_in ?? 3600) * 1000;
      tokenCache = { accessToken: json.access_token, expiresAt: now + expiresInMs };
      return json.access_token;
    }

    const text = await res.text().catch(() => '');
    lastError = `eInforma token error ${res.status}: ${text}`;
    if (!isInvalidGrant(res.status, text)) {
      throw new Error(lastError);
    }
  }

  throw new Error(lastError || 'eInforma token error: unknown');
}

export type EinformaSearchItem = {
  name: string;
  nif?: string;
  province?: string;
  city?: string;
  id?: string;
};

export type EinformaCompanyProfile = {
  name: string;
  legalName?: string;
  tradeName?: string;
  nif?: string;
  cnae?: string;
  email?: string;
  phone?: string;
  website?: string;
  legalForm?: string;
  status?: string;
  employees?: number;
  sales?: number;
  salesYear?: number;
  capitalSocial?: number;
  lastBalanceDate?: string;
  sourceId?: string;
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
  const base =
    process.env.EINFORMA_API_BASE_URL ??
    process.env.EINFORMA_BASE_URL ??
    requireEnv('EINFORMA_API_BASE_URL');
  const token = await getAccessToken();
  const timeoutMs = Number(process.env.EINFORMA_TIMEOUT_MS ?? 8000);

  const url = new URL(path, base);
  if (params) {
    Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
  }

  const res = await fetchWithTimeout(
    url.toString(),
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    },
    timeoutMs
  );

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`eInforma API error ${res.status} [${url.toString()}]: ${text}`);
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

function normalizeTaxId(value: string) {
  return value.replace(/\s+/g, '').toUpperCase();
}

function ttlFromDays(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}

async function getCache<T>(queryType: string, queryValue: string) {
  const item = await prisma.einformaLookup.findUnique({
    where: { queryType_queryValue: { queryType, queryValue } },
    select: { expiresAt: true, normalized: true },
  });
  if (!item) return null;
  if (item.expiresAt <= new Date()) return null;
  return item.normalized as T;
}

async function setCache(
  queryType: string,
  queryValue: string,
  raw: unknown,
  normalized: unknown,
  ttlDays: number
) {
  const expiresAt = ttlFromDays(ttlDays);
  await prisma.einformaLookup.upsert({
    where: { queryType_queryValue: { queryType, queryValue } },
    create: {
      queryType,
      queryValue,
      raw: raw as any,
      normalized: normalized as any,
      expiresAt,
    },
    update: {
      raw: raw as any,
      normalized: normalized as any,
      expiresAt,
    },
  });
}

export async function searchCompanies(q: string): Promise<EinformaSearchItem[]> {
  const queryValue = q.trim().toLowerCase();
  if (!queryValue) return [];

  const cached = await getCache<EinformaSearchItem[]>('NAME', queryValue);
  if (cached) return cached;

  const data = await einformaRequest<any>('/companies', { companySearch: q });
  const items = normalizeSearchResults(data);
  const normalized = (Array.isArray(items) ? items : []).map((item: any) => ({
    name: item?.denominacion ?? item?.name ?? item?.denominacionBusqueda ?? '',
    nif: item?.identificativo ?? item?.nif ?? item?.cif,
    province: item?.provincia ?? item?.province,
    city: item?.localidad ?? item?.city,
    id: item?.id ?? item?.identificativo ?? item?.codigo,
  }));

  await setCache('NAME', queryValue, data, normalized, 7);
  return normalized;
}

export async function getCompanyProfileByNif(nifOrId: string): Promise<EinformaCompanyProfile> {
  const queryValue = normalizeTaxId(nifOrId);
  const cached = await getCache<EinformaCompanyProfile>('TAX_ID', queryValue);
  if (cached) return cached;

  const data = await einformaRequest<any>(`/companies/${encodeURIComponent(nifOrId)}/report`);
  const item = data?.empresa ?? data?.company ?? data;
  const normalized = {
    name: item?.denominacion ?? item?.name ?? '',
    tradeName: item?.nombreComercial ?? item?.tradeName,
    legalName: item?.razonSocial ?? item?.legalName,
    nif: item?.identificativo ?? item?.nif ?? item?.cif,
    cnae: item?.cnae ?? item?.codigoCnae,
    email: item?.email,
    phone: item?.telefono ?? item?.phone,
    website: item?.web ?? item?.website,
    legalForm: item?.formaJuridica ?? item?.legalForm,
    status: item?.situacion ?? item?.status,
    employees:
      typeof item?.empleados === 'number' ? item.empleados : Number(item?.empleados ?? NaN),
    sales: typeof item?.ventas === 'number' ? item.ventas : Number(item?.ventas ?? NaN),
    salesYear:
      typeof item?.anioVentas === 'number' ? item.anioVentas : Number(item?.anioVentas ?? NaN),
    capitalSocial:
      typeof item?.capitalSocial === 'number'
        ? item.capitalSocial
        : Number(item?.capitalSocial ?? NaN),
    lastBalanceDate: item?.fechaUltimoBalance ?? item?.lastBalanceDate,
    sourceId: item?.identificativo ?? item?.id ?? item?.codigo,
    address: {
      street: item?.domicilioSocial ?? item?.address?.street,
      zip: item?.cp ?? item?.address?.zip,
      city: item?.localidad ?? item?.address?.city,
      province: item?.provincia ?? item?.address?.province,
      country: item?.address?.country ?? 'ES',
    },
    constitutionDate: item?.fechaConstitucion ?? item?.constitutionDate,
    representatives: (item?.administradores ?? item?.representatives ?? []).map((rep: any) => ({
      name: rep?.nombre ?? rep?.name,
      role: rep?.cargo ?? rep?.role,
    })),
    raw: data,
  } satisfies EinformaCompanyProfile;

  await setCache('TAX_ID', queryValue, data, normalized, 30);
  return normalized;
}
