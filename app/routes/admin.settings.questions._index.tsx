import { data } from 'react-router';
import type { Route } from './+types/admin.settings.questions._index';
import { requireAdmin } from '~/lib/admin-guard.server';

export const meta: Route.MetaFunction = () => [{ title: 'Assessments — Settings — IMPACT Admin' }];

export async function loader({ request }: Route.LoaderArgs) {
  const { headers } = await requireAdmin(request);
  return data({}, { headers });
}

export default function SettingsQuestionsIndex() {
  return null;
}
