// tests/components/RadialGauge.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RadialGauge } from '../../app/components/charts/RadialGauge';

describe('RadialGauge', () => {
  it('shows the rounded percentage and the n-of-m caption', () => {
    render(<RadialGauge value={27} total={37} label="90-Day" tone="success" />);
    expect(screen.getByText('73%')).toBeInTheDocument(); // 27/37 = 72.9 -> 73
    expect(screen.getByText('27 of 37')).toBeInTheDocument();
    expect(screen.getByText('90-Day')).toBeInTheDocument();
  });

  it('shows 0% when total is 0', () => {
    render(<RadialGauge value={0} total={0} label="180-Day" />);
    expect(screen.getByText('0%')).toBeInTheDocument();
    expect(screen.getByText('0 of 0')).toBeInTheDocument();
  });
});
