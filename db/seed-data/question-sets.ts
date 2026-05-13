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

// Verbatim port of Prototypes/PROTOTYPE/app.js IMPACT.QUESTION_SETS_DEFAULTS.
// Each question id and prompt label is COPIED CHARACTER-FOR-CHARACTER —
// do not "improve" prose here; program staff already approved this exact wording
// for the iter-1 and iter-2 prototype passes.
//
// `helperText` is kept `string | null` (non-optional) to match SP1 convention;
// entries that do not supply helper text set it explicitly to `null`.
export const SEED_QUESTION_SETS: SeedQuestionSet[] = [
  /* ============================ Personal Goals (5) ========================== */
  {
    id: 'personal-goals',
    kind: 'standard',
    name: 'Personal Goals',
    cohortId: null,
    internId: null,
    minRequired: 4,
    allowMultiple: false,
    questions: [
      {
        id: 'pg-skills',
        type: 'textarea',
        sortOrder: 1,
        required: false,
        label: 'What skills do you want to build or improve during this internship?',
        helperText: 'Think about both workplace skills and personal strengths.',
        config: { rows: 4, placeholder: 'Your response…' },
      },
      {
        id: 'pg-gain',
        type: 'textarea',
        sortOrder: 2,
        required: false,
        label: 'What are you hoping to gain from this experience?',
        helperText:
          'This could include confidence, experience, clarity about your goals — or something else.',
        config: { rows: 4, placeholder: 'Your response…' },
      },
      {
        id: 'pg-success',
        type: 'textarea',
        sortOrder: 3,
        required: false,
        label: 'What would success look like for you by the end of this internship?',
        helperText: '2–3 sentences is ideal.',
        config: { rows: 4, placeholder: 'Your response…' },
      },
      {
        id: 'pg-challenge',
        type: 'textarea',
        sortOrder: 4,
        required: false,
        label: 'What is one area you want to challenge yourself in?',
        helperText: 'Something new, uncomfortable, or a skill you want to grow.',
        config: { rows: 4, placeholder: 'Your response…' },
      },
      {
        id: 'pg-confident',
        type: 'short-text',
        sortOrder: 5,
        required: false,
        label: 'I want to leave this experience feeling more confident in:',
        helperText: 'A short phrase or single word is fine.',
        config: { placeholder: '…', maxLength: 200 },
      },
    ],
  },

  /* ====================== Midpoint Reflection (6) =========================== */
  {
    id: 'midpoint-reflection',
    kind: 'standard',
    name: 'Midpoint Reflection',
    cohortId: null,
    internId: null,
    minRequired: 4,
    allowMultiple: false,
    questions: [
      {
        id: 'mr-learned',
        type: 'textarea',
        sortOrder: 1,
        required: false,
        label: 'What have you learned or improved since starting your internship?',
        helperText: 'Think about skills, confidence, or new experiences.',
        config: { rows: 4, placeholder: 'Your response…' },
      },
      {
        id: 'mr-gone-well',
        type: 'textarea',
        sortOrder: 2,
        required: false,
        label: 'What has gone well for you so far? What are you proud of?',
        helperText: 'Be specific — call out a moment if you can.',
        config: { rows: 4, placeholder: 'Your response…' },
      },
      {
        id: 'mr-challenges',
        type: 'textarea',
        sortOrder: 3,
        required: false,
        label: 'What challenges have you experienced?',
        helperText: 'Name them honestly — this helps your team support you.',
        config: { rows: 4, placeholder: 'Your response…' },
      },
      {
        id: 'mr-improving',
        type: 'textarea',
        sortOrder: 4,
        required: false,
        label: 'What is one area you want to continue improving?',
        helperText: 'Pick one — focus matters.',
        config: { rows: 4, placeholder: 'Your response…' },
      },
      {
        id: 'mr-support',
        type: 'textarea',
        sortOrder: 5,
        required: false,
        label: 'What support would help you be more successful moving forward?',
        helperText: 'Think about people, tools, or training.',
        config: { rows: 4, placeholder: 'Your response…' },
      },
      {
        id: 'mr-success',
        type: 'textarea',
        sortOrder: 6,
        required: false,
        label: 'Looking ahead, what would success look like for the rest of your internship?',
        helperText: 'Paint a picture of what "going well" means.',
        config: { rows: 4, placeholder: 'Your response…' },
      },
    ],
  },

  /* ====================== Participant Feedback (9) ========================== */
  {
    id: 'participant-feedback',
    kind: 'standard',
    name: 'Participant Feedback',
    cohortId: null,
    internId: null,
    minRequired: 4,
    allowMultiple: false,
    questions: [
      {
        id: 'pf-leaving',
        type: 'radio',
        sortOrder: 1,
        required: false,
        label: 'Why are you leaving this internship?',
        helperText: null,
        config: {
          options: [
            { value: 'completed', label: 'Completed the program' },
            { value: 'job', label: 'Got a job offer' },
            { value: 'school', label: 'Returning to school' },
            { value: 'family', label: 'Family or caregiving needs' },
            { value: 'health', label: 'Health reasons' },
            { value: 'fit', label: 'Not a good fit' },
          ],
          otherWithText: true,
        },
      },
      {
        id: 'pf-overall',
        type: 'likert',
        sortOrder: 2,
        required: false,
        label: 'Overall, how would you rate your experience?',
        helperText: null,
        config: { min: 1, max: 5, leftLabel: 'Very negative', rightLabel: 'Very positive' },
      },
      {
        id: 'pf-prepared',
        type: 'radio',
        sortOrder: 3,
        required: false,
        label: 'Do you feel more prepared for employment after this internship?',
        helperText: null,
        config: {
          options: [
            { value: 'yes', label: 'Yes' },
            { value: 'no', label: 'No' },
          ],
          otherWithText: false,
        },
      },
      {
        id: 'pf-supported',
        type: 'radio',
        sortOrder: 4,
        required: false,
        label: 'Did you feel supported during the internship?',
        helperText: null,
        config: {
          options: [
            { value: 'yes', label: 'Yes' },
            { value: 'somewhat', label: 'Somewhat' },
            { value: 'no', label: 'No' },
          ],
          otherWithText: false,
        },
      },
      {
        id: 'pf-supported-detail',
        type: 'textarea',
        sortOrder: 5,
        required: false,
        label: "Tell us more about the support you received (or didn't):",
        helperText: null,
        config: { rows: 3, placeholder: 'Your response…' },
      },
      {
        id: 'pf-barriers',
        type: 'radio',
        sortOrder: 6,
        required: false,
        label: 'Did you experience any barriers during the internship?',
        helperText: null,
        config: {
          options: [
            { value: 'yes', label: 'Yes' },
            { value: 'no', label: 'No' },
          ],
          otherWithText: false,
        },
      },
      {
        id: 'pf-barriers-detail',
        type: 'textarea',
        sortOrder: 7,
        required: false,
        label: 'If yes, what were the barriers — and were they addressed?',
        helperText: null,
        config: { rows: 3, placeholder: 'Your response…' },
      },
      {
        id: 'pf-recommend',
        type: 'radio',
        sortOrder: 8,
        required: false,
        label: 'Would you recommend this experience to others?',
        helperText: null,
        config: {
          options: [
            { value: 'yes', label: 'Yes' },
            { value: 'maybe', label: 'Maybe' },
            { value: 'no', label: 'No' },
          ],
          otherWithText: false,
        },
      },
      {
        id: 'pf-improve',
        type: 'textarea',
        sortOrder: 9,
        required: false,
        label: 'Anything we could improve?',
        helperText: null,
        config: { rows: 4, placeholder: 'Your response…' },
      },
    ],
  },

  /* ===================== Exit Employer Survey (9) =========================== */
  {
    id: 'exit-employer-survey',
    kind: 'standard',
    name: 'Exit Employer Survey',
    cohortId: null,
    internId: null,
    minRequired: 4,
    allowMultiple: false,
    questions: [
      {
        id: 'ees-outcome',
        type: 'radio',
        sortOrder: 1,
        required: true,
        label: 'Outcome status:',
        helperText: null,
        config: {
          options: [
            { value: 'hired', label: 'Hired by this employer' },
            { value: 'completed', label: 'Completed — not hired' },
            { value: 'extended', label: 'Internship extended' },
            { value: 'early-exit-perf', label: 'Early exit — performance' },
            { value: 'early-exit-fit', label: 'Early exit — fit' },
            { value: 'early-exit-circ', label: 'Early exit — personal circumstances' },
          ],
          otherWithText: false,
        },
      },
      {
        id: 'ees-offered',
        type: 'radio',
        sortOrder: 2,
        required: false,
        label: 'Was employment offered?',
        helperText: null,
        config: {
          options: [
            { value: 'yes', label: 'Yes' },
            { value: 'no', label: 'No' },
          ],
          otherWithText: false,
        },
      },
      {
        id: 'ees-offered-detail',
        type: 'textarea',
        sortOrder: 3,
        required: false,
        label: 'If not, what was the primary reason?',
        helperText: null,
        config: { rows: 3, placeholder: 'Your response…' },
      },
      {
        id: 'ees-performance',
        type: 'likert',
        sortOrder: 4,
        required: true,
        label: 'Overall performance rating:',
        helperText: '1 = Limited / 5 = Strong',
        config: { min: 1, max: 5, leftLabel: 'Limited', rightLabel: 'Strong' },
      },
      {
        id: 'ees-strengths',
        type: 'textarea',
        sortOrder: 5,
        required: false,
        label: 'Strengths:',
        helperText: null,
        config: { rows: 3, placeholder: 'Your response…' },
      },
      {
        id: 'ees-improvements',
        type: 'textarea',
        sortOrder: 6,
        required: false,
        label: 'Areas for improvement:',
        helperText: null,
        config: { rows: 3, placeholder: 'Your response…' },
      },
      {
        id: 'ees-readiness',
        type: 'checkbox-group',
        sortOrder: 7,
        required: false,
        label: 'Work readiness indicators (check all that apply):',
        helperText: null,
        config: {
          options: [
            { value: 'punctual', label: 'Reliable and punctual' },
            { value: 'communicates', label: 'Communicates clearly' },
            { value: 'feedback', label: 'Receives feedback well' },
            { value: 'teamwork', label: 'Works well on a team' },
            { value: 'initiative', label: 'Takes initiative' },
            { value: 'workplace', label: 'Understands workplace norms' },
          ],
          otherWithText: false,
        },
      },
      {
        id: 'ees-barriers',
        type: 'checkbox-group',
        sortOrder: 8,
        required: false,
        label: 'Barriers observed (check all that apply):',
        helperText: null,
        config: {
          options: [
            { value: 'transport', label: 'Transportation' },
            { value: 'attendance', label: 'Attendance' },
            { value: 'communication', label: 'Communication' },
            { value: 'tasks', label: 'Difficulty with tasks' },
            { value: 'feedback', label: 'Trouble with feedback' },
            { value: 'family', label: 'Family or personal' },
          ],
          otherWithText: true,
        },
      },
      {
        id: 'ees-comments',
        type: 'textarea',
        sortOrder: 9,
        required: false,
        label: 'Additional comments:',
        helperText: null,
        config: { rows: 3, placeholder: 'Your response…' },
      },
    ],
  },

  /* ============================ Competency Core (7) ========================= */
  {
    id: 'competency-core',
    kind: 'competency-core',
    name: 'Competency Rubric — Core',
    cohortId: null,
    internId: null,
    minRequired: 0,
    allowMultiple: false,
    questions: [
      {
        id: 'comp-attendance',
        type: 'competency-rubric-row',
        sortOrder: 1,
        required: false,
        label: 'Attendance & Punctuality',
        helperText: 'Arrives on time, communicates absences appropriately, meets hour expectations',
        config: {},
      },
      {
        id: 'comp-conduct',
        type: 'competency-rubric-row',
        sortOrder: 2,
        required: false,
        label: 'Professional Conduct',
        helperText: 'Respectful, follows workplace norms, appropriate language and behavior',
        config: {},
      },
      {
        id: 'comp-communication',
        type: 'competency-rubric-row',
        sortOrder: 3,
        required: false,
        label: 'Communication',
        helperText:
          'Asks clarifying questions, provides updates, communicates professionally with supervisor and coworkers',
        config: {},
      },
      {
        id: 'comp-direction',
        type: 'competency-rubric-row',
        sortOrder: 4,
        required: false,
        label: 'Following Direction',
        helperText: 'Understands instructions, completes tasks as assigned, confirms priorities',
        config: {},
      },
      {
        id: 'comp-problem-solving',
        type: 'competency-rubric-row',
        sortOrder: 5,
        required: false,
        label: 'Problem-Solving',
        helperText: 'Identifies issues, proposes solutions, escalates appropriately',
        config: {},
      },
      {
        id: 'comp-teamwork',
        type: 'competency-rubric-row',
        sortOrder: 6,
        required: false,
        label: 'Teamwork',
        helperText: 'Collaborates effectively, supports peers, contributes to shared work',
        config: {},
      },
      {
        id: 'comp-quality',
        type: 'competency-rubric-row',
        sortOrder: 7,
        required: false,
        label: 'Quality & Attention to Detail',
        helperText:
          'Produces accurate work, double-checks before submitting, takes pride in output',
        config: {},
      },
    ],
  },

  /* ====== Competency Cohort (Northside CNA 2026 — 4 rubric rows) ============ */
  // NOTE: cohortId carries a slug here; db/seed.ts (Task 36) remaps slug → UUID
  // at insert time using the slug field added to db/seed-data/cohorts.ts.
  {
    id: 'competency-cohort-northside-cna-2026',
    kind: 'competency-cohort',
    name: 'Northside CNA — Role-Specific',
    cohortId: 'northside-cna-2026', // remapped at seed time
    internId: null,
    minRequired: 0,
    allowMultiple: false,
    questions: [
      {
        id: 'cc-northside-intake',
        type: 'competency-rubric-row',
        sortOrder: 1,
        required: false,
        label: 'Patient Intake & Vitals',
        helperText: 'Captures vitals accurately, follows intake protocol, documents in EHR',
        config: {},
      },
      {
        id: 'cc-northside-ehr',
        type: 'competency-rubric-row',
        sortOrder: 2,
        required: false,
        label: 'EHR Tooling',
        helperText: 'Navigates EHR, completes notes, uses templates appropriately',
        config: {},
      },
      {
        id: 'cc-northside-pace',
        type: 'competency-rubric-row',
        sortOrder: 3,
        required: false,
        label: 'Pace & Accuracy',
        helperText: 'Maintains throughput without sacrificing patient safety',
        config: {},
      },
      {
        id: 'cc-northside-hipaa',
        type: 'competency-rubric-row',
        sortOrder: 4,
        required: false,
        label: 'HIPAA & Compliance',
        helperText: 'Handles PHI appropriately, follows privacy protocols, escalates concerns',
        config: {},
      },
    ],
  },
];
