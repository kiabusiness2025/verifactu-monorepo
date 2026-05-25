// C-A4 — Resumen IA semanal del buzón AEAT.
//
// Para cada tenant con notificaciones en los últimos 7 días, genera un
// resumen ejecutivo (GPT-4o-mini para coste) y lo envía por email.
// Útil para empresarios que no abren la sede AEAT a diario pero quieren
// saber qué ha pasado en su buzón sin leer cada notificación.
//
// Diseño:
//   * Pure builder de prompt → permite test sin LLM
//   * Sólo invoca LLM si hay >=1 notificación o cambio censal nuevo
//   * Sin notificaciones: skip (no email "no hay nada nuevo")
//   * Email tipo digest con secciones: críticas / importantes / informativas
//     / cambios censales

import { callLLM } from '@verifactu/utils';
import { prisma } from './prisma';
import {
  classifyNotificationSeverity,
  type NotificationLike,
} from './aeat-sede-diff';
import { buildWeeklySummaryPrompt } from './aeat-weekly-summary-prompt';

export type WeeklySummaryInput = {
  tenantId: string;
  windowDays?: number; // default 7
  now?: Date;
};

export type WeeklySummaryResult = {
  ok: boolean;
  tenantId: string;
  notificationsConsidered: number;
  censusChangesConsidered: number;
  summary: string | null;
  generated: boolean; // false si no había nada que resumir
  error?: string;
};

export { buildWeeklySummaryPrompt }; // re-export for legacy imports

export async function generateWeeklySummary(
  input: WeeklySummaryInput,
): Promise<WeeklySummaryResult> {
  const windowDays = input.windowDays ?? 7;
  const now = input.now ?? new Date();
  const since = new Date(now.getTime() - windowDays * 86_400_000);

  const [notifs, changes, tenant] = await Promise.all([
    prisma.isaakAeatNotification.findMany({
      where: { tenantId: input.tenantId, notificationDate: { gte: since } },
      orderBy: { notificationDate: 'desc' },
      select: { title: true, emisor: true, tipo: true, notificationDate: true },
    }),
    prisma.isaakAeatCensusChange.findMany({
      where: { tenantId: input.tenantId, createdAt: { gte: since } },
      orderBy: { createdAt: 'desc' },
      select: { field: true, changeType: true, oldValue: true, newValue: true },
    }),
    prisma.tenant.findUnique({
      where: { id: input.tenantId },
      select: { name: true, legalName: true },
    }),
  ]);

  if (notifs.length === 0 && changes.length === 0) {
    return {
      ok: true,
      tenantId: input.tenantId,
      notificationsConsidered: 0,
      censusChangesConsidered: 0,
      summary: null,
      generated: false,
    };
  }

  const tenantName = tenant?.legalName ?? tenant?.name ?? 'tu empresa';
  const enriched = notifs.map((n) => ({
    title: n.title,
    emisor: n.emisor,
    tipo: n.tipo,
    notificationDate: n.notificationDate,
    severity: classifyNotificationSeverity({
      id: 'x',
      title: n.title,
      tipo: n.tipo,
      emisor: n.emisor,
    } as NotificationLike),
  }));

  const prompt = buildWeeklySummaryPrompt({
    tenantName,
    windowDays,
    notifications: enriched,
    censusChanges: changes.map((c) => ({
      field: c.field,
      changeType: c.changeType,
      oldValue: c.oldValue,
      newValue: c.newValue,
    })),
  });

  try {
    const result = await callLLM({
      provider: 'openai',
      model: 'gpt-4o-mini',
      instructions:
        'Eres Isaak, asesor fiscal-contable virtual. Generas resúmenes ejecutivos sobre buzones AEAT.',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      maxOutputTokens: 600,
      feature: 'isaak_aeat_weekly_summary',
    });
    const summary = result.text?.trim() ?? '';
    return {
      ok: true,
      tenantId: input.tenantId,
      notificationsConsidered: notifs.length,
      censusChangesConsidered: changes.length,
      summary: summary || null,
      generated: summary.length > 0,
    };
  } catch (err) {
    return {
      ok: false,
      tenantId: input.tenantId,
      notificationsConsidered: notifs.length,
      censusChangesConsidered: changes.length,
      summary: null,
      generated: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
