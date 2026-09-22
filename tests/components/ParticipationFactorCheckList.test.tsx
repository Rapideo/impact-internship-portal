import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ParticipationFactorCheckList } from '~/components/ParticipationFactorCheckList';

const factors = [
  { id: 'b1', label: 'No reliable transportation to placement site' },
  { id: 'b2', label: 'Childcare gaps' },
  { id: 'b3', label: 'Limited English proficiency' },
];

describe('ParticipationFactorCheckList', () => {
  it('renders one checkbox per factor with the given name', () => {
    render(<ParticipationFactorCheckList factors={factors} checkedIds={[]} />);
    const boxes = screen.getAllByRole('checkbox');
    expect(boxes).toHaveLength(3);
    boxes.forEach((b) => expect(b).toHaveAttribute('name', 'participationFactorIds'));
  });

  it('marks checked the boxes whose id appears in checkedIds', () => {
    render(<ParticipationFactorCheckList factors={factors} checkedIds={['b2']} />);
    expect(screen.getByLabelText('No reliable transportation to placement site')).not.toBeChecked();
    expect(screen.getByLabelText('Childcare gaps')).toBeChecked();
    expect(screen.getByLabelText('Limited English proficiency')).not.toBeChecked();
  });

  it('honours custom name + disabled props', () => {
    render(
      <ParticipationFactorCheckList factors={factors} checkedIds={[]} name="other" disabled />,
    );
    const boxes = screen.getAllByRole('checkbox');
    boxes.forEach((b) => {
      expect(b).toHaveAttribute('name', 'other');
      expect(b).toBeDisabled();
    });
  });

  it('renders the description as helper text beneath the label', () => {
    render(
      <ParticipationFactorCheckList
        factors={[
          {
            id: '1',
            label: 'Transportation/access',
            description: 'ability to reliably get to/from internship',
          },
          { id: '2', label: 'Other participation-related factor', description: null },
        ]}
        checkedIds={[]}
      />,
    );
    expect(screen.getByText('ability to reliably get to/from internship')).toBeInTheDocument();
    // A factor with no description renders no helper element at all.
    expect(document.querySelectorAll('.participation-factor-check-list__desc')).toHaveLength(1);
  });

  it('says what a check means — checked = the factor applied (KP feedback)', () => {
    render(<ParticipationFactorCheckList factors={factors} checkedIds={[]} />);
    expect(screen.getByText(/Check each factor that applied to this intern/i)).toBeInTheDocument();
    expect(screen.getByText(/unchecked if it did not apply/i)).toBeInTheDocument();
  });
});
