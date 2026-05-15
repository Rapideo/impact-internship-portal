-- Task #89: tighten cohorts.role_id and interns.role_id from ON DELETE SET NULL
-- to ON DELETE RESTRICT. The original schema (0000_initial_schema.sql) used
-- SET NULL so deleting a role silently cleared the referencing rows' role
-- pointer — losing referential information. The design spec calls for
-- RESTRICT: deletion must be refused while any cohort or intern still
-- references the role. The employer + admin role-delete routes catch
-- Postgres error 23503 (foreign_key_violation) and surface a friendly
-- "reassign first" message.
--
-- Idempotent: drops the existing constraint (if any) and re-adds with the
-- tighter on-delete behavior.
ALTER TABLE "cohorts"
	DROP CONSTRAINT IF EXISTS "cohorts_role_id_roles_id_fk";
ALTER TABLE "cohorts"
	ADD CONSTRAINT "cohorts_role_id_roles_id_fk"
		FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id")
		ON DELETE RESTRICT ON UPDATE NO ACTION;

ALTER TABLE "interns"
	DROP CONSTRAINT IF EXISTS "interns_role_id_roles_id_fk";
ALTER TABLE "interns"
	ADD CONSTRAINT "interns_role_id_roles_id_fk"
		FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id")
		ON DELETE RESTRICT ON UPDATE NO ACTION;
