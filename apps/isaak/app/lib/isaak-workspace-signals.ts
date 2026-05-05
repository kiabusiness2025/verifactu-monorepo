import type { IsaakBusinessContext } from './isaak-business-context';
import { getUpcomingDeadlines } from './fiscal-calendar';
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

export type IsaakWorkspaceSignals = {
  billing: IsaakWorkspaceBillingSnapshot;
  pendingTasks: string[];
  upcomingDeadlines: IsaakWorkspaceDeadline[];
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

function buildPendingTasks(
  context: IsaakBusinessContext | null,
  billing: IsaakWorkspaceBillingSnapshot
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

  return tasks.slice(0, 4);
}

export async function loadIsaakWorkspaceSignals(input: {
  tenantId: string;
  context?: IsaakBusinessContext | null;
}): Promise<IsaakWorkspaceSignals> {
  const subscription = await prisma.tenantSubscription.findFirst({
    where: { tenantId: input.tenantId },
    include: { plan: true },
    orderBy: [{ createdAt: 'desc' }],
  });

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
    pendingTasks: buildPendingTasks(input.context ?? null, billing),
    upcomingDeadlines,
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

  return [
    billingSummary,
    `Tareas pendientes detectadas: ${pendingSummary}`,
    `Próximos plazos fiscales: ${deadlineSummary}`,
    ISAAK_PROFILE_INTERVIEW_GUIDANCE,
  ].join('\n');
}
