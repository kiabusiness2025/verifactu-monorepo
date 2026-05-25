// C-A4 — Pure prompt builder, separado de aeat-weekly-summary.ts para
// que los tests no arrastren @verifactu/utils via callLLM.

import type { NotificationSeverity } from './aeat-sede-diff';

export type WeeklySummaryPromptInput = {
  tenantName: string;
  windowDays: number;
  notifications: Array<{
    title: string;
    emisor: string;
    tipo: string;
    notificationDate: Date;
    severity: NotificationSeverity;
  }>;
  censusChanges: Array<{
    field: string;
    changeType: string;
    oldValue: string | null;
    newValue: string | null;
  }>;
};

export function buildWeeklySummaryPrompt(args: WeeklySummaryPromptInput): string {
  const lines: string[] = [];
  lines.push(
    `Eres Isaak, asesor fiscal-contable virtual. Vas a generar un resumen semanal en español para ${args.tenantName} sobre lo que ha llegado a su buzón AEAT en los últimos ${args.windowDays} días.`,
  );
  lines.push('');
  lines.push('REGLAS:');
  lines.push(
    '- Tono: profesional, concreto, sin alarmismo. Máximo 200 palabras.',
  );
  lines.push(
    '- Estructura: párrafo de cabecera (1 línea) + bullets por gravedad (críticas primero).',
  );
  lines.push(
    '- Si hay críticas (requerimientos, sanciones, embargo, apremio), indica EXPLICITAMENTE que necesita acción inmediata.',
  );
  lines.push(
    '- Si solo hay informativas, transmite tranquilidad pero recuerda revisar plazos.',
  );
  lines.push(
    '- NO inventes datos. Si no tienes información concreta sobre algo, dilo.',
  );
  lines.push('');

  if (args.notifications.length > 0) {
    lines.push(`NOTIFICACIONES AEAT (${args.notifications.length}):`);
    for (const n of args.notifications) {
      lines.push(
        `  - [${n.severity.toUpperCase()}] ${n.notificationDate.toISOString().slice(0, 10)} · ${n.emisor} · "${n.title}" (tipo: ${n.tipo})`,
      );
    }
    lines.push('');
  } else {
    lines.push('NOTIFICACIONES AEAT: ninguna nueva en el periodo.');
    lines.push('');
  }

  if (args.censusChanges.length > 0) {
    lines.push(`CAMBIOS CENSALES (${args.censusChanges.length}):`);
    for (const c of args.censusChanges) {
      const detail =
        c.changeType === 'modified'
          ? `"${c.oldValue ?? ''}" → "${c.newValue ?? ''}"`
          : c.changeType === 'added'
            ? `añadido "${c.newValue ?? ''}"`
            : `eliminado "${c.oldValue ?? ''}"`;
      lines.push(`  - ${c.field}: ${detail}`);
    }
    lines.push('');
  }

  lines.push(
    'Devuelve solo el texto del resumen listo para enviar por email (sin "Asunto:" ni saludo si el cuerpo ya lo incluye).',
  );
  return lines.join('\n');
}
