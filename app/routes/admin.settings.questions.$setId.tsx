import { data } from 'react-router';
import type { Route } from './+types/admin.settings.questions.$setId';
import { requireAdmin } from '~/lib/admin-guard.server';

export const meta: Route.MetaFunction = () => [{ title: 'Assessment Set — IMPACT Admin' }];

export async function loader({ request }: Route.LoaderArgs) {
  const { headers } = await requireAdmin(request);
  return data({}, { headers });
}

export default function QuestionSetDetail() {
  return null;
}
