import type { ReactNode } from 'react';

export function TableFilter({
  countLabel,
  count,
  inputs,
  rightAside,
  children,
}: {
  countLabel: string;
  count: number;
  inputs: ReactNode;
  rightAside?: ReactNode;
  children: ReactNode;
}) {
  const countStr = String(count).padStart(2, '0');
  return (
    <>
      <div className="filters">{inputs}</div>
      <div className="table-wrap">
        <div className="table-meta">
          <span className="table-meta__count">
            <strong>{countStr}</strong> &nbsp;/&nbsp; {countLabel}
          </span>
          {rightAside ? <span className="table-meta__sort">{rightAside}</span> : null}
        </div>
        {children}
      </div>
    </>
  );
}
