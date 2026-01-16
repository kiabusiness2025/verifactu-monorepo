"use client";

import React, { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import { Button } from "@verifactu/ui";
import { useIsaakUI } from "@/context/IsaakUIContext";
import { useIsaakContext } from "@/hooks/useIsaakContext";
import { useLogout } from "@/hooks/useLogout";
import { getLandingUrl } from "@/lib/urls";
import { useAuth } from "@/hooks/useAuth";

type TopbarProps = {
  onToggleSidebar: () => void;
  onOpenPreferences?: () => void;
};

type TenantOption = {
  id: string;
  name: string;
};

type PanelOption = {
  id: string;
  name: string;
  path: string;
  icon: string;
  description: string;
};

export function Topbar({ onToggleSidebar, onOpenPreferences }: TopbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { setCompany } = useIsaakUI();
  const { greeting } = useIsaakContext();
  const { logout, isLoggingOut } = useLogout();
  const { user: firebaseUser, signOut: firebaseSignOut } = useAuth();
  const [tenants, setTenants] = useState<TenantOption[]>([]);
  const [activeTenantId, setActiveTenantId] = useState("");
  const [isLoadingTenants, setIsLoadingTenants] = useState(true);
  const [isSwitching, setIsSwitching] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const availablePanels: PanelOption[] = [
    {
      id: 'dashboard',
      name: 'Panel Principal',
      path: '/dashboard',
      icon: '📊',
      description: 'Gestión de tu empresa'
    },
    ...(isAdmin ? [{
      id: 'admin',
      name: 'Panel de Administración',
      path: '/dashboard/admin',
      icon: '⚙️',
      description: 'Gestión del sistema'
    }] : [])
  ];

  const currentPanel = pathname?.startsWith('/dashboard/admin') 
    ? availablePanels.find(p => p.id === 'admin')
    : availablePanels.find(p => p.id === 'dashboard');

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

  // Verificar si el usuario es admin
  useEffect(() => {
    async function checkAdminStatus() {
      try {
        const res = await fetch("/api/admin/check", { credentials: "include" });
        const data = await res.json().catch(() => ({ isAdmin: false }));
        setIsAdmin(data.isAdmin === true);
      } catch (error) {
        console.error("Failed to check admin status:", error);
        setIsAdmin(false);
      }
    }
    checkAdminStatus();
  }, [firebaseUser]);

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
          <div className="flex items-center gap-2 text-sm font-semibold leading-tight text-[#002060]">
            <span>{greeting}</span>
            {currentPanel?.id === "admin" && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-amber-700">
                Modo admin
              </span>
            )}
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
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-[#0060F0]/10 text-sm font-semibold text-[#0060F0] ring-1 ring-[#0060F0]/20 transition-colors hover:bg-[#0060F0]/20"
                title={firebaseUser?.email || 'Usuario'}
              >
                {firebaseUser?.photoURL ? (
                  <Image 
                    src={firebaseUser.photoURL} 
                    alt={firebaseUser.displayName || 'Usuario'}
                    width={40}
                    height={40}
                    className="rounded-full"
                  />
                ) : (
                  firebaseUser?.email?.[0].toUpperCase() || 'K'
                )}
              </button>
              {showUserMenu && (
                <div className="absolute right-0 z-50 mt-2 w-64 rounded-lg border border-slate-200 bg-white shadow-lg">
                  <div className="py-1">
                    {firebaseUser && (
                      <>
                        <div className="px-4 py-3 border-b border-slate-200">
                          <p className="text-sm font-medium text-slate-900">
                            {firebaseUser.displayName || 'Usuario'}
                          </p>
                          <p className="text-xs text-slate-500 truncate">
                            {firebaseUser.email}
                          </p>
                          {!firebaseUser.emailVerified && (
                            <span className="inline-block mt-1 px-2 py-0.5 text-xs bg-yellow-100 text-yellow-800 rounded">
                              Email no verificado
                            </span>
                          )}
                        </div>
                      </>
                    )}
                    
                    {/* Selector de Paneles */}
                    {availablePanels.length > 1 && (
                      <>
                        <div className="px-4 py-2 border-b border-slate-200">
                          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
                            Cambiar Panel
                          </p>
                          <div className="space-y-1">
                            {availablePanels.map((panel) => (
                              <button
                                key={panel.id}
                                onClick={() => {
                                  router.push(panel.path);
                                  setShowUserMenu(false);
                                }}
                                className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                                  currentPanel?.id === panel.id
                                    ? 'bg-[#0060F0]/10 text-[#0060F0] font-medium'
                                    : 'text-slate-700 hover:bg-slate-100'
                                }`}
                              >
                                <div className="flex items-start gap-2">
                                  <span className="text-base mt-0.5">{panel.icon}</span>
                                  <div className="flex-1 min-w-0">
                                    <div className="font-medium">{panel.name}</div>
                                    <div className="text-xs text-slate-500 truncate">
                                      {panel.description}
                                    </div>
                                  </div>
                                  {currentPanel?.id === panel.id && (
                                    <svg className="w-4 h-4 mt-1 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                  )}
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      </>
                    )}

                    {onOpenPreferences && (
                      <button
                        onClick={() => {
                          onOpenPreferences();
                          setShowUserMenu(false);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        Preferencias
                      </button>
                    )}
                    <a
                      href="https://verifactu.business"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
                    >
                      🌐 verifactu.business
                    </a>
                    <hr className="my-1 border-slate-200" />
                    <button
                      onClick={async () => {
                        if (firebaseUser) {
                          await firebaseSignOut();
                        } else {
                          await logout();
                        }
                      }}
                      disabled={isLoggingOut}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
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
