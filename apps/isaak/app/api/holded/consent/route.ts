/**
 * POST /api/holded/consent
 * Registra el consentimiento explícito del tenant para que Isaak
 * acceda a sus datos de Holded. Escribe en tenant_isaak_settings
 * (tabla compartida con el admin panel).
 */

import { NextResponse } from 'next/server';
import { getHoldedSession } from '@/app/lib/holded-session';
import { toSettingsSession } from '@/app/lib/settings';
import { prisma } from '@/app/lib/prisma';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const session = toSettingsSession(await getHoldedSession());
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const tenantId = session.tenantId;

  try {
    // Ensure the table exists (created by admin app too; idempotent)
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS tenant_isaak_settings (
        tenant_id           UUID PRIMARY KEY,
        holded_enabled      BOOLEAN NOT NULL DEFAULT FALSE,
        consent_given       BOOLEAN NOT NULL DEFAULT FALSE,
        consent_given_at    TIMESTAMPTZ,
        enabled_by          TEXT,
        enabled_at          TIMESTAMPTZ,
        notes               TEXT,
        updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await prisma.$executeRawUnsafe(
      `INSERT INTO tenant_isaak_settings (tenant_id, consent_given, consent_given_at, updated_at)
       VALUES ($1::uuid, TRUE, NOW(), NOW())
       ON CONFLICT (tenant_id) DO UPDATE SET
         consent_given    = TRUE,
         consent_given_at = CASE WHEN NOT tenant_isaak_settings.consent_given
                                 THEN NOW()
                                 ELSE tenant_isaak_settings.consent_given_at END,
         updated_at       = NOW()`,
      tenantId
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[holded/consent POST]', error);
    // Non-blocking: don't block connection even if consent write fails
    return NextResponse.json({ ok: true, warn: 'consent_write_failed' });
  }
}
