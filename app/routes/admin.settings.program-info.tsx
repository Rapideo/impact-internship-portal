import {
  data,
  Form,
  Link,
  redirect,
  useActionData,
  useLoaderData,
  useNavigation,
} from 'react-router';
import { useEffect } from 'react';
import type { Route } from './+types/admin.settings.program-info';
import { requireAdmin } from '~/lib/admin-guard.server';
import { db } from '~/lib/db.server';
import { getProgramInfo } from '~/lib/admin-queries.server';
import { programInfo } from '../../db/schema';
import {
  parseFormFields,
  requireString,
  optionalString,
  optionalEmail,
  requirePositiveInt,
  errorsByField,
} from '~/lib/validation';
import { PageHead } from '~/components/PageHead';
import { SettingsShell } from '~/components/SettingsShell';
import { IdentityCard } from '~/components/IdentityCard';
import { ActionBar } from '~/components/ActionBar';
import { useToast } from '~/components/ToastProvider';

export const meta: Route.MetaFunction = () => [{ title: 'Program Info — Settings — IMPACT Admin' }];

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export async function loader({ request }: Route.LoaderArgs) {
  const { headers } = await requireAdmin(request);
  const row = await getProgramInfo(db);
  return data({ row }, { headers });
}

export async function action({ request }: Route.ActionArgs) {
  const { headers } = await requireAdmin(request);
  const fd = await request.formData();
  const { values, errors } = parseFormFields(fd, {
    programName: requireString('Program Name'),
    organizationName: optionalString('Organization Name'),
    contactEmail: optionalEmail('Contact Email'),
    phone: optionalString('Phone'),
    defaultCohortLengthWeeks: requirePositiveInt('Default Cohort Length'),
    fiscalYearStartMonth: requirePositiveInt('Fiscal Year Start Month'),
  });
  // Additional range check for fiscalYearStartMonth (1-12). DB CHECK
  // constraint deferred to follow-up task #49.
  if (
    !errors.some((e) => e.field === 'fiscalYearStartMonth') &&
    (values.fiscalYearStartMonth < 1 || values.fiscalYearStartMonth > 12)
  ) {
    errors.push({
      field: 'fiscalYearStartMonth',
      message: 'Fiscal Year Start Month must be between 1 and 12.',
    });
  }
  if (errors.length > 0) {
    return data({ errors, values }, { headers, status: 400 });
  }
  // Singleton upsert: seed inserts id=1, but use ON CONFLICT for safety in
  // fresh dev environments.
  await db
    .insert(programInfo)
    .values({
      id: 1,
      programName: values.programName,
      organizationName: values.organizationName,
      contactEmail: values.contactEmail,
      phone: values.phone,
      defaultCohortLengthWeeks: values.defaultCohortLengthWeeks,
      fiscalYearStartMonth: values.fiscalYearStartMonth,
    })
    .onConflictDoUpdate({
      target: programInfo.id,
      set: {
        programName: values.programName,
        organizationName: values.organizationName,
        contactEmail: values.contactEmail,
        phone: values.phone,
        defaultCohortLengthWeeks: values.defaultCohortLengthWeeks,
        fiscalYearStartMonth: values.fiscalYearStartMonth,
        updatedAt: new Date(),
      },
    });
  throw redirect('/admin/settings/program-info?saved=1', { headers });
}

export default function ProgramInfoSettings() {
  const { row } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const nav = useNavigation();
  const toast = useToast();
  const errs = errorsByField(actionData?.errors ?? []);
  useEffect(() => {
    if (actionData && 'errors' in actionData && actionData.errors.length > 0) {
      toast.show({
        kind: 'danger',
        label: 'CHECK FIELDS',
        message: 'Please fix the highlighted fields.',
      });
    }
  }, [actionData, toast]);
  const v = (actionData?.values ?? row ?? {}) as {
    programName?: string;
    organizationName?: string | null;
    contactEmail?: string | null;
    phone?: string | null;
    defaultCohortLengthWeeks?: number | null;
    fiscalYearStartMonth?: number | null;
  };
  return (
    <>
      <PageHead
        breadcrumb="ADMIN / SETTINGS / PROGRAM INFO"
        title="PROGRAM INFO."
        sub="Program identity and defaults applied to new cohorts."
      />
      <SettingsShell active="program-info">
        <Form method="post">
          <IdentityCard title="Program Record" subnote="PROGRAM INFO · IDENTITY">
            <div className="id-grid id-grid--4">
              <div
                className={`field${errs.programName ? ' field--error' : ''}`}
                style={{ gridColumn: 'span 2' }}
              >
                <label htmlFor="pi-name">Program Name</label>
                <input
                  className="input"
                  type="text"
                  id="pi-name"
                  name="programName"
                  defaultValue={v.programName ?? ''}
                />
                {errs.programName ? <span className="field__error">{errs.programName}</span> : null}
              </div>
              <div className="field" style={{ gridColumn: 'span 2' }}>
                <label htmlFor="pi-org">Organization Name</label>
                <input
                  className="input"
                  type="text"
                  id="pi-org"
                  name="organizationName"
                  defaultValue={v.organizationName ?? ''}
                />
              </div>
              <div
                className={`field${errs.contactEmail ? ' field--error' : ''}`}
                style={{ gridColumn: 'span 2' }}
              >
                <label htmlFor="pi-email">Contact Email</label>
                <input
                  className="input"
                  type="email"
                  id="pi-email"
                  name="contactEmail"
                  defaultValue={v.contactEmail ?? ''}
                />
                {errs.contactEmail ? (
                  <span className="field__error">{errs.contactEmail}</span>
                ) : null}
              </div>
              <div className="field" style={{ gridColumn: 'span 2' }}>
                <label htmlFor="pi-phone">Phone</label>
                <input
                  className="input"
                  type="text"
                  id="pi-phone"
                  name="phone"
                  defaultValue={v.phone ?? ''}
                />
              </div>
            </div>
            <div
              style={{
                paddingTop: 22,
                marginTop: 22,
                borderTop: '1px solid var(--rule)',
              }}
            >
              <span className="micro-label">PROGRAM INFO · DEFAULTS</span>
              <div className="id-grid id-grid--4" style={{ marginTop: 12 }}>
                <div
                  className={`field${errs.defaultCohortLengthWeeks ? ' field--error' : ''}`}
                  style={{ gridColumn: 'span 2' }}
                >
                  <label htmlFor="pi-cohort-length">Default Cohort Length (weeks)</label>
                  <input
                    className="input"
                    type="number"
                    min={1}
                    id="pi-cohort-length"
                    name="defaultCohortLengthWeeks"
                    defaultValue={v.defaultCohortLengthWeeks ?? 26}
                  />
                  {errs.defaultCohortLengthWeeks ? (
                    <span className="field__error">{errs.defaultCohortLengthWeeks}</span>
                  ) : null}
                </div>
                <div
                  className={`field${errs.fiscalYearStartMonth ? ' field--error' : ''}`}
                  style={{ gridColumn: 'span 2' }}
                >
                  <label htmlFor="pi-fy-start">Fiscal Year Start</label>
                  <select
                    className="select"
                    id="pi-fy-start"
                    name="fiscalYearStartMonth"
                    defaultValue={String(v.fiscalYearStartMonth ?? 7)}
                  >
                    {MONTHS.map((m, i) => (
                      <option key={m} value={i + 1}>
                        {m}
                      </option>
                    ))}
                  </select>
                  {errs.fiscalYearStartMonth ? (
                    <span className="field__error">{errs.fiscalYearStartMonth}</span>
                  ) : null}
                </div>
              </div>
            </div>
          </IdentityCard>
          <ActionBar status="PROGRAM INFO · EDIT">
            <Link to="/admin/settings/employers" className="btn btn--outline">
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
                  Save Changes <span className="btn__arrow">&rarr;</span>
                </>
              )}
            </button>
          </ActionBar>
        </Form>
      </SettingsShell>
    </>
  );
}
