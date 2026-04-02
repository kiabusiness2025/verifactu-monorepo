import { applyOpenAiCorsHeaders, getProtectedResourceMetadata } from '@/lib/oauth/mcp';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const response = NextResponse.json(getProtectedResourceMetadata());
  response.headers.set('Cache-Control', 'no-store');

  return applyOpenAiCorsHeaders(response, request, {
    methods: ['GET', 'OPTIONS'],
    allowHeaders: ['content-type'],
  });
}

export async function OPTIONS(request: NextRequest) {
  return applyOpenAiCorsHeaders(
    new NextResponse(null, {
      status: 204,
      headers: {
        Allow: 'GET, OPTIONS',
      },
    }),
    request,
    {
      methods: ['GET', 'OPTIONS'],
      allowHeaders: ['content-type'],
    }
  );
}
