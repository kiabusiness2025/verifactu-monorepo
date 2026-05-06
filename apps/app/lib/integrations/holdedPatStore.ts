/**
 * Personal Access Token (PAT) store for the Holded MCP connector.
 *
 * Tokens are issued as `hldmcp_<32-bytes-base64url>` strings. We persist only
 * the SHA-256 hash; the cleartext is shown to the user once at creation. PATs
 * are an alternative to OAuth for clients where the OAuth flow is impractical
 * — most importantly ChatGPT iOS, where the in-app browser breaks Firebase
 * `getRedirectResult` and the OAuth roundtrip cannot complete.
 *
 * A PAT is bound to an `ExternalConnection` row (tenant + provider + channel)
 * so the underlying Holded API key it resolves to is the SAME key the OAuth
 * flow would have produced. No new credential surface — the PAT is just a
 * different way to prove the bearer is the tenant.
 */

import { createHash, randomBytes } from 'node:crypto';
import { prisma } from '@verifactu/db';

export const PAT_PREFIX = 'hldmcp_';
/** Visible part shown in lists. e.g. "hldmcp_AbCd". */
const VISIBLE_PREFIX_LENGTH = 4;
/** Number of random bytes encoded into the cleartext token (~43 chars base64url). */
const PAT_RANDOM_BYTES = 32;

/** Default scopes for a freshly created PAT — same as a typical OAuth grant. */
export const DEFAULT_PAT_SCOPES = ['holded:read', 'holded:write_drafts'] as const;

export type CreatePatInput = {
  tenantId: string;
  createdByUserId: string;
  /** Channel this PAT is for. "chatgpt" | "claude" | "dashboard". */
  channelKey: 'chatgpt' | 'claude' | 'dashboard';
  /** Human-friendly name shown in the dashboard list. */
  name: string;
  /** Optional ExternalConnection row to bind this PAT to. */
  connectionId?: string | null;
  /** Optional scopes — defaults to DEFAULT_PAT_SCOPES. */
  scopes?: readonly string[];
  /** Optional expiry. Null = no expiry. */
  expiresAt?: Date | null;
};

export type CreatePatResult = {
  /** The plaintext token. SHOW IT TO THE USER ONCE — never persisted. */
  token: string;
  id: string;
  keyPrefix: string;
  scopes: string[];
  createdAt: Date;
  expiresAt: Date | null;
};

export type VerifiedPat = {
  id: string;
  tenantId: string;
  channelKey: string;
  scopes: string[];
  connectionId: string | null;
};

/** SHA-256 of a cleartext PAT — what we persist and look up. */
export function hashPat(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

/**
 * Generate a cleartext PAT.
 * Format: `hldmcp_<43 chars base64url>`. Crockford-style, no padding.
 */
export function generatePatString(): string {
  const random = randomBytes(PAT_RANDOM_BYTES).toString('base64url');
  return `${PAT_PREFIX}${random}`;
}

/** Visible prefix used for listing tokens in the UI. */
export function patPrefixOf(token: string): string {
  return token.slice(0, PAT_PREFIX.length + VISIBLE_PREFIX_LENGTH);
}

/**
 * Create a new PAT for a tenant. Returns the cleartext token ONLY here —
 * downstream callers must surface it to the user once and never persist it
 * client-side beyond the immediate "copy to clipboard" affordance.
 */
export async function createPat(input: CreatePatInput): Promise<CreatePatResult> {
  const token = generatePatString();
  const keyHash = hashPat(token);
  const keyPrefix = patPrefixOf(token);
  const scopes = [...(input.scopes ?? DEFAULT_PAT_SCOPES)];

  const created = await prisma.holdedMcpPersonalAccessToken.create({
    data: {
      tenantId: input.tenantId,
      createdByUserId: input.createdByUserId,
      connectionId: input.connectionId ?? null,
      channelKey: input.channelKey,
      name: input.name,
      keyHash,
      keyPrefix,
      scopes,
      expiresAt: input.expiresAt ?? null,
    },
  });

  await prisma.holdedMcpPatAuditLog.create({
    data: {
      tenantId: input.tenantId,
      patId: created.id,
      event: 'created',
      channel: input.channelKey,
      meta: { scopes, expiresAt: input.expiresAt ?? null },
    },
  });

  return {
    token,
    id: created.id,
    keyPrefix,
    scopes,
    createdAt: created.createdAt,
    expiresAt: created.expiresAt,
  };
}

/** Look up a PAT by cleartext token + verify it's valid (not revoked/expired). */
export async function verifyPat(token: string): Promise<VerifiedPat | null> {
  if (!token.startsWith(PAT_PREFIX)) return null;
  const keyHash = hashPat(token);
  const row = await prisma.holdedMcpPersonalAccessToken.findUnique({
    where: { keyHash },
  });
  if (!row) return null;
  if (row.revokedAt) return null;
  if (row.expiresAt && row.expiresAt.getTime() < Date.now()) return null;

  // Best-effort lastUsedAt update — don't fail verification if the write fails
  // (e.g., transient DB issue). The verification itself already succeeded.
  prisma.holdedMcpPersonalAccessToken
    .update({ where: { id: row.id }, data: { lastUsedAt: new Date() } })
    .catch(() => {
      /* ignore */
    });

  return {
    id: row.id,
    tenantId: row.tenantId,
    channelKey: row.channelKey,
    scopes: row.scopes,
    connectionId: row.connectionId,
  };
}

/** Mark a PAT as revoked. Idempotent. */
export async function revokePat(args: {
  tenantId: string;
  patId: string;
  reason?: string;
}): Promise<{ revoked: boolean }> {
  const updated = await prisma.holdedMcpPersonalAccessToken.updateMany({
    where: { id: args.patId, tenantId: args.tenantId, revokedAt: null },
    data: { revokedAt: new Date() },
  });

  if (updated.count > 0) {
    await prisma.holdedMcpPatAuditLog.create({
      data: {
        tenantId: args.tenantId,
        patId: args.patId,
        event: 'revoked',
        meta: args.reason ? { reason: args.reason } : undefined,
      },
    });
  }

  return { revoked: updated.count > 0 };
}

/** List PATs for a tenant — never returns the keyHash, only the visible prefix. */
export async function listPatsForTenant(tenantId: string) {
  return prisma.holdedMcpPersonalAccessToken.findMany({
    where: { tenantId },
    orderBy: [{ revokedAt: 'asc' }, { createdAt: 'desc' }],
    select: {
      id: true,
      name: true,
      channelKey: true,
      keyPrefix: true,
      scopes: true,
      lastUsedAt: true,
      expiresAt: true,
      revokedAt: true,
      createdAt: true,
      createdByUserId: true,
    },
  });
}

/**
 * Audit a PAT usage event. Best-effort — we never block a request if audit
 * logging fails. Use a short Promise chain in callers, no await.
 */
export async function logPatUsage(args: {
  tenantId: string;
  patId: string | null;
  channel?: string | null;
  toolName?: string | null;
  status?: number | null;
  ip?: string | null;
  userAgent?: string | null;
  meta?: Record<string, unknown> | null;
  event?: 'used' | 'rejected';
}): Promise<void> {
  try {
    await prisma.holdedMcpPatAuditLog.create({
      data: {
        tenantId: args.tenantId,
        patId: args.patId,
        event: args.event ?? 'used',
        channel: args.channel ?? null,
        toolName: args.toolName ?? null,
        status: args.status ?? null,
        ip: args.ip ?? null,
        userAgent: args.userAgent ?? null,
        meta: (args.meta as never) ?? undefined,
      },
    });
  } catch (error) {
    // Audit logging failure is non-fatal — log to stderr only.
    console.warn('[holdedPatStore] audit log failed', {
      patId: args.patId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
