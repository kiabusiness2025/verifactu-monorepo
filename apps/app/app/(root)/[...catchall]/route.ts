import { NextRequest, NextResponse } from "next/server";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  // This catches /dashboard/admin and other admin routes
  // that might be missing from Vercel's routing
  return NextResponse.next();
}
