// app/components/reports/ReportsScopeBar.tsx
// The reports scope filter (spec "Option A"). Controlled selects that reflect
// the current loader scope and navigate via search params on change. Server
// re-queries on navigation — no client data fetching. Admin mode shows an
// employer select; employer mode pins the employer server-side and shows only
// the cohort select.

import type { ChangeEvent } from 'react';
import { useLocation, useNavigate } from 'react-router';

export interface ReportsScopeBarProps {
  mode: 'admin' | 'employer';
  employers?: { id: string; name: string }[];
  cohorts: { id: string; name: string }[];
  selectedEmployerId: string | null;
  selectedCohortId: string | null;
  scopeLabel: string;
}

export function ReportsScopeBar({
  mode,
  employers = [],
  cohorts,
  selectedEmployerId,
  selectedCohortId,
  scopeLabel,
}: ReportsScopeBarProps) {
  const navigate = useNavigate();
  const location = useLocation();

  function go(next: URLSearchParams) {
    const qs = next.toString();
    navigate(qs ? `?${qs}` : location.pathname);
  }

  function onEmployer(e: ChangeEvent<HTMLSelectElement>) {
    const v = e.target.value;
    const next = new URLSearchParams();
    if (v) next.set('employerId', v); // changing employer clears the cohort
    go(next);
  }

  function onCohort(e: ChangeEvent<HTMLSelectElement>) {
    const v = e.target.value;
    const next = new URLSearchParams();
    if (selectedEmployerId) next.set('employerId', selectedEmployerId);
    if (v) next.set('cohortId', v);
    go(next);
  }

  const cohortDisabled = mode === 'admin' && !selectedEmployerId;

  return (
    <div className="reports-scopebar">
      <span className="reports-scopebar__label">Viewing</span>
      {mode === 'admin' && (
        <select
          className="reports-scopebar__select"
          aria-label="Filter by employer"
          value={selectedEmployerId ?? ''}
          onChange={onEmployer}
        >
          <option value="">All Employers</option>
          {employers.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
        </select>
      )}
      <select
        className="reports-scopebar__select"
        aria-label="Filter by cohort"
        value={selectedCohortId ?? ''}
        onChange={onCohort}
        disabled={cohortDisabled}
      >
        <option value="">All Cohorts</option>
        {cohorts.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      <span className="reports-scopebar__chip">{scopeLabel}</span>
    </div>
  );
}
