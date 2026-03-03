import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionPayload } from '@/lib/session';
import { resolveActiveTenant } from '@/src/server/tenant/resolveActiveTenant';
import { Prisma } from '@verifactu/db';
import { z } from 'zod';

const createArticleSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  unitPrice: z.union([z.number(), z.string()]).optional(),
  taxRate: z.union([z.number(), z.string()]).optional(),
  accountCode: z.string().optional().nullable(),
  unit: z.string().optional().nullable(),
  stock: z.union([z.number().int(), z.string()]).optional().nullable(),
  notes: z.string().optional().nullable(),
});

/**
 * GET /api/articles
 * List all articles for the authenticated tenant
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSessionPayload();
    if (!session || !session.uid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const resolved = await resolveActiveTenant({
      userId: session.uid,
      sessionTenantId: session.tenantId ?? null,
    });
    const tenantId = resolved.tenantId;
    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant selected' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || '';

    const skip = (page - 1) * limit;

    const where: Prisma.ArticleWhereInput = { tenantId, isActive: true };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (category) {
      where.category = { contains: category, mode: 'insensitive' };
    }

    const [articles, total] = await Promise.all([
      prisma.article.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.article.count({ where }),
    ]);

    return NextResponse.json({
      articles,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('GET /api/articles:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/articles
 * Create a new article
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSessionPayload();
    if (!session || !session.uid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const resolved = await resolveActiveTenant({
      userId: session.uid,
      sessionTenantId: session.tenantId ?? null,
    });
    const tenantId = resolved.tenantId;
    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant selected' }, { status: 400 });
    }

    const payload: unknown = await request.json();
    const { code, name, description, category, unitPrice, taxRate, accountCode, unit, stock, notes } =
      createArticleSchema.parse(payload);

    if (!code || !name) {
      return NextResponse.json({ error: 'Code and name are required' }, { status: 400 });
    }

    // Check for duplicate code
    const existing = await prisma.article.findFirst({
      where: { tenantId, code },
    });

    if (existing) {
      return NextResponse.json({ error: 'Article code already exists' }, { status: 409 });
    }

    const article = await prisma.article.create({
      data: {
        tenantId,
        code,
        name,
        description: description || null,
        category: category || null,
        unitPrice: Number.parseFloat(String(unitPrice ?? '0')) || 0,
        taxRate: Number.parseFloat(String(taxRate ?? '0.21')) || 0.21,
        accountCode: accountCode || null,
        unit: unit || 'ud',
        stock: stock !== undefined && stock !== null ? Number.parseInt(String(stock), 10) : null,
        notes: notes || null,
      },
    });

    return NextResponse.json(article, { status: 201 });
  } catch (error) {
    console.error('POST /api/articles:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
