import type { IsaakBusinessContext } from './isaak-business-context';
import { getUpcomingDeadlines } from './fiscal-calendar';
import { holdedListDocuments } from './holded-api';
import { prisma } from './prisma';

export type IsaakWorkspaceBillingSnapshot = {
  name: string;
  code: string;
  status: string;
  trialEndsAt: string | null;
  daysUntilTrialEnd: number | null;
};

export type IsaakWorkspaceDeadline = {
  title: string;
  modelo: string;
  date: string;
  description: string;
};

export type IsaakVerifactuSignal = {
  invoicesChecked: number;
  invoicesWithoutUuid: number;
  checked: boolean;
};

export type IsaakWorkspaceSignals = {
  billing: IsaakWorkspaceBillingSnapshot;
  pendingTasks: string[];
  upcomingDeadlines: IsaakWorkspaceDeadline[];
  verifactu: IsaakVerifactuSignal | null;
};

export const ISAAK_PROFILE_INTERVIEW_GUIDANCE = [
  'Si faltan datos clave para orientar bien, abre una micro-entrevista de una sola pregunta cada vez.',
  'Prioriza, en este orden, residencia fiscal en España, tipo de persona o empresa, régimen especial si aplica, CNAE o actividad, fecha de alta o constitución, empleados, local en alquiler y obligaciones fiscales que ya conoce.',
  'En cada pregunta breve ofrece siempre dos salidas literales: "Prefiero no decirlo" y "No lo sé".',
  'Si responde "No lo sé", explica de forma breve cómo averiguarlo y remite, cuando aplique, a la Sede Electrónica de la AEAT.',
  'Si la duda es sobre certificado electrónico, comprobar si está instalado o pedir uno nuevo, orienta con lenguaje claro sobre AEAT, FNMT y otras vías equivalentes sin afirmaciones absolutas.',
  'No presiones para completar datos sensibles. Si la persona no quiere compartirlos, sigue ayudando con la mejor orientación posible.',
].join(' ');

function toIsoDate(value: Date | null | undefined) {
  return value ? value.toISOString() : null;
}

function hasVerifactuUuid(doc: Record<string, unknown>): boolean {
  const vf =
    (doc.verifactu as Record<string, unknown> | undefined) ||
    (doc.verifactuData as Record<string, unknown> | undefined) ||
    {};
  return Boolean(vf.uuid || doc.verifactuUuid || doc.qrCode);
}

async function loadVerifactuSignal(apiKey: string): Promise<IsaakVerifactuSignal> {
  const now = Math.floor(Date.now() / 1000);
  const ninetyDaysAgo = String(now - 90 * 24 * 3600);

  const { documents } = await holdedListDocuments(apiKey, {
    docType: 'invoice',
    starttmp: ninetyDaysAgo,
    endtmp: String(now),
    limit: 50,
  });

  const invoicesChecked = documents.length;
  const invoicesWithoutUuid = documents.filter(
    (doc) => !hasVerifactuUuid(doc as Record<string, unknown>)
  ).length;

  return { invoicesChecked, invoicesWithoutUuid, checked: true };
}

function buildPendingTasks(
  context: IsaakBusinessContext | null,
  billing: IsaakWorkspaceBillingSnapshot,
  verifactu: IsaakVerifactuSignal | null
) {
  const tasks: string[] = [];

  if (!context?.isaak.completed) {
    tasks.push('Completar el perfil inicial de Isaak para personalizar mejor la ayuda.');
  }

  const hasCompanyName = Boolean(context?.labels.companyName);
  const hasSector = Boolean(context?.company.sectorCode || context?.company.sectorLabel);
  const hasTaxId = Boolean(context?.company.taxId);

  if (!hasCompanyName || !hasSector || !hasTaxId) {
    tasks.push('Completar datos clave de empresa y actividad para afinar la orientación fiscal.');
  }

  if (!context?.holded.hasLiveConnection) {
    tasks.push(
      'Conectar Holded si quieres respuestas con datos reales y acciones sobre tu negocio.'
    );
  }

  if (billing.status === 'trial' && typeof billing.daysUntilTrialEnd === 'number') {
    if (billing.daysUntilTrialEnd <= 3) {
      tasks.push('Revisar el plan antes de que termine la prueba para no perder continuidad.');
    } else if (billing.daysUntilTrialEnd <= 7) {
      tasks.push('Tener decidido el plan antes del final de la prueba.');
    }
  }

  if (verifactu?.checked && verifactu.invoicesWithoutUuid > 0) {
    tasks.push(
      `Revisar Verifactu: ${verifactu.invoicesWithoutUuid} factura${verifactu.invoicesWithoutUuid > 1 ? 's' : ''} de los últimos 90 días sin UUID Verifactu (obligatorio desde RD 1007/2023).`
    );
  }

  return tasks.slice(0, 5);
}

export async function loadIsaakWorkspaceSignals(input: {
  tenantId: string;
  context?: IsaakBusinessContext | null;
  holdedApiKey?: string | null;
}): Promise<IsaakWorkspaceSignals> {
  const holdedApiKey =
    input.holdedApiKey ?? input.context?.holded.connection?.apiKey ?? null;

  const [subscription, verifactu] = await Promise.all([
    prisma.tenantSubscription.findFirst({
      where: { tenantId: input.tenantId },
      include: { plan: true },
      orderBy: [{ createdAt: 'desc' }],
    }),
    holdedApiKey
      ? loadVerifactuSignal(holdedApiKey).catch(() => null)
      : Promise.resolve(null),
  ]);

  const trialEndsAt = subscription?.trialEndsAt ?? null;
  const daysUntilTrialEnd =
    trialEndsAt && subscription?.status === 'trial'
      ? Math.max(0, Math.ceil((trialEndsAt.getTime() - Date.now()) / 86_400_000))
      : null;

  const billing: IsaakWorkspaceBillingSnapshot = {
    name: subscription?.plan?.name ?? 'Plan gratuito',
    code: subscription?.plan?.code ?? 'free',
    status: subscription?.status ?? 'active',
    trialEndsAt: toIsoDate(trialEndsAt),
    daysUntilTrialEnd,
  };

  const upcomingDeadlines = getUpcomingDeadlines(90)
    .slice(0, 4)
    .map((deadline) => ({
      title: deadline.title,
      modelo: deadline.modelo,
      date: deadline.date.toISOString(),
      description: deadline.description,
    }));

  return {
    billing,
    pendingTasks: buildPendingTasks(input.context ?? null, billing, verifactu),
    upcomingDeadlines,
    verifactu,
  };
}

export function formatWorkspaceSignalsForPrompt(signals: IsaakWorkspaceSignals) {
  const billingSummary = [
    `Plan actual: ${signals.billing.name}.`,
    `Estado de suscripción: ${signals.billing.status}.`,
    typeof signals.billing.daysUntilTrialEnd === 'number'
      ? `Días restantes de prueba: ${signals.billing.daysUntilTrialEnd}.`
      : null,
  ]
    .filter(Boolean)
    .join(' ');

  const pendingSummary = signals.pendingTasks.length
    ? signals.pendingTasks.map((task, index) => `${index + 1}. ${task}`).join(' ')
    : 'No hay tareas internas destacadas ahora mismo.';

  const deadlineSummary = signals.upcomingDeadlines.length
    ? signals.upcomingDeadlines
        .map(
          (deadline) =>
            `${deadline.title} (${deadline.modelo}) el ${new Date(deadline.date).toLocaleDateString('es-ES')}`
        )
        .join(' | ')
    : 'Sin plazos fiscales próximos cargados.';

  const verifactuSummary = signals.verifactu?.checked
    ? signals.verifactu.invoicesWithoutUuid > 0
      ? `ALERTA VERIFACTU: ${signals.verifactu.invoicesWithoutUuid} de ${signals.verifactu.invoicesChecked} facturas recientes (90 días) no tienen UUID Verifactu. Obligatorio según RD 1007/2023. Menciona este riesgo de cumplimiento cuando sea relevante.`
      : `Verifactu: ${signals.verifactu.invoicesChecked} facturas revisadas en los últimos 90 días, todas con UUID. Cumplimiento correcto.`
    : 'Verifactu: estado no verificado (sin conexión Holded o sin datos).';

  return [
    billingSummary,
    `Tareas pendientes detectadas: ${pendingSummary}`,
    `Próximos plazos fiscales: ${deadlineSummary}`,
    verifactuSummary,
    ISAAK_PROFILE_INTERVIEW_GUIDANCE,
  ].join('\n');
}
