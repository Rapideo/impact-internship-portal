# Deployment & CI/CD Overview

A plain-language explainer of how code gets from a developer's laptop to the
live IMPACT Internship Assessment Portal. Written for readers who are new to
modern managed-infrastructure pipelines. Complements `docs/deployment.md`
(which covers the legacy prototype site and Supabase email-template setup).

> **TL;DR:** Open a PR → robots test it and build a preview → merge to `main` →
> it auto-deploys live to production. The pipeline automates **code**; it does
> **not** touch the **database** — schema migrations, RLS policies, and seeds
> are applied manually, per environment.

## The cast of characters

Four managed services work together. None of them is "the server" in the
old sense:

| System | Role | Think of it as… |
| --- | --- | --- |
| **GitHub** (`Rapideo/impact-internship-portal`) | Source of truth for code | The filing cabinet + the trigger for everything |
| **GitHub Actions** | **CI** — runs tests automatically | The quality inspector |
| **Netlify** (`impact-portal-app`) | **CD** — builds & hosts the live app | The publisher + the web host |
| **Supabase** (impact-dev / impact-prod) | Database + auth + login | The backend (data + user accounts) |

**CI = Continuous Integration** (automatically test every change).
**CD = Continuous Deployment** (automatically ship changes that pass).

## The environments

| Environment | Runtime | Database | Used for |
| --- | --- | --- | --- |
| **Local** | `npm run dev` on your machine | impact-**dev** | Coding |
| **Preview** ("remote testing") | Netlify preview URLs | impact-**dev** | Reviewing a PR before merge |
| **Production** | `impact-portal-app.netlify.app` | impact-**prod** | Real users |
| **CI** (ephemeral) | Throwaway Docker Postgres on the test runner | its own temp DB | The automated test suite only |

**Key fact:** local + preview share the **same impact-dev database**. Only
production is isolated (impact-prod). So "preview" is not a clean room — it is
the dev database with a public URL.

> Aside: an older Netlify site, `impact-internship-portal.netlify.app`, hosts
> the static **prototype** from a different repo (`Rapideo/impact-prototype`).
> It is legacy and unrelated to the live app — don't confuse the two.

## The pipeline, step by step

```
1. Branch        git checkout -b feat/my-change
                 (never commit straight to main — it is protected)
        │
2. Commit        Husky git hooks run automatically on commit:
                 • format + lint changed code (lint-staged)
                 • enforce commit message style (Conventional Commits)
        │
3. Push + PR     git push, then open a Pull Request to main
        │
        ├──►  CI (GitHub Actions) runs 5 jobs:
        │       • Sanity checks         • Lint & Typecheck
        │       • Unit tests            • Integration + RLS tests (real Postgres)
        │       • Playwright (browser end-to-end tests)
        │     Branch protection BLOCKS merge until these pass.
        │
        └──►  Netlify builds a PREVIEW deploy (against impact-dev)
              → a unique URL to click through and review
        │
4. Review        Check the preview + green CI
        │
5. Merge         "Squash and merge" the PR into main
        │
6. Production    Netlify auto-rebuilds from main (against impact-prod)
   (AUTOMATIC)   → live at impact-portal-app.netlify.app within ~1 min
```

**The "approval" is merging the PR.** There is no separate button to push to
prod — merging `main` deploys live automatically. (A manual publish gate can be
added; see "Optional safety valve" below.)

The preview is a **separate build**, not "promoted" to prod: the preview is
built from the PR branch with the **impact-dev** env; on merge, Netlify does a
fresh build from `main` with the **impact-prod** env. Same commit, different
build against a different database.

## What's automatic vs. manual — the part that surprises people

CI/CD automates **code**. It does **not** touch the **database**.

| Action | Automatic? | Who does it |
| --- | --- | --- |
| Run tests on a PR | ✅ Automatic | GitHub Actions |
| Build a preview | ✅ Automatic | Netlify (on PR) |
| Deploy code to prod | ✅ Automatic | Netlify (on merge to main) |
| **Apply DB schema changes (migrations)** | ❌ **Manual** | A person, per environment |
| **Apply RLS security policies** | ❌ **Manual** | A person, per environment |
| **Seed reference data** | ❌ **Manual** | A person, per environment |
| Create login accounts | ❌ Manual | A person (`npm run admin:create`) |
| Set environment variables / secrets | ❌ Manual | A person (Netlify + Supabase dashboards) |

The Netlify build only runs `npm run build` — it **never runs migrations**.
When a future PR includes a database schema change, after merging, someone must
manually run the migration against impact-prod, or the live app will break
against an out-of-date database. The manual prod commands (run from a machine
with the prod env loaded) are:

```bash
npm run db:migrate          # apply schema changes
npm run db:apply-policies   # apply RLS policies (idempotent)
npm run db:seed-prod        # idempotent reference-data seed
npm run admin:create -- --email=<email> --password=<pw>
```

## Where secrets & config live

There is no `.env` file on a server. Config lives in three places, **scoped per
environment**:

- **Local:** `.env.local` on your machine (gitignored) → impact-dev values.
- **Netlify:** environment variables set **per context** — `production` context
  (impact-prod values) and `deploy-preview` context (impact-dev values).
- **Supabase dashboard:** auth config that isn't an app env var — the JWT
  access-token hook toggle, the Site URL + Redirect URLs, email/SMTP settings.

Setting a variable does not apply retroactively — a **new deploy** must run for
the app to pick it up.

## Rolling back a bad deploy

Every deploy is saved, so rollback is instant (no rebuild):

- Netlify → **Deploys** → find the last good deploy → **"Publish deploy."** It
  becomes live immediately.

## Optional safety valve: manual publish gate

By default, production **auto-publishes** the moment you merge to `main`. For a
human checkpoint, Netlify can **lock auto-publishing**: builds still run on
merge, but they sit as "ready, unpublished" until someone clicks **Publish
deploy**. This adds a manual gate without affecting previews or CI. Configured
in Netlify → Site configuration → Build & deploy → Continuous deployment.

## Conventions enforced by the pipeline

- **Branch naming:** `feat/`, `fix/`, `chore/`, `docs/`, `test/`, `refactor/`.
- **Conventional Commits:** subject ≤ 72 chars; body lines ≤ 100 chars
  (enforced by commitlint via a Husky `commit-msg` hook).
- **Branch protection on `main`:** no direct pushes; squash-merge PRs only; the
  CI workflow is a required check.

## Glossary

- **Deploy / build:** producing the runnable site from source code.
- **Context (Netlify):** which environment a build targets (`production` vs
  `deploy-preview`), each with its own env vars.
- **Migration:** a versioned change to the database schema (tables/columns).
- **RLS (Row-Level Security):** Postgres rules that scope which rows each user
  can read/write — the app's core permission layer.
- **Seed:** inserting baseline reference data into a fresh database.
