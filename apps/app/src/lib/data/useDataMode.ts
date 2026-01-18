"use client";

import { usePathname } from "next/navigation";
import type { DataMode } from "./DataMode";

export function useDataMode(): DataMode {
  const pathname = usePathname() || "";
  return pathname.startsWith("/demo") ? "demo" : "real";
}
