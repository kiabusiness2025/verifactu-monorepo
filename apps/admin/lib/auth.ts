import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "./auth-options";

export type AdminSession = {
  userId: string | null;
  role?: string | null;
  email?: string | null;
};

export async function requireAdminSession(): Promise<AdminSession> {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    throw NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = (session.user as any).role ?? null;
  if (role && role !== "ADMIN") {
    throw NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return {
    userId: (session.user as any).id ?? null,
    role,
    email: session.user.email ?? null,
  };
}
