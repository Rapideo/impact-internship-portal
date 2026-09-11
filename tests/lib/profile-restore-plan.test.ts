import { describe, expect, it } from 'vitest';
import { planProfileRestore, type ProfileSnapshotRow } from '../../db/profile-restore-plan';

const ADMIN_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const EMPLOYER_USER_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const GHOST_USER_ID = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
const GHOST_EMPLOYER_USER_ID = 'dddddddd-dddd-dddd-dddd-dddddddddddd';
const EMPLOYER_ID = '11111111-1111-1111-1111-111111111101';
const GHOST_EMPLOYER_ID = '99999999-9999-9999-9999-999999999999';

describe('planProfileRestore', () => {
  it('case 1: restores a profile whose user and employer both still exist', () => {
    const snapshot: ProfileSnapshotRow[] = [
      { userId: ADMIN_ID, role: 'admin', employerId: null },
      { userId: EMPLOYER_USER_ID, role: 'employer', employerId: EMPLOYER_ID },
    ];
    const validUserIds = new Set([ADMIN_ID, EMPLOYER_USER_ID]);
    const validEmployerIds = new Set([EMPLOYER_ID]);

    const result = planProfileRestore(snapshot, validUserIds, validEmployerIds);

    expect(result.restore).toEqual([
      { userId: ADMIN_ID, role: 'admin', employerId: null },
      { userId: EMPLOYER_USER_ID, role: 'employer', employerId: EMPLOYER_ID },
    ]);
    expect(result.warnings).toEqual([]);
  });

  it('case 2: does not silently null a dangling employer_id; skips the row and warns loudly', () => {
    const snapshot: ProfileSnapshotRow[] = [
      {
        userId: GHOST_EMPLOYER_USER_ID,
        role: 'employer',
        employerId: GHOST_EMPLOYER_ID,
        email: 'realco@example.com',
      },
    ];
    const validUserIds = new Set([GHOST_EMPLOYER_USER_ID]);
    const validEmployerIds = new Set([EMPLOYER_ID]); // GHOST_EMPLOYER_ID not present

    const result = planProfileRestore(snapshot, validUserIds, validEmployerIds);

    // Must NOT restore with a null employer_id substituted in.
    expect(result.restore).toEqual([]);
    expect(result.restore.some((r) => r.userId === GHOST_EMPLOYER_USER_ID)).toBe(false);

    expect(result.warnings).toHaveLength(1);
    const warning = result.warnings[0]!;
    // Must name the account and be unmistakably loud.
    expect(warning).toContain('realco@example.com');
    expect(warning).toMatch(/CRITICAL/i);
    expect(warning).toContain(GHOST_EMPLOYER_ID);
  });

  it('case 3: skips a profile whose user no longer exists in auth.users, and warns', () => {
    const snapshot: ProfileSnapshotRow[] = [
      { userId: GHOST_USER_ID, role: 'admin', employerId: null, email: 'departed@example.com' },
    ];
    const validUserIds = new Set<string>([]); // GHOST_USER_ID not present
    const validEmployerIds = new Set<string>([]);

    const result = planProfileRestore(snapshot, validUserIds, validEmployerIds);

    expect(result.restore).toEqual([]);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toContain('departed@example.com');
    expect(result.warnings[0]).toContain(GHOST_USER_ID);
  });

  it('case 4: an empty snapshot restores nothing and warns nothing (lets fallback run)', () => {
    const result = planProfileRestore([], new Set(), new Set());

    expect(result.restore).toEqual([]);
    expect(result.warnings).toEqual([]);
  });

  it('mixed batch: keeps good rows, drops bad rows, and warns only for the bad ones', () => {
    const snapshot: ProfileSnapshotRow[] = [
      { userId: ADMIN_ID, role: 'admin', employerId: null },
      { userId: EMPLOYER_USER_ID, role: 'employer', employerId: EMPLOYER_ID },
      { userId: GHOST_EMPLOYER_USER_ID, role: 'employer', employerId: GHOST_EMPLOYER_ID },
      { userId: GHOST_USER_ID, role: 'admin', employerId: null },
    ];
    const validUserIds = new Set([ADMIN_ID, EMPLOYER_USER_ID, GHOST_EMPLOYER_USER_ID]);
    const validEmployerIds = new Set([EMPLOYER_ID]);

    const result = planProfileRestore(snapshot, validUserIds, validEmployerIds);

    expect(result.restore).toEqual([
      { userId: ADMIN_ID, role: 'admin', employerId: null },
      { userId: EMPLOYER_USER_ID, role: 'employer', employerId: EMPLOYER_ID },
    ]);
    expect(result.warnings).toHaveLength(2);
  });

  it('treats a null employer_id on an employer-role row the same as a dangling one', () => {
    const snapshot: ProfileSnapshotRow[] = [
      { userId: EMPLOYER_USER_ID, role: 'employer', employerId: null },
    ];
    const validUserIds = new Set([EMPLOYER_USER_ID]);
    const validEmployerIds = new Set([EMPLOYER_ID]);

    const result = planProfileRestore(snapshot, validUserIds, validEmployerIds);

    expect(result.restore).toEqual([]);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toMatch(/CRITICAL/i);
  });
});
