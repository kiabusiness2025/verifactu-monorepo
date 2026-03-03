import { requireAdmin } from '@/lib/adminAuth';
import { query } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

type OrphanMembershipRow = {
  membership_id: string;
  user_id: string;
  email: string | null;
  tenant_id: string;
  tenant_name: string | null;
  status: string;
  role: string;
  created_at: string;
  missing_user: boolean;
  missing_tenant: boolean;
};

type InvalidPreferenceRow = {
  user_id: string;
  email: string | null;
  preferred_tenant_id: string;
  tenant_name: string | null;
  tenant_exists: boolean;
  has_active_membership: boolean;
  updated_at: string | null;
};

type UserNoMembershipRow = {
  user_id: string;
  email: string;
  name: string | null;
  created_at: string;
};

type TenantNoOwnerRow = {
  tenant_id: string;
  tenant_name: string;
  legal_name: string | null;
  nif: string | null;
  created_at: string;
};

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);

    const { searchParams } = new URL(request.url);
    const q = (searchParams.get('q') ?? '').trim();
    const limit = Math.min(Math.max(Number(searchParams.get('limit') ?? 100), 10), 500);
    const qLike = q ? `%${q}%` : '';

    const [
      orphanMemberships,
      invalidPreferences,
      usersWithoutMemberships,
      tenantsWithoutOwners,
      counts,
    ] = await Promise.all([
      query<OrphanMembershipRow>(
        `
          SELECT
            m.id as membership_id,
            m.user_id,
            u.email,
            m.tenant_id,
            t.name as tenant_name,
            m.status,
            m.role,
            m.created_at::text,
            (u.id IS NULL) as missing_user,
            (t.id IS NULL) as missing_tenant
          FROM memberships m
          LEFT JOIN users u ON u.id = m.user_id
          LEFT JOIN tenants t ON t.id = m.tenant_id
          WHERE (u.id IS NULL OR t.id IS NULL)
            AND ($1 = '' OR
              COALESCE(u.email, '') ILIKE $2 OR
              COALESCE(t.name, '') ILIKE $2 OR
              m.user_id::text ILIKE $2 OR
              m.tenant_id::text ILIKE $2)
          ORDER BY m.created_at DESC
          LIMIT $3
        `,
        [q, qLike, limit]
      ),
      query<InvalidPreferenceRow>(
        `
          SELECT
            up.user_id,
            u.email,
            up.preferred_tenant_id,
            t.name as tenant_name,
            (t.id IS NOT NULL) as tenant_exists,
            (m.id IS NOT NULL) as has_active_membership,
            up.updated_at::text
          FROM user_preferences up
          LEFT JOIN users u ON u.id = up.user_id
          LEFT JOIN tenants t ON t.id = up.preferred_tenant_id
          LEFT JOIN memberships m
            ON m.user_id = up.user_id
            AND m.tenant_id = up.preferred_tenant_id
            AND m.status = 'active'
          WHERE up.preferred_tenant_id IS NOT NULL
            AND (t.id IS NULL OR m.id IS NULL)
            AND ($1 = '' OR
              COALESCE(u.email, '') ILIKE $2 OR
              up.user_id::text ILIKE $2 OR
              up.preferred_tenant_id::text ILIKE $2 OR
              COALESCE(t.name, '') ILIKE $2)
          ORDER BY up.updated_at DESC
          LIMIT $3
        `,
        [q, qLike, limit]
      ),
      query<UserNoMembershipRow>(
        `
          SELECT
            u.id as user_id,
            u.email,
            u.name,
            u.created_at::text
          FROM users u
          LEFT JOIN memberships m
            ON m.user_id = u.id
            AND m.status = 'active'
          WHERE m.id IS NULL
            AND ($1 = '' OR
              u.email ILIKE $2 OR
              COALESCE(u.name, '') ILIKE $2 OR
              u.id::text ILIKE $2)
          ORDER BY u.created_at DESC
          LIMIT $3
        `,
        [q, qLike, limit]
      ),
      query<TenantNoOwnerRow>(
        `
          SELECT
            t.id as tenant_id,
            t.name as tenant_name,
            t.legal_name,
            t.nif,
            t.created_at::text
          FROM tenants t
          LEFT JOIN memberships m
            ON m.tenant_id = t.id
            AND m.status = 'active'
            AND m.role = 'owner'
          WHERE m.id IS NULL
            AND ($1 = '' OR
              t.name ILIKE $2 OR
              COALESCE(t.legal_name, '') ILIKE $2 OR
              COALESCE(t.nif, '') ILIKE $2 OR
              t.id::text ILIKE $2)
          ORDER BY t.created_at DESC
          LIMIT $3
        `,
        [q, qLike, limit]
      ),
      query<{
        orphan_memberships: number;
        invalid_preferences: number;
        users_without_memberships: number;
        tenants_without_owners: number;
      }>(
        `
          SELECT
            (SELECT COUNT(*)
             FROM memberships m
             LEFT JOIN users u ON u.id = m.user_id
             LEFT JOIN tenants t ON t.id = m.tenant_id
             WHERE u.id IS NULL OR t.id IS NULL)::int as orphan_memberships,
            (SELECT COUNT(*)
             FROM user_preferences up
             LEFT JOIN tenants t ON t.id = up.preferred_tenant_id
             LEFT JOIN memberships m
               ON m.user_id = up.user_id
               AND m.tenant_id = up.preferred_tenant_id
               AND m.status = 'active'
             WHERE up.preferred_tenant_id IS NOT NULL
               AND (t.id IS NULL OR m.id IS NULL))::int as invalid_preferences,
            (SELECT COUNT(*)
             FROM users u
             LEFT JOIN memberships m
               ON m.user_id = u.id
               AND m.status = 'active'
             WHERE m.id IS NULL)::int as users_without_memberships,
            (SELECT COUNT(*)
             FROM tenants t
             LEFT JOIN memberships m
               ON m.tenant_id = t.id
               AND m.status = 'active'
               AND m.role = 'owner'
             WHERE m.id IS NULL)::int as tenants_without_owners
        `
      ),
    ]);

    return NextResponse.json({
      ok: true,
      filters: { q, limit },
      summary: counts[0] ?? {
        orphan_memberships: 0,
        invalid_preferences: 0,
        users_without_memberships: 0,
        tenants_without_owners: 0,
      },
      issues: {
        orphanMemberships,
        invalidPreferences,
        usersWithoutMemberships,
        tenantsWithoutOwners,
      },
    });
  } catch (error: unknown) {
    console.error('Error loading user-tenant integrity diagnostics:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    const status = message.includes('FORBIDDEN') ? 403 : 500;
    return NextResponse.json(
      { ok: false, error: status === 403 ? 'Forbidden' : 'Failed to load diagnostics' },
      { status }
    );
  }
}
