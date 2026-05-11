# Sub-Project 3: Question Engine — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the production question engine: shared TypeScript types, 6 type renderers as React components, type-specific config sub-forms for the admin editor, pure `validateAnswers`/`serializeAnswers`/`restoreAnswers` utilities, a server-side three-tier `stitchedCompetencyQuestions` function, the Settings → Questions list and per-set editor, the 3-tier Competency detail page plus per-cohort and per-intern editors, and idempotent seeds containing the verbatim question content lifted from the prototype. After sub-project 3 lands, sub-project 4 can assemble the 5 assessment forms by composing these primitives against the database.

**Architecture:** All question types are described by a TypeScript discriminated union (`Question.type` narrows `Question.config`). A single `<QuestionRenderer>` component dispatches by `type` to one of six pure, controlled type-renderer components living under `app/components/question-renderer/`. The same `Question[]` array drives validation (`app/lib/question-engine.ts`) and serialization. The admin editor stores a working copy of `Question[]` in React state, edits propagate via controlled inputs (no `innerHTML` rebuilds, no accordion-collapse-on-action bug from the prototype), and the Save action posts the JSON-serialized payload to a React Router v7 server action which atomically replaces the rows in the `questions` table within a transaction. Three-tier competency stitching runs server-side in a loader that fetches `competency-core`, `competency-cohort-<cohortId>`, `competency-intern-<internId>` and returns an ordered array plus tier section boundaries. The 6 question types are kept identical to the prototype (textarea, short-text, radio, checkbox-group, likert, competency-rubric-row).

**Tech Stack:** TypeScript 5.7, React Router v7 (framework mode), Vite 6, Node 22 LTS, Drizzle 0.36 + postgres-js 3.4, @supabase/supabase-js 2.46, @supabase/ssr 0.5, Vitest 2, React Testing Library 16, Playwright 1.49, ESLint 9 flat config, Prettier 3.

**Spec:** `docs/superpowers/specs/2026-05-10-production-rebuild-design.md` (§6 — Question-Set Engine)

**Working directory for all paths below:** `IMPACT Internship Assessment Portal/` (the repo root, after sub-project 1's Phase A folder rename).

**Conventions inherited from sub-project 1 (do not redefine):**
- App layout: `app/root.tsx`, `app/routes.ts`, `app/routes/`, `app/components/`, `app/lib/{db,auth,email,env}.server.ts`.
- Auth helpers exist: `createSupabaseServerClient(request)`, `getAuthContext(request)`, `decodeRoleFromJwtPayload(jwt)`.
- DB enums: `question_type` (textarea | short-text | radio | checkbox-group | likert | competency-rubric-row), `question_set_kind` (standard | competency-core | competency-cohort | competency-intern).
- DB tables: `question_sets` (`id text PK`, `kind`, `name`, `cohort_id uuid?`, `intern_id uuid?`, `min_required int?`, `allow_multiple bool`, `last_edited_at`), `questions` (`id text PK`, `question_set_id text FK`, `type`, `label`, `helper_text?`, `required bool`, `sort_order int`, `config jsonb`).
- Sub-project 1 created stub `db/seed-data/question-sets.ts`; sub-project 3 replaces its `SEED_QUESTION_SETS` with the full verbatim content.
- Sub-project 2 (Admin core) owns the admin shell layout/auth guard (`app/routes/admin.tsx`) and the Settings rail component (`<SettingsRail activeItem="..." />`). Sub-project 3 registers admin routes inside that shell.
- Netlify still publishes the prototype until sub-project 6; sub-project 3 routes are validated in dev + CI Playwright only.

---

## File Structure

Sub-project 3 creates/modifies the following files:

**Library (`app/lib/`):**
- Create: `app/lib/question-types.ts` — discriminated-union types shared between renderer, editor, validator, server.
- Create: `app/lib/question-engine.ts` — pure `validateAnswers`, `serializeAnswers`, `isAnswered` helpers.
- Create: `app/lib/question-engine.server.ts` — server-side `loadQuestionSet`, `saveQuestionSet`, `stitchedCompetencyQuestions`.

**Renderer components (`app/components/question-renderer/`):**
- Create: `app/components/question-renderer/QuestionRenderer.tsx` — top-level dispatcher.
- Create: `app/components/question-renderer/TextareaQuestion.tsx`
- Create: `app/components/question-renderer/ShortTextQuestion.tsx`
- Create: `app/components/question-renderer/RadioQuestion.tsx`
- Create: `app/components/question-renderer/CheckboxGroupQuestion.tsx`
- Create: `app/components/question-renderer/LikertQuestion.tsx`
- Create: `app/components/question-renderer/CompetencyRubricRowQuestion.tsx`
- Create: `app/components/question-renderer/QuestionShell.tsx` — shared label/number/helper wrapper.
- Create: `app/components/question-renderer/SectionHeader.tsx` — tier section header for competency.
- Create: `app/components/question-renderer/styles.css` — scoped CSS lifted from prototype's `.assessment-question*` rules.

**Editor components (`app/components/question-editor/`):**
- Create: `app/components/question-editor/QuestionSetEditor.tsx` — accordion + type picker + save flow.
- Create: `app/components/question-editor/QuestionRowEditor.tsx` — single accordion row.
- Create: `app/components/question-editor/configs/TextareaConfigForm.tsx`
- Create: `app/components/question-editor/configs/ShortTextConfigForm.tsx`
- Create: `app/components/question-editor/configs/RadioConfigForm.tsx`
- Create: `app/components/question-editor/configs/CheckboxGroupConfigForm.tsx`
- Create: `app/components/question-editor/configs/LikertConfigForm.tsx`
- Create: `app/components/question-editor/configs/CompetencyRubricRowConfigForm.tsx`
- Create: `app/components/question-editor/OptionsListEditor.tsx` — shared by Radio + Checkbox config forms.
- Create: `app/components/question-editor/newQuestionDefaults.ts` — factory for "+ Add Question" of each type.
- Create: `app/components/question-editor/styles.css`

**Routes (`app/routes/`):**
- Create: `app/routes/admin.settings.questions._index.tsx` — Settings → Questions list (4 standard + Competency aggregate row).
- Create: `app/routes/admin.settings.questions.$setId.tsx` — Per-set editor.
- Create: `app/routes/admin.settings.questions.competency._index.tsx` — 3-tier Competency detail.
- Create: `app/routes/admin.settings.questions.competency.cohort.$cohortId.tsx` — Per-cohort competency editor (also handles "new" via `cohortId === 'new'`).
- Create: `app/routes/admin.settings.questions.competency.intern.$internId.tsx` — Per-intern competency editor (also handles "new" via `internId === 'new'`).
- Modify: `app/routes.ts` — register the five routes above under the admin shell.

**Seed data (`db/seed-data/`):**
- Modify (replace contents): `db/seed-data/question-sets.ts` — full verbatim content for 4 standard sets + Competency Core + Eskenazi cohort tier.

**Tests (`tests/`):**
- Create: `tests/lib/question-engine.test.ts` — `validateAnswers`/`serializeAnswers`/`isAnswered` unit tests.
- Create: `tests/lib/question-engine.server.test.ts` — `stitchedCompetencyQuestions` integration test (real DB).
- Create: `tests/components/QuestionRenderer.test.tsx` — dispatcher routing test.
- Create: `tests/components/TextareaQuestion.test.tsx`
- Create: `tests/components/ShortTextQuestion.test.tsx`
- Create: `tests/components/RadioQuestion.test.tsx`
- Create: `tests/components/CheckboxGroupQuestion.test.tsx`
- Create: `tests/components/LikertQuestion.test.tsx`
- Create: `tests/components/CompetencyRubricRowQuestion.test.tsx`
- Create: `tests/components/QuestionSetEditor.test.tsx` — accordion-no-collapse-on-action regression test + save payload shape.
- Create: `tests/e2e/admin-question-editor.spec.ts` — Playwright smoke covering: open Personal Goals, edit a prompt, add a question, save, reload, verify persisted.

**Test plumbing:**
- Modify: `vitest.config.ts` — already configured by sub-project 1; verify `jsdom` environment is the default for `.test.tsx`.

---

## Phase Map

- **Phase A: Shared types + pure utilities** (Tasks 1–4): the foundation everything else imports.
- **Phase B: Renderer components, one per type** (Tasks 5–11): 6 type renderers + dispatcher + section header.
- **Phase C: Server-side data layer** (Tasks 12–15): load, save, stitch.
- **Phase D: Editor — type-specific config forms** (Tasks 16–22): 6 config forms + shared options-list editor.
- **Phase E: Editor — accordion + type picker + save flow** (Tasks 23–26): the `<QuestionSetEditor>` shell + regression test.
- **Phase F: Routes — list, per-set editor, competency tiers** (Tasks 27–32): all 5 admin routes + route registration.
- **Phase G: Seed content** (Tasks 33–34): replace sub-project 1's stub with verbatim prototype content; idempotent seed-prod path.
- **Phase H: E2E + regression sweep** (Tasks 35–36): Playwright smoke + accordion regression.

Self-review (§ "Self-review" at the end of this plan) is mandatory before the plan is considered complete.

---

## Phase A: Shared types + pure utilities

### Task 1: Define the question discriminated-union types

**Files:**
- Create: `app/lib/question-types.ts`

- [ ] **Step 1: Create `app/lib/question-types.ts`**

  ```ts
  // Shared discriminated-union types for the question engine.
  // ONE source of truth for: renderer prop typing, editor config-form prop typing,
  // validation, serialization, DB seed fixtures, and stitched competency assembly.
  //
  // The 6 types exactly match the Postgres enum `question_type` declared in
  // sub-project 1's db/schema.ts. Order and spelling must stay in lock-step.

  export type QuestionType =
    | 'textarea'
    | 'short-text'
    | 'radio'
    | 'checkbox-group'
    | 'likert'
    | 'competency-rubric-row';

  export interface RadioOption {
    value: string;
    label: string;
  }

  export interface TextareaConfig {
    rows: number;
    placeholder: string;
  }

  export interface ShortTextConfig {
    placeholder: string;
    maxLength: number;
  }

  export interface RadioConfig {
    options: RadioOption[];
    otherWithText: boolean;
  }

  export interface CheckboxGroupConfig {
    options: RadioOption[];
    otherWithText: boolean;
  }

  export interface LikertConfig {
    min: number;
    max: number;
    leftLabel: string;
    rightLabel: string;
  }

  // competency-rubric-row has no per-question config — Emerging/Developing/Ready
  // and the Notes textarea are fixed by the renderer.
  export type CompetencyRubricRowConfig = Record<string, never>;

  export type QuestionConfigFor<T extends QuestionType> =
    T extends 'textarea' ? TextareaConfig :
    T extends 'short-text' ? ShortTextConfig :
    T extends 'radio' ? RadioConfig :
    T extends 'checkbox-group' ? CheckboxGroupConfig :
    T extends 'likert' ? LikertConfig :
    T extends 'competency-rubric-row' ? CompetencyRubricRowConfig :
    never;

  interface BaseQuestion<T extends QuestionType> {
    id: string;
    type: T;
    label: string;
    helperText?: string;
    required: boolean;
    sortOrder: number;
    config: QuestionConfigFor<T>;
  }

  export type TextareaQuestion = BaseQuestion<'textarea'>;
  export type ShortTextQuestion = BaseQuestion<'short-text'>;
  export type RadioQuestion = BaseQuestion<'radio'>;
  export type CheckboxGroupQuestion = BaseQuestion<'checkbox-group'>;
  export type LikertQuestion = BaseQuestion<'likert'>;
  export type CompetencyRubricRowQuestion = BaseQuestion<'competency-rubric-row'>;

  export type Question =
    | TextareaQuestion
    | ShortTextQuestion
    | RadioQuestion
    | CheckboxGroupQuestion
    | LikertQuestion
    | CompetencyRubricRowQuestion;

  // ---------------- Answer shapes ----------------

  // The persisted JSONB shape under assessment_submissions.answers.
  // Stable per type — documented in spec section 6.7 and never broken.

  export type TextareaAnswer = string;
  export type ShortTextAnswer = string;

  export type SimpleSelectionAnswer = string;
  export interface OtherWithTextAnswer {
    value: '__other';
    otherText: string;
  }
  export type RadioAnswer = SimpleSelectionAnswer | OtherWithTextAnswer | null;
  export type LikertAnswer = string | null;
  // Likert is stored as a string ('1'..'N') for symmetry with radio. The
  // value is parsed at validation time. (Mirrors the prototype.)

  export type CheckboxGroupAnswer =
    | string[]                                              // no "other"
    | { values: string[]; otherText: string }               // "other" enabled
    | null;

  export interface CompetencyRubricRowAnswer {
    rating: 'emerging' | 'developing' | 'ready' | null;
    notes: string;
  }

  export type AnswerFor<T extends QuestionType> =
    T extends 'textarea' ? TextareaAnswer :
    T extends 'short-text' ? ShortTextAnswer :
    T extends 'radio' ? RadioAnswer :
    T extends 'checkbox-group' ? CheckboxGroupAnswer :
    T extends 'likert' ? LikertAnswer :
    T extends 'competency-rubric-row' ? CompetencyRubricRowAnswer :
    never;

  // Live UI state: a map of question.id -> answer (loose to accommodate partial fills).
  export type Answers = Record<string, unknown>;

  // The wire shape that goes into assessment_submissions.answers JSONB.
  export type SerializedAnswers = Record<string, unknown>;

  // Result of validation.
  export interface ValidationResult {
    ok: boolean;
    errors: Record<string, string>;
    // `errors.__minRequired` carries a set-level error (mirrors prototype).
  }

  // ---------------- Question Set ----------------

  export type QuestionSetKind =
    | 'standard'
    | 'competency-core'
    | 'competency-cohort'
    | 'competency-intern';

  export interface QuestionSet {
    id: string;
    kind: QuestionSetKind;
    name: string;
    cohortId: string | null;
    internId: string | null;
    minRequired: number | null;
    allowMultiple: boolean;
    lastEditedAt: string; // ISO-8601
    questions: Question[];
  }

  // For stitched competency: original question plus the tier it came from.
  export interface StitchedQuestion extends Question {
    tier: 'core' | 'cohort' | 'intern';
  }

  export interface SectionBoundary {
    afterIndex: number; // -1 means "before everything"
    label: string;
    subLabel?: string;
  }

  export interface StitchedCompetencySet {
    internId: string;
    questions: StitchedQuestion[];
    sectionBoundaries: SectionBoundary[];
  }
  ```

- [ ] **Step 2: Run typecheck**

  ```bash
  npm run typecheck
  ```

  Expected: zero errors.

- [ ] **Step 3: Commit**

  ```bash
  git add app/lib/question-types.ts
  git commit -m "Sub-project 3 task 1: add shared question discriminated-union types"
  ```

### Task 2: Implement `isAnswered`

**Files:**
- Create: `app/lib/question-engine.ts`
- Test: `tests/lib/question-engine.test.ts`

- [ ] **Step 1: Write the failing test for `isAnswered`**

  Create `tests/lib/question-engine.test.ts`:

  ```ts
  import { describe, it, expect } from 'vitest';
  import { isAnswered, validateAnswers, serializeAnswers } from '../../app/lib/question-engine';
  import type { Question } from '../../app/lib/question-types';

  const textareaQ: Question = {
    id: 'q1', type: 'textarea', label: 'L', required: true, sortOrder: 1,
    config: { rows: 4, placeholder: '' },
  };
  const shortQ: Question = {
    id: 'q2', type: 'short-text', label: 'L', required: false, sortOrder: 2,
    config: { placeholder: '', maxLength: 200 },
  };
  const radioQ: Question = {
    id: 'q3', type: 'radio', label: 'L', required: true, sortOrder: 3,
    config: { options: [{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }], otherWithText: true },
  };
  const checkQ: Question = {
    id: 'q4', type: 'checkbox-group', label: 'L', required: false, sortOrder: 4,
    config: { options: [{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }], otherWithText: true },
  };
  const likertQ: Question = {
    id: 'q5', type: 'likert', label: 'L', required: false, sortOrder: 5,
    config: { min: 1, max: 5, leftLabel: 'lo', rightLabel: 'hi' },
  };
  const rubricQ: Question = {
    id: 'q6', type: 'competency-rubric-row', label: 'L', required: false, sortOrder: 6,
    config: {},
  };

  describe('isAnswered', () => {
    it('textarea: empty string is unanswered, whitespace is unanswered, content is answered', () => {
      expect(isAnswered(textareaQ, '')).toBe(false);
      expect(isAnswered(textareaQ, '   ')).toBe(false);
      expect(isAnswered(textareaQ, 'a')).toBe(true);
      expect(isAnswered(textareaQ, null)).toBe(false);
      expect(isAnswered(textareaQ, undefined)).toBe(false);
    });
    it('short-text: same rules as textarea', () => {
      expect(isAnswered(shortQ, '')).toBe(false);
      expect(isAnswered(shortQ, 'x')).toBe(true);
    });
    it('radio: simple value is answered', () => {
      expect(isAnswered(radioQ, 'yes')).toBe(true);
      expect(isAnswered(radioQ, null)).toBe(false);
    });
    it('radio: other-with-empty-text is unanswered', () => {
      expect(isAnswered(radioQ, { value: '__other', otherText: '' })).toBe(false);
      expect(isAnswered(radioQ, { value: '__other', otherText: '  ' })).toBe(false);
    });
    it('radio: other-with-text is answered', () => {
      expect(isAnswered(radioQ, { value: '__other', otherText: 'reason' })).toBe(true);
    });
    it('checkbox-group: empty array is unanswered, non-empty is answered', () => {
      expect(isAnswered(checkQ, [])).toBe(false);
      expect(isAnswered(checkQ, ['a'])).toBe(true);
    });
    it('checkbox-group: other-text-only is answered', () => {
      expect(isAnswered(checkQ, { values: [], otherText: 'note' })).toBe(true);
      expect(isAnswered(checkQ, { values: [], otherText: '' })).toBe(false);
    });
    it('likert: numeric string is answered', () => {
      expect(isAnswered(likertQ, '3')).toBe(true);
      expect(isAnswered(likertQ, null)).toBe(false);
      expect(isAnswered(likertQ, '')).toBe(false);
    });
    it('competency-rubric-row: rating present is answered, missing rating is not', () => {
      expect(isAnswered(rubricQ, { rating: 'ready', notes: '' })).toBe(true);
      expect(isAnswered(rubricQ, { rating: null, notes: 'some notes' })).toBe(false);
      expect(isAnswered(rubricQ, null)).toBe(false);
    });
  });
  ```

- [ ] **Step 2: Run test to verify it fails**

  ```bash
  npm run test -- tests/lib/question-engine.test.ts
  ```

  Expected: FAIL with `Cannot find module '../../app/lib/question-engine'` or similar.

- [ ] **Step 3: Implement `isAnswered` in `app/lib/question-engine.ts`**

  ```ts
  import type {
    Question,
    Answers,
    ValidationResult,
    SerializedAnswers,
    OtherWithTextAnswer,
    CompetencyRubricRowAnswer,
  } from './question-types';

  function isOtherWithText(v: unknown): v is OtherWithTextAnswer {
    return (
      typeof v === 'object' &&
      v !== null &&
      (v as { value?: unknown }).value === '__other'
    );
  }

  function isCompetencyAnswer(v: unknown): v is CompetencyRubricRowAnswer {
    return typeof v === 'object' && v !== null && 'rating' in (v as object);
  }

  export function isAnswered(question: Question, answer: unknown): boolean {
    if (answer === null || answer === undefined) return false;
    switch (question.type) {
      case 'textarea':
      case 'short-text':
        return typeof answer === 'string' && answer.trim().length > 0;
      case 'radio': {
        if (isOtherWithText(answer)) {
          return String(answer.otherText ?? '').trim().length > 0;
        }
        return typeof answer === 'string' && answer.length > 0;
      }
      case 'likert':
        return typeof answer === 'string' && answer.length > 0;
      case 'checkbox-group': {
        if (Array.isArray(answer)) return answer.length > 0;
        if (typeof answer === 'object' && answer !== null) {
          const a = answer as { values?: unknown[]; otherText?: unknown };
          const hasValues = Array.isArray(a.values) && a.values.length > 0;
          const hasOther = String(a.otherText ?? '').trim().length > 0;
          return hasValues || hasOther;
        }
        return false;
      }
      case 'competency-rubric-row': {
        if (!isCompetencyAnswer(answer)) return false;
        return answer.rating !== null && answer.rating !== undefined;
      }
    }
  }

  // validateAnswers + serializeAnswers come in subsequent tasks.
  export function validateAnswers(
    _questions: Question[],
    _answers: Answers,
    _opts?: { minRequired?: number | null },
  ): ValidationResult {
    throw new Error('not yet implemented');
  }

  export function serializeAnswers(
    _questions: Question[],
    _answers: Answers,
  ): SerializedAnswers {
    throw new Error('not yet implemented');
  }
  ```

- [ ] **Step 4: Run test to verify the `isAnswered` block passes**

  ```bash
  npm run test -- tests/lib/question-engine.test.ts -t isAnswered
  ```

  Expected: PASS (12 expectations across 8 it-blocks).

- [ ] **Step 5: Commit**

  ```bash
  git add app/lib/question-engine.ts tests/lib/question-engine.test.ts
  git commit -m "Sub-project 3 task 2: implement isAnswered with per-type coverage"
  ```

### Task 3: Implement `validateAnswers`

**Files:**
- Modify: `app/lib/question-engine.ts`
- Modify: `tests/lib/question-engine.test.ts`

- [ ] **Step 1: Append the failing tests**

  Append to `tests/lib/question-engine.test.ts`:

  ```ts
  describe('validateAnswers', () => {
    it('required textarea: empty -> error, filled -> no error', () => {
      const r1 = validateAnswers([textareaQ], { q1: '' });
      expect(r1.ok).toBe(false);
      expect(r1.errors.q1).toBe('Required');

      const r2 = validateAnswers([textareaQ], { q1: 'hello' });
      expect(r2.ok).toBe(true);
      expect(r2.errors).toEqual({});
    });
    it('non-required is never flagged', () => {
      const r = validateAnswers([shortQ], { q2: '' });
      expect(r.ok).toBe(true);
      expect(r.errors).toEqual({});
    });
    it('radio: invalid option value triggers per-question error', () => {
      const r = validateAnswers([radioQ], { q3: 'banana' });
      expect(r.ok).toBe(false);
      expect(r.errors.q3).toBe('Invalid selection');
    });
    it('radio: __other accepted when otherWithText config is true', () => {
      const r = validateAnswers([radioQ], { q3: { value: '__other', otherText: 'reason' } });
      expect(r.ok).toBe(true);
    });
    it('checkbox-group: an unknown option value triggers an error', () => {
      const r = validateAnswers([checkQ], { q4: ['a', 'z'] });
      expect(r.ok).toBe(false);
      expect(r.errors.q4).toBe('Invalid selection');
    });
    it('likert: out-of-range numeric string is rejected', () => {
      const r1 = validateAnswers([likertQ], { q5: '0' });
      expect(r1.ok).toBe(false);
      expect(r1.errors.q5).toBe('Out of range');
      const r2 = validateAnswers([likertQ], { q5: '6' });
      expect(r2.ok).toBe(false);
      const r3 = validateAnswers([likertQ], { q5: '3' });
      expect(r3.ok).toBe(true);
    });
    it('competency-rubric-row: a rating not in the enum is rejected', () => {
      const r = validateAnswers([rubricQ], { q6: { rating: 'great', notes: '' } });
      expect(r.ok).toBe(false);
      expect(r.errors.q6).toBe('Invalid rating');
    });
    it('set-level minRequired: collects __minRequired error when threshold not met', () => {
      const r = validateAnswers(
        [textareaQ, shortQ, radioQ],
        { q1: 'hi', q2: '', q3: null },
        { minRequired: 2 },
      );
      expect(r.ok).toBe(false);
      expect(r.errors.__minRequired).toMatch(/at least 2 of 3/);
    });
    it('reports all errors, not just the first', () => {
      const r = validateAnswers(
        [textareaQ, radioQ],
        { q1: '', q3: 'banana' },
      );
      expect(Object.keys(r.errors).sort()).toEqual(['q1', 'q3']);
    });
  });
  ```

- [ ] **Step 2: Run test to verify it fails**

  ```bash
  npm run test -- tests/lib/question-engine.test.ts -t validateAnswers
  ```

  Expected: FAIL with `Error: not yet implemented`.

- [ ] **Step 3: Implement `validateAnswers`**

  Replace the stub in `app/lib/question-engine.ts`:

  ```ts
  export function validateAnswers(
    questions: Question[],
    answers: Answers,
    opts: { minRequired?: number | null } = {},
  ): ValidationResult {
    const errors: Record<string, string> = {};
    let answeredCount = 0;

    for (const q of questions) {
      const a = answers[q.id];
      const answered = isAnswered(q, a);
      if (answered) answeredCount++;
      if (q.required && !answered) {
        errors[q.id] = 'Required';
        continue;
      }
      if (!answered) continue;

      // Type-specific shape/range checks (only applied when answered).
      switch (q.type) {
        case 'radio': {
          if (isOtherWithText(a)) {
            if (!q.config.otherWithText) errors[q.id] = 'Invalid selection';
            break;
          }
          const allowed = q.config.options.map((o) => o.value);
          if (typeof a !== 'string' || !allowed.includes(a)) {
            errors[q.id] = 'Invalid selection';
          }
          break;
        }
        case 'likert': {
          const n = typeof a === 'string' ? Number(a) : NaN;
          if (!Number.isFinite(n) || n < q.config.min || n > q.config.max) {
            errors[q.id] = 'Out of range';
          }
          break;
        }
        case 'checkbox-group': {
          const allowed = q.config.options.map((o) => o.value);
          let values: unknown[] = [];
          if (Array.isArray(a)) values = a;
          else if (typeof a === 'object' && a !== null) {
            const v = (a as { values?: unknown[] }).values;
            if (Array.isArray(v)) values = v;
          }
          for (const v of values) {
            if (typeof v !== 'string' || !allowed.includes(v)) {
              errors[q.id] = 'Invalid selection';
              break;
            }
          }
          break;
        }
        case 'competency-rubric-row': {
          const rating = isCompetencyAnswer(a) ? a.rating : null;
          if (
            rating !== null &&
            rating !== 'emerging' &&
            rating !== 'developing' &&
            rating !== 'ready'
          ) {
            errors[q.id] = 'Invalid rating';
          }
          break;
        }
        case 'textarea':
        case 'short-text':
          // No further shape constraints beyond isAnswered.
          break;
      }
    }

    if (
      typeof opts.minRequired === 'number' &&
      opts.minRequired > 0 &&
      answeredCount < opts.minRequired
    ) {
      errors.__minRequired =
        `Please answer at least ${opts.minRequired} of ${questions.length} questions before submitting.`;
    }

    return { ok: Object.keys(errors).length === 0, errors };
  }
  ```

- [ ] **Step 4: Run test to verify it passes**

  ```bash
  npm run test -- tests/lib/question-engine.test.ts -t validateAnswers
  ```

  Expected: PASS.

- [ ] **Step 5: Commit**

  ```bash
  git add app/lib/question-engine.ts tests/lib/question-engine.test.ts
  git commit -m "Sub-project 3 task 3: implement validateAnswers with per-type and set-level checks"
  ```

### Task 4: Implement `serializeAnswers`

**Files:**
- Modify: `app/lib/question-engine.ts`
- Modify: `tests/lib/question-engine.test.ts`

- [ ] **Step 1: Append the failing tests**

  Append to `tests/lib/question-engine.test.ts`:

  ```ts
  describe('serializeAnswers', () => {
    it('drops keys for questions not in the set', () => {
      const out = serializeAnswers([textareaQ], { q1: 'hi', orphan: 'x' });
      expect(out).toEqual({ q1: 'hi' });
    });
    it('coerces undefined to null for unanswered questions', () => {
      const out = serializeAnswers([textareaQ, shortQ], { q1: 'hi' });
      expect(out).toEqual({ q1: 'hi', q2: null });
    });
    it('preserves radio __other shape verbatim', () => {
      const out = serializeAnswers([radioQ], {
        q3: { value: '__other', otherText: 'reason' },
      });
      expect(out).toEqual({ q3: { value: '__other', otherText: 'reason' } });
    });
    it('preserves checkbox other-with-text shape verbatim', () => {
      const out = serializeAnswers([checkQ], {
        q4: { values: ['a'], otherText: 'extra' },
      });
      expect(out).toEqual({ q4: { values: ['a'], otherText: 'extra' } });
    });
    it('preserves competency-rubric-row shape verbatim', () => {
      const out = serializeAnswers([rubricQ], {
        q6: { rating: 'ready', notes: 'great' },
      });
      expect(out).toEqual({ q6: { rating: 'ready', notes: 'great' } });
    });
    it('trims textarea answers', () => {
      const out = serializeAnswers([textareaQ], { q1: '  hi  ' });
      expect(out).toEqual({ q1: 'hi' });
    });
    it('result is JSON-roundtrippable', () => {
      const out = serializeAnswers([textareaQ, radioQ, checkQ, likertQ, rubricQ], {
        q1: 'hi',
        q3: 'yes',
        q4: ['a', 'b'],
        q5: '4',
        q6: { rating: 'developing', notes: 'note' },
      });
      const round = JSON.parse(JSON.stringify(out));
      expect(round).toEqual(out);
    });
  });
  ```

- [ ] **Step 2: Run test to verify it fails**

  ```bash
  npm run test -- tests/lib/question-engine.test.ts -t serializeAnswers
  ```

  Expected: FAIL with `Error: not yet implemented`.

- [ ] **Step 3: Implement `serializeAnswers`**

  Replace the stub in `app/lib/question-engine.ts`:

  ```ts
  export function serializeAnswers(
    questions: Question[],
    answers: Answers,
  ): SerializedAnswers {
    const out: SerializedAnswers = {};
    for (const q of questions) {
      const a = answers[q.id];
      if (a === undefined || a === null) {
        out[q.id] = null;
        continue;
      }
      switch (q.type) {
        case 'textarea':
        case 'short-text': {
          out[q.id] = typeof a === 'string' ? a.trim() : null;
          break;
        }
        case 'radio': {
          if (isOtherWithText(a)) {
            out[q.id] = { value: '__other', otherText: String(a.otherText ?? '').trim() };
          } else if (typeof a === 'string') {
            out[q.id] = a;
          } else {
            out[q.id] = null;
          }
          break;
        }
        case 'likert': {
          out[q.id] = typeof a === 'string' ? a : null;
          break;
        }
        case 'checkbox-group': {
          if (Array.isArray(a)) {
            out[q.id] = a.filter((v): v is string => typeof v === 'string');
          } else if (typeof a === 'object') {
            const obj = a as { values?: unknown[]; otherText?: unknown };
            out[q.id] = {
              values: Array.isArray(obj.values)
                ? obj.values.filter((v): v is string => typeof v === 'string')
                : [],
              otherText: String(obj.otherText ?? '').trim(),
            };
          } else {
            out[q.id] = null;
          }
          break;
        }
        case 'competency-rubric-row': {
          if (isCompetencyAnswer(a)) {
            out[q.id] = {
              rating: a.rating ?? null,
              notes: String(a.notes ?? '').trim(),
            };
          } else {
            out[q.id] = null;
          }
          break;
        }
      }
    }
    return out;
  }
  ```

- [ ] **Step 4: Run test to verify it passes**

  ```bash
  npm run test -- tests/lib/question-engine.test.ts
  ```

  Expected: ALL pass (isAnswered + validateAnswers + serializeAnswers).

- [ ] **Step 5: Commit**

  ```bash
  git add app/lib/question-engine.ts tests/lib/question-engine.test.ts
  git commit -m "Sub-project 3 task 4: implement serializeAnswers with stable wire shape"
  ```

---

## Phase B: Renderer components, one per type

All renderer components are pure & controlled. Props shape (every type renderer accepts the same prop contract):

```ts
interface TypeRendererProps<Q extends Question> {
  question: Q;
  index: number;                    // 0-based; rendered as "01", "02", ...
  value: AnswerFor<Q['type']> | null | undefined;
  onChange: (next: AnswerFor<Q['type']>) => void;
  disabled?: boolean;
  error?: string;
}
```

`<QuestionRenderer>` is the top-level dispatcher with this prop shape:

```ts
interface QuestionRendererProps {
  questions: Question[];
  answers: Answers;
  errors?: Record<string, string>;
  disabled?: boolean;
  onChange: (questionId: string, next: unknown) => void;
  sectionBoundaries?: SectionBoundary[];   // optional, for competency
}
```

### Task 5: `QuestionShell` + `SectionHeader` (shared wrappers)

**Files:**
- Create: `app/components/question-renderer/QuestionShell.tsx`
- Create: `app/components/question-renderer/SectionHeader.tsx`
- Create: `app/components/question-renderer/styles.css`

- [ ] **Step 1: Lift the styles from the prototype**

  Create `app/components/question-renderer/styles.css` with the `.assessment-question*`, `.assessment-options`, `.assessment-radio`, `.assessment-check`, `.assessment-likert*`, `.assessment-rubric*`, `.rubric-section-head*` rule blocks from `Prototypes/PROTOTYPE/styles.css`. Copy them verbatim (do not paraphrase). Adjust selectors only where the prototype's CSS depended on global utility classes that don't exist in the new app (`var(--font-body)` etc.) — those tokens are defined in sub-project 1's `app/styles/tokens.css`.

  At the bottom of the file, add:

  ```css
  .assessment-question--has-error .assessment-question__input,
  .assessment-question--has-error .assessment-options,
  .assessment-question--has-error .assessment-likert,
  .assessment-question--has-error .assessment-rubric-row {
    box-shadow: 0 0 0 2px var(--danger, #d4351c);
    border-radius: 4px;
  }
  .assessment-question__error {
    color: var(--danger, #d4351c);
    font-size: 13px;
    margin-top: 6px;
  }
  ```

- [ ] **Step 2: Create `QuestionShell.tsx`**

  ```tsx
  import './styles.css';

  interface QuestionShellProps {
    questionId: string;
    type: string;
    index: number;
    label: string;
    helperText?: string;
    error?: string;
    children: React.ReactNode;
  }

  function pad2(n: number) {
    return String(n + 1).padStart(2, '0');
  }

  export function QuestionShell({
    questionId, type, index, label, helperText, error, children,
  }: QuestionShellProps) {
    const num = pad2(index);
    return (
      <div
        className={`assessment-question${error ? ' assessment-question--has-error' : ''}`}
        data-qid={questionId}
        data-qtype={type}
      >
        <div className="assessment-question__head">
          <span className="assessment-question__num">{num}</span>
          <div>
            <span className="assessment-question__label">Question {num}</span>
            <p className="assessment-question__text">{label}</p>
            {helperText ? (
              <span className="assessment-question__hint">{helperText}</span>
            ) : null}
          </div>
        </div>
        {children}
        {error ? <p className="assessment-question__error">{error}</p> : null}
      </div>
    );
  }
  ```

- [ ] **Step 3: Create `SectionHeader.tsx`**

  ```tsx
  interface SectionHeaderProps {
    label: string;
    subLabel?: string;
  }

  export function SectionHeader({ label, subLabel }: SectionHeaderProps) {
    return (
      <header className="rubric-section-head">
        <div>
          <span className="rubric-section-head__label">Section</span>
          <h2 className="rubric-section-head__title">{label}</h2>
        </div>
        {subLabel ? (
          <span className="rubric-section-head__aside">{subLabel}</span>
        ) : null}
      </header>
    );
  }
  ```

- [ ] **Step 4: Run typecheck**

  ```bash
  npm run typecheck
  ```

  Expected: zero errors.

- [ ] **Step 5: Commit**

  ```bash
  git add app/components/question-renderer/QuestionShell.tsx \
          app/components/question-renderer/SectionHeader.tsx \
          app/components/question-renderer/styles.css
  git commit -m "Sub-project 3 task 5: add QuestionShell + SectionHeader + renderer styles"
  ```

### Task 6: `TextareaQuestion`

**Files:**
- Create: `app/components/question-renderer/TextareaQuestion.tsx`
- Test: `tests/components/TextareaQuestion.test.tsx`

- [ ] **Step 1: Write the failing test**

  ```tsx
  import { describe, it, expect, vi } from 'vitest';
  import { render, screen, fireEvent } from '@testing-library/react';
  import { TextareaQuestion } from '../../app/components/question-renderer/TextareaQuestion';
  import type { TextareaQuestion as Q } from '../../app/lib/question-types';

  const q: Q = {
    id: 'q1', type: 'textarea',
    label: 'Tell us why.', helperText: 'Be specific.',
    required: true, sortOrder: 1,
    config: { rows: 5, placeholder: 'Your response...' },
  };

  describe('TextareaQuestion', () => {
    it('renders label, helper text, and configured placeholder + rows', () => {
      render(<TextareaQuestion question={q} index={0} value="" onChange={() => {}} />);
      expect(screen.getByText('Tell us why.')).toBeInTheDocument();
      expect(screen.getByText('Be specific.')).toBeInTheDocument();
      const ta = screen.getByRole('textbox') as HTMLTextAreaElement;
      expect(ta.placeholder).toBe('Your response...');
      expect(ta.rows).toBe(5);
    });
    it('is fully controlled — value prop is reflected, onChange fires with new string', () => {
      const onChange = vi.fn();
      render(<TextareaQuestion question={q} index={0} value="seed" onChange={onChange} />);
      const ta = screen.getByRole('textbox') as HTMLTextAreaElement;
      expect(ta.value).toBe('seed');
      fireEvent.change(ta, { target: { value: 'updated' } });
      expect(onChange).toHaveBeenCalledWith('updated');
    });
    it('renders error and applies error class on the wrapper', () => {
      render(<TextareaQuestion question={q} index={0} value="" onChange={() => {}} error="Required" />);
      expect(screen.getByText('Required')).toBeInTheDocument();
      expect(document.querySelector('.assessment-question--has-error')).toBeTruthy();
    });
    it('respects disabled', () => {
      render(<TextareaQuestion question={q} index={0} value="" onChange={() => {}} disabled />);
      expect(screen.getByRole('textbox')).toBeDisabled();
    });
  });
  ```

- [ ] **Step 2: Run test to verify it fails**

  ```bash
  npm run test -- tests/components/TextareaQuestion.test.tsx
  ```

  Expected: FAIL (module not found).

- [ ] **Step 3: Implement**

  ```tsx
  import { QuestionShell } from './QuestionShell';
  import type { TextareaQuestion as Q } from '../../lib/question-types';

  interface Props {
    question: Q;
    index: number;
    value: string | null | undefined;
    onChange: (next: string) => void;
    disabled?: boolean;
    error?: string;
  }

  export function TextareaQuestion({ question, index, value, onChange, disabled, error }: Props) {
    const cfg = question.config;
    return (
      <QuestionShell
        questionId={question.id}
        type={question.type}
        index={index}
        label={question.label}
        helperText={question.helperText}
        error={error}
      >
        <textarea
          className="assessment-question__input"
          rows={cfg.rows}
          placeholder={cfg.placeholder}
          value={value ?? ''}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          data-qinput
        />
      </QuestionShell>
    );
  }
  ```

- [ ] **Step 4: Run test to verify it passes**

  ```bash
  npm run test -- tests/components/TextareaQuestion.test.tsx
  ```

  Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

  ```bash
  git add app/components/question-renderer/TextareaQuestion.tsx tests/components/TextareaQuestion.test.tsx
  git commit -m "Sub-project 3 task 6: add TextareaQuestion renderer"
  ```

### Task 7: `ShortTextQuestion`

**Files:**
- Create: `app/components/question-renderer/ShortTextQuestion.tsx`
- Test: `tests/components/ShortTextQuestion.test.tsx`

- [ ] **Step 1: Write the failing test**

  ```tsx
  import { describe, it, expect, vi } from 'vitest';
  import { render, screen, fireEvent } from '@testing-library/react';
  import { ShortTextQuestion } from '../../app/components/question-renderer/ShortTextQuestion';
  import type { ShortTextQuestion as Q } from '../../app/lib/question-types';

  const q: Q = {
    id: 'q-st', type: 'short-text',
    label: 'In one phrase, ...', required: false, sortOrder: 1,
    config: { placeholder: 'A short phrase...', maxLength: 80 },
  };

  describe('ShortTextQuestion', () => {
    it('renders a text input with configured placeholder + maxLength', () => {
      render(<ShortTextQuestion question={q} index={0} value="" onChange={() => {}} />);
      const inp = screen.getByRole('textbox') as HTMLInputElement;
      expect(inp.type).toBe('text');
      expect(inp.placeholder).toBe('A short phrase...');
      expect(inp.maxLength).toBe(80);
    });
    it('is controlled and propagates onChange', () => {
      const onChange = vi.fn();
      render(<ShortTextQuestion question={q} index={0} value="hi" onChange={onChange} />);
      const inp = screen.getByRole('textbox') as HTMLInputElement;
      expect(inp.value).toBe('hi');
      fireEvent.change(inp, { target: { value: 'updated' } });
      expect(onChange).toHaveBeenCalledWith('updated');
    });
    it('renders error', () => {
      render(<ShortTextQuestion question={q} index={0} value="" onChange={() => {}} error="Required" />);
      expect(screen.getByText('Required')).toBeInTheDocument();
    });
  });
  ```

- [ ] **Step 2: Run test to verify it fails**

  ```bash
  npm run test -- tests/components/ShortTextQuestion.test.tsx
  ```

  Expected: FAIL (module not found).

- [ ] **Step 3: Implement**

  ```tsx
  import { QuestionShell } from './QuestionShell';
  import type { ShortTextQuestion as Q } from '../../lib/question-types';

  interface Props {
    question: Q;
    index: number;
    value: string | null | undefined;
    onChange: (next: string) => void;
    disabled?: boolean;
    error?: string;
  }

  export function ShortTextQuestion({ question, index, value, onChange, disabled, error }: Props) {
    const cfg = question.config;
    return (
      <QuestionShell
        questionId={question.id}
        type={question.type}
        index={index}
        label={question.label}
        helperText={question.helperText}
        error={error}
      >
        <input
          className="assessment-question__input"
          type="text"
          placeholder={cfg.placeholder}
          maxLength={cfg.maxLength}
          value={value ?? ''}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          data-qinput
        />
      </QuestionShell>
    );
  }
  ```

- [ ] **Step 4: Run test to verify it passes**

  ```bash
  npm run test -- tests/components/ShortTextQuestion.test.tsx
  ```

  Expected: PASS.

- [ ] **Step 5: Commit**

  ```bash
  git add app/components/question-renderer/ShortTextQuestion.tsx tests/components/ShortTextQuestion.test.tsx
  git commit -m "Sub-project 3 task 7: add ShortTextQuestion renderer"
  ```

### Task 8: `RadioQuestion`

**Files:**
- Create: `app/components/question-renderer/RadioQuestion.tsx`
- Test: `tests/components/RadioQuestion.test.tsx`

- [ ] **Step 1: Write the failing test**

  ```tsx
  import { describe, it, expect, vi } from 'vitest';
  import { render, screen, fireEvent } from '@testing-library/react';
  import { RadioQuestion } from '../../app/components/question-renderer/RadioQuestion';
  import type { RadioQuestion as Q } from '../../app/lib/question-types';

  const baseQ: Q = {
    id: 'q-r', type: 'radio',
    label: 'Why?', required: true, sortOrder: 1,
    config: {
      options: [
        { value: 'a', label: 'Option A' },
        { value: 'b', label: 'Option B' },
      ],
      otherWithText: false,
    },
  };
  const otherQ: Q = { ...baseQ, config: { ...baseQ.config, otherWithText: true } };

  describe('RadioQuestion', () => {
    it('renders one input per option', () => {
      render(<RadioQuestion question={baseQ} index={0} value={null} onChange={() => {}} />);
      const radios = screen.getAllByRole('radio');
      expect(radios).toHaveLength(2);
      expect(screen.getByLabelText('Option A')).toBeInTheDocument();
      expect(screen.getByLabelText('Option B')).toBeInTheDocument();
    });
    it('marks the option matching `value` as checked', () => {
      render(<RadioQuestion question={baseQ} index={0} value="b" onChange={() => {}} />);
      expect((screen.getByLabelText('Option B') as HTMLInputElement).checked).toBe(true);
    });
    it('fires onChange with the option value when clicked', () => {
      const onChange = vi.fn();
      render(<RadioQuestion question={baseQ} index={0} value={null} onChange={onChange} />);
      fireEvent.click(screen.getByLabelText('Option A'));
      expect(onChange).toHaveBeenCalledWith('a');
    });
    it('with otherWithText: shows an Other input only when __other selected', () => {
      const onChange = vi.fn();
      const { rerender } = render(
        <RadioQuestion question={otherQ} index={0} value={null} onChange={onChange} />,
      );
      expect(screen.queryByPlaceholderText('Please specify...')).toBeNull();
      fireEvent.click(screen.getByLabelText('Other'));
      expect(onChange).toHaveBeenCalledWith({ value: '__other', otherText: '' });
      rerender(
        <RadioQuestion
          question={otherQ}
          index={0}
          value={{ value: '__other', otherText: '' }}
          onChange={onChange}
        />,
      );
      const inp = screen.getByPlaceholderText('Please specify...') as HTMLInputElement;
      expect(inp).toBeInTheDocument();
      fireEvent.change(inp, { target: { value: 'because' } });
      expect(onChange).toHaveBeenLastCalledWith({ value: '__other', otherText: 'because' });
    });
    it('renders error message', () => {
      render(<RadioQuestion question={baseQ} index={0} value={null} onChange={() => {}} error="Required" />);
      expect(screen.getByText('Required')).toBeInTheDocument();
    });
  });
  ```

- [ ] **Step 2: Run test to verify it fails**

  ```bash
  npm run test -- tests/components/RadioQuestion.test.tsx
  ```

  Expected: FAIL (module not found).

- [ ] **Step 3: Implement**

  ```tsx
  import { QuestionShell } from './QuestionShell';
  import type { RadioQuestion as Q, RadioAnswer } from '../../lib/question-types';

  interface Props {
    question: Q;
    index: number;
    value: RadioAnswer;
    onChange: (next: RadioAnswer) => void;
    disabled?: boolean;
    error?: string;
  }

  function selectedSimple(value: RadioAnswer): string | null {
    if (value === null || value === undefined) return null;
    if (typeof value === 'object') return null;
    return value;
  }

  function selectedIsOther(value: RadioAnswer): boolean {
    return typeof value === 'object' && value !== null && value.value === '__other';
  }

  function otherText(value: RadioAnswer): string {
    return typeof value === 'object' && value !== null ? value.otherText : '';
  }

  export function RadioQuestion({ question, index, value, onChange, disabled, error }: Props) {
    const cfg = question.config;
    const groupName = `q-${question.id}`;
    const isOther = selectedIsOther(value);
    const simple = selectedSimple(value);

    return (
      <QuestionShell
        questionId={question.id}
        type={question.type}
        index={index}
        label={question.label}
        helperText={question.helperText}
        error={error}
      >
        <div className="assessment-options" data-qoptions>
          {cfg.options.map((o) => (
            <label key={o.value} className="assessment-radio">
              <input
                type="radio"
                name={groupName}
                value={o.value}
                checked={simple === o.value}
                disabled={disabled}
                onChange={() => onChange(o.value)}
                data-qinput
              />
              <span>{o.label}</span>
            </label>
          ))}
          {cfg.otherWithText ? (
            <>
              <label className="assessment-radio">
                <input
                  type="radio"
                  name={groupName}
                  value="__other"
                  checked={isOther}
                  disabled={disabled}
                  onChange={() => onChange({ value: '__other', otherText: otherText(value) })}
                  data-qinput
                />
                <span>Other</span>
              </label>
              {isOther ? (
                <input
                  type="text"
                  className="assessment-question__input assessment-other-text"
                  placeholder="Please specify..."
                  value={otherText(value)}
                  disabled={disabled}
                  onChange={(e) => onChange({ value: '__other', otherText: e.target.value })}
                  data-other-text
                  style={{ marginTop: 8 }}
                />
              ) : null}
            </>
          ) : null}
        </div>
      </QuestionShell>
    );
  }
  ```

- [ ] **Step 4: Run test to verify it passes**

  ```bash
  npm run test -- tests/components/RadioQuestion.test.tsx
  ```

  Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

  ```bash
  git add app/components/question-renderer/RadioQuestion.tsx tests/components/RadioQuestion.test.tsx
  git commit -m "Sub-project 3 task 8: add RadioQuestion renderer with otherWithText support"
  ```

### Task 9: `CheckboxGroupQuestion`

**Files:**
- Create: `app/components/question-renderer/CheckboxGroupQuestion.tsx`
- Test: `tests/components/CheckboxGroupQuestion.test.tsx`

- [ ] **Step 1: Write the failing test**

  ```tsx
  import { describe, it, expect, vi } from 'vitest';
  import { render, screen, fireEvent } from '@testing-library/react';
  import { CheckboxGroupQuestion } from '../../app/components/question-renderer/CheckboxGroupQuestion';
  import type { CheckboxGroupQuestion as Q } from '../../app/lib/question-types';

  const q: Q = {
    id: 'q-cb', type: 'checkbox-group',
    label: 'Pick any', required: false, sortOrder: 1,
    config: {
      options: [
        { value: 'a', label: 'Apples' },
        { value: 'b', label: 'Bananas' },
        { value: 'c', label: 'Cherries' },
      ],
      otherWithText: true,
    },
  };

  describe('CheckboxGroupQuestion', () => {
    it('renders one checkbox per option plus an Other when configured', () => {
      render(<CheckboxGroupQuestion question={q} index={0} value={[]} onChange={() => {}} />);
      expect(screen.getAllByRole('checkbox')).toHaveLength(4);
    });
    it('reflects array value as checked state', () => {
      render(<CheckboxGroupQuestion question={q} index={0} value={['a', 'c']} onChange={() => {}} />);
      expect((screen.getByLabelText('Apples') as HTMLInputElement).checked).toBe(true);
      expect((screen.getByLabelText('Bananas') as HTMLInputElement).checked).toBe(false);
      expect((screen.getByLabelText('Cherries') as HTMLInputElement).checked).toBe(true);
    });
    it('toggles array values via onChange', () => {
      const onChange = vi.fn();
      render(<CheckboxGroupQuestion question={q} index={0} value={['a']} onChange={onChange} />);
      fireEvent.click(screen.getByLabelText('Bananas'));
      expect(onChange).toHaveBeenLastCalledWith(['a', 'b']);
      fireEvent.click(screen.getByLabelText('Apples'));
      expect(onChange).toHaveBeenLastCalledWith([]);
    });
    it('selecting Other promotes value into other-with-text object shape', () => {
      const onChange = vi.fn();
      const { rerender } = render(
        <CheckboxGroupQuestion question={q} index={0} value={['a']} onChange={onChange} />,
      );
      fireEvent.click(screen.getByLabelText('Other'));
      expect(onChange).toHaveBeenLastCalledWith({ values: ['a'], otherText: '' });
      rerender(
        <CheckboxGroupQuestion
          question={q} index={0}
          value={{ values: ['a'], otherText: '' }}
          onChange={onChange}
        />,
      );
      const otherInp = screen.getByPlaceholderText('Please specify...') as HTMLInputElement;
      fireEvent.change(otherInp, { target: { value: 'durian' } });
      expect(onChange).toHaveBeenLastCalledWith({ values: ['a'], otherText: 'durian' });
    });
    it('unselecting Other reverts the value to a plain array', () => {
      const onChange = vi.fn();
      render(
        <CheckboxGroupQuestion
          question={q} index={0}
          value={{ values: ['a'], otherText: 'durian' }}
          onChange={onChange}
        />,
      );
      fireEvent.click(screen.getByLabelText('Other'));
      expect(onChange).toHaveBeenLastCalledWith(['a']);
    });
  });
  ```

- [ ] **Step 2: Run test to verify it fails**

  ```bash
  npm run test -- tests/components/CheckboxGroupQuestion.test.tsx
  ```

  Expected: FAIL (module not found).

- [ ] **Step 3: Implement**

  ```tsx
  import { QuestionShell } from './QuestionShell';
  import type { CheckboxGroupQuestion as Q, CheckboxGroupAnswer } from '../../lib/question-types';

  interface Props {
    question: Q;
    index: number;
    value: CheckboxGroupAnswer;
    onChange: (next: CheckboxGroupAnswer) => void;
    disabled?: boolean;
    error?: string;
  }

  function isOtherShape(v: CheckboxGroupAnswer): v is { values: string[]; otherText: string } {
    return typeof v === 'object' && v !== null && !Array.isArray(v);
  }

  function readValues(v: CheckboxGroupAnswer): string[] {
    if (v === null || v === undefined) return [];
    if (Array.isArray(v)) return v;
    if (isOtherShape(v)) return v.values;
    return [];
  }

  function readOtherText(v: CheckboxGroupAnswer): string {
    return isOtherShape(v) ? v.otherText : '';
  }

  function otherIsChecked(v: CheckboxGroupAnswer): boolean {
    return isOtherShape(v);
  }

  export function CheckboxGroupQuestion({ question, index, value, onChange, disabled, error }: Props) {
    const cfg = question.config;
    const values = readValues(value);
    const otherChecked = otherIsChecked(value);
    const otherText = readOtherText(value);

    function toggleOption(optValue: string) {
      const next = values.includes(optValue)
        ? values.filter((v) => v !== optValue)
        : [...values, optValue];
      if (otherChecked) onChange({ values: next, otherText });
      else onChange(next);
    }

    function toggleOther() {
      if (otherChecked) onChange(values);
      else onChange({ values, otherText: '' });
    }

    function updateOtherText(next: string) {
      onChange({ values, otherText: next });
    }

    return (
      <QuestionShell
        questionId={question.id}
        type={question.type}
        index={index}
        label={question.label}
        helperText={question.helperText}
        error={error}
      >
        <div className="assessment-options" data-qoptions>
          {cfg.options.map((o) => (
            <label key={o.value} className="assessment-check">
              <input
                type="checkbox"
                value={o.value}
                checked={values.includes(o.value)}
                disabled={disabled}
                onChange={() => toggleOption(o.value)}
                data-qinput
              />
              <span>{o.label}</span>
            </label>
          ))}
          {cfg.otherWithText ? (
            <>
              <label className="assessment-check">
                <input
                  type="checkbox"
                  value="__other"
                  checked={otherChecked}
                  disabled={disabled}
                  onChange={toggleOther}
                  data-qinput
                />
                <span>Other</span>
              </label>
              {otherChecked ? (
                <input
                  type="text"
                  className="assessment-question__input assessment-other-text"
                  placeholder="Please specify..."
                  value={otherText}
                  disabled={disabled}
                  onChange={(e) => updateOtherText(e.target.value)}
                  data-other-text
                  style={{ marginTop: 8 }}
                />
              ) : null}
            </>
          ) : null}
        </div>
      </QuestionShell>
    );
  }
  ```

- [ ] **Step 4: Run test to verify it passes**

  ```bash
  npm run test -- tests/components/CheckboxGroupQuestion.test.tsx
  ```

  Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

  ```bash
  git add app/components/question-renderer/CheckboxGroupQuestion.tsx tests/components/CheckboxGroupQuestion.test.tsx
  git commit -m "Sub-project 3 task 9: add CheckboxGroupQuestion renderer"
  ```

### Task 10: `LikertQuestion`

**Files:**
- Create: `app/components/question-renderer/LikertQuestion.tsx`
- Test: `tests/components/LikertQuestion.test.tsx`

- [ ] **Step 1: Write the failing test**

  ```tsx
  import { describe, it, expect, vi } from 'vitest';
  import { render, screen, fireEvent } from '@testing-library/react';
  import { LikertQuestion } from '../../app/components/question-renderer/LikertQuestion';
  import type { LikertQuestion as Q } from '../../app/lib/question-types';

  const q: Q = {
    id: 'q-lk', type: 'likert',
    label: 'Rate it', required: false, sortOrder: 1,
    config: { min: 1, max: 5, leftLabel: 'Low', rightLabel: 'High' },
  };

  describe('LikertQuestion', () => {
    it('renders one segment per integer in [min, max] inclusive', () => {
      render(<LikertQuestion question={q} index={0} value={null} onChange={() => {}} />);
      expect(screen.getAllByRole('radio')).toHaveLength(5);
      expect(screen.getByText('Low')).toBeInTheDocument();
      expect(screen.getByText('High')).toBeInTheDocument();
    });
    it('marks the segment matching the string value as checked', () => {
      render(<LikertQuestion question={q} index={0} value="3" onChange={() => {}} />);
      const r3 = screen.getByLabelText('3') as HTMLInputElement;
      expect(r3.checked).toBe(true);
    });
    it('fires onChange with the string value on click', () => {
      const onChange = vi.fn();
      render(<LikertQuestion question={q} index={0} value={null} onChange={onChange} />);
      fireEvent.click(screen.getByLabelText('4'));
      expect(onChange).toHaveBeenCalledWith('4');
    });
  });
  ```

- [ ] **Step 2: Run test to verify it fails**

  ```bash
  npm run test -- tests/components/LikertQuestion.test.tsx
  ```

  Expected: FAIL (module not found).

- [ ] **Step 3: Implement**

  ```tsx
  import { QuestionShell } from './QuestionShell';
  import type { LikertQuestion as Q, LikertAnswer } from '../../lib/question-types';

  interface Props {
    question: Q;
    index: number;
    value: LikertAnswer;
    onChange: (next: LikertAnswer) => void;
    disabled?: boolean;
    error?: string;
  }

  export function LikertQuestion({ question, index, value, onChange, disabled, error }: Props) {
    const cfg = question.config;
    const segments: number[] = [];
    for (let n = cfg.min; n <= cfg.max; n++) segments.push(n);
    const groupName = `q-${question.id}`;

    return (
      <QuestionShell
        questionId={question.id}
        type={question.type}
        index={index}
        label={question.label}
        helperText={question.helperText}
        error={error}
      >
        <div className="assessment-likert" data-qoptions>
          <span className="assessment-likert__anchor assessment-likert__anchor--left">
            {cfg.leftLabel}
          </span>
          <div className="assessment-likert__segments">
            {segments.map((n) => {
              const v = String(n);
              return (
                <label key={n} className="assessment-likert__seg">
                  <input
                    type="radio"
                    name={groupName}
                    value={v}
                    checked={value === v}
                    disabled={disabled}
                    onChange={() => onChange(v)}
                    data-qinput
                    aria-label={v}
                  />
                  <span>{n}</span>
                </label>
              );
            })}
          </div>
          <span className="assessment-likert__anchor assessment-likert__anchor--right">
            {cfg.rightLabel}
          </span>
        </div>
      </QuestionShell>
    );
  }
  ```

- [ ] **Step 4: Run test to verify it passes**

  ```bash
  npm run test -- tests/components/LikertQuestion.test.tsx
  ```

  Expected: PASS.

- [ ] **Step 5: Commit**

  ```bash
  git add app/components/question-renderer/LikertQuestion.tsx tests/components/LikertQuestion.test.tsx
  git commit -m "Sub-project 3 task 10: add LikertQuestion renderer"
  ```

### Task 11: `CompetencyRubricRowQuestion`

**Files:**
- Create: `app/components/question-renderer/CompetencyRubricRowQuestion.tsx`
- Test: `tests/components/CompetencyRubricRowQuestion.test.tsx`

- [ ] **Step 1: Write the failing test**

  ```tsx
  import { describe, it, expect, vi } from 'vitest';
  import { render, screen, fireEvent } from '@testing-library/react';
  import { CompetencyRubricRowQuestion } from '../../app/components/question-renderer/CompetencyRubricRowQuestion';
  import type { CompetencyRubricRowQuestion as Q } from '../../app/lib/question-types';

  const q: Q = {
    id: 'q-rr', type: 'competency-rubric-row',
    label: 'Reliability', helperText: 'On-time, communicates',
    required: false, sortOrder: 1,
    config: {},
  };

  describe('CompetencyRubricRowQuestion', () => {
    it('renders 3 rating pills + a notes textarea', () => {
      render(
        <CompetencyRubricRowQuestion
          question={q} index={0}
          value={{ rating: null, notes: '' }}
          onChange={() => {}}
        />,
      );
      expect(screen.getByLabelText('Emerging')).toBeInTheDocument();
      expect(screen.getByLabelText('Developing')).toBeInTheDocument();
      expect(screen.getByLabelText('Ready')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Notes...')).toBeInTheDocument();
    });
    it('selecting a rating preserves notes', () => {
      const onChange = vi.fn();
      render(
        <CompetencyRubricRowQuestion
          question={q} index={0}
          value={{ rating: null, notes: 'previous note' }}
          onChange={onChange}
        />,
      );
      fireEvent.click(screen.getByLabelText('Ready'));
      expect(onChange).toHaveBeenLastCalledWith({ rating: 'ready', notes: 'previous note' });
    });
    it('typing notes preserves the rating', () => {
      const onChange = vi.fn();
      render(
        <CompetencyRubricRowQuestion
          question={q} index={0}
          value={{ rating: 'developing', notes: '' }}
          onChange={onChange}
        />,
      );
      fireEvent.change(screen.getByPlaceholderText('Notes...'), { target: { value: 'doing well' } });
      expect(onChange).toHaveBeenLastCalledWith({ rating: 'developing', notes: 'doing well' });
    });
    it('renders error', () => {
      render(
        <CompetencyRubricRowQuestion
          question={q} index={0}
          value={{ rating: null, notes: '' }}
          onChange={() => {}}
          error="Required"
        />,
      );
      expect(screen.getByText('Required')).toBeInTheDocument();
    });
  });
  ```

- [ ] **Step 2: Run test to verify it fails**

  ```bash
  npm run test -- tests/components/CompetencyRubricRowQuestion.test.tsx
  ```

  Expected: FAIL (module not found).

- [ ] **Step 3: Implement**

  ```tsx
  import { QuestionShell } from './QuestionShell';
  import type {
    CompetencyRubricRowQuestion as Q,
    CompetencyRubricRowAnswer,
  } from '../../lib/question-types';

  interface Props {
    question: Q;
    index: number;
    value: CompetencyRubricRowAnswer | null | undefined;
    onChange: (next: CompetencyRubricRowAnswer) => void;
    disabled?: boolean;
    error?: string;
  }

  const RATINGS: Array<{ value: 'emerging' | 'developing' | 'ready'; label: string }> = [
    { value: 'emerging', label: 'Emerging' },
    { value: 'developing', label: 'Developing' },
    { value: 'ready', label: 'Ready' },
  ];

  export function CompetencyRubricRowQuestion({
    question, index, value, onChange, disabled, error,
  }: Props) {
    const rating = value?.rating ?? null;
    const notes = value?.notes ?? '';
    const groupName = `q-${question.id}`;

    return (
      <QuestionShell
        questionId={question.id}
        type={question.type}
        index={index}
        label={question.label}
        helperText={question.helperText}
        error={error}
      >
        <div className="assessment-rubric-row" data-qoptions>
          <div className="assessment-rubric-pills">
            {RATINGS.map((r) => (
              <label key={r.value} className="assessment-rubric-pill">
                <input
                  type="radio"
                  name={groupName}
                  value={r.value}
                  checked={rating === r.value}
                  disabled={disabled}
                  onChange={() => onChange({ rating: r.value, notes })}
                  data-qinput
                  aria-label={r.label}
                />
                <span>{r.label}</span>
              </label>
            ))}
          </div>
          <textarea
            className="assessment-rubric-notes"
            placeholder="Notes..."
            rows={2}
            value={notes}
            disabled={disabled}
            onChange={(e) => onChange({ rating, notes: e.target.value })}
            data-qnotes
          />
        </div>
      </QuestionShell>
    );
  }
  ```

- [ ] **Step 4: Run test to verify it passes**

  ```bash
  npm run test -- tests/components/CompetencyRubricRowQuestion.test.tsx
  ```

  Expected: PASS.

- [ ] **Step 5: Commit**

  ```bash
  git add app/components/question-renderer/CompetencyRubricRowQuestion.tsx \
          tests/components/CompetencyRubricRowQuestion.test.tsx
  git commit -m "Sub-project 3 task 11: add CompetencyRubricRowQuestion renderer"
  ```

### Task 12: `QuestionRenderer` dispatcher

**Files:**
- Create: `app/components/question-renderer/QuestionRenderer.tsx`
- Create: `app/components/question-renderer/index.ts`
- Test: `tests/components/QuestionRenderer.test.tsx`

- [ ] **Step 1: Write the failing test**

  ```tsx
  import { describe, it, expect, vi } from 'vitest';
  import { render, screen } from '@testing-library/react';
  import { QuestionRenderer } from '../../app/components/question-renderer/QuestionRenderer';
  import type { Question, SectionBoundary } from '../../app/lib/question-types';

  const qs: Question[] = [
    { id: 't', type: 'textarea', label: 'TA', required: false, sortOrder: 1, config: { rows: 4, placeholder: '' } },
    { id: 's', type: 'short-text', label: 'ST', required: false, sortOrder: 2, config: { placeholder: '', maxLength: 200 } },
    { id: 'r', type: 'radio', label: 'R', required: false, sortOrder: 3,
      config: { options: [{ value: 'y', label: 'Y' }], otherWithText: false } },
    { id: 'c', type: 'checkbox-group', label: 'C', required: false, sortOrder: 4,
      config: { options: [{ value: 'a', label: 'A' }], otherWithText: false } },
    { id: 'l', type: 'likert', label: 'L', required: false, sortOrder: 5,
      config: { min: 1, max: 3, leftLabel: 'lo', rightLabel: 'hi' } },
    { id: 'rr', type: 'competency-rubric-row', label: 'RR', required: false, sortOrder: 6, config: {} },
  ];

  describe('QuestionRenderer', () => {
    it('renders one wrapper per question with correct data-qtype', () => {
      render(
        <QuestionRenderer
          questions={qs}
          answers={{}}
          onChange={() => {}}
        />,
      );
      expect(document.querySelectorAll('[data-qid]').length).toBe(6);
      expect(document.querySelector('[data-qid="t"]')?.getAttribute('data-qtype')).toBe('textarea');
      expect(document.querySelector('[data-qid="rr"]')?.getAttribute('data-qtype')).toBe('competency-rubric-row');
    });
    it('routes onChange callbacks back with the questionId', () => {
      const onChange = vi.fn();
      render(<QuestionRenderer questions={[qs[0]]} answers={{}} onChange={onChange} />);
      const ta = screen.getByRole('textbox');
      (ta as HTMLTextAreaElement).focus();
      // Use fireEvent.change so React's controlled-input contract is exercised.
      const { fireEvent } = require('@testing-library/react');
      fireEvent.change(ta, { target: { value: 'hello' } });
      expect(onChange).toHaveBeenCalledWith('t', 'hello');
    });
    it('renders section header at the configured boundary', () => {
      const boundaries: SectionBoundary[] = [
        { afterIndex: -1, label: 'Professional Competencies' },
        { afterIndex: 1, label: 'Role-Specific', subLabel: 'Eskenazi 2026 MA' },
      ];
      render(
        <QuestionRenderer
          questions={qs.slice(0, 3)}
          answers={{}}
          onChange={() => {}}
          sectionBoundaries={boundaries}
        />,
      );
      const headers = document.querySelectorAll('.rubric-section-head__title');
      expect(headers[0].textContent).toBe('Professional Competencies');
      expect(headers[1].textContent).toBe('Role-Specific');
    });
    it('passes per-question errors through', () => {
      render(
        <QuestionRenderer
          questions={[qs[0]]}
          answers={{}}
          errors={{ t: 'Required' }}
          onChange={() => {}}
        />,
      );
      expect(screen.getByText('Required')).toBeInTheDocument();
    });
  });
  ```

- [ ] **Step 2: Run test to verify it fails**

  ```bash
  npm run test -- tests/components/QuestionRenderer.test.tsx
  ```

  Expected: FAIL (module not found).

- [ ] **Step 3: Implement**

  Create `app/components/question-renderer/QuestionRenderer.tsx`:

  ```tsx
  import { Fragment } from 'react';
  import { SectionHeader } from './SectionHeader';
  import { TextareaQuestion } from './TextareaQuestion';
  import { ShortTextQuestion } from './ShortTextQuestion';
  import { RadioQuestion } from './RadioQuestion';
  import { CheckboxGroupQuestion } from './CheckboxGroupQuestion';
  import { LikertQuestion } from './LikertQuestion';
  import { CompetencyRubricRowQuestion } from './CompetencyRubricRowQuestion';
  import type {
    Question,
    Answers,
    SectionBoundary,
  } from '../../lib/question-types';

  export interface QuestionRendererProps {
    questions: Question[];
    answers: Answers;
    errors?: Record<string, string>;
    disabled?: boolean;
    onChange: (questionId: string, next: unknown) => void;
    sectionBoundaries?: SectionBoundary[];
  }

  function boundariesAfter(boundaries: SectionBoundary[] | undefined, index: number): SectionBoundary[] {
    if (!boundaries) return [];
    return boundaries.filter((b) => b.afterIndex === index);
  }

  export function QuestionRenderer({
    questions, answers, errors, disabled, onChange, sectionBoundaries,
  }: QuestionRendererProps) {
    return (
      <>
        {boundariesAfter(sectionBoundaries, -1).map((b, i) => (
          <SectionHeader key={`pre-${i}`} label={b.label} subLabel={b.subLabel} />
        ))}
        {questions.map((q, i) => (
          <Fragment key={q.id}>
            {renderOne(q, i, answers[q.id], (next) => onChange(q.id, next), disabled, errors?.[q.id])}
            {boundariesAfter(sectionBoundaries, i).map((b, bi) => (
              <SectionHeader key={`b-${i}-${bi}`} label={b.label} subLabel={b.subLabel} />
            ))}
          </Fragment>
        ))}
      </>
    );
  }

  function renderOne(
    q: Question,
    index: number,
    value: unknown,
    onChange: (next: unknown) => void,
    disabled?: boolean,
    error?: string,
  ): React.ReactNode {
    switch (q.type) {
      case 'textarea':
        return (
          <TextareaQuestion
            question={q}
            index={index}
            value={typeof value === 'string' ? value : ''}
            onChange={onChange as (s: string) => void}
            disabled={disabled}
            error={error}
          />
        );
      case 'short-text':
        return (
          <ShortTextQuestion
            question={q}
            index={index}
            value={typeof value === 'string' ? value : ''}
            onChange={onChange as (s: string) => void}
            disabled={disabled}
            error={error}
          />
        );
      case 'radio':
        return (
          <RadioQuestion
            question={q}
            index={index}
            value={value as ReturnType<() => Parameters<typeof RadioQuestion>[0]['value']>}
            onChange={onChange as Parameters<typeof RadioQuestion>[0]['onChange']}
            disabled={disabled}
            error={error}
          />
        );
      case 'checkbox-group':
        return (
          <CheckboxGroupQuestion
            question={q}
            index={index}
            value={value as Parameters<typeof CheckboxGroupQuestion>[0]['value']}
            onChange={onChange as Parameters<typeof CheckboxGroupQuestion>[0]['onChange']}
            disabled={disabled}
            error={error}
          />
        );
      case 'likert':
        return (
          <LikertQuestion
            question={q}
            index={index}
            value={typeof value === 'string' ? value : null}
            onChange={onChange as Parameters<typeof LikertQuestion>[0]['onChange']}
            disabled={disabled}
            error={error}
          />
        );
      case 'competency-rubric-row':
        return (
          <CompetencyRubricRowQuestion
            question={q}
            index={index}
            value={value as Parameters<typeof CompetencyRubricRowQuestion>[0]['value']}
            onChange={onChange as Parameters<typeof CompetencyRubricRowQuestion>[0]['onChange']}
            disabled={disabled}
            error={error}
          />
        );
    }
  }
  ```

  Create `app/components/question-renderer/index.ts`:

  ```ts
  export { QuestionRenderer } from './QuestionRenderer';
  export type { QuestionRendererProps } from './QuestionRenderer';
  export { SectionHeader } from './SectionHeader';
  ```

- [ ] **Step 4: Run test to verify it passes**

  ```bash
  npm run test -- tests/components/QuestionRenderer.test.tsx
  ```

  Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

  ```bash
  git add app/components/question-renderer/QuestionRenderer.tsx \
          app/components/question-renderer/index.ts \
          tests/components/QuestionRenderer.test.tsx
  git commit -m "Sub-project 3 task 12: add QuestionRenderer dispatcher with section-boundary support"
  ```

---

## Phase C: Server-side data layer

### Task 13: `loadQuestionSet` (server)

**Files:**
- Create: `app/lib/question-engine.server.ts`

- [ ] **Step 1: Implement `loadQuestionSet`**

  Create `app/lib/question-engine.server.ts`:

  ```ts
  import { eq, asc } from 'drizzle-orm';
  import { db } from './db.server';
  import * as schema from '../../db/schema';
  import type {
    Question,
    QuestionSet,
    QuestionSetKind,
    StitchedQuestion,
    StitchedCompetencySet,
    SectionBoundary,
  } from './question-types';

  export async function loadQuestionSet(setId: string): Promise<QuestionSet | null> {
    const rows = await db
      .select()
      .from(schema.questionSets)
      .where(eq(schema.questionSets.id, setId));
    if (rows.length === 0) return null;
    const set = rows[0];
    const qRows = await db
      .select()
      .from(schema.questions)
      .where(eq(schema.questions.questionSetId, setId))
      .orderBy(asc(schema.questions.sortOrder));
    return {
      id: set.id,
      kind: set.kind as QuestionSetKind,
      name: set.name,
      cohortId: set.cohortId,
      internId: set.internId,
      minRequired: set.minRequired,
      allowMultiple: set.allowMultiple,
      lastEditedAt: set.lastEditedAt.toISOString(),
      questions: qRows.map((r) => ({
        id: r.id,
        type: r.type,
        label: r.label,
        helperText: r.helperText ?? undefined,
        required: r.required,
        sortOrder: r.sortOrder,
        config: r.config,
      } as Question)),
    };
  }

  export async function listCohortCompetencySets(): Promise<QuestionSet[]> {
    const rows = await db
      .select()
      .from(schema.questionSets)
      .where(eq(schema.questionSets.kind, 'competency-cohort'));
    const out: QuestionSet[] = [];
    for (const r of rows) {
      const set = await loadQuestionSet(r.id);
      if (set) out.push(set);
    }
    return out;
  }

  export async function listInternCompetencySets(): Promise<QuestionSet[]> {
    const rows = await db
      .select()
      .from(schema.questionSets)
      .where(eq(schema.questionSets.kind, 'competency-intern'));
    const out: QuestionSet[] = [];
    for (const r of rows) {
      const set = await loadQuestionSet(r.id);
      if (set) out.push(set);
    }
    return out;
  }

  export async function listStandardSets(): Promise<QuestionSet[]> {
    const rows = await db
      .select()
      .from(schema.questionSets)
      .where(eq(schema.questionSets.kind, 'standard'));
    const out: QuestionSet[] = [];
    for (const r of rows) {
      const set = await loadQuestionSet(r.id);
      if (set) out.push(set);
    }
    return out;
  }

  // saveQuestionSet + stitchedCompetencyQuestions added in later tasks.
  ```

- [ ] **Step 2: Run typecheck**

  ```bash
  npm run typecheck
  ```

  Expected: zero errors.

- [ ] **Step 3: Commit**

  ```bash
  git add app/lib/question-engine.server.ts
  git commit -m "Sub-project 3 task 13: add loadQuestionSet + list helpers"
  ```

### Task 14: `saveQuestionSet` (server, atomic)

**Files:**
- Modify: `app/lib/question-engine.server.ts`

The save path replaces all questions for the given set in a single transaction. This (a) lets us drop deleted rows; (b) keeps `sort_order` contiguous; (c) atomically updates `last_edited_at`. RLS (sub-project 1) restricts INSERT/UPDATE/DELETE on `question_sets`/`questions` to `admin` role; this function relies on the caller having validated `getAuthContext(request).role === 'admin'` (sub-project 2 supplies the route-level guard).

- [ ] **Step 1: Append `saveQuestionSet`**

  Append to `app/lib/question-engine.server.ts`:

  ```ts
  import { sql } from 'drizzle-orm';

  export interface SaveQuestionSetInput {
    setId: string;
    name?: string;                                   // optional override (admin can rename only via this path)
    kind?: QuestionSetKind;                          // required when creating a new cohort/intern tier
    cohortId?: string | null;
    internId?: string | null;
    minRequired: number | null;
    allowMultiple: boolean;
    questions: Question[];
  }

  export class QuestionSetSaveError extends Error {
    constructor(public reason: string) {
      super(reason);
      this.name = 'QuestionSetSaveError';
    }
  }

  function validateInput(input: SaveQuestionSetInput): void {
    if (!input.setId) throw new QuestionSetSaveError('setId is required');
    if (input.questions.length === 0) {
      throw new QuestionSetSaveError('At least one question is required');
    }
    if (input.minRequired !== null && input.minRequired < 0) {
      throw new QuestionSetSaveError('minRequired must be non-negative');
    }
    if (input.minRequired !== null && input.minRequired > input.questions.length) {
      throw new QuestionSetSaveError('minRequired cannot exceed the number of questions');
    }
    const seen = new Set<string>();
    input.questions.forEach((q, i) => {
      if (!q.id) throw new QuestionSetSaveError(`Question ${i + 1} has no id`);
      if (seen.has(q.id)) throw new QuestionSetSaveError(`Duplicate question id: ${q.id}`);
      seen.add(q.id);
      if (!q.label || !q.label.trim()) {
        throw new QuestionSetSaveError(`Question ${i + 1} has an empty label`);
      }
      if (q.type === 'radio' || q.type === 'checkbox-group') {
        if (!Array.isArray(q.config.options) || q.config.options.length === 0) {
          throw new QuestionSetSaveError(`Question ${i + 1} (${q.type}) has no options`);
        }
        q.config.options.forEach((o, oi) => {
          if (!o.value || !o.value.trim()) {
            throw new QuestionSetSaveError(`Question ${i + 1}, option ${oi + 1}: missing value`);
          }
          if (!o.label || !o.label.trim()) {
            throw new QuestionSetSaveError(`Question ${i + 1}, option ${oi + 1}: missing label`);
          }
        });
      }
    });
  }

  export async function saveQuestionSet(input: SaveQuestionSetInput): Promise<QuestionSet> {
    validateInput(input);

    await db.transaction(async (tx) => {
      // Upsert the set row. If it already exists we update fields; if not we insert.
      const existing = await tx
        .select()
        .from(schema.questionSets)
        .where(eq(schema.questionSets.id, input.setId));

      if (existing.length === 0) {
        if (!input.kind) {
          throw new QuestionSetSaveError(`Cannot create question set ${input.setId}: kind is required`);
        }
        await tx.insert(schema.questionSets).values({
          id: input.setId,
          kind: input.kind,
          name: input.name ?? input.setId,
          cohortId: input.cohortId ?? null,
          internId: input.internId ?? null,
          minRequired: input.minRequired,
          allowMultiple: input.allowMultiple,
          lastEditedAt: new Date(),
        });
      } else {
        await tx
          .update(schema.questionSets)
          .set({
            name: input.name ?? existing[0].name,
            cohortId: input.cohortId ?? existing[0].cohortId,
            internId: input.internId ?? existing[0].internId,
            minRequired: input.minRequired,
            allowMultiple: input.allowMultiple,
            lastEditedAt: new Date(),
          })
          .where(eq(schema.questionSets.id, input.setId));
      }

      // Atomically replace the questions: delete-then-insert in the same tx.
      // The check on `questions.question_set_id` cascades nothing else.
      await tx
        .delete(schema.questions)
        .where(eq(schema.questions.questionSetId, input.setId));

      await tx.insert(schema.questions).values(
        input.questions.map((q, i) => ({
          id: q.id,
          questionSetId: input.setId,
          type: q.type,
          label: q.label.trim(),
          helperText: q.helperText ?? null,
          required: q.required,
          sortOrder: i + 1,                              // re-index contiguous
          config: q.config as Record<string, unknown>,
        })),
      );
    });

    const loaded = await loadQuestionSet(input.setId);
    if (!loaded) throw new QuestionSetSaveError(`Re-load failed for ${input.setId}`);
    return loaded;
  }

  export async function deleteQuestionSet(setId: string): Promise<void> {
    // FK on questions.question_set_id has ON DELETE CASCADE — single delete suffices.
    await db.delete(schema.questionSets).where(eq(schema.questionSets.id, setId));
  }
  ```

  Confirm `sql` import wasn't actually needed (the import line above can be removed if unused — the linter run in step 2 will catch it). Adjust the import line accordingly.

- [ ] **Step 2: Run lint + typecheck**

  ```bash
  npm run lint && npm run typecheck
  ```

  Expected: zero errors. If `sql` is unused, remove the import.

- [ ] **Step 3: Commit**

  ```bash
  git add app/lib/question-engine.server.ts
  git commit -m "Sub-project 3 task 14: add transactional saveQuestionSet + deleteQuestionSet"
  ```

### Task 15: `stitchedCompetencyQuestions` (server)

**Files:**
- Modify: `app/lib/question-engine.server.ts`
- Create: `tests/lib/question-engine.server.test.ts`

The stitched function fetches the 3 tiers from the DB, concatenates in tier order (core → cohort → intern), tags each question with its `tier`, and emits `SectionBoundary`s the renderer can consume.

- [ ] **Step 1: Write the failing test**

  Create `tests/lib/question-engine.server.test.ts`. This test runs against the same local Supabase DB sub-project 1 uses for the `tests/rls/*` suite (env var `TEST_DATABASE_URL`).

  ```ts
  import { describe, it, expect, beforeAll, afterAll } from 'vitest';
  import postgres from 'postgres';
  import { drizzle } from 'drizzle-orm/postgres-js';
  import { sql } from 'drizzle-orm';
  import * as schema from '../../db/schema';
  import { stitchedCompetencyQuestions } from '../../app/lib/question-engine.server';

  const COHORT_ID = '99999999-9999-9999-9999-999999999901';
  const INTERN_ID = '99999999-9999-9999-9999-999999999911';
  const EMPLOYER_ID = '99999999-9999-9999-9999-999999999921';

  let client: ReturnType<typeof postgres>;
  let db: ReturnType<typeof drizzle>;

  beforeAll(async () => {
    const url = process.env.TEST_DATABASE_URL;
    if (!url) throw new Error('TEST_DATABASE_URL required for stitching test');
    client = postgres(url, { max: 1 });
    db = drizzle(client, { schema });

    // Seed a minimal employer/cohort/intern + 3 competency tiers.
    await client`INSERT INTO public.employers (id, name)
      VALUES (${EMPLOYER_ID}, 'Test Stitching Emp')`;
    await client`INSERT INTO public.cohorts (id, employer_id, name)
      VALUES (${COHORT_ID}, ${EMPLOYER_ID}, 'Test Cohort')`;
    await client`INSERT INTO public.interns (id, cohort_id, first_initial, last_name, start_date, end_date)
      VALUES (${INTERN_ID}, ${COHORT_ID}, 'T', 'Tester', '2026-01-01', '2026-06-01')`;

    await client`INSERT INTO public.question_sets (id, kind, name, allow_multiple)
      VALUES ('competency-core', 'competency-core', 'Core', false)
      ON CONFLICT (id) DO NOTHING`;
    await client`INSERT INTO public.questions (id, question_set_id, type, label, required, sort_order, config)
      VALUES ('core-q1', 'competency-core', 'competency-rubric-row', 'Core 1', false, 1, '{}'::jsonb)
      ON CONFLICT (id) DO NOTHING`;

    const cohortSetId = 'competency-cohort-' + COHORT_ID;
    await client`INSERT INTO public.question_sets (id, kind, name, cohort_id, allow_multiple)
      VALUES (${cohortSetId}, 'competency-cohort', 'Cohort Set', ${COHORT_ID}, false)`;
    await client`INSERT INTO public.questions (id, question_set_id, type, label, required, sort_order, config)
      VALUES ('cohort-q1', ${cohortSetId}, 'competency-rubric-row', 'Cohort 1', false, 1, '{}'::jsonb)`;

    const internSetId = 'competency-intern-' + INTERN_ID;
    await client`INSERT INTO public.question_sets (id, kind, name, intern_id, allow_multiple)
      VALUES (${internSetId}, 'competency-intern', 'Intern Set', ${INTERN_ID}, false)`;
    await client`INSERT INTO public.questions (id, question_set_id, type, label, required, sort_order, config)
      VALUES ('intern-q1', ${internSetId}, 'competency-rubric-row', 'Intern 1', false, 1, '{}'::jsonb)`;
  });

  afterAll(async () => {
    await client`DELETE FROM public.questions WHERE question_set_id IN (
      'competency-cohort-' || ${COHORT_ID},
      'competency-intern-' || ${INTERN_ID}
    )`;
    await client`DELETE FROM public.question_sets WHERE id IN (
      'competency-cohort-' || ${COHORT_ID},
      'competency-intern-' || ${INTERN_ID}
    )`;
    await client`DELETE FROM public.interns WHERE id = ${INTERN_ID}`;
    await client`DELETE FROM public.cohorts WHERE id = ${COHORT_ID}`;
    await client`DELETE FROM public.employers WHERE id = ${EMPLOYER_ID}`;
    await client.end();
  });

  describe('stitchedCompetencyQuestions', () => {
    it('concatenates core + cohort + intern questions in order', async () => {
      const stitched = await stitchedCompetencyQuestions(INTERN_ID);
      expect(stitched.questions.map((q) => q.id)).toEqual([
        'core-q1', 'cohort-q1', 'intern-q1',
      ]);
      expect(stitched.questions.map((q) => q.tier)).toEqual(['core', 'cohort', 'intern']);
    });

    it('emits section boundaries placed before the first item of each tier', async () => {
      const stitched = await stitchedCompetencyQuestions(INTERN_ID);
      expect(stitched.sectionBoundaries).toEqual([
        { afterIndex: -1, label: 'Professional Competencies' },
        { afterIndex: 0, label: 'Role-Specific', subLabel: 'Test Cohort' },
        { afterIndex: 1, label: 'Intern-Specific' },
      ]);
    });

    it('omits tier boundaries when the tier has no questions', async () => {
      // Drop the intern-tier set, ensure the boundary disappears.
      await client`DELETE FROM public.questions WHERE question_set_id = ('competency-intern-' || ${INTERN_ID})`;
      await client`DELETE FROM public.question_sets WHERE id = ('competency-intern-' || ${INTERN_ID})`;

      const stitched = await stitchedCompetencyQuestions(INTERN_ID);
      expect(stitched.questions.map((q) => q.id)).toEqual(['core-q1', 'cohort-q1']);
      expect(stitched.sectionBoundaries).toEqual([
        { afterIndex: -1, label: 'Professional Competencies' },
        { afterIndex: 0, label: 'Role-Specific', subLabel: 'Test Cohort' },
      ]);
    });
  });
  ```

- [ ] **Step 2: Run test to verify it fails**

  ```bash
  TEST_DATABASE_URL=$DATABASE_URL npm run test -- tests/lib/question-engine.server.test.ts
  ```

  Expected: FAIL (function not exported).

- [ ] **Step 3: Implement `stitchedCompetencyQuestions`**

  Append to `app/lib/question-engine.server.ts`:

  ```ts
  export async function stitchedCompetencyQuestions(
    internId: string,
  ): Promise<StitchedCompetencySet> {
    // 1. Look up the intern's cohort (for cohort-tier set id + section subLabel).
    const internRow = await db
      .select({
        cohortId: schema.interns.cohortId,
      })
      .from(schema.interns)
      .where(eq(schema.interns.id, internId));
    if (internRow.length === 0) {
      throw new Error(`Intern not found: ${internId}`);
    }
    const cohortId = internRow[0].cohortId;

    let cohortName: string | null = null;
    if (cohortId) {
      const cohortRow = await db
        .select({ name: schema.cohorts.name })
        .from(schema.cohorts)
        .where(eq(schema.cohorts.id, cohortId));
      cohortName = cohortRow[0]?.name ?? null;
    }

    const coreSet = await loadQuestionSet('competency-core');
    const cohortSet = cohortId
      ? await loadQuestionSet(`competency-cohort-${cohortId}`)
      : null;
    const internSet = await loadQuestionSet(`competency-intern-${internId}`);

    const tagged: StitchedQuestion[] = [];
    const boundaries: SectionBoundary[] = [];

    if (coreSet && coreSet.questions.length > 0) {
      boundaries.push({ afterIndex: tagged.length - 1, label: 'Professional Competencies' });
      for (const q of coreSet.questions) tagged.push({ ...q, tier: 'core' });
    }
    if (cohortSet && cohortSet.questions.length > 0) {
      boundaries.push({
        afterIndex: tagged.length - 1,
        label: 'Role-Specific',
        subLabel: cohortName ?? undefined,
      });
      for (const q of cohortSet.questions) tagged.push({ ...q, tier: 'cohort' });
    }
    if (internSet && internSet.questions.length > 0) {
      boundaries.push({ afterIndex: tagged.length - 1, label: 'Intern-Specific' });
      for (const q of internSet.questions) tagged.push({ ...q, tier: 'intern' });
    }

    return {
      internId,
      questions: tagged,
      sectionBoundaries: boundaries,
    };
  }
  ```

- [ ] **Step 4: Run test to verify it passes**

  ```bash
  TEST_DATABASE_URL=$DATABASE_URL npm run test -- tests/lib/question-engine.server.test.ts
  ```

  Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

  ```bash
  git add app/lib/question-engine.server.ts tests/lib/question-engine.server.test.ts
  git commit -m "Sub-project 3 task 15: implement stitchedCompetencyQuestions with section boundaries"
  ```

### Task 16: Wire `question-engine.server` exports

**Files:**
- Modify: `app/lib/question-engine.server.ts`

- [ ] **Step 1: Verify exports**

  The following functions / types must be exported from `app/lib/question-engine.server.ts`:

  - `loadQuestionSet`
  - `listStandardSets`
  - `listCohortCompetencySets`
  - `listInternCompetencySets`
  - `saveQuestionSet`
  - `deleteQuestionSet`
  - `stitchedCompetencyQuestions`
  - `QuestionSetSaveError` (class)
  - `SaveQuestionSetInput` (interface)

  Open the file and confirm each `export` keyword is present. If any are missing, add them.

- [ ] **Step 2: Run lint + typecheck**

  ```bash
  npm run lint && npm run typecheck
  ```

  Expected: zero errors.

- [ ] **Step 3: Commit (no-op if no changes)**

  Skip if `git status` shows no diff. Otherwise:

  ```bash
  git add app/lib/question-engine.server.ts
  git commit -m "Sub-project 3 task 16: ensure all server engine exports are public"
  ```

---

## Phase D: Editor — type-specific config forms

All config forms share this prop contract:

```ts
interface ConfigFormProps<Q extends Question> {
  question: Q;
  onChange: (next: Q) => void;        // returns the WHOLE question, not just config
}
```

This lets a form mutate either `question.config` fields OR question-level fields it uniquely owns (the prototype's design didn't need this, but the production code keeps the type-narrowing clean).

Each form renders ONLY the type-specific config fields. The common label/helper/required field block lives in `QuestionRowEditor` (Phase E) so it isn't repeated 6 times.

### Task 17: `newQuestionDefaults`

**Files:**
- Create: `app/components/question-editor/newQuestionDefaults.ts`

- [ ] **Step 1: Implement**

  ```ts
  import type { Question, QuestionType } from '../../lib/question-types';

  function genId(): string {
    return 'q-new-' + Math.random().toString(36).slice(2, 8);
  }

  export function newQuestion(type: QuestionType, sortOrder: number): Question {
    const common = { id: genId(), label: '', helperText: '', required: false, sortOrder };
    switch (type) {
      case 'textarea':
        return { ...common, type, config: { rows: 4, placeholder: '' } };
      case 'short-text':
        return { ...common, type, config: { placeholder: '', maxLength: 200 } };
      case 'radio':
        return { ...common, type, config: { options: [], otherWithText: false } };
      case 'checkbox-group':
        return { ...common, type, config: { options: [], otherWithText: false } };
      case 'likert':
        return { ...common, type, config: { min: 1, max: 5, leftLabel: '', rightLabel: '' } };
      case 'competency-rubric-row':
        return { ...common, type, config: {} };
    }
  }
  ```

- [ ] **Step 2: Run typecheck**

  ```bash
  npm run typecheck
  ```

  Expected: zero errors.

- [ ] **Step 3: Commit**

  ```bash
  git add app/components/question-editor/newQuestionDefaults.ts
  git commit -m "Sub-project 3 task 17: add newQuestion factory for editor type picker"
  ```

### Task 18: `TextareaConfigForm`

**Files:**
- Create: `app/components/question-editor/configs/TextareaConfigForm.tsx`

- [ ] **Step 1: Implement**

  ```tsx
  import type { TextareaQuestion as Q } from '../../../lib/question-types';

  interface Props {
    question: Q;
    onChange: (next: Q) => void;
  }

  export function TextareaConfigForm({ question, onChange }: Props) {
    return (
      <div className="id-grid id-grid--4">
        <div className="field" style={{ gridColumn: 'span 2' }}>
          <label>Rows</label>
          <input
            className="input"
            type="number"
            min={1}
            value={question.config.rows}
            onChange={(e) =>
              onChange({
                ...question,
                config: { ...question.config, rows: Math.max(1, Number(e.target.value) || 1) },
              })
            }
          />
        </div>
        <div className="field" style={{ gridColumn: 'span 2' }}>
          <label>Placeholder</label>
          <input
            className="input"
            type="text"
            value={question.config.placeholder}
            onChange={(e) =>
              onChange({
                ...question,
                config: { ...question.config, placeholder: e.target.value },
              })
            }
          />
        </div>
      </div>
    );
  }
  ```

- [ ] **Step 2: Run typecheck**

  ```bash
  npm run typecheck
  ```

  Expected: zero errors.

- [ ] **Step 3: Commit**

  ```bash
  git add app/components/question-editor/configs/TextareaConfigForm.tsx
  git commit -m "Sub-project 3 task 18: add TextareaConfigForm"
  ```

### Task 19: `ShortTextConfigForm`

**Files:**
- Create: `app/components/question-editor/configs/ShortTextConfigForm.tsx`

- [ ] **Step 1: Implement**

  ```tsx
  import type { ShortTextQuestion as Q } from '../../../lib/question-types';

  interface Props {
    question: Q;
    onChange: (next: Q) => void;
  }

  export function ShortTextConfigForm({ question, onChange }: Props) {
    return (
      <div className="id-grid id-grid--4">
        <div className="field" style={{ gridColumn: 'span 2' }}>
          <label>Placeholder</label>
          <input
            className="input"
            type="text"
            value={question.config.placeholder}
            onChange={(e) =>
              onChange({
                ...question,
                config: { ...question.config, placeholder: e.target.value },
              })
            }
          />
        </div>
        <div className="field" style={{ gridColumn: 'span 2' }}>
          <label>Max length</label>
          <input
            className="input"
            type="number"
            min={1}
            value={question.config.maxLength}
            onChange={(e) =>
              onChange({
                ...question,
                config: { ...question.config, maxLength: Math.max(1, Number(e.target.value) || 1) },
              })
            }
          />
        </div>
      </div>
    );
  }
  ```

- [ ] **Step 2: Commit**

  ```bash
  git add app/components/question-editor/configs/ShortTextConfigForm.tsx
  git commit -m "Sub-project 3 task 19: add ShortTextConfigForm"
  ```

### Task 20: `OptionsListEditor` (shared between Radio + Checkbox config forms)

**Files:**
- Create: `app/components/question-editor/OptionsListEditor.tsx`

- [ ] **Step 1: Implement**

  ```tsx
  import type { RadioOption } from '../../lib/question-types';

  interface Props {
    options: RadioOption[];
    onChange: (next: RadioOption[]) => void;
  }

  export function OptionsListEditor({ options, onChange }: Props) {
    function update(idx: number, patch: Partial<RadioOption>) {
      onChange(options.map((o, i) => (i === idx ? { ...o, ...patch } : o)));
    }
    function move(idx: number, dir: -1 | 1) {
      const j = idx + dir;
      if (j < 0 || j >= options.length) return;
      const next = options.slice();
      [next[idx], next[j]] = [next[j], next[idx]];
      onChange(next);
    }
    function remove(idx: number) {
      onChange(options.filter((_, i) => i !== idx));
    }
    function add() {
      onChange([...options, { value: '', label: '' }]);
    }
    return (
      <>
        <div className="qs-options-list">
          {options.map((o, i) => (
            <div key={i} className="qs-options-row">
              <input
                className="input"
                type="text"
                value={o.value}
                placeholder="value"
                onChange={(e) => update(i, { value: e.target.value })}
              />
              <input
                className="input"
                type="text"
                value={o.label}
                placeholder="label"
                onChange={(e) => update(i, { label: e.target.value })}
              />
              <button
                type="button"
                className="settings-list__handle-btn"
                onClick={() => move(i, -1)}
                disabled={i === 0}
                aria-label="Move up"
              >
                {'↑'}
              </button>
              <button
                type="button"
                className="settings-list__handle-btn"
                onClick={() => move(i, 1)}
                disabled={i === options.length - 1}
                aria-label="Move down"
              >
                {'↓'}
              </button>
              <button
                type="button"
                className="settings-list__remove-btn"
                onClick={() => remove(i)}
                aria-label="Remove"
              >
                {'×'}
              </button>
            </div>
          ))}
        </div>
        <button type="button" className="settings-list__add" onClick={add}>
          + Add Option
        </button>
      </>
    );
  }
  ```

- [ ] **Step 2: Commit**

  ```bash
  git add app/components/question-editor/OptionsListEditor.tsx
  git commit -m "Sub-project 3 task 20: add OptionsListEditor shared between radio + checkbox config forms"
  ```

### Task 21: `RadioConfigForm`

**Files:**
- Create: `app/components/question-editor/configs/RadioConfigForm.tsx`

- [ ] **Step 1: Implement**

  ```tsx
  import { OptionsListEditor } from '../OptionsListEditor';
  import type { RadioQuestion as Q } from '../../../lib/question-types';

  interface Props {
    question: Q;
    onChange: (next: Q) => void;
  }

  export function RadioConfigForm({ question, onChange }: Props) {
    return (
      <>
        <OptionsListEditor
          options={question.config.options}
          onChange={(opts) => onChange({ ...question, config: { ...question.config, options: opts } })}
        />
        <div className="field" style={{ marginTop: 12 }}>
          <label>
            <input
              type="checkbox"
              checked={question.config.otherWithText}
              onChange={(e) =>
                onChange({
                  ...question,
                  config: { ...question.config, otherWithText: e.target.checked },
                })
              }
            />{' '}
            Allow "Other" with text reveal
          </label>
        </div>
      </>
    );
  }
  ```

- [ ] **Step 2: Commit**

  ```bash
  git add app/components/question-editor/configs/RadioConfigForm.tsx
  git commit -m "Sub-project 3 task 21: add RadioConfigForm"
  ```

### Task 22: `CheckboxGroupConfigForm`

**Files:**
- Create: `app/components/question-editor/configs/CheckboxGroupConfigForm.tsx`

- [ ] **Step 1: Implement**

  ```tsx
  import { OptionsListEditor } from '../OptionsListEditor';
  import type { CheckboxGroupQuestion as Q } from '../../../lib/question-types';

  interface Props {
    question: Q;
    onChange: (next: Q) => void;
  }

  export function CheckboxGroupConfigForm({ question, onChange }: Props) {
    return (
      <>
        <OptionsListEditor
          options={question.config.options}
          onChange={(opts) => onChange({ ...question, config: { ...question.config, options: opts } })}
        />
        <div className="field" style={{ marginTop: 12 }}>
          <label>
            <input
              type="checkbox"
              checked={question.config.otherWithText}
              onChange={(e) =>
                onChange({
                  ...question,
                  config: { ...question.config, otherWithText: e.target.checked },
                })
              }
            />{' '}
            Allow "Other" with text reveal
          </label>
        </div>
      </>
    );
  }
  ```

- [ ] **Step 2: Commit**

  ```bash
  git add app/components/question-editor/configs/CheckboxGroupConfigForm.tsx
  git commit -m "Sub-project 3 task 22: add CheckboxGroupConfigForm"
  ```

### Task 23: `LikertConfigForm`

**Files:**
- Create: `app/components/question-editor/configs/LikertConfigForm.tsx`

- [ ] **Step 1: Implement**

  ```tsx
  import type { LikertQuestion as Q } from '../../../lib/question-types';

  interface Props {
    question: Q;
    onChange: (next: Q) => void;
  }

  export function LikertConfigForm({ question, onChange }: Props) {
    function patch(p: Partial<Q['config']>) {
      onChange({ ...question, config: { ...question.config, ...p } });
    }
    return (
      <div className="id-grid id-grid--4">
        <div className="field">
          <label>Min</label>
          <input
            className="input"
            type="number"
            value={question.config.min}
            onChange={(e) => patch({ min: Number(e.target.value) || 1 })}
          />
        </div>
        <div className="field">
          <label>Max</label>
          <input
            className="input"
            type="number"
            value={question.config.max}
            onChange={(e) => patch({ max: Number(e.target.value) || 1 })}
          />
        </div>
        <div className="field" style={{ gridColumn: 'span 2' }}>
          <label>Left anchor label</label>
          <input
            className="input"
            type="text"
            value={question.config.leftLabel}
            onChange={(e) => patch({ leftLabel: e.target.value })}
          />
        </div>
        <div className="field" style={{ gridColumn: 'span 4' }}>
          <label>Right anchor label</label>
          <input
            className="input"
            type="text"
            value={question.config.rightLabel}
            onChange={(e) => patch({ rightLabel: e.target.value })}
          />
        </div>
      </div>
    );
  }
  ```

- [ ] **Step 2: Commit**

  ```bash
  git add app/components/question-editor/configs/LikertConfigForm.tsx
  git commit -m "Sub-project 3 task 23: add LikertConfigForm"
  ```

### Task 24: `CompetencyRubricRowConfigForm`

**Files:**
- Create: `app/components/question-editor/configs/CompetencyRubricRowConfigForm.tsx`

The competency-rubric-row type has no per-question config; the form is a single informational line (mirrors the prototype's "No additional config..." text).

- [ ] **Step 1: Implement**

  ```tsx
  import type { CompetencyRubricRowQuestion as Q } from '../../../lib/question-types';

  interface Props {
    question: Q;
    onChange: (next: Q) => void;
  }

  // Intentionally non-reactive: this component takes the same props shape as
  // its siblings to keep the editor dispatch simple, but renders only a hint.
  export function CompetencyRubricRowConfigForm(_props: Props) {
    return (
      <p style={{ color: 'var(--muted)', fontSize: 13, margin: '8px 0' }}>
        No additional config — fixed Emerging / Developing / Ready + Notes layout.
      </p>
    );
  }
  ```

- [ ] **Step 2: Commit**

  ```bash
  git add app/components/question-editor/configs/CompetencyRubricRowConfigForm.tsx
  git commit -m "Sub-project 3 task 24: add CompetencyRubricRowConfigForm (hint-only)"
  ```

---

## Phase E: Editor — accordion + type picker + save flow

The editor in the prototype is implemented in vanilla JS and re-renders the whole list (`qsContainer.innerHTML = ...`) on every option add/remove/move/option-edit, which collapses every expanded accordion row on every action. The production rebuild fixes this by keeping the per-row open/closed state in React, controlled inputs, and a stable `key`-by-question-id render: editing one row does not re-mount any other row, and adding/removing rows leaves siblings' open state intact.

### Task 25: `QuestionRowEditor`

**Files:**
- Create: `app/components/question-editor/QuestionRowEditor.tsx`

The row editor renders the accordion head (number, label preview, type tag, up/down/remove controls) and conditionally the body (label, helper, required, then the type-specific config sub-form via dispatch).

- [ ] **Step 1: Implement**

  ```tsx
  import type { Question, QuestionType } from '../../lib/question-types';
  import { TextareaConfigForm } from './configs/TextareaConfigForm';
  import { ShortTextConfigForm } from './configs/ShortTextConfigForm';
  import { RadioConfigForm } from './configs/RadioConfigForm';
  import { CheckboxGroupConfigForm } from './configs/CheckboxGroupConfigForm';
  import { LikertConfigForm } from './configs/LikertConfigForm';
  import { CompetencyRubricRowConfigForm } from './configs/CompetencyRubricRowConfigForm';

  interface Props {
    question: Question;
    index: number;
    expanded: boolean;
    onToggle: () => void;
    onChange: (next: Question) => void;
    onMoveUp: () => void;
    onMoveDown: () => void;
    onRemove: () => void;
    canMoveUp: boolean;
    canMoveDown: boolean;
  }

  function pad2(n: number) {
    return String(n + 1).padStart(2, '0');
  }

  function renderConfigSubForm(question: Question, onChange: (next: Question) => void) {
    switch (question.type) {
      case 'textarea':
        return <TextareaConfigForm question={question} onChange={onChange as (q: typeof question) => void} />;
      case 'short-text':
        return <ShortTextConfigForm question={question} onChange={onChange as (q: typeof question) => void} />;
      case 'radio':
        return <RadioConfigForm question={question} onChange={onChange as (q: typeof question) => void} />;
      case 'checkbox-group':
        return <CheckboxGroupConfigForm question={question} onChange={onChange as (q: typeof question) => void} />;
      case 'likert':
        return <LikertConfigForm question={question} onChange={onChange as (q: typeof question) => void} />;
      case 'competency-rubric-row':
        return <CompetencyRubricRowConfigForm question={question} onChange={onChange as (q: typeof question) => void} />;
    }
  }

  export function QuestionRowEditor({
    question, index, expanded, onToggle, onChange,
    onMoveUp, onMoveDown, onRemove, canMoveUp, canMoveDown,
  }: Props) {
    return (
      <div
        className={`qs-question-row${expanded ? ' qs-question-row--expanded' : ''}`}
        data-index={index}
        data-question-id={question.id}
      >
        <div
          className="qs-question-row__head"
          role="button"
          tabIndex={0}
          aria-expanded={expanded}
          onClick={(e) => {
            // Don't toggle when a control button is clicked.
            if ((e.target as HTMLElement).closest('button')) return;
            onToggle();
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onToggle();
            }
          }}
        >
          <span className="qs-question-row__num">{pad2(index)}</span>
          <span className="qs-question-row__label">{question.label || '(untitled)'}</span>
          <span className="qs-question-row__type">{question.type}</span>
          <span className="qs-question-row__controls">
            <button
              type="button"
              className="settings-list__handle-btn"
              onClick={onMoveUp}
              disabled={!canMoveUp}
              aria-label="Move up"
            >
              {'↑'}
            </button>
            <button
              type="button"
              className="settings-list__handle-btn"
              onClick={onMoveDown}
              disabled={!canMoveDown}
              aria-label="Move down"
            >
              {'↓'}
            </button>
            <button
              type="button"
              className="settings-list__remove-btn"
              onClick={onRemove}
              aria-label="Remove"
            >
              {'×'}
            </button>
          </span>
        </div>
        {expanded ? (
          <div className="qs-question-row__body">
            <div className="field">
              <label htmlFor={`q-${question.id}-label`}>Prompt label</label>
              <input
                id={`q-${question.id}-label`}
                className="input"
                type="text"
                value={question.label}
                onChange={(e) => onChange({ ...question, label: e.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor={`q-${question.id}-helper`}>Helper text</label>
              <textarea
                id={`q-${question.id}-helper`}
                className="textarea"
                rows={2}
                value={question.helperText ?? ''}
                onChange={(e) => onChange({ ...question, helperText: e.target.value })}
              />
            </div>
            <div className="field">
              <label>
                <input
                  type="checkbox"
                  checked={question.required}
                  onChange={(e) => onChange({ ...question, required: e.target.checked })}
                />{' '}
                Required (must be answered)
              </label>
            </div>
            {renderConfigSubForm(question, onChange)}
          </div>
        ) : null}
      </div>
    );
  }
  ```

- [ ] **Step 2: Run typecheck**

  ```bash
  npm run typecheck
  ```

  Expected: zero errors.

- [ ] **Step 3: Commit**

  ```bash
  git add app/components/question-editor/QuestionRowEditor.tsx
  git commit -m "Sub-project 3 task 25: add QuestionRowEditor with controlled inputs + config dispatch"
  ```

### Task 26: Editor `styles.css`

**Files:**
- Create: `app/components/question-editor/styles.css`

- [ ] **Step 1: Lift the editor rules from the prototype**

  Open `Prototypes/PROTOTYPE/styles.css` and copy the rule blocks for: `.qs-editor-card*`, `.qs-question-row*`, `.qs-type-picker*`, `.qs-options-list`, `.qs-options-row`, `.settings-list__add`, `.settings-list__handle-btn`, `.settings-list__remove-btn`, and any `.qs-field` selectors. Write them verbatim into `app/components/question-editor/styles.css`. Replace `--muted`, `--navy`, `--gold` etc. tokens that resolve via `app/styles/tokens.css` (already imported by `app/root.tsx` from sub-project 1).

- [ ] **Step 2: Commit**

  ```bash
  git add app/components/question-editor/styles.css
  git commit -m "Sub-project 3 task 26: port question-editor CSS rules from prototype"
  ```

### Task 27: `QuestionSetEditor`

**Files:**
- Create: `app/components/question-editor/QuestionSetEditor.tsx`

This is the editor shell: set-level config card (name, min required, allow multiple — name disabled for the 4 standard sets to mirror prototype), the rows list with stable React `key`, the type picker, and the Save handler that calls the parent's `onSave(payload)` (the parent is the route — it owns the action wiring).

- [ ] **Step 1: Implement**

  ```tsx
  import { useState, useId, useCallback } from 'react';
  import './styles.css';
  import { QuestionRowEditor } from './QuestionRowEditor';
  import { newQuestion } from './newQuestionDefaults';
  import type { Question, QuestionType } from '../../lib/question-types';

  export interface QuestionSetEditorValue {
    name: string;
    minRequired: number | null;
    allowMultiple: boolean;
    questions: Question[];
  }

  export interface QuestionSetEditorProps {
    initial: QuestionSetEditorValue;
    nameEditable?: boolean;                                     // false for 4 standard sets
    onSave: (next: QuestionSetEditorValue) => void;
    onDelete?: () => void;                                      // shown only when provided (cohort/intern tiers)
    onCancel: () => void;
    saving?: boolean;
    formError?: string | null;
  }

  const TYPE_OPTIONS: Array<{ value: QuestionType; label: string }> = [
    { value: 'textarea', label: 'Textarea' },
    { value: 'short-text', label: 'Short Text' },
    { value: 'radio', label: 'Radio' },
    { value: 'checkbox-group', label: 'Checkbox Group' },
    { value: 'likert', label: 'Likert' },
    { value: 'competency-rubric-row', label: 'Rubric Row' },
  ];

  export function QuestionSetEditor({
    initial, nameEditable = false, onSave, onDelete, onCancel, saving, formError,
  }: QuestionSetEditorProps) {
    const [name, setName] = useState(initial.name);
    const [minRequired, setMinRequired] = useState<number | null>(initial.minRequired);
    const [allowMultiple, setAllowMultiple] = useState(initial.allowMultiple);
    const [questions, setQuestions] = useState<Question[]>(initial.questions);

    // Per-row expanded state, keyed by question.id so row re-orders / type-edits do not
    // collapse the wrong rows. New rows auto-expand.
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
    const [pickerOpen, setPickerOpen] = useState(false);

    const formId = useId();

    function toggleRow(id: string) {
      setExpandedIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    }

    function updateQuestion(idx: number, next: Question) {
      setQuestions((qs) => qs.map((q, i) => (i === idx ? next : q)));
    }

    function moveQuestion(idx: number, dir: -1 | 1) {
      setQuestions((qs) => {
        const j = idx + dir;
        if (j < 0 || j >= qs.length) return qs;
        const next = qs.slice();
        [next[idx], next[j]] = [next[j], next[idx]];
        return next;
      });
    }

    function removeQuestion(idx: number) {
      setQuestions((qs) => {
        const removedId = qs[idx]?.id;
        if (removedId) {
          setExpandedIds((prev) => {
            const next = new Set(prev);
            next.delete(removedId);
            return next;
          });
        }
        return qs.filter((_, i) => i !== idx);
      });
    }

    function addOfType(t: QuestionType) {
      const sortOrder = questions.length + 1;
      const newQ = newQuestion(t, sortOrder);
      setQuestions((qs) => [...qs, newQ]);
      setExpandedIds((prev) => new Set(prev).add(newQ.id));
      setPickerOpen(false);
    }

    const handleSave = useCallback(() => {
      onSave({
        name,
        minRequired,
        allowMultiple,
        questions: questions.map((q, i) => ({ ...q, sortOrder: i + 1 })),
      });
    }, [name, minRequired, allowMultiple, questions, onSave]);

    return (
      <>
        <article className="qs-editor-card">
          <div className="qs-editor-card__head">
            <h2 className="qs-editor-card__title">Set Configuration</h2>
            <span className="micro-label">SET INFO</span>
          </div>
          <div className="id-grid id-grid--4">
            <div className="field" style={{ gridColumn: 'span 2' }}>
              <label htmlFor={`${formId}-name`}>Set Name</label>
              <input
                id={`${formId}-name`}
                className="input"
                type="text"
                value={name}
                disabled={!nameEditable}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="field" style={{ gridColumn: 'span 2' }}>
              <label htmlFor={`${formId}-min`}>
                Min. Required (answered count to allow submit)
              </label>
              <input
                id={`${formId}-min`}
                className="input"
                type="number"
                min={0}
                value={minRequired ?? ''}
                onChange={(e) =>
                  setMinRequired(e.target.value === '' ? null : Math.max(0, Number(e.target.value)))
                }
              />
            </div>
            <div className="field" style={{ gridColumn: 'span 4' }}>
              <label>
                <input
                  type="checkbox"
                  checked={allowMultiple}
                  onChange={(e) => setAllowMultiple(e.target.checked)}
                />{' '}
                Allow Multiple? (Permit submitters to complete this assessment more than once.)
              </label>
            </div>
          </div>
        </article>

        <article className="qs-editor-card">
          <div className="qs-editor-card__head">
            <h2 className="qs-editor-card__title">Questions</h2>
            <span className="micro-label">EDITOR</span>
          </div>
          <div id={`${formId}-questions`}>
            {questions.map((q, i) => (
              <QuestionRowEditor
                key={q.id}
                question={q}
                index={i}
                expanded={expandedIds.has(q.id)}
                onToggle={() => toggleRow(q.id)}
                onChange={(next) => updateQuestion(i, next)}
                onMoveUp={() => moveQuestion(i, -1)}
                onMoveDown={() => moveQuestion(i, 1)}
                onRemove={() => removeQuestion(i)}
                canMoveUp={i > 0}
                canMoveDown={i < questions.length - 1}
              />
            ))}
          </div>
          {pickerOpen ? (
            <div className="qs-type-picker" style={{ display: 'flex' }}>
              {TYPE_OPTIONS.map((opt) => (
                <button
                  type="button"
                  key={opt.value}
                  className="qs-type-picker__btn"
                  onClick={() => addOfType(opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          ) : null}
          <button
            type="button"
            className="settings-list__add"
            aria-expanded={pickerOpen}
            onClick={() => setPickerOpen((v) => !v)}
          >
            {pickerOpen ? '× Cancel adding' : '+ Add Question'}
          </button>
        </article>

        {formError ? (
          <div className="banner banner--danger" role="alert" style={{ margin: '12px 0' }}>
            {formError}
          </div>
        ) : null}

        <div className="action-bar">
          <div className="action-bar__inner">
            <div className="action-bar__status">
              <span className="mono" style={{ color: 'var(--navy)' }}>QUESTION SET · EDIT</span>
            </div>
            <div className="action-bar__buttons">
              <button type="button" className="btn btn--outline" onClick={onCancel} disabled={saving}>
                Cancel
              </button>
              {onDelete ? (
                <button type="button" className="btn btn--danger" onClick={onDelete} disabled={saving}>
                  Delete Set
                </button>
              ) : null}
              <button
                type="button"
                className="btn btn--primary"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }
  ```

- [ ] **Step 2: Run typecheck**

  ```bash
  npm run typecheck
  ```

  Expected: zero errors.

- [ ] **Step 3: Commit**

  ```bash
  git add app/components/question-editor/QuestionSetEditor.tsx
  git commit -m "Sub-project 3 task 27: add QuestionSetEditor shell"
  ```

### Task 28: Regression test — accordion does NOT collapse on row-edit actions

**Files:**
- Create: `tests/components/QuestionSetEditor.test.tsx`

This locks in spec section 8.1's "Editor accordion no longer collapses on every action" item.

- [ ] **Step 1: Write the failing test**

  ```tsx
  import { describe, it, expect, vi } from 'vitest';
  import { render, screen, fireEvent, within } from '@testing-library/react';
  import { QuestionSetEditor } from '../../app/components/question-editor/QuestionSetEditor';
  import type { Question } from '../../app/lib/question-types';

  const seedQuestions: Question[] = [
    { id: 'a', type: 'textarea', label: 'First',  required: false, sortOrder: 1,
      config: { rows: 4, placeholder: '' } },
    { id: 'b', type: 'radio',    label: 'Second', required: false, sortOrder: 2,
      config: { options: [{ value: 'y', label: 'Y' }], otherWithText: false } },
    { id: 'c', type: 'textarea', label: 'Third',  required: false, sortOrder: 3,
      config: { rows: 4, placeholder: '' } },
  ];

  function renderEditor(overrides?: Partial<Parameters<typeof QuestionSetEditor>[0]>) {
    const onSave = vi.fn();
    const onCancel = vi.fn();
    render(
      <QuestionSetEditor
        initial={{ name: 'Test Set', minRequired: 1, allowMultiple: false, questions: seedQuestions }}
        nameEditable={false}
        onSave={onSave}
        onCancel={onCancel}
        {...overrides}
      />,
    );
    return { onSave, onCancel };
  }

  function getRow(id: string): HTMLElement {
    const el = document.querySelector(`[data-question-id="${id}"]`);
    if (!el) throw new Error(`row ${id} not found`);
    return el as HTMLElement;
  }
  function isExpanded(id: string): boolean {
    return getRow(id).classList.contains('qs-question-row--expanded');
  }
  function expandRow(id: string) {
    fireEvent.click(within(getRow(id)).getByRole('button', { name: /first|second|third|untitled/i, hidden: true })
      ?? within(getRow(id)).getAllByRole('button')[0]);
  }
  function clickHead(id: string) {
    const head = getRow(id).querySelector('.qs-question-row__head') as HTMLElement;
    fireEvent.click(head);
  }

  describe('QuestionSetEditor accordion regression', () => {
    it('expanding a row leaves siblings collapsed', () => {
      renderEditor();
      clickHead('a');
      expect(isExpanded('a')).toBe(true);
      expect(isExpanded('b')).toBe(false);
      expect(isExpanded('c')).toBe(false);
    });

    it('editing a label in row A does not collapse row A or any sibling', () => {
      renderEditor();
      clickHead('a');
      clickHead('c');
      const labelInput = screen.getByLabelText('Prompt label', { selector: `#q-a-label` }) as HTMLInputElement;
      fireEvent.change(labelInput, { target: { value: 'First (edited)' } });
      expect(isExpanded('a')).toBe(true);
      expect(isExpanded('c')).toBe(true);
      expect((screen.getByLabelText('Prompt label', { selector: `#q-a-label` }) as HTMLInputElement).value)
        .toBe('First (edited)');
    });

    it('adding a radio option to row B does NOT collapse expanded rows', () => {
      renderEditor();
      clickHead('a');
      clickHead('b');
      clickHead('c');
      // Click "+ Add Option" inside row B.
      const rowB = getRow('b');
      const addOpt = within(rowB).getByText('+ Add Option');
      fireEvent.click(addOpt);
      expect(isExpanded('a')).toBe(true);
      expect(isExpanded('b')).toBe(true);
      expect(isExpanded('c')).toBe(true);
    });

    it('moving row C up does NOT collapse expanded rows; row C stays expanded after move', () => {
      renderEditor();
      clickHead('a');
      clickHead('c');
      const moveUp = within(getRow('c')).getByLabelText('Move up');
      fireEvent.click(moveUp);
      expect(isExpanded('a')).toBe(true);
      expect(isExpanded('c')).toBe(true);
    });

    it('removing row B does NOT collapse rows A or C', () => {
      renderEditor();
      clickHead('a');
      clickHead('c');
      const removeBtn = within(getRow('b')).getByLabelText('Remove');
      fireEvent.click(removeBtn);
      expect(isExpanded('a')).toBe(true);
      expect(isExpanded('c')).toBe(true);
    });

    it('Add Question → pick type produces a new row that auto-expands; existing rows stay expanded', () => {
      renderEditor();
      clickHead('a');
      const addBtn = screen.getByText('+ Add Question');
      fireEvent.click(addBtn);
      fireEvent.click(screen.getByText('Likert'));
      const allRows = document.querySelectorAll('[data-question-id]');
      expect(allRows.length).toBe(4);
      // The new row is the last; it must be expanded.
      const newRow = allRows[allRows.length - 1] as HTMLElement;
      expect(newRow.classList.contains('qs-question-row--expanded')).toBe(true);
      expect(isExpanded('a')).toBe(true);
    });

    it('Save calls onSave with the current working copy + reindexed sortOrder', () => {
      const { onSave } = renderEditor();
      fireEvent.click(screen.getByText('Save Changes'));
      expect(onSave).toHaveBeenCalledTimes(1);
      const payload = onSave.mock.calls[0][0];
      expect(payload.name).toBe('Test Set');
      expect(payload.minRequired).toBe(1);
      expect(payload.allowMultiple).toBe(false);
      expect(payload.questions.map((q: Question) => q.sortOrder)).toEqual([1, 2, 3]);
    });
  });
  ```

- [ ] **Step 2: Run test to verify it fails**

  ```bash
  npm run test -- tests/components/QuestionSetEditor.test.tsx
  ```

  Expected: FAIL (module not found OR — once the editor exists — the row-id selector helpers will need a small adjustment if `data-question-id` isn't yet on rows).

- [ ] **Step 3: Verify the implementation already passes**

  The Task 25 + 27 implementation should already satisfy these because state is keyed by question id. Re-run:

  ```bash
  npm run test -- tests/components/QuestionSetEditor.test.tsx
  ```

  Expected: PASS (7 tests).

- [ ] **Step 4: Commit**

  ```bash
  git add tests/components/QuestionSetEditor.test.tsx
  git commit -m "Sub-project 3 task 28: regression lock — editor accordion never collapses on action"
  ```

---

## Phase F: Routes — list, per-set editor, competency tiers

Sub-project 2 owns `app/routes/admin.tsx` (the admin shell, role guard, `<AdminNav>`, and `<SettingsRail activeItem="..." />`). Sub-project 3 registers child routes underneath. The route ids below follow the prototype's settings rail label "Assessments" (so `activeItem="assessments"` for all 5 routes).

### Task 29: Register routes in `app/routes.ts`

**Files:**
- Modify: `app/routes.ts`

- [ ] **Step 1: Add the route entries**

  Open `app/routes.ts` (sub-project 1 created the file as an RR v7 framework-mode route table). Add inside the `admin` child block:

  ```ts
  // ... existing admin routes from sub-project 2 ...
  route('settings/questions', 'routes/admin.settings.questions._index.tsx', { id: 'admin.settings.questions' }),
  route('settings/questions/:setId', 'routes/admin.settings.questions.$setId.tsx', { id: 'admin.settings.questions.detail' }),
  route('settings/questions/competency', 'routes/admin.settings.questions.competency._index.tsx', { id: 'admin.settings.questions.competency' }),
  route('settings/questions/competency/cohort/:cohortId', 'routes/admin.settings.questions.competency.cohort.$cohortId.tsx', { id: 'admin.settings.questions.competency.cohort' }),
  route('settings/questions/competency/intern/:internId', 'routes/admin.settings.questions.competency.intern.$internId.tsx', { id: 'admin.settings.questions.competency.intern' }),
  ```

  Use whatever idiom the existing `app/routes.ts` from sub-project 1 already uses (the prototype-era plan calls for `route()` from `@react-router/dev/routes`). If the file uses a flat-file convention via filename-based discovery instead, just create the files in `app/routes/` per the names above; RR v7 framework mode will pick them up. Either way, the final URL paths must be:

  - `/admin/settings/questions`
  - `/admin/settings/questions/:setId`
  - `/admin/settings/questions/competency`
  - `/admin/settings/questions/competency/cohort/:cohortId` (where `:cohortId` may be the literal `new` for create flow)
  - `/admin/settings/questions/competency/intern/:internId` (where `:internId` may be the literal `new` for create flow)

- [ ] **Step 2: Run typecheck**

  ```bash
  npm run typecheck
  ```

  Expected: zero errors. The route files don't exist yet so the imports may resolve via filename discovery; this step verifies route-table syntax only.

- [ ] **Step 3: Commit**

  ```bash
  git add app/routes.ts
  git commit -m "Sub-project 3 task 29: register 5 admin question-engine routes"
  ```

### Task 30: Settings → Questions list route

**Files:**
- Create: `app/routes/admin.settings.questions._index.tsx`

Mirrors `Prototypes/PROTOTYPE/settings-questions.html`: a table of the 4 standard editable sets followed by a single "Competency Rubric" aggregate row routing to `/admin/settings/questions/competency`.

- [ ] **Step 1: Implement**

  ```tsx
  import { Link, useLoaderData, type LoaderFunctionArgs } from 'react-router';
  import { listStandardSets, loadQuestionSet, listCohortCompetencySets, listInternCompetencySets }
    from '../lib/question-engine.server';
  import { requireAdmin } from '../lib/auth.server';
  import { SettingsRail } from '../components/nav/SettingsRail';

  export async function loader({ request }: LoaderFunctionArgs) {
    await requireAdmin(request);                                  // sub-project 2 helper
    const [standard, core, cohortSets, internSets] = await Promise.all([
      listStandardSets(),
      loadQuestionSet('competency-core'),
      listCohortCompetencySets(),
      listInternCompetencySets(),
    ]);
    const competencyCount = core?.questions.length ?? 0;
    const competencyLastEdited = [
      core?.lastEditedAt,
      ...cohortSets.map((s) => s.lastEditedAt),
      ...internSets.map((s) => s.lastEditedAt),
    ].filter((s): s is string => Boolean(s)).sort().pop() ?? null;
    return {
      standardSets: standard.map((s) => ({
        id: s.id,
        name: s.name,
        questionCount: s.questions.length,
        lastEditedAt: s.lastEditedAt,
      })),
      competencyCount,
      competencyLastEdited,
    };
  }

  function fmtDate(iso: string | null | undefined): string {
    if (!iso) return '—';
    try { return new Date(iso).toLocaleDateString(); } catch { return '—'; }
  }

  export default function SettingsQuestionsIndex() {
    const data = useLoaderData<typeof loader>();
    return (
      <>
        <section className="page-head">
          <div className="container">
            <div className="page-head__breadcrumb">
              <span className="micro-label">ADMIN / SETTINGS / ASSESSMENTS</span>
            </div>
            <div className="page-head__row">
              <div>
                <h1 className="page-head__title">ASSESSMENTS.</h1>
                <p className="page-head__sub">
                  Authoring for the program&apos;s intern-facing and admin-facing assessment forms.
                </p>
              </div>
            </div>
          </div>
        </section>
        <section className="container">
          <div className="settings-shell">
            <SettingsRail activeItem="assessments" />
            <main>
              <div className="detail-header" style={{ marginTop: 0 }}>
                <h2 className="detail-header__title">Assessments</h2>
              </div>
              <table className="assessments">
                <thead>
                  <tr>
                    <th style={{ width: '35%' }}>Set</th>
                    <th style={{ width: '20%' }}>Questions</th>
                    <th style={{ width: '25%' }}>Last Edited</th>
                    <th style={{ width: '20%' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {data.standardSets.map((s) => (
                    <tr key={s.id} style={{ cursor: 'pointer' }}>
                      <td>
                        <Link to={`/admin/settings/questions/${s.id}`} style={{ color: 'inherit', display: 'block' }}>
                          <div className="col-name">
                            <span className="name-initial">{s.name.slice(0, 2).toUpperCase()}</span>
                            {s.name}
                          </div>
                        </Link>
                      </td>
                      <td>{s.questionCount}</td>
                      <td>{fmtDate(s.lastEditedAt)}</td>
                      <td></td>
                    </tr>
                  ))}
                  <tr style={{ cursor: 'pointer' }}>
                    <td>
                      <Link to="/admin/settings/questions/competency" style={{ color: 'inherit', display: 'block' }}>
                        <div className="col-name">
                          <span className="name-initial">CR</span>
                          Competency Rubric
                        </div>
                      </Link>
                    </td>
                    <td>{data.competencyCount}</td>
                    <td>{fmtDate(data.competencyLastEdited)}</td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            </main>
          </div>
        </section>
      </>
    );
  }
  ```

- [ ] **Step 2: Run dev server, smoke-test manually**

  ```bash
  npm run dev
  ```

  Visit `http://localhost:5173/admin/settings/questions` (after logging in as the seeded admin). Expected: 4 standard sets visible + Competency Rubric aggregate row at the bottom. Each row navigates correctly. Quit the dev server (`Ctrl+C`).

- [ ] **Step 3: Commit**

  ```bash
  git add app/routes/admin.settings.questions._index.tsx
  git commit -m "Sub-project 3 task 30: add Settings -> Questions list route"
  ```

### Task 31: Per-set editor route

**Files:**
- Create: `app/routes/admin.settings.questions.$setId.tsx`

Hosts the `<QuestionSetEditor>` for one of the 4 standard sets. Action returns `{ errors }` on failure or redirects to the list on success.

- [ ] **Step 1: Implement**

  ```tsx
  import { useState } from 'react';
  import {
    useLoaderData, useActionData, useNavigation, useNavigate,
    redirect, type LoaderFunctionArgs, type ActionFunctionArgs,
  } from 'react-router';
  import { loadQuestionSet, saveQuestionSet, QuestionSetSaveError }
    from '../lib/question-engine.server';
  import { requireAdmin } from '../lib/auth.server';
  import { SettingsRail } from '../components/nav/SettingsRail';
  import { QuestionSetEditor, type QuestionSetEditorValue }
    from '../components/question-editor/QuestionSetEditor';
  import type { Question } from '../lib/question-types';

  export async function loader({ request, params }: LoaderFunctionArgs) {
    await requireAdmin(request);
    const setId = params.setId!;
    const set = await loadQuestionSet(setId);
    if (!set) throw new Response('Question set not found', { status: 404 });
    return { set };
  }

  export async function action({ request, params }: ActionFunctionArgs) {
    await requireAdmin(request);
    const setId = params.setId!;
    const formData = await request.formData();
    const raw = formData.get('payload');
    if (typeof raw !== 'string') {
      return { error: 'Missing payload', ok: false };
    }
    let parsed: QuestionSetEditorValue;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return { error: 'Malformed payload', ok: false };
    }
    try {
      await saveQuestionSet({
        setId,
        name: parsed.name,
        minRequired: parsed.minRequired,
        allowMultiple: parsed.allowMultiple,
        questions: parsed.questions as Question[],
      });
    } catch (e) {
      if (e instanceof QuestionSetSaveError) {
        return { error: e.reason, ok: false };
      }
      throw e;
    }
    return redirect('/admin/settings/questions');
  }

  export default function QuestionSetDetail() {
    const { set } = useLoaderData<typeof loader>();
    const actionData = useActionData<typeof action>();
    const nav = useNavigation();
    const navigate = useNavigate();
    const saving = nav.state === 'submitting';
    const [formError, setFormError] = useState<string | null>(null);

    // The 4 standard sets have fixed names; only competency-tier sets allow renaming.
    const nameEditable = false;

    function handleSave(next: QuestionSetEditorValue) {
      setFormError(null);
      const form = new FormData();
      form.set('payload', JSON.stringify(next));
      // Submit programmatically so action runs and redirect happens.
      fetch(window.location.pathname, { method: 'POST', body: form })
        .then(async (res) => {
          if (res.redirected) {
            navigate(res.url.replace(window.location.origin, ''));
            return;
          }
          const body = await res.json().catch(() => ({}));
          if (body?.error) setFormError(body.error);
        })
        .catch((err) => setFormError(String(err)));
    }

    return (
      <>
        <section className="page-head">
          <div className="container">
            <div className="page-head__breadcrumb">
              <span className="micro-label">
                <a href="/admin/settings/questions" style={{ color: 'inherit', textDecoration: 'none' }}>
                  ADMIN / SETTINGS / ASSESSMENTS
                </a>{' '}/ {set.name.toUpperCase()}
              </span>
            </div>
            <div className="page-head__row">
              <div>
                <h1 className="page-head__title">{set.name}.</h1>
                <p className="page-head__sub">
                  Edit questions, types, and options. Changes apply to new submissions.
                </p>
              </div>
            </div>
          </div>
        </section>
        <section className="container">
          <div className="settings-shell">
            <SettingsRail activeItem="assessments" />
            <main>
              <QuestionSetEditor
                initial={{
                  name: set.name,
                  minRequired: set.minRequired,
                  allowMultiple: set.allowMultiple,
                  questions: set.questions,
                }}
                nameEditable={nameEditable}
                onSave={handleSave}
                onCancel={() => navigate('/admin/settings/questions')}
                saving={saving}
                formError={formError ?? actionData?.error ?? null}
              />
            </main>
          </div>
        </section>
      </>
    );
  }
  ```

  > **Note on the fetch-and-redirect dance:** RR v7's `<Form>` works fine, but the editor's Save button lives below a sticky action bar and uses `onSave(value)`. The cleanest contract is to keep the editor pure (no formData mucking) and have the route route the JSON payload itself via `fetch`. If the existing sub-project 2 routes already use a more idiomatic action pattern, mirror that here instead.

- [ ] **Step 2: Manual smoke**

  Boot `npm run dev`. Open `/admin/settings/questions/personal-goals`, edit a prompt, hit Save, confirm redirect + persistence after a reload.

- [ ] **Step 3: Commit**

  ```bash
  git add app/routes/admin.settings.questions.$setId.tsx
  git commit -m "Sub-project 3 task 31: add per-set editor route"
  ```

### Task 32: Competency 3-tier detail route

**Files:**
- Create: `app/routes/admin.settings.questions.competency._index.tsx`

Mirrors `Prototypes/PROTOTYPE/settings-competency.html`. Core summary card + Cohort tier table + Intern tier table.

- [ ] **Step 1: Implement**

  ```tsx
  import { Link, useLoaderData, type LoaderFunctionArgs } from 'react-router';
  import {
    loadQuestionSet,
    listCohortCompetencySets,
    listInternCompetencySets,
  } from '../lib/question-engine.server';
  import { requireAdmin } from '../lib/auth.server';
  import { db } from '../lib/db.server';
  import { eq, inArray } from 'drizzle-orm';
  import * as schema from '../../db/schema';
  import { SettingsRail } from '../components/nav/SettingsRail';

  export async function loader({ request }: LoaderFunctionArgs) {
    await requireAdmin(request);
    const [core, cohortSets, internSets] = await Promise.all([
      loadQuestionSet('competency-core'),
      listCohortCompetencySets(),
      listInternCompetencySets(),
    ]);

    // Hydrate cohort + intern display strings.
    const cohortIds = cohortSets.map((s) => s.cohortId).filter((v): v is string => !!v);
    const internIds = internSets.map((s) => s.internId).filter((v): v is string => !!v);

    const cohorts = cohortIds.length
      ? await db.select({
          id: schema.cohorts.id,
          name: schema.cohorts.name,
          employerId: schema.cohorts.employerId,
        }).from(schema.cohorts).where(inArray(schema.cohorts.id, cohortIds))
      : [];
    const employerIds = cohorts.map((c) => c.employerId);
    const employers = employerIds.length
      ? await db.select({ id: schema.employers.id, name: schema.employers.name })
          .from(schema.employers).where(inArray(schema.employers.id, employerIds))
      : [];
    const interns = internIds.length
      ? await db.select({
          id: schema.interns.id,
          firstInitial: schema.interns.firstInitial,
          lastName: schema.interns.lastName,
          cohortId: schema.interns.cohortId,
        }).from(schema.interns).where(inArray(schema.interns.id, internIds))
      : [];

    const cohortIndex = new Map(cohorts.map((c) => [c.id, c]));
    const employerIndex = new Map(employers.map((e) => [e.id, e]));
    const internIndex = new Map(interns.map((i) => [i.id, i]));

    return {
      coreCount: core?.questions.length ?? 0,
      coreLastEdited: core?.lastEditedAt ?? null,
      cohortRows: cohortSets.map((s) => {
        const c = s.cohortId ? cohortIndex.get(s.cohortId) : null;
        const e = c ? employerIndex.get(c.employerId) : null;
        return {
          cohortId: s.cohortId,
          cohortName: c?.name ?? s.cohortId,
          employerName: e?.name ?? '—',
          questionCount: s.questions.length,
          lastEditedAt: s.lastEditedAt,
        };
      }),
      internRows: internSets.map((s) => {
        const i = s.internId ? internIndex.get(s.internId) : null;
        const c = i ? cohortIndex.get(i.cohortId) : null;
        return {
          internId: s.internId,
          internName: i ? `${i.firstInitial}. ${i.lastName}` : (s.internId ?? '—'),
          cohortName: c?.name ?? '—',
          questionCount: s.questions.length,
          lastEditedAt: s.lastEditedAt,
        };
      }),
    };
  }

  function fmtDate(iso: string | null | undefined): string {
    if (!iso) return '—';
    try { return new Date(iso).toLocaleDateString(); } catch { return '—'; }
  }

  export default function CompetencyDetail() {
    const data = useLoaderData<typeof loader>();
    return (
      <>
        <section className="page-head">
          <div className="container">
            <div className="page-head__breadcrumb">
              <span className="micro-label">
                <a href="/admin/settings/questions" style={{ color: 'inherit', textDecoration: 'none' }}>
                  ADMIN / SETTINGS / ASSESSMENTS
                </a>{' '}/ COMPETENCY
              </span>
            </div>
            <div className="page-head__row">
              <div>
                <h1 className="page-head__title">COMPETENCY QUESTIONS.</h1>
                <p className="page-head__sub">
                  Authoring for the 3-tier Competency rubric: program-wide Core, optional per-cohort, and optional per-intern.
                </p>
              </div>
            </div>
          </div>
        </section>
        <section className="container">
          <div className="settings-shell">
            <SettingsRail activeItem="assessments" />
            <main>
              <article className="qs-editor-card">
                <div className="qs-editor-card__head">
                  <h2 className="qs-editor-card__title">Core Competencies</h2>
                  <span className="micro-label">PROGRAM-WIDE</span>
                </div>
                <p style={{ color: 'var(--muted)', fontSize: 14, margin: '0 0 16px' }}>
                  Applied to every Competency assessment. Edit to change the program-wide rubric.
                </p>
                <div className="id-grid id-grid--4">
                  <div className="field" style={{ gridColumn: 'span 1' }}>
                    <label>Questions</label>
                    <input className="input" type="text" disabled value={data.coreCount} />
                  </div>
                  <div className="field" style={{ gridColumn: 'span 2' }}>
                    <label>Last Edited</label>
                    <input className="input" type="text" disabled value={fmtDate(data.coreLastEdited)} />
                  </div>
                  <div className="field" style={{ gridColumn: 'span 1', display: 'flex', alignItems: 'end' }}>
                    <Link
                      to="/admin/settings/questions/competency-core"
                      className="btn btn--primary"
                      style={{ width: '100%', textAlign: 'center' }}
                    >
                      Edit Core
                    </Link>
                  </div>
                </div>
              </article>

              <article className="qs-editor-card">
                <div className="qs-editor-card__head">
                  <h2 className="qs-editor-card__title">Cohort Questions</h2>
                  <span className="micro-label">PER-COHORT (OPTIONAL)</span>
                </div>
                <p style={{ color: 'var(--muted)', fontSize: 14, margin: '0 0 16px' }}>
                  Add role-specific competencies that apply to one cohort&apos;s interns.
                </p>
                <table className="assessments">
                  <thead>
                    <tr>
                      <th style={{ width: '30%' }}>Cohort</th>
                      <th style={{ width: '30%' }}>Employer</th>
                      <th style={{ width: '15%' }}>Questions</th>
                      <th style={{ width: '25%' }}>Last Edited</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.cohortRows.length === 0 ? (
                      <tr>
                        <td colSpan={4} style={{ color: 'var(--muted)', fontStyle: 'italic', textAlign: 'center', padding: 16 }}>
                          No cohort-specific competency sets yet. Click &quot;+ New Cohort Questions&quot; to add one.
                        </td>
                      </tr>
                    ) : (
                      data.cohortRows.map((r) => (
                        <tr key={r.cohortId ?? Math.random()} style={{ cursor: 'pointer' }}>
                          <td>
                            <Link
                              to={`/admin/settings/questions/competency/cohort/${r.cohortId}`}
                              style={{ color: 'inherit', display: 'block' }}
                            >
                              {r.cohortName}
                            </Link>
                          </td>
                          <td>{r.employerName}</td>
                          <td>{r.questionCount}</td>
                          <td>{fmtDate(r.lastEditedAt)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
                <Link to="/admin/settings/questions/competency/cohort/new" className="settings-list__add">
                  + New Cohort Questions
                </Link>
              </article>

              <article className="qs-editor-card">
                <div className="qs-editor-card__head">
                  <h2 className="qs-editor-card__title">Intern Questions</h2>
                  <span className="micro-label">PER-INTERN (OPTIONAL)</span>
                </div>
                <p style={{ color: 'var(--muted)', fontSize: 14, margin: '0 0 16px' }}>
                  Add competencies tailored to one intern&apos;s specific learning goals.
                </p>
                <table className="assessments">
                  <thead>
                    <tr>
                      <th style={{ width: '30%' }}>Intern</th>
                      <th style={{ width: '30%' }}>Cohort</th>
                      <th style={{ width: '15%' }}>Questions</th>
                      <th style={{ width: '25%' }}>Last Edited</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.internRows.length === 0 ? (
                      <tr>
                        <td colSpan={4} style={{ color: 'var(--muted)', fontStyle: 'italic', textAlign: 'center', padding: 16 }}>
                          No intern-specific competency sets yet. Click &quot;+ New Intern Questions&quot; to add one.
                        </td>
                      </tr>
                    ) : (
                      data.internRows.map((r) => (
                        <tr key={r.internId ?? Math.random()} style={{ cursor: 'pointer' }}>
                          <td>
                            <Link
                              to={`/admin/settings/questions/competency/intern/${r.internId}`}
                              style={{ color: 'inherit', display: 'block' }}
                            >
                              {r.internName}
                            </Link>
                          </td>
                          <td>{r.cohortName}</td>
                          <td>{r.questionCount}</td>
                          <td>{fmtDate(r.lastEditedAt)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
                <Link to="/admin/settings/questions/competency/intern/new" className="settings-list__add">
                  + New Intern Questions
                </Link>
              </article>
            </main>
          </div>
        </section>
      </>
    );
  }
  ```

- [ ] **Step 2: Manual smoke**

  Visit `/admin/settings/questions/competency`. Confirm: Core card shows 7 questions; empty-state rows for cohort/intern tables (or seeded rows if dev DB has them); "Edit Core" link works.

- [ ] **Step 3: Commit**

  ```bash
  git add app/routes/admin.settings.questions.competency._index.tsx
  git commit -m "Sub-project 3 task 32: add 3-tier Competency detail route"
  ```

### Task 33: Per-cohort competency editor route

**Files:**
- Create: `app/routes/admin.settings.questions.competency.cohort.$cohortId.tsx`

Handles both "new" mode (path param `new`) and "edit" mode (cohort UUID). New mode populates a cohort dropdown of cohorts WITHOUT existing competency-cohort sets; edit mode locks the dropdown.

- [ ] **Step 1: Implement**

  ```tsx
  import { useState } from 'react';
  import {
    useLoaderData, useNavigate, redirect,
    type LoaderFunctionArgs, type ActionFunctionArgs,
  } from 'react-router';
  import { eq, inArray, notInArray, and } from 'drizzle-orm';
  import { db } from '../lib/db.server';
  import * as schema from '../../db/schema';
  import {
    loadQuestionSet, saveQuestionSet, deleteQuestionSet, QuestionSetSaveError,
  } from '../lib/question-engine.server';
  import { requireAdmin } from '../lib/auth.server';
  import { SettingsRail } from '../components/nav/SettingsRail';
  import { QuestionSetEditor, type QuestionSetEditorValue }
    from '../components/question-editor/QuestionSetEditor';
  import type { Question } from '../lib/question-types';

  function competencyCohortSetId(cohortId: string): string {
    return `competency-cohort-${cohortId}`;
  }

  export async function loader({ request, params }: LoaderFunctionArgs) {
    await requireAdmin(request);
    const cohortIdParam = params.cohortId!;
    const isNew = cohortIdParam === 'new';

    // Always look up the set of cohorts already covered to drive the dropdown.
    const existingCohortIds = (await db
      .select({ cohortId: schema.questionSets.cohortId })
      .from(schema.questionSets)
      .where(eq(schema.questionSets.kind, 'competency-cohort')))
      .map((r) => r.cohortId)
      .filter((c): c is string => !!c);

    if (isNew) {
      const available = existingCohortIds.length === 0
        ? await db.select({ id: schema.cohorts.id, name: schema.cohorts.name, employerId: schema.cohorts.employerId })
            .from(schema.cohorts)
        : await db.select({ id: schema.cohorts.id, name: schema.cohorts.name, employerId: schema.cohorts.employerId })
            .from(schema.cohorts)
            .where(notInArray(schema.cohorts.id, existingCohortIds));
      const employers = available.length
        ? await db.select({ id: schema.employers.id, name: schema.employers.name })
            .from(schema.employers)
            .where(inArray(schema.employers.id, available.map((a) => a.employerId)))
        : [];
      const empIdx = new Map(employers.map((e) => [e.id, e.name]));
      return {
        mode: 'new' as const,
        cohortOptions: available.map((c) => ({ id: c.id, label: `${c.name} (${empIdx.get(c.employerId) ?? '—'})` })),
        set: null,
        boundCohortName: null,
      };
    }

    // Edit mode.
    const cohort = await db.select({ id: schema.cohorts.id, name: schema.cohorts.name, employerId: schema.cohorts.employerId })
      .from(schema.cohorts)
      .where(eq(schema.cohorts.id, cohortIdParam));
    if (cohort.length === 0) throw new Response('Cohort not found', { status: 404 });
    const employerName = (await db.select({ name: schema.employers.name }).from(schema.employers)
      .where(eq(schema.employers.id, cohort[0].employerId)))[0]?.name ?? '—';
    const set = await loadQuestionSet(competencyCohortSetId(cohortIdParam));
    return {
      mode: 'edit' as const,
      cohortOptions: [{ id: cohort[0].id, label: `${cohort[0].name} (${employerName})` }],
      set,
      boundCohortName: cohort[0].name,
    };
  }

  export async function action({ request, params }: ActionFunctionArgs) {
    await requireAdmin(request);
    const cohortIdParam = params.cohortId!;
    const formData = await request.formData();
    const op = formData.get('op');

    if (op === 'delete') {
      if (cohortIdParam === 'new') {
        return { ok: false, error: 'Cannot delete an unsaved set' };
      }
      await deleteQuestionSet(competencyCohortSetId(cohortIdParam));
      return redirect('/admin/settings/questions/competency');
    }

    const raw = formData.get('payload');
    const chosenCohortId = formData.get('cohortId');
    if (typeof raw !== 'string') return { ok: false, error: 'Missing payload' };
    let parsed: QuestionSetEditorValue;
    try { parsed = JSON.parse(raw); } catch { return { ok: false, error: 'Malformed payload' }; }

    const effectiveCohortId = cohortIdParam === 'new'
      ? (typeof chosenCohortId === 'string' ? chosenCohortId : '')
      : cohortIdParam;
    if (!effectiveCohortId) return { ok: false, error: 'Please select a cohort.' };

    try {
      await saveQuestionSet({
        setId: competencyCohortSetId(effectiveCohortId),
        kind: 'competency-cohort',
        name: parsed.name,
        cohortId: effectiveCohortId,
        minRequired: parsed.minRequired,
        allowMultiple: parsed.allowMultiple,
        questions: parsed.questions as Question[],
      });
    } catch (e) {
      if (e instanceof QuestionSetSaveError) return { ok: false, error: e.reason };
      throw e;
    }
    return redirect('/admin/settings/questions/competency');
  }

  export default function CompetencyCohortEditor() {
    const data = useLoaderData<typeof loader>();
    const navigate = useNavigate();
    const [selectedCohortId, setSelectedCohortId] = useState(
      data.mode === 'edit' ? data.cohortOptions[0]?.id ?? '' : '',
    );
    const [formError, setFormError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    const initial: QuestionSetEditorValue = data.set
      ? {
          name: data.set.name,
          minRequired: data.set.minRequired,
          allowMultiple: data.set.allowMultiple,
          questions: data.set.questions,
        }
      : {
          name: 'Cohort Questions',
          minRequired: 0,
          allowMultiple: false,
          questions: [],
        };

    function handleSave(value: QuestionSetEditorValue) {
      if (data.mode === 'new' && !selectedCohortId) {
        setFormError('Please select a cohort.');
        return;
      }
      setFormError(null);
      setSaving(true);
      const form = new FormData();
      form.set('payload', JSON.stringify(value));
      if (data.mode === 'new') form.set('cohortId', selectedCohortId);
      fetch(window.location.pathname, { method: 'POST', body: form })
        .then(async (res) => {
          if (res.redirected) {
            navigate(res.url.replace(window.location.origin, ''));
            return;
          }
          const body = await res.json().catch(() => ({}));
          if (body?.error) setFormError(body.error);
        })
        .catch((err) => setFormError(String(err)))
        .finally(() => setSaving(false));
    }

    function handleDelete() {
      if (data.mode !== 'edit') return;
      if (!confirm('Delete this cohort\'s competency set? Core and other tiers are unaffected.')) return;
      const form = new FormData();
      form.set('op', 'delete');
      fetch(window.location.pathname, { method: 'POST', body: form })
        .then((res) => {
          if (res.redirected) navigate(res.url.replace(window.location.origin, ''));
        });
    }

    const titleName = data.mode === 'edit'
      ? (data.boundCohortName ?? 'Cohort Questions')
      : 'New Cohort Questions';

    return (
      <>
        <section className="page-head">
          <div className="container">
            <div className="page-head__breadcrumb">
              <span className="micro-label">
                <a href="/admin/settings/questions" style={{ color: 'inherit', textDecoration: 'none' }}>
                  ADMIN / SETTINGS / ASSESSMENTS
                </a>{' '}/{' '}
                <a href="/admin/settings/questions/competency" style={{ color: 'inherit', textDecoration: 'none' }}>
                  COMPETENCY
                </a>{' '}/ {titleName.toUpperCase()}
              </span>
            </div>
            <div className="page-head__row">
              <div>
                <h1 className="page-head__title">{titleName}.</h1>
                <p className="page-head__sub">
                  Role-specific competency questions for one cohort. Stitched after Core questions when assessing this cohort&apos;s interns.
                </p>
              </div>
            </div>
          </div>
        </section>
        <section className="container">
          <div className="settings-shell">
            <SettingsRail activeItem="assessments" />
            <main>
              <article className="qs-editor-card">
                <div className="qs-editor-card__head">
                  <h2 className="qs-editor-card__title">Set Configuration</h2>
                  <span className="micro-label">SET INFO</span>
                </div>
                <div className="id-grid id-grid--4">
                  <div className="field" style={{ gridColumn: 'span 4' }}>
                    <label htmlFor="qs-cohort">Cohort</label>
                    <select
                      id="qs-cohort"
                      className="select"
                      value={selectedCohortId}
                      disabled={data.mode === 'edit'}
                      onChange={(e) => setSelectedCohortId(e.target.value)}
                    >
                      {data.mode === 'new' ? (
                        <option value="">Select a cohort...</option>
                      ) : null}
                      {data.cohortOptions.map((opt) => (
                        <option key={opt.id} value={opt.id}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </article>
              <QuestionSetEditor
                initial={initial}
                nameEditable
                onSave={handleSave}
                onDelete={data.mode === 'edit' ? handleDelete : undefined}
                onCancel={() => navigate('/admin/settings/questions/competency')}
                saving={saving}
                formError={formError}
              />
            </main>
          </div>
        </section>
      </>
    );
  }
  ```

- [ ] **Step 2: Manual smoke**

  Visit `/admin/settings/questions/competency/cohort/new`, select a cohort, add 2 rubric rows, save. Confirm redirect + the row now appears on the competency detail page.

- [ ] **Step 3: Commit**

  ```bash
  git add app/routes/admin.settings.questions.competency.cohort.$cohortId.tsx
  git commit -m "Sub-project 3 task 33: add per-cohort competency editor route"
  ```

### Task 34: Per-intern competency editor route

**Files:**
- Create: `app/routes/admin.settings.questions.competency.intern.$internId.tsx`

Symmetrical to Task 33 but keyed on intern.

- [ ] **Step 1: Implement**

  ```tsx
  import { useState } from 'react';
  import {
    useLoaderData, useNavigate, redirect,
    type LoaderFunctionArgs, type ActionFunctionArgs,
  } from 'react-router';
  import { eq, inArray, notInArray, and, isNull } from 'drizzle-orm';
  import { db } from '../lib/db.server';
  import * as schema from '../../db/schema';
  import {
    loadQuestionSet, saveQuestionSet, deleteQuestionSet, QuestionSetSaveError,
  } from '../lib/question-engine.server';
  import { requireAdmin } from '../lib/auth.server';
  import { SettingsRail } from '../components/nav/SettingsRail';
  import { QuestionSetEditor, type QuestionSetEditorValue }
    from '../components/question-editor/QuestionSetEditor';
  import type { Question } from '../lib/question-types';

  function competencyInternSetId(internId: string): string {
    return `competency-intern-${internId}`;
  }

  export async function loader({ request, params }: LoaderFunctionArgs) {
    await requireAdmin(request);
    const internIdParam = params.internId!;
    const isNew = internIdParam === 'new';

    const existingInternIds = (await db
      .select({ internId: schema.questionSets.internId })
      .from(schema.questionSets)
      .where(eq(schema.questionSets.kind, 'competency-intern')))
      .map((r) => r.internId)
      .filter((s): s is string => !!s);

    if (isNew) {
      const baseWhere = and(isNull(schema.interns.deletedAt));
      const available = existingInternIds.length === 0
        ? await db.select({
            id: schema.interns.id,
            firstInitial: schema.interns.firstInitial,
            lastName: schema.interns.lastName,
            cohortId: schema.interns.cohortId,
          }).from(schema.interns).where(baseWhere)
        : await db.select({
            id: schema.interns.id,
            firstInitial: schema.interns.firstInitial,
            lastName: schema.interns.lastName,
            cohortId: schema.interns.cohortId,
          }).from(schema.interns)
            .where(and(baseWhere, notInArray(schema.interns.id, existingInternIds)));
      const cohorts = available.length
        ? await db.select({ id: schema.cohorts.id, name: schema.cohorts.name })
            .from(schema.cohorts).where(inArray(schema.cohorts.id, available.map((a) => a.cohortId)))
        : [];
      const cohortIdx = new Map(cohorts.map((c) => [c.id, c.name]));
      return {
        mode: 'new' as const,
        internOptions: available.map((i) => ({
          id: i.id,
          label: `${i.firstInitial}. ${i.lastName} (${cohortIdx.get(i.cohortId) ?? '—'})`,
        })),
        set: null,
        boundInternName: null,
      };
    }

    const intern = await db.select({
      id: schema.interns.id,
      firstInitial: schema.interns.firstInitial,
      lastName: schema.interns.lastName,
      cohortId: schema.interns.cohortId,
    }).from(schema.interns).where(eq(schema.interns.id, internIdParam));
    if (intern.length === 0) throw new Response('Intern not found', { status: 404 });
    const cohortName = (await db.select({ name: schema.cohorts.name }).from(schema.cohorts)
      .where(eq(schema.cohorts.id, intern[0].cohortId)))[0]?.name ?? '—';
    const set = await loadQuestionSet(competencyInternSetId(internIdParam));
    return {
      mode: 'edit' as const,
      internOptions: [{
        id: intern[0].id,
        label: `${intern[0].firstInitial}. ${intern[0].lastName} (${cohortName})`,
      }],
      set,
      boundInternName: `${intern[0].firstInitial}. ${intern[0].lastName}`,
    };
  }

  export async function action({ request, params }: ActionFunctionArgs) {
    await requireAdmin(request);
    const internIdParam = params.internId!;
    const formData = await request.formData();
    const op = formData.get('op');

    if (op === 'delete') {
      if (internIdParam === 'new') return { ok: false, error: 'Cannot delete an unsaved set' };
      await deleteQuestionSet(competencyInternSetId(internIdParam));
      return redirect('/admin/settings/questions/competency');
    }

    const raw = formData.get('payload');
    const chosenInternId = formData.get('internId');
    if (typeof raw !== 'string') return { ok: false, error: 'Missing payload' };
    let parsed: QuestionSetEditorValue;
    try { parsed = JSON.parse(raw); } catch { return { ok: false, error: 'Malformed payload' }; }

    const effectiveInternId = internIdParam === 'new'
      ? (typeof chosenInternId === 'string' ? chosenInternId : '')
      : internIdParam;
    if (!effectiveInternId) return { ok: false, error: 'Please select an intern.' };

    try {
      await saveQuestionSet({
        setId: competencyInternSetId(effectiveInternId),
        kind: 'competency-intern',
        name: parsed.name,
        internId: effectiveInternId,
        minRequired: parsed.minRequired,
        allowMultiple: parsed.allowMultiple,
        questions: parsed.questions as Question[],
      });
    } catch (e) {
      if (e instanceof QuestionSetSaveError) return { ok: false, error: e.reason };
      throw e;
    }
    return redirect('/admin/settings/questions/competency');
  }

  export default function CompetencyInternEditor() {
    const data = useLoaderData<typeof loader>();
    const navigate = useNavigate();
    const [selectedInternId, setSelectedInternId] = useState(
      data.mode === 'edit' ? data.internOptions[0]?.id ?? '' : '',
    );
    const [formError, setFormError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    const initial: QuestionSetEditorValue = data.set
      ? {
          name: data.set.name,
          minRequired: data.set.minRequired,
          allowMultiple: data.set.allowMultiple,
          questions: data.set.questions,
        }
      : { name: 'Intern Questions', minRequired: 0, allowMultiple: false, questions: [] };

    function handleSave(value: QuestionSetEditorValue) {
      if (data.mode === 'new' && !selectedInternId) {
        setFormError('Please select an intern.');
        return;
      }
      setFormError(null);
      setSaving(true);
      const form = new FormData();
      form.set('payload', JSON.stringify(value));
      if (data.mode === 'new') form.set('internId', selectedInternId);
      fetch(window.location.pathname, { method: 'POST', body: form })
        .then(async (res) => {
          if (res.redirected) {
            navigate(res.url.replace(window.location.origin, ''));
            return;
          }
          const body = await res.json().catch(() => ({}));
          if (body?.error) setFormError(body.error);
        })
        .catch((err) => setFormError(String(err)))
        .finally(() => setSaving(false));
    }

    function handleDelete() {
      if (data.mode !== 'edit') return;
      if (!confirm('Delete this intern\'s competency set? Core and other tiers are unaffected.')) return;
      const form = new FormData();
      form.set('op', 'delete');
      fetch(window.location.pathname, { method: 'POST', body: form })
        .then((res) => {
          if (res.redirected) navigate(res.url.replace(window.location.origin, ''));
        });
    }

    const titleName = data.mode === 'edit'
      ? (data.boundInternName ?? 'Intern Questions')
      : 'New Intern Questions';

    return (
      <>
        <section className="page-head">
          <div className="container">
            <div className="page-head__breadcrumb">
              <span className="micro-label">
                <a href="/admin/settings/questions" style={{ color: 'inherit', textDecoration: 'none' }}>
                  ADMIN / SETTINGS / ASSESSMENTS
                </a>{' '}/{' '}
                <a href="/admin/settings/questions/competency" style={{ color: 'inherit', textDecoration: 'none' }}>
                  COMPETENCY
                </a>{' '}/ {titleName.toUpperCase()}
              </span>
            </div>
            <div className="page-head__row">
              <div>
                <h1 className="page-head__title">{titleName}.</h1>
                <p className="page-head__sub">
                  Intern-specific competencies tailored to one intern&apos;s learning goals. Stitched after Core + cohort tiers at assessment time.
                </p>
              </div>
            </div>
          </div>
        </section>
        <section className="container">
          <div className="settings-shell">
            <SettingsRail activeItem="assessments" />
            <main>
              <article className="qs-editor-card">
                <div className="qs-editor-card__head">
                  <h2 className="qs-editor-card__title">Set Configuration</h2>
                  <span className="micro-label">SET INFO</span>
                </div>
                <div className="id-grid id-grid--4">
                  <div className="field" style={{ gridColumn: 'span 4' }}>
                    <label htmlFor="qs-intern">Intern</label>
                    <select
                      id="qs-intern"
                      className="select"
                      value={selectedInternId}
                      disabled={data.mode === 'edit'}
                      onChange={(e) => setSelectedInternId(e.target.value)}
                    >
                      {data.mode === 'new' ? (
                        <option value="">Select an intern...</option>
                      ) : null}
                      {data.internOptions.map((opt) => (
                        <option key={opt.id} value={opt.id}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </article>
              <QuestionSetEditor
                initial={initial}
                nameEditable
                onSave={handleSave}
                onDelete={data.mode === 'edit' ? handleDelete : undefined}
                onCancel={() => navigate('/admin/settings/questions/competency')}
                saving={saving}
                formError={formError}
              />
            </main>
          </div>
        </section>
      </>
    );
  }
  ```

- [ ] **Step 2: Manual smoke**

  Visit `/admin/settings/questions/competency/intern/new`, pick an intern, add 2 rubric rows, save. Confirm the new row appears on the competency detail page.

- [ ] **Step 3: Commit**

  ```bash
  git add app/routes/admin.settings.questions.competency.intern.$internId.tsx
  git commit -m "Sub-project 3 task 34: add per-intern competency editor route"
  ```

---

## Phase G: Seed content

### Task 35: Replace `db/seed-data/question-sets.ts` with verbatim prototype content

**Files:**
- Modify (replace): `db/seed-data/question-sets.ts`

The exact content below is lifted verbatim from `Prototypes/PROTOTYPE/app.js` (`QUESTION_SETS_DEFAULTS`). Counts: Personal Goals = 5 (4 textarea + 1 short-text); Midpoint Reflection = 6 textareas; Participant Feedback = 9; Exit Employer Survey = 9; Competency Core = 7 rubric rows; Eskenazi 2026 cohort competency = 4 rubric rows.

- [ ] **Step 1: Replace the file contents**

  Open `db/seed-data/question-sets.ts` (created as a stub by sub-project 1) and replace its contents with:

  ```ts
  // Verbatim port of Prototypes/PROTOTYPE/app.js IMPACT.QUESTION_SETS_DEFAULTS.
  // Each question id and prompt label is COPIED CHARACTER-FOR-CHARACTER —
  // do not "improve" prose here; program staff already approved this exact wording
  // for the iter-1 and iter-2 prototype passes.

  export interface SeedQuestionSet {
    id: string;
    kind: 'standard' | 'competency-core' | 'competency-cohort' | 'competency-intern';
    name: string;
    cohortId?: string | null;
    internId?: string | null;
    minRequired?: number | null;
    allowMultiple?: boolean;
    questions: SeedQuestion[];
  }

  export interface SeedQuestion {
    id: string;
    type: 'textarea' | 'short-text' | 'radio' | 'checkbox-group' | 'likert' | 'competency-rubric-row';
    label: string;
    helperText?: string;
    required: boolean;
    sortOrder: number;
    config: Record<string, unknown>;
  }

  export const SEED_QUESTION_SETS: SeedQuestionSet[] = [
    /* ============================ Personal Goals (5) ========================== */
    {
      id: 'personal-goals',
      kind: 'standard',
      name: 'Personal Goals',
      minRequired: 4,
      allowMultiple: false,
      questions: [
        { id: 'pg-skills',    type: 'textarea',   sortOrder: 1, required: false,
          label: 'What skills do you want to build or improve during this internship?',
          helperText: 'Think about both workplace skills and personal strengths.',
          config: { rows: 4, placeholder: 'Your response…' } },
        { id: 'pg-gain',      type: 'textarea',   sortOrder: 2, required: false,
          label: 'What are you hoping to gain from this experience?',
          helperText: 'This could include confidence, experience, clarity about your goals — or something else.',
          config: { rows: 4, placeholder: 'Your response…' } },
        { id: 'pg-success',   type: 'textarea',   sortOrder: 3, required: false,
          label: 'What would success look like for you by the end of this internship?',
          helperText: '2–3 sentences is ideal.',
          config: { rows: 4, placeholder: 'Your response…' } },
        { id: 'pg-challenge', type: 'textarea',   sortOrder: 4, required: false,
          label: 'What is one area you want to challenge yourself in?',
          helperText: 'Something new, uncomfortable, or a skill you want to grow.',
          config: { rows: 4, placeholder: 'Your response…' } },
        { id: 'pg-confident', type: 'short-text', sortOrder: 5, required: false,
          label: 'I want to leave this experience feeling more confident in:',
          helperText: 'A short phrase or single word is fine.',
          config: { placeholder: '…', maxLength: 200 } },
      ],
    },

    /* ====================== Midpoint Reflection (6) =========================== */
    {
      id: 'midpoint-reflection',
      kind: 'standard',
      name: 'Midpoint Reflection',
      minRequired: 4,
      allowMultiple: false,
      questions: [
        { id: 'mr-learned',    type: 'textarea', sortOrder: 1, required: false,
          label: 'What have you learned or improved since starting your internship?',
          helperText: 'Think about skills, confidence, or new experiences.',
          config: { rows: 4, placeholder: 'Your response…' } },
        { id: 'mr-gone-well',  type: 'textarea', sortOrder: 2, required: false,
          label: 'What has gone well for you so far? What are you proud of?',
          helperText: 'Be specific — call out a moment if you can.',
          config: { rows: 4, placeholder: 'Your response…' } },
        { id: 'mr-challenges', type: 'textarea', sortOrder: 3, required: false,
          label: 'What challenges have you experienced?',
          helperText: 'Name them honestly — this helps your team support you.',
          config: { rows: 4, placeholder: 'Your response…' } },
        { id: 'mr-improving',  type: 'textarea', sortOrder: 4, required: false,
          label: 'What is one area you want to continue improving?',
          helperText: 'Pick one — focus matters.',
          config: { rows: 4, placeholder: 'Your response…' } },
        { id: 'mr-support',    type: 'textarea', sortOrder: 5, required: false,
          label: 'What support would help you be more successful moving forward?',
          helperText: 'Think about people, tools, or training.',
          config: { rows: 4, placeholder: 'Your response…' } },
        { id: 'mr-success',    type: 'textarea', sortOrder: 6, required: false,
          label: 'Looking ahead, what would success look like for the rest of your internship?',
          helperText: 'Paint a picture of what "going well" means.',
          config: { rows: 4, placeholder: 'Your response…' } },
      ],
    },

    /* ====================== Participant Feedback (9) ========================== */
    {
      id: 'participant-feedback',
      kind: 'standard',
      name: 'Participant Feedback',
      minRequired: 4,
      allowMultiple: false,
      questions: [
        { id: 'pf-leaving', type: 'radio', sortOrder: 1, required: false,
          label: 'Why are you leaving this internship?',
          config: {
            options: [
              { value: 'completed', label: 'Completed the program' },
              { value: 'job',       label: 'Got a job offer' },
              { value: 'school',    label: 'Returning to school' },
              { value: 'family',    label: 'Family or caregiving needs' },
              { value: 'health',    label: 'Health reasons' },
              { value: 'fit',       label: 'Not a good fit' },
            ],
            otherWithText: true,
          } },
        { id: 'pf-overall', type: 'likert', sortOrder: 2, required: false,
          label: 'Overall, how would you rate your experience?',
          config: { min: 1, max: 5, leftLabel: 'Very negative', rightLabel: 'Very positive' } },
        { id: 'pf-prepared', type: 'radio', sortOrder: 3, required: false,
          label: 'Do you feel more prepared for employment after this internship?',
          config: {
            options: [
              { value: 'yes', label: 'Yes' },
              { value: 'no',  label: 'No' },
            ],
            otherWithText: false,
          } },
        { id: 'pf-supported', type: 'radio', sortOrder: 4, required: false,
          label: 'Did you feel supported during the internship?',
          config: {
            options: [
              { value: 'yes',      label: 'Yes' },
              { value: 'somewhat', label: 'Somewhat' },
              { value: 'no',       label: 'No' },
            ],
            otherWithText: false,
          } },
        { id: 'pf-supported-detail', type: 'textarea', sortOrder: 5, required: false,
          label: "Tell us more about the support you received (or didn't):",
          config: { rows: 3, placeholder: 'Your response…' } },
        { id: 'pf-barriers', type: 'radio', sortOrder: 6, required: false,
          label: 'Did you experience any barriers during the internship?',
          config: {
            options: [
              { value: 'yes', label: 'Yes' },
              { value: 'no',  label: 'No' },
            ],
            otherWithText: false,
          } },
        { id: 'pf-barriers-detail', type: 'textarea', sortOrder: 7, required: false,
          label: 'If yes, what were the barriers — and were they addressed?',
          config: { rows: 3, placeholder: 'Your response…' } },
        { id: 'pf-recommend', type: 'radio', sortOrder: 8, required: false,
          label: 'Would you recommend this experience to others?',
          config: {
            options: [
              { value: 'yes',   label: 'Yes' },
              { value: 'maybe', label: 'Maybe' },
              { value: 'no',    label: 'No' },
            ],
            otherWithText: false,
          } },
        { id: 'pf-improve', type: 'textarea', sortOrder: 9, required: false,
          label: 'Anything we could improve?',
          config: { rows: 4, placeholder: 'Your response…' } },
      ],
    },

    /* ===================== Exit Employer Survey (9) =========================== */
    {
      id: 'exit-employer-survey',
      kind: 'standard',
      name: 'Exit Employer Survey',
      minRequired: 4,
      allowMultiple: false,
      questions: [
        { id: 'ees-outcome', type: 'radio', sortOrder: 1, required: true,
          label: 'Outcome status:',
          config: {
            options: [
              { value: 'hired',           label: 'Hired by this employer' },
              { value: 'completed',       label: 'Completed — not hired' },
              { value: 'extended',        label: 'Internship extended' },
              { value: 'early-exit-perf', label: 'Early exit — performance' },
              { value: 'early-exit-fit',  label: 'Early exit — fit' },
              { value: 'early-exit-circ', label: 'Early exit — personal circumstances' },
            ],
            otherWithText: false,
          } },
        { id: 'ees-offered', type: 'radio', sortOrder: 2, required: false,
          label: 'Was employment offered?',
          config: {
            options: [
              { value: 'yes', label: 'Yes' },
              { value: 'no',  label: 'No' },
            ],
            otherWithText: false,
          } },
        { id: 'ees-offered-detail', type: 'textarea', sortOrder: 3, required: false,
          label: 'If not, what was the primary reason?',
          config: { rows: 3, placeholder: 'Your response…' } },
        { id: 'ees-performance', type: 'likert', sortOrder: 4, required: true,
          label: 'Overall performance rating:',
          helperText: '1 = Limited / 5 = Strong',
          config: { min: 1, max: 5, leftLabel: 'Limited', rightLabel: 'Strong' } },
        { id: 'ees-strengths', type: 'textarea', sortOrder: 5, required: false,
          label: 'Strengths:',
          config: { rows: 3, placeholder: 'Your response…' } },
        { id: 'ees-improvements', type: 'textarea', sortOrder: 6, required: false,
          label: 'Areas for improvement:',
          config: { rows: 3, placeholder: 'Your response…' } },
        { id: 'ees-readiness', type: 'checkbox-group', sortOrder: 7, required: false,
          label: 'Work readiness indicators (check all that apply):',
          config: {
            options: [
              { value: 'punctual',     label: 'Reliable and punctual' },
              { value: 'communicates', label: 'Communicates clearly' },
              { value: 'feedback',     label: 'Receives feedback well' },
              { value: 'teamwork',     label: 'Works well on a team' },
              { value: 'initiative',   label: 'Takes initiative' },
              { value: 'workplace',    label: 'Understands workplace norms' },
            ],
            otherWithText: false,
          } },
        { id: 'ees-barriers', type: 'checkbox-group', sortOrder: 8, required: false,
          label: 'Barriers observed (check all that apply):',
          config: {
            options: [
              { value: 'transport',     label: 'Transportation' },
              { value: 'attendance',    label: 'Attendance' },
              { value: 'communication', label: 'Communication' },
              { value: 'tasks',         label: 'Difficulty with tasks' },
              { value: 'feedback',      label: 'Trouble with feedback' },
              { value: 'family',        label: 'Family or personal' },
            ],
            otherWithText: true,
          } },
        { id: 'ees-comments', type: 'textarea', sortOrder: 9, required: false,
          label: 'Additional comments:',
          config: { rows: 3, placeholder: 'Your response…' } },
      ],
    },

    /* ============================ Competency Core (7) ========================= */
    {
      id: 'competency-core',
      kind: 'competency-core',
      name: 'Competency Rubric — Core',
      minRequired: 0,
      allowMultiple: false,
      questions: [
        { id: 'comp-attendance',      type: 'competency-rubric-row', sortOrder: 1, required: false,
          label: 'Attendance & Punctuality',
          helperText: 'Arrives on time, communicates absences appropriately, meets hour expectations',
          config: {} },
        { id: 'comp-conduct',         type: 'competency-rubric-row', sortOrder: 2, required: false,
          label: 'Professional Conduct',
          helperText: 'Respectful, follows workplace norms, appropriate language and behavior',
          config: {} },
        { id: 'comp-communication',   type: 'competency-rubric-row', sortOrder: 3, required: false,
          label: 'Communication',
          helperText: 'Asks clarifying questions, provides updates, communicates professionally with supervisor and coworkers',
          config: {} },
        { id: 'comp-direction',       type: 'competency-rubric-row', sortOrder: 4, required: false,
          label: 'Following Direction',
          helperText: 'Understands instructions, completes tasks as assigned, confirms priorities',
          config: {} },
        { id: 'comp-problem-solving', type: 'competency-rubric-row', sortOrder: 5, required: false,
          label: 'Problem-Solving',
          helperText: 'Identifies issues, proposes solutions, escalates appropriately',
          config: {} },
        { id: 'comp-teamwork',        type: 'competency-rubric-row', sortOrder: 6, required: false,
          label: 'Teamwork',
          helperText: 'Collaborates effectively, supports peers, contributes to shared work',
          config: {} },
        { id: 'comp-quality',         type: 'competency-rubric-row', sortOrder: 7, required: false,
          label: 'Quality & Attention to Detail',
          helperText: 'Produces accurate work, double-checks before submitting, takes pride in output',
          config: {} },
      ],
    },

    /* ====== Competency Cohort (Eskenazi 2026 MA — 4 rubric rows) ============= */
    // NOTE: cohortId is the prototype's slug; sub-project 1 seeds the
    // Eskenazi 2026 cohort with a UUID. The dev seed runner does a final pass
    // to remap this fixture's cohortId to whatever UUID the cohorts row got.
    // See db/seed.ts (sub-project 1 task 36) for the remap step — sub-project 3
    // adds that translation in Task 36 below.
    {
      id: 'competency-cohort-eskenazi-2026',
      kind: 'competency-cohort',
      name: 'Eskenazi 2026 — Role-Specific',
      cohortId: 'eskenazi-2026',                                    // remapped at seed time
      minRequired: 0,
      allowMultiple: false,
      questions: [
        { id: 'cc-eskenazi-intake', type: 'competency-rubric-row', sortOrder: 1, required: false,
          label: 'Patient Intake & Vitals',
          helperText: 'Captures vitals accurately, follows intake protocol, documents in EHR',
          config: {} },
        { id: 'cc-eskenazi-ehr',    type: 'competency-rubric-row', sortOrder: 2, required: false,
          label: 'EHR Tooling',
          helperText: 'Navigates EHR, completes notes, uses templates appropriately',
          config: {} },
        { id: 'cc-eskenazi-pace',   type: 'competency-rubric-row', sortOrder: 3, required: false,
          label: 'Pace & Accuracy',
          helperText: 'Maintains throughput without sacrificing patient safety',
          config: {} },
        { id: 'cc-eskenazi-hipaa',  type: 'competency-rubric-row', sortOrder: 4, required: false,
          label: 'HIPAA & Compliance',
          helperText: 'Handles PHI appropriately, follows privacy protocols, escalates concerns',
          config: {} },
      ],
    },
  ];
  ```

- [ ] **Step 2: Run typecheck**

  ```bash
  npm run typecheck
  ```

  Expected: zero errors.

- [ ] **Step 3: Commit**

  ```bash
  git add db/seed-data/question-sets.ts
  git commit -m "Sub-project 3 task 35: replace stub seed with verbatim prototype question content"
  ```

### Task 36: Wire seed → DB with cohort UUID remap

**Files:**
- Modify: `db/seed.ts`
- Modify: `db/seed-prod.ts`

The seed runner from sub-project 1 already iterates `SEED_QUESTION_SETS`. Sub-project 3 adds the cohort slug → UUID remap for the Eskenazi cohort tier, and makes the prod seed idempotent (skip on existing `id`).

- [ ] **Step 1: Add the remap in `db/seed.ts`**

  Locate the question-sets seed block in `db/seed.ts` (created in sub-project 1 task 36) and adapt the insert loop to translate cohort slugs into the UUIDs the cohorts step assigned. The simplest pattern is to introduce a `slugToCohortUuid` map populated when cohorts are inserted, then translate before insert. Add the missing pieces:

  ```ts
  // ABOVE the cohort insert loop, declare:
  const slugToCohortUuid = new Map<string, string>();

  // INSIDE the cohort insert loop (sub-project 1 inserts cohorts from SEED_COHORTS),
  // populate the map. SEED_COHORTS rows already carry a `slug` field per
  // sub-project 1's seed-data shape; if not, add `slug` to seed-data/cohorts.ts so
  // we can match 'eskenazi-2026' here:
  slugToCohortUuid.set(cohort.slug, cohort.id);

  // REPLACE the existing question_sets insert loop with:
  console.log('Seeding question sets...');
  for (const qset of SEED_QUESTION_SETS) {
    let cohortId: string | null = null;
    let internId: string | null = null;
    if (qset.kind === 'competency-cohort' && qset.cohortId) {
      cohortId = slugToCohortUuid.get(qset.cohortId) ?? null;
      if (!cohortId) {
        console.warn(`Skipping ${qset.id}: cohort slug '${qset.cohortId}' has no UUID mapping`);
        continue;
      }
    }
    if (qset.kind === 'competency-intern' && qset.internId) {
      // No intern slugs in dev seed; intern tiers are user-authored. Skip if present.
      console.warn(`Skipping intern-tier seed ${qset.id}: dev seed does not author per-intern tiers`);
      continue;
    }
    const effectiveSetId = qset.kind === 'competency-cohort' && cohortId
      ? `competency-cohort-${cohortId}`
      : qset.id;
    await db.insert(schema.questionSets).values({
      id: effectiveSetId,
      kind: qset.kind,
      name: qset.name,
      cohortId,
      internId,
      minRequired: qset.minRequired ?? null,
      allowMultiple: qset.allowMultiple ?? false,
      lastEditedAt: new Date(),
    });
    if (qset.questions.length > 0) {
      await db.insert(schema.questions).values(
        qset.questions.map((q) => ({
          id: q.id,
          questionSetId: effectiveSetId,
          type: q.type,
          label: q.label,
          helperText: q.helperText ?? null,
          required: q.required,
          sortOrder: q.sortOrder,
          config: q.config,
        })),
      );
    }
  }
  ```

  If `seed-data/cohorts.ts` does not yet carry a `slug` field, add `slug: 'eskenazi-2026'` to the Eskenazi cohort entry (and to any other cohort that wants a stable slug). Plain `id: <uuid>` remains the primary key; `slug` is a seed-time convenience that does NOT live on the DB row.

- [ ] **Step 2: Make `db/seed-prod.ts` idempotent**

  Open `db/seed-prod.ts`. Replace its question-sets section with:

  ```ts
  console.log('Seeding question sets (idempotent)...');
  for (const qset of SEED_QUESTION_SETS) {
    if (qset.kind === 'competency-cohort' || qset.kind === 'competency-intern') {
      // Prod seed only inserts library content. Cohort/intern tiers are user-authored.
      continue;
    }
    const existing = await db.select({ id: schema.questionSets.id })
      .from(schema.questionSets).where(eq(schema.questionSets.id, qset.id));
    if (existing.length > 0) {
      console.log(`  skip ${qset.id} (already exists)`);
      continue;
    }
    await db.insert(schema.questionSets).values({
      id: qset.id,
      kind: qset.kind,
      name: qset.name,
      cohortId: null,
      internId: null,
      minRequired: qset.minRequired ?? null,
      allowMultiple: qset.allowMultiple ?? false,
      lastEditedAt: new Date(),
    });
    if (qset.questions.length > 0) {
      await db.insert(schema.questions).values(
        qset.questions.map((q) => ({
          id: q.id,
          questionSetId: qset.id,
          type: q.type,
          label: q.label,
          helperText: q.helperText ?? null,
          required: q.required,
          sortOrder: q.sortOrder,
          config: q.config,
        })),
      );
    }
    console.log(`  inserted ${qset.id}`);
  }
  ```

  Add `import { eq } from 'drizzle-orm';` if not already imported.

- [ ] **Step 3: Run the seeds against the dev DB**

  ```bash
  npm run db:seed
  ```

  Expected: log lines for each seed step, `Seed complete.` at end. Verify in Supabase Studio:

  ```sql
  SELECT id, kind, name, (
    SELECT COUNT(*) FROM public.questions WHERE question_set_id = public.question_sets.id
  ) AS qcount
  FROM public.question_sets ORDER BY kind, id;
  ```

  Expected rows:
  - `personal-goals` (standard, 5 questions)
  - `midpoint-reflection` (standard, 6)
  - `participant-feedback` (standard, 9)
  - `exit-employer-survey` (standard, 9)
  - `competency-core` (competency-core, 7)
  - `competency-cohort-<eskenazi-uuid>` (competency-cohort, 4)

- [ ] **Step 4: Run prod seed against a scratch DB (idempotency check)**

  Spin up a second Supabase project or a local Postgres + apply migrations, then:

  ```bash
  DATABASE_URL=$PROD_SCRATCH_URL npm run db:seed-prod
  DATABASE_URL=$PROD_SCRATCH_URL npm run db:seed-prod          # second run — must be safe
  ```

  Expected: second run logs `skip <id> (already exists)` for every set, exits 0, no row count change.

- [ ] **Step 5: Commit**

  ```bash
  git add db/seed.ts db/seed-prod.ts db/seed-data/cohorts.ts
  git commit -m "Sub-project 3 task 36: wire question-set seed with cohort-uuid remap and idempotent prod path"
  ```

---

## Phase H: E2E + regression sweep

### Task 37: Playwright E2E — admin authors a question set end-to-end

**Files:**
- Create: `tests/e2e/admin-question-editor.spec.ts`

- [ ] **Step 1: Write the spec**

  ```ts
  import { test, expect } from '@playwright/test';

  // Assumes Playwright's global config points at the dev server URL configured by
  // sub-project 1 (default http://localhost:5173). Sub-project 1's `auth.spec.ts`
  // already provides a helper for logging in as the seeded admin; reuse it.
  import { signInAsAdmin } from './support/auth';

  test.describe('Admin question editor', () => {
    test('open Personal Goals, edit a prompt, add a question, save, reload, verify persisted', async ({ page }) => {
      await signInAsAdmin(page);

      await page.goto('/admin/settings/questions');
      await expect(page.getByRole('heading', { name: 'ASSESSMENTS.' })).toBeVisible();

      // Navigate to Personal Goals.
      await page.getByText('Personal Goals', { exact: true }).first().click();
      await expect(page.getByRole('heading', { name: /Personal Goals/ })).toBeVisible();

      // Expand row 1 (pg-skills), edit its label.
      const row1 = page.locator('[data-question-id="pg-skills"]');
      await row1.locator('.qs-question-row__head').click();
      const labelInput = page.locator('#q-pg-skills-label');
      await labelInput.fill('What skills do you want to build during this internship? (edited)');

      // Add a new likert question.
      await page.getByRole('button', { name: '+ Add Question' }).click();
      await page.getByRole('button', { name: 'Likert' }).click();
      // The new row auto-expands. Find it by index and set its label.
      const allRows = page.locator('[data-question-id]');
      const newRow = allRows.last();
      const newLabelInput = newRow.locator('input[id$="-label"]');
      await newLabelInput.fill('How prepared do you feel?');

      // Save.
      await page.getByRole('button', { name: 'Save Changes' }).click();

      // Redirect to the list.
      await expect(page).toHaveURL(/\/admin\/settings\/questions$/);

      // Reload + re-enter the editor; verify persistence.
      await page.reload();
      await page.getByText('Personal Goals', { exact: true }).first().click();
      const row1Again = page.locator('[data-question-id="pg-skills"]');
      await row1Again.locator('.qs-question-row__head').click();
      await expect(page.locator('#q-pg-skills-label')).toHaveValue(
        'What skills do you want to build during this internship? (edited)',
      );

      // The new likert question should have a numeric label preview ending in '?'
      // (we used "How prepared do you feel?")
      await expect(page.getByText('How prepared do you feel?')).toBeVisible();
    });

    test('3-tier competency detail page renders Core + cohort + intern tables', async ({ page }) => {
      await signInAsAdmin(page);
      await page.goto('/admin/settings/questions/competency');
      await expect(page.getByRole('heading', { name: 'COMPETENCY QUESTIONS.' })).toBeVisible();
      await expect(page.getByText('Core Competencies')).toBeVisible();
      await expect(page.getByText('Cohort Questions')).toBeVisible();
      await expect(page.getByText('Intern Questions')).toBeVisible();
      // Core summary card shows the seeded 7 count.
      await expect(page.locator('input[type="text"][value="7"]').first()).toBeVisible();
    });

    test('new cohort competency set: pick cohort, add 1 rubric row, save', async ({ page }) => {
      await signInAsAdmin(page);
      await page.goto('/admin/settings/questions/competency/cohort/new');

      // Pick a cohort (use TTT — Construction 2026 if Eskenazi is already taken by seed).
      const cohortSelect = page.locator('#qs-cohort');
      await expect(cohortSelect).toBeVisible();
      // Pick whichever first non-empty option appears.
      const optionValue = await cohortSelect.locator('option').nth(1).getAttribute('value');
      if (optionValue) await cohortSelect.selectOption(optionValue);

      await page.getByRole('button', { name: '+ Add Question' }).click();
      await page.getByRole('button', { name: 'Rubric Row' }).click();
      const newRow = page.locator('[data-question-id]').last();
      await newRow.locator('input[id$="-label"]').fill('Site safety');

      await page.getByRole('button', { name: 'Save Changes' }).click();
      await expect(page).toHaveURL(/\/admin\/settings\/questions\/competency$/);
      await expect(page.getByText('Site safety')).not.toBeVisible();   // we are on the index, not the editor
    });
  });
  ```

  Confirm `tests/e2e/support/auth.ts` exists (sub-project 1 task 64-ish). If not, add a thin helper that fills the login form with the seeded admin credentials.

- [ ] **Step 2: Run Playwright locally**

  ```bash
  npm run db:seed
  npm run build
  npx playwright test tests/e2e/admin-question-editor.spec.ts
  ```

  Expected: all 3 tests pass.

- [ ] **Step 3: Commit**

  ```bash
  git add tests/e2e/admin-question-editor.spec.ts
  git commit -m "Sub-project 3 task 37: add Playwright E2E for admin question editor"
  ```

### Task 38: Full test sweep

**Files:**
- N/A — runs everything.

- [ ] **Step 1: Lint + typecheck**

  ```bash
  npm run lint
  npm run typecheck
  ```

  Expected: zero errors / zero warnings.

- [ ] **Step 2: Vitest unit + component tests**

  ```bash
  npm run test
  ```

  Expected counts (rough): isAnswered 8 tests, validateAnswers 9 tests, serializeAnswers 7 tests, stitchedCompetencyQuestions 3 tests, one suite per renderer (3-5 tests each), QuestionRenderer 4 tests, QuestionSetEditor 7 tests. Total around 55-60 specs. ALL pass.

- [ ] **Step 3: Playwright E2E**

  ```bash
  npx playwright test
  ```

  Expected: sub-project 1's auth.spec + sub-project 3's admin-question-editor.spec all pass.

- [ ] **Step 4: Manual demo run-through (5 minutes)**

  ```bash
  npm run dev
  ```

  Click through:
  1. `/admin/settings/questions` — 4 standard sets + Competency Rubric row visible
  2. Open Personal Goals — accordion rows expand/collapse independently
  3. Add a new Radio question + 2 options; save; reload; confirm persistence
  4. `/admin/settings/questions/competency` — 3 tables render
  5. Edit Core (`/admin/settings/questions/competency-core`) — 7 rubric rows; reorder rows 1 and 2; save; reload; confirm new order persisted
  6. New cohort competency tier for an unbound cohort — save with 2 rows; verify row appears on the competency detail page
  7. New intern competency tier for an intern — save with 1 row; verify it appears
  8. Delete the intern tier set you just created — confirm the row disappears from the table

  If anything misbehaves: fix it (with a new Vitest or Playwright regression test) before declaring this sub-project done.

- [ ] **Step 5: Final commit**

  No code changes if everything passed. Otherwise commit each fix as its own atomic commit:

  ```bash
  git status
  # if clean — done. Otherwise:
  git commit -m "Sub-project 3 task 38: address <issue found in sweep>"
  ```

---

## Appendix A: Cross-sub-project contracts

These are the contracts sub-project 4 (Assessment forms) and sub-project 5 (Employer shell) consume from sub-project 3. Do not break them without coordinated change.

### A.1 `<QuestionRenderer>` props shape

```ts
interface QuestionRendererProps {
  questions: Question[];                                // ordered; for competency this is the stitched list
  answers: Answers;                                     // Record<questionId, unknown>
  errors?: Record<string, string>;                      // keyed by questionId; `__minRequired` is reserved
  disabled?: boolean;                                   // read-only mode for self-assessment-detail viewer
  onChange: (questionId: string, next: unknown) => void;
  sectionBoundaries?: SectionBoundary[];                // optional; renders <SectionHeader> inline
}
```

Each per-type renderer accepts a narrower prop:

```ts
{ question: <type>Question; index: number; value: AnswerFor<type>; onChange: (next: AnswerFor<type>) => void; disabled?: boolean; error?: string }
```

### A.2 Pure validation + serialization

```ts
function validateAnswers(
  questions: Question[],
  answers: Answers,
  opts?: { minRequired?: number | null },
): { ok: boolean; errors: Record<string, string> };    // errors.__minRequired is set-level

function serializeAnswers(
  questions: Question[],
  answers: Answers,
): SerializedAnswers;                                   // wire shape for assessment_submissions.answers JSONB

function isAnswered(question: Question, answer: unknown): boolean;
```

`SerializedAnswers` is the **exact JSONB shape** that lands in `assessment_submissions.answers`. Per type:

```jsonc
// textarea / short-text
{ "<qid>": "..." | null }
// radio
{ "<qid>": "<optionValue>" | { "value": "__other", "otherText": "..." } | null }
// likert
{ "<qid>": "1".."N" | null }
// checkbox-group
{ "<qid>": ["..."] | { "values": ["..."], "otherText": "..." } | null }
// competency-rubric-row
{ "<qid>": { "rating": "emerging"|"developing"|"ready"|null, "notes": "..." } | null }
```

### A.3 Server-side stitching

```ts
async function stitchedCompetencyQuestions(internId: string): Promise<{
  internId: string;
  questions: StitchedQuestion[];                        // ordered: core, then cohort, then intern
  sectionBoundaries: SectionBoundary[];
}>;
```

`StitchedQuestion = Question & { tier: 'core' | 'cohort' | 'intern' }`.

Tier section headers emitted:

- `{ afterIndex: -1, label: 'Professional Competencies' }` — always when core has questions
- `{ afterIndex: <last-core-index>, label: 'Role-Specific', subLabel: cohortName }` — when cohort tier has questions
- `{ afterIndex: <last-cohort-or-core-index>, label: 'Intern-Specific' }` — when intern tier has questions

Boundaries are omitted entirely when the corresponding tier has zero questions.

### A.4 Question-set write path (admin-only)

```ts
interface SaveQuestionSetInput {
  setId: string;
  name?: string;                                        // optional unless creating
  kind?: QuestionSetKind;                               // required only for first insert
  cohortId?: string | null;
  internId?: string | null;
  minRequired: number | null;
  allowMultiple: boolean;
  questions: Question[];
}

class QuestionSetSaveError extends Error { reason: string }
async function saveQuestionSet(input: SaveQuestionSetInput): Promise<QuestionSet>;
async function deleteQuestionSet(setId: string): Promise<void>;
```

RLS (sub-project 1) enforces that only an admin can INSERT/UPDATE/DELETE on `question_sets` and `questions`. Sub-project 2 supplies `requireAdmin(request)` which routes call before invoking `saveQuestionSet`. Sub-project 5's employer shell does NOT call these — employers consume rubrics, they don't author them.

### A.5 Loader contract

Routes / loaders that need question-set data should call (server-only):

- `loadQuestionSet(setId)` → `QuestionSet | null`
- `listStandardSets()` → `QuestionSet[]` (the 4 standard sets)
- `listCohortCompetencySets()` → `QuestionSet[]`
- `listInternCompetencySets()` → `QuestionSet[]`
- `stitchedCompetencyQuestions(internId)` → 3-tier stitched payload (above)

All return strongly-typed `Question` discriminated unions; the consumer narrows by `q.type`.

---

## Appendix B: Self-review (REQUIRED — performed before commit)

### B.1 Spec section 6 coverage

| Spec subsection | Plan task(s) | Covered? |
|---|---|---|
| 6.1 The 6 question types | Tasks 1, 6–11 | Yes — one task per type + the discriminated union in Task 1 |
| 6.2 TypeScript shape | Task 1 | Yes — `Question`, `Answers`, `SerializedAnswers`, `ValidationResult` declared |
| 6.3 Renderer | Tasks 5–12 | Yes — `<QuestionRenderer>` dispatcher + `QuestionShell` + 6 type renderers |
| 6.4 Form lifecycle (loader / render / action) | Tasks 31, 33, 34 | Yes — loader + action per editor route; validation runs in the action |
| 6.5 Three-tier competency stitching | Tasks 14, 15 | Yes — implemented + tested at the DB layer |
| 6.6 Editor + accordion fix | Tasks 25, 27, 28 | Yes — Task 28 is a dedicated regression test asserting no-collapse on every action type |
| 6.7 Answer storage shape | Tasks 2, 4 + Appendix A.2 | Yes — `serializeAnswers` outputs the spec's wire shape; tests assert it |

### B.2 Spec section 8.1 "quality items folded in for free"

- Editor accordion-collapse fix — Task 28 (regression test) and Tasks 25, 27 (impl).
- `.input--error` cleared on resubmit — fall out of React's controlled rendering; per-question errors come from the action's return value, not stamped DOM classes. No persistent class to clear.
- Multi-error scenarios show all errors — Task 3 test "reports all errors, not just the first" locks this in.
- Competency rubric on the data-driven engine — Tasks 11, 12, 15 (the same renderer handles core + cohort + intern via section headers).

### B.3 Placeholder scan

Searched for: TBD, TODO, FIXME, "implement later", "the rest follows the same pattern", "Similar to Task", "..." as a placeholder. Verified each `...` in plan text is either inside dotted ellipsis ("Your response…") or a TypeScript spread (`...question`).

Each renderer task, each config-form task, and each route task contains complete code — no "rest follows the same pattern".

### B.4 Type / name consistency check

- `RadioConfig` declared in Task 1 → referenced in Tasks 8 (renderer), 21 (config form), 17 (defaults). Same name everywhere.
- `LikertConfig` declared in Task 1 → referenced in Tasks 10, 23, 17. Same name everywhere.
- `CheckboxGroupConfig` declared in Task 1 → referenced in Tasks 9, 22, 17. Same name.
- `Question` (the discriminated union) → imported by every renderer, every config form, the editor, the validator, the server module, and the seed file.
- Renderer prop names (`question`, `index`, `value`, `onChange`, `disabled`, `error`) are identical across all 6 type renderers.
- `QuestionRendererProps` shape declared in Task 12 matches Appendix A.1 verbatim.
- `SaveQuestionSetInput` declared in Task 14 matches Appendix A.4 verbatim.
- `stitchedCompetencyQuestions` signature in Task 15 matches Appendix A.3 verbatim.

### B.5 Sub-project 1 schema alignment

- `questions` table — columns referenced match sub-project 1 task 23: `id`, `question_set_id`, `type`, `label`, `helper_text`, `required`, `sort_order`, `config`. ✓
- `question_sets` table — columns referenced match sub-project 1: `id`, `kind`, `name`, `cohort_id`, `intern_id`, `min_required`, `allow_multiple`, `last_edited_at`. ✓
- Postgres enum `question_type` order — `textarea | short-text | radio | checkbox-group | likert | competency-rubric-row` — matches the TS `QuestionType` union in Task 1. ✓
- Postgres enum `question_set_kind` order — `standard | competency-core | competency-cohort | competency-intern` — matches the TS `QuestionSetKind` in Task 1. ✓
- CHECK constraints `qs_cohort_required` / `qs_intern_required` — Tasks 33 / 34 only pass `cohort_id` when `kind = 'competency-cohort'` and `intern_id` when `kind = 'competency-intern'`, satisfying both checks. ✓
- ON DELETE CASCADE from `questions.question_set_id` — Task 14's `saveQuestionSet` issues a `DELETE FROM questions WHERE question_set_id = ?` inside its transaction before the re-insert; this is independent of the cascade and intentional (the cascade only fires when the parent set is deleted, which `deleteQuestionSet` exercises).

### B.6 Open questions / risks (deliberately surfaced)

1. **Action submission via `fetch` instead of RR v7 `<Form>`** — Tasks 31/33/34 submit JSON-stringified payloads via `fetch` because the editor's Save button lives in a sticky action bar below the form root. If sub-project 2 standardizes on `<Form>` with serialized hidden fields, swap these routes to that idiom; the action signature remains unchanged.
2. **Cohort slug field on `SEED_COHORTS`** — Task 36 step 1 requires sub-project 1's `db/seed-data/cohorts.ts` to carry a `slug` field on each cohort. If sub-project 1 did not include it, sub-project 3 must add it (one-line change). The plan flags this inline.
3. **`requireAdmin(request)` helper** — sub-project 2 owns this helper (planned in parallel). Routes in Phase F assume the helper exists; if sub-project 2 names it differently, rename the imports at integration time.
4. **`<SettingsRail>` component** — sub-project 2 owns this; routes in Phase F import it. If the prop name differs from `activeItem="assessments"`, update the calls.
5. **Eskenazi cohort tier survives a `db:seed` rerun?** — Yes: sub-project 1's seed runs `TRUNCATE ... RESTART IDENTITY CASCADE` at the top, then re-inserts everything. The cohort tier is re-seeded each time. Idempotent at the file level; not at the row level. Sub-project 4 will need to consider answer-persistence implications during dev.
6. **`competency-rubric-row` answers in checkbox `Answers`** — `Answers = Record<string, unknown>` is loose by design (renderers narrow on `q.type`). This avoids a brittle map across questionId. Validator and serializer both narrow internally; consumers should not narrow externally.

### B.7 Files-created count check

Library: 3. Renderer components: 9 (6 types + dispatcher + shell + section header) + 1 css + 1 index = 11. Editor components: 11 (shell + row + 6 configs + options list + defaults + css) = 11. Routes: 5. Seed: 1 file modified. Tests: 1 lib + 1 server + 6 type-renderer + 1 dispatcher + 1 editor + 1 e2e = 11.

Total new files: ~41. Total modified files: ~3 (`app/routes.ts`, `db/seed.ts`, `db/seed-prod.ts`).

### B.8 Outstanding work for sub-project 4 (assessment forms) — explicit hand-off

- Build the 3 intern self-assessment routes (`/intern/personal-goals`, `/intern/midpoint-reflection`, `/intern/participant-feedback`) that call `loadQuestionSet(<id>)` and render via `<QuestionRenderer>`.
- Build the admin Competency form (`/admin/assessments/competency/new`) that calls `stitchedCompetencyQuestions(internId)`.
- Build the Exit Employer Survey form using `loadQuestionSet('exit-employer-survey')`.
- Validate via `validateAnswers(questions, answers, { minRequired: set.minRequired })` and persist via `serializeAnswers(questions, answers)`.

**End of sub-project 3 plan.**
