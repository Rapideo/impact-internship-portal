// Minimal stub — Phase D replaces this with the branded React Email template.
// Kept as a plain object factory (no JSX) so it's consumable today without a
// renderer dependency. Phase D will swap to a React Email component + render.

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
  const subject = `You're invited — ${args.programName}`;
  const html = `<p>You've been invited as the IMPACT representative for ${args.employerName}.</p><p><a href="${args.acceptUrl}">Click here to accept</a>.</p>`;
  const text = `You've been invited as the IMPACT representative for ${args.employerName}.\n\nAccept here: ${args.acceptUrl}`;
  return { subject, html, text };
}
