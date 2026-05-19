/**
 * ChannelBadge — pill visual que indica qué canal (ChatGPT, Claude, panel) tiene
 * conectada la integración Holded del tenant.
 *
 * Reutiliza `StatusBadge` de @verifactu/ui (mismo aspect que los otros badges
 * de status que aparecen en el dashboard) pero usa colores distintos por
 * canal — verde para ChatGPT (alineado con el branding rojo/verde de OpenAI),
 * ámbar para Claude (paleta amber de Anthropic), neutro gris para el panel
 * interno de Isaak ("dashboard") y para el canal legacy.
 *
 * Por qué existe:
 *   El dashboard usuario antes mostraba el status de conexión sin pista
 *   visual de qué canal estaba en uso. Para tenants con varias integraciones
 *   activas (ChatGPT + Claude + dashboard interno) la info estaba enterrada
 *   en el JSON de respuesta pero no era visible en UI. Este badge cierra ese
 *   gap — ver auditoría 360 (2026-05-19) cluster E.
 */

import { StatusBadge, type StatusVariant } from '@verifactu/ui';

type ChannelKey = 'chatgpt' | 'claude' | 'dashboard' | 'legacy' | null | undefined;

type ChannelMeta = {
  label: string;
  variant: StatusVariant;
};

const CHANNEL_META: Record<NonNullable<ChannelKey>, ChannelMeta> = {
  chatgpt: { label: 'ChatGPT', variant: 'success' },
  claude: { label: 'Claude', variant: 'warning' },
  dashboard: { label: 'Panel interno', variant: 'neutral' },
  legacy: { label: 'Legacy', variant: 'neutral' },
};

export function ChannelBadge({ channelKey }: { channelKey: ChannelKey }) {
  if (!channelKey) return null;
  const meta = CHANNEL_META[channelKey];
  if (!meta) return null;
  return <StatusBadge label={`Canal ${meta.label}`} variant={meta.variant} />;
}
