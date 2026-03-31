import { getProtectedResourceMetadata } from '@/lib/oauth/mcp';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET() {
  return NextResponse.json(getProtectedResourceMetadata());
}
