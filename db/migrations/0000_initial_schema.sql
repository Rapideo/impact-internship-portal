CREATE TYPE "public"."assessment_type" AS ENUM('personal-goals', 'midpoint-reflection', 'participant-feedback', 'competency', 'exit-employer-survey');--> statement-breakpoint
CREATE TYPE "public"."question_set_kind" AS ENUM('standard', 'competency-core', 'competency-cohort', 'competency-intern');--> statement-breakpoint
CREATE TYPE "public"."question_type" AS ENUM('textarea', 'short-text', 'radio', 'checkbox-group', 'likert', 'competency-rubric-row');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('admin', 'employer');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "assessment_submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" "assessment_type" NOT NULL,
	"intern_id" uuid NOT NULL,
	"submitted_by" uuid,
	"phase" text,
	"answers" jsonb NOT NULL,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "submissions_phase_required" CHECK ((type = 'competency' AND phase IS NOT NULL) OR (type <> 'competency' AND phase IS NULL))
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "auth"."users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"email" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "barriers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"label" text NOT NULL,
	"sort_order" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "cohort_phases" (
	"cohort_id" uuid NOT NULL,
	"phase_id" uuid NOT NULL,
	"sort_order" integer NOT NULL,
	CONSTRAINT "cohort_phases_cohort_id_phase_id_pk" PRIMARY KEY("cohort_id","phase_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "cohorts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employer_id" uuid NOT NULL,
	"role_id" uuid,
	"name" text NOT NULL,
	"start_date" text,
	"end_date" text,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "employers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"contact_name" text,
	"contact_email" text,
	"phone" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "intern_employment_outcomes" (
	"intern_id" uuid PRIMARY KEY NOT NULL,
	"employed_90_day" boolean DEFAULT false NOT NULL,
	"employed_90_notes" text,
	"employed_180_day" boolean DEFAULT false NOT NULL,
	"employed_180_notes" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "intern_entry_assessment" (
	"intern_id" uuid PRIMARY KEY NOT NULL,
	"notes" text,
	"completed_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "intern_entry_barriers" (
	"intern_id" uuid NOT NULL,
	"barrier_id" uuid NOT NULL,
	CONSTRAINT "intern_entry_barriers_intern_id_barrier_id_pk" PRIMARY KEY("intern_id","barrier_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "interns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cohort_id" uuid NOT NULL,
	"role_id" uuid,
	"first_initial" text NOT NULL,
	"last_name" text NOT NULL,
	"start_date" text,
	"end_date" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "interns_first_initial_len" CHECK (char_length(first_initial) = 1)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "phases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"label" text NOT NULL,
	"sort_order" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "profiles" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"role" "user_role" NOT NULL,
	"employer_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "profiles_employer_required_if_employer" CHECK ((role = 'admin' AND employer_id IS NULL) OR (role = 'employer' AND employer_id IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "program_info" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"program_name" text NOT NULL,
	"organization_name" text,
	"contact_email" text,
	"phone" text,
	"default_cohort_length_weeks" integer,
	"fiscal_year_start_month" integer,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "program_info_singleton" CHECK (id = 1)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "question_sets" (
	"id" text PRIMARY KEY NOT NULL,
	"kind" "question_set_kind" NOT NULL,
	"name" text NOT NULL,
	"cohort_id" uuid,
	"intern_id" uuid,
	"min_required" integer,
	"allow_multiple" boolean DEFAULT false NOT NULL,
	"last_edited_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "qs_cohort_required" CHECK ((kind = 'competency-cohort' AND cohort_id IS NOT NULL) OR (kind <> 'competency-cohort' AND cohort_id IS NULL)),
	CONSTRAINT "qs_intern_required" CHECK ((kind = 'competency-intern' AND intern_id IS NOT NULL) OR (kind <> 'competency-intern' AND intern_id IS NULL))
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "questions" (
	"id" text PRIMARY KEY NOT NULL,
	"question_set_id" text NOT NULL,
	"type" "question_type" NOT NULL,
	"label" text NOT NULL,
	"helper_text" text,
	"required" boolean DEFAULT false NOT NULL,
	"sort_order" integer NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employer_id" uuid NOT NULL,
	"label" text NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "assessment_submissions" ADD CONSTRAINT "assessment_submissions_intern_id_interns_id_fk" FOREIGN KEY ("intern_id") REFERENCES "public"."interns"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "assessment_submissions" ADD CONSTRAINT "assessment_submissions_submitted_by_users_id_fk" FOREIGN KEY ("submitted_by") REFERENCES "auth"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cohort_phases" ADD CONSTRAINT "cohort_phases_cohort_id_cohorts_id_fk" FOREIGN KEY ("cohort_id") REFERENCES "public"."cohorts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cohort_phases" ADD CONSTRAINT "cohort_phases_phase_id_phases_id_fk" FOREIGN KEY ("phase_id") REFERENCES "public"."phases"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cohorts" ADD CONSTRAINT "cohorts_employer_id_employers_id_fk" FOREIGN KEY ("employer_id") REFERENCES "public"."employers"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cohorts" ADD CONSTRAINT "cohorts_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "intern_employment_outcomes" ADD CONSTRAINT "intern_employment_outcomes_intern_id_interns_id_fk" FOREIGN KEY ("intern_id") REFERENCES "public"."interns"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "intern_entry_assessment" ADD CONSTRAINT "intern_entry_assessment_intern_id_interns_id_fk" FOREIGN KEY ("intern_id") REFERENCES "public"."interns"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "intern_entry_barriers" ADD CONSTRAINT "intern_entry_barriers_intern_id_interns_id_fk" FOREIGN KEY ("intern_id") REFERENCES "public"."interns"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "intern_entry_barriers" ADD CONSTRAINT "intern_entry_barriers_barrier_id_barriers_id_fk" FOREIGN KEY ("barrier_id") REFERENCES "public"."barriers"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "interns" ADD CONSTRAINT "interns_cohort_id_cohorts_id_fk" FOREIGN KEY ("cohort_id") REFERENCES "public"."cohorts"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "interns" ADD CONSTRAINT "interns_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "profiles" ADD CONSTRAINT "profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "profiles" ADD CONSTRAINT "profiles_employer_id_employers_id_fk" FOREIGN KEY ("employer_id") REFERENCES "public"."employers"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "question_sets" ADD CONSTRAINT "question_sets_cohort_id_cohorts_id_fk" FOREIGN KEY ("cohort_id") REFERENCES "public"."cohorts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "question_sets" ADD CONSTRAINT "question_sets_intern_id_interns_id_fk" FOREIGN KEY ("intern_id") REFERENCES "public"."interns"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "questions" ADD CONSTRAINT "questions_question_set_id_question_sets_id_fk" FOREIGN KEY ("question_set_id") REFERENCES "public"."question_sets"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "roles" ADD CONSTRAINT "roles_employer_id_employers_id_fk" FOREIGN KEY ("employer_id") REFERENCES "public"."employers"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "submissions_intern_type_idx" ON "assessment_submissions" USING btree ("intern_id","type","deleted_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "submissions_competency_phase_idx" ON "assessment_submissions" USING btree ("intern_id","phase") WHERE type = 'competency';--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "submissions_one_per_intern_per_singleshot_type" ON "assessment_submissions" USING btree ("intern_id","type") WHERE type IN ('personal-goals', 'midpoint-reflection', 'participant-feedback') AND deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cohorts_employer_idx" ON "cohorts" USING btree ("employer_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cohorts_role_idx" ON "cohorts" USING btree ("role_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "interns_cohort_idx" ON "interns" USING btree ("cohort_id","deleted_at");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "interns_identity_unique" ON "interns" USING btree (lower(first_initial),lower(last_name),"cohort_id") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "profiles_employer_scope_idx" ON "profiles" USING btree ("employer_id") WHERE role = 'employer';--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "question_sets_cohort_idx" ON "question_sets" USING btree ("cohort_id") WHERE kind = 'competency-cohort';--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "question_sets_intern_idx" ON "question_sets" USING btree ("intern_id") WHERE kind = 'competency-intern';--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "questions_set_idx" ON "questions" USING btree ("question_set_id","sort_order");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "roles_employer_idx" ON "roles" USING btree ("employer_id");