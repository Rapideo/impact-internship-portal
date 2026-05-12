import { useState } from 'react';
import { data, redirect, useLoaderData, useNavigate } from 'react-router';
import { and, eq, inArray, isNull, notInArray } from 'drizzle-orm';
import type { Route } from './+types/admin.settings.questions.competency.intern.$internId';
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
      loaderData?.mode === 'edit' && loaderData?.boundInternName
        ? `${loaderData.boundInternName} — Intern Competency — IMPACT Admin`
        : 'New Intern Competency — IMPACT Admin',
  },
];

function competencyInternSetId(internId: string): string {
  return `competency-intern-${internId}`;
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const { headers } = await requireAdmin(request);
  const internIdParam = params.internId!;
  const isNew = internIdParam === 'new';

  const existingInternIds = (
    await db
      .select({ internId: schema.questionSets.internId })
      .from(schema.questionSets)
      .where(eq(schema.questionSets.kind, 'competency-intern'))
  )
    .map((r) => r.internId)
    .filter((s): s is string => !!s);

  if (isNew) {
    const baseWhere = isNull(schema.interns.deletedAt);
    const available =
      existingInternIds.length === 0
        ? await db
            .select({
              id: schema.interns.id,
              firstInitial: schema.interns.firstInitial,
              lastName: schema.interns.lastName,
              cohortId: schema.interns.cohortId,
            })
            .from(schema.interns)
            .where(baseWhere)
        : await db
            .select({
              id: schema.interns.id,
              firstInitial: schema.interns.firstInitial,
              lastName: schema.interns.lastName,
              cohortId: schema.interns.cohortId,
            })
            .from(schema.interns)
            .where(and(baseWhere, notInArray(schema.interns.id, existingInternIds)));
    const cohorts = available.length
      ? await db
          .select({ id: schema.cohorts.id, name: schema.cohorts.name })
          .from(schema.cohorts)
          .where(
            inArray(
              schema.cohorts.id,
              available.map((a) => a.cohortId),
            ),
          )
      : [];
    const cohortIdx = new Map(cohorts.map((c) => [c.id, c.name]));
    return data(
      {
        mode: 'new' as const,
        internOptions: available.map((i) => ({
          id: i.id,
          label: `${i.firstInitial}. ${i.lastName} (${cohortIdx.get(i.cohortId) ?? '—'})`,
        })),
        set: null,
        boundInternName: null as string | null,
      },
      { headers },
    );
  }

  const internRows = await db
    .select({
      id: schema.interns.id,
      firstInitial: schema.interns.firstInitial,
      lastName: schema.interns.lastName,
      cohortId: schema.interns.cohortId,
    })
    .from(schema.interns)
    .where(eq(schema.interns.id, internIdParam));
  if (internRows.length === 0) throw new Response('Intern not found', { status: 404 });
  const intern = internRows[0]!;
  const cohortName =
    (
      await db
        .select({ name: schema.cohorts.name })
        .from(schema.cohorts)
        .where(eq(schema.cohorts.id, intern.cohortId))
    )[0]?.name ?? '—';
  const set = await loadQuestionSet(competencyInternSetId(internIdParam));
  return data(
    {
      mode: 'edit' as const,
      internOptions: [
        {
          id: intern.id,
          label: `${intern.firstInitial}. ${intern.lastName} (${cohortName})`,
        },
      ],
      set,
      boundInternName: `${intern.firstInitial}. ${intern.lastName}` as string | null,
    },
    { headers },
  );
}

export async function action({ request, params }: Route.ActionArgs) {
  const { headers } = await requireAdmin(request);
  const internIdParam = params.internId!;
  const formData = await request.formData();
  const op = formData.get('op');

  if (op === 'delete') {
    if (internIdParam === 'new') {
      return data({ ok: false, error: 'Cannot delete an unsaved set' }, { headers, status: 400 });
    }
    await deleteQuestionSet(competencyInternSetId(internIdParam));
    throw redirect('/admin/settings/questions/competency?deleted=1', { headers });
  }

  const raw = formData.get('payload');
  const chosenInternId = formData.get('internId');
  if (typeof raw !== 'string') {
    return data({ ok: false, error: 'Missing payload' }, { headers, status: 400 });
  }
  let parsed: QuestionSetEditorValue;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return data({ ok: false, error: 'Malformed payload' }, { headers, status: 400 });
  }

  const effectiveInternId =
    internIdParam === 'new'
      ? typeof chosenInternId === 'string'
        ? chosenInternId
        : ''
      : internIdParam;
  if (!effectiveInternId) {
    return data({ ok: false, error: 'Please select an intern.' }, { headers, status: 400 });
  }

  try {
    await saveQuestionSet({
      setId: competencyInternSetId(effectiveInternId),
      kind: 'competency-intern',
      name: parsed.name,
      internId: effectiveInternId,
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

export default function CompetencyInternEditor() {
  const loaderData = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const [selectedInternId, setSelectedInternId] = useState(
    loaderData.mode === 'edit' ? (loaderData.internOptions[0]?.id ?? '') : '',
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
    : { name: 'Intern Questions', minRequired: 0, allowMultiple: false, questions: [] };

  function handleSave(value: QuestionSetEditorValue) {
    if (loaderData.mode === 'new' && !selectedInternId) {
      setFormError('Please select an intern.');
      return;
    }
    setFormError(null);
    setSaving(true);
    const form = new FormData();
    form.set('payload', JSON.stringify(value));
    if (loaderData.mode === 'new') form.set('internId', selectedInternId);
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
    if (!confirm("Delete this intern's competency set? Core and other tiers are unaffected.")) {
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
      ? (loaderData.boundInternName ?? 'Intern Questions')
      : 'New Intern Questions';

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
        sub="Intern-specific competencies tailored to one intern's learning goals. Stitched after Core + cohort tiers at assessment time."
      />
      <SettingsShell active="questions">
        <article className="qs-editor-card">
          <div className="qs-editor-card__head">
            <h2 className="qs-editor-card__title">Set Configuration</h2>
            <span className="micro-label">SET INFO</span>
          </div>
          <div className="id-grid id-grid--4">
            <div className="field" style={{ gridColumn: 'span 4' }}>
              <label htmlFor="qs-intern">Intern</label>
              <select
                id="qs-intern"
                className="select"
                value={selectedInternId}
                disabled={loaderData.mode === 'edit'}
                onChange={(e) => setSelectedInternId(e.target.value)}
              >
                {loaderData.mode === 'new' ? <option value="">Select an intern…</option> : null}
                {loaderData.internOptions.map((opt) => (
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
