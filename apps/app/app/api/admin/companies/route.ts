import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export const runtime = "nodejs";

// POST - Crear empresa
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, legal_name, tax_id, email, phone, address, city, postal_code, country } = body;

    const [result] = await query<{ id: string }>(
      `INSERT INTO tenants (name, legal_name, tax_id, email, phone, address, city, postal_code, country, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
       RETURNING id`,
      [name, legal_name, tax_id, email, phone, address, city, postal_code, country]
    );

    return NextResponse.json({ ok: true, id: result?.id });
  } catch (error) {
    console.error("Error creating company:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to create company" },
      { status: 500 }
    );
  }
}
