import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { useState } from 'react';
import { TableFilter } from '~/components/TableFilter';

interface Row {
  id: string;
  name: string;
  cohort: string;
}

function Harness() {
  const [search, setSearch] = useState('');
  const [cohort, setCohort] = useState('all');
  const rows: Row[] = [
    { id: '1', name: 'M. Bayer', cohort: 'Eskenazi 2026' },
    { id: '2', name: 'D. Clark', cohort: 'TTT 2026' },
  ];
  const filtered = rows.filter((r) => {
    const txt = (r.name + ' ' + r.cohort).toLowerCase();
    if (search && !txt.includes(search.toLowerCase())) return false;
    if (cohort !== 'all' && r.cohort !== cohort) return false;
    return true;
  });
  return (
    <TableFilter
      countLabel="Active interns"
      count={filtered.length}
      inputs={
        <>
          <input
            aria-label="search"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select aria-label="cohort" value={cohort} onChange={(e) => setCohort(e.target.value)}>
            <option value="all">All cohorts</option>
            <option value="Eskenazi 2026">Eskenazi 2026</option>
            <option value="TTT 2026">TTT 2026</option>
          </select>
        </>
      }
    >
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Cohort</th>
          </tr>
        </thead>
        <tbody>
          {filtered.length === 0 ? (
            <tr>
              <td colSpan={2}>No records match the current filters.</td>
            </tr>
          ) : (
            filtered.map((r) => (
              <tr key={r.id}>
                <td>{r.name}</td>
                <td>{r.cohort}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </TableFilter>
  );
}

describe('TableFilter', () => {
  it('renders count and inputs', () => {
    render(<Harness />);
    // Count is the padded number shown inside the table-meta__count <strong>.
    expect(screen.getByText('02', { selector: 'strong' })).toBeInTheDocument();
    expect(screen.getByText('Active interns', { exact: false })).toBeInTheDocument();
  });

  it('updates count on filter change', () => {
    render(<Harness />);
    fireEvent.change(screen.getByLabelText('search'), { target: { value: 'clark' } });
    expect(screen.getByText('01', { selector: 'strong' })).toBeInTheDocument();
  });

  it('shows empty-state row when no matches', () => {
    render(<Harness />);
    fireEvent.change(screen.getByLabelText('search'), { target: { value: 'nonexistent' } });
    expect(screen.getByText('No records match the current filters.')).toBeInTheDocument();
  });
});
