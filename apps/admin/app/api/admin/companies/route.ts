import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function splitCnae(value?: string) {
  if (!value) return { code: null, text: null };
  const parts = value
    .split(' - ')
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length === 0) return { code: null, text: null };
  if (parts.length === 1) return { code: parts[0], text: null };
  return { code: parts[0], text: parts.slice(1).join(' - ') };
}

function normalizeCity(value?: string) {
  if (!value) return { postalCode: null, city: null };
  const trimmed = value.trim();
  const match = trimmed.match(/^(\d{5})\s+([^()]+)(?:\s*\(.*\))?$/);
  if (match) {
    return { postalCode: match[1], city: match[2].trim() };
  }
  return { postalCode: null, city: trimmed.split('(')[0]?.trim() || trimmed };
}

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
      legal_form,
      status,
      website,
      capital_social,
      province,
      representative,
      source,
      source_id,
    } = body;

    const cnaeParts = splitCnae(cnae);
    const cityParts = normalizeCity(city);
    const resolvedPostal = postal_code ?? cityParts.postalCode;
    const resolvedCity = city ?? cityParts.city;

    const [result] = await query<{ id: string }>(
      `INSERT INTO tenants (name, legal_name, tax_id, email, phone, address, city, postal_code, country, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
       RETURNING id`,
      [name, legal_name, tax_id, email, phone, address, resolvedCity, resolvedPostal, country]
    );

    const tenantId = result?.id;
    if (tenantId) {
      const shouldCreateProfile =
        cnae ||
        incorporation_date ||
        address ||
        city ||
        province ||
        legal_form ||
        status ||
        website ||
        capital_social ||
        representative ||
        source ||
        source_id;

      if (shouldCreateProfile) {
        const isEinforma = (source ?? 'manual') === 'einforma';
        await query(
          `INSERT INTO tenant_profiles (
             tenant_id,
             source,
             source_id,
             cnae,
             cnae_code,
             cnae_text,
             legal_form,
             status,
             website,
             capital_social,
             incorporation_date,
             address,
             postal_code,
             city,
             province,
             country,
             representative,
             einforma_last_sync_at,
             einforma_tax_id_verified,
             updated_at
           )
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, NOW())
           ON CONFLICT (tenant_id) DO UPDATE
           SET source = EXCLUDED.source,
               source_id = EXCLUDED.source_id,
               cnae = EXCLUDED.cnae,
               cnae_code = EXCLUDED.cnae_code,
               cnae_text = EXCLUDED.cnae_text,
               legal_form = EXCLUDED.legal_form,
               status = EXCLUDED.status,
               website = EXCLUDED.website,
               capital_social = EXCLUDED.capital_social,
               incorporation_date = EXCLUDED.incorporation_date,
               address = EXCLUDED.address,
               postal_code = EXCLUDED.postal_code,
               city = EXCLUDED.city,
               province = EXCLUDED.province,
               country = EXCLUDED.country,
               representative = EXCLUDED.representative,
               einforma_last_sync_at = EXCLUDED.einforma_last_sync_at,
               einforma_tax_id_verified = EXCLUDED.einforma_tax_id_verified,
               updated_at = NOW()`,
          [
            tenantId,
            source ?? 'manual',
            source_id ?? null,
            cnae ?? null,
            cnaeParts.code,
            cnaeParts.text,
            legal_form ?? null,
            status ?? null,
            website ?? null,
            capital_social ?? null,
            incorporation_date ? new Date(incorporation_date) : null,
            address ?? null,
            resolvedPostal,
            resolvedCity,
            province ?? null,
            country ?? null,
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
