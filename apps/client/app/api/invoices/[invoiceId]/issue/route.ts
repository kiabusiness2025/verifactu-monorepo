import { issueInvoice } from "@your-scope/core/invoices/issueInvoice";
import { prisma } from "@your-scope/db"; // ajusta alias a tu monorepo
import { NextResponse } from "next/server";

export const runtime = "nodejs"; // Prisma no va en Edge

// TODO: sustituye por tu verificación Firebase (cookie/session)
async function requireAuth(_req: Request): Promise<{ userId: string; tenantId: string }> {
  // 1) verifica cookie firebase session
  // 2) resolve tenant (de header, de subruta, etc.)
  // aquí lo dejamos como placeholder
  throw new Error("Implement requireAuth()");
}

export async function POST(req: Request, ctx: { params: { invoiceId: string } }) {
  try {
    const { userId, tenantId } = await requireAuth(req);

    const result = await issueInvoice({
      prisma,
      tenantId,
      invoiceId: ctx.params.invoiceId,
      actorUserId: userId,
    });

    return NextResponse.json({ ok: true, result });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Unknown error" },
      { status: 400 }
    );
  }
}
