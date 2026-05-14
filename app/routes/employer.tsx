// Employer shell layout. Enforces role + employer scope at the boundary:
//   - unauthenticated users are redirected to /login;
//   - admins are redirected to /admin (they have no employer scope);
//   - employer users without an employer_id are redirected to /login with an
//     error param (the profiles_employer_required_if_employer check constraint
//     should make this unreachable, but the runtime guard remains as a defense
//     in depth).
//
// The loader returns the signed-in user's email and the employer name; both
// are passed to the nav and forwarded via Outlet context so nested employer
// routes can read them without an extra round-trip query.

import { Outlet, redirect, useLoaderData } from 'react-router';
import { eq } from 'drizzle-orm';
import type { Route } from './+types/employer';
import { createSupabaseServerClient, getAuthContext } from '~/lib/auth.server';
import { db } from '~/lib/db.server';
import { employers } from '../../db/schema';
import { EmployerNav } from '~/components/nav/EmployerNav';
import { EmployerFooter } from '~/components/nav/EmployerFooter';

export async function loader({ request }: Route.LoaderArgs) {
  const headers = new Headers();
  const auth = await getAuthContext(request, headers);
  if (!auth) {
    throw redirect('/login', { headers });
  }
  if (auth.role !== 'employer') {
    throw redirect('/admin', { headers });
  }
  if (!auth.employerId) {
    // Profile misconfigured; check constraint should prevent this in practice.
    throw redirect('/login?error=no-employer', { headers });
  }

  const supabase = createSupabaseServerClient(request, headers);
  const { data: userData } = await supabase.auth.getUser();

  const rows = await db
    .select({ id: employers.id, name: employers.name })
    .from(employers)
    .where(eq(employers.id, auth.employerId))
    .limit(1);

  const [employer] = rows;
  if (!employer) {
    throw redirect('/login?error=employer-missing', { headers });
  }

  return {
    employer,
    userEmail: userData.user?.email ?? '(unknown)',
  };
}

export default function EmployerLayout() {
  const { employer, userEmail } = useLoaderData<typeof loader>();
  return (
    <div className="employer-shell">
      <EmployerNav employerName={employer.name} userEmail={userEmail} />
      <main className="container" style={{ padding: '32px 16px 64px' }}>
        <Outlet context={{ employer, userEmail }} />
      </main>
      <EmployerFooter />
    </div>
  );
}
