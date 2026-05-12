import { QuestionShell } from './QuestionShell';
import type { RadioQuestion as Q, RadioAnswer } from '../../lib/question-types';

interface Props {
  question: Q;
  index: number;
  value: RadioAnswer;
  onChange: (next: RadioAnswer) => void;
  disabled?: boolean;
  error?: string;
}

function selectedSimple(value: RadioAnswer): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'object') return null;
  return value;
}

function selectedIsOther(value: RadioAnswer): boolean {
  return typeof value === 'object' && value !== null && value.value === '__other';
}

function otherText(value: RadioAnswer): string {
  return typeof value === 'object' && value !== null ? value.otherText : '';
}

export function RadioQuestion({ question, index, value, onChange, disabled, error }: Props) {
  const cfg = question.config;
  const groupName = `q-${question.id}`;
  const isOther = selectedIsOther(value);
  const simple = selectedSimple(value);

  return (
    <QuestionShell
      questionId={question.id}
      type={question.type}
      index={index}
      label={question.label}
      helperText={question.helperText}
      error={error}
    >
      <div className="assessment-options" data-qoptions>
        {cfg.options.map((o) => (
          <label key={o.value} className="assessment-radio">
            <input
              type="radio"
              name={groupName}
              value={o.value}
              checked={simple === o.value}
              disabled={disabled}
              onChange={() => onChange(o.value)}
              data-qinput
            />
            <span>{o.label}</span>
          </label>
        ))}
        {cfg.otherWithText ? (
          <>
            <label className="assessment-radio">
              <input
                type="radio"
                name={groupName}
                value="__other"
                checked={isOther}
                disabled={disabled}
                onChange={() => onChange({ value: '__other', otherText: otherText(value) })}
                data-qinput
              />
              <span>Other</span>
            </label>
            {isOther ? (
              <input
                type="text"
                className="assessment-question__input assessment-other-text"
                placeholder="Please specify..."
                value={otherText(value)}
                disabled={disabled}
                onChange={(e) => onChange({ value: '__other', otherText: e.target.value })}
                data-other-text
                style={{ marginTop: 8 }}
              />
            ) : null}
          </>
        ) : null}
      </div>
    </QuestionShell>
  );
}
