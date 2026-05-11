import { Outlet, redirect, Form } from 'react-router';
import type { Route } from './+types/employer';
import { getAuthContext } from '~/lib/auth.server';

export async function loader({ request }: Route.LoaderArgs) {
  const headers = new Headers();
  const auth = await getAuthContext(request, headers);
  if (!auth) {
    throw redirect('/login', { headers });
  }
  if (auth.role !== 'employer') {
    throw redirect('/admin', { headers });
  }
  return { auth };
}

export default function EmployerLayout() {
  return (
    <div>
      <header
        style={{
          background: 'var(--navy-deep)',
          color: 'white',
          padding: '1rem 1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
        }}
      >
        <strong>IMPACT · Employer</strong>
        <Form method="post" action="/sign-out">
          <button
            type="submit"
            style={{
              background: 'transparent',
              color: 'white',
              border: '1px solid rgba(255,255,255,0.4)',
              padding: '0.4rem 0.8rem',
              borderRadius: 'var(--radius-md)',
              cursor: 'pointer',
            }}
          >
            Sign Out
          </button>
        </Form>
      </header>
      <Outlet />
    </div>
  );
}
