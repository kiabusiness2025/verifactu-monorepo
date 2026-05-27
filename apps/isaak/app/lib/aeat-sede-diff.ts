// C-A — Pure helpers para diff censal y dedupe de notificaciones.
//
// Aislado de Prisma para que los tests cubran toda la lógica de
// comparación sin DB. El servicio (aeat-sede-sync.ts) usa estas
// funciones tras leer/escribir snapshots.

import { createHash } from 'node:crypto';

// ─── Canonicalización + hash de objetos censales ───────────────────────

export function canonicalJson(value: unknown): string {
  if (value === null || value === undefined) return 'null';
  if (typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map((v) => canonicalJson(v)).join(',')}]`;
  }
  const keys = Object.keys(value as Record<string, unknown>).sort();
  const parts = keys.map(
    (k) => `${JSON.stringify(k)}:${canonicalJson((value as Record<string, unknown>)[k])}`,
  );
  return `{${parts.join(',')}}`;
}

export function hashCensusSnapshot(data: unknown): string {
  return createHash('sha256').update(canonicalJson(data)).digest('hex');
}

// ─── Diff entre snapshots del censo ─────────────────────────────────────

export type CensusChange = {
  field: string;
  changeType: 'added' | 'removed' | 'modified';
  oldValue: string | null;
  newValue: string | null;
};

// Campos del censo que rastreamos para diff. El censo AEAT 036/037
// devuelve más datos, pero estos son los que disparan alertas:
// cambios de domicilio, IAE, obligaciones (modelos), nombre o estado
// de alta/baja.
const TRACKED_FIELDS: ReadonlyArray<string> = [
  'nombre',
  'razonSocial',
  'domicilioFiscal',
  'codigoPostal',
  'municipio',
  'provincia',
  'iaeEpigrafe',
  'iaeActividad',
  'situacionCensal',
  'fechaAlta',
  'fechaBaja',
];

function flattenValue(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  if (typeof v === 'string') return v.trim() || null;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  if (Array.isArray(v)) {
    const arr = v.map((x) => (typeof x === 'string' ? x.trim() : canonicalJson(x))).filter(Boolean);
    return arr.length ? arr.join(', ') : null;
  }
  // objects → JSON canónico para diff estable
  return canonicalJson(v);
}

export function diffCensusSnapshots(
  previous: Record<string, unknown> | null | undefined,
  current: Record<string, unknown> | null | undefined,
): CensusChange[] {
  const changes: CensusChange[] = [];
  const prev = previous ?? {};
  const curr = current ?? {};

  for (const field of TRACKED_FIELDS) {
    const oldRaw = flattenValue(prev[field]);
    const newRaw = flattenValue(curr[field]);
    if (oldRaw === newRaw) continue;

    if (oldRaw === null && newRaw !== null) {
      changes.push({ field, changeType: 'added', oldValue: null, newValue: newRaw });
    } else if (oldRaw !== null && newRaw === null) {
      changes.push({ field, changeType: 'removed', oldValue: oldRaw, newValue: null });
    } else {
      changes.push({ field, changeType: 'modified', oldValue: oldRaw, newValue: newRaw });
    }
  }

  // Obligaciones (modelos a presentar) — array sensible. Diff por
  // elementos añadidos/eliminados.
  const prevOblig = Array.isArray(prev.obligaciones)
    ? new Set<string>((prev.obligaciones as string[]).map(String))
    : new Set<string>();
  const currOblig = Array.isArray(curr.obligaciones)
    ? new Set<string>((curr.obligaciones as string[]).map(String))
    : new Set<string>();
  for (const o of currOblig) {
    if (!prevOblig.has(o)) {
      changes.push({
        field: 'obligaciones',
        changeType: 'added',
        oldValue: null,
        newValue: o,
      });
    }
  }
  for (const o of prevOblig) {
    if (!currOblig.has(o)) {
      changes.push({
        field: 'obligaciones',
        changeType: 'removed',
        oldValue: o,
        newValue: null,
      });
    }
  }

  return changes;
}

// ─── Dedupe de notificaciones por externalId ───────────────────────────

export type NotificationLike = {
  id: string;
  title?: string;
  emisor?: string;
  fecha?: string;
  estado?: string;
  tipo?: string;
};

export function partitionNewVsKnown<T extends NotificationLike>(
  pulled: ReadonlyArray<T>,
  knownExternalIds: ReadonlySet<string>,
): { fresh: T[]; alreadyKnown: T[] } {
  const fresh: T[] = [];
  const alreadyKnown: T[] = [];
  for (const n of pulled) {
    if (knownExternalIds.has(n.id)) {
      alreadyKnown.push(n);
    } else {
      fresh.push(n);
    }
  }
  return { fresh, alreadyKnown };
}

// ─── Severity mapping para Inspector ───────────────────────────────────

// La AEAT no etiqueta gravedad uniformemente. Heurística por keyword
// del título / tipo para decidir si la alerta es ERROR (requerimiento,
// sanción, propuesta de liquidación) o WARNING (comunicación,
// recordatorio).
export type NotificationSeverity = 'critical' | 'high' | 'normal';

export function classifyNotificationSeverity(
  notif: NotificationLike,
): NotificationSeverity {
  const haystack = `${notif.title ?? ''} ${notif.tipo ?? ''} ${notif.emisor ?? ''}`
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();

  if (
    /requerimiento|propuesta de liquidacion|propuesta liquidacion|sancion|embargo|providencia de apremio|apremio|inicio de actuacion/.test(
      haystack,
    )
  ) {
    return 'critical';
  }
  if (/diligencia|notificacion liquidacion|liquidacion|trámite de audiencia|tramite de audiencia/.test(haystack)) {
    return 'high';
  }
  return 'normal';
}
