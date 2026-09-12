export interface SeedIntern {
  id: string;
  cohortId: string;
  roleId: string | null;
  internCode: string;
  startDate: string | null;
  endDate: string | null;
  entryNotes: string | null;
  entryParticipationFactorLabels: string[];
  employed90Day: boolean;
  employed90Notes: string | null;
  employed180Day: boolean;
  employed180Notes: string | null;
}

export const SEED_INTERNS: SeedIntern[] = [
  {
    id: '44444444-4444-4444-4444-444444444401',
    cohortId: '33333333-3333-3333-3333-333333333301',
    roleId: '22222222-2222-2222-2222-222222222201',
    internCode: 'IMP-26-1042',
    startDate: '2026-01-12',
    endDate: null,
    entryNotes:
      'Coming off 8-month gap; reliable transportation via family member, needs schedule flexibility for custody hearings.',
    entryParticipationFactorLabels: ['Transportation/access', 'Administrative requirements'],
    employed90Day: false,
    employed90Notes: null,
    employed180Day: false,
    employed180Notes: null,
  },
  {
    id: '44444444-4444-4444-4444-444444444402',
    cohortId: '33333333-3333-3333-3333-333333333302',
    roleId: '22222222-2222-2222-2222-222222222202',
    internCode: 'IMP-26-2077',
    startDate: '2026-01-19',
    endDate: null,
    entryNotes: 'High school + 2 yrs CC; lapsed CNA cert from 2022, intends to re-test in Phase 2.',
    entryParticipationFactorLabels: ['Schedule/availability'],
    employed90Day: false,
    employed90Notes: null,
    employed180Day: false,
    employed180Notes: null,
  },
  {
    id: '44444444-4444-4444-4444-444444444403',
    cohortId: '33333333-3333-3333-3333-333333333303',
    roleId: '22222222-2222-2222-2222-222222222203',
    internCode: 'IMP-26-3158',
    startDate: '2026-02-02',
    endDate: null,
    entryNotes:
      'Recent recovery; sponsor-supported. Open to forklift cert; ESL-supportive workplace preferred.',
    entryParticipationFactorLabels: ['Attendance continuity'],
    employed90Day: false,
    employed90Notes: null,
    employed180Day: false,
    employed180Notes: null,
  },
  // ------------------------------------------------------------------
  // E2E-dedicated fixtures (sub-project 4). All three sit in the Northside
  // CNA cohort so the Playwright competency specs exercise the cohort-tier
  // overlay seeded in sub-project 3 Phase G. Distinct fixed Intern IDs
  // (IMP-26-4001/2/3) so each spec targets its own record.
  // ------------------------------------------------------------------
  {
    id: '44444444-4444-4444-4444-444444444404',
    cohortId: '33333333-3333-3333-3333-333333333302',
    roleId: '22222222-2222-2222-2222-222222222202',
    internCode: 'IMP-26-4001',
    startDate: '2026-01-19',
    endDate: null,
    entryNotes: 'E2E fixture: targeted by Playwright intern-self-submit spec.',
    entryParticipationFactorLabels: [],
    employed90Day: false,
    employed90Notes: null,
    employed180Day: false,
    employed180Notes: null,
  },
  {
    id: '44444444-4444-4444-4444-444444444405',
    cohortId: '33333333-3333-3333-3333-333333333302',
    roleId: '22222222-2222-2222-2222-222222222202',
    internCode: 'IMP-26-4002',
    startDate: '2026-01-19',
    endDate: null,
    entryNotes: 'E2E fixture: targeted by Playwright admin-competency spec.',
    entryParticipationFactorLabels: [],
    employed90Day: false,
    employed90Notes: null,
    employed180Day: false,
    employed180Notes: null,
  },
  {
    id: '44444444-4444-4444-4444-444444444406',
    cohortId: '33333333-3333-3333-3333-333333333302',
    roleId: '22222222-2222-2222-2222-222222222202',
    internCode: 'IMP-26-4003',
    startDate: '2026-01-19',
    endDate: null,
    entryNotes: 'E2E fixture: targeted by Playwright admin-exit-employer-survey spec.',
    entryParticipationFactorLabels: [],
    employed90Day: false,
    employed90Notes: null,
    employed180Day: false,
    employed180Notes: null,
  },
];
