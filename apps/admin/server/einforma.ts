import { prisma } from '@verifactu/db';
import 'server-only';

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
  // Some OAuth providers reject provided scope/audience and only work with default server scope.
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

type SearchCompaniesOptions = {
  bypassCache?: boolean;
  deepSearch?: boolean;
};

function normalizeTaxId(value: string) {
  return value.replace(/\s+/g, '').toUpperCase();
}

function parseOptionalNumber(value: unknown) {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : undefined;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function getByPath(obj: any, path: string) {
  return path
    .split('.')
    .reduce((acc, key) => (acc && typeof acc === 'object' ? acc[key] : undefined), obj);
}

function pickFirst(obj: any, paths: string[]) {
  for (const path of paths) {
    const value = getByPath(obj, path);
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      return value;
    }
  }
  return undefined;
}

function normalizeRepresentatives(item: any) {
  const repKeys = new Set([
    'administradores',
    'representatives',
    'representantes',
    'administrador',
    'representante',
  ]);
  const queue: any[] = [item];
  const collected: Array<{ name: string; role?: string }> = [];

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || typeof current !== 'object') continue;

    for (const [rawKey, rawValue] of Object.entries(current)) {
      const key = String(rawKey).toLowerCase();
      if (repKeys.has(key)) {
        if (Array.isArray(rawValue)) {
          for (const rep of rawValue) {
            if (typeof rep === 'string') {
              const name = rep.trim();
              if (name) collected.push({ name });
              continue;
            }
            const name =
              rep?.nombre ?? rep?.name ?? rep?.administrador ?? rep?.representante ?? '';
            const role = rep?.cargo ?? rep?.role ?? rep?.tipo ?? undefined;
            if (String(name).trim()) collected.push({ name: String(name).trim(), role });
          }
        } else if (typeof rawValue === 'string') {
          const name = rawValue.trim();
          if (name) collected.push({ name });
        } else if (rawValue && typeof rawValue === 'object') {
          const name =
            (rawValue as any)?.nombre ??
            (rawValue as any)?.name ??
            (rawValue as any)?.administrador ??
            (rawValue as any)?.representante ??
            '';
          const role =
            (rawValue as any)?.cargo ?? (rawValue as any)?.role ?? (rawValue as any)?.tipo;
          if (String(name).trim()) collected.push({ name: String(name).trim(), role });
        }
      }

      if (rawValue && typeof rawValue === 'object') queue.push(rawValue);
    }
  }

  const dedup = new Map<string, { name: string; role?: string }>();
  for (const rep of collected) {
    const k = rep.name.toLowerCase();
    if (!dedup.has(k)) dedup.set(k, rep);
  }
  return Array.from(dedup.values());
}

function sanitizeMaybeTaxId(value: unknown) {
  const candidate = String(value ?? '')
    .trim()
    .toUpperCase();
  if (!candidate) return undefined;
  if (!/[0-9]/.test(candidate)) return undefined;
  return candidate;
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

async function einformaRequest<T>(path: string, params?: Record<string, string>) {
  const base =
    process.env.EINFORMA_API_BASE_URL ??
    process.env.EINFORMA_BASE_URL ??
    requireEnv('EINFORMA_API_BASE_URL');
  const token = await getAccessToken();
  const timeoutMs = Number(process.env.EINFORMA_TIMEOUT_MS ?? 8000);

  // Preserve base path (e.g. /api/v1) by forcing relative paths.
  const baseUrl = base.endsWith('/') ? base : `${base}/`;
  const relativePath = path.replace(/^\/+/, '');
  const url = new URL(relativePath, baseUrl);
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

export async function searchCompanies(
  q: string,
  options?: SearchCompaniesOptions
): Promise<EinformaSearchItem[]> {
  const queryValue = q.trim().toUpperCase();
  if (!queryValue) return [];

  if (!options?.bypassCache) {
    const cached = await getCache<EinformaSearchItem[]>('NAME', queryValue);
    if (cached) return cached;
  }

  let lastError: unknown = null;

  const deepCandidates = options?.deepSearch
    ? [`"${q.trim()}"`, `${q.trim()}*`, `*${q.trim()}*`]
    : [];

  const candidates = [
    q.trim(),
    q.trim().toUpperCase(),
    q.trim().toLowerCase(),
    ...deepCandidates,
  ].filter(Boolean);

  const merged = new Map<string, EinformaSearchItem>();

  for (const candidate of candidates) {
    try {
      const data = await einformaRequest<any>('/companies', { companySearch: candidate });
      const items = normalizeSearchResults(data);
      if (Array.isArray(items) && items.length > 0) {
        const normalized = items.map((item: any): EinformaSearchItem => ({
          name: item?.denominacion ?? item?.name ?? item?.denominacionBusqueda ?? '',
          nif: sanitizeMaybeTaxId(item?.identificativo ?? item?.nif ?? item?.cif),
          province: item?.provincia ?? item?.province,
          city: item?.localidad ?? item?.city,
          id: item?.id ?? item?.codigo ?? sanitizeMaybeTaxId(item?.identificativo),
        }));
        for (const row of normalized) {
          const key = `${row.id ?? ''}|${row.nif ?? ''}|${row.name}`.toUpperCase();
          if (!merged.has(key)) merged.set(key, row);
        }
        if (!options?.deepSearch) {
          await setCache('NAME', queryValue, data, normalized, 7);
          return normalized;
        }
      }
    } catch (error) {
      lastError = error;
    }
  }

  if (options?.deepSearch && merged.size > 0) {
    const output = Array.from(merged.values());
    await setCache('NAME', queryValue, { deep: true, count: output.length }, output, 7);
    return output;
  }

  if (lastError) {
    throw lastError;
  }

  return [];
}

export async function getCompanyProfileByNif(
  nifOrId: string,
  options?: { bypassCache?: boolean }
): Promise<EinformaCompanyProfile> {
  const queryValue = normalizeTaxId(nifOrId);
  const cached = options?.bypassCache
    ? null
    : await getCache<EinformaCompanyProfile>('TAX_ID', queryValue);
  if (cached) {
    const rawItem = (cached?.raw as any)?.empresa ?? (cached?.raw as any)?.company ?? cached?.raw;
    const reps = normalizeRepresentatives(rawItem);
    return {
      ...cached,
      legalForm:
        cached.legalForm ??
        (pickFirst(rawItem, ['formaJuridica', 'legalForm', 'datosGenerales.formaJuridica']) as
          | string
          | undefined),
      status:
        cached.status ??
        (pickFirst(rawItem, ['situacion', 'status', 'estado', 'estadoActual']) as
          | string
          | undefined),
      representatives: cached.representatives?.length ? cached.representatives : reps,
    };
  }

  const data = await einformaRequest<any>(`/companies/${encodeURIComponent(nifOrId)}/report`);
  const item = data?.empresa ?? data?.company ?? data?.resultado?.empresa ?? data;
  const reps = normalizeRepresentatives(item);
  const normalized = {
    name: pickFirst(item, ['denominacion', 'name']) ?? '',
    tradeName: pickFirst(item, ['nombreComercial', 'tradeName']) as string | undefined,
    legalName: pickFirst(item, ['razonSocial', 'legalName']) as string | undefined,
    nif: sanitizeMaybeTaxId(pickFirst(item, ['identificativo', 'nif', 'cif'])),
    cnae: pickFirst(item, ['cnae', 'codigoCnae']) as string | undefined,
    email: pickFirst(item, ['email', 'contacto.email']) as string | undefined,
    phone: pickFirst(item, ['telefono', 'phone', 'contacto.telefono']) as string | undefined,
    website: pickFirst(item, ['web', 'website']) as string | undefined,
    legalForm: pickFirst(item, ['formaJuridica', 'legalForm', 'datosGenerales.formaJuridica']) as
      | string
      | undefined,
    status: pickFirst(item, ['situacion', 'status', 'estado', 'estadoActual']) as
      | string
      | undefined,
    employees: parseOptionalNumber(pickFirst(item, ['empleados', 'employees'])),
    sales: parseOptionalNumber(pickFirst(item, ['ventas', 'sales'])),
    salesYear: parseOptionalNumber(pickFirst(item, ['anioVentas', 'salesYear'])),
    capitalSocial: parseOptionalNumber(pickFirst(item, ['capitalSocial', 'capital'])),
    lastBalanceDate: pickFirst(item, ['fechaUltimoBalance', 'lastBalanceDate']) as
      | string
      | undefined,
    sourceId: pickFirst(item, ['id', 'codigo']) ?? sanitizeMaybeTaxId(item?.identificativo),
    address: {
      street: (pickFirst(item, ['domicilioSocial', 'address.street']) as string | undefined),
      zip: (pickFirst(item, ['cp', 'address.zip']) as string | undefined),
      city: (pickFirst(item, ['localidad', 'address.city']) as string | undefined),
      province: (pickFirst(item, ['provincia', 'address.province']) as string | undefined),
      country: item?.address?.country ?? 'ES',
    },
    constitutionDate: pickFirst(item, ['fechaConstitucion', 'constitutionDate']) as
      | string
      | undefined,
    representatives: reps,
    raw: data,
  } satisfies EinformaCompanyProfile;

  await setCache('TAX_ID', queryValue, data, normalized, 30);
  return normalized;
}
