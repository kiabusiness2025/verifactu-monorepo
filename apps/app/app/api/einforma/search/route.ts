import { NextResponse } from "next/server";
import { getSessionPayload } from "@/lib/session";
import { searchCompanies } from "@/server/einforma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const session = await getSessionPayload();
    if (!session?.uid) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") ?? "").trim();
    if (q.length < 3) {
      return NextResponse.json({ items: [] });
    }

    const items = await searchCompanies(q);
    return NextResponse.json({ items });
  } catch (error) {
    console.error("Einforma search error:", error);
    return NextResponse.json(
      { error: "No se pudo consultar eInforma" },
      { status: 500 }
    );
  }
}
