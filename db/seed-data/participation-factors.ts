export interface SeedParticipationFactor {
  label: string;
  description: string | null;
  code: string | null;
  sortOrder: number;
}

export const SEED_PARTICIPATION_FACTORS: SeedParticipationFactor[] = [
  {
    label: 'Transportation/access',
    description: 'ability to reliably get to/from internship',
    code: null,
    sortOrder: 1,
  },
  {
    label: 'Schedule/availability',
    description: 'availability did not consistently align with internship schedule',
    code: null,
    sortOrder: 2,
  },
  {
    label: 'Attendance continuity',
    description: 'interruptions or absences affected consistent participation',
    code: null,
    sortOrder: 3,
  },
  {
    label: 'Communication',
    description:
      'difficulty maintaining necessary communication related to scheduling or participation',
    code: null,
    sortOrder: 4,
  },
  {
    label: 'Workplace accommodation/access',
    description:
      'an identified workplace adjustment or access need affected participation (without identifying underlying reason)',
    code: null,
    sortOrder: 5,
  },
  {
    label: 'Administrative requirements',
    description:
      'documentation, onboarding, background check, credential, or similar requirements affected participation',
    code: null,
    sortOrder: 6,
  },
  { label: 'Other participation-related factor', description: null, code: null, sortOrder: 7 },
  { label: 'No participation factors identified', description: null, code: 'none', sortOrder: 8 },
];
