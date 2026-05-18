// Confirm receipt primitive — ported from the prototype's `.confirm` block
// (assessment-confirmation.html + 404.html). A centered confirmation
// surface with a 88px circular badge (gold for success, canvas-alt with a
// muted X glyph for error), a micro-label eyebrow, an Archivo Black title,
// body prose, and an optional receipt card (with mono submission id and a
// nested `<MetaStrip />`) plus an action row.

import type { ReactNode } from 'react';
import { MetaStrip, type MetaItem } from './MetaStrip';

export type ConfirmReceiptVariant = 'success' | 'error';

export interface ConfirmReceiptProps {
  variant?: ConfirmReceiptVariant;
  microLabel: ReactNode;
  /** Display-font title (e.g. "Personal Goals submitted."). */
  title: ReactNode;
  /** Body prose beneath the title. */
  body: ReactNode;
  /** Optional submission-id mono string (renders the receipt card). */
  receiptId?: string;
  /** Optional list of meta-strip cells inside the receipt card. */
  receiptItems?: MetaItem[];
  /** Optional note paragraph at the bottom of the receipt card. */
  note?: ReactNode;
  /** Action row at the bottom of the confirm block (typically button links). */
  actions: ReactNode;
}

function SuccessBadge() {
  return (
    <div className="confirm__badge" aria-hidden="true">
      <svg
        viewBox="0 0 48 48"
        width="56"
        height="56"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="10 26 20 36 39 14" />
      </svg>
    </div>
  );
}

function ErrorBadge() {
  return (
    <div
      className="confirm__badge"
      aria-hidden="true"
      style={{
        background: 'var(--canvas-alt)',
        color: 'var(--muted)',
        boxShadow: 'none',
      }}
    >
      <svg
        viewBox="0 0 48 48"
        width="48"
        height="48"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <line x1="32" y1="16" x2="16" y2="32" />
        <line x1="16" y1="16" x2="32" y2="32" />
      </svg>
    </div>
  );
}

export function ConfirmReceipt({
  variant = 'success',
  microLabel,
  title,
  body,
  receiptId,
  receiptItems,
  note,
  actions,
}: ConfirmReceiptProps) {
  return (
    <main className="confirm">
      <div className="container confirm__inner">
        {variant === 'success' ? <SuccessBadge /> : <ErrorBadge />}
        <span className="micro-label">{microLabel}</span>
        <h1
          className="confirm__title"
          style={variant === 'error' ? { color: 'var(--muted)' } : undefined}
        >
          {title}
        </h1>
        <p className="confirm__body">{body}</p>

        {(receiptId || receiptItems) && (
          <div className="confirm__receipt">
            {receiptId ? (
              <div className="confirm__receipt-head">
                <span className="micro-label">SUBMISSION RECEIPT</span>
                <span className="confirm__receipt-id mono">{receiptId}</span>
              </div>
            ) : null}
            {receiptItems && receiptItems.length > 0 ? <MetaStrip items={receiptItems} /> : null}
            {note ? <p className="confirm__note">{note}</p> : null}
          </div>
        )}

        <div className="confirm__actions">{actions}</div>
      </div>
    </main>
  );
}
