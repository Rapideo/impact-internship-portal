import type { ReactNode } from 'react';

export function RubricPanel({
  num,
  title,
  meta,
  hidden,
  children,
}: {
  num: string;
  title: string;
  meta?: string;
  hidden?: boolean;
  children: ReactNode;
}) {
  if (hidden) return null;
  return (
    <article className="rubric-panel">
      <header className="rubric-panel__head">
        <span className="rubric-panel__num">{num}</span>
        <div>
          <h3 className="rubric-panel__title">{title}</h3>
          {meta ? <span className="rubric-panel__meta">{meta}</span> : null}
        </div>
      </header>
      {children}
    </article>
  );
}
