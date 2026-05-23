/**
 * GET /api/cron/connector-health
 *
 * Runs daily (07:00 CET). Two checks:
 *
 * 1. Holded API keys: re-probe any connected tenant whose lastValidatedAt is
 *    null or older than 7 days. If the probe fails, update connectionStatus to
 *    'error' and send an alert email. If it passes, bump lastValidatedAt.
 *
 * 2. Salt Edge connections: any 'active' SeConnection whose lastSyncAt is null
 *    or older than 72 h is considered stale. Creates an isaakAlert (deduplicated
 *    to one per 7-day window) and sends an email.
 */

import { timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import {
  probeHoldedConnection,
  decryptHoldedSecret,
} from '@/app/lib/holded-integration';
import { createAlert } from '@/app/lib/isaak-alert-service';
import { sendConnectorHealthAlert } from '@/app/lib/communications/connector-health-email';

export const runtime = 'nodejs';
export const maxDuration = 120;

function authorizeCron(req: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const token = req.headers.get('authorization') ?? '';
  const expected = `Bearer ${secret}`;
  if (token.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(token), Buffer.from(expected));
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function daysAgo(n: number) {
  return new Date(Date.now() - n * 86_400_000);
}

function hoursAgo(n: number) {
  return new Date(Date.now() - n * 3_600_000);
}

async function getRecipient(tenantId: string) {
  const membership = await prisma.membership.findFirst({
    where: { tenantId, status: 'active' },
    orderBy: { createdAt: 'asc' },
    include: { user: { select: { email: true, firstName: true, name: true } } },
  });
  if (!membership?.user?.email) return null;
  const u = membership.user;
  return {
    email: u.email,
    name: u.firstName || u.name?.split(' ')[0] || null,
  };
}

async function alreadyAlertedRecently(
  tenantId: string,
  type: string,
  withinDays: number
): Promise<boolean> {
  const existing = await prisma.isaakAlert.findFirst({
    where: {
      tenantId,
      type,
      createdAt: { gte: daysAgo(withinDays) },
    },
  });
  return existing !== null;
}

// ── Holded health check ───────────────────────────────────────────────────────

async function checkHoldedConnections(): Promise<{
  checked: number;
  healed: number;
  broken: number;
  errors: number;
}> {
  const staleThreshold = daysAgo(7);

  const connections = await prisma.externalConnection.findMany({
    where: {
      provider: 'holded',
      connectionStatus: 'connected',
      OR: [{ lastValidatedAt: null }, { lastValidatedAt: { lt: staleThreshold } }],
    },
    select: {
      id: true,
      tenantId: true,
      apiKeyEnc: true,
      lastValidatedAt: true,
    },
  });

  let healed = 0;
  let broken = 0;
  let errors = 0;

  for (const conn of connections) {
    if (!conn.apiKeyEnc) continue;

    try {
      const apiKey = decryptHoldedSecret(conn.apiKeyEnc);
      const probe = await probeHoldedConnection(apiKey);

      if (probe.ok) {
        await prisma.externalConnection.update({
          where: { id: conn.id },
          data: { lastValidatedAt: new Date() },
        });
        healed++;
      } else {
        await prisma.externalConnection.update({
          where: { id: conn.id },
          data: {
            connectionStatus: 'error',
            lastError: 'Prueba de conexión fallida. Comprueba que la API key sigue siendo válida.',
          },
        });

        const alertType = 'holded_connection_broken';
        if (await alreadyAlertedRecently(conn.tenantId, alertType, 7)) {
          broken++;
          continue;
        }

        await createAlert({
          tenantId: conn.tenantId,
          type: alertType,
          title: 'Tu conexión con Holded tiene un problema',
          body: 'Isaak no ha podido validar tu API key de Holded. Reconecta la integración para restaurar el acceso completo.',
          channel: 'email',
          metadata: { connectionId: conn.id },
        });

        const recipient = await getRecipient(conn.tenantId);
        if (recipient) {
          await sendConnectorHealthAlert({
            userEmail: recipient.email,
            userName: recipient.name,
            connector: 'holded',
            connectorName: 'Holded',
            reason:
              'La API key de Holded ya no responde correctamente. Es posible que haya caducado o sido revocada desde el panel de Holded.',
            actionUrl: 'https://isaak.verifactu.business/settings?section=integraciones',
            actionLabel: 'Reconectar Holded',
          }).catch(() => null);
        }

        broken++;
      }
    } catch {
      errors++;
    }
  }

  return { checked: connections.length, healed, broken, errors };
}

// ── Salt Edge health check ────────────────────────────────────────────────────

async function checkSaltEdgeConnections(): Promise<{
  checked: number;
  stale: number;
  alerted: number;
  errors: number;
}> {
  const staleThreshold = hoursAgo(72);

  const connections = await prisma.seConnection.findMany({
    where: {
      status: 'active',
      OR: [{ lastSyncAt: null }, { lastSyncAt: { lt: staleThreshold } }],
    },
    select: {
      id: true,
      tenantId: true,
      providerName: true,
      lastSyncAt: true,
    },
  });

  let stale = 0;
  let alerted = 0;
  let errors = 0;

  for (const conn of connections) {
    stale++;
    try {
      const alertType = `banking_stale_sync_${conn.id}`;
      if (await alreadyAlertedRecently(conn.tenantId, alertType, 7)) continue;

      const hoursStale = conn.lastSyncAt
        ? Math.round((Date.now() - conn.lastSyncAt.getTime()) / 3_600_000)
        : null;

      const reason = hoursStale
        ? `La conexión con ${conn.providerName} lleva más de ${hoursStale} horas sin sincronizar. Los saldos y movimientos que ve Isaak pueden estar desactualizados.`
        : `La conexión con ${conn.providerName} nunca ha sincronizado. Es posible que necesites reconectarla.`;

      await createAlert({
        tenantId: conn.tenantId,
        type: alertType,
        title: `Banca: ${conn.providerName} sin datos recientes`,
        body: reason,
        channel: 'email',
        metadata: { connectionId: conn.id, providerName: conn.providerName, hoursStale },
      });

      const recipient = await getRecipient(conn.tenantId);
      if (recipient) {
        await sendConnectorHealthAlert({
          userEmail: recipient.email,
          userName: recipient.name,
          connector: 'banking',
          connectorName: conn.providerName,
          reason,
          actionUrl: 'https://isaak.verifactu.business/workspace?tab=banca',
          actionLabel: 'Revisar conexión bancaria',
        }).catch(() => null);
      }

      alerted++;
    } catch {
      errors++;
    }
  }

  return { checked: connections.length, stale, alerted, errors };
}

// ── Handler ───────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  if (!authorizeCron(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const [holded, saltEdge] = await Promise.allSettled([
    checkHoldedConnections(),
    checkSaltEdgeConnections(),
  ]);

  return NextResponse.json({
    ok: true,
    holded: holded.status === 'fulfilled' ? holded.value : { error: String(holded.reason) },
    saltEdge: saltEdge.status === 'fulfilled' ? saltEdge.value : { error: String(saltEdge.reason) },
  });
}
