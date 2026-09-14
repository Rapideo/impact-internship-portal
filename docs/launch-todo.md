# Launch To-Do

Open items remaining after the 2026-05-26 production launch. Production is **live
and functional** (`impact-portal-app.netlify.app` on impact-prod, auto-deploying
on merge to `main`); none of the below block the admin's own use, but several
matter before the team / employers are onboarded. See `docs/cicd-overview.md`
for how the pipeline works and `CLAUDE.md` for current infra state.

## Client punchlist 9.11.26 (Koehler Partners / IMPACT program team)

The client's list, received 2026-09-11; the original file lives outside this public repo
(`C:\Projects\impact-client-docs\`). Status is tracked here.

| # | Item | Status |
|---|---|---|
| 1 | Make the "Good Morning" greeting dynamic | Done (time-of-day greeting on admin home) |
| 2 | Rename "Entry Assessment Barriers" → "Internship Participation Factors" | Done — #138/#139/#140 |
| 3 | Add Start Date / End Date to the Intern Profile | Done — #156 (2026-09-14). Both dates were captured on create and *displayed* on the record since SP2; the gap was that they were locked with identity. Now editable on the record (End ≥ Start rule; Intern ID not re-issued) |
| 4 | Replace First Initial / Last Name with a unique ID | Done — #143/#144/#150 (Intern ID `IMP-YY-NNNN`) |
| 5 | Add the ability to delete users | Done — #157 (2026-09-14). **Deactivate-first** (Matt, 2026-09-14): Delete appears on the user page only once the account is deactivated; confirm modal; hard-deletes the auth user (profiles cascade, submissions keep their rows with attribution cleared) |
| 6 | Add Start Date / End Date to Cohort | **Already built** (since SP2): the cohort create + edit forms require both, the cohort detail and both employer views show them. Only the cohort table on the admin employer page lacks an End column. **Ask KP where they expected to see the dates** before doing anything |
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
- [ ] **One-line instruction above the Participation Factors checklist (S, copy)** — "checked =
      applied to this intern's participation". The 09-11 rename fixed the values, not this.
- [ ] **"Not yet tracked" pill tooltip (S)** — it just means no 90/180-day outcome recorded.
- [ ] **Assessment Phases copy (S)** — say phase selection is manual, per submission, scoped
      to the cohort's phases; not date/milestone-driven.
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
- [ ] **Whitaker "data-loss" report is a DISPLAY bug — reproduce it.** The restored rows show two
      fully-answered competency submissions on 2026-07-08 (14:26Z phase `c40ad080…`, 15:01Z phase
      `158ef798…`) plus two June 9 rows with phase text `'Phase 1'` and one answer each. The tester
      saw a blank form on return, so the write succeeded; suspect the record view loads the wrong
      phase (or the June rows). Also: `assessment_submissions.phase` mixes free text and phase
      UUIDs — normalise while fixing. Rows are on impact-dev under intern `44444444-…4401`.
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

- [ ] **Regenerate the Quick Start & Testing Guide** — `docs/quick-start-guide/quick-start-guide.html`
      has its own `--gold` token copy and all 18 screenshots show the IMPACT logo + gold accent.
      Same job as #151 (`capture.ts` from staging, then `render.ts`).
- [ ] **Ask Equus for their official reversed (white) logo.** `public/logo-reverse.svg` is *our*
      derivation (wordmark + tagline recoloured white, green "E" kept); if they have a sanctioned
      reversed mark, drop it in under the same filename — `BrandMark.test.tsx` only pins src/alt.
- [ ] **Favicon** — there has never been one. The green "E" from the Equus mark would do; the
      SVG's paths are grouped, so it needs a small extraction, not a crop.
- [ ] **`--success` vs `--green`** — two greens now sit side by side (pass pills / 90-day rail vs
      the accent). Deliberately left distinct; revisit if the program team finds them confusing.
- [ ] **Email templates** (`app/emails/`) still say IMPACT in the header wordmark and use navy
      only — no gold to swap, but the brand name/logo should follow once the templates are
      actually installed in Supabase (see "Branded email templates" above).

- [ ] **Survey copy still says "barriers"** (`pf-barriers`, `pf-barriers-detail`, `ees-barriers`)
      — client note drafted in `KP Feedback July 2026/`; awaiting their wording.

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
