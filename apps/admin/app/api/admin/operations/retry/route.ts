import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const payload = await request.json().catch(() => ({}));
  return NextResponse.json({
    status: "queued",
    payload,
  });
}
