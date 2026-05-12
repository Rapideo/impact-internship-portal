import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RadioQuestion } from '../../app/components/question-renderer/RadioQuestion';
import type { RadioQuestion as Q } from '../../app/lib/question-types';

const baseQ: Q = {
  id: 'q-r',
  type: 'radio',
  label: 'Why?',
  required: true,
  sortOrder: 1,
  config: {
    options: [
      { value: 'a', label: 'Option A' },
      { value: 'b', label: 'Option B' },
    ],
    otherWithText: false,
  },
};
const otherQ: Q = { ...baseQ, config: { ...baseQ.config, otherWithText: true } };

describe('RadioQuestion', () => {
  it('renders one input per option', () => {
    render(<RadioQuestion question={baseQ} index={0} value={null} onChange={() => {}} />);
    const radios = screen.getAllByRole('radio');
    expect(radios).toHaveLength(2);
    expect(screen.getByLabelText('Option A')).toBeInTheDocument();
    expect(screen.getByLabelText('Option B')).toBeInTheDocument();
  });

  it('marks the option matching `value` as checked', () => {
    render(<RadioQuestion question={baseQ} index={0} value="b" onChange={() => {}} />);
    expect((screen.getByLabelText('Option B') as HTMLInputElement).checked).toBe(true);
  });

  it('fires onChange with the option value when clicked', () => {
    const onChange = vi.fn();
    render(<RadioQuestion question={baseQ} index={0} value={null} onChange={onChange} />);
    fireEvent.click(screen.getByLabelText('Option A'));
    expect(onChange).toHaveBeenCalledWith('a');
  });

  it('with otherWithText: shows an Other input only when __other selected', () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <RadioQuestion question={otherQ} index={0} value={null} onChange={onChange} />,
    );
    expect(screen.queryByPlaceholderText('Please specify...')).toBeNull();
    fireEvent.click(screen.getByLabelText('Other'));
    expect(onChange).toHaveBeenCalledWith({ value: '__other', otherText: '' });
    rerender(
      <RadioQuestion
        question={otherQ}
        index={0}
        value={{ value: '__other', otherText: '' }}
        onChange={onChange}
      />,
    );
    const inp = screen.getByPlaceholderText('Please specify...') as HTMLInputElement;
    expect(inp).toBeInTheDocument();
    fireEvent.change(inp, { target: { value: 'because' } });
    expect(onChange).toHaveBeenLastCalledWith({ value: '__other', otherText: 'because' });
  });

  it('renders error message', () => {
    render(
      <RadioQuestion
        question={baseQ}
        index={0}
        value={null}
        onChange={() => {}}
        error="Required"
      />,
    );
    expect(screen.getByText('Required')).toBeInTheDocument();
  });
});
