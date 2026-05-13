import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import '@testing-library/jest-dom/vitest';
import { AssessmentForm } from '~/components/forms/AssessmentForm';
import type { Question } from '~/lib/question-types';

// SP3 contract adaptation: `Question` lives in `~/lib/question-types`, not
// `~/lib/question-engine` (plan freeze). Same shape, different path.

const Q: Question[] = [
  {
    id: 'q1',
    type: 'textarea',
    label: 'Q1',
    required: true,
    sortOrder: 1,
    config: { rows: 4, placeholder: '' },
  },
  {
    id: 'q2',
    type: 'short-text',
    label: 'Q2',
    required: false,
    sortOrder: 2,
    config: { placeholder: '', maxLength: 200 },
  },
];

// react-router's <Form> needs a Router context. createRoutesStub wraps the
// component under test in a memory router whose only route renders our
// element, which is enough for component-level testing.
function renderWithRouter(ui: React.ReactElement) {
  const Stub = createRoutesStub([{ path: '/', Component: () => ui }]);
  return render(<Stub initialEntries={['/']} />);
}

describe('<AssessmentForm>', () => {
  it('renders the question prompts via QuestionRenderer', () => {
    renderWithRouter(
      <AssessmentForm
        questions={Q}
        initialAnswers={{}}
        errors={{}}
        actionPath="/intern/personal-goals"
        submitLabel="Submit"
        modalTitle="Submit?"
        modalBody="Once submitted, you can't edit."
        readOnly={false}
      />,
    );
    expect(screen.getByText('Q1')).toBeInTheDocument();
    expect(screen.getByText('Q2')).toBeInTheDocument();
  });

  it('respects readOnly by hiding the submit button', () => {
    renderWithRouter(
      <AssessmentForm
        questions={Q}
        initialAnswers={{ q1: 'hi' }}
        errors={{}}
        actionPath="/intern/personal-goals"
        submitLabel="Submit"
        modalTitle="Submit?"
        modalBody=""
        readOnly={true}
      />,
    );
    // In read-only mode the submit button is not rendered.
    expect(screen.queryByRole('button', { name: 'Submit' })).toBeNull();
  });

  it('renders inline errors from props.errors', () => {
    renderWithRouter(
      <AssessmentForm
        questions={Q}
        initialAnswers={{}}
        errors={{ q1: 'Required' }}
        actionPath="/intern/personal-goals"
        submitLabel="Submit"
        modalTitle=""
        modalBody=""
        readOnly={false}
      />,
    );
    expect(screen.getByText(/Required/)).toBeInTheDocument();
  });

  it('renders the set-level error banner when setLevelError is provided', () => {
    renderWithRouter(
      <AssessmentForm
        questions={Q}
        initialAnswers={{}}
        errors={{}}
        actionPath="/intern/personal-goals"
        submitLabel="Submit"
        modalTitle=""
        modalBody=""
        readOnly={false}
        setLevelError="Please answer at least 3 of 5 questions."
      />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('at least 3 of 5');
  });
});
