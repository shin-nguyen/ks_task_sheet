import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { Icon } from '../components/ui/Icon';

interface ToastItem {
  id: number;
  message: string;
  variant: 'success' | 'error' | 'info';
}

interface ToastContextValue {
  show: (message: string, variant?: ToastItem['variant']) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

const VARIANT_STYLE = {
  error: { bg: 'bg-danger', icon: 'warning' as const },
  success: { bg: 'bg-done', icon: 'check' as const },
  info: { bg: 'bg-ink', icon: 'check' as const },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const counter = useRef(0);

  const show = useCallback((message: string, variant: ToastItem['variant'] = 'info') => {
    const id = ++counter.current;
    setToasts((t) => [...t, { id, message, variant }]);
    setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id));
    }, 4500);
  }, []);

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2">
        {toasts.map((t) => {
          const style = VARIANT_STYLE[t.variant];
          return (
            <div
              key={t.id}
              className={`flex items-center gap-2 rounded-md px-4 py-3 text-sm text-white shadow-raised animate-[slide-down_0.18s_ease-out] ${style.bg}`}
            >
              <Icon name={style.icon} size={15} className="shrink-0" />
              {t.message}
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
