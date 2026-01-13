import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { getCompanyProfileByNif } from "@/server/einforma";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    await requireAdmin(req);

    const { searchParams } = new URL(req.url);
    const nif = (searchParams.get("nif") ?? "").trim().toUpperCase();

    if (!nif) {
      return NextResponse.json({ error: "Falta nif" }, { status: 400 });
    }

    const profile = await getCompanyProfileByNif(nif);
    return NextResponse.json({ profile });
  } catch (error) {
    console.error("Einforma profile error:", error);

    if (error instanceof Error && error.message.includes("FORBIDDEN")) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    return NextResponse.json(
      { error: "No se pudo consultar eInforma" },
      { status: 500 }
    );
  }
}
