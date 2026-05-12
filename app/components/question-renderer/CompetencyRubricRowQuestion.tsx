import { QuestionShell } from './QuestionShell';
import type {
  CompetencyRubricRowQuestion as Q,
  CompetencyRubricRowAnswer,
} from '../../lib/question-types';

interface Props {
  question: Q;
  index: number;
  value: CompetencyRubricRowAnswer | null | undefined;
  onChange: (next: CompetencyRubricRowAnswer) => void;
  disabled?: boolean;
  error?: string;
}

const RATINGS: Array<{ value: 'emerging' | 'developing' | 'ready'; label: string }> = [
  { value: 'emerging', label: 'Emerging' },
  { value: 'developing', label: 'Developing' },
  { value: 'ready', label: 'Ready' },
];

export function CompetencyRubricRowQuestion({
  question,
  index,
  value,
  onChange,
  disabled,
  error,
}: Props) {
  const rating = value?.rating ?? null;
  const notes = value?.notes ?? '';
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
      <div className="assessment-rubric-row" data-qoptions>
        <div className="assessment-rubric-pills">
          {RATINGS.map((r) => (
            <label key={r.value} className="assessment-rubric-pill">
              <input
                type="radio"
                name={groupName}
                value={r.value}
                checked={rating === r.value}
                disabled={disabled}
                onChange={() => onChange({ rating: r.value, notes })}
                data-qinput
                aria-label={r.label}
              />
              <span>{r.label}</span>
            </label>
          ))}
        </div>
        <textarea
          className="assessment-rubric-notes"
          placeholder="Notes..."
          rows={2}
          value={notes}
          disabled={disabled}
          onChange={(e) => onChange({ rating, notes: e.target.value })}
          data-qnotes
        />
      </div>
    </QuestionShell>
  );
}
