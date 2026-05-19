// Employer Assessments chooser hub. Mirrors `admin.assessments._index.tsx`
// but scopes the intern picker to the signed-in employer's interns via an
// inline cohort join (constraint: no changes to server modules outside this
// route's own loader).
//
// Two cards: Competency Assessment + Exit Employer Survey. Each opens an
// intern-picker modal listing the employer's active interns with a live
// filter on last name / cohort. Selecting a row navigates to the matching
// employer-scoped form with `?internId=<id>`.
//
// Auth: parent `employer.tsx` enforces role + employerId; the runtime
// `!auth?.employerId` guard here narrows TypeScript.

import { useEffect, useMemo, useState } from 'react';
import { data, Link, redirect, useLoaderData, useNavigate } from 'react-router';
import { and, eq, isNull, sql } from 'drizzle-orm';
import type { Route } from './+types/employer.assessments._index';
import { getAuthContext } from '~/lib/auth.server';
import { db } from '~/lib/db.server';
import { cohorts, interns } from '../../db/schema';
import { PageHead } from '~/components/PageHead';
import { AssessmentCard } from '~/components/AssessmentCard';
import { PickerList } from '~/components/PickerList';
import { formatDate, initials } from '~/lib/format';

export const meta: Route.MetaFunction = () => [{ title: 'Assessments · IMPACT Employer' }];

export async function loader({ request }: Route.LoaderArgs) {
  const headers = new Headers();
  const auth = await getAuthContext(request, headers);
  if (!auth?.employerId) {
    throw redirect('/login', { headers });
  }

  const rows = await db
    .select({
      id: interns.id,
      firstInitial: interns.firstInitial,
      lastName: interns.lastName,
      startDate: interns.startDate,
      cohortName: cohorts.name,
    })
    .from(interns)
    .innerJoin(cohorts, eq(cohorts.id, interns.cohortId))
    .where(and(isNull(interns.deletedAt), eq(cohorts.employerId, auth.employerId)))
    .orderBy(sql`${interns.startDate} desc nulls last`);

  return data({ interns: rows }, { headers });
}

type PickerTarget = 'competency' | 'exit-employer-survey';
type InternRow = Awaited<ReturnType<typeof loader>>['data']['interns'][number];

export default function EmployerAssessmentsHub() {
  const { interns } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const [picker, setPicker] = useState<{ target: PickerTarget; title: string } | null>(null);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return interns;
    return interns.filter(
      (i) => i.lastName.toLowerCase().includes(q) || (i.cohortName ?? '').toLowerCase().includes(q),
    );
  }, [interns, search]);

  const open = (target: PickerTarget, title: string) => {
    setSearch('');
    setPicker({ target, title });
  };
  const close = () => setPicker(null);

  useEffect(() => {
    if (!picker) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [picker]);

  const onPick = (row: InternRow) => {
    if (!picker) return;
    const path =
      picker.target === 'competency'
        ? `/employer/competency/new?internId=${row.id}`
        : `/employer/exit-survey?internId=${row.id}`;
    close();
    navigate(path);
  };

  return (
    <>
      <PageHead
        breadcrumb="EMPLOYER / ASSESSMENTS"
        title={
          <>
            START AN
            <br />
            ASSESSMENT.
          </>
        }
        sub="Pick the assessment type, then choose the intern you're capturing it for. Completed assessments appear on the intern's record under Interns."
      />
      <section>
        <div className="container">
          <div className="assessment-grid">
            <AssessmentCard
              stage="PER INTERN · PHASED"
              meta="COMPETENCY ASSESSMENT"
              title="Rate competency on the rubric."
              body="Capture a phase-specific competency evaluation: 7 shared professional domains plus role-specific skills for the placement."
              action={
                <button
                  type="button"
                  className="btn btn--primary"
                  onClick={() => open('competency', 'Pick an intern for Competency')}
                >
                  Begin Competency <span className="btn__arrow">&rarr;</span>
                </button>
              }
            />
            <AssessmentCard
              stage="PER INTERN · AT EXIT"
              meta="EXIT EMPLOYER SURVEY"
              title="Capture exit outcomes."
              body="Record your evaluation at the close of placement: outcome status, performance rating, strengths, work-readiness indicators, and barriers observed."
              action={
                <button
                  type="button"
                  className="btn btn--primary"
                  onClick={() => open('exit-employer-survey', 'Pick an intern for Exit Survey')}
                >
                  Begin Exit Survey <span className="btn__arrow">&rarr;</span>
                </button>
              }
            />
          </div>

          <p className="assessment-foot-note">
            To review what an intern has already completed, open their record from{' '}
            <Link to="/employer/interns">Interns</Link>.
          </p>
        </div>
      </section>

      {picker ? (
        <div className="modal" role="dialog" aria-modal="true" aria-label="Select intern">
          <div className="modal__overlay" onClick={close} />
          <div className="modal__card modal__card--wide">
            <span className="modal__label">SELECT INTERN</span>
            <h3 className="modal__title">{picker.title}</h3>
            <p className="modal__body" style={{ marginBottom: 16 }}>
              Choose the intern you&apos;re creating this assessment for. The form will open with
              their identity pre-filled.
            </p>

            <div className="field" style={{ marginBottom: 12 }}>
              <input
                className="input"
                type="text"
                aria-label="Filter interns"
                placeholder="Search last name or cohort…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoFocus
              />
            </div>

            <PickerList<InternRow>
              columns={[
                {
                  label: 'Last Name',
                  width: '34%',
                  render: (i) => (
                    <div className="col-name">
                      <span className="name-initial">{initials(i.lastName)}</span>
                      {i.lastName}
                    </div>
                  ),
                },
                { label: 'Cohort', width: '34%', render: (i) => i.cohortName ?? '—' },
                {
                  label: 'Start',
                  width: '20%',
                  render: (i) => <span className="col-date">{formatDate(i.startDate)}</span>,
                },
                {
                  label: 'Current Phase',
                  width: '12%',
                  render: () => <span className="col-phase">—</span>,
                },
              ]}
              rows={filtered}
              rowKey={(i) => i.id}
              onSelect={onPick}
              emptyMessage="No interns match."
            />

            <div className="modal__actions">
              <button type="button" className="btn btn--outline" onClick={close}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
