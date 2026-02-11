import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureRole } from "@/lib/authz";
import { Roles } from "@/lib/roles";
import { getSessionPayload } from "@/lib/session";
import { searchCompanies } from "@/server/einforma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normalizeQuery(value: string) {
  return value.trim().toUpperCase();
}

function addDays(days: number) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

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
    const normalizedQuery = normalizeQuery(q);
    const lookup = await prisma.einformaLookup.findUnique({
      where: { queryType_queryValue: { queryType: "NAME", queryValue: normalizedQuery } },
      select: { normalized: true, raw: true, expiresAt: true, updatedAt: true },
    });

    if (lookup && lookup.expiresAt > new Date()) {
      const cachedItems = Array.isArray(lookup.normalized)
        ? lookup.normalized
        : ((lookup.normalized as any)?.items ?? (lookup.raw as any)?.items ?? lookup.raw ?? []);
      const results = cachedItems
        .slice(0, Math.max(1, Math.min(limit, 25)))
        .map((item: any) => ({
          einformaId: item.id ?? item.nif ?? item.name,
          name: item.name,
          nif: item.nif ?? "",
          province: item.province ?? "",
          city: "",
        }));

      return NextResponse.json({
        ok: true,
        results,
        cached: true,
        cacheSource: "einformaLookup",
        lastSyncAt: lookup.updatedAt?.toISOString() ?? null,
      });
    }

    const items = await searchCompanies(q);
    const rawJson = JSON.parse(JSON.stringify(items));
    await prisma.einformaLookup.upsert({
      where: { queryType_queryValue: { queryType: "NAME", queryValue: normalizedQuery } },
      create: {
        queryType: "NAME",
        queryValue: normalizedQuery,
        raw: rawJson,
        normalized: rawJson,
        expiresAt: addDays(7),
      },
      update: {
        raw: rawJson,
        normalized: rawJson,
        expiresAt: addDays(7),
      },
    });

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
