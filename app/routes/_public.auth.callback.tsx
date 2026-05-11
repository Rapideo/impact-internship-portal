import { redirect } from 'react-router';
import { createSupabaseServerClient } from '~/lib/auth.server';
import type { Route } from './+types/_public.auth.callback';

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const rawNext = url.searchParams.get('next') ?? '/';
  // Only same-origin relative paths are allowed — reject `//evil`, `https://...`,
  // and anything that doesn't start with a single `/`. Without this an attacker
  // could send a reset link with ?next=https://evil and use the legitimate code
  // exchange to land the user off-site with a fresh session cookie attached.
  const next = /^\/(?!\/)/.test(rawNext) ? rawNext : '/';

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
