# Launch Readiness — 2026-05-20

Snapshot of where the app stands after the SP6 night-2 wrap-up. Captures what's done, what's blocking each remaining item, and who owns each blocker so tomorrow's planning conversation can start from a clear baseline.

## Status summary

| Area | State |
|---|---|
| **App functionality** | Feature-complete (SP0–SP5 + SP7). All 5 question-bearing forms, admin CRUD, employer shell, anonymous intern self-submit. |
| **Frontend fidelity** | Pixel-for-pixel rebuild against prototype (SP7). 75 side-by-side captures filed. |
| **Test suites** | Unit 204/204, RLS 21/21, Playwright 22/22 — all green locally and in CI. |
| **CI pipeline** | All 5 jobs green: sanity, lint+typecheck, unit, RLS+integration, Playwright. |
| **Deploy infrastructure** | Netlify project exists (`impact-portal-app.netlify.app`). Adapter wired. Draft deploys land green. |
| **Production deploy** | NOT live. GitHub auto-deploy not wired (needs OAuth handshake). `DATABASE_POOL_URL` missing in production env. |
| **Observability** | Sentry server instrumentation wired (PR #109). Inactive — needs `SENTRY_DSN`. |
| **Transactional email** | Branded templates built (SP5). Resend wrapper inactive — needs `RESEND_API_KEY`. Supabase default emails still send. |

## What landed in the last two sessions (PRs #103–#109)

- **#103** Meta-strip first-column padding + admin/interns/new first-name validator fixes (G8 walkthrough findings)
- **#104** SP7 close-out — CLAUDE.md + status + backlog
- **#105** Phase F.1 (Playwright CI un-gate) + Phase E (Sentry server shell) + "My Employer" → "Org Details" rename
- **#107** JWT hook rewrite — top-level `role` claim stays `authenticated`; app role moves to `user_role` (launch blocker)
- **#108** New `tests/rls/postgrest-write.test.ts` — closes the coverage gap that hid #107's bug from CI
- **#109** Sentry SSR-entry wired — instrument.server.mjs imported from app/entry.server.tsx

## Outstanding blockers — what's stopping a real launch

### Hard blockers (must be resolved before launch)

| Blocker | Owner | What's needed |
|---|---|---|
| **Netlify GitHub OAuth not linked** | Matt (UI) | Open `https://app.netlify.com/projects/impact-portal-app/settings/deploys#continuous-deployment` → Link repository → GitHub OAuth → select `Rapideo/impact-internship-portal`. Unlocks auto-deploy on push to `main`. |
| **`DATABASE_POOL_URL` missing in prod env** | Matt (UI) | In Netlify env settings: add `DATABASE_POOL_URL` (impact-prod transaction pooler URL from Supabase dashboard) to Production context. Without this the production app crashes on load. |
| **Invite/recovery flow uses implicit grant; callback only handles PKCE** | Dev work (~1-2 hr) | Documented in `docs/BACKLOG.md` under "Auth flow findings". Either reconfigure Supabase Auth to use PKCE for invites + recovery, or add a client-side hash-fragment bridge in `/auth/callback`. Until fixed, any real employer invite link lands on /login with the token stranded in the URL hash. |
| **Prod seed content** | Program staff | Real cohorts, employers, phases, competency rubric content. The seed-prod scaffolding from SP1 is ready; needs real values. |

### Soft blockers (UX gaps that won't break launch but degrade first impressions)

| Blocker | Owner | What's needed |
|---|---|---|
| **Sentry inactive** | Matt (account) | Create Sentry project → drop `SENTRY_DSN` into Netlify env contexts. No code change after PR #109. |
| **Resend inactive** | Matt (account) | Create Resend account, verify a sending domain (or use `onboarding@resend.dev` for first invites), add `RESEND_API_KEY` + `RESEND_FROM` to Netlify production env. Supabase's default plain-text emails still send in the meantime. |
| **Reports page is a stub** | Program staff input + dev | Which aggregates matter (cohort completion rates, competency averages, employer participation, etc.). Don't build without direction. |
| **Reports nav visibility unverified** | Matt (visual) | Hard-refresh deployed URL and confirm the "Reports" link renders in admin nav. Source has it at `AdminNav.tsx:40`; G8 walk may have been stale. |

### Carry-overs (post-launch candidates)

| Item | Owner | Why deferred |
|---|---|---|
| **#77 anon-role hardening** | Supabase admin work | Split `DATABASE_SERVICE_URL` from `DATABASE_POOL_URL` so the pool downgrades to a real `anon` Postgres role. Today both vars point at the same BYPASSRLS user — separation is semantic, not real. |
| **Local Playwright stability at higher concurrency** | Dev (~1 hr) | Cap at 2 workers locally; higher loads the dev server and triggers `/login` cookie races. Fix: run Playwright against `react-router-serve` instead of the dev server. CI is unaffected (workers:1). |
| **Visual-audit detail-route crawl** | Dev (~30 min) | `scripts/visual-audit-screenshots.ts` can't find UUIDs for cohort/role/intern detail pages; falls through to prototype-only screenshots for those routes. Per-phase reference dirs cover the gap. |
| **F.2 admin invite→accept E2E** | Dev (~15 min, after the auth-flow fix) | Spec is written and stashed under `test.describe.skip` in `tests/e2e/admin-invite-accept.spec.ts`. Remove the `.skip` once the auth-flow blocker above lands. |

## Tomorrow's planning conversation — suggested agenda

1. **Confirm priorities for the hard blockers.** Auth-flow fix is dev work I can take on; everything else needs you or program staff.
2. **Decide invite-flow fix approach** — PKCE reconfigure vs. hash-fragment bridge. The hash-fragment bridge is the smaller, lower-risk change.
3. **Define Reports v1 scope** with program staff (or punt to a post-launch iteration).
4. **Walk the team through the launch-readiness checklist** so everyone shares the same picture of what "launch" depends on.

## Where to look for context

- **CLAUDE.md** — current source-of-truth for project state. Updated through SP7 close-out + SP6 wrap-up.
- **`docs/BACKLOG.md`** — all known deferrals + recent G8 walkthrough findings + the new auth-flow finding.
- **`docs/team-walkthrough-runbook.md`** — team test guide.
- **`docs/superpowers/specs/2026-05-10-production-rebuild-design.md`** — original design spec.
- **`docs/superpowers/plans/2026-05-10-sub-project-6-polish-launch.md`** — SP6 plan; Phase H "Netlify cutover" tasks marked obsolete by the two-Netlify-project structure.
