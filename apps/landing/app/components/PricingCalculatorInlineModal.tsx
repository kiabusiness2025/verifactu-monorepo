'use client';

import { X } from 'lucide-react';
import PricingCalculatorInline from './PricingCalculatorInline';

export default function PricingCalculatorInlineModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-8">
      <div className="relative w-full max-w-4xl">
        <button
          onClick={onClose}
          className="absolute -top-3 right-0 rounded-full border border-slate-200 bg-white p-2 text-slate-600 shadow-sm hover:bg-slate-100"
          type="button"
          aria-label="Cerrar calculadora"
        >
          <X className="h-4 w-4" />
        </button>
        <PricingCalculatorInline showBreakdown={false} />
      </div>
    </div>
  );
}
