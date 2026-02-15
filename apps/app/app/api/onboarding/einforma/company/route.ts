import { NextResponse } from "next/server";
import { ensureRole } from "@/lib/authz";
import { Roles } from "@/lib/roles";
import { getSessionPayload } from "@/lib/session";
import { rateLimit } from "@/lib/rateLimit";
import { getCompanyProfileByNif } from "@/server/einforma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await getSessionPayload();
  const guard = ensureRole({ session, minRole: Roles.default });
  if (guard) return guard;

  const limiter = rateLimit(req, {
    limit: 20,
    windowMs: 60_000,
    keyPrefix: "einforma-onboarding-company"
  });
  if (!limiter.ok) {
    return NextResponse.json(
      { ok: false, error: "rate limit exceeded" },
      { status: 429, headers: { "Retry-After": String(limiter.retryAfter) } }
    );
  }

  const { searchParams } = new URL(req.url);
  const einformaId = searchParams.get("einformaId")?.trim();

  if (!einformaId) {
    return NextResponse.json(
      { ok: false, error: "einformaId required" },
      { status: 400 }
    );
  }

  try {
    const profile = await getCompanyProfileByNif(einformaId);
    return NextResponse.json({
      ok: true,
      company: {
        einformaId,
        name: profile.name,
        legalName: profile.legalName ?? profile.name,
        nif: profile.nif ?? "",
        cnae: profile.cnae ?? "",
        legalForm: profile.legalForm ?? "",
        status: profile.status ?? "",
        website: profile.website ?? "",
        capitalSocial: profile.capitalSocial ?? null,
        incorporationDate: profile.constitutionDate ?? null,
        lastBalanceDate: profile.lastBalanceDate ?? null,
        email: profile.email ?? "",
        phone: profile.phone ?? "",
        employees: profile.employees ?? null,
        sales: profile.sales ?? null,
        salesYear: profile.salesYear ?? null,
        address: profile.address?.street ?? "",
        city: profile.address?.city ?? "",
        postalCode: profile.address?.zip ?? "",
        province: profile.address?.province ?? "",
        country: profile.address?.country ?? "ES",
        representative: profile.representatives?.[0]?.name ?? "",
        raw: profile.raw ?? null,
      },
    });
  } catch (error) {
    console.error("eInforma company error:", error);
    return NextResponse.json(
      { ok: false, error: "eInforma company lookup failed" },
      { status: 502 }
    );
  }
}
