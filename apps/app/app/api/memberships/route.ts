import { NextResponse } from "next/server";
import { getSessionPayload, requireUserId } from "../../../lib/session";
import { ensureTenantAccess } from "../../../lib/authz";
import { Roles } from "../../../lib/roles";
import { addMembership, fetchMembership, listMemberships, parseRole } from "../../../lib/memberships";

export async function GET() {
  const session = await getSessionPayload();
  if (!session) return NextResponse.json({ ok: false, error: "missing session" }, { status: 401 });
  const uid = requireUserId(session);

  const memberships = await listMemberships(uid).catch(() => []);
  return NextResponse.json({ ok: true, memberships });
}

export async function POST(req: Request) {
  const session = await getSessionPayload();
  const body = await req.json().catch(() => null);
  const tenantId = typeof body?.tenantId === "string" ? body.tenantId.trim() : "";
  const guard = await ensureTenantAccess({
    session,
    tenantId,
    minRole: "admin",
    getMembership: fetchMembership,
  });
  if (guard) return guard;
  const actorId = requireUserId(session);

  const targetUserId = typeof body?.userId === "string" ? body.userId.trim() : "";
  const role = parseRole(body?.role, Roles.default);

  if (!tenantId || !targetUserId) {
    return NextResponse.json({ ok: false, error: "tenantId and userId required" }, { status: 400 });
  }

  await addMembership({ tenantId, userId: targetUserId, role, invitedBy: actorId });
  return NextResponse.json({ ok: true, membership: { tenantId, userId: targetUserId, role, invitedBy: actorId } });
}
