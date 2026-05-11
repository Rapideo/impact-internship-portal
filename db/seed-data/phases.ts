export interface SeedPhase {
  label: string;
  sortOrder: number;
}

export const SEED_PHASES: SeedPhase[] = [
  { label: 'Phase 1', sortOrder: 1 },
  { label: 'Phase 2', sortOrder: 2 },
  { label: 'Phase 3', sortOrder: 3 },
  { label: 'Phase 4', sortOrder: 4 },
];
