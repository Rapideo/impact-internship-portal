import type { Route } from './+types/admin._index';
import { useLoaderData } from 'react-router';
import { getAuthContext } from '~/lib/auth.server';

export const meta: Route.MetaFunction = () => [{ title: 'Admin Dashboard · IMPACT Portal' }];

export async function loader({ request }: Route.LoaderArgs) {
  const headers = new Headers();
  const auth = await getAuthContext(request, headers);
  return { role: auth?.role ?? 'unknown' };
}

export default function AdminIndex() {
  const { role } = useLoaderData<typeof loader>();
  return (
    <main style={{ maxWidth: 720, margin: '4rem auto', padding: '0 1.5rem' }}>
      <h1>Admin Dashboard</h1>
      <p>
        Welcome. You are signed in as <strong>{role}</strong>.
      </p>
      <p style={{ color: 'var(--ink-soft)' }}>Real admin features land in sub-project 2.</p>
    </main>
  );
}
