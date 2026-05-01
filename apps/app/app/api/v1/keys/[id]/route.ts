/**
 * GET    /api/v1/keys/[id]  — Detalle de una API key
 * DELETE /api/v1/keys/[id]  — Revocar API key (inmediato, sin gracia)
 *
 * La revocación es irreversible. La key queda inutilizable al instante.
 */
import { NextRequest, NextResponse } from 'next/server';
import { buildV1Context } from '../../_context';
import { logAuditEvent } from '@/lib/isaak-platform/audit/auditLogger';
import { okResponse, errorResponse } from '@/lib/isaak-platform/api/response';
import prisma from '@/lib/prisma';

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const { id } = await params;

  const auth = await buildV1Context(request);
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const { ctx, requestId } = auth;

  if (ctx.source === 'api_key') {
    return errorResponse('forbidden', 'Las API keys no pueden listar otras API keys.', {
      requestId,
      status: 403,
    });
  }

  const key = await prisma.isaakPlatformKey.findFirst({
    where: { id, tenantId: ctx.tenantId },
    select: {
      id: true,
      name: true,
      keyPrefix: true,
      scopes: true,
      rateLimit: true,
      lastUsedAt: true,
      expiresAt: true,
      revokedAt: true,
      createdAt: true,
    },
  });

  if (!key) {
    return errorResponse('not_found', 'API key no encontrada.', { requestId, status: 404 });
  }

  await logAuditEvent({
    ctx,
    method: 'GET',
    endpoint: `/api/v1/keys/${id}`,
    status: 200,
    riskLevel: 'low',
  });

  return okResponse(key, { requestId });
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const { id } = await params;

  const auth = await buildV1Context(request);
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const { ctx, requestId } = auth;

  if (ctx.source === 'api_key') {
    return errorResponse('forbidden', 'Las API keys no pueden revocar otras API keys.', {
      requestId,
      status: 403,
    });
  }

  const key = await prisma.isaakPlatformKey.findFirst({
    where: { id, tenantId: ctx.tenantId },
    select: { id: true, name: true, revokedAt: true },
  });

  if (!key) {
    return errorResponse('not_found', 'API key no encontrada.', { requestId, status: 404 });
  }

  if (key.revokedAt !== null) {
    return errorResponse('conflict', 'Esta API key ya estaba revocada.', {
      requestId,
      status: 409,
    });
  }

  await prisma.isaakPlatformKey.update({
    where: { id },
    data: { revokedAt: new Date() },
  });

  await logAuditEvent({
    ctx,
    method: 'DELETE',
    endpoint: `/api/v1/keys/${id}`,
    status: 200,
    riskLevel: 'medium',
    toolOrAction: 'revoke_api_key',
  });

  return okResponse(
    {
      revoked: true,
      id: key.id,
      name: key.name,
      message: 'API key revocada correctamente. El acceso queda bloqueado inmediatamente.',
    },
    { requestId }
  );
}
