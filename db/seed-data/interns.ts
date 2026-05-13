export interface SeedIntern {
  id: string;
  cohortId: string;
  roleId: string | null;
  firstInitial: string;
  lastName: string;
  startDate: string | null;
  endDate: string | null;
  entryNotes: string | null;
  entryBarrierLabels: string[];
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
    firstInitial: 'A',
    lastName: 'Whitaker',
    startDate: '2026-01-12',
    endDate: null,
    entryNotes:
      'Coming off 8-month gap; reliable transportation via family member, needs schedule flexibility for custody hearings.',
    entryBarrierLabels: ['Transportation', 'Justice-system involvement'],
    employed90Day: false,
    employed90Notes: null,
    employed180Day: false,
    employed180Notes: null,
  },
  {
    id: '44444444-4444-4444-4444-444444444402',
    cohortId: '33333333-3333-3333-3333-333333333302',
    roleId: '22222222-2222-2222-2222-222222222202',
    firstInitial: 'B',
    lastName: 'Okafor',
    startDate: '2026-01-19',
    endDate: null,
    entryNotes: 'High school + 2 yrs CC; lapsed CNA cert from 2022, intends to re-test in Phase 2.',
    entryBarrierLabels: ['Childcare'],
    employed90Day: false,
    employed90Notes: null,
    employed180Day: false,
    employed180Notes: null,
  },
  {
    id: '44444444-4444-4444-4444-444444444403',
    cohortId: '33333333-3333-3333-3333-333333333303',
    roleId: '22222222-2222-2222-2222-222222222203',
    firstInitial: 'C',
    lastName: 'Delgado',
    startDate: '2026-02-02',
    endDate: null,
    entryNotes:
      'Recent recovery; sponsor-supported. Open to forklift cert; ESL-supportive workplace preferred.',
    entryBarrierLabels: ['Substance use recovery', 'Limited work history'],
    employed90Day: false,
    employed90Notes: null,
    employed180Day: false,
    employed180Notes: null,
  },
  // ------------------------------------------------------------------
  // E2E-dedicated fixtures (sub-project 4). All three sit in the Northside
  // CNA cohort so the Playwright competency specs exercise the cohort-tier
  // overlay seeded in sub-project 3 Phase G. Distinct last names ensure
  // unique composite-key identity lookups.
  // ------------------------------------------------------------------
  {
    id: '44444444-4444-4444-4444-444444444404',
    cohortId: '33333333-3333-3333-3333-333333333302',
    roleId: '22222222-2222-2222-2222-222222222202',
    firstInitial: 'T',
    lastName: 'Test1',
    startDate: '2026-01-19',
    endDate: null,
    entryNotes: 'E2E fixture: targeted by Playwright intern-self-submit spec.',
    entryBarrierLabels: [],
    employed90Day: false,
    employed90Notes: null,
    employed180Day: false,
    employed180Notes: null,
  },
  {
    id: '44444444-4444-4444-4444-444444444405',
    cohortId: '33333333-3333-3333-3333-333333333302',
    roleId: '22222222-2222-2222-2222-222222222202',
    firstInitial: 'T',
    lastName: 'Test2',
    startDate: '2026-01-19',
    endDate: null,
    entryNotes: 'E2E fixture: targeted by Playwright admin-competency spec.',
    entryBarrierLabels: [],
    employed90Day: false,
    employed90Notes: null,
    employed180Day: false,
    employed180Notes: null,
  },
  {
    id: '44444444-4444-4444-4444-444444444406',
    cohortId: '33333333-3333-3333-3333-333333333302',
    roleId: '22222222-2222-2222-2222-222222222202',
    firstInitial: 'T',
    lastName: 'Test3',
    startDate: '2026-01-19',
    endDate: null,
    entryNotes: 'E2E fixture: targeted by Playwright admin-exit-employer-survey spec.',
    entryBarrierLabels: [],
    employed90Day: false,
    employed90Notes: null,
    employed180Day: false,
    employed180Notes: null,
  },
];
