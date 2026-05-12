import { useState } from 'react';
import {
  data,
  redirect,
  useActionData,
  useLoaderData,
  useNavigate,
  useNavigation,
} from 'react-router';
import type { Route } from './+types/admin.settings.questions.$setId';
import { requireAdmin } from '~/lib/admin-guard.server';
import {
  loadQuestionSet,
  saveQuestionSet,
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
  { title: `${loaderData?.set?.name ?? 'Question Set'} — IMPACT Admin` },
];

export async function loader({ request, params }: Route.LoaderArgs) {
  const { headers } = await requireAdmin(request);
  const setId = params.setId!;
  const set = await loadQuestionSet(setId);
  if (!set) throw new Response('Question set not found', { status: 404 });
  return data({ set }, { headers });
}

export async function action({ request, params }: Route.ActionArgs) {
  const { headers } = await requireAdmin(request);
  const setId = params.setId!;
  const formData = await request.formData();
  const raw = formData.get('payload');
  if (typeof raw !== 'string') {
    return data({ ok: false, error: 'Missing payload' }, { headers, status: 400 });
  }
  let parsed: QuestionSetEditorValue;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return data({ ok: false, error: 'Malformed payload' }, { headers, status: 400 });
  }
  try {
    await saveQuestionSet({
      setId,
      name: parsed.name,
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
  throw redirect('/admin/settings/questions?updated=1', { headers });
}

export default function QuestionSetDetail() {
  const { set } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const nav = useNavigation();
  const navigate = useNavigate();
  const saving = nav.state === 'submitting';
  const [formError, setFormError] = useState<string | null>(null);

  // Standard sets keep their seeded names; only competency-tier editors allow renaming.
  const nameEditable = false;

  function handleSave(next: QuestionSetEditorValue) {
    setFormError(null);
    const form = new FormData();
    form.set('payload', JSON.stringify(next));
    fetch(window.location.pathname, { method: 'POST', body: form })
      .then(async (res) => {
        if (res.redirected) {
          navigate(res.url.replace(window.location.origin, ''));
          return;
        }
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        if (body?.error) setFormError(body.error);
      })
      .catch((err: unknown) => setFormError(String(err)));
  }

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
            {set.name.toUpperCase()}
          </>
        }
        title={`${set.name}.`}
        sub="Edit questions, types, and options. Changes apply to new submissions."
      />
      <SettingsShell active="questions">
        <QuestionSetEditor
          initial={{
            name: set.name,
            minRequired: set.minRequired,
            allowMultiple: set.allowMultiple,
            questions: set.questions,
          }}
          nameEditable={nameEditable}
          onSave={handleSave}
          onCancel={() => navigate('/admin/settings/questions')}
          saving={saving}
          formError={formError ?? actionData?.error ?? null}
        />
      </SettingsShell>
    </>
  );
}
