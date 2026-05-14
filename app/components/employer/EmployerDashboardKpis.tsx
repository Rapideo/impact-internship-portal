// KPI tile row for the employer dashboard. Reuses the `.kpi-card` family
// defined in app/styles/admin.css (intentionally shared between shells —
// see app/styles/employer-shell.css for the rationale). The `.kpi-card__sub`
// modifier is defined in employer-shell.css because the admin shell uses
// `.kpi-card__delta` (uppercased mono) for its own KPI captions; the employer
// version reads as plain muted prose.

import type { EmployerKpis } from '~/lib/employer-scope.server';

export function EmployerDashboardKpis({ kpis }: { kpis: EmployerKpis }) {
  return (
    <section className="employer-dashboard__kpis" aria-label="Program KPIs">
      <div className="kpi-card">
        <span className="kpi-card__label">Active cohorts</span>
        <div className="kpi-card__value">{kpis.activeCohorts}</div>
        <span className="kpi-card__sub">Your employer scope</span>
      </div>
      <div className="kpi-card">
        <span className="kpi-card__label">Active interns</span>
        <div className="kpi-card__value">{kpis.activeInterns}</div>
        <span className="kpi-card__sub">Across all your cohorts</span>
      </div>
      <div className="kpi-card">
        <span className="kpi-card__label">Assessments needed</span>
        <div className="kpi-card__value">{kpis.assessmentsNeeded}</div>
        <span className="kpi-card__sub">Interns without a competency submission</span>
      </div>
    </section>
  );
}
