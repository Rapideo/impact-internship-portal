import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ShortTextQuestion } from '../../app/components/question-renderer/ShortTextQuestion';
import type { ShortTextQuestion as Q } from '../../app/lib/question-types';

const q: Q = {
  id: 'q-st',
  type: 'short-text',
  label: 'In one phrase, ...',
  required: false,
  sortOrder: 1,
  config: { placeholder: 'A short phrase...', maxLength: 80 },
};

describe('ShortTextQuestion', () => {
  it('renders a text input with configured placeholder + maxLength', () => {
    render(<ShortTextQuestion question={q} index={0} value="" onChange={() => {}} />);
    const inp = screen.getByRole('textbox') as HTMLInputElement;
    expect(inp.type).toBe('text');
    expect(inp.placeholder).toBe('A short phrase...');
    expect(inp.maxLength).toBe(80);
  });

  it('is controlled and propagates onChange', () => {
    const onChange = vi.fn();
    render(<ShortTextQuestion question={q} index={0} value="hi" onChange={onChange} />);
    const inp = screen.getByRole('textbox') as HTMLInputElement;
    expect(inp.value).toBe('hi');
    fireEvent.change(inp, { target: { value: 'updated' } });
    expect(onChange).toHaveBeenCalledWith('updated');
  });

  it('renders error', () => {
    render(
      <ShortTextQuestion question={q} index={0} value="" onChange={() => {}} error="Required" />,
    );
    expect(screen.getByText('Required')).toBeInTheDocument();
  });
});
