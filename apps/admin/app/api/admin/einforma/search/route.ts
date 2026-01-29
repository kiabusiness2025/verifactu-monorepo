import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { searchCompanies } from "@/server/einforma";

export const runtime = "nodejs";
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    await requireAdmin(req);

    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") ?? "").trim();

    if (q.length < 3) {
      return NextResponse.json({ items: [] });
    }

    const items = await searchCompanies(q);
    return NextResponse.json({ items });
  } catch (error) {
    console.error("Einforma search error:", error);

    if (error instanceof Error && error.message.includes("FORBIDDEN")) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    return NextResponse.json(
      { error: "No se pudo consultar eInforma" },
      { status: 500 }
    );
  }
}
