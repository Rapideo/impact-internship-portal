import { describe, it, expect } from 'vitest';
import { isAnswered, validateAnswers } from '../../app/lib/question-engine';
import type { Question } from '../../app/lib/question-types';

const textareaQ: Question = {
  id: 'q1',
  type: 'textarea',
  label: 'L',
  required: true,
  sortOrder: 1,
  config: { rows: 4, placeholder: '' },
};
const shortQ: Question = {
  id: 'q2',
  type: 'short-text',
  label: 'L',
  required: false,
  sortOrder: 2,
  config: { placeholder: '', maxLength: 200 },
};
const radioQ: Question = {
  id: 'q3',
  type: 'radio',
  label: 'L',
  required: true,
  sortOrder: 3,
  config: {
    options: [
      { value: 'yes', label: 'Yes' },
      { value: 'no', label: 'No' },
    ],
    otherWithText: true,
  },
};
const checkQ: Question = {
  id: 'q4',
  type: 'checkbox-group',
  label: 'L',
  required: false,
  sortOrder: 4,
  config: {
    options: [
      { value: 'a', label: 'A' },
      { value: 'b', label: 'B' },
    ],
    otherWithText: true,
  },
};
const likertQ: Question = {
  id: 'q5',
  type: 'likert',
  label: 'L',
  required: false,
  sortOrder: 5,
  config: { min: 1, max: 5, leftLabel: 'lo', rightLabel: 'hi' },
};
const rubricQ: Question = {
  id: 'q6',
  type: 'competency-rubric-row',
  label: 'L',
  required: false,
  sortOrder: 6,
  config: {},
};

describe('isAnswered', () => {
  it('textarea: empty string is unanswered, whitespace is unanswered, content is answered', () => {
    expect(isAnswered(textareaQ, '')).toBe(false);
    expect(isAnswered(textareaQ, '   ')).toBe(false);
    expect(isAnswered(textareaQ, 'a')).toBe(true);
    expect(isAnswered(textareaQ, null)).toBe(false);
    expect(isAnswered(textareaQ, undefined)).toBe(false);
  });
  it('short-text: same rules as textarea', () => {
    expect(isAnswered(shortQ, '')).toBe(false);
    expect(isAnswered(shortQ, 'x')).toBe(true);
  });
  it('radio: simple value is answered', () => {
    expect(isAnswered(radioQ, 'yes')).toBe(true);
    expect(isAnswered(radioQ, null)).toBe(false);
  });
  it('radio: other-with-empty-text is unanswered', () => {
    expect(isAnswered(radioQ, { value: '__other', otherText: '' })).toBe(false);
    expect(isAnswered(radioQ, { value: '__other', otherText: '  ' })).toBe(false);
  });
  it('radio: other-with-text is answered', () => {
    expect(isAnswered(radioQ, { value: '__other', otherText: 'reason' })).toBe(true);
  });
  it('checkbox-group: empty array is unanswered, non-empty is answered', () => {
    expect(isAnswered(checkQ, [])).toBe(false);
    expect(isAnswered(checkQ, ['a'])).toBe(true);
  });
  it('checkbox-group: other-text-only is answered', () => {
    expect(isAnswered(checkQ, { values: [], otherText: 'note' })).toBe(true);
    expect(isAnswered(checkQ, { values: [], otherText: '' })).toBe(false);
  });
  it('likert: numeric string is answered', () => {
    expect(isAnswered(likertQ, '3')).toBe(true);
    expect(isAnswered(likertQ, null)).toBe(false);
    expect(isAnswered(likertQ, '')).toBe(false);
  });
  it('competency-rubric-row: rating present is answered, missing rating is not', () => {
    expect(isAnswered(rubricQ, { rating: 'ready', notes: '' })).toBe(true);
    expect(isAnswered(rubricQ, { rating: null, notes: 'some notes' })).toBe(false);
    expect(isAnswered(rubricQ, null)).toBe(false);
  });
});

describe('validateAnswers', () => {
  it('required textarea: empty -> error, filled -> no error', () => {
    const r1 = validateAnswers([textareaQ], { q1: '' });
    expect(r1.ok).toBe(false);
    expect(r1.errors.q1).toBe('Required');

    const r2 = validateAnswers([textareaQ], { q1: 'hello' });
    expect(r2.ok).toBe(true);
    expect(r2.errors).toEqual({});
  });
  it('non-required is never flagged', () => {
    const r = validateAnswers([shortQ], { q2: '' });
    expect(r.ok).toBe(true);
    expect(r.errors).toEqual({});
  });
  it('radio: invalid option value triggers per-question error', () => {
    const r = validateAnswers([radioQ], { q3: 'banana' });
    expect(r.ok).toBe(false);
    expect(r.errors.q3).toBe('Invalid selection');
  });
  it('radio: __other accepted when otherWithText config is true', () => {
    const r = validateAnswers([radioQ], {
      q3: { value: '__other', otherText: 'reason' },
    });
    expect(r.ok).toBe(true);
  });
  it('checkbox-group: an unknown option value triggers an error', () => {
    const r = validateAnswers([checkQ], { q4: ['a', 'z'] });
    expect(r.ok).toBe(false);
    expect(r.errors.q4).toBe('Invalid selection');
  });
  it('likert: out-of-range numeric string is rejected', () => {
    const r1 = validateAnswers([likertQ], { q5: '0' });
    expect(r1.ok).toBe(false);
    expect(r1.errors.q5).toBe('Out of range');
    const r2 = validateAnswers([likertQ], { q5: '6' });
    expect(r2.ok).toBe(false);
    const r3 = validateAnswers([likertQ], { q5: '3' });
    expect(r3.ok).toBe(true);
  });
  it('competency-rubric-row: a rating not in the enum is rejected', () => {
    const r = validateAnswers([rubricQ], { q6: { rating: 'great', notes: '' } });
    expect(r.ok).toBe(false);
    expect(r.errors.q6).toBe('Invalid rating');
  });
  it('set-level minRequired: collects __minRequired error when threshold not met', () => {
    const r = validateAnswers(
      [textareaQ, shortQ, radioQ],
      { q1: 'hi', q2: '', q3: null },
      { minRequired: 2 },
    );
    expect(r.ok).toBe(false);
    expect(r.errors.__minRequired).toMatch(/at least 2 of 3/);
  });
  it('reports all errors, not just the first', () => {
    const r = validateAnswers([textareaQ, radioQ], { q1: '', q3: 'banana' });
    expect(Object.keys(r.errors).sort()).toEqual(['q1', 'q3']);
  });
});
