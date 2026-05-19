// SP7 Phase E2 — dev-only reseed action.
//
// Three layers of defense keep this off production:
//   1. `app/routes.ts` spreads the route registration behind
//      `process.env.NODE_ENV !== 'production'` so production builds don't
//      ship the route at all.
//   2. Each handler below short-circuits to 404 when invoked in production
//      (defense-in-depth in case a build leaks the route).
//   3. The Settings → Program Info loader only emits the Danger Zone
//      payload when `NODE_ENV !== 'production'`, so the button that POSTs
//      here is invisible in prod.
//
// The action shells out to `npm run db:seed` rather than re-implementing
// the TRUNCATE + reseed logic. `db/seed.ts` is a standalone script with a
// guard that refuses to run against impact-prod's project ref — that
// guard remains in force even if this route is somehow reached.

import { data, redirect, type ActionFunctionArgs, type LoaderFunctionArgs } from 'react-router';
import { spawn } from 'node:child_process';
import { requireAdmin } from '~/lib/admin-guard.server';

function refuseInProd(): never | void {
  if (process.env.NODE_ENV === 'production') {
    throw new Response('Not Found', { status: 404 });
  }
}

export async function loader({ request }: LoaderFunctionArgs) {
  refuseInProd();
  // POST-only — block direct browser GETs.
  void request;
  throw new Response('Method Not Allowed', { status: 405 });
}

export async function action({ request }: ActionFunctionArgs) {
  refuseInProd();
  const { headers } = await requireAdmin(request);

  const cwd = process.cwd();
  const isWindows = process.platform === 'win32';
  const cmd = isWindows ? 'npm.cmd' : 'npm';

  const result = await new Promise<{ code: number; output: string }>((resolve) => {
    const child = spawn(cmd, ['run', 'db:seed'], {
      cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: process.env,
      shell: false,
    });
    let output = '';
    child.stdout.on('data', (c: Buffer) => {
      output += c.toString();
    });
    child.stderr.on('data', (c: Buffer) => {
      output += c.toString();
    });
    child.on('close', (code) => resolve({ code: code ?? -1, output }));
    child.on('error', (err) => resolve({ code: -1, output: String(err) }));
  });

  if (result.code !== 0) {
    // Log on the server for debugging, surface a short toast flag downstream.
    console.error('[dev/reseed] npm run db:seed failed', result.output);
    return data({ ok: false, error: result.output.slice(-400) }, { headers, status: 500 });
  }

  console.log('[dev/reseed] reseed complete');
  throw redirect('/admin/settings/program-info?reseeded=1', { headers });
}
