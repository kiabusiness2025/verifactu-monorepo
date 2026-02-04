import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST - Crear empresa
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      name,
      legal_name,
      tax_id,
      email,
      phone,
      address,
      city,
      postal_code,
      country,
      cnae,
      incorporation_date,
      province,
      representative,
      source,
      source_id,
    } = body;

    const [result] = await query<{ id: string }>(
      `INSERT INTO tenants (name, legal_name, tax_id, email, phone, address, city, postal_code, country, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
       RETURNING id`,
      [name, legal_name, tax_id, email, phone, address, city, postal_code, country]
    );

    const tenantId = result?.id;
    if (tenantId) {
      const shouldCreateProfile =
        cnae ||
        incorporation_date ||
        address ||
        city ||
        province ||
        representative ||
        source ||
        source_id;

      if (shouldCreateProfile) {
        const isEinforma = (source ?? 'manual') === 'einforma';
        await query(
          `INSERT INTO tenant_profiles (tenant_id, source, source_id, cnae, incorporation_date, address, city, province, representative, einforma_last_sync_at, einforma_tax_id_verified, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
           ON CONFLICT (tenant_id) DO UPDATE
           SET source = EXCLUDED.source,
               source_id = EXCLUDED.source_id,
               cnae = EXCLUDED.cnae,
               incorporation_date = EXCLUDED.incorporation_date,
               address = EXCLUDED.address,
               city = EXCLUDED.city,
               province = EXCLUDED.province,
               representative = EXCLUDED.representative,
               einforma_last_sync_at = EXCLUDED.einforma_last_sync_at,
               einforma_tax_id_verified = EXCLUDED.einforma_tax_id_verified,
               updated_at = NOW()`,
          [
            tenantId,
            source ?? 'manual',
            source_id ?? null,
            cnae ?? null,
            incorporation_date ? new Date(incorporation_date) : null,
            address ?? null,
            city ?? null,
            province ?? null,
            representative ?? null,
            isEinforma ? new Date() : null,
            isEinforma ? true : null,
          ]
        );
      }
    }

    return NextResponse.json({ ok: true, id: result?.id });
  } catch (error) {
    console.error('Error creating company:', error);
    return NextResponse.json({ ok: false, error: 'Failed to create company' }, { status: 500 });
  }
}
