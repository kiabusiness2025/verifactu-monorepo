// V2.0.1 — Perfil fiscal mínimo de los clientes de un asesor.
//
// Persistencia: Tenant.whitelabelConfig.advisorClientFiscalProfiles
//   = { [clientId]: { modelos: string[] } }
//
// Sin migración (whitelabelConfig es Json libre). El asesor marca para
// cada cliente qué modelos AEAT le aplican; con eso filtramos
// getUpcomingDeadlines per-cliente.

import type { FiscalDeadline } from './fiscal-calendar';
import { prisma } from './prisma';

// Modelos seleccionables explícitamente por el asesor. El resto
// (resúmenes anuales) se infieren.
export const ADVISOR_SELECTABLE_MODELOS = ['303', '130', '200', '111', '115'] as const;
export type AdvisorSelectableModelo = (typeof ADVISOR_SELECTABLE_MODELOS)[number];

const ANNUAL_OF: Record<string, string> = {
  '303': '390', // resumen anual IVA
  '111': '190', // resumen anual retenciones trabajo
  '115': '180', // resumen anual retenciones alquiler
};

type FiscalProfile = { modelos: string[] };
type ProfilesMap = Record<string, FiscalProfile>;

function readProfiles(whitelabelConfig: unknown): ProfilesMap {
  if (!whitelabelConfig || typeof whitelabelConfig !== 'object') return {};
  const cfg = whitelabelConfig as { advisorClientFiscalProfiles?: unknown };
  const raw = cfg.advisorClientFiscalProfiles;
  if (!raw || typeof raw !== 'object') return {};
  const out: ProfilesMap = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (!v || typeof v !== 'object') continue;
    const modelos = (v as { modelos?: unknown }).modelos;
    if (!Array.isArray(modelos)) continue;
    out[k] = { modelos: modelos.filter((m): m is string => typeof m === 'string') };
  }
  return out;
}

export async function getAllClientFiscalProfiles(tenantId: string): Promise<ProfilesMap> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { whitelabelConfig: true },
  });
  return readProfiles(tenant?.whitelabelConfig);
}

export async function getClientFiscalProfile(
  tenantId: string,
  clientId: string,
): Promise<FiscalProfile | null> {
  const all = await getAllClientFiscalProfiles(tenantId);
  return all[clientId] ?? null;
}

export async function setClientFiscalProfile(
  tenantId: string,
  clientId: string,
  modelos: string[],
): Promise<void> {
  const valid = modelos.filter((m): m is AdvisorSelectableModelo =>
    (ADVISOR_SELECTABLE_MODELOS as readonly string[]).includes(m),
  );

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { whitelabelConfig: true },
  });
  const existing = (tenant?.whitelabelConfig ?? {}) as Record<string, unknown>;
  const profiles = readProfiles(existing);
  if (valid.length === 0) {
    delete profiles[clientId];
  } else {
    profiles[clientId] = { modelos: valid };
  }
  const next = { ...existing, advisorClientFiscalProfiles: profiles };
  await prisma.tenant.update({
    where: { id: tenantId },
    data: { whitelabelConfig: next },
  });
}

/**
 * Expande los modelos explícitos del asesor a los modelos efectivos,
 * incluyendo los resúmenes anuales derivados (390/190/180).
 */
export function expandModelos(modelos: readonly string[]): string[] {
  const out = new Set<string>();
  for (const m of modelos) {
    out.add(m);
    const annual = ANNUAL_OF[m];
    if (annual) out.add(annual);
  }
  return [...out];
}

export function filterDeadlinesByModelos(
  deadlines: FiscalDeadline[],
  modelos: readonly string[],
): FiscalDeadline[] {
  const set = new Set(expandModelos(modelos));
  return deadlines.filter((d) => set.has(d.modelo));
}
