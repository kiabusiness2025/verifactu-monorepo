"use client";

import Link from "next/link";
import * as React from "react";
import { IsaakDock } from "../isaak/IsaakDock";
import { cn } from "../lib/utils";
import { ModeToggle } from "../theme/ModeToggle";
import type { NavItem } from "./types";

type Props = {
  variant: "client" | "admin";
  nav: NavItem[];
  pathname: string;
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
  headerLeft,
  headerRight,
  children,
  showThemeToggle,
  showIsaak,
  isaakExtraContext,
}: Props) {
  const isAdmin = variant === "admin";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="flex">
        <aside className={`hidden md:flex md:flex-col border-r bg-card ${isAdmin ? "w-[260px]" : "w-[280px]"}`}>
          <div className="h-14 flex items-center px-4 border-b">
            <div className="flex items-center gap-2 min-w-0">
              <div className="h-8 w-8 rounded-xl bg-primary/10 border border-primary/15" />
              <div className="min-w-0">
                <div className="text-sm font-semibold leading-tight truncate">
                  {isAdmin ? "Verifactu Admin" : "Verifactu Business"}
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  {isAdmin ? "Backoffice" : "Panel de cliente"}
                </div>
              </div>
            </div>
          </div>

          <nav className={`p-2 ${isAdmin ? "text-sm" : "text-[15px]"}`}>
            {nav.map((item) => {
              const active = item.match ? item.match(pathname) : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2 rounded-xl px-3 py-2 transition",
                    active
                      ? "bg-primary/10 text-foreground border border-primary/15"
                      : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                  )}
                >
                  {item.icon}
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto p-3 border-t text-xs text-muted-foreground">
            {isAdmin ? "Operaciones y soporte" : "ERP + Veri*Factu + Isaak"}
          </div>
        </aside>

        <main className="flex-1 min-w-0">
          <header className="h-14 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex items-center justify-between px-4">
            <div className="flex items-center gap-3 min-w-0">{headerLeft}</div>
            <div className="flex items-center gap-2">
              {headerRight}
              {showThemeToggle ? <ModeToggle /> : null}
            </div>
          </header>

          <div className={`${isAdmin ? "max-w-[1600px]" : "max-w-[1400px]"} px-4 py-6`}>{children}</div>
        </main>
      </div>

      {showIsaak ? <IsaakDock extraContext={isaakExtraContext} /> : null}
    </div>
  );
}
