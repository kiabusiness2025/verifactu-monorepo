import { NextRequest, NextResponse } from "next/server";

export function GET(request: NextRequest) {
  // This route handler prevents Vercel from returning a 404
  // The actual page is handled by page.tsx
  return NextResponse.next();
}
