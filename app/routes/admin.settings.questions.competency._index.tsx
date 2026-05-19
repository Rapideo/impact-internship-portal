import { data, Link, useLoaderData, useNavigate } from 'react-router';
import { inArray } from 'drizzle-orm';
import type { Route } from './+types/admin.settings.questions.competency._index';
import { requireAdmin } from '~/lib/admin-guard.server';
import { db } from '~/lib/db.server';
import {
  loadQuestionSet,
  listCohortCompetencySets,
  listInternCompetencySets,
} from '~/lib/question-engine.server';
import * as schema from '../../db/schema';
import { PageHead } from '~/components/PageHead';
import { SettingsShell } from '~/components/SettingsShell';
import { EmptyRow } from '~/components/EmptyRow';

export const meta: Route.MetaFunction = () => [
  { title: 'Competency Questions — Settings — IMPACT Admin' },
];

function fmtTimestamp(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const y = d.getFullYear();
  return `${mo}.${day}.${y}`;
}

export async function loader({ request }: Route.LoaderArgs) {
  const { headers } = await requireAdmin(request);
  const [core, cohortSets, internSets] = await Promise.all([
    loadQuestionSet('competency-core'),
    listCohortCompetencySets(),
    listInternCompetencySets(),
  ]);

  const cohortIds = cohortSets.map((s) => s.cohortId).filter((v): v is string => !!v);
  const internIds = internSets.map((s) => s.internId).filter((v): v is string => !!v);

  const cohorts = cohortIds.length
    ? await db
        .select({
          id: schema.cohorts.id,
          name: schema.cohorts.name,
          employerId: schema.cohorts.employerId,
        })
        .from(schema.cohorts)
        .where(inArray(schema.cohorts.id, cohortIds))
    : [];
  const employerIds = cohorts.map((c) => c.employerId);
  const employers = employerIds.length
    ? await db
        .select({ id: schema.employers.id, name: schema.employers.name })
        .from(schema.employers)
        .where(inArray(schema.employers.id, employerIds))
    : [];
  const interns = internIds.length
    ? await db
        .select({
          id: schema.interns.id,
          firstInitial: schema.interns.firstInitial,
          lastName: schema.interns.lastName,
          cohortId: schema.interns.cohortId,
        })
        .from(schema.interns)
        .where(inArray(schema.interns.id, internIds))
    : [];

  const cohortIndex = new Map(cohorts.map((c) => [c.id, c]));
  const employerIndex = new Map(employers.map((e) => [e.id, e]));
  const internIndex = new Map(interns.map((i) => [i.id, i]));

  return data(
    {
      coreCount: core?.questions.length ?? 0,
      coreLastEdited: core?.lastEditedAt ?? null,
      cohortRows: cohortSets.map((s) => {
        const c = s.cohortId ? cohortIndex.get(s.cohortId) : null;
        const e = c ? employerIndex.get(c.employerId) : null;
        return {
          cohortId: s.cohortId,
          cohortName: c?.name ?? s.cohortId ?? '—',
          employerName: e?.name ?? '—',
          questionCount: s.questions.length,
          lastEditedAt: s.lastEditedAt,
        };
      }),
      internRows: internSets.map((s) => {
        const i = s.internId ? internIndex.get(s.internId) : null;
        const c = i ? cohortIndex.get(i.cohortId) : null;
        return {
          internId: s.internId,
          internName: i ? `${i.firstInitial}. ${i.lastName}` : (s.internId ?? '—'),
          cohortName: c?.name ?? '—',
          questionCount: s.questions.length,
          lastEditedAt: s.lastEditedAt,
        };
      }),
    },
    { headers },
  );
}

export default function CompetencyDetail() {
  const { coreCount, coreLastEdited, cohortRows, internRows } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  return (
    <>
      <PageHead
        breadcrumb={
          <>
            <a
              href="/admin/settings/questions"
              style={{ color: 'inherit', textDecoration: 'none' }}
            >
              ADMIN / SETTINGS / ASSESSMENTS
            </a>
            {' / COMPETENCY'}
          </>
        }
        title="COMPETENCY QUESTIONS."
        sub="Authoring for the 3-tier Competency rubric: program-wide Core, optional per-cohort, and optional per-intern."
      />
      <SettingsShell active="questions">
        <article className="qs-editor-card">
          <div className="qs-editor-card__head">
            <h2 className="qs-editor-card__title">Core Competencies</h2>
            <span className="micro-label">PROGRAM-WIDE</span>
          </div>
          <p style={{ color: 'var(--muted)', fontSize: 14, margin: '0 0 16px' }}>
            Applied to every Competency assessment. Edit to change the program-wide rubric.
          </p>
          <div className="id-grid id-grid--4">
            <div className="field" style={{ gridColumn: 'span 1' }}>
              <label>Questions</label>
              <input className="input" type="text" disabled value={coreCount} />
            </div>
            <div className="field" style={{ gridColumn: 'span 2' }}>
              <label>Last Edited</label>
              <input className="input" type="text" disabled value={fmtTimestamp(coreLastEdited)} />
            </div>
            <div
              className="field"
              style={{ gridColumn: 'span 1', display: 'flex', alignItems: 'end' }}
            >
              <Link
                to="/admin/settings/questions/competency-core"
                className="btn btn--primary"
                style={{ width: '100%', textAlign: 'center' }}
              >
                Edit Core
              </Link>
            </div>
          </div>
        </article>

        <article className="qs-editor-card">
          <div className="qs-editor-card__head">
            <h2 className="qs-editor-card__title">Cohort Questions</h2>
            <span className="micro-label">PER-COHORT (OPTIONAL)</span>
          </div>
          <p style={{ color: 'var(--muted)', fontSize: 14, margin: '0 0 16px' }}>
            Add role-specific competencies that apply to one cohort&apos;s interns.
          </p>
          <table className="assessments">
            <thead>
              <tr>
                <th style={{ width: '30%' }}>Cohort</th>
                <th style={{ width: '30%' }}>Employer</th>
                <th style={{ width: '15%' }}>Questions</th>
                <th style={{ width: '25%' }}>Last Edited</th>
              </tr>
            </thead>
            <tbody>
              {cohortRows.length === 0 ? (
                <EmptyRow
                  colSpan={4}
                  message={
                    'No cohort-specific competency sets yet. Click "+ New Cohort Questions" to add one.'
                  }
                />
              ) : (
                cohortRows.map((r) => (
                  <tr
                    key={r.cohortId ?? 'row'}
                    style={{ cursor: 'pointer' }}
                    onClick={() =>
                      r.cohortId &&
                      navigate(`/admin/settings/questions/competency/cohort/${r.cohortId}`)
                    }
                    tabIndex={0}
                    onKeyDown={(ev) => {
                      if ((ev.key === 'Enter' || ev.key === ' ') && r.cohortId) {
                        ev.preventDefault();
                        navigate(`/admin/settings/questions/competency/cohort/${r.cohortId}`);
                      }
                    }}
                  >
                    <td>
                      <Link
                        to={`/admin/settings/questions/competency/cohort/${r.cohortId}`}
                        style={{ color: 'inherit', textDecoration: 'none', display: 'block' }}
                      >
                        {r.cohortName}
                      </Link>
                    </td>
                    <td>{r.employerName}</td>
                    <td>{r.questionCount}</td>
                    <td>{fmtTimestamp(r.lastEditedAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          <Link to="/admin/settings/questions/competency/cohort/new" className="settings-list__add">
            + New Cohort Questions
          </Link>
        </article>

        <article className="qs-editor-card">
          <div className="qs-editor-card__head">
            <h2 className="qs-editor-card__title">Intern Questions</h2>
            <span className="micro-label">PER-INTERN (OPTIONAL)</span>
          </div>
          <p style={{ color: 'var(--muted)', fontSize: 14, margin: '0 0 16px' }}>
            Add competencies tailored to one intern&apos;s specific learning goals.
          </p>
          <table className="assessments">
            <thead>
              <tr>
                <th style={{ width: '30%' }}>Intern</th>
                <th style={{ width: '30%' }}>Cohort</th>
                <th style={{ width: '15%' }}>Questions</th>
                <th style={{ width: '25%' }}>Last Edited</th>
              </tr>
            </thead>
            <tbody>
              {internRows.length === 0 ? (
                <EmptyRow
                  colSpan={4}
                  message={
                    'No intern-specific competency sets yet. Click "+ New Intern Questions" to add one.'
                  }
                />
              ) : (
                internRows.map((r) => (
                  <tr
                    key={r.internId ?? 'row'}
                    style={{ cursor: 'pointer' }}
                    onClick={() =>
                      r.internId &&
                      navigate(`/admin/settings/questions/competency/intern/${r.internId}`)
                    }
                    tabIndex={0}
                    onKeyDown={(ev) => {
                      if ((ev.key === 'Enter' || ev.key === ' ') && r.internId) {
                        ev.preventDefault();
                        navigate(`/admin/settings/questions/competency/intern/${r.internId}`);
                      }
                    }}
                  >
                    <td>
                      <Link
                        to={`/admin/settings/questions/competency/intern/${r.internId}`}
                        style={{ color: 'inherit', textDecoration: 'none', display: 'block' }}
                      >
                        {r.internName}
                      </Link>
                    </td>
                    <td>{r.cohortName}</td>
                    <td>{r.questionCount}</td>
                    <td>{fmtTimestamp(r.lastEditedAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          <Link to="/admin/settings/questions/competency/intern/new" className="settings-list__add">
            + New Intern Questions
          </Link>
        </article>
      </SettingsShell>
    </>
  );
}
