"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { CreateCompanyModal } from "@/components/tenants/CreateCompanyModal";

type CreateCompanyModalContextValue = {
  openModal: () => void;
};

const CreateCompanyModalContext = createContext<CreateCompanyModalContextValue | null>(null);

export function CreateCompanyModalProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  const openModal = useCallback(() => setIsOpen(true), []);
  const closeModal = useCallback(() => setIsOpen(false), []);

  return (
    <CreateCompanyModalContext.Provider value={{ openModal }}>
      {children}
      <CreateCompanyModal isOpen={isOpen} onClose={closeModal} />
    </CreateCompanyModalContext.Provider>
  );
}

export function useCreateCompanyModal() {
  return useContext(CreateCompanyModalContext);
}
