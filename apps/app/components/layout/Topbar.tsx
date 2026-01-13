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

type TenantOption = {
  id: string;
  name: string;
};

export function Topbar({ onToggleSidebar, onOpenPreferences }: TopbarProps) {
  const { setCompany, openDrawer } = useIsaakUI();
  const { greeting } = useIsaakContext();
  const { logout, isLoggingOut } = useLogout();
  const [tenants, setTenants] = useState<TenantOption[]>([]);
  const [activeTenantId, setActiveTenantId] = useState("");
  const [isLoadingTenants, setIsLoadingTenants] = useState(true);
  const [isSwitching, setIsSwitching] = useState(false);
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

  useEffect(() => {
    let mounted = true;
    async function loadTenants() {
      setIsLoadingTenants(true);
      try {
        const res = await fetch("/api/tenants", { credentials: "include" });
        const data = await res.json().catch(() => null);
        if (!res.ok || !data?.ok) {
          throw new Error(data?.error || "Failed to load tenants");
        }

        const items = Array.isArray(data.tenants) ? data.tenants : [];
        const preferredId =
          typeof data.preferredTenantId === "string"
            ? data.preferredTenantId
            : "";
        const initialId = preferredId || items[0]?.id || "";
        const initialName =
          items.find((t: TenantOption) => t.id === initialId)?.name ||
          items[0]?.name ||
          "Empresa";

        if (mounted) {
          setTenants(items);
          setActiveTenantId(initialId);
          setCompany(initialName);
        }
      } catch (error) {
        console.error("Failed to load tenants:", error);
        if (mounted) {
          setTenants([]);
          setActiveTenantId("");
        }
      } finally {
        if (mounted) setIsLoadingTenants(false);
      }
    }
    loadTenants();
    return () => {
      mounted = false;
    };
  }, [setCompany]);

  async function handleTenantChange(nextId: string) {
    if (!nextId || nextId === activeTenantId) return;
    setIsSwitching(true);
    try {
      const res = await fetch("/api/session/tenant-switch", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId: nextId }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Failed to switch tenant");
      }

      setActiveTenantId(nextId);
      const selected = tenants.find((tenant) => tenant.id === nextId);
      if (selected?.name) setCompany(selected.name);
    } catch (error) {
      console.error("Failed to switch tenant:", error);
    } finally {
      setIsSwitching(false);
    }
  }

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:gap-4 sm:px-6">
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleSidebar}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 lg:hidden"
            aria-label="Abrir menú"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M3 6h18M3 12h18M3 18h18" />
            </svg>
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
          <div className="text-sm font-semibold leading-tight text-[#002060]">
            {greeting}
          </div>

          <select
            value={activeTenantId || ""}
            onChange={(e) => handleTenantChange(e.target.value)}
            disabled={isLoadingTenants || isSwitching || tenants.length === 0}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-[#0060F0] focus:outline-none focus:ring-2 focus:ring-[#0060F0]/20 disabled:cursor-not-allowed disabled:opacity-60 sm:w-56"
          >
            {tenants.length === 0 ? (
              <option value="">Sin empresas</option>
            ) : (
              tenants.map((tenant) => (
                <option key={tenant.id} value={tenant.id}>
                  {tenant.name}
                </option>
              ))
            )}
          </select>

          <div className="flex flex-wrap items-center justify-end gap-2">
            <button
              className="relative hidden h-10 w-10 rounded-full bg-slate-100 text-slate-600 ring-1 ring-slate-200 hover:bg-slate-200 sm:inline-flex"
              aria-label="Notificaciones"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M18 8a6 6 0 10-12 0c0 7-3 7-3 7h18s-3 0-3-7" />
                <path d="M13.73 21a2 2 0 01-3.46 0" />
              </svg>
              <span className="absolute right-2 top-2 inline-block h-2 w-2 rounded-full bg-emerald-500" />
            </button>
            <Button
              size="sm"
              className="w-full rounded-full bg-gradient-to-r from-[#0060F0] to-[#20B0F0] px-4 py-2 text-xs font-semibold text-white shadow-sm hover:from-[#0056D6] hover:to-[#1AA3DB] sm:w-auto"
              onClick={openDrawer}
            >
              Isaak
            </Button>
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-[#0060F0]/10 text-sm font-semibold text-[#0060F0] ring-1 ring-[#0060F0]/20 transition-colors hover:bg-[#0060F0]/20"
                aria-label="Menú de usuario"
              >
                K
              </button>
              {showUserMenu && (
                <div className="absolute right-0 z-50 mt-2 w-48 rounded-lg border border-slate-200 bg-white shadow-lg">
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
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
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
