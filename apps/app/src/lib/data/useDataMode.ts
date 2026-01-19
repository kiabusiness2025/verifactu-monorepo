"use client";

import { usePathname } from "next/navigation";
import type { DataMode } from "./DataMode";

export function useDataMode(): DataMode {
  const pathname = usePathname() || "";
  if (pathname.startsWith("/demo")) return "demo";
  if (typeof window !== "undefined") {
    try {
      const stored = window.localStorage.getItem("vf-data-mode");
      if (stored === "demo") return "demo";
    } catch {
      // ignore storage failures
    }
  }
  return "real";
}
