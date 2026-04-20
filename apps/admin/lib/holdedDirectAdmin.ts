import { randomUUID } from 'crypto';
import { one, query } from '@/lib/db';

export type HoldedDirectProfileStatus = 'new' | 'completed' | 'pending' | 'cancelled';
export type HoldedDirectReminderState = 'not_needed' | 'due' | 'sent_recently' | 'no_recipient';

export type HoldedDirectStatusBreakdown = {
  new: number;
  completed: number;
  pending: number;
  cancelled: number;
};

export type HoldedDirectSummary = {
  connectedUsers: number;
  disconnectedUsers: number;
  tenants: number;
  activeSessions: number;
  conversations: number;
  duplicateEmailUsers: number;
  dueReminders: number;
  userProfiles: HoldedDirectStatusBreakdown;
  tenantProfiles: HoldedDirectStatusBreakdown;
};

export type HoldedDirectUser = {
  userId: string;
  userEmail: string;
  normalizedEmail: string;
  userName: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  roleInCompany: string | null;
  isConnected: boolean;
  lastConnectedAt: string | null;
  lastDisconnectedAt: string | null;
  lastValidatedAt: string | null;
  lastActivity: string | null;
  profileStatus: HoldedDirectProfileStatus;
  profileStartedAt: string | null;
  profileDeadlineAt: string | null;
  missingFields: string[];
  duplicateEmailConflict: boolean;
  duplicateEmailCount: number;
  reminderState: HoldedDirectReminderState;
  reminderCount: number;
  lastReminderSentAt: string | null;
  nextReminderDueAt: string | null;
  notificationRecipients: string[];
  conversationCount: number;
  activeSessions: number;
  tenants: Array<{
    tenantId: string;
    tenantLegalName: string;
    connectionStatus: string;
  }>;
};

export type HoldedDirectTenant = {
  tenantId: string;
  tenantLegalName: string;
  taxId: string | null;
  email: string | null;
  phone: string | null;
  representative: string | null;
  representativeRole: string | null;
  connectionStatus: string;
  connectedAt: string | null;
  disconnectedAt: string | null;
  lastValidatedAt: string | null;
  lastSyncAt: string | null;
  lastError: string | null;
  profileStatus: HoldedDirectProfileStatus;
  profileStartedAt: string | null;
  profileDeadlineAt: string | null;
  missingFields: string[];
  reminderState: HoldedDirectReminderState;
  reminderCount: number;
  lastReminderSentAt: string | null;
  nextReminderDueAt: string | null;
  notificationRecipients: string[];
  usersCount: number;
  conversationCount: number;
  activeSessions: number;
};

export type HoldedDirectConversation = {
  conversationId: string;
  tenantId: string;
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

export type HoldedDirectSession = {
  sessionId: string;
  userId: string;
  userEmail: string;
  userName: string;
  expiresAt: string;
  tenants: Array<{
    tenantId: string;
    tenantLegalName: string;
  }>;
};

export type HoldedDirectPanelData = {
  summary: HoldedDirectSummary;
  users: HoldedDirectUser[];
  tenants: HoldedDirectTenant[];
  conversations: HoldedDirectConversation[];
  sessions: HoldedDirectSession[];
};

type SummaryRow = {
  connected_users: number;
  disconnected_users: number;
  tenants: number;
  active_sessions: number;
  conversations: number;
};

type UserRow = {
  user_id: string;
  user_email: string | null;
  user_name: string | null;
  is_connected: boolean;
  first_connected_at: string | null;
  first_membership_at: string | null;
  last_connected_at: string | null;
  last_disconnected_at: string | null;
  last_validated_at: string | null;
  last_activity: string | null;
  conversation_count: number;
  active_sessions: number;
};

type UserTenantRow = {
  user_id: string;
  tenant_id: string;
  tenant_legal_name: string | null;
  connection_status: string | null;
};

type UserDetailRow = {
  id: string;
  email: string | null;
  name: string | null;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
};

type UserProfileRow = {
  user_id: string;
  tenant_id: string;
  role_in_company: string | null;
};

type TenantRow = {
  tenant_id: string;
  tenant_legal_name: string | null;
  tenant_created_at: string;
  connection_status: string | null;
  connected_at: string | null;
  disconnected_at: string | null;
  last_validated_at: string | null;
  last_sync_at: string | null;
  last_error: string | null;
  users_count: number;
  conversation_count: number;
  active_sessions: number;
};

type ConversationRow = {
  conversation_id: string;
  tenant_id: string;
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

type SessionRow = {
  session_id: string;
  user_id: string;
  user_email: string | null;
  user_name: string | null;
  expires_at: string;
};

type SessionTenantRow = {
  user_id: string;
  tenant_id: string;
  tenant_legal_name: string | null;
};

type UserReminderRow = {
  user_id: string | null;
  created_at: string;
};

type TenantDetailRow = {
  tenant_id: string;
  tenant_name: string | null;
  tenant_legal_name: string | null;
  tenant_nif: string | null;
  tenant_created_at: string;
  profile_tax_id: string | null;
  profile_legal_name: string | null;
  profile_address: string | null;
  profile_postal_code: string | null;
  profile_city: string | null;
  profile_country: string | null;
  profile_email: string | null;
  profile_phone: string | null;
  profile_representative: string | null;
  profile_representative_role: string | null;
  user_email: string | null;
};

type TenantReminderRow = {
  tenant_id: string | null;
  last_sent_at: string | null;
  reminder_count: number;
};

type HoldedDirectReminderResult = {
  sentUsers: number;
  failedUsers: number;
  sentTenants: number;
  failedTenants: number;
};

const PROFILE_NEW_WINDOW_HOURS = 24;
const PROFILE_CANCELLATION_DAYS = 7;
const REMINDER_INTERVAL_HOURS = 24;
const FULL_SYNC_LIMIT = 1000;
const USER_PROFILE_REMINDER_TEMPLATE = 'holded_direct_user_profile_reminder';
const TENANT_PROFILE_REMINDER_TEMPLATE = 'holded_direct_tenant_profile_reminder';
const USER_REQUIRED_FIELDS = ['Nombre', 'Apellidos', 'Rol en la empresa', 'Telefono'] as const;
const TENANT_REQUIRED_FIELDS = [
  'Razon social',
  'NIF/CIF',
  'Direccion',
  'Codigo postal',
  'Ciudad',
  'Pais',
  'Correo de la empresa',
  'Telefono de la empresa',
  'Representante',
  'Rol del representante',
] as const;

function clampLimit(value: number | undefined, fallback = 12) {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(Math.max(Number(value), 1), FULL_SYNC_LIMIT);
}

function normalizeText(value: string | null | undefined, fallback = 'Sin dato') {
  const normalized = value?.trim();
  return normalized || fallback;
}

function buildPreview(value: string, maxLength = 160) {
  const normalized = value.trim().replace(/\s+/g, ' ');
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength - 1)}...`;
}

function hasText(value: string | null | undefined) {
  return Boolean(value?.trim());
}

function normalizeEmailAddress(value: string | null | undefined) {
  return value?.trim().toLowerCase() || '';
}

function uniqueValues(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(values.map((value) => value?.trim()).filter((value): value is string => Boolean(value)))
  );
}

function parseDate(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toIsoString(value: Date | null) {
  return value ? value.toISOString() : null;
}

function addHours(value: Date, hours: number) {
  return new Date(value.getTime() + hours * 60 * 60 * 1000);
}

function addDays(value: Date, days: number) {
  return new Date(value.getTime() + days * 24 * 60 * 60 * 1000);
}

function resolveProfileStatus(input: {
  missingFields: string[];
  startedAt: string | null;
}): HoldedDirectProfileStatus {
  if (input.missingFields.length === 0) return 'completed';

  const startedAt = parseDate(input.startedAt);
  if (!startedAt) return 'pending';

  const now = new Date();
  const newUntil = addHours(startedAt, PROFILE_NEW_WINDOW_HOURS);
  const cancelledAt = addDays(startedAt, PROFILE_CANCELLATION_DAYS);

  if (now < newUntil) return 'new';
  if (now >= cancelledAt) return 'cancelled';
  return 'pending';
}

function resolveProfileDeadline(startedAt: string | null) {
  const startedDate = parseDate(startedAt);
  if (!startedDate) return null;
  return addDays(startedDate, PROFILE_CANCELLATION_DAYS).toISOString();
}

function resolveReminderState(input: {
  status: HoldedDirectProfileStatus;
  recipients: string[];
  lastReminderSentAt: string | null;
}): { state: HoldedDirectReminderState; nextReminderDueAt: string | null } {
  if (input.status === 'completed') {
    return { state: 'not_needed', nextReminderDueAt: null };
  }

  if (input.recipients.length === 0) {
    return { state: 'no_recipient', nextReminderDueAt: null };
  }

  const lastReminder = parseDate(input.lastReminderSentAt);
  if (!lastReminder) {
    return { state: 'due', nextReminderDueAt: null };
  }

  const nextDue = addHours(lastReminder, REMINDER_INTERVAL_HOURS);
  if (nextDue <= new Date()) {
    return { state: 'due', nextReminderDueAt: nextDue.toISOString() };
  }

  return { state: 'sent_recently', nextReminderDueAt: nextDue.toISOString() };
}

function buildStatusBreakdown<T extends { profileStatus: HoldedDirectProfileStatus }>(items: T[]) {
  return items.reduce<HoldedDirectStatusBreakdown>(
    (accumulator, item) => {
      accumulator[item.profileStatus] += 1;
      return accumulator;
    },
    {
      new: 0,
      completed: 0,
      pending: 0,
      cancelled: 0,
    }
  );
}

function formatDateLabel(value: string | null) {
  const date = parseDate(value);
  if (!date) return 'sin fecha';

  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

function readSiteUrl(envName: string, fallback: string) {
  const value = process.env[envName]?.trim();
  return value || fallback;
}

function resolveReminderSender() {
  return (
    process.env.RESEND_FROM_HOLDED?.trim() ||
    process.env.RESEND_FROM?.trim() ||
    'Holded <no-reply@holded.verifactu.business>'
  );
}

function extractMessageId(result: unknown) {
  if (!result || typeof result !== 'object') return null;

  const candidate = result as { id?: unknown; data?: { id?: unknown } };
  if (typeof candidate.id === 'string' && candidate.id.trim()) return candidate.id;
  if (typeof candidate.data?.id === 'string' && candidate.data.id.trim()) return candidate.data.id;
  return null;
}

async function sendTransactionalEmail(input: {
  to: string[];
  subject: string;
  html: string;
  replyTo?: string;
}) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY || ''}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      to: input.to,
      from: resolveReminderSender(),
      subject: input.subject,
      html: input.html,
      reply_to: input.replyTo || 'soporte@verifactu.business',
    }),
  });

  if (!response.ok) {
    throw new Error(`Resend API error: ${response.statusText}`);
  }

  return response.json();
}

async function recordReminderEmailEvent(input: {
  to: string[];
  template: string;
  subject: string;
  payload: Record<string, unknown>;
  userId?: string;
  messageId?: string | null;
  status: 'SENT' | 'FAILED';
  lastError?: string | null;
}) {
  await query(
    `
    INSERT INTO "EmailEvent" (
      id,
      "messageId",
      "to",
      "fromEmail",
      template,
      subject,
      status,
      provider,
      payload,
      "lastError",
      "userId",
      "createdAt",
      "updatedAt"
    ) VALUES (
      $1,
      $2,
      $3,
      $4,
      $5,
      $6,
      $7::"EmailStatus",
      $8::"EmailProvider",
      $9::jsonb,
      $10,
      $11,
      now(),
      now()
    )
    `,
    [
      randomUUID(),
      input.messageId || null,
      input.to.join(', '),
      resolveReminderSender(),
      input.template,
      input.subject,
      input.status,
      'RESEND',
      JSON.stringify(input.payload || {}),
      input.lastError || null,
      input.userId || null,
    ]
  );
}

function buildUserReminderEmail(user: HoldedDirectUser) {
  const holdedSiteUrl = readSiteUrl(
    'NEXT_PUBLIC_HOLDED_SITE_URL',
    'https://holded.verifactu.business'
  );
  const profileUrl = `${holdedSiteUrl}/onboarding/profile?source=admin_profile_review&channel=chatgpt`;
  const deadlineLabel = formatDateLabel(user.profileDeadlineAt);
  const missing = user.missingFields.map((field) => `<li>${field}</li>`).join('');

  return {
    subject: 'Completa tu perfil para seguir usando Holded + ChatGPT gratis',
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#0f172a">
        <h2 style="margin:0 0 12px">Necesitamos completar tu perfil</h2>
        <p>Hemos revisado tu acceso a Holded + ChatGPT y faltan estos datos:</p>
        <ul>${missing}</ul>
        <p>Completa el perfil antes del <strong>${deadlineLabel}</strong> para seguir usando el conector en su modalidad gratuita sin incidencias.</p>
        <p>
          <a href="${profileUrl}" style="display:inline-block;padding:12px 18px;background:#0f172a;color:#fff;text-decoration:none;border-radius:10px">
            Completar perfil
          </a>
        </p>
        <p>Si ya lo has actualizado, no necesitas hacer nada mas.</p>
      </div>
    `,
  };
}

function buildTenantReminderEmail(tenant: HoldedDirectTenant) {
  const holdedSiteUrl = readSiteUrl(
    'NEXT_PUBLIC_HOLDED_SITE_URL',
    'https://holded.verifactu.business'
  );
  const profileUrl = `${holdedSiteUrl}/onboarding/profile?source=admin_tenant_profile_review&channel=chatgpt`;
  const deadlineLabel = formatDateLabel(tenant.profileDeadlineAt);
  const missing = tenant.missingFields.map((field) => `<li>${field}</li>`).join('');

  return {
    subject: `Completa los datos de ${tenant.tenantLegalName} para seguir usando el conector gratis`,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#0f172a">
        <h2 style="margin:0 0 12px">Faltan datos de la empresa</h2>
        <p>En <strong>${tenant.tenantLegalName}</strong> todavia faltan estos datos para mantener el acceso gratuito a Holded + ChatGPT:</p>
        <ul>${missing}</ul>
        <p>Completa la informacion antes del <strong>${deadlineLabel}</strong>.</p>
        <p>
          <a href="${profileUrl}" style="display:inline-block;padding:12px 18px;background:#0f172a;color:#fff;text-decoration:none;border-radius:10px">
            Completar datos de la empresa
          </a>
        </p>
        <p>Si ya lo habeis actualizado, este aviso se cerrara automaticamente.</p>
      </div>
    `,
  };
}

export async function getHoldedDirectSummary(): Promise<HoldedDirectSummary> {
  const row = await one<SummaryRow>(
    `
    WITH connector_users AS (
      SELECT
        m.user_id,
        BOOL_OR(ec.connection_status = 'connected') AS has_connected
      FROM memberships m
      INNER JOIN external_connections ec
        ON ec.tenant_id = m.tenant_id
       AND ec.provider = 'holded'
       AND ec.channel_key = 'chatgpt'
      WHERE COALESCE(m.status, 'active') <> 'disabled'
      GROUP BY m.user_id
    )
    SELECT
      COUNT(*) FILTER (WHERE has_connected)::int AS connected_users,
      COUNT(*) FILTER (WHERE NOT has_connected)::int AS disconnected_users,
      (
        SELECT COUNT(DISTINCT ec.tenant_id)::int
        FROM external_connections ec
        WHERE ec.provider = 'holded'
          AND ec.channel_key = 'chatgpt'
      ) AS tenants,
      (
        SELECT COUNT(*)::int
        FROM "Session" s
        WHERE s.expires > now()
          AND EXISTS (
            SELECT 1
            FROM memberships m
            INNER JOIN external_connections ec
              ON ec.tenant_id = m.tenant_id
             AND ec.provider = 'holded'
             AND ec.channel_key = 'chatgpt'
             AND ec.connection_status = 'connected'
              WHERE m.user_id = s."userId"
              AND COALESCE(m.status, 'active') <> 'disabled'
          )
      ) AS active_sessions,
      (
        SELECT COUNT(*)::int
        FROM isaak_conversations c
        WHERE EXISTS (
          SELECT 1
          FROM external_connections ec
          WHERE ec.tenant_id = c.tenant_id
            AND ec.provider = 'holded'
            AND ec.channel_key = 'chatgpt'
        )
      ) AS conversations
    FROM connector_users
    `
  );

  return {
    connectedUsers: Number(row?.connected_users || 0),
    disconnectedUsers: Number(row?.disconnected_users || 0),
    tenants: Number(row?.tenants || 0),
    activeSessions: Number(row?.active_sessions || 0),
    conversations: Number(row?.conversations || 0),
    duplicateEmailUsers: 0,
    dueReminders: 0,
    userProfiles: {
      new: 0,
      completed: 0,
      pending: 0,
      cancelled: 0,
    },
    tenantProfiles: {
      new: 0,
      completed: 0,
      pending: 0,
      cancelled: 0,
    },
  };
}

export async function listHoldedDirectUsers(limit?: number): Promise<HoldedDirectUser[]> {
  const safeLimit = clampLimit(limit, 24);

  const users = await query<UserRow>(
    `
    SELECT
      u.id AS user_id,
      u.email AS user_email,
      u.name AS user_name,
      BOOL_OR(ec.connection_status = 'connected') AS is_connected,
      MIN(ec.connected_at)::text AS first_connected_at,
      MIN(m.created_at)::text AS first_membership_at,
      MAX(ec.connected_at)::text AS last_connected_at,
      MAX(ec.disconnected_at)::text AS last_disconnected_at,
      MAX(ec.last_validated_at)::text AS last_validated_at,
      MAX(c.last_activity)::text AS last_activity,
      COUNT(DISTINCT c.id)::int AS conversation_count,
      COUNT(DISTINCT s.id)::int AS active_sessions
    FROM "User" u
    INNER JOIN memberships m
      ON m.user_id = u.id
     AND COALESCE(m.status, 'active') <> 'disabled'
    INNER JOIN external_connections ec
      ON ec.tenant_id = m.tenant_id
     AND ec.provider = 'holded'
     AND ec.channel_key = 'chatgpt'
    LEFT JOIN isaak_conversations c
      ON c.user_id = u.id
     AND c.tenant_id = m.tenant_id
    LEFT JOIN "Session" s
      ON s."userId" = u.id
     AND s.expires > now()
    GROUP BY u.id, u.email, u.name
    ORDER BY
      BOOL_OR(ec.connection_status = 'connected') DESC,
      COALESCE(
        MAX(c.last_activity),
        MAX(ec.last_validated_at),
        MAX(ec.connected_at),
        MAX(ec.disconnected_at)
      ) DESC NULLS LAST,
      u.email ASC
    LIMIT $1
    `,
    [safeLimit]
  );

  const userIds = users.map((row) => row.user_id);
  const userTenants =
    userIds.length > 0
      ? await query<UserTenantRow>(
          `
          SELECT
            m.user_id,
            t.id AS tenant_id,
            COALESCE(t.legal_name, t.name) AS tenant_legal_name,
            ec.connection_status
          FROM memberships m
          INNER JOIN tenants t
            ON t.id = m.tenant_id
          INNER JOIN external_connections ec
            ON ec.tenant_id = m.tenant_id
           AND ec.provider = 'holded'
           AND ec.channel_key = 'chatgpt'
          WHERE m.user_id = ANY($1::text[])
            AND COALESCE(m.status, 'active') <> 'disabled'
          ORDER BY COALESCE(t.legal_name, t.name) ASC
          `,
          [userIds]
        )
      : [];

  const userDetails =
    userIds.length > 0
      ? await query<UserDetailRow>(
          `
          SELECT
            id,
            email,
            name,
            first_name,
            last_name,
            phone
          FROM "User"
          WHERE id = ANY($1::text[])
          `,
          [userIds]
        )
      : [];

  const userProfileRows =
    userIds.length > 0
      ? await query<UserProfileRow>(
          `
          SELECT
            user_id,
            tenant_id,
            role_in_company
          FROM isaak_onboarding_profiles
          WHERE user_id = ANY($1::text[])
          `,
          [userIds]
        )
      : [];

  const reminderRows =
    userIds.length > 0
      ? await query<UserReminderRow>(
          `
          SELECT
            "userId" AS user_id,
            "createdAt"::text AS created_at
          FROM "EmailEvent"
          WHERE "userId" = ANY($1::text[])
            AND template = $2
          ORDER BY "createdAt" DESC
          `,
          [userIds, USER_PROFILE_REMINDER_TEMPLATE]
        )
      : [];

  const reminderByUserId = new Map<
    string,
    { lastReminderSentAt: string | null; reminderCount: number }
  >();
  for (const row of reminderRows) {
    if (!row.user_id) continue;
    const existing = reminderByUserId.get(row.user_id);
    if (existing) {
      existing.reminderCount += 1;
      continue;
    }

    reminderByUserId.set(row.user_id, {
      lastReminderSentAt: row.created_at,
      reminderCount: 1,
    });
  }

  const userDetailsById = new Map(userDetails.map((user) => [user.id, user]));
  const userProfilesByUserId = new Map<string, UserProfileRow[]>();
  for (const profile of userProfileRows) {
    const existing = userProfilesByUserId.get(profile.user_id);
    if (existing) {
      existing.push(profile);
      continue;
    }

    userProfilesByUserId.set(profile.user_id, [profile]);
  }
  const duplicateEmailCounts = new Map<string, number>();
  for (const user of userDetails) {
    const normalizedEmail = normalizeEmailAddress(user.email);
    if (!normalizedEmail) continue;
    duplicateEmailCounts.set(normalizedEmail, (duplicateEmailCounts.get(normalizedEmail) || 0) + 1);
  }

  return users.map((row) => {
    const detail = userDetailsById.get(row.user_id);
    const userTenantRows = userTenants.filter((tenant) => tenant.user_id === row.user_id);
    const roleInCompany =
      (userProfilesByUserId.get(row.user_id) || [])
        .filter((profile) =>
          userTenantRows.some((tenant) => tenant.tenant_id === profile.tenant_id)
        )
        .map((profile) => profile.role_in_company?.trim() || null)
        .find((value): value is string => Boolean(value)) || null;
    const firstName = detail?.first_name?.trim() || null;
    const lastName = detail?.last_name?.trim() || null;
    const phone = detail?.phone?.trim() || null;
    const normalizedEmail = normalizeEmailAddress(detail?.email || row.user_email);
    const duplicateEmailCount = duplicateEmailCounts.get(normalizedEmail) || 0;
    const missingFields: string[] = [];

    if (!hasText(firstName)) missingFields.push(USER_REQUIRED_FIELDS[0]);
    if (!hasText(lastName)) missingFields.push(USER_REQUIRED_FIELDS[1]);
    if (!hasText(roleInCompany)) missingFields.push(USER_REQUIRED_FIELDS[2]);
    if (!hasText(phone)) missingFields.push(USER_REQUIRED_FIELDS[3]);
    if (duplicateEmailCount > 1) missingFields.push('Correo electronico unico');

    const profileStartedAt =
      row.first_connected_at || row.first_membership_at || row.last_connected_at;
    const profileStatus = resolveProfileStatus({
      missingFields,
      startedAt: profileStartedAt,
    });
    const notificationRecipients = uniqueValues([detail?.email || row.user_email]);
    const reminderMeta = reminderByUserId.get(row.user_id) || {
      lastReminderSentAt: null,
      reminderCount: 0,
    };
    const reminderState = resolveReminderState({
      status: profileStatus,
      recipients: notificationRecipients,
      lastReminderSentAt: reminderMeta.lastReminderSentAt,
    });

    return {
      userId: row.user_id,
      userEmail: normalizeText(detail?.email || row.user_email, 'sin-email'),
      normalizedEmail,
      userName: normalizeText(
        detail?.name || row.user_name || [firstName, lastName].filter(Boolean).join(' '),
        'Sin nombre'
      ),
      firstName,
      lastName,
      phone,
      roleInCompany,
      isConnected: row.is_connected === true,
      lastConnectedAt: row.last_connected_at,
      lastDisconnectedAt: row.last_disconnected_at,
      lastValidatedAt: row.last_validated_at,
      lastActivity: row.last_activity,
      profileStatus,
      profileStartedAt,
      profileDeadlineAt: resolveProfileDeadline(profileStartedAt),
      missingFields,
      duplicateEmailConflict: duplicateEmailCount > 1,
      duplicateEmailCount,
      reminderState: reminderState.state,
      reminderCount: reminderMeta.reminderCount,
      lastReminderSentAt: reminderMeta.lastReminderSentAt,
      nextReminderDueAt: reminderState.nextReminderDueAt,
      notificationRecipients,
      conversationCount: Number(row.conversation_count || 0),
      activeSessions: Number(row.active_sessions || 0),
      tenants: userTenantRows.map((tenant) => ({
        tenantId: tenant.tenant_id,
        tenantLegalName: normalizeText(tenant.tenant_legal_name, 'Sin tenant'),
        connectionStatus: tenant.connection_status || 'disconnected',
      })),
    };
  });
}

export async function listHoldedDirectTenants(limit?: number): Promise<HoldedDirectTenant[]> {
  const safeLimit = clampLimit(limit, 24);

  const rows = await query<TenantRow>(
    `
    SELECT
      t.id AS tenant_id,
      COALESCE(t.legal_name, t.name) AS tenant_legal_name,
      t.created_at::text AS tenant_created_at,
      ec.connection_status,
      ec.connected_at::text AS connected_at,
      ec.disconnected_at::text AS disconnected_at,
      ec.last_validated_at::text AS last_validated_at,
      ec.last_sync_at::text AS last_sync_at,
      ec.last_error,
      COUNT(DISTINCT CASE WHEN COALESCE(m.status, 'active') <> 'disabled' THEN m.user_id END)::int AS users_count,
      COUNT(DISTINCT c.id)::int AS conversation_count,
      COUNT(DISTINCT s.id)::int AS active_sessions
    FROM external_connections ec
    INNER JOIN tenants t
      ON t.id = ec.tenant_id
    LEFT JOIN memberships m
      ON m.tenant_id = t.id
    LEFT JOIN isaak_conversations c
      ON c.tenant_id = t.id
    LEFT JOIN "Session" s
      ON s."userId" = m.user_id
     AND s.expires > now()
    WHERE ec.provider = 'holded'
      AND ec.channel_key = 'chatgpt'
    GROUP BY
      t.id,
      COALESCE(t.legal_name, t.name),
      t.created_at,
      ec.connection_status,
      ec.connected_at,
      ec.disconnected_at,
      ec.last_validated_at,
      ec.last_sync_at,
      ec.last_error,
      ec.updated_at
    ORDER BY COALESCE(ec.last_validated_at, ec.connected_at, ec.disconnected_at, ec.updated_at) DESC NULLS LAST
    LIMIT $1
    `,
    [safeLimit]
  );

  const tenantIds = rows.map((row) => row.tenant_id);
  const tenantDetails =
    tenantIds.length > 0
      ? await query<TenantDetailRow>(
          `
          SELECT
            t.id AS tenant_id,
            t.name AS tenant_name,
            t.legal_name AS tenant_legal_name,
            t.nif AS tenant_nif,
            t.created_at::text AS tenant_created_at,
            tp.tax_id AS profile_tax_id,
            tp.legal_name AS profile_legal_name,
            tp.address AS profile_address,
            tp.postal_code AS profile_postal_code,
            tp.city AS profile_city,
            tp.country AS profile_country,
            tp.email AS profile_email,
            tp.phone AS profile_phone,
            tp.representative AS profile_representative,
            tp.representative_role AS profile_representative_role,
            u.email AS user_email
          FROM tenants t
          LEFT JOIN tenant_profiles tp
            ON tp.tenant_id = t.id
          LEFT JOIN memberships m
            ON m.tenant_id = t.id
           AND COALESCE(m.status, 'active') <> 'disabled'
          LEFT JOIN "User" u
            ON u.id = m.user_id
          WHERE t.id = ANY($1::uuid[])
          ORDER BY t.id ASC
          `,
          [tenantIds]
        )
      : [];

  const tenantReminderRows =
    tenantIds.length > 0
      ? await query<TenantReminderRow>(
          `
          SELECT
            payload->>'tenantId' AS tenant_id,
            MAX("createdAt")::text AS last_sent_at,
            COUNT(*)::int AS reminder_count
          FROM "EmailEvent"
          WHERE template = $1
            AND payload->>'tenantId' = ANY($2::text[])
          GROUP BY payload->>'tenantId'
          `,
          [TENANT_PROFILE_REMINDER_TEMPLATE, tenantIds]
        )
      : [];

  const tenantReminderById = new Map(
    tenantReminderRows
      .filter((row) => row.tenant_id)
      .map((row) => [
        row.tenant_id as string,
        {
          lastReminderSentAt: row.last_sent_at,
          reminderCount: Number(row.reminder_count || 0),
        },
      ])
  );
  const tenantDetailsById = new Map<
    string,
    Omit<TenantDetailRow, 'user_email'> & { user_emails: string[] }
  >();
  for (const tenant of tenantDetails) {
    const existing = tenantDetailsById.get(tenant.tenant_id);
    if (existing) {
      if (tenant.user_email?.trim()) {
        existing.user_emails.push(tenant.user_email);
      }
      continue;
    }

    tenantDetailsById.set(tenant.tenant_id, {
      tenant_id: tenant.tenant_id,
      tenant_name: tenant.tenant_name,
      tenant_legal_name: tenant.tenant_legal_name,
      tenant_nif: tenant.tenant_nif,
      tenant_created_at: tenant.tenant_created_at,
      profile_tax_id: tenant.profile_tax_id,
      profile_legal_name: tenant.profile_legal_name,
      profile_address: tenant.profile_address,
      profile_postal_code: tenant.profile_postal_code,
      profile_city: tenant.profile_city,
      profile_country: tenant.profile_country,
      profile_email: tenant.profile_email,
      profile_phone: tenant.profile_phone,
      profile_representative: tenant.profile_representative,
      profile_representative_role: tenant.profile_representative_role,
      user_emails: tenant.user_email?.trim() ? [tenant.user_email] : [],
    });
  }

  return rows.map((row) => {
    const detail = tenantDetailsById.get(row.tenant_id);
    const taxId = detail?.tenant_nif?.trim() || detail?.profile_tax_id?.trim() || null;
    const tenantEmail = detail?.profile_email?.trim() || null;
    const tenantPhone = detail?.profile_phone?.trim() || null;
    const representative = detail?.profile_representative?.trim() || null;
    const representativeRole = detail?.profile_representative_role?.trim() || null;
    const legalName =
      detail?.tenant_legal_name?.trim() ||
      detail?.profile_legal_name?.trim() ||
      row.tenant_legal_name;
    const address = detail?.profile_address?.trim() || null;
    const postalCode = detail?.profile_postal_code?.trim() || null;
    const city = detail?.profile_city?.trim() || null;
    const country = detail?.profile_country?.trim() || null;
    const missingFields: string[] = [];

    if (!hasText(legalName)) missingFields.push(TENANT_REQUIRED_FIELDS[0]);
    if (!hasText(taxId)) missingFields.push(TENANT_REQUIRED_FIELDS[1]);
    if (!hasText(address)) missingFields.push(TENANT_REQUIRED_FIELDS[2]);
    if (!hasText(postalCode)) missingFields.push(TENANT_REQUIRED_FIELDS[3]);
    if (!hasText(city)) missingFields.push(TENANT_REQUIRED_FIELDS[4]);
    if (!hasText(country)) missingFields.push(TENANT_REQUIRED_FIELDS[5]);
    if (!hasText(tenantEmail)) missingFields.push(TENANT_REQUIRED_FIELDS[6]);
    if (!hasText(tenantPhone)) missingFields.push(TENANT_REQUIRED_FIELDS[7]);
    if (!hasText(representative)) missingFields.push(TENANT_REQUIRED_FIELDS[8]);
    if (!hasText(representativeRole)) missingFields.push(TENANT_REQUIRED_FIELDS[9]);

    const notificationRecipients = uniqueValues([tenantEmail, ...(detail?.user_emails || [])]);
    const profileStartedAt =
      row.connected_at || row.tenant_created_at || detail?.tenant_created_at || null;
    const profileStatus = resolveProfileStatus({
      missingFields,
      startedAt: profileStartedAt,
    });
    const reminderMeta = tenantReminderById.get(row.tenant_id) || {
      lastReminderSentAt: null,
      reminderCount: 0,
    };
    const reminderState = resolveReminderState({
      status: profileStatus,
      recipients: notificationRecipients,
      lastReminderSentAt: reminderMeta.lastReminderSentAt,
    });

    return {
      tenantId: row.tenant_id,
      tenantLegalName: normalizeText(legalName, 'Sin tenant'),
      taxId,
      email: tenantEmail,
      phone: tenantPhone,
      representative,
      representativeRole,
      connectionStatus: row.connection_status || 'disconnected',
      connectedAt: row.connected_at,
      disconnectedAt: row.disconnected_at,
      lastValidatedAt: row.last_validated_at,
      lastSyncAt: row.last_sync_at,
      lastError: row.last_error,
      profileStatus,
      profileStartedAt,
      profileDeadlineAt: resolveProfileDeadline(profileStartedAt),
      missingFields,
      reminderState: reminderState.state,
      reminderCount: reminderMeta.reminderCount,
      lastReminderSentAt: reminderMeta.lastReminderSentAt,
      nextReminderDueAt: reminderState.nextReminderDueAt,
      notificationRecipients,
      usersCount: Number(row.users_count || 0),
      conversationCount: Number(row.conversation_count || 0),
      activeSessions: Number(row.active_sessions || 0),
    };
  });
}

export async function listHoldedDirectConversations(
  limit?: number
): Promise<HoldedDirectConversation[]> {
  const safeLimit = clampLimit(limit, 24);

  const rows = await query<ConversationRow>(
    `
    SELECT
      c.id AS conversation_id,
      c.tenant_id,
      COALESCE(t.legal_name, t.name) AS tenant_legal_name,
      c.user_id,
      u.email AS user_email,
      u.name AS user_name,
      c.title,
      c.context,
      c.summary,
      c.message_count,
      c.last_activity::text AS last_activity
    FROM isaak_conversations c
    INNER JOIN tenants t
      ON t.id = c.tenant_id
    INNER JOIN "User" u
      ON u.id = c.user_id
    WHERE EXISTS (
      SELECT 1
      FROM external_connections ec
      WHERE ec.tenant_id = c.tenant_id
        AND ec.provider = 'holded'
        AND ec.channel_key = 'chatgpt'
    )
    ORDER BY c.last_activity DESC
    LIMIT $1
    `,
    [safeLimit]
  );

  const conversationIds = rows.map((row) => row.conversation_id);
  const messages =
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

  return rows.map((row) => ({
    conversationId: row.conversation_id,
    tenantId: row.tenant_id,
    tenantLegalName: normalizeText(row.tenant_legal_name, 'Sin tenant'),
    userId: row.user_id,
    userEmail: normalizeText(row.user_email, 'sin-email'),
    userName: normalizeText(row.user_name, 'Sin nombre'),
    title: row.title?.trim() || null,
    context: row.context?.trim() || null,
    summary: row.summary?.trim() || null,
    messageCount: Number(row.message_count || 0),
    lastActivity: row.last_activity,
    recentMessages: messages
      .filter((message) => message.conversation_id === row.conversation_id)
      .slice(0, 2)
      .map((message) => ({
        messageId: message.message_id,
        role: message.role,
        contentPreview: buildPreview(message.content),
        createdAt: message.created_at,
      })),
  }));
}

export async function listHoldedDirectActiveSessions(
  limit?: number
): Promise<HoldedDirectSession[]> {
  const safeLimit = clampLimit(limit, 24);

  const rows = await query<SessionRow>(
    `
    SELECT
      s.id AS session_id,
      s."userId" AS user_id,
      u.email AS user_email,
      u.name AS user_name,
      s.expires::text AS expires_at
    FROM "Session" s
    INNER JOIN "User" u
      ON u.id = s."userId"
    WHERE s.expires > now()
      AND EXISTS (
        SELECT 1
        FROM memberships m
        INNER JOIN external_connections ec
          ON ec.tenant_id = m.tenant_id
         AND ec.provider = 'holded'
         AND ec.channel_key = 'chatgpt'
         AND ec.connection_status = 'connected'
          WHERE m.user_id = s."userId"
          AND COALESCE(m.status, 'active') <> 'disabled'
      )
    ORDER BY s.expires ASC
    LIMIT $1
    `,
    [safeLimit]
  );

  const userIds = rows.map((row) => row.user_id);
  const sessionTenants =
    userIds.length > 0
      ? await query<SessionTenantRow>(
          `
          SELECT DISTINCT
            m.user_id,
            t.id AS tenant_id,
            COALESCE(t.legal_name, t.name) AS tenant_legal_name
          FROM memberships m
          INNER JOIN tenants t
            ON t.id = m.tenant_id
          INNER JOIN external_connections ec
            ON ec.tenant_id = m.tenant_id
           AND ec.provider = 'holded'
           AND ec.channel_key = 'chatgpt'
           AND ec.connection_status = 'connected'
          WHERE m.user_id = ANY($1::text[])
            AND COALESCE(m.status, 'active') <> 'disabled'
          ORDER BY COALESCE(t.legal_name, t.name) ASC
          `,
          [userIds]
        )
      : [];

  return rows.map((row) => ({
    sessionId: row.session_id,
    userId: row.user_id,
    userEmail: normalizeText(row.user_email, 'sin-email'),
    userName: normalizeText(row.user_name, 'Sin nombre'),
    expiresAt: row.expires_at,
    tenants: sessionTenants
      .filter((tenant) => tenant.user_id === row.user_id)
      .map((tenant) => ({
        tenantId: tenant.tenant_id,
        tenantLegalName: normalizeText(tenant.tenant_legal_name, 'Sin tenant'),
      })),
  }));
}

export async function getHoldedDirectPanelData(input?: {
  userLimit?: number;
  tenantLimit?: number;
  conversationLimit?: number;
  sessionLimit?: number;
}): Promise<HoldedDirectPanelData> {
  const [summary, allUsers, allTenants, conversations, sessions] = await Promise.all([
    getHoldedDirectSummary(),
    listHoldedDirectUsers(FULL_SYNC_LIMIT),
    listHoldedDirectTenants(FULL_SYNC_LIMIT),
    listHoldedDirectConversations(input?.conversationLimit),
    listHoldedDirectActiveSessions(input?.sessionLimit),
  ]);

  const userProfiles = buildStatusBreakdown(allUsers);
  const tenantProfiles = buildStatusBreakdown(allTenants);
  const visibleUserLimit = clampLimit(input?.userLimit, 8);
  const visibleTenantLimit = clampLimit(input?.tenantLimit, 8);

  return {
    summary: {
      ...summary,
      duplicateEmailUsers: allUsers.filter((user) => user.duplicateEmailConflict).length,
      dueReminders:
        allUsers.filter((user) => user.reminderState === 'due').length +
        allTenants.filter((tenant) => tenant.reminderState === 'due').length,
      userProfiles,
      tenantProfiles,
    },
    users: allUsers.slice(0, visibleUserLimit),
    tenants: allTenants.slice(0, visibleTenantLimit),
    conversations,
    sessions,
  };
}

export async function sendDueHoldedDirectProfileReminders(): Promise<HoldedDirectReminderResult> {
  const [users, tenants] = await Promise.all([
    listHoldedDirectUsers(FULL_SYNC_LIMIT),
    listHoldedDirectTenants(FULL_SYNC_LIMIT),
  ]);

  let sentUsers = 0;
  let failedUsers = 0;
  let sentTenants = 0;
  let failedTenants = 0;

  for (const user of users) {
    if (user.reminderState !== 'due') continue;

    const email = buildUserReminderEmail(user);
    try {
      const result = await sendTransactionalEmail({
        to: user.notificationRecipients,
        subject: email.subject,
        html: email.html,
        replyTo: 'soporte@verifactu.business',
      });

      await recordReminderEmailEvent({
        to: user.notificationRecipients,
        template: USER_PROFILE_REMINDER_TEMPLATE,
        subject: email.subject,
        payload: {
          scope: 'user',
          userId: user.userId,
          email: user.userEmail,
          missingFields: user.missingFields,
          profileStatus: user.profileStatus,
          deadlineAt: user.profileDeadlineAt,
        },
        userId: user.userId,
        messageId: extractMessageId(result),
        status: 'SENT',
      });
      sentUsers += 1;
    } catch (error) {
      await recordReminderEmailEvent({
        to: user.notificationRecipients,
        template: USER_PROFILE_REMINDER_TEMPLATE,
        subject: email.subject,
        payload: {
          scope: 'user',
          userId: user.userId,
          email: user.userEmail,
          missingFields: user.missingFields,
          profileStatus: user.profileStatus,
          deadlineAt: user.profileDeadlineAt,
        },
        userId: user.userId,
        status: 'FAILED',
        lastError: error instanceof Error ? error.message : String(error),
      });
      failedUsers += 1;
    }
  }

  for (const tenant of tenants) {
    if (tenant.reminderState !== 'due') continue;

    const email = buildTenantReminderEmail(tenant);
    try {
      const result = await sendTransactionalEmail({
        to: tenant.notificationRecipients,
        subject: email.subject,
        html: email.html,
        replyTo: 'soporte@verifactu.business',
      });

      await recordReminderEmailEvent({
        to: tenant.notificationRecipients,
        template: TENANT_PROFILE_REMINDER_TEMPLATE,
        subject: email.subject,
        payload: {
          scope: 'tenant',
          tenantId: tenant.tenantId,
          tenantLegalName: tenant.tenantLegalName,
          missingFields: tenant.missingFields,
          profileStatus: tenant.profileStatus,
          deadlineAt: tenant.profileDeadlineAt,
        },
        messageId: extractMessageId(result),
        status: 'SENT',
      });
      sentTenants += 1;
    } catch (error) {
      await recordReminderEmailEvent({
        to: tenant.notificationRecipients,
        template: TENANT_PROFILE_REMINDER_TEMPLATE,
        subject: email.subject,
        payload: {
          scope: 'tenant',
          tenantId: tenant.tenantId,
          tenantLegalName: tenant.tenantLegalName,
          missingFields: tenant.missingFields,
          profileStatus: tenant.profileStatus,
          deadlineAt: tenant.profileDeadlineAt,
        },
        status: 'FAILED',
        lastError: error instanceof Error ? error.message : String(error),
      });
      failedTenants += 1;
    }
  }

  return {
    sentUsers,
    failedUsers,
    sentTenants,
    failedTenants,
  };
}
