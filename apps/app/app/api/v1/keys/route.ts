/**
 * GET  /api/v1/keys  — Lista las API keys del tenant autenticado
 * POST /api/v1/keys  — Crea una nueva API key (la key completa se devuelve UNA SOLA VEZ)
 *
 * Requiere autenticación por cookie (dashboard).
 * Las API keys no pueden crear otras API keys (source !== 'api_key').
 */
import { requireScope } from '@/lib/isaak-platform/api/middleware/requireScope';
import { errorResponse, okResponse } from '@/lib/isaak-platform/api/response';
import { logAuditEvent } from '@/lib/isaak-platform/audit/auditLogger';
import { generateApiKey } from '@/lib/isaak-platform/auth/apiKeyAuth';
import { PLATFORM_API_SCOPES } from '@/lib/isaak-platform/permissions/scopes';
import prisma from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { buildV1Context } from '../_context';

const MAX_KEYS_PER_TENANT = 20;

export async function GET(request: NextRequest) {
  const auth = await buildV1Context(request);
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const { ctx, requestId } = auth;

  // Solo cuentas de dashboard pueden gestionar keys
  if (ctx.source === 'api_key') {
    return errorResponse('forbidden', 'Las API keys no pueden gestionar otras API keys.', {
      requestId,
      status: 403,
    });
  }

  requireScope(ctx, 'isaak.audit.read');

  const keys = await prisma.isaakPlatformKey.findMany({
    where: { tenantId: ctx.tenantId, revokedAt: null },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      keyPrefix: true,
      scopes: true,
      rateLimit: true,
      lastUsedAt: true,
      expiresAt: true,
      createdAt: true,
    },
  });

  await logAuditEvent({
    ctx,
    method: 'GET',
    endpoint: '/api/v1/keys',
    status: 200,
    riskLevel: 'low',
  });

  return okResponse({ keys, total: keys.length }, { requestId });
}

export async function POST(request: NextRequest) {
  const auth = await buildV1Context(request);
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const { ctx, requestId } = auth;

  if (ctx.source === 'api_key') {
    return errorResponse('forbidden', 'Las API keys no pueden crear otras API keys.', {
      requestId,
      status: 403,
    });
  }

  let body: {
    name?: string;
    scopes?: string[];
    rateLimit?: number;
    expiresAt?: string;
    env?: 'live' | 'test';
  };
  try {
    body = await request.json();
  } catch {
    return errorResponse('invalid_request', 'Cuerpo JSON inválido.', { requestId, status: 400 });
  }

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!name || name.length < 2 || name.length > 64) {
    return errorResponse('validation_error', 'El campo name es obligatorio (2-64 caracteres).', {
      requestId,
      status: 400,
    });
  }

  const env = body.env === 'test' ? 'test' : 'live';

  // Validar scopes solicitados
  const validScopes = new Set<string>(PLATFORM_API_SCOPES);
  const requestedScopes: string[] = Array.isArray(body.scopes)
    ? body.scopes.filter((s): s is string => typeof s === 'string' && validScopes.has(s))
    : ['company.read', 'invoices.read'];

  if (requestedScopes.length === 0) {
    return errorResponse('validation_error', 'Debes indicar al menos un scope válido.', {
      requestId,
      status: 400,
    });
  }

  // Límite de keys por tenant
  const existingCount = await prisma.isaakPlatformKey.count({
    where: { tenantId: ctx.tenantId, revokedAt: null },
  });
  if (existingCount >= MAX_KEYS_PER_TENANT) {
    return errorResponse(
      'limit_exceeded',
      `No puedes tener más de ${MAX_KEYS_PER_TENANT} API keys activas. Revoca alguna antes de crear una nueva.`,
      { requestId, status: 422 }
    );
  }

  // Nombre único por tenant
  const duplicate = await prisma.isaakPlatformKey.findFirst({
    where: { tenantId: ctx.tenantId, name, revokedAt: null },
  });
  if (duplicate) {
    return errorResponse('conflict', `Ya existe una API key con el nombre "${name}".`, {
      requestId,
      status: 409,
    });
  }

  const rateLimit =
    typeof body.rateLimit === 'number' && body.rateLimit > 0 && body.rateLimit <= 10000
      ? body.rateLimit
      : 1000;

  const expiresAt =
    typeof body.expiresAt === 'string' && body.expiresAt ? new Date(body.expiresAt) : null;

  if (expiresAt !== null && isNaN(expiresAt.getTime())) {
    return errorResponse('validation_error', 'Fecha expiresAt inválida. Usa ISO 8601.', {
      requestId,
      status: 400,
    });
  }

  // Generar key
  const { raw, hash, prefix } = generateApiKey(env);

  const key = await prisma.isaakPlatformKey.create({
    data: {
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      name,
      keyHash: hash,
      keyPrefix: prefix,
      scopes: requestedScopes,
      rateLimit,
      expiresAt,
    },
    select: {
      id: true,
      name: true,
      keyPrefix: true,
      scopes: true,
      rateLimit: true,
      expiresAt: true,
      createdAt: true,
    },
  });

  await logAuditEvent({
    ctx,
    method: 'POST',
    endpoint: '/api/v1/keys',
    status: 201,
    riskLevel: 'medium',
    toolOrAction: 'create_api_key',
  });

  return NextResponse.json(
    {
      ok: true,
      requestId,
      data: {
        ...key,
        // La key completa se devuelve UNA SOLA VEZ — no se puede recuperar después
        key: raw,
        warning:
          'Guarda esta API key ahora. No podrás verla de nuevo. Solo el prefijo quedará visible.',
      },
    },
    { status: 201 }
  );
}
