import type { ReactNode } from 'react';
import './styles.css';

interface QuestionShellProps {
  questionId: string;
  type: string;
  index: number;
  label: string;
  helperText?: string;
  error?: string;
  children: ReactNode;
}

function pad2(n: number) {
  return String(n + 1).padStart(2, '0');
}

export function QuestionShell({
  questionId,
  type,
  index,
  label,
  helperText,
  error,
  children,
}: QuestionShellProps) {
  const num = pad2(index);
  return (
    <div
      className={`assessment-question${error ? ' assessment-question--has-error' : ''}`}
      data-qid={questionId}
      data-qtype={type}
    >
      <div className="assessment-question__head">
        <span className="assessment-question__num">{num}</span>
        <div>
          <span className="assessment-question__label">Question {num}</span>
          <p className="assessment-question__text">{label}</p>
          {helperText ? <span className="assessment-question__hint">{helperText}</span> : null}
        </div>
      </div>
      {children}
      {error ? <p className="assessment-question__error">{error}</p> : null}
    </div>
  );
}
