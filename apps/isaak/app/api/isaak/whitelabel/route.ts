// GET /api/isaak/whitelabel
// Returns the whitelabel config for the current tenant.
// Cached per-request via Next.js revalidation.

import { NextResponse } from 'next/server';
import { getHoldedSession } from '@/app/lib/holded-session';
import { prisma } from '@/app/lib/prisma';

export const runtime = 'nodejs';
export const revalidate = 300; // 5 min cache

export async function GET() {
  const session = await getHoldedSession().catch(() => null);
  if (!session?.tenantId) {
    return NextResponse.json({ config: null });
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: session.tenantId },
    select: { whitelabelConfig: true },
  });

  const config = (tenant?.whitelabelConfig ?? null) as WhitelabelConfig | null;

  if (!config?.enabled) return NextResponse.json({ config: null });

  return NextResponse.json({ config });
}

export type WhitelabelConfig = {
  enabled?: boolean;
  companyName?: string;
  logoUrl?: string;
  primaryColor?: string;
  faviconUrl?: string;
  supportEmail?: string;
  hidePoweredBy?: boolean;
};
