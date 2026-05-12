import type { Question, QuestionType } from '../../lib/question-types';

function genId(): string {
  return 'q-new-' + Math.random().toString(36).slice(2, 8);
}

export function newQuestion(type: QuestionType, sortOrder: number): Question {
  const common = { id: genId(), label: '', helperText: '', required: false, sortOrder };
  switch (type) {
    case 'textarea':
      return { ...common, type, config: { rows: 4, placeholder: '' } };
    case 'short-text':
      return { ...common, type, config: { placeholder: '', maxLength: 200 } };
    case 'radio':
      return { ...common, type, config: { options: [], otherWithText: false } };
    case 'checkbox-group':
      return { ...common, type, config: { options: [], otherWithText: false } };
    case 'likert':
      return { ...common, type, config: { min: 1, max: 5, leftLabel: '', rightLabel: '' } };
    case 'competency-rubric-row':
      return { ...common, type, config: {} };
  }
}
