CREATE TABLE IF NOT EXISTS "identity_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ip" text NOT NULL,
	"attempted_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "identity_attempts_ip_time_idx" ON "identity_attempts" USING btree ("ip","attempted_at");
--> statement-breakpoint
ALTER TABLE "identity_attempts" ENABLE ROW LEVEL SECURITY;