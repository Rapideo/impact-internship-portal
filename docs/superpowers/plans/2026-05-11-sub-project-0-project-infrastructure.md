# Sub-Project 0: Project Infrastructure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the development infrastructure that everything from sub-project 1 onward depends on — GitHub remote with branch protection, CI stub, Husky/commitlint/lint-staged, Netlify-GitHub integration, and a management-facing web page that explains the planned production rebuild.

**Architecture:** Sub-project 0 is mostly *not* code. Seven of the eight phases are repo migration, GitHub configuration, CI scaffolding, hook installation, and Netlify wiring — the kind of work that lives in `.github/`, `.husky/`, `package.json`, and external service UIs rather than in application source. The one substantial coding deliverable is Phase H's static management web page (`docs/dev-portal/`), a six-tab single-page HTML/CSS/JS artifact that inherits the prototype's design tokens and is published via GitHub Pages.

**Tech Stack:** Git + GitHub (org + private repo + branch protection + Pages); Netlify (auto-deploy + PR previews, project ID `65497097-8b5c-471e-a0c9-dc7ddea0fb2c`); Husky 9, commitlint 19, lint-staged 15; Dependabot; vanilla HTML/CSS/JS for the management page (Archivo Black + IBM Plex Sans + IBM Plex Mono, navy/cyan/gold/canvas palette lifted from the prototype).

**Spec:** `docs/superpowers/specs/2026-05-11-development-workflow-design.md`

**Working directory for all paths below:** `C:\Projects\impact-portal\` (after Phase A migration). Pre-migration paths reference the OneDrive copy explicitly when needed.

---

## File Structure

Sub-project 0 creates the following files. Files marked `(stub)` get filled in during sub-project 1; sub-project 0 creates only enough scaffolding to satisfy the spec's Definition of Done.

**`.github/` (Phase C + D):**
- `.github/PULL_REQUEST_TEMPLATE.md`
- `.github/CODEOWNERS`
- `.github/dependabot.yml`
- `.github/workflows/ci.yml` (stub — real stages added in sub-project 1)

**Repo root configuration (Phase F):**
- `package.json` (minimal — name/version/private/type/scripts/lint-staged config)
- `commitlint.config.js`
- `.husky/pre-commit`
- `.husky/commit-msg`
- `.gitignore` (modify — add Node + env + build entries)
- `.env.example`

**Management web page (Phase H):**
- `docs/dev-portal/index.html`
- `docs/dev-portal/styles.css`
- `docs/dev-portal/app.js`
- `docs/dev-portal/data/status.json`
- `docs/dev-portal/.nojekyll`
- `docs/index.html` (redirect bouncer to `docs/dev-portal/`)

**CLAUDE.md (Phase H.3):**
- `CLAUDE.md` (modify — add GitHub repo URL, dev-portal URL, post-migration local path)

---

## Pre-flight checklist (before Task 1)

The engineer/agent executing this plan needs:

1. **Git installed** — verify with `git --version` (any 2.40+ is fine).
2. **GitHub CLI installed and authenticated** — verify with `gh auth status`. Should show authenticated as Matt's GitHub user with `repo`, `admin:org`, and `workflow` scopes. If not: `gh auth login --scopes "repo,admin:org,workflow,read:user"`.
3. **SSH key registered with GitHub** — verify with `ssh -T git@github.com`. Should return `Hi <username>! You've successfully authenticated...`. If not: generate via `ssh-keygen -t ed25519 -C "matthew.smith@rapideo.com"` and add via `gh ssh-key add ~/.ssh/id_ed25519.pub --title "impact-portal-dev"`.
4. **Node.js 22.x LTS installed** — verify with `node --version` (should output `v22.x.x`). Phase F installs Husky/commitlint via npm; no Node code runs until then.
5. **Netlify CLI installed and authenticated** — verify with `netlify status`. Should show logged in as `matthew-smith` with the `impact-internship-portal` site listed.
6. **PowerShell session** — Phase A uses PowerShell commands. On Windows 11 the default `pwsh` or `powershell` shell is fine; commands below use cross-shell-compatible quoting where possible but assume PowerShell.
7. **The OneDrive copy is checked-in and clean** — `cd "C:\Users\matts\OneDrive - Koehler Partners\Projects\IMPACT\Internship Assessment\IMPACT Intretnship Assessment Portal"; git status` must show `working tree clean` before Phase A starts.

---

## Phase A: Repo migration (OneDrive → `C:\Projects\impact-portal\`)

The OneDrive-to-non-synced move is the single highest-risk step of sub-project 0. OneDrive can sync files mid-write, corrupting `.git/index` or leaving partial refs. The procedure below clones via Git (not file copy) so we walk the object database rather than touch the working tree, then verifies head SHA + commit count match before archiving the OneDrive copy. No PR is opened in Phase A — this is local + GitHub UI work that precedes the first push.

### Task 1: Verify the OneDrive copy is clean and record its head state

**Files:**
- N/A — verification only

- [ ] **Step 1: Open a PowerShell prompt in the OneDrive copy**

  ```powershell
  Set-Location "C:\Users\matts\OneDrive - Koehler Partners\Projects\IMPACT\Internship Assessment\IMPACT Intretnship Assessment Portal"
  ```

  Expected: prompt now shows the OneDrive repo path. `Get-Location` confirms.

- [ ] **Step 2: Confirm the working tree is clean**

  ```powershell
  git status
  ```

  Expected: `On branch master` and `nothing to commit, working tree clean`. If there are uncommitted changes, **stop**. Commit or stash them in a separate session before proceeding — Phase A cannot run with a dirty tree.

- [ ] **Step 3: Record the head SHA**

  ```powershell
  $headSha = git rev-parse HEAD
  Write-Output "Head SHA: $headSha"
  ```

  Expected: prints a 40-character SHA. Copy it into a scratch note — Task 3 verifies the new clone matches.

- [ ] **Step 4: Record the commit count**

  ```powershell
  $commitCount = (git log --oneline | Measure-Object -Line).Lines
  Write-Output "Commit count: $commitCount"
  ```

  Expected: prints a positive integer (per CLAUDE.md, currently 23+). Note this value for Task 3.

- [ ] **Step 5: Spot-check three known files for later content comparison**

  ```powershell
  Get-FileHash "CLAUDE.md" -Algorithm SHA256 | Select-Object -ExpandProperty Hash
  Get-FileHash "Prototypes/PROTOTYPE/index.html" -Algorithm SHA256 | Select-Object -ExpandProperty Hash
  Get-FileHash "docs/superpowers/specs/2026-05-11-development-workflow-design.md" -Algorithm SHA256 | Select-Object -ExpandProperty Hash
  ```

  Expected: three SHA-256 hashes. Note all three — Task 3 re-hashes the cloned copies and compares.

### Task 2: Clone the OneDrive copy to `C:\Projects\impact-portal\`

**Files:**
- N/A — `git clone` operation only

- [ ] **Step 1: Ensure the target parent directory exists**

  ```powershell
  if (-not (Test-Path "C:\Projects")) { New-Item -ItemType Directory -Path "C:\Projects" | Out-Null }
  Write-Output "C:\Projects exists: $(Test-Path 'C:\Projects')"
  ```

  Expected: prints `C:\Projects exists: True`.

- [ ] **Step 2: Ensure no prior `impact-portal` directory exists at the target**

  ```powershell
  Test-Path "C:\Projects\impact-portal"
  ```

  Expected: `False`. If `True`, **stop** and resolve manually (rename or delete the existing directory).

- [ ] **Step 3: Clone via Git**

  ```powershell
  git clone "C:\Users\matts\OneDrive - Koehler Partners\Projects\IMPACT\Internship Assessment\IMPACT Intretnship Assessment Portal" "C:\Projects\impact-portal"
  ```

  Expected: `Cloning into 'C:\Projects\impact-portal'...` followed by `done.` with no errors. Git walks the OneDrive copy's object database and writes a fresh `.git/` at the destination, sidestepping any in-flight OneDrive locks on the working tree.

- [ ] **Step 4: Switch into the new clone**

  ```powershell
  Set-Location "C:\Projects\impact-portal"
  Get-Location
  ```

  Expected: prompt now shows `C:\Projects\impact-portal`.

### Task 3: Verify the new clone matches the OneDrive copy byte-for-byte

**Files:**
- N/A — verification only

- [ ] **Step 1: Verify head SHA matches Task 1 Step 3**

  ```powershell
  git rev-parse HEAD
  ```

  Expected: prints the same 40-character SHA recorded in Task 1 Step 3. If different, **stop** — the clone is incomplete or referencing a different state.

- [ ] **Step 2: Verify commit count matches Task 1 Step 4**

  ```powershell
  (git log --oneline | Measure-Object -Line).Lines
  ```

  Expected: prints the same integer recorded in Task 1 Step 4.

- [ ] **Step 3: Verify the working tree is clean**

  ```powershell
  git status
  ```

  Expected: `On branch master` and `nothing to commit, working tree clean`. Git clone never leaves uncommitted changes; a dirty status here would indicate filesystem-level corruption during the clone.

- [ ] **Step 4: Re-hash the three spot-check files and compare**

  ```powershell
  Get-FileHash "CLAUDE.md" -Algorithm SHA256 | Select-Object -ExpandProperty Hash
  Get-FileHash "Prototypes/PROTOTYPE/index.html" -Algorithm SHA256 | Select-Object -ExpandProperty Hash
  Get-FileHash "docs/superpowers/specs/2026-05-11-development-workflow-design.md" -Algorithm SHA256 | Select-Object -ExpandProperty Hash
  ```

  Expected: all three hashes match the values recorded in Task 1 Step 5. Mismatch on any one means **stop** and re-clone.

- [ ] **Step 5: Verify the remote points back at the OneDrive copy (temporary state)**

  ```powershell
  git remote -v
  ```

  Expected: `origin` points to `C:\Users\matts\OneDrive - Koehler Partners\Projects\IMPACT\Internship Assessment\IMPACT Intretnship Assessment Portal`. This is correct for now — Phase B rewires `origin` to GitHub.

---

## Phase B: GitHub org + repo creation, push, and `master` → `main` rename

This phase creates the Rapideo GitHub organization (if it doesn't exist), creates the private `impact-internship-portal` repo inside it, points the new clone's `origin` at GitHub via SSH, pushes the full history, and renames the default branch from `master` to `main` both locally and on GitHub. No PR is opened — all work is direct push to a new, unprotected repo.

### Task 4: Verify (or create) the Rapideo GitHub organization

**Files:**
- N/A — GitHub UI work via `gh`

- [ ] **Step 1: Check whether the `rapideo` org already exists**

  ```bash
  gh api orgs/rapideo --jq '.login'
  ```

  Expected (case A — org exists): prints `rapideo`. Skip to Step 3.

  Expected (case B — org does not exist): exit status non-zero, error `Not Found`. Continue to Step 2.

- [ ] **Step 2: If the org does not exist, create it via the GitHub UI**

  GitHub does not support org creation via the API/CLI for free accounts. Open `https://github.com/account/organizations/new` in a browser:
  - Organization name: `rapideo`
  - Contact email: `matthew.smith@rapideo.com`
  - Plan: Free
  - This organization belongs to: My personal account (or business, per Matt's preference)

  Skip the "invite members" step (we add seats as needed later). Skip the "tell us about your organization" survey.

- [ ] **Step 3: Re-verify the org is now reachable via `gh`**

  ```bash
  gh api orgs/rapideo --jq '.login'
  ```

  Expected: prints `rapideo`.

- [ ] **Step 4: Verify Matt has admin rights**

  ```bash
  gh api orgs/rapideo/memberships/@me --jq '.role'
  ```

  Expected: prints `admin`. If `member`, the org was created under a different account — re-create or update membership before continuing.

### Task 5: Create the `impact-internship-portal` private repo inside the org

**Files:**
- N/A — GitHub repo creation via `gh`

- [ ] **Step 1: Create the repo via `gh`**

  From `C:\Projects\impact-portal`:

  ```bash
  gh repo create rapideo/impact-internship-portal --private --description "IMPACT Internship Assessment Portal — production rebuild" --homepage "https://impact-internship-portal.netlify.app"
  ```

  Expected: prints `https://github.com/rapideo/impact-internship-portal` and exits 0. The repo is created empty (no README, no license, no `.gitignore` — those land in our existing history).

- [ ] **Step 2: Verify the repo exists and is private**

  ```bash
  gh repo view rapideo/impact-internship-portal --json visibility,name,owner --jq '"\(.owner.login)/\(.name) visibility=\(.visibility)"'
  ```

  Expected: prints `rapideo/impact-internship-portal visibility=PRIVATE`.

### Task 6: Rewire local `origin` to point at GitHub via SSH

**Files:**
- N/A — git remote operation

- [ ] **Step 1: Remove the current `origin` (which still points at OneDrive)**

  ```powershell
  git remote remove origin
  git remote -v
  ```

  Expected: `git remote -v` prints nothing (no remotes).

- [ ] **Step 2: Add the GitHub SSH remote**

  ```powershell
  git remote add origin git@github.com:rapideo/impact-internship-portal.git
  git remote -v
  ```

  Expected: prints two lines, both for `origin` pointing at `git@github.com:rapideo/impact-internship-portal.git` (fetch + push).

- [ ] **Step 3: Verify SSH reachability**

  ```powershell
  ssh -T git@github.com
  ```

  Expected: `Hi <github-username>! You've successfully authenticated, but GitHub does not provide shell access.` Non-zero exit is normal for `ssh -T` — the message is what matters.

### Task 7: Push existing history to GitHub on `master`

**Files:**
- N/A — push operation

- [ ] **Step 1: Push `master` and set upstream**

  ```powershell
  git push -u origin master
  ```

  Expected: enumerated objects, deltas resolved, branch tracking established. Final line: `Branch 'master' set up to track remote branch 'master' from 'origin'.`

- [ ] **Step 2: Verify on GitHub via `gh`**

  ```bash
  gh api repos/rapideo/impact-internship-portal/branches/master --jq '"\(.name) head=\(.commit.sha)"'
  ```

  Expected: prints `master head=<the SHA recorded in Task 1 Step 3>`. SHA mismatch means the push was incomplete.

### Task 8: Rename `master` → `main` locally and on GitHub

**Files:**
- N/A — branch rename operation

- [ ] **Step 1: Rename the local branch**

  ```powershell
  git branch -m master main
  git branch -vv
  ```

  Expected: shows a single branch `main` (no `master`). The upstream `[origin/master]` reference will appear stale — Step 3 fixes it.

- [ ] **Step 2: Push the renamed branch**

  ```powershell
  git push -u origin main
  ```

  Expected: `* [new branch] main -> main` and `Branch 'main' set up to track remote branch 'main' from 'origin'.`

- [ ] **Step 3: Update the default branch on GitHub**

  ```bash
  gh api -X PATCH repos/rapideo/impact-internship-portal --field default_branch=main --jq '.default_branch'
  ```

  Expected: prints `main`.

- [ ] **Step 4: Delete the obsolete `master` branch on GitHub**

  ```bash
  gh api -X DELETE repos/rapideo/impact-internship-portal/git/refs/heads/master
  ```

  Expected: exits 0 with no output. The remote `master` ref is removed.

- [ ] **Step 5: Prune the stale local tracking reference**

  ```powershell
  git fetch --prune
  git branch -a
  ```

  Expected: lists `main` and `remotes/origin/main` only. No `master` references remain locally or in the remote-tracking listing.

### Task 9: Verify final GitHub state

**Files:**
- N/A — verification only

- [ ] **Step 1: Confirm head SHA + commit count on GitHub match the original OneDrive copy**

  ```bash
  gh api repos/rapideo/impact-internship-portal/branches/main --jq '.commit.sha'
  gh api repos/rapideo/impact-internship-portal/commits --paginate --jq '.[].sha' | Measure-Object -Line
  ```

  Expected: first command prints the SHA from Task 1 Step 3. Second command's line count matches the commit count from Task 1 Step 4.

- [ ] **Step 2: Confirm the default branch is `main` and there is no `master`**

  ```bash
  gh api repos/rapideo/impact-internship-portal --jq '.default_branch'
  gh api repos/rapideo/impact-internship-portal/branches --jq '[.[].name]'
  ```

  Expected: first prints `main`. Second prints `["main"]` (single-element JSON array).

### Task 10: Archive the OneDrive copy in place

**Files:**
- N/A — folder rename

- [ ] **Step 1: Close any editor/terminal windows pointed at the OneDrive copy**

  VS Code workspaces, PowerShell sessions, and File Explorer windows can hold filesystem locks on Windows. Close them. Confirm by listing PowerShell sessions with `Get-Process powershell, pwsh -ErrorAction SilentlyContinue`.

- [ ] **Step 2: Rename the OneDrive folder**

  ```powershell
  Set-Location "C:\Users\matts\OneDrive - Koehler Partners\Projects\IMPACT\Internship Assessment"
  Rename-Item -Path "IMPACT Intretnship Assessment Portal" -NewName "IMPACT Intretnship Assessment Portal _archived_2026-05-11"
  Get-ChildItem -Filter "IMPACT*"
  ```

  Expected: the renamed folder appears in the listing. The old name is gone. The rename alone is enough to break editor/terminal "recent files" auto-reopen — we do not delete; deletion happens after a two-week soak.

---

## Phase C: First PR — `.github/` scaffolding

This is the first PR in the new GitHub repo. Branch protection is not yet enabled (Phase E does that), so this PR demonstrates the workflow without requiring CI to pass. It seeds `.github/` with three files: a PR template, a CODEOWNERS file, and a Dependabot config.

### Task 11: Create branch `chore/github-scaffolding`

**Files:**
- N/A — branch creation

- [ ] **Step 1: Confirm we are on `main` and up to date**

  ```powershell
  Set-Location "C:\Projects\impact-portal"
  git checkout main
  git pull --ff-only origin main
  git status
  ```

  Expected: `On branch main`, `Your branch is up to date with 'origin/main'`, working tree clean.

- [ ] **Step 2: Create and switch to the feature branch**

  ```powershell
  git checkout -b chore/github-scaffolding
  ```

  Expected: `Switched to a new branch 'chore/github-scaffolding'`.

### Task 12: Create `.github/PULL_REQUEST_TEMPLATE.md`

**Files:**
- Create: `.github/PULL_REQUEST_TEMPLATE.md`

- [ ] **Step 1: Ensure the `.github/` directory exists**

  ```powershell
  if (-not (Test-Path ".github")) { New-Item -ItemType Directory -Path ".github" | Out-Null }
  Test-Path ".github"
  ```

  Expected: prints `True`.

- [ ] **Step 2: Create `.github/PULL_REQUEST_TEMPLATE.md` with the spec's verbatim template**

  ```markdown
  ## What changed

  <!-- One-paragraph plain-language summary of the change. -->

  ## Why

  <!-- Link the issue, the spec section, or the plan task this PR implements. -->

  - Spec section: <!-- e.g., §2.7 -->
  - Plan task(s): <!-- e.g., Sub-project 1 Phase B Tasks 7–11 -->
  - Issue: <!-- closes #N, if applicable -->

  ## How it was verified

  - [ ] CI is green
  - [ ] Local tests pass
  - [ ] Manually tested the affected flow(s)
  - [ ] Deploy preview URL loads and behaves as expected

  ## Screenshots / preview link

  <!-- Drop the Netlify deploy preview URL here. Add screenshots for visible UI changes. -->

  ## Notes for the reviewer

  <!-- Anything worth flagging: known gaps, follow-ups, decisions deferred. -->

  ## Conventional Commits

  - [ ] The merge commit subject line follows `<type>(<scope>): <subject>` (the squash-merge default)
  - [ ] Any `BREAKING CHANGE` is noted in the merge commit body
  ```

- [ ] **Step 3: Verify the file is on disk**

  ```powershell
  Test-Path ".github/PULL_REQUEST_TEMPLATE.md"
  Get-Content ".github/PULL_REQUEST_TEMPLATE.md" | Select-Object -First 3
  ```

  Expected: `True`, then the first three lines: `## What changed`, blank line, `<!-- One-paragraph plain-language summary of the change. -->`.

### Task 13: Create `.github/CODEOWNERS`

**Files:**
- Create: `.github/CODEOWNERS`

- [ ] **Step 1: Create the file**

  ```
  # CODEOWNERS — single owner for now (Matt). Production-rebuild planning is
  # solo until a second contributor joins. Branch protection does not require
  # code-owner review at this stage (spec §8); this file exists for clarity
  # and as a hook for later enforcement.

  * @matthew-smith
  ```

  **NOTE for Matt:** the username `@matthew-smith` is a placeholder. Before opening the PR, replace it with your actual GitHub username. Find it with `gh api user --jq '.login'` from a shell where `gh` is authenticated.

- [ ] **Step 2: Replace the placeholder with the real GitHub username**

  ```bash
  $githubUser = gh api user --jq '.login'
  (Get-Content ".github/CODEOWNERS") -replace '@matthew-smith', "@$githubUser" | Set-Content ".github/CODEOWNERS"
  Get-Content ".github/CODEOWNERS"
  ```

  Expected: the last line reads `* @<your-actual-username>`. If the username comes back wrong (e.g., the `gh` CLI is logged in as a different account), re-run `gh auth status` and re-authenticate before proceeding.

### Task 14: Create `.github/dependabot.yml`

**Files:**
- Create: `.github/dependabot.yml`

- [ ] **Step 1: Create the file**

  ```yaml
  version: 2
  updates:
    - package-ecosystem: npm
      directory: "/"
      schedule:
        interval: daily
        time: "06:00"
        timezone: America/Indiana/Indianapolis
      open-pull-requests-limit: 5
      commit-message:
        prefix: chore
        prefix-development: chore
        include: scope
      labels:
        - dependencies
        - tech-debt
      groups:
        minor-and-patch:
          update-types:
            - minor
            - patch

    - package-ecosystem: github-actions
      directory: "/"
      schedule:
        interval: daily
        time: "06:00"
        timezone: America/Indiana/Indianapolis
      open-pull-requests-limit: 5
      commit-message:
        prefix: ci
        include: scope
      labels:
        - dependencies
        - ci
  ```

  Two ecosystems: `npm` (kicks in once `package.json` lands in Phase F) and `github-actions` (kicks in once `ci.yml` lands in Phase D). Daily 06:00 Indianapolis-time schedule keeps the PR firehose predictable. Minor/patch are grouped to reduce noise; major bumps stay individual.

- [ ] **Step 2: Verify the file is on disk and parseable as YAML**

  ```powershell
  Test-Path ".github/dependabot.yml"
  Get-Content ".github/dependabot.yml" | Select-Object -First 5
  ```

  Expected: `True`, then `version: 2`, blank line, `updates:`, `  - package-ecosystem: npm`, `    directory: "/"`.

### Task 15: Commit, push, and open the PR

**Files:**
- N/A — git + gh operations

- [ ] **Step 1: Stage and commit**

  ```powershell
  git add .github/PULL_REQUEST_TEMPLATE.md .github/CODEOWNERS .github/dependabot.yml
  git status
  git commit -m "chore(github): add PR template, CODEOWNERS, and Dependabot config"
  ```

  Expected: `git status` shows three new files staged. Commit succeeds with the Conventional Commits-formatted subject.

- [ ] **Step 2: Push the branch**

  ```powershell
  git push -u origin chore/github-scaffolding
  ```

  Expected: `Branch 'chore/github-scaffolding' set up to track remote branch 'chore/github-scaffolding' from 'origin'.`

- [ ] **Step 3: Open the PR via `gh`**

  ```bash
  gh pr create --base main --head chore/github-scaffolding --title "chore(github): add PR template, CODEOWNERS, and Dependabot config" --body "## What changed

  Seeds \`.github/\` with the three scaffolding files defined in sub-project 0 Phase C of the development workflow spec:

  - \`PULL_REQUEST_TEMPLATE.md\` — verbatim from spec §2.4.
  - \`CODEOWNERS\` — single owner (Matt) until a second contributor joins.
  - \`dependabot.yml\` — daily npm + github-actions updates, minor/patch grouped.

  ## Why

  - Spec section: §2.4, §2.6, §2.12
  - Plan task(s): Sub-project 0 Phase C Tasks 11–15

  ## How it was verified

  - [x] Files render correctly in the GitHub PR diff view
  - [ ] CI is green — N/A (CI workflow lands in Phase D)
  - [x] Manually inspected each file

  ## Notes for the reviewer

  Branch protection is not yet enabled; this PR is mergeable without a status check. Phase D adds the CI stub, Phase E enables protection."
  ```

  Expected: prints the PR URL (e.g., `https://github.com/rapideo/impact-internship-portal/pull/1`). Note the PR number.

- [ ] **Step 4: Verify the PR is open**

  ```bash
  gh pr view --json number,state,title,headRefName --jq '"#\(.number) [\(.state)] \(.title) (branch: \(.headRefName))"'
  ```

  Expected: prints `#1 [OPEN] chore(github): add PR template, CODEOWNERS, and Dependabot config (branch: chore/github-scaffolding)`.

### Task 16: Squash-merge the PR

**Files:**
- N/A — merge operation

- [ ] **Step 1: Merge via squash**

  ```bash
  gh pr merge --squash --delete-branch --subject "chore(github): add PR template, CODEOWNERS, and Dependabot config"
  ```

  Expected: PR merged, head branch deleted both locally (if `gh` auto-pulls) and on GitHub.

- [ ] **Step 2: Pull `main` locally and confirm the squash commit landed**

  ```powershell
  git checkout main
  git pull --ff-only origin main
  git log -1 --oneline
  ```

  Expected: top commit on `main` is the squashed `chore(github): add PR template, CODEOWNERS, and Dependabot config`. Working tree clean.

- [ ] **Step 3: Confirm the feature branch is gone**

  ```powershell
  git branch -a
  ```

  Expected: only `main` and `remotes/origin/main`. If a stale local `chore/github-scaffolding` lingers, delete with `git branch -D chore/github-scaffolding`.

---

## Phase D: Second PR — CI workflow stub

This adds `.github/workflows/ci.yml` with placeholder jobs that pass unconditionally. The workflow's `name:` is `ci` so when Phase E configures branch protection to require the `ci` status check, the name matches. Real stages (lint, typecheck, tests, build) get filled in during sub-project 1's Foundation phases.

### Task 17: Create branch `chore/ci-workflow-stub`

**Files:**
- N/A — branch creation

- [ ] **Step 1: Confirm we are on `main` and up to date**

  ```powershell
  git checkout main
  git pull --ff-only origin main
  git status
  ```

  Expected: `On branch main`, `Your branch is up to date with 'origin/main'`, working tree clean.

- [ ] **Step 2: Create and switch to the feature branch**

  ```powershell
  git checkout -b chore/ci-workflow-stub
  ```

  Expected: `Switched to a new branch 'chore/ci-workflow-stub'`.

### Task 18: Create `.github/workflows/ci.yml`

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Ensure the workflows directory exists**

  ```powershell
  if (-not (Test-Path ".github/workflows")) { New-Item -ItemType Directory -Path ".github/workflows" | Out-Null }
  Test-Path ".github/workflows"
  ```

  Expected: prints `True`.

- [ ] **Step 2: Create the workflow file**

  ```yaml
  name: ci

  on:
    pull_request:
      branches:
        - main
    push:
      branches:
        - main

  concurrency:
    group: ci-${{ github.ref }}
    cancel-in-progress: true

  jobs:
    sanity:
      name: Sanity checks (stub)
      runs-on: ubuntu-latest
      timeout-minutes: 5
      steps:
        - name: Check out the repo
          uses: actions/checkout@v4

        - name: Confirm required scaffolding files exist
          run: |
            test -f .github/PULL_REQUEST_TEMPLATE.md
            test -f .github/CODEOWNERS
            test -f .github/dependabot.yml
            test -f .github/workflows/ci.yml
            echo "All scaffolding files present."

        - name: Confirm README placeholder is not actually a TODO sentinel
          run: |
            if grep -RIn --include="*.md" -E "\\b(TODO|FIXME|XXX)\\b" .github/; then
              echo "Found TODO/FIXME/XXX markers in .github/ — fail to surface unfinished scaffolding."
              exit 1
            fi
            echo "No TODO/FIXME/XXX markers in .github/."

        - name: Stub for real CI stages
          run: |
            echo "CI stub passing. Real stages (lint, typecheck, vitest, playwright, build)"
            echo "are wired in during sub-project 1's Foundation phases."
  ```

  Notes on the stub:
  - `name: ci` matches the status-check name that Phase E will require.
  - Triggers on PRs targeting `main` and pushes to `main` — the full set per spec §2.7.
  - `concurrency` cancels superseded runs on the same ref to save CI minutes.
  - Three steps prove the workflow actually executes (not just queues): file-existence checks, a TODO-sentinel scan, and a final echo. All three pass for the current scaffolding.

- [ ] **Step 3: Verify the file is on disk**

  ```powershell
  Test-Path ".github/workflows/ci.yml"
  Get-Content ".github/workflows/ci.yml" | Select-Object -First 3
  ```

  Expected: `True`, then `name: ci`, blank line, `on:`.

### Task 19: Commit, push, open the PR, and watch CI run

**Files:**
- N/A — git + gh operations

- [ ] **Step 1: Stage and commit**

  ```powershell
  git add .github/workflows/ci.yml
  git commit -m "ci(workflow): add stub workflow with sanity checks"
  ```

  Expected: one new file committed with the `ci` Conventional Commits type.

- [ ] **Step 2: Push and open the PR**

  ```powershell
  git push -u origin chore/ci-workflow-stub
  ```

  ```bash
  gh pr create --base main --head chore/ci-workflow-stub --title "ci(workflow): add stub workflow with sanity checks" --body "## What changed

  Adds \`.github/workflows/ci.yml\` — a stub CI workflow that runs on PRs to \`main\` and pushes to \`main\`. The job verifies the Phase C scaffolding files exist and scans \`.github/\` for stray TODO/FIXME/XXX markers. Real stages (lint, typecheck, Vitest, Playwright, build) get wired up during sub-project 1's Foundation phases.

  The workflow's \`name:\` is \`ci\` so Phase E can require it as a status check by that name.

  ## Why

  - Spec section: §2.7
  - Plan task(s): Sub-project 0 Phase D Tasks 17–19

  ## How it was verified

  - [ ] CI is green on this PR (this PR is the first real test)
  - [x] Manually inspected the workflow YAML

  ## Notes for the reviewer

  This PR is the first to actually exercise GitHub Actions on this repo. Watch the Actions tab for the run; once green, the stub is ready to be required by branch protection in Phase E."
  ```

  Expected: prints the PR URL.

- [ ] **Step 3: Watch the workflow run on the PR**

  ```bash
  gh pr checks --watch
  ```

  Expected: the `ci / Sanity checks (stub)` check resolves to success within ~30 seconds. If it fails, read the logs with `gh run view --log-failed` and fix before merging.

- [ ] **Step 4: Confirm the run is green**

  ```bash
  gh pr checks
  ```

  Expected: a single `ci / Sanity checks (stub)` row with status `pass`.

### Task 20: Squash-merge the PR

**Files:**
- N/A — merge operation

- [ ] **Step 1: Merge via squash**

  ```bash
  gh pr merge --squash --delete-branch --subject "ci(workflow): add stub workflow with sanity checks"
  ```

  Expected: PR merged. Note that this push to `main` re-triggers the workflow on `main` itself (per `on.push.branches: [main]`); confirm it also passes.

- [ ] **Step 2: Confirm CI ran on `main` after the merge**

  ```bash
  gh run list --branch main --limit 1 --json status,conclusion,name --jq '.[0]'
  ```

  Expected: `{"status":"completed","conclusion":"success","name":"ci"}`. If still running, wait ~30s and re-run.

- [ ] **Step 3: Pull `main` locally**

  ```powershell
  git checkout main
  git pull --ff-only origin main
  git log -1 --oneline
  ```

  Expected: top commit on `main` is the squashed `ci(workflow): add stub workflow with sanity checks`.

---

## Phase E: Branch protection on `main` + GitHub Secrets

This phase configures branch protection on `main` (spec §2.9) and seeds GitHub Secrets with placeholder values for sub-project 1 to fill in (spec §2.11). All work is GitHub UI / `gh api`; no PR is opened. The final verification step deliberately tries to push directly to `main` and expects the push to be rejected.

### Task 21: Configure branch protection on `main`

**Files:**
- N/A — GitHub branch protection via `gh api`

- [ ] **Step 1: Apply the branch protection rules**

  ```bash
  gh api -X PUT repos/rapideo/impact-internship-portal/branches/main/protection \
    --input - <<'JSON'
  {
    "required_status_checks": {
      "strict": true,
      "contexts": ["ci / Sanity checks (stub)"]
    },
    "enforce_admins": true,
    "required_pull_request_reviews": {
      "dismiss_stale_reviews": true,
      "require_code_owner_reviews": false,
      "required_approving_review_count": 0,
      "require_last_push_approval": false
    },
    "restrictions": null,
    "required_linear_history": true,
    "allow_force_pushes": false,
    "allow_deletions": false,
    "required_conversation_resolution": true,
    "lock_branch": false,
    "allow_fork_syncing": false,
    "block_creations": false,
    "required_signatures": false
  }
  JSON
  ```

  Rule-by-rule mapping to spec §2.9:
  - `required_status_checks.contexts: ["ci / Sanity checks (stub)"]` — requires the CI check by its full job display name.
  - `required_status_checks.strict: true` — the branch must be up to date with `main` before merging.
  - `enforce_admins: true` — admins are not bypassed; matches spec "admin bypass disabled by default".
  - `required_pull_request_reviews.required_approving_review_count: 0` — solo work; AI + self-review covers the spec's review requirement without forcing a second account.
  - `required_pull_request_reviews.dismiss_stale_reviews: true` — any approval is dismissed when new commits push.
  - `required_linear_history: true` — forces squash or rebase merges. We use squash.
  - `allow_force_pushes: false` and `allow_deletions: false` — `main` cannot be force-pushed or deleted.
  - `required_conversation_resolution: true` — open conversations block merge.
  - `required_signatures: false` — unnecessary friction for solo work; revisit if other devs join (spec §2.9).

- [ ] **Step 2: Verify the rules are applied**

  ```bash
  gh api repos/rapideo/impact-internship-portal/branches/main/protection --jq '{
    contexts: .required_status_checks.contexts,
    strict: .required_status_checks.strict,
    enforce_admins: .enforce_admins.enabled,
    linear_history: .required_linear_history.enabled,
    force_pushes: .allow_force_pushes.enabled,
    deletions: .allow_deletions.enabled,
    conversation_resolution: .required_conversation_resolution.enabled,
    signatures: .required_signatures.enabled
  }'
  ```

  Expected JSON:
  ```json
  {
    "contexts": ["ci / Sanity checks (stub)"],
    "strict": true,
    "enforce_admins": true,
    "linear_history": true,
    "force_pushes": false,
    "deletions": false,
    "conversation_resolution": true,
    "signatures": false
  }
  ```

### Task 22: Seed GitHub Secrets with placeholder values

**Files:**
- N/A — `gh secret set` operations

- [ ] **Step 1: Set each secret to a placeholder value**

  Run these one at a time; each command prompts for confirmation that the secret is set:

  ```bash
  gh secret set DATABASE_URL --body "placeholder-set-during-sub-project-1" --repo rapideo/impact-internship-portal
  gh secret set SUPABASE_URL --body "placeholder-set-during-sub-project-1" --repo rapideo/impact-internship-portal
  gh secret set SUPABASE_ANON_KEY --body "placeholder-set-during-sub-project-1" --repo rapideo/impact-internship-portal
  gh secret set SUPABASE_SERVICE_ROLE_KEY --body "placeholder-set-during-sub-project-1" --repo rapideo/impact-internship-portal
  gh secret set SESSION_SECRET --body "placeholder-set-during-sub-project-1" --repo rapideo/impact-internship-portal
  gh secret set RESEND_API_KEY --body "placeholder-set-during-sub-project-1" --repo rapideo/impact-internship-portal
  gh secret set SENTRY_DSN --body "placeholder-set-during-sub-project-1" --repo rapideo/impact-internship-portal
  gh secret set SENTRY_AUTH_TOKEN --body "placeholder-set-during-sub-project-1" --repo rapideo/impact-internship-portal
  gh secret set NETLIFY_AUTH_TOKEN --body "placeholder-set-during-sub-project-1" --repo rapideo/impact-internship-portal
  ```

  Each command's expected output: `✓ Set Actions secret <NAME> for rapideo/impact-internship-portal`.

- [ ] **Step 2: Verify all nine secrets exist**

  ```bash
  gh secret list --repo rapideo/impact-internship-portal
  ```

  Expected: nine rows, one for each secret name listed above, all with "Updated <today>" timestamps.

### Task 23: Verify branch protection by attempting a direct push

**Files:**
- N/A — verification only (no code committed)

- [ ] **Step 1: Make a trivial local change on `main` and try to push**

  ```powershell
  git checkout main
  git pull --ff-only origin main
  # Append a harmless trailing newline to the README (or any tracked file) to create a commit.
  Add-Content -Path ".github/CODEOWNERS" -Value "`n# end of file"
  git add .github/CODEOWNERS
  git commit -m "chore(probe): branch-protection probe — should be rejected"
  git push origin main
  ```

  Expected: the push fails with an error like:

  ```
  remote: error: GH006: Protected branch update failed for refs/heads/main.
  remote: error: Changes must be made through a pull request.
  To github.com:rapideo/impact-internship-portal.git
   ! [remote rejected] main -> main (protected branch hook declined)
  error: failed to push some refs to 'github.com:rapideo/impact-internship-portal.git'
  ```

  This is the success condition. The push was rejected by the protection rule.

- [ ] **Step 2: Reset the local probe commit**

  ```powershell
  git reset --hard origin/main
  git status
  git log -1 --oneline
  ```

  Expected: working tree clean. `git log` shows the squashed `ci(workflow): add stub workflow with sanity checks` commit at HEAD — the probe commit is gone.

- [ ] **Step 3: Confirm `main` on GitHub is unchanged**

  ```bash
  gh api repos/rapideo/impact-internship-portal/branches/main --jq '.commit.commit.message'
  ```

  Expected: prints the message of the most recent merged PR (the CI stub PR), not the probe commit message.

---

## Phase F: Third PR — Husky + commitlint + lint-staged + minimal `package.json`

This phase installs the pre-commit + commit-msg hook chain so all future commits are auto-formatted and validated for Conventional Commits format. `package.json` lands here in minimal form (no app dependencies yet — those are sub-project 1's job). ESLint/Prettier are referenced by lint-staged but not installed; sub-project 1 wires them in.

### Task 24: Create branch `chore/husky-commitlint-lint-staged`

**Files:**
- N/A — branch creation

- [ ] **Step 1: Confirm we are on `main` and up to date**

  ```powershell
  git checkout main
  git pull --ff-only origin main
  git status
  ```

  Expected: `On branch main`, clean, up to date.

- [ ] **Step 2: Create the feature branch**

  ```powershell
  git checkout -b chore/husky-commitlint-lint-staged
  ```

  Expected: `Switched to a new branch 'chore/husky-commitlint-lint-staged'`.

### Task 25: Initialize and trim `package.json`

**Files:**
- Create: `package.json`

- [ ] **Step 1: Initialize via `npm init -y`**

  ```powershell
  npm init -y
  ```

  Expected: creates `package.json` with default fields. Output ends with the generated JSON pretty-printed.

- [ ] **Step 2: Replace the generated `package.json` with the minimal form**

  Open `package.json` and replace its contents with:

  ```json
  {
    "name": "impact-internship-portal",
    "version": "0.1.0",
    "private": true,
    "type": "module",
    "description": "IMPACT Internship Assessment Portal — production rebuild scaffolding (sub-project 0 baseline).",
    "engines": {
      "node": ">=22.0.0"
    },
    "scripts": {
      "prepare": "husky"
    },
    "lint-staged": {
      "*.{ts,tsx,js,jsx}": [
        "echo '[lint-staged] Prettier + ESLint wired in sub-project 1 — currently no-op.'"
      ],
      "*.css": [
        "echo '[lint-staged] Prettier for CSS wired in sub-project 1 — currently no-op.'"
      ],
      "*.md": [
        "echo '[lint-staged] Prettier for Markdown wired in sub-project 1 — currently no-op.'"
      ]
    }
  }
  ```

  Notes:
  - `private: true` prevents accidental `npm publish`.
  - `type: module` aligns with sub-project 1's ESM-by-default config.
  - The only script is `prepare`, which `npm install` invokes to set up Husky hooks.
  - The `lint-staged` config references Prettier + ESLint via `echo` placeholders so the hook *runs* but does nothing destructive; sub-project 1 replaces the echoes with real commands.

- [ ] **Step 3: Verify the file parses as JSON**

  ```powershell
  Get-Content "package.json" -Raw | ConvertFrom-Json | Select-Object -ExpandProperty name
  ```

  Expected: prints `impact-internship-portal`. If `ConvertFrom-Json` errors, the JSON is malformed.

### Task 26: Install Husky, commitlint, and lint-staged

**Files:**
- Modify: `package.json` (adds `devDependencies`)
- Create: `package-lock.json`

- [ ] **Step 1: Install the dev dependencies**

  ```powershell
  npm install --save-dev husky@^9 @commitlint/cli@^19 @commitlint/config-conventional@^19 lint-staged@^15
  ```

  Expected: installs four packages plus transitive deps. `package.json` now has a `devDependencies` block with all four entries.

- [ ] **Step 2: Verify the installs**

  ```powershell
  npm ls husky @commitlint/cli @commitlint/config-conventional lint-staged
  ```

  Expected: all four packages list at top level with concrete versions (Husky 9.x, commitlint 19.x, lint-staged 15.x).

- [ ] **Step 3: Confirm `package-lock.json` was generated**

  ```powershell
  Test-Path "package-lock.json"
  ```

  Expected: `True`.

### Task 27: Initialize Husky and create `.husky/commit-msg`

**Files:**
- Create: `.husky/pre-commit` (created by `husky init`, then modified)
- Create: `.husky/commit-msg`

- [ ] **Step 1: Run `husky init`**

  ```powershell
  npx husky init
  ```

  Expected: creates `.husky/pre-commit` with a default `npm test` placeholder line and configures `package.json`'s `prepare` script (which we already pre-set). Husky also adds `core.hooksPath = .husky/_` via the install side-effect.

- [ ] **Step 2: Replace `.husky/pre-commit` with the lint-staged invocation**

  Open `.husky/pre-commit` and replace its contents with exactly:

  ```sh
  npx lint-staged
  ```

  (No shebang and no other lines — Husky 9 expects the hook file to contain only the command(s) to run.)

- [ ] **Step 3: Create `.husky/commit-msg`**

  Create `.husky/commit-msg` with exactly:

  ```sh
  npx --no -- commitlint --edit $1
  ```

  The `--no` flag prevents `npx` from auto-installing commitlint if missing — it should already be installed locally via Task 26; missing-package is a fail condition we want surfaced.

- [ ] **Step 4: Verify both hook files exist and have the right contents**

  ```powershell
  Get-Content ".husky/pre-commit"
  Get-Content ".husky/commit-msg"
  ```

  Expected: `.husky/pre-commit` prints `npx lint-staged`. `.husky/commit-msg` prints `npx --no -- commitlint --edit $1`.

### Task 28: Create `commitlint.config.js`

**Files:**
- Create: `commitlint.config.js`

- [ ] **Step 1: Create the file**

  ```js
  /** @type {import('@commitlint/types').UserConfig} */
  export default {
    extends: ['@commitlint/config-conventional'],
    rules: {
      // Subject line ≤ 72 chars per spec §2.5.
      'header-max-length': [2, 'always', 72],
      // Body wrap at 100 chars per spec §2.5.
      'body-max-line-length': [2, 'always', 100],
      // Allowed types per spec §2.5.
      'type-enum': [
        2,
        'always',
        [
          'feat',
          'fix',
          'chore',
          'docs',
          'test',
          'refactor',
          'style',
          'perf',
          'build',
          'ci',
          'revert',
        ],
      ],
    },
  };
  ```

  Notes:
  - File uses ESM syntax (`export default`) because `package.json`'s `type: module` makes `.js` files ESM by default.
  - `2` is commitlint's "error" severity (1 = warn, 0 = disable).
  - The `type-enum` list mirrors spec §2.5 verbatim.

- [ ] **Step 2: Verify the file parses by running commitlint against a known-good message**

  ```powershell
  "feat(scaffolding): test commitlint pickup" | npx --no -- commitlint
  ```

  Expected: exits 0 with no output. (Commitlint prints nothing on success.)

- [ ] **Step 3: Verify the file rejects a known-bad message**

  ```powershell
  "this is not a conventional commit" | npx --no -- commitlint
  ```

  Expected: exits non-zero with errors listing missing-type and missing-subject-format problems.

### Task 29: Update `.gitignore` for Node + env

**Files:**
- Modify: `.gitignore`

- [ ] **Step 1: Read the current `.gitignore`**

  ```powershell
  Get-Content ".gitignore"
  ```

  Expected: the prototype-era ignores (`.netlify/`, possibly some editor entries). Note what is already present so we don't duplicate.

- [ ] **Step 2: Append the new entries**

  Append the following block to the end of `.gitignore` (use `Add-Content` or open in an editor):

  ```
  # ---- sub-project 0: Node + build + env ----
  # Node
  node_modules/
  npm-debug.log*
  .pnpm-debug.log*
  yarn-debug.log*
  yarn-error.log*

  # Build output (sub-project 1+)
  /build/
  /.react-router/
  /dist/

  # Env files (committed only as .env.example)
  .env
  .env.local
  .env.*.local
  !.env.example

  # Test artifacts (sub-project 1+)
  /coverage/
  /playwright-report/
  /test-results/
  /playwright/.cache/

  # Editor
  .vscode/*
  !.vscode/extensions.json
  !.vscode/settings.json
  .idea/
  *.swp

  # OS
  .DS_Store
  Thumbs.db
  ```

- [ ] **Step 3: Verify `node_modules/` is now untracked**

  ```powershell
  git status --short node_modules 2>$null
  git check-ignore -v node_modules
  ```

  Expected: `git status` shows no `node_modules/` entries. `git check-ignore -v` confirms the path is ignored by a rule in `.gitignore`.

### Task 30: Create `.env.example`

**Files:**
- Create: `.env.example`

- [ ] **Step 1: Create the file with all secret placeholders from spec §2.11**

  ```
  # IMPACT Internship Assessment Portal — environment variables
  # Copy this file to `.env.local` (gitignored) and fill in real values.
  # CI uses GitHub Secrets (set in repo settings); production uses Netlify env vars.

  # ---- Database ----
  # Drizzle / postgres-js connection string (direct, not pooler).
  # Format: postgresql://postgres:<password>@db.<ref>.supabase.co:5432/postgres
  DATABASE_URL=placeholder-set-during-sub-project-1

  # ---- Supabase ----
  # Project URL (https://<ref>.supabase.co).
  SUPABASE_URL=placeholder-set-during-sub-project-1
  # Public, client-readable.
  SUPABASE_ANON_KEY=placeholder-set-during-sub-project-1
  # SERVER-ONLY — bypasses RLS. Never expose to the browser.
  # Only used in app/lib/db.service.server.ts (the `.server.ts` suffix prevents client bundling).
  SUPABASE_SERVICE_ROLE_KEY=placeholder-set-during-sub-project-1

  # ---- Session ----
  # HMAC signing for the intern identity cookie (sub-project 4).
  # Generate a fresh 32-byte hex string for each environment.
  SESSION_SECRET=placeholder-set-during-sub-project-1

  # ---- Email (Resend) ----
  # Transactional email — password reset, employer provisioning (sub-project 6).
  RESEND_API_KEY=placeholder-set-during-sub-project-1

  # ---- Observability (Sentry) ----
  # Error tracking endpoint.
  SENTRY_DSN=placeholder-set-during-sub-project-1
  # Source-map upload during build.
  SENTRY_AUTH_TOKEN=placeholder-set-during-sub-project-1

  # ---- Netlify (optional; not used by CI yet) ----
  NETLIFY_AUTH_TOKEN=placeholder-set-during-sub-project-1
  ```

- [ ] **Step 2: Verify the file is on disk**

  ```powershell
  Test-Path ".env.example"
  (Get-Content ".env.example" | Measure-Object -Line).Lines
  ```

  Expected: `True`, and the line count is in the 30s (matching the file above plus comments).

### Task 31: Commit, push, open the PR, watch CI, and merge

**Files:**
- N/A — git + gh operations

- [ ] **Step 1: Stage and commit**

  ```powershell
  git add package.json package-lock.json commitlint.config.js .husky/pre-commit .husky/commit-msg .gitignore .env.example
  git status
  git commit -m "chore(hooks): add Husky, commitlint, lint-staged + minimal package.json"
  ```

  Expected: a single commit with the seven files staged. Note that the `commit-msg` hook runs against *this* commit message — and the message is Conventional Commits-compliant, so it passes.

- [ ] **Step 2: Push and open the PR**

  ```powershell
  git push -u origin chore/husky-commitlint-lint-staged
  ```

  ```bash
  gh pr create --base main --head chore/husky-commitlint-lint-staged --title "chore(hooks): add Husky, commitlint, lint-staged + minimal package.json" --body "## What changed

  Installs the pre-commit hook chain defined in spec §2.10:

  - \`package.json\` — minimal (name, version, private, type=module, engines, prepare script, lint-staged config).
  - \`.husky/pre-commit\` — runs \`npx lint-staged\`.
  - \`.husky/commit-msg\` — runs commitlint against the staged message.
  - \`commitlint.config.js\` — extends \`@commitlint/config-conventional\` with the allowed type list and header/body length rules from spec §2.5.
  - \`.gitignore\` — extended with Node + build + env + editor entries.
  - \`.env.example\` — placeholder values for the nine secrets enumerated in spec §2.11.

  ESLint + Prettier are referenced by the lint-staged config via placeholder \`echo\` commands; sub-project 1 wires in the real linters.

  ## Why

  - Spec section: §2.5, §2.10, §2.11
  - Plan task(s): Sub-project 0 Phase F Tasks 24–31

  ## How it was verified

  - [ ] CI is green on this PR
  - [x] \`npx commitlint\` accepts \`feat(scope): subject\` locally (Task 28 Step 2)
  - [x] \`npx commitlint\` rejects \`this is not a conventional commit\` locally (Task 28 Step 3)
  - [x] \`git status\` shows \`node_modules/\` is ignored (Task 29 Step 3)

  ## Notes for the reviewer

  After merge, Task 32 verifies the hook chain end-to-end with a deliberately bad commit message on a throwaway branch."
  ```

- [ ] **Step 3: Watch CI**

  ```bash
  gh pr checks --watch
  ```

  Expected: `ci / Sanity checks (stub)` passes. The stub workflow doesn't run npm install, so installing Husky has no effect on CI yet — the workflow only checks file existence + TODO markers.

- [ ] **Step 4: Squash-merge**

  ```bash
  gh pr merge --squash --delete-branch --subject "chore(hooks): add Husky, commitlint, lint-staged + minimal package.json"
  ```

  Expected: PR merged, branch deleted.

- [ ] **Step 5: Pull `main` locally**

  ```powershell
  git checkout main
  git pull --ff-only origin main
  git log -1 --oneline
  ```

  Expected: top commit is the squashed PR.

### Task 32: Local verification — deliberate bad commit message is rejected

**Files:**
- N/A — verification only

- [ ] **Step 1: Reinstall hooks after the merge**

  Husky hooks are configured via `core.hooksPath`, which lives in `.git/config` (not committed). After pulling `main`, re-run `npm install` to ensure the `prepare` script re-binds the hook path:

  ```powershell
  npm install
  git config --get core.hooksPath
  ```

  Expected: `git config --get core.hooksPath` prints `.husky/_` (Husky 9's hook directory).

- [ ] **Step 2: Create a throwaway branch and stage a trivial change**

  ```powershell
  git checkout -b chore/probe-commitlint
  Add-Content -Path ".env.example" -Value "# commit-message probe — discarded after Task 32"
  git add .env.example
  ```

- [ ] **Step 3: Attempt a commit with a non-conforming message**

  ```powershell
  git commit -m "this is not a conventional commit"
  ```

  Expected: the commit is **rejected** by the `commit-msg` hook with output similar to:

  ```
  ⧗   input: this is not a conventional commit
  ✖   subject may not be empty [subject-empty]
  ✖   type may not be empty [type-empty]

  ✖   found 2 problems, 0 warnings
  ```

  Exit code is non-zero. No commit is created (`git log` HEAD is unchanged).

- [ ] **Step 4: Reset the probe**

  ```powershell
  git reset HEAD .env.example
  git checkout -- .env.example
  git checkout main
  git branch -D chore/probe-commitlint
  git status
  ```

  Expected: working tree clean, on `main`, throwaway branch deleted.

---

## Phase G: Netlify-GitHub integration

This phase wires the existing Netlify project (`impact-internship-portal`, ID `65497097-8b5c-471e-a0c9-dc7ddea0fb2c`, account `matthew-smith`) to the new GitHub repo. Production-deploy on `main` keeps publishing `Prototypes/PROTOTYPE/` (the cutover to the production app's `build/client/` is sub-project 6's job). PR deploy previews are enabled and verified with a throwaway test PR. Environment variables are seeded with placeholders matching the GitHub Secrets list.

### Task 33: Disconnect any existing manual deploy config

**Files:**
- N/A — Netlify UI work

- [ ] **Step 1: Open the Netlify project's Build & deploy settings**

  Open `https://app.netlify.com/sites/impact-internship-portal/configuration/deploys`.

- [ ] **Step 2: Verify the current state**

  Confirm what's currently configured:
  - Build settings → "Repository for continuous deployment" — likely empty / not connected (per CLAUDE.md the prototype was deployed without a GitHub link).
  - Build settings → Build command — empty.
  - Build settings → Publish directory — `Prototypes/PROTOTYPE` (per sub-project 1 plan Task 5).

  If a previous Git provider is connected (e.g., a personal-account GitHub link), record what it is, then **disconnect** it via "Manage repository → Unlink repository". This is a one-time cleanup; the next task re-links to the new org repo.

### Task 34: Connect Netlify to the new GitHub repo

**Files:**
- N/A — Netlify UI work

- [ ] **Step 1: Initiate the GitHub connection**

  In the same Netlify Build & deploy settings page, click "Link repository → GitHub". Netlify opens the GitHub OAuth flow.

- [ ] **Step 2: Authorize Netlify for the `rapideo` org**

  In the GitHub OAuth screen, when prompted "Where do you want to install Netlify?", select the **`rapideo`** organization (not Matt's personal account). Grant access to the single repo `impact-internship-portal` (the principle-of-least-access option; "All repositories" also works but is broader than needed).

- [ ] **Step 3: Select the repo in Netlify**

  Back in Netlify, the picker now lists `rapideo/impact-internship-portal`. Select it.

- [ ] **Step 4: Confirm the build config**

  Netlify will offer to overwrite the build settings with values from a `netlify.toml` (if any). Accept the existing config:
  - Branch to deploy: `main`
  - Build command: (empty)
  - Publish directory: `Prototypes/PROTOTYPE`

  These match the prototype's current deploy. Sub-project 6 changes the publish directory to `build/client/`.

- [ ] **Step 5: Save**

  Click "Deploy site" (Netlify uses this label even when the site already exists; it just saves + triggers an initial deploy from the new source).

- [ ] **Step 6: Verify the deploy succeeds**

  Watch the "Deploys" tab. The new auto-deploy run should appear within 30 seconds, complete in under 90 seconds, and show "Published". The live URL `https://impact-internship-portal.netlify.app` should continue to serve the prototype unchanged.

### Task 35: Configure deploy previews on PRs

**Files:**
- N/A — Netlify UI work

- [ ] **Step 1: Open Build & deploy → Deploy contexts**

  In the same Netlify site settings, scroll to "Deploy contexts" or open `https://app.netlify.com/sites/impact-internship-portal/configuration/deploys#deploy-contexts`.

- [ ] **Step 2: Enable deploy previews for PRs**

  Settings to confirm or set:
  - "Deploy Previews" → **All pull requests** (not "None" and not "Only PRs from collaborators"; we want auto-preview on every PR).
  - Deploy preview branches: default (none restricted).

- [ ] **Step 3: Enable the GitHub commit-status integration**

  Open "Build & deploy → Continuous Deployment → GitHub". Ensure "Pull request comments" and "Commit statuses" are both enabled. This is what posts the deploy preview URL as a PR comment.

### Task 36: Set Netlify environment variables (placeholders)

**Files:**
- N/A — Netlify UI work

- [ ] **Step 1: Open Site configuration → Environment variables**

  `https://app.netlify.com/sites/impact-internship-portal/configuration/env`.

- [ ] **Step 2: Add the same nine variables as GitHub Secrets, with placeholder values**

  Click "Add a variable" for each. Use the same names + placeholder body as Task 22:

  | Key | Value |
  |---|---|
  | `DATABASE_URL` | `placeholder-set-during-sub-project-1` |
  | `SUPABASE_URL` | `placeholder-set-during-sub-project-1` |
  | `SUPABASE_ANON_KEY` | `placeholder-set-during-sub-project-1` |
  | `SUPABASE_SERVICE_ROLE_KEY` | `placeholder-set-during-sub-project-1` |
  | `SESSION_SECRET` | `placeholder-set-during-sub-project-1` |
  | `RESEND_API_KEY` | `placeholder-set-during-sub-project-1` |
  | `SENTRY_DSN` | `placeholder-set-during-sub-project-1` |
  | `SENTRY_AUTH_TOKEN` | `placeholder-set-during-sub-project-1` |
  | `NETLIFY_AUTH_TOKEN` | `placeholder-set-during-sub-project-1` |

  Scopes: leave default (`Builds`, `Functions`, `Runtime`). Contexts: leave default (all deploy contexts).

- [ ] **Step 3: Verify all nine variables exist**

  Refresh the page. Confirm a 9-row table is visible. If the Netlify CLI is preferred:

  ```bash
  netlify env:list --site impact-internship-portal
  ```

  Expected: prints a 9-row table with the names above.

### Task 37: Open a throwaway test PR and verify the preview URL is posted

**Files:**
- N/A — verification PR (created and discarded)

- [ ] **Step 1: Create a probe branch with a trivial change**

  ```powershell
  git checkout main
  git pull --ff-only origin main
  git checkout -b chore/probe-netlify-preview
  Add-Content -Path ".github/CODEOWNERS" -Value "`n# netlify preview probe — to be discarded"
  git add .github/CODEOWNERS
  git commit -m "chore(probe): verify Netlify deploy preview wiring"
  git push -u origin chore/probe-netlify-preview
  ```

  Expected: branch pushed; the `commit-msg` hook accepted the conventional message; the `pre-commit` hook's no-op echoes ran.

- [ ] **Step 2: Open the PR**

  ```bash
  gh pr create --base main --head chore/probe-netlify-preview --title "chore(probe): verify Netlify deploy preview wiring" --body "Probe PR to verify the Netlify-GitHub integration posts a deploy preview comment. Will be closed without merging."
  ```

  Expected: prints the PR URL.

- [ ] **Step 3: Wait for Netlify to post the preview comment**

  Within ~60 seconds of PR open, Netlify's bot posts a comment to the PR with a "Deploy preview ready!" message and a URL like `https://deploy-preview-N--impact-internship-portal.netlify.app`. Watch via:

  ```bash
  gh pr view --comments
  ```

  Expected: a comment from `netlify[bot]` appears with the preview URL.

- [ ] **Step 4: Open the preview URL in a browser**

  Click or copy the URL. Confirm it loads the prototype's landing page (`Prototypes/PROTOTYPE/index.html`). Spot-check that navigation to a couple of admin pages works.

- [ ] **Step 5: Close the PR without merging and delete the branch**

  ```bash
  gh pr close chore/probe-netlify-preview --delete-branch --comment "Probe complete — closing without merge. Netlify deploy preview wiring confirmed."
  ```

  Expected: PR closed, branch deleted on GitHub.

- [ ] **Step 6: Clean up the local branch and reset the probe change**

  ```powershell
  git checkout main
  git pull --ff-only origin main
  git branch -D chore/probe-netlify-preview
  git status
  ```

  Expected: clean tree on `main`. The probe edit to `.github/CODEOWNERS` never landed on `main` (it only existed on the closed branch).

---

## Phase H: Management web page (3 sub-PRs)

The management-facing web page (`docs/dev-portal/`) is sub-project 0's one substantial coding deliverable. It's a static six-tab single-page HTML site that reuses the prototype's design tokens and is published via GitHub Pages.

Three sub-PRs:
- **H.1** (`feat/dev-portal-foundation`) — scaffold, shell, tab routing, status.json stub. No tab content yet.
- **H.2** (`feat/dev-portal-content`) — populate all six tabs with their content.
- **H.3** (`chore/github-pages-deploy`) — turn on GitHub Pages, add `.nojekyll`, add the bare-URL redirect, polish, update CLAUDE.md.

### Phase H.1 — Foundation PR (`feat/dev-portal-foundation`)

This PR scaffolds the file tree, builds the page shell (header / nav / six empty sections / footer), copies design tokens, wires tab routing, and seeds `status.json` with the seven sub-projects. No tab content yet.

#### Task 38: Create branch `feat/dev-portal-foundation`

**Files:**
- N/A — branch creation

- [ ] **Step 1: Confirm we are on `main` and up to date**

  ```powershell
  git checkout main
  git pull --ff-only origin main
  git status
  ```

  Expected: `On branch main`, clean, up to date.

- [ ] **Step 2: Create the feature branch**

  ```powershell
  git checkout -b feat/dev-portal-foundation
  ```

  Expected: `Switched to a new branch 'feat/dev-portal-foundation'`.

#### Task 39: Scaffold the `docs/dev-portal/` file tree

**Files:**
- Create: `docs/dev-portal/` (directory)
- Create: `docs/dev-portal/data/` (directory)

- [ ] **Step 1: Create the directories**

  ```powershell
  if (-not (Test-Path "docs/dev-portal")) { New-Item -ItemType Directory -Path "docs/dev-portal" | Out-Null }
  if (-not (Test-Path "docs/dev-portal/data")) { New-Item -ItemType Directory -Path "docs/dev-portal/data" | Out-Null }
  Get-ChildItem -Recurse -Directory "docs/dev-portal"
  ```

  Expected: lists `docs/dev-portal` and `docs/dev-portal/data`.

#### Task 40: Build `docs/dev-portal/index.html` shell

**Files:**
- Create: `docs/dev-portal/index.html`

- [ ] **Step 1: Create the file with the full shell**

  ```html
  <!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>IMPACT Internship Assessment Portal — Project Dashboard</title>
      <meta
        name="description"
        content="Management dashboard for the IMPACT Internship Assessment Portal production rebuild — phasing, stack, workflow, and live status."
      />
      <link rel="icon" type="image/png" href="../../Prototypes/PROTOTYPE/logo.png" />

      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Archivo+Black&family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap"
      />
      <link rel="stylesheet" href="styles.css" />
    </head>
    <body>
      <header class="portal-header">
        <div class="portal-header__inner container">
          <div class="portal-header__brand">
            <span class="portal-header__wordmark">IMPACT</span>
            <span class="portal-header__subtitle">Internship Assessment Portal</span>
          </div>
          <div class="portal-header__meta">
            <span class="portal-header__label">Project Dashboard</span>
            <span class="portal-header__date" id="last-updated">Updated 2026-05-11</span>
          </div>
        </div>
      </header>

      <nav class="portal-tabs" aria-label="Dashboard sections">
        <div class="portal-tabs__inner container">
          <button class="portal-tab" data-tab="overview" aria-controls="tab-overview">Overview</button>
          <button class="portal-tab" data-tab="phasing" aria-controls="tab-phasing">Phasing &amp; Timeline</button>
          <button class="portal-tab" data-tab="stack" aria-controls="tab-stack">Tech Stack</button>
          <button class="portal-tab" data-tab="supabase" aria-controls="tab-supabase">Supabase Deep-Dive</button>
          <button class="portal-tab" data-tab="workflow" aria-controls="tab-workflow">Workflow &amp; SDLC</button>
          <button class="portal-tab" data-tab="status" aria-controls="tab-status">Status</button>
        </div>
      </nav>

      <main class="portal-main container">
        <section id="tab-overview" class="portal-section" data-tab-panel="overview" aria-hidden="true"></section>
        <section id="tab-phasing" class="portal-section" data-tab-panel="phasing" aria-hidden="true"></section>
        <section id="tab-stack" class="portal-section" data-tab-panel="stack" aria-hidden="true"></section>
        <section id="tab-supabase" class="portal-section" data-tab-panel="supabase" aria-hidden="true"></section>
        <section id="tab-workflow" class="portal-section" data-tab-panel="workflow" aria-hidden="true"></section>
        <section id="tab-status" class="portal-section" data-tab-panel="status" aria-hidden="true"></section>
      </main>

      <footer class="portal-footer">
        <div class="portal-footer__inner container">
          <p class="portal-footer__line">
            IMPACT Internship Assessment Portal &middot; Production rebuild planning artifact
          </p>
          <p class="portal-footer__line portal-footer__line--muted">
            Built and maintained by Rapideo &middot;
            <a href="https://github.com/rapideo/impact-internship-portal">Repo</a>
          </p>
        </div>
      </footer>

      <script src="app.js"></script>
    </body>
  </html>
  ```

  Notes:
  - The `<head>` references the prototype's `logo.png` for favicon (via `../../Prototypes/PROTOTYPE/logo.png`). This is a relative path that works both locally and from GitHub Pages.
  - Six empty `<section>` elements correspond to the six tabs. H.2 fills them with content.
  - The `<header>` uses a wordmark (Archivo Black, navy) rather than the logo PNG, per CLAUDE.md's note "If a brand mark is needed on a light surface, use a typographic wordmark instead of the image."

- [ ] **Step 2: Verify the file is on disk and parses**

  ```powershell
  Test-Path "docs/dev-portal/index.html"
  (Get-Content "docs/dev-portal/index.html" | Measure-Object -Line).Lines
  ```

  Expected: `True`, line count in the 50-70 range.

#### Task 41: Build `docs/dev-portal/styles.css` foundation

**Files:**
- Create: `docs/dev-portal/styles.css`

- [ ] **Step 1: Create the file with tokens + base layout + tabs**

  ```css
  /* ============================================================
   * IMPACT dev-portal styles
   * Tokens cloned from Prototypes/PROTOTYPE/styles.css (single source
   * of truth is the prototype; this file mirrors so it can ship
   * standalone via GitHub Pages without dependency on the prototype dir).
   * ============================================================ */

  :root {
    /* Palette — sampled from the IMPACT logo */
    --navy: #153a98;
    --navy-deep: #051028;
    --cyan: #00a6f6;
    --gold: #ffd71f;
    --canvas: #eff1f5;

    /* Derived */
    --ink: #0d1430;
    --ink-muted: #4a5374;
    --line: #d6dbe6;
    --line-strong: #b3bbcd;
    --surface: #ffffff;
    --surface-dim: #f6f8fb;

    /* Status colors */
    --status-not-started: #94a3b8;
    --status-in-progress: var(--cyan);
    --status-complete: #16a34a;

    /* Typography */
    --font-display: 'Archivo Black', system-ui, sans-serif;
    --font-body: 'IBM Plex Sans', system-ui, sans-serif;
    --font-mono: 'IBM Plex Mono', ui-monospace, monospace;

    /* Spacing scale (4px base) */
    --space-1: 0.25rem;
    --space-2: 0.5rem;
    --space-3: 0.75rem;
    --space-4: 1rem;
    --space-5: 1.5rem;
    --space-6: 2rem;
    --space-7: 3rem;
    --space-8: 4rem;

    /* Radius */
    --radius-sm: 6px;
    --radius-md: 10px;
    --radius-lg: 16px;

    /* Shadow */
    --shadow-sm: 0 1px 2px rgba(5, 16, 40, 0.08);
    --shadow-md: 0 6px 18px rgba(5, 16, 40, 0.12);
  }

  /* ---- Reset ---- */
  *,
  *::before,
  *::after {
    box-sizing: border-box;
  }

  html {
    -webkit-text-size-adjust: 100%;
  }

  body {
    margin: 0;
    font-family: var(--font-body);
    color: var(--ink);
    background: var(--canvas);
    line-height: 1.55;
  }

  a {
    color: var(--navy);
    text-decoration-thickness: 1.5px;
    text-underline-offset: 2px;
  }

  a:hover {
    color: var(--cyan);
  }

  button {
    font: inherit;
    cursor: pointer;
  }

  /* ---- Container ---- */
  .container {
    width: 100%;
    max-width: 1240px;
    margin: 0 auto;
    padding-inline: var(--space-5);
  }

  /* ---- Header ---- */
  .portal-header {
    background: var(--navy-deep);
    color: #fff;
    padding-block: var(--space-5);
    border-bottom: 4px solid var(--gold);
  }

  .portal-header__inner {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: var(--space-5);
    flex-wrap: wrap;
  }

  .portal-header__brand {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .portal-header__wordmark {
    font-family: var(--font-display);
    font-size: 2rem;
    letter-spacing: 0.02em;
    color: #fff;
  }

  .portal-header__subtitle {
    font-family: var(--font-body);
    font-weight: 500;
    font-size: 0.95rem;
    color: rgba(255, 255, 255, 0.78);
  }

  .portal-header__meta {
    text-align: right;
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .portal-header__label {
    font-family: var(--font-mono);
    font-size: 0.8rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--gold);
  }

  .portal-header__date {
    font-family: var(--font-mono);
    font-size: 0.85rem;
    color: rgba(255, 255, 255, 0.78);
  }

  /* ---- Tabs ---- */
  .portal-tabs {
    background: var(--surface);
    border-bottom: 1px solid var(--line);
    position: sticky;
    top: 0;
    z-index: 10;
  }

  .portal-tabs__inner {
    display: flex;
    gap: var(--space-1);
    overflow-x: auto;
  }

  .portal-tab {
    background: transparent;
    border: none;
    padding: var(--space-4) var(--space-5);
    font-weight: 600;
    color: var(--ink-muted);
    border-bottom: 3px solid transparent;
    white-space: nowrap;
    transition: color 120ms, border-color 120ms;
  }

  .portal-tab:hover {
    color: var(--navy);
  }

  .portal-tab.is-active {
    color: var(--navy);
    border-bottom-color: var(--cyan);
  }

  .portal-tab:focus-visible {
    outline: 2px solid var(--cyan);
    outline-offset: -2px;
  }

  /* ---- Main + sections ---- */
  .portal-main {
    padding-block: var(--space-7);
  }

  .portal-section {
    display: none;
  }

  .portal-section.is-active {
    display: block;
  }

  .portal-section h1 {
    font-family: var(--font-display);
    font-size: 2rem;
    color: var(--navy);
    margin-block: 0 var(--space-3);
  }

  .portal-section h2 {
    font-family: var(--font-display);
    font-size: 1.4rem;
    color: var(--navy);
    margin-block: var(--space-7) var(--space-3);
  }

  .portal-section h3 {
    font-family: var(--font-body);
    font-weight: 700;
    font-size: 1.1rem;
    margin-block: var(--space-5) var(--space-2);
  }

  .portal-section p {
    margin-block: var(--space-3);
    max-width: 75ch;
  }

  /* ---- Footer ---- */
  .portal-footer {
    background: var(--navy-deep);
    color: rgba(255, 255, 255, 0.78);
    padding-block: var(--space-6);
    margin-top: var(--space-8);
  }

  .portal-footer__inner {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    text-align: center;
  }

  .portal-footer__line {
    margin: 0;
    font-size: 0.9rem;
  }

  .portal-footer__line--muted {
    color: rgba(255, 255, 255, 0.55);
    font-size: 0.85rem;
  }

  .portal-footer a {
    color: var(--gold);
  }

  /* ---- Print ---- */
  @media print {
    .portal-tabs,
    .portal-footer {
      display: none;
    }
    .portal-section {
      display: block !important;
      page-break-after: always;
    }
  }
  ```

- [ ] **Step 2: Verify the file is on disk**

  ```powershell
  Test-Path "docs/dev-portal/styles.css"
  (Get-Content "docs/dev-portal/styles.css" | Measure-Object -Line).Lines
  ```

  Expected: `True`, line count in the 190-240 range.

#### Task 42: Build `docs/dev-portal/app.js` with tab routing

**Files:**
- Create: `docs/dev-portal/app.js`

- [ ] **Step 1: Create the file**

  ```js
  /**
   * IMPACT dev-portal — tab routing and Status tab data loader.
   *
   * Tab state is persisted in the URL via ?tab=<slug> so individual tabs
   * are shareable links. The default tab is "overview" when no query is
   * present.
   *
   * No framework, no build step. Plain ES2020 modules-free script.
   */

  (function () {
    'use strict';

    const VALID_TABS = ['overview', 'phasing', 'stack', 'supabase', 'workflow', 'status'];
    const DEFAULT_TAB = 'overview';

    function getTabFromUrl() {
      const url = new URL(window.location.href);
      const t = url.searchParams.get('tab');
      return VALID_TABS.indexOf(t) !== -1 ? t : DEFAULT_TAB;
    }

    function setActiveTab(slug, options) {
      const opts = options || {};
      const pushHistory = opts.pushHistory !== false;
      if (VALID_TABS.indexOf(slug) === -1) {
        slug = DEFAULT_TAB;
      }

      document.querySelectorAll('.portal-tab').forEach(function (btn) {
        const isActive = btn.dataset.tab === slug;
        btn.classList.toggle('is-active', isActive);
        btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
      });

      document.querySelectorAll('.portal-section').forEach(function (section) {
        const isActive = section.dataset.tabPanel === slug;
        section.classList.toggle('is-active', isActive);
        section.setAttribute('aria-hidden', isActive ? 'false' : 'true');
      });

      if (pushHistory) {
        const url = new URL(window.location.href);
        url.searchParams.set('tab', slug);
        window.history.pushState({ tab: slug }, '', url.toString());
      }

      if (slug === 'status') {
        renderStatusTab();
      }

      // Reset scroll to the top of <main> when switching tabs.
      const main = document.querySelector('.portal-main');
      if (main) {
        main.scrollIntoView({ behavior: 'instant', block: 'start' });
      }
    }

    function wireTabs() {
      document.querySelectorAll('.portal-tab').forEach(function (btn) {
        btn.addEventListener('click', function () {
          setActiveTab(btn.dataset.tab);
        });
      });

      window.addEventListener('popstate', function (event) {
        const state = event.state || {};
        setActiveTab(state.tab || getTabFromUrl(), { pushHistory: false });
      });
    }

    /* ---- Status tab loader ---- */

    let statusLoaded = false;

    function renderStatusTab() {
      const panel = document.getElementById('tab-status');
      if (!panel) return;
      // Until H.2 lands, the panel is empty — there's nothing to render.
      // H.2's Status-tab task fills the inner markup and switches statusLoaded
      // to a real fetch + render. For H.1, this function is a placeholder
      // that intentionally does nothing.
      if (statusLoaded) return;
      statusLoaded = true;
    }

    /* ---- Boot ---- */

    document.addEventListener('DOMContentLoaded', function () {
      wireTabs();
      setActiveTab(getTabFromUrl(), { pushHistory: false });
    });
  })();
  ```

  Notes:
  - The script is wrapped in an IIFE — no module system, no bundler, no globals leaked beyond what `window` already has.
  - `renderStatusTab()` is intentionally a no-op stub in H.1. H.2's Status tab task replaces the function body with the real fetch + render code.
  - `popstate` handling supports the browser back/forward buttons.

- [ ] **Step 2: Verify the file is on disk**

  ```powershell
  Test-Path "docs/dev-portal/app.js"
  (Get-Content "docs/dev-portal/app.js" | Measure-Object -Line).Lines
  ```

  Expected: `True`, line count in the 65-90 range.

#### Task 43: Build `docs/dev-portal/data/status.json` stub

**Files:**
- Create: `docs/dev-portal/data/status.json`

- [ ] **Step 1: Create the file**

  ```json
  {
    "$schema-comment": "Sub-project status seed. Updated on milestone-close PRs per spec §2.13. Statuses: not-started | in-progress | complete. Counts are taken from the implementation plans committed under docs/superpowers/plans/.",
    "asOf": "2026-05-11",
    "subProjects": [
      {
        "id": 0,
        "name": "Project Infrastructure",
        "status": "in-progress",
        "taskCount": 52,
        "prCount": 6,
        "summary": "Repo migration, GitHub config, CI stub, hook chain, Netlify wiring, management dashboard."
      },
      {
        "id": 1,
        "name": "Foundation",
        "status": "not-started",
        "taskCount": 60,
        "prCount": 0,
        "summary": "RR v7 scaffold, Supabase project, Drizzle schema, RLS policies, dev seed, login routing."
      },
      {
        "id": 2,
        "name": "Admin Core",
        "status": "not-started",
        "taskCount": 37,
        "prCount": 0,
        "summary": "Admin shell, Settings (Employers / Cohorts / Roles / Phases / Barriers / Program Info), Interns CRUD."
      },
      {
        "id": 3,
        "name": "Question Engine",
        "status": "not-started",
        "taskCount": 38,
        "prCount": 0,
        "summary": "6 question-type renderers, set editor, 3-tier competency stitching, verbatim seed content."
      },
      {
        "id": 4,
        "name": "Assessment Forms",
        "status": "not-started",
        "taskCount": 31,
        "prCount": 0,
        "summary": "All 5 assessment forms on the engine, intern identity gate, anonymous submission via service role."
      },
      {
        "id": 5,
        "name": "Employer Shell",
        "status": "not-started",
        "taskCount": 38,
        "prCount": 0,
        "summary": "Employer login, scoped views, account provisioning, branded auth pages."
      },
      {
        "id": 6,
        "name": "Polish & Launch",
        "status": "not-started",
        "taskCount": 52,
        "prCount": 0,
        "summary": "Reports, branded emails, Sentry, e2e smoke, a11y, perf, Netlify cutover, launch."
      }
    ]
  }
  ```

  Note: the `taskCount` figures match the CLAUDE.md "256 tasks total" if you sum sub-projects 1–6 (60 + 37 + 38 + 31 + 38 + 52 = 256). Sub-project 0's count is this plan's task count and is updated at the end of Phase H.3 if the final count differs.

- [ ] **Step 2: Verify the file parses as JSON**

  ```powershell
  Get-Content "docs/dev-portal/data/status.json" -Raw | ConvertFrom-Json | Select-Object -ExpandProperty subProjects | Measure-Object
  ```

  Expected: prints a `Count: 7` row.

#### Task 44: Commit, push, open PR, watch CI, and merge (Phase H.1)

**Files:**
- N/A — git + gh operations

- [ ] **Step 1: Stage and commit**

  ```powershell
  git add docs/dev-portal/index.html docs/dev-portal/styles.css docs/dev-portal/app.js docs/dev-portal/data/status.json
  git commit -m "feat(dev-portal): scaffold management dashboard shell"
  ```

  Expected: four new files committed under one commit. `commit-msg` hook accepts the conventional subject.

- [ ] **Step 2: Push and open the PR**

  ```powershell
  git push -u origin feat/dev-portal-foundation
  ```

  ```bash
  gh pr create --base main --head feat/dev-portal-foundation --title "feat(dev-portal): scaffold management dashboard shell" --body "## What changed

  First of three PRs that build the management-facing web page (spec §5). This PR is the foundation:

  - \`docs/dev-portal/index.html\` — shell with header, six-tab nav, six empty sections, footer.
  - \`docs/dev-portal/styles.css\` — design tokens cloned from the prototype (navy / cyan / gold / canvas), base layout, tab styles, typography.
  - \`docs/dev-portal/app.js\` — tab routing via \`?tab=<slug>\` URL state. Browser back/forward supported via popstate. Status-tab renderer is a no-op stub; H.2 fills it in.
  - \`docs/dev-portal/data/status.json\` — seed with all seven sub-projects (0–6), task counts, and statuses. Sub-project 0 is marked \"in-progress\".

  No tab content yet — H.2 (feat/dev-portal-content) adds the six tabs' content. H.3 turns on GitHub Pages.

  ## Why

  - Spec section: §5.2, §5.3, §5.4
  - Plan task(s): Sub-project 0 Phase H.1 Tasks 38–44

  ## How it was verified

  - [ ] CI is green
  - [x] Open \`docs/dev-portal/index.html\` locally — header, tabs, footer render with brand styling
  - [x] Clicking each tab updates \`?tab=\` in the URL bar
  - [x] Browser back/forward switches tabs as expected
  - [x] \`status.json\` parses (Task 43 Step 2)

  ## Notes for the reviewer

  Tabs render empty content panels in this PR — that's intentional. Content arrives in H.2."
  ```

- [ ] **Step 3: Watch CI**

  ```bash
  gh pr checks --watch
  ```

  Expected: `ci / Sanity checks (stub)` passes.

- [ ] **Step 4: Squash-merge**

  ```bash
  gh pr merge --squash --delete-branch --subject "feat(dev-portal): scaffold management dashboard shell"
  ```

- [ ] **Step 5: Pull `main` locally**

  ```powershell
  git checkout main
  git pull --ff-only origin main
  git log -1 --oneline
  ```

  Expected: top commit is the squashed H.1 PR.

### Phase H.2 — Content PR (`feat/dev-portal-content`)

This PR fills all six tabs with the content described in spec §5.3-§5.4. Each tab is one task. The Status tab also gets its real JS render path.

#### Task 45: Create branch `feat/dev-portal-content`

**Files:**
- N/A — branch creation

- [ ] **Step 1: Confirm we are on `main` and up to date**

  ```powershell
  git checkout main
  git pull --ff-only origin main
  git status
  ```

  Expected: clean, up to date.

- [ ] **Step 2: Create the feature branch**

  ```powershell
  git checkout -b feat/dev-portal-content
  ```

  Expected: `Switched to a new branch 'feat/dev-portal-content'`.

#### Task 46: Populate the Overview tab

**Files:**
- Modify: `docs/dev-portal/index.html`
- Modify: `docs/dev-portal/styles.css`

- [ ] **Step 1: Replace the empty `<section id="tab-overview">` block**

  In `docs/dev-portal/index.html`, replace `<section id="tab-overview" class="portal-section" data-tab-panel="overview" aria-hidden="true"></section>` with:

  ```html
  <section id="tab-overview" class="portal-section" data-tab-panel="overview" aria-hidden="true">
    <h1>Project Overview</h1>
    <p class="lede">
      The IMPACT Internship Assessment Portal is a web app for Indiana&rsquo;s IMPACT internship
      program. It tracks intern intake, multi-phase competency assessments, intern self-assessments,
      and 90-day / 180-day employment outcomes. A clickable prototype is locked; the production
      rebuild is fully planned and now beginning execution.
    </p>

    <div class="callout-grid">
      <article class="callout callout--navy">
        <h3>Production rebuild planned</h3>
        <p class="callout__metric">256 tasks</p>
        <p>
          Six sub-project implementation plans cover the full rebuild from foundation to launch.
          Total estimated effort: 8&ndash;14 weeks of focused work.
        </p>
      </article>
      <article class="callout callout--cyan">
        <h3>Prototype locked</h3>
        <p class="callout__metric">34 pages</p>
        <p>
          The clickable design prototype is the visual and interaction reference for the rebuild.
          <a href="https://impact-internship-portal.netlify.app">View it live</a>.
        </p>
      </article>
      <article class="callout callout--gold">
        <h3>Infrastructure in flight</h3>
        <p class="callout__metric">Sub-project 0</p>
        <p>
          The current work: GitHub remote, CI, deploy previews, hook chain, and this dashboard.
          Prepares the runway for sub-project 1 to start.
        </p>
      </article>
    </div>

    <h2>What you&rsquo;re looking at</h2>
    <p>
      This dashboard is the single management-facing artifact for the project. It captures the
      planned phasing, the chosen technology stack, the development workflow, and a live(ish) view
      of progress. Each tab is a deep link &mdash; share the URL with the
      <code>?tab=&lt;slug&gt;</code> parameter to land directly on a section.
    </p>
  </section>
  ```

- [ ] **Step 2: Append the supporting CSS to `docs/dev-portal/styles.css`**

  At the bottom of `docs/dev-portal/styles.css`:

  ```css
  /* ============================================================
   * Overview tab
   * ============================================================ */
  .lede {
    font-size: 1.15rem;
    color: var(--ink-muted);
    max-width: 75ch;
  }

  .callout-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
    gap: var(--space-5);
    margin-block: var(--space-6);
  }

  .callout {
    background: var(--surface);
    border-radius: var(--radius-md);
    padding: var(--space-5);
    box-shadow: var(--shadow-sm);
    border-top: 4px solid var(--navy);
  }

  .callout--navy { border-top-color: var(--navy); }
  .callout--cyan { border-top-color: var(--cyan); }
  .callout--gold { border-top-color: var(--gold); }

  .callout h3 {
    margin-block: 0 var(--space-2);
    font-family: var(--font-body);
    font-weight: 700;
    color: var(--navy);
  }

  .callout__metric {
    font-family: var(--font-display);
    font-size: 1.8rem;
    color: var(--navy);
    margin-block: var(--space-1) var(--space-3);
  }

  .callout p {
    margin: 0 0 var(--space-2);
    font-size: 0.95rem;
  }

  .callout p:last-child {
    margin-bottom: 0;
  }

  code {
    background: var(--surface-dim);
    padding: 2px 6px;
    border-radius: 4px;
    font-family: var(--font-mono);
    font-size: 0.9em;
  }
  ```

- [ ] **Step 3: Open `docs/dev-portal/index.html` locally and verify**

  Open the file in a browser. Confirm:
  - The Overview tab is the default landing.
  - Three callout cards render in a responsive grid (one column on narrow screens, three on wide).
  - The navy/cyan/gold top-borders distinguish the cards.

#### Task 47: Populate the Phasing & Timeline tab

**Files:**
- Modify: `docs/dev-portal/index.html`
- Modify: `docs/dev-portal/styles.css`

- [ ] **Step 1: Replace the empty `<section id="tab-phasing">` block**

  Replace `<section id="tab-phasing" class="portal-section" data-tab-panel="phasing" aria-hidden="true"></section>` with:

  ```html
  <section id="tab-phasing" class="portal-section" data-tab-panel="phasing" aria-hidden="true">
    <h1>Phasing &amp; Timeline</h1>
    <p>
      The work is decomposed into seven sub-projects. Sub-project 0 (this infrastructure work) runs
      first; sub-projects 1&ndash;6 deliver the production application. Each sub-project ends with
      something demo-able. The plans are committed under
      <code>docs/superpowers/plans/</code> and total 256 tasks.
    </p>

    <h2>Sub-project breakdown</h2>
    <div class="table-wrap">
      <table class="phasing-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Name</th>
            <th>Scope summary</th>
            <th>Tasks</th>
            <th>Demo at end</th>
            <th>Depends on</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>0</td>
            <td>Project Infrastructure</td>
            <td>Repo migration, GitHub config, CI stub, hooks, Netlify wiring, this dashboard.</td>
            <td>~52</td>
            <td>This dashboard is live; CI runs on every PR.</td>
            <td>&mdash;</td>
          </tr>
          <tr>
            <td>1</td>
            <td>Foundation</td>
            <td>RR v7 scaffold, Supabase project, Drizzle schema, RLS policies, login routing.</td>
            <td>60</td>
            <td>Empty admin + employer dashboards behind a working login.</td>
            <td>Sub-project 0</td>
          </tr>
          <tr>
            <td>2</td>
            <td>Admin Core</td>
            <td>Admin shell + Settings (Employers / Cohorts / Roles / Phases / Barriers / Program Info) + Interns CRUD.</td>
            <td>37</td>
            <td>Full intern lifecycle CRUD inside the admin app.</td>
            <td>Sub-project 1</td>
          </tr>
          <tr>
            <td>3</td>
            <td>Question Engine</td>
            <td>6 question-type renderers + set editor + 3-tier competency stitching + verbatim seed content.</td>
            <td>38</td>
            <td>All assessment question sets editable from Settings.</td>
            <td>Sub-project 2</td>
          </tr>
          <tr>
            <td>4</td>
            <td>Assessment Forms</td>
            <td>5 assessment forms wired to the engine + intern identity gate + anonymous submission.</td>
            <td>31</td>
            <td>All assessments end-to-end submittable.</td>
            <td>Sub-project 3</td>
          </tr>
          <tr>
            <td>5</td>
            <td>Employer Shell</td>
            <td>Employer login + scoped views + account provisioning + branded auth pages.</td>
            <td>38</td>
            <td>Employer-side experience usable end-to-end.</td>
            <td>Sub-project 4</td>
          </tr>
          <tr>
            <td>6</td>
            <td>Polish &amp; Launch</td>
            <td>Reports + Resend emails + Sentry + e2e smoke + a11y + perf + Netlify publish-dir cutover.</td>
            <td>52</td>
            <td>Production cutover; prototype is replaced by the real app.</td>
            <td>Sub-project 5</td>
          </tr>
        </tbody>
      </table>
    </div>

    <h2>Sequencing</h2>
    <p>
      No firm calendar dates yet. The chart below shows order and rough relative effort by sprint.
      A &ldquo;sprint&rdquo; here is the working interval needed to land a sub-project end-to-end,
      not a fixed two-week cadence.
    </p>

    <div class="gantt">
      <div class="gantt-row">
        <span class="gantt-label">SP 0 &middot; Infra</span>
        <div class="gantt-track"><span class="gantt-bar gantt-bar--complete-ish" style="left: 0%; width: 8%;">~½ sprint</span></div>
      </div>
      <div class="gantt-row">
        <span class="gantt-label">SP 1 &middot; Foundation</span>
        <div class="gantt-track"><span class="gantt-bar" style="left: 8%; width: 20%;">~2 sprints</span></div>
      </div>
      <div class="gantt-row">
        <span class="gantt-label">SP 2 &middot; Admin Core</span>
        <div class="gantt-track"><span class="gantt-bar" style="left: 28%; width: 14%;">~1.5 sprints</span></div>
      </div>
      <div class="gantt-row">
        <span class="gantt-label">SP 3 &middot; Question Engine</span>
        <div class="gantt-track"><span class="gantt-bar" style="left: 42%; width: 14%;">~1.5 sprints</span></div>
      </div>
      <div class="gantt-row">
        <span class="gantt-label">SP 4 &middot; Assessment Forms</span>
        <div class="gantt-track"><span class="gantt-bar" style="left: 56%; width: 12%;">~1 sprint</span></div>
      </div>
      <div class="gantt-row">
        <span class="gantt-label">SP 5 &middot; Employer Shell</span>
        <div class="gantt-track"><span class="gantt-bar" style="left: 68%; width: 14%;">~1.5 sprints</span></div>
      </div>
      <div class="gantt-row">
        <span class="gantt-label">SP 6 &middot; Polish &amp; Launch</span>
        <div class="gantt-track"><span class="gantt-bar" style="left: 82%; width: 18%;">~2 sprints</span></div>
      </div>
    </div>
  </section>
  ```

- [ ] **Step 2: Append the supporting CSS**

  ```css
  /* ============================================================
   * Phasing tab
   * ============================================================ */
  .table-wrap {
    overflow-x: auto;
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-sm);
    background: var(--surface);
    margin-block: var(--space-5);
  }

  .phasing-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.92rem;
  }

  .phasing-table th,
  .phasing-table td {
    padding: var(--space-3) var(--space-4);
    text-align: left;
    vertical-align: top;
    border-bottom: 1px solid var(--line);
  }

  .phasing-table thead th {
    background: var(--navy-deep);
    color: #fff;
    font-family: var(--font-body);
    font-weight: 600;
    font-size: 0.85rem;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  .phasing-table tbody tr:nth-child(even) {
    background: var(--surface-dim);
  }

  .phasing-table td:nth-child(1) {
    font-family: var(--font-mono);
    font-weight: 600;
    color: var(--navy);
    width: 3rem;
  }

  .phasing-table td:nth-child(4) {
    font-family: var(--font-mono);
    text-align: right;
    width: 4rem;
  }

  /* ---- Gantt ---- */
  .gantt {
    margin-block: var(--space-6);
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .gantt-row {
    display: grid;
    grid-template-columns: 12rem 1fr;
    align-items: center;
    gap: var(--space-3);
  }

  .gantt-label {
    font-family: var(--font-mono);
    font-size: 0.85rem;
    color: var(--ink-muted);
    text-align: right;
  }

  .gantt-track {
    position: relative;
    height: 2rem;
    background: var(--surface-dim);
    border-radius: var(--radius-sm);
    border: 1px solid var(--line);
  }

  .gantt-bar {
    position: absolute;
    top: 0;
    bottom: 0;
    background: var(--navy);
    color: #fff;
    font-family: var(--font-mono);
    font-size: 0.75rem;
    padding-inline: var(--space-2);
    display: flex;
    align-items: center;
    border-radius: var(--radius-sm);
  }

  .gantt-bar--complete-ish {
    background: var(--cyan);
  }
  ```

- [ ] **Step 3: Open the page locally and switch to the Phasing tab**

  Confirm:
  - The 7-row table renders with dark navy header.
  - The Gantt chart shows seven horizontal bars in sequence, with the SP 0 bar in cyan (in-progress).
  - On a narrow viewport, the table scrolls horizontally (`.table-wrap`'s `overflow-x: auto`).

#### Task 48: Populate the Tech Stack tab

**Files:**
- Modify: `docs/dev-portal/index.html`
- Modify: `docs/dev-portal/styles.css`

- [ ] **Step 1: Replace the empty `<section id="tab-stack">` block**

  ```html
  <section id="tab-stack" class="portal-section" data-tab-panel="stack" aria-hidden="true">
    <h1>Tech Stack</h1>
    <p>
      The chosen technologies and the one-sentence rationale for each. Full justification lives in
      <a href="https://github.com/rapideo/impact-internship-portal/blob/main/docs/superpowers/specs/2026-05-10-production-rebuild-design.md">the production design spec</a>.
    </p>

    <div class="table-wrap">
      <table class="stack-table">
        <thead>
          <tr>
            <th>Technology</th>
            <th>Role</th>
            <th>Why</th>
            <th>Docs</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>TypeScript 5.7</td>
            <td>Language for the entire app + scripts</td>
            <td>Strict typing catches a category of bugs before runtime; mature tooling.</td>
            <td><a href="https://www.typescriptlang.org/">link</a></td>
          </tr>
          <tr>
            <td>React Router v7 (framework mode)</td>
            <td>App framework: routing, server runtime, data loading</td>
            <td>Successor to Remix; SSR-first, file-based routing, loaders/actions are a clean data model.</td>
            <td><a href="https://reactrouter.com/">link</a></td>
          </tr>
          <tr>
            <td>Vite 6</td>
            <td>Dev server + production build</td>
            <td>Fast HMR; the default bundler in the RR v7 ecosystem.</td>
            <td><a href="https://vite.dev/">link</a></td>
          </tr>
          <tr>
            <td>Supabase Postgres</td>
            <td>Primary database</td>
            <td>Managed Postgres with RLS; eliminates a class of permission bugs at the DB layer.</td>
            <td><a href="https://supabase.com/docs/guides/database">link</a></td>
          </tr>
          <tr>
            <td>Supabase Auth</td>
            <td>Admin + employer authentication</td>
            <td>Email/password + Custom Access Token Hook for role + employer_id JWT claims.</td>
            <td><a href="https://supabase.com/docs/guides/auth">link</a></td>
          </tr>
          <tr>
            <td>Drizzle ORM 0.36</td>
            <td>Type-safe DB access</td>
            <td>Compile-time-typed queries; migrations live in the repo as SQL files.</td>
            <td><a href="https://orm.drizzle.team/">link</a></td>
          </tr>
          <tr>
            <td>Resend 4</td>
            <td>Transactional email</td>
            <td>Modern API, generous free tier, good DKIM/domain story.</td>
            <td><a href="https://resend.com/docs">link</a></td>
          </tr>
          <tr>
            <td>Sentry</td>
            <td>Error tracking + source-mapped stack traces</td>
            <td>Best-in-class for JS error visibility; cheap on hobby tier.</td>
            <td><a href="https://docs.sentry.io/">link</a></td>
          </tr>
          <tr>
            <td>Vitest 2</td>
            <td>Unit + integration tests</td>
            <td>Vite-native, fast watch mode, Jest-compatible API.</td>
            <td><a href="https://vitest.dev/">link</a></td>
          </tr>
          <tr>
            <td>Playwright 1.49</td>
            <td>End-to-end tests + accessibility scans</td>
            <td>Cross-browser, parallel by default, integrates axe-core for a11y.</td>
            <td><a href="https://playwright.dev/">link</a></td>
          </tr>
          <tr>
            <td>GitHub Actions</td>
            <td>CI pipeline</td>
            <td>Native to the repo host; no separate dashboard to maintain.</td>
            <td><a href="https://docs.github.com/en/actions">link</a></td>
          </tr>
          <tr>
            <td>Netlify</td>
            <td>Hosting + PR deploy previews</td>
            <td>Auto-deploy on push to <code>main</code>; preview URL on every PR.</td>
            <td><a href="https://docs.netlify.com/">link</a></td>
          </tr>
        </tbody>
      </table>
    </div>

    <h2>How the pieces fit</h2>
    <div class="arch-diagram">
      <div class="arch-node arch-node--browser">Browser<br /><small>(intern, admin, employer)</small></div>
      <div class="arch-arrow">&rarr;</div>
      <div class="arch-node arch-node--netlify">Netlify edge<br /><small>(static + SSR)</small></div>
      <div class="arch-arrow">&rarr;</div>
      <div class="arch-node arch-node--rr">RR v7 server<br /><small>(loaders / actions)</small></div>
      <div class="arch-arrow">&rarr;</div>
      <div class="arch-stack">
        <div class="arch-node arch-node--supabase">Supabase<br /><small>(Postgres + Auth + RLS)</small></div>
        <div class="arch-node arch-node--resend">Resend<br /><small>(email)</small></div>
        <div class="arch-node arch-node--sentry">Sentry<br /><small>(errors)</small></div>
      </div>
    </div>
  </section>
  ```

- [ ] **Step 2: Append the supporting CSS**

  ```css
  /* ============================================================
   * Tech stack tab
   * ============================================================ */
  .stack-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.92rem;
  }

  .stack-table th,
  .stack-table td {
    padding: var(--space-3) var(--space-4);
    text-align: left;
    vertical-align: top;
    border-bottom: 1px solid var(--line);
  }

  .stack-table thead th {
    background: var(--navy-deep);
    color: #fff;
    font-family: var(--font-body);
    font-weight: 600;
    font-size: 0.85rem;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  .stack-table tbody tr:nth-child(even) {
    background: var(--surface-dim);
  }

  .stack-table td:first-child {
    font-family: var(--font-mono);
    font-weight: 600;
    color: var(--navy);
    white-space: nowrap;
  }

  /* ---- Architecture diagram ---- */
  .arch-diagram {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    flex-wrap: wrap;
    padding: var(--space-5);
    background: var(--surface);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-sm);
    margin-block: var(--space-5);
  }

  .arch-node {
    padding: var(--space-3) var(--space-4);
    border-radius: var(--radius-sm);
    font-size: 0.9rem;
    color: #fff;
    text-align: center;
    min-width: 9rem;
  }

  .arch-node small {
    font-size: 0.75rem;
    opacity: 0.85;
  }

  .arch-node--browser { background: #475569; }
  .arch-node--netlify { background: #14b8a6; }
  .arch-node--rr { background: var(--navy); }
  .arch-node--supabase { background: #3ECF8E; color: #052e1d; }
  .arch-node--resend { background: var(--cyan); color: var(--navy-deep); }
  .arch-node--sentry { background: #362d59; }

  .arch-arrow {
    font-family: var(--font-display);
    font-size: 1.5rem;
    color: var(--ink-muted);
  }

  .arch-stack {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }
  ```

- [ ] **Step 3: Open the Tech Stack tab locally and verify**

  Confirm:
  - The 12-row stack table renders cleanly.
  - The architecture diagram shows Browser &rarr; Netlify &rarr; RR v7 &rarr; (Supabase / Resend / Sentry stacked).
  - On narrow viewports, the diagram wraps but stays readable.

#### Task 49: Populate the Supabase Deep-Dive tab

**Files:**
- Modify: `docs/dev-portal/index.html`
- Modify: `docs/dev-portal/styles.css`

- [ ] **Step 1: Replace the empty `<section id="tab-supabase">` block**

  ```html
  <section id="tab-supabase" class="portal-section" data-tab-panel="supabase" aria-hidden="true">
    <h1>Supabase Deep-Dive</h1>
    <p>
      Supabase is the back-end-of-choice for this project. It deserves its own tab because the
      security model rests on one of its features (Row-Level Security) doing real work at the
      database layer.
    </p>

    <h2>1. What it is</h2>
    <p>
      Supabase is a managed back-end-as-a-service built on top of <strong>Postgres</strong>. The
      product bundles a hosted Postgres database, an Auth service, file Storage, Realtime, and
      Edge Functions. Pricing is per-project with a free tier suitable for development.
    </p>
    <p>
      The crucial framing: Supabase is not a custom database. The database itself is plain
      Postgres &mdash; the same Postgres you would run on any host. Anything you can do in
      Postgres, you can do in Supabase. The difference is Supabase manages the hosting, backups,
      and the surrounding services.
    </p>

    <h2>2. What we use</h2>
    <div class="usage-grid">
      <article class="usage-card usage-card--use">
        <h3>Postgres</h3>
        <p>The 15-table application database, accessed via Drizzle ORM with strict typing.</p>
      </article>
      <article class="usage-card usage-card--use">
        <h3>Auth (email + password)</h3>
        <p>
          Admin and employer login. Anonymous interns never authenticate &mdash; they are identified
          by First Initial + Last Name + Employer + Cohort at submission time.
        </p>
      </article>
      <article class="usage-card usage-card--use">
        <h3>Row-Level Security (RLS)</h3>
        <p>
          Permission rules enforced inside the database. Every query carries the user&rsquo;s JWT
          claims; Postgres decides at the row level whether the query is allowed. See section 3.
        </p>
      </article>
      <article class="usage-card usage-card--skip">
        <h3>Storage (not yet)</h3>
        <p>
          File uploads aren&rsquo;t in v1 scope. If interns ever upload a resume, this is where it
          will live.
        </p>
      </article>
      <article class="usage-card usage-card--skip">
        <h3>Edge Functions (not yet)</h3>
        <p>
          We use Netlify&rsquo;s edge for SSR. If we later need Postgres-co-located server logic,
          this is the option.
        </p>
      </article>
      <article class="usage-card usage-card--skip">
        <h3>Realtime (not yet)</h3>
        <p>
          No live-updating views are planned. The assessment forms are submit-once, immutable
          &mdash; no realtime needed.
        </p>
      </article>
    </div>

    <h2>3. Why this matters for security</h2>
    <p>
      The system has three actor classes &mdash; admin, employer, and anonymous intern &mdash;
      and each can only see a strict subset of the data. The naive way to enforce that is in
      application code: every query gets a <code>WHERE employer_id = ?</code> clause, and the
      app-code author has to remember to add it every single time.
    </p>
    <p>
      <strong>Row-Level Security</strong> moves that enforcement into the database itself. The
      policies say things like &ldquo;an employer can only SELECT interns where
      <code>interns.cohort_id IN (SELECT id FROM cohorts WHERE employer_id = auth.jwt().employer_id)</code>&rdquo;.
      The database refuses any other query &mdash; even if app code is buggy or compromised.
    </p>
    <p>
      This is the load-bearing reason Supabase was chosen. An app-code bug cannot leak one
      employer&rsquo;s interns to another, because the database itself will not return them.
      The only way to bypass RLS is to use the service-role key, which never leaves the server
      (file convention: <code>.server.ts</code> suffix, enforced by the bundler).
    </p>
  </section>
  ```

- [ ] **Step 2: Append the supporting CSS**

  ```css
  /* ============================================================
   * Supabase tab
   * ============================================================ */
  .usage-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: var(--space-4);
    margin-block: var(--space-5);
  }

  .usage-card {
    background: var(--surface);
    border-radius: var(--radius-md);
    padding: var(--space-4);
    box-shadow: var(--shadow-sm);
    border-left: 4px solid var(--navy);
  }

  .usage-card--skip {
    border-left-color: var(--line-strong);
    opacity: 0.85;
  }

  .usage-card h3 {
    margin-block: 0 var(--space-2);
    font-family: var(--font-body);
    font-weight: 700;
    color: var(--navy);
  }

  .usage-card--skip h3 {
    color: var(--ink-muted);
  }

  .usage-card p {
    margin: 0;
    font-size: 0.9rem;
  }

  strong {
    color: var(--navy);
  }
  ```

- [ ] **Step 3: Open the Supabase tab locally and verify**

  Confirm:
  - Three sections render top-to-bottom.
  - The 6-card grid in section 2 distinguishes "use" cards (navy left-border) from "skip" cards (muted, gray left-border).
  - Section 3's RLS explanation reads cleanly without horizontal overflow.

#### Task 50: Populate the Workflow & SDLC tab

**Files:**
- Modify: `docs/dev-portal/index.html`
- Modify: `docs/dev-portal/styles.css`

- [ ] **Step 1: Replace the empty `<section id="tab-workflow">` block**

  ```html
  <section id="tab-workflow" class="portal-section" data-tab-panel="workflow" aria-hidden="true">
    <h1>Workflow &amp; SDLC</h1>
    <p>
      How code moves from a developer&rsquo;s machine to production. Every change goes through
      the same path; there are no shortcuts and no direct-to-production pushes.
    </p>

    <h2>1. How code reaches production</h2>
    <ol class="flow-list">
      <li><strong>Branch.</strong> The developer creates a short-lived branch off <code>main</code> using a typed name (<code>feat/</code>, <code>fix/</code>, <code>chore/</code>, etc.).</li>
      <li><strong>Commit.</strong> Each commit message follows the Conventional Commits format. A <code>commit-msg</code> Git hook rejects messages that don&rsquo;t.</li>
      <li><strong>Push + PR.</strong> The branch is pushed and a Pull Request is opened against <code>main</code>. The PR template asks the author to link the spec section or plan task and to drop the deploy preview URL.</li>
      <li><strong>CI.</strong> GitHub Actions runs lint, typecheck, unit tests, integration tests, e2e tests, accessibility checks, bundle-size check, and production build. ~5&ndash;8 minutes total.</li>
      <li><strong>Review.</strong> An AI review (<code>/review</code>) inspects the diff. For security-sensitive areas (auth, RLS, secrets, untrusted input) a second pass (<code>/security-review</code>) runs. Matt does the final eyeball.</li>
      <li><strong>Merge.</strong> Squash-merge to <code>main</code>. A single commit lands per PR.</li>
      <li><strong>Deploy.</strong> Netlify watches <code>main</code> and auto-deploys to the live URL within ~90 seconds.</li>
    </ol>

    <h2>2. Quality gates (CI)</h2>
    <div class="table-wrap">
      <table class="ci-table">
        <thead>
          <tr>
            <th>Stage</th>
            <th>Tool</th>
            <th>What it catches</th>
          </tr>
        </thead>
        <tbody>
          <tr><td>Lint</td><td>ESLint 9</td><td>Code-style violations, dead imports, unsafe patterns.</td></tr>
          <tr><td>Format check</td><td>Prettier 3</td><td>Inconsistent formatting (no debate; one style).</td></tr>
          <tr><td>Typecheck</td><td>tsc --noEmit</td><td>Type errors across the whole project.</td></tr>
          <tr><td>Unit tests</td><td>Vitest</td><td>Logic bugs in pure functions.</td></tr>
          <tr><td>Integration + RLS tests</td><td>Vitest + Supabase test project</td><td>Cross-tenant data leaks; bad RLS policies.</td></tr>
          <tr><td>E2E tests</td><td>Playwright (headless Chromium)</td><td>Broken user journeys end-to-end.</td></tr>
          <tr><td>Accessibility</td><td>axe-core (inside Playwright)</td><td>WCAG violations.</td></tr>
          <tr><td>Bundle size check</td><td>Rollup visualizer + custom script</td><td>Bundle bloat / accidental dep additions.</td></tr>
          <tr><td>Production build</td><td>RR v7 build + Netlify adapter</td><td>Anything the dev server hides.</td></tr>
        </tbody>
      </table>
    </div>
    <p>Any failing stage blocks the merge. There is no &ldquo;merge anyway&rdquo; button.</p>

    <h2>3. Deploy previews</h2>
    <p>
      Netlify produces a fresh URL for every PR &mdash; <code>https://deploy-preview-N--impact-internship-portal.netlify.app</code>.
      The bot posts the URL as a comment on the PR within ~60 seconds of opening. This is what
      reviewers (and Matt&rsquo;s management) click to visually walk through a change before merge.
      The preview is the actual production build of the PR branch &mdash; not a mock.
    </p>

    <h2>4. What cannot happen on <code>main</code></h2>
    <ul>
      <li>No direct pushes &mdash; even from admins.</li>
      <li>No force pushes.</li>
      <li>No branch deletion.</li>
      <li>No merge without all CI checks green.</li>
      <li>No merge with unresolved review conversations.</li>
      <li>No non-linear history &mdash; squash-merge only, no merge commits.</li>
    </ul>

    <h2>5. Secrets and security</h2>
    <p>
      The application needs ~9 secrets (database URL, Supabase keys, session signing key,
      email API key, error-tracking tokens). None of them are committed to the repo. Three places
      hold them:
    </p>
    <ul>
      <li>
        <strong>Local development</strong> &mdash; each developer has a <code>.env.local</code>
        file that is in <code>.gitignore</code> from day one.
      </li>
      <li>
        <strong>CI</strong> &mdash; the same names live in GitHub Secrets, scoped to the repo.
        The workflow injects them as environment variables for test runs.
      </li>
      <li>
        <strong>Production</strong> &mdash; the same names again, this time in Netlify&rsquo;s
        environment-variable settings. They are injected into the running server at request time;
        they never appear in build logs or source maps.
      </li>
    </ul>
    <p>
      A canonical list of expected variables lives in <code>.env.example</code> (committed). It
      contains placeholder values only &mdash; copying it to <code>.env.local</code> and filling
      in real values is the per-developer setup.
    </p>
  </section>
  ```

- [ ] **Step 2: Append the supporting CSS**

  ```css
  /* ============================================================
   * Workflow tab
   * ============================================================ */
  .flow-list {
    counter-reset: flow;
    list-style: none;
    padding: 0;
    margin-block: var(--space-5);
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  .flow-list li {
    background: var(--surface);
    border-radius: var(--radius-md);
    padding: var(--space-4) var(--space-5) var(--space-4) var(--space-7);
    position: relative;
    box-shadow: var(--shadow-sm);
  }

  .flow-list li::before {
    counter-increment: flow;
    content: counter(flow);
    position: absolute;
    left: var(--space-4);
    top: 50%;
    transform: translateY(-50%);
    width: 2rem;
    height: 2rem;
    border-radius: 50%;
    background: var(--navy);
    color: #fff;
    font-family: var(--font-display);
    display: grid;
    place-items: center;
    font-size: 0.95rem;
  }

  .ci-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.92rem;
  }

  .ci-table th,
  .ci-table td {
    padding: var(--space-3) var(--space-4);
    text-align: left;
    border-bottom: 1px solid var(--line);
  }

  .ci-table thead th {
    background: var(--navy-deep);
    color: #fff;
    font-size: 0.85rem;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  .ci-table tbody tr:nth-child(even) {
    background: var(--surface-dim);
  }

  ul {
    padding-left: var(--space-5);
  }

  ul li {
    margin-block: var(--space-1);
  }
  ```

- [ ] **Step 3: Open the Workflow tab locally and verify**

  Confirm:
  - The 7-step flow list shows numbered navy circles on the left of each step.
  - The CI quality-gates table renders.
  - The "what cannot happen on main" list reads cleanly.

#### Task 51: Populate the Status tab and wire the real renderer

**Files:**
- Modify: `docs/dev-portal/index.html`
- Modify: `docs/dev-portal/styles.css`
- Modify: `docs/dev-portal/app.js`

- [ ] **Step 1: Replace the empty `<section id="tab-status">` block**

  ```html
  <section id="tab-status" class="portal-section" data-tab-panel="status" aria-hidden="true">
    <h1>Status</h1>
    <p>
      Live(ish) view of project progress. Driven by
      <code>docs/dev-portal/data/status.json</code>, which is updated on milestone-close PRs.
      Refresh the page after a milestone PR merges to see the new state.
    </p>
    <p class="status-asof">As of <span id="status-asof">&hellip;</span></p>

    <div id="status-grid" class="status-grid" aria-live="polite">
      <p class="status-loading">Loading status&hellip;</p>
    </div>
  </section>
  ```

- [ ] **Step 2: Append the supporting CSS**

  ```css
  /* ============================================================
   * Status tab
   * ============================================================ */
  .status-asof {
    font-family: var(--font-mono);
    font-size: 0.9rem;
    color: var(--ink-muted);
  }

  .status-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: var(--space-4);
    margin-block: var(--space-5);
  }

  .status-card {
    background: var(--surface);
    border-radius: var(--radius-md);
    padding: var(--space-5);
    box-shadow: var(--shadow-sm);
    border-top: 4px solid var(--status-not-started);
  }

  .status-card--in-progress { border-top-color: var(--status-in-progress); }
  .status-card--complete { border-top-color: var(--status-complete); }

  .status-card__head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: var(--space-3);
    margin-bottom: var(--space-2);
  }

  .status-card__title {
    font-family: var(--font-body);
    font-weight: 700;
    color: var(--navy);
    margin: 0;
    font-size: 1rem;
  }

  .status-card__pill {
    font-family: var(--font-mono);
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    padding: 2px 8px;
    border-radius: 999px;
    background: var(--status-not-started);
    color: #fff;
  }

  .status-card__pill--in-progress { background: var(--status-in-progress); color: var(--navy-deep); }
  .status-card__pill--complete { background: var(--status-complete); }

  .status-card__summary {
    font-size: 0.9rem;
    color: var(--ink-muted);
    margin-block: var(--space-2);
  }

  .status-card__metrics {
    display: flex;
    gap: var(--space-5);
    font-family: var(--font-mono);
    font-size: 0.85rem;
    color: var(--ink-muted);
  }

  .status-card__metrics strong {
    display: block;
    font-family: var(--font-display);
    font-size: 1.4rem;
    color: var(--navy);
  }

  .status-loading {
    grid-column: 1 / -1;
    color: var(--ink-muted);
    font-family: var(--font-mono);
  }

  .status-error {
    grid-column: 1 / -1;
    color: #b91c1c;
    font-family: var(--font-mono);
  }
  ```

- [ ] **Step 3: Replace the `renderStatusTab` function in `docs/dev-portal/app.js`**

  Find the existing `renderStatusTab` placeholder (the empty stub from H.1) and replace its body so the full function now reads:

  ```js
  function renderStatusTab() {
    const panel = document.getElementById('tab-status');
    if (!panel) return;
    if (statusLoaded) return;
    statusLoaded = true;

    const grid = document.getElementById('status-grid');
    const asOf = document.getElementById('status-asof');
    if (!grid || !asOf) return;

    fetch('data/status.json', { cache: 'no-cache' })
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(function (data) {
        asOf.textContent = data.asOf || 'unknown';
        const cards = (data.subProjects || []).map(function (sp) {
          const statusKey = sp.status || 'not-started';
          const pillLabel = statusKey.replace(/-/g, ' ');
          const cardCls = 'status-card status-card--' + statusKey;
          const pillCls = 'status-card__pill status-card__pill--' + statusKey;
          return [
            '<article class="' + cardCls + '">',
            '  <div class="status-card__head">',
            '    <h3 class="status-card__title">SP ' + sp.id + ' &middot; ' + escapeHtml(sp.name) + '</h3>',
            '    <span class="' + pillCls + '">' + escapeHtml(pillLabel) + '</span>',
            '  </div>',
            '  <p class="status-card__summary">' + escapeHtml(sp.summary || '') + '</p>',
            '  <div class="status-card__metrics">',
            '    <span><strong>' + (sp.taskCount || 0) + '</strong>tasks</span>',
            '    <span><strong>' + (sp.prCount || 0) + '</strong>PRs</span>',
            '  </div>',
            '</article>',
          ].join('\n');
        });
        grid.innerHTML = cards.join('\n');
      })
      .catch(function (err) {
        grid.innerHTML = '<p class="status-error">Could not load status: ' + escapeHtml(String(err && err.message)) + '</p>';
      });
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
  ```

  Place the new `escapeHtml` function alongside `renderStatusTab` inside the existing IIFE (before the `document.addEventListener('DOMContentLoaded', ...)` line).

- [ ] **Step 4: Open the Status tab locally and verify**

  Confirm:
  - As-of date shows `2026-05-11` (from the JSON).
  - Seven status cards render, one per sub-project.
  - The SP 0 card has a cyan top-border and an "in progress" pill.
  - The other six cards have gray top-borders and "not started" pills.
  - Task counts read 52, 60, 37, 38, 31, 38, 52.

#### Task 52: Commit, push, open PR, watch CI, merge (Phase H.2)

**Files:**
- N/A — git + gh operations

- [ ] **Step 1: Stage and commit**

  ```powershell
  git add docs/dev-portal/index.html docs/dev-portal/styles.css docs/dev-portal/app.js
  git commit -m "feat(dev-portal): populate all six tab sections with content"
  ```

  Expected: one commit with three modified files.

- [ ] **Step 2: Push and open the PR**

  ```powershell
  git push -u origin feat/dev-portal-content
  ```

  ```bash
  gh pr create --base main --head feat/dev-portal-content --title "feat(dev-portal): populate all six tab sections with content" --body "## What changed

  Second of three PRs for the management dashboard. This PR fills the six tab panels:

  - **Overview** — three callout cards (production rebuild / prototype / infra-in-flight), lede paragraph, deep-link explainer.
  - **Phasing & Timeline** — 7-row sub-project table + CSS-only Gantt with 7 horizontal bars.
  - **Tech Stack** — 12-row stack table + CSS architecture diagram (Browser → Netlify → RR v7 → Supabase/Resend/Sentry).
  - **Supabase Deep-Dive** — what it is / what we use (6-card grid: 3 active, 3 deferred) / why this matters (RLS deep-dive).
  - **Workflow & SDLC** — 7-step flow list with numbered nodes + CI quality-gates table + deploy-preview explainer + branch-protection bullets + secrets section.
  - **Status** — JS-driven render from \`data/status.json\`: 7 status cards with progress pills.

  Wires the real \`renderStatusTab\` function in \`app.js\` (replaced the H.1 no-op stub), plus an \`escapeHtml\` helper to guard against unsafe data.

  ## Why

  - Spec section: §5.3, §5.4
  - Plan task(s): Sub-project 0 Phase H.2 Tasks 45–52

  ## How it was verified

  - [ ] CI is green
  - [x] All six tabs render their content (Tasks 46–51 each end with a local-open verification)
  - [x] Status tab fetches status.json and renders 7 cards
  - [x] SP 0 card shows cyan border + 'in progress' pill
  - [x] Deep links (\`?tab=stack\`) open the right tab

  ## Notes for the reviewer

  H.3 is next — it turns on GitHub Pages, adds the \`.nojekyll\` file, and adds the bare-URL redirect so \`/docs/\` bounces to \`/docs/dev-portal/\`."
  ```

- [ ] **Step 3: Watch CI**

  ```bash
  gh pr checks --watch
  ```

  Expected: `ci / Sanity checks (stub)` passes.

- [ ] **Step 4: Squash-merge**

  ```bash
  gh pr merge --squash --delete-branch --subject "feat(dev-portal): populate all six tab sections with content"
  ```

- [ ] **Step 5: Pull `main`**

  ```powershell
  git checkout main
  git pull --ff-only origin main
  git log -1 --oneline
  ```

  Expected: top commit is the squashed H.2 PR.

### Phase H.3 — GitHub Pages + final polish PR (`chore/github-pages-deploy`)

This PR turns on GitHub Pages, adds the `.nojekyll` marker, adds a bare-URL redirect, polishes meta tags, and updates `CLAUDE.md` to reflect the new repo + dev-portal URLs and the post-migration local path.

#### Task 53: Create branch `chore/github-pages-deploy`

**Files:**
- N/A — branch creation

- [ ] **Step 1: Confirm we are on `main` and up to date**

  ```powershell
  git checkout main
  git pull --ff-only origin main
  git status
  ```

  Expected: clean, up to date.

- [ ] **Step 2: Create the feature branch**

  ```powershell
  git checkout -b chore/github-pages-deploy
  ```

  Expected: `Switched to a new branch 'chore/github-pages-deploy'`.

#### Task 54: Add `.nojekyll` and the bare-URL redirect

**Files:**
- Create: `docs/dev-portal/.nojekyll`
- Create: `docs/index.html`

- [ ] **Step 1: Create the `.nojekyll` marker**

  ```powershell
  New-Item -Path "docs/dev-portal/.nojekyll" -ItemType File -Force | Out-Null
  Test-Path "docs/dev-portal/.nojekyll"
  ```

  Expected: `True`. The file is empty; its presence tells GitHub Pages to skip Jekyll processing (which would otherwise hide files starting with `_` and may rewrite paths).

- [ ] **Step 2: Create `docs/index.html` as a redirect**

  ```html
  <!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="utf-8" />
      <title>IMPACT Internship Assessment Portal — Project Dashboard</title>
      <meta http-equiv="refresh" content="0; url=./dev-portal/" />
      <link rel="canonical" href="./dev-portal/" />
      <style>
        body {
          font-family: system-ui, sans-serif;
          padding: 2rem;
          color: #051028;
          background: #eff1f5;
        }
        a { color: #153a98; }
      </style>
    </head>
    <body>
      <p>Redirecting to the IMPACT project dashboard&hellip;</p>
      <p>If you are not redirected, <a href="./dev-portal/">click here</a>.</p>
    </body>
  </html>
  ```

  This page makes the bare GitHub Pages URL (`https://rapideo.github.io/impact-internship-portal/`) bounce to `/dev-portal/` instantly. The meta-refresh + visible-fallback pattern works without JS and is search-engine friendly.

- [ ] **Step 3: Verify both files exist**

  ```powershell
  Test-Path "docs/dev-portal/.nojekyll"
  Test-Path "docs/index.html"
  ```

  Expected: both `True`.

#### Task 55: Add OG meta tags and a favicon link to `index.html`

**Files:**
- Modify: `docs/dev-portal/index.html`

- [ ] **Step 1: Insert OG + Twitter meta tags inside `<head>`**

  In `docs/dev-portal/index.html`, immediately after the existing `<meta name="description" ...>` line and before the `<link rel="icon" ...>` line, insert:

  ```html
  <meta property="og:title" content="IMPACT Internship Assessment Portal — Project Dashboard" />
  <meta property="og:description" content="Management dashboard for the IMPACT Internship Assessment Portal production rebuild — phasing, stack, workflow, and live status." />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="https://rapideo.github.io/impact-internship-portal/dev-portal/" />
  <meta property="og:image" content="https://rapideo.github.io/impact-internship-portal/dev-portal/social-preview.png" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="IMPACT Internship Assessment Portal — Project Dashboard" />
  <meta name="twitter:description" content="Phasing, stack, workflow, and live status for the IMPACT portal production rebuild." />
  ```

  Note: the OG image URL points to a `social-preview.png` we don't yet have. The image is **optional polish** — if it's missing on GitHub Pages, scrapers fall back to no image and OG remains valid. Matt can drop a 1200×630 PNG into `docs/dev-portal/social-preview.png` at any time after this PR; no code change required. We do not block the PR on the image.

- [ ] **Step 2: Verify the file still parses**

  Open `docs/dev-portal/index.html` in a browser. Confirm:
  - The page still renders correctly.
  - View Source shows the OG/Twitter tags directly after the description tag.

#### Task 56: Configure GitHub Pages source via the GitHub UI

**Files:**
- N/A — GitHub UI work

- [ ] **Step 1: Open the Pages settings page**

  Navigate to `https://github.com/rapideo/impact-internship-portal/settings/pages`.

- [ ] **Step 2: Configure the source**

  Under "Build and deployment":
  - Source: **Deploy from a branch**
  - Branch: **main**
  - Folder: **/docs**

  Click "Save".

- [ ] **Step 3: Wait for the first Pages build**

  Within ~60 seconds, the Pages settings page shows "Your site is live at `https://rapideo.github.io/impact-internship-portal/`". The first build runs after the *next* push to `main` (which is the H.3 PR merge in Task 58). Until then, the Pages URL may 404 — that's expected, and the merge in Task 58 triggers the first real build.

- [ ] **Step 4: Confirm via `gh api`**

  ```bash
  gh api repos/rapideo/impact-internship-portal/pages --jq '{status: .status, url: .html_url, source: .source}'
  ```

  Expected:
  ```json
  {
    "status": "built" or "queued" or "building",
    "url": "https://rapideo.github.io/impact-internship-portal/",
    "source": { "branch": "main", "path": "/docs" }
  }
  ```

#### Task 57: Update CLAUDE.md with new repo URL, dev-portal URL, and local path

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Open the existing "Git" section at the bottom of `CLAUDE.md`**

  The current section reads:

  ```markdown
  ## Git

  This is a git repository on branch `master`. 23 commits tracking the full build-out from initial spec through completed prototype enhancements. No remote is configured.
  ```

- [ ] **Step 2: Replace it with the updated text**

  Replace the section's body with:

  ```markdown
  ## Git

  This is a git repository on branch `main` (renamed from `master` on 2026-05-11). The GitHub remote is `git@github.com:rapideo/impact-internship-portal.git` — private repo under the Rapideo organization. Branch protection on `main` requires PRs with passing CI; direct pushes are rejected.

  **Local working path:** `C:\Projects\impact-portal\` (moved out of OneDrive on 2026-05-11; the OneDrive copy is renamed to `IMPACT Intretnship Assessment Portal _archived_2026-05-11` for a two-week safety net).

  **Workflow + project dashboard:** `https://rapideo.github.io/impact-internship-portal/dev-portal/` — six-tab management-facing artifact (Overview / Phasing / Stack / Supabase / Workflow / Status). Status tab is JSON-driven from `docs/dev-portal/data/status.json`; updated on milestone-close PRs.

  **Hook chain:** Husky 9 + commitlint 19 + lint-staged 15. `pre-commit` runs `npx lint-staged` (currently a no-op stub; real Prettier + ESLint wired in sub-project 1). `commit-msg` runs commitlint against the Conventional Commits format. Both blocked Phase F probe commits as expected.

  **CI:** `.github/workflows/ci.yml` — runs on PRs to `main` and pushes to `main`. Sanity-check stub until sub-project 1 wires in real stages.

  **Workflow spec:** `docs/superpowers/specs/2026-05-11-development-workflow-design.md` is the source of truth for the workflow described above. The corresponding implementation plan is `docs/superpowers/plans/2026-05-11-sub-project-0-project-infrastructure.md`.
  ```

- [ ] **Step 3: Verify the file is valid markdown**

  Open `CLAUDE.md` in an editor (or render via `gh markdown-preview` if available). Confirm:
  - The Git section is the last section in the file.
  - Headings render as expected.
  - The repo URL, dev-portal URL, and local path are all correct.

#### Task 58: Commit, push, open PR, watch CI, merge, verify Pages

**Files:**
- N/A — git + gh + verification operations

- [ ] **Step 1: Stage and commit**

  ```powershell
  git add docs/dev-portal/.nojekyll docs/index.html docs/dev-portal/index.html CLAUDE.md
  git commit -m "chore(dev-portal): enable GitHub Pages, add redirect, polish meta, update CLAUDE.md"
  ```

  Expected: a single commit with four files.

- [ ] **Step 2: Push and open the PR**

  ```powershell
  git push -u origin chore/github-pages-deploy
  ```

  ```bash
  gh pr create --base main --head chore/github-pages-deploy --title "chore(dev-portal): enable GitHub Pages, add redirect, polish meta, update CLAUDE.md" --body "## What changed

  Final dev-portal PR. Turns on GitHub Pages publishing from the \`/docs\` folder on \`main\`, adds the supporting files, and updates project memory:

  - \`docs/dev-portal/.nojekyll\` — disables Jekyll processing on Pages so files starting with \`_\` and our flat folder layout work as-is.
  - \`docs/index.html\` — meta-refresh redirect from the bare Pages URL to \`/dev-portal/\`.
  - \`docs/dev-portal/index.html\` — adds OG + Twitter meta tags for shareable previews. The optional \`social-preview.png\` is a follow-up polish.
  - \`CLAUDE.md\` — Git section rewritten to reflect the new branch name (\`main\`), the GitHub remote, the post-migration local path (\`C:\\Projects\\impact-portal\\\`), the dashboard URL, the hook chain, and the CI workflow.

  GitHub Pages was configured via the UI (Task 56). The first Pages build runs when this PR merges.

  ## Why

  - Spec section: §5.2 (Mode B — GitHub Pages), §9 (Definition of Done)
  - Plan task(s): Sub-project 0 Phase H.3 Tasks 53–58

  ## How it was verified

  - [ ] CI is green
  - [x] Deploy preview URL loads the dashboard (Netlify continues to publish \`Prototypes/PROTOTYPE/\` — Pages is the dashboard's home, not Netlify)
  - [ ] Post-merge: \`https://rapideo.github.io/impact-internship-portal/\` redirects to \`/dev-portal/\` and the six tabs all render

  ## Notes for the reviewer

  After merge, Step 5 of Task 58 verifies the Pages URL is live. If Pages has not built within 90 seconds of merge, retrigger via the Pages settings page."
  ```

- [ ] **Step 3: Watch CI**

  ```bash
  gh pr checks --watch
  ```

  Expected: `ci / Sanity checks (stub)` passes.

- [ ] **Step 4: Squash-merge**

  ```bash
  gh pr merge --squash --delete-branch --subject "chore(dev-portal): enable GitHub Pages, add redirect, polish meta, update CLAUDE.md"
  ```

- [ ] **Step 5: Pull `main` and wait for Pages to build**

  ```powershell
  git checkout main
  git pull --ff-only origin main
  git log -1 --oneline
  ```

  Then poll for the Pages build:

  ```bash
  gh api repos/rapideo/impact-internship-portal/pages/builds/latest --jq '{status: .status, error: .error}'
  ```

  Expected: `{"status": "built", "error": null}` (may say `"building"` for ~30 seconds first; re-run until `"built"`).

- [ ] **Step 6: Verify the live Pages URL**

  Open each of these in a browser and confirm they load correctly:
  - `https://rapideo.github.io/impact-internship-portal/` — should immediately redirect to `/dev-portal/`.
  - `https://rapideo.github.io/impact-internship-portal/dev-portal/` — should load the dashboard with Overview as the default tab.
  - `https://rapideo.github.io/impact-internship-portal/dev-portal/?tab=status` — should load the Status tab directly with all 7 cards visible.
  - `https://rapideo.github.io/impact-internship-portal/dev-portal/?tab=workflow` — should load the Workflow tab directly.

  All four checks must pass before this task is complete.

---

## Wrap-up

After Task 58 lands, sub-project 0 meets the spec §9 Definition of Done:

- Repo lives in `rapideo/impact-internship-portal`, private, default branch `main`, full history preserved (Tasks 1–10).
- OneDrive copy renamed to `_archived_2026-05-11` (Task 10).
- Branch protection on `main` configured per §2.9 and verified by a rejected probe push (Tasks 21, 23).
- A test PR has run the stub CI workflow end-to-end and merged via squash (Tasks 11–16, 17–20).
- Husky + commitlint + lint-staged installed; a deliberate bad-format commit is rejected (Tasks 24–32).
- Netlify connected to the GitHub repo; a probe PR produced a deploy-preview URL that loaded the prototype (Tasks 33–37).
- All required GitHub Secrets and Netlify environment variables seeded with placeholders (Tasks 22, 36).
- Management dashboard deployed to GitHub Pages at `https://rapideo.github.io/impact-internship-portal/dev-portal/`; all six tabs render (Tasks 38–58).
- Status tab shows sub-project 0 as `in-progress` (Task 43); after wrap-up, manually flip to `complete` via a follow-up commit if Matt prefers — see "Optional follow-up" below.
- `CLAUDE.md` updated with new repo URL, dev-portal URL, and post-migration local path (Task 57).

### Optional follow-up: mark sub-project 0 complete

Per spec §2.13, `status.json` is updated on milestone-close PRs. To mark sub-project 0 complete, open a small `chore/status-sp0-complete` PR that edits `docs/dev-portal/data/status.json`:

```json
{ "id": 0, "name": "Project Infrastructure", "status": "complete", ... }
```

Also bump the top-level `"asOf"` date. Squash-merge as usual. The status card on the dashboard flips to green on the next page load.

### Handoff to sub-project 1

Sub-project 1's Phase 1 (repo scaffold) assumed CI did not exist. Per spec §3.3, that phase now expands the existing stub workflow rather than creating one from scratch. Specifically:

- The stub `.github/workflows/ci.yml` already runs on PRs to `main` and pushes to `main` with a `name: ci` workflow.
- Sub-project 1 Task 7's `package.json` initialization can extend the minimal `package.json` from Task 25 rather than replacing it.
- The `.gitignore` and `.env.example` files are already present (Tasks 29, 30); sub-project 1 only needs to fill in real values into local `.env.local` plus GitHub Secrets and Netlify env vars.
- The `lint-staged` config in `package.json` has placeholder `echo` commands; sub-project 1's Prettier + ESLint installation replaces them with the real commands.

No re-planning of sub-project 1 is required.
