import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BarrierCheckList } from '~/components/BarrierCheckList';

const barriers = [
  { id: 'b1', label: 'No reliable transportation to placement site' },
  { id: 'b2', label: 'Childcare gaps' },
  { id: 'b3', label: 'Limited English proficiency' },
];

describe('BarrierCheckList', () => {
  it('renders one checkbox per barrier with the given name', () => {
    render(<BarrierCheckList barriers={barriers} checkedIds={[]} />);
    const boxes = screen.getAllByRole('checkbox');
    expect(boxes).toHaveLength(3);
    boxes.forEach((b) => expect(b).toHaveAttribute('name', 'barrierIds'));
  });

  it('marks checked the boxes whose id appears in checkedIds', () => {
    render(<BarrierCheckList barriers={barriers} checkedIds={['b2']} />);
    expect(screen.getByLabelText('No reliable transportation to placement site')).not.toBeChecked();
    expect(screen.getByLabelText('Childcare gaps')).toBeChecked();
    expect(screen.getByLabelText('Limited English proficiency')).not.toBeChecked();
  });

  it('honours custom name + disabled props', () => {
    render(<BarrierCheckList barriers={barriers} checkedIds={[]} name="other" disabled />);
    const boxes = screen.getAllByRole('checkbox');
    boxes.forEach((b) => {
      expect(b).toHaveAttribute('name', 'other');
      expect(b).toBeDisabled();
    });
  });
});
