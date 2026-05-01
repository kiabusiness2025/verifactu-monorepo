import { NextResponse } from 'next/server';
import { ConfirmationRequiredError, isIsaakPlatformError } from './errors';

type Meta = {
  requestId: string;
  tenantId?: string;
  environment?: string;
  timestamp: string;
};

function buildMeta(requestId: string, tenantId?: string): Meta {
  return {
    requestId,
    tenantId,
    environment: process.env.NODE_ENV === 'production' ? 'live' : 'test',
    timestamp: new Date().toISOString(),
  };
}

export function okResponse<T>(
  data: T,
  opts: { requestId: string; tenantId?: string; status?: number } = { requestId: 'unknown' }
): NextResponse {
  return NextResponse.json(
    { ok: true, data, meta: buildMeta(opts.requestId, opts.tenantId) },
    { status: opts.status ?? 200 }
  );
}

export function okListResponse<T>(
  data: T[],
  pagination: { page: number; limit: number; total: number },
  opts: { requestId: string; tenantId?: string }
): NextResponse {
  return NextResponse.json({
    ok: true,
    data,
    pagination: { ...pagination, hasMore: pagination.page * pagination.limit < pagination.total },
    meta: buildMeta(opts.requestId, opts.tenantId),
  });
}

export function errorResponse(
  code: string,
  message: string,
  opts: {
    requestId: string;
    status?: number;
    stage?: string;
    reason?: string;
    extra?: Record<string, unknown>;
  }
): NextResponse {
  return NextResponse.json(
    {
      ok: false,
      error: { code, message, stage: opts.stage, reason: opts.reason, ...opts.extra },
      meta: { requestId: opts.requestId, timestamp: new Date().toISOString() },
    },
    { status: opts.status ?? 400 }
  );
}

export function confirmationRequiredResponse(
  err: ConfirmationRequiredError,
  opts: { requestId: string; tenantId?: string }
): NextResponse {
  return NextResponse.json(
    {
      ok: false,
      error: {
        code: err.code,
        message: err.message,
        stage: 'pre_execution',
        confirmationToken: err.confirmationToken,
        expiresAt: err.expiresAt.toISOString(),
        preview: err.preview,
      },
      meta: buildMeta(opts.requestId, opts.tenantId),
    },
    { status: 202 }
  );
}

export function handlePlatformError(
  err: unknown,
  requestId: string,
  tenantId?: string
): NextResponse {
  if (err instanceof ConfirmationRequiredError) {
    return confirmationRequiredResponse(err, { requestId, tenantId });
  }
  if (isIsaakPlatformError(err)) {
    return errorResponse(err.code, err.message, { requestId, status: err.status });
  }
  console.error('[isaak-platform] unexpected error', err);
  return errorResponse('internal_error', 'Error interno del servidor.', {
    requestId,
    status: 500,
    stage: 'execution',
  });
}
