import type { Route } from './+types/admin.reports';
import { requireAdmin } from '~/lib/admin-guard.server';
import { PageHead } from '~/components/PageHead';

export const meta: Route.MetaFunction = () => [{ title: 'Reports · IMPACT Admin' }];

export async function loader({ request }: Route.LoaderArgs) {
  const { headers } = await requireAdmin(request);
  return Response.json({}, { headers });
}

export default function AdminReportsPlaceholder() {
  return (
    <>
      <PageHead breadcrumb="ADMIN / REPORTS" title="REPORTS." sub="Coming in sub-project 6." />
      <section className="container" style={{ padding: '24px 0' }}>
        <article className="identity-card">
          <p>Program reports (CSS bar charts) will land in sub-project 6.</p>
        </article>
      </section>
    </>
  );
}
