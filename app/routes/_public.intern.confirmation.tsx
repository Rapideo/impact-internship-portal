// Receipt page rendered after an intern submits a self-assessment.
//
// Type-keyed copy map mirrors the prototype's assessment-confirmation.html.
// If `?already=1` is present, swap the title for a softer "you've already
// submitted this assessment" message.
//
// The identity cookie is read for the receipt block (first initial / last name
// / employer / cohort + submitted date). For the exit-employer-survey path
// the identity cookie may be absent (admin submits on the intern's behalf);
// the receipt then falls back to a generic message.

import { Link, useLoaderData } from 'react-router';
import type { Route } from './+types/_public.intern.confirmation';
import { asc, eq } from 'drizzle-orm';
import { db } from '~/lib/db.server';
import { cohorts as cohortsTable, employers as employersTable } from '../../db/schema';
import { getCurrentInternIdentity } from '~/lib/intern-identity.server';
import { getOneShotSubmission, type SubmissionType } from '~/lib/assessment-submissions.server';
import { PageHead } from '~/components/PageHead';

const ALLOWED_TYPES = [
  'personal-goals',
  'midpoint-reflection',
  'participant-feedback',
  'exit-employer-survey',
] as const;
type AllowedType = (typeof ALLOWED_TYPES)[number];

const COPY: Record<AllowedType, { micro: string; title: string; body: string }> = {
  'personal-goals': {
    micro: 'PERSONAL GOALS',
    title: 'Thanks! Your goals are locked in.',
    body: 'Your program coordinator will review your goals before your midpoint check-in.',
  },
  'midpoint-reflection': {
    micro: 'MIDPOINT REFLECTION',
    title: 'Thanks for reflecting.',
    body: 'Your midpoint reflection has been received. Keep the momentum going.',
  },
  'participant-feedback': {
    micro: 'PARTICIPANT FEEDBACK',
    title: 'Thanks for your feedback.',
    body: 'Your honest feedback helps us improve the program for future cohorts.',
  },
  'exit-employer-survey': {
    micro: 'EXIT EMPLOYER SURVEY',
    title: 'Survey saved.',
    body: 'Thank you for taking the time to evaluate this internship.',
  },
};

export const meta: Route.MetaFunction = () => [{ title: 'Submission confirmed — IMPACT' }];

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const typeParam = url.searchParams.get('type') ?? '';
  if (!ALLOWED_TYPES.includes(typeParam as AllowedType)) {
    throw new Response('Unknown assessment type', { status: 404 });
  }
  const type = typeParam as AllowedType;
  const already = url.searchParams.get('already') === '1';

  const identity = await getCurrentInternIdentity(request);

  let submittedAt: string | null = null;
  let cohortName: string | null = null;
  let employerName: string | null = null;

  if (identity) {
    const row = await getOneShotSubmission(identity.internId, type as SubmissionType);
    if (row?.submittedAt) submittedAt = new Date(row.submittedAt).toISOString();

    const [cohortRow] = await db
      .select({ name: cohortsTable.name, employerId: cohortsTable.employerId })
      .from(cohortsTable)
      .where(eq(cohortsTable.id, identity.cohortId))
      .limit(1);
    cohortName = cohortRow?.name ?? null;

    if (cohortRow?.employerId) {
      const [empRow] = await db
        .select({ name: employersTable.name })
        .from(employersTable)
        .where(eq(employersTable.id, cohortRow.employerId))
        .orderBy(asc(employersTable.name))
        .limit(1);
      employerName = empRow?.name ?? null;
    }
  }

  return {
    type,
    already,
    identity: identity
      ? {
          firstInitial: identity.firstInitial,
          lastName: identity.lastName,
          employerName: employerName ?? 'Unknown employer',
          cohortName: cohortName ?? 'Unknown cohort',
        }
      : null,
    submittedAt,
  };
}

function formatSubmittedDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getMonth() + 1)}.${pad(d.getDate())}.${d.getFullYear()} · ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function InternConfirmationPage() {
  const { type, already, identity, submittedAt } = useLoaderData<typeof loader>();
  const copy = COPY[type];

  const title = already ? "You've already submitted this assessment." : copy.title;
  const body = already
    ? 'Your earlier responses are still on file. Reach out to your program coordinator if anything needs to change.'
    : copy.body;

  return (
    <>
      <PageHead breadcrumb={`INTERN / ${copy.micro} / CONFIRMATION`} title={title} sub={body} />
      <section>
        <div className="container" style={{ maxWidth: 720 }}>
          <article
            className="identity-card"
            style={{
              background: '#fff',
              border: '1px solid var(--rule)',
              borderRadius: 10,
              padding: 24,
              marginTop: 16,
            }}
          >
            <div className="micro-label" style={{ marginBottom: 12 }}>
              RECEIPT
            </div>
            <dl
              style={{
                display: 'grid',
                gridTemplateColumns: '160px 1fr',
                gap: '10px 16px',
                margin: 0,
              }}
            >
              <dt style={{ color: 'var(--muted)', fontSize: 13 }}>Assessment</dt>
              <dd style={{ margin: 0, fontWeight: 600, color: 'var(--navy-deep)' }}>
                {copy.micro
                  .split(' ')
                  .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
                  .join(' ')}
              </dd>

              {identity ? (
                <>
                  <dt style={{ color: 'var(--muted)', fontSize: 13 }}>Submitted by</dt>
                  <dd style={{ margin: 0 }}>
                    {identity.firstInitial}. {identity.lastName}
                  </dd>

                  <dt style={{ color: 'var(--muted)', fontSize: 13 }}>Employer</dt>
                  <dd style={{ margin: 0 }}>{identity.employerName}</dd>

                  <dt style={{ color: 'var(--muted)', fontSize: 13 }}>Cohort</dt>
                  <dd style={{ margin: 0 }}>{identity.cohortName}</dd>
                </>
              ) : null}

              <dt style={{ color: 'var(--muted)', fontSize: 13 }}>Submitted</dt>
              <dd style={{ margin: 0 }}>{formatSubmittedDate(submittedAt)}</dd>
            </dl>
          </article>

          <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
            <Link to="/intern/assessments" className="btn btn--primary">
              Back to My Assessments
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
