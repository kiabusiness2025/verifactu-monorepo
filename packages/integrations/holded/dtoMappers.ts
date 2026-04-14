import type {
  ActionBlockReasonDTO,
  AvailableActionsDTO,
  ConnectionStatus,
  ConnectionStatusDTO,
  DetectedCompanyConfidence,
  DetectedCompanyDTO,
  DuplicateConflictDTO,
  GovernanceFlagsDTO,
} from './contracts';

type ConnectionLike = {
  id?: string | null;
  tenantId?: string | null;
  providerAccountId?: string | null;
  status?: string | null;
  keyMasked?: string | null;
  connectedAt?: string | Date | null;
  lastValidatedAt?: string | Date | null;
  lastSyncAt?: string | Date | null;
  lastError?: string | null;
  originChannel?: string | null;
  supportedModules?: string[] | null;
  ownershipStatus?: string | null;
  managedByThirdParty?: boolean | null;
  clientAdminGap?: boolean | null;
  highGovernanceRisk?: boolean | null;
  underClaimReview?: boolean | null;
};

export function normalizeConnectionStatus(status?: string | null): ConnectionStatus {
  switch (status) {
    case 'connected':
      return 'connected';
    case 'needs_reconnection':
      return 'needs_reconnection';
    case 'revoked_api':
      return 'revoked_api';
    case 'failed':
      return 'failed';
    case 'error':
      return 'failed';
    case 'disconnected':
    default:
      return 'disconnected';
  }
}

export function buildActionState(
  blocked: boolean,
  reason: string,
  state: string,
  suggestedAction: string | null = null,
  suggestedActionLabel: string | null = null
): ActionBlockReasonDTO {
  return {
    blocked,
    reason,
    state,
    suggestedAction,
    suggestedActionLabel,
  };
}

export function buildDefaultAvailableActions(input?: {
  status?: string | null;
  underClaimReview?: boolean | null;
  clientAdminGap?: boolean | null;
  highGovernanceRisk?: boolean | null;
}): AvailableActionsDTO {
  const normalizedStatus = normalizeConnectionStatus(input?.status);
  const underClaimReview = input?.underClaimReview === true;
  const clientAdminGap = input?.clientAdminGap === true;
  const highGovernanceRisk = input?.highGovernanceRisk === true;
  const hasActiveConnection = normalizedStatus !== 'disconnected';
  const disconnectBlocked = !hasActiveConnection || underClaimReview || highGovernanceRisk;
  const disconnectReason = underClaimReview
    ? 'La conexion no puede desconectarse mientras haya una reclamacion en revision.'
    : highGovernanceRisk
      ? 'La conexion no puede desconectarse mientras exista un riesgo alto de gobernanza. Primero corrige administradores o destinatarios del cliente.'
      : hasActiveConnection
        ? 'La conexion puede desconectarse de forma controlada.'
        : 'La conexion ya esta desconectada.';
  const disconnectSuggestedAction = underClaimReview
    ? null
    : highGovernanceRisk
      ? clientAdminGap
        ? 'manageMembers'
        : 'manageRecipients'
      : hasActiveConnection
        ? null
        : 'reconnect';
  const disconnectSuggestedActionLabel = underClaimReview
    ? null
    : highGovernanceRisk
      ? clientAdminGap
        ? 'Revisar usuarios'
        : 'Revisar destinatarios'
      : hasActiveConnection
        ? null
        : 'Reconectar';

  return {
    reconnect: buildActionState(
      false,
      hasActiveConnection
        ? 'La conexion puede revalidarse o reconectarse.'
        : 'La conexion puede activarse de nuevo.',
      normalizedStatus,
      'reconnect',
      hasActiveConnection ? 'Revalidar conexion' : 'Reconectar'
    ),
    rotateApi: buildActionState(
      !hasActiveConnection,
      hasActiveConnection
        ? 'La API key puede rotarse desde el panel.'
        : 'Necesitas una conexion activa antes de rotar la API key.',
      normalizedStatus,
      hasActiveConnection ? null : 'reconnect',
      hasActiveConnection ? null : 'Reconectar'
    ),
    disconnect: buildActionState(
      disconnectBlocked,
      disconnectReason,
      underClaimReview
        ? 'under_claim_review'
        : highGovernanceRisk
          ? 'high_governance_risk'
          : normalizedStatus,
      disconnectSuggestedAction,
      disconnectSuggestedActionLabel
    ),
    manageMembers: buildActionState(
      false,
      clientAdminGap
        ? 'La gestion de usuarios sigue disponible y es necesaria para corregir la gobernanza del cliente.'
        : 'La gestion de usuarios sigue disponible desde el panel privado.',
      clientAdminGap ? 'client_admin_gap' : normalizedStatus
    ),
    manageRecipients: buildActionState(
      false,
      highGovernanceRisk
        ? 'La gestion de destinatarios sigue disponible y ayuda a corregir el riesgo de gobernanza.'
        : 'La gestion de destinatarios sigue disponible desde el panel privado.',
      highGovernanceRisk ? 'high_governance_risk' : normalizedStatus
    ),
    openClaim: buildActionState(
      underClaimReview,
      underClaimReview
        ? 'Ya existe una reclamacion en revision para esta conexion.'
        : 'Se puede iniciar una reclamacion desde el panel cuando haga falta.',
      underClaimReview ? 'under_claim_review' : normalizedStatus
    ),
  };
}

export function buildGovernanceFlags(input?: ConnectionLike | null): GovernanceFlagsDTO {
  return {
    ownershipStatus:
      input?.ownershipStatus === 'confirmed' ||
      input?.ownershipStatus === 'pending_confirmation' ||
      input?.ownershipStatus === 'third_party_managed'
        ? input.ownershipStatus
        : null,
    managedByThirdParty: input?.managedByThirdParty === true,
    clientAdminGap: input?.clientAdminGap === true,
    highGovernanceRisk: input?.highGovernanceRisk === true,
    underClaimReview: input?.underClaimReview === true,
  };
}

export function buildConnectionStatusDto(input: {
  connectionId?: string | null;
  tenantId: string;
  status?: string | null;
  keyMasked?: string | null;
  providerAccountId?: string | null;
  connectedAt?: string | null;
  lastValidatedAt?: string | null;
  lastSyncAt?: string | null;
  lastError?: string | null;
  originChannel?: string | null;
  supportedModules?: string[] | null;
}): ConnectionStatusDTO {
  return {
    connectionId: input.connectionId || 'holded-connection',
    tenantId: input.tenantId,
    provider: 'holded',
    status: normalizeConnectionStatus(input.status),
    keyMasked: input.keyMasked ?? null,
    providerAccountId: input.providerAccountId ?? null,
    connectedAt: input.connectedAt ?? null,
    lastValidatedAt: input.lastValidatedAt ?? null,
    lastSyncAt: input.lastSyncAt ?? null,
    lastError: input.lastError ?? null,
    originChannel: input.originChannel ?? null,
    supportedModules: input.supportedModules ?? [],
  };
}

export function buildDetectedCompany(input: {
  companyName?: string | null;
  legalName?: string | null;
  taxId?: string | null;
  source?: string | null;
  confidence?: DetectedCompanyConfidence;
}): DetectedCompanyDTO | null {
  const companyName = input.companyName?.trim() || null;
  const legalName = input.legalName?.trim() || null;
  const taxId = input.taxId?.trim() || null;

  if (!companyName && !legalName && !taxId) {
    return null;
  }

  const missingFields = [!companyName ? 'companyName' : null, !taxId ? 'taxId' : null].filter(
    (value): value is string => Boolean(value)
  );

  return {
    companyName,
    legalName,
    taxId,
    source: input.source?.trim() || 'holded',
    confidence: input.confidence ?? (missingFields.length === 0 ? 'high' : 'low'),
    isPartial: missingFields.length > 0,
    missingFields,
  };
}

export function buildDefaultDuplicateConflict(): DuplicateConflictDTO {
  return {
    exists: false,
    connectionId: null,
    tenantId: null,
    providerAccountId: null,
    userHasAccess: false,
    canRequestAccess: false,
    canOpenClaim: false,
    reason: null,
  };
}
