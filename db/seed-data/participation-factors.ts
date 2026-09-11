export interface SeedParticipationFactor {
  label: string;
  sortOrder: number;
}

// Values are unchanged in PR 1 — this PR is a pure rename. The eight new
// values land in PR 2.
export const SEED_PARTICIPATION_FACTORS: SeedParticipationFactor[] = [
  { label: 'Transportation', sortOrder: 1 },
  { label: 'Childcare', sortOrder: 2 },
  { label: 'Housing instability', sortOrder: 3 },
  { label: 'Food insecurity', sortOrder: 4 },
  { label: 'Mental health', sortOrder: 5 },
  { label: 'Physical health', sortOrder: 6 },
  { label: 'Substance use recovery', sortOrder: 7 },
  { label: 'Justice-system involvement', sortOrder: 8 },
  { label: 'Limited work history', sortOrder: 9 },
  { label: 'Education / credential gap', sortOrder: 10 },
  { label: 'Digital access', sortOrder: 11 },
  { label: 'Other', sortOrder: 12 },
];
