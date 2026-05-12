import { useState, useId, useCallback } from 'react';
import './styles.css';
import { QuestionRowEditor } from './QuestionRowEditor';
import { newQuestion } from './newQuestionDefaults';
import type { Question, QuestionType } from '../../lib/question-types';

export interface QuestionSetEditorValue {
  name: string;
  minRequired: number | null;
  allowMultiple: boolean;
  questions: Question[];
}

export interface QuestionSetEditorProps {
  initial: QuestionSetEditorValue;
  nameEditable?: boolean;
  onSave: (next: QuestionSetEditorValue) => void;
  onDelete?: () => void;
  onCancel: () => void;
  saving?: boolean;
  formError?: string | null;
}

const TYPE_OPTIONS: Array<{ value: QuestionType; label: string }> = [
  { value: 'textarea', label: 'Textarea' },
  { value: 'short-text', label: 'Short Text' },
  { value: 'radio', label: 'Radio' },
  { value: 'checkbox-group', label: 'Checkbox Group' },
  { value: 'likert', label: 'Likert' },
  { value: 'competency-rubric-row', label: 'Rubric Row' },
];

export function QuestionSetEditor({
  initial,
  nameEditable = false,
  onSave,
  onDelete,
  onCancel,
  saving,
  formError,
}: QuestionSetEditorProps) {
  const [name, setName] = useState(initial.name);
  const [minRequired, setMinRequired] = useState<number | null>(initial.minRequired);
  const [allowMultiple, setAllowMultiple] = useState(initial.allowMultiple);
  const [questions, setQuestions] = useState<Question[]>(initial.questions);

  // Per-row expanded state, keyed by question.id so row re-orders / type-edits do not
  // collapse the wrong rows. New rows auto-expand.
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [pickerOpen, setPickerOpen] = useState(false);

  const formId = useId();

  function toggleRow(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function updateQuestion(idx: number, next: Question) {
    setQuestions((qs) => qs.map((q, i) => (i === idx ? next : q)));
  }

  function moveQuestion(idx: number, dir: -1 | 1) {
    setQuestions((qs) => {
      const j = idx + dir;
      if (j < 0 || j >= qs.length) return qs;
      const next = qs.slice();
      const a = next[idx];
      const b = next[j];
      if (a === undefined || b === undefined) return qs;
      next[idx] = b;
      next[j] = a;
      return next;
    });
  }

  function removeQuestion(idx: number) {
    setQuestions((qs) => {
      const removedId = qs[idx]?.id;
      if (removedId) {
        setExpandedIds((prev) => {
          const next = new Set(prev);
          next.delete(removedId);
          return next;
        });
      }
      return qs.filter((_, i) => i !== idx);
    });
  }

  function addOfType(t: QuestionType) {
    const sortOrder = questions.length + 1;
    const newQ = newQuestion(t, sortOrder);
    setQuestions((qs) => [...qs, newQ]);
    setExpandedIds((prev) => new Set(prev).add(newQ.id));
    setPickerOpen(false);
  }

  const handleSave = useCallback(() => {
    onSave({
      name,
      minRequired,
      allowMultiple,
      questions: questions.map((q, i) => ({ ...q, sortOrder: i + 1 })),
    });
  }, [name, minRequired, allowMultiple, questions, onSave]);

  return (
    <>
      <article className="qs-editor-card">
        <div className="qs-editor-card__head">
          <h2 className="qs-editor-card__title">Set Configuration</h2>
          <span className="micro-label">SET INFO</span>
        </div>
        <div className="id-grid id-grid--4">
          <div className="field" style={{ gridColumn: 'span 2' }}>
            <label htmlFor={`${formId}-name`}>Set Name</label>
            <input
              id={`${formId}-name`}
              className="input"
              type="text"
              value={name}
              disabled={!nameEditable}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="field" style={{ gridColumn: 'span 2' }}>
            <label htmlFor={`${formId}-min`}>Min. Required (answered count to allow submit)</label>
            <input
              id={`${formId}-min`}
              className="input"
              type="number"
              min={0}
              value={minRequired ?? ''}
              onChange={(e) =>
                setMinRequired(e.target.value === '' ? null : Math.max(0, Number(e.target.value)))
              }
            />
          </div>
          <div className="field" style={{ gridColumn: 'span 4' }}>
            <label>
              <input
                type="checkbox"
                checked={allowMultiple}
                onChange={(e) => setAllowMultiple(e.target.checked)}
              />{' '}
              Allow Multiple? (Permit submitters to complete this assessment more than once.)
            </label>
          </div>
        </div>
      </article>

      <article className="qs-editor-card">
        <div className="qs-editor-card__head">
          <h2 className="qs-editor-card__title">Questions</h2>
          <span className="micro-label">EDITOR</span>
        </div>
        <div id={`${formId}-questions`}>
          {questions.map((q, i) => (
            <QuestionRowEditor
              key={q.id}
              question={q}
              index={i}
              expanded={expandedIds.has(q.id)}
              onToggle={() => toggleRow(q.id)}
              onChange={(next) => updateQuestion(i, next)}
              onMoveUp={() => moveQuestion(i, -1)}
              onMoveDown={() => moveQuestion(i, 1)}
              onRemove={() => removeQuestion(i)}
              canMoveUp={i > 0}
              canMoveDown={i < questions.length - 1}
            />
          ))}
        </div>
        {pickerOpen ? (
          <div className="qs-type-picker" style={{ display: 'flex' }}>
            {TYPE_OPTIONS.map((opt) => (
              <button
                type="button"
                key={opt.value}
                className="qs-type-picker__btn"
                onClick={() => addOfType(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        ) : null}
        <button
          type="button"
          className="settings-list__add"
          aria-expanded={pickerOpen}
          onClick={() => setPickerOpen((v) => !v)}
        >
          {pickerOpen ? '× Cancel adding' : '+ Add Question'}
        </button>
      </article>

      {formError ? (
        <div className="banner banner--danger" role="alert" style={{ margin: '12px 0' }}>
          {formError}
        </div>
      ) : null}

      <div className="action-bar">
        <div className="action-bar__inner">
          <div className="action-bar__status">
            <span className="mono" style={{ color: 'var(--navy)' }}>
              QUESTION SET · EDIT
            </span>
          </div>
          <div className="action-bar__buttons">
            <button type="button" className="btn btn--outline" onClick={onCancel} disabled={saving}>
              Cancel
            </button>
            {onDelete ? (
              <button
                type="button"
                className="btn btn--danger"
                onClick={onDelete}
                disabled={saving}
              >
                Delete Set
              </button>
            ) : null}
            <button
              type="button"
              className="btn btn--primary"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
