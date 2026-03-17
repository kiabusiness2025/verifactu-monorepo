import { verifyAccessToken } from '@/lib/oauth/mcp';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

function getBearerToken(request: NextRequest) {
  const auth = request.headers.get('authorization') || '';
  return auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
}

export async function GET(request: NextRequest) {
  const token = getBearerToken(request);
  if (!token) {
    return NextResponse.json({ error: 'invalid_token' }, { status: 401 });
  }

  const payload = await verifyAccessToken(token);
  if (!payload) {
    return NextResponse.json({ error: 'invalid_token' }, { status: 401 });
  }

  return NextResponse.json({
    sub: payload.uid,
    email: payload.email,
    name: payload.name,
    tenant_id: payload.tenantId,
    scope: payload.scope,
  });
}
