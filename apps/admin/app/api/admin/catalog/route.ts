import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdminContext } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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

    const where = categorySlug ? { category: { slug: categorySlug } } : {};

    const [items, total, categories] = await Promise.all([
      prisma.catalogItem.findMany({
        where,
        include: {
          prices: {
            where: { isActive: true },
            select: { id: true, unitAmount: true, currency: true, billingCadence: true },
          },
          category: { select: { slug: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
      }),
      prisma.catalogItem.count({ where }),
      prisma.serviceCategory.findMany({
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
        categorySlug: item.category?.slug ?? null,
        featured: item.isFeatured,
        active: item.isPublished,
        prices: item.prices.map((p) => ({
          id: p.id,
          amount: p.unitAmount.toString(),
          currency: p.currency,
          billingCycle: p.billingCadence,
        })),
        createdAt: item.createdAt.toISOString(),
      })),
      categories: categories.map((c) => ({ slug: c.slug, name: c.name })),
      pagination: { limit, offset, total, hasMore: offset + limit < total },
    });
  } catch (error: unknown) {
    console.error('[admin/catalog] GET error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdminContext(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await request.json()) as Record<string, unknown>;
    const { id, name, slug, categorySlug, description, featured, active } = body as {
      id?: string;
      name?: string;
      slug?: string;
      categorySlug?: string;
      description?: string;
      featured?: boolean;
      active?: boolean;
    };

    if (!name || !slug || !categorySlug) {
      return NextResponse.json(
        { error: 'Missing required fields: name, slug, categorySlug' },
        { status: 400 }
      );
    }

    const category = await prisma.serviceCategory.findUnique({ where: { slug: categorySlug } });
    if (!category) {
      return NextResponse.json({ error: `Category not found: ${categorySlug}` }, { status: 404 });
    }

    const item = await prisma.catalogItem.upsert({
      where: { id: id || '' },
      update: {
        name,
        slug,
        categoryId: category.id,
        description: description || undefined,
        isFeatured: featured !== undefined ? featured : false,
        isPublished: active !== undefined ? active : true,
      },
      create: {
        id: id,
        name,
        slug,
        categoryId: category.id,
        itemType: 'service',
        description: description || undefined,
        isFeatured: featured !== undefined ? featured : false,
        isPublished: active !== undefined ? active : true,
      },
    });

    return NextResponse.json({
      ok: true,
      message: `CatalogItem ${id ? 'updated' : 'created'}: ${name}`,
      item: {
        id: item.id,
        name: item.name,
        slug: item.slug,
        categoryId: item.categoryId,
      },
    });
  } catch (error: unknown) {
    console.error('[admin/catalog] POST error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
