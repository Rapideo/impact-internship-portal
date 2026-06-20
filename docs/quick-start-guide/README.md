# Quick Start & Testing Guide

A branded, ~10-page onboarding PDF for the program team, styled to match the app
(navy/cyan/gold tokens, Archivo Black + IBM Plex). The deliverable is
**`IMPACT-Portal-Quick-Start-Guide.pdf`**.

## Files

| File | Purpose |
| --- | --- |
| `IMPACT-Portal-Quick-Start-Guide.pdf` | The deliverable. Open / print / share this. |
| `quick-start-guide.html` | Source document (edit copy + layout here). |
| `screenshots/` | App screenshots captured from staging, embedded by the HTML. |
| `capture.ts` | Playwright script that logs into staging and (re)captures the screenshots. |
| `render.ts` | Playwright script that renders the HTML to the PDF (US Letter + footer). |

## Regenerate

Both scripts run with the repo's existing Playwright + Chromium — no extra deps.

```bash
# 1. (Only if you want fresh screenshots) re-capture from a populated env.
#    Defaults to a deploy-preview URL pointed at impact-dev; override as needed:
BASE_URL=https://<your-test-build>.netlify.app npx tsx docs/quick-start-guide/capture.ts

# 2. Render the PDF (uses the committed screenshots — no live env required).
npx tsx docs/quick-start-guide/render.ts
```

Editing copy or layout only needs step 2; the committed screenshots make the PDF
reproducible offline.

## Notes

- Screenshots come from **staging (impact-dev)**, which is seeded with demo data —
  never from production.
- The "Test URL" on page 2 is intentionally a placeholder ("Shared with your
  invite") because deploy-preview links rotate. Set it to whatever durable test
  link the team should use before sharing, then re-run `render.ts`.
