import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CheckboxGroupQuestion } from '../../app/components/question-renderer/CheckboxGroupQuestion';
import type { CheckboxGroupQuestion as Q } from '../../app/lib/question-types';

const q: Q = {
  id: 'q-cb',
  type: 'checkbox-group',
  label: 'Pick any',
  required: false,
  sortOrder: 1,
  config: {
    options: [
      { value: 'a', label: 'Apples' },
      { value: 'b', label: 'Bananas' },
      { value: 'c', label: 'Cherries' },
    ],
    otherWithText: true,
  },
};

describe('CheckboxGroupQuestion', () => {
  it('renders one checkbox per option plus an Other when configured', () => {
    render(<CheckboxGroupQuestion question={q} index={0} value={[]} onChange={() => {}} />);
    expect(screen.getAllByRole('checkbox')).toHaveLength(4);
  });

  it('reflects array value as checked state', () => {
    render(<CheckboxGroupQuestion question={q} index={0} value={['a', 'c']} onChange={() => {}} />);
    expect((screen.getByLabelText('Apples') as HTMLInputElement).checked).toBe(true);
    expect((screen.getByLabelText('Bananas') as HTMLInputElement).checked).toBe(false);
    expect((screen.getByLabelText('Cherries') as HTMLInputElement).checked).toBe(true);
  });

  it('toggles array values via onChange', () => {
    const onChange = vi.fn();
    render(<CheckboxGroupQuestion question={q} index={0} value={['a']} onChange={onChange} />);
    fireEvent.click(screen.getByLabelText('Bananas'));
    expect(onChange).toHaveBeenLastCalledWith(['a', 'b']);
    fireEvent.click(screen.getByLabelText('Apples'));
    expect(onChange).toHaveBeenLastCalledWith([]);
  });

  it('selecting Other promotes value into other-with-text object shape', () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <CheckboxGroupQuestion question={q} index={0} value={['a']} onChange={onChange} />,
    );
    fireEvent.click(screen.getByLabelText('Other'));
    expect(onChange).toHaveBeenLastCalledWith({ values: ['a'], otherText: '' });
    rerender(
      <CheckboxGroupQuestion
        question={q}
        index={0}
        value={{ values: ['a'], otherText: '' }}
        onChange={onChange}
      />,
    );
    const otherInp = screen.getByPlaceholderText('Please specify...') as HTMLInputElement;
    fireEvent.change(otherInp, { target: { value: 'durian' } });
    expect(onChange).toHaveBeenLastCalledWith({ values: ['a'], otherText: 'durian' });
  });

  it('unselecting Other reverts the value to a plain array', () => {
    const onChange = vi.fn();
    render(
      <CheckboxGroupQuestion
        question={q}
        index={0}
        value={{ values: ['a'], otherText: 'durian' }}
        onChange={onChange}
      />,
    );
    fireEvent.click(screen.getByLabelText('Other'));
    expect(onChange).toHaveBeenLastCalledWith(['a']);
  });
});
