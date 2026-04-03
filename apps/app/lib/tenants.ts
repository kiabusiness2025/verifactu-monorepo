/**
 * Tenant (Company) management using Prisma
 * Migrated from raw SQL to Prisma for consistency with admin panel
 */
import { prisma } from '@verifactu/db';
import { getPreferredFullName, splitFullName } from './personName';
import { Role } from './roles';

export type Tenant = {
  id: string;
  name: string;
  created_at?: string;
  createdAt?: Date;
};

export async function listTenantsForUser(userId: string): Promise<Tenant[]> {
  // Get companies where user is owner
  const ownedCompanies = await prisma.company.findMany({
    where: { ownerUserId: userId },
    orderBy: { createdAt: 'desc' },
  });

  // Get companies where user is a member
  const memberCompanies = await prisma.companyMember.findMany({
    where: { userId },
    include: { company: true },
    orderBy: { createdAt: 'desc' },
  });

  // Combine and deduplicate
  const companyMap = new Map<string, Tenant>();

  ownedCompanies.forEach((company: { id: string; name: string; createdAt: Date }) => {
    companyMap.set(company.id, {
      id: company.id,
      name: company.name,
      createdAt: company.createdAt,
      created_at: company.createdAt.toISOString(),
    });
  });

  memberCompanies.forEach(
    (membership: { company: { id: string; name: string; createdAt: Date } }) => {
      if (!companyMap.has(membership.company.id)) {
        companyMap.set(membership.company.id, {
          id: membership.company.id,
          name: membership.company.name,
          createdAt: membership.company.createdAt,
          created_at: membership.company.createdAt.toISOString(),
        });
      }
    }
  );

  return Array.from(companyMap.values());
}

export async function createTenantWithOwner(params: {
  name: string;
  ownerId: string;
  nif?: string | null;
}): Promise<string> {
  const { name, ownerId, nif } = params;

  // Create company with owner
  const company = await prisma.company.create({
    data: {
      name,
      taxId: nif || undefined,
      ownerUserId: ownerId,
    },
  });

  return company.id;
}

export async function getTenant(id: string): Promise<Tenant | null> {
  const company = await prisma.company.findUnique({
    where: { id },
  });

  if (!company) return null;

  return {
    id: company.id,
    name: company.name,
    createdAt: company.createdAt,
    created_at: company.createdAt.toISOString(),
  };
}

export async function upsertUser(params: {
  id: string;
  email?: string | null;
  name?: string | null;
  firstName?: string | null;
  lastName?: string | null;
}): Promise<string> {
  const { id, email, name, firstName, lastName } = params;
  const fullName = getPreferredFullName({
    firstName,
    lastName,
    fullName: name,
    email,
    fallback: 'Unknown User',
  });
  const nameParts = splitFullName(fullName);

  const existingByAuthSubject = await prisma.user.findFirst({
    where: {
      OR: [{ authSubject: id }, { id }],
    },
    select: {
      id: true,
      email: true,
      name: true,
      firstName: true,
      lastName: true,
    },
  });

  if (existingByAuthSubject) {
    await prisma.user.update({
      where: { id: existingByAuthSubject.id },
      data: {
        email: email || existingByAuthSubject.email,
        name: fullName || existingByAuthSubject.name || undefined,
        firstName: nameParts.firstName || existingByAuthSubject.firstName || undefined,
        lastName: nameParts.lastName || existingByAuthSubject.lastName || undefined,
        authProvider: 'FIREBASE',
        authSubject: id,
      },
    });
    return existingByAuthSubject.id;
  }

  if (email) {
    const existingByEmail = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        name: true,
        firstName: true,
        lastName: true,
      },
    });

    if (existingByEmail) {
      await prisma.user.update({
        where: { id: existingByEmail.id },
        data: {
          email,
          name: fullName || existingByEmail.name || undefined,
          firstName: nameParts.firstName || existingByEmail.firstName || undefined,
          lastName: nameParts.lastName || existingByEmail.lastName || undefined,
          authProvider: 'FIREBASE',
          authSubject: id,
        },
      });
      return existingByEmail.id;
    }
  }

  const created = await prisma.user.create({
    data: {
      email: email || `unknown-${id}@user`,
      name: fullName,
      firstName: nameParts.firstName || undefined,
      lastName: nameParts.lastName || undefined,
      authProvider: 'FIREBASE',
      authSubject: id,
    },
    select: {
      id: true,
    },
  });

  return created.id;
}

export const tenantRoles: Role[] = ['owner', 'admin', 'member', 'asesor'];
