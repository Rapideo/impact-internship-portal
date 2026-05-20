import {
  data,
  Form,
  Link,
  redirect,
  useActionData,
  useLoaderData,
  useNavigation,
} from 'react-router';
import { useMemo, useRef, useState } from 'react';
import type { Route } from './+types/admin.interns.new';
import { requireAdmin } from '~/lib/admin-guard.server';
import { db } from '~/lib/db.server';
import { listAllEmployers, listBarriers } from '~/lib/admin-queries.server';
import {
  cohorts as cohortsTbl,
  roles as rolesTbl,
  interns,
  internEntryAssessment,
  internEntryBarriers,
} from '../../db/schema';
import { asc } from 'drizzle-orm';
import {
  parseFormFields,
  requireString,
  requireUuid,
  requireDate,
  optionalUuid,
  optionalString,
  errorsByField,
} from '~/lib/validation';
import { PageHead } from '~/components/PageHead';
import { RubricPanel } from '~/components/RubricPanel';
import { ActionBar } from '~/components/ActionBar';
import { BarrierCheckList } from '~/components/BarrierCheckList';
import { ConfirmModal } from '~/components/ConfirmModal';

export const meta: Route.MetaFunction = () => [{ title: 'New Intern — IMPACT Admin' }];

export async function loader({ request }: Route.LoaderArgs) {
  const { headers } = await requireAdmin(request);
  const [employers, allCohorts, allRoles, barriers] = await Promise.all([
    listAllEmployers(db),
    db
      .select({
        id: cohortsTbl.id,
        employerId: cohortsTbl.employerId,
        roleId: cohortsTbl.roleId,
        name: cohortsTbl.name,
      })
      .from(cohortsTbl)
      .orderBy(asc(cohortsTbl.name)),
    db
      .select({ id: rolesTbl.id, employerId: rolesTbl.employerId, label: rolesTbl.label })
      .from(rolesTbl)
      .orderBy(asc(rolesTbl.label)),
    listBarriers(db),
  ]);
  return data({ employers, allCohorts, allRoles, barriers }, { headers });
}

export async function action({ request }: Route.ActionArgs) {
  const { headers } = await requireAdmin(request);
  const formData = await request.formData();
  const { values, errors } = parseFormFields(formData, {
    firstName: requireString('First Name'),
    lastName: requireString('Last Name'),
    employerId: requireUuid('Employer'),
    cohortId: requireUuid('Cohort'),
    roleId: optionalUuid('Role'),
    startDate: requireDate('Start Date'),
    endDate: requireDate('End Date'),
    entryNotes: optionalString('Notes'),
  });
  // First-name field accepts a full name for usability; the action below
  // slices to the first character before persisting (line ~92). This
  // matches the hint shown to the user ("Only the first initial is
  // saved") and the minimum-PII policy. The previous `requireSingleCharUpper`
  // gate was the CLAUDE.md SP2 carry-over — rejected any multi-char input
  // and contradicted the hint copy.
  const barrierIds = formData
    .getAll('barrierIds')
    .map((v) => String(v))
    .filter(Boolean);
  if (errors.length > 0) {
    return data({ errors, values: { ...values, barrierIds } }, { headers, status: 400 });
  }

  const firstInitial = values.firstName.trim()[0]!.toUpperCase();

  try {
    const inserted = await db.transaction(async (tx) => {
      const [intern] = await tx
        .insert(interns)
        .values({
          cohortId: values.cohortId,
          roleId: values.roleId,
          firstInitial,
          lastName: values.lastName,
          startDate: values.startDate,
          endDate: values.endDate,
        })
        .returning({ id: interns.id });

      await tx.insert(internEntryAssessment).values({
        internId: intern!.id,
        notes: values.entryNotes,
        completedAt: new Date(),
      });

      if (barrierIds.length > 0) {
        await tx
          .insert(internEntryBarriers)
          .values(barrierIds.map((bid) => ({ internId: intern!.id, barrierId: bid })));
      }
      return intern!;
    });

    throw redirect(`/admin/interns/${inserted.id}?created=1`, { headers });
  } catch (err) {
    // Let react-router redirects propagate.
    if (err instanceof Response) throw err;
    // Postgres unique violation — partial unique index on
    // (lower(first_initial), lower(last_name), cohort_id) where deleted_at is null.
    const pgCode = (err as { code?: string } | null)?.code;
    if (pgCode === '23505') {
      return data(
        {
          errors: [
            {
              field: 'lastName',
              message: 'An intern with the same name already exists in this cohort.',
            },
          ],
          values: { ...values, barrierIds },
        },
        { headers, status: 409 },
      );
    }
    throw err;
  }
}

export default function NewIntern() {
  const { employers, allCohorts, allRoles, barriers } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const nav = useNavigation();
  const errs = errorsByField(actionData?.errors ?? []);
  const formRef = useRef<HTMLFormElement | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const [employerId, setEmployerId] = useState<string>('');
  const [cohortId, setCohortId] = useState<string>('');
  const [roleId, setRoleId] = useState<string>('');

  const filteredCohorts = useMemo(
    () => allCohorts.filter((c) => c.employerId === employerId),
    [allCohorts, employerId],
  );
  const filteredRoles = useMemo(
    () => allRoles.filter((r) => r.employerId === employerId),
    [allRoles, employerId],
  );

  // When the user picks a cohort, default the role to that cohort's role.
  function handleCohortChange(newId: string) {
    setCohortId(newId);
    const c = allCohorts.find((c) => c.id === newId);
    if (c?.roleId) setRoleId(c.roleId);
  }

  const barrierIds =
    (actionData?.values as { barrierIds?: string[] } | undefined)?.barrierIds ?? [];

  return (
    <>
      <PageHead
        breadcrumb={
          <>
            <Link to="/admin/interns" style={{ color: 'inherit', textDecoration: 'none' }}>
              ADMIN / INTERNS
            </Link>{' '}
            / NEW
          </>
        }
        title="NEW INTERN."
        sub="Capture the intern's intake information. Personal details and internship assignment lock once saved; ongoing fields stay editable."
      />
      <section className="assessment-wrap">
        <div className="container">
          <Form method="post" ref={formRef}>
            <div className="rubric">
              <RubricPanel
                num="01"
                title="Personal Information"
                meta="Only the first initial and last name are stored. Identity locks once saved."
              >
                <div className="id-grid" style={{ padding: '22px 28px' }}>
                  <div className={`field${errs.firstName ? ' field--error' : ''}`}>
                    <label htmlFor="first">First Name</label>
                    <input
                      className="input"
                      id="first"
                      name="firstName"
                      type="text"
                      placeholder="e.g., Marcus"
                      defaultValue={String(actionData?.values?.firstName ?? '')}
                    />
                    <span
                      className="field__hint"
                      style={{
                        display: 'block',
                        marginTop: 6,
                        fontSize: 12,
                        color: 'var(--muted)',
                      }}
                    >
                      Only the first initial is saved to the record.
                    </span>
                    {errs.firstName ? <span className="field__error">{errs.firstName}</span> : null}
                  </div>
                  <div className={`field${errs.lastName ? ' field--error' : ''}`}>
                    <label htmlFor="last">Last Name</label>
                    <input
                      className="input"
                      id="last"
                      name="lastName"
                      type="text"
                      placeholder="e.g., Patterson"
                      defaultValue={String(actionData?.values?.lastName ?? '')}
                    />
                    {errs.lastName ? <span className="field__error">{errs.lastName}</span> : null}
                  </div>
                </div>
              </RubricPanel>

              <RubricPanel
                num="02"
                title="Internship Details"
                meta="Pick an employer to narrow the cohort and role choices. Role defaults to the cohort's role; admin may override."
              >
                <div className="id-grid id-grid--5" style={{ padding: '22px 28px' }}>
                  <div className={`field${errs.employerId ? ' field--error' : ''}`}>
                    <label htmlFor="employer">Employer</label>
                    <select
                      className="select"
                      id="employer"
                      name="employerId"
                      value={employerId}
                      onChange={(e) => {
                        setEmployerId(e.target.value);
                        setCohortId('');
                        setRoleId('');
                      }}
                    >
                      <option value="">Select employer</option>
                      {employers.map((e) => (
                        <option key={e.id} value={e.id}>
                          {e.name}
                        </option>
                      ))}
                    </select>
                    {errs.employerId ? (
                      <span className="field__error">{errs.employerId}</span>
                    ) : null}
                  </div>
                  <div className={`field${errs.cohortId ? ' field--error' : ''}`}>
                    <label htmlFor="cohort">Cohort</label>
                    <select
                      className="select"
                      id="cohort"
                      name="cohortId"
                      value={cohortId}
                      onChange={(e) => handleCohortChange(e.target.value)}
                      disabled={!employerId}
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
                    {errs.cohortId ? <span className="field__error">{errs.cohortId}</span> : null}
                  </div>
                  <div className="field">
                    <label htmlFor="role">Role</label>
                    <select
                      className="select"
                      id="role"
                      name="roleId"
                      value={roleId}
                      onChange={(e) => setRoleId(e.target.value)}
                      disabled={!employerId}
                    >
                      <option value="">
                        {employerId ? 'Select role' : 'Select employer first'}
                      </option>
                      {filteredRoles.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className={`field${errs.startDate ? ' field--error' : ''}`}>
                    <label htmlFor="startDate">Start Date</label>
                    <input
                      className="input"
                      id="startDate"
                      name="startDate"
                      type="date"
                      defaultValue={String(actionData?.values?.startDate ?? '')}
                    />
                    {errs.startDate ? <span className="field__error">{errs.startDate}</span> : null}
                  </div>
                  <div className={`field${errs.endDate ? ' field--error' : ''}`}>
                    <label htmlFor="endDate">End Date</label>
                    <input
                      className="input"
                      id="endDate"
                      name="endDate"
                      type="date"
                      defaultValue={String(actionData?.values?.endDate ?? '')}
                    />
                    {errs.endDate ? <span className="field__error">{errs.endDate}</span> : null}
                  </div>
                </div>
              </RubricPanel>

              <RubricPanel
                num="03"
                title="Entry Assessment"
                meta="Barriers to entry identified at intake. Notes feed support planning."
              >
                <BarrierCheckList barriers={barriers} checkedIds={barrierIds} />
                <div className="rubric-notes">
                  <label className="rubric-notes__label" htmlFor="barrier-notes">
                    Notes
                  </label>
                  <textarea
                    className="textarea"
                    id="barrier-notes"
                    name="entryNotes"
                    rows={3}
                    placeholder="Additional context, supports, or follow-up needed…"
                    defaultValue={String(actionData?.values?.entryNotes ?? '')}
                  />
                </div>
              </RubricPanel>

              <RubricPanel
                num="04"
                title="Intern Self-Assessments"
                meta="Submissions made by the intern through the public portal."
              >
                <div className="record-link-grid" style={{ padding: '22px 28px' }}>
                  {['PERSONAL GOALS', 'MID-POINT GOALS', 'PARTICIPANT FEEDBACK'].map((label) => (
                    <div className="record-link record-link--placeholder" key={label}>
                      <div className="record-link__head">
                        <span className="record-link__label">{label}</span>
                        <span className="record-link__title">
                          {label === 'PERSONAL GOALS'
                            ? 'Personal Goals'
                            : label === 'MID-POINT GOALS'
                              ? 'Mid-Point Goals'
                              : 'Participant Feedback Form'}
                        </span>
                      </div>
                      <span className="record-link__status">
                        Will appear after this intern record is saved
                      </span>
                    </div>
                  ))}
                </div>
              </RubricPanel>

              <RubricPanel
                num="05"
                title="Evaluations"
                meta="Competency assessments and exit surveys for this intern."
              >
                <div className="record-link-grid" style={{ padding: '22px 28px' }}>
                  <div className="record-link record-link--placeholder">
                    <div className="record-link__head">
                      <span className="record-link__label">COMPETENCY</span>
                      <span className="record-link__title">Competency Assessments</span>
                    </div>
                    <span className="record-link__status">
                      Will appear after this intern record is saved
                    </span>
                  </div>
                  <div className="record-link record-link--placeholder">
                    <div className="record-link__head">
                      <span className="record-link__label">EXIT SURVEY</span>
                      <span className="record-link__title">Exit Employer Survey</span>
                    </div>
                    <span className="record-link__status">
                      Will appear after this intern record is saved
                    </span>
                  </div>
                </div>
              </RubricPanel>

              <RubricPanel
                num="06"
                title="Employment Details"
                meta="Post-placement outcomes confirmed at 90 and 180 days."
              >
                <div className="outcome-check">
                  <input type="checkbox" id="o1-check" disabled />
                  <label htmlFor="o1-check">Employed at 90 days</label>
                  <span className="outcome-check__hint">To be tracked once placed</span>
                </div>
                <div className="outcome-check">
                  <input type="checkbox" id="o2-check" disabled />
                  <label htmlFor="o2-check">Still employed at 180 days</label>
                  <span className="outcome-check__hint">To be tracked once placed</span>
                </div>
              </RubricPanel>
            </div>
            <ActionBar status="INTERN RECORD · NEW">
              <Link to="/admin/interns" className="btn btn--outline">
                Cancel
              </Link>
              <button
                type="button"
                className="btn btn--primary"
                disabled={nav.state === 'submitting'}
                onClick={() => setConfirmOpen(true)}
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
        </div>
      </section>

      <ConfirmModal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => {
          setConfirmOpen(false);
          formRef.current?.requestSubmit();
        }}
        label="SAVE CHANGES"
        title="Save this intern record?"
        body="Identity fields will lock once saved. Ongoing fields (Entry Assessment, Employment Details) remain editable."
        confirmText="Save"
        cancelText="Keep Editing"
      />
    </>
  );
}
