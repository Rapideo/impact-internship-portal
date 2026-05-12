import type { Route } from './+types/admin.assessments._index';
import { requireAdmin } from '~/lib/admin-guard.server';
import { PageHead } from '~/components/PageHead';

export const meta: Route.MetaFunction = () => [{ title: 'Assessments · IMPACT Admin' }];

export async function loader({ request }: Route.LoaderArgs) {
  const { headers } = await requireAdmin(request);
  return Response.json({}, { headers });
}

export default function AdminAssessmentsPlaceholder() {
  return (
    <>
      <PageHead
        breadcrumb="ADMIN / ASSESSMENTS"
        title="ASSESSMENTS."
        sub="Coming in sub-project 4."
      />
      <section className="container" style={{ padding: '24px 0' }}>
        <article className="identity-card">
          <p>Competency Assessment + Exit Employer Survey will land in sub-project 4.</p>
        </article>
      </section>
    </>
  );
}
