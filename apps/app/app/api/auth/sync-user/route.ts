import { NextRequest, NextResponse } from "next/server";
import prisma from "../../../../lib/prisma";

/**
 * API Route para sincronizar usuarios de Firebase Auth con PostgreSQL (Prisma)
 *
 * Se llama despues de que un usuario se registra o inicia sesion por primera vez.
 * Crea o actualiza el usuario en la base de datos PostgreSQL.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { uid, email, displayName, photoURL, emailVerified, provider } = body;

    if (!uid || !email) {
      return NextResponse.json(
        { error: "Missing required fields: uid and email" },
        { status: 400 }
      );
    }

    // Buscar si el usuario ya existe en PostgreSQL por uid
    let user = await prisma.user.findUnique({
      where: { id: uid },
    });

    if (user) {
      // Actualizar usuario existente
      user = await prisma.user.update({
        where: { id: uid },
        data: {
          name: displayName || user.name,
          email: email,
        },
      });

      return NextResponse.json({
        ok: true,
        user,
        created: false,
      });
    } else {
      // Si existe un placeholder con el mismo email (invitación), reconciliar ID.
      const byEmail = await prisma.user.findUnique({
        where: { email },
      });
      if (byEmail) {
        user = await prisma.user.update({
          where: { id: byEmail.id },
          data: {
            id: uid,
            email,
            name: displayName || byEmail.name,
          },
        });
      } else {
        // Crear nuevo usuario
        user = await prisma.user.create({
          data: {
            id: uid,
            email: email,
            name: displayName || null,
          },
        });
      }

      return NextResponse.json({
        ok: true,
        user,
        created: true,
        message: "User created",
      });
    }
  } catch (error: any) {
    console.error("Error syncing user with Prisma:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}

/**
 * GET: Obtener informacion del usuario desde PostgreSQL
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const uid = searchParams.get("uid");

    if (!uid) {
      return NextResponse.json({ error: "Missing uid parameter" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: uid },
      include: {
        tenantMemberships: {
          include: {
            tenant: true,
          },
        },
        tenantPreferences: {
          include: {
            preferredTenant: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      user,
    });
  } catch (error: any) {
    console.error("Error fetching user from Prisma:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}
