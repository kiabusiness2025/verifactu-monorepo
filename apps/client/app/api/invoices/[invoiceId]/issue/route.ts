import { prisma } from "@verifactu/db";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

async function requireAuth(_req: Request): Promise<{ userId: string; tenantId: string }> {
  // TODO: integrar verificacion Firebase
  throw new Error("Implement requireAuth()");
}

async function issueInvoice(_params: {
  prisma: typeof prisma;
  tenantId: string;
  invoiceId: string;
  actorUserId: string;
}) {
  // TODO: integrar el flujo real de emision
  return { status: "PENDING", id: _params.invoiceId };
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ invoiceId: string }> }
) {
  try {
    const { invoiceId } = await ctx.params;
    const { userId, tenantId } = await requireAuth(req);

    const result = await issueInvoice({
      prisma,
      tenantId,
      invoiceId,
      actorUserId: userId,
    });

    return NextResponse.json({ ok: true, result });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "Unknown error" }, { status: 400 });
  }
}
