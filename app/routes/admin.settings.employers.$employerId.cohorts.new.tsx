import {
  data,
  Form,
  Link,
  redirect,
  useActionData,
  useLoaderData,
  useNavigation,
} from 'react-router';
import type { Route } from './+types/admin.settings.employers.$employerId.cohorts.new';
import { requireAdmin } from '~/lib/admin-guard.server';
import { db } from '~/lib/db.server';
import {
  getEmployerOrNull,
  listRolesForEmployerWithCohortCount,
  listPhases,
} from '~/lib/admin-queries.server';
import { cohorts, cohortPhases } from '../../db/schema';
import {
  parseFormFields,
  requireString,
  requireDate,
  optionalString,
  optionalUuid,
  errorsByField,
} from '~/lib/validation';
import { PageHead } from '~/components/PageHead';
import { MetaStrip } from '~/components/MetaStrip';
import { SettingsShell } from '~/components/SettingsShell';
import { IdentityCard } from '~/components/IdentityCard';
import { ActionBar } from '~/components/ActionBar';
import { PhaseMultiSelect } from '~/components/PhaseMultiSelect';

export const meta: Route.MetaFunction = () => [{ title: 'New Cohort — IMPACT Admin' }];

export async function loader({ request, params }: Route.LoaderArgs) {
  const { headers } = await requireAdmin(request);
  const employer = await getEmployerOrNull(db, params.employerId!);
  if (!employer) throw new Response('Not Found', { status: 404 });
  const [roles, phases] = await Promise.all([
    listRolesForEmployerWithCohortCount(db, employer.id),
    listPhases(db),
  ]);
  return data({ employer, roles, phases }, { headers });
}

export async function action({ request, params }: Route.ActionArgs) {
  const { headers } = await requireAdmin(request);
  const employer = await getEmployerOrNull(db, params.employerId!);
  if (!employer) throw new Response('Not Found', { status: 404 });
  const fd = await request.formData();
  const { values, errors } = parseFormFields(fd, {
    name: requireString('Name'),
    roleId: optionalUuid('Role'),
    startDate: requireDate('Start Date'),
    endDate: requireDate('End Date'),
    description: optionalString('Description'),
  });
  const phaseIds = fd
    .getAll('phaseIds')
    .map((v) => String(v))
    .filter(Boolean);
  if (phaseIds.length === 0) {
    errors.push({ field: 'phaseIds', message: 'Pick at least one phase for this cohort.' });
  }
  if (errors.length > 0) {
    return data({ errors, values, phaseIds }, { headers, status: 400 });
  }

  const cohortId = await db.transaction(async (tx) => {
    const [row] = await tx
      .insert(cohorts)
      .values({
        employerId: employer.id,
        roleId: values.roleId,
        name: values.name,
        startDate: values.startDate,
        endDate: values.endDate,
        description: values.description,
      })
      .returning({ id: cohorts.id });
    await tx.insert(cohortPhases).values(
      phaseIds.map((pid, idx) => ({
        cohortId: row!.id,
        phaseId: pid,
        sortOrder: idx + 1,
      })),
    );
    return row!.id;
  });

  throw redirect(`/admin/settings/cohorts/${cohortId}?created=1`, { headers });
}

export default function NewCohort() {
  const { employer, roles, phases } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const nav = useNavigation();
  const errs = errorsByField(actionData?.errors ?? []);
  const v = (actionData?.values ?? {}) as Partial<Record<string, string | null>>;
  const phaseIds = (actionData?.phaseIds ?? []) as string[];
  return (
    <>
      <PageHead
        breadcrumb={
          <>
            <Link
              to="/admin/settings/employers"
              style={{ color: 'inherit', textDecoration: 'none' }}
            >
              ADMIN / SETTINGS / EMPLOYERS
            </Link>
            {' / '}
            <Link
              to={`/admin/settings/employers/${employer.id}`}
              style={{ color: 'inherit', textDecoration: 'none' }}
            >
              {employer.name.toUpperCase()}
            </Link>
            {' / NEW COHORT'}
          </>
        }
        title="NEW COHORT."
        sub="Create a cohort and define its assessment phases."
      >
        <MetaStrip items={[{ label: 'Employer', value: employer.name }]} />
      </PageHead>
      <SettingsShell active="employers">
        <Form method="post">
          <IdentityCard title="Cohort Record" subnote="NEW COHORT · DEFINE IDENTITY AND PHASES">
            <div className="id-grid id-grid--4">
              <div className={`field${errs.name ? ' field--error' : ''}`}>
                <label htmlFor="co-name">Name</label>
                <input
                  className="input"
                  type="text"
                  id="co-name"
                  name="name"
                  placeholder="e.g. Eskenazi 2026"
                  defaultValue={String(v.name ?? '')}
                />
                {errs.name ? <span className="field__error">{errs.name}</span> : null}
              </div>
              <div className="field">
                <label htmlFor="co-role">Role</label>
                <select
                  className="select"
                  id="co-role"
                  name="roleId"
                  defaultValue={String(v.roleId ?? '')}
                >
                  <option value="">Select role…</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className={`field${errs.startDate ? ' field--error' : ''}`}>
                <label htmlFor="co-start">Start Date</label>
                <input
                  className="input"
                  type="date"
                  id="co-start"
                  name="startDate"
                  defaultValue={String(v.startDate ?? '')}
                />
                {errs.startDate ? <span className="field__error">{errs.startDate}</span> : null}
              </div>
              <div className={`field${errs.endDate ? ' field--error' : ''}`}>
                <label htmlFor="co-end">End Date</label>
                <input
                  className="input"
                  type="date"
                  id="co-end"
                  name="endDate"
                  defaultValue={String(v.endDate ?? '')}
                />
                {errs.endDate ? <span className="field__error">{errs.endDate}</span> : null}
              </div>
            </div>
            <div style={{ paddingTop: 22, marginTop: 22, borderTop: '1px solid var(--rule)' }}>
              <div className="field">
                <label htmlFor="co-desc">Description</label>
                <textarea
                  className="textarea"
                  id="co-desc"
                  name="description"
                  rows={3}
                  placeholder="Role overview, rotation structure, credentials earned…"
                  defaultValue={String(v.description ?? '')}
                />
              </div>
            </div>
          </IdentityCard>
          <div className="detail-header" style={{ marginTop: 32 }}>
            <h2 className="detail-header__title">Phases</h2>
          </div>
          <PhaseMultiSelect phases={phases} selectedIds={phaseIds} error={errs.phaseIds} />
          <ActionBar status="COHORT RECORD · NEW">
            <Link to={`/admin/settings/employers/${employer.id}`} className="btn btn--outline">
              Cancel
            </Link>
            <button
              type="submit"
              className="btn btn--primary"
              disabled={nav.state === 'submitting'}
            >
              {nav.state === 'submitting' ? (
                'Saving…'
              ) : (
                <>
                  Create Cohort <span className="btn__arrow">&rarr;</span>
                </>
              )}
            </button>
          </ActionBar>
        </Form>
      </SettingsShell>
    </>
  );
}
