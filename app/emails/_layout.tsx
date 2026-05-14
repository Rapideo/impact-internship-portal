// Shared branded HTML wrapper for transactional emails.
//
// Email clients strip external CSS, ignore CSS variables, and reject many
// modern selectors — so this is the ONE place in the codebase where inline
// hex literals are required. Colors mirror app/styles/tokens.css:
//   --navy-deep #051028   --navy #153A98   --canvas #EFF1F5
//   --ink #14171F         --mute #5B6376   --border #D6DAE3
//
// Plain string builder, not JSX, to avoid pulling in a React server renderer
// for what is effectively static template text. The .tsx extension is kept
// for parity with the Phase A stub and the rest of the email folder.

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
    <title>IMPACT Internship Program</title>
  </head>
  <body style="margin:0;padding:0;background:#EFF1F5;font-family:'IBM Plex Sans', Arial, sans-serif;color:#14171F;">
    <span style="display:none!important;visibility:hidden;opacity:0;color:transparent;height:0;width:0;overflow:hidden;">${escapeHtml(previewText)}</span>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#EFF1F5;">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;background:#ffffff;border:1px solid #D6DAE3;border-radius:8px;overflow:hidden;">
            <tr>
              <td style="background:#051028;color:#ffffff;padding:24px 28px;font-family:'Archivo Black', Arial, sans-serif;letter-spacing:0.04em;">
                IMPACT &middot; Internship Program
              </td>
            </tr>
            <tr>
              <td style="padding:32px 28px;font-size:15px;line-height:1.6;">
                ${bodyHtml}
              </td>
            </tr>
            <tr>
              <td style="background:#EFF1F5;color:#5B6376;padding:18px 28px;font-size:12px;font-family:'IBM Plex Mono', Courier, monospace;">
                &copy; 2026 IMPACT / Indiana &middot; This message was sent from a transactional address; please do not reply.
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
