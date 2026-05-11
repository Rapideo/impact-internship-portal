/* eslint-disable @typescript-eslint/no-unused-vars */
// NOTE: unused-vars disabled because this file is built incrementally
// (Task 22 part 1, Task 23 part 2). The pragma is removed in Task 23
// once every imported symbol is consumed.
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
  (t) => ({
    singleton: check('program_info_singleton', sql`id = 1`),
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
    roleId: uuid('role_id').references(() => roles.id, { onDelete: 'set null' }),
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
