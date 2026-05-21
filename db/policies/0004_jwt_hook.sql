-- Custom Access Token Hook: copy profile.role + profile.employer_id into JWT claims.
-- Registered in Supabase Dashboard → Auth → Hooks → "Custom Access Token Hook".
--
-- IMPORTANT: We write the application role to a separate `user_role` claim
-- rather than overwriting the JWT's top-level `role` claim. PostgREST reads
-- the top-level `role` claim and does `SET LOCAL ROLE <value>` on every
-- request; Supabase Postgres only has `anon`, `authenticated`, and
-- `service_role` defined, so writing 'admin' or 'employer' there caused
-- `role "employer" does not exist` errors on every employer save action.
-- RLS policies and `decodeRoleFromJwtPayload` read `user_role` instead.

CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  claims jsonb;
  user_role text;
  user_employer_id uuid;
BEGIN
  -- Look up the profile for the user being issued a token.
  SELECT p.role, p.employer_id
    INTO user_role, user_employer_id
    FROM public.profiles p
   WHERE p.user_id = (event ->> 'user_id')::uuid;

  claims := event -> 'claims';

  IF user_role IS NOT NULL THEN
    claims := jsonb_set(claims, '{user_role}', to_jsonb(user_role));
  END IF;

  IF user_employer_id IS NOT NULL THEN
    claims := jsonb_set(claims, '{employer_id}', to_jsonb(user_employer_id::text));
  END IF;

  RETURN jsonb_set(event, '{claims}', claims);
END;
$$;

-- Grant the auth admin role permission to call this function.
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT SELECT ON public.profiles TO supabase_auth_admin;
