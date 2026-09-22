// Shared branded HTML wrapper for transactional emails.
//
// Email clients strip external CSS, ignore CSS variables, and reject many
// modern selectors — so this is the ONE place in the codebase where inline
// hex literals are required. Colors mirror app/styles/tokens.css:
//   --navy-deep #051028   --navy #153A98   --canvas #EFF1F5
//   --ink #14171F         --mute #5B6376   --border #D6DAE3
//   --green #73AF2F  (Equus accent — the rule under the masthead)
//
// The logo is a PNG, not the SVG the app uses: Gmail and Outlook strip inline
// SVG and <img> tags pointing at .svg files. It is referenced by ABSOLUTE url
// because an email has no origin to resolve against — regenerate it with
// `npm run email:logo` if public/logo-reverse.svg ever changes.
// Images are blocked by default in many clients, so the alt text is styled to
// read as the wordmark when the image does not load.
//
// Plain string builder, not JSX, to avoid pulling in a React server renderer
// for what is effectively static template text. The .tsx extension is kept
// for parity with the Phase A stub and the rest of the email folder.

/**
 * Absolute URL of the email masthead logo. Points at PRODUCTION on purpose:
 * mail sent from any environment has to resolve to a host that is publicly
 * reachable and stable, which a branch-deploy URL is not.
 */
export const EMAIL_LOGO_URL = 'https://impact-portal-app.netlify.app/email-logo.png';

export interface EmailLayoutArgs {
  previewText: string;
  bodyHtml: string;
}

/**
 * Branded HTML wrapper. Email-safe inline styles only — no external CSS.
 * Navy header strip + white card body + canvas footer.
 */
export function emailLayout({ previewText, bodyHtml }: EmailLayoutArgs): string {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Equus Internship Program</title>
  </head>
  <body style="margin:0;padding:0;background:#EFF1F5;font-family:'IBM Plex Sans', Arial, sans-serif;color:#14171F;">
    <span style="display:none!important;visibility:hidden;opacity:0;color:transparent;height:0;width:0;overflow:hidden;">${escapeHtml(previewText)}</span>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#EFF1F5;">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;background:#ffffff;border:1px solid #D6DAE3;border-radius:8px;overflow:hidden;">
            <tr>
              <td style="background:#051028;padding:22px 28px;" align="left">
                <img src="${EMAIL_LOGO_URL}" width="180" height="41" alt="Equus Workforce Solutions" style="display:block;border:0;outline:none;text-decoration:none;width:180px;height:41px;font-family:'Archivo Black', Arial, sans-serif;font-size:16px;letter-spacing:0.04em;color:#ffffff;" />
              </td>
            </tr>
            <tr>
              <td style="background:#73AF2F;height:4px;line-height:4px;font-size:0;">&nbsp;</td>
            </tr>
            <tr>
              <td style="padding:32px 28px;font-size:15px;line-height:1.6;">
                ${bodyHtml}
              </td>
            </tr>
            <tr>
              <td style="background:#EFF1F5;color:#5B6376;padding:18px 28px;font-size:12px;font-family:'IBM Plex Mono', Courier, monospace;">
                &copy; 2026 Equus / Indiana &middot; This message was sent from a transactional address; please do not reply.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

/** Minimal HTML-entity escape for user-supplied strings interpolated into markup. */
export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
