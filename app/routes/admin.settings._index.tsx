import { redirect } from 'react-router';
import type { Route } from './+types/admin.settings._index';
import { requireAdmin } from '~/lib/admin-guard.server';

// Settings landing redirects to the Employers list, matching the prototype's
// behavior where the Settings nav always lands on Employers. Individual
// settings sub-routes (employers, cohorts, roles, phases, barriers,
// program-info, questions) are reached via the SettingsRail.
export async function loader({ request }: Route.LoaderArgs) {
  const { headers } = await requireAdmin(request);
  throw redirect('/admin/settings/employers', { headers });
}

export default function SettingsIndex() {
  return null;
}
