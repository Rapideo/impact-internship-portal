// Midpoint Reflection — one-shot intern self-assessment.
// SP7 Phase D2 rebuild against Prototypes/PROTOTYPE/midpoint-reflection.html.
//
// Loader + action are PRESERVED VERBATIM — only the default-export render
// body is rebuilt to match the prototype shell. Identity chip + sticky
// action bar are mounted internally by <AssessmentForm>.

import { redirect, useActionData, useLoaderData } from 'react-router';
import type { Route } from './+types/_public.intern.midpoint-reflection';
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

export const meta: Route.MetaFunction = () => [{ title: 'Midpoint Reflection — IMPACT 2026' }];

const FORM_NAV_LINKS = [
  { to: '/intern/assessments', label: 'Back to assessments', back: true },
] as const;

export async function loader({ request }: Route.LoaderArgs) {
  const identity = await getCurrentInternIdentity(request);
  if (!identity) throw redirect('/intern/assessments');

  const existing = await getOneShotSubmission(identity.internId, 'midpoint-reflection');
  if (existing) throw redirect('/intern/confirmation?type=midpoint-reflection');

  const set = await loadQuestionSet('midpoint-reflection');
  if (!set) throw new Response('Midpoint Reflection question set is unavailable.', { status: 500 });

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

  const set = await loadQuestionSet('midpoint-reflection');
  if (!set) {
    return {
      errors: {
        __form: 'Midpoint Reflection question set is unavailable.',
      } as Record<string, string>,
    };
  }

  const v = validateAnswers(set.questions, answers, { minRequired: set.minRequired });
  if (!v.ok) {
    return { errors: v.errors };
  }

  try {
    await insertAnonymousSubmission({
      internId: identity.internId,
      type: 'midpoint-reflection',
      answers,
    });
  } catch (err) {
    if (err instanceof AssessmentAlreadySubmittedError) {
      throw redirect('/intern/confirmation?type=midpoint-reflection&already=1');
    }
    throw err;
  }
  throw redirect('/intern/confirmation?type=midpoint-reflection');
}

export default function MidpointReflectionPage() {
  const { identity, set } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const errors = (actionData?.errors ?? {}) as Record<string, string>;
  const setLevelError = errors.__minRequired ?? errors.__form ?? null;

  return (
    <>
      <PublicNav links={FORM_NAV_LINKS} />
      <PageHead
        breadcrumb="MIDPOINT REFLECTION / 2026 / ONE SUBMISSION"
        title={
          <>
            REFLECT ON
            <br />
            THE JOURNEY.
          </>
        }
        sub="Take a moment to reflect on your experience so far. This is an opportunity to recognize your progress, identify areas for growth, and adjust your goals moving forward."
      />
      <section className="assessment-wrap">
        <div className="container">
          <AssessmentForm
            actionPath="/intern/midpoint-reflection"
            questions={set.questions}
            initialAnswers={{}}
            errors={errors}
            setLevelError={setLevelError}
            submitLabel="Submit Midpoint Reflection"
            modalTitle="Submit your Midpoint Reflection?"
            modalBody="Your responses will be locked once submitted. You won't be able to edit them afterward."
            readOnly={false}
            identityChip={{
              firstInitial: identity.firstInitial,
              lastName: identity.lastName,
              employerName: identity.employerName,
              cohortName: identity.cohortName,
            }}
            cancelHref="/intern/assessments"
            statusCaption="MIDPOINT REFLECTION · ONE SUBMISSION"
          />
        </div>
      </section>
    </>
  );
}
