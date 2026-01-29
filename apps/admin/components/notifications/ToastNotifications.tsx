/**
 * Toast Notification System
 * Accessible notification system with multiple variants and auto-dismiss
 */

"use client";

import { AlertCircle, CheckCircle, Info, X, XCircle } from "lucide-react";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

type ToastType = "success" | "error" | "warning" | "info";

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastContextValue {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, "id">) => void;
  removeToast: (id: string) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const addToast = useCallback(
    (toast: Omit<Toast, "id">) => {
      const id = `toast-${Date.now()}-${Math.random()}`;
      const newToast: Toast = { id, ...toast };

      setToasts((prev) => [...prev, newToast]);

      // Auto-dismiss after duration (default 5 seconds)
      const duration = toast.duration ?? 5000;
      if (duration > 0) {
        setTimeout(() => removeToast(id), duration);
      }
    },
    [removeToast]
  );

  const success = useCallback(
    (title: string, message?: string) => addToast({ type: "success", title, message }),
    [addToast]
  );

  const error = useCallback(
    (title: string, message?: string) =>
      addToast({ type: "error", title, message, duration: 7000 }),
    [addToast]
  );

  const warning = useCallback(
    (title: string, message?: string) => addToast({ type: "warning", title, message }),
    [addToast]
  );

  const info = useCallback(
    (title: string, message?: string) => addToast({ type: "info", title, message }),
    [addToast]
  );

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, success, error, warning, info }}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
};

const ToastContainer: React.FC<{
  toasts: Toast[];
  removeToast: (id: string) => void;
}> = ({ toasts, removeToast }) => {
  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-full max-w-sm"
      role="region"
      aria-label="Notifications"
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
      ))}
    </div>
  );
};

const ToastItem: React.FC<{
  toast: Toast;
  onClose: () => void;
}> = ({ toast, onClose }) => {
  const [isExiting, setIsExiting] = useState(false);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(onClose, 300); // Match animation duration
  };

  useEffect(() => {
    // Animate in
    const timer = setTimeout(() => setIsExiting(false), 10);
    return () => clearTimeout(timer);
  }, []);

  const config = {
    success: {
      icon: <CheckCircle className="h-5 w-5" />,
      bgClass: "bg-green-50 border-green-200",
      iconClass: "text-green-600",
      textClass: "text-green-900",
    },
    error: {
      icon: <XCircle className="h-5 w-5" />,
      bgClass: "bg-red-50 border-red-200",
      iconClass: "text-red-600",
      textClass: "text-red-900",
    },
    warning: {
      icon: <AlertCircle className="h-5 w-5" />,
      bgClass: "bg-yellow-50 border-yellow-200",
      iconClass: "text-yellow-600",
      textClass: "text-yellow-900",
    },
    info: {
      icon: <Info className="h-5 w-5" />,
      bgClass: "bg-blue-50 border-blue-200",
      iconClass: "text-blue-600",
      textClass: "text-blue-900",
    },
  };

  const { icon, bgClass, iconClass, textClass } = config[toast.type];

  return (
    <div
      className={`flex items-start gap-3 rounded-lg border p-4 shadow-lg transition-all duration-300 ${bgClass} ${
        isExiting ? "translate-x-full opacity-0" : "translate-x-0 opacity-100"
      }`}
      role="alert"
      aria-live="polite"
      aria-atomic="true"
    >
      <div className={iconClass}>{icon}</div>

      <div className="flex-1 min-w-0">
        <p className={`font-semibold text-sm ${textClass}`}>{toast.title}</p>
        {toast.message && <p className={`mt-1 text-xs ${textClass} opacity-90`}>{toast.message}</p>}
        {toast.action && (
          <button
            onClick={() => {
              toast.action?.onClick();
              handleClose();
            }}
            className={`mt-2 text-xs font-semibold underline ${textClass} hover:no-underline`}
          >
            {toast.action.label}
          </button>
        )}
      </div>

      <button
        onClick={handleClose}
        className={`${textClass} hover:opacity-70 transition-opacity`}
        aria-label="Cerrar notificación"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};
