// Inline editable list — admin Settings → Phases / Participation Factors row editor.
//
// SP7 Phase C rewrite — preserves the existing prop API verbatim. Internal
// markup mirrors the prototype's `settings-phases.html` row pattern (also
// used historically for the entry-assessment participation-factor list):
//
//   - `.settings-list` container with `role="list"`.
//   - Each `.settings-list__row` is a grid with `90px / 1fr / 40px`
//     columns (port already lives in `app/styles/admin.css`).
//   - Leftmost cell (`--handle`) hosts BOTH ↑ and ↓ handle buttons,
//     `disabled` on the appropriate edge rows (top row disables ↑, bottom
//     row disables ↓). The cell uses a 2-button flex row instead of an
//     inline string so the rendered DOM matches the prototype's two
//     `<button class="settings-list__handle-btn">` children.
//   - Middle cell hosts the label text input (`.settings-list__label-input`).
//     When `withDescription` is true, a second stacked input
//     (`.settings-list__description-input`) renders inside the SAME cell so
//     the row's 90px/1fr/40px grid is unchanged.
//   - Right cell hosts the remove button (`.settings-list__remove-btn`).
//   - `+ Add ...` button uses `.settings-list__add` (dashed-border row).
//
// Submitted form-data shape: each row writes
//   `${name}[i].id`    (hidden),
//   `${name}[i].label` (text input), and — only when `withDescription` is
//   set — `${name}[i].description` (text input).
// `withDescription` defaults to false so `admin.settings.phases.tsx` and
// `dev.primitives.tsx` render exactly as before (single-column, no
// description field). `parseInlineRows` in `app/lib/validation.ts` always
// parses an optional `description`, regardless of whether the form submits
// it — a missing field simply parses to `null`.

import { useState } from 'react';

export interface InlineRow {
  id: string;
  label: string;
  description?: string | null;
}

export function InlineEditableList({
  initial,
  addLabel,
  name,
  errorIndices,
  withDescription,
}: {
  initial: InlineRow[];
  addLabel: string;
  /** Form field name root; rows are submitted as `${name}[<i>].id` and `${name}[<i>].label`. */
  name: string;
  /** Indices to render with .input--error (server-validation feedback) */
  errorIndices?: number[];
  /** Opt-in: also render a second "Description (optional)" input per row,
   *  submitting `${name}[<i>].description`. Default false keeps consumers
   *  without descriptions (Phases, dev/primitives) unaffected. */
  withDescription?: boolean;
}) {
  const [rows, setRows] = useState<InlineRow[]>(() =>
    initial.map((r) => ({ id: r.id, label: r.label, description: r.description ?? '' })),
  );
  const errSet = new Set(errorIndices ?? []);

  function update(i: number, label: string) {
    setRows((rs) => rs.map((r, j) => (j === i ? { ...r, label } : r)));
  }
  function updateDescription(i: number, description: string) {
    setRows((rs) => rs.map((r, j) => (j === i ? { ...r, description } : r)));
  }
  function add() {
    setRows((rs) => [...rs, { id: '', label: '', description: '' }]);
  }
  function remove(i: number) {
    setRows((rs) => rs.filter((_, j) => j !== i));
  }
  function move(i: number, dir: -1 | 1) {
    setRows((rs) => {
      const j = i + dir;
      if (j < 0 || j >= rs.length) return rs;
      const copy = rs.slice();
      const tmp = copy[i]!;
      copy[i] = copy[j]!;
      copy[j] = tmp;
      return copy;
    });
  }

  return (
    <>
      <div className="settings-list" role="list">
        {rows.map((row, i) => (
          <div className="settings-list__row" role="listitem" key={`${row.id}-${i}`}>
            <input type="hidden" name={`${name}[${i}].id`} value={row.id} />
            <div className="settings-list__cell settings-list__cell--handle">
              <button
                type="button"
                className="settings-list__handle-btn"
                aria-label="Move up"
                disabled={i === 0}
                onClick={() => move(i, -1)}
              >
                {'↑'}
              </button>
              <button
                type="button"
                className="settings-list__handle-btn"
                aria-label="Move down"
                disabled={i === rows.length - 1}
                onClick={() => move(i, 1)}
              >
                {'↓'}
              </button>
            </div>
            <div className="settings-list__cell settings-list__cell--label">
              <input
                type="text"
                className={`settings-list__label-input${errSet.has(i) ? ' input--error' : ''}`}
                name={`${name}[${i}].label`}
                value={row.label}
                placeholder="Label"
                onChange={(e) => update(i, e.target.value)}
              />
              {withDescription ? (
                <input
                  type="text"
                  className="settings-list__description-input"
                  name={`${name}[${i}].description`}
                  value={row.description ?? ''}
                  placeholder="Description (optional)"
                  onChange={(e) => updateDescription(i, e.target.value)}
                />
              ) : null}
            </div>
            <div className="settings-list__cell settings-list__cell--remove">
              <button
                type="button"
                className="settings-list__remove-btn"
                aria-label="Remove"
                onClick={() => remove(i)}
              >
                {'×'}
              </button>
            </div>
          </div>
        ))}
      </div>
      <button type="button" className="settings-list__add" onClick={add}>
        {addLabel}
      </button>
    </>
  );
}
