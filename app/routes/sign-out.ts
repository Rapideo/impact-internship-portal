import { redirect } from 'react-router';
import type { Route } from './+types/sign-out';
import { createSupabaseServerClient } from '~/lib/auth.server';

export async function action({ request }: Route.ActionArgs) {
  const headers = new Headers();
  const supabase = createSupabaseServerClient(request, headers);
  await supabase.auth.signOut();
  throw redirect('/login', { headers });
}

export async function loader() {
  throw redirect('/login');
}
