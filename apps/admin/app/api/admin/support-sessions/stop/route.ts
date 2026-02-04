import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const admin = await requireAdmin(request);
  const payload = await request.json().catch(() => ({}));
  const sessionId = typeof payload?.id === "string" ? payload.id : undefined;

  if (!sessionId) {
    return NextResponse.json({ error: "Missing support session id" }, { status: 400 });
  }

  const endedAt = new Date();
  try {
    await prisma.supportSession.update({
      where: { id: sessionId },
      data: { endedAt },
    });
  } catch (error) {
    console.error("Error ending support session:", error);
  }

  try {
    if (admin.userId && admin.userId !== "local-bypass") {
      await prisma.auditLog.create({
        data: {
          actorUserId: admin.userId,
          action: "SUPPORT_SESSION_END",
          metadata: { supportSessionId: sessionId },
        },
      });
    }
  } catch (error) {
    console.error("Error logging audit event:", error);
  }

  return NextResponse.json({ status: "ended", id: sessionId, endedAt });
}
