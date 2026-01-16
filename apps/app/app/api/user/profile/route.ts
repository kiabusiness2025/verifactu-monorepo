import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken } from "@verifactu/utils";
import { readSessionSecret } from "@/lib/session";
import { query } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const sessionCookie = req.cookies.get("session")?.value;
    if (!sessionCookie) {
      return NextResponse.json({ error: "No session" }, { status: 401 });
    }

    const secret = readSessionSecret();
    const payload = await verifySessionToken(sessionCookie, secret);
    if (!payload?.uid) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const result = await query(
      `SELECT id, email, name, phone, photo_url, created_at, updated_at
       FROM users
       WHERE id = $1`,
      [payload.uid]
    );

    if (result.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const user = result[0];
    return NextResponse.json({
      ok: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        photoURL: user.photo_url,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
      },
    });
  } catch (error) {
    console.error("GET /api/user/profile error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const sessionCookie = req.cookies.get("session")?.value;
    if (!sessionCookie) {
      return NextResponse.json({ error: "No session" }, { status: 401 });
    }

    const secret = readSessionSecret();
    const payload = await verifySessionToken(sessionCookie, secret);
    if (!payload?.uid) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const body = await req.json();
    const { name, phone, photoURL } = body;

    // Validar datos
    if (name !== undefined && (!name || name.trim().length === 0)) {
      return NextResponse.json({ error: "Name cannot be empty" }, { status: 400 });
    }

    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramIndex}`);
      values.push(name.trim());
      paramIndex++;
    }

    if (phone !== undefined) {
      updates.push(`phone = $${paramIndex}`);
      values.push(phone || null);
      paramIndex++;
    }

    if (photoURL !== undefined) {
      updates.push(`photo_url = $${paramIndex}`);
      values.push(photoURL || null);
      paramIndex++;
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    updates.push(`updated_at = NOW()`);
    values.push(payload.uid);

    const sql = `
      UPDATE users
      SET ${updates.join(", ")}
      WHERE id = $${paramIndex}
      RETURNING id, email, name, phone, photo_url, updated_at
    `;

    const result = await query(sql, values);

    if (result.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const user = result[0];
    return NextResponse.json({
      ok: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        photoURL: user.photo_url,
        updatedAt: user.updated_at,
      },
    });
  } catch (error) {
    console.error("PATCH /api/user/profile error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
