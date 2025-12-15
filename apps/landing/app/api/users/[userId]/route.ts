import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import prisma from "@/app/lib/prisma";
import { authOptions } from "@/app/lib/auth";

// PUT /api/users/[userId] - Update user profile
export async function PUT(
  req: Request,
  { params }: { params: { userId: string } },
) {
  const session = await getServerSession(authOptions);
  
  // Users can only update their own profile
  if (!session || session.user.id !== params.userId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  try {
    const { name, company } = await req.json();
    
    const updatedUser = await prisma.user.update({
      where: { id: params.userId },
      data: {
        name,
        company,
      },
      select: {
        id: true,
        name: true,
        email: true,
        company: true,
        createdAt: true,
      },
    });
    
    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error("Error updating user:", error);
    return NextResponse.json({ error: "Error al actualizar el usuario" }, { status: 500 });
  }
}

// DELETE /api/users/[userId] - Delete user account
export async function DELETE(
  req: Request,
  { params }: { params: { userId: string } },
) {
  const session = await getServerSession(authOptions);
  
  // Users can only delete their own account
  if (!session || session.user.id !== params.userId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  try {
    await prisma.user.delete({
      where: { id: params.userId },
    });
    
    return NextResponse.json({ message: "Usuario eliminado exitosamente" });
  } catch (error) {
    console.error("Error deleting user:", error);
    return NextResponse.json({ error: "Error al eliminar el usuario" }, { status: 500 });
  }
}