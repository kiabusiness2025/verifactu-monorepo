import { applyOpenAiCorsHeaders } from '@/lib/oauth/mcp';
import { rateLimit } from '@/lib/rateLimit';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

// RFC 7009 token revocation endpoint.
// Tokens are stateless JWTs — true revocation would require a denylist.
// Per RFC 7009 §2.2, the server MUST respond 200 even for unknown tokens.
const REVOKE_RATE_LIMIT = { limit: 20, windowMs: 60_000, keyPrefix: 'oauth-revoke' } as const;

function okResponse(request: NextRequest) {
  return applyOpenAiCorsHeaders(new NextResponse(null, { status: 200 }), request, {
    methods: ['POST', 'OPTIONS'],
    allowHeaders: ['content-type', 'authorization'],
  });
}

export async function POST(request: NextRequest) {
  const limit = rateLimit(request, REVOKE_RATE_LIMIT);
  if (!limit.ok) {
    return NextResponse.json(
      { error: 'rate_limited', error_description: 'Too many revocation requests. Retry shortly.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(limit.retryAfter),
          'X-RateLimit-Limit': String(REVOKE_RATE_LIMIT.limit),
          'X-RateLimit-Remaining': '0',
        },
      }
    );
  }

  const contentType = request.headers.get('content-type') || '';
  const raw = await request.text();
  let token: string | undefined;
  try {
    if (contentType.includes('application/x-www-form-urlencoded')) {
      token = new URLSearchParams(raw).get('token') ?? undefined;
    } else {
      const parsed = JSON.parse(raw || '{}');
      token = typeof parsed.token === 'string' ? parsed.token : undefined;
    }
  } catch {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
  }

  if (!token) {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
  }

  // Per RFC 7009 §2.2: respond 200 for valid requests regardless of whether
  // the token is still active (stateless JWTs cannot be truly invalidated
  // without a denylist, which is not implemented here).
  return okResponse(request);
}

export async function OPTIONS(request: NextRequest) {
  return applyOpenAiCorsHeaders(
    new NextResponse(null, {
      status: 204,
      headers: { Allow: 'POST, OPTIONS' },
    }),
    request,
    {
      methods: ['POST', 'OPTIONS'],
      allowHeaders: ['content-type', 'authorization'],
    }
  );
}
