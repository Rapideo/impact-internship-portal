import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QuestionRenderer } from '../../app/components/question-renderer/QuestionRenderer';
import type { Question, SectionBoundary } from '../../app/lib/question-types';

const qs: Question[] = [
  {
    id: 't',
    type: 'textarea',
    label: 'TA',
    required: false,
    sortOrder: 1,
    config: { rows: 4, placeholder: '' },
  },
  {
    id: 's',
    type: 'short-text',
    label: 'ST',
    required: false,
    sortOrder: 2,
    config: { placeholder: '', maxLength: 200 },
  },
  {
    id: 'r',
    type: 'radio',
    label: 'R',
    required: false,
    sortOrder: 3,
    config: { options: [{ value: 'y', label: 'Y' }], otherWithText: false },
  },
  {
    id: 'c',
    type: 'checkbox-group',
    label: 'C',
    required: false,
    sortOrder: 4,
    config: { options: [{ value: 'a', label: 'A' }], otherWithText: false },
  },
  {
    id: 'l',
    type: 'likert',
    label: 'L',
    required: false,
    sortOrder: 5,
    config: { min: 1, max: 3, leftLabel: 'lo', rightLabel: 'hi' },
  },
  {
    id: 'rr',
    type: 'competency-rubric-row',
    label: 'RR',
    required: false,
    sortOrder: 6,
    config: {},
  },
];

describe('QuestionRenderer', () => {
  it('renders one wrapper per question with correct data-qtype', () => {
    render(<QuestionRenderer questions={qs} answers={{}} onChange={() => {}} />);
    expect(document.querySelectorAll('[data-qid]').length).toBe(6);
    expect(document.querySelector('[data-qid="t"]')?.getAttribute('data-qtype')).toBe('textarea');
    expect(document.querySelector('[data-qid="rr"]')?.getAttribute('data-qtype')).toBe(
      'competency-rubric-row',
    );
  });

  it('routes onChange callbacks back with the questionId', () => {
    const onChange = vi.fn();
    render(<QuestionRenderer questions={[qs[0]!]} answers={{}} onChange={onChange} />);
    const ta = screen.getByRole('textbox') as HTMLTextAreaElement;
    fireEvent.change(ta, { target: { value: 'hello' } });
    expect(onChange).toHaveBeenCalledWith('t', 'hello');
  });

  it('renders section header at the configured boundary', () => {
    const boundaries: SectionBoundary[] = [
      { afterIndex: -1, label: 'Professional Competencies' },
      { afterIndex: 1, label: 'Role-Specific', subLabel: 'Eskenazi 2026 MA' },
    ];
    render(
      <QuestionRenderer
        questions={qs.slice(0, 3)}
        answers={{}}
        onChange={() => {}}
        sectionBoundaries={boundaries}
      />,
    );
    const headers = document.querySelectorAll('.rubric-section-head__title');
    expect(headers[0]?.textContent).toBe('Professional Competencies');
    expect(headers[1]?.textContent).toBe('Role-Specific');
  });

  it('passes per-question errors through', () => {
    render(
      <QuestionRenderer
        questions={[qs[0]!]}
        answers={{}}
        errors={{ t: 'Required' }}
        onChange={() => {}}
      />,
    );
    expect(screen.getByText('Required')).toBeInTheDocument();
  });
});
