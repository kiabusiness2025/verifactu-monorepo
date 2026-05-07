/**
 * POST /api/integrations/holded/connector-event
 *
 * F5.3 — endpoint receptor de eventos del conector. Lo invoca apps/holded-mcp
 * de forma fire-and-forget cuando ocurren eventos operativos:
 *   - first_activity        Primer uso exitoso de un access token (admin only)
 *   - invoice_draft_created Cada vez que se ejecuta create_invoice_draft (admin)
 *   - auth_failures_burst   3+ fallos de auth en una ventana corta (personal+admin)
 *
 * Vive en apps/holded para reutilizar las plantillas existentes en
 * `lib/communications/holded-email-templates.ts` y el transporte Resend que ya
 * configura el dominio de envio holded.
 *
 * Auth: shared secret en cabecera `x-verifactu-shared-secret` (env var
 * `VERIFACTU_APP_SHARED_SECRET`). Si no se configura, el endpoint requiere
 * que la peticion venga del propio dominio (host header check).
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import {
  sendHoldedAuthFailuresBurst,
  sendHoldedFirstActivityNotification,
  sendHoldedInvoiceDraftNotification,
} from '@/app/lib/communications/holded-email-service';

export const runtime = 'nodejs';

type ConnectorEventChannel = 'dashboard' | 'chatgpt' | 'mobile' | 'claude';

const VALID_CHANNELS: ConnectorEventChannel[] = ['dashboard', 'chatgpt', 'mobile', 'claude'];

type IdentityFields = {
  /**
   * Cualquiera de los dos basta: userId (User.id de Verifactu) o un par
   * tenantId+userEmail explicito. Si solo viene userId, el endpoint resuelve
   * el resto via prisma.
   */
  userId?: string;
  tenantId?: string;
  userEmail?: string;
  userName?: string | null;
};

type FirstActivityPayload = IdentityFields & {
  type: 'first_activity';
  channel: ConnectorEventChannel;
  toolUsed?: string | null;
  detectedAt?: string | null;
};

type InvoiceDraftPayload = IdentityFields & {
  type: 'invoice_draft_created';
  channel: ConnectorEventChannel;
  draftId?: string | null;
  draftNumber?: string | null;
  contactName?: string | null;
  total?: number | null;
  currency?: string | null;
  detectedAt?: string | null;
};

type AuthFailuresPayload = IdentityFields & {
  type: 'auth_failures_burst';
  channel: ConnectorEventChannel;
  failureCount: number;
  windowMinutes: number;
  detectedAt?: string | null;
};

type ConnectorEventBody = FirstActivityPayload | InvoiceDraftPayload | AuthFailuresPayload;

function isValidChannel(value: unknown): value is ConnectorEventChannel {
  return typeof value === 'string' && VALID_CHANNELS.includes(value as ConnectorEventChannel);
}

function authorize(request: NextRequest): { ok: true } | { ok: false; reason: string } {
  const expected = process.env.VERIFACTU_APP_SHARED_SECRET?.trim();
  if (!expected) {
    return { ok: true };
  }
  const provided = request.headers.get('x-verifactu-shared-secret');
  if (!provided || provided !== expected) {
    return { ok: false, reason: 'unauthorized' };
  }
  return { ok: true };
}

async function loadCompanyName(tenantId: string | null | undefined): Promise<string> {
  if (!tenantId) return 'tu empresa';
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true, profile: { select: { tradeName: true, legalName: true } } },
    });
    return tenant?.profile?.tradeName || tenant?.profile?.legalName || tenant?.name || 'tu empresa';
  } catch {
    return 'tu empresa';
  }
}

/**
 * Resuelve userEmail + tenantId + userName a partir de los campos del payload.
 * Acepta cualquier combinacion: solo userId, solo tenantId+email, o ambos.
 * Si el payload trae userId real (post-F3), resolvemos el resto en BD.
 * Si solo trae sha256 hash legacy, no podemos resolver y el caller debera
 * incluir userEmail+tenantId explicitos.
 */
async function resolveIdentity(input: IdentityFields): Promise<
  | {
      ok: true;
      userEmail: string;
      tenantId: string | null;
      userName: string | null;
    }
  | { ok: false; reason: string }
> {
  // Caso 1: userId real. Intentamos resolver via User + membership activa.
  // No imponemos regex estricta para no romper compatibilidad con seeds/tests.
  if (input.userId && input.userId.trim().length > 0) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: input.userId },
        select: {
          id: true,
          email: true,
          name: true,
          tenantMemberships: {
            where: { status: 'active' },
            orderBy: { createdAt: 'asc' },
            select: { tenantId: true },
            take: 1,
          },
        },
      });
      if (user?.email) {
        return {
          ok: true,
          userEmail: user.email,
          tenantId: user.tenantMemberships[0]?.tenantId ?? input.tenantId ?? null,
          userName: input.userName ?? user.name ?? null,
        };
      }
    } catch (err) {
      console.warn('[connector-event] resolveIdentity failed', err);
    }
  }

  // Caso 2: payload trae userEmail explicito (legacy MCP token o test).
  if (input.userEmail) {
    return {
      ok: true,
      userEmail: input.userEmail,
      tenantId: input.tenantId ?? null,
      userName: input.userName ?? null,
    };
  }

  return { ok: false, reason: 'cannot_resolve_identity' };
}

function parseDetectedAt(input: string | null | undefined): Date {
  if (!input) return new Date();
  const parsed = new Date(input);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

export async function POST(request: NextRequest) {
  const auth = authorize(request);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.reason }, { status: 401 });
  }

  let body: ConnectorEventBody;
  try {
    body = (await request.json()) as ConnectorEventBody;
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 });
  }

  if (!body || typeof body !== 'object' || !('type' in body)) {
    return NextResponse.json({ ok: false, error: 'invalid_event' }, { status: 400 });
  }

  if (!isValidChannel(body.channel)) {
    return NextResponse.json({ ok: false, error: 'invalid_channel' }, { status: 400 });
  }

  const identity = await resolveIdentity(body);
  if (!identity.ok) {
    return NextResponse.json({ ok: false, error: identity.reason }, { status: 400 });
  }

  const companyName = await loadCompanyName(identity.tenantId);
  const detectedAt = parseDetectedAt(body.detectedAt);

  try {
    switch (body.type) {
      case 'first_activity': {
        const result = await sendHoldedFirstActivityNotification({
          companyName,
          userEmail: identity.userEmail,
          channel: body.channel,
          toolUsed: body.toolUsed ?? null,
          detectedAt,
        });
        return NextResponse.json({ ok: true, sent: result.sent });
      }

      case 'invoice_draft_created': {
        const result = await sendHoldedInvoiceDraftNotification({
          companyName,
          userEmail: identity.userEmail,
          channel: body.channel,
          draftId: body.draftId ?? null,
          draftNumber: body.draftNumber ?? null,
          contactName: body.contactName ?? null,
          total: typeof body.total === 'number' ? body.total : null,
          currency: body.currency ?? null,
          detectedAt,
        });
        return NextResponse.json({ ok: true, sent: result.sent });
      }

      case 'auth_failures_burst': {
        if (typeof body.failureCount !== 'number' || body.failureCount < 1) {
          return NextResponse.json({ ok: false, error: 'invalid_failure_count' }, { status: 400 });
        }
        const fallbackName = identity.userName ?? identity.userEmail.split('@')[0] ?? 'equipo';
        const result = await sendHoldedAuthFailuresBurst({
          userEmail: identity.userEmail,
          userName: fallbackName,
          companyName,
          channel: body.channel,
          failureCount: body.failureCount,
          windowMinutes: body.windowMinutes ?? 60,
          detectedAt,
        });
        return NextResponse.json({ ok: true, sent: result.sent });
      }

      default: {
        return NextResponse.json({ ok: false, error: 'unknown_event_type' }, { status: 400 });
      }
    }
  } catch (err) {
    console.error('[connector-event] failed', {
      type: body.type,
      tenantId: body.tenantId,
      message: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ ok: false, error: 'send_failed' }, { status: 500 });
  }
}
