import { NextResponse } from "next/server";
import { normalizeRole, roleAtLeast, Role } from "./roles";
import { SessionPayload } from "./session";
import { logAuthWarning, logAuthError } from "./logger";

export type Membership = {
  userId: string;
  tenantId: string;
  role: Role;
  status?: "active" | "invited" | "revoked";
};

export type MembershipProvider = (userId: string, tenantId: string) => Promise<Membership | null>;

function forbidden(message: string, metadata?: Record<string, unknown>) {
  logAuthWarning("access-denied", message, metadata);
  return NextResponse.json({ ok: false, error: message }, { status: 403 });
}

export async function ensureTenantAccess(params: {
  session: SessionPayload | null;
  tenantId: string | null;
  minRole: Role;
  getMembership: MembershipProvider;
}) {
  const { session, tenantId, minRole, getMembership } = params;
  if (!session) return forbidden("missing session");
  if (!tenantId) return forbidden("missing tenant");

  const role = normalizeRole((session as Record<string, unknown>).role);
  const uid = session.uid;
  if (!uid) return forbidden("missing uid");

  // Short-circuit if token already encodes a role for the tenant.
  if (role && roleAtLeast(role, minRole)) return null;

  try {
    const membership = await getMembership(uid, tenantId);
    if (!membership) {
      return forbidden("no membership", { uid, tenantId });
    }
    if (!roleAtLeast(membership.role, minRole)) {
      return forbidden("insufficient role", { uid, tenantId, required: minRole, actual: membership.role });
    }
    if (membership.status && membership.status !== "active") {
      return forbidden("inactive membership", { uid, tenantId, status: membership.status });
    }
    return null;
  } catch (err) {
    logAuthError("ensureTenantAccess", err, { uid, tenantId, minRole });
    return NextResponse.json({ ok: false, error: "authorization check failed" }, { status: 500 });
  }
}

export function ensureRole(params: {
  session: SessionPayload | null;
  minRole: Role;
}) {
  const { session, minRole } = params;
  // Get role from either 'role' field or first item from 'roles' array
  const roleValue = (session as Record<string, unknown> | null)?.role ?? 
    (Array.isArray((session as Record<string, unknown> | null)?.roles) 
      ? ((session as Record<string, unknown> | null)?.roles as string[])?.[0]
      : null);
  const role = normalizeRole(roleValue);
  if (!session || !roleAtLeast(role, minRole)) {
    return forbidden("insufficient role", { required: minRole, actual: role ?? "none" });
  }
  return null;
}
