/**
 * Pure decision logic for restoring `public.profiles` rows across a
 * `db/seed.ts` TRUNCATE. Deliberately has ZERO imports of a database client
 * so it is unit-testable without Docker/Supabase/`supabase start`.
 *
 * Context: `db/seed.ts` TRUNCATEs `public.profiles` (it cascades from
 * `public.employers`). Before this module existed, the seed only ever
 * restored two hardcoded dev accounts (admin@example.com,
 * employer1@example.com) — every other profile row, including real program
 * staff and employer logins, was destroyed with no way to recover the role
 * assignment (Supabase Auth accounts survive, but with no profile row the
 * JWT carries no role claim and the app rejects the user).
 *
 * `seed.ts` now snapshots every profile row that exists BEFORE the
 * TRUNCATE, and this function decides which of those rows are safe to
 * re-insert afterwards.
 */

export type ProfileRole = 'admin' | 'employer';

export interface ProfileSnapshotRow {
  userId: string;
  role: ProfileRole;
  employerId: string | null;
  /** Optional, for readable warnings only — not used for any decision. */
  email?: string | null;
}

export interface ProfileRestoreRow {
  userId: string;
  role: ProfileRole;
  employerId: string | null;
}

export interface ProfileRestorePlan {
  restore: ProfileRestoreRow[];
  warnings: string[];
}

/**
 * Decide which snapshotted profile rows can be safely restored.
 *
 * - Normal case: both the user (`auth.users`) and, for employer-role rows,
 *   the employer still exist after reseeding → restore as-is.
 * - Employer gone: an employer-role profile whose `employer_id` no longer
 *   resolves (dangling id, or missing entirely) is SKIPPED rather than
 *   restored with a null/garbage `employer_id`. `public.profiles` has a
 *   check constraint requiring a non-null `employer_id` for role='employer'
 *   anyway, so nulling it isn't even a legal option — and restoring it
 *   pointing at a dead id would just fail the FK insert. A loud warning is
 *   emitted so this doesn't fail silently: the account is locked out until
 *   an admin manually re-creates its profile against the correct employer.
 * - User gone: a profile whose `user_id` no longer exists in `auth.users`
 *   would violate the `profiles.user_id` FK on insert → skip, warn.
 * - Empty snapshot: nothing to restore. Caller falls back to the two
 *   hardcoded dev accounts (fresh-database bootstrap case).
 */
export function planProfileRestore(
  snapshot: ProfileSnapshotRow[],
  validUserIds: Set<string>,
  validEmployerIds: Set<string>,
): ProfileRestorePlan {
  const restore: ProfileRestoreRow[] = [];
  const warnings: string[] = [];

  for (const row of snapshot) {
    const label = row.email ? `${row.email} (user_id=${row.userId})` : `user_id=${row.userId}`;

    if (!validUserIds.has(row.userId)) {
      warnings.push(
        `Skipping profile for ${label}: this auth.users account no longer exists, so its role ` +
          `("${row.role}") could not be restored. If this account should still exist, it must be ` +
          `recreated manually (e.g. via \`npm run admin:create\` or Settings -> Users).`,
      );
      continue;
    }

    if (row.role === 'employer' && !validEmployerIds.has(row.employerId ?? '')) {
      warnings.push(
        `CRITICAL: employer profile for ${label} pointed at employer_id=${row.employerId ?? 'NULL'}, ` +
          `which no longer exists after reseeding. An employer profile cannot be restored without a ` +
          `valid employer_id, so this row is being SKIPPED rather than silently nulled out. This ` +
          `account is now LOCKED OUT of the app ("Account configured incorrectly") until an admin ` +
          `manually re-creates its profile pointing at the correct employer via Settings -> Users.`,
      );
      continue;
    }

    restore.push({ userId: row.userId, role: row.role, employerId: row.employerId });
  }

  return { restore, warnings };
}
