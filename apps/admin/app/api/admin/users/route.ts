import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';
import { authOptions } from '../../auth/[...nextauth]/route';

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
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    // TODO: Replace with actual database query
    console.log('[API] Fetching users with filters:', { search, role, page, limit });

    // Mock data for now
    const users = [
      {
        id: '1',
        email: 'support@verifactu.business',
        name: 'Support Team',
        role: 'SUPPORT',
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
        companiesCount: 5,
      },
    ];

    return NextResponse.json({
      users,
      pagination: {
        page,
        limit,
        total: users.length,
        pages: 1,
      },
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: 'Error al obtener usuarios' }, { status: 500 });
  }
}
