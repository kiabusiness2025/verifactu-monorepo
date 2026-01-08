"use client";

import React, { createContext, useCallback, useContext, useState } from "react";

type IsaakUIContextValue = {
  company: string;
  setCompany: (v: string) => void;
  isDrawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  toggleDrawer: () => void;
};

const IsaakUIContext = createContext<IsaakUIContextValue | undefined>(undefined);

export function IsaakUIProvider({ 
  children,
  onIsaakOpen
}: { 
  children: React.ReactNode;
  onIsaakOpen?: () => void;
}) {
  const [company, setCompany] = useState("Empresa Demo SL");
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const openDrawer = useCallback(() => {
    if (onIsaakOpen) onIsaakOpen();
    setIsDrawerOpen(true);
  }, [onIsaakOpen]);
  const closeDrawer = useCallback(() => setIsDrawerOpen(false), []);
  const toggleDrawer = useCallback(() => setIsDrawerOpen((v) => !v), []);

  return (
    <IsaakUIContext.Provider
      value={{ company, setCompany, isDrawerOpen, openDrawer, closeDrawer, toggleDrawer }}
    >
      {children}
    </IsaakUIContext.Provider>
  );
}

export function useIsaakUI() {
  const ctx = useContext(IsaakUIContext);
  if (!ctx) {
    throw new Error("useIsaakUI must be used within IsaakUIProvider");
  }
  return ctx;
}
