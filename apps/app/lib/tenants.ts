import { query, one } from "./db";
import { Role } from "./roles";

export type Tenant = {
  id: string;
  name: string;
  created_at?: string;
};

export async function listTenantsForUser(userId: string) {
  return query<Tenant>(
    `SELECT t.id, t.name, t.created_at
     FROM tenants t
     JOIN memberships m ON m.tenant_id = t.id
     WHERE m.user_id = $1 AND COALESCE(m.status,'active') = 'active'
     ORDER BY t.created_at DESC`,
    [userId]
  );
}

export async function createTenantWithOwner(params: { name: string; ownerId: string }) {
  const { name, ownerId } = params;
  const [tenant] = await query<{ id: string }>(
    `INSERT INTO tenants (name) VALUES ($1) RETURNING id`,
    [name]
  );
  await query(
    `INSERT INTO memberships (tenant_id, user_id, role, status) VALUES ($1,$2,$3,'active')
     ON CONFLICT DO NOTHING`,
    [tenant.id, ownerId, "owner"]
  );
  return tenant.id;
}

export async function getTenant(id: string) {
  return one<Tenant>(`SELECT id, name, created_at FROM tenants WHERE id = $1`, [id]);
}

export async function upsertUser(params: { id: string; email?: string | null; name?: string | null }) {
  const { id, email, name } = params;
  await query(
    `INSERT INTO users (id, email, name)
     VALUES ($1, COALESCE($2,'unknown@user'), $3)
     ON CONFLICT (id) DO UPDATE SET email = COALESCE($2, users.email), name = COALESCE($3, users.name)`,
    [id, email ?? null, name ?? null]
  );
}

export const tenantRoles: Role[] = ["owner", "admin", "member", "asesor"];
