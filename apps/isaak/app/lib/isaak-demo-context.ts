// Demo sandbox — contexto Isaak para la página /demo.
//
// Inyecta la API key de la empresa demo (Nova Gestión S.L.) en lugar de la
// conexión Holded real del usuario. El userId/tenantId real se mantiene para
// tracking y conversación por usuario.
//
// Cuota independiente: 20 mensajes/día en modo demo (no consume la cuota
// normal del plan del usuario).

import { prisma } from './prisma';
import { getHoldedSession } from './holded-session';
import type { IsaakAuthenticatedChat } from './isaak-chat-context';
import { DEMO_COMPANY_NAME, DEMO_DAILY_LIMIT } from './isaak-demo-constants';

// Re-export para no romper imports server-side existentes.
export { DEMO_COMPANY_NAME, DEMO_DAILY_LIMIT };

// ── Quota demo ────────────────────────────────────────────────────────────────

export async function checkDemoQuota(userId: string): Promise<{
  allowed: boolean;
  used: number;
  remaining: number;
  resetsAt: string;
}> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const used = await prisma.isaakChatMetric
    .count({ where: { userId, feature: 'demo_chat', createdAt: { gte: today } } })
    .catch(() => 0);

  return {
    allowed: used < DEMO_DAILY_LIMIT,
    used,
    remaining: Math.max(0, DEMO_DAILY_LIMIT - used),
    resetsAt: tomorrow.toISOString(),
  };
}

// ── Context builder ───────────────────────────────────────────────────────────

export async function loadDemoChatContext(): Promise<IsaakAuthenticatedChat | null> {
  const session = await getHoldedSession().catch(() => null);
  if (!session?.tenantId || !session.userId) return null;

  const demoApiKey = process.env.HOLDED_DEMO_API_KEY ?? '';
  if (!demoApiKey) {
    console.error('[demo-context] HOLDED_DEMO_API_KEY not set');
    return null;
  }

  return {
    session,
    conversationScope: {
      tenantId: session.tenantId,
      userId: session.userId,
    },
    toolContext: {
      tenantId: session.tenantId,
      userId: session.userId,
      holdedApiKey: demoApiKey,
      holdedConnected: true,
      bankConnected: false,
      googleConnected: false,
      microsoftConnected: false,
      sectorConnected: false,
    },
    promptContext: {
      tenantId: session.tenantId,
      userId: session.userId,
      preferredName: session.name || 'usuario',
      companyName: `${DEMO_COMPANY_NAME} (empresa demo)`,
      contextSummary:
        'Nova Gestión S.L. es una empresa de servicios de consultoría y gestión empresarial. ' +
        'Datos del ERP Holded de demostración. El usuario está explorando Isaak antes de conectar su propio Holded.',
      roleLabel: 'el usuario',
      sectorLabel: 'consultoría y servicios',
      communicationStyle: 'spanish_clear_non_technical',
      knowledgeLevel: 'starter',
      goals: ['Explorar las capacidades de Isaak', 'Evaluar si Isaak es útil para su empresa'],
      holdedConnected: true,
      workspaceSignalsBlock:
        '⚠️ MODO DEMO: Datos de Nova Gestión S.L. (empresa de demostración). ' +
        'Las acciones de escritura están desactivadas. ' +
        'Al terminar, sugiere al usuario conectar su propio Holded para ver sus datos reales.',
    },
  };
}
