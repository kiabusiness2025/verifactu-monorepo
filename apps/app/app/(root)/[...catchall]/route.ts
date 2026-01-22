import { NextRequest, NextResponse } from "next/server";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  // Redirect to 404 or handle appropriately
  // NextResponse.next() is not supported in route handlers (only in middleware)
  return NextResponse.json(
    { error: 'Route not found' },
    { status: 404 }
  );
}
