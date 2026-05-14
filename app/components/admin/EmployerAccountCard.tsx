// Employer account-access card (SP5 Phase B, Task 3).
//
// Mounted on the admin employer detail page. Renders status + the
// invite / resend / revoke actions. Status is resolved by the parent
// loader (via employerAccountStatus) so we don't double-fetch.
//
// Destructive actions (revoke, cancel-invite) confirm via the shared
// ConfirmModal — the visible button is type=button and only opens the
// modal; the modal then programmatically submits the hidden form.

import { useState } from 'react';
import { Form } from 'react-router';
import type { EmployerAccountStatus } from '~/lib/invites.server';
import { ConfirmModal } from '~/components/ConfirmModal';

export interface EmployerAccountCardProps {
  employerId: string;
  contactEmail: string | null;
  status: EmployerAccountStatus;
  accountEmail: string | null;
  error?: string | null;
  success?: string | null;
}

const STATUS_LABEL: Record<EmployerAccountStatus, string> = {
  none: 'No account',
  pending: 'Invite sent — awaiting accept',
  active: 'Active',
};

const STATUS_PILL_CLASS: Record<EmployerAccountStatus, string> = {
  none: 'pill pill--neutral',
  pending: 'pill pill--gold',
  active: 'pill pill--cyan',
};

export function EmployerAccountCard(props: EmployerAccountCardProps) {
  const action = `/admin/settings/employers/${props.employerId}/account`;
  const [revokeOpen, setRevokeOpen] = useState(false);

  const isPending = props.status === 'pending';
  const revokeLabel = isPending ? 'CANCEL INVITE' : 'REVOKE ACCESS';
  const revokeTitle = isPending ? 'Cancel this invite?' : "Revoke this employer's account?";
  const revokeBody = isPending
    ? 'The invitation link will stop working. You can re-invite later from this page.'
    : 'They will lose access immediately. You can re-invite later from this page.';
  const revokeButtonText = isPending ? 'Cancel Invite' : 'Revoke Access';

  return (
    <section
      className="identity-card"
      aria-labelledby="account-card-title"
      style={{ marginTop: 32 }}
    >
      <header className="identity-card__head">
        <span className="micro-label">EMPLOYER LOGIN</span>
        <span className={STATUS_PILL_CLASS[props.status]}>{STATUS_LABEL[props.status]}</span>
      </header>
      <h3 id="account-card-title" className="identity-card__title">
        Account access
      </h3>
      <p className="identity-card__sub">
        One sign-in account per employer in v1. Invite the contact above (or a custom email) so they
        can self-serve competency entry and Exit Employer Surveys.
      </p>

      {props.error && (
        <div role="alert" className="form-banner form-banner--danger">
          {props.error}
        </div>
      )}
      {props.success && (
        <div role="status" className="form-banner form-banner--success">
          {props.success}
        </div>
      )}

      {props.status === 'none' && (
        <Form method="post" action={action} className="identity-card__form">
          <label className="field">
            <span>Email</span>
            <input
              className="input"
              type="email"
              name="email"
              defaultValue={props.contactEmail ?? ''}
              required
              autoComplete="email"
            />
          </label>
          <button type="submit" name="intent" value="invite" className="btn btn--primary">
            Send invite
          </button>
        </Form>
      )}

      {props.status === 'pending' && (
        <div>
          <p className="identity-card__meta">
            Invited <strong>{props.accountEmail}</strong>. They have not yet set a password.
          </p>
          <div className="identity-card__form-inline">
            <Form method="post" action={action}>
              <button type="submit" name="intent" value="resend" className="btn btn--outline">
                Resend invite
              </button>
            </Form>
            <button type="button" className="btn btn--danger" onClick={() => setRevokeOpen(true)}>
              Cancel invite
            </button>
            <Form method="post" action={action} id="employer-account-revoke-form" hidden>
              <input type="hidden" name="intent" value="revoke" />
            </Form>
          </div>
        </div>
      )}

      {props.status === 'active' && (
        <div>
          <p className="identity-card__meta">
            Signed in as <strong>{props.accountEmail}</strong>.
          </p>
          <div className="identity-card__form-inline">
            <button type="button" className="btn btn--danger" onClick={() => setRevokeOpen(true)}>
              Revoke access
            </button>
            <Form method="post" action={action} id="employer-account-revoke-form" hidden>
              <input type="hidden" name="intent" value="revoke" />
            </Form>
          </div>
        </div>
      )}

      <ConfirmModal
        open={revokeOpen}
        onClose={() => setRevokeOpen(false)}
        onConfirm={() => {
          (
            document.getElementById('employer-account-revoke-form') as HTMLFormElement | null
          )?.submit();
        }}
        label={revokeLabel}
        title={revokeTitle}
        body={revokeBody}
        confirmText={revokeButtonText}
        variant="danger"
      />
    </section>
  );
}
