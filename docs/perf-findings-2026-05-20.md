# Performance findings — first-pass baseline (2026-05-20)

Lighthouse 13.3.0, headless Chrome, mobile profile, against the deployed draft preview `https://6a0d196d36fd6796c43eab84--impact-portal-app.netlify.app/login`. Raw output in `test-results/lh-login.json`. Build size data from `npm run build` in this session.

## Lighthouse scores

| Category | Score |
|---|---|
| **Performance** | **67 / 100** ← improvable |
| **Accessibility** | 91 / 100 (matches axe baseline; see `a11y-findings-2026-05-20.md`) |
| **Best practices** | 92 / 100 |
| **SEO** | 45 / 100 ← low, but low-priority for an internal tool |

## Core Web Vitals (deployed `/login`)

| Metric | Value | Verdict |
|---|---|---|
| First Contentful Paint | 2.3 s | borderline (good ≤ 1.8s) |
| **Largest Contentful Paint** | **8.0 s** | **POOR** (good ≤ 2.5s, poor > 4s) |
| Total Blocking Time | 0 ms | excellent |
| Cumulative Layout Shift | 0 | perfect |
| Speed Index | 6.2 s | needs improvement |
| Time to Interactive | 8.0 s | needs improvement |

CLS is zero, TBT is zero — the runtime JS layer is healthy. The whole problem is **resource transfer time**: LCP and SI both bottleneck on the same culprit.

## Finding 1 (the big one): 1.16 MB logo image

```
Resource summary (transfer size):
  Image       :  1,164,385 B  (87% of total payload)
  Script      :     92,081 B
  Font        :     70,257 B
  Third-party :     71,729 B
  Stylesheet  :     11,695 B
  Document    :      2,795 B
  TOTAL       :  1,341,991 B
```

One image accounts for **87% of the page weight** and is the LCP element. That's the IMPACT logo PNG tight-cropped from `References/IMPACT LOGO.png`. CLAUDE.md already flags this: *"The source has soft glow baked in; prefer a vector/SVG if one is provided later."*

**Recommended fix priority:** highest. Two practical paths:
1. **Replace with SVG** (best). Need the original vector from the brand owner. Drops image from ~1.16 MB to ~5-20 KB.
2. **Compress the PNG** (interim). The current asset is uncompressed-or-PNG24. Re-export at 2× display size as PNG8 with quantized palette, or convert to WebP. Typical compression ratio on a logo-style image: 50-100×. Should bring it under 50 KB even without going vector.

Expected impact: dropping a ~1 MB blocking image puts LCP comfortably under 2.5s and pushes Performance score from 67 → 90+ with no other changes.

## Finding 2: SEO score 45

Low priority for an internal-org tool (no public discovery, no marketing landing pages), but worth a quick sweep before launch:

- Missing meta descriptions on most routes.
- No `robots.txt`.
- Missing or empty `<title>` on `/login` (also flagged in a11y findings as `document-title`).

**Recommended fix priority:** low. Add meta descriptions to the 3-4 unauthenticated routes (`/login`, `/`, public auth pages) when you do the title sweep called out in `a11y-findings-2026-05-20.md`. Skip the rest.

## Build-output snapshot

From this session's `npm run build`:

```
build/client/assets/chunk-5KNZJZUH-C5KT4Zsz.js  129.12 KB │ gzip:  43.51 KB
build/client/assets/entry.client-BOnMM0N6.js    141.43 KB │ gzip:  45.79 KB
build/server/assets/server-build-C0TTaZKp.js    625.12 KB
build/server/server.js                            0.66 KB
build/server/assets/admin-CDaXjUQN.css           32.49 KB
build/server/assets/server-build-DDEBZMRi.css    17.52 KB
build/server/assets/auth-BUi-ILcH.css             4.69 KB
```

Client JS: **~270 KB raw / ~89 KB gzipped** before route-specific chunks. Reasonable for a RR v7 server-rendered app — no big icon library, no charting framework, no React-Query. The big admin.css at 32.5 KB carries the bulk of the design tokens; intentional.

**Server bundle at 625 KB** is on the larger side. Includes Drizzle, postgres-js, supabase-js, Sentry SDK, the entire route tree, email templates. Not a runtime concern (server runs once per cold start) but worth noting if cold-start latency on Netlify Functions becomes an issue post-launch.

## Recommended fix sequence

1. **Logo image swap** (~15 min). Either get an SVG from the brand owner or compress the PNG to under 50 KB. Re-run Lighthouse — expect Performance jump to 90+.
2. **Title + meta description sweep** (~20 min, paired with the a11y title work). Brings SEO from 45 → ~80 and resolves the a11y `document-title` finding at the same time.
3. **Re-run Lighthouse against the live production URL** once auto-deploy is wired and the production deploy is live. Numbers from a Netlify CDN-cached production URL will be substantially better than this draft preview run.

## Limitations of this baseline

- Only tested `/login` (unauthenticated). Real bottleneck routes (admin dashboard with KPI loads, interns table) need authenticated Lighthouse runs to measure server-loader cost.
- Single run, no statistical noise reduction. CWV scores in particular vary ±10% run-to-run; treat the 8.0s LCP as "between 7 and 9 seconds" not as an exact figure.
- Draft preview URL = unique-per-deploy URL on Netlify CDN. Production URL behavior may differ slightly (different cache headers, etc.).
- Lighthouse mobile profile (default) applies a 4× CPU slowdown + simulated slow 3G. Desktop scores would be substantially better; this is the conservative case.
