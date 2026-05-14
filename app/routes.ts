import { type RouteConfig, layout, index, route } from '@react-router/dev/routes';

export default [
  layout('routes/_public.tsx', [
    index('routes/_public._index.tsx'),
    route('login', 'routes/_public.login.tsx'),
    route('auth/forgot', 'routes/_public.auth.forgot.tsx'),
    route('auth/reset', 'routes/_public.auth.reset.tsx'),
    route('auth/accept', 'routes/_public.auth.accept.tsx'),
    route('auth/callback', 'routes/_public.auth.callback.tsx'),
    route('sign-out', 'routes/sign-out.ts'),

    // Intern self-assessment flow (sub-project 4 Phase C)
    layout('routes/_public.intern.tsx', [
      route('intern/assessments', 'routes/_public.intern.assessments.tsx'),
      route('intern/personal-goals', 'routes/_public.intern.personal-goals.tsx'),
      route('intern/midpoint-reflection', 'routes/_public.intern.midpoint-reflection.tsx'),
      route('intern/participant-feedback', 'routes/_public.intern.participant-feedback.tsx'),
      route('intern/confirmation', 'routes/_public.intern.confirmation.tsx'),
      route('intern/reset-identity', 'routes/_public.intern.reset-identity.ts'),
    ]),
  ]),
  layout('routes/admin.tsx', [
    route('admin', 'routes/admin._index.tsx'),
    route('admin/interns', 'routes/admin.interns._index.tsx'),
    route('admin/interns/new', 'routes/admin.interns.new.tsx'),
    route('admin/interns/:internId', 'routes/admin.interns.$internId.tsx'),
    route('admin/assessments', 'routes/admin.assessments._index.tsx'),
    route(
      'admin/assessments/exit-employer-survey',
      'routes/admin.assessments.exit-employer-survey.tsx',
    ),
    route('admin/assessments/competency/new', 'routes/admin.assessments.competency.new.tsx'),
    route(
      'admin/assessments/competency/edit/:id',
      'routes/admin.assessments.competency.edit.$id.tsx',
    ),
    route('admin/assessments/competency/:id', 'routes/admin.assessments.competency.$id.tsx'),
    route('admin/self-assessment-results', 'routes/admin.self-assessment-results.tsx'),
    route('admin/self-assessment-detail', 'routes/admin.self-assessment-detail.tsx'),
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
      'admin/settings/employers/:employerId/account',
      'routes/admin.settings.employers.$employerId.account.tsx',
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
  layout('routes/employer.tsx', [
    route('employer', 'routes/employer._index.tsx'),
    route('employer/cohorts', 'routes/employer.cohorts._index.tsx'),
    route('employer/cohorts/:cohortId', 'routes/employer.cohorts.$cohortId.tsx'),
    route('employer/interns', 'routes/employer.interns._index.tsx'),
    route('employer/interns/:internId', 'routes/employer.interns.$internId.tsx'),
    route('employer/exit-survey', 'routes/employer.exit-survey.tsx'),
    route('employer/competency/new', 'routes/employer.competency.new.tsx'),
    route('employer/competency/edit', 'routes/employer.competency.edit.tsx'),
    route('employer/competency/:id', 'routes/employer.competency.$id.tsx'),
  ]),
  route('*', 'routes/$.tsx'),
] satisfies RouteConfig;
