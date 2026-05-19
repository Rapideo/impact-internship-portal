# Visual Fidelity Audit — Production App vs Prototype

**Captured:** 2026-05-18 (file dated 2026-05-14 per SP6 Phase A Task 1 plan reference)
**Auditor:** Claude (unattended pass, file-read only — confirmed pattern with Matt on `/login`, `/auth/forgot`, `/intern/assessments`)
**Surfaces:** Production app (`http://localhost:5174`) vs prototype (`C:\Projects\impact-prototype\Prototypes\PROTOTYPE\`)
**Authoritative plan:** `docs/superpowers/plans/2026-05-14-sub-project-6-polish-launch.md` Phase A

## Severity rubric

- **P0 (blocks launch)** — broken layout, wrong color, missing brand mark, illegible text, missing brand shell entirely
- **P1 (high)** — spacing off, wrong button treatment, missing breadcrumb, wrong micro-label casing, missing structural component
- **P2 (polish)** — minor padding, hover state mismatch, label phrasing, copy parity

Routes lacking a prototype counterpart (employer shell, SP5-era auth pages) are audited for **internal consistency with the admin shell**. Routes requiring hard-to-reach state (e.g. `/auth/reset` needing a Supabase recovery token) are flagged **Deferred — manual test pass**.

## Status legend

- `[ ]` not yet walked
- `[~]` walked, gaps recorded
- `[✓]` no gaps found
- `[D]` deferred (hard-to-reach state)

## Headline finding

Production was built **function-first** across the board: every shipped route renders correct data and handles its action surface, but the brand language (Archivo Black headlines, IBM Plex Mono micro-labels, navy/cyan/gold tokens, dark-surface nav + footer shells, sticky action bars, sectioned rubric panels, mono receipts) is **applied unevenly or not at all**. The prototype is the bar; the fix is a structural rebuild of each shell + per-page brand passes.

The auth shell pattern (`AuthShell` component) was built in SP5 Phase C but only applied to `/auth/forgot|reset|accept|callback` — **not to `/login` itself**. Same gap repeats across the public landing, intern flow, and employer shell.

---

## Auth + public surface

### `[✓] /` (landing) ↔ `index.html` _(closed in SP7 Phase D1 — see PR #94)_
_Findings:_
- **P0** — Production landing has **no brand shell at all**: no `<header class="nav">`, no `<footer>`, no wordmark, no hero, no pillars. Page is literally `<main style="max-width:720"><h1>IMPACT Internship Assessment Portal</h1><p>The production app is under construction.</p>`. Rebuild from scratch to match prototype: navy nav with wordmark + 3 nav links (About / Intern Assessments / Admin Sign In CTA), hero section with `--canvas` background, Archivo Black headline ("EXPAND YOUR OPPORTUNITIES.") with `.hero__corner` gold corner glyph + `.accent-underline`, micro-label row, subhead, primary CTA → `/intern/assessments`, then a 3-card Pillars section (Intake / Competency / Outcomes) with numbered `.pillar__num` mono labels, and the dark `.footer` shell.
- **P0** — `_public.tsx` layout currently renders only `<div className="public-shell"><Outlet/></div>` — no shared nav/footer. The intern layout (`_public.intern.tsx`) has its own ad-hoc nav using inline styles with a hardcoded `<strong>IMPACT</strong>` text-only wordmark; the public root has nothing. Either lift a shared `<PublicNav>` + `<PublicFooter>` into `_public.tsx`, or render them per-route. Each must use the dark `--navy-deep` surface to match the prototype.
  - **Resolved in SP7 Phase D1 (PR #94) — per-route option chosen.** `_public.tsx` stays a thin pass-through; `<PublicNav>` + `<PublicFooter>` are rendered inside each public-surface route (landing, login, /auth/*, $.tsx 404) with route-specific `links={...}` so the prototype's per-page link-set differences (landing's "About / Intern Assessments / Admin Sign In" vs login's "Back to home / Intern Assessments" vs 404's "Home / Admin Sign In") render verbatim. Intern subtree (D2 scope) still renders its own ad-hoc nav and will move to `<PublicNav variant="intern">` in Phase D2.
- **P0** — Brand tokens (`--navy`, `--cyan`, `--gold`, `--canvas`, Archivo Black) all exist in `tokens.css` but are not consumed on this page. Fonts must be preconnected/loaded in `root.tsx` (verify via Grep — prototype loads them from a `<link>`; production may rely on root layout).
- **P1** — No `.hero`, `.pillar`, `.footer`, `.wordmark` rules exist in `global.css` or `tokens.css`; they're only in `admin.css`. Port the prototype's hero + pillar + footer rules into `global.css` so public-shell pages can use them without depending on admin styling.

### `[✓] /login` ↔ `login.html` _(closed in SP7 Phase D1 — see PR #94)_
_Findings:_
- **P0** — Production `_public.login.tsx` uses raw inline styles instead of the `AuthShell` component at `app/components/auth/AuthShell.tsx`. AuthShell was built in SP5 Phase C with a docstring that literally says "Mirrors the prototype's `login.html` aesthetic" but `/login` itself was never refactored to use it. Result: typeface mismatch (no Archivo Black headline, no IBM Plex), missing brand language, "simpler" look that doesn't match the rest of the auth flow. **Fix:** wrap in `<AuthShell microLabel="SIGN IN / 2026" title="Welcome back." sub="..." />` and replace inline styles with the existing `app/styles/auth.css` classes.
- **P0** — Beyond the shell wrap, prototype includes a full top `<header class="nav">` with wordmark + "Back to home" + "Intern Assessments" links above the auth card. Confirm `AuthShell` renders that header; if not, add it. Prototype also includes a left "intro" column with `micro-label`, `.login__title`, `.login__sub`, and a numbered `<ul class="login__facts">` ("01 Intake / 02 Competency / 03 Outcomes") sitting next to the form — a 2-column layout. Current production login is form-only, no intro panel.
- **P1** — Prototype uses a `.login__form-head` strip with a `.micro-label--navy` "Credentials" eyebrow and a "Demo — any value works" note. Production omits both.

### `[✓] /auth/forgot` (SP5 new — no prototype)
_Findings:_ No gaps. AuthShell rendering correctly (branded two-column split, Archivo Black headline, navy/cyan/gold tokens). Use as the reference for the `/login` fix. **Updated in SP7 Phase D1** to wrap in `<PublicNav>` + `<PublicFooter>` for brand-shell parity with the rest of the public surface; copy adjusted to mirror the prototype's RECOVER PASSWORD modal voice ("Send a recovery link."). See PR #94.

### `[✓] /auth/reset` (SP5 new — needs recovery token) _(closed in SP7 Phase D1 — see PR #94)_
_Findings:_ Loader-redirect path (no session) verified live. Wrapped in `<PublicNav>` + `<PublicFooter>` for brand-shell parity. Live form rendering remains deferred (`[D]` carry) for a manual session-with-recovery-token test pass.

### `[✓] /auth/accept` (SP5 new — needs invite token) _(closed in SP7 Phase D1 — see PR #94)_
_Findings:_ Loader-redirect path (no session) verified live. Wrapped in `<PublicNav>` + `<PublicFooter>` for brand-shell parity; pattern matches `/auth/forgot`. Live form rendering remains deferred (`[D]` carry) for a manual invite-link test pass.

### `[D] /auth/callback` (SP5 new — transient redirect)
_Findings:_ Deferred to manual test pass.

### `[✓] /intern/assessments` ↔ `intern-assessments.html`
_Findings:_
- **P0** — Production page is completely different design-wise from prototype. **Decision: keep the prototype's look** (per Matt). **Rebuild specifics:** identity-gate uses `.identity-card` + `.id-grid.id-grid--4` (4-column field grid) + a top-rule divider above the Confirm button. After confirmation, prototype swaps to a 3-card chooser (`.chooser-card`-style) with status pills ("SUBMITTED ON …" vs "ONE SUBMISSION") and per-card mono numerals. Use the existing `IdentityConfirmedChip` for the post-confirm header strip.
  - **Resolved in SP7 Phase D2 (see PR #95)** — chooser rebuilt against the prototype byte-for-byte. Identity gate uses `<IdentityCard>` + `.id-grid.id-grid--4` + top-rule divider; post-confirm view uses `<IdentityConfirmedChip>` + "Not you? Switch" + 3 `<AssessmentCard>`s with verbatim stage pills, meta labels, titles, body copy, and CTA strings. Status pill swaps in "Submitted on {date}" when a one-shot row exists.

### `[✓] /intern/personal-goals` ↔ `personal-goals.html`
_Findings:_
- **P0** — Missing the entire shared shell: prototype has `<header class="nav">` with wordmark + "← Back to assessments" back-link, and the persistent dark `<footer>`. Production's `_public.intern.tsx` layout supplies an ad-hoc inline-styled nav (text-only "IMPACT" wordmark, no logo, single "My Assessments" link) and **no footer**. Fix in the layout: real navy nav with `.wordmark__img`, a `.back-link` style back-arrow link, and a `.footer` block at the bottom of the outlet.
- **P0** — Missing the **sticky `.action-bar`** at the bottom of the viewport. Prototype shows a fixed bar with a mono status caption ("PERSONAL GOALS · ONE SUBMISSION") on the left and Cancel + Submit buttons on the right. Production renders the submit button inline inside `AssessmentForm` with no action bar shell. Either move the form's submit row into a shared `<ActionBar>` (component exists at `app/components/ActionBar.tsx`) or wrap `AssessmentForm` output with it on each form route.
- **P1** — `PageHead` title is `"PERSONAL GOALS."` — flat. Prototype uses a 2-line Archivo Black headline (`"YOUR STARTING<br/>LINE."`). Allow `title` to be a `ReactNode` so we can pass `<>YOUR STARTING<br/>LINE.</>`, and update micro-label to the prototype's "PERSONAL GOALS / 2026 / ONE SUBMISSION" format (with year + cardinality, not "INTERN / PERSONAL GOALS").
- **P1** — Prototype splits the 7-question set across 2 containers with a navy-tinted Archivo Black section header ("My Focus for This Internship") between question 4 and question 5. Production renders all questions in a single flat list — no section break. Add an optional `sectionBreaks` prop on `AssessmentForm`, or render two `AssessmentForm` calls with the section heading between them.
- **P2** — "Submitting as" chip wraps the `IdentityConfirmedChip` with an extra duplicate `SUBMITTING AS` micro-label outside it, but the chip itself already includes a "Confirmed as" label. Pick one.
  - **Resolved in SP7 Phase D2 (see PR #95)** — `_public.intern.tsx` now mounts `<PublicFooter>`; each child route renders its own `<PublicNav>` with the prototype's "← Back to assessments" back-link variant. `<PageHead>` carries the 2-line `<>YOUR STARTING<br/>LINE.</>` title and the verbatim `PERSONAL GOALS / 2026 / ONE SUBMISSION` micro-label. `<AssessmentForm>` consumes the new Phase C `sectionBreaks=[{afterQuestionIndex: 3, title: 'My Focus for This Internship'}]` and `identityChip={...}` props, dropping the duplicate "SUBMITTING AS" wrapper. Sticky `<ActionBar>` (also Phase C) carries `statusCaption="PERSONAL GOALS · ONE SUBMISSION"` with a Cancel link to `/intern/assessments`.

### `[✓] /intern/midpoint-reflection` ↔ `midpoint-reflection.html`
_Findings:_
- **P0** — Same shell gaps as Personal Goals: no real nav (need wordmark image + back-link), no footer, no sticky `.action-bar`. Inherits whatever fix lands on the intern layout.
- **P1** — Same heading delta: prototype is `"REFLECT ON<br/>THE JOURNEY."` (2-line Archivo Black); production is `"MIDPOINT REFLECTION."`. Same micro-label format mismatch ("INTERN / MIDPOINT REFLECTION" vs "MIDPOINT REFLECTION / 2026 / ONE SUBMISSION").
- **P2** — Same duplicated "SUBMITTING AS" micro-label wrapping the chip.
  - **Resolved in SP7 Phase D2 (see PR #95)** — same shell rebuild as Personal Goals. 2-line `<>REFLECT ON<br/>THE JOURNEY.</>` title, verbatim micro-label, identity chip via `<AssessmentForm identityChip={...}>`, sticky action bar with `statusCaption="MIDPOINT REFLECTION · ONE SUBMISSION"`.

### `[✓] /intern/participant-feedback` ↔ `participant-feedback.html`
_Findings:_
- **P0** — Same shell gaps: missing real nav, footer, sticky action bar.
- **P1** — Same heading delta: prototype is `"LOOK BACK ON<br/>YOUR JOURNEY."`; production is `"PARTICIPANT FEEDBACK."`. Same micro-label format mismatch.
- **P2** — Same duplicated "SUBMITTING AS" labeling.
  - **Resolved in SP7 Phase D2 (see PR #95)** — same shell rebuild. 2-line `<>LOOK BACK ON<br/>YOUR JOURNEY.</>` title, verbatim micro-label, identity chip mounted by `<AssessmentForm>`, sticky action bar with `statusCaption="PARTICIPANT FEEDBACK · ONE SUBMISSION"`.

### `[✓] /intern/confirmation` ↔ `assessment-confirmation.html`
_Findings:_
- **P0** — Missing the brand badge: prototype renders a 56px circular `.confirm__badge` with a stroked SVG checkmark above the title. Production has no badge at all — just a `PageHead` and a `<dl>`. Add the badge SVG inside a `.confirm__badge` container above the title.
- **P0** — Wrong structural class: prototype's confirmation page uses `<main class="confirm">` with `.confirm__inner`, `.confirm__title`, `.confirm__body`, `.confirm__receipt`, `.confirm__receipt-head`, `.confirm__receipt-id`, `.meta-strip`, `.confirm__note`, `.confirm__actions`. Production uses `PageHead` + a custom `<article className="identity-card">` with all inline-styled `<dl>` rows. The `.meta-strip` class **does exist** in admin.css — use the existing 5-cell horizontal meta strip with mono values instead of a 2-column DL. Also reuse `app/components/MetaStrip.tsx`.
- **P0** — Wrong copy: prototype's type-keyed copy uses formal program voice ("Submission received." / "Thanks for your submission. Your cohort administrator will be notified.") and per-type variants like `"Personal Goals submitted."` / `"Thanks for sharing your goals. Your cohort administrator can now see your starting reflection."`. Production rewrote the copy ("Thanks! Your goals are locked in.") and lost the consistent voice. Restore prototype copy verbatim.
- **P1** — Missing the static fake "SUBMISSION RECEIPT" id strip with mono receipt id (`IMP-SA-2026-048`). Either reproduce it as a generated short id from `submittedAt`, or render the literal string for visual parity.
- **P1** — Missing the `.confirm__note` warning paragraph ("You will not be able to resubmit this assessment. If you need to correct something, please contact your program administrator.") below the receipt.
- **P1** — Missing brand nav + footer (same `_public.intern.tsx` shell issue applies here).
- **P2** — Date format in `formatSubmittedDate` is `MM.DD.YYYY · HH:MM`; prototype uses `MMM D, YYYY · h:mma`-ish. Worth aligning but not blocking.
  - **Resolved in SP7 Phase D2 (see PR #95)** — rebuilt via `<ConfirmReceipt variant="success">` (Phase B primitive). Badge, micro-label, title, body, receipt card, mono receipt id (`IMP-SA-2026-NNN` derived from submittedAt), `<MetaStrip>` (5 cells, no `<dl>`), `.confirm__note` warning, and the navy CTA all in place. Per-type copy moved into the loader as a `COPY` map verbatim from the prototype JS (`micro`/`title`/`body` for each of the 4 supported `?type=` values). Nav + footer attached via the rebuilt layout. Date format now uses `MMM D, YYYY` to better match the prototype.

### `[✓] /*` (404) ↔ `404.html` _(closed in SP7 Phase D1 — see PR #94)_
_Findings:_
- **P0** — No brand shell: missing the `<header class="nav">` (with wordmark + "Home" link + "Admin Sign In" CTA) and the dark `<footer>`. The ErrorBoundary renders only the `.confirm` block bare. Wrap in the public shell (whatever lands as the shared nav/footer fix for `/`).
- **P0** — Missing the muted `.confirm__badge` with the "X-in-circle" SVG glyph (prototype overrides `background: var(--canvas-alt)` for the 404 to neutralize the success-tinted default). Add the badge.
- **P1** — `.confirm`, `.confirm__inner`, `.confirm__title`, `.confirm__body`, `.confirm__actions` are **not defined** anywhere in `app/styles/*.css`. The current page references them but they're effectively no-ops. Port the prototype's `.confirm*` rules into `global.css` (or wherever `/404` will live).
- **P2** — Loader throws a `Response` so the default export is unreachable — fine, but the `ErrorBoundary` returns `<main>` directly instead of going through the public layout, so even after a shell is added to `_public.tsx` the catch-all `$.tsx` won't inherit it (it's a root-level splat). Either move 404 into the public layout subtree or duplicate the shell inside the ErrorBoundary.

---

## Admin shell + Settings

### CROSS-CUTTING (admin shell)
- **P0 — nav__inner height collapsed.** Prototype dark nav is 100px tall with logo at 64px so the dark-glow halo blends. Production sets `padding: 16px 24px` and `.wordmark__img { height: 32px }` — the navbar looks like a thin bar and the logo glow reads as a halo on the navy. Restore `height: 100px` + `padding: 0 32px` on `.nav__inner`, `height: 64px` on `.wordmark`/`__img`, and match `gap: 36px` on `.nav__links`.
- **P0 — nav active state is wrong.** Prototype uses muted-white links (`--on-dark-muted`) with a 3px gold underline rail under the active tab (and 1px gold underline on hover). Production paints active links solid gold (`color: var(--gold)`) with no rail — destroys the brand language. Add `.nav__link::after { background: var(--gold) }` active+hover treatment from the prototype, change base color to `var(--on-dark-muted)` and active to `#fff`.
- **P1 — nav link typography drift.** Prototype uses `font-size: 13px` with `letter-spacing: 0.04em`; production uses 14px / 0.02em. Tighten to prototype spec.
- **P1 — admin-chip silhouette wrong.** Prototype chip is a 4px-radius rounded rect with a square gold avatar (radius-sm), mono 11.5px font, and a 1px gold gradient hover. Production chip is fully `border-radius: 999px` (pill) with a circular avatar and IBM Plex Sans 13px — wrong silhouette and font family. Swap to mono font, `border-radius: var(--radius-md)`, square avatar `border-radius: 2px`.
- **P1 — `.container` padding mismatch.** Prototype is `padding: 0 40px`; production is `padding: 0 24px`. Pages feel pinched against the viewport edges. Bump to 40px to match.
- **P1 — footer wordmark missing brand mark.** Prototype footer renders the same 64px wordmark image as the nav; production footer also renders the logo but inherits the 32px override so the footer mark sits tiny against the navy surface. Add a footer-scoped override OR raise wordmark height back to 64px.
- **P1 — body font-size off.** Prototype `body { font-size: 15px; line-height: 1.55 }`; production global.css sets 16px / 1.5 (and admin.css redefines small components ad hoc). Set the body to 15px / 1.55 to match.
- **P1 — token registry incomplete.** `tokens.css` is missing several prototype tokens used heavily: `--navy-mid #2947A8`, `--surface-dark #051028`, `--surface-dark-alt #0A1634`, `--surface-dark-edge`, `--on-dark`, `--on-dark-muted`, `--success #1B8F4A`, `--danger #A83A2A`, `--shadow-sm`, `--shadow-md`, `--container 1240px`. Several were inlined as hex literals (e.g. `#b3261e` for danger across admin.css). Lift the prototype `:root` block wholesale.
- **P2 — `--canvas-alt` is too light.** Prototype value `#E5E8EF` (cool grey); production `#f5f7fb` (nearly white). Affects every chip / pill / table-header background. Use the prototype value.
- **P2 — Plex weight subset missing.** Prototype loads `IBM+Plex+Sans:wght@400;500;600;700`. Production loads default weights via system fallback — `font-weight: 600/700` lines (e.g., `.col-name`, KPI labels) silently fall back. Add the `<link>` to fonts.googleapis.com in `root.tsx`.
- **P2 — print stylesheet missing.** Prototype has a `@media print` block that hides chrome on detail pages so printed records read cleanly. Production has none.
- **P2 — toast / micro-label letter-spacing.** Prototype micro-label is `letter-spacing: 0.14em`; production is `0.12em`. Subtle but noticeable on the page-head crumb.
  - **Resolved across SP7 Phases A (PR #90) + B (PR #92).** Phase A ported the prototype `:root` block wholesale (closing the token-registry + `--canvas-alt` + body-font + container-padding items) and added the Latin-subset Plex font links to `root.tsx` (closing the Plex-weight-subset item) and the `@media print` rules (closing print stylesheet). Phase B rebuilt `<AdminNav>` + `<AdminFooter>` + the `.nav__*` / `.admin-chip*` / `.footer .wordmark*` CSS to the prototype's 100px-nav / 64px-wordmark / 3px-gold-rail / mono-square-chip silhouette (closing the nav-height / active-state / link-typography / admin-chip / footer-wordmark items). The micro-label letter-spacing was tightened to `0.14em` in Phase A. SP7 Phase E1 (this PR) consumes the rebuilt primitives — no additional CSS changes required.

### `[✓] /admin` ↔ `admin.html` _(closed in SP7 Phase E1 — see PR #96)_
_Findings:_
- **P0 — personalized greeting lost.** Prototype: `GOOD MORNING,<br/>KORTNEY.` two-line H1 keyed off the admin's first name. Production hard-codes `GOOD MORNING.` with no name. Pass the admin's first name (or derive from email) into PageHead and render with a line break.
- **P1 — quick-link arrow has no special class.** Prototype `.quick-link__arrow` has its own font-weight treatment (`font-weight: 700`); production CSS doesn't define `.quick-link__arrow` at all so the arrow inherits regular weight. Add the rule.
- **P2 — sub-copy line break.** Prototype "Program overview for the 2026 cohort cycle. Data reflects the current demo dataset." is two sentences; production drops the second sentence. Restore.
  - **Resolved in SP7 Phase E1 (see PR #96).** Admin home loader now reads the signed-in user's email via `supabase.auth.getUser()` and derives a display first name (`deriveFirstName(email)` — local-part-before-separator, uppercased). `<PageHead>` renders the 2-line `<>GOOD MORNING,<br/>{firstName}.</>` title plus the verbatim 2-sentence sub copy ("Program overview for the 2026 cohort cycle. Data reflects the current demo dataset."). KPI grid now consumes `<KpiCard variant="cyan" />` for Active Interns and `variant="success"` for 90-Day Outcomes; Quick Links + Recent Activity also rewired through the Phase B `<QuickLinks>` / `<RecentActivity>` primitives. The audit's P1 about `.quick-link__arrow` font-weight was a false positive — the prototype's actual rule is `.quick-link__arrow { font-size: 14px; }` with no weight override, matching production.

### `[✓] /admin/settings/employers` ↔ `settings-employers.html` _(closed in SP7 Phase E1 — see PR #96)_
_Findings:_
- **P1** — No structural delta beyond the cross-cutting nav fixes. Rail label "Assessments" matches; ordering matches.
- **P2** — Page-head sub copy matches verbatim; OK.
  - **Resolved in SP7 Phase E1 (see PR #96).** Cross-cutting nav + footer + container parity landed in Phase A/B; this route was already structurally aligned with the prototype `settings-employers.html` (page-head + `<SettingsShell active="employers">` + the `.assessments` table with `.col-name` + `.name-initial` chips). E1 verified parity via side-by-side walk — no markup changes required on this route.

### `[✓] /admin/settings/employers/:employerId` ↔ `settings-employer.html` _(closed in SP7 Phase E2 — see PR #97)_
_Findings:_
- **P1 — extra EmployerAccountCard not in prototype.** Production mounts `<EmployerAccountCard>` between the tables and the delete form (SP5 add). Visually it stacks below Roles with `.identity-card` framing — confirm it carries the same card-radius/border treatment as adjacent prose-card to read as one section group.
- **P2 — delete-warning is not personalized.** Prototype rewrites the modal body when there are existing cohorts ("This employer has N cohort(s)…"); production ConfirmModal body is static. Minor copy parity.
  - **Resolved in SP7 Phase E2 (see PR #97).** Side-by-side walk confirmed the route's markup (page-head with meta-strip, prose-card notes, cohorts + roles tables, EmployerAccountCard, delete modal) already matches the prototype byte-for-byte from prior phases. The EmployerAccountCard sits in the same `.identity-card` framing as the prose-card on either side (same radius, same border, same `--gold` accent rail), so the "one section group" requirement is met. The personalized delete-warning copy is a P2 fold-in deferred to backlog — out of scope for the structural rebuild.

### `[✓] /admin/settings/employers/:employerId/edit` ↔ `settings-employer-form.html` _(closed in SP7 Phase E2 — see PR #97)_
_Findings:_
- **P2 — action-bar status copy matches** (`EMPLOYER · EDIT`). OK.
- **P2 — Save button** correctly renders arrow at idle, swaps to "Saving…" during submit — OK.
  - **Resolved in SP7 Phase E2 (see PR #97).** No structural changes needed — route already aligned with prototype `settings-employer-form.html`.

### `[✓] /admin/settings/employers/new` ↔ `settings-employer-form.html` _(closed in SP7 Phase E2 — see PR #97)_
_Findings:_
- **P2 — breadcrumb suffix says `NEW`** — matches. No delta beyond cross-cutting.
  - **Resolved in SP7 Phase E2 (see PR #97).** No structural changes needed.

### `[✓] /admin/settings/cohorts/:cohortId` ↔ `cohort-detail.html` _(closed in SP7 Phase E2 — see PR #97)_
_Findings:_
- **P1 — Phases header uses `.detail-header` not `.rubric-section-head`.** Prototype renders `<header class="rubric-section-head">` for the Phases section with a left label + right aside layout; production reuses `.detail-header` (bigger Archivo Black title vs prototype's compact label). Either add `.rubric-section-head` styles to admin.css or accept the divergence.
- **P1 — Enrolled Interns columns differ.** Prototype shows `Last Name | Start Date | Current Phase` with a phase pill. Production shows `Last Name | Start Date | End Date` — different last column entirely. Pick one and align (the phase column requires a current-phase lookup; if not available, keep End Date but rename header in prototype-style copy).
- **P2 — breadcrumb path.** Prototype crumb is `ADMIN / INTERNS / COHORTS / DETAIL`; production is `ADMIN / SETTINGS / EMPLOYERS / <employer> / COHORT`. Production's structure is more accurate to the new IA; OK to keep.
  - **Resolved in SP7 Phase E2 (see PR #97).** Phases section now renders via `<RubricSectionHead label="PHASES" title="Phases" aside="Assessment phases applicable to this cohort" spaced />` matching prototype byte-for-byte. Enrolled Interns "Current Phase" column intentionally deferred — the audit allows "keep End Date" when a current-phase lookup is unavailable, and that lookup work is scheduled in Phase F (intern record). Breadcrumb difference is documented as an intentional IA evolution.

### `[✓] /admin/settings/cohorts/:cohortId/edit` ↔ `cohort-edit.html` _(closed in SP7 Phase E2 — see PR #97)_
_Findings:_
- **P1 — Employer field present in prototype, missing in production.** Prototype has `co-emp` (employer select) in the id-grid; production omits it (employer is derived from URL context). The prototype's 5-field grid (Name / Employer / Role / Start / End) collapses to 4 in production; either keep `id-grid--4` with Name spanning 2 or switch spans.
- **P1 — Delete button missing from action-bar.** Prototype edit page has `[Cancel] [Delete Cohort] [Save Changes]` in the sticky bar; production has only `[Cancel] [Save Cohort]`. Delete is only available on the detail page now — acceptable but breaks the prototype's tri-button affordance pattern.
- **P2 — Phases section header.** Same `rubric-section-head` vs `detail-header` mismatch.
  - **Resolved in SP7 Phase E2 (see PR #97).** Employer field intentionally omitted — production scopes cohorts under `/admin/settings/employers/:employerId/...` so employer is implicit (the audit accepts this as a valid IA evolution; breadcrumb carries the employer name). Delete-from-edit-action-bar is intentionally moved to the detail page (single delete affordance is safer + matches updated IA). Phases section header `rubric-section-head` fix landed on the detail route; edit route keeps the existing `<DetailHeader>` since the edit-page Phases section is part of a `<PhaseMultiSelect>` input (different visual context).

### `[✓] /admin/settings/roles/:roleId` ↔ `role-detail.html` _(closed in SP7 Phase E2 — see PR #97)_
_Findings:_
- **P0 — modal body copy is misleading.** Prototype: "Removing this role will not delete cohorts that reference it…". Production (with `ON DELETE RESTRICT` schema): "If any cohorts or interns are still assigned to this role, the delete will be refused — reassign them first." Production copy is correct for the new schema; mark prototype as out-of-date (no fix needed, but sanity-check the delete-toast wording).
- **P1 — Cohorts-using-role table** — column shape matches; OK.
  - **Resolved in SP7 Phase E2 (see PR #97).** Delete-modal copy is the schema-correct production wording (kept). The 23503 handler in the action surfaces a friendly toast when the DB refuses the delete — verified live. No structural changes needed.

### `[✓] /admin/settings/roles/new` ↔ `role-new.html` _(closed in SP7 Phase E2 — see PR #97)_
_Findings:_
- **P1 — Employer select absent in production new-role.** Prototype `role-new.html` has an Employer select (with optional pre-fill from `?employerId=`). Production route is scoped under `/employers/:employerId/roles/new` so employer is implicit. Acceptable — but consider rendering an inline `meta-strip` chip "Employer: <name>" so the admin sees what they're scoping the role to (currently only in breadcrumb).
  - **Resolved in SP7 Phase E2 (see PR #97).** Added a `<MetaStrip items={[{label: 'Employer', value: employer.name}]} />` chip inside `<PageHead>` so the parent employer is visible in the page head row (not just the breadcrumb). The employer select itself stays omitted — production scopes new-role via URL.

### `[✓] /admin/settings/roles/:roleId/edit` ↔ `role-edit.html` _(closed in SP7 Phase E2 — see PR #97)_
_Findings:_
- **P1 — Employer dropdown locked in prototype.** Prototype shows the Employer select (locked / disabled). Production omits the field. Same employer-context delta as new-role page.
- **P2 — action-bar status copy.** Production renders `ROLE RECORD · EDIT`; align with prototype's `ROLE · EDIT` casing if drift is noticed.
  - **Resolved in SP7 Phase E2 (see PR #97).** Employer-context delta has the same justification as new-role: URL implies employer, breadcrumb shows it. Action-bar `ROLE RECORD · EDIT` kept — production's status casing for record-shaped pages is the established pattern (matches cohort, employer, intern records).

### `[✓] /admin/settings/phases` ↔ `settings-phases.html` _(closed in SP7 Phase E2 — see PR #97)_
_Findings:_
- **P1 — settings-list grid columns drift.** Prototype `.settings-list__row` is `grid-template-columns: 90px 1fr 40px` to host two up/down handle buttons in the leftmost cell. Production CSS matches — but confirm the `InlineEditableList` component renders both up/down buttons (prototype shows ↑ and ↓ side-by-side with `disabled` on edge rows). If only one of the two is wired, the visual cell looks half-empty.
  - **Resolved in SP7 Phase E2 (see PR #97).** Verified: Phase C `<InlineEditableList>` rebuild (PR #93) renders both ↑ and ↓ handle buttons in the 90px leftmost cell, with `disabled` on the appropriate edge rows (top row's ↑ + bottom row's ↓). Matches prototype byte-for-byte.

### `[✓] /admin/settings/barriers` ↔ `settings-barriers.html` _(closed in SP7 Phase E2 — see PR #97)_
_Findings:_
- **P1 — Same `InlineEditableList` confirmation needed** (see Phases). Both pages share the component.
- **P2 — H2 copy.** Prototype `Entry Assessment Barriers`; production renders `Entry-Assessment Barriers` (hyphenated). Minor. Match prototype.
  - **Resolved in SP7 Phase E2 (see PR #97).** Inline editable list confirmed (same Phase C rewrite as Phases). H2 copy fix: hyphenated `Entry-Assessment Barriers` → prototype-verbatim `Entry Assessment Barriers`.

### `[✓] /admin/settings/program-info` ↔ `settings-program-info.html` _(closed in SP7 Phase E2 — see PR #97)_
_Findings:_
- **P0 — "Danger Zone" / Reset Demo Data card missing.** Prototype mounts a second `.identity-card` below the main one with a `btn--danger` that clears sessionStorage and reloads. For production this likely is intentionally dropped (no demo state), but consider explicitly removing from spec or repurposing as a "Reseed dev data" admin-only affordance behind `NODE_ENV !== 'production'`. Confirm intent.
- **P1 — Fiscal Year Start value type drift.** Prototype `select` uses month *names* as values; production sends integers 1-12. DB-side this is correct, but prototype's display copy parity is intact. No fix.
- **P2 — Phone field uses no formatting.** Production has `formatPhone` helper for other surfaces; not applied here on render. Minor.
  - **Resolved in SP7 Phase E2 (see PR #97).** Per spec §8 decision 5, the Danger Zone card is now repurposed as a **Reseed dev data** affordance with 3-layer NODE_ENV gating: (1) `app/routes.ts` spreads the `/dev/reseed` route registration only when `NODE_ENV !== 'production'`; (2) the route handler short-circuits to 404 in prod as defense-in-depth; (3) the program-info loader only returns `dangerZoneEnabled: true` outside production, so the second `<IdentityCard title="Danger Zone" subnote="DEMO RESET">` doesn't render in prod at all. Verified `npm run build` output: the `dev/reseed` route handler is absent (no `child_process`, no `spawn`); only the JSX form-action string survives inside the gated ternary branch. Fiscal Year + phone-format P1/P2s are tracked as small fold-ins for backlog.

### `[✓] /admin/settings/questions` ↔ `settings-questions.html` _(closed in SP7 Phase E2 — see PR #97)_
_Findings:_
- **P1 — Last Edited timestamp formatting drift.** Prototype renders `d.toLocaleDateString()` (locale-dependent). Production renders `MM.DD.YYYY` (mono dot-separated). Production's format is more on-brand — keep production.
- **P2 — Competency Rubric row "Questions" count meaning.** Prototype shows only Core's count; production matches. OK.
  - **Resolved in SP7 Phase E2 (see PR #97).** No structural changes needed — production already matches prototype with the mono `MM.DD.YYYY` timestamp formatting, the 4 standard editable sets list, and the clickable Competency Rubric aggregate row routing to `/admin/settings/questions/competency`.

### `[✓] /admin/settings/questions/:setId` ↔ `settings-question-set.html` _(closed in SP7 Phase E2 — see PR #97)_
_Findings:_
- **P1 — `.qs-editor-card` class not defined in production admin.css.** Prototype uses `.qs-editor-card`, `.qs-editor-card__head`, `.qs-editor-card__title` for the set-config and question-editor frames; production's `QuestionSetEditor` likely renders its own markup but these class names need to live in admin.css for visual parity. Add the rules or rename to `.identity-card` (already styled).
- **P1 — Set-name input** correctly disabled via `nameEditable = false`. OK.
- **P2 — `Allow Multiple?` row** uses `.outcome-check` with `padding: 0; border-top: none` overrides; verify the checkbox-with-hint composition exists.
  - **Resolved in SP7 Phase E2 (see PR #97).** Confirmed `.qs-editor-card`, `.qs-editor-card__head`, `.qs-editor-card__title` rules are defined in `app/styles/admin.css` (lines 1912–1932; ported in Phase C PR #93). The Phase C `<QuestionSetEditor>` rebuild uses these classes for both the Set Configuration card and the Questions card. `nameEditable = false` for standard sets is preserved.

### `[✓] /admin/settings/questions/competency` ↔ `settings-competency.html` _(closed in SP7 Phase E2 — see PR #97)_
_Findings:_
- **P1 — Same `.qs-editor-card` undefined-class issue.** All three frames (Core / Cohort Questions / Intern Questions) use `qs-editor-card`; admin.css has no rules.
- **P1 — Empty-state row styling inlined.** Production inlines `style={{ color: 'var(--muted)', fontStyle: 'italic', textAlign: 'center', padding: 16 }}`. Prototype uses `.empty-cell`. Swap to `<EmptyRow>` like the other tables for consistency.
- **P2 — "+ New Cohort Questions" / "+ New Intern Questions"** use `.settings-list__add` as a button shape; verify visually.
  - **Resolved in SP7 Phase E2 (see PR #97).** `.qs-editor-card` rules exist in admin.css (see above). Empty-state rows for the Cohort Questions and Intern Questions tables now use `<EmptyRow colSpan={4} message={...} />` (the same `.empty-cell` primitive every other table uses), replacing the previous inline `style={{ color: 'var(--muted)', fontStyle: 'italic', ... }}` block. `.settings-list__add` button shape is preserved.

---

## Admin Interns + Assessments

### CROSS-CUTTING (interns + assessments)
- **P1** — Prototype tables put per-row `Edit` / `Delete` actions in a final `Actions` column (`.col-actions` + `.action-link` / `.action-link--danger`). Production interns + self-assessment-results lists both replaced this with whole-row click navigation only — no inline Delete affordance. Either add an Actions column or accept the loss and document it.
- **P1** — Prototype lists use the `.table-meta` strip above the table (`<count> / <label> · Last synced …` + `Sort: …`). Production interns uses it via `TableFilter`, but `/admin/self-assessment-results` and the assessments-hub picker have no `.table-meta` at all — count + sort cue both missing.
- **P2** — Prototype's row-hover treatment is delivered by `.assessments tbody tr` cursor + bg shift. Production interns route sets `cursor: pointer` inline rather than via the row class; works but inconsistent with prototype's CSS-driven hover.
- **P1** — Action-bar `Cancel` in prototype intern-record renders as `<a class="btn btn--outline">`. Confirm `ActionBar` component renders the same fixed bottom strip with `.action-bar__inner` + status mono chip.
  - **Resolved in SP7 Phase F (see PR #<TBD-F>).** `/admin/interns` restored the prototype's Actions column with inline Edit + Delete (Delete posts via a fetcher to the new index-route action handler that soft-deletes the intern). `/admin/self-assessment-results` now consumes `<TableFilter>` for the `.table-meta` count + sort caption + `.filters` strip; the assessments-hub intern-picker mounts the prototype's `<table class="picker-list">` (via the Phase B `<PickerList>` primitive) instead of the SP4-era `<ul>`. Inline `cursor: pointer` is kept on the interns rows (the prototype-style CSS-driven hover targets `.assessments tbody tr` which production already styles via admin.css). `<ActionBar>` from Phase B carries the prototype's sticky `.action-bar__inner` + status mono chip; `<Link className="btn btn--outline">` is rendered for the Cancel button so it matches prototype's `<a>` markup at the React level.

### `[✓] /admin/interns` ↔ `interns-dashboard.html` _(closed in SP7 Phase F — see PR #<TBD-F>)_
_Findings:_
- **P1** — Prototype table column order: Intern · Cohort · Start Date · **Current Phase** · 90-Day Outcome · **Actions**. Production swaps `Current Phase` for `Role` and drops `Actions`. Either restore `Current Phase` (compute by date vs cohort phases) or document the swap; restore an Actions column with inline Edit + Delete.
- **P1** — Prototype `.table-meta` shows the synthetic "Last synced 09:42 CDT" tagline. Production omits the last-synced affordance. Either drop from prototype or carry through a freshness stamp.
- **P2** — Prototype table count uses zero-padded display (`<strong>05</strong>`). Production renders raw integer via `TableFilter`. Add `String(count).padStart(2,'0')`.
- **P2** — Prototype `.filters` block is a separate `<section>` above the `.table-wrap`. Production wraps filters inside `TableFilter` together with table — visually similar but loses the prototype's gap and `Export CSV` button on the right of the filter row.
  - **Resolved in SP7 Phase F (see PR #<TBD-F>).** Restored Actions column with inline `Edit` + `Delete` (Delete opens a `<ConfirmModal>` and posts to a new action handler that soft-deletes the intern). `TableFilter` already renders the prototype's zero-padded `.table-meta` count (e.g. `<strong>05</strong>`). The `Current Phase` column was intentionally not restored — current production keeps the `Role` column since phase computation requires a per-cohort date-window lookup that isn't in the schema yet (the audit explicitly allows "document the swap"). Documented here as a deviation; the column can be restored once phase windows ship. `Last synced` micro-text in the table-meta is intentionally omitted (the production data is live, not synced).

### `[✓] /admin/interns/new` ↔ `intern-record.html` (create mode) _(closed in SP7 Phase F — see PR #<TBD-F>)_
_Findings:_
- **P1** — Production omits the prototype's Save confirmation modal (`#updateModal` "Save this intern record?"). Form submits directly. Add a `ConfirmModal` between Save click and POST, matching the success-variant copy.
- **P2** — Prototype's first-name field hint says "Only the first initial is saved" and accepts a full name, slicing to `[0]` at save time. Production validator (`requireSingleCharUpper`) rejects multi-char input — flagged as carry-over in CLAUDE.md.
- **P2** — Action-bar status chip in prototype reads `INTERN RECORD · NEW`. Production matches. Confirm Sign-out / Cancel buttons share the same gap/order.
  - **Resolved in SP7 Phase F (see PR #<TBD-F>).** Save button now opens a `<ConfirmModal>` ("Save this intern record? — Identity fields will lock once saved …") matching prototype's `#updateModal` body verbatim, then programmatically submits the form on confirm. Action-bar status reads `INTERN RECORD · NEW` per prototype. The first-name single-character validator delta is tracked separately as a P2 backlog item.

### `[✓] /admin/interns/:internId` ↔ `intern-record.html` (edit mode) _(closed in SP7 Phase F — see PR #<TBD-F>)_
_Findings:_
- **P1** — Prototype edit mode hides Panels 01 (Personal Information) and 02 (Internship Details) and surfaces the locked identity via the `.meta-strip`. Production correctly hides them and uses `MetaStrip`. Verify the `MetaStrip` component renders all 7 prototype cells in the same order (First Initial · Last · Employer · Cohort · Role · Start · End) with `.mono` on the three monospaced ones.
- **P2** — Prototype's Save-confirm modal copy ("Identity fields will lock once saved …") doesn't exist on the edit route — production saves immediately on submit then fires a toast. Either accept (less ceremony) or add for consistency with prototype.
- **P2** — Toast messaging label `UPDATED` vs prototype `SAVED`. Align to prototype's `SAVED`.
  - **Resolved in SP7 Phase F (see PR #<TBD-F>).** Toast label flipped from `UPDATED` to `SAVED` ("Intern record saved.") matching prototype `'success', label:'SAVED'`. `<MetaStrip>` already renders the 7 prototype cells in order (First Initial · Last · Employer · Cohort · Role · Start · End) with `mono: true` on the three monospaced cells per prototype's `meta-strip__value.mono` markup. Save-confirm modal on the edit page was intentionally NOT added — the audit P2 explicitly accepts the less-ceremony pattern, and the edit form already auto-saves notes/outcomes which would feel like overkill behind a modal gate. The Delete button already opens its own confirmation modal.

### `[✓] /admin/assessments` ↔ `assessments.html` _(closed in SP7 Phase F — see PR #<TBD-F>)_
_Findings:_
- **P0** — Production renders the two assessment cards as `<article className="identity-card">` inside `.kpi-grid`. Prototype uses dedicated `.assessment-grid` + `.assessment-card` with stacked `.assessment-card__stage` (e.g. "PER INTERN · PHASED") + `.assessment-card__meta` (e.g. "COMPETENCY ASSESSMENT") + display-font title. Whole visual treatment is wrong; rebuild using `.assessment-card` classes (port from prototype `styles.css` if not in admin.css).
- **P1** — Production page title is `ASSESSMENTS.` (one line). Prototype is two-line `START AN<br/>ASSESSMENT.` Restore the multi-line title.
- **P1** — Prototype intern-picker modal is a structured `<table class="picker-list">` with columns Last Name · Cohort · Start · Current Phase. Production picker uses a `<ul>` of `.record-link` buttons. Rebuild as the prototype table for scannability and parity.
- **P2** — Prototype includes an `.assessment-foot-note` link back to Interns under the cards ("To review what an intern has already completed, open their record from Interns."). Production omits.
  - **Resolved in SP7 Phase F (see PR #<TBD-F>).** Hub rebuilt against the prototype: `<AssessmentCard>` grid replaces the `identity-card`/`kpi-grid` block (with `assessment-card__stage` mono pill, `assessment-card__meta` label, display-font title, body prose, and CTA button); two-line `START AN<br/>ASSESSMENT.` title; intern-picker modal mounted in `.modal__card--wide` with `<PickerList>` table (columns Last Name · Cohort · Start · Current Phase) instead of the SP4-era `<ul>` of `.record-link` buttons; footer link to Interns added via `.assessment-foot-note`. Current-phase column renders `—` placeholder pending phase-window schema work (same deviation as the `/admin/interns` list).

### `[✓] /admin/assessments/competency/new` ↔ `competency-new.html` _(closed in SP7 Phase F — see PR #<TBD-F>)_
_Findings:_
- **P0** — Prototype renders an `.identity-card` "Participant Record" header *inside* the form (with `.identity-card__head` + `.identity-card__subnote` "UNIQUE KEY · FIRST INITIAL + LAST NAME + EMPLOYER + COHORT · MULTIPLE PHASES ALLOWED") and a 5-col `.id-grid` with editable First Initial / Last Name / Cohort / Phase / Date inputs. Production replaces this entirely with a `MetaStrip` in the page header (read-only) and pushes Phase into the form body. Decide: if locked-meta is desired, at minimum mirror the `.identity-card__subnote` micro-label so the unique-key copy is preserved.
- **P1** — Prototype page title `NEW COMPETENCY<br/>ASSESSMENT.` is two-line. Production matches.
- **P1** — Prototype action-bar status mono label reads `PASS = ALL READY`. Production uses whatever `CompetencyAssessmentForm` ships — verify the same status chip is rendered.
- **P2** — Verify `appendCompetencySectionHeader` equivalent in the React form produces "Professional Competencies / N Domains · Shared across all roles", "Role-Specific: <cohort>", "Intern-Specific" headers with matching `.rubric-section__title` styling.
  - **Resolved in SP7 Phase F (see PR #<TBD-F>).** Two-line `NEW COMPETENCY<br/>ASSESSMENT.` title + verbatim prototype sub copy. The Phase C `<CompetencyAssessmentForm>` rebuild already renders the prototype's `.identity-card` header with `UNIQUE KEY · FIRST INITIAL + LAST NAME + EMPLOYER + COHORT · MULTIPLE PHASES ALLOWED` subnote and the `PASS = ALL READY` mono caption on the sticky action bar, plus the 3-tier section headers via `<RubricSectionHead>`. Cancel link wired to `/admin/assessments` via the new `cancelHref` prop. Submit button label aligned to prototype's `Submit Assessment`. Breadcrumb suffix simplified to `/ NEW` matching prototype.

### `[✓] /admin/assessments/competency/edit/:id` ↔ `competency-edit.html` _(closed in SP7 Phase F — see PR #<TBD-F>)_
_Findings:_
- **P1** — Same identity-card vs meta-strip mismatch as `competency/new`. Edit mode should still show the locked identity card with the `MULTIPLE PHASES ALLOWED` subnote.
- **P2** — Confirm the page title is the multi-line `EDIT COMPETENCY<br/>ASSESSMENT.` per prototype convention.
  - **Resolved in SP7 Phase F (see PR #<TBD-F>).** Two-line `EDIT COMPETENCY<br/>ASSESSMENT.` title + verbatim prototype sub copy ("Amend ratings or notes on a submitted record. Identity fields are locked …"). Identity-card subnote is inherited from `<CompetencyAssessmentForm>` (same `MULTIPLE PHASES ALLOWED` markup as new mode). Cancel link points back to the competency detail page. Note: the prototype's edit page actually omits the `.identity-card` (uses a read-only meta-strip in the page-head instead — see the `competency-new.html` ↔ `competency-edit.html` diff) but the production form's identity-card pattern reads cleaner here since the Phase dropdown is now editable inside it; documented as an intentional unified-form-pattern deviation.

### `[✓] /admin/assessments/competency/:id` ↔ `competency-detail.html` _(closed in SP7 Phase F — see PR #<TBD-F>)_
_Findings:_
- **P0** — Prototype detail page renders a `.pill pill--pass` (or fail) result chip in `.page-head__row` and an 8-cell `.meta-strip` including `Reviewed By`. Production omits both — no pass/fail pill, no reviewer cell. Add result pill (from a computed pass rule) and add Reviewed By to MetaStrip (use `submittedBy` → look up admin email).
- **P0** — Prototype page title is `<LASTNAME> &mdash;<br/>COMPETENCY.` (two-line, em-dash). Production renders `COMPETENCY — <LASTNAME>.` single-line. Swap to prototype's layout.
- **P1** — Prototype has a `.detail-header` strip above the rubric (`detail-header__title` + a `.micro-label` like "07 DOMAINS · PHASE 2"). Production goes straight from PageHead into the read-only form. Add the detail-header band.
- **P2** — Prototype's Edit + Delete sit in a `.detail-actions` row at the bottom. Production puts them in the `PageHead` actions slot (top-right). Either is defensible; align to prototype.
  - **Resolved in SP7 Phase F (see PR #<TBD-F>).** Two-line `<LASTNAME> —<br/>COMPETENCY.` title; `.pill--pass` result chip now renders in the page-head row via the `<PageHead actions>` slot (with `.pill--pass` + `.pill--fail` rules ported from prototype into `app/styles/admin.css`); 8-cell meta-strip now includes a `Reviewed By` cell resolved by a new route-local `resolveReviewerLabel(submittedBy)` helper that calls `getSupabaseAdmin().auth.admin.getUserById()` to read the admin email and derives a short local-part display string; `<DetailHeader>` band added above the rubric ("Competency Rubric" + `NN DOMAINS · PHASE` micro-label); Close / Edit / Delete moved into a bottom `.detail-actions` row (CSS rule also ported into admin.css). Pass-pill currently always renders "Pass" — real pass-rule pending program-staff input, documented as P2 follow-up.

### `[✓] /admin/assessments/exit-employer-survey` ↔ `exit-employer-survey.html` _(closed in SP7 Phase F — see PR #<TBD-F>)_
_Findings:_
- **P1** — Prototype page title is two-line `EXIT EMPLOYER<br/>SURVEY.`. Production renders single-line. Restore the break.
- **P1** — Prototype breadcrumb path is `ADMIN / INTERNS / EVALUATIONS / EXIT EMPLOYER SURVEY` (rooted in Interns, not Assessments). Production breadcrumbs through `ADMIN / ASSESSMENTS / EXIT EMPLOYER SURVEY`. Pick a single IA; prototype's evaluations-under-interns reads more naturally for the edit-later flow.
- **P1** — Prototype meta strip cells: Employer · Participant · Position · Start · End (5). Production adds a Cohort cell (6). Drop Cohort to match, or add it to prototype's strip.
- **P2** — Prototype's action-bar status mono reads `EXIT EMPLOYER SURVEY · EDITABLE`. Confirm `AssessmentForm` exposes this.
  - **Resolved in SP7 Phase F (see PR #<TBD-F>).** Two-line `EXIT EMPLOYER<br/>SURVEY.` title + verbatim prototype sub copy. Breadcrumb adopts the prototype's IA: `ADMIN / INTERNS / EVALUATIONS / EXIT EMPLOYER SURVEY` (rooted in Interns, reading more naturally for the edit-later flow). Meta-strip dropped to 5 cells per prototype (Employer · Participant · Position · Start Date · End Date — Cohort cell removed since Cohort is implicit via the breadcrumb context). `<AssessmentForm>` now consumes the Phase C `statusCaption="EXIT EMPLOYER SURVEY · EDITABLE"` and `cancelHref` props. Submit label changed to `Save Survey` and modal copy aligned to prototype verbatim.

### `[✓] /admin/self-assessment-results` ↔ `self-assessment-results.html` _(closed in SP7 Phase F — see PR #<TBD-F>)_
_Findings:_
- **P0** — Production omits the page's filter row entirely (`.filters` block: cohort dropdown + Export CSV button). Only a single text input is rendered. Restore the prototype's `.filters` grid layout with Cohort + (placeholder) Export CSV.
- **P1** — Page title is two-line `SELF-ASSESSMENT<br/>RESULTS.` in prototype; production renders single-line. Restore.
- **P1** — Prototype shows the `.table-meta` strip ("04 / Submissions shown · 01 intern pending" + `Sort: Date ↓`). Production omits.
- **P1** — Prototype table columns: Intern (with name-initial chip) · Cohort · Submitted · Actions (View / Delete). Production columns: Last Name · Employer · Cohort · Type · Submitted. Added Employer + Type cells are useful (program-wide list), but the prototype's `.col-name` + `.name-initial` chip is missing — restore the chip styling on the first cell.
- **P1** — Production wraps the empty state in an `.identity-card`. Prototype uses an empty-row inside the table (`.empty-cell`). Inconsistent with how the interns list handles it.
  - **Resolved in SP7 Phase F (see PR #<TBD-F>).** Restored the `.filters` row via `<TableFilter>` with Cohort dropdown + Export CSV placeholder anchor (suppresses default click; tooltip notes "coming in SP6 Phase C"); two-line `SELF-ASSESSMENT<br/>RESULTS.` title; `.table-meta` strip renders via `<TableFilter>` with zero-padded count + `Sort: Date ↓`; `.col-name` + `.name-initial` chip restored on the first cell wrapped inside an inheriting-color `<Link>` to the detail viewer; empty state switched from `identity-card` to `<EmptyRow>` matching the interns list pattern. The Employer column was kept (admin-facing program-wide view benefits from it) — documented as an intentional addition over the prototype's narrower-scope 4-column table.

### `[✓] /admin/self-assessment-detail` ↔ `self-assessment-detail.html` _(closed in SP7 Phase F — see PR #<TBD-F>)_
_Findings:_
- **P1** — Prototype title is two-line `<LASTNAME> &mdash;<br/><TYPE>.`. Production renders single-line. Restore the break.
- **P1** — Prototype meta strip cells: First Initial · Last · Employer · Cohort · Submitted · **Locked = "Immutable"**. Production drops the "Locked / Immutable" cell. Add it — it's a brand-voice element confirming one-shot semantics.
- **P1** — Prototype has a `.detail-header` band above the question container ("Personal Goals" title + "07 QUESTIONS" micro-label). Production drops it.
- **P1** — Empty state in prototype is an inline `.rubric` panel with display-font copy ("No submission yet."). Production uses an `identity-card`. Replace with the prototype's rubric-panel empty state for visual consistency.
- **P2** — Prototype Close + Delete buttons sit in `.detail-actions` at the bottom; production puts them in `PageHead.actions` top-right. Align to prototype.
  - **Resolved in SP7 Phase F (see PR #<TBD-F>).** Two-line `<LASTNAME> —<br/><TYPE>.` title; 6-cell meta-strip now includes a `Locked = Immutable` cell (always rendered — reinforces one-shot semantics regardless of submission state); `<DetailHeader>` band above the rubric with `Personal Goals` / `Midpoint Reflection` / `Participant Feedback` display title + `NN QUESTIONS` micro-label; empty state replaced with the prototype's inline `.rubric` panel + display-font "No submission yet." copy (not an `identity-card`); Close + Delete buttons moved into a bottom `.detail-actions` row. Per-type sub-copy strings ported verbatim from the prototype's COPY table. Breadcrumb now reads `ADMIN / INTERNS / <LASTNAME> / <TYPE>` matching prototype's intern-segment IA.

---

## Employer shell (no prototype — audit against admin shell)

### CROSS-CUTTING (employer shell)
- **P0** — `EmployerNav` and `EmployerFooter` render a text `<strong>IMPACT</strong>` wordmark instead of the `<img src="/logo.png" class="wordmark__img">` used by AdminNav/AdminFooter (and the prototype). Breaks brand consistency at every employer page header/footer. Use the same `wordmark__img` markup as `AdminNav`.
- **P1** — The employer identity chip uses a non-standard `.employer-chip` block (gold name + raw email + a custom "Sign out" button border) while the admin chip uses `.admin-chip` with an avatar bubble + divider + ghost "Logout" link. Consider a `.admin-chip.admin-chip--employer` modifier that swaps the divider accent to gold so the role distinction reads at a glance without inventing a new chip family.
- **P1** — Top-nav uses `<header className="nav">` directly while the employer main is wrapped in `<main className="container" style={{ padding: '32px 16px 64px' }}>`. The admin shell does not constrain its main inside the layout — children own `<section><div className="container">` blocks. Result: every employer page now nests `.container` inside the layout's `.container`, producing a double-padding inset. Drop the wrapping container in `employer.tsx` and let children render their own `<section><div className="container">` blocks the way admin does.
- **P1** — No employer-specific accent applied anywhere. Admin uses `.kpi-card--cyan` and `.kpi-card--success` modifiers for tile distinction; the employer dashboard renders three plain `.kpi-card` tiles. Add at least one accent (e.g. cyan tile for "Active interns" or gold tile for "Assessments needed") so the dashboard does not read as monochrome.
- **P1** — Breadcrumbs are inconsistent: admin uses `ADMIN / SECTION / 2026` (with the year segment), employer uses `EMPLOYER / SECTION` (no year segment). Either drop from admin or add `/ 2026` to employer for parity.
- **P2** — `.kpi-card__sub` is plain-prose muted text; admin's `.kpi-card__delta` is uppercased IBM Plex Mono. The visual rhythm of the dashboard row is broken because mono micro-labels are part of the system's signature. Keep `__sub` but also render a `kpi-card__delta` mono caption when there is a meaningful comparator (e.g. "OF N COHORTS").
- **P2** — Footer links list in `EmployerFooter` is only 3 entries (Home/Cohorts/Interns); admin footer typically mirrors the full nav set. Add Assessments + My Employer for parity.

### `[~] /employer`
_Findings:_
- **P0** — Title is sentence-case "Your program at a glance." while admin home uses uppercased display title "GOOD MORNING." Match the admin display treatment: uppercase + period, e.g. `WELCOME, {employerName}.` or `YOUR PROGRAM.`.
- **P1** — Missing the admin home's "Quick Links" section (Assessments / Interns / Cohorts → quick-link tiles with arrows). Add a `.quick-links` row using `<Link className="quick-link">` matching admin._index.tsx.
- **P1** — Missing "Recent Activity" block. Admin home shows the last 5 submissions with mono timestamps; employer dashboard should show recent competency + exit-survey submissions scoped to their interns.
- **P2** — "Your cohorts" identity-card uses a generic `Link` titled "View all →" — the link color is `--cyan`, fine, but the row item link (`employer-cohort-list__name`) has no hover treatment. Add `:hover { text-decoration: underline; }`.

### `[~] /employer/cohorts`
_Findings:_
- **P1** — Bare `<table className="assessments">` with no `<TableFilter>` wrapper. Add the count strip ("N cohorts") for parity with admin tables.
- **P1** — Title "Your cohorts." is sentence-case; switch to uppercase display ("COHORTS." or "YOUR COHORTS.").
- **P2** — Breadcrumb is plain string `"EMPLOYER / COHORTS"`; if a year is added cross-cutting, mirror here.
- **P2** — Table row is not row-click as admin tables are. Either add row-click or accept the explicit "View" button.

### `[~] /employer/cohorts/:cohortId`
_Findings:_
- **P1** — Title uses raw `cohort.name` (mixed case) rather than uppercased treatment. Pattern: `${cohort.name.toUpperCase()}.`.
- **P1** — Missing `<MetaStrip>` for cohort summary (Role, Start, End, Members count). The role + dates are stuffed into the `sub` string with an arrow — `<MetaStrip>` is the system pattern.
- **P2** — "Applicable phases" rendered as `<ol>` inside identity-card; admin cohort detail uses a phase chip strip. Consider styling phases as pills/chips to match.
- **P2** — `identity-card__link` is being used as a generic muted label for "{N} total" — it's intended as a mono link. Use a `.micro-label` span instead for the count.

### `[~] /employer/interns`
_Findings:_
- **P1** — No `<TableFilter>` wrapper — admin interns list has search + cohort filter + outcome filter + count.
- **P1** — Missing outcome `pill` column. Admin renders a 90/180-day status pill per row; the employer list should surface the same outcome state.
- **P1** — Intern cell is raw `{i.firstInitial}. {i.lastName}` — admin uses `<div className="col-name"><span className="name-initial">{initials}</span>{name}</div>` for the avatar-bubble + name composition. Apply same.
- **P2** — Title "Your interns." is sentence-case; switch to uppercase display.

### `[~] /employer/interns/:internId`
_Findings:_
- **P1** — Uses lightweight `.identity-card` blocks for Entry Assessment + Outcomes + Recent assessments — admin intern record uses the numbered `<RubricPanel num="03/04/05/06" title>` panels. Switch to `<RubricPanel>` so a user moving between admin and employer record views sees the same record shape.
- **P1** — Misuse of `identity-card__link` class as a muted sub-label (e.g. "Barriers identified at intake", "90-Day", "180-Day"). It's a mono link style — use `.rubric-notes__label` or `.micro-label`.
- **P2** — Action buttons in `PageHead` use "Submit Competency" (outline) + "Submit Exit Survey" (primary). Given the page sub copy emphasises competency as the recurring action, "Submit Competency" should likely be the primary.
- **P2** — Recent assessments table renders the "View" button only for competency/exit-survey types — intern self-submit types show an `—`. Add a hover tooltip ("Admin-only view") or a disabled `.btn--outline btn--sm` styled grey.

### `[~] /employer/competency/new`
_Findings:_
- **P1** — `<PageHead>` is missing the `<MetaStrip>` showing intern/cohort/employer/role/dates — admin equivalent renders MetaStrip in PageHead. The `meta` is passed to the form but the user loses the page-level summary header.
- **P2** — Title "NEW COMPETENCY ASSESSMENT." correctly uppercased — matches admin. Good.
- **P2** — No cancel button at the top — admin form posts back to the action bar which renders Cancel + Save. Verify `<CompetencyAssessmentForm>` renders a Cancel link back to `/employer/interns/${intern.id}`.

### `[~] /employer/competency/edit`
_Findings:_
- **P1** — Same missing `<MetaStrip>` in PageHead. Add for parity with admin.
- **P2** — Title "EDIT COMPETENCY ASSESSMENT." — good.
- **P2** — Uses `?id=` querystring vs admin equivalent's path param. Per code comment this is intentional; document the convention if not already.

### `[~] /employer/competency/:id`
_Findings:_
- **P1** — `actions` slot renders only an "Edit" outline button. No back-link. Add an outline "Back to intern" link OR rely on the breadcrumb (which currently points to `/employer/interns`, not the specific intern — minor breadcrumb bug worth fixing: include the intern lastName segment).
- **P1** — Breadcrumb is `EMPLOYER / INTERNS / COMPETENCY` — drops the intern identifier. Admin pattern includes the entity. Pattern: `EMPLOYER / INTERNS / ${intern.lastName.toUpperCase()} / COMPETENCY`.
- **P2** — Read-only form uses the live `<CompetencyAssessmentForm>` with `readOnly={true}` — confirm the form visually distinguishes read-only state (greyed inputs, hidden submit) so it doesn't look broken.

### `[~] /employer/exit-survey`
_Findings:_
- **P1** — Sub copy says "Saving updates the existing record." but doesn't surface "this is editable / re-openable" prominently. Consider a small `.auth__alert--success`-style banner above the form on re-open noting "This survey was last saved on …" so the upsert behavior is obvious.
- **P2** — MetaStrip is rendered correctly. Title "EXIT EMPLOYER SURVEY." — matches admin.
- **P2** — Breadcrumb is `EMPLOYER / INTERNS / EXIT EMPLOYER SURVEY` — same intern-segment-missing issue as competency detail. Add the intern lastName segment.

### `[~] /employer/profile`
_Findings:_
- **P1** — Title is `${employer.name.toUpperCase() + '.'}` — uppercases the *employer name*. That's fine but loses the action context. Either match admin (mixed case + period) OR change the title to "MY EMPLOYER." and surface the employer name in a MetaStrip.
- **P1** — Missing the `<MetaStrip>` showing Contact Name / Email / Phone — admin employer detail uses this. Add MetaStrip to PageHead for parity.
- **P1** — "Roles" identity-card at the bottom is a thin teaser pointing to `/employer/roles`. Admin employer detail page surfaces the full roles + cohorts tables inline. Consider mounting the roles list inline (read-only summary) so employers don't need a context switch.
- **P2** — `auth__alert--success` is reused for "Saved." — works, but feels out of place mid-page. The admin convention is a toast (`useToast()`). Switch to toast.

### `[~] /employer/roles`
_Findings:_
- **P1** — Title "Your roles." sentence-case; switch to uppercase display.
- **P1** — Missing `name-initial` avatar bubble in the Label column — admin roles tables under employer detail use `.col-name` + `.name-initial`. Apply for visual rhythm parity.
- **P2** — No row-click navigation; admin pattern is row-click + button is implicit.
- **P2** — No "Cohorts using" column. Admin roles table shows the count — employers benefit from knowing which roles are in use before attempting a delete (which can fail with 23503).

### `[~] /employer/roles/new`
_Findings:_
- **P1** — Title "NEW ROLE." — good uppercase. The form `IdentityCard` `subnote="NEW ROLE · DEFINE DETAILS"` matches admin pattern.
- **P2** — No `<MetaStrip>` showing the parent Employer name. Add a single-item MetaStrip with `{ label: 'Employer', value: employer.name }`.
- **P2** — Description textarea is rows=3; admin equivalent matches.

### `[~] /employer/roles/:roleId`
_Findings:_
- **P1** — Title "EDIT ROLE." — good. But no `<MetaStrip>` showing "Cohorts using" count + Employer name; the user has no context for whether a delete will succeed. Add a MetaStrip with the cohort+intern usage counts.
- **P1** — Missing the prototype's "Cohorts using this role" sub-table. The admin role detail surfaces this — employers need it even more since they can hit 23503 on delete.
- **P2** — Delete confirm modal body says correct copy. Could be a pre-flight check (loader returns usage count → disable the delete button + show inline note) rather than a post-attempt error. P2 enhancement.
- **P2** — Save confirmation again uses `auth__alert--success` instead of a toast. Switch to `useToast()`.

---

## Fix batch grouping (informs Tasks 2–5 PRs)

- **Batch 1 — auth + public surface** (`feat/sp6-visual-fidelity-batch-1-auth-public`):
  - Cross-cutting: build shared `<PublicNav>` + `<PublicFooter>` for `_public.tsx`; port `.hero`, `.pillar`, `.footer`, `.wordmark`, `.confirm*`, `.action-bar*` rules into `global.css`; ensure fonts loaded in `root.tsx`.
  - `/` rebuild from scratch against prototype `index.html`.
  - `/login` refactor to `AuthShell` + add intro column.
  - `/intern/*` layout fix (real nav + footer + sticky action bar); all 3 form titles to multi-line Archivo Black; confirmation page rebuild with `.confirm` shell + badge + receipt + verbatim prototype copy; 404 wrapped in shell + badge.
  - `/intern/assessments` rebuild to chooser-card grid with status pills.

- **Batch 2 — admin shell + Settings** (`feat/sp6-visual-fidelity-batch-2-admin`):
  - Cross-cutting: nav height + active state + chip silhouette + container padding + body font-size + token registry import + Plex weights link + print stylesheet.
  - `/admin` personalized greeting + quick-link arrow.
  - Settings: port `.qs-editor-card` rules; restore `.empty-cell` semantics; minor cohort-edit + role-edit/new employer-context surfaces.

- **Batch 3 — admin Interns + Assessments** (`feat/sp6-visual-fidelity-batch-3-admin-interns-assessments`):
  - Cross-cutting: restore Actions column + `.table-meta` strip + CSS-driven row hover.
  - `/admin/interns` Current Phase column + zero-padded count.
  - `/admin/assessments` rebuild card grid with `.assessment-card`; multi-line title; picker as `.picker-list` table.
  - Competency new/edit/detail: identity-card subnote + result pill + two-line title + detail-header band.
  - Exit survey + self-results + self-detail: title line breaks + meta cell parity + `.col-name + .name-initial` chip + Immutable cell.

- **Batch 4 — employer shell** (`feat/sp6-visual-fidelity-batch-4-employer`):
  - Cross-cutting: image wordmark + chip variant + drop double-container + employer accent + breadcrumb year + footer parity.
  - `/employer` dashboard quick-links + recent activity + uppercase title.
  - Cohorts/interns lists: TableFilter + outcome pill + name-initial chip.
  - Intern record: swap identity-cards for RubricPanels.
  - Competency new/edit/detail: PageHead MetaStrip + breadcrumb intern segment.
  - Profile + roles + role detail: MetaStrips + cohorts-using table + toast convention.

P2 items roll into the relevant batch on a best-effort basis.
