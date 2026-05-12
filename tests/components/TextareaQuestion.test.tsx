import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TextareaQuestion } from '../../app/components/question-renderer/TextareaQuestion';
import type { TextareaQuestion as Q } from '../../app/lib/question-types';

const q: Q = {
  id: 'q1',
  type: 'textarea',
  label: 'Tell us why.',
  helperText: 'Be specific.',
  required: true,
  sortOrder: 1,
  config: { rows: 5, placeholder: 'Your response...' },
};

describe('TextareaQuestion', () => {
  it('renders label, helper text, and configured placeholder + rows', () => {
    render(<TextareaQuestion question={q} index={0} value="" onChange={() => {}} />);
    expect(screen.getByText('Tell us why.')).toBeInTheDocument();
    expect(screen.getByText('Be specific.')).toBeInTheDocument();
    const ta = screen.getByRole('textbox') as HTMLTextAreaElement;
    expect(ta.placeholder).toBe('Your response...');
    expect(ta.rows).toBe(5);
  });

  it('is fully controlled — value prop is reflected, onChange fires with new string', () => {
    const onChange = vi.fn();
    render(<TextareaQuestion question={q} index={0} value="seed" onChange={onChange} />);
    const ta = screen.getByRole('textbox') as HTMLTextAreaElement;
    expect(ta.value).toBe('seed');
    fireEvent.change(ta, { target: { value: 'updated' } });
    expect(onChange).toHaveBeenCalledWith('updated');
  });

  it('renders error and applies error class on the wrapper', () => {
    render(
      <TextareaQuestion question={q} index={0} value="" onChange={() => {}} error="Required" />,
    );
    expect(screen.getByText('Required')).toBeInTheDocument();
    expect(document.querySelector('.assessment-question--has-error')).toBeTruthy();
  });

  it('respects disabled', () => {
    render(<TextareaQuestion question={q} index={0} value="" onChange={() => {}} disabled />);
    expect(screen.getByRole('textbox')).toBeDisabled();
  });
});
