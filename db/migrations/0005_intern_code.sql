-- Intern ID (spec 2026-09-11-intern-id-identity-design.md §5, PR A).
-- Hand-written: drizzle-kit's generated version adds the column NOT NULL in one
-- step, which fails on any database that already has interns. Add nullable,
-- backfill, then tighten. The snapshot records the destination (NOT NULL +
-- unique index), so `drizzle-kit generate` reports no changes afterwards.
ALTER TABLE "interns" ADD COLUMN "intern_code" text;--> statement-breakpoint
DO $$
DECLARE
  r RECORD;
  yy text;
  candidate text;
BEGIN
  FOR r IN SELECT id, start_date, created_at FROM interns WHERE intern_code IS NULL LOOP
    -- D3: year from start_date when it is a YYYY-MM-DD string, else the
    -- creation instant in the program timezone.
    yy := CASE
      WHEN r.start_date ~ '^\d{4}-\d{2}-\d{2}$' THEN substr(r.start_date, 3, 2)
      ELSE to_char(r.created_at AT TIME ZONE 'America/Indiana/Indianapolis', 'YY')
    END;
    LOOP
      -- D4: random 0001–9999; loop until unused.
      candidate := 'IMP-' || yy || '-' || lpad((1 + floor(random() * 9999))::int::text, 4, '0');
      EXIT WHEN NOT EXISTS (SELECT 1 FROM interns WHERE intern_code = candidate);
    END LOOP;
    UPDATE interns SET intern_code = candidate WHERE id = r.id;
  END LOOP;
END $$;--> statement-breakpoint
ALTER TABLE "interns" ALTER COLUMN "intern_code" SET NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "interns_intern_code_unique" ON "interns" USING btree ("intern_code");
