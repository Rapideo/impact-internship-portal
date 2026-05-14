import {
  data,
  Form,
  Link,
  redirect,
  useActionData,
  useLoaderData,
  useNavigation,
  useSearchParams,
} from 'react-router';
import { useEffect, useState } from 'react';
import type { Route } from './+types/admin.interns.$internId';
import { requireAdmin } from '~/lib/admin-guard.server';
import { db } from '~/lib/db.server';
import {
  getInternOrNull,
  getInternEntry,
  getInternEntryBarrierIds,
  getInternEmploymentOutcomes,
  getCohortOrNull,
  getEmployerOrNull,
  getRoleOrNull,
  listBarriers,
} from '~/lib/admin-queries.server';
import {
  interns,
  internEntryAssessment,
  internEntryBarriers,
  internEmploymentOutcomes,
  assessmentSubmissions,
} from '../../db/schema';
import { and, eq, isNull, desc } from 'drizzle-orm';
import { parseFormFields, optionalString, errorsByField } from '~/lib/validation';
import { PageHead } from '~/components/PageHead';
import { MetaStrip } from '~/components/MetaStrip';
import { RubricPanel } from '~/components/RubricPanel';
import { ActionBar } from '~/components/ActionBar';
import { ConfirmModal } from '~/components/ConfirmModal';
import { BarrierCheckList } from '~/components/BarrierCheckList';
import { useToast } from '~/components/ToastProvider';
import { formatDate } from '~/lib/format';

export const meta: Route.MetaFunction = () => [{ title: 'Edit Intern — IMPACT Admin' }];

export async function loader({ request, params }: Route.LoaderArgs) {
  const { headers } = await requireAdmin(request);
  const internId = params.internId!;
  const intern = await getInternOrNull(db, internId);
  if (!intern) throw new Response('Not Found', { status: 404 });
  const [cohort, entry, entryBarrierIds, outcomes, allBarriers] = await Promise.all([
    getCohortOrNull(db, intern.cohortId),
    getInternEntry(db, internId),
    getInternEntryBarrierIds(db, internId),
    getInternEmploymentOutcomes(db, internId),
    listBarriers(db),
  ]);
  const employer = cohort ? await getEmployerOrNull(db, cohort.employerId) : null;
  const role = intern.roleId ? await getRoleOrNull(db, intern.roleId) : null;

  // Per-intern submissions for panels 04 (self-assessments) + 05 (evaluations).
  const submissions = await db
    .select({
      id: assessmentSubmissions.id,
      type: assessmentSubmissions.type,
      phase: assessmentSubmissions.phase,
      submittedAt: assessmentSubmissions.submittedAt,
    })
    .from(assessmentSubmissions)
    .where(
      and(eq(assessmentSubmissions.internId, internId), isNull(assessmentSubmissions.deletedAt)),
    )
    .orderBy(desc(assessmentSubmissions.submittedAt));

  return data(
    { intern, cohort, employer, role, entry, entryBarrierIds, outcomes, allBarriers, submissions },
    { headers },
  );
}

export async function action({ request, params }: Route.ActionArgs) {
  const { headers } = await requireAdmin(request);
  const internId = params.internId!;
  const formData = await request.formData();
  const intent = String(formData.get('_intent') ?? 'save');

  if (intent === 'delete') {
    await db.update(interns).set({ deletedAt: new Date() }).where(eq(interns.id, internId));
    throw redirect('/admin/interns?deleted=1', { headers });
  }

  const { values, errors } = parseFormFields(formData, {
    entryNotes: optionalString('Notes'),
    employed90Notes: optionalString('90-Day Notes'),
    employed180Notes: optionalString('180-Day Notes'),
  });
  const barrierIds = formData
    .getAll('barrierIds')
    .map((v) => String(v))
    .filter(Boolean);
  const employed90 = formData.get('employed90') === 'on';
  const employed180 = formData.get('employed180') === 'on';

  if (errors.length > 0) {
    return data({ errors }, { headers, status: 400 });
  }

  await db.transaction(async (tx) => {
    // Upsert entry assessment notes.
    await tx
      .insert(internEntryAssessment)
      .values({ internId, notes: values.entryNotes })
      .onConflictDoUpdate({
        target: internEntryAssessment.internId,
        set: { notes: values.entryNotes, updatedAt: new Date() },
      });

    // Replace entry barriers.
    await tx.delete(internEntryBarriers).where(eq(internEntryBarriers.internId, internId));
    if (barrierIds.length > 0) {
      await tx
        .insert(internEntryBarriers)
        .values(barrierIds.map((bid) => ({ internId, barrierId: bid })));
    }

    // Upsert employment outcomes.
    await tx
      .insert(internEmploymentOutcomes)
      .values({
        internId,
        employed90Day: employed90,
        employed90Notes: values.employed90Notes,
        employed180Day: employed180,
        employed180Notes: values.employed180Notes,
      })
      .onConflictDoUpdate({
        target: internEmploymentOutcomes.internId,
        set: {
          employed90Day: employed90,
          employed90Notes: values.employed90Notes,
          employed180Day: employed180,
          employed180Notes: values.employed180Notes,
          updatedAt: new Date(),
        },
      });
  });

  return data(
    { ok: true as const, errors: [] as Array<{ field: string; message: string }> },
    { headers },
  );
}

function selfCard(
  type: 'personal-goals' | 'midpoint-reflection' | 'participant-feedback',
  submission: { submittedAt: Date | string } | undefined,
  internId: string,
) {
  const label =
    type === 'personal-goals'
      ? 'PERSONAL GOALS'
      : type === 'midpoint-reflection'
        ? 'MID-POINT GOALS'
        : 'PARTICIPANT FEEDBACK';
  const title =
    type === 'personal-goals'
      ? 'Personal Goals'
      : type === 'midpoint-reflection'
        ? 'Mid-Point Goals'
        : 'Participant Feedback Form';
  if (!submission) {
    return (
      <div className="record-link record-link--placeholder" key={type}>
        <div className="record-link__head">
          <span className="record-link__label">{label}</span>
          <span className="record-link__title">{title}</span>
        </div>
        <span className="record-link__status">Not yet submitted</span>
      </div>
    );
  }
  const d =
    typeof submission.submittedAt === 'string'
      ? new Date(submission.submittedAt)
      : submission.submittedAt;
  return (
    <a
      className="record-link"
      href={`/admin/self-assessment-detail?type=${type}&internId=${internId}`}
      key={type}
    >
      <div className="record-link__head">
        <span className="record-link__label">{label}</span>
        <span className="record-link__title">{title}</span>
      </div>
      <span className="record-link__status">Submitted on {d.toLocaleDateString()} · View →</span>
    </a>
  );
}

export default function EditIntern() {
  const {
    intern,
    cohort,
    employer,
    role,
    entry,
    entryBarrierIds,
    outcomes,
    allBarriers,
    submissions,
  } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const nav = useNavigation();
  const errs = errorsByField(actionData?.errors ?? []);
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [deleteOpen, setDeleteOpen] = useState(false);

  useEffect(() => {
    if (searchParams.get('created') === '1') {
      toast.show({ kind: 'success', label: 'SAVED', message: 'Intern record created.' });
      searchParams.delete('created');
      setSearchParams(searchParams, { replace: true });
    }
    if (actionData && 'ok' in actionData && actionData.ok) {
      toast.show({ kind: 'success', label: 'UPDATED', message: 'Intern record updated.' });
    }
    if (actionData && 'errors' in actionData && actionData.errors.length > 0) {
      toast.show({
        kind: 'danger',
        label: 'CHECK FIELDS',
        message: 'Please fix the highlighted fields.',
      });
    }
  }, [actionData, searchParams, setSearchParams, toast]);
  void errs;

  const competencySubmissions = submissions.filter((s) => s.type === 'competency');
  const personalGoals = submissions.find((s) => s.type === 'personal-goals');
  const midpoint = submissions.find((s) => s.type === 'midpoint-reflection');
  const participant = submissions.find((s) => s.type === 'participant-feedback');
  const exit = submissions.find((s) => s.type === 'exit-employer-survey');

  return (
    <>
      <PageHead
        breadcrumb={
          <>
            <Link to="/admin/interns" style={{ color: 'inherit', textDecoration: 'none' }}>
              ADMIN / INTERNS
            </Link>{' '}
            / EDIT
          </>
        }
        title="EDIT INTERN."
        sub="Identity and internship assignment are locked. Entry assessment and employment outcomes stay editable."
      >
        <MetaStrip
          items={[
            { label: 'First Initial', value: intern.firstInitial, mono: true },
            { label: 'Last Name', value: intern.lastName },
            { label: 'Employer', value: employer?.name ?? '—' },
            { label: 'Cohort', value: cohort?.name ?? '—' },
            { label: 'Role', value: role?.label ?? '—' },
            { label: 'Start', value: formatDate(intern.startDate), mono: true },
            { label: 'End', value: formatDate(intern.endDate), mono: true },
          ]}
        />
      </PageHead>

      <section className="assessment-wrap">
        <div className="container">
          <Form method="post">
            <div className="rubric">
              <RubricPanel
                num="03"
                title="Entry Assessment"
                meta="Barriers to entry identified at intake. Notes feed support planning."
              >
                <BarrierCheckList barriers={allBarriers} checkedIds={entryBarrierIds} />
                <div
                  className="rubric-notes"
                  style={{ padding: '22px 28px', borderTop: '1px solid var(--rule)' }}
                >
                  <label className="rubric-notes__label" htmlFor="barrier-notes">
                    Notes
                  </label>
                  <textarea
                    className="textarea"
                    id="barrier-notes"
                    name="entryNotes"
                    rows={3}
                    placeholder="Additional context, supports, or follow-up needed…"
                    defaultValue={entry?.notes ?? ''}
                  />
                </div>
              </RubricPanel>

              <RubricPanel
                num="04"
                title="Intern Self-Assessments"
                meta="Submissions made by the intern through the public portal."
              >
                <div className="record-link-grid" style={{ padding: '22px 28px' }}>
                  {selfCard('personal-goals', personalGoals, intern.id)}
                  {selfCard('midpoint-reflection', midpoint, intern.id)}
                  {selfCard('participant-feedback', participant, intern.id)}
                </div>
              </RubricPanel>

              <RubricPanel
                num="05"
                title="Evaluations"
                meta="Competency assessments and exit surveys for this intern."
              >
                <div className="record-link-grid" style={{ padding: '22px 28px' }}>
                  {competencySubmissions.length === 0 ? (
                    <div className="record-link record-link--placeholder">
                      <div className="record-link__head">
                        <span className="record-link__label">COMPETENCY</span>
                        <span className="record-link__title">Competency Assessments</span>
                      </div>
                      <span className="record-link__status">No competency assessments yet</span>
                    </div>
                  ) : (
                    competencySubmissions.map((c) => (
                      <a
                        className="record-link"
                        href={`/admin/assessments/competency/${c.id}`}
                        key={c.id}
                      >
                        <div className="record-link__head">
                          <span className="record-link__label">
                            COMPETENCY · {(c.phase ?? '').toUpperCase()}
                          </span>
                          <span className="record-link__title">Competency Detail</span>
                        </div>
                        <span className="record-link__status">
                          {new Date(c.submittedAt as never).toLocaleDateString()}
                        </span>
                      </a>
                    ))
                  )}
                  {exit ? (
                    <a
                      className="record-link"
                      href={`/admin/assessments/exit-employer-survey?internId=${intern.id}`}
                    >
                      <div className="record-link__head">
                        <span className="record-link__label">EXIT SURVEY</span>
                        <span className="record-link__title">Exit Employer Survey</span>
                      </div>
                      <span className="record-link__status">
                        Submitted on {new Date(exit.submittedAt as never).toLocaleDateString()} ·
                        Edit
                      </span>
                    </a>
                  ) : (
                    <a
                      className="record-link"
                      href={`/admin/assessments/exit-employer-survey?internId=${intern.id}`}
                    >
                      <div className="record-link__head">
                        <span className="record-link__label">EXIT SURVEY</span>
                        <span className="record-link__title">Exit Employer Survey</span>
                      </div>
                      <span className="record-link__status">Not yet submitted</span>
                    </a>
                  )}
                </div>
              </RubricPanel>

              <RubricPanel
                num="06"
                title="Employment Details"
                meta="Post-placement outcomes confirmed at 90 and 180 days."
              >
                <div className="outcome-check">
                  <input
                    type="checkbox"
                    id="o1-check"
                    name="employed90"
                    defaultChecked={outcomes?.employed90Day ?? false}
                  />
                  <label htmlFor="o1-check">Employed at 90 days</label>
                </div>
                <div className="rubric-notes" style={{ padding: '0 28px 22px' }}>
                  <label className="rubric-notes__label" htmlFor="o1-notes">
                    90-Day Notes
                  </label>
                  <textarea
                    className="textarea"
                    id="o1-notes"
                    name="employed90Notes"
                    rows={2}
                    placeholder="Hire details, role, start date…"
                    defaultValue={outcomes?.employed90Notes ?? ''}
                  />
                </div>
                <div className="outcome-check">
                  <input
                    type="checkbox"
                    id="o2-check"
                    name="employed180"
                    defaultChecked={outcomes?.employed180Day ?? false}
                  />
                  <label htmlFor="o2-check">Still employed at 180 days</label>
                </div>
                <div className="rubric-notes" style={{ padding: '0 28px 22px' }}>
                  <label className="rubric-notes__label" htmlFor="o2-notes">
                    180-Day Notes
                  </label>
                  <textarea
                    className="textarea"
                    id="o2-notes"
                    name="employed180Notes"
                    rows={2}
                    placeholder="Continuity notes, role changes, promotions…"
                    defaultValue={outcomes?.employed180Notes ?? ''}
                  />
                </div>
              </RubricPanel>
            </div>

            <ActionBar
              status={`INTERN RECORD · ${intern.lastName.toUpperCase()}${cohort ? ' / ' + cohort.name.toUpperCase() : ''}`}
            >
              <Link to="/admin/interns" className="btn btn--outline">
                Cancel
              </Link>
              <button type="button" className="btn btn--danger" onClick={() => setDeleteOpen(true)}>
                Delete Intern
              </button>
              <button
                type="submit"
                className="btn btn--primary"
                disabled={nav.state === 'submitting'}
              >
                {nav.state === 'submitting' ? (
                  'Saving…'
                ) : (
                  <>
                    Save Changes <span className="btn__arrow">&rarr;</span>
                  </>
                )}
              </button>
            </ActionBar>
          </Form>

          <Form method="post" id="delete-form">
            <input type="hidden" name="_intent" value="delete" />
          </Form>
        </div>
      </section>

      <ConfirmModal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={() => {
          (document.getElementById('delete-form') as HTMLFormElement).submit();
        }}
        label="DELETE RECORD"
        title="Delete this intern record?"
        body="This intern will be removed from the cohort roster. Any competency assessments tied to their identifier will remain for historical reference."
        confirmText="Delete Permanently"
        variant="danger"
      />
    </>
  );
}
