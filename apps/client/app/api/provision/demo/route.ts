import { NextResponse } from "next/server";
import { prisma } from "@verifactu/db"; // ajusta si tu prisma vive en otro paquete

async function requireFirebaseUser(_req: Request) {
  // TODO: integrar vuestra cookie/session Firebase
  // return { firebaseUid: "...", email: "...", name: "..." }
  throw new Error("Implement Firebase auth (requireFirebaseUser)");
}

export async function POST(req: Request) {
  try {
    const fb = await requireFirebaseUser(req);

    const user = await prisma.user.findUnique({ where: { firebaseUid: fb.firebaseUid } });
    if (!user) throw new Error("User not found in DB");

    const existing = await prisma.userOnboarding.findUnique({ where: { userId: user.id } });
    if (existing?.demoTenantId) {
      return NextResponse.json({ ok: true, tenantId: existing.demoTenantId, already: true });
    }

    const tenantId = await prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          name: "Empresa Demo SL",
          country: "ES",
          currency: "EUR",
          timezone: "Europe/Madrid",
          status: "ACTIVE",
          settings: { create: { verifactuMode: "NON_VERIFACTU", invoiceDefaultSeries: "A", fiscalYearStartMonth: 1 } },
          companyProfile: { create: { legalName: "Empresa Demo SL", tradeName: "Empresa Demo", taxId: "B12345678" } },
        },
      });

      await tx.membership.create({
        data: { tenantId: tenant.id, userId: user.id, role: "OWNER", isActive: true },
      });

      const c1 = await tx.customer.create({
        data: { tenantId: tenant.id, name: "Nova Retail", taxId: "12345678Z", email: "contabilidad@novaretail.es" },
      });
      const c2 = await tx.customer.create({
        data: { tenantId: tenant.id, name: "Luna Tech", taxId: "X1234567T", email: "admin@lunatech.es" },
      });

      // Invoices draft (para que dashboard tenga “ventas mes”)
      await tx.invoice.create({
        data: {
          tenantId: tenant.id,
          customerId: c1.id,
          status: "ISSUED",
          series: "A",
          number: 132,
          type: "STANDARD",
          issueDate: new Date(),
          issuedAt: new Date(),
          subtotal: "1500",
          taxTotal: "315",
          total: "1815",
          lines: { create: [{ position: 1, description: "Servicio mensual", quantity: "1", unitPrice: "1500", discount: "0", lineSubtotal: "1500", lineTax: "315", lineTotal: "1815" }] },
        },
      });

      await tx.invoice.create({
        data: {
          tenantId: tenant.id,
          customerId: c2.id,
          status: "ISSUED",
          series: "A",
          number: 133,
          type: "STANDARD",
          issueDate: new Date(),
          issuedAt: new Date(),
          subtotal: "800",
          taxTotal: "168",
          total: "968",
          lines: { create: [{ position: 1, description: "Consultoría", quantity: "1", unitPrice: "800", discount: "0", lineSubtotal: "800", lineTax: "168", lineTotal: "968" }] },
        },
      });

      await tx.userOnboarding.upsert({
        where: { userId: user.id },
        create: { userId: user.id, demoTenantId: tenant.id },
        update: { demoTenantId: tenant.id },
      });

      return tenant.id;
    });

    return NextResponse.json({ ok: true, tenantId, already: false });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "Unknown error" }, { status: 400 });
  }
}
