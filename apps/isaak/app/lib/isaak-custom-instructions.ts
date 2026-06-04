// V1.6.3 — Instrucciones personalizadas del tenant que se inyectan al
// system prompt en cada turno del chat principal.
//
// Persistencia: Tenant.whitelabelConfig.aiCustomInstructions (sin
// migración — whitelabelConfig ya existe como Json libre).
//
// Casos de uso:
//   - Asesor que quiere que Isaak firme respuestas con "Saludos, Gestoría X".
//   - Tono específico ("habla siempre de usted", "usa emojis").
//   - Recordatorios ("recuerda que mi cliente paga a 60 días, no a 30").

import { prisma } from './prisma';

const MAX_CHARS = 2000;

/**
 * Lee las instrucciones personalizadas del tenant. Devuelve cadena vacía
 * si no hay nada configurado o si excede el límite (seguridad).
 */
export async function loadCustomInstructions(tenantId: string): Promise<string> {
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { whitelabelConfig: true },
    });
    const config = (tenant?.whitelabelConfig ?? null) as { aiCustomInstructions?: unknown } | null;
    const raw = config?.aiCustomInstructions;
    if (typeof raw !== 'string') return '';
    const trimmed = raw.trim();
    if (!trimmed) return '';
    if (trimmed.length > MAX_CHARS) return trimmed.slice(0, MAX_CHARS);
    return trimmed;
  } catch {
    return '';
  }
}

/**
 * Construye el bloque para concatenar al system prompt. Cadena vacía si
 * el tenant no tiene instrucciones configuradas.
 */
export function buildCustomInstructionsBlock(text: string): string {
  if (!text.trim()) return '';
  return [
    '== Instrucciones personalizadas del usuario / asesoría ==',
    'El propietario de esta cuenta ha configurado las siguientes preferencias y',
    'reglas adicionales que debes RESPETAR (siempre que no contradigan a la',
    'seguridad o a la corrección fiscal/legal):',
    '',
    text,
  ].join('\n');
}
