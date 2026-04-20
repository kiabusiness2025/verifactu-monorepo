'use client';

import { Menu, X } from 'lucide-react';
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
  headerLeft,
  headerRight,
  children,
  showThemeToggle,
  showIsaak,
  isaakExtraContext,
}: Props) {
  const isAdmin = variant === 'admin';
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false);

  React.useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  const brandNode = sidebarBrand ?? (
    <div className="flex items-center gap-2 min-w-0">
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
        className={cn(
          'flex items-center gap-2 rounded-xl px-3 py-2 transition',
          active
            ? 'bg-primary/10 text-foreground border border-primary/15'
            : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground'
        )}
      >
        {item.icon}
        <span className="truncate">{item.label}</span>
      </Link>
    );
  });

  return (
    <div className="min-h-screen bg-background text-foreground">
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
        <aside
          className={`hidden md:flex md:flex-col border-r bg-card ${isAdmin ? 'w-[260px]' : 'w-[280px]'}`}
        >
          <div className="h-14 flex items-center px-4 border-b">{brandNode}</div>

          <nav className={`p-2 ${isAdmin ? 'text-sm' : 'text-[15px]'}`}>{navLinks}</nav>

          <div className="mt-auto p-3 border-t text-xs text-muted-foreground">
            {isAdmin ? 'Operaciones y soporte' : 'ERP + Veri*Factu + Isaak'}
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
