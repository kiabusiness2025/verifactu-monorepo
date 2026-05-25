// C-A — Servicio de sincronización con la sede AEAT.
//
// Envuelve las funciones de lectura existentes (`getAeatNotifications`,
// `getAeatCensusData` de `aeat-sede.ts`) con persistencia, dedupe
// y detección de cambios.
//
// Diseñado para ser invocado:
//   * por el cron diario `/api/cron/aeat-sede-sync` (todos los tenants
//     con cert digital)
//   * por la UI cuando el cliente pulsa "Refrescar" en `/sede`
//   * por la tool LLM `isaak_sync_aeat_sede` (sub-agente fiscal)
//
// Idempotente: si una notificación ya está persistida (mismo externalId)
// se ignora; si el censo no ha cambiado (mismo hash) no se inserta
// snapshot duplicado.

import { prisma } from './prisma';
import {
  getAeatNotifications,
  getAeatCensusData,
  type AeatNotification,
} from './aeat-sede';
import {
  classifyNotificationSeverity,
  diffCensusSnapshots,
  hashCensusSnapshot,
  partitionNewVsKnown,
  type CensusChange,
  type NotificationSeverity,
} from './aeat-sede-diff';
import { createAlert } from './isaak-alert-service';

export type AeatSyncResult = {
  ok: boolean;
  tenantId: string;
  notifications: {
    pulled: number;
    persisted: number;
    alertsCreated: number;
    criticalCount: number;
  };
  census: {
    snapshotInserted: boolean;
    changesDetected: number;
    alertsCreated: number;
  };
  errors: string[];
};

// ─── Notificaciones AEAT (DEH) ──────────────────────────────────────────

async function syncNotifications(
  tenantId: string,
): Promise<AeatSyncResult['notifications'] & { error?: string }> {
  const pull = await getAeatNotifications(tenantId);
  if (!pull.ok) {
    return {
      pulled: 0,
      persisted: 0,
      alertsCreated: 0,
      criticalCount: 0,
      error: pull.error ?? 'unknown',
    };
  }

  const knownRows = await prisma.isaakAeatNotification.findMany({
    where: { tenantId },
    select: { externalId: true },
  });
  const knownIds = new Set<string>(knownRows.map((r) => r.externalId));
  const { fresh } = partitionNewVsKnown(pull.notifications, knownIds);

  let criticalCount = 0;
  let alertsCreated = 0;

  for (const n of fresh) {
    const severity = classifyNotificationSeverity(n);
    if (severity === 'critical') criticalCount++;
    await prisma.isaakAeatNotification.create({
      data: {
        tenantId,
        externalId: n.id,
        title: n.title,
        emisor: n.emisor,
        tipo: n.tipo,
        estado: n.estado,
        notificationDate: parseAeatDate(n.fecha),
        // alertSent se decide ahora si corresponde
        alertSent: severity !== 'normal',
        alertSentAt: severity !== 'normal' ? new Date() : null,
      },
    });
    if (severity !== 'normal') {
      try {
        await createAlert({
          tenantId,
          type: 'aeat_notification',
          title: `AEAT: ${n.title}`,
          body: buildNotificationAlertBody(n, severity),
          channel: 'email',
          metadata: {
            externalId: n.id,
            severity,
            tipo: n.tipo,
            emisor: n.emisor,
          },
        });
        alertsCreated++;
      } catch (err) {
        // No bloqueamos sync por fallo de email
        console.error('[AEAT Sync] alert create failed', err);
      }
    }
  }

  return {
    pulled: pull.notifications.length,
    persisted: fresh.length,
    alertsCreated,
    criticalCount,
  };
}

function parseAeatDate(s: string): Date {
  // AEAT devuelve fechas en varios formatos (DD/MM/YYYY, ISO, etc.).
  // Intento ISO primero, luego DD/MM/YYYY como fallback.
  const iso = Date.parse(s);
  if (Number.isFinite(iso)) return new Date(iso);
  const m = s.match(/^(\d{2})[/-](\d{2})[/-](\d{4})$/);
  if (m) {
    return new Date(Date.UTC(Number(m[3]), Number(m[2]) - 1, Number(m[1])));
  }
  return new Date(); // último fallback — ahora
}

function buildNotificationAlertBody(
  n: AeatNotification,
  severity: NotificationSeverity,
): string {
  const tag = severity === 'critical' ? '🚨 CRÍTICA' : '⚠️ IMPORTANTE';
  return [
    `${tag} — Has recibido una notificación de la AEAT.`,
    '',
    `**Asunto:** ${n.title}`,
    `**Emisor:** ${n.emisor}`,
    `**Tipo:** ${n.tipo}`,
    `**Fecha:** ${n.fecha}`,
    '',
    severity === 'critical'
      ? 'Esta notificación requiere acción inmediata. Accede a tu buzón AEAT en cuanto puedas para evitar plazos vencidos o sanciones.'
      : 'Revísala desde Isaak (/sede) o desde tu buzón AEAT.',
  ].join('\n');
}

// ─── Censo 036/037 ─────────────────────────────────────────────────────

async function syncCensus(
  tenantId: string,
): Promise<AeatSyncResult['census'] & { error?: string }> {
  const pull = await getAeatCensusData(tenantId);
  if (!pull.ok) {
    return {
      snapshotInserted: false,
      changesDetected: 0,
      alertsCreated: 0,
      error: pull.error ?? 'unknown',
    };
  }

  const newData = pull.data as Record<string, unknown>;
  const newHash = hashCensusSnapshot(newData);

  // ¿Último snapshot del tenant?
  const latest = await prisma.isaakAeatCensusSnapshot.findFirst({
    where: { tenantId },
    orderBy: { capturedAt: 'desc' },
    select: { id: true, contentHash: true, data: true },
  });

  if (latest && latest.contentHash === newHash) {
    return { snapshotInserted: false, changesDetected: 0, alertsCreated: 0 };
  }

  // Insertar nuevo snapshot — JSON va como Prisma.InputJsonValue
  const inserted = await prisma.isaakAeatCensusSnapshot.create({
    data: {
      tenantId,
      data: newData as object,
      contentHash: newHash,
    },
    select: { id: true },
  });

  // Diff vs anterior (si lo había)
  const changes: CensusChange[] = latest
    ? diffCensusSnapshots(latest.data as Record<string, unknown>, newData)
    : diffCensusSnapshots(null, newData);

  let alertsCreated = 0;
  if (changes.length > 0) {
    await prisma.isaakAeatCensusChange.createMany({
      data: changes.map((c) => ({
        tenantId,
        field: c.field,
        changeType: c.changeType,
        oldValue: c.oldValue,
        newValue: c.newValue,
        previousSnapshotId: latest?.id ?? null,
        currentSnapshotId: inserted.id,
        alertSent: false,
      })),
    });

    // Una sola alerta agregada (no spam de N emails)
    try {
      await createAlert({
        tenantId,
        type: 'aeat_census_change',
        title: `Cambios en tu censo AEAT (${changes.length})`,
        body: buildCensusAlertBody(changes),
        channel: 'email',
        metadata: { changeCount: changes.length, snapshotId: inserted.id },
      });
      alertsCreated = 1;

      // Marcar todas como alert_sent
      await prisma.isaakAeatCensusChange.updateMany({
        where: { tenantId, currentSnapshotId: inserted.id, alertSent: false },
        data: { alertSent: true, alertSentAt: new Date() },
      });
    } catch (err) {
      console.error('[AEAT Sync] census alert create failed', err);
    }
  }

  return {
    snapshotInserted: true,
    changesDetected: changes.length,
    alertsCreated,
  };
}

function buildCensusAlertBody(changes: CensusChange[]): string {
  const lines = ['Tu censo en AEAT ha cambiado. Cambios detectados:', ''];
  for (const c of changes.slice(0, 10)) {
    if (c.changeType === 'added') {
      lines.push(`+ ${c.field}: añadido "${c.newValue}"`);
    } else if (c.changeType === 'removed') {
      lines.push(`− ${c.field}: eliminado "${c.oldValue}"`);
    } else {
      lines.push(`~ ${c.field}: "${c.oldValue}" → "${c.newValue}"`);
    }
  }
  if (changes.length > 10) {
    lines.push('', `... y ${changes.length - 10} cambios más. Revisa en /sede.`);
  }
  lines.push('', 'Si no esperabas estos cambios, contacta con AEAT cuanto antes.');
  return lines.join('\n');
}

// ─── Entrada pública ────────────────────────────────────────────────────

export async function syncAeatSedeForTenant(
  tenantId: string,
): Promise<AeatSyncResult> {
  const errors: string[] = [];

  const [notifResult, censusResult] = await Promise.all([
    syncNotifications(tenantId).catch((err) => {
      errors.push(`notifications: ${err instanceof Error ? err.message : String(err)}`);
      return {
        pulled: 0,
        persisted: 0,
        alertsCreated: 0,
        criticalCount: 0,
      };
    }),
    syncCensus(tenantId).catch((err) => {
      errors.push(`census: ${err instanceof Error ? err.message : String(err)}`);
      return { snapshotInserted: false, changesDetected: 0, alertsCreated: 0 };
    }),
  ]);

  if ('error' in notifResult && notifResult.error) errors.push(`notifications: ${notifResult.error}`);
  if ('error' in censusResult && censusResult.error) errors.push(`census: ${censusResult.error}`);

  return {
    ok: errors.length === 0,
    tenantId,
    notifications: {
      pulled: notifResult.pulled,
      persisted: notifResult.persisted,
      alertsCreated: notifResult.alertsCreated,
      criticalCount: notifResult.criticalCount,
    },
    census: {
      snapshotInserted: censusResult.snapshotInserted,
      changesDetected: censusResult.changesDetected,
      alertsCreated: censusResult.alertsCreated,
    },
    errors,
  };
}
