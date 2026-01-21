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
    const role = searchParams.get('role') || '';

    // Build where clause
    const where: any = {};
    
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (role) {
      where.role = role;
    }

    // Fetch users with related data
    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        _count: {
          select: {
            companiesOwned: true,
          },
        },
        subscriptions: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          select: { status: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Transform to API contract
    const items = users.map((user) => ({
      id: user.id,
      email: user.email,
      name: user.name || undefined,
      role: user.role,
      createdAt: user.createdAt.toISOString(),
      companiesCount: user._count.companiesOwned,
      subscriptionStatus: user.subscriptions[0]?.status || 'NONE',
    }));

    return NextResponse.json({ items });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: 'Error al obtener usuarios' }, { status: 500 });
  }
}
