// Personal Goals — one-shot intern self-assessment.
// SP7 Phase D2 rebuild against Prototypes/PROTOTYPE/personal-goals.html.
//
// Loader + action are PRESERVED VERBATIM — only the default-export render
// body is rebuilt to match the prototype shell:
//   - <PublicNav> "← Back to assessments" (rendered here since the layout
//     no longer mounts nav per-route).
//   - <PageHead> with 2-line Archivo Black title "YOUR STARTING / LINE."
//     and the prototype micro-label "PERSONAL GOALS / 2026 / ONE SUBMISSION".
//   - <AssessmentForm> mounts the identity chip itself (via the new
//     `identityChip` prop wired in Phase C). No outer "SUBMITTING AS"
//     wrapper — the chip's own __label slot already says that.
//   - `sectionBreaks` injects "My Focus for This Internship" between Q4 and
//     Q5 (afterQuestionIndex=3, zero-based) — matches the prototype's
//     `<h3 class="assessment-section-head">` between `#questions-main` and
//     `#questions-focus`.
//   - The sticky `<ActionBar>` (mounted internally by <AssessmentForm>) gets
//     `statusCaption="PERSONAL GOALS · ONE SUBMISSION"` and a Cancel link
//     to `/intern/assessments` — matches the prototype's `.action-bar`.

import { redirect, useActionData, useLoaderData } from 'react-router';
import type { Route } from './+types/_public.intern.personal-goals';
import { asc, eq } from 'drizzle-orm';
import { db } from '~/lib/db.server';
import { cohorts as cohortsTable, employers as employersTable } from '../../db/schema';
import { getCurrentInternIdentity } from '~/lib/intern-identity.server';
import { loadQuestionSet } from '~/lib/question-engine.server';
import { validateAnswers } from '~/lib/question-engine';
import type { SerializedAnswers } from '~/lib/question-types';
import {
  AssessmentAlreadySubmittedError,
  getOneShotSubmission,
  insertAnonymousSubmission,
} from '~/lib/assessment-submissions.server';
import { AssessmentForm } from '~/components/forms/AssessmentForm';
import { PageHead } from '~/components/PageHead';
import { PublicNav } from '~/components/nav/PublicNav';

export const meta: Route.MetaFunction = () => [{ title: 'Personal Goals — IMPACT 2026' }];

const FORM_NAV_LINKS = [
  { to: '/intern/assessments', label: 'Back to assessments', back: true },
] as const;

export async function loader({ request }: Route.LoaderArgs) {
  const identity = await getCurrentInternIdentity(request);
  if (!identity) throw redirect('/intern/assessments');

  const existing = await getOneShotSubmission(identity.internId, 'personal-goals');
  if (existing) throw redirect('/intern/confirmation?type=personal-goals');

  const set = await loadQuestionSet('personal-goals');
  if (!set) throw new Response('Personal Goals question set is unavailable.', { status: 500 });

  // Resolve employer + cohort display names for the identity chip.
  const [cohortRow] = await db
    .select({ name: cohortsTable.name, employerId: cohortsTable.employerId })
    .from(cohortsTable)
    .where(eq(cohortsTable.id, identity.cohortId))
    .limit(1);
  let employerName = 'Unknown employer';
  if (cohortRow?.employerId) {
    const [empRow] = await db
      .select({ name: employersTable.name })
      .from(employersTable)
      .where(eq(employersTable.id, cohortRow.employerId))
      .orderBy(asc(employersTable.name))
      .limit(1);
    if (empRow?.name) employerName = empRow.name;
  }

  return {
    identity: {
      firstInitial: identity.firstInitial,
      lastName: identity.lastName,
      cohortName: cohortRow?.name ?? 'Unknown cohort',
      employerName,
    },
    set: {
      questions: set.questions,
      minRequired: set.minRequired,
    },
  };
}

export async function action({ request }: Route.ActionArgs) {
  const identity = await getCurrentInternIdentity(request);
  if (!identity) throw redirect('/intern/assessments');

  const formData = await request.formData();
  const raw = String(formData.get('answers') ?? '{}');
  let answers: SerializedAnswers;
  try {
    answers = JSON.parse(raw) as SerializedAnswers;
  } catch {
    return {
      errors: { __form: 'Invalid submission. Please try again.' } as Record<string, string>,
    };
  }

  const set = await loadQuestionSet('personal-goals');
  if (!set) {
    return {
      errors: { __form: 'Personal Goals question set is unavailable.' } as Record<string, string>,
    };
  }

  const v = validateAnswers(set.questions, answers, { minRequired: set.minRequired });
  if (!v.ok) {
    return { errors: v.errors };
  }

  try {
    await insertAnonymousSubmission({
      internId: identity.internId,
      type: 'personal-goals',
      answers,
    });
  } catch (err) {
    if (err instanceof AssessmentAlreadySubmittedError) {
      throw redirect('/intern/confirmation?type=personal-goals&already=1');
    }
    throw err;
  }
  throw redirect('/intern/confirmation?type=personal-goals');
}

export default function PersonalGoalsPage() {
  const { identity, set } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const errors = (actionData?.errors ?? {}) as Record<string, string>;
  const setLevelError = errors.__minRequired ?? errors.__form ?? null;

  return (
    <>
      <PublicNav links={FORM_NAV_LINKS} />
      <PageHead
        breadcrumb="PERSONAL GOALS / 2026 / ONE SUBMISSION"
        title={
          <>
            YOUR STARTING
            <br />
            LINE.
          </>
        }
        sub="This internship is an opportunity for you to build professional skills, explore your career interests, and take steps toward your future. Take a few minutes to reflect on what you want to get out of this experience."
      />
      <section className="assessment-wrap">
        <div className="container">
          <AssessmentForm
            actionPath="/intern/personal-goals"
            questions={set.questions}
            initialAnswers={{}}
            errors={errors}
            setLevelError={setLevelError}
            submitLabel="Submit Personal Goals"
            modalTitle="Submit your Personal Goals?"
            modalBody="Your responses will be locked once submitted. You won't be able to edit them afterward."
            readOnly={false}
            identityChip={{
              firstInitial: identity.firstInitial,
              lastName: identity.lastName,
              employerName: identity.employerName,
              cohortName: identity.cohortName,
            }}
            sectionBreaks={[{ afterQuestionIndex: 3, title: 'My Focus for This Internship' }]}
            cancelHref="/intern/assessments"
            statusCaption="PERSONAL GOALS · ONE SUBMISSION"
          />
        </div>
      </section>
    </>
  );
}
