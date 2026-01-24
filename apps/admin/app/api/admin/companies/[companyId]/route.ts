import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth-options';

export async function GET(request: Request, { params }: { params: { companyId: string } }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const user = session.user as any;
    if (user.role !== 'ADMIN' && user.role !== 'SUPPORT') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { companyId } = params;

    // TODO: Replace with actual database query
    console.log('[API] Fetching company:', companyId);

    // Mock data
    const companyData = {
      id: companyId,
      name: 'Empresa Demo',
      cif: 'B12345678',
      status: 'active',
      createdAt: new Date().toISOString(),
      owner: {
        id: '1',
        email: 'demo@example.com',
        name: 'Demo User',
      },
      stats: {
        invoicesCount: 0,
        documentsCount: 0,
        lastActivity: null,
      },
    };

    return NextResponse.json(companyData);
  } catch (error) {
    console.error('Error fetching company:', error);
    return NextResponse.json({ error: 'Error al obtener empresa' }, { status: 500 });
  }
}
