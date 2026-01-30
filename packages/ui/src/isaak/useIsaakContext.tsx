"use client";

import * as React from "react";

export type IsaakTone = "cercano" | "profesional" | "minimalista" | "breve";

type IsaakContextValue = {
  open: boolean;
  setOpen: (value: boolean) => void;
  tone: IsaakTone;
  setTone: (value: IsaakTone) => void;
};

const IsaakContext = React.createContext<IsaakContextValue | null>(null);

export function IsaakProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const [tone, setTone] = React.useState<IsaakTone>("cercano");

  const value = React.useMemo(() => ({ open, setOpen, tone, setTone }), [open, tone]);

  return <IsaakContext.Provider value={value}>{children}</IsaakContext.Provider>;
}

export function useIsaakContext() {
  const ctx = React.useContext(IsaakContext);
  if (!ctx) {
    return {
      open: false,
      setOpen: () => undefined,
      tone: "cercano" as IsaakTone,
      setTone: () => undefined,
    } satisfies IsaakContextValue;
  }
  return ctx;
}
