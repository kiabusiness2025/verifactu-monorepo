/**
 * Tenant (Company) management using Prisma
 * Migrated from raw SQL to Prisma for consistency with admin panel
 */
import { prisma } from '@verifactu/db';
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

  memberCompanies.forEach((membership: { company: { id: string; name: string; createdAt: Date } }) => {
    if (!companyMap.has(membership.company.id)) {
      companyMap.set(membership.company.id, {
        id: membership.company.id,
        name: membership.company.name,
        createdAt: membership.company.createdAt,
        created_at: membership.company.createdAt.toISOString(),
      });
    }
  });

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
}): Promise<void> {
  const { id, email, name } = params;

  await prisma.user.upsert({
    where: { id },
    create: {
      id,
      email: email || `unknown-${id}@user`,
      name: name || 'Unknown User',
    },
    update: {
      email: email || undefined,
      name: name || undefined,
    },
  });
}

export const tenantRoles: Role[] = ['owner', 'admin', 'member', 'asesor'];
