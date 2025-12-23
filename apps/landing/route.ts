import { NextResponse } from "next/server";

/**
 * Webhook stub to keep the landing self-contained during previews.
 * Replace with real Stripe handling in the production API service.
 */
export async function POST(req: Request) {
  const body = await req.text();

  console.info("Webhook request received (stub)", {
    length: body.length,
  });

  return NextResponse.json({ received: true });
}