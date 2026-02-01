import * as React from "react";
import { X } from "lucide-react";
import { cn } from "../lib/utils";
import { Button } from "../components/ui/button";

export function ToastCard({
  title,
  text,
  tone = "info",
  onClose,
  className,
}: {
  title: string;
  text: string;
  tone?: "info" | "warn" | "ok";
  onClose?: () => void;
  className?: string;
}) {
  const toneClass =
    tone === "ok"
      ? "border-emerald-500/25 bg-emerald-500/5"
      : tone === "warn"
      ? "border-amber-500/25 bg-amber-500/5"
      : "border-blue-500/25 bg-blue-500/5";

  return (
    <div className={cn("relative w-[360px] rounded-2xl border shadow-soft overflow-hidden", toneClass, className)}>
      <div className="p-4 pr-12">
        <div className="text-sm font-semibold">{title}</div>
        <div className="mt-1 text-xs text-muted-foreground">{text}</div>
      </div>
      {onClose ? (
        <div className="absolute top-2 right-2">
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Cerrar">
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : null}
    </div>
  );
}
