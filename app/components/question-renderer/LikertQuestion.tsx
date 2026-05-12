import { QuestionShell } from './QuestionShell';
import type { LikertQuestion as Q, LikertAnswer } from '../../lib/question-types';

interface Props {
  question: Q;
  index: number;
  value: LikertAnswer;
  onChange: (next: LikertAnswer) => void;
  disabled?: boolean;
  error?: string;
}

export function LikertQuestion({ question, index, value, onChange, disabled, error }: Props) {
  const cfg = question.config;
  const segments: number[] = [];
  for (let n = cfg.min; n <= cfg.max; n++) segments.push(n);
  const groupName = `q-${question.id}`;

  return (
    <QuestionShell
      questionId={question.id}
      type={question.type}
      index={index}
      label={question.label}
      helperText={question.helperText}
      error={error}
    >
      <div className="assessment-likert" data-qoptions>
        <span className="assessment-likert__anchor assessment-likert__anchor--left">
          {cfg.leftLabel}
        </span>
        <div className="assessment-likert__segments">
          {segments.map((n) => {
            const v = String(n);
            return (
              <label key={n} className="assessment-likert__seg">
                <input
                  type="radio"
                  name={groupName}
                  value={v}
                  checked={value === v}
                  disabled={disabled}
                  onChange={() => onChange(v)}
                  data-qinput
                  aria-label={v}
                />
                <span>{n}</span>
              </label>
            );
          })}
        </div>
        <span className="assessment-likert__anchor assessment-likert__anchor--right">
          {cfg.rightLabel}
        </span>
      </div>
    </QuestionShell>
  );
}
