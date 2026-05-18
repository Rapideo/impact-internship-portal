// Intern self-assessment shell layout — SP7 Phase D2 rebuild.
//
// Replaces the ad-hoc inline-styled nav and adds the dark <PublicFooter>.
// The shared <PublicNav> is rendered per-route inside each child page
// (chooser uses "← Back to home"; the three forms use "← Back to
// assessments") because the prototype's per-page nav link sets differ —
// mirrors the per-route nav pattern landed in SP7 Phase D1.
//
// The loader is PRESERVED VERBATIM — it loads the current identity cookie
// (may be null) so nested routes can use it via Outlet context if needed.

import { Outlet } from 'react-router';
import type { Route } from './+types/_public.intern';
import { getCurrentInternIdentity } from '~/lib/intern-identity.server';
import { PublicFooter } from '~/components/nav/PublicFooter';

export async function loader({ request }: Route.LoaderArgs) {
  const identity = await getCurrentInternIdentity(request);
  return { identity };
}

// Prototype's intern-facing footer link set: Home + Intern Assessments +
// Contact (mapped to /login for admins, matching the rest of the SP7 D1
// public footer convention).
const INTERN_FOOTER_LINKS = [
  { to: '/', label: 'Home' },
  { to: '/intern/assessments', label: 'Intern Assessments' },
  { to: '/login', label: 'Admin' },
] as const;

export default function InternLayout() {
  return (
    <>
      <Outlet />
      <PublicFooter links={INTERN_FOOTER_LINKS} />
    </>
  );
}
