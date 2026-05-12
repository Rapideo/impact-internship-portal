import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LikertQuestion } from '../../app/components/question-renderer/LikertQuestion';
import type { LikertQuestion as Q } from '../../app/lib/question-types';

const q: Q = {
  id: 'q-lk',
  type: 'likert',
  label: 'Rate it',
  required: false,
  sortOrder: 1,
  config: { min: 1, max: 5, leftLabel: 'Low', rightLabel: 'High' },
};

describe('LikertQuestion', () => {
  it('renders one segment per integer in [min, max] inclusive', () => {
    render(<LikertQuestion question={q} index={0} value={null} onChange={() => {}} />);
    expect(screen.getAllByRole('radio')).toHaveLength(5);
    expect(screen.getByText('Low')).toBeInTheDocument();
    expect(screen.getByText('High')).toBeInTheDocument();
  });

  it('marks the segment matching the string value as checked', () => {
    render(<LikertQuestion question={q} index={0} value="3" onChange={() => {}} />);
    const r3 = screen.getByLabelText('3') as HTMLInputElement;
    expect(r3.checked).toBe(true);
  });

  it('fires onChange with the string value on click', () => {
    const onChange = vi.fn();
    render(<LikertQuestion question={q} index={0} value={null} onChange={onChange} />);
    fireEvent.click(screen.getByLabelText('4'));
    expect(onChange).toHaveBeenCalledWith('4');
  });
});
