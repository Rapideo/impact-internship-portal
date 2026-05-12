import { Form, Link, redirect, useActionData, useLoaderData, useNavigation } from 'react-router';
import { useEffect } from 'react';
import type { Route } from './+types/admin.settings.phases';
import { requireAdmin } from '~/lib/admin-guard.server';
import { db } from '~/lib/db.server';
import { listPhases } from '~/lib/admin-queries.server';
import { phases } from '../../db/schema';
import { eq, inArray } from 'drizzle-orm';
import { parseInlineRows } from '~/lib/validation';
import { PageHead } from '~/components/PageHead';
import { SettingsShell } from '~/components/SettingsShell';
import { ActionBar } from '~/components/ActionBar';
import { InlineEditableList } from '~/components/InlineEditableList';
import { useToast } from '~/components/ToastProvider';

export const meta: Route.MetaFunction = () => [
  { title: 'Assessment Phases — Settings — IMPACT Admin' },
];

export async function loader({ request }: Route.LoaderArgs) {
  const { headers } = await requireAdmin(request);
  const rows = await listPhases(db);
  return Response.json({ rows: rows.map((r) => ({ id: r.id, label: r.label })) }, { headers });
}

export async function action({ request }: Route.ActionArgs) {
  const { headers } = await requireAdmin(request);
  const fd = await request.formData();
  const { rows, errors, errorIndices } = parseInlineRows(fd, 'phases');
  if (errors.length > 0) {
    return Response.json({ errors, errorIndices, rows }, { headers, status: 400 });
  }
  await db.transaction(async (tx) => {
    const keptIds = rows.map((r) => r.id).filter((id): id is string => !!id);
    // Delete rows the user removed (cascade FK clears cohort_phases for those).
    if (keptIds.length > 0) {
      const existing = await tx.select({ id: phases.id }).from(phases);
      const toDelete = existing.map((e) => e.id).filter((id) => !keptIds.includes(id));
      if (toDelete.length > 0) {
        await tx.delete(phases).where(inArray(phases.id, toDelete));
      }
    } else {
      await tx.delete(phases);
    }
    // Upsert each row in submitted order; rewrite sortOrder. Updates preserve
    // FK references in cohort_phases when labels/order change.
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i]!;
      if (r.id) {
        await tx
          .update(phases)
          .set({ label: r.label, sortOrder: i + 1 })
          .where(eq(phases.id, r.id));
      } else {
        await tx.insert(phases).values({ label: r.label, sortOrder: i + 1 });
      }
    }
  });
  throw redirect('/admin/settings/phases?saved=1', { headers });
}

export default function PhasesSettings() {
  const { rows } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const nav = useNavigation();
  const toast = useToast();
  useEffect(() => {
    if (actionData && 'errors' in actionData && actionData.errors.length > 0) {
      toast.show({
        kind: 'danger',
        label: 'CHECK FIELDS',
        message: 'Please fix the highlighted rows.',
      });
    }
  }, [actionData, toast]);
  const initial = (
    actionData && 'rows' in actionData
      ? actionData.rows.map((r: { id: string | null; label: string }) => ({
          id: r.id ?? '',
          label: r.label,
        }))
      : rows
  ) as { id: string; label: string }[];
  return (
    <>
      <PageHead
        breadcrumb="ADMIN / SETTINGS / ASSESSMENT PHASES"
        title="ASSESSMENT PHASES."
        sub="Phases used by the Competency Assessment. Each cohort selects which phases apply to it."
      />
      <SettingsShell active="phases">
        <Form method="post">
          <div className="detail-header" style={{ marginTop: 0 }}>
            <h2 className="detail-header__title">Assessment Phases</h2>
          </div>
          <InlineEditableList
            key={
              initial.map((r) => r.id).join(',') + ':' + (actionData?.errorIndices?.join(',') ?? '')
            }
            initial={initial}
            addLabel="+ Add Phase"
            name="phases"
            errorIndices={actionData?.errorIndices}
          />
          <ActionBar status="ASSESSMENT PHASES · EDIT">
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
