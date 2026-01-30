"use client";

import * as React from "react";
import { useTheme } from "./ThemeProvider";
import { cn } from "../utils/cn";

type ModeToggleProps = {
  className?: string;
};

export function ModeToggle({ className }: ModeToggleProps) {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={cn(
        "inline-flex items-center gap-2 rounded-md border px-2 py-1 text-xs font-semibold",
        "border-muted bg-background text-foreground hover:bg-muted",
        className
      )}
      aria-label="Toggle theme"
    >
      <span>{theme === "dark" ? "Modo oscuro" : "Modo claro"}</span>
    </button>
  );
}
