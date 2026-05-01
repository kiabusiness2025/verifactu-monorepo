import { NextResponse } from 'next/server';
import { prisma } from '@verifactu/db';

/**
 * GET /api/catalog
 *
 * Returns published catalog items with their active prices.
 * Optional query params:
 *   - category: filter by ServiceCategory slug
 *   - featured: 'true' to return only featured items
 *   - type: filter by CatalogItemType (subscription | one_time_service | addon | bundle)
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const categorySlug = url.searchParams.get('category')?.trim() || null;
    const featuredOnly = url.searchParams.get('featured') === 'true';
    const itemType = url.searchParams.get('type')?.trim() || null;

    const items = await prisma.catalogItem.findMany({
      where: {
        isPublished: true,
        ...(featuredOnly ? { isFeatured: true } : {}),
        ...(itemType ? { itemType: itemType as never } : {}),
        ...(categorySlug
          ? {
              category: {
                slug: categorySlug,
              },
            }
          : {}),
      },
      select: {
        id: true,
        slug: true,
        itemType: true,
        name: true,
        summary: true,
        isFeatured: true,
        sortOrder: true,
        category: {
          select: {
            id: true,
            slug: true,
            name: true,
          },
        },
        prices: {
          where: { isActive: true },
          select: {
            id: true,
            code: true,
            name: true,
            currency: true,
            unitAmount: true,
            billingCadence: true,
            intervalCount: true,
            trialDays: true,
            isDefault: true,
          },
          orderBy: [{ isDefault: 'desc' }, { unitAmount: 'asc' }],
        },
      },
      orderBy: [{ isFeatured: 'desc' }, { sortOrder: 'asc' }, { name: 'asc' }],
    });

    // Serialize Decimal fields to strings for JSON
    const serialized = items.map((item) => ({
      ...item,
      prices: item.prices.map((p) => ({
        ...p,
        unitAmount: p.unitAmount.toString(),
      })),
    }));

    return NextResponse.json({ items: serialized });
  } catch (err) {
    console.error('[api/catalog] error:', err);
    return NextResponse.json({ error: 'Error loading catalog' }, { status: 500 });
  }
}
