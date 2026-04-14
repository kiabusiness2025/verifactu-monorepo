import type {
  AvailableActionsDTO,
  ConnectionStatus,
  ConnectionStatusDTO,
  GovernanceFlagsDTO,
} from './contracts';

export type HoldedUiBadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'neutral';

export type HoldedUiBadge = {
  key: string;
  label: string;
  variant: HoldedUiBadgeVariant;
};

export type HoldedUiBannerTone = 'success' | 'warning' | 'error' | 'info';

export type HoldedUiBanner = {
  key: string;
  tone: HoldedUiBannerTone;
  title: string;
  message: string;
  actionKey: string | null;
  actionLabel: string | null;
};

function pushUniqueBadge(target: HoldedUiBadge[], badge: HoldedUiBadge) {
  if (!target.some((item) => item.key === badge.key)) {
    target.push(badge);
  }
}

function pushUniqueBanner(target: HoldedUiBanner[], banner: HoldedUiBanner) {
  if (!target.some((item) => item.key === banner.key)) {
    target.push(banner);
  }
}

export function getHoldedConnectionStatusLabel(status?: ConnectionStatus | string | null) {
  switch (status) {
    case 'connected':
      return 'Conectada';
    case 'needs_reconnection':
      return 'Necesita reconexion';
    case 'revoked_api':
      return 'API revocada';
    case 'failed':
      return 'Error de conexion';
    case 'disconnected':
    default:
      return 'Desconectada';
  }
}

export function getHoldedConnectionBadge(
  connection?: ConnectionStatusDTO | null,
  fallbackStatus: ConnectionStatus | 'disconnected' = 'disconnected'
): HoldedUiBadge {
  const status = connection?.status ?? fallbackStatus;
  switch (status) {
    case 'connected':
      return { key: 'connection', label: 'Conectada', variant: 'success' };
    case 'needs_reconnection':
      return { key: 'connection', label: 'Necesita reconexion', variant: 'warning' };
    case 'revoked_api':
      return { key: 'connection', label: 'API revocada', variant: 'error' };
    case 'failed':
      return { key: 'connection', label: 'Error de conexion', variant: 'error' };
    case 'disconnected':
    default:
      return { key: 'connection', label: 'Desconectada', variant: 'neutral' };
  }
}

export function getHoldedGovernanceBadges(flags?: GovernanceFlagsDTO | null): HoldedUiBadge[] {
  const badges: HoldedUiBadge[] = [];

  if (!flags) return badges;

  if (flags.ownershipStatus === 'pending_confirmation') {
    pushUniqueBadge(badges, {
      key: 'pending_confirmation',
      label: 'Confirmacion pendiente',
      variant: 'warning',
    });
  }

  if (flags.managedByThirdParty) {
    pushUniqueBadge(badges, {
      key: 'managed_by_third_party',
      label: 'Gestionada por asesoria',
      variant: 'info',
    });
  }

  if (flags.clientAdminGap) {
    pushUniqueBadge(badges, {
      key: 'client_admin_gap',
      label: 'Falta responsable del cliente',
      variant: 'warning',
    });
  }

  if (flags.highGovernanceRisk) {
    pushUniqueBadge(badges, {
      key: 'high_governance_risk',
      label: 'Riesgo alto de gobernanza',
      variant: 'error',
    });
  }

  if (flags.underClaimReview) {
    pushUniqueBadge(badges, {
      key: 'under_claim_review',
      label: 'Revision en curso',
      variant: 'info',
    });
  }

  return badges;
}

export function getHoldedStatusBanners(input: {
  connection?: ConnectionStatusDTO | null;
  governanceFlags?: GovernanceFlagsDTO | null;
  availableActions?: AvailableActionsDTO | null;
  warnings?: string[] | null;
}): HoldedUiBanner[] {
  const banners: HoldedUiBanner[] = [];
  const status = input.connection?.status ?? 'disconnected';
  const flags = input.governanceFlags;
  const actions = input.availableActions;

  if (status === 'needs_reconnection') {
    pushUniqueBanner(banners, {
      key: 'needs_reconnection',
      tone: 'warning',
      title: 'La conexion necesita reconexion',
      message:
        'La cuenta sigue registrada, pero la API key debe revisarse para recuperar la operacion normal.',
      actionKey: actions?.reconnect?.suggestedAction ?? 'reconnect',
      actionLabel: actions?.reconnect?.suggestedActionLabel ?? 'Reconectar',
    });
  }

  if (status === 'revoked_api') {
    pushUniqueBanner(banners, {
      key: 'revoked_api',
      tone: 'error',
      title: 'La API de Holded ha sido revocada',
      message:
        'La conexion ya no puede operar con la clave actual. Debes reconectarla o rotar la API key.',
      actionKey: actions?.reconnect?.suggestedAction ?? 'reconnect',
      actionLabel: actions?.reconnect?.suggestedActionLabel ?? 'Reconectar ahora',
    });
  }

  if (flags?.underClaimReview) {
    pushUniqueBanner(banners, {
      key: 'under_claim_review',
      tone: 'info',
      title: 'Reclamacion en revision',
      message:
        'La conexion sigue visible, pero algunas acciones sensibles quedan limitadas mientras se resuelve la revision.',
      actionKey: actions?.openClaim?.suggestedAction ?? null,
      actionLabel: actions?.openClaim?.suggestedActionLabel ?? null,
    });
  }

  if (flags?.highGovernanceRisk) {
    pushUniqueBanner(banners, {
      key: 'high_governance_risk',
      tone: 'error',
      title: 'Riesgo alto de gobernanza',
      message:
        'La conexion requiere correcciones en administradores o destinatarios del cliente antes de permitir ciertas acciones.',
      actionKey: actions?.disconnect?.suggestedAction ?? null,
      actionLabel: actions?.disconnect?.suggestedActionLabel ?? null,
    });
  }

  if (flags?.clientAdminGap) {
    pushUniqueBanner(banners, {
      key: 'client_admin_gap',
      tone: 'warning',
      title: 'Falta responsable del cliente',
      message:
        'Anade un administrador del lado cliente para cerrar la gobernanza inicial y reducir bloqueos operativos.',
      actionKey: actions?.disconnect?.suggestedAction ?? 'manageMembers',
      actionLabel: actions?.disconnect?.suggestedActionLabel ?? 'Revisar usuarios',
    });
  }

  for (const warning of input.warnings ?? []) {
    pushUniqueBanner(banners, {
      key: `warning:${warning}`,
      tone: 'warning',
      title: 'Revision recomendada',
      message: warning,
      actionKey: null,
      actionLabel: null,
    });
  }

  return banners;
}
