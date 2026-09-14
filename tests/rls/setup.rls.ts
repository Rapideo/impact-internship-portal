// tests/rls/setup.rls.ts
//
// Hard locality guard for the `rls` Vitest project.
//
// RLS tests connect directly via `postgres(process.env.DATABASE_URL!)` and
// several of them run DELETEs against real tables as part of fixture
// cleanup. Historically nothing verified that DATABASE_URL actually pointed
// at a local database — a developer running `npm run test:rls` without
// `supabase start` first would silently connect straight to the shared
// impact-dev cloud database (`.env.local` holds impact-dev credentials).
// On 2026-09-11 that happened for real: an unscoped
// `DELETE FROM public.assessment_submissions` in
// tests/rls/reports-queries.test.ts ran against impact-dev and destroyed
// every assessment submission in it. The project is on Supabase's free
// tier with no backups, so that data is gone for good.
//
// This file is registered as a Vitest `setupFiles` entry for the `rls`
// project (see vitest.config.ts) so it runs and can throw BEFORE any RLS
// test file gets a chance to open a connection. It resolves DATABASE_URL
// exactly the way every RLS test file already does — `.env.local` first,
// then `.env`, with real `process.env` (e.g. CI's `supabase status`
// export, or a developer's own shell export) taking precedence over both,
// since dotenv's `config()` never overrides an already-set variable — and
// then checks the resolved host against a small allow-list of hosts that
// are genuinely local. This is deliberately an ALLOW-list, not a
// deny-list: we never try to pattern-match "looks like a cloud host"
// (e.g. checking for "supabase" in the string); we only ever proceed for
// hosts we positively know are local. There is no env-var escape hatch —
// this check cannot be bypassed by accident, only by deleting this file.
import { config } from 'dotenv';
config({ path: '.env.local' });
config();

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1', 'host.docker.internal']);

function normalizeHost(hostname: string): string {
  // `new URL(...).hostname` returns IPv6 literals wrapped in brackets
  // (e.g. "[::1]"); strip them so "::1" compares correctly against the
  // allow-list as specified.
  if (hostname.startsWith('[') && hostname.endsWith(']')) {
    return hostname.slice(1, -1);
  }
  return hostname;
}

type DbVar = 'DATABASE_URL' | 'DATABASE_POOL_URL' | 'DATABASE_SERVICE_URL';

function assertLocalDatabase(varName: DbVar): void {
  const raw = process.env[varName];

  if (!raw) {
    throw new Error(
      '[rls-locality-guard] DATABASE_URL is not set.\n\n' +
        'RLS tests (tests/rls/**) DELETE rows — some of them without a WHERE clause — as ' +
        'part of their fixture cleanup. Running them with no DATABASE_URL means there is ' +
        'nothing to verify the connection is local, which is exactly how a shared cloud ' +
        'database gets destroyed by accident.\n\n' +
        'Run `supabase start` first, then re-run `npm run test:rls`.',
    );
  }

  let hostname: string;
  try {
    hostname = new URL(raw).hostname;
  } catch {
    throw new Error(
      `[rls-locality-guard] ${varName} ("${raw}") could not be parsed as a URL, so its ` +
        'host cannot be verified as local.\n\n' +
        'RLS tests (tests/rls/**) DELETE rows — some of them without a WHERE clause — as ' +
        'part of their fixture cleanup. Refusing to connect anywhere whose host cannot be ' +
        'confirmed local, because doing so is exactly how a shared cloud database gets ' +
        'destroyed by accident.\n\n' +
        'Run `supabase start` first, then re-run `npm run test:rls`.',
    );
  }

  const host = normalizeHost(hostname);

  if (!LOCAL_HOSTS.has(host)) {
    throw new Error(
      `[rls-locality-guard] ${varName} points at host "${host}", which is not local ` +
        `(allowed hosts: ${[...LOCAL_HOSTS].join(', ')}).\n\n` +
        'RLS tests (tests/rls/**) DELETE rows — some of them without a WHERE clause — as ' +
        'part of their fixture cleanup. Running this suite against anything other than a ' +
        'local database WILL DESTROY REAL, UNRECOVERABLE DATA. This already happened once: ' +
        'on 2026-09-11, running `npm run test:rls` without `supabase start` connected ' +
        'straight to the shared impact-dev cloud database (free tier, no backups) and an ' +
        'unscoped DELETE wiped every assessment submission in it.\n\n' +
        'Run `supabase start` first — that points DATABASE_URL at a local Postgres instance ' +
        '— then re-run `npm run test:rls`.',
    );
  }
}

assertLocalDatabase('DATABASE_URL');
// The app's own Drizzle clients connect through the POOL url (`db`) and,
// when set, the SERVICE url (`dbService`) — and this project exercises them
// (tests/rls/assessment-submissions-helpers.test.ts). Any of these that is
// set must be local too; a raw-SQL guard on DATABASE_URL alone would let a
// helper test write to the cloud through the app's client.
for (const v of ['DATABASE_POOL_URL', 'DATABASE_SERVICE_URL'] as const) {
  if (process.env[v]) assertLocalDatabase(v);
}
