import { redirect } from 'react-router';
import { createSupabaseServerClient } from '~/lib/auth.server';
import type { Route } from './+types/_public.auth.callback';

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const rawNext = url.searchParams.get('next');
  // Only same-origin relative paths are allowed — reject `//evil`, `https://...`,
  // and anything that doesn't start with a single `/`. Without this an attacker
  // could send a reset link with ?next=https://evil and use the legitimate code
  // exchange to land the user off-site with a fresh session cookie attached.
  // Default to /login (rather than /) when next is missing/invalid so the user
  // lands on the branded sign-in page — typical only for malformed callbacks.
  const next = rawNext && /^\/(?!\/)/.test(rawNext) ? rawNext : '/login';

  if (!code) {
    throw redirect('/login?error=link-invalid');
  }

  const headers = new Headers();
  const supabase = createSupabaseServerClient(request, headers);
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    // Usually an expired/reused link, or a PKCE exchange with no code verifier
    // cookie — which happens when the link is opened in a different browser
    // from the one that requested it. Either way the user needs a new link, so
    // say so rather than bouncing them to a blank sign-in page.
    throw redirect('/login?error=link-invalid');
  }

  throw redirect(next, { headers });
}

export default function AuthCallback() {
  return null;
}
