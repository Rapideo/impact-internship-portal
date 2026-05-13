export interface SeedCohort {
  id: string;
  employerId: string;
  roleId: string | null;
  name: string;
  startDate: string | null;
  endDate: string | null;
  description: string | null;
  phaseLabels: string[];
  /**
   * Seed-time slug used to bind cohort-tier question sets to their cohort UUID.
   * NOT a database column — `db/seed.ts` builds a slug→UUID map at insert time
   * so `db/seed-data/question-sets.ts` can reference a cohort by stable slug
   * rather than by hard-coding the UUID inside the question-set fixture.
   */
  slug: string | null;
}

export const SEED_COHORTS: SeedCohort[] = [
  {
    id: '33333333-3333-3333-3333-333333333301',
    employerId: '11111111-1111-1111-1111-111111111101',
    roleId: '22222222-2222-2222-2222-222222222201',
    name: 'Riverbend — Spring 2026 Production',
    startDate: '2026-01-12',
    endDate: '2026-07-10',
    description: '26-week production-floor cohort; 4 phases.',
    phaseLabels: ['Phase 1', 'Phase 2', 'Phase 3', 'Phase 4'],
    slug: null,
  },
  {
    id: '33333333-3333-3333-3333-333333333302',
    employerId: '11111111-1111-1111-1111-111111111102',
    roleId: '22222222-2222-2222-2222-222222222202',
    name: 'Northside — Winter 2026 CNA Track',
    startDate: '2026-01-19',
    endDate: '2026-06-19',
    description: 'CNA-track cohort with clinical shadowing.',
    phaseLabels: ['Phase 1', 'Phase 2', 'Phase 3'],
    slug: 'northside-cna-2026',
  },
  {
    id: '33333333-3333-3333-3333-333333333303',
    employerId: '11111111-1111-1111-1111-111111111103',
    roleId: '22222222-2222-2222-2222-222222222203',
    name: 'CapCity — Q1 2026 Warehouse',
    startDate: '2026-02-02',
    endDate: '2026-07-31',
    description: 'Warehouse operations + forklift certification.',
    phaseLabels: ['Phase 1', 'Phase 2', 'Phase 3'],
    slug: null,
  },
  {
    id: '33333333-3333-3333-3333-333333333304',
    employerId: '11111111-1111-1111-1111-111111111104',
    roleId: '22222222-2222-2222-2222-222222222204',
    name: 'Heartland — Spring 2026 Hospitality',
    startDate: '2026-03-01',
    endDate: '2026-08-28',
    description: 'Multi-property hospitality rotation.',
    phaseLabels: ['Phase 1', 'Phase 2'],
    slug: null,
  },
  {
    id: '33333333-3333-3333-3333-333333333305',
    employerId: '11111111-1111-1111-1111-111111111105',
    roleId: '22222222-2222-2222-2222-222222222205',
    name: 'Crossroads — Spring 2026 Teller',
    startDate: '2026-02-16',
    endDate: '2026-08-14',
    description: 'Branch teller cohort with financial literacy overlay.',
    phaseLabels: ['Phase 1', 'Phase 2', 'Phase 3'],
    slug: null,
  },
  {
    id: '33333333-3333-3333-3333-333333333306',
    employerId: '11111111-1111-1111-1111-111111111106',
    roleId: '22222222-2222-2222-2222-222222222206',
    name: 'GreenLine — Season 2026 Landscaping',
    startDate: '2026-04-06',
    endDate: '2026-10-02',
    description: 'Seasonal landscape crew cohort.',
    phaseLabels: ['Phase 1', 'Phase 2', 'Phase 3'],
    slug: null,
  },
];
