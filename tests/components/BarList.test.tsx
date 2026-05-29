// tests/components/BarList.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BarList } from '../../app/components/charts/BarList';

describe('BarList', () => {
  it('renders one row per data point with its value', () => {
    render(
      <BarList
        rows={[
          { label: 'Riverbend', value: 12 },
          { label: 'Northside', value: 9 },
        ]}
      />,
    );
    expect(screen.getByText('Riverbend')).toBeInTheDocument();
    expect(screen.getByText('Northside')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('9')).toBeInTheDocument();
  });

  it('renders the empty label when there are no rows', () => {
    render(<BarList rows={[]} emptyLabel="No interns yet." />);
    expect(screen.getByText('No interns yet.')).toBeInTheDocument();
  });
});
