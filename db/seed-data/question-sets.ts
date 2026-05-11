export type SeedQuestionSetKind =
  | 'standard'
  | 'competency-core'
  | 'competency-cohort'
  | 'competency-intern';

export type SeedQuestionType =
  | 'textarea'
  | 'short-text'
  | 'radio'
  | 'checkbox-group'
  | 'likert'
  | 'competency-rubric-row';

export interface SeedQuestion {
  id: string;
  type: SeedQuestionType;
  label: string;
  helperText: string | null;
  required: boolean;
  sortOrder: number;
  config: Record<string, unknown>;
}

export interface SeedQuestionSet {
  id: string;
  kind: SeedQuestionSetKind;
  name: string;
  cohortId: string | null;
  internId: string | null;
  minRequired: number | null;
  allowMultiple: boolean;
  questions: SeedQuestion[];
}

export const SEED_QUESTION_SETS: SeedQuestionSet[] = [
  {
    id: 'personal-goals',
    kind: 'standard',
    name: 'Personal Goals (entry)',
    cohortId: null,
    internId: null,
    minRequired: null,
    allowMultiple: false,
    questions: [
      {
        id: 'personal-goals-q1',
        type: 'textarea',
        label: 'What are your top goals for this internship?',
        helperText: 'A few sentences is plenty. We will revisit these at the midpoint.',
        required: true,
        sortOrder: 1,
        config: {},
      },
    ],
  },
  {
    id: 'midpoint-reflection',
    kind: 'standard',
    name: 'Midpoint Reflection',
    cohortId: null,
    internId: null,
    minRequired: null,
    allowMultiple: false,
    questions: [
      {
        id: 'midpoint-q1',
        type: 'textarea',
        label: 'What is going well so far?',
        helperText: null,
        required: true,
        sortOrder: 1,
        config: {},
      },
    ],
  },
  {
    id: 'participant-feedback',
    kind: 'standard',
    name: 'Participant Feedback (exit)',
    cohortId: null,
    internId: null,
    minRequired: null,
    allowMultiple: false,
    questions: [
      {
        id: 'participant-feedback-q1',
        type: 'likert',
        label: 'Overall, how would you rate your internship experience?',
        helperText: '1 = very poor, 5 = excellent',
        required: true,
        sortOrder: 1,
        config: { scale: 5 },
      },
    ],
  },
  {
    id: 'exit-employer-survey',
    kind: 'standard',
    name: 'Exit Employer Survey',
    cohortId: null,
    internId: null,
    minRequired: null,
    allowMultiple: true,
    questions: [
      {
        id: 'exit-employer-q1',
        type: 'textarea',
        label: 'Summary of intern performance and outcomes.',
        helperText: null,
        required: true,
        sortOrder: 1,
        config: {},
      },
    ],
  },
  {
    id: 'competency-core',
    kind: 'competency-core',
    name: 'Competency — Core (program-wide)',
    cohortId: null,
    internId: null,
    minRequired: null,
    allowMultiple: false,
    questions: [
      {
        id: 'competency-core-row1',
        type: 'competency-rubric-row',
        label: 'Attendance and punctuality',
        helperText: null,
        required: true,
        sortOrder: 1,
        config: { scale: 4 },
      },
    ],
  },
  {
    id: 'competency-cohort-33333333-3333-3333-3333-333333333301',
    kind: 'competency-cohort',
    name: 'Competency — Riverbend Spring 2026 (cohort-specific)',
    cohortId: '33333333-3333-3333-3333-333333333301',
    internId: null,
    minRequired: null,
    allowMultiple: false,
    questions: [
      {
        id: 'competency-cohort-33333333-3333-3333-3333-333333333301-row1',
        type: 'competency-rubric-row',
        label: 'Shop-floor safety awareness',
        helperText: null,
        required: true,
        sortOrder: 1,
        config: { scale: 4 },
      },
    ],
  },
];
