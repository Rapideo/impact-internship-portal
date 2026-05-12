import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { InlineEditableList } from '~/components/InlineEditableList';

describe('InlineEditableList', () => {
  it('renders initial rows', () => {
    render(
      <InlineEditableList
        initial={[
          { id: '1', label: 'Phase 1' },
          { id: '2', label: 'Phase 2' },
        ]}
        addLabel="+ Add Phase"
        name="phases"
      />,
    );
    expect(screen.getByDisplayValue('Phase 1')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Phase 2')).toBeInTheDocument();
  });

  it('adds a new row', () => {
    render(
      <InlineEditableList
        initial={[{ id: '1', label: 'Phase 1' }]}
        addLabel="+ Add Phase"
        name="phases"
      />,
    );
    fireEvent.click(screen.getByText('+ Add Phase'));
    const inputs = screen.getAllByPlaceholderText('Label');
    expect(inputs).toHaveLength(2);
  });

  it('removes a row', () => {
    render(
      <InlineEditableList
        initial={[
          { id: '1', label: 'Phase 1' },
          { id: '2', label: 'Phase 2' },
        ]}
        addLabel="+ Add Phase"
        name="phases"
      />,
    );
    const removes = screen.getAllByLabelText('Remove');
    fireEvent.click(removes[0]!);
    expect(screen.queryByDisplayValue('Phase 1')).not.toBeInTheDocument();
    expect(screen.getByDisplayValue('Phase 2')).toBeInTheDocument();
  });

  it('disables Move-Up on first row and Move-Down on last row', () => {
    render(
      <InlineEditableList
        initial={[
          { id: '1', label: 'Phase 1' },
          { id: '2', label: 'Phase 2' },
        ]}
        addLabel="+ Add Phase"
        name="phases"
      />,
    );
    const ups = screen.getAllByLabelText('Move up');
    const downs = screen.getAllByLabelText('Move down');
    expect(ups[0]).toBeDisabled();
    expect(downs[1]).toBeDisabled();
  });

  it('swaps rows on move-down click', () => {
    render(
      <InlineEditableList
        initial={[
          { id: '1', label: 'A' },
          { id: '2', label: 'B' },
        ]}
        addLabel="+ Add"
        name="phases"
      />,
    );
    const downs = screen.getAllByLabelText('Move down');
    fireEvent.click(downs[0]!);
    const inputs = screen.getAllByPlaceholderText('Label') as HTMLInputElement[];
    expect(inputs[0]!.value).toBe('B');
    expect(inputs[1]!.value).toBe('A');
  });
});
