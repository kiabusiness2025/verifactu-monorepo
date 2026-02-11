import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/adminAuth";
import { rateLimit } from "@/lib/rateLimit";
import { searchCompanies } from "@/server/einforma";

export const runtime = "nodejs";
export const dynamic = 'force-dynamic';

function normalizeQuery(value: string) {
  return value.trim().toUpperCase();
}

function addDays(days: number) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

export async function GET(req: Request) {
  try {
    await requireAdmin(req);

    const limiter = rateLimit(req, {
      limit: 30,
      windowMs: 60_000,
      keyPrefix: "einforma-admin-search"
    });
    if (!limiter.ok) {
      return NextResponse.json(
        { error: "Rate limit exceeded" },
        { status: 429, headers: { "Retry-After": String(limiter.retryAfter) } }
      );
    }

    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") ?? "").trim();

    if (q.length < 3) {
      return NextResponse.json({ items: [] });
    }

    const normalizedQuery = normalizeQuery(q);
    const lookup = await prisma.einformaLookup.findUnique({
      where: { queryType_queryValue: { queryType: "NAME", queryValue: normalizedQuery } },
      select: { normalized: true, raw: true, expiresAt: true, updatedAt: true },
    });

    if (lookup && lookup.expiresAt > new Date()) {
      const cachedItems = Array.isArray(lookup.normalized)
        ? lookup.normalized
        : ((lookup.normalized as any)?.items ?? (lookup.raw as any)?.items ?? lookup.raw ?? []);
      return NextResponse.json({
        items: cachedItems,
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
