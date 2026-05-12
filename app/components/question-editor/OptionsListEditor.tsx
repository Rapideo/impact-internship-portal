import type { RadioOption } from '../../lib/question-types';

interface Props {
  options: RadioOption[];
  onChange: (next: RadioOption[]) => void;
}

export function OptionsListEditor({ options, onChange }: Props) {
  function update(idx: number, patch: Partial<RadioOption>) {
    onChange(options.map((o, i) => (i === idx ? { ...o, ...patch } : o)));
  }
  function move(idx: number, dir: -1 | 1) {
    const j = idx + dir;
    if (j < 0 || j >= options.length) return;
    const next = options.slice();
    const a = next[idx];
    const b = next[j];
    if (a === undefined || b === undefined) return;
    next[idx] = b;
    next[j] = a;
    onChange(next);
  }
  function remove(idx: number) {
    onChange(options.filter((_, i) => i !== idx));
  }
  function add() {
    onChange([...options, { value: '', label: '' }]);
  }
  return (
    <>
      <div className="qs-options-list">
        {options.map((o, i) => (
          <div key={i} className="qs-options-row">
            <input
              className="input"
              type="text"
              value={o.value}
              placeholder="value"
              onChange={(e) => update(i, { value: e.target.value })}
            />
            <input
              className="input"
              type="text"
              value={o.label}
              placeholder="label"
              onChange={(e) => update(i, { label: e.target.value })}
            />
            <button
              type="button"
              className="settings-list__handle-btn"
              onClick={() => move(i, -1)}
              disabled={i === 0}
              aria-label="Move up"
            >
              {'↑'}
            </button>
            <button
              type="button"
              className="settings-list__handle-btn"
              onClick={() => move(i, 1)}
              disabled={i === options.length - 1}
              aria-label="Move down"
            >
              {'↓'}
            </button>
            <button
              type="button"
              className="settings-list__remove-btn"
              onClick={() => remove(i)}
              aria-label="Remove"
            >
              {'×'}
            </button>
          </div>
        ))}
      </div>
      <button type="button" className="settings-list__add" onClick={add}>
        + Add Option
      </button>
    </>
  );
}
