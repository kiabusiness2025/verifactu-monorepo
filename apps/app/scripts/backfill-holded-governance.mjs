import { Pool } from 'pg';
import { randomUUID } from 'crypto';

const OPEN_CLAIM_STATUSES = ['submitted', 'acknowledged', 'under_review', 'awaiting_response'];

function parseArgs(argv) {
  const args = {
    apply: false,
    tenantId: null,
    limit: null,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === '--apply') {
      args.apply = true;
      continue;
    }
    if (value === '--tenant' && argv[index + 1]) {
      args.tenantId = argv[index + 1];
      index += 1;
      continue;
    }
    if (value === '--limit' && argv[index + 1]) {
      const parsed = Number.parseInt(argv[index + 1], 10);
      args.limit = Number.isFinite(parsed) && parsed > 0 ? parsed : null;
      index += 1;
    }
  }

  return args;
}

function normalizeEmail(value) {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : '';
  return normalized || null;
}

function normalizeChannel(value) {
  return value === 'chatgpt' ? 'chatgpt' : 'dashboard';
}

function bool(value) {
  return value === true;
}

async function queryOne(pool, text, params = []) {
  const result = await pool.query(text, params);
  return result.rows[0] ?? null;
}

async function detectTable(pool, tableName) {
  const row = await queryOne(
    pool,
    `SELECT EXISTS (
       SELECT 1
       FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = $1
     ) AS exists`,
    [tableName]
  );
  return row?.exists === true;
}

async function fetchConnections(pool, options) {
  const params = [];
  let where = `WHERE ec.provider = 'holded'`;

  if (options.tenantId) {
    params.push(options.tenantId);
    where += ` AND ec.tenant_id = $${params.length}`;
  }

  let limitSql = '';
  if (options.limit) {
    params.push(options.limit);
    limitSql = ` LIMIT $${params.length}`;
  }

  const hasCompanyNotificationEmails = await detectTable(pool, 'company_notification_emails');

  return pool.query(
    `
      SELECT
        ec.id,
        ec.tenant_id,
        ec.channel_key,
        ec.connected_by_user_id,
        ec.technical_operator_user_id,
        ec.ownership_status,
        ec.managed_by_third_party,
        ec.client_admin_gap,
        ec.high_governance_risk,
        ec.under_claim_review,
        tp.email AS tenant_profile_email
        ${hasCompanyNotificationEmails ? ', cne.email AS company_notification_email' : ", NULL::text AS company_notification_email"}
      FROM external_connections ec
      LEFT JOIN tenant_profiles tp ON tp.tenant_id = ec.tenant_id
      ${hasCompanyNotificationEmails ? 'LEFT JOIN company_notification_emails cne ON cne.tenant_id = ec.tenant_id' : ''}
      ${where}
      ORDER BY ec.created_at ASC
      ${limitSql}
    `,
    params
  ).then((result) => result.rows);
}

async function fetchRecipientStats(pool, connectionId) {
  return queryOne(
    pool,
    `
      SELECT
        COUNT(*) FILTER (WHERE disabled_at IS NULL) AS active_total,
        COUNT(*) FILTER (WHERE disabled_at IS NULL AND is_client_side = TRUE) AS active_client_total,
        COUNT(*) FILTER (WHERE disabled_at IS NULL AND is_client_side = TRUE AND is_confirmed = TRUE) AS active_client_confirmed_total
      FROM connection_recipients
      WHERE connection_id = $1
    `,
    [connectionId]
  );
}

async function fetchMembershipStats(pool, tenantId) {
  return queryOne(
    pool,
    `
      SELECT
        COUNT(*) FILTER (
          WHERE status <> 'disabled'
            AND role = 'company_admin'
            AND side = 'client'
        ) AS active_client_admin_total,
        COUNT(*) FILTER (
          WHERE status <> 'disabled'
            AND (side = 'advisor' OR role = 'advisor_operator')
        ) AS active_advisor_total
      FROM memberships
      WHERE tenant_id = $1
    `,
    [tenantId]
  );
}

async function fetchOpenClaims(pool, connectionId) {
  const row = await queryOne(
    pool,
    `
      SELECT COUNT(*) AS open_total
      FROM claim_cases
      WHERE connection_id = $1
        AND status::text = ANY($2::text[])
    `,
    [connectionId, OPEN_CLAIM_STATUSES]
  );
  return Number(row?.open_total ?? 0);
}

async function fetchConnectedUserContext(pool, tenantId, userId) {
  if (!userId) {
    return null;
  }

  return queryOne(
    pool,
    `
      SELECT
        u.id,
        u.email,
        m.side,
        m.role,
        m.status
      FROM "User" u
      LEFT JOIN memberships m
        ON m.user_id = u.id
       AND m.tenant_id = $2
      WHERE u.id = $1
      LIMIT 1
    `,
    [userId, tenantId]
  );
}

async function hasActiveRecipientEmail(pool, connectionId, email) {
  const row = await queryOne(
    pool,
    `
      SELECT EXISTS (
        SELECT 1
        FROM connection_recipients
        WHERE connection_id = $1
          AND email = $2
          AND disabled_at IS NULL
      ) AS exists
    `,
    [connectionId, email]
  );

  return row?.exists === true;
}

async function insertRecipient(pool, input) {
  await pool.query(
    `
      INSERT INTO connection_recipients (
        id,
        connection_id,
        tenant_id,
        email,
        recipient_type,
        is_mandatory,
        is_client_side,
        is_confirmed,
        created_by_user_id,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
    `,
    [
      randomUUID(),
      input.connectionId,
      input.tenantId,
      input.email,
      input.recipientType,
      input.isMandatory,
      input.isClientSide,
      input.isConfirmed,
      input.createdByUserId,
    ]
  );
}

async function maybeBackfillRecipient(pool, connection, recipientStats) {
  const companyNotificationEmail = normalizeEmail(connection.company_notification_email);
  const tenantProfileEmail = normalizeEmail(connection.tenant_profile_email);

  if (companyNotificationEmail && !(await hasActiveRecipientEmail(pool, connection.id, companyNotificationEmail))) {
    if (Number(recipientStats.active_client_confirmed_total ?? 0) === 0) {
      await insertRecipient(pool, {
        connectionId: connection.id,
        tenantId: connection.tenant_id,
        email: companyNotificationEmail,
        recipientType: 'client_contact',
        isMandatory: true,
        isClientSide: true,
        isConfirmed: true,
        createdByUserId: connection.connected_by_user_id ?? null,
      });
      return { source: 'company_notification_email', email: companyNotificationEmail };
    }
  }

  if (
    Number(recipientStats.active_total ?? 0) === 0 &&
    tenantProfileEmail &&
    !(await hasActiveRecipientEmail(pool, connection.id, tenantProfileEmail))
  ) {
    await insertRecipient(pool, {
      connectionId: connection.id,
      tenantId: connection.tenant_id,
      email: tenantProfileEmail,
      recipientType: 'client_contact',
      isMandatory: true,
      isClientSide: true,
      isConfirmed: false,
      createdByUserId: connection.connected_by_user_id ?? null,
    });
    return { source: 'tenant_profile_email', email: tenantProfileEmail };
  }

  if (Number(recipientStats.active_total ?? 0) === 0 && connection.connected_by_user_id) {
    const user = await fetchConnectedUserContext(pool, connection.tenant_id, connection.connected_by_user_id);
    const email = normalizeEmail(user?.email);
    if (email && !(await hasActiveRecipientEmail(pool, connection.id, email))) {
      const isAdvisor = user?.side === 'advisor' || user?.role === 'advisor_operator';
      const isClientSide = !isAdvisor;
      await insertRecipient(pool, {
        connectionId: connection.id,
        tenantId: connection.tenant_id,
        email,
        recipientType: isClientSide ? 'user_primary' : 'advisor_contact',
        isMandatory: true,
        isClientSide,
        isConfirmed: true,
        createdByUserId: connection.connected_by_user_id,
      });
      return { source: 'connected_user', email };
    }
  }

  return null;
}

function deriveConnectionUpdate(input) {
  const managedByThirdParty =
    bool(input.current.managed_by_third_party) || input.memberships.activeAdvisorTotal > 0;
  const clientAdminGap = input.memberships.activeClientAdminTotal === 0;
  const highGovernanceRisk =
    managedByThirdParty &&
    clientAdminGap &&
    input.recipients.activeClientConfirmedTotal === 0;
  const underClaimReview = input.openClaims > 0;
  const ownershipStatus =
    input.current.ownership_status || (managedByThirdParty ? 'third_party_managed' : 'pending_confirmation');
  const technicalOperatorUserId =
    input.current.technical_operator_user_id || input.current.connected_by_user_id || null;

  return {
    ownershipStatus,
    managedByThirdParty,
    clientAdminGap,
    highGovernanceRisk,
    underClaimReview,
    technicalOperatorUserId,
  };
}

async function updateConnection(pool, connectionId, update) {
  await pool.query(
    `
      UPDATE external_connections
      SET
        ownership_status = $2,
        managed_by_third_party = $3,
        client_admin_gap = $4,
        high_governance_risk = $5,
        under_claim_review = $6,
        technical_operator_user_id = $7,
        governance_updated_at = NOW(),
        updated_at = NOW()
      WHERE id = $1
    `,
    [
      connectionId,
      update.ownershipStatus,
      update.managedByThirdParty,
      update.clientAdminGap,
      update.highGovernanceRisk,
      update.underClaimReview,
      update.technicalOperatorUserId,
    ]
  );
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required');
  }

  const pool = new Pool({
    connectionString: databaseUrl,
    max: 4,
  });

  const summary = {
    scanned: 0,
    seededRecipients: 0,
    updatedConnections: 0,
    changed: [],
  };

  try {
    const requiredTables = ['external_connections', 'connection_recipients', 'memberships', 'claim_cases'];
    for (const tableName of requiredTables) {
      const exists = await detectTable(pool, tableName);
      if (!exists) {
        throw new Error(`Required table not found: ${tableName}`);
      }
    }

    const connections = await fetchConnections(pool, args);
    for (const connection of connections) {
      summary.scanned += 1;

      let recipientStats = await fetchRecipientStats(pool, connection.id);
      const seededRecipient =
        args.apply ? await maybeBackfillRecipient(pool, connection, recipientStats) : null;

      if (seededRecipient) {
        summary.seededRecipients += 1;
        recipientStats = await fetchRecipientStats(pool, connection.id);
      }

      const membershipStats = await fetchMembershipStats(pool, connection.tenant_id);
      const openClaims = await fetchOpenClaims(pool, connection.id);
      const update = deriveConnectionUpdate({
        current: connection,
        memberships: {
          activeClientAdminTotal: Number(membershipStats?.active_client_admin_total ?? 0),
          activeAdvisorTotal: Number(membershipStats?.active_advisor_total ?? 0),
        },
        recipients: {
          activeClientConfirmedTotal: Number(recipientStats?.active_client_confirmed_total ?? 0),
        },
        openClaims,
      });

      const changed =
        update.ownershipStatus !== connection.ownership_status ||
        update.managedByThirdParty !== bool(connection.managed_by_third_party) ||
        update.clientAdminGap !== bool(connection.client_admin_gap) ||
        update.highGovernanceRisk !== bool(connection.high_governance_risk) ||
        update.underClaimReview !== bool(connection.under_claim_review) ||
        update.technicalOperatorUserId !== (connection.technical_operator_user_id ?? null);

      if (changed) {
        summary.updatedConnections += 1;
        summary.changed.push({
          connectionId: connection.id,
          tenantId: connection.tenant_id,
          channel: normalizeChannel(connection.channel_key),
          update,
          seededRecipient,
        });
        if (args.apply) {
          await updateConnection(pool, connection.id, update);
        }
      }
    }

    console.log(
      JSON.stringify(
        {
          mode: args.apply ? 'apply' : 'dry-run',
          tenantId: args.tenantId,
          limit: args.limit,
          scanned: summary.scanned,
          seededRecipients: summary.seededRecipients,
          updatedConnections: summary.updatedConnections,
          sample: summary.changed.slice(0, 25),
        },
        null,
        2
      )
    );
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error('[backfill-holded-governance] failed', error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
