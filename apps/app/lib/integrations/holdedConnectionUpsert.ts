/**
 * Helper compartido para crear o actualizar una conexión Holded a partir de una
 * API key, capturando email personal + identidad de empresa en una sola pasada.
 *
 * Es la pieza F1.2 de la arquitectura unificada descrita en
 * `docs/product/HOLDED_CONNECTORS_UNIFIED_ARCHITECTURE_2026.md`. Esta función es
 * idempotente y se llama desde:
 *   1. El endpoint HTTP `POST /api/integrations/holded/upsert-from-key`
 *      (ChatGPT mobile self-contained form / dashboard manual reconectar).
 *   2. La pantalla de consentimiento del MCP de Claude (cuando F3 lo conecte
 *      vía HTTP a este endpoint en lugar de re-implementar la lógica).
 *
 * Garantías:
 *   - Existe (o se crea) un `User` con `authProvider = HOLDED_DIRECT` cuyo email
 *     es el `personalEmail` del flujo.
 *   - Existe (o se crea) un `Tenant` para ese usuario; si el caller aporta
 *     `companyTaxId` o `companyName` se usa para enriquecer `TenantProfile`.
 *   - Existe (o se crea) un `Membership` activo (role 'owner', side 'client').
 *   - Existe (o se actualiza) una `ExternalConnection` con
 *     `provider = 'holded'` y `channelKey` igual al canal del flujo.
 *   - Se disparan los emails de bienvenida personal + admin empresa.
 *
 * No mintea cookies de sesión ni códigos OAuth: eso es responsabilidad del
 * caller (el endpoint HTTP wrapper en F2 y la consent screen en F3).
 */

import { prisma } from '@/lib/prisma';
import {
  encryptIntegrationSecret,
  probeAccountingApiConnection,
  type HoldedProbeProfile,
  type HoldedProbeResult,
} from '@/lib/integrations/accounting';
import {
  upsertAccountingIntegration,
  type AccountingIntegrationChannel,
} from '@/lib/integrations/accountingStore';
import { normalizeHoldedApiKey } from '@/lib/integrations/holdedApiKey';
import {
  sendHoldedConnectionLifecycleEmails,
  sendWelcomeLifecycleEmails,
} from '@/lib/email/holdedConnectionEmails';
import { getPreferredFullName, splitFullName } from '@/lib/personName';

const DEFAULT_LEGAL_VERSION =
  process.env.HOLDED_CONNECTION_LEGAL_VERSION?.trim() || 'holded_connection_v1';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type HoldedConnectionUpsertChannel = AccountingIntegrationChannel;

export type HoldedConnectionUpsertSource =
  | 'chatgpt_oauth_form'
  | 'chatgpt_mobile_form'
  | 'claude_consent_screen'
  | 'dashboard_manual'
  | 'admin_panel'
  | (string & {});

export type HoldedConnectionUpsertInput = {
  personalEmail: string;
  personalName?: string | null;
  holdedApiKey: string;
  channel: HoldedConnectionUpsertChannel;
  acceptedTerms: boolean;
  acceptedPrivacy: boolean;
  source?: HoldedConnectionUpsertSource | null;
  companyName?: string | null;
  companyLegalName?: string | null;
  companyTaxId?: string | null;
  companyEmail?: string | null;
  companyPhone?: string | null;
  legalAcceptanceVersion?: string | null;
  validatedProbe?: HoldedProbeResult | null;
  skipProbe?: boolean;
  skipNotifications?: boolean;
};

export type HoldedConnectionUpsertSuccess = {
  ok: true;
  userId: string;
  tenantId: string;
  connectionId: string;
  status: 'connected' | 'error';
  probe: HoldedProbeResult;
  legalAcceptedAt: string;
  created: { user: boolean; tenant: boolean; membership: boolean };
};

export type HoldedConnectionUpsertFailure = {
  ok: false;
  stage: 'input' | 'probe' | 'persist' | 'notify';
  reason: string;
  detail?: string;
  probe?: HoldedProbeResult | null;
};

export type HoldedConnectionUpsertResult =
  | HoldedConnectionUpsertSuccess
  | HoldedConnectionUpsertFailure;

function normalizeEmail(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim().toLowerCase();
  if (!trimmed || !EMAIL_REGEX.test(trimmed)) return null;
  return trimmed;
}

function normalizeText(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function profileForChannel(channel: HoldedConnectionUpsertChannel): HoldedProbeProfile {
  return channel === 'chatgpt' || channel === 'mobile' ? 'chatgpt' : 'dashboard';
}

function fallbackTenantName(personalEmail: string, companyName?: string | null) {
  const explicit = normalizeText(companyName);
  if (explicit) return explicit;
  const localPart = personalEmail.split('@')[0]?.trim();
  const domain = personalEmail.split('@')[1]?.trim();
  if (domain && !/(gmail|hotmail|yahoo|outlook|icloud|live|msn)\./i.test(domain)) {
    return domain.replace(/\.(com|es|net|org|io)$/i, '').replace(/-/g, ' ');
  }
  return `${localPart || 'Holded'} workspace`;
}

async function ensureUserByEmail(args: {
  email: string;
  fullName: string | null;
}): Promise<{ id: string; created: boolean }> {
  const existing = await prisma.user.findUnique({
    where: { email: args.email },
    select: { id: true, name: true, firstName: true, lastName: true, authProvider: true },
  });

  const nameParts = splitFullName(args.fullName);
  const preferredName = getPreferredFullName({
    fullName: args.fullName,
    firstName: nameParts.firstName,
    lastName: nameParts.lastName,
    email: args.email,
    fallback: args.email.split('@')[0] || 'Usuario Holded',
  });

  if (existing) {
    const shouldPatch =
      !existing.authProvider ||
      (!existing.name && Boolean(preferredName)) ||
      (!existing.firstName && Boolean(nameParts.firstName)) ||
      (!existing.lastName && Boolean(nameParts.lastName));

    if (shouldPatch) {
      await prisma.user.update({
        where: { id: existing.id },
        data: {
          authProvider: existing.authProvider ?? 'HOLDED_DIRECT',
          name: existing.name ?? preferredName,
          firstName: existing.firstName ?? nameParts.firstName ?? undefined,
          lastName: existing.lastName ?? nameParts.lastName ?? undefined,
        },
      });
    }
    return { id: existing.id, created: false };
  }

  const created = await prisma.user.create({
    data: {
      email: args.email,
      name: preferredName,
      firstName: nameParts.firstName || undefined,
      lastName: nameParts.lastName || undefined,
      authProvider: 'HOLDED_DIRECT',
    },
    select: { id: true },
  });

  return { id: created.id, created: true };
}

async function ensureTenantForUser(args: {
  userId: string;
  personalEmail: string;
  companyName?: string | null;
  companyLegalName?: string | null;
  companyTaxId?: string | null;
  companyEmail?: string | null;
  companyPhone?: string | null;
}): Promise<{ tenantId: string; tenantCreated: boolean; membershipCreated: boolean }> {
  const taxId = normalizeText(args.companyTaxId);

  const existingMemberships = await prisma.membership.findMany({
    where: {
      userId: args.userId,
      status: 'active',
      tenant: { isDemo: false },
    },
    include: { tenant: { select: { id: true, name: true, nif: true } } },
    orderBy: { createdAt: 'asc' },
  });

  let reuseTenantId =
    existingMemberships.find((m) => taxId && m.tenant.nif?.toLowerCase() === taxId.toLowerCase())
      ?.tenantId ??
    existingMemberships[0]?.tenantId ??
    null;

  if (!reuseTenantId && taxId) {
    const matchedTenant = await prisma.tenant.findFirst({
      where: { nif: { equals: taxId, mode: 'insensitive' }, isDemo: false },
      select: { id: true },
    });
    if (matchedTenant) reuseTenantId = matchedTenant.id;
  }

  let tenantCreated = false;
  let membershipCreated = false;

  let tenantId: string;
  if (reuseTenantId) {
    tenantId = reuseTenantId;
  } else {
    const tenantName = fallbackTenantName(args.personalEmail, args.companyName);
    const legalName = normalizeText(args.companyLegalName) ?? tenantName;
    const newTenant = await prisma.tenant.create({
      data: {
        name: tenantName,
        legalName,
        nif: taxId ?? undefined,
        isDemo: false,
      },
      select: { id: true },
    });
    tenantId = newTenant.id;
    tenantCreated = true;
  }

  const existingMembership = await prisma.membership.findFirst({
    where: { tenantId, userId: args.userId },
    select: { id: true, status: true, role: true, side: true },
  });

  if (!existingMembership) {
    await prisma.membership.create({
      data: {
        tenantId,
        userId: args.userId,
        role: 'owner',
        side: 'client',
        status: 'active',
        confirmedAt: new Date(),
      },
    });
    membershipCreated = true;
  } else if (existingMembership.status !== 'active') {
    await prisma.membership.update({
      where: { id: existingMembership.id },
      data: { status: 'active', disabledAt: null, confirmedAt: new Date() },
    });
  }

  const companyEmail = normalizeText(args.companyEmail);
  const companyPhone = normalizeText(args.companyPhone);
  const tradeName = normalizeText(args.companyName);
  const legalName = normalizeText(args.companyLegalName);

  if (taxId || companyEmail || companyPhone || tradeName || legalName) {
    const profile = await prisma.tenantProfile.findUnique({
      where: { tenantId },
      select: { taxId: true, legalName: true, tradeName: true, email: true, phone: true },
    });

    const nextTaxId = !profile?.taxId && taxId ? taxId : undefined;
    const nextLegalName = !profile?.legalName && legalName ? legalName : undefined;
    const nextTradeName = !profile?.tradeName && tradeName ? tradeName : undefined;
    const nextEmail = !profile?.email && companyEmail ? companyEmail : undefined;
    const nextPhone = !profile?.phone && companyPhone ? companyPhone : undefined;
    const hasPatch = Boolean(nextTaxId || nextLegalName || nextTradeName || nextEmail || nextPhone);

    if (hasPatch) {
      await prisma.tenantProfile.upsert({
        where: { tenantId },
        create: {
          tenantId,
          source: 'holded_connector_form',
          taxId: taxId ?? undefined,
          legalName: legalName ?? undefined,
          tradeName: tradeName ?? undefined,
          email: companyEmail ?? undefined,
          phone: companyPhone ?? undefined,
        },
        update: {
          taxId: nextTaxId,
          legalName: nextLegalName,
          tradeName: nextTradeName,
          email: nextEmail,
          phone: nextPhone,
        },
      });
    } else if (!profile) {
      await prisma.tenantProfile.upsert({
        where: { tenantId },
        create: { tenantId, source: 'holded_connector_form' },
        update: {},
      });
    }
  }

  await prisma.userPreference.upsert({
    where: { userId: args.userId },
    create: { userId: args.userId, preferredTenantId: tenantId },
    update: {},
  });

  return { tenantId, tenantCreated, membershipCreated };
}

export async function upsertHoldedConnectionFromApiKey(
  rawInput: HoldedConnectionUpsertInput
): Promise<HoldedConnectionUpsertResult> {
  const personalEmail = normalizeEmail(rawInput.personalEmail);
  if (!personalEmail) {
    return {
      ok: false,
      stage: 'input',
      reason: 'invalid_personal_email',
      detail: 'personalEmail must be a valid email address',
    };
  }

  const apiKey = normalizeHoldedApiKey(
    typeof rawInput.holdedApiKey === 'string' ? rawInput.holdedApiKey : ''
  );
  if (!apiKey) {
    return {
      ok: false,
      stage: 'input',
      reason: 'missing_api_key',
      detail: 'holdedApiKey is required',
    };
  }

  if (rawInput.acceptedTerms !== true || rawInput.acceptedPrivacy !== true) {
    return {
      ok: false,
      stage: 'input',
      reason: 'legal_acceptance_required',
      detail: 'acceptedTerms and acceptedPrivacy must both be true',
    };
  }

  const channel: HoldedConnectionUpsertChannel = (
    ['dashboard', 'chatgpt', 'mobile', 'claude'] as const
  ).includes(rawInput.channel as HoldedConnectionUpsertChannel)
    ? rawInput.channel
    : ('dashboard' as const);

  const profile = profileForChannel(channel);

  let probe: HoldedProbeResult;
  try {
    if (rawInput.validatedProbe) {
      probe = rawInput.validatedProbe;
    } else if (rawInput.skipProbe) {
      probe = {
        ok: true,
        provider: 'holded',
        profile,
        invoiceApi: { ok: true, status: 200 },
        contactsApi: { ok: true, status: 200 },
        accountingApi: { ok: true, status: 200 },
        crmApi: { ok: true, status: 200 },
        projectsApi: { ok: true, status: 200 },
        teamApi: { ok: true, status: 200 },
        requiredCapabilities: [],
        missingCapabilities: [],
        error: null,
      };
    } else {
      probe = await probeAccountingApiConnection(apiKey, { profile });
    }
  } catch (error) {
    return {
      ok: false,
      stage: 'probe',
      reason: 'probe_failed',
      detail: error instanceof Error ? error.message : String(error),
      probe: null,
    };
  }

  // Si la API key es inválida no creamos User/Tenant: sería ruido para
  // governance (usuarios fantasma que no llegan a conectar). Devolvemos un
  // error explícito y dejamos que el caller muestre el mensaje al usuario.
  if (!probe.ok) {
    return {
      ok: false,
      stage: 'probe',
      reason: 'invalid_api_key',
      detail: probe.error ?? 'Holded API key validation failed',
      probe,
    };
  }

  const status: 'connected' | 'error' = 'connected';
  const lastError: string | null = null;

  let userId: string;
  let userCreated: boolean;
  let tenantId: string;
  let tenantCreated: boolean;
  let membershipCreated: boolean;
  let connectionId: string;
  const legalAcceptedAt = new Date();
  const legalAcceptanceVersion =
    normalizeText(rawInput.legalAcceptanceVersion) ?? DEFAULT_LEGAL_VERSION;

  try {
    const personalNameNormalized = normalizeText(rawInput.personalName);
    const userResult = await ensureUserByEmail({
      email: personalEmail,
      fullName: personalNameNormalized,
    });
    userId = userResult.id;
    userCreated = userResult.created;

    const tenantResult = await ensureTenantForUser({
      userId,
      personalEmail,
      companyName: rawInput.companyName,
      companyLegalName: rawInput.companyLegalName,
      companyTaxId: rawInput.companyTaxId,
      companyEmail: rawInput.companyEmail,
      companyPhone: rawInput.companyPhone,
    });
    tenantId = tenantResult.tenantId;
    tenantCreated = tenantResult.tenantCreated;
    membershipCreated = tenantResult.membershipCreated;

    const apiKeyEnc = encryptIntegrationSecret(apiKey);
    const saved = await upsertAccountingIntegration({
      tenantId,
      apiKeyEnc,
      status,
      lastError,
      connectedByUserId: userId,
      channelKey: channel,
      legalTermsAcceptedAt: legalAcceptedAt,
      legalPrivacyAcceptedAt: legalAcceptedAt,
      legalAcceptanceVersion,
    });
    connectionId = saved.id;
  } catch (error) {
    return {
      ok: false,
      stage: 'persist',
      reason: 'persist_failed',
      detail: error instanceof Error ? error.message : String(error),
      probe,
    };
  }

  if (probe.ok && !rawInput.skipNotifications) {
    try {
      const tenantRecord = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: {
          name: true,
          legalName: true,
          profile: {
            select: { legalName: true, tradeName: true, email: true, phone: true },
          },
        },
      });

      const companyEmailFinal =
        normalizeText(rawInput.companyEmail) ??
        normalizeText(probe.companyInfo?.email) ??
        tenantRecord?.profile?.email ??
        null;

      const emailContext = {
        userEmail: personalEmail,
        userName: normalizeText(rawInput.personalName),
        tenantName: tenantRecord?.profile?.tradeName || tenantRecord?.name || 'tu empresa',
        tenantLegalName: tenantRecord?.profile?.legalName || tenantRecord?.legalName || null,
        contactName: normalizeText(rawInput.personalName),
        contactEmail: personalEmail,
        companyEmail: companyEmailFinal,
        contactPhone: tenantRecord?.profile?.phone || normalizeText(rawInput.companyPhone),
        channel,
      };

      if (userCreated || tenantCreated) {
        await sendWelcomeLifecycleEmails(emailContext);
      } else {
        await sendHoldedConnectionLifecycleEmails({
          ...emailContext,
          action: 'connected',
          channel,
        });
      }
    } catch (notifyError) {
      console.error('[holdedConnectionUpsert] notify_failed', {
        userId,
        tenantId,
        channel,
        message: notifyError instanceof Error ? notifyError.message : String(notifyError),
      });
    }
  }

  return {
    ok: true,
    userId,
    tenantId,
    connectionId,
    status,
    probe,
    legalAcceptedAt: legalAcceptedAt.toISOString(),
    created: { user: userCreated, tenant: tenantCreated, membership: membershipCreated },
  };
}
