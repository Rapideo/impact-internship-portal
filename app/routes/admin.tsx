import { Outlet, useLoaderData, useLocation } from 'react-router';
import type { Route } from './+types/admin';
import { requireAdmin } from '~/lib/admin-guard.server';
import { createSupabaseServerClient } from '~/lib/auth.server';
import { AdminNav } from '~/components/AdminNav';
import { AdminFooter } from '~/components/AdminFooter';
import { ToastProvider } from '~/components/ToastProvider';

export async function loader({ request }: Route.LoaderArgs) {
  const { auth, headers } = await requireAdmin(request);
  const supabase = createSupabaseServerClient(request, headers);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const email = user?.email ?? 'admin@impact';
  return Response.json({ auth, email }, { headers });
}

function activeTab(pathname: string): 'home' | 'interns' | 'assessments' | 'reports' | 'settings' {
  if (pathname.startsWith('/admin/interns')) return 'interns';
  if (pathname.startsWith('/admin/assessments')) return 'assessments';
  if (pathname.startsWith('/admin/reports')) return 'reports';
  if (pathname.startsWith('/admin/settings')) return 'settings';
  return 'home';
}

export default function AdminLayout() {
  const { email } = useLoaderData<typeof loader>();
  const { pathname } = useLocation();
  return (
    <ToastProvider>
      <AdminNav active={activeTab(pathname)} userEmail={email} />
      <Outlet />
      <AdminFooter />
    </ToastProvider>
  );
}
