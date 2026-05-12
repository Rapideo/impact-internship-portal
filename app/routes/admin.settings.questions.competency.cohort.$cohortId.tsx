import { useState } from 'react';
import { data, redirect, useLoaderData, useNavigate } from 'react-router';
import { eq, inArray, notInArray } from 'drizzle-orm';
import type { Route } from './+types/admin.settings.questions.competency.cohort.$cohortId';
import { requireAdmin } from '~/lib/admin-guard.server';
import { db } from '~/lib/db.server';
import * as schema from '../../db/schema';
import {
  loadQuestionSet,
  saveQuestionSet,
  deleteQuestionSet,
  QuestionSetSaveError,
} from '~/lib/question-engine.server';
import { PageHead } from '~/components/PageHead';
import { SettingsShell } from '~/components/SettingsShell';
import {
  QuestionSetEditor,
  type QuestionSetEditorValue,
} from '~/components/question-editor/QuestionSetEditor';
import type { Question } from '~/lib/question-types';

export const meta: Route.MetaFunction = ({ data: loaderData }) => [
  {
    title:
      loaderData?.mode === 'edit' && loaderData?.boundCohortName
        ? `${loaderData.boundCohortName} — Cohort Competency — IMPACT Admin`
        : 'New Cohort Competency — IMPACT Admin',
  },
];

function competencyCohortSetId(cohortId: string): string {
  return `competency-cohort-${cohortId}`;
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const { headers } = await requireAdmin(request);
  const cohortIdParam = params.cohortId!;
  const isNew = cohortIdParam === 'new';

  const existingCohortIds = (
    await db
      .select({ cohortId: schema.questionSets.cohortId })
      .from(schema.questionSets)
      .where(eq(schema.questionSets.kind, 'competency-cohort'))
  )
    .map((r) => r.cohortId)
    .filter((c): c is string => !!c);

  if (isNew) {
    const available =
      existingCohortIds.length === 0
        ? await db
            .select({
              id: schema.cohorts.id,
              name: schema.cohorts.name,
              employerId: schema.cohorts.employerId,
            })
            .from(schema.cohorts)
        : await db
            .select({
              id: schema.cohorts.id,
              name: schema.cohorts.name,
              employerId: schema.cohorts.employerId,
            })
            .from(schema.cohorts)
            .where(notInArray(schema.cohorts.id, existingCohortIds));
    const employers = available.length
      ? await db
          .select({ id: schema.employers.id, name: schema.employers.name })
          .from(schema.employers)
          .where(
            inArray(
              schema.employers.id,
              available.map((a) => a.employerId),
            ),
          )
      : [];
    const empIdx = new Map(employers.map((e) => [e.id, e.name]));
    return data(
      {
        mode: 'new' as const,
        cohortOptions: available.map((c) => ({
          id: c.id,
          label: `${c.name} (${empIdx.get(c.employerId) ?? '—'})`,
        })),
        set: null,
        boundCohortName: null as string | null,
      },
      { headers },
    );
  }

  const cohortRows = await db
    .select({
      id: schema.cohorts.id,
      name: schema.cohorts.name,
      employerId: schema.cohorts.employerId,
    })
    .from(schema.cohorts)
    .where(eq(schema.cohorts.id, cohortIdParam));
  if (cohortRows.length === 0) throw new Response('Cohort not found', { status: 404 });
  const cohort = cohortRows[0]!;
  const employerName =
    (
      await db
        .select({ name: schema.employers.name })
        .from(schema.employers)
        .where(eq(schema.employers.id, cohort.employerId))
    )[0]?.name ?? '—';
  const set = await loadQuestionSet(competencyCohortSetId(cohortIdParam));
  return data(
    {
      mode: 'edit' as const,
      cohortOptions: [{ id: cohort.id, label: `${cohort.name} (${employerName})` }],
      set,
      boundCohortName: cohort.name as string | null,
    },
    { headers },
  );
}

export async function action({ request, params }: Route.ActionArgs) {
  const { headers } = await requireAdmin(request);
  const cohortIdParam = params.cohortId!;
  const formData = await request.formData();
  const op = formData.get('op');

  if (op === 'delete') {
    if (cohortIdParam === 'new') {
      return data({ ok: false, error: 'Cannot delete an unsaved set' }, { headers, status: 400 });
    }
    await deleteQuestionSet(competencyCohortSetId(cohortIdParam));
    throw redirect('/admin/settings/questions/competency?deleted=1', { headers });
  }

  const raw = formData.get('payload');
  const chosenCohortId = formData.get('cohortId');
  if (typeof raw !== 'string') {
    return data({ ok: false, error: 'Missing payload' }, { headers, status: 400 });
  }
  let parsed: QuestionSetEditorValue;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return data({ ok: false, error: 'Malformed payload' }, { headers, status: 400 });
  }

  const effectiveCohortId =
    cohortIdParam === 'new'
      ? typeof chosenCohortId === 'string'
        ? chosenCohortId
        : ''
      : cohortIdParam;
  if (!effectiveCohortId) {
    return data({ ok: false, error: 'Please select a cohort.' }, { headers, status: 400 });
  }

  try {
    await saveQuestionSet({
      setId: competencyCohortSetId(effectiveCohortId),
      kind: 'competency-cohort',
      name: parsed.name,
      cohortId: effectiveCohortId,
      minRequired: parsed.minRequired,
      allowMultiple: parsed.allowMultiple,
      questions: parsed.questions as Question[],
    });
  } catch (e) {
    if (e instanceof QuestionSetSaveError) {
      return data({ ok: false, error: e.reason }, { headers, status: 400 });
    }
    throw e;
  }
  throw redirect('/admin/settings/questions/competency?updated=1', { headers });
}

export default function CompetencyCohortEditor() {
  const loaderData = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const [selectedCohortId, setSelectedCohortId] = useState(
    loaderData.mode === 'edit' ? (loaderData.cohortOptions[0]?.id ?? '') : '',
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const initial: QuestionSetEditorValue = loaderData.set
    ? {
        name: loaderData.set.name,
        minRequired: loaderData.set.minRequired,
        allowMultiple: loaderData.set.allowMultiple,
        questions: loaderData.set.questions,
      }
    : {
        name: 'Cohort Questions',
        minRequired: 0,
        allowMultiple: false,
        questions: [],
      };

  function handleSave(value: QuestionSetEditorValue) {
    if (loaderData.mode === 'new' && !selectedCohortId) {
      setFormError('Please select a cohort.');
      return;
    }
    setFormError(null);
    setSaving(true);
    const form = new FormData();
    form.set('payload', JSON.stringify(value));
    if (loaderData.mode === 'new') form.set('cohortId', selectedCohortId);
    fetch(window.location.pathname, { method: 'POST', body: form })
      .then(async (res) => {
        if (res.redirected) {
          navigate(res.url.replace(window.location.origin, ''));
          return;
        }
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        if (body?.error) setFormError(body.error);
      })
      .catch((err: unknown) => setFormError(String(err)))
      .finally(() => setSaving(false));
  }

  function handleDelete() {
    if (loaderData.mode !== 'edit') return;
    if (!confirm("Delete this cohort's competency set? Core and other tiers are unaffected.")) {
      return;
    }
    const form = new FormData();
    form.set('op', 'delete');
    fetch(window.location.pathname, { method: 'POST', body: form }).then((res) => {
      if (res.redirected) navigate(res.url.replace(window.location.origin, ''));
    });
  }

  const titleName =
    loaderData.mode === 'edit'
      ? (loaderData.boundCohortName ?? 'Cohort Questions')
      : 'New Cohort Questions';

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
            {' / '}
            <a
              href="/admin/settings/questions/competency"
              style={{ color: 'inherit', textDecoration: 'none' }}
            >
              COMPETENCY
            </a>
            {' / '}
            {titleName.toUpperCase()}
          </>
        }
        title={`${titleName}.`}
        sub="Role-specific competency questions for one cohort. Stitched after Core questions when assessing this cohort's interns."
      />
      <SettingsShell active="questions">
        <article className="qs-editor-card">
          <div className="qs-editor-card__head">
            <h2 className="qs-editor-card__title">Set Configuration</h2>
            <span className="micro-label">SET INFO</span>
          </div>
          <div className="id-grid id-grid--4">
            <div className="field" style={{ gridColumn: 'span 4' }}>
              <label htmlFor="qs-cohort">Cohort</label>
              <select
                id="qs-cohort"
                className="select"
                value={selectedCohortId}
                disabled={loaderData.mode === 'edit'}
                onChange={(e) => setSelectedCohortId(e.target.value)}
              >
                {loaderData.mode === 'new' ? <option value="">Select a cohort…</option> : null}
                {loaderData.cohortOptions.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </article>
        <QuestionSetEditor
          initial={initial}
          nameEditable
          onSave={handleSave}
          {...(loaderData.mode === 'edit' ? { onDelete: handleDelete } : {})}
          onCancel={() => navigate('/admin/settings/questions/competency')}
          saving={saving}
          formError={formError}
        />
      </SettingsShell>
    </>
  );
}
