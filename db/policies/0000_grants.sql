-- Base table privileges for the Supabase JWT roles (anon / authenticated /
-- service_role).
--
-- WHY THIS FILE EXISTS
-- Supabase normally grants these privileges implicitly, via default privileges
-- attached to the table-owning role, when a table is created in the public
-- schema. Our tables are created by Drizzle migrations (`npm run db:migrate`),
-- and that implicit grant is owned by the local-stack Postgres image. Supabase
-- CLI v2.106/v2.107 changed the behaviour: freshly-migrated public tables no
-- longer auto-grant to anon/authenticated/service_role. The result was that
-- every RLS test (which does `SET LOCAL ROLE authenticated|anon|service_role`)
-- failed with `permission denied for table ...`, turning CI on main red — even
-- though the app itself was unaffected (it connects as the table-owning
-- postgres role via Drizzle, so it never relied on these grants).
--
-- Declaring the grants explicitly makes table privileges DETERMINISTIC,
-- independent of the CLI / image version. This is exactly what Supabase grants
-- by default, so it is a no-op on databases that already had the implicit
-- grants (prod + dev) — it only matters for freshly-bootstrapped databases
-- (CI's ephemeral `supabase start`, and any future `db:migrate` from scratch).
--
-- SECURITY: granting table privileges does NOT bypass RLS. A role may only
-- *attempt* a query; row visibility is still gated by the policies in
-- 0001-0004. This restores the prior (implicit) state — it does not loosen it.
--
-- ORDERING: named 0000_ so it runs before RLS is enabled (0001_) and policies
-- are attached (0002_-0004_). Idempotent: GRANT / ALTER DEFAULT PRIVILEGES can
-- be re-applied safely. Function grants are intentionally NOT set here — the
-- custom_access_token_hook's execute grant is owned by 0004_jwt_hook.sql.

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
