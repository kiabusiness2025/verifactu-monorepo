import * as React from "react";
import { cn } from "../lib/utils";

export function NoticeCard({
  label,
  text,
  className,
}: {
  label: string;
  text: string;
  className?: string;
}) {
  return (
    <div className={cn("rounded-2xl border bg-card p-4 shadow-soft", className)}>
      <span className="inline-flex rounded-full border px-2 py-0.5 text-[10px] text-muted-foreground">
        {label}
      </span>
      <div className="mt-3 text-sm">{text}</div>
    </div>
  );
}
