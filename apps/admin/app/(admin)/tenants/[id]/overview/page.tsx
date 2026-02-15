"use client";

import { AccessibleButton } from "@/components/accessibility/AccessibleButton";
import { TableSkeleton } from "@/components/accessibility/LoadingSkeleton";
import { useToast } from "@/components/notifications/ToastNotifications";
import { adminGet, adminPost } from "@/lib/adminApi";
import { formatShortDate } from "@/src/lib/formatters";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

type TenantData = {
  id: string;
  legalName: string;
  taxId: string;
  address?: string | null;
  cnae?: string | null;
  postalCode?: string | null;
  city?: string | null;
  province?: string | null;
  country?: string | null;
  legalForm?: string | null;
  profileStatus?: string | null;
  website?: string | null;
  capitalSocial?: string | null;
  incorporationDate?: string | null;
  representative?: string | null;
  email?: string | null;
  phone?: string | null;
  employees?: number | null;
  sales?: string | null;
  salesYear?: number | null;
  lastBalanceDate?: string | null;
  createdAt?: string;
  status?: string;
};

function escapeHtml(value?: string | number | null) {
  const source = value == null ? "" : String(value);
  return source
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function buildCompanySheetHtml(tenant: TenantData) {
  const rows: Array<[string, string | number | null | undefined]> = [
    ["Razón social", tenant.legalName],
    ["CIF/NIF", tenant.taxId],
    ["Dirección", tenant.address],
    ["Código postal", tenant.postalCode],
    ["Ciudad", tenant.city],
    ["Provincia", tenant.province],
    ["País", tenant.country],
    ["CNAE", tenant.cnae],
    ["Forma jurídica", tenant.legalForm],
    ["Estado", tenant.profileStatus ?? tenant.status],
    ["Web", tenant.website],
    ["Capital social", tenant.capitalSocial],
    ["Constitución", tenant.incorporationDate],
    ["Representante", tenant.representative],
    ["Email", tenant.email],
    ["Teléfono", tenant.phone],
    ["Empleados", tenant.employees],
    ["Ventas", tenant.sales],
    ["Año ventas", tenant.salesYear],
    ["Último balance", tenant.lastBalanceDate],
    ["Fecha alta", tenant.createdAt],
  ];

  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>Ficha de Empresa - ${escapeHtml(tenant.legalName)}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 28px; color: #0f172a; }
    .header { border-bottom: 3px solid #0b6cfb; padding-bottom: 10px; margin-bottom: 18px; }
    .brand { color: #0b6cfb; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; font-size: 12px; }
    .title { margin: 6px 0 0; font-size: 22px; }
    .meta { color: #475569; font-size: 12px; margin-top: 4px; }
    table { width: 100%; border-collapse: collapse; margin-top: 14px; }
    th, td { border: 1px solid #cbd5e1; padding: 8px 10px; text-align: left; vertical-align: top; }
    th { width: 240px; background: #f8fafc; color: #334155; font-size: 12px; text-transform: uppercase; }
    td { font-size: 13px; color: #0f172a; }
  </style>
</head>
<body>
  <div class="header">
    <div class="brand">verifactu.business</div>
    <h1 class="title">Ficha completa de empresa</h1>
    <div class="meta">Documento generado desde panel Admin</div>
  </div>
  <table>
    ${rows
      .map(
        ([label, value]) =>
          `<tr><th>${escapeHtml(label)}</th><td>${escapeHtml(value ?? "--")}</td></tr>`
      )
      .join("")}
  </table>
</body>
</html>`;
}

export default function TenantOverviewPage() {
  const params = useParams();
  const tenantId = params.id as string;
  const { success, error: showError } = useToast();
  const [tenant, setTenant] = useState<TenantData | null>(null);
  const [loading, setLoading] = useState(true);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://app.verifactu.business";

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        const data = await adminGet<{ tenant: TenantData }>(`/api/admin/tenants/${tenantId}`);
        if (mounted) {
          setTenant(data.tenant);
        }
      } catch (err) {
        showError(err instanceof Error ? err.message : "No se pudo cargar el tenant");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [tenantId, showError]);

  async function setActiveTenant() {
    try {
      await adminPost(`/api/admin/tenants/${tenantId}/set-active`, {});
      success("Tenant seleccionado");
    } catch (err) {
      showError(err instanceof Error ? err.message : "No se pudo seleccionar");
    }
  }

  async function startSupportSession() {
    try {
      const res = await adminPost<{ handoffToken: string }>(
        "/api/admin/support-sessions/start",
        {
          tenantId,
          reason: "support",
        }
      );
      const url = `${appUrl}/support/handoff?token=${encodeURIComponent(res.handoffToken)}`;
      window.open(url, "_blank", "noopener,noreferrer");
      success("Sesion de soporte iniciada");
    } catch (err) {
      showError(err instanceof Error ? err.message : "No se pudo iniciar soporte");
    }
  }

  function printSheet() {
    if (!tenant) return;
    const html = buildCompanySheetHtml(tenant);
    const win = window.open("", "_blank", "noopener,noreferrer");
    if (!win) return;
    win.document.open();
    win.document.write(html);
    win.document.close();
    win.focus();
    win.print();
  }

  function exportSheet() {
    if (!tenant) return;
    const html = buildCompanySheetHtml(tenant);
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `verifactu-ficha-${tenant.taxId || tenant.id}.html`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  if (loading) {
    return <TableSkeleton rows={4} columns={3} />;
  }

  if (!tenant) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
        Tenant no encontrado.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold text-slate-900">{tenant.legalName || "Tenant"}</h1>
            <div className="text-xs text-slate-500">{tenant.taxId || "Sin CIF"}</div>
          </div>
          <div className="flex flex-wrap gap-2">
            <AccessibleButton variant="secondary" size="sm" onClick={setActiveTenant}>
              Seleccionar
            </AccessibleButton>
            <AccessibleButton variant="secondary" size="sm" onClick={startSupportSession}>
              Entrar como
            </AccessibleButton>
            <AccessibleButton variant="secondary" size="sm" onClick={printSheet}>
              Imprimir ficha
            </AccessibleButton>
            <AccessibleButton variant="secondary" size="sm" onClick={exportSheet}>
              Exportar ficha
            </AccessibleButton>
            <Link
              href={`/tenants/${tenantId}/billing`}
              className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Ver billing
            </Link>
            <Link
              href={`/tenants/${tenantId}/integrations`}
              className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Integraciones
            </Link>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft">
          <div className="text-xs text-slate-500">Estado</div>
          <div className="mt-2 text-sm font-semibold text-slate-900">
            {tenant.status || "active"}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft">
          <div className="text-xs text-slate-500">Alta</div>
          <div className="mt-2 text-sm font-semibold text-slate-900">
            {tenant.createdAt ? formatShortDate(tenant.createdAt) : "--"}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft">
          <div className="text-xs text-slate-500">Direccion</div>
          <div className="mt-2 text-sm font-semibold text-slate-900">
            {tenant.address || "Sin direccion"}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft">
        <h2 className="text-sm font-semibold text-slate-900">Ficha completa</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="text-xs text-slate-500">Razón social</div>
          <div className="text-sm text-slate-900">{tenant.legalName || "--"}</div>
          <div className="text-xs text-slate-500">CIF/NIF</div>
          <div className="text-sm text-slate-900">{tenant.taxId || "--"}</div>
          <div className="text-xs text-slate-500">CNAE</div>
          <div className="text-sm text-slate-900">{tenant.cnae || "--"}</div>
          <div className="text-xs text-slate-500">Forma jurídica</div>
          <div className="text-sm text-slate-900">{tenant.legalForm || "--"}</div>
          <div className="text-xs text-slate-500">Estado</div>
          <div className="text-sm text-slate-900">{tenant.profileStatus || tenant.status || "--"}</div>
          <div className="text-xs text-slate-500">Web</div>
          <div className="text-sm text-slate-900">{tenant.website || "--"}</div>
          <div className="text-xs text-slate-500">Representante</div>
          <div className="text-sm text-slate-900">{tenant.representative || "--"}</div>
          <div className="text-xs text-slate-500">Email</div>
          <div className="text-sm text-slate-900">{tenant.email || "--"}</div>
          <div className="text-xs text-slate-500">Teléfono</div>
          <div className="text-sm text-slate-900">{tenant.phone || "--"}</div>
          <div className="text-xs text-slate-500">Dirección</div>
          <div className="text-sm text-slate-900">
            {[tenant.address, tenant.postalCode, tenant.city, tenant.province, tenant.country]
              .filter(Boolean)
              .join(", ") || "--"}
          </div>
          <div className="text-xs text-slate-500">Capital social</div>
          <div className="text-sm text-slate-900">{tenant.capitalSocial || "--"}</div>
          <div className="text-xs text-slate-500">Constitución</div>
          <div className="text-sm text-slate-900">{tenant.incorporationDate || "--"}</div>
          <div className="text-xs text-slate-500">Empleados</div>
          <div className="text-sm text-slate-900">{tenant.employees ?? "--"}</div>
          <div className="text-xs text-slate-500">Ventas</div>
          <div className="text-sm text-slate-900">{tenant.sales || "--"}</div>
          <div className="text-xs text-slate-500">Año ventas</div>
          <div className="text-sm text-slate-900">{tenant.salesYear ?? "--"}</div>
          <div className="text-xs text-slate-500">Último balance</div>
          <div className="text-sm text-slate-900">{tenant.lastBalanceDate || "--"}</div>
        </div>
      </div>
    </div>
  );
}
