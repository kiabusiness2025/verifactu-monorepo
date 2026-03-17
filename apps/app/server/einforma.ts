import 'server-only';
import { Prisma } from '@verifactu/db';
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

  const baseUrl = base.endsWith('/') ? base : `${base}/`;
  const relativePath = path.replace(/^\/+/, '');
  const url = new URL(relativePath, baseUrl);
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

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

function normalizeSearchResults(data: unknown): unknown[] {
  const row = asRecord(data);
  const resultado = asRecord(row.resultado);
  return (
    (Array.isArray(resultado.empresaResultado) ? resultado.empresaResultado : undefined) ??
    (Array.isArray(row.empresaResultado) ? row.empresaResultado : undefined) ??
    (Array.isArray(resultado.empresa) ? resultado.empresa : undefined) ??
    (Array.isArray(row.empresa) ? row.empresa : undefined) ??
    (Array.isArray(row.items) ? row.items : undefined) ??
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
      raw: raw as Prisma.InputJsonValue,
      normalized: normalized as Prisma.InputJsonValue,
      expiresAt,
    },
    update: {
      raw: raw as Prisma.InputJsonValue,
      normalized: normalized as Prisma.InputJsonValue,
      expiresAt,
    },
  });
}

export async function searchCompanies(q: string): Promise<EinformaSearchItem[]> {
  const queryValue = q.trim().toLowerCase();
  if (!queryValue) return [];

  const cached = await getCache<EinformaSearchItem[]>('NAME', queryValue);
  if (cached) return cached;

  const data = await einformaRequest<unknown>('/companies', { companySearch: q });
  const items = normalizeSearchResults(data);
  const normalized = (Array.isArray(items) ? items : []).map((item) => {
    const row = asRecord(item);
    return {
      name:
        (typeof row.denominacion === 'string' ? row.denominacion : undefined) ??
        (typeof row.name === 'string' ? row.name : undefined) ??
        (typeof row.denominacionBusqueda === 'string' ? row.denominacionBusqueda : undefined) ??
        '',
      nif:
        (typeof row.identificativo === 'string' ? row.identificativo : undefined) ??
        (typeof row.nif === 'string' ? row.nif : undefined) ??
        (typeof row.cif === 'string' ? row.cif : undefined),
      province:
        (typeof row.provincia === 'string' ? row.provincia : undefined) ??
        (typeof row.province === 'string' ? row.province : undefined),
      city:
        (typeof row.localidad === 'string' ? row.localidad : undefined) ??
        (typeof row.city === 'string' ? row.city : undefined),
      id:
        (typeof row.id === 'string' ? row.id : undefined) ??
        (typeof row.identificativo === 'string' ? row.identificativo : undefined) ??
        (typeof row.codigo === 'string' ? row.codigo : undefined),
    };
  });

  await setCache('NAME', queryValue, data, normalized, 7);
  return normalized;
}

export async function getCompanyProfileByNif(nifOrId: string): Promise<EinformaCompanyProfile> {
  const queryValue = normalizeTaxId(nifOrId);
  const cached = await getCache<EinformaCompanyProfile>('TAX_ID', queryValue);
  if (cached) return cached;

  const data = await einformaRequest<unknown>(`/companies/${encodeURIComponent(nifOrId)}/report`);
  const dataObj = asRecord(data);
  const item = asRecord(dataObj.empresa ?? dataObj.company ?? dataObj);
  const normalized = {
    name:
      (typeof item.denominacion === 'string' ? item.denominacion : undefined) ??
      (typeof item.name === 'string' ? item.name : undefined) ??
      '',
    tradeName: typeof item.nombreComercial === 'string' ? item.nombreComercial : (item.tradeName as string | undefined),
    legalName: typeof item.razonSocial === 'string' ? item.razonSocial : (item.legalName as string | undefined),
    nif:
      (typeof item.identificativo === 'string' ? item.identificativo : undefined) ??
      (typeof item.nif === 'string' ? item.nif : undefined) ??
      (typeof item.cif === 'string' ? item.cif : undefined),
    cnae: (typeof item.cnae === 'string' ? item.cnae : undefined) ?? (item.codigoCnae as string | undefined),
    email: typeof item.email === 'string' ? item.email : undefined,
    phone: (typeof item.telefono === 'string' ? item.telefono : undefined) ?? (item.phone as string | undefined),
    website: (typeof item.web === 'string' ? item.web : undefined) ?? (item.website as string | undefined),
    legalForm: (typeof item.formaJuridica === 'string' ? item.formaJuridica : undefined) ?? (item.legalForm as string | undefined),
    status: (typeof item.situacion === 'string' ? item.situacion : undefined) ?? (item.status as string | undefined),
    employees:
      typeof item.empleados === 'number' ? item.empleados : Number(item.empleados ?? Number.NaN),
    sales: typeof item.ventas === 'number' ? item.ventas : Number(item.ventas ?? Number.NaN),
    salesYear:
      typeof item.anioVentas === 'number' ? item.anioVentas : Number(item.anioVentas ?? Number.NaN),
    capitalSocial:
      typeof item.capitalSocial === 'number'
        ? item.capitalSocial
        : Number(item.capitalSocial ?? Number.NaN),
    lastBalanceDate:
      (typeof item.fechaUltimoBalance === 'string' ? item.fechaUltimoBalance : undefined) ??
      (item.lastBalanceDate as string | undefined),
    sourceId:
      (typeof item.identificativo === 'string' ? item.identificativo : undefined) ??
      (typeof item.id === 'string' ? item.id : undefined) ??
      (typeof item.codigo === 'string' ? item.codigo : undefined),
    address: {
      street:
        (typeof item.domicilioSocial === 'string' ? item.domicilioSocial : undefined) ??
        (asRecord(item.address).street as string | undefined),
      zip:
        (typeof item.cp === 'string' ? item.cp : undefined) ??
        (asRecord(item.address).zip as string | undefined),
      city:
        (typeof item.localidad === 'string' ? item.localidad : undefined) ??
        (asRecord(item.address).city as string | undefined),
      province:
        (typeof item.provincia === 'string' ? item.provincia : undefined) ??
        (asRecord(item.address).province as string | undefined),
      country: (asRecord(item.address).country as string | undefined) ?? 'ES',
    },
    constitutionDate:
      (typeof item.fechaConstitucion === 'string' ? item.fechaConstitucion : undefined) ??
      (item.constitutionDate as string | undefined),
    representatives: (
      Array.isArray(item.administradores)
        ? item.administradores
        : Array.isArray(item.representatives)
          ? item.representatives
          : []
    ).map((rep) => {
      const entry = asRecord(rep);
      return {
        name:
          (typeof entry.nombre === 'string' ? entry.nombre : undefined) ??
          (typeof entry.name === 'string' ? entry.name : undefined) ??
          '',
        role:
          (typeof entry.cargo === 'string' ? entry.cargo : undefined) ??
          (typeof entry.role === 'string' ? entry.role : undefined),
      };
    }),
    raw: data,
  } satisfies EinformaCompanyProfile;

  await setCache('TAX_ID', queryValue, data, normalized, 30);
  return normalized;
}
