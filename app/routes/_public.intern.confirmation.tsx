// Receipt page rendered after an intern submits a self-assessment.
// SP7 Phase D2 rebuild against Prototypes/PROTOTYPE/assessment-confirmation.html.
//
// Per-type copy comes from the verbatim `copy` map in the prototype's JS
// (`micro`/`title`/`body` keyed off `?type=`). The loader extends to return
// the resolved copy strings so the default-export render body stays
// declarative. Identity revalidation behavior is PRESERVED VERBATIM.
//
// If `?already=1` is present, swap the title for a softer "you've already
// submitted this assessment" message (existing SP4 UX defense, not in the
// prototype but kept as a fallback). The micro-label + body still come
// from the type-specific copy map.
//
// The identity cookie is read for the receipt block (first initial / last
// name / employer / cohort + submitted date). For the exit-employer-survey
// path the identity cookie may be absent (admin submits on the intern's
// behalf); the receipt then falls back to dashes (matches prototype).

import { Link, useLoaderData } from 'react-router';
import type { Route } from './+types/_public.intern.confirmation';
import { asc, eq } from 'drizzle-orm';
import { db } from '~/lib/db.server';
import { cohorts as cohortsTable, employers as employersTable } from '../../db/schema';
import { getCurrentInternIdentity } from '~/lib/intern-identity.server';
import { getOneShotSubmission, type SubmissionType } from '~/lib/assessment-submissions.server';
import { ConfirmReceipt } from '~/components/ConfirmReceipt';
import type { MetaItem } from '~/components/MetaStrip';
import { PublicNav } from '~/components/nav/PublicNav';

const ALLOWED_TYPES = [
  'personal-goals',
  'midpoint-reflection',
  'participant-feedback',
  'exit-employer-survey',
] as const;
type AllowedType = (typeof ALLOWED_TYPES)[number];

// Verbatim from assessment-confirmation.html — every string copied exactly.
const COPY: Record<AllowedType, { micro: string; title: string; body: string }> = {
  'personal-goals': {
    micro: 'PERSONAL GOALS / 2026 / SUBMITTED',
    title: 'Personal Goals submitted.',
    body: 'Thanks for sharing your goals. Your cohort administrator can now see your starting reflection.',
  },
  'midpoint-reflection': {
    micro: 'MIDPOINT REFLECTION / 2026 / SUBMITTED',
    title: 'Midpoint Reflection submitted.',
    body: 'Thanks for the thoughtful reflection. Your cohort administrator can now see your mid-program update.',
  },
  'participant-feedback': {
    micro: 'PARTICIPANT FEEDBACK / 2026 / SUBMITTED',
    title: 'Participant Feedback submitted.',
    body: 'Thanks for sharing your reflection. Your cohort administrator can now see your end-of-program feedback.',
  },
  'exit-employer-survey': {
    micro: 'EXIT EMPLOYER SURVEY / 2026 / SAVED',
    title: 'Exit Employer Survey saved.',
    body: "The survey has been saved against this intern's record. You can return to edit it from the Evaluations panel.",
  },
};

const CONFIRM_NAV_LINKS = [{ to: '/', label: 'Back to home', back: true }] as const;

export const meta: Route.MetaFunction = () => [{ title: 'Thank You — IMPACT' }];

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

  // Per-type copy resolved here so the default export stays declarative.
  const copy = COPY[type];

  return {
    type,
    already,
    copy,
    identity: identity
      ? {
          firstInitial: identity.firstInitial,
          lastName: identity.lastName,
          employerName: employerName ?? '—',
          cohortName: cohortName ?? '—',
        }
      : null,
    submittedAt,
  };
}

function formatSubmittedDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  // Matches IMPACT.formatCompletionDate() in the prototype: e.g. "Mar 14, 2026".
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// Derive a stable IMP-SA-2026-### receipt id from the submission timestamp.
// Verisimilitude only — not a real lookup key. Mirrors the prototype's
// hardcoded "IMP-SA-2026-048" string but varies per submission so the page
// doesn't feel like a static mock.
function deriveReceiptId(iso: string | null): string {
  if (!iso) return 'IMP-SA-2026-000';
  const ms = new Date(iso).getTime();
  // Use the last 3 digits of the seconds-since-epoch as a pseudo-id.
  const tail = Math.abs(Math.floor(ms / 1000)) % 1000;
  return `IMP-SA-2026-${String(tail).padStart(3, '0')}`;
}

export default function InternConfirmationPage() {
  const { type, already, copy, identity, submittedAt } = useLoaderData<typeof loader>();

  // `already=1` softens the title/body (defensive race-catch path); the
  // micro-label still reflects the type so the receipt strip looks normal.
  const title = already ? "You've already submitted this assessment." : copy.title;
  const body = already
    ? 'Your earlier responses are still on file. Reach out to your program coordinator if anything needs to change.'
    : copy.body;

  const receiptItems: MetaItem[] = [
    {
      label: 'First Initial',
      value: identity?.firstInitial ?? '—',
      mono: true,
    },
    { label: 'Last Name', value: identity?.lastName ?? '—' },
    { label: 'Employer', value: identity?.employerName ?? '—' },
    { label: 'Cohort', value: identity?.cohortName ?? '—' },
    {
      label: 'Submitted',
      value: formatSubmittedDate(submittedAt),
      mono: true,
    },
  ];

  // Back link target: the 3 intern-self-assessment types go back to the
  // chooser; the exit-employer-survey type was submitted by an admin so
  // back-to-assessments would be a dead-end — point them to home instead.
  const backHref = type === 'exit-employer-survey' ? '/' : '/intern/assessments';
  const backLabel = type === 'exit-employer-survey' ? 'Return home' : 'Back to assessments';

  return (
    <>
      <PublicNav links={CONFIRM_NAV_LINKS} />
      <ConfirmReceipt
        variant="success"
        microLabel={copy.micro}
        title={title}
        body={body}
        receiptId={deriveReceiptId(submittedAt)}
        receiptItems={receiptItems}
        note="You will not be able to resubmit this assessment. If you need to correct something, please contact your program administrator."
        actions={
          <Link to={backHref} className="btn btn--primary">
            {backLabel} <span className="btn__arrow">&rarr;</span>
          </Link>
        }
      />
    </>
  );
}
