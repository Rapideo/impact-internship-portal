// tests/components/SettingsRail.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { SettingsRail } from '../../app/components/SettingsRail';

function renderRail(active: React.ComponentProps<typeof SettingsRail>['active']) {
  const Stub = createRoutesStub([{ path: '/', Component: () => <SettingsRail active={active} /> }]);
  return render(<Stub initialEntries={['/']} />);
}

describe('SettingsRail', () => {
  it('renders a Users item linking to the users settings page', () => {
    renderRail('users');
    const link = screen.getByRole('link', { name: 'Users' });
    expect(link).toHaveAttribute('href', '/admin/settings/users');
  });

  it('marks Users active when active="users"', () => {
    renderRail('users');
    expect(screen.getByRole('link', { name: 'Users' }).className).toContain(
      'settings-rail__item--active',
    );
  });
});
