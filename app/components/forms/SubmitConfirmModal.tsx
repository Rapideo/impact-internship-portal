// Confirm modal used by every assessment form before the final POST.
//
// Implemented as a thin shell over the existing `<Modal>` primitive — the
// generic ConfirmModal in app/components/ has a slightly different prop
// surface (label + variant), so this one matches the SP4 plan exactly:
// open / title / body / confirmLabel / cancelLabel / onClose / onConfirm /
// danger.
//
// The component is stateless and renders null when `open` is false (the
// underlying Modal already guards on this); callers can freely mount it
// unconditionally in their render tree.

import { Modal } from '~/components/Modal';

export interface SubmitConfirmModalProps {
  open: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel?: string;
  onClose: () => void;
  onConfirm: () => void;
  danger?: boolean;
}

export function SubmitConfirmModal({
  open,
  title,
  body,
  confirmLabel,
  cancelLabel = 'Keep Editing',
  onClose,
  onConfirm,
  danger = false,
}: SubmitConfirmModalProps) {
  const titleId = 'submit-confirm-title';
  const confirmClass = danger ? 'btn btn--danger' : 'btn btn--primary';
  return (
    <Modal
      open={open}
      onClose={onClose}
      labelledBy={titleId}
      variant={danger ? 'danger' : 'default'}
    >
      <h3 className="modal__title" id={titleId}>
        {title}
      </h3>
      {body ? <p className="modal__body">{body}</p> : null}
      <div className="modal__actions">
        <button type="button" className="btn btn--outline" onClick={onClose}>
          {cancelLabel}
        </button>
        <button type="button" className={confirmClass} onClick={onConfirm}>
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
