"use client";

import React, { useEffect, useState } from "react";

type DemoLockedButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  toastMessage?: string;
  toastDurationMs?: number;
};

export function DemoLockedButton({
  toastMessage = "Disponible al activar tu prueba",
  toastDurationMs = 2200,
  className,
  onClick,
  children,
  ...props
}: DemoLockedButtonProps) {
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    if (!showToast) return;
    const timer = setTimeout(() => setShowToast(false), toastDurationMs);
    return () => clearTimeout(timer);
  }, [showToast, toastDurationMs]);

  return (
    <div className="relative">
      <button
        type="button"
        className={className}
        onClick={(event) => {
          onClick?.(event);
          setShowToast(true);
        }}
        {...props}
      >
        {children}
      </button>
      {showToast && (
        <div className="absolute right-0 top-11 z-20 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 shadow-lg">
          {toastMessage}
        </div>
      )}
    </div>
  );
}
