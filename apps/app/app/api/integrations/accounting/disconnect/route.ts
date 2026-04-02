import { requireTenantContext } from '@/lib/api/tenantAuth';
import { sendHoldedConnectionLifecycleEmails } from '@/lib/email/holdedConnectionEmails';
import { disconnectAccountingIntegration } from '@/lib/integrations/accountingStore';
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

    await sendHoldedConnectionLifecycleEmails({
      userEmail: auth.session.email ?? null,
      userName: auth.session.name ?? null,
      tenantName: tenant?.profile?.tradeName || tenant?.name || 'tu empresa',
      tenantLegalName: tenant?.profile?.legalName || tenant?.legalName || null,
      contactName: auth.session.name ?? null,
      contactEmail: auth.session.email ?? null,
      companyEmail: tenant?.profile?.email || null,
      contactPhone: tenant?.profile?.phone || null,
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
