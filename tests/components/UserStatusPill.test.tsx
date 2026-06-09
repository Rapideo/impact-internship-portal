// tests/components/UserStatusPill.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { UserStatusPill } from '../../app/components/UserStatusPill';

describe('UserStatusPill', () => {
  it('renders the human label for each status', () => {
    const { rerender } = render(<UserStatusPill status="active" />);
    expect(screen.getByText('Active')).toBeInTheDocument();
    rerender(<UserStatusPill status="invited" />);
    expect(screen.getByText('Invited')).toBeInTheDocument();
    rerender(<UserStatusPill status="deactivated" />);
    expect(screen.getByText('Deactivated')).toBeInTheDocument();
  });
});
