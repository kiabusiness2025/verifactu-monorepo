import { query, one } from "./db";

export async function getUserPreferredTenant(userId: string): Promise<string | null> {
  const row = await one<{ preferred_tenant_id: string | null }>(
    `SELECT preferred_tenant_id FROM user_preferences WHERE user_id = $1`,
    [userId]
  );
  return row?.preferred_tenant_id ?? null;
}

export async function setUserPreferredTenant(userId: string, tenantId: string): Promise<void> {
  await query(
    `INSERT INTO user_preferences (user_id, preferred_tenant_id, updated_at)
     VALUES ($1, $2, now())
     ON CONFLICT (user_id) DO UPDATE SET preferred_tenant_id = $2, updated_at = now()`,
    [userId, tenantId]
  );
}
