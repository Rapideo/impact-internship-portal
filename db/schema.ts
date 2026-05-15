import {
  pgTable,
  pgSchema,
  pgEnum,
  uuid,
  text,
  timestamp,
  boolean,
  integer,
  jsonb,
  primaryKey,
  uniqueIndex,
  index,
  check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { relations } from 'drizzle-orm';

/* ============================================================ */
/* Auth schema (managed by Supabase — read-only reference)      */
/* ============================================================ */

const authSchema = pgSchema('auth');

export const authUsers = authSchema.table('users', {
  id: uuid('id').primaryKey(),
  email: text('email'),
});

/* ============================================================ */
/* Enums                                                         */
/* ============================================================ */

export const userRole = pgEnum('user_role', ['admin', 'employer']);

export const questionSetKind = pgEnum('question_set_kind', [
  'standard',
  'competency-core',
  'competency-cohort',
  'competency-intern',
]);

export const questionType = pgEnum('question_type', [
  'textarea',
  'short-text',
  'radio',
  'checkbox-group',
  'likert',
  'competency-rubric-row',
]);

export const assessmentType = pgEnum('assessment_type', [
  'personal-goals',
  'midpoint-reflection',
  'participant-feedback',
  'competency',
  'exit-employer-survey',
]);

/* ============================================================ */
/* Profiles (1:1 with auth.users)                                */
/* ============================================================ */

export const profiles = pgTable(
  'profiles',
  {
    userId: uuid('user_id')
      .primaryKey()
      .references(() => authUsers.id, { onDelete: 'cascade' }),
    role: userRole('role').notNull(),
    employerId: uuid('employer_id').references(() => employers.id, { onDelete: 'restrict' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    employerScopeIdx: index('profiles_employer_scope_idx')
      .on(t.employerId)
      .where(sql`role = 'employer'`),
    employerRequiredIfEmployer: check(
      'profiles_employer_required_if_employer',
      sql`(role = 'admin' AND employer_id IS NULL) OR (role = 'employer' AND employer_id IS NOT NULL)`,
    ),
  }),
);

/* ============================================================ */
/* Program Info (singleton)                                      */
/* ============================================================ */

export const programInfo = pgTable(
  'program_info',
  {
    id: integer('id').primaryKey().default(1),
    programName: text('program_name').notNull(),
    organizationName: text('organization_name'),
    contactEmail: text('contact_email'),
    phone: text('phone'),
    defaultCohortLengthWeeks: integer('default_cohort_length_weeks'),
    fiscalYearStartMonth: integer('fiscal_year_start_month'),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (_t) => ({
    singleton: check('program_info_singleton', sql`id = 1`),
    fiscalYearStartMonthRange: check(
      'program_info_fiscal_year_start_month_check',
      sql`fiscal_year_start_month BETWEEN 1 AND 12`,
    ),
  }),
);

/* ============================================================ */
/* Employers + Roles + Cohorts                                   */
/* ============================================================ */

export const employers = pgTable('employers', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  contactName: text('contact_name'),
  contactEmail: text('contact_email'),
  phone: text('phone'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const roles = pgTable(
  'roles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    employerId: uuid('employer_id')
      .notNull()
      .references(() => employers.id, { onDelete: 'cascade' }),
    label: text('label').notNull(),
    description: text('description'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    employerIdx: index('roles_employer_idx').on(t.employerId),
  }),
);

export const cohorts = pgTable(
  'cohorts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    employerId: uuid('employer_id')
      .notNull()
      .references(() => employers.id, { onDelete: 'cascade' }),
    roleId: uuid('role_id').references(() => roles.id, { onDelete: 'restrict' }),
    name: text('name').notNull(),
    startDate: text('start_date'),
    endDate: text('end_date'),
    description: text('description'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    employerIdx: index('cohorts_employer_idx').on(t.employerId),
    roleIdx: index('cohorts_role_idx').on(t.roleId),
  }),
);

/* ============================================================ */
/* Phases + Barriers (program-wide libraries)                    */
/* ============================================================ */

export const phases = pgTable('phases', {
  id: uuid('id').primaryKey().defaultRandom(),
  label: text('label').notNull(),
  sortOrder: integer('sort_order').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const barriers = pgTable('barriers', {
  id: uuid('id').primaryKey().defaultRandom(),
  label: text('label').notNull(),
  sortOrder: integer('sort_order').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const cohortPhases = pgTable(
  'cohort_phases',
  {
    cohortId: uuid('cohort_id')
      .notNull()
      .references(() => cohorts.id, { onDelete: 'cascade' }),
    phaseId: uuid('phase_id')
      .notNull()
      .references(() => phases.id, { onDelete: 'cascade' }),
    sortOrder: integer('sort_order').notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.cohortId, t.phaseId] }),
  }),
);

/* ============================================================ */
/* Interns                                                       */
/* ============================================================ */

export const interns = pgTable(
  'interns',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    cohortId: uuid('cohort_id')
      .notNull()
      .references(() => cohorts.id, { onDelete: 'restrict' }),
    roleId: uuid('role_id').references(() => roles.id, { onDelete: 'restrict' }),
    firstInitial: text('first_initial').notNull(),
    lastName: text('last_name').notNull(),
    startDate: text('start_date'),
    endDate: text('end_date'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => ({
    firstInitialLen: check('interns_first_initial_len', sql`char_length(first_initial) = 1`),
    cohortIdx: index('interns_cohort_idx').on(t.cohortId, t.deletedAt),
    identityIdx: uniqueIndex('interns_identity_unique')
      .on(sql`lower(first_initial)`, sql`lower(last_name)`, t.cohortId)
      .where(sql`deleted_at IS NULL`),
  }),
);

export const internEntryAssessment = pgTable('intern_entry_assessment', {
  internId: uuid('intern_id')
    .primaryKey()
    .references(() => interns.id, { onDelete: 'cascade' }),
  notes: text('notes'),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const internEntryBarriers = pgTable(
  'intern_entry_barriers',
  {
    internId: uuid('intern_id')
      .notNull()
      .references(() => interns.id, { onDelete: 'cascade' }),
    barrierId: uuid('barrier_id')
      .notNull()
      .references(() => barriers.id, { onDelete: 'cascade' }),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.internId, t.barrierId] }),
  }),
);

export const internEmploymentOutcomes = pgTable('intern_employment_outcomes', {
  internId: uuid('intern_id')
    .primaryKey()
    .references(() => interns.id, { onDelete: 'cascade' }),
  employed90Day: boolean('employed_90_day').notNull().default(false),
  employed90Notes: text('employed_90_notes'),
  employed180Day: boolean('employed_180_day').notNull().default(false),
  employed180Notes: text('employed_180_notes'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

/* ============================================================ */
/* Question Sets + Questions                                     */
/* ============================================================ */

export const questionSets = pgTable(
  'question_sets',
  {
    id: text('id').primaryKey(),
    kind: questionSetKind('kind').notNull(),
    name: text('name').notNull(),
    cohortId: uuid('cohort_id').references(() => cohorts.id, { onDelete: 'cascade' }),
    internId: uuid('intern_id').references(() => interns.id, { onDelete: 'cascade' }),
    minRequired: integer('min_required'),
    allowMultiple: boolean('allow_multiple').notNull().default(false),
    lastEditedAt: timestamp('last_edited_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    kindCohortIdx: index('question_sets_cohort_idx')
      .on(t.cohortId)
      .where(sql`kind = 'competency-cohort'`),
    kindInternIdx: index('question_sets_intern_idx')
      .on(t.internId)
      .where(sql`kind = 'competency-intern'`),
    cohortRequiredForCohortKind: check(
      'qs_cohort_required',
      sql`(kind = 'competency-cohort' AND cohort_id IS NOT NULL) OR (kind <> 'competency-cohort' AND cohort_id IS NULL)`,
    ),
    internRequiredForInternKind: check(
      'qs_intern_required',
      sql`(kind = 'competency-intern' AND intern_id IS NOT NULL) OR (kind <> 'competency-intern' AND intern_id IS NULL)`,
    ),
  }),
);

export const questions = pgTable(
  'questions',
  {
    id: text('id').primaryKey(),
    questionSetId: text('question_set_id')
      .notNull()
      .references(() => questionSets.id, { onDelete: 'cascade' }),
    type: questionType('type').notNull(),
    label: text('label').notNull(),
    helperText: text('helper_text'),
    required: boolean('required').notNull().default(false),
    sortOrder: integer('sort_order').notNull(),
    config: jsonb('config').notNull().default({}),
  },
  (t) => ({
    setIdx: index('questions_set_idx').on(t.questionSetId, t.sortOrder),
  }),
);

/* ============================================================ */
/* Assessment Submissions                                        */
/* ============================================================ */

export const assessmentSubmissions = pgTable(
  'assessment_submissions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    type: assessmentType('type').notNull(),
    internId: uuid('intern_id')
      .notNull()
      .references(() => interns.id, { onDelete: 'restrict' }),
    submittedBy: uuid('submitted_by').references(() => authUsers.id, { onDelete: 'set null' }),
    phase: text('phase'),
    answers: jsonb('answers').notNull(),
    submittedAt: timestamp('submitted_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => ({
    internTypeIdx: index('submissions_intern_type_idx').on(t.internId, t.type, t.deletedAt),
    competencyPhaseIdx: index('submissions_competency_phase_idx')
      .on(t.internId, t.phase)
      .where(sql`type = 'competency'`),
    uniqueOneShot: uniqueIndex('submissions_one_per_intern_per_singleshot_type')
      .on(t.internId, t.type)
      .where(
        sql`type IN ('personal-goals', 'midpoint-reflection', 'participant-feedback') AND deleted_at IS NULL`,
      ),
    phaseRequiredForCompetency: check(
      'submissions_phase_required',
      sql`(type = 'competency' AND phase IS NOT NULL) OR (type <> 'competency' AND phase IS NULL)`,
    ),
  }),
);

/* ============================================================ */
/* Drizzle relations (for the relational query API)              */
/* ============================================================ */

export const profilesRelations = relations(profiles, ({ one }) => ({
  employer: one(employers, {
    fields: [profiles.employerId],
    references: [employers.id],
  }),
}));
