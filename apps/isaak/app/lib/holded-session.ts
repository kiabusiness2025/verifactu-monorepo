import { cookies } from 'next/headers';
import {
  getSharedSessionPayloadFromCookieStore,
  resolveSharedTenantSession,
} from '@verifactu/auth';
import { prisma } from './prisma';

// If the user has switched to a different workspace via UserPreference,
// use that tenantId — but only if they still have an active membership there.
async function resolveEffectiveTenantId(userId: string, cookieTenantId: string): Promise<string> {
  const pref = await prisma.userPreference.findUnique({
    where: { userId },
    select: { preferredTenantId: true },
  });

  const preferred = pref?.preferredTenantId;
  if (!preferred || preferred === cookieTenantId) {
    return cookieTenantId;
  }

  const membership = await prisma.membership.findUnique({
    where: { tenantId_userId: { tenantId: preferred, userId } },
    select: { status: true },
  });

  return membership?.status === 'active' ? preferred : cookieTenantId;
}

export async function getHoldedSession() {
  const cookieStore = await cookies();
  const session = await resolveSharedTenantSession({
    cookieStore,
    findUserByAuthSubject: (authSubject) =>
      prisma.user.findFirst({
        where: { authSubject },
        select: { id: true, email: true, name: true, isBlocked: true },
      }),
  });

  if (session?.userId) {
    const effectiveTenantId = await resolveEffectiveTenantId(session.userId, session.tenantId);
    return { ...session, tenantId: effectiveTenantId };
  }

  const payload = await getSharedSessionPayloadFromCookieStore(cookieStore);
  if (!payload?.uid || typeof payload.email !== 'string' || !payload.email) {
    return session;
  }

  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [{ authSubject: payload.uid }, { email: payload.email }],
    },
    select: { id: true, email: true, name: true, isBlocked: true },
  });

  if (existingUser?.isBlocked) {
    return null;
  }

  const normalizedName =
    (typeof payload.name === 'string' && payload.name.trim()) ||
    existingUser?.name ||
    payload.email.split('@')[0] ||
    null;

  const user = existingUser
    ? await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          email: payload.email,
          name: normalizedName,
          authProvider: 'FIREBASE',
          authSubject: payload.uid,
        },
        select: { id: true, email: true, name: true, isBlocked: true },
      })
    : await prisma.user.create({
        data: {
          email: payload.email,
          name: normalizedName,
          authProvider: 'FIREBASE',
          authSubject: payload.uid,
        },
        select: { id: true, email: true, name: true, isBlocked: true },
      });

  // Usuario sin tenantId en el JWT (nuevo usuario, plan Free sin Holded).
  // Devolvemos sesión parcial para que el workspace lo muestre en modo free.
  if (!payload?.tenantId) {
    return {
      payload,
      tenantId: null as unknown as string,
      userId: user.id,
      email: user.email,
      name: user.name,
    };
  }

  // SEC C1 (2026): NUNCA crear membership como side-effect de leer la
  // cookie. Anteriormente este path hacía `upsert` con role='owner' si
  // no había membership, lo que permitía a un atacante con un JWT
  // firmado para un tenantId ajeno volverse owner. Las memberships se
  // crean SOLO en flujos explícitos:
  //   * signup en apps/landing (crea tenant + owner)
  //   * /api/team/members + /api/team/accept (invitaciones)
  // Aquí solo reactivamos memberships ya existentes (caso: invitación
  // ya aceptada + el usuario volvió a logarse vía cross-domain handoff).
  const existingMembership = await prisma.membership.findUnique({
    where: {
      tenantId_userId: {
        tenantId: payload.tenantId,
        userId: user.id,
      },
    },
    select: { id: true, status: true },
  });

  if (!existingMembership) {
    // No hay membership en este tenant. NO se crea automáticamente.
    // El payload puede traer un tenantId fantasma. Devolvemos session
    // sin tenantId efectivo para que la UI fuerce signup/invitación.
    return null;
  }

  try {
    if (existingMembership.status !== 'active') {
      await prisma.membership.update({
        where: { id: existingMembership.id },
        data: { status: 'active' },
      });
    }
    await prisma.userPreference.upsert({
      where: { userId: user.id },
      update: { preferredTenantId: payload.tenantId },
      create: {
        userId: user.id,
        preferredTenantId: payload.tenantId,
      },
    });
  } catch {
    // best effort: la sesión sigue siendo válida aunque falle el upsert
    // de userPreference (la cookie ya autoriza al tenant).
  }

  return {
    payload,
    tenantId: payload.tenantId,
    userId: user.id,
    email: user.email,
    name: user.name,
  };
}
