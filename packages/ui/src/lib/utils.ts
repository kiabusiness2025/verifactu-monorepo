// shadcn-like cn utility without external runtime dependency
import { twMerge } from "tailwind-merge";

type ClassValue = string | number | boolean | null | undefined | ClassValue[] | { [key: string]: unknown };

function flattenClassValue(value: ClassValue): string {
  if (!value) return "";
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (Array.isArray(value)) return value.map(flattenClassValue).filter(Boolean).join(" ");
  if (typeof value === "object") {
    return Object.entries(value)
      .filter(([, enabled]) => Boolean(enabled))
      .map(([className]) => className)
      .join(" ");
  }
  return "";
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(inputs.map(flattenClassValue).filter(Boolean).join(" "));
}
