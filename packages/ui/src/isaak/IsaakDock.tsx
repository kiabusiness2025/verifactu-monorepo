"use client";

import { MessageCircle, X } from "lucide-react";
import * as React from "react";
import { Button } from "../shadcn/button";
import { cn } from "../utils/cn";
import { useIsaakContext } from "./useIsaakContext";

// IMPORTANTE: aquí conectas con vuestro asistente ya configurado.
// Solo necesitas pasarle "context".
function IsaakPanel({ context }: { context: any }) {
  return (
    <div className="h-full flex flex-col">
      <div className="px-3 py-2 border-b text-sm">
        <div className="font-medium">Isaak</div>
        <div className="text-muted-foreground">
          Estás en: <span className="font-medium">{context.module}</span>
        </div>
      </div>

      <div className="flex-1 p-3 text-sm text-muted-foreground">
        {/* Sustituye esto por vuestro componente de chat / tool-calling */}
        <div className="rounded-md border p-3">
          Context enviado: <pre className="text-xs mt-2 overflow-auto">{JSON.stringify(context, null, 2)}</pre>
        </div>
      </div>
    </div>
  );
}

export function IsaakDock() {
  const [open, setOpen] = React.useState(false);
  const context = useIsaakContext();

  return (
    <>
      <div className="fixed bottom-5 right-5 z-50">
        <Button onClick={() => setOpen((v) => !v)} className="rounded-full shadow-lg" size="icon">
          <MessageCircle className="h-5 w-5" />
        </Button>
      </div>

      <div
        className={cn(
          "fixed bottom-5 right-5 z-50 w-[420px] h-[70vh] rounded-2xl border bg-background shadow-xl overflow-hidden",
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
