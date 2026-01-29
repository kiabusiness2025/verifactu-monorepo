import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(
  _request: Request,
  { params }: { params: { id: string } }
) {
  return NextResponse.json({
    status: "suspended",
    tenantId: params.id,
  });
}
