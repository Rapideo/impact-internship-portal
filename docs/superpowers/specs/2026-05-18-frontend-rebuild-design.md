# Frontend Rebuild — Design Spec

**Document status:** Draft v1
**Date:** 2026-05-18
**Author:** Matt + Claude
**Supersedes:** SP6 Phase A "Visual fidelity audit + fixes" (Tasks 1–6 in `docs/superpowers/plans/2026-05-14-sub-project-6-polish-launch.md`). The audit deliverable (`docs/superpowers/visual-fidelity-audit-2026-05-14.md`) is preserved as a route-by-route requirements input to this rebuild.
**Related documents:**
- `Prototypes/PROTOTYPE/` (local mirror) and `C:\Projects\impact-prototype\Prototypes\PROTOTYPE\` (sibling repo, frozen) — **the design specification, literally**
- `docs/superpowers/visual-fidelity-audit-2026-05-14.md` — per-route delta inventory
- `docs/superpowers/specs/2026-05-10-production-rebuild-design.md` — original architectural spec (still authoritative for stack/data/auth)
- `CLAUDE.md` — current production architecture summary

---

## 1. The Fidelity Mandate

> **The rebuilt frontend MUST look and behave exactly like the prototype. Pixel-for-pixel parity is the non-negotiable success criterion of this project. Every other consideration — abstraction reuse, component elegance, developer ergonomics — is subordinate to it.**

This is not "inspired by the prototype." This is not "approximating the prototype." The prototype HTML at `Prototypes/PROTOTYPE/` and its `styles.css` are the **literal specification**: the source of truth for layout, spacing, typography, color, hover states, transitions, copy, micro-labels, action bars, modals, and every other visible surface.

### 1.1 Why this mandate exists

The production rebuild (SP1–SP5, 2026-05-11 → 2026-05-14) shipped a fully functional app — every route works, RLS scopes correctly, forms submit, data persists, tests pass. But it was built **function-first**: rendering correct data and handling actions came before brand fidelity. The SP6 Phase A visual audit (2026-05-18) confirmed the cost of that ordering — every shipped route has structural gaps. The audit cataloged P0/P1/P2 deltas across 30+ routes, and the through-line was unmistakable: the production frontend looks materially different from the prototype, page after page.

A patch-by-patch fix campaign would touch nearly every component file anyway. At that volume of change, **rebuilding from the prototype as the literal spec is cheaper and produces a better result than translating audit findings into surgical edits**.

### 1.2 What "exactly like the prototype" means

For every shipped route, the rebuilt page must match the prototype on:

- **Structural HTML:** same semantic elements, same nesting, same class names
- **CSS:** same tokens (`--navy #153A98`, `--cyan #00A6F6`, `--gold #FFD71F`, etc.), same component rules, same spacing scale, same border radii, same shadows
- **Typography:** Archivo Black for display, IBM Plex Sans 400/500/600/700 for body, IBM Plex Mono for micro-labels and tabular data
- **Layout:** same grid, same container width (1240px max), same padding (`0 40px` on container), same nav height (100px), same wordmark size (64px)
- **Component shells:** nav bar, footer, action bar, identity card, meta strip, rubric panel, KPI card, table-meta strip, picker modals, confirmation badges — match the prototype primitive exactly
- **Copy:** verbatim. Page titles, sub-copy, button labels, micro-labels, modal bodies, toast messages, empty states — all match the prototype's text exactly
- **Interaction patterns:** hover states (3px gold underline on nav active, 1px on hover), modal open/close transitions, toast positioning and dismiss timing, sticky action bars on form pages, accordion behaviors

### 1.3 Out-of-scope acceptable deviations

The following classes of deviation are acceptable and don't violate the mandate:

- **Real data instead of mock:** prototype's `IMPACT.EMPLOYERS`/`IMPACT.COHORTS`/etc. become real Drizzle queries. The rendered tables show real seeded rows instead of mock rows.
- **Routing changes that match production URLs:** prototype links like `intern-record.html?id=…` become `/admin/interns/:internId`. The link copy stays the same.
- **Anchors that are now dynamic:** prototype's `assessment-confirmation.html?type=personal-goals` becomes a real loader-driven route at `/intern/confirmation?type=personal-goals` with the same query contract.
- **Form actions:** prototype's `<form onsubmit="…">` becomes React Router `<Form method="post">` posting to the same field names; the form's HTML structure stays.
- **Accessibility fixes that don't visibly change the design:** adding `aria-*` attributes, programmatic focus management, skip links, etc.
- **Content updates approved by program staff** (e.g., final question copy replacing prototype placeholders).

Any deviation outside these classes requires an explicit **"Deviation:"** entry in the relevant PR description, with justification, before that PR can land.

### 1.4 Verification protocol

Every fix PR in this rebuild MUST include:

1. **Side-by-side screenshot pairs** at 1440×900 viewport for every affected route — captured via `scripts/visual-audit-screenshots.ts`. Pairs live in `docs/superpowers/visual-fidelity-screenshots/<date>/<slug>__a-prototype.png` and `__b-production.png`.
2. **Manual visual walk by the reviewer.** Each PR's reviewer opens the prototype HTML and the production route in side-by-side browser windows and confirms parity.
3. **Pixel-diff tolerance: ≤5px on layout primitives, exact match on tokens and copy.** Anything outside this tolerance must be a documented Deviation.

A PR that doesn't include the screenshot pairs is not reviewable and will not land.

---

## 2. Goals & Non-goals

### 2.1 Goals

1. **Pixel-for-pixel prototype parity** on every shipped route (see §1.2).
2. **Preserve all functional behavior** of the production app. Every loader, action, server module, RLS policy, auth flow, and JWT hook continues to work unchanged.
3. **Preserve all URL contracts.** `app/routes.ts` is unchanged — no URL paths move, no params change.
4. **Preserve the test pyramid's behavior layer.** 196 unit tests, 19 RLS integration tests, and the data-layer test specs continue to pass without modification. Only Playwright e2e selectors get updated (as the DOM structure changes).
5. **Reuse the prototype's CSS and markup verbatim where possible.** Port `Prototypes/PROTOTYPE/styles.css` directly. Translate prototype HTML to TSX mechanically — `class=` → `className=`, self-close tags, event handlers as props — instead of redesigning component patterns from scratch.

### 2.2 Non-goals

1. **No changes to the data model.** `db/schema.ts`, `db/policies/*.sql`, `supabase/config.toml` are untouched.
2. **No changes to authentication or RLS.** The Supabase Auth flow, JWT custom-access-token hook, three-tier permission model, intern identity cookie — all unchanged.
3. **No changes to server-side logic.** Files matching `*.server.ts`, `db/`, `scripts/` (except the visual-audit script) are untouched.
4. **No changes to the framework or build pipeline.** React Router v7 framework mode, Vite, TypeScript 5.7 — unchanged. No introduction of CSS-in-JS, Tailwind, or any styling framework. The prototype is plain CSS; the production rebuild stays plain CSS.
5. **No new features.** Every route that exists today is rebuilt; no new routes are added. (Any feature additions remain on SP6 Phase C–J as originally planned.)
6. **No accessibility-driven design changes** in this rebuild. WCAG 2.1 AA audit happens in SP6 Phase G against the rebuilt frontend; if the prototype itself has contrast or focus issues, those become Phase G fixes documented as conscious design evolutions, not deviations from the prototype baseline.
7. **No IA changes.** The route hierarchy, breadcrumb structure, and navigation graph match the production app today — which already matches the prototype's intended IA.

---

## 3. What changes vs what stays

### 3.1 Files rewritten

```
app/
├── components/                     ← REWRITTEN — every component rebuilt against prototype markup
├── routes/
│   └── **/*.tsx                    ← Default-export component body REWRITTEN.
│                                      Loader/action exports PRESERVED.
├── styles/
│   ├── tokens.css                  ← REWRITTEN — port :root block from prototype styles.css verbatim
│   ├── global.css                  ← REWRITTEN — port base + utility rules from prototype
│   ├── admin.css                   ← REWRITTEN — port admin-shell rules from prototype
│   ├── auth.css                    ← REWRITTEN — port auth-page rules from prototype
│   └── employer-shell.css          ← REWRITTEN — derive from admin.css with employer accent
└── root.tsx                        ← MODIFIED — add IBM Plex Sans 400/500/600/700 link,
                                      add IBM Plex Mono link, add Archivo Black link
```

### 3.2 Files preserved (untouched by this rebuild)

```
app/
├── lib/**/*.server.ts              ← UNCHANGED — auth, env, identity, employer-scope, db clients
├── lib/validation.ts               ← UNCHANGED
├── routes/**/*.tsx                  ← Loader + action exports UNCHANGED; only default export body rewrites
├── routes.ts                        ← UNCHANGED — URL contracts preserved
└── emails/                          ← UNCHANGED — SP5 email templates already plain HTML
db/                                  ← UNCHANGED — schema, policies, seed, migrations
scripts/                             ← UNCHANGED (visual-audit script added)
supabase/                            ← UNCHANGED
tests/
├── unit/                            ← UNCHANGED — 196 tests should still pass
├── rls/                             ← UNCHANGED — 19 tests should still pass
└── e2e/                             ← MODIFIED — Playwright selectors update to match new DOM
```

### 3.3 Prototype reuse strategy

The prototype is a sibling-repo gift: a fully realized design system already written in HTML and CSS. The rebuild leverages it as follows:

1. **`styles.css`:** lift wholesale into production `app/styles/` (split into the existing files for organization). The `:root` token block, base resets, utility classes, component rules — all port verbatim. Where production needs additional rules (e.g., employer-shell accent variants), they extend the prototype's base.
2. **HTML structure:** each prototype HTML page is the literal template for the corresponding production route. Mechanical translation:
   - `class=` → `className=`
   - `for=` → `htmlFor=`
   - self-close void elements (`<img/>`, `<input/>`, `<br/>`)
   - inline `onclick="…"` handlers → React event props (most are modal-open triggers and become `<ConfirmModal>` invocations)
   - data-hydration script blocks → React Router loader props
   - sessionStorage writes → form submissions to existing server actions
3. **`app.js`:** mostly discarded. Its mock dataset is replaced by Drizzle queries; its `wireModals()` / `toast()` / `validate()` helpers are replaced by React components already in production. The few pure utility helpers worth keeping (`formatPhone`, `formatCompletionDate`) get ported into `app/lib/utils.ts`.
4. **Prototype assets:** `logo.png` is already in `app/public/`. Verify it's the same file; if not, replace with the prototype's.

---

## 4. Approach

### 4.1 Foundation-first

Before any route is rebuilt, the **foundation layer** lands first as a single PR:

- Port `styles.css` `:root` into `tokens.css` (verbatim, every token, even ones production doesn't use today)
- Port prototype base + utility rules into `global.css`
- Add Google Fonts `<link>` tags to `app/root.tsx`: Archivo Black, IBM Plex Sans 400/500/600/700, IBM Plex Mono 400/500
- Establish the rule that production `app/styles/` is sourced from the prototype — any addition must justify its absence from the prototype

After foundation lands, the rest of the rebuild is **route-by-route** (or grouped by shell) and visually verifiable each time.

### 4.2 Component primitives — rebuild before consuming

Each route depends on a handful of shared components. These primitives get rewritten in dedicated PRs before the routes that consume them:

| Primitive | Prototype source | Used by |
|---|---|---|
| `<PublicNav>` + `<PublicFooter>` | `index.html` `<header class="nav">`, `<footer class="footer">` | Landing, login, auth pages, intern flow, 404 |
| `<AdminNav>` + `<AdminFooter>` | `admin.html` `<header>`, footer | All `/admin/*` routes |
| `<EmployerNav>` + `<EmployerFooter>` | Derived from `<AdminNav>` with **cyan-accent** chip divider (per §8 decision 7) | All `/employer/*` routes |
| `<PageHead>` | `.page-head` block in `admin.html`, `interns-dashboard.html`, etc. | Almost every authenticated route |
| `<ActionBar>` | `.action-bar` block in `intern-record.html`, `competency-new.html`, etc. | Every form route |
| `<MetaStrip>` | `.meta-strip` block in `intern-record.html`, `competency-detail.html` | Detail + edit pages |
| `<IdentityCard>` | `.identity-card` block in `cohort-detail.html`, `settings-employer.html` | Settings + intern flow gating |
| `<RubricPanel>` | `.rubric` block in `intern-record.html` | Intern record + competency forms |
| `<ConfirmModal>` | Modal markup in `interns-dashboard.html` etc. | All destructive actions |
| `<Toast>` | `.toast` block | All success confirmations |
| `<TableFilter>` + `<EmptyRow>` + `<NameInitial>` chip | `.filters` + `.table-meta` + `.col-name` + `.name-initial` | All list pages |
| `<AssessmentForm>` | `personal-goals.html` form structure + `participant-feedback.html` mixed-type structure | 3 intern self-assessments + Exit Employer Survey |
| `<CompetencyAssessmentForm>` | `competency-new.html` form structure | Admin + employer competency new/edit/detail |
| `<QuestionSetEditor>` | `settings-question-set.html` accordion editor | All `/admin/settings/questions/*` routes |
| `<InlineEditableList>` | `settings-phases.html` / `settings-barriers.html` row editor | Phases, Barriers, possibly Roles |
| `<AuthShell>` | `login.html` two-column intro + form-card | Login, all `/auth/*` routes |
| `<HeroSection>` + `<PillarsSection>` | `index.html` | Landing page |
| `<ConfirmReceipt>` | `assessment-confirmation.html` | Intern confirmation page |

Each primitive ships in its own PR (or grouped with closely related siblings), with a Storybook-style demo route (or test fixture) demonstrating its prototype match before any route consumes it. **No primitive lands without screenshot proof of parity.**

### 4.3 Route-by-route rebuild

Once primitives are in, each route's default-export component is rewritten from the prototype HTML. The rewrite pattern:

```tsx
// Before (production):
export default function AdminHome() {
  const { user } = useLoaderData<typeof loader>();
  return (
    <main>
      <h1 style={{ color: 'var(--navy)' }}>GOOD MORNING.</h1>
      ...
    </main>
  );
}

// After (rebuilt to match prototype):
export default function AdminHome() {
  const { user, kpis, recentActivity, quickLinks } = useLoaderData<typeof loader>();
  return (
    <>
      <AdminNav />
      <main>
        <PageHead
          microLabel="ADMIN / HOME / 2026"
          title={<>GOOD MORNING,<br/>{user.firstName.toUpperCase()}.</>}
          sub="Program overview for the 2026 cohort cycle. Data reflects the current demo dataset."
        />
        <section className="container">
          <div className="kpi-grid">
            <KpiCard label="Active Cohorts" value={kpis.cohorts} delta="ALL 2026 CYCLE" />
            <KpiCard label="Active Interns" value={kpis.interns} delta="ACROSS N COHORTS" variant="cyan" />
            <KpiCard label="Assessments Needed" value={kpis.needed} delta="THIS WEEK" variant="success" />
          </div>
          <QuickLinks items={quickLinks} />
          <RecentActivity entries={recentActivity} />
        </section>
      </main>
      <AdminFooter />
    </>
  );
}
```

The loader/action exports remain untouched; the default export's body is what changes. Existing import lines for server modules stay intact.

### 4.4 What about React component reuse?

The prototype is page-oriented, not component-oriented — each HTML file inlines its markup. The rebuild **does** extract repeated patterns into React components (see §4.2 inventory), but the rule is strict: **the component must emit markup that matches the prototype byte-for-byte where the prototype uses that pattern.** The component is a refactor of the prototype's repeated markup, not an invention. If two prototype pages use `.identity-card` slightly differently, the `<IdentityCard>` component supports both via props — it doesn't normalize one toward the other.

---

## 5. Phasing

The rebuild is **Sub-project 7: Frontend Rebuild**. SP6's remaining phases (C Reports, D Resend, E Sentry, F Playwright un-gate, G a11y, H perf, I prod seed, J launch) run AFTER SP7 lands.

| Phase | Name | Scope | Target PRs |
|---|---|---|---|
| **A** | Foundation port | Tokens, fonts (Latin-subset Plex), global CSS, root.tsx font links, **`@media print` rules**, `app/lib/utils.ts` for `formatPhone` / `formatCompletionDate`, logo asset parity check. **No route changes.** | 1 PR |
| **B** | Shared primitives | All `<Nav>`, `<Footer>`, `<PageHead>`, `<ActionBar>`, `<MetaStrip>`, `<IdentityCard>`, `<RubricPanel>`, `<ConfirmModal>`, `<Toast>`, `<TableFilter>`, `<EmptyRow>`, `<NameInitial>`, `<AuthShell>`, `<HeroSection>`, `<PillarsSection>`, `<ConfirmReceipt>`, `<KpiCard>`, `<QuickLinks>`, `<RecentActivity>`, `<DetailHeader>`, `<RubricSectionHead>`, `<AssessmentCard>`, `<PickerList>`. | 3–5 PRs (grouped by domain) |
| **C** | Form primitives | `<AssessmentForm>`, `<CompetencyAssessmentForm>`, `<QuestionSetEditor>`, `<InlineEditableList>` rebuilt. Existing prop APIs preserved; markup rebuilt. | 2 PRs |
| **D** | Public + intern rebuild | `/` (landing), `/login`, `/auth/forgot`, `/intern/assessments`, `/intern/personal-goals`, `/intern/midpoint-reflection`, `/intern/participant-feedback`, `/intern/confirmation`, `/*` (404). | 2 PRs |
| **E** | Admin shell + Settings | `/admin`, `/admin/settings/*` (employers, cohorts, roles, phases, barriers, program-info, questions including competency editor). | 3–4 PRs (by sub-domain) |
| **F** | Admin Interns + Assessments | `/admin/interns/*`, `/admin/assessments/*`, `/admin/self-assessment-results`, `/admin/self-assessment-detail`. | 2–3 PRs |
| **G** | Employer shell | All `/employer/*` routes. No prototype counterpart — derive from admin shell with gold-accent variant. | 2 PRs |
| **H** | Test harness update + regression sweep | Update Playwright selectors across all e2e specs; full visual QA pass against every route; close remaining `[~]` entries in the audit doc. | 1 PR |
| **I** | Phase close-out | Visual fidelity audit doc updated to mark every route `[✓]`; deferred items move to `docs/BACKLOG.md`; CLAUDE.md updated. | 1 PR (or fold into H) |

**Total: ~17–22 PRs, 1–2 weeks of focused work.**

Phase ordering matters: A → B → C are foundational and don't ship visible changes to users (foundation pages still look broken until D–G land their routes). D ships first because the auth + intern flow is the lowest-stakes surface to validate the rebuild approach. E–G run sequentially because each shell's primitives extend the prior phase's. H is the safety net that catches any regressions.

---

## 6. Verification protocol (mandatory per PR)

Every rebuild PR (D–G) must include in its description:

```markdown
## Screenshot pairs

| Route | Prototype | Production |
|---|---|---|
| /login | ![](docs/superpowers/visual-fidelity-screenshots/2026-05-18/login__a-prototype.png) | ![](docs/superpowers/visual-fidelity-screenshots/<this-pr-date>/login__b-production.png) |
| ... | ... | ... |

## Visual deltas (if any)

- None.  /  - <listed and justified as Deviations>

## Manual walk

- [ ] Reviewer has opened both surfaces side-by-side and confirmed parity
- [ ] All copy matches prototype verbatim
- [ ] All tokens match prototype values
- [ ] All interaction patterns match (hover states, modal transitions, action bar stickiness)
```

The screenshot script (`npm run audit:screenshots`) is added to `package.json` so any contributor can regenerate the production-side images on demand.

The CI Playwright job (currently gated, ungated in SP6 Phase F) will eventually run pixel-diff comparisons against committed baseline screenshots. For now the verification is human + script.

---

## 6a. Review gates (mandatory checkpoints)

Per-PR review (§6) verifies individual changes. **Review gates** are stronger: they halt the rebuild at named checkpoints until Matt explicitly approves. Work on the next phase does NOT begin until the gate is signed off.

Each gate has a fixed format:
1. I post a gate-review comment in this repo (PR description, issue, or in-conversation) containing: scope summary, screenshot pairs, demo URLs (if running locally), known limitations.
2. Matt reviews asynchronously — walks the rebuilt surface in browser, opens the prototype side-by-side, signs off OR flags issues.
3. If flagged, the gate stays open and the responsible PR (or a follow-up) addresses the issues before re-review.
4. Only on explicit sign-off do I proceed to the next phase.

Gates are not the same as PR review; PR review catches mechanical bugs, gates catch "this doesn't look right" or "the brand doesn't feel like the prototype." A PR can be technically correct and still fail its gate.

### Gate inventory

| Gate | After phase | Scope of review | Sign-off criterion |
|---|---|---|---|
| **G1: Foundation** | A | Ported `tokens.css` + `global.css` + `@media print` rules + font links in `root.tsx` + `app/lib/utils.ts`. Matt diffs the CSS files against prototype's `styles.css`. | Tokens match prototype `:root` exactly; font links load Archivo Black + Plex Sans (Latin) + Plex Mono; print stylesheet present. |
| **G2: Shared primitives** | B | Demo route mounted (e.g. `/dev/primitives`, gated `NODE_ENV !== 'production'`) showing every shared primitive rendered: nav, footer, page-head, action-bar, meta-strip, identity-card, rubric-panel, KPI card, confirm modal, toast, table-filter, name-initial chip, hero, pillars, confirm-receipt, auth-shell. | Each primitive matches its prototype counterpart side-by-side (Matt walks the demo + the prototype's matching pages). |
| **G3: Form primitives** | C | Demo extensions to `/dev/primitives` adding `<AssessmentForm>`, `<CompetencyAssessmentForm>`, `<QuestionSetEditor>`, `<InlineEditableList>`. | Each form renders correctly with mock data; sticky action bar pinned; section breaks render on Personal Goals (between Q4 and Q5); accordion editors open/close per prototype. |
| **G4: Public + intern rebuild** | D | Rebuilt `/`, `/login`, `/auth/forgot`, `/intern/assessments`, `/intern/personal-goals`, `/intern/midpoint-reflection`, `/intern/participant-feedback`, `/intern/confirmation`, `/*` (404). | Every route walked side-by-side. Copy verbatim. Sticky action bar present on form pages. Confirmation receipt + badge render. 404 wrapped in public shell. |
| **G5: Admin shell + Settings** | E | Rebuilt `/admin`, `/admin/settings/employers` (list + detail + form), `/admin/settings/cohorts/:id`, `/admin/settings/roles/*`, `/admin/settings/phases`, `/admin/settings/barriers`, `/admin/settings/program-info` (with "Reseed dev data" Danger Zone gated to dev), `/admin/settings/questions` (list + per-set editor + competency 3-tier editor). | Personalized "GOOD MORNING, MATT." greeting renders; nav matches prototype (100px tall, 64px logo, 3px gold underline rail on active link); Settings rail order matches; inline editable lists work; Reseed dev data is dev-only. |
| **G6: Admin Interns + Assessments** | F | Rebuilt `/admin/interns` (list), `/admin/interns/new`, `/admin/interns/:id` (record), `/admin/assessments` (hub), `/admin/assessments/competency/*` (new/edit/detail), `/admin/assessments/exit-employer-survey`, `/admin/self-assessment-results`, `/admin/self-assessment-detail`. | Intern record's 6 numbered rubric panels render; competency 3-tier stitching displays section headers; competency detail shows result pill + meta-strip; self-assessment-detail empty state matches prototype. |
| **G7: Employer shell** | G | Rebuilt all `/employer/*` routes with cyan-accent chip + KPI tile differentiator. | Cyan accent visible on chip divider + one KPI tile; double-container nesting removed; employer KPI dashboard mirrors admin dashboard pattern; intern record uses RubricPanels (not IdentityCards); breadcrumbs include intern segment on per-intern routes. |
| **G8: Regression sweep** | H | All 196 unit tests, 19 RLS tests, 10+ Playwright e2e specs pass. `npm run build` + `npm run typecheck` + `npm run lint` green. Audit doc has every `[~]` flipped to `[✓]` or deferred with justification. | All checks green; Matt does final end-to-end walk through every shipped route. |

### Gate failure protocol

If a gate fails (Matt finds the surface doesn't match the prototype well enough):

1. **Stop forward work.** Don't open the next phase's PR until the gate's issues are resolved.
2. **Diagnose collectively.** Surface the specific delta (screenshot annotation, copy mismatch, missing element). Decide if it's a fix to the current phase's PR(s) or a follow-up.
3. **Fix in the same phase's branch** when possible — a gate failure on G4 (public surface) becomes a follow-up PR in the public-surface batch, not a Phase E task.
4. **Re-walk the gate** after fixes land. Same format: post screenshots, request sign-off.

Gate sign-off can be informal ("approved" in a reply) or formal (a thumbs-up reaction on a PR comment) — but it must be explicit. Silence is not approval.

---

## 7. Risks and mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Playwright selectors break across most e2e specs | Certain | High (loss of regression coverage during rebuild) | Phase H is dedicated to spec updates; specs that test critical flows (auth, submission) get updated PR-by-PR as their routes rebuild |
| Component-primitive props change requires call-site updates | Likely | Medium | Phase B/C primitives preserve existing prop APIs where possible; new props for prototype-required features are additive with defaults |
| Estimated 1–2 weeks slips | Likely | Medium | Phasing is incremental — every PR ships a real improvement, so even mid-rebuild the app is more on-brand than before |
| Prototype contains a11y issues we then ship | Likely | Medium | Phase G of SP6 (after SP7) audits the rebuilt frontend with axe-core; fixes documented as evolution, not regressions |
| Token unification leaves orphaned/duplicate hex literals | Possible | Low | Final pass in Phase H greps `app/` for raw hex codes; any survivor gets migrated to a token or justified |
| Print stylesheet (`@media print`) not ported | Possible | Low | Defer to backlog; not a launch blocker, easy fold-in later |
| `app.js` mock-data helpers leak into production thinking | Low | Low | `app.js` is reference-only; no part of it gets imported into production code |
| Bundle size grows from Plex font weights | Possible | Low | Phase H runs bundle visualizer; if Plex contributes meaningfully, switch to font-display: swap + subset |
| The "minimum-PII" rule documented in the prototype gets accidentally undone (intern record shows first name in DB) | Low | High | Audit each rebuild PR for inputs that capture data not already captured today; reject any that does. The current production code already enforces first-initial-only at the action; this stays. |
| Cohort/role/intern detail routes need real IDs for screenshot capture | Certain | Low | Visual-audit script Phase 2: crawl list → first row → follow link. Today's pass already captures all prototype-only detail pages and all production index routes. |

---

## 8. Resolved decisions

The following choices were locked by Matt on 2026-05-18 before SP7 Phase A starts. Implementations must follow these without re-litigating.

1. **Print stylesheet** — **PORT NOW** as part of Phase A foundation. Lift the prototype's `@media print` rules into `global.css` so detail pages print cleanly from v1. ~30 min of work; no follow-up needed later.
2. **`app.js` utility helpers** — **EXTRACT** `formatPhone`, `formatCompletionDate`, and any other pure helpers worth keeping into a new `app/lib/utils.ts`. The rest of `app.js` (mock data, sessionStorage wiring, modal/toast helpers) is discarded — production already has React equivalents.
3. **Logo asset** — verify `app/public/logo.png` is byte-identical to `Prototypes/PROTOTYPE/logo.png`. If not, replace production's with the prototype's. Mechanical check at start of Phase A; no decision needed mid-stream.
4. **Plex font subset** — **LATIN-ONLY**. Google Fonts URL includes `&subset=latin` (or equivalent `text=` param). Saves ~80KB on initial paint. If program later serves non-Latin copy, font swap is a small follow-up.
5. **Reset Demo Data → "Reseed dev data"** — **REPURPOSE**. The Danger Zone card stays on Settings → Program Info, but the button is renamed to "Reseed dev data" and is **gated behind `process.env.NODE_ENV !== 'production'`** (server-side check in the loader so the card doesn't even render in prod). Wires to a new server action that invokes the same logic as `npm run db:seed` (TRUNCATE + reseed). Useful for local dev cycles; explicitly unreachable in prod.
6. **Sticky action bar on intern forms** — **YES, sticky bottom**, matches prototype. Pin `.action-bar` to viewport bottom on all form pages: 3 intern self-assessments, admin competency new/edit, admin exit-employer-survey, admin intern record (new + edit), all admin Settings forms with Save, employer competency new/edit, employer exit-survey, employer profile + role forms. Mono status caption on the left, Cancel + Submit on the right.
7. **Employer shell accent — CYAN**. Employer chip divider uses `var(--cyan)` (admin uses white); one KPI tile per employer shell page uses cyan border/accent. Distinguishes role at-a-glance without breaking the admin pattern. Cyan reads "functional" — appropriate for the employer's day-to-day operations surface vs admin's "executive overview" feel.
8. **Visual fidelity audit doc — KEEP as running checklist**. Each SP7 fix PR closes audit entries by flipping `[~]` to `[✓]` with PR ref. This spec governs the approach; `visual-fidelity-audit-2026-05-14.md` governs per-route state. Two complementary docs.
9. **Branch protection — UNCHANGED**. Required CI checks + squash merge stay through all 17–22 SP7 PRs. SP1–5 already shipped 16+ PRs in a day at peak; the cadence is fine. Safety is non-negotiable.
10. **Timeline framing — accepted.** SP7 is a 1–2 week extension sitting before SP6 Phases C–J. Launch ETA shifts ~2 weeks. Frontend fidelity is the priority; Reports/Resend/Sentry/launch queue behind SP7.

---

## 9. Out-of-scope reaffirmation

To prevent scope creep mid-rebuild, this rebuild explicitly does **NOT** include:

- The Reports page implementation (SP6 Phase C)
- Resend email wiring (SP6 Phase D)
- Sentry observability (SP6 Phase E)
- Playwright CI un-gate (SP6 Phase F — though SP7 Phase H updates the specs themselves)
- Accessibility audit (SP6 Phase G — runs against the rebuilt frontend)
- Performance audit (SP6 Phase H — runs against the rebuilt frontend)
- Production data seed (SP6 Phase I)
- Launch day (SP6 Phase J)

Carry-over follow-ups from SP1–5 that this rebuild does NOT close:
- **#77** — Supabase `app_pool` anon-role provisioning (parked for SP6 Phase J, no code)
- **SP5 Task 37** — Admin invite→accept E2E (parked for SP6 Phase F)

---

## 10. Definition of done (SP7 close-out)

SP7 is complete when:

1. Every route in `app/routes.ts` renders against rebuilt components using ported prototype CSS.
2. The visual fidelity audit doc (`docs/superpowers/visual-fidelity-audit-2026-05-14.md`) has every `[~]` entry resolved to `[✓]` (with PR refs) or moved to backlog with explicit justification.
3. Side-by-side screenshot pairs for every route are committed under `docs/superpowers/visual-fidelity-screenshots/`.
4. All 196 unit tests pass.
5. All 19 RLS tests pass.
6. All 10+ Playwright e2e specs pass (selectors updated).
7. `npm run build` is green.
8. `npm run typecheck` is green.
9. `npm run lint` has no new warnings.
10. CLAUDE.md is updated to reflect the rebuilt frontend's component primitives, CSS organization, and reuse patterns.
11. A new section in `docs/superpowers/plans/2026-05-14-sub-project-6-polish-launch.md` (or a new SP6.1 plan) marks SP7 as the predecessor for the remaining SP6 phases C–J.
12. Matt has walked the full app end-to-end in a browser and confirmed parity with the prototype.

---

## 11. References

- **Prototype:** `Prototypes/PROTOTYPE/` (this repo, reference-only copy) and `C:\Projects\impact-prototype\Prototypes\PROTOTYPE\` (sibling repo, frozen — the canonical source)
- **Visual audit doc:** `docs/superpowers/visual-fidelity-audit-2026-05-14.md`
- **Screenshot script:** `scripts/visual-audit-screenshots.ts`
- **Screenshot output dir:** `docs/superpowers/visual-fidelity-screenshots/<date>/`
- **Original production spec:** `docs/superpowers/specs/2026-05-10-production-rebuild-design.md` (still authoritative for everything below the UI)
- **Original SP6 plan:** `docs/superpowers/plans/2026-05-14-sub-project-6-polish-launch.md` (Phase A supersedes; B–J still apply, sequenced after SP7)
- **CLAUDE.md:** the in-repo architecture summary; gets updated at SP7 close-out
