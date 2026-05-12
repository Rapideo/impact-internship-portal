import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { ToastView, type ToastKind, type ToastMessage } from './Toast';

interface ToastApi {
  show: (opts: { kind: ToastKind; label: string; message: string }) => void;
}

const ToastCtx = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}

export function ToastProvider({
  children,
  initial,
}: {
  children: ReactNode;
  initial?: ToastMessage[];
}) {
  const [items, setItems] = useState<ToastMessage[]>(initial ?? []);
  const counter = useRef(0);

  const dismiss = useCallback((id: string) => {
    setItems((xs) => xs.filter((t) => t.id !== id));
  }, []);

  const show = useCallback<ToastApi['show']>(
    (opts) => {
      counter.current += 1;
      const id = `t${Date.now()}-${counter.current}`;
      setItems((xs) => [...xs, { id, ...opts }]);
      setTimeout(() => dismiss(id), 3200);
    },
    [dismiss],
  );

  useEffect(() => {
    // No setup beyond timers above; placeholder for future global listeners.
  }, []);

  return (
    <ToastCtx.Provider value={{ show }}>
      {children}
      <div className="toast-stack" aria-live="polite">
        {items.map((t) => (
          <ToastView key={t.id} toast={t} onDismiss={dismiss} />
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
