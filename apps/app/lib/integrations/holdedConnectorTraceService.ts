import { one, query } from '@/lib/db';

export type HoldedAdminTraceSession = {
  sessionId: string;
  userId: string;
  userEmail: string;
  userName: string;
  expiresAt: string;
  tenants: Array<{
    tenantId: string;
    tenantName: string;
    tenantLegalName: string;
    connectionStatus: string;
    channelKey: string | null;
    highGovernanceRisk: boolean;
  }>;
};

export type HoldedAdminTraceConversation = {
  conversationId: string;
  tenantId: string;
  tenantName: string;
  tenantLegalName: string;
  userId: string;
  userEmail: string;
  userName: string;
  title: string | null;
  context: string | null;
  summary: string | null;
  messageCount: number;
  lastActivity: string;
  recentMessages: Array<{
    messageId: string;
    role: string;
    contentPreview: string;
    createdAt: string;
  }>;
};

export type HoldedAdminTracePayload = {
  summary: {
    activeSessions: number;
    recentConversations: number;
    memoryFacts: number;
  };
  activeSessions: HoldedAdminTraceSession[];
  recentConversations: HoldedAdminTraceConversation[];
};

function normalizeText(value: string | null | undefined, fallback = '') {
  const trimmed = value?.trim();
  return trimmed || fallback;
}

function buildContentPreview(value: string, maxLength = 160) {
  const normalized = value.trim().replace(/\s+/g, ' ');
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength - 1)}…`;
}

type ActiveSessionRow = {
  session_id: string;
  user_id: string;
  user_email: string | null;
  user_name: string | null;
  expires_at: string;
};

type ActiveSessionTenantRow = {
  user_id: string;
  tenant_id: string;
  tenant_name: string | null;
  tenant_legal_name: string | null;
  connection_status: string | null;
  channel_key: string | null;
  high_governance_risk: boolean | null;
};

type ConversationRow = {
  conversation_id: string;
  tenant_id: string;
  tenant_name: string | null;
  tenant_legal_name: string | null;
  user_id: string;
  user_email: string | null;
  user_name: string | null;
  title: string | null;
  context: string | null;
  summary: string | null;
  message_count: number;
  last_activity: string;
};

type ConversationMessageRow = {
  message_id: string;
  conversation_id: string;
  role: string;
  content: string;
  created_at: string;
};

export async function listHoldedConnectorAdminTrace(input?: {
  sessionLimit?: number;
  conversationLimit?: number;
}): Promise<HoldedAdminTracePayload> {
  const sessionLimit = Math.min(Math.max(input?.sessionLimit ?? 25, 1), 100);
  const conversationLimit = Math.min(Math.max(input?.conversationLimit ?? 25, 1), 100);

  const [activeSessionsRaw, recentConversationsRaw, memoryFactsRow] = await Promise.all([
    query<ActiveSessionRow>(
      `
      SELECT
        s.id AS session_id,
        s.user_id,
        u.email AS user_email,
        u.name AS user_name,
        s.expires::text AS expires_at
      FROM sessions s
      INNER JOIN users u ON u.id = s.user_id
      WHERE s.expires > now()
        AND EXISTS (
          SELECT 1
          FROM memberships m
          INNER JOIN external_connections ec
            ON ec.tenant_id = m.tenant_id
           AND ec.provider = 'holded'
          WHERE m.user_id = s.user_id
            AND COALESCE(m.status, 'active') <> 'disabled'
        )
      ORDER BY s.expires ASC
      LIMIT $1
      `,
      [sessionLimit]
    ),
    query<ConversationRow>(
      `
      SELECT
        c.id AS conversation_id,
        c.tenant_id,
        t.name AS tenant_name,
        t.legal_name AS tenant_legal_name,
        c.user_id,
        u.email AS user_email,
        u.name AS user_name,
        c.title,
        c.context,
        c.summary,
        c.message_count,
        c.last_activity::text AS last_activity
      FROM isaak_conversations c
      INNER JOIN tenants t ON t.id = c.tenant_id
      INNER JOIN users u ON u.id = c.user_id
      WHERE EXISTS (
        SELECT 1
        FROM external_connections ec
        WHERE ec.tenant_id = c.tenant_id
          AND ec.provider = 'holded'
      )
      ORDER BY c.last_activity DESC
      LIMIT $1
      `,
      [conversationLimit]
    ),
    one<{ count: string }>(
      `
      SELECT COUNT(*)::text AS count
      FROM isaak_memory_facts mf
      WHERE EXISTS (
        SELECT 1
        FROM external_connections ec
        WHERE ec.tenant_id = mf.tenant_id
          AND ec.provider = 'holded'
      )
      `
    ),
  ]);

  const sessionUserIds = Array.from(new Set(activeSessionsRaw.map((row) => row.user_id)));
  const activeSessionTenants =
    sessionUserIds.length > 0
      ? await query<ActiveSessionTenantRow>(
          `
          SELECT
            m.user_id,
            m.tenant_id,
            t.name AS tenant_name,
            t.legal_name AS tenant_legal_name,
            ec.connection_status,
            ec.channel_key,
            ec.high_governance_risk
          FROM memberships m
          INNER JOIN tenants t ON t.id = m.tenant_id
          LEFT JOIN LATERAL (
            SELECT
              connection_status,
              channel_key,
              high_governance_risk
            FROM external_connections ec
            WHERE ec.tenant_id = m.tenant_id
              AND ec.provider = 'holded'
            ORDER BY ec.updated_at DESC
            LIMIT 1
          ) ec ON true
          WHERE m.user_id = ANY($1::text[])
            AND COALESCE(m.status, 'active') <> 'disabled'
            AND EXISTS (
              SELECT 1
              FROM external_connections holded_ec
              WHERE holded_ec.tenant_id = m.tenant_id
                AND holded_ec.provider = 'holded'
            )
          ORDER BY t.name ASC
          `,
          [sessionUserIds]
        )
      : [];

  const conversationIds = recentConversationsRaw.map((row) => row.conversation_id);
  const recentMessages =
    conversationIds.length > 0
      ? await query<ConversationMessageRow>(
          `
          SELECT
            m.id AS message_id,
            m.conversation_id,
            m.role,
            m.content,
            m.created_at::text AS created_at
          FROM isaak_conversation_messages m
          WHERE m.conversation_id = ANY($1::uuid[])
          ORDER BY m.created_at DESC
          `,
          [conversationIds]
        )
      : [];

  const activeSessions = activeSessionsRaw.map((session) => ({
    sessionId: session.session_id,
    userId: session.user_id,
    userEmail: normalizeText(session.user_email, 'sin-email'),
    userName: normalizeText(session.user_name, 'Sin nombre'),
    expiresAt: session.expires_at,
    tenants: activeSessionTenants
      .filter((tenant) => tenant.user_id === session.user_id)
      .map((tenant) => ({
        tenantId: tenant.tenant_id,
        tenantName: normalizeText(tenant.tenant_name, 'Sin tenant'),
        tenantLegalName: normalizeText(tenant.tenant_legal_name),
        connectionStatus: tenant.connection_status ?? 'disconnected',
        channelKey: tenant.channel_key ?? null,
        highGovernanceRisk: tenant.high_governance_risk === true,
      })),
  }));

  const recentConversations = recentConversationsRaw.map((conversation) => ({
    conversationId: conversation.conversation_id,
    tenantId: conversation.tenant_id,
    tenantName: normalizeText(conversation.tenant_name, 'Sin tenant'),
    tenantLegalName: normalizeText(conversation.tenant_legal_name),
    userId: conversation.user_id,
    userEmail: normalizeText(conversation.user_email, 'sin-email'),
    userName: normalizeText(conversation.user_name, 'Sin nombre'),
    title: conversation.title?.trim() || null,
    context: conversation.context?.trim() || null,
    summary: conversation.summary?.trim() || null,
    messageCount: Number(conversation.message_count) || 0,
    lastActivity: conversation.last_activity,
    recentMessages: recentMessages
      .filter((message) => message.conversation_id === conversation.conversation_id)
      .slice(0, 2)
      .map((message) => ({
        messageId: message.message_id,
        role: message.role,
        contentPreview: buildContentPreview(message.content),
        createdAt: message.created_at,
      })),
  }));

  return {
    summary: {
      activeSessions: activeSessions.length,
      recentConversations: recentConversations.length,
      memoryFacts: Number(memoryFactsRow?.count || 0),
    },
    activeSessions,
    recentConversations,
  };
}

export async function resetHoldedConnectorOperationalStateOnDisconnect(input: {
  tenantId: string;
}) {
  const userRows = await query<{ user_id: string }>(
    `
    SELECT DISTINCT user_id
    FROM memberships
    WHERE tenant_id = $1
      AND COALESCE(status, 'active') <> 'disabled'
    `,
    [input.tenantId]
  );
  const userIds = userRows.map((row) => row.user_id);
  const preservedConversationHistory = await one<{ count: string }>(
    `
    SELECT COUNT(*)::text AS count
    FROM isaak_conversations
    WHERE tenant_id = $1
    `,
    [input.tenantId]
  );

  const deletedSessions =
    userIds.length > 0
      ? await one<{ count: string }>(
          `
          WITH deleted AS (
            DELETE FROM sessions
            WHERE user_id = ANY($1::text[])
            RETURNING id
          )
          SELECT COUNT(*)::text AS count FROM deleted
          `,
          [userIds]
        )
      : { count: '0' };

  const deletedMemoryFacts = await one<{ count: string }>(
    `
    WITH deleted AS (
      DELETE FROM isaak_memory_facts
      WHERE tenant_id = $1
      RETURNING id
    )
    SELECT COUNT(*)::text AS count FROM deleted
    `,
    [input.tenantId]
  );

  return {
    affectedUsers: userIds.length,
    deletedSessions: Number(deletedSessions?.count || 0),
    deletedMemoryFacts: Number(deletedMemoryFacts?.count || 0),
    preservedConversationHistory: Number(preservedConversationHistory?.count || 0),
  };
}
