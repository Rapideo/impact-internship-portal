import type { Route } from './+types/employer._index';
import { useLoaderData } from 'react-router';
import { getAuthContext } from '~/lib/auth.server';

export const meta: Route.MetaFunction = () => [{ title: 'Employer Dashboard · IMPACT Portal' }];

export async function loader({ request }: Route.LoaderArgs) {
  const headers = new Headers();
  const auth = await getAuthContext(request, headers);
  return { role: auth?.role ?? 'unknown', employerId: auth?.employerId ?? null };
}

export default function EmployerIndex() {
  const { role, employerId } = useLoaderData<typeof loader>();
  return (
    <main style={{ maxWidth: 720, margin: '4rem auto', padding: '0 1.5rem' }}>
      <h1>Employer Dashboard</h1>
      <p>
        Welcome. You are signed in as <strong>{role}</strong>.
      </p>
      <p style={{ color: 'var(--ink-soft)' }}>Employer ID: {employerId ?? '(none)'}</p>
      <p style={{ color: 'var(--ink-soft)' }}>Real employer features land in sub-project 5.</p>
    </main>
  );
}
