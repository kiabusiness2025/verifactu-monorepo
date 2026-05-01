/**
 * GET /api/v1/audit/events
 *
 * Devuelve el log de auditoría de la empresa activa.
 * Scope: isaak.audit.read
 *
 * Query params:
 *   - page    (default: 1)
 *   - limit   (default: 20, max: 100)
 *   - from    ISO date
 *   - to      ISO date
 *   - channel dashboard | chatgpt | api | mcp | ...
 *   - action  tool/action filter
 */
import { NextRequest, NextResponse } from 'next/server';
import { buildV1Context } from '../../_context';
import { requireScope } from '@/lib/isaak-platform/api/middleware/requireScope';
import { okListResponse, handlePlatformError } from '@/lib/isaak-platform/api/response';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const authResult = await buildV1Context(req);
  if ('error' in authResult) {
    return NextResponse.json(
      { ok: false, error: { code: 'unauthorized', message: authResult.error } },
      { status: authResult.status }
    );
  }
  const { ctx, requestId } = authResult;

  try {
    requireScope(ctx, 'isaak.audit.read');

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)));
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { tenantId: ctx.tenantId };
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    if (from || to) {
      where.createdAt = {
        ...(from ? { gte: new Date(from) } : {}),
        ...(to ? { lte: new Date(to) } : {}),
      };
    }
    if (searchParams.has('channel')) where.channel = searchParams.get('channel');
    if (searchParams.has('action')) {
      where.toolOrAction = { contains: searchParams.get('action'), mode: 'insensitive' };
    }

    const [events, total] = await Promise.all([
      prisma.isaakApiAuditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          requestId: true,
          channel: true,
          method: true,
          endpoint: true,
          toolOrAction: true,
          status: true,
          durationMs: true,
          riskLevel: true,
          confirmationRequired: true,
          createdAt: true,
        },
      }),
      prisma.isaakApiAuditLog.count({ where }),
    ]);

    return okListResponse(events, { page, limit, total }, { requestId, tenantId: ctx.tenantId });
  } catch (err) {
    return handlePlatformError(err, requestId, ctx.tenantId);
  }
}
