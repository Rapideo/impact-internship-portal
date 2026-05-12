import type { ReactNode } from 'react';

export function PageHead({
  breadcrumb,
  title,
  sub,
  actions,
  children,
}: {
  breadcrumb: ReactNode;
  title: string;
  sub?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <section className="page-head">
      <div className="container">
        <div className="page-head__breadcrumb">
          <span className="micro-label">{breadcrumb}</span>
        </div>
        <div className="page-head__row">
          <div>
            <h1 className="page-head__title">{title}</h1>
            {sub ? <p className="page-head__sub">{sub}</p> : null}
          </div>
          {actions}
        </div>
        {children}
      </div>
    </section>
  );
}
