import { describe, it, expect } from 'vitest';
import { isAnswered } from '../../app/lib/question-engine';
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
