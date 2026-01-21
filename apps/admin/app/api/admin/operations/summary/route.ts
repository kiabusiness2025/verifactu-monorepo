import { NextResponse } from 'next/server';
import { prisma } from '@verifactu/db';
import { requireAdminSession } from '@/lib/auth';

export async function GET() {
  const session = await requireAdminSession();
  
  const [
    totalWebhooks,
    failedWebhooks,
    totalEmails,
    failedEmails,
    blockedUsers
  ] = await Promise.all([
    prisma.webhookEvent.count(),
    prisma.webhookEvent.count({ where: { status: 'FAILED' } }),
    prisma.emailEvent.count(),
    prisma.emailEvent.count({ where: { status: 'FAILED' } }),
    prisma.user.count({ where: { isBlocked: true } })
  ]);

  // Log audit
  await prisma.auditLog.create({
    data: {
      adminUserId: session.userId!,
      action: 'COMPANY_VIEW', // Reusing existing action
      metadata: { section: 'operations_summary' }
    }
  });

  return NextResponse.json({
    webhooks: { total: totalWebhooks, failed: failedWebhooks },
    emails: { total: totalEmails, failed: failedEmails },
    blockedUsers
  });
}
