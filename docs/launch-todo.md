# Launch To-Do

Open items remaining after the 2026-05-26 production launch. Production is **live
and functional** (`impact-portal-app.netlify.app` on impact-prod, auto-deploying
on merge to `main`); none of the below block the admin's own use, but several
matter before the team / employers are onboarded. See `docs/cicd-overview.md`
for how the pipeline works and `CLAUDE.md` for current infra state.

## Before real team / employer use

- [ ] **Custom SMTP for transactional email.** Supabase's built-in mailer only
      reliably delivers to the project owner address, so employer invites and
      their password resets won't arrive. Wire any SMTP provider (Resend is off
      the table per stakeholder; Google Workspace SMTP / Amazon SES / Mailgun /
      SendGrid / Postmark all work) in Supabase → Authentication → Emails → SMTP.
- [ ] **Branded email templates in Supabase.** impact-prod is using Supabase's
      default email HTML. Paste the branded invite/reset templates from
      `app/emails/` into the Supabase dashboard (procedure in `docs/deployment.md`).
- [ ] **Real program data.** Enter employers / cohorts / roles / interns via the
      admin UI (by design these are not seeded — `db:seed-prod` only loads
      program-wide reference data). prod is empty until the team does this.

## SP6 launch-plan phases still open

- [ ] **Reports (Phase C).** Admin Reports is a "coming soon" placeholder; needs
      real aggregate queries + stakeholder input on which metrics to show.
- [ ] **Sentry DSN (Phase E).** Server instrumentation is wired (PR #109) but
      `SENTRY_DSN` is unset, so nothing is captured yet. Create a Sentry project
      and set the DSN (per context) to activate error tracking.
- [ ] **Admin invite → accept E2E test (Phase F.2).** Deferred since SP5. Build
      via the Supabase admin API (`generateLink`) — no public `/dev` route.

## Hardening / cleanup

- [ ] **`#77` DB-role separation.** `db` and `dbService` still share one
      BYPASSRLS connection. Split `DATABASE_SERVICE_URL` from `DATABASE_POOL_URL`
      and downgrade the pool to a real `anon` Postgres role for genuine RLS.
- [ ] **Remove the bootstrap test admin** if no longer needed — impact-prod has
      both `matthew.smith@rapideo.com` (created during bootstrap) and
      `matthew.smith@koehlerpartners.com`.
- [ ] **`docs/seed-prod-runbook.md`.** Plan Task 18; the prod-bootstrap procedure
      was executed 2026-05-26 but never written up as a repeatable runbook.

## Deferred by stakeholder (revisit later)

- [ ] **Netlify manual-publish gate.** Optionally lock auto-publishing so prod
      builds run on merge but a human clicks "Publish deploy" to go live.
- [ ] **Post-mortem.** Capture the prototype → planning → build playbook once
      launch settles (see `docs/methodology.md` as the starting point).

## Intentionally NOT doing

- The `.kpi-card__delta` color-contrast a11y finding is **left as-is** by
  stakeholder decision (no visual design changes for accessibility). The axe
  spec stays in baseline/log-only mode for the same reason.
