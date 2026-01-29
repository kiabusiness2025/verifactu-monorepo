import { NextResponse } from "next/server";
import { randomUUID } from "crypto";

export const runtime = "nodejs";

export async function POST() {
  const handoffToken = randomUUID();
  return NextResponse.json({
    status: "started",
    handoffToken,
    expiresInMinutes: 15,
  });
}
