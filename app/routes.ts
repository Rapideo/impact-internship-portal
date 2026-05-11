import { type RouteConfig, layout, index } from '@react-router/dev/routes';

export default [
  layout('routes/_public.tsx', [index('routes/_public._index.tsx')]),
] satisfies RouteConfig;
