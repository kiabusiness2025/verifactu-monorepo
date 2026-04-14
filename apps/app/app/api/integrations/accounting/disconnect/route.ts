import { requireTenantContext } from '@/lib/api/tenantAuth';
import { sendHoldedConnectionLifecycleEmails } from '@/lib/email/holdedConnectionEmails';
import {
  resolveHoldedSecurityAlertRecipients,
  sendHoldedSecurityAlertEmails,
} from '@/lib/email/holdedSecurityAlerts';
import { disconnectAccountingIntegration } from '@/lib/integrations/accountingStore';
import { clearChatGptChannelIdentity } from '@/lib/integrations/channelIdentityStore';
import { getConfirmedCompanyNotificationEmail } from '@/lib/integrations/companyNotificationEmailStore';
import {
  buildConnectorEvent,
  getConnectorRequestId,
  logConnectorEvent,
  withConnectorRequestId,
} from '@/lib/integrations/connectorObservability';
import { resolveSharedHoldedConnectionStatusForTenant } from '@/lib/integrations/holdedConnectionResolver';
import { forgetVerifiedHoldedEmailIdentity } from '@/lib/integrations/holdedVerifiedEmailIdentities';
import {
  assertHoldedConnectorAdminSessionAccess,
  getHoldedConnectorAdminNotice,
} from '@/lib/holdedConnectorAdmin';
import prisma from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import {
  buildDefaultAvailableActions,
  buildGovernanceFlags,
  normalizeConnectionStatus,
} from '@verifactu/integrations';

export const runtime = 'nodejs';

function getEntryChannel(request: NextRequest) {
  const header = request.headers.get('x-isaak-entry-channel')?.trim().toLowerCase();
  return header === 'chatgpt' ? 'chatgpt' : 'dashboard';
}

export async function POST(request: NextRequest) {
  const requestId = getConnectorRequestId(request);
  const entryChannel = getEntryChannel(request);
  const auth = await requireTenantContext({
    channelType: entryChannel,
    metadata: { source: 'holded-disconnect' },
  });
  if ('error' in auth) {
    logConnectorEvent(
      'api/integrations/accounting/disconnect',
      'warn',
      buildConnectorEvent({
        requestId,
        entryChannel,
        stage: 'auth',
        outcome: 'auth_error',
        error: auth.error,
      })
    );
    return withConnectorRequestId(
      NextResponse.json({ error: auth.error, requestId }, { status: auth.status }),
      requestId
    );
  }

  try {
    assertHoldedConnectorAdminSessionAccess(auth.session, { entryChannel });
  } catch {
    logConnectorEvent(
      'api/integrations/accounting/disconnect',
      'warn',
      buildConnectorEvent({
        requestId,
        tenantId: auth.tenantId,
        entryChannel,
        stage: 'auth',
        outcome: 'admin_access_required',
      })
    );
    return withConnectorRequestId(
      NextResponse.json(
        { ok: false, error: getHoldedConnectorAdminNotice(), requestId },
        { status: 403 }
      ),
      requestId
    );
  }

  const body = await request.json().catch(() => ({}));
  if (body?.reauthConfirmed !== true) {
    logConnectorEvent(
      'api/integrations/accounting/disconnect',
      'warn',
      buildConnectorEvent({
        requestId,
        tenantId: auth.tenantId,
        entryChannel,
        stage: 'body',
        outcome: 'missing_reauth',
      })
    );
    return withConnectorRequestId(
      NextResponse.json(
        { ok: false, error: 'Debes confirmar la accion antes de desconectar Holded.', requestId },
        { status: 400 }
      ),
      requestId
    );
  }

  const current = await resolveSharedHoldedConnectionStatusForTenant(auth.tenantId, entryChannel);
  const currentGovernanceFlags = buildGovernanceFlags(current);
  const currentAvailableActions = buildDefaultAvailableActions({
    status: current?.status ?? 'disconnected',
    underClaimReview: currentGovernanceFlags.underClaimReview,
    clientAdminGap: currentGovernanceFlags.clientAdminGap,
    highGovernanceRisk: currentGovernanceFlags.highGovernanceRisk,
  });

  if (currentAvailableActions.disconnect.blocked) {
    logConnectorEvent(
      'api/integrations/accounting/disconnect',
      'warn',
      buildConnectorEvent({
        requestId,
        tenantId: auth.tenantId,
        entryChannel,
        stage: 'guards',
        outcome: 'blocked',
        error: currentAvailableActions.disconnect.reason,
      })
    );
    return withConnectorRequestId(
      NextResponse.json(
        {
          ok: false,
          error: currentAvailableActions.disconnect.reason,
          governanceFlags: currentGovernanceFlags,
          availableActions: currentAvailableActions,
          requestId,
        },
        { status: 409 }
      ),
      requestId
    );
  }

  await disconnectAccountingIntegration(auth.tenantId, entryChannel);
  const resolved = await resolveSharedHoldedConnectionStatusForTenant(auth.tenantId, entryChannel);
  const governanceFlags = buildGovernanceFlags(resolved);

  try {
    await Promise.all([
      clearChatGptChannelIdentity({
        channelSubjectId: auth.session.uid ?? null,
        email: auth.session.email ?? null,
      }),
      forgetVerifiedHoldedEmailIdentity({
        uid: auth.session.uid ?? null,
        email: auth.session.email ?? null,
        clearAllForUid: true,
      }),
    ]);
  } catch (cleanupError) {
    logConnectorEvent('api/integrations/accounting/disconnect', 'error', {
      requestId,
      tenantId: auth.tenantId,
      entryChannel,
      stage: 'cleanup',
      outcome: 'cleanup_failed',
      uid: auth.session.uid ?? null,
      message: cleanupError instanceof Error ? cleanupError.message : String(cleanupError),
    });
  }

  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: auth.tenantId },
      select: {
        name: true,
        legalName: true,
        profile: {
          select: {
            legalName: true,
            tradeName: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    const confirmedCompanyEmail = await getConfirmedCompanyNotificationEmail(auth.tenantId);

    await sendHoldedConnectionLifecycleEmails({
      userEmail: auth.session.email ?? null,
      userName: auth.session.name ?? null,
      tenantName: tenant?.profile?.tradeName || tenant?.name || 'tu empresa',
      tenantLegalName: tenant?.profile?.legalName || tenant?.legalName || null,
      contactName: auth.session.name ?? null,
      contactEmail: auth.session.email ?? null,
      companyEmail: confirmedCompanyEmail || tenant?.profile?.email || null,
      contactPhone: tenant?.profile?.phone || null,
      action: 'disconnected',
      channel: entryChannel,
    });

    const securityRecipients = await resolveHoldedSecurityAlertRecipients({
      tenantId: auth.tenantId,
      actorEmail: auth.session.email ?? null,
      actorName: auth.session.name ?? null,
      companyNotificationEmail: confirmedCompanyEmail,
    });

    await sendHoldedSecurityAlertEmails({
      recipients: securityRecipients,
      tenantName: tenant?.profile?.tradeName || tenant?.name || 'tu empresa',
      tenantLegalName: tenant?.profile?.legalName || tenant?.legalName || null,
      actorEmail: auth.session.email ?? null,
      actorName: auth.session.name ?? null,
      action: 'disconnected',
      channel: entryChannel,
    });
  } catch (notificationError) {
    logConnectorEvent('api/integrations/accounting/disconnect', 'error', {
      requestId,
      tenantId: auth.tenantId,
      entryChannel,
      stage: 'notify',
      outcome: 'notification_failed',
      message:
        notificationError instanceof Error ? notificationError.message : String(notificationError),
    });
  }

  logConnectorEvent(
    'api/integrations/accounting/disconnect',
    'info',
    buildConnectorEvent({
      requestId,
      tenantId: auth.tenantId,
      entryChannel,
      stage: 'disconnect',
      outcome: 'success',
      status: resolved?.status ?? 'disconnected',
    })
  );

  return withConnectorRequestId(
    NextResponse.json({
      ok: true,
      provider: 'holded',
      status: normalizeConnectionStatus(resolved?.status ?? 'disconnected'),
      governanceFlags,
      availableActions: buildDefaultAvailableActions({
        status: resolved?.status ?? 'disconnected',
        underClaimReview: governanceFlags.underClaimReview,
        clientAdminGap: governanceFlags.clientAdminGap,
        highGovernanceRisk: governanceFlags.highGovernanceRisk,
      }),
      requestId,
    }),
    requestId
  );
}
