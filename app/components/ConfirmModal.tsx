import { Modal, type ModalProps } from './Modal';

export interface ConfirmModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  label: string;
  title: string;
  body: string;
  confirmText: string;
  cancelText?: string;
  variant?: ModalProps['variant'];
}

export function ConfirmModal({
  open,
  onClose,
  onConfirm,
  label,
  title,
  body,
  confirmText,
  cancelText = 'Cancel',
  variant = 'default',
}: ConfirmModalProps) {
  const titleId = `confirm-title-${label.replace(/\W+/g, '-').toLowerCase()}`;
  const confirmClass = variant === 'danger' ? 'btn btn--danger' : 'btn btn--primary';
  return (
    <Modal open={open} onClose={onClose} labelledBy={titleId} variant={variant}>
      <span className="modal__label">{label}</span>
      <h3 className="modal__title" id={titleId}>
        {title}
      </h3>
      <p className="modal__body">{body}</p>
      <div className="modal__actions">
        <button type="button" className="btn btn--outline" onClick={onClose}>
          {cancelText}
        </button>
        <button type="button" className={confirmClass} onClick={onConfirm}>
          {confirmText}
        </button>
      </div>
    </Modal>
  );
}
