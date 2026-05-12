import { data } from 'react-router';
import type { Route } from './+types/admin.settings.questions.competency.cohort.$cohortId';
import { requireAdmin } from '~/lib/admin-guard.server';

export const meta: Route.MetaFunction = () => [
  { title: 'Cohort Competency Questions — IMPACT Admin' },
];

export async function loader({ request }: Route.LoaderArgs) {
  const { headers } = await requireAdmin(request);
  return data({}, { headers });
}

export default function CompetencyCohortEditor() {
  return null;
}
