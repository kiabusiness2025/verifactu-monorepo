import { NextResponse } from "next/server";

/**
 * Stub handlers to keep the landing page build self-contained.
 * Replace with real logic in the authenticated app.
 */
export async function PUT(
  _req: Request,
  { params }: { params: { userId: string } },
) {
  console.info("User update stub invoked", params);
  return NextResponse.json({ message: "Usuario actualizado (demo)" });
}

export async function DELETE(
  _req: Request,
  { params }: { params: { userId: string } },
) {
  console.info("User delete stub invoked", params);
  return NextResponse.json({ message: "Usuario eliminado (demo)" });
}