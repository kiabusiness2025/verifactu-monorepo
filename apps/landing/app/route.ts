import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { db } from "@/lib/db";
import NextAuthOptions from "@/app/[...nextauth]";

export async function PUT(
  req: Request,
  { params }: { params: { userId: string } },
) {
  const session = await getServerSession(NextAuthOptions);
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  try {
    const { role } = await req.json();
    const updatedUser = await db.user.update(params.userId, { role });
    return NextResponse.json(updatedUser);
  } catch (error) {
    return NextResponse.json({ error: "Error al actualizar el usuario" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { userId: string } },
) {
  const session = await getServerSession(NextAuthOptions);
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  // Prevenir que el admin se elimine a sí mismo
  if (session.user.id === params.userId) {
    return NextResponse.json({ error: "No puedes eliminar tu propia cuenta" }, { status: 400 });
  }

  try {
    await db.user.delete(params.userId);
    return NextResponse.json({ message: "Usuario eliminado" });
  } catch (error) {
    return NextResponse.json({ error: "Error al eliminar el usuario" }, { status: 500 });
  }
}