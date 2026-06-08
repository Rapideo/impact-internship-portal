// app/routes/admin.reports.tsx
import { data, useLoaderData } from 'react-router';
import type { Route } from './+types/admin.reports';
import { requireAdmin } from '~/lib/admin-guard.server';
import { db } from '~/lib/db.server';
import { UUID_RE } from '~/lib/validation';
import { listAllEmployers } from '~/lib/admin-queries.server';
import { cohortsForEmployer } from '~/lib/employer-scope.server';
import { getReportsData, resolveAdminScope } from '~/lib/reports-queries.server';
import { PageHead } from '~/components/PageHead';
import { ReportsScopeBar } from '~/components/reports/ReportsScopeBar';
import { ReportsDashboard } from '~/components/reports/ReportsDashboard';

export const meta: Route.MetaFunction = () => [{ title: 'Reports · IMPACT Admin' }];

export async function loader({ request }: Route.LoaderArgs) {
  const { headers } = await requireAdmin(request);
  const url = new URL(request.url);
  const employerIdRaw = url.searchParams.get('employerId');
  const cohortIdRaw = url.searchParams.get('cohortId');

  if (employerIdRaw && !UUID_RE.test(employerIdRaw)) {
    throw new Response('Bad Request', { status: 400, headers });
  }
  if (cohortIdRaw && !UUID_RE.test(cohortIdRaw)) {
    throw new Response('Bad Request', { status: 400, headers });
  }

  const resolved = await resolveAdminScope(db, employerIdRaw, cohortIdRaw);
  const [reports, employerList, cohortRows] = await Promise.all([
    getReportsData(db, resolved.scope),
    listAllEmployers(db),
    resolved.employer ? cohortsForEmployer(resolved.employer.id) : Promise.resolve([]),
  ]);

  return data(
    {
      reports,
      employerList,
      cohortList: cohortRows.map((c) => ({ id: c.id, name: c.name })),
      selectedEmployerId: resolved.employer?.id ?? null,
      selectedCohortId: resolved.cohort?.id ?? null,
      scopeLabel: resolved.label,
    },
    { headers },
  );
}

export default function AdminReports() {
  const { reports, employerList, cohortList, selectedEmployerId, selectedCohortId, scopeLabel } =
    useLoaderData<typeof loader>();
  return (
    <>
      <PageHead
        breadcrumb="ADMIN / REPORTS"
        title="PROGRAM REPORTS."
        sub="Program-wide metrics. Filter by employer and cohort to scope every chart."
      />
      <section>
        <div className="container">
          <ReportsScopeBar
            mode="admin"
            employers={employerList}
            cohorts={cohortList}
            selectedEmployerId={selectedEmployerId}
            selectedCohortId={selectedCohortId}
            scopeLabel={scopeLabel}
          />
        </div>
      </section>
      <ReportsDashboard data={reports} />
    </>
  );
}
