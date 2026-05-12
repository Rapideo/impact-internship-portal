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
import type { Route } from './+types/admin.settings.barriers';
import { requireAdmin } from '~/lib/admin-guard.server';
import { db } from '~/lib/db.server';
import { listBarriers } from '~/lib/admin-queries.server';
import { barriers } from '../../db/schema';
import { eq, inArray } from 'drizzle-orm';
import { parseInlineRows } from '~/lib/validation';
import { PageHead } from '~/components/PageHead';
import { SettingsShell } from '~/components/SettingsShell';
import { ActionBar } from '~/components/ActionBar';
import { InlineEditableList } from '~/components/InlineEditableList';
import { useToast } from '~/components/ToastProvider';

export const meta: Route.MetaFunction = () => [{ title: 'Barriers — Settings — IMPACT Admin' }];

export async function loader({ request }: Route.LoaderArgs) {
  const { headers } = await requireAdmin(request);
  const rows = await listBarriers(db);
  return data({ rows: rows.map((r) => ({ id: r.id, label: r.label })) }, { headers });
}

export async function action({ request }: Route.ActionArgs) {
  const { headers } = await requireAdmin(request);
  const fd = await request.formData();
  const { rows, errors, errorIndices } = parseInlineRows(fd, 'barriers');
  if (errors.length > 0) {
    return data({ errors, errorIndices, rows }, { headers, status: 400 });
  }
  await db.transaction(async (tx) => {
    const keptIds = rows.map((r) => r.id).filter((id): id is string => !!id);
    // Delete rows the user removed (cascade FK clears intern_entry_barriers for those).
    if (keptIds.length > 0) {
      const existing = await tx.select({ id: barriers.id }).from(barriers);
      const toDelete = existing.map((e) => e.id).filter((id) => !keptIds.includes(id));
      if (toDelete.length > 0) {
        await tx.delete(barriers).where(inArray(barriers.id, toDelete));
      }
    } else {
      await tx.delete(barriers);
    }
    // Upsert each row in submitted order; rewrite sortOrder. Updates preserve
    // FK references in intern_entry_barriers when labels/order change.
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i]!;
      if (r.id) {
        await tx
          .update(barriers)
          .set({ label: r.label, sortOrder: i + 1 })
          .where(eq(barriers.id, r.id));
      } else {
        await tx.insert(barriers).values({ label: r.label, sortOrder: i + 1 });
      }
    }
  });
  throw redirect('/admin/settings/barriers?saved=1', { headers });
}

export default function BarriersSettings() {
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
        breadcrumb="ADMIN / SETTINGS / BARRIERS"
        title="BARRIERS."
        sub="Entry Assessment barrier checklist used on every intern record."
      />
      <SettingsShell active="barriers">
        <Form method="post">
          <div className="detail-header" style={{ marginTop: 0 }}>
            <h2 className="detail-header__title">Entry-Assessment Barriers</h2>
          </div>
          <InlineEditableList
            key={
              initial.map((r) => r.id).join(',') + ':' + (actionData?.errorIndices?.join(',') ?? '')
            }
            initial={initial}
            addLabel="+ Add Barrier"
            name="barriers"
            errorIndices={actionData?.errorIndices}
          />
          <ActionBar status="BARRIERS · EDIT">
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
