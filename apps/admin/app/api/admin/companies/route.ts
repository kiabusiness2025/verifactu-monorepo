import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const user = session.user as any;
    if (user.role !== 'ADMIN' && user.role !== 'SUPPORT') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    // Get query params
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search') || '';

    // Build where clause
    const where: any = {};
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { taxId: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Fetch companies with owner info
    const companies = await prisma.company.findMany({
      where,
      select: {
        id: true,
        name: true,
        taxId: true,
        ownerUserId: true,
        createdAt: true,
        owner: {
          select: {
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Transform to API contract
    const items = companies.map((company) => ({
      id: company.id,
      name: company.name,
      taxId: company.taxId || undefined,
      ownerUserId: company.ownerUserId,
      ownerEmail: company.owner.email,
      createdAt: company.createdAt.toISOString(),
    }));

    return NextResponse.json({ items });
  } catch (error) {
    console.error('Error fetching companies:', error);
    return NextResponse.json({ error: 'Error al obtener empresas' }, { status: 500 });
  }
}
