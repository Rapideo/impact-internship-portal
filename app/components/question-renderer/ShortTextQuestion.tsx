import { QuestionShell } from './QuestionShell';
import type { ShortTextQuestion as Q } from '../../lib/question-types';

interface Props {
  question: Q;
  index: number;
  value: string | null | undefined;
  onChange: (next: string) => void;
  disabled?: boolean;
  error?: string;
}

export function ShortTextQuestion({ question, index, value, onChange, disabled, error }: Props) {
  const cfg = question.config;
  return (
    <QuestionShell
      questionId={question.id}
      type={question.type}
      index={index}
      label={question.label}
      helperText={question.helperText}
      error={error}
    >
      <input
        className="assessment-question__input"
        type="text"
        placeholder={cfg.placeholder}
        maxLength={cfg.maxLength}
        value={value ?? ''}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        data-qinput
      />
    </QuestionShell>
  );
}
