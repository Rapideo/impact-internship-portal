# Netlify Deployment

Prototype is hosted on Netlify as a static site (publish directory: `Prototypes/PROTOTYPE/`).

## URLs

- **Production:** https://impact-internship-portal.netlify.app
- **Admin dashboard:** https://app.netlify.com/projects/impact-internship-portal
- **Build logs:** https://app.netlify.com/projects/impact-internship-portal/deploys
- **Function logs:** https://app.netlify.com/projects/impact-internship-portal/logs/functions
- **Edge function logs:** https://app.netlify.com/projects/impact-internship-portal/logs/edge-functions

## Site details

- **Site name:** `impact-internship-portal`
- **Project ID:** `65497097-8b5c-471e-a0c9-dc7ddea0fb2c`
- **Team / account slug:** `matthew-smith` (display name: Rapideo)
- **Owner:** Matthew Smith (matthew.smith@rapideo.com)
- **Initial deploy:** 2026-04-21
- **Initial deploy ID:** `69e79e54c197fd450e1d0fd4`

## Redeploying

From the repo root, with the Netlify CLI installed and authenticated:

```bash
# Production
netlify deploy --prod --dir=Prototypes/PROTOTYPE

# Draft preview (gets a throwaway URL, doesn't touch prod)
netlify deploy --dir=Prototypes/PROTOTYPE
```

The repo is already linked via `.netlify/state.json` (gitignored), so no re-linking needed on this machine. On a fresh clone, run `netlify link --name impact-internship-portal` first.

## Notes

- No build step — the site is plain static HTML/CSS/JS, uploaded as-is.
- `.netlify/` is in `.gitignore`; don't commit it.
- This is a prototype with mock data only. No secrets, no backend, no auth (the login page accepts any input).

## Supabase email templates

The production rebuild ships two branded transactional emails. Both are
authored as plain string-builders in `app/emails/` and pasted into the
Supabase dashboard for v1 launch (Supabase Auth sends the actual mail; we
just override its hosted templates so the look matches the rest of the app).

Templates to configure:

| Source file                       | Dashboard template (Authentication -> Email Templates) |
| --------------------------------- | ------------------------------------------------------ |
| `app/emails/employer-invite.tsx`  | **Invite user**                                        |
| `app/emails/password-reset.tsx`   | **Reset Password**                                     |

### 1. Render the HTML locally

Use `{{ .ConfirmationURL }}` as the URL argument — Supabase substitutes the
real link at send time. The rendered HTML is printed to stdout; redirect it
to a file or copy from the terminal.

**PowerShell (Windows — the path Matt uses):**

```powershell
# Password reset
npx tsx -e "import('./app/emails/password-reset').then(m => console.log(m.renderPasswordReset({ resetUrl: '{{ .ConfirmationURL }}', programName: 'Equus Internship Program' }).html))" `
  | Out-File -FilePath "$env:TEMP\reset-template.html" -Encoding utf8

# Employer invite
npx tsx -e "import('./app/emails/employer-invite').then(m => console.log(m.renderEmployerInvite({ employerName: '{{ .Data.employer_name }}', acceptUrl: '{{ .ConfirmationURL }}', programName: 'Equus Internship Program' }).html))" `
  | Out-File -FilePath "$env:TEMP\invite-template.html" -Encoding utf8
```

Open the resulting files in Notepad / VS Code, then copy-paste into the
dashboard. (Or just inspect the stdout directly and copy from the terminal.)

**Bash (Linux/macOS):**

```bash
npx tsx -e "import('./app/emails/password-reset').then(m => console.log(m.renderPasswordReset({ resetUrl: '{{ .ConfirmationURL }}', programName: 'Equus Internship Program' }).html))" > /tmp/reset-template.html

npx tsx -e "import('./app/emails/employer-invite').then(m => console.log(m.renderEmployerInvite({ employerName: '{{ .Data.employer_name }}', acceptUrl: '{{ .ConfirmationURL }}', programName: 'Equus Internship Program' }).html))" > /tmp/invite-template.html
```

### 2. Paste into Supabase Dashboard

Supabase Dashboard -> Authentication -> Email Templates:

- **Reset Password**
  - Subject: `Reset your Equus Internship Program password`
  - Body (HTML): paste from `reset-template.html` above.
- **Invite user**
  - Subject: `You're invited: Equus Internship Program Employer Portal`
  - Body (HTML): paste from `invite-template.html` above.

Re-render and re-paste any time the template source changes — these
templates live in Supabase, not in the repo at runtime.

> **The program name is baked in at paste time.** `resolveProgramName()`
> makes the *Resend* path follow Settings -> Program Info, but a template
> pasted into Supabase is a frozen string. Rename the program in Settings and
> you must re-render and re-paste these two templates, or the mail will keep
> the old name.

The masthead logo is `public/email-logo.png`, referenced by absolute URL
because an email has no origin to resolve against. It is a PNG, not the app's
SVG, because Gmail and Outlook strip inline SVG. Regenerate it with
`npm run email:logo` if `public/logo-reverse.svg` changes, then re-render and
re-paste the templates. The logo must be publicly reachable at that URL for
the image to load, so it ships with the production deploy.

### 3. Redirect URL allow-list

Supabase Dashboard -> Authentication -> URL Configuration -> **Redirect
URLs**: every URL the app sends users to after auth must be listed here.

> **This bit silently: an unlisted `redirectTo` is DISCARDED, not rejected.**
> Supabase substitutes the **Site URL** instead and sends the mail anyway,
> with no error anywhere. On 2026-09-22 a staging password-reset mail arrived
> pointing at `http://localhost:3000` — the untouched Supabase scaffold
> default, and not even a port this app uses — because neither cloud project
> had ever had its allow list populated. Recovery *and* invite links were
> affected on both impact-dev and impact-prod. If a link goes somewhere
> unexpected, check this screen before you debug the code.

Wildcards are supported and are far less brittle than listing every
query-string variant:

```
https://impact-portal-app.netlify.app/**              # production
https://staging--impact-portal-app.netlify.app/**     # staging (impact-dev)
https://deploy-preview-*--impact-portal-app.netlify.app/**   # PR previews
http://localhost:5173/**                              # local dev
```

Set impact-prod to the production entry; impact-dev needs the other three.
The explicit per-path form below also works if you prefer it.

For local development (`APP_URL=http://localhost:5173`) and for production
(`APP_URL=<deployed origin>`), add:

```
http://localhost:5173/auth/callback
http://localhost:5173/auth/callback?next=/auth/accept
http://localhost:5173/auth/callback?next=/auth/reset
<APP_URL>/auth/callback
<APP_URL>/auth/callback?next=/auth/accept
<APP_URL>/auth/callback?next=/auth/reset
```

The `?next=/auth/accept` variant carries first-time invitees into the
password-set screen; `?next=/auth/reset` carries forgot-password users into
the same screen with reset copy. Both flow through `/auth/callback` first
so the server can exchange the Supabase code for a session cookie before
redirecting.

### 4. Site URL

Same screen, **Site URL** field: set to the production `APP_URL`. Supabase
falls back to this for any redirect that isn't explicitly allow-listed, so
mis-configuring it sends users to the wrong origin after sign-in.

