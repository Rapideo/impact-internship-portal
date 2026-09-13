ALTER TABLE "interns" DROP CONSTRAINT "interns_first_initial_len";--> statement-breakpoint
DROP INDEX IF EXISTS "interns_identity_unique";--> statement-breakpoint
ALTER TABLE "interns" DROP COLUMN IF EXISTS "first_initial";--> statement-breakpoint
ALTER TABLE "interns" DROP COLUMN IF EXISTS "last_name";