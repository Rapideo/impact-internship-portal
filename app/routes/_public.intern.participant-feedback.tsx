// Participant Feedback — one-shot intern self-assessment (mixed format:
// radio + likert + textarea + radio; QuestionRenderer handles all types).
// SP7 Phase D2 rebuild against Prototypes/PROTOTYPE/participant-feedback.html.
//
// Loader + action are PRESERVED VERBATIM — only the default-export render
// body is rebuilt to match the prototype shell.

import { redirect, useActionData, useLoaderData } from 'react-router';
import type { Route } from './+types/_public.intern.participant-feedback';
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

export const meta: Route.MetaFunction = () => [{ title: 'Participant Feedback — IMPACT 2026' }];

const FORM_NAV_LINKS = [
  { to: '/intern/assessments', label: 'Back to assessments', back: true },
] as const;

export async function loader({ request }: Route.LoaderArgs) {
  const identity = await getCurrentInternIdentity(request);
  if (!identity) throw redirect('/intern/assessments');

  const existing = await getOneShotSubmission(identity.internId, 'participant-feedback');
  if (existing) throw redirect('/intern/confirmation?type=participant-feedback');

  const set = await loadQuestionSet('participant-feedback');
  if (!set)
    throw new Response('Participant Feedback question set is unavailable.', { status: 500 });

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

  const set = await loadQuestionSet('participant-feedback');
  if (!set) {
    return {
      errors: {
        __form: 'Participant Feedback question set is unavailable.',
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
      type: 'participant-feedback',
      answers,
    });
  } catch (err) {
    if (err instanceof AssessmentAlreadySubmittedError) {
      throw redirect('/intern/confirmation?type=participant-feedback&already=1');
    }
    throw err;
  }
  throw redirect('/intern/confirmation?type=participant-feedback');
}

export default function ParticipantFeedbackPage() {
  const { identity, set } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const errors = (actionData?.errors ?? {}) as Record<string, string>;
  const setLevelError = errors.__minRequired ?? errors.__form ?? null;

  return (
    <>
      <PublicNav links={FORM_NAV_LINKS} />
      <PageHead
        breadcrumb="PARTICIPANT FEEDBACK / 2026 / ONE SUBMISSION"
        title={
          <>
            LOOK BACK ON
            <br />
            YOUR JOURNEY.
          </>
        }
        sub="A short reflection on your internship experience. One submission per intern, so take your time and answer honestly."
      />
      <section className="assessment-wrap">
        <div className="container">
          <AssessmentForm
            actionPath="/intern/participant-feedback"
            questions={set.questions}
            initialAnswers={{}}
            errors={errors}
            setLevelError={setLevelError}
            submitLabel="Submit Participant Feedback"
            modalTitle="Submit your Participant Feedback?"
            modalBody="Your responses will be locked once submitted. You won't be able to edit them afterward."
            readOnly={false}
            identityChip={{
              firstInitial: identity.firstInitial,
              lastName: identity.lastName,
              employerName: identity.employerName,
              cohortName: identity.cohortName,
            }}
            cancelHref="/intern/assessments"
            statusCaption="PARTICIPANT FEEDBACK · ONE SUBMISSION"
          />
        </div>
      </section>
    </>
  );
}
