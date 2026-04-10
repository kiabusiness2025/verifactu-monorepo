import { requireTenantContext } from '@/lib/api/tenantAuth';
import { sendHoldedConnectionLifecycleEmails } from '@/lib/email/holdedConnectionEmails';
import {
  resolveHoldedSecurityAlertRecipients,
  sendHoldedSecurityAlertEmails,
} from '@/lib/email/holdedSecurityAlerts';
import { disconnectAccountingIntegration } from '@/lib/integrations/accountingStore';
import { clearChatGptChannelIdentity } from '@/lib/integrations/channelIdentityStore';
import { getConfirmedCompanyNotificationEmail } from '@/lib/integrations/companyNotificationEmailStore';
import { forgetVerifiedHoldedEmailIdentity } from '@/lib/integrations/holdedVerifiedEmailIdentities';
import prisma from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

function getEntryChannel(request: NextRequest) {
  const header = request.headers.get('x-isaak-entry-channel')?.trim().toLowerCase();
  return header === 'chatgpt' ? 'chatgpt' : 'dashboard';
}

export async function POST(request: NextRequest) {
  const entryChannel = getEntryChannel(request);
  const auth = await requireTenantContext({
    channelType: entryChannel,
    metadata: { source: 'holded-disconnect' },
  });
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const updated = await disconnectAccountingIntegration(auth.tenantId, entryChannel);

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
    console.error('[api/integrations/accounting/disconnect] connector identity cleanup failed', {
      tenantId: auth.tenantId,
      entryChannel,
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
    console.error('[api/integrations/accounting/disconnect] notification failed', {
      tenantId: auth.tenantId,
      entryChannel,
      message:
        notificationError instanceof Error ? notificationError.message : String(notificationError),
    });
  }

  return NextResponse.json({
    ok: true,
    provider: 'accounting_api',
    status: updated?.status ?? 'disconnected',
  });
}
