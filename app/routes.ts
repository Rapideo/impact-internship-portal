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
  layout('routes/admin.tsx', [
    route('admin', 'routes/admin._index.tsx'),
    route('admin/interns', 'routes/admin.interns._index.tsx'),
    route('admin/interns/new', 'routes/admin.interns.new.tsx'),
    route('admin/interns/:internId', 'routes/admin.interns.$internId.tsx'),
    route('admin/assessments', 'routes/admin.assessments._index.tsx'),
    route('admin/reports', 'routes/admin.reports.tsx'),
    route('admin/settings', 'routes/admin.settings._index.tsx'),
    route('admin/settings/employers', 'routes/admin.settings.employers._index.tsx'),
    route('admin/settings/employers/new', 'routes/admin.settings.employers.new.tsx'),
    route(
      'admin/settings/employers/:employerId',
      'routes/admin.settings.employers.$employerId._index.tsx',
    ),
    route(
      'admin/settings/employers/:employerId/edit',
      'routes/admin.settings.employers.$employerId.edit.tsx',
    ),
    route(
      'admin/settings/employers/:employerId/cohorts/new',
      'routes/admin.settings.employers.$employerId.cohorts.new.tsx',
    ),
    route(
      'admin/settings/employers/:employerId/roles/new',
      'routes/admin.settings.employers.$employerId.roles.new.tsx',
    ),
    route('admin/settings/cohorts/:cohortId', 'routes/admin.settings.cohorts.$cohortId._index.tsx'),
    route(
      'admin/settings/cohorts/:cohortId/edit',
      'routes/admin.settings.cohorts.$cohortId.edit.tsx',
    ),
    route('admin/settings/roles/:roleId', 'routes/admin.settings.roles.$roleId._index.tsx'),
    route('admin/settings/roles/:roleId/edit', 'routes/admin.settings.roles.$roleId.edit.tsx'),
    route('admin/settings/phases', 'routes/admin.settings.phases.tsx'),
    route('admin/settings/barriers', 'routes/admin.settings.barriers.tsx'),
    route('admin/settings/program-info', 'routes/admin.settings.program-info.tsx'),
    route('admin/settings/questions', 'routes/admin.settings.questions._index.tsx'),
    route(
      'admin/settings/questions/competency',
      'routes/admin.settings.questions.competency._index.tsx',
    ),
    route(
      'admin/settings/questions/competency/cohort/:cohortId',
      'routes/admin.settings.questions.competency.cohort.$cohortId.tsx',
    ),
    route(
      'admin/settings/questions/competency/intern/:internId',
      'routes/admin.settings.questions.competency.intern.$internId.tsx',
    ),
    route('admin/settings/questions/:setId', 'routes/admin.settings.questions.$setId.tsx'),
  ]),
  layout('routes/employer.tsx', [route('employer', 'routes/employer._index.tsx')]),
  route('*', 'routes/$.tsx'),
] satisfies RouteConfig;
