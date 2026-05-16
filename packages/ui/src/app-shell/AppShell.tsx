'use client';

import { ChevronLeft, ChevronRight, Menu, X } from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';
import { IsaakDock } from '../isaak/IsaakDock';
import { cn } from '../lib/utils';
import { ModeToggle } from '../theme/ModeToggle';
import type { NavItem } from './types';

type Props = {
  variant: 'client' | 'admin';
  nav: NavItem[];
  pathname: string;
  sidebarBrand?: React.ReactNode;
  sidebarIcon?: React.ReactNode;
  headerLeft?: React.ReactNode;
  headerRight?: React.ReactNode;
  children: React.ReactNode;
  showThemeToggle?: boolean;
  showIsaak?: boolean;
  isaakExtraContext?: Record<string, unknown>;
};

export function AppShell({
  variant,
  nav,
  pathname,
  sidebarBrand,
  sidebarIcon,
  headerLeft,
  headerRight,
  children,
  showThemeToggle,
  showIsaak,
  isaakExtraContext,
}: Props) {
  const isAdmin = variant === 'admin';
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false);
  const [collapsed, setCollapsed] = React.useState(false);

  React.useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  // Restore sidebar state from localStorage after mount (avoids SSR mismatch)
  React.useEffect(() => {
    try {
      setCollapsed(localStorage.getItem('sidebar-collapsed') === '1');
    } catch (_e) {
      // localStorage unavailable (e.g. sandboxed iframe) — keep default
    }
  }, []);

  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    try {
      localStorage.setItem('sidebar-collapsed', next ? '1' : '0');
    } catch (_e) {
      // localStorage unavailable — state still works in memory
    }
  };

  const defaultCollapsedIcon = (
    <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-primary/15 bg-primary/10 text-xs font-bold">
      V
    </div>
  );

  const brandNode = sidebarBrand ?? (
    <div className="flex min-w-0 items-center gap-2">
      <div className="h-8 w-8 rounded-xl bg-primary/10 border border-primary/15" />
      <div className="min-w-0">
        <div className="text-sm font-semibold leading-tight truncate">
          {isAdmin ? 'Verifactu Admin' : 'Verifactu Business'}
        </div>
        <div className="text-xs text-muted-foreground truncate">
          {isAdmin ? 'Backoffice' : 'Panel de cliente'}
        </div>
      </div>
    </div>
  );

  const navLinks = nav.map((item) => {
    const active = item.match ? item.match(pathname) : pathname.startsWith(item.href);
    return (
      <Link
        key={item.href}
        href={item.href}
        title={collapsed ? item.label : undefined}
        className={cn(
          'flex items-center rounded-xl py-2 transition',
          collapsed ? 'justify-center px-2' : 'gap-2 px-3',
          active
            ? 'bg-primary/10 text-foreground border border-primary/15'
            : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground'
        )}
      >
        {item.icon}
        {!collapsed && (
          <>
            <span className="truncate">{item.label}</span>
            {item.badge != null && item.badge > 0 && (
              <span className="ml-auto shrink-0 rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
                {item.badge > 99 ? '99+' : item.badge}
              </span>
            )}
          </>
        )}
      </Link>
    );
  });

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Mobile nav overlay */}
      <div
        className={cn(
          'fixed inset-0 z-40 md:hidden',
          mobileNavOpen ? 'pointer-events-auto' : 'pointer-events-none'
        )}
      >
        <button
          type="button"
          aria-label="Cerrar navegación"
          className={cn(
            'absolute inset-0 bg-slate-950/30 transition-opacity',
            mobileNavOpen ? 'opacity-100' : 'opacity-0'
          )}
          onClick={() => setMobileNavOpen(false)}
        />
        <aside
          className={cn(
            'absolute inset-y-0 left-0 flex w-[290px] max-w-[85vw] flex-col border-r bg-card shadow-2xl transition-transform',
            mobileNavOpen ? 'translate-x-0' : '-translate-x-full'
          )}
        >
          <div className="flex items-center justify-between border-b px-4 py-4">
            {brandNode}
            <button
              type="button"
              onClick={() => setMobileNavOpen(false)}
              aria-label="Cerrar menú"
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-background text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <nav className={`p-3 ${isAdmin ? 'text-sm' : 'text-[15px]'}`}>{navLinks}</nav>
          <div className="mt-auto border-t p-4 text-xs text-muted-foreground">
            {isAdmin ? 'Operaciones y soporte' : 'ERP + Veri*Factu + Isaak'}
          </div>
        </aside>
      </div>

      <div className="flex">
        {/* Desktop sidebar */}
        <aside
          className={cn(
            'hidden md:flex md:flex-col border-r bg-card transition-[width] duration-200 shrink-0',
            collapsed ? 'w-[52px]' : isAdmin ? 'w-[260px]' : 'w-[280px]'
          )}
        >
          <div
            className={cn(
              'h-14 flex items-center border-b overflow-hidden',
              collapsed ? 'justify-center px-2' : 'px-4'
            )}
          >
            {collapsed ? (sidebarIcon ?? defaultCollapsedIcon) : brandNode}
          </div>

          <nav
            className={cn(
              'flex-1 overflow-y-auto overflow-x-hidden p-2',
              isAdmin ? 'text-sm' : 'text-[15px]'
            )}
          >
            {navLinks}
          </nav>

          <div
            className={cn(
              'border-t p-3',
              collapsed ? 'flex justify-center' : 'flex items-center justify-between'
            )}
          >
            {!collapsed && (
              <span className="text-xs text-muted-foreground">
                {isAdmin ? 'Operaciones' : 'ERP + Isaak'}
              </span>
            )}
            <button
              type="button"
              onClick={toggleCollapsed}
              className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground transition hover:text-foreground"
              aria-label={collapsed ? 'Expandir sidebar' : 'Colapsar sidebar'}
            >
              {collapsed ? (
                <ChevronRight className="h-3.5 w-3.5" />
              ) : (
                <ChevronLeft className="h-3.5 w-3.5" />
              )}
            </button>
          </div>
        </aside>

        <main className="flex-1 min-w-0">
          <header className="h-14 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex items-center justify-between px-4">
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={() => setMobileNavOpen(true)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-background text-foreground md:hidden"
                aria-label="Abrir menú"
              >
                <Menu className="h-4 w-4" />
              </button>
              {headerLeft}
            </div>
            <div className="flex items-center gap-2">
              {headerRight}
              {showThemeToggle ? <ModeToggle /> : null}
            </div>
          </header>

          <div className={`${isAdmin ? 'max-w-[1600px]' : 'max-w-[1400px]'} px-4 py-6`}>
            {children}
          </div>
        </main>
      </div>

      {showIsaak ? <IsaakDock extraContext={isaakExtraContext} /> : null}
    </div>
  );
}
