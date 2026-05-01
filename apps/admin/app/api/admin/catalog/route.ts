import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdminContext } from '@/lib/auth';
import { Decimal } from '@prisma/client/runtime/library';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/catalog
 * List CatalogItems with optional category filter
 */
export async function GET(request: NextRequest) {
  try {
    const admin = await requireAdminContext(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const categorySlug = searchParams.get('category') || undefined;
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');

    const where = categorySlug ? { categorySlug } : {};

    const [items, total, categories] = await Promise.all([
      prisma.catalogItem.findMany({
        where,
        include: {
          prices: {
            where: { active: true },
            select: { id: true, amount: true, currency: true, billingCycle: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
      }),
      prisma.catalogItem.count({ where }),
      prisma.catalogCategory.findMany({
        select: { slug: true, name: true },
        orderBy: { name: 'asc' },
      }),
    ]);

    return NextResponse.json({
      ok: true,
      items: items.map((item) => ({
        id: item.id,
        name: item.name,
        slug: item.slug,
        categorySlug: item.categorySlug,
        featured: item.featured,
        active: item.active,
        prices: item.prices.map((p) => ({
          id: p.id,
          amount: p.amount.toString(),
          currency: p.currency,
          billingCycle: p.billingCycle,
        })),
        createdAt: item.createdAt.toISOString(),
      })),
      categories: categories.map((c) => ({ slug: c.slug, name: c.name })),
      pagination: { limit, offset, total, hasMore: offset + limit < total },
    });
  } catch (error: any) {
    console.error('[admin/catalog] GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/catalog/items
 * Create or update CatalogItem
 */
export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdminContext(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, name, slug, categorySlug, description, icon, featured, active } = body;

    if (!name || !slug || !categorySlug) {
      return NextResponse.json(
        { error: 'Missing required fields: name, slug, categorySlug' },
        { status: 400 }
      );
    }

    // Check category exists
    const category = await prisma.catalogCategory.findUnique({
      where: { slug: categorySlug },
    });
    if (!category) {
      return NextResponse.json({ error: `Category not found: ${categorySlug}` }, { status: 404 });
    }

    const item = await prisma.catalogItem.upsert({
      where: { id: id || '' },
      update: {
        name,
        slug,
        categorySlug,
        description: description || undefined,
        icon: icon || undefined,
        featured: featured !== undefined ? featured : false,
        active: active !== undefined ? active : true,
      },
      create: {
        id: id,
        name,
        slug,
        categorySlug,
        description: description || undefined,
        icon: icon || undefined,
        featured: featured !== undefined ? featured : false,
        active: active !== undefined ? active : true,
      },
    });

    return NextResponse.json({
      ok: true,
      message: `CatalogItem ${id ? 'updated' : 'created'}: ${name}`,
      item: {
        id: item.id,
        name: item.name,
        slug: item.slug,
        categorySlug: item.categorySlug,
      },
    });
  } catch (error: any) {
    console.error('[admin/catalog] POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
