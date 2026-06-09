// tests/lib/users-helpers.test.ts
import { describe, it, expect } from 'vitest';
import {
  deriveAccountStatus,
  validateRoleEmployer,
  mergeAccounts,
  guardLockout,
  type AccountRow,
} from '../../app/lib/users.server';

const NOW = new Date('2026-06-08T00:00:00Z');

describe('deriveAccountStatus', () => {
  it('deactivated when banned_until is in the future', () => {
    expect(
      deriveAccountStatus(
        { banned_until: '2999-01-01T00:00:00Z', email_confirmed_at: '2026-01-01T00:00:00Z' },
        NOW,
      ),
    ).toBe('deactivated');
  });
  it('invited when email not confirmed', () => {
    expect(deriveAccountStatus({ banned_until: null, email_confirmed_at: null }, NOW)).toBe(
      'invited',
    );
  });
  it('active otherwise (and ignores a past ban)', () => {
    expect(
      deriveAccountStatus(
        { banned_until: '2000-01-01T00:00:00Z', email_confirmed_at: '2026-01-01T00:00:00Z' },
        NOW,
      ),
    ).toBe('active');
  });
});

describe('validateRoleEmployer', () => {
  it('requires an employer for employer accounts', () => {
    expect(validateRoleEmployer('employer', null)).toMatch(/employer must be selected/i);
  });
  it('forbids an employer on admin accounts', () => {
    expect(validateRoleEmployer('admin', 'emp-1')).toMatch(/cannot be tied/i);
  });
  it('accepts valid pairings', () => {
    expect(validateRoleEmployer('admin', null)).toBeNull();
    expect(validateRoleEmployer('employer', 'emp-1')).toBeNull();
  });
});

describe('mergeAccounts', () => {
  it('joins profile rows to auth users and derives status', () => {
    const rows = mergeAccounts(
      [
        { userId: 'u1', role: 'admin', employerId: null, employerName: null },
        { userId: 'u2', role: 'employer', employerId: 'e1', employerName: 'Riverbend' },
      ],
      [
        {
          id: 'u1',
          email: 'a@x.org',
          banned_until: null,
          email_confirmed_at: '2026-01-01T00:00:00Z',
        },
        { id: 'u2', email: 'b@x.org', banned_until: null, email_confirmed_at: null },
      ],
      NOW,
    );
    expect(rows).toEqual([
      {
        userId: 'u1',
        email: 'a@x.org',
        role: 'admin',
        employerId: null,
        employerName: null,
        status: 'active',
      },
      {
        userId: 'u2',
        email: 'b@x.org',
        role: 'employer',
        employerId: 'e1',
        employerName: 'Riverbend',
        status: 'invited',
      },
    ]);
  });
});

describe('guardLockout', () => {
  const accounts: AccountRow[] = [
    {
      userId: 'admin1',
      email: 'a1@x',
      role: 'admin',
      employerId: null,
      employerName: null,
      status: 'active',
    },
    {
      userId: 'admin2',
      email: 'a2@x',
      role: 'admin',
      employerId: null,
      employerName: null,
      status: 'active',
    },
    {
      userId: 'emp1',
      email: 'e1@x',
      role: 'employer',
      employerId: 'e1',
      employerName: 'R',
      status: 'active',
    },
  ];
  it('blocks deactivating your own account', () => {
    expect(
      guardLockout({
        accounts,
        actingUserId: 'admin1',
        targetUserId: 'admin1',
        action: 'deactivate',
      }),
    ).toMatch(/your own/i);
  });
  it('blocks demoting your own admin account', () => {
    expect(
      guardLockout({
        accounts,
        actingUserId: 'admin1',
        targetUserId: 'admin1',
        action: 'change-role',
        nextRole: 'employer',
      }),
    ).toMatch(/your own/i);
  });
  it('blocks removing the last active admin', () => {
    const oneAdmin = accounts.filter((a) => a.userId !== 'admin2');
    expect(
      guardLockout({
        accounts: oneAdmin,
        actingUserId: 'emp1',
        targetUserId: 'admin1',
        action: 'deactivate',
      }),
    ).toMatch(/last/i);
  });
  it('allows deactivating an employer', () => {
    expect(
      guardLockout({
        accounts,
        actingUserId: 'admin1',
        targetUserId: 'emp1',
        action: 'deactivate',
      }),
    ).toBeNull();
  });
  it('allows demoting one admin when another active admin remains', () => {
    expect(
      guardLockout({
        accounts,
        actingUserId: 'admin1',
        targetUserId: 'admin2',
        action: 'change-role',
        nextRole: 'employer',
      }),
    ).toBeNull();
  });
});
