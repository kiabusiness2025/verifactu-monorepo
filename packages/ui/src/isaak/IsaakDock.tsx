"use client";

import * as React from "react";
import { MessageCircle, X } from "lucide-react";
import { cn } from "../lib/utils";
import { Button } from "../components/ui/button";
import { useIsaakContext } from "./useIsaakContext";

function IsaakPanel({ context }: { context: Record<string, unknown> }) {
  return (
    <div className="h-full flex flex-col">
      <div className="px-4 py-3 border-b">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold">Isaak</div>
          <div className="text-xs text-muted-foreground">Contexto: {String(context.module ?? "")}</div>
          </div>
        </div>
      </div>

      <div className="flex-1 p-4">
        <div className="rounded-xl border bg-card p-3 text-xs text-muted-foreground">
          Integra aqui vuestro chat. Contexto enviado:
          <pre className="mt-2 overflow-auto">{JSON.stringify(context, null, 2)}</pre>
        </div>
      </div>
    </div>
  );
}

export function IsaakDock({ extraContext }: { extraContext?: Record<string, unknown> }) {
  const [open, setOpen] = React.useState(false);
  const context = useIsaakContext(extraContext);

  return (
    <>
      <div className="fixed bottom-5 right-5 z-50">
        <Button className="rounded-full shadow-soft" size="icon" onClick={() => setOpen(true)}>
          <MessageCircle className="h-5 w-5" />
        </Button>
      </div>

      <div
        className={cn(
          "fixed bottom-5 right-5 z-50 w-[420px] h-[70vh] rounded-2xl border bg-background shadow overflow-hidden",
          open ? "block" : "hidden"
        )}
        style={{ transform: "translateY(-56px)" }}
      >
        <div className="absolute top-2 right-2">
          <Button variant="ghost" size="icon" onClick={() => setOpen(false)} aria-label="Cerrar">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <IsaakPanel context={context} />
      </div>
    </>
  );
}
