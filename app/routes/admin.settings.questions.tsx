import type { Route } from './+types/admin.settings.questions';
import { requireAdmin } from '~/lib/admin-guard.server';
import { PageHead } from '~/components/PageHead';
import { SettingsShell } from '~/components/SettingsShell';

export const meta: Route.MetaFunction = () => [{ title: 'Assessments · Settings · IMPACT Admin' }];

export async function loader({ request }: Route.LoaderArgs) {
  const { headers } = await requireAdmin(request);
  return Response.json({}, { headers });
}

export default function SettingsQuestionsPlaceholder() {
  return (
    <>
      <PageHead
        breadcrumb="ADMIN / SETTINGS / ASSESSMENTS"
        title="ASSESSMENTS."
        sub="Coming in sub-project 3."
      />
      <SettingsShell active="questions">
        <article className="identity-card">
          <p>
            Question-set editor (Personal Goals, Midpoint Reflection, Participant Feedback, Exit
            Employer Survey, Competency Core/Cohort/Intern) will land in sub-project 3.
          </p>
        </article>
      </SettingsShell>
    </>
  );
}
