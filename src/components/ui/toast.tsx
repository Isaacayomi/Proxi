"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

export type ToastType = "success" | "error" | "info";

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  duration?: number;
}

interface ToastContextType {
  toast: (item: Omit<ToastItem, "id">) => void;
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    ({ type = "info", title, description, duration = 4500 }: Omit<ToastItem, "id">) => {
      const id = "t-" + Math.random().toString(36).substring(2, 9);
      const newItem: ToastItem = { id, type, title, description, duration };

      setToasts((prev) => [...prev, newItem]);

      if (duration > 0) {
        setTimeout(() => {
          dismiss(id);
        }, duration);
      }
    },
    [dismiss],
  );

  const success = useCallback(
    (title: string, description?: string) => {
      toast({ type: "success", title, description });
    },
    [toast],
  );

  const error = useCallback(
    (title: string, description?: string) => {
      toast({ type: "error", title, description });
    },
    [toast],
  );

  const info = useCallback(
    (title: string, description?: string) => {
      toast({ type: "info", title, description });
    },
    [toast],
  );

  return (
    <ToastContext.Provider value={{ toast, success, error, info, dismiss }}>
      {children}
      {/* Toast Floating Container (Centered on mobile, top-right on desktop) */}
      <div
        aria-live="polite"
        className="fixed top-4 right-4 left-4 sm:left-auto sm:max-w-md w-auto z-[9999] flex flex-col gap-2.5 pointer-events-none"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-2xl border shadow-xl backdrop-blur-md transition-all duration-300 font-sans ${
              t.type === "success"
                ? "bg-white/95 border-emerald-300 text-slate-900 shadow-emerald-900/10"
                : t.type === "error"
                  ? "bg-white/95 border-rose-300 text-slate-900 shadow-rose-900/10"
                  : "bg-white/95 border-slate-300 text-slate-900 shadow-slate-900/10"
            }`}
          >
            <div className="shrink-0 mt-0.5">
              {t.type === "success" && (
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                </div>
              )}
              {t.type === "error" && (
                <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-800 flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-rose-600" />
                </div>
              )}
              {t.type === "info" && (
                <div className="w-8 h-8 rounded-xl bg-sky-100 text-sky-800 flex items-center justify-center">
                  <Info className="w-5 h-5 text-sky-600" />
                </div>
              )}
            </div>

            <div className="flex-1 space-y-0.5 pr-2">
              <h5 className="text-xs font-bold font-sans text-slate-900 leading-tight">
                {t.title}
              </h5>
              {t.description && (
                <p className="text-[11px] text-slate-600 leading-normal">
                  {t.description}
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={() => dismiss(t.id)}
              className="text-slate-400 hover:text-slate-700 p-1 -mr-1 rounded-lg transition-colors cursor-pointer"
              aria-label="Dismiss toast"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

const fallbackContext: ToastContextType = {
  toast: () => {},
  success: () => {},
  error: () => {},
  info: () => {},
  dismiss: () => {},
};

export function useToast() {
  const context = useContext(ToastContext);
  return context ?? fallbackContext;
}
