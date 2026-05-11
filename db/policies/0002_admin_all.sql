-- Admins (role='admin' in JWT) can read/write every table.

DROP POLICY IF EXISTS admin_all_profiles ON public.profiles;
CREATE POLICY admin_all_profiles ON public.profiles FOR ALL TO authenticated
  USING ((auth.jwt() ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() ->> 'role') = 'admin');

DROP POLICY IF EXISTS admin_all_program_info ON public.program_info;
CREATE POLICY admin_all_program_info ON public.program_info FOR ALL TO authenticated
  USING ((auth.jwt() ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() ->> 'role') = 'admin');

DROP POLICY IF EXISTS admin_all_employers ON public.employers;
CREATE POLICY admin_all_employers ON public.employers FOR ALL TO authenticated
  USING ((auth.jwt() ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() ->> 'role') = 'admin');

DROP POLICY IF EXISTS admin_all_roles ON public.roles;
CREATE POLICY admin_all_roles ON public.roles FOR ALL TO authenticated
  USING ((auth.jwt() ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() ->> 'role') = 'admin');

DROP POLICY IF EXISTS admin_all_cohorts ON public.cohorts;
CREATE POLICY admin_all_cohorts ON public.cohorts FOR ALL TO authenticated
  USING ((auth.jwt() ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() ->> 'role') = 'admin');

DROP POLICY IF EXISTS admin_all_cohort_phases ON public.cohort_phases;
CREATE POLICY admin_all_cohort_phases ON public.cohort_phases FOR ALL TO authenticated
  USING ((auth.jwt() ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() ->> 'role') = 'admin');

DROP POLICY IF EXISTS admin_all_phases ON public.phases;
CREATE POLICY admin_all_phases ON public.phases FOR ALL TO authenticated
  USING ((auth.jwt() ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() ->> 'role') = 'admin');

DROP POLICY IF EXISTS admin_all_barriers ON public.barriers;
CREATE POLICY admin_all_barriers ON public.barriers FOR ALL TO authenticated
  USING ((auth.jwt() ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() ->> 'role') = 'admin');

DROP POLICY IF EXISTS admin_all_interns ON public.interns;
CREATE POLICY admin_all_interns ON public.interns FOR ALL TO authenticated
  USING ((auth.jwt() ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() ->> 'role') = 'admin');

DROP POLICY IF EXISTS admin_all_intern_entry_assessment ON public.intern_entry_assessment;
CREATE POLICY admin_all_intern_entry_assessment ON public.intern_entry_assessment FOR ALL TO authenticated
  USING ((auth.jwt() ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() ->> 'role') = 'admin');

DROP POLICY IF EXISTS admin_all_intern_entry_barriers ON public.intern_entry_barriers;
CREATE POLICY admin_all_intern_entry_barriers ON public.intern_entry_barriers FOR ALL TO authenticated
  USING ((auth.jwt() ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() ->> 'role') = 'admin');

DROP POLICY IF EXISTS admin_all_intern_employment_outcomes ON public.intern_employment_outcomes;
CREATE POLICY admin_all_intern_employment_outcomes ON public.intern_employment_outcomes FOR ALL TO authenticated
  USING ((auth.jwt() ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() ->> 'role') = 'admin');

DROP POLICY IF EXISTS admin_all_question_sets ON public.question_sets;
CREATE POLICY admin_all_question_sets ON public.question_sets FOR ALL TO authenticated
  USING ((auth.jwt() ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() ->> 'role') = 'admin');

DROP POLICY IF EXISTS admin_all_questions ON public.questions;
CREATE POLICY admin_all_questions ON public.questions FOR ALL TO authenticated
  USING ((auth.jwt() ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() ->> 'role') = 'admin');

DROP POLICY IF EXISTS admin_all_submissions ON public.assessment_submissions;
CREATE POLICY admin_all_submissions ON public.assessment_submissions FOR ALL TO authenticated
  USING ((auth.jwt() ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() ->> 'role') = 'admin');
