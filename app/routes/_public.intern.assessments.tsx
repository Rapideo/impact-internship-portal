// Intern self-assessment chooser + identity gate — SP7 Phase D2 rebuild
// against Prototypes/PROTOTYPE/intern-assessments.html.
//
// Two render branches keyed off the identity cookie:
//   - No identity: <PublicNav> ("← Back to home") + <PageHead> ("CHOOSE
//     YOUR / ASSESSMENT.") + <IdentityCard> hosting a 3-field identity
//     gate (Employer / Cohort / Intern ID) inside an `.id-grid.id-grid--3`,
//     with a top-rule divider above the Confirm button. The cohort <select>
//     cascades client-side from the employer pick. POST with intent=confirm
//     checks the per-IP throttle, normalises the ID, reserves the attempt as
//     a failure (released on success — see identity-throttle.server.ts),
//     verifies the cohort belongs to the chosen employer, runs
//     lookupInternByCode, then signs the cookie and redirects with
//     Set-Cookie.
//   - Identity confirmed: <IdentityConfirmedChip> + Switch button (POSTs
//     to /intern/reset-identity) + a 3-card chooser using <AssessmentCard>
//     with prototype-verbatim copy. Each card shows "SUBMITTED ON …" if
//     a one-shot submission exists, otherwise the "Begin …" primary CTA.
//
// The loader + action are PRESERVED VERBATIM — only the default-export
// render body is rebuilt to match the prototype shell. The identity-gate
// action still verifies cohort-belongs-to-employer before signing the
// signed cookie (do not bypass — never trust raw form-supplied employerId).

import { useMemo, useState } from 'react';
import { Form, Link, redirect, useActionData, useLoaderData } from 'react-router';
import { and, asc, eq } from 'drizzle-orm';
import type { Route } from './+types/_public.intern.assessments';
import { db } from '~/lib/db.server';
import { env } from '~/lib/env.server';
import { cohorts as cohortsTable, employers as employersTable } from '../../db/schema';
import { lookupInternByCode } from '~/lib/identity.server';
import { normalizeInternCode } from '~/lib/intern-code';
import {
  clientIp,
  isThrottled,
  reserveAttempt,
  releaseAttempt,
  THROTTLE_MAX_FAILURES,
} from '~/lib/identity-throttle.server';
import { UUID_RE } from '~/lib/validation';
import {
  getCurrentInternIdentity,
  signInternIdentityCookie,
  serializeInternIdentityCookie,
} from '~/lib/intern-identity.server';
import { getOneShotSubmission, type SubmissionType } from '~/lib/assessment-submissions.server';
import { AssessmentCard } from '~/components/AssessmentCard';
import { IdentityCard } from '~/components/IdentityCard';
import { IdentityConfirmedChip } from '~/components/forms/IdentityConfirmedChip';
import { PageHead } from '~/components/PageHead';
import { PublicNav } from '~/components/nav/PublicNav';

export const meta: Route.MetaFunction = () => [{ title: 'Intern Assessments — IMPACT 2026' }];

interface EmployerOption {
  id: string;
  name: string;
}
interface CohortOption {
  id: string;
  name: string;
  employerId: string;
}
interface OneShotStatus {
  type: 'personal-goals' | 'midpoint-reflection' | 'participant-feedback';
  submittedAt: string | null;
}
interface IdentityDisplay {
  internId: string;
  internCode: string;
  cohortId: string;
  employerId: string;
  cohortName: string;
  employerName: string;
}

// Verbatim from intern-assessments.html — card copy + stage tags + CTAs.
const ONE_SHOT_CARDS: ReadonlyArray<{
  type: 'personal-goals' | 'midpoint-reflection' | 'participant-feedback';
  stage: string;
  meta: string;
  title: string;
  body: string;
  cta: string;
  href: string;
}> = [
  {
    type: 'personal-goals',
    stage: 'AT START',
    meta: 'PERSONAL GOALS',
    title: 'Set your starting line.',
    body: "Capture what you're hoping to learn, the skills you want to build, and how you'll know you're making progress. Submit this in your first weeks.",
    cta: 'Begin Personal Goals',
    href: '/intern/personal-goals',
  },
  {
    type: 'midpoint-reflection',
    stage: 'AT MIDPOINT',
    meta: 'MIDPOINT REFLECTION',
    title: 'Reflect on the journey.',
    body: "Look back at your goals, what's gone well, what's been hard, and where you want to focus for the second half. Submit this around the midpoint of your internship.",
    cta: 'Begin Midpoint Reflection',
    href: '/intern/midpoint-reflection',
  },
  {
    type: 'participant-feedback',
    stage: 'AT EXIT',
    meta: 'PARTICIPANT FEEDBACK',
    title: 'Look back on your journey.',
    body: "A short reflection on your experience — what went well, what was hard, and what you'd recommend. Submit this near the end of your internship.",
    cta: 'Begin Participant Feedback',
    href: '/intern/participant-feedback',
  },
];

// Chooser-page back-link in the prototype routes to the landing page,
// not back to assessments.
const CHOOSER_NAV_LINKS = [{ to: '/', label: 'Back to home', back: true }] as const;

export async function loader({ request }: Route.LoaderArgs) {
  const identity = await getCurrentInternIdentity(request);

  // Pull dropdown data (used by the un-gated form). Cheap enough to load
  // unconditionally — keeps the action's failure-rerender path simple.
  const [employerRows, cohortRows] = await Promise.all([
    db
      .select({ id: employersTable.id, name: employersTable.name })
      .from(employersTable)
      .orderBy(asc(employersTable.name)),
    db
      .select({
        id: cohortsTable.id,
        name: cohortsTable.name,
        employerId: cohortsTable.employerId,
      })
      .from(cohortsTable)
      .orderBy(asc(cohortsTable.name)),
  ]);

  const employerOptions: EmployerOption[] = employerRows;
  const cohortOptions: CohortOption[] = cohortRows;

  if (!identity) {
    return {
      identity: null as IdentityDisplay | null,
      employers: employerOptions,
      cohorts: cohortOptions,
      statuses: [] as OneShotStatus[],
    };
  }

  // Resolve the human-readable employer + cohort names for the chip.
  const cohortRow = cohortOptions.find((c) => c.id === identity.cohortId);
  const employerRow = employerOptions.find((e) => e.id === identity.employerId);
  const display: IdentityDisplay = {
    internId: identity.internId,
    internCode: identity.internCode,
    cohortId: identity.cohortId,
    employerId: identity.employerId,
    cohortName: cohortRow?.name ?? 'Unknown cohort',
    employerName: employerRow?.name ?? 'Unknown employer',
  };

  // Completion status for each one-shot type.
  const statuses: OneShotStatus[] = await Promise.all(
    ONE_SHOT_CARDS.map(async (card) => {
      const row = await getOneShotSubmission(identity.internId, card.type as SubmissionType);
      return {
        type: card.type,
        submittedAt: row?.submittedAt ? new Date(row.submittedAt).toISOString() : null,
      };
    }),
  );

  return {
    identity: display,
    employers: employerOptions,
    cohorts: cohortOptions,
    statuses,
  };
}

interface ActionError {
  error?: string;
  fields?: { internCode?: string; employerId?: string; cohortId?: string };
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const intent = String(formData.get('intent') ?? '');

  if (intent !== 'confirm') {
    return { error: 'Invalid request.' } satisfies ActionError;
  }

  const rawCode = String(formData.get('internCode') ?? '').trim();
  const employerId = String(formData.get('employerId') ?? '').trim();
  const cohortId = String(formData.get('cohortId') ?? '').trim();
  const fields: ActionError['fields'] = { internCode: rawCode, employerId, cohortId };
  const throttled = {
    error: 'Too many attempts. Wait 15 minutes and try again.',
    fields,
  } satisfies ActionError;

  // 1. Throttle pre-check (spec §7). Read-only and first, so a blocked IP learns
  // nothing else and never writes a row.
  const ip = clientIp(request);
  if (await isThrottled(ip)) return throttled;

  // 2. Shape. Not a failed attempt — it never reaches the database. The two ids
  // must be UUIDs before they hit a query (malformed → PG 22P02 → 500).
  const internCode = normalizeInternCode(rawCode);
  if (!internCode) {
    return {
      error: 'Enter your Intern ID in the form IMP-26-0417.',
      fields,
    } satisfies ActionError;
  }
  if (!employerId || !UUID_RE.test(employerId)) {
    return { error: 'Please select your employer.', fields } satisfies ActionError;
  }
  if (!cohortId || !UUID_RE.test(cohortId)) {
    return { error: 'Please select your cohort.', fields } satisfies ActionError;
  }

  // 3. Reserve this attempt as a failure BEFORE the lookups, and count with it
  // included. Concurrent requests from one IP each see their own row plus every
  // committed peer, so at most THROTTLE_MAX_FAILURES pass per window however
  // large the burst. Released below if the attempt succeeds.
  const attempt = await reserveAttempt(ip);
  if (attempt && attempt.n > THROTTLE_MAX_FAILURES) {
    await releaseAttempt(attempt.id); // refused, not a failure — keep the table bounded
    return throttled;
  }

  // 4. The cohort must exist AND belong to the selected employer. Blocks a
  // tampered form from baking a fraudulent employerId into the signed cookie.
  const cohortMatch = await db
    .select({ employerId: cohortsTable.employerId })
    .from(cohortsTable)
    .where(and(eq(cohortsTable.id, cohortId), eq(cohortsTable.employerId, employerId)))
    .limit(1);

  // 5. Lookup. ONE message for "unknown ID" and "right ID, wrong cohort" —
  // distinguishing them would tell a guesser when they have found a live ID.
  // On a miss the reserved row stays: it IS the failure record.
  const intern = cohortMatch.length > 0 ? await lookupInternByCode({ internCode, cohortId }) : null;
  if (!intern || !cohortMatch[0]) {
    return {
      error:
        "We couldn't find that Intern ID in the selected cohort. Check both, or ask your supervisor.",
      fields,
    } satisfies ActionError;
  }

  // 6. Success is not a failure — release the reservation, then sign.
  // employerId comes from the verified cohort row, never the form.
  if (attempt) await releaseAttempt(attempt.id);
  const signed = signInternIdentityCookie({
    internId: intern.id,
    internCode: intern.internCode,
    cohortId: intern.cohortId,
    employerId: cohortMatch[0].employerId,
  });
  const headers = new Headers();
  headers.append(
    'Set-Cookie',
    serializeInternIdentityCookie(signed, { isProd: env.APP_URL.startsWith('https://') }),
  );
  throw redirect('/intern/assessments', { headers });
}

function formatSubmittedDate(iso: string): string {
  // Matches IMPACT.formatCompletionDate() in the prototype: e.g. "Mar 14, 2026".
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function InternAssessmentsPage() {
  const { identity, employers, cohorts, statuses } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>() as ActionError | undefined;

  if (!identity) {
    return <IdentityGate employers={employers} cohorts={cohorts} actionData={actionData} />;
  }

  const statusByType = new Map(statuses.map((s) => [s.type, s.submittedAt] as const));

  return (
    <>
      <PublicNav links={CHOOSER_NAV_LINKS} />
      <PageHead
        breadcrumb="INTERN ASSESSMENTS / 2026"
        title={
          <>
            CHOOSE YOUR
            <br />
            ASSESSMENT.
          </>
        }
        sub="Confirm your identity to see which assessments you've completed and which are still ahead. You'll complete three reflections during the program — one at the start, one at the midpoint, and one at the end."
      />

      {/* Identity-confirmed chip + Switch — mirrors the prototype's
          `[data-section="identity-confirmed"]` strip. */}
      <section>
        <div className="container">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <IdentityConfirmedChip
              internCode={identity.internCode}
              employerName={identity.employerName}
              cohortName={identity.cohortName}
            />
            <Form method="post" action="/intern/reset-identity">
              <button type="submit" className="btn btn--outline btn--sm">
                Not you? Switch &rarr;
              </button>
            </Form>
          </div>
        </div>
      </section>

      {/* 3-card chooser grid + foot-note — mirrors prototype's
          `[data-section="cards"]` block. */}
      <section style={{ paddingTop: 24 }}>
        <div className="container">
          <div className="assessment-grid">
            {ONE_SHOT_CARDS.map((card) => {
              const submittedAt = statusByType.get(card.type) ?? null;
              return (
                <AssessmentCard
                  key={card.type}
                  stage={card.stage}
                  meta={card.meta}
                  title={card.title}
                  body={card.body}
                  done={Boolean(submittedAt)}
                  action={
                    submittedAt ? (
                      <span
                        className="kpi-card__delta"
                        style={{ color: 'var(--navy)' }}
                        data-testid={`submitted-pill-${card.type}`}
                      >
                        Submitted on {formatSubmittedDate(submittedAt)}
                      </span>
                    ) : (
                      <Link to={card.href} className="btn btn--primary">
                        {card.cta}
                        <span className="btn__arrow"> &rarr;</span>
                      </Link>
                    )
                  }
                />
              );
            })}
          </div>

          <p className="assessment-foot-note">
            Each assessment can only be submitted once. Completion is recorded for your cohort
            administrator.
          </p>
        </div>
      </section>
    </>
  );
}

function IdentityGate({
  employers,
  cohorts,
  actionData,
}: {
  employers: EmployerOption[];
  cohorts: CohortOption[];
  actionData: ActionError | undefined;
}) {
  const [employerId, setEmployerId] = useState<string>(actionData?.fields?.employerId ?? '');
  const filteredCohorts = useMemo(
    () => cohorts.filter((c) => c.employerId === employerId),
    [cohorts, employerId],
  );

  return (
    <>
      <PublicNav links={CHOOSER_NAV_LINKS} />
      <PageHead
        breadcrumb="INTERN ASSESSMENTS / 2026"
        title={
          <>
            CHOOSE YOUR
            <br />
            ASSESSMENT.
          </>
        }
        sub="Confirm your identity to see which assessments you've completed and which are still ahead. You'll complete three reflections during the program — one at the start, one at the midpoint, and one at the end."
      />

      <section>
        <div className="container">
          <IdentityCard
            title="Confirm Your Identity"
            subnote="UNIQUE KEY · EMPLOYER + COHORT + INTERN ID"
          >
            {actionData?.error ? (
              <div role="alert" className="form-banner form-banner--danger">
                {actionData.error}
              </div>
            ) : null}

            <Form method="post" data-testid="identity-gate-form">
              <input type="hidden" name="intent" value="confirm" />

              <div className="id-grid id-grid--3">
                <div className="field">
                  <label htmlFor="employerId">Employer</label>
                  <select
                    id="employerId"
                    name="employerId"
                    className="select"
                    required
                    value={employerId}
                    onChange={(e) => setEmployerId(e.target.value)}
                  >
                    <option value="">Select employer</option>
                    {employers.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="field">
                  <label htmlFor="cohortId">Cohort</label>
                  <select
                    id="cohortId"
                    name="cohortId"
                    className="select"
                    required
                    disabled={!employerId}
                    defaultValue={actionData?.fields?.cohortId ?? ''}
                  >
                    <option value="">
                      {employerId ? 'Select cohort' : 'Select employer first'}
                    </option>
                    {filteredCohorts.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="field">
                  <label htmlFor="internCode">Intern ID</label>
                  <input
                    id="internCode"
                    name="internCode"
                    className="input intern-code"
                    type="text"
                    required
                    placeholder="IMP-26-0417"
                    autoCapitalize="characters"
                    autoComplete="off"
                    spellCheck={false}
                    defaultValue={actionData?.fields?.internCode ?? ''}
                  />
                </div>
              </div>

              {/* Top-rule divider above the Confirm button — verbatim from
                  the prototype's identity-gate footer styling. */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  marginTop: 22,
                  paddingTop: 22,
                  borderTop: '1px solid var(--rule)',
                }}
              >
                <button type="submit" className="btn btn--primary">
                  Confirm
                  <span className="btn__arrow"> &rarr;</span>
                </button>
              </div>
            </Form>
          </IdentityCard>
        </div>
      </section>
    </>
  );
}
