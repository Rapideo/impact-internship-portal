// Employer interns list. Shows every non-deleted intern across the signed-in
// employer's cohorts. Click through to a focused employer intern record.
//
// Auth is enforced by the parent `employer.tsx` layout; the `!auth?.employerId`
// guard here is belt-and-suspenders for TypeScript narrowing.

import { data, Link, redirect, useLoaderData } from 'react-router';
import type { Route } from './+types/employer.interns._index';
import { getAuthContext } from '~/lib/auth.server';
import { internsForEmployer } from '~/lib/employer-scope.server';
import { PageHead } from '~/components/PageHead';
import { EmptyRow } from '~/components/EmptyRow';
import { formatDate } from '~/lib/format';

export const meta: Route.MetaFunction = () => [{ title: 'Interns - IMPACT Employer' }];

export async function loader({ request }: Route.LoaderArgs) {
  const headers = new Headers();
  const auth = await getAuthContext(request, headers);
  if (!auth?.employerId) {
    throw redirect('/login', { headers });
  }
  const interns = await internsForEmployer(auth.employerId);
  return data({ interns }, { headers });
}

export default function EmployerInternsIndex() {
  const { interns } = useLoaderData<typeof loader>();
  return (
    <>
      <PageHead
        breadcrumb="EMPLOYER / INTERNS"
        title="Your interns."
        sub="Across all your active cohorts. Open a record to view assessments and outcomes."
      />
      <section>
        <div className="container">
          <table className="assessments">
            <thead>
              <tr>
                <th style={{ width: '50%' }}>Intern</th>
                <th style={{ width: '18%' }}>Start</th>
                <th style={{ width: '18%' }}>End</th>
                <th style={{ width: '14%' }}></th>
              </tr>
            </thead>
            <tbody>
              {interns.length === 0 ? (
                <EmptyRow colSpan={4} message="No interns enrolled." />
              ) : (
                interns.map((i) => (
                  <tr key={i.id}>
                    <td>
                      {i.firstInitial}. {i.lastName}
                    </td>
                    <td className="col-date">{formatDate(i.startDate)}</td>
                    <td className="col-date">{formatDate(i.endDate)}</td>
                    <td>
                      <Link to={`/employer/interns/${i.id}`} className="btn btn--outline btn--sm">
                        Open
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
