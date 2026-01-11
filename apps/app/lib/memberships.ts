import { Membership } from "./authz";
import { normalizeRole, Role } from "./roles";
import { one, query } from "./db";

type MembershipRow = {
  user_id: string;
  tenant_id: string;
  role: Role;
  status: string | null;
};

export async function fetchMembership(userId: string, tenantId: string): Promise<Membership | null> {
  const row = await one<MembershipRow>(
    `SELECT user_id, tenant_id, role, status
     FROM memberships
     WHERE user_id = $1 AND tenant_id = $2
     LIMIT 1`,
    [userId, tenantId]
  );
  if (!row) return null;
  const role = normalizeRole(row.role) ?? "member";
  return {
    userId: row.user_id,
    tenantId: row.tenant_id,
    role,
    status: (row.status as Membership["status"]) ?? "active",
  };
}

export async function listMemberships(userId: string) {
  return query<MembershipRow>(
    `SELECT user_id, tenant_id, role, status
     FROM memberships
     WHERE user_id = $1
     ORDER BY created_at DESC NULLS LAST`,
    [userId]
  );
}

export async function addMembership(params: { tenantId: string; userId: string; role: Role; invitedBy: string }) {
  const { tenantId, userId, role, invitedBy } = params;
  await query(
    `INSERT INTO memberships (tenant_id, user_id, role, status, invited_by)
     VALUES ($1,$2,$3,'active',$4)
     ON CONFLICT (tenant_id, user_id) DO UPDATE SET role = EXCLUDED.role, status = 'active'`,
    [tenantId, userId, role, invitedBy]
  );
}

export function parseRole(value: unknown, fallback: Role): Role {
  return normalizeRole(value) ?? fallback;
}
