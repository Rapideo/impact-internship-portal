// tests/lib/users.server.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockAdmin, mockDb } = vi.hoisted(() => ({
  mockAdmin: {
    auth: {
      admin: {
        createUser: vi.fn(),
        inviteUserByEmail: vi.fn(),
        updateUserById: vi.fn(),
        deleteUser: vi.fn(),
        listUsers: vi.fn(),
      },
    },
  },
  mockDb: {
    insert: vi.fn(() => ({
      values: vi.fn(() => ({ onConflictDoNothing: vi.fn().mockResolvedValue([]) })),
    })),
    update: vi.fn(() => ({ set: vi.fn(() => ({ where: vi.fn().mockResolvedValue([]) })) })),
    delete: vi.fn(() => ({ where: vi.fn().mockResolvedValue([]) })),
  },
}));

vi.mock('~/lib/supabase-admin.server', () => ({ getSupabaseAdmin: () => mockAdmin }));
vi.mock('~/lib/db.server', () => ({ db: mockDb }));
vi.mock('~/lib/env.server', () => ({ env: { APP_URL: 'http://localhost:5173' } }));

import {
  createAccountWithPassword,
  inviteAccount,
  changeAccountRole,
  deactivateAccount,
  reactivateAccount,
} from '~/lib/users.server';

beforeEach(() => vi.clearAllMocks());

describe('createAccountWithPassword', () => {
  it('rejects an employer with no employer_id (no API call)', async () => {
    await expect(
      createAccountWithPassword({
        email: 'x@y.org',
        role: 'employer',
        employerId: null,
        password: 'pw123456',
      }),
    ).rejects.toThrow(/employer must be selected/i);
    expect(mockAdmin.auth.admin.createUser).not.toHaveBeenCalled();
  });

  it('creates a confirmed admin and inserts a profile', async () => {
    mockAdmin.auth.admin.createUser.mockResolvedValue({
      data: { user: { id: 'u9' } },
      error: null,
    });
    const res = await createAccountWithPassword({
      email: 'a@y.org',
      role: 'admin',
      employerId: null,
      password: 'pw123456',
    });
    expect(res).toEqual({ userId: 'u9' });
    expect(mockAdmin.auth.admin.createUser).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'a@y.org', password: 'pw123456', email_confirm: true }),
    );
    expect(mockDb.insert).toHaveBeenCalled();
  });

  it('surfaces a duplicate-email error from Supabase', async () => {
    mockAdmin.auth.admin.createUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'already been registered' },
    });
    await expect(
      createAccountWithPassword({
        email: 'dupe@y.org',
        role: 'admin',
        employerId: null,
        password: 'pw123456',
      }),
    ).rejects.toThrow(/already/i);
  });
});

describe('inviteAccount', () => {
  it('invites with role + employer_id metadata and inserts a profile', async () => {
    mockAdmin.auth.admin.inviteUserByEmail.mockResolvedValue({
      data: { user: { id: 'u7' } },
      error: null,
    });
    const res = await inviteAccount({ email: 'e@y.org', role: 'employer', employerId: 'emp-1' });
    expect(res).toEqual({ userId: 'u7' });
    expect(mockAdmin.auth.admin.inviteUserByEmail).toHaveBeenCalledWith(
      'e@y.org',
      expect.objectContaining({ data: { role: 'employer', employer_id: 'emp-1' } }),
    );
    expect(mockDb.insert).toHaveBeenCalled();
  });
});

describe('changeAccountRole', () => {
  it('clears employer_id when changing to admin', async () => {
    await changeAccountRole({ userId: 'u1', role: 'admin', employerId: 'emp-1' });
    const setArg = mockDb.update.mock.results[0]!.value.set.mock.calls[0][0];
    expect(setArg).toEqual({ role: 'admin', employerId: null });
  });
  it('keeps employer_id for employer and rejects a missing one', async () => {
    await expect(
      changeAccountRole({ userId: 'u1', role: 'employer', employerId: null }),
    ).rejects.toThrow(/employer must be selected/i);
  });
});

describe('deactivate / reactivate', () => {
  it('deactivate bans the user', async () => {
    mockAdmin.auth.admin.updateUserById.mockResolvedValue({ data: {}, error: null });
    await deactivateAccount({ userId: 'u1' });
    expect(mockAdmin.auth.admin.updateUserById).toHaveBeenCalledWith('u1', {
      ban_duration: '876000h',
    });
  });
  it('reactivate lifts the ban', async () => {
    mockAdmin.auth.admin.updateUserById.mockResolvedValue({ data: {}, error: null });
    await reactivateAccount({ userId: 'u1' });
    expect(mockAdmin.auth.admin.updateUserById).toHaveBeenCalledWith('u1', {
      ban_duration: 'none',
    });
  });
});
