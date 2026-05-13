import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import '@testing-library/jest-dom/vitest';
import { CompetencyAssessmentForm } from '~/components/forms/CompetencyAssessmentForm';
import type { Question, SectionBoundary } from '~/lib/question-types';

// 3 tiers of competency rubric rows (Core, Cohort, Intern-specific).
const Q: Question[] = [
  {
    id: 'core-1',
    type: 'competency-rubric-row',
    label: 'Core 1',
    required: false,
    sortOrder: 1,
    config: {},
  },
  {
    id: 'cohort-1',
    type: 'competency-rubric-row',
    label: 'Cohort 1',
    required: false,
    sortOrder: 2,
    config: {},
  },
  {
    id: 'intern-1',
    type: 'competency-rubric-row',
    label: 'Intern 1',
    required: false,
    sortOrder: 3,
    config: {},
  },
];

// 3 section headers via 2 mid-stream boundaries + 1 pre-first-question header.
const boundaries: SectionBoundary[] = [
  { afterIndex: -1, label: 'Core Competencies' },
  { afterIndex: 0, label: 'Cohort Add-Ons', subLabel: '2026 Spring' },
  { afterIndex: 1, label: 'Role-Specific', subLabel: 'Eskenazi MA' },
];

const meta = {
  internName: 'Alex Lee',
  cohortName: '2026 Spring',
  employerName: 'Eskenazi Health',
  roleName: 'Medical Assistant',
  startDate: '2026-01-12',
  endDate: '2026-05-22',
};

function renderWithRouter(ui: React.ReactElement) {
  const Stub = createRoutesStub([{ path: '/', Component: () => ui }]);
  return render(<Stub initialEntries={['/']} />);
}

describe('<CompetencyAssessmentForm>', () => {
  it('renders all 3 section headers from sectionBoundaries', () => {
    renderWithRouter(
      <CompetencyAssessmentForm
        internId="intern-1"
        phases={[
          { id: 'p1', label: 'Mid-program' },
          { id: 'p2', label: 'Exit' },
        ]}
        questions={Q}
        sectionBoundaries={boundaries}
        initialAnswers={{}}
        initialPhase={null}
        errors={{}}
        actionPath="/admin/assessments/competency"
        submitLabel="Save Assessment"
        readOnly={false}
        meta={meta}
      />,
    );
    const headers = document.querySelectorAll('.rubric-section-head__title');
    expect(headers).toHaveLength(3);
    expect(headers[0]?.textContent).toBe('Core Competencies');
    expect(headers[1]?.textContent).toBe('Cohort Add-Ons');
    expect(headers[2]?.textContent).toBe('Role-Specific');
  });

  it('exposes a required phase select with one option per phase', () => {
    renderWithRouter(
      <CompetencyAssessmentForm
        internId="intern-1"
        phases={[
          { id: 'p1', label: 'Mid-program' },
          { id: 'p2', label: 'Exit' },
        ]}
        questions={Q}
        sectionBoundaries={boundaries}
        initialAnswers={{}}
        initialPhase={null}
        errors={{}}
        actionPath="/admin/assessments/competency"
        submitLabel="Save Assessment"
        readOnly={false}
        meta={meta}
      />,
    );
    const select = screen.getByLabelText(/phase/i) as HTMLSelectElement;
    expect(select).toBeRequired();
    // Two real options plus the placeholder.
    expect(select.querySelectorAll('option')).toHaveLength(3);
  });

  it('disables the phase select with helper text when phases is empty', () => {
    renderWithRouter(
      <CompetencyAssessmentForm
        internId="intern-1"
        phases={[]}
        questions={Q}
        sectionBoundaries={boundaries}
        initialAnswers={{}}
        initialPhase={null}
        errors={{}}
        actionPath="/admin/assessments/competency"
        submitLabel="Save Assessment"
        readOnly={false}
        meta={meta}
      />,
    );
    const select = screen.getByLabelText(/phase/i) as HTMLSelectElement;
    expect(select).toBeDisabled();
    expect(screen.getByText(/no phases/i)).toBeInTheDocument();
  });

  it('renders the meta strip with intern, cohort, employer, role, dates', () => {
    renderWithRouter(
      <CompetencyAssessmentForm
        internId="intern-1"
        phases={[{ id: 'p1', label: 'Mid-program' }]}
        questions={Q}
        sectionBoundaries={boundaries}
        initialAnswers={{}}
        initialPhase={null}
        errors={{}}
        actionPath="/admin/assessments/competency"
        submitLabel="Save Assessment"
        readOnly={false}
        meta={meta}
      />,
    );
    expect(screen.getByText('Alex Lee')).toBeInTheDocument();
    expect(screen.getByText('Eskenazi Health')).toBeInTheDocument();
    expect(screen.getByText('Medical Assistant')).toBeInTheDocument();
    expect(screen.getAllByText('2026 Spring').length).toBeGreaterThan(0);
  });

  it('hides the submit button in read-only mode', () => {
    renderWithRouter(
      <CompetencyAssessmentForm
        internId="intern-1"
        phases={[{ id: 'p1', label: 'Mid-program' }]}
        questions={Q}
        sectionBoundaries={boundaries}
        initialAnswers={{}}
        initialPhase={'p1'}
        errors={{}}
        actionPath="/admin/assessments/competency"
        submitLabel="Save Assessment"
        readOnly
        meta={meta}
      />,
    );
    expect(screen.queryByRole('button', { name: 'Save Assessment' })).toBeNull();
  });
});
