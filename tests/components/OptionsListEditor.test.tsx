import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { OptionsListEditor } from '../../app/components/question-editor/OptionsListEditor';
import type { RadioOption } from '../../app/lib/question-types';

const opts: RadioOption[] = [
  { value: 'a', label: 'Alpha' },
  { value: 'b', label: 'Beta' },
  { value: 'c', label: 'Gamma' },
];

describe('OptionsListEditor', () => {
  it('renders one row per option with value + label inputs', () => {
    render(<OptionsListEditor options={opts} onChange={() => {}} />);
    expect(screen.getByDisplayValue('a')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Alpha')).toBeInTheDocument();
    expect(screen.getByDisplayValue('b')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Beta')).toBeInTheDocument();
    expect(screen.getByDisplayValue('c')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Gamma')).toBeInTheDocument();
  });

  it('emits onChange with patched value when typing into a value input', () => {
    const onChange = vi.fn();
    render(<OptionsListEditor options={opts} onChange={onChange} />);
    fireEvent.change(screen.getByDisplayValue('a'), { target: { value: 'aa' } });
    expect(onChange).toHaveBeenCalledWith([
      { value: 'aa', label: 'Alpha' },
      { value: 'b', label: 'Beta' },
      { value: 'c', label: 'Gamma' },
    ]);
  });

  it('emits onChange with patched label when typing into a label input', () => {
    const onChange = vi.fn();
    render(<OptionsListEditor options={opts} onChange={onChange} />);
    fireEvent.change(screen.getByDisplayValue('Beta'), { target: { value: 'Beta!' } });
    expect(onChange).toHaveBeenCalledWith([
      { value: 'a', label: 'Alpha' },
      { value: 'b', label: 'Beta!' },
      { value: 'c', label: 'Gamma' },
    ]);
  });

  it('appends a blank option when "+ Add Option" clicked', () => {
    const onChange = vi.fn();
    render(<OptionsListEditor options={opts} onChange={onChange} />);
    fireEvent.click(screen.getByText('+ Add Option'));
    expect(onChange).toHaveBeenCalledWith([...opts, { value: '', label: '' }]);
  });

  it('removes the row when its remove button is clicked', () => {
    const onChange = vi.fn();
    render(<OptionsListEditor options={opts} onChange={onChange} />);
    const removes = screen.getAllByLabelText('Remove');
    fireEvent.click(removes[1]!);
    expect(onChange).toHaveBeenCalledWith([
      { value: 'a', label: 'Alpha' },
      { value: 'c', label: 'Gamma' },
    ]);
  });

  it('swaps adjacent rows when Move up / Move down clicked', () => {
    const onChange = vi.fn();
    render(<OptionsListEditor options={opts} onChange={onChange} />);
    const ups = screen.getAllByLabelText('Move up');
    fireEvent.click(ups[1]!); // move idx 1 up -> swaps a and b
    expect(onChange).toHaveBeenLastCalledWith([
      { value: 'b', label: 'Beta' },
      { value: 'a', label: 'Alpha' },
      { value: 'c', label: 'Gamma' },
    ]);
    const downs = screen.getAllByLabelText('Move down');
    fireEvent.click(downs[1]!); // move idx 1 down -> swaps b and c (from base list)
    expect(onChange).toHaveBeenLastCalledWith([
      { value: 'a', label: 'Alpha' },
      { value: 'c', label: 'Gamma' },
      { value: 'b', label: 'Beta' },
    ]);
  });

  it('disables Move up on first row and Move down on last row', () => {
    render(<OptionsListEditor options={opts} onChange={() => {}} />);
    const ups = screen.getAllByLabelText('Move up') as HTMLButtonElement[];
    const downs = screen.getAllByLabelText('Move down') as HTMLButtonElement[];
    expect(ups[0]!.disabled).toBe(true);
    expect(ups[1]!.disabled).toBe(false);
    expect(downs[downs.length - 1]!.disabled).toBe(true);
    expect(downs[0]!.disabled).toBe(false);
  });

  it('handles an empty options list (only renders "Add Option")', () => {
    const onChange = vi.fn();
    render(<OptionsListEditor options={[]} onChange={onChange} />);
    expect(screen.queryByLabelText('Move up')).toBeNull();
    fireEvent.click(screen.getByText('+ Add Option'));
    expect(onChange).toHaveBeenCalledWith([{ value: '', label: '' }]);
  });
});
