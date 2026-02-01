import { NextResponse } from "next/server";
import { prisma } from "@verifactu/db";

async function requireFirebaseUser(_req: Request): Promise<{ userId: string }> {
  // TODO: integrar vuestra cookie/session Firebase
  // return { userId: "..." }
  throw new Error("Implement requireFirebaseUser");
}

export async function POST(req: Request) {
  try {
    const fb = await requireFirebaseUser(req);

    const user = await prisma.user.findUnique({ where: { id: fb.userId } });
    if (!user) throw new Error("User not found in DB");

    const existingTenant = await prisma.tenant.findFirst({
      where: {
        name: "Empresa Demo SL",
        users: { some: { userId: user.id } },
      },
      select: { id: true },
    });
    if (existingTenant?.id) {
      return NextResponse.json({ ok: true, tenantId: existingTenant.id, already: true });
    }

    const tenantId = await prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          name: "Empresa Demo SL",
          legalName: "Empresa Demo SL",
          nif: "B12345678",
          isDemo: true,
        },
      });

      await tx.membership.create({
        data: { tenantId: tenant.id, userId: user.id, role: "OWNER", status: "active" },
      });

      await tx.userPreference.upsert({
        where: { userId: user.id },
        create: { userId: user.id, preferredTenantId: tenant.id },
        update: { preferredTenantId: tenant.id },
      });

      return tenant.id;
    });

    return NextResponse.json({ ok: true, tenantId, already: false });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "Unknown error" }, { status: 400 });
  }
}
