import { requireAdmin } from '@/lib/adminAuth';
import { prisma } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);

    const { searchParams } = new URL(request.url);
    const q = (searchParams.get('q') ?? '').trim();
    const limit = Math.min(Math.max(Number(searchParams.get('limit') ?? 100), 10), 500);

    const items = await prisma.tenantSubscription.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      where: q
        ? {
            OR: [
              { status: { contains: q, mode: 'insensitive' } },
              { tenant: { name: { contains: q, mode: 'insensitive' } } },
              { tenant: { legalName: { contains: q, mode: 'insensitive' } } },
              { tenant: { nif: { contains: q, mode: 'insensitive' } } },
              { plan: { name: { contains: q, mode: 'insensitive' } } },
              { plan: { code: { contains: q, mode: 'insensitive' } } },
            ],
          }
        : undefined,
      select: {
        id: true,
        status: true,
        trialEndsAt: true,
        currentPeriodStart: true,
        currentPeriodEnd: true,
        createdAt: true,
        tenantId: true,
        tenant: {
          select: {
            name: true,
            legalName: true,
            nif: true,
          },
        },
        plan: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json({
      ok: true,
      total: items.length,
      items: items.map((item) => ({
        id: item.id,
        status: item.status,
        trialEndsAt: item.trialEndsAt?.toISOString() ?? null,
        currentPeriodStart: item.currentPeriodStart?.toISOString() ?? null,
        currentPeriodEnd: item.currentPeriodEnd?.toISOString() ?? null,
        createdAt: item.createdAt.toISOString(),
        tenantId: item.tenantId,
        tenantName: item.tenant.legalName ?? item.tenant.name,
        tenantNif: item.tenant.nif ?? null,
        plan: {
          id: item.plan.id,
          code: item.plan.code,
          name: item.plan.name,
        },
      })),
    });
  } catch (error: unknown) {
    console.error('Error fetching subscriptions:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    const status = message.includes('FORBIDDEN') ? 403 : 500;
    return NextResponse.json(
      { ok: false, error: status === 403 ? 'Forbidden' : 'Failed to fetch subscriptions' },
      { status }
    );
  }
}
