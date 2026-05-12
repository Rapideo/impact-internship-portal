import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CompetencyRubricRowQuestion } from '../../app/components/question-renderer/CompetencyRubricRowQuestion';
import type { CompetencyRubricRowQuestion as Q } from '../../app/lib/question-types';

const q: Q = {
  id: 'q-rr',
  type: 'competency-rubric-row',
  label: 'Reliability',
  helperText: 'On-time, communicates',
  required: false,
  sortOrder: 1,
  config: {},
};

describe('CompetencyRubricRowQuestion', () => {
  it('renders 3 rating pills + a notes textarea', () => {
    render(
      <CompetencyRubricRowQuestion
        question={q}
        index={0}
        value={{ rating: null, notes: '' }}
        onChange={() => {}}
      />,
    );
    expect(screen.getByLabelText('Emerging')).toBeInTheDocument();
    expect(screen.getByLabelText('Developing')).toBeInTheDocument();
    expect(screen.getByLabelText('Ready')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Notes...')).toBeInTheDocument();
  });

  it('selecting a rating preserves notes', () => {
    const onChange = vi.fn();
    render(
      <CompetencyRubricRowQuestion
        question={q}
        index={0}
        value={{ rating: null, notes: 'previous note' }}
        onChange={onChange}
      />,
    );
    fireEvent.click(screen.getByLabelText('Ready'));
    expect(onChange).toHaveBeenLastCalledWith({
      rating: 'ready',
      notes: 'previous note',
    });
  });

  it('typing notes preserves the rating', () => {
    const onChange = vi.fn();
    render(
      <CompetencyRubricRowQuestion
        question={q}
        index={0}
        value={{ rating: 'developing', notes: '' }}
        onChange={onChange}
      />,
    );
    fireEvent.change(screen.getByPlaceholderText('Notes...'), {
      target: { value: 'doing well' },
    });
    expect(onChange).toHaveBeenLastCalledWith({
      rating: 'developing',
      notes: 'doing well',
    });
  });

  it('renders error', () => {
    render(
      <CompetencyRubricRowQuestion
        question={q}
        index={0}
        value={{ rating: null, notes: '' }}
        onChange={() => {}}
        error="Required"
      />,
    );
    expect(screen.getByText('Required')).toBeInTheDocument();
  });
});
