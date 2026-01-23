"use client";

import { X } from "lucide-react";
import QuoteRequestForm from "./QuoteRequestForm";

export default function QuoteRequestModal({
  isOpen,
  onClose,
  title = "Solicitar presupuesto",
  description = "Si superas los limites de la calculadora, preparamos un plan a medida.",
}: {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative w-full max-w-3xl rounded-2xl bg-white p-6 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
          aria-label="Cerrar"
        >
          <X className="h-5 w-5" />
        </button>
        <h2 className="text-2xl font-bold text-[#011c67]">{title}</h2>
        <p className="mt-2 text-sm text-slate-600">{description}</p>
        <div className="mt-6">
          <QuoteRequestForm />
        </div>
      </div>
    </div>
  );
}

