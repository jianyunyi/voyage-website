import React, { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { CheckCircle2, XCircle, Info, X } from "lucide-react";

type ToastType = "success" | "error" | "info";

interface Toast {
  id: number;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  toast: (type: ToastType, message: string) => void;
  success: (message: string) => void;
  error: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let nextId = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const remove = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const toast = useCallback((type: ToastType, message: string) => {
    const id = nextId++;
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => remove(id), 3000);
  }, [remove]);

  const value: ToastContextValue = {
    toast,
    success: (m) => toast("success", m),
    error: (m) => toast("error", m),
  };

  const icons = {
    success: <CheckCircle2 className="w-5 h-5 text-emerald-500" />,
    error: <XCircle className="w-5 h-5 text-red-500" />,
    info: <Info className="w-5 h-5 text-orange-500" />,
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* Toast 容器 */}
      <div className="fixed top-20 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div
            key={t.id}
            role="status"
            className="pointer-events-auto flex items-center gap-2.5 bg-white dark:bg-stone-900 border border-gray-100 dark:border-stone-800 shadow-lg rounded-xl px-4 py-3 min-w-[240px] max-w-sm animate-[fadeIn_0.2s_ease]"
          >
            {icons[t.type]}
            <span className="text-sm text-gray-800 dark:text-stone-200 flex-1">{t.message}</span>
            <button onClick={() => remove(t.id)} aria-label="关闭提示" className="text-gray-400 hover:text-gray-600 dark:hover:text-stone-300">
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
