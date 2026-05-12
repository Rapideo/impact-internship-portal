import { data, Link, useLoaderData, useNavigate } from 'react-router';
import type { Route } from './+types/admin.settings.questions._index';
import { requireAdmin } from '~/lib/admin-guard.server';
import {
  listStandardSets,
  loadQuestionSet,
  listCohortCompetencySets,
  listInternCompetencySets,
} from '~/lib/question-engine.server';
import { PageHead } from '~/components/PageHead';
import { SettingsShell } from '~/components/SettingsShell';
import { initials } from '~/lib/format';

export const meta: Route.MetaFunction = () => [{ title: 'Assessments — Settings — IMPACT Admin' }];

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
  const [standard, core, cohortSets, internSets] = await Promise.all([
    listStandardSets(),
    loadQuestionSet('competency-core'),
    listCohortCompetencySets(),
    listInternCompetencySets(),
  ]);
  const competencyCount = core?.questions.length ?? 0;
  const competencyLastEdited =
    [
      core?.lastEditedAt,
      ...cohortSets.map((s) => s.lastEditedAt),
      ...internSets.map((s) => s.lastEditedAt),
    ]
      .filter((s): s is string => Boolean(s))
      .sort()
      .pop() ?? null;
  return data(
    {
      standardSets: standard.map((s) => ({
        id: s.id,
        name: s.name,
        questionCount: s.questions.length,
        lastEditedAt: s.lastEditedAt,
      })),
      competencyCount,
      competencyLastEdited,
    },
    { headers },
  );
}

export default function SettingsQuestionsIndex() {
  const { standardSets, competencyCount, competencyLastEdited } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  return (
    <>
      <PageHead
        breadcrumb="ADMIN / SETTINGS / ASSESSMENTS"
        title="ASSESSMENTS."
        sub="Authoring for the program's intern-facing and admin-facing assessment forms."
      />
      <SettingsShell active="questions">
        <div className="detail-header" style={{ marginTop: 0 }}>
          <h2 className="detail-header__title">Assessments</h2>
        </div>
        <table className="assessments">
          <thead>
            <tr>
              <th style={{ width: '35%' }}>Set</th>
              <th style={{ width: '20%' }}>Questions</th>
              <th style={{ width: '25%' }}>Last Edited</th>
              <th style={{ width: '20%' }}></th>
            </tr>
          </thead>
          <tbody>
            {standardSets.map((s) => (
              <tr
                key={s.id}
                style={{ cursor: 'pointer' }}
                onClick={() => navigate(`/admin/settings/questions/${s.id}`)}
                tabIndex={0}
                onKeyDown={(ev) => {
                  if (ev.key === 'Enter' || ev.key === ' ') {
                    ev.preventDefault();
                    navigate(`/admin/settings/questions/${s.id}`);
                  }
                }}
              >
                <td>
                  <Link
                    to={`/admin/settings/questions/${s.id}`}
                    style={{ color: 'inherit', textDecoration: 'none', display: 'block' }}
                  >
                    <div className="col-name">
                      <span className="name-initial">{initials(s.name)}</span>
                      {s.name}
                    </div>
                  </Link>
                </td>
                <td>{s.questionCount}</td>
                <td>{fmtTimestamp(s.lastEditedAt)}</td>
                <td></td>
              </tr>
            ))}
            <tr
              style={{ cursor: 'pointer' }}
              onClick={() => navigate('/admin/settings/questions/competency')}
              tabIndex={0}
              onKeyDown={(ev) => {
                if (ev.key === 'Enter' || ev.key === ' ') {
                  ev.preventDefault();
                  navigate('/admin/settings/questions/competency');
                }
              }}
            >
              <td>
                <Link
                  to="/admin/settings/questions/competency"
                  style={{ color: 'inherit', textDecoration: 'none', display: 'block' }}
                >
                  <div className="col-name">
                    <span className="name-initial">CR</span>
                    Competency Rubric
                  </div>
                </Link>
              </td>
              <td>{competencyCount}</td>
              <td>{fmtTimestamp(competencyLastEdited)}</td>
              <td></td>
            </tr>
          </tbody>
        </table>
      </SettingsShell>
    </>
  );
}
