// Branded employer-invite email. Plain string builder (no JSX) — see
// `_layout.tsx` for the rationale on inline hex literals.
//
// Signature is unchanged from the Phase A stub:
//   renderEmployerInvite({ employerName, acceptUrl, programName })
//     -> { subject, html, text }
// so `app/lib/invites.server.ts` continues to import it without modification.

import { emailLayout, escapeHtml } from './_layout';

export interface EmployerInviteArgs {
  employerName: string;
  acceptUrl: string;
  programName: string;
}

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

export function renderEmployerInvite(args: EmployerInviteArgs): RenderedEmail {
  const subject = `You're invited: ${args.programName} Employer Portal`;
  const bodyHtml = `
      <h2 style="font-family:'Archivo Black', Arial, sans-serif;font-size:22px;color:#051028;margin:0 0 16px;">Welcome to ${escapeHtml(args.programName)}.</h2>
      <p style="margin:0 0 16px;">
        An account has been created for <strong>${escapeHtml(args.employerName)}</strong> in the IMPACT Internship Assessment Portal. Click the button below to set your password and start completing competency assessments for your interns.
      </p>
      <p style="margin:24px 0;">
        <a href="${escapeHtml(args.acceptUrl)}" style="display:inline-block;background:#153A98;color:#ffffff;text-decoration:none;padding:14px 22px;border-radius:4px;font-weight:600;">
          Accept invite &rarr;
        </a>
      </p>
      <p style="margin:0 0 8px;font-size:13px;color:#5B6376;">
        This link expires in 24 hours. If it doesn't work, contact your program lead and they can resend it.
      </p>
      <p style="margin:0;font-size:13px;color:#5B6376;">
        You'll be able to view your cohorts and interns, submit competency assessments, and complete Exit Employer Surveys. Your account only sees data for ${escapeHtml(args.employerName)}.
      </p>
    `;
  const text = `Welcome to ${args.programName}.

An account has been created for ${args.employerName} in the IMPACT Internship Assessment Portal.

Set your password to start: ${args.acceptUrl}

This link expires in 24 hours. If it doesn't work, contact your program lead.
`;
  return {
    subject,
    html: emailLayout({
      previewText: `Set your password for ${args.programName}.`,
      bodyHtml,
    }),
    text,
  };
}
