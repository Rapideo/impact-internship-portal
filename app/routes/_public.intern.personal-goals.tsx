// Personal Goals — one-shot intern self-assessment.
//
// Loader: requires confirmed identity; loads the `personal-goals` question
// set; redirects to confirmation if already submitted.
// Action: validates answers, inserts via the service-role client.

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
import { IdentityConfirmedChip } from '~/components/forms/IdentityConfirmedChip';
import { PageHead } from '~/components/PageHead';

export const meta: Route.MetaFunction = () => [{ title: 'Personal Goals — IMPACT' }];

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
      <PageHead
        breadcrumb="INTERN / PERSONAL GOALS"
        title="PERSONAL GOALS."
        sub="Set the goals you want to work toward during the internship."
      />
      <section>
        <div className="container">
          <div style={{ marginBottom: 16 }}>
            <span className="micro-label" style={{ marginRight: 8 }}>
              SUBMITTING AS
            </span>
            <IdentityConfirmedChip
              firstInitial={identity.firstInitial}
              lastName={identity.lastName}
              employerName={identity.employerName}
              cohortName={identity.cohortName}
            />
          </div>
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
          />
        </div>
      </section>
    </>
  );
}
