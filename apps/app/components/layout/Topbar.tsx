"use client";

import React from "react";
import Image from "next/image";
import { Button } from "@verifactu/ui";
import { useIsaakUI } from "@/context/IsaakUIContext";
import { useIsaakContext } from "@/hooks/useIsaakContext";

type TopbarProps = {
  onToggleSidebar: () => void;
};

export function Topbar({ onToggleSidebar }: TopbarProps) {
  const { company, setCompany, openDrawer } = useIsaakUI();
  const { greeting } = useIsaakContext();

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:gap-4 sm:px-6">
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

        <div className="ml-auto flex flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
          <div className="flex flex-col">
            <span className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
              Hola
            </span>
            <span className="text-sm font-semibold text-slate-900">{greeting}</span>
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

          <div className="flex items-center gap-2">
            <button
              className="relative h-10 w-10 rounded-full bg-slate-100 text-slate-600 ring-1 ring-slate-200 hover:bg-slate-200"
              aria-label="Notificaciones"
            >
              🔔
              <span className="absolute right-2 top-2 inline-block h-2 w-2 rounded-full bg-emerald-500" />
            </button>
            <Button
              size="sm"
              className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800"
              onClick={openDrawer}
            >
              Isaak
            </Button>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-sm font-semibold text-blue-700 ring-1 ring-blue-100">
              K
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
