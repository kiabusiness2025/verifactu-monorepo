import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '../config/authOptions';
import { UserRole, type SessionUser } from '../types';

export async function requireAuth() {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user) {
    return NextResponse.json(
      { error: 'No autenticado' },
      { status: 401 }
    );
  }
  
  return session;
}

export async function requireRole(allowedRoles: UserRole[]) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user) {
    return NextResponse.json(
      { error: 'No autenticado' },
      { status: 401 }
    );
  }
  
  const user = session.user as SessionUser;
  
  if (!allowedRoles.includes(user.role)) {
    return NextResponse.json(
      { error: 'No autorizado' },
      { status: 403 }
    );
  }
  
  return session;
}
