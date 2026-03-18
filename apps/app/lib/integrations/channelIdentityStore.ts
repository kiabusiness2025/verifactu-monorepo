import { one, query } from '@/lib/db';

type ChannelIdentityInput = {
  userId: string;
  tenantId?: string | null;
  channelType: 'dashboard' | 'chatgpt' | 'internal';
  channelSubjectId: string;
  email?: string | null;
  displayName?: string | null;
  metadata?: Record<string, unknown> | null;
};

let channelIdentitiesTableAvailable: boolean | null = null;

async function hasChannelIdentitiesTable() {
  if (channelIdentitiesTableAvailable !== null) return channelIdentitiesTableAvailable;

  const row = await one<{ exists: boolean }>(
    "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'channel_identities') AS exists"
  );

  channelIdentitiesTableAvailable = row?.exists === true;
  return channelIdentitiesTableAvailable;
}

export async function upsertChannelIdentity(input: ChannelIdentityInput) {
  if (!(await hasChannelIdentitiesTable())) {
    return null;
  }

  return one<{
    id: string;
    user_id: string;
    tenant_id: string | null;
    channel_type: string;
    channel_subject_id: string;
    email: string | null;
    display_name: string | null;
    created_at: string;
    updated_at: string;
  }>(
    [
      'INSERT INTO channel_identities (',
      '  user_id,',
      '  tenant_id,',
      '  channel_type,',
      '  channel_subject_id,',
      '  email,',
      '  display_name,',
      '  metadata',
      ') VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)',
      'ON CONFLICT (channel_type, channel_subject_id)',
      'DO UPDATE SET',
      '  user_id = EXCLUDED.user_id,',
      '  tenant_id = COALESCE(EXCLUDED.tenant_id, channel_identities.tenant_id),',
      '  email = COALESCE(EXCLUDED.email, channel_identities.email),',
      '  display_name = COALESCE(EXCLUDED.display_name, channel_identities.display_name),',
      '  metadata = COALESCE(EXCLUDED.metadata, channel_identities.metadata),',
      '  updated_at = now()',
      'RETURNING id, user_id, tenant_id, channel_type, channel_subject_id, email, display_name, created_at::text, updated_at::text',
    ].join(' '),
    [
      input.userId,
      input.tenantId ?? null,
      input.channelType,
      input.channelSubjectId,
      input.email ?? null,
      input.displayName ?? null,
      JSON.stringify(input.metadata ?? null),
    ]
  );
}

export async function listChannelIdentitiesForUser(userId: string) {
  if (!(await hasChannelIdentitiesTable())) {
    return [];
  }

  return query<{
    id: string;
    user_id: string;
    tenant_id: string | null;
    channel_type: string;
    channel_subject_id: string;
    email: string | null;
    display_name: string | null;
    created_at: string;
    updated_at: string;
  }>(
    'SELECT id, user_id, tenant_id, channel_type, channel_subject_id, email, display_name, created_at::text, updated_at::text FROM channel_identities WHERE user_id = $1 ORDER BY updated_at DESC',
    [userId]
  );
}
