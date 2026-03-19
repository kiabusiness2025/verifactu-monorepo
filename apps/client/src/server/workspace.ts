import { prisma, type User } from '@verifactu/db';
import type { SessionPayload } from '@verifactu/utils';

export type WorkspaceUserProfile = {
  name: string | null;
  email: string | null;
  photoUrl: string | null;
};

export type WorkspaceTenant = {
  id: string;
  slug: string;
  name: string;
  legalName: string | null;
  nif: string | null;
  isDemo: boolean;
  logoUrl: string | null;
  role: string;
  createdAt: string;
};

export type WorkspaceState = {
  user: WorkspaceUserProfile;
  tenants: WorkspaceTenant[];
  activeTenantId: string | null;
};

function slugify(value: string) {
  return (
    value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 32) || 'empresa'
  );
}

function buildTenantSlug(params: { id: string; name: string; isDemo: boolean }) {
  if (params.isDemo) {
    return 'demo';
  }

  return `${slugify(params.name)}-${params.id.slice(0, 8)}`;
}

function normalizeRole(role: string | null | undefined) {
  return String(role ?? 'member').toUpperCase();
}

export async function upsertFirebaseUserIdentity(input: {
  uid: string;
  email: string;
  name?: string | null;
  photoUrl?: string | null;
}): Promise<User> {
  const { uid, email, name, photoUrl } = input;

  const byAuthSubject = await prisma.user.findFirst({
    where: { authSubject: uid },
  });

  if (byAuthSubject) {
    return prisma.user.update({
      where: { id: byAuthSubject.id },
      data: {
        email,
        name: name ?? byAuthSubject.name,
        image: photoUrl ?? byAuthSubject.image,
        authProvider: 'FIREBASE',
        authSubject: uid,
      },
    });
  }

  const byEmail = await prisma.user.findUnique({ where: { email } });
  if (byEmail) {
    return prisma.user.update({
      where: { id: byEmail.id },
      data: {
        email,
        name: name ?? byEmail.name,
        image: photoUrl ?? byEmail.image,
        authProvider: 'FIREBASE',
        authSubject: uid,
      },
    });
  }

  return prisma.user.create({
    data: {
      email,
      name: name ?? email.split('@')[0] ?? 'Usuario',
      image: photoUrl ?? null,
      authProvider: 'FIREBASE',
      authSubject: uid,
    },
  });
}

export async function resolveSessionUser(session: SessionPayload) {
  const uid = session.uid;
  const email = session.email;

  if (!uid || !email) {
    throw new Error('La sesión no contiene identidad suficiente');
  }

  return upsertFirebaseUserIdentity({
    uid,
    email,
    name: typeof session.name === 'string' ? session.name : null,
  });
}

async function fetchTenantLogo(tenantId: string) {
  try {
    const rows = await prisma.$queryRaw<Array<{ logo_url: string | null }>>`
      SELECT logo_url
      FROM tenants
      WHERE id = ${tenantId}::uuid
      LIMIT 1
    `;

    return rows[0]?.logo_url ?? null;
  } catch {
    return null;
  }
}

export async function getWorkspaceStateForUser(userId: string, sessionTenantId?: string | null) {
  const [memberships, preference] = await Promise.all([
    prisma.membership.findMany({
      where: { userId, status: 'active' },
      include: { tenant: true },
      orderBy: [{ createdAt: 'asc' }],
    }),
    prisma.userPreference.findUnique({
      where: { userId },
      select: { preferredTenantId: true },
    }),
  ]);

  const logos = await Promise.all(
    memberships.map(
      async (membership) =>
        [membership.tenantId, await fetchTenantLogo(membership.tenantId)] as const
    )
  );
  const logoMap = new Map(logos);

  const tenants = memberships
    .map((membership) => ({
      id: membership.tenant.id,
      slug: buildTenantSlug({
        id: membership.tenant.id,
        name: membership.tenant.name,
        isDemo: membership.tenant.isDemo,
      }),
      name: membership.tenant.name,
      legalName: membership.tenant.legalName,
      nif: membership.tenant.nif,
      isDemo: membership.tenant.isDemo,
      logoUrl: logoMap.get(membership.tenant.id) ?? null,
      role: normalizeRole(membership.role),
      createdAt: membership.tenant.createdAt.toISOString(),
    }))
    .sort((left, right) => {
      if (left.isDemo && !right.isDemo) return -1;
      if (!left.isDemo && right.isDemo) return 1;
      return left.name.localeCompare(right.name, 'es', { sensitivity: 'base' });
    });

  const activeTenantId =
    (sessionTenantId && tenants.some((tenant) => tenant.id === sessionTenantId)
      ? sessionTenantId
      : null) ??
    (preference?.preferredTenantId &&
    tenants.some((tenant) => tenant.id === preference.preferredTenantId)
      ? preference.preferredTenantId
      : null) ??
    tenants[0]?.id ??
    null;

  return { tenants, activeTenantId };
}

export async function getWorkspaceStateFromSession(
  session: SessionPayload
): Promise<WorkspaceState> {
  const user = await resolveSessionUser(session);
  const { tenants, activeTenantId } = await getWorkspaceStateForUser(
    user.id,
    session.tenantId ?? null
  );

  return {
    user: {
      name: user.name ?? session.name ?? null,
      email: user.email ?? session.email ?? null,
      photoUrl: user.image ?? null,
    },
    tenants,
    activeTenantId,
  };
}

export async function ensureTenantAccess(userId: string, tenantId: string) {
  const membership = await prisma.membership.findFirst({
    where: { userId, tenantId, status: 'active' },
    include: { tenant: true },
  });

  if (!membership) {
    throw new Error('No tienes acceso a esta empresa');
  }

  return membership;
}

export async function setPreferredTenant(userId: string, tenantId: string) {
  await prisma.userPreference.upsert({
    where: { userId },
    create: { userId, preferredTenantId: tenantId },
    update: { preferredTenantId: tenantId },
  });
}
