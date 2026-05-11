export interface SeedBarrier {
  label: string;
  sortOrder: number;
}

export const SEED_BARRIERS: SeedBarrier[] = [
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
