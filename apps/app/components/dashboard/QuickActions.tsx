"use client";

import React from "react";
import { useRouter } from "next/navigation";
import {
  FileText,
  Receipt,
  UploadCloud,
  CalendarClock,
  Building2,
  type LucideIcon,
} from "lucide-react";
import { useCreateCompanyModal } from "@/context/CreateCompanyModalContext";

type Action = {
  label: string;
  description: string;
  href: string;
  accent: string;
  badge: string;
  icon: LucideIcon;
  onClick?: () => void;
};

export function QuickActions({ isDemo = false }: { isDemo?: boolean }) {
  const router = useRouter();
  const createCompanyModal = useCreateCompanyModal();
  const openCreateCompany = createCompanyModal?.openModal;

  const actions: Action[] = [
    {
      label: "Factura",
      description: "Crea o revisa cobros",
      href: "/dashboard/invoices",
      accent: "from-[#0b6cfb] to-[#4cc3ff]",
      badge: "Ventas",
      icon: FileText,
    },
    {
      label: "Gasto",
      description: "Registra proveedores",
      href: "/dashboard/expenses",
      accent: "from-[#20c997] to-[#4fe3b3]",
      badge: "Pagos",
      icon: Receipt,
    },
    {
      label: "Documento",
      description: "Sube y organiza",
      href: "/dashboard/documents",
      accent: "from-[#ff8a3d] to-[#ffb570]",
      badge: "Archivo",
      icon: UploadCloud,
    },
    {
      label: "Calendario",
      description: "Mira plazos",
      href: "/dashboard/calendar",
      accent: "from-[#ff6b6b] to-[#ffa45c]",
      badge: "Fiscal",
      icon: CalendarClock,
    },
    {
      label: "Nueva empresa",
      description: "Crear o importar",
      href: "/dashboard/settings?tab=general",
      accent: "from-[#1f4eff] to-[#66c2ff]",
      badge: "Empresa",
      icon: Building2,
      onClick: openCreateCompany,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {actions.map((action) => (
        <button
          key={action.label}
          onClick={() => {
            if (isDemo) return;
            if (action.onClick) {
              action.onClick();
              return;
            }
            router.push(action.href);
          }}
          disabled={isDemo}
          className="group flex h-full flex-col justify-between rounded-2xl border border-slate-200 bg-white/90 p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-[#0b214a]">
                {action.label}
              </p>
              <p className="text-xs text-slate-500">{action.description}</p>
            </div>
            <span
              className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br ${action.accent} text-xs font-semibold text-white shadow-sm`}
            >
              <action.icon className="h-5 w-5" aria-hidden="true" />
            </span>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
              {action.badge}
            </span>
            <span className="text-xs font-semibold text-[#0b6cfb]">
              Ir
            </span>
          </div>
        </button>
      ))}
    </div>
  );
}
