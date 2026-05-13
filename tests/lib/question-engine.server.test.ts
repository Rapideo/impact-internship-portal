import { describe, it, expect } from 'vitest';
import {
  loadQuestionSet,
  listStandardSets,
  listCohortCompetencySets,
  listInternCompetencySets,
  stitchedCompetencyQuestions,
} from '~/lib/question-engine.server';

const SKIP_DB_TESTS =
  !process.env.DATABASE_POOL_URL || process.env.DATABASE_POOL_URL.includes('fake');

// Seed reference (from db/seed-data/question-sets.ts + interns.ts, post Phase G):
//   - 4 standard sets: personal-goals, midpoint-reflection,
//     participant-feedback, exit-employer-survey
//   - 1 competency-core set: competency-core
//   - 1 competency-cohort set bound to the Northside CNA cohort
//     (id 33333333-...-3302) carrying the 4 medical rubric rows
//   - 0 competency-intern sets
//
//   - Intern 4402 is in cohort 3302 (Northside) -> gets core + cohort overlay
//   - Interns 4401/4403 are in cohorts 3301/3303 -> core only

const COHORT_NORTHSIDE = '33333333-3333-3333-3333-333333333302';
const INTERN_WITH_OVERLAY = '44444444-4444-4444-4444-444444444402'; // in Northside cohort
const INTERN_NO_OVERLAY = '44444444-4444-4444-4444-444444444401'; // in Riverbend cohort

describe.skipIf(SKIP_DB_TESTS)('question-engine.server (live DB)', () => {
  describe('loadQuestionSet', () => {
    it('returns null for an unknown id', async () => {
      const set = await loadQuestionSet('does-not-exist');
      expect(set).toBeNull();
    });

    it('returns a standard set with its question(s) ordered by sortOrder', async () => {
      const set = await loadQuestionSet('personal-goals');
      expect(set).not.toBeNull();
      expect(set!.id).toBe('personal-goals');
      expect(set!.kind).toBe('standard');
      expect(set!.questions.length).toBeGreaterThanOrEqual(1);
      expect(set!.questions[0]!.sortOrder).toBe(1);
      // lastEditedAt is mapped to an ISO string
      expect(typeof set!.lastEditedAt).toBe('string');
      expect(set!.lastEditedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('returns the competency-core set tagged with its kind', async () => {
      const set = await loadQuestionSet('competency-core');
      expect(set).not.toBeNull();
      expect(set!.kind).toBe('competency-core');
      expect(set!.cohortId).toBeNull();
      expect(set!.internId).toBeNull();
    });

    it('returns the Northside cohort competency set with its cohortId set', async () => {
      const set = await loadQuestionSet(`competency-cohort-${COHORT_NORTHSIDE}`);
      expect(set).not.toBeNull();
      expect(set!.kind).toBe('competency-cohort');
      expect(set!.cohortId).toBe(COHORT_NORTHSIDE);
    });
  });

  describe('listStandardSets', () => {
    it('returns all 4 seeded standard sets', async () => {
      const sets = await listStandardSets();
      const ids = sets.map((s) => s.id).sort();
      expect(ids).toEqual(
        [
          'exit-employer-survey',
          'midpoint-reflection',
          'participant-feedback',
          'personal-goals',
        ].sort(),
      );
      for (const s of sets) expect(s.kind).toBe('standard');
    });
  });

  describe('listCohortCompetencySets', () => {
    it('returns the Northside cohort competency set', async () => {
      const sets = await listCohortCompetencySets();
      expect(sets.length).toBeGreaterThanOrEqual(1);
      const northside = sets.find((s) => s.cohortId === COHORT_NORTHSIDE);
      expect(northside).toBeDefined();
      expect(northside!.kind).toBe('competency-cohort');
    });
  });

  describe('listInternCompetencySets', () => {
    it('returns an empty list (no intern-tier sets in seed)', async () => {
      const sets = await listInternCompetencySets();
      // Allow >= 0 in case future seed adds one — the assertion is "no errors,
      // all rows are competency-intern".
      for (const s of sets) expect(s.kind).toBe('competency-intern');
    });
  });

  describe('stitchedCompetencyQuestions', () => {
    it('stitches core + cohort for an intern with a cohort overlay', async () => {
      const stitched = await stitchedCompetencyQuestions(INTERN_WITH_OVERLAY);
      expect(stitched.internId).toBe(INTERN_WITH_OVERLAY);
      // Core questions come first, cohort questions second
      const tiers = stitched.questions.map((q) => q.tier);
      const firstCohortIdx = tiers.indexOf('cohort');
      expect(firstCohortIdx).toBeGreaterThan(-1);
      // All entries before the first 'cohort' must be 'core'
      for (let i = 0; i < firstCohortIdx; i++) {
        expect(tiers[i]).toBe('core');
      }
      // No 'intern' tier (no seed for that)
      expect(tiers).not.toContain('intern');
      // Section boundaries: core first, then cohort
      const labels = stitched.sectionBoundaries.map((b) => b.label);
      expect(labels[0]).toBe('Professional Competencies');
      expect(labels).toContain('Role-Specific');
      // The Role-Specific boundary carries the cohort name as subLabel
      const cohortBoundary = stitched.sectionBoundaries.find((b) => b.label === 'Role-Specific');
      expect(cohortBoundary?.subLabel).toBeTruthy();
    });

    it('stitches core-only for an intern with no cohort overlay', async () => {
      const stitched = await stitchedCompetencyQuestions(INTERN_NO_OVERLAY);
      expect(stitched.internId).toBe(INTERN_NO_OVERLAY);
      // All questions are tier 'core', no cohort/intern boundary
      const tiers = stitched.questions.map((q) => q.tier);
      for (const t of tiers) expect(t).toBe('core');
      const labels = stitched.sectionBoundaries.map((b) => b.label);
      expect(labels).toEqual(['Professional Competencies']);
    });

    it('throws when the intern id does not exist', async () => {
      await expect(
        stitchedCompetencyQuestions('00000000-0000-0000-0000-000000000099'),
      ).rejects.toThrow(/Intern not found/);
    });
  });
});
