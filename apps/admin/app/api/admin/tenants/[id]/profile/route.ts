/**
 * PATCH /api/admin/tenants/[id]/profile
 *
 * Edición directa del perfil de un tenant por un administrador.
 * Appends an entry to admin_edit_history for auditability.
 */

import { requireAdmin } from '@/lib/adminAuth';
import { query } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: tenantId } = await params;
    const adminUser = await requireAdmin(req);
    const body = await req.json();

    const str = (v: unknown): string | null => (typeof v === 'string' ? v.trim() || null : null);
    const num = (v: unknown): number | null => {
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    };

    const legalName = str(body.legalName);
    const taxId = str(body.taxId)?.toUpperCase() ?? null;
    const email = str(body.email);
    const phone = str(body.phone);
    const representative = str(body.representative);
    const representativeRole = str(body.representativeRole);
    const address = str(body.address);
    const postalCode = str(body.postalCode);
    const city = str(body.city);
    const province = str(body.province);
    const country = str(body.country);
    const cnae = str(body.cnae);
    const cnaeCode = str(body.cnaeCode);
    const cnaeText = str(body.cnaeText);
    const legalForm = str(body.legalForm);
    const website = str(body.website);
    const taxRegime = str(body.taxRegime);
    const employees =
      body.employees !== undefined && body.employees !== '' ? num(body.employees) : null;

    // Update tenants.name / legal_name / nif if legalName or taxId provided
    if (legalName) {
      await query(`UPDATE tenants SET name = $1, legal_name = $1 WHERE id = $2`, [
        legalName,
        tenantId,
      ]).catch(() => query(`UPDATE tenants SET name = $1 WHERE id = $2`, [legalName, tenantId]));
    }
    if (taxId) {
      await query(`UPDATE tenants SET nif = $1 WHERE id = $2`, [taxId, tenantId]).catch(() =>
        query(`UPDATE tenants SET tax_id = $1 WHERE id = $2`, [taxId, tenantId]).catch(() => null)
      );
    }

    // Build audit entry
    const adminEmail =
      typeof adminUser === 'object' && adminUser !== null
        ? ((adminUser as Record<string, unknown>).email ?? 'admin')
        : 'admin';

    const changedFields = Object.fromEntries(
      Object.entries({
        legalName,
        taxId,
        email,
        phone,
        representative,
        representativeRole,
        address,
        postalCode,
        city,
        province,
        country,
        cnae,
        cnaeCode,
        cnaeText,
        legalForm,
        website,
        taxRegime,
        employees,
      }).filter(([, v]) => v !== null && v !== undefined)
    );

    const historyEntry = {
      at: new Date().toISOString(),
      by: adminEmail,
      fields: changedFields,
      ...(body.adminNote ? { note: String(body.adminNote).trim() } : {}),
    };

    // Upsert tenant_profiles — use COALESCE so null args don't overwrite existing values
    await query(
      `INSERT INTO tenant_profiles (
        tenant_id, source,
        email, phone, representative, representative_role,
        address, postal_code, city, province, country,
        cnae, cnae_code, cnae_text,
        legal_form, website, tax_regime, employees,
        admin_edit_history, updated_at
      )
      VALUES (
        $1, 'manual',
        $2, $3, $4, $5,
        $6, $7, $8, $9, $10,
        $11, $12, $13,
        $14, $15, $16, $17,
        jsonb_build_array($18::jsonb),
        NOW()
      )
      ON CONFLICT (tenant_id) DO UPDATE SET
        email              = COALESCE($2,  tenant_profiles.email),
        phone              = COALESCE($3,  tenant_profiles.phone),
        representative     = COALESCE($4,  tenant_profiles.representative),
        representative_role= COALESCE($5,  tenant_profiles.representative_role),
        address            = COALESCE($6,  tenant_profiles.address),
        postal_code        = COALESCE($7,  tenant_profiles.postal_code),
        city               = COALESCE($8,  tenant_profiles.city),
        province           = COALESCE($9,  tenant_profiles.province),
        country            = COALESCE($10, tenant_profiles.country),
        cnae               = COALESCE($11, tenant_profiles.cnae),
        cnae_code          = COALESCE($12, tenant_profiles.cnae_code),
        cnae_text          = COALESCE($13, tenant_profiles.cnae_text),
        legal_form         = COALESCE($14, tenant_profiles.legal_form),
        website            = COALESCE($15, tenant_profiles.website),
        tax_regime         = COALESCE($16, tenant_profiles.tax_regime),
        employees          = COALESCE($17, tenant_profiles.employees),
        admin_edit_history = COALESCE(tenant_profiles.admin_edit_history, '[]'::jsonb)
                             || jsonb_build_array($18::jsonb),
        updated_at         = NOW()`,
      [
        tenantId,
        email,
        phone,
        representative,
        representativeRole,
        address,
        postalCode,
        city,
        province,
        country,
        cnae,
        cnaeCode,
        cnaeText,
        legalForm,
        website,
        taxRegime,
        employees,
        JSON.stringify(historyEntry),
      ]
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[admin][tenants/profile] patch failed', error);
    if (error instanceof Error && error.message.includes('FORBIDDEN')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Error al guardar perfil' }, { status: 500 });
  }
}
