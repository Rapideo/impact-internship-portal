// app/lib/reports-types.ts
// Shared, non-server types for the reports dashboard. Imported by both the
// server query layer and client chart components, so this file must NOT end
// in .server.ts (Vite would block the client import).

export type ReportsScope =
  | { level: 'global' }
  | { level: 'employer'; employerId: string }
  | { level: 'cohort'; employerId: string; cohortId: string };

export interface ReportsData {
  kpis: {
    employers: number | null; // null unless scope.level === 'global'
    activeInterns: number;
    employed90Pct: number; // 0–100
    assessedPct: number; // 0–100 (>=1 competency submission)
  };
  internsByGroup: {
    groupBy: 'employer' | 'cohort';
    rows: { id: string; label: string; count: number }[]; // desc by count
  };
  outcomes: {
    ninetyDay: { numerator: number; denominator: number };
    oneEightyDay: { numerator: number; denominator: number };
  };
  assessmentCompletion: { key: string; label: string; completed: number; total: number }[];
  barriers: { id: string; label: string; count: number }[]; // desc by count
  trend: { weekStart: string; count: number }[]; // ascending weeks
}
