import type {
  Question,
  Answers,
  ValidationResult,
  SerializedAnswers,
  OtherWithTextAnswer,
  CompetencyRubricRowAnswer,
} from './question-types';

function isOtherWithText(v: unknown): v is OtherWithTextAnswer {
  return typeof v === 'object' && v !== null && (v as { value?: unknown }).value === '__other';
}

function isCompetencyAnswer(v: unknown): v is CompetencyRubricRowAnswer {
  return typeof v === 'object' && v !== null && 'rating' in (v as object);
}

export function isAnswered(question: Question, answer: unknown): boolean {
  if (answer === null || answer === undefined) return false;
  switch (question.type) {
    case 'textarea':
    case 'short-text':
      return typeof answer === 'string' && answer.trim().length > 0;
    case 'radio': {
      if (isOtherWithText(answer)) {
        return String(answer.otherText ?? '').trim().length > 0;
      }
      return typeof answer === 'string' && answer.length > 0;
    }
    case 'likert':
      return typeof answer === 'string' && answer.length > 0;
    case 'checkbox-group': {
      if (Array.isArray(answer)) return answer.length > 0;
      if (typeof answer === 'object' && answer !== null) {
        const a = answer as { values?: unknown[]; otherText?: unknown };
        const hasValues = Array.isArray(a.values) && a.values.length > 0;
        const hasOther = String(a.otherText ?? '').trim().length > 0;
        return hasValues || hasOther;
      }
      return false;
    }
    case 'competency-rubric-row': {
      if (!isCompetencyAnswer(answer)) return false;
      return answer.rating !== null && answer.rating !== undefined;
    }
  }
}

export function validateAnswers(
  questions: Question[],
  answers: Answers,
  opts: { minRequired?: number | null } = {},
): ValidationResult {
  const errors: Record<string, string> = {};
  let answeredCount = 0;

  for (const q of questions) {
    const a = answers[q.id];
    const answered = isAnswered(q, a);
    if (answered) answeredCount++;
    if (q.required && !answered) {
      errors[q.id] = 'Required';
      continue;
    }
    if (!answered) continue;

    // Type-specific shape/range checks (only applied when answered).
    switch (q.type) {
      case 'radio': {
        if (isOtherWithText(a)) {
          if (!q.config.otherWithText) errors[q.id] = 'Invalid selection';
          break;
        }
        const allowed = q.config.options.map((o) => o.value);
        if (typeof a !== 'string' || !allowed.includes(a)) {
          errors[q.id] = 'Invalid selection';
        }
        break;
      }
      case 'likert': {
        const n = typeof a === 'string' ? Number(a) : NaN;
        if (!Number.isFinite(n) || n < q.config.min || n > q.config.max) {
          errors[q.id] = 'Out of range';
        }
        break;
      }
      case 'checkbox-group': {
        const allowed = q.config.options.map((o) => o.value);
        let values: unknown[] = [];
        if (Array.isArray(a)) values = a;
        else if (typeof a === 'object' && a !== null) {
          const v = (a as { values?: unknown[] }).values;
          if (Array.isArray(v)) values = v;
        }
        for (const v of values) {
          if (typeof v !== 'string' || !allowed.includes(v)) {
            errors[q.id] = 'Invalid selection';
            break;
          }
        }
        break;
      }
      case 'competency-rubric-row': {
        const rating = isCompetencyAnswer(a) ? a.rating : null;
        if (
          rating !== null &&
          rating !== 'emerging' &&
          rating !== 'developing' &&
          rating !== 'ready'
        ) {
          errors[q.id] = 'Invalid rating';
        }
        break;
      }
      case 'textarea':
      case 'short-text':
        // No further shape constraints beyond isAnswered.
        break;
    }
  }

  if (
    typeof opts.minRequired === 'number' &&
    opts.minRequired > 0 &&
    answeredCount < opts.minRequired
  ) {
    errors.__minRequired = `Please answer at least ${opts.minRequired} of ${questions.length} questions before submitting.`;
  }

  return { ok: Object.keys(errors).length === 0, errors };
}

export function serializeAnswers(_questions: Question[], _answers: Answers): SerializedAnswers {
  throw new Error('not yet implemented');
}
