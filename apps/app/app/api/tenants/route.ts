import { NextResponse } from "next/server";
import { getSessionPayload, requireUserId } from "../../../lib/session";
import { ensureRole } from "../../../lib/authz";
import { Roles } from "../../../lib/roles";
import { createTenantWithOwner, listTenantsForUser, upsertUser } from "../../../lib/tenants";

export async function GET() {
  const session = await getSessionPayload();
  const guard = ensureRole({ session, minRole: Roles.default });
  if (guard) return guard;
  const uid = requireUserId(session);
  const tenants = await listTenantsForUser(uid).catch(() => []);
  return NextResponse.json({ ok: true, tenants });
}

export async function POST(req: Request) {
  const session = await getSessionPayload();
  const guard = ensureRole({ session, minRole: Roles.default });
  if (guard) return guard;
  const uid = requireUserId(session);
  await upsertUser({ id: uid, email: session?.email as string | undefined, name: session?.name as string | undefined });

  const body = await req.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (!name) {
    return NextResponse.json({ ok: false, error: "name required" }, { status: 400 });
  }

  const tenantId = await createTenantWithOwner({ name, ownerId: uid });
  return NextResponse.json({ ok: true, tenant: { id: tenantId, name, ownerId: uid } });
}
