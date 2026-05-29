// tests/components/ProgressList.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProgressList } from '../../app/components/charts/ProgressList';

describe('ProgressList', () => {
  it('renders a labeled meter with a rounded percentage per row', () => {
    render(
      <ProgressList
        rows={[
          { label: 'Competency', completed: 30, total: 37 },
          { label: 'Personal Goals', completed: 0, total: 37 },
        ]}
      />,
    );
    expect(screen.getByText('Competency')).toBeInTheDocument();
    expect(screen.getByText('81%')).toBeInTheDocument(); // 30/37 = 81.0
    expect(screen.getByText('Personal Goals')).toBeInTheDocument();
    expect(screen.getByText('0%')).toBeInTheDocument();
  });

  it('renders an empty state with no rows', () => {
    render(<ProgressList rows={[]} />);
    expect(screen.getByText('No data yet.')).toBeInTheDocument();
  });
});
