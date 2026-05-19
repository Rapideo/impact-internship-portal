import { data, Link, useFetcher, useLoaderData, useNavigate } from 'react-router';
import { useMemo, useState } from 'react';
import type { Route } from './+types/admin.interns._index';
import { requireAdmin } from '~/lib/admin-guard.server';
import { db } from '~/lib/db.server';
import { listInternsForListing } from '~/lib/admin-queries.server';
import { interns as internsTable } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { PageHead } from '~/components/PageHead';
import { TableFilter } from '~/components/TableFilter';
import { EmptyRow } from '~/components/EmptyRow';
import { ConfirmModal } from '~/components/ConfirmModal';
import { formatDate, initials } from '~/lib/format';

export const meta: Route.MetaFunction = () => [{ title: 'Interns — IMPACT Admin' }];

export async function loader({ request }: Route.LoaderArgs) {
  const { headers } = await requireAdmin(request);
  const interns = await listInternsForListing(db);
  const cohortOptions = Array.from(new Set(interns.map((i) => i.cohortName))).sort();
  return data({ interns, cohortOptions }, { headers });
}

export async function action({ request }: Route.ActionArgs) {
  const { headers } = await requireAdmin(request);
  const formData = await request.formData();
  const intent = String(formData.get('_intent') ?? '');
  const id = String(formData.get('id') ?? '');
  if (intent === 'delete' && id) {
    await db.update(internsTable).set({ deletedAt: new Date() }).where(eq(internsTable.id, id));
    return data({ ok: true as const, deletedId: id }, { headers });
  }
  return data({ ok: false as const }, { headers, status: 400 });
}

function outcomePill(employed90: boolean | null, employed180: boolean | null) {
  if (employed180) return <span className="pill pill--employed-180">Employed + Still at 180d</span>;
  if (employed90) return <span className="pill pill--employed-90">Employed at 90d</span>;
  return <span className="pill pill--tracked">Not yet tracked</span>;
}

export default function AdminInterns() {
  const { interns, cohortOptions } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const deleteFetcher = useFetcher<typeof action>();
  const [search, setSearch] = useState('');
  const [cohort, setCohort] = useState('all');
  const [outcome, setOutcome] = useState('all');
  const [pendingDelete, setPendingDelete] = useState<{ id: string; name: string } | null>(null);

  const filtered = useMemo(() => {
    return interns.filter((i) => {
      const haystack = `${i.firstInitial}. ${i.lastName} ${i.cohortName}`.toLowerCase();
      if (search && !haystack.includes(search.toLowerCase())) return false;
      if (cohort !== 'all' && i.cohortName !== cohort) return false;
      if (outcome === 'employed-90' && !i.employed90) return false;
      if (outcome === 'employed-180' && !i.employed180) return false;
      if (outcome === 'not-tracked' && (i.employed90 || i.employed180)) return false;
      return true;
    });
  }, [interns, search, cohort, outcome]);

  // Hide rows the user just soft-deleted (optimistic UI). The next loader run
  // re-fetches and the row stays gone on the server side.
  const deletedId =
    deleteFetcher.data && 'deletedId' in deleteFetcher.data ? deleteFetcher.data.deletedId : null;
  const visible = useMemo(
    () => (deletedId ? filtered.filter((i) => i.id !== deletedId) : filtered),
    [filtered, deletedId],
  );

  return (
    <>
      <PageHead
        breadcrumb="ADMIN / INTERNS / 2026"
        title="INTERNS."
        sub="Active participants across the 2026 cohorts, with current phase and post-placement outcomes."
        actions={
          <Link to="/admin/interns/new" className="btn btn--primary">
            + New Intern
          </Link>
        }
      />
      <section>
        <div className="container">
          <TableFilter
            countLabel="Active interns"
            count={visible.length}
            rightAside="Sort: Start Date ↓"
            inputs={
              <>
                <input
                  className="input input--search"
                  type="search"
                  placeholder="Search by last name or cohort..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  aria-label="Search interns"
                />
                <div className="filter-group">
                  <label className="filter-group__label" htmlFor="cohort-filter">
                    Cohort
                  </label>
                  <select
                    className="select"
                    id="cohort-filter"
                    value={cohort}
                    onChange={(e) => setCohort(e.target.value)}
                  >
                    <option value="all">All cohorts</option>
                    {cohortOptions.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="filter-group">
                  <label className="filter-group__label" htmlFor="outcome-filter">
                    Outcome
                  </label>
                  <select
                    className="select"
                    id="outcome-filter"
                    value={outcome}
                    onChange={(e) => setOutcome(e.target.value)}
                  >
                    <option value="all">All</option>
                    <option value="employed-90">Employed at 90d</option>
                    <option value="employed-180">Employed + Still at 180d</option>
                    <option value="not-tracked">Not yet tracked</option>
                  </select>
                </div>
              </>
            }
          >
            <table className="assessments">
              <thead>
                <tr>
                  <th style={{ width: '24%' }}>Intern</th>
                  <th style={{ width: '20%' }}>Cohort</th>
                  <th style={{ width: '14%' }}>Start Date</th>
                  <th style={{ width: '14%' }}>Role</th>
                  <th style={{ width: '14%' }}>90-Day Outcome</th>
                  <th style={{ width: '14%' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {visible.length === 0 ? (
                  <EmptyRow colSpan={6} message="No records match the current filters." />
                ) : (
                  visible.map((i) => (
                    <tr
                      key={i.id}
                      style={{ cursor: 'pointer' }}
                      onClick={(e) => {
                        // Don't navigate when the click landed on an Action link.
                        if ((e.target as HTMLElement).closest('a, button')) return;
                        navigate(`/admin/interns/${i.id}`);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          navigate(`/admin/interns/${i.id}`);
                        }
                      }}
                      tabIndex={0}
                    >
                      <td>
                        <div className="col-name">
                          <span className="name-initial">{initials(i.lastName)}</span>
                          {i.firstInitial}. {i.lastName}
                        </div>
                      </td>
                      <td className="col-cohort">{i.cohortName}</td>
                      <td className="col-date">{formatDate(i.startDate)}</td>
                      <td>{i.roleLabel ?? '—'}</td>
                      <td>{outcomePill(i.employed90, i.employed180)}</td>
                      <td>
                        <div className="col-actions">
                          <Link to={`/admin/interns/${i.id}`} className="action-link">
                            Edit
                          </Link>
                          <button
                            type="button"
                            className="action-link action-link--danger"
                            onClick={() =>
                              setPendingDelete({
                                id: i.id,
                                name: `${i.firstInitial}. ${i.lastName}`,
                              })
                            }
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </TableFilter>
        </div>
      </section>

      <ConfirmModal
        open={pendingDelete !== null}
        onClose={() => setPendingDelete(null)}
        onConfirm={() => {
          if (!pendingDelete) return;
          deleteFetcher.submit({ _intent: 'delete', id: pendingDelete.id }, { method: 'post' });
          setPendingDelete(null);
        }}
        label="DELETE RECORD"
        title="Delete this intern record?"
        body="This record will be permanently removed. This action cannot be undone."
        confirmText="Delete Permanently"
        variant="danger"
      />
    </>
  );
}
