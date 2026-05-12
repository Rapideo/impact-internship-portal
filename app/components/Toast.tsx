export type ToastKind = 'success' | 'danger' | 'gold' | 'info';

export interface ToastMessage {
  id: string;
  kind: ToastKind;
  label: string;
  message: string;
}

export function ToastView({
  toast,
  onDismiss,
}: {
  toast: ToastMessage;
  onDismiss: (id: string) => void;
}) {
  return (
    <div className={`toast toast--${toast.kind}`} role="status" onClick={() => onDismiss(toast.id)}>
      <span className="toast__label">{toast.label}</span>
      {toast.message}
    </div>
  );
}
