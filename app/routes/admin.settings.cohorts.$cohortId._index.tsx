import {
  data,
  Form,
  Link,
  redirect,
  useLoaderData,
  useNavigate,
  useSearchParams,
} from 'react-router';
import { useEffect, useState } from 'react';
import type { Route } from './+types/admin.settings.cohorts.$cohortId._index';
import { requireAdmin } from '~/lib/admin-guard.server';
import { db } from '~/lib/db.server';
import {
  getCohortOrNull,
  getEmployerOrNull,
  getRoleOrNull,
  listPhasesForCohort,
  listInternsByCohort,
} from '~/lib/admin-queries.server';
import { cohorts as cohortsTbl } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { PageHead } from '~/components/PageHead';
import { MetaStrip } from '~/components/MetaStrip';
import { SettingsShell } from '~/components/SettingsShell';
import { ConfirmModal } from '~/components/ConfirmModal';
import { EmptyRow } from '~/components/EmptyRow';
import { RubricSectionHead } from '~/components/RubricSectionHead';
import { useToast } from '~/components/ToastProvider';
import { formatDate, initials } from '~/lib/format';

export const meta: Route.MetaFunction = ({ data: loaderData }) => [
  {
    title: `${(loaderData as { cohort?: { name: string } } | undefined)?.cohort?.name ?? 'Cohort'} — Cohort — IMPACT Admin`,
  },
];

export async function loader({ request, params }: Route.LoaderArgs) {
  const { headers } = await requireAdmin(request);
  const cohort = await getCohortOrNull(db, params.cohortId!);
  if (!cohort) throw new Response('Not Found', { status: 404 });
  const [employer, role, phases, interns] = await Promise.all([
    getEmployerOrNull(db, cohort.employerId),
    cohort.roleId ? getRoleOrNull(db, cohort.roleId) : Promise.resolve(null),
    listPhasesForCohort(db, cohort.id),
    listInternsByCohort(db, cohort.id),
  ]);
  return data({ cohort, employer, role, phases, interns }, { headers });
}

export async function action({ request, params }: Route.ActionArgs) {
  const { headers } = await requireAdmin(request);
  const fd = await request.formData();
  if (String(fd.get('_intent')) === 'delete') {
    const cohort = await getCohortOrNull(db, params.cohortId!);
    await db.delete(cohortsTbl).where(eq(cohortsTbl.id, params.cohortId!));
    throw redirect(`/admin/settings/employers/${cohort?.employerId ?? ''}?cohortDeleted=1`, {
      headers,
    });
  }
  return data({}, { headers });
}

export default function CohortDetail() {
  const { cohort, employer, role, phases, interns } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const toast = useToast();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [search] = useSearchParams();

  useEffect(() => {
    if (search.get('created') === '1')
      toast.show({ kind: 'success', label: 'CREATED', message: 'Cohort created.' });
    if (search.get('updated') === '1')
      toast.show({ kind: 'success', label: 'UPDATED', message: 'Cohort updated.' });
  }, [search, toast]);

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
            {employer ? (
              <Link
                to={`/admin/settings/employers/${employer.id}`}
                style={{ color: 'inherit', textDecoration: 'none' }}
              >
                {employer.name.toUpperCase()}
              </Link>
            ) : (
              'EMPLOYER'
            )}
            {' / COHORT'}
          </>
        }
        title={`${cohort.name}.`}
        sub="Cohort overview, phase structure, and placement details."
      >
        <MetaStrip
          items={[
            { label: 'Employer', value: employer?.name ?? '—' },
            { label: 'Role', value: role?.label ?? '—' },
            { label: 'Start', value: formatDate(cohort.startDate), mono: true },
            { label: 'End', value: formatDate(cohort.endDate), mono: true },
            { label: 'Members', value: String(interns.length).padStart(2, '0'), mono: true },
          ]}
        />
      </PageHead>
      <SettingsShell active="employers">
        <article className="prose-card">
          <span className="prose-card__label">Cohort Description</span>
          <p className="prose-card__body">{cohort.description || 'No description recorded.'}</p>
        </article>

        <RubricSectionHead
          label="PHASES"
          title="Phases"
          aside="Assessment phases applicable to this cohort"
          spaced
        />
        <p style={{ color: 'var(--muted)' }}>
          {phases.length === 0 ? 'No phases configured.' : phases.map((p) => p.label).join(', ')}
        </p>

        <div className="detail-header" style={{ marginTop: 48 }}>
          <h2 className="detail-header__title">Enrolled Interns</h2>
          <span className="micro-label">{String(interns.length).padStart(2, '0')} ACTIVE</span>
        </div>
        <table className="assessments" style={{ marginBottom: 40 }}>
          <thead>
            <tr>
              <th style={{ width: '40%' }}>Last Name</th>
              <th style={{ width: '25%' }}>Start Date</th>
              <th style={{ width: '35%' }}>End Date</th>
            </tr>
          </thead>
          <tbody>
            {interns.length === 0 ? (
              <EmptyRow colSpan={3} message="No interns enrolled yet." />
            ) : (
              interns.map((i) => {
                const name = `${i.firstInitial}. ${i.lastName}`;
                return (
                  <tr
                    key={i.id}
                    style={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/admin/interns/${i.id}`)}
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        navigate(`/admin/interns/${i.id}`);
                      }
                    }}
                  >
                    <td>
                      <div className="col-name">
                        <span className="name-initial">{initials(i.lastName)}</span>
                        {name}
                      </div>
                    </td>
                    <td className="col-date">{formatDate(i.startDate)}</td>
                    <td className="col-date">{formatDate(i.endDate)}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        <div className="detail-actions" style={{ display: 'flex', gap: 10 }}>
          <Link
            to={employer ? `/admin/settings/employers/${employer.id}` : '/admin/settings/employers'}
            className="btn btn--outline"
          >
            &larr; Close
          </Link>
          <Link to={`/admin/settings/cohorts/${cohort.id}/edit`} className="btn btn--primary">
            Edit Cohort
          </Link>
          <button type="button" className="btn btn--danger" onClick={() => setDeleteOpen(true)}>
            Delete Cohort
          </button>
        </div>

        <Form method="post" id="delete-cohort-form">
          <input type="hidden" name="_intent" value="delete" />
        </Form>
        <ConfirmModal
          open={deleteOpen}
          onClose={() => setDeleteOpen(false)}
          onConfirm={() =>
            (document.getElementById('delete-cohort-form') as HTMLFormElement).submit()
          }
          label="DELETE RECORD"
          title="Delete this cohort?"
          body="Removing this cohort will not delete its assessment records, but the cohort will no longer appear in dropdowns or filters. This cannot be undone."
          confirmText="Delete Permanently"
          variant="danger"
        />
      </SettingsShell>
    </>
  );
}
