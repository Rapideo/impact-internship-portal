// Employer roles index (SP5 Phase J).
//
// Lists the roles owned by the signed-in employer. The loader filters by
// employerId — defense-in-depth alongside the `employer_own_roles` RLS
// policy. Read-only here: create / edit / delete happen on dedicated
// routes.
//
// SP7 Phase G rebuild: uppercase display title, NameInitial chip in the Label
// column, "Cohorts using" count column (lets the user predict whether a
// delete will succeed before clicking through and hitting a 23503 error
// page). Hub-redirect toast on arrival from `?created=1` / `?deleted=1` /
// `?saved=1` per SP7 G pattern.
//
// Auth is enforced by the parent `employer.tsx` layout; the
// `!auth?.employerId` guard here is for TypeScript narrowing.

import { useEffect } from 'react';
import { data, Link, redirect, useLoaderData, useNavigate, useSearchParams } from 'react-router';
import { eq, sql } from 'drizzle-orm';
import type { Route } from './+types/employer.roles._index';
import { getAuthContext } from '~/lib/auth.server';
import { db } from '~/lib/db.server';
import { cohorts, interns, roles } from '../../db/schema';
import { PageHead } from '~/components/PageHead';
import { TableFilter } from '~/components/TableFilter';
import { NameInitial } from '~/components/tables/NameInitial';
import { EmptyRow } from '~/components/EmptyRow';
import { useToast } from '~/components/ToastProvider';
import { initials } from '~/lib/format';
import { useMemo, useState } from 'react';

export const meta: Route.MetaFunction = () => [{ title: 'Roles — IMPACT Employer' }];

export async function loader({ request }: Route.LoaderArgs) {
  const headers = new Headers();
  const auth = await getAuthContext(request, headers);
  if (!auth?.employerId) {
    throw redirect('/login', { headers });
  }
  // Roles + a per-role cohorts-using count (gives users an in-context hint
  // before they try to delete; ON DELETE RESTRICT on cohorts.role_id +
  // interns.role_id means an in-use role can't be deleted).
  const rows = await db
    .select({
      id: roles.id,
      label: roles.label,
      description: roles.description,
      cohortsUsing: sql<number>`COALESCE((
        SELECT COUNT(*)::int FROM ${cohorts}
        WHERE ${cohorts.roleId} = ${roles.id}
      ), 0)`.as('cohorts_using'),
      internsUsing: sql<number>`COALESCE((
        SELECT COUNT(*)::int FROM ${interns}
        WHERE ${interns.roleId} = ${roles.id} AND ${interns.deletedAt} IS NULL
      ), 0)`.as('interns_using'),
    })
    .from(roles)
    .where(eq(roles.employerId, auth.employerId))
    .orderBy(roles.label);
  return data({ roles: rows }, { headers });
}

export default function EmployerRolesIndex() {
  const { roles: rolesList } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [searchParams, setSearchParams] = useSearchParams();

  // Hub-redirect-with-toast pattern: strip query param after firing.
  useEffect(() => {
    const created = searchParams.get('created');
    const deleted = searchParams.get('deleted');
    const saved = searchParams.get('saved');
    if (created === '1') {
      toast.show({ kind: 'success', label: 'CREATED', message: 'Role created.' });
    } else if (deleted === '1') {
      toast.show({ kind: 'success', label: 'DELETED', message: 'Role deleted.' });
    } else if (saved === '1') {
      toast.show({ kind: 'success', label: 'SAVED', message: 'Role saved.' });
    } else {
      return;
    }
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete('created');
        next.delete('deleted');
        next.delete('saved');
        return next;
      },
      { replace: true },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rolesList;
    return rolesList.filter(
      (r) => r.label.toLowerCase().includes(q) || (r.description ?? '').toLowerCase().includes(q),
    );
  }, [rolesList, search]);

  return (
    <>
      <PageHead
        breadcrumb="EMPLOYER / ROLES"
        title="YOUR ROLES."
        sub="Roles are templates used when cohorts are configured by your program admin."
        actions={
          <Link to="/employer/roles/new" className="btn btn--primary">
            + New Role
          </Link>
        }
      />
      <section>
        <div className="container">
          <TableFilter
            countLabel="Roles"
            count={filtered.length}
            inputs={
              <input
                className="input input--search"
                type="search"
                placeholder="Search roles by name or description..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Search roles"
              />
            }
          >
            <table className="assessments">
              <thead>
                <tr>
                  <th style={{ width: '30%' }}>Label</th>
                  <th style={{ width: '40%' }}>Description</th>
                  <th style={{ width: '15%' }}>Cohorts Using</th>
                  <th style={{ width: '15%' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <EmptyRow colSpan={4} message="No roles defined yet." />
                ) : (
                  filtered.map((r) => (
                    <tr
                      key={r.id}
                      style={{ cursor: 'pointer' }}
                      onClick={(e) => {
                        if ((e.target as HTMLElement).closest('a, button')) return;
                        navigate(`/employer/roles/${r.id}`);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          navigate(`/employer/roles/${r.id}`);
                        }
                      }}
                      tabIndex={0}
                    >
                      <td>
                        <NameInitial initials={initials(r.label)} name={r.label} />
                      </td>
                      <td>{r.description ?? '—'}</td>
                      <td>
                        <span className="col-phase">{String(r.cohortsUsing).padStart(2, '0')}</span>
                      </td>
                      <td>
                        <div className="col-actions">
                          <Link to={`/employer/roles/${r.id}`} className="action-link">
                            Edit
                          </Link>
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
    </>
  );
}
