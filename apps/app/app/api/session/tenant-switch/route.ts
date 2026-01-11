import { NextResponse } from "next/server";
import { getSessionPayload, requireUserId } from "../../../../lib/session";
import { ensureRole } from "../../../../lib/authz";
import { Roles } from "../../../../lib/roles";
import { setUserPreferredTenant } from "../../../../lib/preferences";
import { fetchMembership } from "../../../../lib/memberships";

export async function POST(req: Request) {
  const session = await getSessionPayload();
  const guard = ensureRole({ session, minRole: Roles.default });
  if (guard) return guard;
  const uid = requireUserId(session);

  const body = await req.json().catch(() => null);
  const tenantId = typeof body?.tenantId === "string" ? body.tenantId.trim() : "";
  if (!tenantId) {
    return NextResponse.json({ ok: false, error: "tenantId required" }, { status: 400 });
  }

  // Validate user has access to this tenant
  const membership = await fetchMembership(uid, tenantId);
  if (!membership || membership.status !== "active") {
    return NextResponse.json({ ok: false, error: "no active membership for tenant" }, { status: 403 });
  }

  await setUserPreferredTenant(uid, tenantId).catch((err) => {
    console.error("[tenant-switch] Failed to persist preference:", err);
  });

  return NextResponse.json({ ok: true, tenantId, role: membership.role });
}
