// V2.0.4 — Audit log del asesor.
//
// Persiste eventos relevantes (creación/edición/borrado/switch de
// cliente, importación, generación de cartas, perfil fiscal) reutilizando
// UsageEvent con type=LEAD_CREATED + source='advisor_audit' + metadata.kind.
//
// Sin migración: mismo patrón que el tracking de referidos (V1.8.4).

import { prisma } from './prisma';

export type AdvisorAuditKind =
  | 'client_created'
  | 'client_updated'
  | 'client_deleted'
  | 'client_switched'
  | 'client_notes_updated'
  | 'fiscal_profile_updated'
  | 'clients_imported'
  | 'letters_generated';

type Metadata = Record<string, unknown>;

const ADVISOR_AUDIT_SOURCE = 'advisor_audit';

export async function logAdvisorEvent(
  tenantId: string,
  kind: AdvisorAuditKind,
  metadata: Metadata = {},
  opts: { userId?: string | null; path?: string | null } = {},
): Promise<void> {
  try {
    await prisma.usageEvent.create({
      data: {
        type: 'LEAD_CREATED', // sintáctico — discriminamos por metadata.kind
        source: ADVISOR_AUDIT_SOURCE,
        tenantId,
        userId: opts.userId ?? null,
        path: opts.path ?? null,
        metadataJson: { kind, ...metadata },
      },
    });
  } catch (err) {
    // No bloqueamos la acción principal por un fallo de auditoría.
    console.error('[advisor-audit] insert failed', err);
  }
}

export type AdvisorAuditRow = {
  id: string;
  kind: AdvisorAuditKind | string;
  metadata: Metadata;
  createdAt: string;
};

export async function listAdvisorEvents(
  tenantId: string,
  limit = 50,
): Promise<AdvisorAuditRow[]> {
  const events = await prisma.usageEvent.findMany({
    where: { tenantId, source: ADVISOR_AUDIT_SOURCE },
    orderBy: { createdAt: 'desc' },
    take: Math.min(Math.max(limit, 1), 200),
    select: {
      id: true,
      metadataJson: true,
      createdAt: true,
    },
  });

  return events.map((e) => {
    const meta = (e.metadataJson ?? {}) as Metadata;
    const kindRaw = meta.kind;
    return {
      id: e.id,
      kind: typeof kindRaw === 'string' ? kindRaw : 'unknown',
      metadata: { ...meta, kind: undefined },
      createdAt: e.createdAt.toISOString(),
    };
  });
}
