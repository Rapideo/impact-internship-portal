// Regression guard for the broken staging password reset, 2026-09-22.
//
// @supabase/ssr defaults to the PKCE flow. resetPasswordForEmail() generates a
// code verifier and persists it through the cookie adapter, which appends a
// Set-Cookie onto the Headers passed to createSupabaseServerClient. The action
// returned a plain object, so those headers were dropped, the browser never got
// the verifier, and exchangeCodeForSession() in /auth/callback failed — bouncing
// the user to /login with no explanation.
//
// The symptom is indistinguishable from "the reset form doesn't exist", so this
// test pins the header plumbing rather than the happy path.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { action } from '~/routes/_public.auth.forgot';
import * as authServer from '~/lib/auth.server';

vi.mock('~/lib/env.server', () => ({
  env: { APP_URL: 'https://staging--impact-portal-app.netlify.app' },
}));

const VERIFIER_COOKIE = 'sb-abc-auth-token-code-verifier=v1; Path=/; HttpOnly';

function stubSupabase(onReset?: (headers: Headers) => void) {
  return vi.spyOn(authServer, 'createSupabaseServerClient').mockImplementation(
    ((_req: Request, headers: Headers) =>
      ({
        auth: {
          resetPasswordForEmail: vi.fn(async () => {
            onReset?.(headers);
            return { data: {}, error: null };
          }),
        },
      }) as never) as never,
  );
}

function post(email: string) {
  const form = new FormData();
  form.set('email', email);
  return new Request('https://staging--impact-portal-app.netlify.app/auth/forgot', {
    method: 'POST',
    body: form,
  });
}

/** Unwrap whatever the action returned: data(), Response, or a plain object. */
async function payloadOf(res: unknown): Promise<unknown> {
  if (res instanceof Response) return res.json();
  if (res && typeof res === 'object' && 'data' in res) return (res as { data: unknown }).data;
  return res;
}

/** Pull Set-Cookie off whatever the action returned, data() or Response. */
function setCookies(res: unknown): string {
  if (res instanceof Response) return res.headers.get('Set-Cookie') ?? '';
  const init = (res as { init?: ResponseInit }).init;
  if (!init?.headers) return '';
  return new Headers(init.headers).get('Set-Cookie') ?? '';
}

describe('auth.forgot action', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('returns the Set-Cookie carrying the PKCE code verifier', async () => {
    stubSupabase((headers) => headers.append('Set-Cookie', VERIFIER_COOKIE));

    const res = await action({ request: post('a@b.com'), params: {}, context: {} } as never);

    // Without this the reset link always lands back on /login.
    expect(setCookies(res)).toContain('code-verifier');
  });

  it('still reports success to the caller', async () => {
    stubSupabase((headers) => headers.append('Set-Cookie', VERIFIER_COOKIE));

    const res = await action({ request: post('a@b.com'), params: {}, context: {} } as never);
    const payload = await payloadOf(res);

    expect(payload).toMatchObject({ sent: true });
  });

  it('sends the callback URL that /auth/callback expects', async () => {
    let captured: string | undefined;
    vi.spyOn(authServer, 'createSupabaseServerClient').mockImplementation((() => ({
      auth: {
        resetPasswordForEmail: vi.fn(async (_e: string, opts: { redirectTo?: string }) => {
          captured = opts?.redirectTo;
          return { data: {}, error: null };
        }),
      },
    })) as never);

    await action({ request: post('a@b.com'), params: {}, context: {} } as never);

    expect(captured).toBe(
      'https://staging--impact-portal-app.netlify.app/auth/callback?next=/auth/reset',
    );
  });

  it('rejects an empty email without calling Supabase', async () => {
    const spy = stubSupabase();

    const res = await action({ request: post('   '), params: {}, context: {} } as never);
    const payload = await payloadOf(res);

    expect(payload).toMatchObject({ error: expect.stringMatching(/required/i) });
    expect(spy).not.toHaveBeenCalled();
  });
});
