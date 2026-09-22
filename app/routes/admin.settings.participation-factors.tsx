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
import type { Route } from './+types/admin.settings.participation-factors';
import { requireAdmin } from '~/lib/admin-guard.server';
import { db } from '~/lib/db.server';
import { listParticipationFactors } from '~/lib/admin-queries.server';
import { participationFactors } from '../../db/schema';
import { eq, inArray } from 'drizzle-orm';
import { parseInlineRows } from '~/lib/validation';
import { PageHead } from '~/components/PageHead';
import { SettingsShell } from '~/components/SettingsShell';
import { ActionBar } from '~/components/ActionBar';
import { InlineEditableList } from '~/components/InlineEditableList';
import { useToast } from '~/components/ToastProvider';

export const meta: Route.MetaFunction = () => [
  { title: 'Participation Factors — Settings — IMPACT Admin' },
];

export async function loader({ request }: Route.LoaderArgs) {
  const { headers } = await requireAdmin(request);
  const rows = await listParticipationFactors(db);
  return data(
    { rows: rows.map((r) => ({ id: r.id, label: r.label, description: r.description })) },
    { headers },
  );
}

export async function action({ request }: Route.ActionArgs) {
  const { headers } = await requireAdmin(request);
  const fd = await request.formData();
  const { rows, errors, errorIndices } = parseInlineRows(fd, 'participationFactors');
  if (errors.length > 0) {
    return data({ errors, errorIndices, rows }, { headers, status: 400 });
  }
  await db.transaction(async (tx) => {
    const keptIds = rows.map((r) => r.id).filter((id): id is string => !!id);
    // Delete rows the user removed (cascade FK clears intern_participation_factors for those).
    if (keptIds.length > 0) {
      const existing = await tx.select({ id: participationFactors.id }).from(participationFactors);
      const toDelete = existing.map((e) => e.id).filter((id) => !keptIds.includes(id));
      if (toDelete.length > 0) {
        await tx.delete(participationFactors).where(inArray(participationFactors.id, toDelete));
      }
    } else {
      await tx.delete(participationFactors);
    }
    // Upsert each row in submitted order; rewrite sortOrder. Updates preserve
    // FK references in intern_participation_factors when labels/order change.
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i]!;
      if (r.id) {
        await tx
          .update(participationFactors)
          .set({ label: r.label, description: r.description, sortOrder: i + 1 })
          .where(eq(participationFactors.id, r.id));
      } else {
        await tx
          .insert(participationFactors)
          .values({ label: r.label, description: r.description, sortOrder: i + 1 });
      }
    }
  });
  throw redirect('/admin/settings/participation-factors?saved=1', { headers });
}

export default function ParticipationFactorsSettings() {
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
      ? actionData.rows.map(
          (r: { id: string | null; label: string; description: string | null }) => ({
            id: r.id ?? '',
            label: r.label,
            description: r.description,
          }),
        )
      : rows
  ) as { id: string; label: string; description: string | null }[];
  return (
    <>
      <PageHead
        breadcrumb="ADMIN / SETTINGS / PARTICIPATION FACTORS"
        title="PARTICIPATION FACTORS."
        sub="The Entry Assessment checklist on every intern record. Checking a factor there means it applied to that intern's participation; unchecked means it did not."
      />
      <SettingsShell active="participation-factors">
        <Form method="post">
          <div className="detail-header" style={{ marginTop: 0 }}>
            <h2 className="detail-header__title">Entry Assessment Participation Factors</h2>
          </div>
          <InlineEditableList
            key={
              initial.map((r) => r.id).join(',') + ':' + (actionData?.errorIndices?.join(',') ?? '')
            }
            initial={initial}
            addLabel="+ Add Participation Factor"
            name="participationFactors"
            errorIndices={actionData?.errorIndices}
            withDescription
          />
          <ActionBar status="PARTICIPATION FACTORS · EDIT">
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
