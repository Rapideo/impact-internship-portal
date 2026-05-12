import type { LikertQuestion as Q } from '../../../lib/question-types';

interface Props {
  question: Q;
  onChange: (next: Q) => void;
}

export function LikertConfigForm({ question, onChange }: Props) {
  function patch(p: Partial<Q['config']>) {
    onChange({ ...question, config: { ...question.config, ...p } });
  }
  return (
    <div className="id-grid id-grid--4">
      <div className="field">
        <label>Min</label>
        <input
          className="input"
          type="number"
          value={question.config.min}
          onChange={(e) => patch({ min: Number(e.target.value) || 1 })}
        />
      </div>
      <div className="field">
        <label>Max</label>
        <input
          className="input"
          type="number"
          value={question.config.max}
          onChange={(e) => patch({ max: Number(e.target.value) || 1 })}
        />
      </div>
      <div className="field" style={{ gridColumn: 'span 2' }}>
        <label>Left anchor label</label>
        <input
          className="input"
          type="text"
          value={question.config.leftLabel}
          onChange={(e) => patch({ leftLabel: e.target.value })}
        />
      </div>
      <div className="field" style={{ gridColumn: 'span 4' }}>
        <label>Right anchor label</label>
        <input
          className="input"
          type="text"
          value={question.config.rightLabel}
          onChange={(e) => patch({ rightLabel: e.target.value })}
        />
      </div>
    </div>
  );
}
