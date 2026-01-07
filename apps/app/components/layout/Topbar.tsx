"use client";

import React from "react";
import Image from "next/image";
import { Button } from "@verifactu/ui";
import { useIsaakUI } from "@/context/IsaakUIContext";
import { useIsaakContext } from "@/hooks/useIsaakContext";
import { getLandingUrl } from "@/lib/urls";

type TopbarProps = {
  onToggleSidebar: () => void;
};

export function Topbar({ onToggleSidebar }: TopbarProps) {
  const { company, setCompany, openDrawer } = useIsaakUI();
  const { greeting } = useIsaakContext();

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:gap-4 sm:px-6">
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleSidebar}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 lg:hidden"
            aria-label="Abrir menú"
          >
            ☰
          </button>
          <div className="hidden items-center gap-2 lg:flex">
            <Image
              src="/brand/logo-horizontal-light.png"
              alt="Verifactu Business"
              width={150}
              height={36}
              priority
            />
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
          <div className="text-sm font-semibold leading-tight text-slate-900">
            {greeting}
          </div>

          <select
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-100 sm:w-56"
          >
            <option>Empresa Demo SL</option>
            <option>Verifactu Labs</option>
            <option>Proyecto Alfa</option>
          </select>

          <div className="flex flex-wrap items-center justify-end gap-2">
            <button
              className="relative hidden h-10 w-10 rounded-full bg-slate-100 text-slate-600 ring-1 ring-slate-200 hover:bg-slate-200 sm:inline-flex"
              aria-label="Notificaciones"
            >
              🔔
              <span className="absolute right-2 top-2 inline-block h-2 w-2 rounded-full bg-emerald-500" />
            </button>
            <Button
              size="sm"
              className="w-full rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 sm:w-auto"
              onClick={openDrawer}
            >
              Isaak
            </Button>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-sm font-semibold text-blue-700 ring-1 ring-blue-100">
              K
            </div>
            <a
              href={getLandingUrl()}
              className="text-xs font-semibold text-slate-600 underline-offset-4 hover:text-blue-700 hover:underline"
            >
              verifactu.business
            </a>
          </div>
        </div>
      </div>
    </header>
  );
}
