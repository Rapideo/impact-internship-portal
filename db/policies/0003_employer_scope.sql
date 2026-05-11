-- Employer scoping. Each table resolves its row to an employer_id
-- and matches against (auth.jwt() ->> 'employer_id')::uuid.

-- profiles: employers see their own profile only
CREATE POLICY employer_self_profile ON public.profiles FOR SELECT TO authenticated
  USING (
    (auth.jwt() ->> 'role') = 'employer'
    AND user_id = auth.uid()
  );

-- program_info: any authenticated user reads
CREATE POLICY any_authenticated_reads_program_info ON public.program_info FOR SELECT TO authenticated
  USING (true);

-- phases + barriers: any authenticated user reads (libraries are shared)
CREATE POLICY any_authenticated_reads_phases ON public.phases FOR SELECT TO authenticated
  USING (true);

CREATE POLICY any_authenticated_reads_barriers ON public.barriers FOR SELECT TO authenticated
  USING (true);

-- employers: employers see/update only their own employer row
CREATE POLICY employer_own_employer ON public.employers FOR ALL TO authenticated
  USING (
    (auth.jwt() ->> 'role') = 'employer'
    AND id = (auth.jwt() ->> 'employer_id')::uuid
  )
  WITH CHECK (
    (auth.jwt() ->> 'role') = 'employer'
    AND id = (auth.jwt() ->> 'employer_id')::uuid
  );

-- roles: scoped by employer_id
CREATE POLICY employer_own_roles ON public.roles FOR ALL TO authenticated
  USING (
    (auth.jwt() ->> 'role') = 'employer'
    AND employer_id = (auth.jwt() ->> 'employer_id')::uuid
  )
  WITH CHECK (
    (auth.jwt() ->> 'role') = 'employer'
    AND employer_id = (auth.jwt() ->> 'employer_id')::uuid
  );

-- cohorts: scoped by employer_id (read-only for employers in v1)
CREATE POLICY employer_read_own_cohorts ON public.cohorts FOR SELECT TO authenticated
  USING (
    (auth.jwt() ->> 'role') = 'employer'
    AND employer_id = (auth.jwt() ->> 'employer_id')::uuid
  );

-- cohort_phases: scoped via cohort
CREATE POLICY employer_read_own_cohort_phases ON public.cohort_phases FOR SELECT TO authenticated
  USING (
    (auth.jwt() ->> 'role') = 'employer'
    AND cohort_id IN (
      SELECT id FROM public.cohorts
      WHERE employer_id = (auth.jwt() ->> 'employer_id')::uuid
    )
  );

-- interns: scoped via cohort.employer_id
CREATE POLICY employer_read_own_interns ON public.interns FOR SELECT TO authenticated
  USING (
    (auth.jwt() ->> 'role') = 'employer'
    AND cohort_id IN (
      SELECT id FROM public.cohorts
      WHERE employer_id = (auth.jwt() ->> 'employer_id')::uuid
    )
  );

-- intern_entry_assessment: read-only for employers
CREATE POLICY employer_read_entry_assessment ON public.intern_entry_assessment FOR SELECT TO authenticated
  USING (
    (auth.jwt() ->> 'role') = 'employer'
    AND intern_id IN (
      SELECT i.id FROM public.interns i
      JOIN public.cohorts c ON c.id = i.cohort_id
      WHERE c.employer_id = (auth.jwt() ->> 'employer_id')::uuid
    )
  );

-- intern_entry_barriers: read-only for employers
CREATE POLICY employer_read_entry_barriers ON public.intern_entry_barriers FOR SELECT TO authenticated
  USING (
    (auth.jwt() ->> 'role') = 'employer'
    AND intern_id IN (
      SELECT i.id FROM public.interns i
      JOIN public.cohorts c ON c.id = i.cohort_id
      WHERE c.employer_id = (auth.jwt() ->> 'employer_id')::uuid
    )
  );

-- intern_employment_outcomes: read-only for employers
CREATE POLICY employer_read_outcomes ON public.intern_employment_outcomes FOR SELECT TO authenticated
  USING (
    (auth.jwt() ->> 'role') = 'employer'
    AND intern_id IN (
      SELECT i.id FROM public.interns i
      JOIN public.cohorts c ON c.id = i.cohort_id
      WHERE c.employer_id = (auth.jwt() ->> 'employer_id')::uuid
    )
  );

-- question_sets: employers can read sets relevant to their cohorts/interns
CREATE POLICY employer_read_question_sets ON public.question_sets FOR SELECT TO authenticated
  USING (
    (auth.jwt() ->> 'role') = 'employer'
    AND (
      kind IN ('standard', 'competency-core')
      OR (
        kind = 'competency-cohort'
        AND cohort_id IN (
          SELECT id FROM public.cohorts
          WHERE employer_id = (auth.jwt() ->> 'employer_id')::uuid
        )
      )
      OR (
        kind = 'competency-intern'
        AND intern_id IN (
          SELECT i.id FROM public.interns i
          JOIN public.cohorts c ON c.id = i.cohort_id
          WHERE c.employer_id = (auth.jwt() ->> 'employer_id')::uuid
        )
      )
    )
  );

-- questions: read whatever set is readable
CREATE POLICY employer_read_questions ON public.questions FOR SELECT TO authenticated
  USING (
    (auth.jwt() ->> 'role') = 'employer'
    AND question_set_id IN (
      SELECT id FROM public.question_sets WHERE
        kind IN ('standard', 'competency-core')
        OR (
          kind = 'competency-cohort'
          AND cohort_id IN (
            SELECT id FROM public.cohorts
            WHERE employer_id = (auth.jwt() ->> 'employer_id')::uuid
          )
        )
        OR (
          kind = 'competency-intern'
          AND intern_id IN (
            SELECT i.id FROM public.interns i
            JOIN public.cohorts c ON c.id = i.cohort_id
            WHERE c.employer_id = (auth.jwt() ->> 'employer_id')::uuid
          )
        )
    )
  );

-- assessment_submissions: employers read all for their interns; write only competency + exit-survey
CREATE POLICY employer_read_submissions ON public.assessment_submissions FOR SELECT TO authenticated
  USING (
    (auth.jwt() ->> 'role') = 'employer'
    AND intern_id IN (
      SELECT i.id FROM public.interns i
      JOIN public.cohorts c ON c.id = i.cohort_id
      WHERE c.employer_id = (auth.jwt() ->> 'employer_id')::uuid
    )
  );

CREATE POLICY employer_write_submissions ON public.assessment_submissions FOR INSERT TO authenticated
  WITH CHECK (
    (auth.jwt() ->> 'role') = 'employer'
    AND type IN ('competency', 'exit-employer-survey')
    AND intern_id IN (
      SELECT i.id FROM public.interns i
      JOIN public.cohorts c ON c.id = i.cohort_id
      WHERE c.employer_id = (auth.jwt() ->> 'employer_id')::uuid
    )
  );

CREATE POLICY employer_update_submissions ON public.assessment_submissions FOR UPDATE TO authenticated
  USING (
    (auth.jwt() ->> 'role') = 'employer'
    AND type IN ('competency', 'exit-employer-survey')
    AND intern_id IN (
      SELECT i.id FROM public.interns i
      JOIN public.cohorts c ON c.id = i.cohort_id
      WHERE c.employer_id = (auth.jwt() ->> 'employer_id')::uuid
    )
  )
  WITH CHECK (
    (auth.jwt() ->> 'role') = 'employer'
    AND type IN ('competency', 'exit-employer-survey')
    AND intern_id IN (
      SELECT i.id FROM public.interns i
      JOIN public.cohorts c ON c.id = i.cohort_id
      WHERE c.employer_id = (auth.jwt() ->> 'employer_id')::uuid
    )
  );
