#!/usr/bin/env node

/* eslint-disable no-console */
const { Pool } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL no está definida');
  process.exit(1);
}

const APPLY = process.argv.includes('--apply');

const ALIAS_RULES = [
  {
    canonicalEmail: 'soporte@verifactu.business',
    aliases: ['support@verifactu.business'],
  },
];

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function getUserByEmail(client, email) {
  const rs = await client.query(
    `SELECT id, email, name, role, created_at
     FROM users
     WHERE lower(trim(email)) = lower(trim($1))
     LIMIT 1`,
    [email]
  );
  return rs.rows[0] || null;
}

async function countReferences(client, userId) {
  const queries = {
    memberships: 'SELECT COUNT(*)::int AS c FROM memberships WHERE user_id = $1',
    company_members: 'SELECT COUNT(*)::int AS c FROM company_members WHERE user_id = $1',
    user_preferences: 'SELECT COUNT(*)::int AS c FROM user_preferences WHERE user_id = $1',
    user_onboarding: 'SELECT COUNT(*)::int AS c FROM user_onboarding WHERE user_id = $1',
    support_user: 'SELECT COUNT(*)::int AS c FROM support_sessions WHERE user_id = $1',
    support_admin: 'SELECT COUNT(*)::int AS c FROM support_sessions WHERE admin_id = $1',
    companies_owner: 'SELECT COUNT(*)::int AS c FROM companies WHERE owner_user_id = $1',
    subscriptions: 'SELECT COUNT(*)::int AS c FROM subscriptions WHERE user_id = $1',
    accounts: 'SELECT COUNT(*)::int AS c FROM accounts WHERE user_id = $1',
    sessions: 'SELECT COUNT(*)::int AS c FROM sessions WHERE user_id = $1',
    audit_actor: 'SELECT COUNT(*)::int AS c FROM audit_logs WHERE actor_user_id = $1',
    audit_target: 'SELECT COUNT(*)::int AS c FROM audit_logs WHERE target_user_id = $1',
    webhooks: 'SELECT COUNT(*)::int AS c FROM webhook_events WHERE user_id = $1',
    emails: 'SELECT COUNT(*)::int AS c FROM email_events WHERE user_id = $1',
    isaak_conversations: 'SELECT COUNT(*)::int AS c FROM isaak_conversations WHERE user_id = $1',
  };

  const output = {};
  for (const [key, sql] of Object.entries(queries)) {
    const rs = await client.query(sql, [userId]);
    output[key] = rs.rows[0]?.c || 0;
  }
  return output;
}

async function mergeAliasIntoCanonical(client, canonicalUserId, aliasUserId) {
  await client.query('BEGIN');
  try {
    // memberships tenant-side
    await client.query(
      `INSERT INTO memberships (tenant_id, user_id, role, status, invited_by, created_at)
       SELECT tenant_id, $1, role, status, invited_by, created_at
       FROM memberships
       WHERE user_id = $2
       ON CONFLICT (tenant_id, user_id) DO NOTHING`,
      [canonicalUserId, aliasUserId]
    );

    // Promote to owner if alias had owner in same tenant.
    await client.query(
      `UPDATE memberships m
       SET role = 'owner'
       FROM memberships ma
       WHERE m.tenant_id = ma.tenant_id
         AND m.user_id = $1
         AND ma.user_id = $2
         AND lower(ma.role) = 'owner'`,
      [canonicalUserId, aliasUserId]
    );

    await client.query('DELETE FROM memberships WHERE user_id = $1', [aliasUserId]);

    // admin side company members
    await client.query(
      `INSERT INTO company_members (company_id, user_id, role, created_at)
       SELECT company_id, $1, role, created_at
       FROM company_members
       WHERE user_id = $2
       ON CONFLICT (company_id, user_id) DO NOTHING`,
      [canonicalUserId, aliasUserId]
    );
    await client.query('DELETE FROM company_members WHERE user_id = $1', [aliasUserId]);

    // one-to-one tables
    await client.query(
      `INSERT INTO user_preferences (user_id, preferred_tenant_id, updated_at)
       SELECT $1, preferred_tenant_id, updated_at
       FROM user_preferences
       WHERE user_id = $2
       ON CONFLICT (user_id) DO UPDATE
       SET preferred_tenant_id = COALESCE(user_preferences.preferred_tenant_id, EXCLUDED.preferred_tenant_id),
           updated_at = GREATEST(user_preferences.updated_at, EXCLUDED.updated_at)`,
      [canonicalUserId, aliasUserId]
    );
    await client.query('DELETE FROM user_preferences WHERE user_id = $1', [aliasUserId]);

    await client.query(
      `INSERT INTO user_onboarding (id, user_id, demo_tenant_id, completed_at, created_at)
       SELECT id, $1, demo_tenant_id, completed_at, created_at
       FROM user_onboarding
       WHERE user_id = $2
       ON CONFLICT (user_id) DO UPDATE
       SET demo_tenant_id = COALESCE(user_onboarding.demo_tenant_id, EXCLUDED.demo_tenant_id),
           completed_at = COALESCE(user_onboarding.completed_at, EXCLUDED.completed_at),
           created_at = LEAST(user_onboarding.created_at, EXCLUDED.created_at)`,
      [canonicalUserId, aliasUserId]
    );
    await client.query('DELETE FROM user_onboarding WHERE user_id = $1', [aliasUserId]);

    // direct FK updates
    await client.query('UPDATE support_sessions SET user_id = $1 WHERE user_id = $2', [canonicalUserId, aliasUserId]);
    await client.query('UPDATE support_sessions SET admin_id = $1 WHERE admin_id = $2', [canonicalUserId, aliasUserId]);
    await client.query('UPDATE companies SET owner_user_id = $1 WHERE owner_user_id = $2', [canonicalUserId, aliasUserId]);
    await client.query('UPDATE subscriptions SET user_id = $1 WHERE user_id = $2', [canonicalUserId, aliasUserId]);
    await client.query('UPDATE accounts SET user_id = $1 WHERE user_id = $2', [canonicalUserId, aliasUserId]);
    await client.query('UPDATE sessions SET user_id = $1 WHERE user_id = $2', [canonicalUserId, aliasUserId]);
    await client.query('UPDATE audit_logs SET actor_user_id = $1 WHERE actor_user_id = $2', [canonicalUserId, aliasUserId]);
    await client.query('UPDATE audit_logs SET target_user_id = $1 WHERE target_user_id = $2', [canonicalUserId, aliasUserId]);
    await client.query('UPDATE webhook_events SET user_id = $1 WHERE user_id = $2', [canonicalUserId, aliasUserId]);
    await client.query('UPDATE email_events SET user_id = $1 WHERE user_id = $2', [canonicalUserId, aliasUserId]);
    await client.query('UPDATE isaak_conversations SET user_id = $1 WHERE user_id = $2', [canonicalUserId, aliasUserId]);

    // delete alias user
    await client.query('DELETE FROM users WHERE id = $1', [aliasUserId]);

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
}

async function main() {
  const client = await pool.connect();

  try {
    console.log(`\n== Normalize admin aliases (${APPLY ? 'APPLY' : 'DRY-RUN'}) ==`);

    for (const rule of ALIAS_RULES) {
      const canonical = await getUserByEmail(client, rule.canonicalEmail);
      if (!canonical) {
        console.error(`\n❌ Canonical user not found: ${rule.canonicalEmail}`);
        continue;
      }

      console.log(`\nCanonical: ${canonical.email} (${canonical.id})`);

      for (const aliasEmail of rule.aliases) {
        const alias = await getUserByEmail(client, aliasEmail);
        if (!alias) {
          console.log(`  - Alias not found: ${aliasEmail}`);
          continue;
        }

        if (alias.id === canonical.id) {
          console.log(`  - Alias already canonical: ${aliasEmail}`);
          continue;
        }

        const refs = await countReferences(client, alias.id);
        const totalRefs = Object.values(refs).reduce((acc, n) => acc + n, 0);

        console.log(`  - Alias found: ${alias.email} (${alias.id}) refs=${totalRefs}`);
        Object.entries(refs).forEach(([k, v]) => {
          if (v > 0) console.log(`      ${k}: ${v}`);
        });

        if (!APPLY) {
          console.log('    DRY-RUN: no changes applied');
          continue;
        }

        await mergeAliasIntoCanonical(client, canonical.id, alias.id);
        console.log('    ✅ merged and deleted alias user');
      }
    }

    console.log('\nDone.');
    if (!APPLY) {
      console.log('Run with --apply to execute changes.');
    }
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error('\n❌ normalize-admin-user-aliases failed');
  console.error(error);
  process.exit(1);
});
