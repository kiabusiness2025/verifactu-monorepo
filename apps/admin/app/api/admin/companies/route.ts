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
    const status = searchParams.get('status') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    // TODO: Replace with actual database query
    console.log('[API] Fetching companies with filters:', { search, status, page, limit });

    // Mock data for now
    const companies = [];

    return NextResponse.json({
      companies,
      pagination: {
        page,
        limit,
        total: companies.length,
        pages: 1,
      },
    });
  } catch (error) {
    console.error('Error fetching companies:', error);
    return NextResponse.json({ error: 'Error al obtener empresas' }, { status: 500 });
  }
}
