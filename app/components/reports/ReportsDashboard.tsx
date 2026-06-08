// app/components/reports/ReportsDashboard.tsx
// Presentational composition of the reports dashboard: a KPI grid (reusing the
// admin.css .kpi-grid/.kpi-card) plus a responsive chart grid. Takes a fully
// computed ReportsData; no data or formatting logic lives here.

import { KpiCard } from '~/components/KpiCard';
import { BarList } from '~/components/charts/BarList';
import { RadialGauge } from '~/components/charts/RadialGauge';
import { ProgressList } from '~/components/charts/ProgressList';
import { AreaTrend } from '~/components/charts/AreaTrend';
import type { ReportsData } from '~/lib/reports-types';

export function ReportsDashboard({ data }: { data: ReportsData }) {
  const { kpis, internsByGroup, outcomes, assessmentCompletion, barriers, trend } = data;
  const pad2 = (n: number) => String(n).padStart(2, '0');

  return (
    <>
      <section>
        <div className="container">
          <div className="kpi-grid">
            {kpis.employers !== null && (
              <KpiCard label="Employers" value={pad2(kpis.employers)} delta="ACTIVE PARTNERS" />
            )}
            <KpiCard
              label="Active Interns"
              value={pad2(kpis.activeInterns)}
              delta="IN SCOPE"
              variant="cyan"
            />
            <KpiCard
              label="90-Day Employed"
              value={`${kpis.employed90Pct}%`}
              delta="OF ACTIVE INTERNS"
              variant="success"
            />
            <KpiCard
              label="Assessed"
              value={`${kpis.assessedPct}%`}
              delta="HAVE A COMPETENCY"
              variant="gold"
            />
          </div>
        </div>
      </section>

      <section>
        <div className="container">
          <div className="reports-grid">
            <article className="report-card">
              <div className="report-card__head">
                <h3 className="report-card__title">
                  {internsByGroup.groupBy === 'employer'
                    ? 'Interns by Employer'
                    : 'Interns by Cohort'}
                </h3>
                <span className="micro-label">ROSTER</span>
              </div>
              <BarList
                rows={internsByGroup.rows.map((r) => ({ label: r.label, value: r.count }))}
                emptyLabel="No interns yet."
              />
            </article>

            <article className="report-card">
              <div className="report-card__head">
                <h3 className="report-card__title">Employment Outcomes</h3>
                <span className="micro-label">OUTCOMES</span>
              </div>
              <div className="gauge-row">
                <RadialGauge
                  value={outcomes.ninetyDay.numerator}
                  total={outcomes.ninetyDay.denominator}
                  label="90-Day"
                  tone="success"
                />
                <RadialGauge
                  value={outcomes.oneEightyDay.numerator}
                  total={outcomes.oneEightyDay.denominator}
                  label="180-Day"
                  tone="navy"
                />
              </div>
            </article>

            <article className="report-card">
              <div className="report-card__head">
                <h3 className="report-card__title">Assessment Completion</h3>
                <span className="micro-label">PROGRESS</span>
              </div>
              <ProgressList
                rows={assessmentCompletion.map((a) => ({
                  label: a.label,
                  completed: a.completed,
                  total: a.total,
                }))}
              />
            </article>

            <article className="report-card">
              <div className="report-card__head">
                <h3 className="report-card__title">Entry Barriers</h3>
                <span className="micro-label">POPULATION</span>
              </div>
              <BarList
                rows={barriers.map((b) => ({ label: b.label, value: b.count }))}
                variant="gold"
                emptyLabel="No barriers recorded."
              />
            </article>

            <article className="report-card report-card--wide">
              <div className="report-card__head">
                <h3 className="report-card__title">Submissions Over Time</h3>
                <span className="micro-label">LAST 8 WEEKS</span>
              </div>
              <AreaTrend points={trend.map((t) => ({ label: t.weekStart, value: t.count }))} />
            </article>
          </div>
        </div>
      </section>
    </>
  );
}
