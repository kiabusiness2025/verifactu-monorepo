"use client";

import React, { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { Button } from "@verifactu/ui";
import { useIsaakUI } from "@/context/IsaakUIContext";
import { useIsaakContext } from "@/hooks/useIsaakContext";
import { useLogout } from "@/hooks/useLogout";
import { getLandingUrl } from "@/lib/urls";

type TopbarProps = {
  onToggleSidebar: () => void;
  onOpenPreferences?: () => void;
};

export function Topbar({ onToggleSidebar, onOpenPreferences }: TopbarProps) {
  const { company, setCompany, openDrawer } = useIsaakUI();
  const { greeting } = useIsaakContext();
  const { logout, isLoggingOut } = useLogout();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Cerrar menú al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };

    if (showUserMenu) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showUserMenu]);

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
              src="/brand/logo-horizontal-dark.png"
              alt="Verifactu Business"
              width={200}
              height={48}
              priority
              className="h-auto w-auto"
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
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-sm font-semibold text-blue-700 ring-1 ring-blue-100 hover:bg-blue-100 transition-colors"
                aria-label="Menú de usuario"
              >
                K
              </button>
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-48 rounded-lg border border-slate-200 bg-white shadow-lg z-50">
                  <div className="py-1">
                    <a
                      href={getLandingUrl()}
                      className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
                    >
                      verifactu.business
                    </a>
                    <hr className="my-1 border-slate-200" />
                    <button
                      onClick={logout}
                      disabled={isLoggingOut}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isLoggingOut ? "Cerrando sesión..." : "Cerrar sesión"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
