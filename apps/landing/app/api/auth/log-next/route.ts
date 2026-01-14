import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    console.warn("[AUTH] Invalid next param reported", {
      reason: body?.reason,
      nextParam: body?.nextParam,
      appUrl: body?.appUrl,
      ts: body?.ts,
      ip: req.headers.get("x-forwarded-for"),
      ua: req.headers.get("user-agent"),
    });
  } catch (error) {
    console.warn("[AUTH] Failed to log invalid next param", {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  return NextResponse.json({ ok: true });
}
