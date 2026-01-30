"use client";

import * as React from "react";
import Link from "next/link";
import { cn } from "../utils/cn";
import { ModeToggle } from "../theme/ModeToggle";
import { IsaakDock } from "../isaak/IsaakDock";

export type NavItem = {
  label: string;
  href: string;
  icon?: React.ReactNode;
  match?: (pathname: string) => boolean;
};

type Props = {
  variant: "client" | "admin";
  nav: NavItem[];
  pathname: string;
  headerLeft?: React.ReactNode;
  headerRight?: React.ReactNode;
  children: React.ReactNode;
  showThemeToggle?: boolean;
  showIsaak?: boolean;
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
}: Props) {
  const isAdmin = variant === "admin";

  return (
    <div className={cn("min-h-screen", isAdmin ? "vf-admin" : "vf-client")}>
      <div className="flex">
        <aside
          className={cn(
            "hidden md:flex md:flex-col border-r",
            isAdmin ? "w-[260px]" : "w-[280px]"
          )}
        >
          <div className="h-14 flex items-center px-4 border-b">
            <div className="font-semibold tracking-tight">
              {isAdmin ? "Verifactu • Admin" : "Verifactu"}
            </div>
          </div>

          <nav className={cn("p-2", isAdmin ? "text-sm" : "text-[15px]")}
          >
            {nav.map((item) => {
              const active = item.match ? item.match(pathname) : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-3 py-2 transition",
                    active
                      ? "bg-muted text-foreground"
                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                  )}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto p-3 border-t text-xs text-muted-foreground">
            {isAdmin ? "Control tower" : "ERP + Veri*Factu"}
          </div>
        </aside>

        <main className="flex-1 min-w-0">
          <header className="h-14 border-b flex items-center justify-between px-4">
            <div className="flex items-center gap-3 min-w-0">
              {headerLeft}
            </div>

            <div className="flex items-center gap-2">
              {headerRight}
              {showThemeToggle ? <ModeToggle /> : null}
            </div>
          </header>

          <div className={cn("px-4 py-6", isAdmin ? "max-w-[1600px]" : "max-w-[1400px]")}
          >
            {children}
          </div>
        </main>
      </div>

      {showIsaak ? <IsaakDock /> : null}
    </div>
  );
}
