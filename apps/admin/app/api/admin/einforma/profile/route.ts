import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import prisma from "@/lib/prisma";
import { rateLimit } from "@/lib/rateLimit";
import { getCompanyProfileByNif } from "@/server/einforma";

export const runtime = "nodejs";
export const dynamic = 'force-dynamic';

function normalizeTaxId(value: string) {
  return value.replace(/\s+/g, '').toUpperCase();
}

function splitCnae(value?: string) {
  if (!value) return { code: undefined, text: undefined };
  const parts = value
    .split(' - ')
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length === 0) return { code: undefined, text: undefined };
  if (parts.length === 1) return { code: parts[0], text: undefined };
  return { code: parts[0], text: parts.slice(1).join(' - ') };
}

function normalizeCity(value?: string) {
  if (!value) return { postalCode: undefined, city: undefined };
  const trimmed = value.trim();
  const match = trimmed.match(/^(\d{5})\s+([^()]+)(?:\s*\(.*\))?$/);
  if (match) {
    return { postalCode: match[1], city: match[2].trim() };
  }
  return { postalCode: undefined, city: trimmed.split('(')[0]?.trim() || trimmed };
}

function withinDays(date: Date, days: number) {
  const ms = days * 24 * 60 * 60 * 1000;
  return Date.now() - date.getTime() <= ms;
}

function addDays(days: number) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

function extractRawTaxId(raw: unknown) {
  const data = raw as any;
  const value =
    data?.empresa?.identificativo ??
    data?.empresa?.nif ??
    data?.empresa?.cif ??
    data?.identificativo ??
    data?.nif ??
    data?.cif ??
    null;
  return value ? normalizeTaxId(String(value)) : null;
}

export async function GET(req: Request) {
  try {
    const admin = await requireAdmin(req);

    const limiter = rateLimit(req, {
      limit: 20,
      windowMs: 60_000,
      keyPrefix: "einforma-admin-profile"
    });
    if (!limiter.ok) {
      return NextResponse.json(
        { error: "Rate limit exceeded" },
        { status: 429, headers: { "Retry-After": String(limiter.retryAfter) } }
      );
    }

    const { searchParams } = new URL(req.url);
    const nif = (searchParams.get("nif") ?? "").trim().toUpperCase();
    const refresh = (searchParams.get("refresh") ?? "").trim() === "1";

    if (!nif) {
      return NextResponse.json({ error: "Falta nif" }, { status: 400 });
    }

    const normalizedNif = normalizeTaxId(nif);

    const tenant = await prisma.tenant.findFirst({
      where: { nif: normalizedNif },
      include: { profile: true },
    });

    const cachedTaxId = tenant?.profile?.sourceId
      ? normalizeTaxId(tenant.profile.sourceId)
      : extractRawTaxId(tenant?.profile?.einformaRaw);

    if (
      !refresh &&
      tenant?.profile?.einformaLastSyncAt &&
      tenant.profile.einformaTaxIdVerified &&
      withinDays(tenant.profile.einformaLastSyncAt, 30) &&
      cachedTaxId === normalizedNif
    ) {
      const profile = {
        name: tenant.name ?? '',
        legalName: tenant.legalName ?? undefined,
        nif: tenant.nif ?? normalizedNif,
        cnae: tenant.profile.cnae ?? undefined,
        legalForm: tenant.profile.legalForm ?? undefined,
        status: tenant.profile.status ?? undefined,
        website: tenant.profile.website ?? undefined,
        capitalSocial:
          typeof tenant.profile.capitalSocial === 'number'
            ? tenant.profile.capitalSocial
            : tenant.profile.capitalSocial ?? undefined,
        constitutionDate: tenant.profile.incorporationDate
          ? tenant.profile.incorporationDate.toISOString().slice(0, 10)
          : undefined,
        sourceId: tenant.profile.sourceId ?? undefined,
        address: {
          street: tenant.profile.address ?? undefined,
          zip: tenant.profile.postalCode ?? undefined,
          city: tenant.profile.city ?? undefined,
          province: tenant.profile.province ?? undefined,
          country: tenant.profile.country ?? 'ES',
        },
        raw: tenant.profile.einformaRaw ?? undefined,
      };

      try {
        await prisma.auditLog.create({
          data: {
            actorUserId: admin.userId,
            action: "COMPANY_VIEW",
            targetCompanyId: tenant.id,
            metadata: {
              action: "EINFORMA.PROFILE_FETCH",
              cached: true,
              refresh,
              taxId: normalizedNif,
              tenantId: tenant.id,
            },
          },
        });
      } catch (error) {
        console.error("Error logging audit event:", error);
      }

      return NextResponse.json({
        ok: true,
        profile,
        normalized: {
          name: profile.legalName || profile.name || null,
          legalName: profile.legalName ?? null,
          nif: profile.nif || normalizedNif,
          address: profile.address?.street ?? null,
          province: profile.address?.province ?? null,
          country: profile.address?.country ?? 'ES',
          cnaeCode: tenant.profile.cnaeCode ?? null,
          cnaeText: tenant.profile.cnaeText ?? null,
          postalCode: tenant.profile.postalCode ?? null,
          city: tenant.profile.city ?? null,
          sourceId: profile.sourceId ?? profile.nif ?? null,
        },
        cached: true,
        cacheSource: "tenantProfile",
        lastSyncAt: tenant.profile.einformaLastSyncAt?.toISOString() ?? null,
      });
    }

    if (!refresh) {
      const lookup = await prisma.einformaLookup.findUnique({
        where: { queryType_queryValue: { queryType: "TAX_ID", queryValue: normalizedNif } },
        select: { raw: true, normalized: true, expiresAt: true, updatedAt: true },
      });

      if (lookup && lookup.expiresAt > new Date()) {
        try {
          await prisma.auditLog.create({
            data: {
              actorUserId: admin.userId,
              action: "COMPANY_VIEW",
              targetCompanyId: tenant?.id,
              metadata: {
                action: "EINFORMA.PROFILE_FETCH",
                cached: true,
                refresh,
                taxId: normalizedNif,
                tenantId: tenant?.id ?? null,
                cacheSource: "einformaLookup",
              },
            },
          });
        } catch (error) {
          console.error("Error logging audit event:", error);
        }

        return NextResponse.json({
          ok: true,
          profile: lookup.raw,
          normalized: lookup.normalized,
          cached: true,
          cacheSource: "einformaLookup",
          lastSyncAt: lookup.updatedAt?.toISOString() ?? null,
        });
      }
    }

    const profile = await getCompanyProfileByNif(nif);
    const cnaeParts = splitCnae(profile.cnae);
    const cityParts = normalizeCity(profile.address?.city);
    const normalized = {
      name: profile.legalName || profile.name || null,
      legalName: profile.legalName ?? null,
      nif: profile.nif || normalizedNif,
      address: profile.address?.street ?? null,
      province: profile.address?.province ?? null,
      country: profile.address?.country ?? 'ES',
      cnaeCode: cnaeParts.code ?? null,
      cnaeText: cnaeParts.text ?? null,
      postalCode: cityParts.postalCode ?? null,
      city: cityParts.city ?? null,
      sourceId: profile.sourceId ?? profile.nif ?? null,
    };

    if (tenant?.id) {
      try {
        await prisma.tenantProfile.upsert({
          where: { tenantId: tenant.id },
          create: {
            tenantId: tenant.id,
            source: 'einforma',
            sourceId: profile.sourceId ?? normalizedNif,
            cnae: profile.cnae || undefined,
            cnaeCode: cnaeParts.code,
            cnaeText: cnaeParts.text,
            legalForm: profile.legalForm || undefined,
            status: profile.status || undefined,
            website: profile.website || undefined,
            capitalSocial: profile.capitalSocial ?? undefined,
            incorporationDate: profile.constitutionDate
              ? new Date(profile.constitutionDate)
              : undefined,
            address: profile.address?.street || undefined,
            postalCode: cityParts.postalCode,
            city: cityParts.city || undefined,
            province: profile.address?.province || undefined,
            country: profile.address?.country || undefined,
            einformaLastSyncAt: new Date(),
            einformaTaxIdVerified:
              !!profile.nif && normalizeTaxId(profile.nif) === normalizedNif,
            einformaRaw: profile.raw ?? undefined,
          },
          update: {
            source: 'einforma',
            sourceId: profile.sourceId ?? normalizedNif,
            cnae: profile.cnae || undefined,
            cnaeCode: cnaeParts.code,
            cnaeText: cnaeParts.text,
            legalForm: profile.legalForm || undefined,
            status: profile.status || undefined,
            website: profile.website || undefined,
            capitalSocial: profile.capitalSocial ?? undefined,
            incorporationDate: profile.constitutionDate
              ? new Date(profile.constitutionDate)
              : undefined,
            address: profile.address?.street || undefined,
            postalCode: cityParts.postalCode,
            city: cityParts.city || undefined,
            province: profile.address?.province || undefined,
            country: profile.address?.country || undefined,
            einformaLastSyncAt: new Date(),
            einformaTaxIdVerified:
              !!profile.nif && normalizeTaxId(profile.nif) === normalizedNif,
            einformaRaw: profile.raw ?? undefined,
          },
        });
      } catch (error) {
        console.error("Error persisting eInforma snapshot:", error);
      }
    }

    try {
      await prisma.einformaLookup.upsert({
        where: { queryType_queryValue: { queryType: "TAX_ID", queryValue: normalizedNif } },
        create: {
          queryType: "TAX_ID",
          queryValue: normalizedNif,
          raw: profile.raw ?? profile,
          normalized,
          expiresAt: addDays(30),
        },
        update: {
          raw: profile.raw ?? profile,
          normalized,
          expiresAt: addDays(30),
        },
      });
    } catch (error) {
      console.error("Error saving eInforma lookup cache:", error);
    }

    try {
      await prisma.auditLog.create({
        data: {
          actorUserId: admin.userId,
          action: "COMPANY_VIEW",
          targetCompanyId: tenant?.id,
          metadata: {
            action: "EINFORMA.PROFILE_FETCH",
            cached: false,
            refresh,
            taxId: normalizedNif,
            tenantId: tenant?.id ?? null,
          },
        },
      });
    } catch (error) {
      console.error("Error logging audit event:", error);
    }

    return NextResponse.json({
      ok: true,
      profile,
      normalized,
      cached: false,
      cacheSource: "einforma",
      lastSyncAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Einforma profile error:", error);

    if (error instanceof Error && error.message.includes("FORBIDDEN")) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    return NextResponse.json(
      { error: "No se pudo consultar eInforma" },
      { status: 500 }
    );
  }
}
