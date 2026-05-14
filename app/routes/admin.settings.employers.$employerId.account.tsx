// Employer account-provisioning action route (SP5 Phase B, Task 4).
//
// This route has no standalone page — the loader bounces back to the
// parent employer detail. It exists to host the action handler that
// the EmployerAccountCard form posts to. Three intents are supported:
//
//   intent=invite  → inviteEmployerUser({ employerId, email })
//   intent=resend  → resendEmployerInvite({ employerId })
//   intent=revoke  → revokeEmployerAccess({ employerId })
//
// On success we redirect back to the detail page with an ?account=
// query flag so the parent can show a success banner. On failure we
// return JSON { error } which the parent route reads via useActionData.

import { data, redirect } from 'react-router';
import type { Route } from './+types/admin.settings.employers.$employerId.account';
import { requireAdmin } from '~/lib/admin-guard.server';
import {
  inviteEmployerUser,
  resendEmployerInvite,
  revokeEmployerAccess,
} from '~/lib/invites.server';

export async function loader({ request, params }: Route.LoaderArgs) {
  const { headers } = await requireAdmin(request);
  // No standalone page — bounce to the parent detail.
  throw redirect(`/admin/settings/employers/${params.employerId}`, { headers });
}

export async function action({ request, params }: Route.ActionArgs) {
  const { headers } = await requireAdmin(request);
  const employerId = params.employerId;
  const formData = await request.formData();
  const intent = String(formData.get('intent') ?? '');

  const backTo = `/admin/settings/employers/${employerId}`;

  try {
    if (intent === 'invite') {
      const email = String(formData.get('email') ?? '').trim();
      if (!email) {
        return data({ error: 'Email is required.' }, { headers });
      }
      await inviteEmployerUser({ employerId, email });
      throw redirect(`${backTo}?account=invited`, { headers });
    }
    if (intent === 'resend') {
      await resendEmployerInvite({ employerId });
      throw redirect(`${backTo}?account=resent`, { headers });
    }
    if (intent === 'revoke') {
      await revokeEmployerAccess({ employerId });
      throw redirect(`${backTo}?account=revoked`, { headers });
    }
    return data({ error: `Unknown action: ${intent}` }, { headers });
  } catch (err) {
    // redirect() throws a Response — re-raise it so the framework
    // performs the navigation.
    if (err instanceof Response) throw err;
    const message = err instanceof Error ? err.message : 'Unexpected error';
    return data({ error: message }, { headers });
  }
}
