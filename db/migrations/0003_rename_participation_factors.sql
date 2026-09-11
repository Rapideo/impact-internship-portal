ALTER TABLE "barriers" RENAME TO "participation_factors";--> statement-breakpoint
ALTER TABLE "intern_entry_barriers" RENAME TO "intern_participation_factors";--> statement-breakpoint
ALTER TABLE "intern_participation_factors" RENAME COLUMN "barrier_id" TO "participation_factor_id";--> statement-breakpoint

-- Postgres keeps the OLD constraint names through a table rename, so rename them
-- explicitly to match what db/schema.ts now describes. Without this the names
-- drift from the drizzle snapshot and confuse later diffs.
ALTER TABLE "participation_factors" RENAME CONSTRAINT "barriers_pkey" TO "participation_factors_pkey";--> statement-breakpoint
ALTER TABLE "intern_participation_factors" RENAME CONSTRAINT "intern_entry_barriers_intern_id_barrier_id_pk" TO "intern_participation_factors_intern_id_participation_factor_id_pk";--> statement-breakpoint
ALTER TABLE "intern_participation_factors" RENAME CONSTRAINT "intern_entry_barriers_intern_id_interns_id_fk" TO "intern_participation_factors_intern_id_interns_id_fk";--> statement-breakpoint
ALTER TABLE "intern_participation_factors" RENAME CONSTRAINT "intern_entry_barriers_barrier_id_barriers_id_fk" TO "intern_participation_factors_participation_factor_id_participation_factors_id_fk";--> statement-breakpoint

-- Policies travel with a renamed table, so participation_factors still carries
-- policies literally named *_barriers. Drop them here so the rewritten policy
-- files in db/policies can recreate them under the new names. These cannot be
-- dropped from the policy files themselves: `DROP POLICY IF EXISTS x ON
-- public.barriers` would error, because IF EXISTS guards the policy, not the
-- table, and public.barriers no longer exists after this migration.
DROP POLICY IF EXISTS "admin_all_barriers" ON "public"."participation_factors";--> statement-breakpoint
DROP POLICY IF EXISTS "any_authenticated_reads_barriers" ON "public"."participation_factors";--> statement-breakpoint
DROP POLICY IF EXISTS "admin_all_intern_entry_barriers" ON "public"."intern_participation_factors";--> statement-breakpoint
DROP POLICY IF EXISTS "employer_read_entry_barriers" ON "public"."intern_participation_factors";
