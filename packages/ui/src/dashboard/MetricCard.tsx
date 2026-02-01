import * as React from "react";
import { cn } from "../lib/utils";

export function MetricCard({
  title,
  value,
  hint,
  badge,
  className,
}: {
  title: string;
  value: string;
  hint: string;
  badge?: { label: string; tone?: "ok" | "info" | "warn" };
  className?: string;
}) {
  const toneClass =
    badge?.tone === "ok"
      ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-300"
      : badge?.tone === "warn"
      ? "bg-amber-500/10 text-amber-700 border-amber-500/20 dark:text-amber-300"
      : "bg-blue-500/10 text-blue-700 border-blue-500/20 dark:text-blue-300";

  return (
    <div className={cn("rounded-2xl border bg-card p-4 shadow-soft", className)}>
      <div className="flex items-center justify-between">
        <div className="text-[11px] tracking-widest text-muted-foreground">{title.toUpperCase()}</div>
        {badge ? (
          <span className={cn("rounded-full border px-2 py-0.5 text-[10px]", toneClass)}>
            {badge.label}
          </span>
        ) : null}
      </div>

      <div className="mt-3 text-xl font-semibold">{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{hint}</div>
    </div>
  );
}
