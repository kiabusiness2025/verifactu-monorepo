#!/usr/bin/env tsx
/**
 * One-shot CLI to mint a Holded MCP Personal Access Token (PAT) by email.
 *
 * Use this BEFORE the dashboard UI (F2) is built. It lets the connector be
 * tested end-to-end on ChatGPT mobile or any client without going through
 * Firebase login + OAuth.
 *
 * Usage:
 *
 *   pnpm tsx apps/app/scripts/create-holded-pat.ts \
 *     --email soporte@verifactu.business \
 *     --name "mobile-test-2026-05-04" \
 *     [--channel chatgpt|claude|dashboard] \
 *     [--expires-in-days 90]
 *
 * The script:
 *   1. Looks up the User by email.
 *   2. Picks the user's primary tenant via Membership (newest active one).
 *   3. Finds the existing Holded ExternalConnection for that tenant.
 *   4. Mints a PAT bound to that connection with the claude_parity scope set.
 *   5. Prints the cleartext token ONCE — copy it immediately, it is not stored.
 */

import { prisma } from '@verifactu/db';
import { createPat } from '../lib/integrations/holdedPatStore';

type Args = {
  email: string;
  name: string;
  channel: 'chatgpt' | 'claude' | 'dashboard';
  expiresInDays: number | null;
};

function parseArgs(argv: string[]): Args {
  const args = new Map<string, string>();
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    if (flag?.startsWith('--')) {
      const value = argv[i + 1];
      if (value && !value.startsWith('--')) {
        args.set(flag.slice(2), value);
        i++;
      } else {
        args.set(flag.slice(2), 'true');
      }
    }
  }

  const email = args.get('email');
  const name = args.get('name');
  if (!email) {
    throw new Error('--email is required (e.g. --email soporte@verifactu.business)');
  }
  if (!name) {
    throw new Error('--name is required (e.g. --name "mobile test 2026-05-04")');
  }

  const channelRaw = args.get('channel') ?? 'chatgpt';
  if (channelRaw !== 'chatgpt' && channelRaw !== 'claude' && channelRaw !== 'dashboard') {
    throw new Error('--channel must be chatgpt, claude or dashboard');
  }

  const expiresInDaysRaw = args.get('expires-in-days');
  const expiresInDays =
    expiresInDaysRaw === undefined || expiresInDaysRaw === '0'
      ? null
      : Number.parseInt(expiresInDaysRaw, 10);
  if (expiresInDays !== null && (!Number.isFinite(expiresInDays) || expiresInDays <= 0)) {
    throw new Error('--expires-in-days must be a positive integer or 0 for no expiry');
  }

  return { email, name, channel: channelRaw, expiresInDays };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  console.log('🔍 Looking up user by email...', args.email);
  const user = await prisma.user.findUnique({ where: { email: args.email } });
  if (!user) {
    throw new Error(
      `No user found for email ${args.email}. Have you logged into Verifactu Business at least once?`
    );
  }
  console.log('  user id:', user.id);

  console.log('🔍 Resolving primary tenant via Membership...');
  const memberships = await prisma.membership.findMany({
    where: { userId: user.id, status: 'active' },
    orderBy: { createdAt: 'desc' },
  });
  if (memberships.length === 0) {
    throw new Error(
      `User ${args.email} has no active Membership. Make sure your account is linked to a tenant.`
    );
  }
  const tenantId = memberships[0]!.tenantId;
  console.log('  tenant id:', tenantId, `(picked newest of ${memberships.length} active)`);

  console.log('🔍 Finding existing Holded ExternalConnection...');
  // Prefer the dashboard connection (where the user pasted the API key).
  // Fall back to chatgpt or any provider=holded row.
  const connection =
    (await prisma.externalConnection.findFirst({
      where: { tenantId, provider: 'holded', channelKey: 'dashboard' },
      orderBy: { connectedAt: 'desc' },
    })) ??
    (await prisma.externalConnection.findFirst({
      where: { tenantId, provider: 'holded' },
      orderBy: { connectedAt: 'desc' },
    }));
  if (!connection) {
    throw new Error(
      'No Holded ExternalConnection found for this tenant. Connect Holded from the dashboard first.'
    );
  }
  console.log(
    '  connection id:',
    connection.id,
    `(channelKey=${connection.channelKey}, status=${connection.connectionStatus})`
  );

  const expiresAt = args.expiresInDays
    ? new Date(Date.now() + args.expiresInDays * 24 * 60 * 60 * 1000)
    : null;

  console.log('✨ Minting PAT...', { name: args.name, channel: args.channel, expiresAt });
  const result = await createPat({
    tenantId,
    createdByUserId: user.id,
    connectionId: connection.id,
    channelKey: args.channel,
    name: args.name,
    expiresAt,
  });

  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ PAT created. COPY THIS TOKEN NOW — it will not be shown again:');
  console.log('');
  console.log('   ' + result.token);
  console.log('');
  console.log('Prefix:    ', result.keyPrefix);
  console.log('Token ID:  ', result.id);
  console.log('Tenant ID: ', tenantId);
  console.log('Channel:   ', args.channel);
  console.log('Scopes:    ', result.scopes.length, 'scopes (claude_parity preset)');
  console.log('Expires:   ', expiresAt ? expiresAt.toISOString() : 'never');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  console.log('To use in ChatGPT mobile:');
  console.log('  Settings → Connectors → Add connector → Custom MCP');
  console.log('  URL:           https://holded.verifactu.business/api/mcp/holded');
  console.log('  Auth header:   Bearer ' + result.token);
  console.log('');
}

main()
  .catch((error) => {
    console.error('❌', error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
