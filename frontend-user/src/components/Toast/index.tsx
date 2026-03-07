import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import './index.css';

type ToastType = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastCtx {
  success: (msg: string) => void;
  error: (msg: string) => void;
  info: (msg: string) => void;
}

const ToastContext = createContext<ToastCtx>({
  success: () => {},
  error: () => {},
  info: () => {},
});

export function useToast() {
  return useContext(ToastContext);
}

let toastId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const show = useCallback((message: string, type: ToastType) => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, message, type }]);
    const duration = type === 'error' ? 4000 : 2500;
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  const ctx: ToastCtx = {
    success: useCallback((msg: string) => show(msg, 'success'), [show]),
    error: useCallback((msg: string) => show(msg, 'error'), [show]),
    info: useCallback((msg: string) => show(msg, 'info'), [show]),
  };

  const icons: Record<ToastType, string> = { success: '✓', error: '✕', info: 'ℹ' };

  return (
    <ToastContext.Provider value={ctx}>
      {children}
      <div className="toast-container">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.type}`}>
            <span className="toast-icon">{icons[t.type]}</span>
            <span className="toast-message">{t.message}</span>
            {t.type === 'error' && (
              <button
                className="toast-close"
                onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
              >
                ✕
              </button>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
