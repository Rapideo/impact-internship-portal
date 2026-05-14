// Clears the signed intern identity cookie and redirects back to the chooser.
// Both POST (action) and GET (loader) target the same path so callers can
// surface this as a button (POST) or a defensive direct link (GET fallback).

import { redirect } from 'react-router';
import type { Route } from './+types/_public.intern.reset-identity';
import { serializeInternIdentityCookie } from '~/lib/intern-identity.server';
import { env } from '~/lib/env.server';

export async function action(_: Route.ActionArgs) {
  const headers = new Headers();
  headers.append(
    'Set-Cookie',
    serializeInternIdentityCookie('', { isProd: env.APP_URL.startsWith('https://'), clear: true }),
  );
  throw redirect('/intern/assessments', { headers });
}

export async function loader(_: Route.LoaderArgs) {
  const headers = new Headers();
  headers.append(
    'Set-Cookie',
    serializeInternIdentityCookie('', { isProd: env.APP_URL.startsWith('https://'), clear: true }),
  );
  throw redirect('/intern/assessments', { headers });
}
