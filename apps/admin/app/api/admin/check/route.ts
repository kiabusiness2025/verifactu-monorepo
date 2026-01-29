import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  try {
    await requireAdmin({} as Request);
    return NextResponse.json({ isAdmin: true });
  } catch (error) {
    console.error('[Admin Check Error]', error);
    return NextResponse.json({ isAdmin: false });
  }
}
