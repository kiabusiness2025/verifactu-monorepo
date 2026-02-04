import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import prisma from "@verifactu/db";
import {
  SUPPORT_SESSION_COOKIE,
  verifySupportToken,
} from "@/src/server/support/supportToken";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const token = cookies().get(SUPPORT_SESSION_COOKIE)?.value;

  if (!token) {
    return NextResponse.json({ error: "No support session" }, { status: 400 });
  }

  try {
    const payload = await verifySupportToken(token);
    await prisma.supportSession.update({
      where: { id: payload.supportSessionId },
      data: { endedAt: new Date() },
    });

    if (payload.adminId) {
      await prisma.auditLog.create({
        data: {
          actorUserId: payload.adminId,
          action: "SUPPORT_SESSION_END",
          metadata: {
            supportSessionId: payload.supportSessionId,
            tenantId: payload.tenantId,
            userId: payload.userId,
          },
        },
      });
    }
  } catch (error) {
    return NextResponse.json({ error: "Invalid support session" }, { status: 401 });
  }

  const response = NextResponse.json({ status: "ended" });
  response.cookies.delete(SUPPORT_SESSION_COOKIE);
  return response;
}
