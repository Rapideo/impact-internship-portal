// Employer roles index (SP5 Phase J, Task 30).
//
// Lists the roles owned by the signed-in employer. The loader filters by
// employerId — defense-in-depth alongside the `employer_own_roles` RLS
// policy. Read-only here: create / edit / delete happen on dedicated
// routes.
//
// Auth is enforced by the parent `employer.tsx` layout; the
// `!auth?.employerId` guard here is for TypeScript narrowing.

import { data, Link, redirect, useLoaderData } from 'react-router';
import { eq } from 'drizzle-orm';
import type { Route } from './+types/employer.roles._index';
import { getAuthContext } from '~/lib/auth.server';
import { db } from '~/lib/db.server';
import { roles } from '../../db/schema';
import { PageHead } from '~/components/PageHead';
import { EmptyRow } from '~/components/EmptyRow';

export const meta: Route.MetaFunction = () => [{ title: 'Roles · IMPACT Employer' }];

export async function loader({ request }: Route.LoaderArgs) {
  const headers = new Headers();
  const auth = await getAuthContext(request, headers);
  if (!auth?.employerId) {
    throw redirect('/login', { headers });
  }
  const rows = await db
    .select({ id: roles.id, label: roles.label, description: roles.description })
    .from(roles)
    .where(eq(roles.employerId, auth.employerId))
    .orderBy(roles.label);
  return data({ roles: rows }, { headers });
}

export default function EmployerRolesIndex() {
  const { roles: rolesList } = useLoaderData<typeof loader>();
  return (
    <>
      <PageHead
        breadcrumb="EMPLOYER / ROLES"
        title="Your roles."
        sub="Roles are templates used when cohorts are configured by your program admin."
        actions={
          <Link to="/employer/roles/new" className="btn btn--primary">
            + New Role
          </Link>
        }
      />
      <section>
        <div className="container">
          <table className="assessments">
            <thead>
              <tr>
                <th style={{ width: '30%' }}>Label</th>
                <th style={{ width: '55%' }}>Description</th>
                <th style={{ width: '15%' }}></th>
              </tr>
            </thead>
            <tbody>
              {rolesList.length === 0 ? (
                <EmptyRow colSpan={3} message="No roles defined yet." />
              ) : (
                rolesList.map((r) => (
                  <tr key={r.id}>
                    <td>{r.label}</td>
                    <td>{r.description ?? '—'}</td>
                    <td>
                      <Link to={`/employer/roles/${r.id}`} className="btn btn--outline btn--sm">
                        Edit
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
