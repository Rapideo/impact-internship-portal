// Branded password-reset email. Plain string builder (no JSX) — see
// `_layout.tsx` for the rationale on inline hex literals.
//
// For v1 launch this template is pasted into Supabase Dashboard
// (Authentication -> Email Templates -> "Reset Password") with
// `{{ .ConfirmationURL }}` interpolated as `resetUrl`. See docs/deployment.md.

import { emailLayout, escapeHtml } from './_layout';

export interface PasswordResetArgs {
  resetUrl: string;
  programName: string;
}

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

export function renderPasswordReset(args: PasswordResetArgs): RenderedEmail {
  const subject = `Reset your ${args.programName} password`;
  const bodyHtml = `
      <h2 style="font-family:'Archivo Black', Arial, sans-serif;font-size:22px;color:#051028;margin:0 0 16px;">Password reset.</h2>
      <p style="margin:0 0 16px;">
        We received a request to reset the password for your ${escapeHtml(args.programName)} account. Click below to set a new one.
      </p>
      <p style="margin:24px 0;">
        <a href="${escapeHtml(args.resetUrl)}" style="display:inline-block;background:#153A98;color:#ffffff;text-decoration:none;padding:14px 22px;border-radius:4px;font-weight:600;">
          Reset password &rarr;
        </a>
      </p>
      <p style="margin:0;font-size:13px;color:#5B6376;">
        This link expires in 1 hour. If you didn't request a reset, you can safely ignore this email — your password won't change.
      </p>
    `;
  const text = `Password reset.

We received a request to reset the password for your ${args.programName} account.

Reset link: ${args.resetUrl}

This link expires in 1 hour. If you didn't request a reset, you can ignore this email.
`;
  return {
    subject,
    html: emailLayout({
      previewText: `Reset your ${args.programName} password.`,
      bodyHtml,
    }),
    text,
  };
}
