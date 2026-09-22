# Launch To-Do

Open items remaining after the 2026-05-26 production launch. Production is **live
and functional** (`impact-portal-app.netlify.app` on impact-prod, auto-deploying
on merge to `main`); none of the below block the admin's own use, but several
matter before the team / employers are onboarded. See `docs/cicd-overview.md`
for how the pipeline works and `CLAUDE.md` for current infra state.

## Client punchlist 9.11.26 (Koehler Partners / IMPACT program team)

The client's list, received 2026-09-11; the original file lives outside this public repo
(`client-docs/` in this repo — **gitignored**, moved in-tree 2026-09-22). Status is tracked here.

| # | Item | Status |
|---|---|---|
| 1 | Make the "Good Morning" greeting dynamic | Done (time-of-day greeting on admin home) |
| 2 | Rename "Entry Assessment Barriers" → "Internship Participation Factors" | Done — #138/#139/#140 |
| 3 | Add Start Date / End Date to the Intern Profile | Done — #156 (2026-09-14). Both dates were captured on create and *displayed* on the record since SP2; the gap was that they were locked with identity. Now editable on the record (End ≥ Start rule; Intern ID not re-issued) |
| 4 | Replace First Initial / Last Name with a unique ID | Done — #143/#144/#150 (Intern ID `IMP-YY-NNNN`) |
| 5 | Add the ability to delete users | Done — #157 (2026-09-14). **Deactivate-first** (Matt, 2026-09-14): Delete appears on the user page only once the account is deactivated; confirm modal; hard-deletes the auth user (profiles cascade, submissions keep their rows with attribution cleared) |
| 6 | Add Start Date / End Date to Cohort | Closed 2026-09-21 — already built since SP2 (cohort create + edit require both; cohort detail and both employer views show them). Confirmed with the client: in place, no issue, no change needed |
| 7 | Replace the logo with the Equus logo | Done — #154 |
| 8 | Update colours to Equus green (replace the yellow) | Done — #154 |
| — | "Review KP feedback for add items" | Parsed 2026-09-14 into 17 candidates (Save/Submit modal copy mismatch is the cheap headline; outcome-status model and employer-transfer history need KP definitions first) — see the "KP July 2026 feedback" section below |

## KP July 2026 feedback — to-do candidates (triaged 2026-09-14)

Seventeen candidates parsed from the July tester feedback (meeting notes, two testers' logs);
the full inventory with source citations is `TRIAGE_KP_Feedback_ToDo_Candidates_2026-09-14.md`
next to the client files. Already addressed: Intern ID, participation-factor values, logo.
Already tracked: Whitaker display bug, favicon, survey "barriers" copy. Ordered by value:

**No client decision needed**
- [x] **Save/Submit copy mismatch** — done 2026-09-14 (#158). **"Submit" is the word** (Matt's
      call): the competency modal now mirrors the button (`"${submitLabel}?"` / Submit), the
      employer competency + both exit-survey forms say Submit, and the post-submit toasts say
      "submitted". The modal body still states that admin/employer submissions stay editable.
- [ ] **Saving/Submitting state + disabled button while in flight (M)** — the reported "lag"
      with no feedback; also closes the double-submit risk.
- [ ] **"Editable" vs "one-time, locked" badge on assessment list/detail (S/M)** — admin forms
      stay editable, intern self-assessments never are; nothing shows which after the fact.
- [ ] **Unsaved-changes warning on long forms (S/M).**
- [x] **One-line instruction above the Participation Factors checklist** — done 2026-09-14 (#160):
      "Check each factor that applied… Leave a factor unchecked if it did not apply." Settings →
      Participation Factors subtitle says the same.
- [x] **"Not yet tracked" pill tooltip** — done 2026-09-14 (#160): hover title on both the admin
      and employer interns lists (non-visual).
- [x] **Assessment Phases copy** — done 2026-09-14 (#160): Settings → Assessment Phases subtitle
      says the phase is chosen by hand per competency assessment; nothing moves interns
      automatically.
- [ ] **Required-field marker before submit + clearer question-vs-answer styling (S/M)** —
      the prompt is already non-editable; the confusion is visual.
- [ ] **In-app Help (S/M as a nav link to the rendered Quick Start guide; L as a real section)**
      + a "how it connects" explainer (Program → Employer → Cohort → Intern → Assessment →
      Phase → Factor) and the answer to "does editing Settings change submitted assessments?"
      (no — answers are a jsonb snapshot at submission).
- [ ] **Page 8 of the testing guide is unclear** — bundle with the guide regen; need someone to
      say what page 8 is.

**Needs a KP decision first**
- [ ] **Outcome / intern-status model (L)** — On Hold, Not Yet Placed, Waiting for
      Requalification, active/paused/ineligible/exited; today outcomes are two booleans. KP has
      not yet defined what 90D means or which states they want.
- [ ] **Employer / role transfer with history (L)** — `interns.cohort_id` is a single FK, no
      history, and submissions carry no employer/cohort/role snapshot. Needs their rules.
- [ ] **Participation-factor change history** — none today (re-editing overwrites). Ask if it
      matters.
- [ ] **Autosave / drafts for long forms (L)** — never for the one-shot intern forms.
- [ ] **Employer-to-employer connection / monthly check-in** — in-platform or a program process?

## Before real team / employer use

- [ ] **Custom SMTP for transactional email. BLOCKED on buying a sending domain
      (2026-09-22).** Supabase's built-in mailer is rate-limited to a handful of
      sends per hour and the dashboard itself flags it as "not meant to be used
      for production apps", so employer invites and password resets won't
      reliably arrive. Wire a provider in Supabase → Authentication → Emails →
      SMTP.
      - **Provider is unsettled.** This list previously said "Resend is off the
        table per stakeholder"; on 2026-09-22 Matt proposed Resend himself.
        Confirm which decision stands before wiring anything. Resend is the path
        of least resistance in code — `sendEmail` (`app/lib/email.server.ts`)
        already wraps the Resend SDK and `RESEND_API_KEY` / `RESEND_FROM` are
        already declared in `env.server.ts`, just unset in every Netlify context.
      - **There are TWO paths, and they are not the same job.** Supabase sends
        the invite/reset mail, so pointing *that* at a provider means putting
        SMTP credentials in Supabase's SMTP Settings. Our own app sends (the
        branded builders in `app/emails/`) need `RESEND_API_KEY` set per Netlify
        context. We likely want both.
      - Either way it needs a **verified sending domain with DNS records**, which
        is the actual blocker.
- [x] **Branded email templates in Supabase** — done 2026-09-22. All four pasted
      and verified after reload: **Reset password** + **Invite user**, on **both**
      impact-dev and impact-prod. Subjects are "Reset your Equus Internship
      Program password" and "You're invited: Equus Internship Program Employer
      Portal". Procedure in `docs/deployment.md`.
      - **The program name is frozen at paste time.** `resolveProgramName()` makes
        the *Resend* path follow Settings → Program Info, but a pasted template is
        a literal string — rename the program and these must be re-rendered and
        re-pasted.
      - The masthead logo is `public/email-logo.png`, referenced by absolute URL
        and generated from `logo-reverse.svg` by `npm run email:logo`. It is a PNG
        because Gmail and Outlook strip inline SVG.
- [ ] **Real program data.** Enter employers / cohorts / roles / interns via the
      admin UI (by design these are not seeded — `db:seed-prod` only loads
      program-wide reference data). prod is empty until the team does this.

- [ ] **Real contact details on `program_info`.** Both environments still carry the
      seeded placeholders: `kortney@impact.org` (old domain) and `(317) 555-0100`
      (the reserved fictional 555-01xx block). Testers see these on Settings →
      Program Info. Editable in the admin UI, no deploy needed. Same domain
      blocker as custom SMTP for the email; the phone is independent.

## Closed 2026-09-22 — auth defects found during the Equus rename

Neither was a branding problem; both were found while verifying the rename.

- [x] **Supabase redirect allow-list was empty on impact-dev.** A staging reset mail
      arrived pointing at `http://localhost:3000` — the Supabase scaffold default, and
      not even a port this app uses. **Supabase silently DISCARDS a `redirectTo` that is
      not on the allow list and substitutes the Site URL, with no error anywhere.**
      Fixed in the dashboard: Site URL `https://staging--impact-portal-app.netlify.app`
      plus wildcard entries for staging, `localhost:5173` and deploy previews.
      impact-prod was already configured correctly (2026-05-26) and was never affected.
      `docs/deployment.md` §3 had documented this failure mode before it happened — it
      was an execution gap, not a knowledge gap.
- [x] **Password reset was broken in EVERY environment since it was built** (#163).
      `_public.auth.forgot.tsx` built a `Headers`, handed it to the Supabase client, then
      returned a bare `{ sent: true }` — dropping it. `@supabase/ssr` runs the PKCE flow,
      so `resetPasswordForEmail()` writes the **code verifier** cookie through the cookie
      adapter into exactly those headers; no cookie meant `exchangeCodeForSession()` in
      `/auth/callback` failed and the user was bounced to `/login` with no explanation.
      Now `data({ sent: true }, { headers })`.
      **Rule: any action that calls a Supabase auth method and RETURNS DATA — rather than
      `throw redirect(..., { headers })` — must return the headers.**
      `/login` now also renders the query-string notices four routes were already sending
      and nothing displayed (`link-invalid`, `no-employer`, `employer-missing`, `reset=ok`),
      which is what made this expensive to diagnose.
- [x] **Dev-only features were gated on runtime `process.env.NODE_ENV`** (#165). Netlify
      builds with `NODE_ENV=production` but serves from a Lambda where it is **unset**, so
      `routes.ts` (build time) correctly left `/dev/reseed` unregistered while the Danger
      Zone card (runtime) rendered on staging and prod — a red destructive button whose
      target 404s. All dev-only gates now use `import.meta.env.DEV`, which Vite substitutes
      at build time. Guarded by `tests/guards/dev-only-gating.test.ts`.

## SP6 launch-plan phases still open

- [x] **Reports (Phase C).** Admin + employer reports dashboards built — KPI
      tiles, bars, gauges, meters, and an activity trend, with employer/cohort
      scope filtering. Outcome denominator = all in-scope interns (v1 rule).
      Stakeholder input on *which* metrics matter most can still refine it.
- [x] **Sentry (Phase E).** DSN set on the production context + `handleError`
      wired (`createSentryHandleError`) so loader/action/render errors are
      captured — `Sentry.init()` alone didn't do that. Active on prod after
      deploy. Optional follow-ups: client-side browser errors, source-map upload
      for readable stack traces, and request tracing via `wrapSentryHandleRequest`.
- [ ] **Admin invite → accept E2E test (Phase F.2).** Deferred since SP5. Build
      via the Supabase admin API (`generateLink`) — no public `/dev` route.

## Hardening / cleanup

- [x] **Stop impact-prod auto-pausing (free tier).** Done 2026-09-11 — the Supabase org
      moved to **Pro** (both projects), which does not auto-pause. Kept for the record: on the
      free tier prod paused after ~7 idle days and went fully down on 2026-06-08 — paused =
      `<ref>.supabase.co` drops from DNS, every login returns "Invalid email or password",
      password reset silently no-ops; keyless `curl <ref>.supabase.co` → "Could not resolve
      host" when paused, HTTP 401 when live. The keep-alive cron below is now belt-and-braces.
- [ ] **Enable the keep-alive cron (add anon-key secrets).** PR #122 (merged)
      added a scheduled GitHub Action (`.github/workflows/keepalive.yml`) that
      pings both projects every ~3 days, but it
      warn-and-skips until two repo secrets exist: `SUPABASE_DEV_ANON_KEY` +
      `SUPABASE_PROD_ANON_KEY` (the anon/public keys from Supabase → Project
      Settings → API). Add at GitHub → Settings → Secrets and variables →
      Actions, then run it once (Actions → Supabase keep-alive → Run workflow)
      and confirm both report HTTP 200. Stopgap until the free-tier upgrade above.
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
- [x] **Post-mortem.** Done 2026-08-02 (PR #135) — `docs/case-study-2026-08-02.md`
      plus a standalone `docs/case-study-2026-08-02.html`. Covers the full arc
      (prototype 2026-04-16 → launch and hardening 2026-06-19) with figures
      verified from git history. Central finding: fidelity came from promoting
      the prototype to *literal specification* (SP7), not from careful work.
      Top recommendation is a reorder — SP7's Phase A/B (tokens, then primitives
      against a dev-only demo route, gated on sign-off) becomes SP1's Phase A/B.
      §8 records what the process missed; §9 is the revised playbook.

## Follow-ups from the Intern ID rebuild (2026-09-11/12)

- [x] **Regenerate the Quick Start & Testing Guide** — done 2026-09-13 (#151): copy for the
      Intern ID and participation factors, all 18 screenshots recaptured from staging, PDF re-rendered.
- [x] **Recover pre-2026-09-11 impact-dev data** — done 2026-09-13 via Database → Backups →
      **Restore to new project** (clone of the 11 Sep 08:46Z backup), then lifted the 12
      human-entered `assessment_submissions` (Whitaker ×4, Test1 ×2, Castillo ×3, Davenport,
      Thornton, Dorsey) and the 10 missing `profiles` rows into impact-dev; clone deleted.
      Runbook now in CLAUDE.md (Supabase → Backups).
- [x] **Whitaker "data-loss" report — ROOT-CAUSED 2026-09-14 (#159): test pollution, not a
      display bug.** `tests/lib/assessment-submissions.server.test.ts` (unit project, since
      2026-05-13) ran `DELETE FROM assessment_submissions WHERE intern_id = <Whitaker>` in a
      `beforeEach` and inserted two `'Phase 1'`/one-answer fixture rows — against impact-dev, on
      every `npm test`, because `tests/setup.ts` loads `.env.local`. The "blank form" the tester
      opened in July was one of those fixture rows; her two July-8 submissions were intact and
      render fully (verified 2026-09-14). The file now lives under `tests/rls/` (guarded), the
      guard also checks `DATABASE_POOL_URL`/`DATABASE_SERVICE_URL`, and a unit-project tripwire
      (`tests/guards/`) fails if any unit test opens a raw SQL client or carries a destructive
      SQL literal. Whitaker's July rows were re-inserted from the 09-13 recovery JSON (kept with
      the client files). Left over: the `phase` column still mixes free text and UUIDs (a migration; low value). The
      raw-UUID display is fixed in #160 (`phaseDisplayLabel`: label → legacy text as-is →
      "Phase removed" for a dangling id → "—").
- [ ] **`db:seed` profile-restore ordering** — the base seed restores `profiles` BEFORE
      `db:seed:demo` recreates the demo employers, so employer logins whose employer only exists
      in demo data are skipped (locked out). Two dev accounts hit this 2026-09-11
      (`hoosierbakery@impact.app`, `hopebridge@impact.app`) — restored from backup 2026-09-13,
      but the ordering bug remains. Either run the restore again at the end of the demo seed, or
      have the demo seed re-apply the skipped rows.
- [x] **Remove the `[chooser:*]` step-timing logs** (#147) — done 2026-09-14 (#153). (The staging
      Sentry vars from the incident reproduction were unset 2026-09-13.)
- [ ] **Intern ID re-issue path** (spec D6 follow-up) — only if the program ever asks.

## Follow-ups from the Equus rebrand (2026-09-14, punchlist 9.11 items 7–8)

- [x] **Regenerate the Quick Start & Testing Guide** — done 2026-09-22 (#166). Its private
      `--gold: #ffd71f` token became `--green #73af2f`; the hand-built `IM/P/ACT` cover wordmark
      became the real reversed Equus mark (copied into the guide folder); body copy that said
      "things to be aware of are in gold" now says green; all 18 screenshots recaptured from
      staging. PDF is now `Equus-Portal-Quick-Start-Guide.pdf` — the IMPACT-named file was
      deleted so it cannot be handed out by mistake.
- [x] **Official reversed (white) Equus logo** — asked 2026-09-15; Equus has none. Our derived
      `public/logo-reverse.svg` (wordmark + tagline white, green "E" kept) is the logo. Closed
      2026-09-21.
- [ ] **Favicon** — there has never been one. The green "E" from the Equus mark would do; the
      SVG's paths are grouped, so it needs a small extraction, not a crop.
- [ ] **`--success` vs `--green`** — two greens now sit side by side (pass pills / 90-day rail vs
      the accent). Deliberately left distinct; revisit if the program team finds them confusing.
- [x] **Email templates** (`app/emails/`) — done 2026-09-22 (#163). The text masthead is now the
      Equus logo on the navy-deep band with the green accent rule beneath, and the IMPACT wording
      is gone from the layout, the invite body and both subject lines. Installed in Supabase the
      same day (see "Branded email templates" above).

- [x] **Survey copy still says "barriers"** (`pf-barriers`, `pf-barriers-detail`, `ees-barriers`)
      — note sent 2026-09-15; **client approved the current wording as-is for now** (2026-09-21).
      Reopen only if they send new wording.

## Tooling / developer experience

Recommended CLIs/integrations to de-friction the ops we hit during launch
(2026-05-26). The Supabase CLI is already installed (v2.98) but underused.

- [x] **Supabase MCP** — done 2026-09-11 (`.mcp.json`, PR #141): `supabase-dev`
      writable, `supabase-prod` `read_only=true` (OAuth `database:read` only, no
      `apply_migration`, read-only transactions). See CLAUDE.md → Supabase.
- [ ] **Netlify MCP server** — still open. Deploy inspection is still CLI-only
      (`netlify api getDeploy`, `netlify env:list`).
- [ ] **Link the Supabase CLI** to both projects (`supabase link --project-ref
      <ref>`) for direct DB access without juggling masked Netlify connection
      strings; adopt **`supabase db dump`** as a pre-step before any destructive
      DB op (prod migrations were run with no backup during launch). Now
      feasible: the prod DB password was reset 2026-09-11 and lives in
      `.env.prod.local` (see CLAUDE.md → "Running scripts against impact-prod").
- [ ] **`dotenv-cli`** (dev dep) — `dotenv -e .env.prod.local -- npm run db:migrate`
      to cleanly target a chosen env, replacing the `set -a; source …` pre-load.
      The file MUST be `.env.prod.local`: `.gitignore` covers `.env.*.local` but
      **not** `.env.prod`, which would be a committable prod credential.
- [ ] **`@sentry/vite-plugin`** (dev dep) — upload source maps at build so
      Sentry shows real code, not minified stack traces (needs
      `SENTRY_AUTH_TOKEN`). This is the "readable stack traces" Sentry follow-up.
- [ ] **Nice-to-have:** `@lhci/cli` (Lighthouse CI perf budgets in CI), `act`
      (run GitHub Actions workflows locally).

## Intentionally NOT doing

- The `.kpi-card__delta` color-contrast a11y finding is **left as-is** by
  stakeholder decision (no visual design changes for accessibility). The axe
  spec stays in baseline/log-only mode for the same reason.
