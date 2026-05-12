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

// validateAnswers + serializeAnswers come in subsequent tasks.
export function validateAnswers(
  _questions: Question[],
  _answers: Answers,
  _opts?: { minRequired?: number | null },
): ValidationResult {
  throw new Error('not yet implemented');
}

export function serializeAnswers(_questions: Question[], _answers: Answers): SerializedAnswers {
  throw new Error('not yet implemented');
}
