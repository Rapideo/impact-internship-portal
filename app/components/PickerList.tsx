// Picker-list primitive — ported from the prototype's `.picker-list` table
// (assessments.html intern-picker modal). A scrollable table with sticky
// mono column headers, row hover highlight, and row-click selection. Used
// inside `.modal__card--wide` for picking an entity to scope an assessment
// to.

import type { ReactNode } from 'react';

export interface PickerColumn<Row> {
  /** Column header label. */
  label: ReactNode;
  /** Inline width style (e.g. "30%"). */
  width?: string;
  /** Render the cell for a given row. */
  render: (row: Row) => ReactNode;
}

export interface PickerListProps<Row> {
  columns: ReadonlyArray<PickerColumn<Row>>;
  rows: ReadonlyArray<Row>;
  /** Stable key extractor for each row. */
  rowKey: (row: Row) => string;
  /** Called when a row is clicked. */
  onSelect: (row: Row) => void;
  /** Empty-state message when `rows` is empty. */
  emptyMessage?: ReactNode;
}

export function PickerList<Row>({
  columns,
  rows,
  rowKey,
  onSelect,
  emptyMessage = 'No matches.',
}: PickerListProps<Row>) {
  return (
    <div className="picker-list-wrap">
      <table className="picker-list">
        <thead>
          <tr>
            {columns.map((c, i) => (
              <th key={i} style={c.width ? { width: c.width } : undefined}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="empty-cell">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={rowKey(row)} style={{ cursor: 'pointer' }} onClick={() => onSelect(row)}>
                {columns.map((c, i) => (
                  <td key={i}>{c.render(row)}</td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
