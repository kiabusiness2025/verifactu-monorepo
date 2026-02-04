import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(request: Request) {
  await requireAdmin(request);
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const rawLimit = Number(searchParams.get("limit") || 50);
  const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 200) : 50;

  const where =
    status === "active"
      ? { endedAt: null }
      : status === "ended"
      ? { endedAt: { not: null } }
      : {};

  const sessions = await prisma.supportSession.findMany({
    where,
    orderBy: { startedAt: "desc" },
    take: limit,
    include: {
      tenant: { select: { id: true, name: true, legalName: true, nif: true } },
      user: { select: { id: true, email: true, name: true } },
      admin: { select: { id: true, email: true, name: true } },
    },
  });

  return NextResponse.json({ items: sessions });
}
