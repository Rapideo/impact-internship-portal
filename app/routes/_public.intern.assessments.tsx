// Intern self-assessment chooser + identity gate.
//
// Two render branches keyed off the identity cookie:
//   - No identity: 4-field identity-gate form (first initial, last name,
//     employer, cohort). The cohort <select> cascades client-side from the
//     employer pick. POST with intent=confirm runs `lookupInternByIdentity`,
//     signs the cookie on match, redirects with Set-Cookie.
//   - Identity confirmed: <IdentityConfirmedChip> + Switch button + 3-card
//     grid of one-shot self-assessments. Cards that already have a submission
//     show a "Submitted on {date}" pill instead of the CTA.

import { useMemo, useState } from 'react';
import { Form, Link, redirect, useActionData, useLoaderData } from 'react-router';
import { and, asc, eq } from 'drizzle-orm';
import type { Route } from './+types/_public.intern.assessments';
import { db } from '~/lib/db.server';
import { env } from '~/lib/env.server';
import { cohorts as cohortsTable, employers as employersTable } from '../../db/schema';
import { lookupInternByIdentity } from '~/lib/identity.server';
import {
  getCurrentInternIdentity,
  signInternIdentityCookie,
  serializeInternIdentityCookie,
} from '~/lib/intern-identity.server';
import { getOneShotSubmission, type SubmissionType } from '~/lib/assessment-submissions.server';
import { IdentityConfirmedChip } from '~/components/forms/IdentityConfirmedChip';
import { PageHead } from '~/components/PageHead';

export const meta: Route.MetaFunction = () => [{ title: 'My Assessments — IMPACT' }];

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
  firstInitial: string;
  lastName: string;
  cohortId: string;
  employerId: string;
  cohortName: string;
  employerName: string;
}

const ONE_SHOT_CARDS: {
  type: 'personal-goals' | 'midpoint-reflection' | 'participant-feedback';
  title: string;
  micro: string;
  blurb: string;
  cta: string;
  href: string;
}[] = [
  {
    type: 'personal-goals',
    title: 'Personal Goals',
    micro: 'START OF PROGRAM',
    blurb: 'Set the goals you want to work toward during the internship.',
    cta: 'Start Personal Goals',
    href: '/intern/personal-goals',
  },
  {
    type: 'midpoint-reflection',
    title: 'Midpoint Reflection',
    micro: 'MIDPOINT CHECK-IN',
    blurb: 'Reflect on your progress so far and what you want to focus on next.',
    cta: 'Start Midpoint Reflection',
    href: '/intern/midpoint-reflection',
  },
  {
    type: 'participant-feedback',
    title: 'Participant Feedback',
    micro: 'END OF PROGRAM',
    blurb: 'Share your honest feedback about the internship program.',
    cta: 'Start Participant Feedback',
    href: '/intern/participant-feedback',
  },
];

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
    firstInitial: identity.firstInitial,
    lastName: identity.lastName,
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
  fields?: { firstInitial?: string; lastName?: string; employerId?: string; cohortId?: string };
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const intent = String(formData.get('intent') ?? '');

  if (intent !== 'confirm') {
    return { error: 'Invalid request.' } satisfies ActionError;
  }

  const firstInitial = String(formData.get('firstInitial') ?? '').trim();
  const lastName = String(formData.get('lastName') ?? '').trim();
  const employerId = String(formData.get('employerId') ?? '').trim();
  const cohortId = String(formData.get('cohortId') ?? '').trim();

  const fields: ActionError['fields'] = {
    firstInitial,
    lastName,
    employerId,
    cohortId,
  };

  if (!/^[A-Za-z]$/.test(firstInitial)) {
    return { error: 'Please enter a single-letter first initial.', fields } satisfies ActionError;
  }
  if (!lastName) {
    return { error: 'Please enter your last name.', fields } satisfies ActionError;
  }
  if (!employerId) {
    return { error: 'Please select your employer.', fields } satisfies ActionError;
  }
  if (!cohortId) {
    return { error: 'Please select your cohort.', fields } satisfies ActionError;
  }

  const intern = await lookupInternByIdentity({ firstInitial, lastName, cohortId });
  if (!intern) {
    return {
      error: 'No matching intern record. Check your details or contact your program administrator.',
      fields,
    } satisfies ActionError;
  }

  // Verify the cohort exists AND belongs to the selected employer. This blocks a
  // tampered form from baking a fraudulent employerId into the signed cookie.
  const cohortMatch = await db
    .select({ employerId: cohortsTable.employerId })
    .from(cohortsTable)
    .where(and(eq(cohortsTable.id, cohortId), eq(cohortsTable.employerId, employerId)))
    .limit(1);
  if (cohortMatch.length === 0 || !cohortMatch[0]) {
    return {
      error: 'No matching intern record. Check your details or contact your program administrator.',
      fields,
    } satisfies ActionError;
  }

  const signed = signInternIdentityCookie({
    internId: intern.id,
    firstInitial: intern.firstInitial,
    lastName: intern.lastName,
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
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getMonth() + 1)}.${pad(d.getDate())}.${d.getFullYear()}`;
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
      <PageHead
        breadcrumb="INTERN / ASSESSMENTS"
        title="MY ASSESSMENTS."
        sub="Complete each self-assessment when prompted by your program coordinator."
      />
      <section>
        <div className="container">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <IdentityConfirmedChip
              firstInitial={identity.firstInitial}
              lastName={identity.lastName}
              employerName={identity.employerName}
              cohortName={identity.cohortName}
            />
            <Form method="post" action="/intern/reset-identity">
              <button type="submit" className="btn btn--outline btn--sm">
                Switch
              </button>
            </Form>
          </div>

          <div className="quick-links" style={{ marginTop: 24 }}>
            {ONE_SHOT_CARDS.map((card) => {
              const submittedAt = statusByType.get(card.type) ?? null;
              return (
                <article
                  key={card.type}
                  className="kpi-card"
                  data-testid={`assessment-card-${card.type}`}
                >
                  <span className="kpi-card__label">{card.micro}</span>
                  <h2
                    style={{
                      fontFamily: "'Archivo Black', sans-serif",
                      fontSize: 22,
                      color: 'var(--navy)',
                      margin: '8px 0',
                    }}
                  >
                    {card.title}
                  </h2>
                  <p style={{ fontSize: 14, color: 'var(--ink)', margin: '0 0 16px' }}>
                    {card.blurb}
                  </p>
                  {submittedAt ? (
                    <span
                      className="kpi-card__delta"
                      style={{ color: 'var(--navy)' }}
                      data-testid={`submitted-pill-${card.type}`}
                    >
                      Submitted on {formatSubmittedDate(submittedAt)}
                    </span>
                  ) : (
                    <Link to={card.href} className="btn btn--primary btn--sm">
                      {card.cta}
                    </Link>
                  )}
                </article>
              );
            })}
          </div>
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
      <PageHead
        breadcrumb="INTERN / ASSESSMENTS"
        title="MY ASSESSMENTS."
        sub="Confirm your identity to begin a self-assessment."
      />
      <section>
        <div className="container" style={{ maxWidth: 560 }}>
          <article
            className="identity-card"
            style={{
              background: 'var(--white)',
              border: '1px solid var(--rule)',
              borderRadius: 10,
              padding: 24,
            }}
          >
            <h2
              style={{
                fontFamily: "'Archivo Black', sans-serif",
                fontSize: 20,
                color: 'var(--navy)',
                margin: '0 0 8px',
              }}
            >
              Confirm your identity
            </h2>
            <p style={{ fontSize: 14, color: 'var(--ink-soft)', margin: '0 0 16px' }}>
              We use this to match you to your cohort roster. We never store more than your first
              initial and last name.
            </p>

            {actionData?.error ? (
              <div className="form-banner form-banner--danger" role="alert">
                {actionData.error}
              </div>
            ) : null}

            <Form
              method="post"
              style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
              data-testid="identity-gate-form"
            >
              <input type="hidden" name="intent" value="confirm" />

              <div className="field">
                <label htmlFor="firstInitial">First initial</label>
                <input
                  id="firstInitial"
                  name="firstInitial"
                  className="input"
                  maxLength={1}
                  pattern="[A-Za-z]"
                  required
                  defaultValue={actionData?.fields?.firstInitial ?? ''}
                  autoComplete="off"
                />
              </div>

              <div className="field">
                <label htmlFor="lastName">Last name</label>
                <input
                  id="lastName"
                  name="lastName"
                  className="input"
                  required
                  defaultValue={actionData?.fields?.lastName ?? ''}
                  autoComplete="family-name"
                />
              </div>

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
                  <option value="">Select your employer…</option>
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
                    {employerId ? 'Select your cohort…' : 'Pick an employer first…'}
                  </option>
                  {filteredCohorts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginTop: 8 }}>
                <button type="submit" className="btn btn--primary">
                  Continue
                </button>
              </div>
            </Form>
          </article>
        </div>
      </section>
    </>
  );
}
