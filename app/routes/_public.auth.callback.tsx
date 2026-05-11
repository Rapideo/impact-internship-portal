import { redirect } from 'react-router';
import { createSupabaseServerClient } from '~/lib/auth.server';
import type { Route } from './+types/_public.auth.callback';

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const next = url.searchParams.get('next') ?? '/';

  if (!code) {
    throw redirect('/login');
  }

  const headers = new Headers();
  const supabase = createSupabaseServerClient(request, headers);
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    throw redirect('/login');
  }

  throw redirect(next, { headers });
}

export default function AuthCallback() {
  return null;
}
