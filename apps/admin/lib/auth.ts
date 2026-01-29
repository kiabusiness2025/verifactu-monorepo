import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "./auth-options";

export type AdminSession = {
  userId: string | null;
  role?: string | null;
  email?: string | null;
};

type SessionLike = {
  user?: {
    id?: string | null;
    role?: string | null;
    email?: string | null;
    name?: string | null;
  } | null;
};

function isLocalBypassEnabled() {
  return process.env.ADMIN_LOCAL_BYPASS === "1" && process.env.NODE_ENV !== "production";
}

export async function getAdminSessionOrNull(): Promise<SessionLike | null> {
  const session = (await getServerSession(authOptions)) as SessionLike | null;
  if (session?.user) return session;

  if (isLocalBypassEnabled()) {
    return {
      user: {
        id: "local-admin",
        role: "ADMIN",
        email: "local@verifactu.business",
        name: "Admin Local",
      },
    };
  }

  return null;
}

export async function requireAdminSession(): Promise<AdminSession> {
  const session = await getAdminSessionOrNull();
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
