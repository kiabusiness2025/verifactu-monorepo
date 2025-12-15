import { NextRequest, NextResponse } from "next/server";

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

    // TODO: Implement actual database logic here
    // For now, this is a mock implementation
    // In production, you should:
    // 1. Hash the password using bcrypt or similar
    // 2. Check if email already exists in database
    // 3. Store user in database
    // 4. Send verification email (optional)

    // Mock: Check if user already exists
    // In reality, query your database here
    // const existingUser = await db.user.findUnique({ where: { email } });
    // if (existingUser) {
    //   return NextResponse.json(
    //     { error: "Este email ya está registrado" },
    //     { status: 409 }
    //   );
    // }

    // Mock: Create user in database
    // const hashedPassword = await bcrypt.hash(password, 10);
    // const user = await db.user.create({
    //   data: {
    //     name,
    //     email,
    //     password: hashedPassword,
    //     company,
    //   },
    // });

    // For now, return success
    return NextResponse.json(
      {
        message: "Usuario creado exitosamente",
        user: {
          id: "mock-id",
          name,
          email,
          company,
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
