// V2.C.4 — Lectura de memoria persistente de Isaak por tenant.
//
// GET /api/admin/tenants/[id]/isaak-memory
//
// Devuelve:
//   - memoryFacts: últimos N IsaakMemoryFact (categoria + factKey + value)
//   - longTermMemory: últimos N IsaakLongTermMemory (fact + factType)
//   - totals: cuántos hay en total por tipo

import { requireAdmin } from '@/lib/adminAuth';
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const LIMIT = 30;

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(req);
    const { id: tenantId } = await params;

    const [facts, longTerm, factsTotal, longTermTotal] = await Promise.all([
      prisma.isaakMemoryFact.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        take: LIMIT,
        select: {
          id: true,
          category: true,
          factKey: true,
          valueJson: true,
          scope: true,
          source: true,
          confidence: true,
          createdAt: true,
        },
      }),
      prisma.isaakLongTermMemory.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        take: LIMIT,
        select: {
          id: true,
          fact: true,
          factType: true,
          source: true,
          createdAt: true,
        },
      }),
      prisma.isaakMemoryFact.count({ where: { tenantId } }),
      prisma.isaakLongTermMemory.count({ where: { tenantId } }),
    ]);

    return NextResponse.json({
      facts,
      longTerm,
      totals: { facts: factsTotal, longTerm: longTermTotal },
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('FORBIDDEN')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }
    console.error('[isaak-memory]', error);
    return NextResponse.json({ error: 'Error al obtener memoria' }, { status: 500 });
  }
}
