import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export const runtime = "nodejs";

type ImportResult = {
  success: number;
  errors: number;
  details: {
    row: number;
    name: string;
    status: "success" | "error";
    message: string;
  }[];
};

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ ok: false, error: "No file provided" }, { status: 400 });
    }

    const text = await file.text();
    const lines = text.split("\n").filter((line) => line.trim());

    if (lines.length < 2) {
      return NextResponse.json({ ok: false, error: "CSV file is empty" }, { status: 400 });
    }

    // Parsear header
    const headers = lines[0].split(",").map((h) => h.trim());
    const requiredHeaders = [
      "name",
      "legal_name",
      "tax_id",
      "email",
      "phone",
      "address",
      "city",
      "postal_code",
      "country",
    ];

    const result: ImportResult = { success: 0, errors: 0, details: [] };

    // Procesar cada fila
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(",").map((v) => v.trim());

      try {
        const row: Record<string, string> = {};
        headers.forEach((header, idx) => {
          row[header] = values[idx] || "";
        });

        // Validar campos requeridos
        if (!row.name || !row.legal_name) {
          throw new Error("Nombre y razón social son requeridos");
        }

        // Insertar empresa
        await query(
          `INSERT INTO tenants (name, legal_name, tax_id, email, phone, address, city, postal_code, country, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
           ON CONFLICT (name) DO NOTHING`,
          [
            row.name,
            row.legal_name,
            row.tax_id || null,
            row.email || null,
            row.phone || null,
            row.address || null,
            row.city || null,
            row.postal_code || null,
            row.country || "ES",
          ]
        );

        result.success++;
        result.details.push({
          row: i + 1,
          name: row.name,
          status: "success",
          message: "Empresa importada correctamente",
        });
      } catch (error) {
        result.errors++;
        const errorMsg = error instanceof Error ? error.message : "Error desconocido";
        result.details.push({
          row: i + 1,
          name: values[0] || `Fila ${i + 1}`,
          status: "error",
          message: errorMsg,
        });
      }
    }

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("Error processing import:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to process import" },
      { status: 500 }
    );
  }
}
