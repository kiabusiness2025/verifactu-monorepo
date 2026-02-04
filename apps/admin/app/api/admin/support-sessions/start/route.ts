import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import prisma from "@/lib/prisma";
import { signSupportToken } from "@/lib/supportToken";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const admin = await requireAdmin(request);
  const payload = await request.json().catch(() => ({}));
  const tenantId = typeof payload?.tenantId === "string" ? payload.tenantId : undefined;
  const userId = typeof payload?.userId === "string" ? payload.userId : undefined;
  const reason = typeof payload?.reason === "string" ? payload.reason : "support";
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    null;
  const userAgent = request.headers.get("user-agent");

  let resolvedUserId = userId;
  if (!resolvedUserId && tenantId) {
    const owner = await prisma.membership.findFirst({
      where: { tenantId, role: "owner" },
      select: { userId: true },
    });
    resolvedUserId = owner?.userId || undefined;
  }
  if (!resolvedUserId) {
    resolvedUserId = admin.userId;
  }

  let supportSessionId: string | null = null;
  try {
    if (tenantId && resolvedUserId) {
      const session = await prisma.supportSession.create({
        data: {
          tenantId,
          userId: resolvedUserId,
          adminId: admin.userId,
          reason,
          ip: ip || undefined,
          userAgent: userAgent || undefined,
        },
        select: { id: true },
      });
      supportSessionId = session.id;
    }
  } catch (error) {
    console.error("Error creating support session:", error);
  }

  if (!supportSessionId || !tenantId || !resolvedUserId) {
    return NextResponse.json(
      { error: "Unable to create support session" },
      { status: 500 }
    );
  }

  let handoffToken = "";
  try {
    handoffToken = await signSupportToken({
      supportSessionId,
      tenantId,
      userId: resolvedUserId,
      adminId: admin.userId,
    });
  } catch (error) {
    console.error("Error signing support token:", error);
    return NextResponse.json(
      { error: "Support handoff secret missing" },
      { status: 500 }
    );
  }

  try {
    if (admin.userId && admin.userId !== "local-bypass") {
      await prisma.auditLog.create({
        data: {
          actorUserId: admin.userId,
          action: "SUPPORT_SESSION_START",
          metadata: {
            tenantId,
            userId: resolvedUserId,
            supportSessionId,
            handoffToken,
          },
        },
      });
    }
  } catch (error) {
    console.error("Error logging audit event:", error);
  }

  return NextResponse.json({
    status: "started",
    handoffToken,
    expiresInMinutes: 15,
    tenantId,
    userId: resolvedUserId,
    reason,
    supportSessionId,
  });
}
