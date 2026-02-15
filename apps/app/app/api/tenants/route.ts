import { NextResponse } from "next/server";
import { getSessionPayload, requireUserId } from "../../../lib/session";
import { ensureRole } from "../../../lib/authz";
import { Roles } from "../../../lib/roles";
import { createTenantWithOwner, listTenantsForUser, upsertUser } from "../../../lib/tenants";
import { getUserPreferredTenant } from "../../../lib/preferences";

export async function GET() {
  const session = await getSessionPayload();
  const guard = ensureRole({ session, minRole: Roles.default });
  if (guard) return guard;
  const uid = requireUserId(session);
  const tenants = await listTenantsForUser(uid).catch(() => []);
  const preferredTenantId = await getUserPreferredTenant(uid).catch(() => null);
  return NextResponse.json({ ok: true, tenants, preferredTenantId });
}

export async function POST(req: Request) {
  const session = await getSessionPayload();
  const guard = ensureRole({ session, minRole: Roles.default });
  if (guard) return guard;
  const uid = requireUserId(session);
  await upsertUser({ id: uid, email: session?.email as string | undefined, name: session?.name as string | undefined });

  const body = await req.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const nif = typeof body?.nif === "string" ? body.nif.trim() : "";
  if (!name) {
    return NextResponse.json({ ok: false, error: "name required" }, { status: 400 });
  }

  const existingTenants = await listTenantsForUser(uid).catch(() => []);
  if (existingTenants.length >= 1) {
    return NextResponse.json(
      {
        ok: false,
        action: "TRIAL_LIMIT_REACHED",
        error:
          "En modo prueba solo puedes usar una empresa. Para añadir otra empresa, contrata un plan.",
        billingUrl: "/dashboard/settings?tab=billing",
      },
      { status: 409 }
    );
  }

  const tenantId = await createTenantWithOwner({ name, ownerId: uid, nif: nif || null });
  return NextResponse.json({ ok: true, tenant: { id: tenantId, name, ownerId: uid } });
}
