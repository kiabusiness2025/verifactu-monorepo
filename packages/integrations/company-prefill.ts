// V2.D.3 — Helper compartido de prefill del perfil de empresa.
//
// Combina BORME (datos públicos del Registro Mercantil, ingestados por
// el cron de Isaak) + VIES (validación VAT EU). Cada app pasa su
// propio cliente Prisma como dependencia inyectada.
//
// Las apps consumidoras: apps/isaak, apps/holded, apps/app.

import type { PrismaClient } from '@prisma/client';

export type CompanyPrefillInput = {
  companyName?: string;
  nif?: string;
};

export type CompanyPrefillSignal = {
  source: 'VIES' | 'BORME';
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
};

export type CompanyPrefillResult = {
  legalName: string | null;
  address: string | null;
  province: string | null;
  provinciaCode: string | null;
  lastAdministrator: string | null;
  vatValid: boolean | null;
  recentActs: Array<{
    publishedOn: string;
    tipoActo: string;
    rawText: string;
  }>;
  signals: CompanyPrefillSignal[];
};

const PROVINCIA_NAMES: Record<string, string> = {
  '1': 'Álava', '2': 'Albacete', '3': 'Alicante', '4': 'Almería', '5': 'Ávila',
  '6': 'Badajoz', '7': 'Baleares', '8': 'Barcelona', '9': 'Burgos', '10': 'Cáceres',
  '11': 'Cádiz', '12': 'Castellón', '13': 'Ciudad Real', '14': 'Córdoba', '15': 'A Coruña',
  '16': 'Cuenca', '17': 'Girona', '18': 'Granada', '19': 'Guadalajara', '20': 'Guipúzcoa',
  '21': 'Huelva', '22': 'Huesca', '23': 'Jaén', '24': 'León', '25': 'Lleida',
  '26': 'La Rioja', '27': 'Lugo', '28': 'Madrid', '29': 'Málaga', '30': 'Murcia',
  '31': 'Navarra', '32': 'Ourense', '33': 'Asturias', '34': 'Palencia', '35': 'Las Palmas',
  '36': 'Pontevedra', '37': 'Salamanca', '38': 'Santa Cruz de Tenerife',
  '39': 'Cantabria', '40': 'Segovia', '41': 'Sevilla', '42': 'Soria', '43': 'Tarragona',
  '44': 'Teruel', '45': 'Toledo', '46': 'Valencia', '47': 'Valladolid', '48': 'Vizcaya',
  '49': 'Zamora', '50': 'Zaragoza', '51': 'Ceuta', '52': 'Melilla',
};

const VIES_URL = 'https://ec.europa.eu/taxation_customs/vies/rest-api/ms/ES/vat/';

function normalizeCompanyName(name: string): string {
  return name
    .toUpperCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\b(S\.?\s?L\.?\s?U?\.?|S\.?\s?A\.?|S\.?\s?C\.?\s?P\.?|S\.?\s?COOP\.?|C\.?\s?B\.?)\b/g, '')
    .replace(/[.,;:()'"`]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractAdministrator(rawText: string): string | null {
  const m = rawText.match(
    /(?:Adm\.?\s*(?:Único|Sol|Solid|Mancomun|Conjunto)\.?:?\s+)([A-ZÁÉÍÓÚÑa-záéíóúñ ,.'-]{4,80})/,
  );
  if (!m) return null;
  return m[1].split(/[.;]/)[0].trim();
}

type ViesResult = { valid: boolean; name?: string; address?: string };

async function checkVies(
  nif: string,
  fetchFn: typeof fetch = fetch,
): Promise<ViesResult | null> {
  const clean = nif.replace(/^ES/i, '');
  try {
    const res = await fetchFn(`${VIES_URL}${encodeURIComponent(clean)}`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as ViesResult;
    return data;
  } catch {
    return null;
  }
}

export async function prefillFromPublicSources(
  prisma: PrismaClient,
  input: CompanyPrefillInput,
  fetchFn: typeof fetch = fetch,
): Promise<CompanyPrefillResult> {
  const result: CompanyPrefillResult = {
    legalName: null,
    address: null,
    province: null,
    provinciaCode: null,
    lastAdministrator: null,
    vatValid: null,
    recentActs: [],
    signals: [],
  };

  // 1) VIES — si hay NIF, valida y obtiene razón social oficial
  if (input.nif) {
    const sig = await checkVies(input.nif, fetchFn);
    if (sig) {
      result.vatValid = sig.valid;
      if (sig.name) {
        result.legalName = sig.name;
        result.signals.push({ source: 'VIES', confidence: 'HIGH' });
      }
      if (sig.address) {
        result.address = sig.address;
        if (!result.signals.some((s) => s.source === 'VIES')) {
          result.signals.push({ source: 'VIES', confidence: 'HIGH' });
        }
      }
    }
  }

  // 2) BORME — preferimos NIF si existe, sino por nombre normalizado
  const bormeQuery = input.nif
    ? { nif: input.nif }
    : input.companyName
      ? { normalizedName: normalizeCompanyName(input.companyName) }
      : null;

  if (bormeQuery) {
    const bormeActs = await prisma.bormeAct
      .findMany({
        where: bormeQuery,
        orderBy: { publishedOn: 'desc' },
        take: 15,
      })
      .catch(() => [] as Awaited<ReturnType<typeof prisma.bormeAct.findMany>>);

    if (bormeActs.length > 0) {
      result.signals.push({ source: 'BORME', confidence: 'MEDIUM' });

      const first = bormeActs[0];
      result.provinciaCode = first.provinciaCode;
      result.province = PROVINCIA_NAMES[first.provinciaCode] ?? null;

      for (const a of bormeActs) {
        const tipoLower = a.tipoActo.toLowerCase();
        if (tipoLower.includes('nombramiento') || tipoLower.includes('reelección')) {
          const adm = extractAdministrator(a.rawText);
          if (adm) {
            result.lastAdministrator = adm;
            break;
          }
        }
      }

      if (!result.legalName) {
        result.legalName = first.companyName;
      }

      result.recentActs = bormeActs.slice(0, 8).map((a) => ({
        publishedOn: a.publishedOn.toISOString().slice(0, 10),
        tipoActo: a.tipoActo,
        rawText: a.rawText.slice(0, 280),
      }));
    }
  }

  return result;
}
