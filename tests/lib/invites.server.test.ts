import { describe, it, expect, vi, beforeEach } from 'vitest';

// We mock the Supabase admin client + Drizzle + Resend so we don't need a live DB.
// `vi.hoisted` ensures these refs exist before `vi.mock` factories run (they are
// auto-hoisted to the top of the file, above plain `const` declarations).
const { mockAdmin, mockSendEmail, mockDb } = vi.hoisted(() => {
  return {
    mockAdmin: {
      auth: {
        admin: {
          inviteUserByEmail: vi.fn(),
          deleteUser: vi.fn(),
          listUsers: vi.fn(),
        },
      },
    },
    mockSendEmail: vi.fn(),
    mockDb: {
      select: vi.fn(),
      insert: vi.fn(() => ({
        values: vi.fn(() => ({ onConflictDoNothing: vi.fn().mockResolvedValue([]) })),
      })),
      delete: vi.fn(() => ({ where: vi.fn().mockResolvedValue([]) })),
    },
  };
});

vi.mock('~/lib/supabase-admin.server', () => ({
  getSupabaseAdmin: () => mockAdmin,
}));
vi.mock('~/lib/email.server', () => ({ sendEmail: mockSendEmail }));
vi.mock('~/lib/db.server', () => ({ db: mockDb }));
vi.mock('~/lib/env.server', () => ({
  env: {
    APP_URL: 'http://localhost:5173',
    RESEND_FROM: 'noreply@example.com',
    SUPABASE_URL: '',
    SUPABASE_ANON_KEY: '',
    SUPABASE_SERVICE_ROLE_KEY: '',
    DATABASE_URL: '',
    DATABASE_POOL_URL: '',
    RESEND_API_KEY: '',
  },
}));

// Import AFTER mocks
import {
  inviteEmployerUser,
  revokeEmployerAccess,
  employerAccountStatus,
} from '~/lib/invites.server';

describe('inviteEmployerUser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls Supabase admin invite with employer_id metadata + redirectTo /auth/accept', async () => {
    mockAdmin.auth.admin.inviteUserByEmail.mockResolvedValue({
      data: { user: { id: 'user-uuid-1', email: 'test@example.com' } },
      error: null,
    });
    const mockSelect = {
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn().mockResolvedValue([{ id: 'emp-1', name: 'Test Employer' }]),
        })),
      })),
    };
    mockDb.select.mockReturnValue(mockSelect);
    mockSendEmail.mockResolvedValue(undefined);

    await inviteEmployerUser({ employerId: 'emp-1', email: 'test@example.com' });

    expect(mockAdmin.auth.admin.inviteUserByEmail).toHaveBeenCalledWith(
      'test@example.com',
      expect.objectContaining({
        redirectTo: 'http://localhost:5173/auth/callback?next=/auth/accept',
        data: { employer_id: 'emp-1', role: 'employer' },
      }),
    );
  });

  it('inserts a profiles row with role=employer + employerId after successful invite', async () => {
    mockAdmin.auth.admin.inviteUserByEmail.mockResolvedValue({
      data: { user: { id: 'user-uuid-2' } },
      error: null,
    });
    const mockSelect = {
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn().mockResolvedValue([{ id: 'emp-1', name: 'X' }]),
        })),
      })),
    };
    mockDb.select.mockReturnValue(mockSelect);

    await inviteEmployerUser({ employerId: 'emp-1', email: 'a@b.com' });

    expect(mockDb.insert).toHaveBeenCalled();
  });

  it('throws if the employer does not exist', async () => {
    const mockSelect = {
      from: vi.fn(() => ({
        where: vi.fn(() => ({ limit: vi.fn().mockResolvedValue([]) })),
      })),
    };
    mockDb.select.mockReturnValue(mockSelect);

    await expect(inviteEmployerUser({ employerId: 'missing', email: 'x@y.com' })).rejects.toThrow(
      /employer.*not found/i,
    );
  });

  it('throws if Supabase invite returns an error', async () => {
    const mockSelect = {
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn().mockResolvedValue([{ id: 'emp-1', name: 'X' }]),
        })),
      })),
    };
    mockDb.select.mockReturnValue(mockSelect);
    mockAdmin.auth.admin.inviteUserByEmail.mockResolvedValue({
      data: { user: null },
      error: { message: 'User already exists' },
    });

    await expect(inviteEmployerUser({ employerId: 'emp-1', email: 'taken@x.com' })).rejects.toThrow(
      /User already exists/,
    );
  });
});

describe('revokeEmployerAccess', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deletes every auth user whose profile.employer_id matches', async () => {
    const mockSelect = {
      from: vi.fn(() => ({
        where: vi.fn().mockResolvedValue([{ userId: 'user-uuid-3' }]),
      })),
    };
    mockDb.select.mockReturnValue(mockSelect);
    mockAdmin.auth.admin.deleteUser.mockResolvedValue({ error: null });

    await revokeEmployerAccess({ employerId: 'emp-1' });

    expect(mockAdmin.auth.admin.deleteUser).toHaveBeenCalledWith('user-uuid-3');
  });
});

describe('employerAccountStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns "none" when no profile row exists', async () => {
    const mockSelect = {
      from: vi.fn(() => ({
        where: vi.fn(() => ({ limit: vi.fn().mockResolvedValue([]) })),
      })),
    };
    mockDb.select.mockReturnValue(mockSelect);
    mockAdmin.auth.admin.listUsers.mockResolvedValue({ data: { users: [] }, error: null });

    expect(await employerAccountStatus('emp-1')).toBe('none');
  });

  it('returns "pending" when auth.users.email_confirmed_at is null', async () => {
    const mockSelect = {
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn().mockResolvedValue([{ userId: 'u1' }]),
        })),
      })),
    };
    mockDb.select.mockReturnValue(mockSelect);
    mockAdmin.auth.admin.listUsers.mockResolvedValue({
      data: { users: [{ id: 'u1', email_confirmed_at: null, invited_at: '2026-05-01T00:00:00Z' }] },
      error: null,
    });

    expect(await employerAccountStatus('emp-1')).toBe('pending');
  });

  it('returns "active" when auth.users.email_confirmed_at is set', async () => {
    const mockSelect = {
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn().mockResolvedValue([{ userId: 'u1' }]),
        })),
      })),
    };
    mockDb.select.mockReturnValue(mockSelect);
    mockAdmin.auth.admin.listUsers.mockResolvedValue({
      data: { users: [{ id: 'u1', email_confirmed_at: '2026-05-02T00:00:00Z' }] },
      error: null,
    });

    expect(await employerAccountStatus('emp-1')).toBe('active');
  });
});
