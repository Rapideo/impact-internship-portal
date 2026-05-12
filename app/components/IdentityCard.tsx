import type { ReactNode } from 'react';

export function IdentityCard({
  title,
  subnote,
  children,
}: {
  title: string;
  subnote: string;
  children: ReactNode;
}) {
  return (
    <article className="identity-card">
      <div className="identity-card__head">
        <h2 className="identity-card__title">{title}</h2>
        <span className="micro-label">{subnote}</span>
      </div>
      {children}
    </article>
  );
}
