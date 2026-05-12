import { QuestionShell } from './QuestionShell';
import type { CheckboxGroupQuestion as Q, CheckboxGroupAnswer } from '../../lib/question-types';

interface Props {
  question: Q;
  index: number;
  value: CheckboxGroupAnswer;
  onChange: (next: CheckboxGroupAnswer) => void;
  disabled?: boolean;
  error?: string;
}

function isOtherShape(v: CheckboxGroupAnswer): v is { values: string[]; otherText: string } {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function readValues(v: CheckboxGroupAnswer): string[] {
  if (v === null || v === undefined) return [];
  if (Array.isArray(v)) return v;
  if (isOtherShape(v)) return v.values;
  return [];
}

function readOtherText(v: CheckboxGroupAnswer): string {
  return isOtherShape(v) ? v.otherText : '';
}

function otherIsChecked(v: CheckboxGroupAnswer): boolean {
  return isOtherShape(v);
}

export function CheckboxGroupQuestion({
  question,
  index,
  value,
  onChange,
  disabled,
  error,
}: Props) {
  const cfg = question.config;
  const values = readValues(value);
  const otherChecked = otherIsChecked(value);
  const otherText = readOtherText(value);

  function toggleOption(optValue: string) {
    const next = values.includes(optValue)
      ? values.filter((v) => v !== optValue)
      : [...values, optValue];
    if (otherChecked) onChange({ values: next, otherText });
    else onChange(next);
  }

  function toggleOther() {
    if (otherChecked) onChange(values);
    else onChange({ values, otherText: '' });
  }

  function updateOtherText(next: string) {
    onChange({ values, otherText: next });
  }

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
          <label key={o.value} className="assessment-check">
            <input
              type="checkbox"
              value={o.value}
              checked={values.includes(o.value)}
              disabled={disabled}
              onChange={() => toggleOption(o.value)}
              data-qinput
            />
            <span>{o.label}</span>
          </label>
        ))}
        {cfg.otherWithText ? (
          <>
            <label className="assessment-check">
              <input
                type="checkbox"
                value="__other"
                checked={otherChecked}
                disabled={disabled}
                onChange={toggleOther}
                data-qinput
              />
              <span>Other</span>
            </label>
            {otherChecked ? (
              <input
                type="text"
                className="assessment-question__input assessment-other-text"
                placeholder="Please specify..."
                value={otherText}
                disabled={disabled}
                onChange={(e) => updateOtherText(e.target.value)}
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
