import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcrypt";
import prisma from "@/app/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, password, company } = body;

    // Validate required fields
    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Nombre, email y contraseña son requeridos" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Formato de email inválido" },
        { status: 400 }
      );
    }

    // Validate password length
    if (password.length < 8) {
      return NextResponse.json(
        { error: "La contraseña debe tener al menos 8 caracteres" },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Este email ya está registrado" },
        { status: 409 }
      );
    }

    // Hash password with bcrypt (10 rounds)
    const hashedPassword = await hash(password, 10);

    // Create user in database
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        company,
      },
    });

    // Return user without password
    return NextResponse.json(
      {
        message: "Usuario creado exitosamente",
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          company: user.company,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating user:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
