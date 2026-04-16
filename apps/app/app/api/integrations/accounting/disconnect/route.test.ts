/** @jest-environment node */

jest.mock('@/lib/api/tenantAuth', () => ({
  requireTenantContext: jest.fn(),
}));

jest.mock('@/lib/integrations/accountingStore', () => ({
  disconnectAccountingIntegration: jest.fn(),
}));

jest.mock('@/lib/integrations/holdedConnectionResolver', () => ({
  resolveSharedHoldedConnectionStatusForTenant: jest.fn(),
}));

jest.mock('@/lib/integrations/holdedGovernanceService', () => ({
  resetGovernanceOnDisconnect: jest.fn(async () => ({
    accessRequestsCancelled: 0,
    claimsClosed: 0,
    touchedConnection: true,
  })),
}));

jest.mock('@/lib/integrations/channelIdentityStore', () => ({
  clearChatGptChannelIdentity: jest.fn(async () => 0),
}));

jest.mock('@/lib/integrations/holdedVerifiedEmailIdentities', () => ({
  forgetVerifiedHoldedEmailIdentity: jest.fn(async () => 0),
}));

jest.mock('@/lib/integrations/companyNotificationEmailStore', () => ({
  getConfirmedCompanyNotificationEmail: jest.fn(async () => null),
}));

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    tenant: {
      findUnique: jest.fn(),
    },
  },
}));

jest.mock('@/lib/email/holdedConnectionEmails', () => ({
  sendHoldedConnectionLifecycleEmails: jest.fn(),
}));

jest.mock('@/lib/email/holdedSecurityAlerts', () => ({
  resolveHoldedSecurityAlertRecipients: jest.fn(async () => [
    { email: 'demo@example.com', name: 'Demo User', source: 'membership' },
    { email: 'empresa@example.com', name: null, source: 'tenant_profile' },
  ]),
  sendHoldedSecurityAlertEmails: jest.fn(async () => []),
}));

jest.mock(
  '@verifactu/integrations',
  () => ({
    buildDefaultAvailableActions: jest.fn((input?: Record<string, unknown>) => {
      const status = typeof input?.status === 'string' ? input.status : 'disconnected';
      const underClaimReview = input?.underClaimReview === true;
      const clientAdminGap = input?.clientAdminGap === true;
      const highGovernanceRisk = input?.highGovernanceRisk === true;
      const hasActiveConnection = status !== 'disconnected';
      const disconnectBlocked = !hasActiveConnection || underClaimReview || highGovernanceRisk;
      return {
        reconnect: {
          blocked: false,
          reason: 'ok',
          state: status,
          suggestedAction: null,
          suggestedActionLabel: null,
        },
        rotateApi: {
          blocked: !hasActiveConnection,
          reason: hasActiveConnection ? 'ok' : 'blocked',
          state: status,
          suggestedAction: hasActiveConnection ? null : 'reconnect',
          suggestedActionLabel: hasActiveConnection ? null : 'Reconectar',
        },
        disconnect: {
          blocked: disconnectBlocked,
          reason: underClaimReview
            ? 'La conexion no puede desconectarse mientras haya una reclamacion en revision.'
            : highGovernanceRisk
              ? 'La conexion no puede desconectarse mientras exista un riesgo alto de gobernanza. Primero corrige administradores o destinatarios del cliente.'
              : hasActiveConnection
                ? 'ok'
                : 'La conexion ya esta desconectada.',
          state: underClaimReview
            ? 'under_claim_review'
            : highGovernanceRisk
              ? 'high_governance_risk'
              : status,
          suggestedAction: highGovernanceRisk
            ? clientAdminGap
              ? 'manageMembers'
              : 'manageRecipients'
            : null,
          suggestedActionLabel: highGovernanceRisk
            ? clientAdminGap
              ? 'Revisar usuarios'
              : 'Revisar destinatarios'
            : null,
        },
        manageMembers: {
          blocked: false,
          reason: 'ok',
          state: clientAdminGap ? 'client_admin_gap' : status,
          suggestedAction: null,
          suggestedActionLabel: null,
        },
        manageRecipients: {
          blocked: false,
          reason: 'ok',
          state: highGovernanceRisk ? 'high_governance_risk' : status,
          suggestedAction: null,
          suggestedActionLabel: null,
        },
        openClaim: {
          blocked: underClaimReview,
          reason: underClaimReview ? 'blocked' : 'ok',
          state: underClaimReview ? 'under_claim_review' : status,
          suggestedAction: null,
          suggestedActionLabel: null,
        },
      };
    }),
    buildGovernanceFlags: jest.fn((input?: Record<string, unknown> | null) => ({
      ownershipStatus: input?.ownershipStatus ?? null,
      managedByThirdParty: input?.managedByThirdParty === true,
      clientAdminGap: input?.clientAdminGap === true,
      highGovernanceRisk: input?.highGovernanceRisk === true,
      underClaimReview: input?.underClaimReview === true,
    })),
    normalizeConnectionStatus: jest.fn((status?: string | null) =>
      status === 'error' ? 'failed' : (status ?? 'disconnected')
    ),
  }),
  { virtual: true }
);

import { NextRequest } from 'next/server';
import { POST } from './route';
import { requireTenantContext } from '@/lib/api/tenantAuth';
import { disconnectAccountingIntegration } from '@/lib/integrations/accountingStore';
import { resolveSharedHoldedConnectionStatusForTenant } from '@/lib/integrations/holdedConnectionResolver';
import { resetGovernanceOnDisconnect } from '@/lib/integrations/holdedGovernanceService';
import { clearChatGptChannelIdentity } from '@/lib/integrations/channelIdentityStore';
import { getConfirmedCompanyNotificationEmail } from '@/lib/integrations/companyNotificationEmailStore';
import { forgetVerifiedHoldedEmailIdentity } from '@/lib/integrations/holdedVerifiedEmailIdentities';
import prisma from '@/lib/prisma';
import { sendHoldedConnectionLifecycleEmails } from '@/lib/email/holdedConnectionEmails';
import {
  resolveHoldedSecurityAlertRecipients,
  sendHoldedSecurityAlertEmails,
} from '@/lib/email/holdedSecurityAlerts';

describe('POST /api/integrations/accounting/disconnect', () => {
  beforeEach(() => {
    (requireTenantContext as jest.Mock).mockResolvedValue({
      tenantId: 'tenant-1',
      session: { uid: 'session-1', email: 'soporte@verifactu.business', name: 'Demo User' },
    });
    (disconnectAccountingIntegration as jest.Mock).mockResolvedValue({ status: 'disconnected' });
    (resolveSharedHoldedConnectionStatusForTenant as jest.Mock).mockResolvedValue({
      id: 'ext-1',
      tenantId: 'tenant-1',
      provider: 'holded',
      providerAccountId: 'provider-account-1',
      credentialType: 'api_key',
      status: 'disconnected',
      channel: 'dashboard',
      originChannel: 'dashboard',
      ownershipStatus: 'pending_confirmation',
      managedByThirdParty: false,
      clientAdminGap: false,
      highGovernanceRisk: false,
      underClaimReview: false,
      technicalOperatorUserId: 'user-1',
      connectedAt: null,
      lastValidatedAt: null,
      lastSyncAt: null,
      lastError: null,
      source: 'external_connection',
    });
    (
      (prisma as unknown as { tenant: { findUnique: jest.Mock } }).tenant.findUnique as jest.Mock
    ).mockResolvedValue({
      name: 'Empresa Demo SL',
      legalName: 'Empresa Demo SL',
      profile: {
        legalName: 'Empresa Demo SL',
        tradeName: 'Empresa Demo',
        email: 'empresa@example.com',
        phone: '+34 600 000 000',
      },
    });
    (sendHoldedConnectionLifecycleEmails as jest.Mock).mockResolvedValue([]);
    (clearChatGptChannelIdentity as jest.Mock).mockResolvedValue(0);
    (getConfirmedCompanyNotificationEmail as jest.Mock).mockResolvedValue(null);
    (forgetVerifiedHoldedEmailIdentity as jest.Mock).mockResolvedValue(0);
    (resolveHoldedSecurityAlertRecipients as jest.Mock).mockResolvedValue([
      { email: 'demo@example.com', name: 'Demo User', source: 'membership' },
      { email: 'empresa@example.com', name: null, source: 'tenant_profile' },
    ]);
    (sendHoldedSecurityAlertEmails as jest.Mock).mockResolvedValue([]);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('disconnects the dashboard channel and sends notifications', async () => {
    (resolveSharedHoldedConnectionStatusForTenant as jest.Mock)
      .mockResolvedValueOnce({
        id: 'ext-1',
        tenantId: 'tenant-1',
        provider: 'holded',
        providerAccountId: 'provider-account-1',
        credentialType: 'api_key',
        status: 'connected',
        channel: 'dashboard',
        originChannel: 'dashboard',
        ownershipStatus: 'pending_confirmation',
        managedByThirdParty: false,
        clientAdminGap: false,
        highGovernanceRisk: false,
        underClaimReview: false,
        technicalOperatorUserId: 'user-1',
        connectedAt: null,
        lastValidatedAt: null,
        lastSyncAt: null,
        lastError: null,
        source: 'external_connection',
      })
      .mockResolvedValueOnce({
        id: 'ext-1',
        tenantId: 'tenant-1',
        provider: 'holded',
        providerAccountId: 'provider-account-1',
        credentialType: 'api_key',
        status: 'disconnected',
        channel: 'dashboard',
        originChannel: 'dashboard',
        ownershipStatus: 'pending_confirmation',
        managedByThirdParty: false,
        clientAdminGap: false,
        highGovernanceRisk: false,
        underClaimReview: false,
        technicalOperatorUserId: 'user-1',
        connectedAt: null,
        lastValidatedAt: null,
        lastSyncAt: null,
        lastError: null,
        source: 'external_connection',
      });

    const request = new NextRequest(
      'https://app.verifactu.business/api/integrations/accounting/disconnect',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-isaak-entry-channel': 'dashboard' },
        body: JSON.stringify({ reauthConfirmed: true }),
      }
    );

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.status).toBe('disconnected');
    expect(payload.provider).toBe('holded');
    expect(payload.requestId).toEqual(expect.any(String));
    expect(resetGovernanceOnDisconnect).toHaveBeenCalledWith({
      tenantId: 'tenant-1',
      connectionId: 'ext-1',
      channel: 'dashboard',
    });
    expect(disconnectAccountingIntegration).toHaveBeenCalledWith('tenant-1', 'dashboard');
    expect(clearChatGptChannelIdentity).toHaveBeenCalledWith({
      channelSubjectId: 'session-1',
      email: 'soporte@verifactu.business',
    });
    expect(forgetVerifiedHoldedEmailIdentity).toHaveBeenCalledWith({
      uid: 'session-1',
      email: 'soporte@verifactu.business',
      clearAllForUid: true,
    });
    expect(sendHoldedConnectionLifecycleEmails).toHaveBeenCalledWith({
      userEmail: 'soporte@verifactu.business',
      userName: 'Demo User',
      tenantName: 'Empresa Demo',
      tenantLegalName: 'Empresa Demo SL',
      contactName: 'Demo User',
      contactEmail: 'soporte@verifactu.business',
      companyEmail: 'empresa@example.com',
      contactPhone: '+34 600 000 000',
      action: 'disconnected',
      channel: 'dashboard',
    });
    expect(resolveHoldedSecurityAlertRecipients).toHaveBeenCalledWith({
      tenantId: 'tenant-1',
      actorEmail: 'soporte@verifactu.business',
      actorName: 'Demo User',
      companyNotificationEmail: null,
    });
    expect(sendHoldedSecurityAlertEmails).toHaveBeenCalledWith({
      recipients: [
        { email: 'demo@example.com', name: 'Demo User', source: 'membership' },
        { email: 'empresa@example.com', name: null, source: 'tenant_profile' },
      ],
      tenantName: 'Empresa Demo',
      tenantLegalName: 'Empresa Demo SL',
      actorEmail: 'soporte@verifactu.business',
      actorName: 'Demo User',
      action: 'disconnected',
      channel: 'dashboard',
    });
  });

  it('forces disconnect even while a claim is under review', async () => {
    (resolveSharedHoldedConnectionStatusForTenant as jest.Mock)
      .mockResolvedValueOnce({
        id: 'ext-claim-1',
        tenantId: 'tenant-1',
        provider: 'holded',
        providerAccountId: 'provider-account-claim',
        credentialType: 'api_key',
        status: 'connected',
        channel: 'dashboard',
        originChannel: 'dashboard',
        ownershipStatus: 'pending_confirmation',
        managedByThirdParty: false,
        clientAdminGap: false,
        highGovernanceRisk: false,
        underClaimReview: true,
        technicalOperatorUserId: 'user-1',
        connectedAt: null,
        lastValidatedAt: null,
        lastSyncAt: null,
        lastError: null,
        source: 'external_connection',
      })
      .mockResolvedValueOnce({
        id: 'ext-claim-1',
        tenantId: 'tenant-1',
        provider: 'holded',
        providerAccountId: 'provider-account-claim',
        credentialType: 'api_key',
        status: 'disconnected',
        channel: 'dashboard',
        originChannel: 'dashboard',
        ownershipStatus: 'pending_confirmation',
        managedByThirdParty: false,
        clientAdminGap: false,
        highGovernanceRisk: false,
        underClaimReview: false,
        technicalOperatorUserId: null,
        connectedAt: null,
        lastValidatedAt: null,
        lastSyncAt: null,
        lastError: null,
        source: 'external_connection',
      });

    const response = await POST(
      new NextRequest('https://app.verifactu.business/api/integrations/accounting/disconnect', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-isaak-entry-channel': 'dashboard' },
        body: JSON.stringify({ reauthConfirmed: true }),
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.status).toBe('disconnected');
    expect(resetGovernanceOnDisconnect).toHaveBeenCalledWith({
      tenantId: 'tenant-1',
      connectionId: 'ext-claim-1',
      channel: 'dashboard',
    });
    expect(disconnectAccountingIntegration).toHaveBeenCalledWith('tenant-1', 'dashboard');
    expect(sendHoldedConnectionLifecycleEmails).toHaveBeenCalled();
  });
});
