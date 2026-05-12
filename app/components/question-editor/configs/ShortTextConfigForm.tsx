import type { ShortTextQuestion as Q } from '../../../lib/question-types';

interface Props {
  question: Q;
  onChange: (next: Q) => void;
}

export function ShortTextConfigForm({ question, onChange }: Props) {
  return (
    <div className="id-grid id-grid--4">
      <div className="field" style={{ gridColumn: 'span 2' }}>
        <label>Placeholder</label>
        <input
          className="input"
          type="text"
          value={question.config.placeholder}
          onChange={(e) =>
            onChange({
              ...question,
              config: { ...question.config, placeholder: e.target.value },
            })
          }
        />
      </div>
      <div className="field" style={{ gridColumn: 'span 2' }}>
        <label>Max length</label>
        <input
          className="input"
          type="number"
          min={1}
          value={question.config.maxLength}
          onChange={(e) =>
            onChange({
              ...question,
              config: { ...question.config, maxLength: Math.max(1, Number(e.target.value) || 1) },
            })
          }
        />
      </div>
    </div>
  );
}
