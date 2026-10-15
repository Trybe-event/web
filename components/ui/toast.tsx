"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";

type Toast = { id: number; message: string };
const ToastContext = createContext<(message: string) => void>(() => {});

// ToastProvider shows short confirmations ("Saved") in a polite live region.
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const show = useCallback((message: string) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
  }, []);
  return (
    <ToastContext.Provider value={show}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className="fixed inset-x-4 bottom-4 z-50 flex flex-col items-center gap-2"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className="rounded-lg bg-ink px-4 py-3 text-sm font-semibold text-paper shadow-lg"
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
