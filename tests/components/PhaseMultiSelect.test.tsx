import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PhaseMultiSelect } from '~/components/PhaseMultiSelect';

const phases = [
  { id: 'p1', label: 'Entry' },
  { id: 'p2', label: 'Mid' },
  { id: 'p3', label: 'Exit' },
];

describe('PhaseMultiSelect', () => {
  it('renders one checkbox per phase with the default name', () => {
    render(<PhaseMultiSelect phases={phases} selectedIds={[]} />);
    const boxes = screen.getAllByRole('checkbox');
    expect(boxes).toHaveLength(3);
    boxes.forEach((b) => expect(b).toHaveAttribute('name', 'phaseIds'));
  });

  it('marks checked the boxes whose id appears in selectedIds', () => {
    render(<PhaseMultiSelect phases={phases} selectedIds={['p2']} />);
    expect(screen.getByLabelText('Entry')).not.toBeChecked();
    expect(screen.getByLabelText('Mid')).toBeChecked();
    expect(screen.getByLabelText('Exit')).not.toBeChecked();
  });

  it('renders the error message when error is provided', () => {
    render(
      <PhaseMultiSelect
        phases={phases}
        selectedIds={[]}
        error="Pick at least one phase for this cohort."
      />,
    );
    expect(screen.getByText('Pick at least one phase for this cohort.')).toBeInTheDocument();
  });

  it('honours a custom name prop', () => {
    render(<PhaseMultiSelect phases={phases} selectedIds={[]} name="other" />);
    const boxes = screen.getAllByRole('checkbox');
    boxes.forEach((b) => expect(b).toHaveAttribute('name', 'other'));
  });
});
