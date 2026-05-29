// tests/components/ReportsDashboard.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ReportsDashboard } from '../../app/components/reports/ReportsDashboard';
import type { ReportsData } from '../../app/lib/reports-types';

const GLOBAL: ReportsData = {
  kpis: { employers: 6, activeInterns: 37, employed90Pct: 74, assessedPct: 81 },
  internsByGroup: {
    groupBy: 'employer',
    rows: [{ id: 'e1', label: 'Riverbend', count: 12 }],
  },
  outcomes: {
    ninetyDay: { numerator: 27, denominator: 37 },
    oneEightyDay: { numerator: 19, denominator: 31 },
  },
  assessmentCompletion: [{ key: 'competency', label: 'Competency', completed: 30, total: 37 }],
  barriers: [{ id: 'b1', label: 'Transportation', count: 22 }],
  trend: [],
};

describe('ReportsDashboard', () => {
  it('renders the KPI tiles including Employers at global scope', () => {
    render(<ReportsDashboard data={GLOBAL} />);
    expect(screen.getByText('Employers')).toBeInTheDocument();
    expect(screen.getByText('Active Interns')).toBeInTheDocument();
    expect(screen.getByText('Interns by Employer')).toBeInTheDocument();
  });

  it('omits the Employers tile and uses cohort heading when scoped', () => {
    const scoped: ReportsData = {
      ...GLOBAL,
      kpis: { ...GLOBAL.kpis, employers: null },
      internsByGroup: { groupBy: 'cohort', rows: [] },
    };
    render(<ReportsDashboard data={scoped} />);
    expect(screen.queryByText('Employers')).not.toBeInTheDocument();
    expect(screen.getByText('Interns by Cohort')).toBeInTheDocument();
  });

  it('renders the trend empty state when there is no activity', () => {
    render(<ReportsDashboard data={GLOBAL} />);
    expect(screen.getByText('No submissions in this period.')).toBeInTheDocument();
  });
});
