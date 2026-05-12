import { useEffect, type ReactNode } from 'react';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  labelledBy: string;
  variant?: 'default' | 'danger' | 'success';
  children: ReactNode;
}

export function Modal({ open, onClose, labelledBy, variant = 'default', children }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  const cardClass =
    variant === 'danger'
      ? 'modal__card modal__card--danger'
      : variant === 'success'
        ? 'modal__card modal__card--success'
        : 'modal__card';

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-labelledby={labelledBy}>
      <div className="modal__overlay" onClick={onClose} />
      <div className={cardClass}>{children}</div>
    </div>
  );
}
