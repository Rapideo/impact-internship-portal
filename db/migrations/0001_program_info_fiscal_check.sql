-- Task #49: enforce 1..12 range on program_info.fiscal_year_start_month at
-- the database level. The admin UI already constrains the input, but the
-- column was a bare integer with no domain check, so the DB would accept
-- nonsense values like 0, 13, or -1. This constraint mirrors the Drizzle
-- schema's `.check(...)` definition and is the source of truth.
ALTER TABLE "program_info"
	ADD CONSTRAINT "program_info_fiscal_year_start_month_check"
	CHECK ("fiscal_year_start_month" BETWEEN 1 AND 12);
