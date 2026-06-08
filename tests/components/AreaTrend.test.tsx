// tests/components/AreaTrend.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AreaTrend } from '../../app/components/charts/AreaTrend';

describe('AreaTrend', () => {
  it('renders an svg when there are >=2 non-zero points', () => {
    const { container } = render(
      <AreaTrend
        points={[
          { label: '2026-04-06', value: 2 },
          { label: '2026-04-13', value: 5 },
          { label: '2026-04-20', value: 4 },
        ]}
      />,
    );
    expect(container.querySelector('svg.areatrend')).toBeTruthy();
  });

  it('renders the empty state when fewer than 2 points or all zero', () => {
    render(<AreaTrend points={[]} />);
    expect(screen.getByText('No submissions in this period.')).toBeInTheDocument();
  });

  it('renders the empty state when every value is zero', () => {
    render(
      <AreaTrend
        points={[
          { label: 'a', value: 0 },
          { label: 'b', value: 0 },
        ]}
      />,
    );
    expect(screen.getByText('No submissions in this period.')).toBeInTheDocument();
  });
});
