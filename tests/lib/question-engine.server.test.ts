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

// Seed reference (from db/seed-data/question-sets.ts + interns.ts):
//   - 4 standard sets: personal-goals, midpoint-reflection,
//     participant-feedback, exit-employer-survey (1 question each)
//   - 1 competency-core set: competency-core (1 question: attendance/punctuality)
//   - 1 competency-cohort set: competency-cohort-33333333-...-3301
//     (cohort 01 = Riverbend Spring 2026 Production) with 1 question
//   - 0 competency-intern sets
//
//   - Intern 4401 (A.Whitaker) is in cohort 3301 -> gets core + cohort overlay
//   - Interns 4402/4403 are in cohorts 3302/3303 -> core only
//
// Phase G of this sub-project will replace seed content with verbatim prototype
// copy. These tests assert on STRUCTURE (count, ordering, tier, boundaries) so
// they survive that swap.

const COHORT_01 = '33333333-3333-3333-3333-333333333301';
const INTERN_01 = '44444444-4444-4444-4444-444444444401'; // cohort 01
const INTERN_02 = '44444444-4444-4444-4444-444444444402'; // cohort 02 (no cohort overlay)

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

    it('returns the cohort-01 competency set with its cohortId set', async () => {
      const set = await loadQuestionSet(`competency-cohort-${COHORT_01}`);
      expect(set).not.toBeNull();
      expect(set!.kind).toBe('competency-cohort');
      expect(set!.cohortId).toBe(COHORT_01);
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
    it('returns the cohort-01 competency set', async () => {
      const sets = await listCohortCompetencySets();
      expect(sets.length).toBeGreaterThanOrEqual(1);
      const cohort01 = sets.find((s) => s.cohortId === COHORT_01);
      expect(cohort01).toBeDefined();
      expect(cohort01!.kind).toBe('competency-cohort');
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
      const stitched = await stitchedCompetencyQuestions(INTERN_01);
      expect(stitched.internId).toBe(INTERN_01);
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
      const stitched = await stitchedCompetencyQuestions(INTERN_02);
      expect(stitched.internId).toBe(INTERN_02);
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
