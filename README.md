# IMPACT Internship Assessment Portal

Production web app for the IMPACT internship program. See `PRD.md` for product
requirements and `docs/superpowers/specs/` for design specs.

## Repo layout

- `Prototypes/PROTOTYPE/` — locked design source-of-truth (static HTML/CSS/JS demo)
- `app/` — production React Router v7 app
- `db/` — Drizzle schema, migrations, seeds
- `tests/` — Vitest unit tests, RLS policy tests, Playwright e2e
- `docs/` — specs, plans, deployment notes

## Local dev

```bash
npm install
cp .env.example .env.local  # then edit with your Supabase + Resend keys
npm run db:push             # apply schema to your dev Supabase project
npm run db:apply-policies   # apply RLS policies
npm run db:seed             # seed dev data
npm run admin:create -- --email=you@example.com --password=<temp>
npm run dev                 # open http://localhost:5173
```

## Tests

```bash
npm run lint
npm run typecheck
npm test          # Vitest unit
npm run test:e2e  # Playwright
```

## Deployment

Deployed to Netlify. See `docs/deployment.md`.
