import { NextRequest, NextResponse } from 'next/server';
import prisma from '../../../../lib/prisma';
import { getPreferredFullName, normalizePersonNamePart, splitFullName } from '@/lib/personName';
import { upsertUser } from '@/lib/tenants';

/**
 * API Route para sincronizar usuarios de Firebase Auth con PostgreSQL (Prisma)
 *
 * Se llama despues de que un usuario se registra o inicia sesion por primera vez.
 * Crea o actualiza el usuario en la base de datos PostgreSQL.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { uid, email, displayName, firstName, lastName, photoURL, emailVerified, provider } =
      body;

    const normalizedFirstName = normalizePersonNamePart(firstName);
    const normalizedLastName = normalizePersonNamePart(lastName);
    const normalizedDisplayName = getPreferredFullName({
      firstName: normalizedFirstName,
      lastName: normalizedLastName,
      fullName: displayName,
      email,
    });
    const nameParts = splitFullName(normalizedDisplayName);

    if (!uid || !email) {
      return NextResponse.json(
        { error: 'Missing required fields: uid and email' },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ authSubject: uid }, { id: uid }, { email }],
      },
      select: { id: true },
    });

    const userId = await upsertUser({
      id: uid,
      email,
      name: normalizedDisplayName,
      firstName: nameParts.firstName,
      lastName: nameParts.lastName,
    });

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    return NextResponse.json({
      ok: true,
      user,
      created: !existingUser,
      message: existingUser ? undefined : 'User created',
    });
  } catch (error: any) {
    console.error('Error syncing user with Prisma:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * GET: Obtener informacion del usuario desde PostgreSQL
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const uid = searchParams.get('uid');

    if (!uid) {
      return NextResponse.json({ error: 'Missing uid parameter' }, { status: 400 });
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: [{ authSubject: uid }, { id: uid }],
      },
      include: {
        tenantMemberships: {
          include: {
            tenant: true,
          },
        },
        tenantPreferences: {
          include: {
            preferredTenant: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      user,
    });
  } catch (error: any) {
    console.error('Error fetching user from Prisma:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
