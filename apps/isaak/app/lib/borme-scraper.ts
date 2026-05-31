// V2.D.1 — Scraper del BORME (Boletín Oficial del Registro Mercantil).
//
// Fuente: BOE open data, https://www.boe.es/datosabiertos/api/borme
//
// Flujo:
//   1) GET /sumario/YYYYMMDD → JSON con todas las publicaciones del día
//   2) Para cada publicación de sección A (actos mercantiles), GET el XML
//   3) Parseamos cada acto y persistimos como BormeAct (idempotente vía
//      unique constraint).
//
// Notas:
//   - Los actos del BORME raramente incluyen NIF. Indexamos por nombre
//     normalizado (uppercase, sin punctuación, sin "S.L."/"S.A.").
//   - Cuando el texto contiene "CIF/NIF: X" lo parseamos por regex.
//   - El BORME se publica en días laborables; sumarios de festivos
//     pueden volver 404 (lo manejamos sin fallar).

import { prisma } from './prisma';

const BORME_API_BASE = 'https://www.boe.es/datosabiertos/api/borme';
const BORME_XML_BASE = 'https://www.boe.es/diario_borme/xml.php';

export function formatDateYYYYMMDD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}${m}${day}`;
}

// Normalización del nombre: mayúsculas, sin punctuación, sin sufijos
// societarios. Sirve para indexar y buscar.
export function normalizeCompanyName(name: string): string {
  return name
    .toUpperCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\b(S\.?\s?L\.?\s?U?\.?|S\.?\s?A\.?|S\.?\s?C\.?\s?P\.?|S\.?\s?COOP\.?|S\.?\s?L\.?\s?N\.?\s?E\.?|C\.?\s?B\.?)\b/g, '')
    .replace(/[.,;:()'"`]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const NIF_REGEX = /\b([A-HJ-NP-SUVW]\d{7}[0-9A-J])\b/;

function extractNif(text: string): string | null {
  const m = text.match(NIF_REGEX);
  return m ? m[1] : null;
}

type SumarioResponse = {
  data?: {
    sumario?: {
      diario?: Array<{
        seccion?: Array<{
          codigo?: string;
          item?: Array<{
            identificador?: string;
            titulo?: string;
            url_xml?: string;
            url_html?: string;
          }>;
        }>;
      }>;
    };
  };
};

type SumarioItem = {
  publicationId: string;
  titulo: string;
  xmlUrl: string;
  provinciaCode: string;
};

export async function fetchSumario(
  date: Date,
  fetchFn: typeof fetch = fetch,
): Promise<SumarioItem[]> {
  const url = `${BORME_API_BASE}/sumario/${formatDateYYYYMMDD(date)}`;
  const res = await fetchFn(url, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(15_000),
  });
  if (res.status === 404) return [];
  if (!res.ok) throw new Error(`BORME sumario ${res.status}`);
  const json = (await res.json()) as SumarioResponse;

  const items: SumarioItem[] = [];
  const diarios = json.data?.sumario?.diario ?? [];
  for (const diario of diarios) {
    for (const seccion of diario.seccion ?? []) {
      if (seccion.codigo !== 'A') continue; // solo sección A — actos mercantiles
      for (const item of seccion.item ?? []) {
        const id = item.identificador;
        const xml = item.url_xml;
        if (!id || !xml) continue;
        // El identificador es BORME-A-2026-100-28 (último num = provincia)
        const provincia = id.split('-').pop() ?? '';
        items.push({
          publicationId: id,
          titulo: item.titulo ?? '',
          xmlUrl: xml.startsWith('http') ? xml : `https://www.boe.es${xml}`,
          provinciaCode: provincia,
        });
      }
    }
  }
  return items;
}

export type ParsedAct = {
  companyName: string;
  normalizedName: string;
  nif: string | null;
  codigoActo: string | null;
  tipoActo: string;
  rawText: string;
};

// Parseamos el XML del BORME extrayendo <ITEM> <TITULO> <NOMBRE>...
// El BORME tiene estructura predecible: cada acto va en un <ITEM> con
// <TITULO> (que indica el tipo: "Nombramientos", "Ampliación...")
// y dentro hay <NOMBRE_ACTO> con el nombre de la empresa y descripción.
//
// Implementación tolerante: usamos regex en lugar de XML parser pesado.
export function parseBormeXml(
  xml: string,
  publicationId: string,
): ParsedAct[] {
  const acts: ParsedAct[] = [];
  // Cada acto está dentro de un <acto codigo="N"> con <empresa><razon>...
  // o en el formato textual antiguo: <p class="docs">. Soportamos ambos.

  // Formato moderno
  const actosRe = /<acto[^>]*?(?:\scodigo="([^"]+)")?[^>]*>([\s\S]*?)<\/acto>/g;
  let m: RegExpExecArray | null;
  while ((m = actosRe.exec(xml)) !== null) {
    const codigo = m[1] ?? null;
    const body = m[2];
    const razon = body.match(/<razon[^>]*>([^<]+)<\/razon>/)?.[1]
      ?? body.match(/<empresa[^>]*>\s*<razon[^>]*>([^<]+)<\/razon>/)?.[1];
    if (!razon) continue;
    const tipo = body.match(/<tipo[^>]*>([^<]+)<\/tipo>/)?.[1]
      ?? `acto-${codigo ?? 'unknown'}`;
    const company = razon.trim().replace(/\s+/g, ' ');
    const normalized = normalizeCompanyName(company);
    if (!normalized) continue;
    const rawText = body.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    acts.push({
      companyName: company,
      normalizedName: normalized,
      nif: extractNif(rawText),
      codigoActo: codigo,
      tipoActo: tipo.trim(),
      rawText: rawText.slice(0, 4000),
    });
  }

  if (acts.length > 0) return acts;

  // Fallback: extracción heurística por <p class="docs"> con formato
  // "NOMBRE EMPRESA SL. Nombramientos. Adm. Único: Juan Pérez. ..."
  const docsRe = /<p[^>]*class=["']docs["'][^>]*>([\s\S]*?)<\/p>/g;
  while ((m = docsRe.exec(xml)) !== null) {
    const text = m[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    if (!text) continue;
    // Primera línea suele ser "NOMBRE EMPRESA SL." (acaba en punto)
    const parts = text.split(/\.\s+/);
    const company = parts[0]?.trim() ?? '';
    if (!company || company.length > 200) continue;
    const tipo = parts[1]?.trim().slice(0, 80) ?? 'acto';
    acts.push({
      companyName: company,
      normalizedName: normalizeCompanyName(company),
      nif: extractNif(text),
      codigoActo: null,
      tipoActo: tipo,
      rawText: text.slice(0, 4000),
    });
  }

  void publicationId;
  return acts;
}

export async function fetchPublicationXml(
  xmlUrl: string,
  fetchFn: typeof fetch = fetch,
): Promise<string> {
  const res = await fetchFn(xmlUrl, {
    headers: { Accept: 'application/xml,text/xml,text/html' },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`BORME publication ${res.status}`);
  return res.text();
}

export type IngestStats = {
  date: string;
  publications: number;
  acts: number;
  inserted: number;
  failed: number;
};

export async function ingestBormeForDate(
  date: Date,
  fetchFn: typeof fetch = fetch,
): Promise<IngestStats> {
  const items = await fetchSumario(date, fetchFn);
  let acts = 0;
  let inserted = 0;
  let failed = 0;
  const publishedOn = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
  );

  for (const item of items) {
    try {
      const xml = await fetchPublicationXml(item.xmlUrl, fetchFn);
      const parsed = parseBormeXml(xml, item.publicationId);
      acts += parsed.length;
      const publicationId = item.publicationId.split('-').slice(0, 4).join('-');
      for (const act of parsed) {
        try {
          await prisma.bormeAct.upsert({
            where: {
              bormeId_normalizedName_codigoActo_tipoActo: {
                bormeId: item.publicationId,
                normalizedName: act.normalizedName,
                codigoActo: act.codigoActo ?? '',
                tipoActo: act.tipoActo,
              },
            },
            update: {},
            create: {
              bormeId: item.publicationId,
              publicationId,
              publishedOn,
              provinciaCode: item.provinciaCode,
              seccion: 'A',
              companyName: act.companyName,
              normalizedName: act.normalizedName,
              nif: act.nif,
              // Coalesce a '' para mantener consistencia con el where del
              // upsert (compound unique no admite NULL).
              codigoActo: act.codigoActo ?? '',
              tipoActo: act.tipoActo,
              rawText: act.rawText,
            },
          });
          inserted += 1;
        } catch {
          failed += 1;
        }
      }
    } catch (err) {
      console.error('[borme] failed publication', item.publicationId, err);
      failed += 1;
    }
  }

  return {
    date: formatDateYYYYMMDD(date),
    publications: items.length,
    acts,
    inserted,
    failed,
  };
}

// Búsquedas para el prefill del perfil de tenant
export async function findBormeByNif(nif: string, limit = 10) {
  return prisma.bormeAct.findMany({
    where: { nif },
    orderBy: { publishedOn: 'desc' },
    take: limit,
  });
}

export async function findBormeByCompanyName(name: string, limit = 10) {
  const normalized = normalizeCompanyName(name);
  if (!normalized) return [];
  return prisma.bormeAct.findMany({
    where: { normalizedName: normalized },
    orderBy: { publishedOn: 'desc' },
    take: limit,
  });
}
