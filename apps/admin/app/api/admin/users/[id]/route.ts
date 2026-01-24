import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth-options';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const user = session.user as any;
    if (user.role !== 'ADMIN' && user.role !== 'SUPPORT') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { id } = params;

    // TODO: Replace with actual database query
    console.log('[API] Fetching user:', id);

    // Mock data
    const userData = {
      id: id,
      email: 'support@verifactu.business',
      name: 'Support Team',
      role: 'SUPPORT',
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
      companies: [],
    };

    return NextResponse.json(userData);
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json({ error: 'Error al obtener usuario' }, { status: 500 });
  }
}
