import { NextResponse } from "next/server";
import { getSessionPayload } from "@/lib/session";
import { getCompanyProfileByNif } from "@/server/einforma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const session = await getSessionPayload();
    if (!session?.uid) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const nif = (searchParams.get("nif") ?? "").trim().toUpperCase();
    if (!nif) {
      return NextResponse.json({ error: "Falta nif" }, { status: 400 });
    }

    const profile = await getCompanyProfileByNif(nif);
    return NextResponse.json({ profile });
  } catch (error) {
    console.error("Einforma profile error:", error);
    return NextResponse.json(
      { error: "No se pudo consultar eInforma" },
      { status: 500 }
    );
  }
}
