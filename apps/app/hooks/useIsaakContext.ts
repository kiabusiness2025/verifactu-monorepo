"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";

export type IsaakSuggestion = {
  label: string;
  href?: string;
};

export type IsaakContext = {
  greeting: string;
  sectionKey: string;
  title: string;
  suggestions: IsaakSuggestion[];
  sabiasQue?: string;
};

function resolveSection(pathname: string): { key: string; title: string } {
  if (pathname.startsWith("/app/(admin)/invoices")) return { key: "invoices", title: "Facturación" };
  if (pathname.startsWith("/app/(admin)/documents")) return { key: "documents", title: "Documentos" };
  if (pathname.startsWith("/app/(admin)/banks")) return { key: "banks", title: "Bancos" };
  if (pathname.startsWith("/app/(admin)/calendar")) return { key: "calendar", title: "Calendario" };
  if (pathname.startsWith("/app/(admin)/settings")) return { key: "settings", title: "Configuración" };
  if (pathname.startsWith("/app/(admin)/clients")) return { key: "clients", title: "Clientes" };
  return { key: "dashboard", title: "Resumen general" };
}

const sabiasQuePool: Record<string, string[]> = {
  invoices: [
    "¿Sabías que puedes programar recordatorios de cobro 48h antes del vencimiento?",
    "Mantener la serie y numeración trazada evita rechazos en VeriFactu.",
  ],
  documents: [
    "Subir el ticket el mismo día aumenta la deducibilidad y evita olvidos.",
    "Puedes compartir un enlace seguro con tu asesor sin descargar documentos.",
  ],
  dashboard: [
    "Tu beneficio se actualiza solo: ventas – gastos. No tienes que cruzar hojas.",
    "Revisa los plazos fiscales cada viernes para evitar cargos extra.",
  ],
  default: [
    "Isaak puede preparar un resumen en 3 líneas de tu semana fiscal.",
    "Las incidencias de VeriFactu se resuelven antes de enviar si revisas borradores.",
  ],
};

function stableHash(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function dayOfYearLocal(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  return Math.floor(diff / 86400000);
}

export function useIsaakContext(userName?: string): IsaakContext {
  const pathname = usePathname() || "/app/(admin)";

  const { key, title } = useMemo(() => resolveSection(pathname), [pathname]);

  // Important for hydration: the initial render must be deterministic.
  // We compute the "dynamic" parts (time-based greeting / rotating tip) only after mount.
  const [greetingPrefix, setGreetingPrefix] = useState<string>("Hola");
  const [sabiasQue, setSabiasQue] = useState<string | undefined>(() => {
    const list = sabiasQuePool[key] ?? sabiasQuePool.default;
    return list[0];
  });

  useEffect(() => {
    const now = new Date();
    const hour = now.getHours();
    const prefix = hour < 12 ? "Buenos días" : hour < 19 ? "Buenas tardes" : "Buenas noches";
    setGreetingPrefix(prefix);

    const list = sabiasQuePool[key] ?? sabiasQuePool.default;
    const index = (stableHash(`${pathname}|${userName ?? ""}`) + dayOfYearLocal(now)) % list.length;
    setSabiasQue(list[index]);
  }, [key, pathname, userName]);

  return useMemo(() => {
    const suggestions: IsaakSuggestion[] = (() => {
      switch (key) {
        case "invoices":
          return [
            { label: "Emitir factura Verifactu", href: "/app/(admin)/invoices" },
            { label: "Revisar borradores", href: "/app/(admin)/invoices" },
          ];
        case "documents":
          return [
            { label: "Subir documento", href: "/app/(admin)/documents" },
            { label: "Compartir con asesor", href: "/app/(admin)/documents" },
          ];
        case "banks":
          return [
            { label: "Conciliar movimientos", href: "/app/(admin)/banks" },
            { label: "Ver pendientes", href: "/app/(admin)/banks" },
          ];
        case "calendar":
          return [
            { label: "Ver plazos fiscales", href: "/app/(admin)/calendar" },
            { label: "Crear recordatorio", href: "/app/(admin)/calendar" },
          ];
        case "settings":
          return [
            { label: "Configurar VeriFactu", href: "/app/(admin)/settings" },
            { label: "Añadir usuario", href: "/app/(admin)/settings" },
          ];
        case "clients":
          return [
            { label: "Añadir cliente", href: "/app/(admin)/clients" },
            { label: "Ver fichas", href: "/app/(admin)/clients" },
          ];
        default:
          return [
            { label: "Ver resumen", href: "/app/(admin)" },
            { label: "Preguntar a Isaak", href: "/app/(admin)" },
          ];
      }
    })();

    const greeting = userName ? `${greetingPrefix}, ${userName}` : greetingPrefix;

    return {
      greeting,
      sectionKey: key,
      title,
      suggestions,
      sabiasQue,
    };
  }, [greetingPrefix, key, pathname, sabiasQue, title, userName]);
}
