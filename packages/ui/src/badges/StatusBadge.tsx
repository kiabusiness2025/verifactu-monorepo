import * as React from "react";
import { cn } from "../utils/cn";

export type StatusVariant = "success" | "warning" | "error" | "info" | "neutral";

type Props = {
  label: string;
  variant?: StatusVariant;
  dot?: boolean;
  className?: string;
};

const variantClasses: Record<StatusVariant, string> = {
  success: "bg-emerald-50 text-emerald-700 border-emerald-200",
  warning: "bg-amber-50 text-amber-700 border-amber-200",
  error: "bg-rose-50 text-rose-700 border-rose-200",
  info: "bg-sky-50 text-sky-700 border-sky-200",
  neutral: "bg-gray-50 text-gray-700 border-gray-200",
};

export function StatusBadge({ label, variant = "neutral", dot = true, className }: Props) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        variantClasses[variant],
        className
      )}
    >
      {dot ? <span className={cn("h-1.5 w-1.5 rounded-full", dotColor(variant))} /> : null}
      <span>{label}</span>
    </span>
  );
}

function dotColor(variant: StatusVariant) {
  switch (variant) {
    case "success":
      return "bg-emerald-500";
    case "warning":
      return "bg-amber-500";
    case "error":
      return "bg-rose-500";
    case "info":
      return "bg-sky-500";
    case "neutral":
    default:
      return "bg-gray-400";
  }
}
