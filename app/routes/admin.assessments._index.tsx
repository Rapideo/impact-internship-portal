// Admin Assessments chooser hub (SP4 Phase D, Task 19).
//
// Two cards: Competency Assessment, Exit Employer Survey. Each "Begin …"
// button opens an intern-picker modal listing all active interns with a
// live filter on last name + cohort name. Selecting a row navigates to the
// task-specific admin route with `?internId=<id>`.
//
// Loader returns all interns + their cohort/employer for picker display.
// Admin auth is enforced both by the parent `admin.tsx` layout and locally
// via `requireAdmin` (defence-in-depth).

import { useEffect, useMemo, useState } from 'react';
import { data, useLoaderData, useNavigate } from 'react-router';
import type { Route } from './+types/admin.assessments._index';
import { requireAdmin } from '~/lib/admin-guard.server';
import { db } from '~/lib/db.server';
import { listInternsForListing } from '~/lib/admin-queries.server';
import { PageHead } from '~/components/PageHead';

export const meta: Route.MetaFunction = () => [{ title: 'Assessments · IMPACT Admin' }];

export async function loader({ request }: Route.LoaderArgs) {
  const { headers } = await requireAdmin(request);
  const interns = await listInternsForListing(db);
  return data({ interns }, { headers });
}

type PickerTarget = 'competency' | 'exit-employer-survey';

export default function AdminAssessmentsHub() {
  const { interns } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const [picker, setPicker] = useState<{ target: PickerTarget } | null>(null);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return interns;
    return interns.filter(
      (i) =>
        i.lastName.toLowerCase().includes(q) ||
        (i.cohortName ?? '').toLowerCase().includes(q) ||
        (i.employerName ?? '').toLowerCase().includes(q),
    );
  }, [interns, search]);

  const open = (target: PickerTarget) => {
    setSearch('');
    setPicker({ target });
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

  const onPick = (internId: string) => {
    if (!picker) return;
    const path =
      picker.target === 'competency'
        ? `/admin/assessments/competency/new?internId=${internId}`
        : `/admin/assessments/exit-employer-survey?internId=${internId}`;
    close();
    navigate(path);
  };

  return (
    <>
      <PageHead
        breadcrumb="ADMIN / ASSESSMENTS"
        title="ASSESSMENTS."
        sub="Begin a competency assessment or exit employer survey for any active intern."
      />
      <section className="container" style={{ padding: '24px 0 48px' }}>
        <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
          <article className="identity-card">
            <span className="micro-label">COMPETENCY ASSESSMENT</span>
            <h2 className="kpi-card__value" style={{ fontSize: '1.6rem', marginTop: 8 }}>
              Competency
            </h2>
            <p style={{ marginTop: 8 }}>
              Phase-by-phase rubric covering core, cohort, and intern-specific competencies.
            </p>
            <button
              type="button"
              className="btn btn--primary"
              style={{ marginTop: 16 }}
              onClick={() => open('competency')}
            >
              Begin Competency Assessment <span className="btn__arrow">&rarr;</span>
            </button>
          </article>

          <article className="identity-card">
            <span className="micro-label">EXIT EMPLOYER SURVEY</span>
            <h2 className="kpi-card__value" style={{ fontSize: '1.6rem', marginTop: 8 }}>
              Exit Survey
            </h2>
            <p style={{ marginTop: 8 }}>
              Employer-completed outcomes and performance survey at end of internship.
            </p>
            <button
              type="button"
              className="btn btn--primary"
              style={{ marginTop: 16 }}
              onClick={() => open('exit-employer-survey')}
            >
              Begin Exit Employer Survey <span className="btn__arrow">&rarr;</span>
            </button>
          </article>
        </div>
      </section>

      {picker ? (
        <div className="modal" role="dialog" aria-modal="true" aria-label="Select intern">
          <div className="modal__overlay" onClick={close} />
          <div
            className="modal__card"
            style={{
              maxWidth: 'min(640px, 92vw)',
              width: 'min(640px, 92vw)',
              maxHeight: '80vh',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                marginBottom: 12,
              }}
            >
              <h3 style={{ margin: 0 }}>
                Select an intern —{' '}
                {picker.target === 'competency' ? 'Competency' : 'Exit Employer Survey'}
              </h3>
              <button type="button" className="btn btn--outline" onClick={close}>
                Cancel
              </button>
            </div>
            <input
              type="text"
              className="input"
              aria-label="Filter interns"
              placeholder="Filter by last name, cohort, or employer…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
              style={{ marginBottom: 12 }}
            />
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {filtered.length === 0 ? (
                <p style={{ padding: '12px 4px', color: 'var(--ink-muted, var(--navy))' }}>
                  No interns match this filter.
                </p>
              ) : (
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {filtered.map((i) => (
                    <li key={i.id}>
                      <button
                        type="button"
                        className="record-link"
                        style={{
                          width: '100%',
                          textAlign: 'left',
                          marginBottom: 6,
                          cursor: 'pointer',
                        }}
                        onClick={() => onPick(i.id)}
                      >
                        <div className="record-link__head">
                          <span className="record-link__label">
                            {i.firstInitial}. {i.lastName.toUpperCase()}
                          </span>
                          <span className="record-link__title">
                            {i.employerName ?? '—'} · {i.cohortName ?? '—'}
                          </span>
                        </div>
                        <span className="record-link__status">Select &rarr;</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
