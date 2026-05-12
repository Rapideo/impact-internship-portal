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

export type QuestionConfigFor<T extends QuestionType> = T extends 'textarea'
  ? TextareaConfig
  : T extends 'short-text'
    ? ShortTextConfig
    : T extends 'radio'
      ? RadioConfig
      : T extends 'checkbox-group'
        ? CheckboxGroupConfig
        : T extends 'likert'
          ? LikertConfig
          : T extends 'competency-rubric-row'
            ? CompetencyRubricRowConfig
            : never;

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
  | string[] // no "other"
  | { values: string[]; otherText: string } // "other" enabled
  | null;

export interface CompetencyRubricRowAnswer {
  rating: 'emerging' | 'developing' | 'ready' | null;
  notes: string;
}

export type AnswerFor<T extends QuestionType> = T extends 'textarea'
  ? TextareaAnswer
  : T extends 'short-text'
    ? ShortTextAnswer
    : T extends 'radio'
      ? RadioAnswer
      : T extends 'checkbox-group'
        ? CheckboxGroupAnswer
        : T extends 'likert'
          ? LikertAnswer
          : T extends 'competency-rubric-row'
            ? CompetencyRubricRowAnswer
            : never;

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
// Uses an intersection (not `interface extends`) so the `Question` discriminated
// union narrows correctly on `.type` after composing with the `tier` field.
export type StitchedQuestion = Question & { tier: 'core' | 'cohort' | 'intern' };

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
