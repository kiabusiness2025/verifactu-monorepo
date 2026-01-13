import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/lib/firebase';

/**
 * API Route para sincronizar usuarios de Firebase Auth con PostgreSQL (Prisma)
 * 
 * Se llama después de que un usuario se registra o inicia sesión por primera vez.
 * Crea o actualiza el usuario en la base de datos PostgreSQL.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { uid, email, displayName, photoURL, emailVerified, provider } = body;

    if (!uid || !email) {
      return NextResponse.json(
        { error: 'Missing required fields: uid and email' },
        { status: 400 }
      );
    }

    // Buscar si el usuario ya existe en PostgreSQL
    let user = await prisma.user.findUnique({
      where: { id: uid },
    });

    if (user) {
      // Actualizar usuario existente
      user = await prisma.user.update({
        where: { id: uid },
        data: {
          name: displayName || user.name,
          email: email,
        },
      });

      return NextResponse.json({
        ok: true,
        user,
        created: false,
      });
    } else {
      // Crear nuevo usuario
      user = await prisma.user.create({
        data: {
          id: uid,
          email: email,
          name: displayName || null,
        },
      });

      // Crear tenant personal automáticamente para nuevos usuarios
      const tenant = await prisma.tenant.create({
        data: {
          name: `${displayName || email.split('@')[0]}'s Business`,
          legalName: null,
          nif: null,
        },
      });

      // Crear membership (owner)
      await prisma.membership.create({
        data: {
          tenantId: tenant.id,
          userId: uid,
          role: 'owner',
          status: 'active',
        },
      });

      // Crear preferencias de usuario
      await prisma.userPreference.create({
        data: {
          userId: uid,
          preferredTenantId: tenant.id,
        },
      });

      // Crear suscripción trial gratuita (14 días)
      const freePlan = await prisma.plan.findFirst({
        where: { code: 'free' },
      });

      if (freePlan) {
        await prisma.subscription.create({
          data: {
            tenantId: tenant.id,
            planId: freePlan.id,
            status: 'trialing',
            trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 días
            currentPeriodStart: new Date(),
            currentPeriodEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
          },
        });
      }

      return NextResponse.json({
        ok: true,
        user,
        tenant,
        created: true,
        message: 'User and tenant created successfully with 14-day trial',
      });
    }
  } catch (error: any) {
    console.error('Error syncing user with Prisma:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * GET: Obtener información del usuario desde PostgreSQL
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const uid = searchParams.get('uid');

    if (!uid) {
      return NextResponse.json(
        { error: 'Missing uid parameter' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: uid },
      include: {
        memberships: {
          include: {
            tenant: true,
          },
        },
        preferences: {
          include: {
            preferredTenant: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
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
