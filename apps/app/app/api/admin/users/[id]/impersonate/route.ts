/**
 * API: POST /api/admin/users/[id]/impersonate
 * 
 * Permite a un admin entrar como otro usuario (login as)
 * Crea una sesión temporal para ese usuario
 */

import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseAuth } from '@/lib/firebase-admin';
import { cookies } from 'next/headers';
import { signSessionToken, SESSION_COOKIE_NAME, readSessionSecret } from '@verifactu/utils';

function parseAllowlist(value?: string) {
  if (!value) return new Set<string>();
  return new Set(
    value
      .split(',')
      .map((entry) => entry.trim().toLowerCase())
      .filter(Boolean)
  );
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Inicializar Firebase Auth
    const auth = getFirebaseAuth();
    
    // Verificar que el usuario actual es admin
    const cookieStore = await cookies();
    const adminToken = cookieStore.get('__session')?.value;

    if (!adminToken) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }

    const adminDecoded = await auth.verifyIdToken(adminToken);
    const adminEmail = adminDecoded.email?.toLowerCase() || '';
    const adminEmails = parseAllowlist(process.env.ADMIN_EMAILS);

    if (!adminEmails.has(adminEmail)) {
      return NextResponse.json(
        { error: 'Solo administradores pueden usar esta función' },
        { status: 403 }
      );
    }

    // Obtener info del usuario target
    const targetUserId = params.id;
    const targetUser = await auth.getUser(targetUserId);

    if (!targetUser) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    // Crear token de sesión para el usuario target
    const sessionPayload = {
      uid: targetUser.uid,
      email: targetUser.email || '',
      name: targetUser.displayName || targetUser.email?.split('@')[0] || 'Usuario',
      tenantId: undefined, // Se establecerá después
      impersonatedBy: adminDecoded.uid // Guardar quién está impersonando
    };

    // Crear token de sesión para el usuario target
    const sessionToken = await signSessionToken({
      payload: sessionPayload,
      secret: readSessionSecret(),
      expiresIn: '8h'
    });

    // Establecer cookie de sesión
    const response = NextResponse.json({
      success: true,
      message: `Ahora entrando como ${targetUser.email}`,
      redirectTo: '/dashboard'
    });

    response.cookies.set(SESSION_COOKIE_NAME, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 8, // 8 horas
      path: '/'
    });

    return response;

  } catch (error: any) {
    console.error('Impersonation error:', error);
    return NextResponse.json(
      { error: 'Error al impersonar usuario', details: error.message },
      { status: 500 }
    );
  }
}
