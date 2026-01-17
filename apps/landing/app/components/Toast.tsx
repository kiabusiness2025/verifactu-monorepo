"use client";

import React, { createContext, useContext, useCallback, useState, useEffect } from "react";

type ToastType = "success" | "error" | "info";

interface Toast {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number; // ms
}

interface ToastContextValue {
  showToast: (toast: Omit<Toast, "id">) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((toast: Omit<Toast, "id">) => {
    const id = Math.random().toString(36).slice(2);
    const t: Toast = { id, duration: 4000, ...toast };
    setToasts((prev) => [...prev, t]);
    // Auto-dismiss
    const timeout = setTimeout(() => {
      setToasts((prev) => prev.filter((x) => x.id !== id));
    }, t.duration);
    return () => clearTimeout(timeout);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((x) => x.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Viewport */}
      <div className="fixed bottom-4 right-4 z-50 space-y-2">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onClose={() => removeToast(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

function ToastItem({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  const { type, title, message } = toast;

  const styles = {
    container: `min-w-[280px] max-w-[360px] rounded-lg shadow border p-3 flex items-start gap-2 ${
      type === "success"
        ? "bg-emerald-50 border-emerald-200 text-emerald-700"
        : type === "error"
        ? "bg-red-50 border-red-200 text-red-700"
        : "bg-blue-50 border-blue-200 text-blue-700"
    }`,
    button: "ml-auto text-xs text-gray-500 hover:text-gray-700",
    title: "text-sm font-semibold",
    message: "text-xs",
  };

  return (
    <div className={styles.container} role="status" aria-live="polite">
      <div className="flex-1">
        {title && <div className={styles.title}>{title}</div>}
        <div className={styles.message}>{message}</div>
      </div>
      <button onClick={onClose} className={styles.button} aria-label="Close">
        Cerrar
      </button>
    </div>
  );
}

