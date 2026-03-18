export type ExternalProvider = 'holded';

export type HoldedConnectionEntryChannel = 'dashboard' | 'chatgpt' | 'internal';

export type HoldedConnectionMode = 'verifactu_first' | 'holded_first';

export type HoldedCredentialType = 'api_key';

export type HoldedConnectionStatus =
  | 'disconnected'
  | 'pending'
  | 'connected'
  | 'needs_reconnect'
  | 'error'
  | 'revoked';

export type ChannelIdentityType = 'dashboard' | 'chatgpt' | 'internal';

export type InternalRole = 'owner' | 'admin' | 'accountant' | 'viewer';

export interface HoldedSharedConnectionRecord {
  id: string;
  tenantId: string;
  provider: ExternalProvider;
  providerAccountId: string | null;
  credentialType: HoldedCredentialType;
  apiKeyEnc: string | null;
  scopesGranted: string[];
  connectionStatus: HoldedConnectionStatus;
  connectedByUserId: string | null;
  connectedAt: string | null;
  lastValidatedAt: string | null;
  lastSyncAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ChannelIdentityRecord {
  id: string;
  userId: string;
  tenantId: string | null;
  channelType: ChannelIdentityType;
  channelSubjectId: string;
  email: string | null;
  displayName: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface ExternalConnectionAuditEvent {
  id: string;
  tenantId: string;
  userId: string | null;
  channelType: ChannelIdentityType;
  action: string;
  resourceType: string;
  resourceId: string | null;
  status: 'success' | 'denied' | 'error';
  requestPayload: Record<string, unknown> | null;
  responsePayload: Record<string, unknown> | null;
  createdAt: string;
}

export interface ExternalSyncRunRecord {
  id: string;
  tenantId: string;
  connectionId: string;
  provider: ExternalProvider;
  jobType: string;
  status: 'pending' | 'running' | 'success' | 'error';
  startedAt: string | null;
  finishedAt: string | null;
  resultSummary: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

export function getHoldedConnectionMode(input: {
  entryChannel: HoldedConnectionEntryChannel;
  hasExistingConnection: boolean;
}): HoldedConnectionMode {
  if (input.entryChannel === 'chatgpt' && !input.hasExistingConnection) {
    return 'holded_first';
  }

  return 'verifactu_first';
}

export function getHoldedConnectionCapabilities() {
  return {
    sharedConnection: true,
    sharedBackend: true,
    dashboardChannel: true,
    chatgptChannel: true,
    requiresServerSideCredentialStorage: true,
    publicReviewScope: ['invoice', 'accounting', 'crm', 'projects'],
    excludedFromPublicReview: ['team'],
  } as const;
}

export function buildHoldedOnboardingBlueprint(mode: HoldedConnectionMode) {
  if (mode === 'holded_first') {
    return {
      mode,
      steps: [
        'Authenticate the person in Isaak using Verifactu identity.',
        'Capture or reuse the Holded API key server-side.',
        'Create or resolve the internal tenant and channel identity.',
        'Validate the Holded connection and activate Isaak tools.',
        'Offer dashboard access for advanced configuration and history.',
      ],
    };
  }

  return {
    mode,
    steps: [
      'Authenticate the person in Verifactu dashboard.',
      'Connect Holded from the tenant integrations area.',
      'Validate and store the Holded API key server-side.',
      'Expose the same connection to Isaak and internal jobs.',
      'Reuse the connection later from ChatGPT without reconnecting Holded.',
    ],
  };
}

export function buildHoldedConnectionLabel(input: {
  mode: HoldedConnectionMode;
  providerAccountId?: string | null;
}) {
  const suffix = input.providerAccountId ? ' (' + input.providerAccountId + ')' : '';
  return input.mode === 'holded_first'
    ? 'Isaak for Holded' + suffix
    : 'Verifactu + Holded' + suffix;
}