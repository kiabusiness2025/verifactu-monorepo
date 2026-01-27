import { NextResponse } from "next/server";
import { ensureRole } from "@/lib/authz";
import { Roles } from "@/lib/roles";
import { getSessionPayload } from "@/lib/session";
import { searchCompanies } from "@/server/einforma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await getSessionPayload();
  const guard = ensureRole({ session, minRole: Roles.default });
  if (guard) return guard;

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const limit = Number(searchParams.get("limit") ?? 10);

  if (q.length < 3) {
    return NextResponse.json(
      { ok: false, error: "query too short" },
      { status: 400 }
    );
  }

  try {
    const items = await searchCompanies(q);
    const results = items.slice(0, Math.max(1, Math.min(limit, 25))).map((item) => ({
      einformaId: item.id ?? item.nif ?? item.name,
      name: item.name,
      nif: item.nif ?? "",
      province: item.province ?? "",
      city: "",
    }));

    return NextResponse.json({ ok: true, results });
  } catch (error) {
    console.error("eInforma search error:", error);
    return NextResponse.json(
      { ok: false, error: "eInforma search failed" },
      { status: 502 }
    );
  }
}
