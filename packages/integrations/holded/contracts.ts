export type HoldedConnectionChannel = 'dashboard' | 'chatgpt';

export type ConnectionStatus =
  | 'connected'
  | 'needs_reconnection'
  | 'revoked_api'
  | 'disconnected'
  | 'failed';

export type OwnershipStatus = 'confirmed' | 'pending_confirmation' | 'third_party_managed';

export type MembershipRole = 'company_admin' | 'operator' | 'viewer' | 'advisor_operator';

export type MembershipSide = 'client' | 'advisor';

export type MembershipStatus = 'active' | 'invited' | 'disabled';

export type AccessRequestStatus =
  | 'submitted'
  | 'under_review'
  | 'approved'
  | 'rejected'
  | 'cancelled';

export type ClaimType = 'control' | 'advisor_governance';

export type ClaimStatus =
  | 'submitted'
  | 'acknowledged'
  | 'under_review'
  | 'awaiting_response'
  | 'resolved_approved'
  | 'resolved_rejected'
  | 'closed';

export type RecipientType =
  | 'user_primary'
  | 'client_contact'
  | 'shared_mailbox'
  | 'ops'
  | 'advisor_contact';

export type DetectedCompanyConfidence = 'high' | 'medium' | 'low';

export type HoldedValidateNextStep =
  | 'confirm_company'
  | 'duplicate_conflict'
  | 'manual_completion_required';

export type HoldedConnectNextStep = 'connected' | 'review_panel' | 'needs_additional_admin';

export type HoldedRequestNextStep = 'request_submitted';

export type HoldedClaimNextStep = 'claim_submitted';

export type HoldedConnectMode = 'initial' | 'reconnect';

export type HoldedActionKey =
  | 'reconnect'
  | 'rotateApi'
  | 'disconnect'
  | 'manageMembers'
  | 'manageRecipients'
  | 'openClaim';

export type LightweightActorDTO = {
  userId: string | null;
  name: string | null;
  email: string | null;
};

export type ActionBlockReasonDTO = {
  blocked: boolean;
  reason: string;
  state: string;
  suggestedAction: string | null;
  suggestedActionLabel: string | null;
};

export type AvailableActionsDTO = Record<HoldedActionKey, ActionBlockReasonDTO>;

export type ConnectionStatusDTO = {
  connectionId: string;
  tenantId: string;
  provider: 'holded';
  status: ConnectionStatus;
  keyMasked: string | null;
  providerAccountId: string | null;
  connectedAt: string | null;
  lastValidatedAt: string | null;
  lastSyncAt: string | null;
  lastError: string | null;
  originChannel: string | null;
  supportedModules: string[];
};

export type GovernanceFlagsDTO = {
  ownershipStatus: OwnershipStatus | null;
  managedByThirdParty: boolean;
  clientAdminGap: boolean;
  highGovernanceRisk: boolean;
  underClaimReview: boolean;
};

export type DetectedCompanyDTO = {
  companyName: string | null;
  legalName: string | null;
  taxId: string | null;
  source: string;
  confidence: DetectedCompanyConfidence;
  isPartial: boolean;
  missingFields: string[];
};

export type DuplicateConflictDTO = {
  exists: boolean;
  connectionId: string | null;
  tenantId: string | null;
  providerAccountId: string | null;
  userHasAccess: boolean;
  canRequestAccess: boolean;
  canOpenClaim: boolean;
  reason: string | null;
};

export type MembershipDTO = {
  membershipId: string;
  userId: string;
  name: string | null;
  email: string;
  role: MembershipRole;
  side: MembershipSide | null;
  status: MembershipStatus;
  invitedAt: string | null;
  confirmedAt: string | null;
};

export type RecipientDTO = {
  recipientId: string;
  email: string;
  recipientType: RecipientType;
  isMandatory: boolean;
  isClientSide: boolean;
  isConfirmed: boolean;
  createdByUserId: string | null;
};

export type AccessRequestDTO = {
  requestId: string;
  connectionId: string;
  requester: LightweightActorDTO;
  status: AccessRequestStatus;
  requestedRole: MembershipRole | null;
  message: string | null;
  createdAt: string;
  resolvedAt: string | null;
};

export type ClaimCaseDTO = {
  claimId: string;
  connectionId: string;
  claimType: ClaimType;
  status: ClaimStatus;
  reason: string;
  scope: string | null;
  requiresInternalReview: boolean;
  createdBy: LightweightActorDTO;
  createdAt: string;
  resolvedAt: string | null;
  outcome: string | null;
};

export type ClaimResolutionDTO = {
  resolutionId: string;
  action: string;
  previousStatus: ClaimStatus | null;
  nextStatus: ClaimStatus;
  notes: string | null;
  createdAt: string;
  actor: LightweightActorDTO | null;
};

export type HoldedStatusResponse = {
  connection: ConnectionStatusDTO | null;
  governanceFlags: GovernanceFlagsDTO | null;
  availableActions: AvailableActionsDTO;
  membershipsSummary?: Record<string, unknown> | null;
  recipientsSummary?: Record<string, unknown> | null;
  claimsSummary?: Record<string, unknown> | null;
  requestId?: string | null;
};

export type HoldedValidateRequest = {
  apiKey: string;
  channel: HoldedConnectionChannel;
};

export type HoldedValidateResponse = {
  ok: boolean;
  probe: Record<string, unknown> | null;
  validationToken: string | null;
  detectedCompany: DetectedCompanyDTO | null;
  duplicateConflict: DuplicateConflictDTO;
  nextStep: HoldedValidateNextStep | null;
  requestId?: string | null;
  error: string | null;
  reason?: string | null;
  suggestedAction?: string | null;
};

export type HoldedConnectRequest = {
  apiKey: string;
  channel: HoldedConnectionChannel;
  validationToken?: string | null;
  companyName?: string | null;
  legalName?: string | null;
  taxId?: string | null;
  roleDeclared?: string | null;
  notificationEmail?: string | null;
  acceptedTerms: boolean;
  acceptedPrivacy: boolean;
  authorizationConfirmed: boolean;
};

export type HoldedConnectResponse = {
  ok: boolean;
  connection: ConnectionStatusDTO | null;
  detectedCompany: DetectedCompanyDTO | null;
  governanceFlags: GovernanceFlagsDTO | null;
  availableActions: AvailableActionsDTO | null;
  warnings: string[];
  nextStep: HoldedConnectNextStep | null;
  requestId?: string | null;
  error: string | null;
  reason?: string | null;
};

export type HoldedCreateAccessRequest = {
  connectionId: string;
  requestedRole?: MembershipRole | null;
  message?: string | null;
};

export type HoldedCreateAccessRequestResponse = {
  ok: boolean;
  accessRequest: AccessRequestDTO;
  notified: boolean;
  nextStep: HoldedRequestNextStep;
  requestId?: string | null;
};

export type HoldedCreateClaimRequest = {
  connectionId: string;
  claimType: ClaimType;
  reason: string;
  scope?: string | null;
};

export type HoldedCreateClaimResponse = {
  ok: boolean;
  claim: ClaimCaseDTO;
  governanceFlags: GovernanceFlagsDTO;
  notified: boolean;
  nextStep: HoldedClaimNextStep;
  requestId?: string | null;
};

export type HoldedClaimDetailsResponse = {
  claim: ClaimCaseDTO;
  timeline: ClaimResolutionDTO[];
  availableActions: AvailableActionsDTO;
};

export type AccountingStatusResponse = {
  provider: 'holded';
  connection: ConnectionStatusDTO | null;
  governanceFlags: GovernanceFlagsDTO | null;
  membershipsSummary?: Record<string, unknown> | null;
  recipientsSummary?: Record<string, unknown> | null;
  claimsSummary?: Record<string, unknown> | null;
  availableActions: AvailableActionsDTO;
  requestId: string;
};

export type AccountingConnectRequest = {
  apiKey: string;
  validationToken?: string | null;
  mode: HoldedConnectMode;
  acceptedTerms: boolean;
  acceptedPrivacy: boolean;
};

export type AccountingConnectResponse = {
  ok: boolean;
  connection: ConnectionStatusDTO | null;
  governanceFlags: GovernanceFlagsDTO | null;
  availableActions: AvailableActionsDTO | null;
  probe: Record<string, unknown> | null;
  warnings: string[];
  requestId: string;
  error: string | null;
};

export type AccountingDisconnectRequest = {
  reason?: string | null;
  reauthConfirmed: boolean;
};

export type AccountingDisconnectResponse = {
  ok: boolean;
  provider: 'holded';
  status: ConnectionStatus;
  governanceFlags: GovernanceFlagsDTO | null;
  requestId?: string | null;
};

export type AccountingRotateKeyRequest = {
  apiKey: string;
  validationToken?: string | null;
  reauthConfirmed: boolean;
};

export type AccountingRotateKeyResponse = {
  ok: boolean;
  connection: ConnectionStatusDTO;
  governanceFlags: GovernanceFlagsDTO;
  event: 'api_rotated';
};
