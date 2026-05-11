import { type RouteConfig, layout, index, route } from '@react-router/dev/routes';

export default [
  layout('routes/_public.tsx', [
    index('routes/_public._index.tsx'),
    route('login', 'routes/_public.login.tsx'),
    route('auth/reset-password-request', 'routes/_public.auth.reset-password-request.tsx'),
    route('auth/reset-password', 'routes/_public.auth.reset-password.tsx'),
    route('auth/callback', 'routes/_public.auth.callback.tsx'),
    route('sign-out', 'routes/sign-out.ts'),
  ]),
  layout('routes/admin.tsx', [route('admin', 'routes/admin._index.tsx')]),
  layout('routes/employer.tsx', [route('employer', 'routes/employer._index.tsx')]),
] satisfies RouteConfig;
