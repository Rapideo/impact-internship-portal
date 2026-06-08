// app/routes/employer.reports.tsx
// Employer-scoped reports dashboard. Scope is pinned to the signed-in
// employer's id (from the verified JWT); an optional ?cohortId narrows to one
// of their own cohorts. Auth is enforced by the employer.tsx layout; the
// !auth?.employerId check here is belt-and-suspenders for TS narrowing.

import { data, redirect, useLoaderData } from 'react-router';
import type { Route } from './+types/employer.reports';
import { getAuthContext } from '~/lib/auth.server';
import { db } from '~/lib/db.server';
import { UUID_RE } from '~/lib/validation';
import { cohortsForEmployer } from '~/lib/employer-scope.server';
import { getReportsData, resolveEmployerScope } from '~/lib/reports-queries.server';
import { PageHead } from '~/components/PageHead';
import { ReportsScopeBar } from '~/components/reports/ReportsScopeBar';
import { ReportsDashboard } from '~/components/reports/ReportsDashboard';

export const meta: Route.MetaFunction = () => [{ title: 'Reports — IMPACT Employer' }];

export async function loader({ request }: Route.LoaderArgs) {
  const headers = new Headers();
  const auth = await getAuthContext(request, headers);
  if (!auth?.employerId) {
    throw redirect('/login', { headers });
  }
  const url = new URL(request.url);
  const cohortIdRaw = url.searchParams.get('cohortId');
  if (cohortIdRaw && !UUID_RE.test(cohortIdRaw)) {
    throw new Response('Bad Request', { status: 400, headers });
  }

  const resolved = await resolveEmployerScope(db, auth.employerId, cohortIdRaw);
  const [reports, cohortRows] = await Promise.all([
    getReportsData(db, resolved.scope),
    cohortsForEmployer(auth.employerId),
  ]);

  return data(
    {
      reports,
      cohortList: cohortRows.map((c) => ({ id: c.id, name: c.name })),
      selectedCohortId: resolved.cohort?.id ?? null,
      scopeLabel: resolved.label,
    },
    { headers },
  );
}

export default function EmployerReports() {
  const { reports, cohortList, selectedCohortId, scopeLabel } = useLoaderData<typeof loader>();
  return (
    <>
      <PageHead
        breadcrumb="EMPLOYER / REPORTS / 2026"
        title="YOUR REPORTS."
        sub="Metrics scoped to your organization. Filter to a single cohort to narrow every chart."
      />
      <section>
        <div className="container">
          <ReportsScopeBar
            mode="employer"
            cohorts={cohortList}
            selectedEmployerId={null}
            selectedCohortId={selectedCohortId}
            scopeLabel={scopeLabel}
          />
        </div>
      </section>
      <ReportsDashboard data={reports} />
    </>
  );
}
