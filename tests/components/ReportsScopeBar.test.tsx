// tests/components/ReportsScopeBar.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { ReportsScopeBar } from '../../app/components/reports/ReportsScopeBar';

function renderBar(props: React.ComponentProps<typeof ReportsScopeBar>) {
  const Stub = createRoutesStub([{ path: '/', Component: () => <ReportsScopeBar {...props} /> }]);
  return render(<Stub initialEntries={['/']} />);
}

describe('ReportsScopeBar', () => {
  it('admin mode shows the employer select and the scope chip', () => {
    renderBar({
      mode: 'admin',
      employers: [{ id: 'e1', name: 'Riverbend' }],
      cohorts: [],
      selectedEmployerId: null,
      selectedCohortId: null,
      scopeLabel: 'Program-wide',
    });
    expect(screen.getByLabelText(/filter by employer/i)).toBeInTheDocument();
    expect(screen.getByText('Program-wide')).toBeInTheDocument();
  });

  it('disables the cohort select until an employer is chosen (admin)', () => {
    renderBar({
      mode: 'admin',
      employers: [{ id: 'e1', name: 'Riverbend' }],
      cohorts: [],
      selectedEmployerId: null,
      selectedCohortId: null,
      scopeLabel: 'Program-wide',
    });
    expect(screen.getByLabelText(/filter by cohort/i)).toBeDisabled();
  });

  it('employer mode hides the employer select', () => {
    renderBar({
      mode: 'employer',
      cohorts: [{ id: 'c1', name: 'CNA Track' }],
      selectedEmployerId: null,
      selectedCohortId: null,
      scopeLabel: 'All cohorts',
    });
    expect(screen.queryByLabelText(/filter by employer/i)).not.toBeInTheDocument();
    expect(screen.getByLabelText(/filter by cohort/i)).not.toBeDisabled();
  });
});
