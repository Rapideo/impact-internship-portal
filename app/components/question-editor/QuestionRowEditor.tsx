import type { Question } from '../../lib/question-types';
import { TextareaConfigForm } from './configs/TextareaConfigForm';
import { ShortTextConfigForm } from './configs/ShortTextConfigForm';
import { RadioConfigForm } from './configs/RadioConfigForm';
import { CheckboxGroupConfigForm } from './configs/CheckboxGroupConfigForm';
import { LikertConfigForm } from './configs/LikertConfigForm';
import { CompetencyRubricRowConfigForm } from './configs/CompetencyRubricRowConfigForm';

interface Props {
  question: Question;
  index: number;
  expanded: boolean;
  onToggle: () => void;
  onChange: (next: Question) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
}

function pad2(n: number): string {
  return String(n + 1).padStart(2, '0');
}

function renderConfigSubForm(
  question: Question,
  onChange: (next: Question) => void,
): React.ReactNode {
  switch (question.type) {
    case 'textarea':
      return (
        <TextareaConfigForm
          question={question}
          onChange={onChange as (q: typeof question) => void}
        />
      );
    case 'short-text':
      return (
        <ShortTextConfigForm
          question={question}
          onChange={onChange as (q: typeof question) => void}
        />
      );
    case 'radio':
      return (
        <RadioConfigForm question={question} onChange={onChange as (q: typeof question) => void} />
      );
    case 'checkbox-group':
      return (
        <CheckboxGroupConfigForm
          question={question}
          onChange={onChange as (q: typeof question) => void}
        />
      );
    case 'likert':
      return (
        <LikertConfigForm question={question} onChange={onChange as (q: typeof question) => void} />
      );
    case 'competency-rubric-row':
      return (
        <CompetencyRubricRowConfigForm
          question={question}
          onChange={onChange as (q: typeof question) => void}
        />
      );
  }
}

export function QuestionRowEditor({
  question,
  index,
  expanded,
  onToggle,
  onChange,
  onMoveUp,
  onMoveDown,
  onRemove,
  canMoveUp,
  canMoveDown,
}: Props) {
  return (
    <div
      className={`qs-question-row${expanded ? ' qs-question-row--expanded' : ''}`}
      data-index={index}
      data-question-id={question.id}
    >
      <div
        className="qs-question-row__head"
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        onClick={(e) => {
          // Don't toggle when a control button is clicked.
          if ((e.target as HTMLElement).closest('button')) return;
          onToggle();
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onToggle();
          }
        }}
      >
        <span className="qs-question-row__num">{pad2(index)}</span>
        <span className="qs-question-row__label">{question.label || '(untitled)'}</span>
        <span className="qs-question-row__type">{question.type}</span>
        <span className="qs-question-row__controls">
          <button
            type="button"
            className="settings-list__handle-btn"
            onClick={onMoveUp}
            disabled={!canMoveUp}
            aria-label="Move up"
          >
            {'↑'}
          </button>
          <button
            type="button"
            className="settings-list__handle-btn"
            onClick={onMoveDown}
            disabled={!canMoveDown}
            aria-label="Move down"
          >
            {'↓'}
          </button>
          <button
            type="button"
            className="settings-list__remove-btn"
            onClick={onRemove}
            aria-label="Remove"
          >
            {'×'}
          </button>
        </span>
      </div>
      {expanded ? (
        <div className="qs-question-row__body">
          <div className="field">
            <label htmlFor={`q-${question.id}-label`}>Prompt label</label>
            <input
              id={`q-${question.id}-label`}
              className="input"
              type="text"
              value={question.label}
              onChange={(e) => onChange({ ...question, label: e.target.value })}
            />
          </div>
          <div className="field">
            <label htmlFor={`q-${question.id}-helper`}>Helper text</label>
            <textarea
              id={`q-${question.id}-helper`}
              className="textarea"
              rows={2}
              value={question.helperText ?? ''}
              onChange={(e) => onChange({ ...question, helperText: e.target.value })}
            />
          </div>
          <div className="field">
            <label>
              <input
                type="checkbox"
                checked={question.required}
                onChange={(e) => onChange({ ...question, required: e.target.checked })}
              />{' '}
              Required (must be answered)
            </label>
          </div>
          {renderConfigSubForm(question, onChange)}
        </div>
      ) : null}
    </div>
  );
}
