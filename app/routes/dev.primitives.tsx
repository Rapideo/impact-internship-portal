// SP7 Phase B — primitive demo route. NODE_ENV-gated: returns 404 in
// production, renders a side-by-side gallery of every shared primitive in
// dev so Matt can walk it during Gate G2 review against the prototype.
//
// The corresponding registration in `app/routes.ts` is spread-guarded with
// `process.env.NODE_ENV !== 'production' ? [...] : []` so production
// builds don't ship the route at all.

import { useState } from 'react';
import { ActionBar } from '~/components/ActionBar';
import { AssessmentCard } from '~/components/AssessmentCard';
import { AuthShell } from '~/components/auth/AuthShell';
import { ConfirmModal } from '~/components/ConfirmModal';
import { ConfirmReceipt } from '~/components/ConfirmReceipt';
import { DetailHeader } from '~/components/DetailHeader';
import { EmptyRow } from '~/components/EmptyRow';
import { HeroSection } from '~/components/HeroSection';
import { IdentityCard } from '~/components/IdentityCard';
import { KpiCard } from '~/components/KpiCard';
import { MetaStrip } from '~/components/MetaStrip';
import { PageHead } from '~/components/PageHead';
import { PickerList } from '~/components/PickerList';
import { PillarsSection } from '~/components/PillarsSection';
import { QuickLinks } from '~/components/QuickLinks';
import { RecentActivity } from '~/components/RecentActivity';
import { RubricPanel } from '~/components/RubricPanel';
import { RubricSectionHead } from '~/components/RubricSectionHead';
import { TableFilter } from '~/components/TableFilter';
import { ToastProvider, useToast } from '~/components/ToastProvider';
import { AdminNav } from '~/components/AdminNav';
import { AdminFooter } from '~/components/AdminFooter';
import { PublicNav } from '~/components/nav/PublicNav';
import { PublicFooter } from '~/components/nav/PublicFooter';
import { EmployerNav } from '~/components/nav/EmployerNav';
import { EmployerFooter } from '~/components/nav/EmployerFooter';
import { NameInitial } from '~/components/tables/NameInitial';

export async function loader() {
  if (process.env.NODE_ENV === 'production') {
    throw new Response('Not Found', { status: 404 });
  }
  return null;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section
      style={{
        borderTop: '1px dashed var(--rule)',
        padding: '40px 0',
      }}
    >
      <div className="container">
        <h2
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 13,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'var(--navy)',
            margin: '0 0 24px',
          }}
        >
          {title}
        </h2>
        {children}
      </div>
    </section>
  );
}

function ToastDemoButtons() {
  const toast = useToast();
  return (
    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
      <button
        type="button"
        className="btn btn--primary btn--sm"
        onClick={() => toast.show({ kind: 'success', label: 'SAVED', message: 'Record updated.' })}
      >
        Fire success
      </button>
      <button
        type="button"
        className="btn btn--danger btn--sm"
        onClick={() => toast.show({ kind: 'danger', label: 'DELETED', message: 'Record removed.' })}
      >
        Fire danger
      </button>
      <button
        type="button"
        className="btn btn--outline btn--sm"
        onClick={() => toast.show({ kind: 'gold', label: 'NOTICE', message: 'Heads up.' })}
      >
        Fire gold
      </button>
    </div>
  );
}

function ModalDemoButtons() {
  const [openDelete, setOpenDelete] = useState(false);
  const [openSave, setOpenSave] = useState(false);
  return (
    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
      <button type="button" className="btn btn--danger btn--sm" onClick={() => setOpenDelete(true)}>
        Open delete modal
      </button>
      <button type="button" className="btn btn--primary btn--sm" onClick={() => setOpenSave(true)}>
        Open save modal
      </button>
      <ConfirmModal
        open={openDelete}
        onClose={() => setOpenDelete(false)}
        onConfirm={() => setOpenDelete(false)}
        label="DELETE RECORD"
        title="Delete this intern record?"
        body="This record will be permanently removed. This action cannot be undone."
        confirmText="Delete Permanently"
        variant="danger"
      />
      <ConfirmModal
        open={openSave}
        onClose={() => setOpenSave(false)}
        onConfirm={() => setOpenSave(false)}
        label="SAVE RECORD"
        title="Save this draft?"
        body="The draft will be stored against this intern's record."
        confirmText="Save"
      />
    </div>
  );
}

interface DemoIntern {
  id: string;
  initials: string;
  last: string;
  cohort: string;
  start: string;
  phase: string;
}

const DEMO_INTERNS: ReadonlyArray<DemoIntern> = [
  {
    id: 'bayer',
    initials: 'BA',
    last: 'Bayer',
    cohort: 'Eskenazi 2026',
    start: '04.01.2026',
    phase: 'Week 4',
  },
  {
    id: 'clark',
    initials: 'CL',
    last: 'Clark',
    cohort: 'TTT 2026',
    start: '04.08.2026',
    phase: 'Week 2',
  },
  {
    id: 'evans',
    initials: 'EV',
    last: 'Evans',
    cohort: 'Habitat 2026',
    start: '03.15.2026',
    phase: 'Week 8',
  },
];

export default function DevPrimitives() {
  return (
    <ToastProvider>
      <main style={{ paddingBottom: 120 }}>
        <div className="container" style={{ padding: '40px 40px 16px' }}>
          <span className="micro-label">SP7 / PHASE B / DEV PRIMITIVES</span>
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 48,
              lineHeight: 1,
              letterSpacing: '-0.02em',
              margin: '12px 0 8px',
            }}
          >
            Primitive gallery.
          </h1>
          <p style={{ color: 'var(--muted)', maxWidth: 620, margin: 0 }}>
            NODE_ENV-gated demo of every Phase B primitive. Open this side-by-side with the matching
            prototype HTML in <code>C:/Projects/impact-prototype/Prototypes/PROTOTYPE/</code>
            to walk Gate G2.
          </p>
        </div>

        <Section title="Navs">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <span className="micro-label">PublicNav (index.html / 404 / login)</span>
              <PublicNav />
            </div>
            <div>
              <span className="micro-label">AdminNav (admin.html)</span>
              <AdminNav active="home" userEmail="kortney@impact.org" />
            </div>
            <div>
              <span className="micro-label">EmployerNav — cyan accent (decision §8.7)</span>
              <EmployerNav employerName="Eskenazi Health" userEmail="employer1@example.com" />
            </div>
          </div>
        </Section>

        <Section title="Footers">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <PublicFooter />
            <AdminFooter />
            <EmployerFooter />
          </div>
        </Section>

        <Section title="Page heads">
          <PageHead
            breadcrumb="ADMIN / HOME / 2026"
            title={
              <>
                GOOD MORNING,
                <br />
                MATT.
              </>
            }
            sub="Program overview for the 2026 cohort cycle. Data reflects the current demo dataset."
          />
          <PageHead
            breadcrumb="ADMIN / INTERNS / 2026"
            title="INTERNS."
            sub="Active participants across the 2026 cohorts, with current phase and post-placement outcomes."
            actions={
              <a href="#" className="btn btn--primary">
                + New Intern
              </a>
            }
          />
        </Section>

        <Section title="KPI cards (admin home grid)">
          <div className="kpi-grid">
            <KpiCard label="Active Cohorts" value="06" delta="ALL 2026 CYCLE" />
            <KpiCard label="Active Interns" value="05" delta="ACROSS 5 COHORTS" variant="cyan" />
            <KpiCard label="90-Day Outcomes" value="02" delta="OF 5 CONFIRMED" variant="success" />
            <KpiCard
              label="Assessments Needed"
              value="03"
              sub="Interns without a competency submission this week."
              variant="gold"
            />
          </div>
        </Section>

        <Section title="Quick links + Recent activity">
          <DetailHeader title="Quick Links" aside="JUMP TO SECTION" />
          <QuickLinks
            items={[
              { to: '/admin/assessments', label: 'Assessments' },
              { to: '/admin/interns', label: 'Interns' },
              { to: '/admin/settings/employers', label: 'Employers' },
            ]}
          />
          <DetailHeader title="Recent Activity" aside="LAST 7 DAYS" />
          <RecentActivity
            entries={[
              {
                actor: 'Clark',
                body: 'completed Competency phase Week 4 — TTT 2026',
                time: '04.14.2026 · 08:40',
              },
              {
                actor: 'Evans',
                body: '— 90-day outcome recorded: Employed',
                time: '04.12.2026 · 14:05',
              },
              {
                actor: 'Bayer',
                body: 'submitted Self-Assessment — Eskenazi 2026',
                time: '04.10.2026 · 16:45',
              },
            ]}
          />
        </Section>

        <Section title="Identity cards">
          <IdentityCard title="Employer Record" subnote="EDIT EMPLOYER · UPDATE CONTACT INFO">
            <div style={{ color: 'var(--muted)' }}>Body slot — typically `.id-grid` of fields.</div>
          </IdentityCard>
          <IdentityCard
            title="Eskenazi Health"
            subnote="CARE PARTNER · INDIANAPOLIS"
            sub="A 24-week cohort with Eskenazi Health training Medical Assistants across their primary-care clinics."
            meta="6 ACTIVE COHORTS · 15 INTERNS"
            link={{ to: '#', label: 'View employer detail' }}
          />
        </Section>

        <Section title="Detail header + Rubric section head">
          <DetailHeader title="Enrolled Interns" aside="15 ACTIVE" />
          <RubricSectionHead label="Phases" aside="Assessment phases applicable to this cohort" />
          <RubricSectionHead
            label="Role-Specific"
            title="Medical Assistant skills"
            aside="4 skills for Eskenazi 2026"
            spaced
          />
        </Section>

        <Section title="Meta strip">
          <MetaStrip
            items={[
              { label: 'Employer', value: 'Eskenazi Health' },
              { label: 'Start', value: '04.01.2026', mono: true },
              { label: 'End', value: '09.30.2026', mono: true },
              { label: 'Members', value: '15', mono: true },
              { label: 'Role', value: 'Medical Assistant' },
            ]}
          />
        </Section>

        <Section title="Rubric panel">
          <div className="rubric">
            <RubricPanel num="01" title="Personal Information" meta="6 FIELDS">
              <div style={{ padding: 28, color: 'var(--muted)' }}>
                Body slot — fields, rubric questions, or sub-cards live here.
              </div>
            </RubricPanel>
            <RubricPanel
              num="02"
              title="Internship Details"
              meta="8 FIELDS"
              progress={{ state: 'developing', label: 'Developing' }}
            >
              <div style={{ padding: 28, color: 'var(--muted)' }}>
                Demo of `progress` prop (data-state=&apos;developing&apos;).
              </div>
            </RubricPanel>
            <RubricPanel
              num="03"
              title="Entry Assessment"
              meta="12 BARRIERS"
              progress={{ state: 'ready', label: 'Ready' }}
            >
              <div style={{ padding: 28, color: 'var(--muted)' }}>
                data-state=&apos;ready&apos; (gold).
              </div>
            </RubricPanel>
          </div>
        </Section>

        <Section title="Modals (open via buttons)">
          <ModalDemoButtons />
        </Section>

        <Section title="Toasts (fire via buttons)">
          <ToastDemoButtons />
        </Section>

        <Section title="Table filter + Empty row + NameInitial chips">
          <TableFilter
            countLabel="Active interns · Last synced 09:42 CDT"
            count={DEMO_INTERNS.length}
            rightAside="Sort: Start Date ↓"
            inputs={
              <>
                <input
                  className="input input--search"
                  type="search"
                  placeholder="Search by last name or cohort..."
                />
                <div className="filter-group">
                  <label className="filter-group__label" htmlFor="cohort-filter">
                    Cohort
                  </label>
                  <select className="select" id="cohort-filter">
                    <option>All cohorts</option>
                  </select>
                </div>
                <div className="filter-group">
                  <label className="filter-group__label" htmlFor="outcome-filter">
                    Outcome
                  </label>
                  <select className="select" id="outcome-filter">
                    <option>All</option>
                  </select>
                </div>
                <a href="#" className="btn btn--outline btn--sm">
                  Export CSV
                </a>
              </>
            }
          >
            <table className="assessments">
              <thead>
                <tr>
                  <th style={{ width: '25%' }}>Intern</th>
                  <th style={{ width: '20%' }}>Cohort</th>
                  <th style={{ width: '20%' }}>Start Date</th>
                  <th style={{ width: '20%' }}>Current Phase</th>
                  <th style={{ width: '15%' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {DEMO_INTERNS.map((i) => (
                  <tr key={i.id}>
                    <td>
                      <NameInitial initials={i.initials} name={`M. ${i.last}`} />
                    </td>
                    <td>{i.cohort}</td>
                    <td className="col-date">{i.start}</td>
                    <td>
                      <span className="col-phase">{i.phase}</span>
                    </td>
                    <td>
                      <span className="col-actions">
                        <a href="#" className="action-link">
                          View
                        </a>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableFilter>

          <h3 className="micro-label" style={{ marginTop: 32 }}>
            EmptyRow demo (zero results)
          </h3>
          <table className="assessments" style={{ marginTop: 12 }}>
            <thead>
              <tr>
                <th>Intern</th>
                <th>Cohort</th>
                <th>Phase</th>
              </tr>
            </thead>
            <tbody>
              <EmptyRow colSpan={3} message="No interns match." />
            </tbody>
          </table>
        </Section>

        <Section title="Picker list (modal-scoped table)">
          <PickerList
            columns={[
              {
                label: 'Last Name',
                width: '30%',
                render: (r: DemoIntern) => <NameInitial initials={r.initials} name={r.last} />,
              },
              { label: 'Cohort', width: '30%', render: (r: DemoIntern) => r.cohort },
              {
                label: 'Start',
                width: '20%',
                render: (r: DemoIntern) => <span className="col-date">{r.start}</span>,
              },
              {
                label: 'Current Phase',
                width: '20%',
                render: (r: DemoIntern) => <span className="col-phase">{r.phase}</span>,
              },
            ]}
            rows={DEMO_INTERNS}
            rowKey={(r: DemoIntern) => r.id}
            onSelect={() => {
              /* no-op in demo */
            }}
          />
        </Section>

        <Section title="Assessment cards (admin assessments hub)">
          <div className="assessment-grid">
            <AssessmentCard
              stage="PER INTERN · PHASED"
              meta="COMPETENCY ASSESSMENT"
              title="Rate competency on the rubric."
              body="Capture a phase-specific competency evaluation on behalf of the employer: 7 shared professional domains plus role-specific skills for the placement."
              action={
                <button type="button" className="btn btn--primary">
                  Begin Competency <span className="btn__arrow">→</span>
                </button>
              }
            />
            <AssessmentCard
              stage="PER INTERN · AT EXIT"
              meta="EXIT EMPLOYER SURVEY"
              title="Capture exit outcomes."
              body="Record the employer's evaluation at the close of placement: outcome status, performance rating, strengths, work-readiness indicators, and barriers observed."
              action={
                <button type="button" className="btn btn--primary">
                  Begin Exit Survey <span className="btn__arrow">→</span>
                </button>
              }
            />
            <AssessmentCard
              meta="MIDPOINT REFLECTION"
              title="You've already submitted."
              body="The submission is locked. Contact your program admin for changes."
              action={
                <span className="assessment-card__pill">
                  <span className="assessment-card__check">✓</span>
                  Submitted 04.10.2026
                </span>
              }
              done
            />
          </div>
        </Section>

        <Section title="AuthShell (login.html two-column layout)">
          <div
            style={{
              border: '1px dashed var(--rule)',
              borderRadius: 4,
              overflow: 'hidden',
              background: 'var(--canvas)',
            }}
          >
            <AuthShell
              microLabel="ADMIN / SIGN-IN / 2026"
              title="Sign in."
              sub="Administrator access for the IMPACT Internship Assessment Portal. Manage cohorts, run competency assessments, and record placement outcomes."
              facts={[
                { mono: '01', label: 'Intake — at placement' },
                { mono: '02', label: 'Competency — multi-phase' },
                { mono: '03', label: 'Outcomes — 90-day window' },
              ]}
            >
              <div style={{ color: 'var(--muted)', fontSize: 14 }}>
                Form slot — the consuming route mounts its real form here.
              </div>
            </AuthShell>
          </div>
        </Section>

        <Section title="Hero + Pillars (landing primitives)">
          <HeroSection
            microLabel="Indiana / Cohort Program / 2026"
            headline={
              <>
                EXPAND YOUR
                <br />
                <span className="accent-underline">OPPORTUNITIES.</span>
              </>
            }
            subhead="A structured intake, competency, and 90-day outcomes program for Indiana interns. Track progress, measure growth, and land the right placement."
            ctas={
              <a href="#" className="btn btn--primary">
                Intern? Start Here! <span className="btn__arrow">→</span>
              </a>
            }
          />
          <PillarsSection
            id="about-demo"
            microLabel="Program Pillars / 03"
            title={
              <>
                Three stages.
                <br />
                One trajectory.
              </>
            }
            intro="Every IMPACT participant moves through a structured sequence: capturing intake details, demonstrating competency, and delivering a measured outcome within 90 days of placement."
            pillars={[
              {
                num: '01 / Stage One',
                title: 'Intake',
                body: 'A unified intern record captures personal information, internship assignment, entry barriers, and role-specific competencies at the start of placement.',
                metaLeft: 'At placement',
                metaRight: 'Admin',
              },
              {
                num: '02 / Stage Two',
                title: 'Competency',
                body: 'Mid-program review of skill development across five competency areas. Tracks growth over time and flags interns needing additional coaching or support.',
                metaLeft: 'Mid-placement',
                metaRight: 'Admin',
              },
              {
                num: '03 / Stage Three',
                title: 'Outcomes',
                body: 'Employment status and role continuity captured at 90 days, giving program leadership a verifiable metric for placement success and employer retention.',
                metaLeft: 'Post-program',
                metaRight: 'Admin',
              },
            ]}
          />
        </Section>

        <Section title="Confirm receipt — success variant">
          <ConfirmReceipt
            microLabel="PERSONAL GOALS / 2026 / SUBMITTED"
            title="Personal Goals submitted."
            body="Thanks for sharing your goals. Your cohort administrator can now see your starting reflection."
            receiptId="IMP-SA-2026-048"
            receiptItems={[
              { label: 'First Initial', value: 'M', mono: true },
              { label: 'Last Name', value: 'Bayer' },
              { label: 'Employer', value: 'Eskenazi Health' },
              { label: 'Cohort', value: 'Eskenazi 2026' },
              { label: 'Submitted', value: '04.10.2026 · 16:45', mono: true },
            ]}
            note="You will not be able to resubmit this assessment. If you need to correct something, please contact your program administrator."
            actions={
              <a href="/" className="btn btn--primary">
                Return Home <span className="btn__arrow">→</span>
              </a>
            }
          />
        </Section>

        <Section title="Confirm receipt — error variant (404)">
          <ConfirmReceipt
            variant="error"
            microLabel="ERROR / 404 / PAGE NOT FOUND"
            title={
              <>
                <span style={{ color: 'var(--gold)' }}>404.</span>
                <br />
                Page not found.
              </>
            }
            body="This page doesn't exist, or the resource you're looking for has been moved. If you followed a link from inside the portal, please let your program admin know."
            actions={
              <>
                <a href="/" className="btn btn--primary">
                  Return Home <span className="btn__arrow">→</span>
                </a>
                <a href="/admin" className="btn btn--outline">
                  Admin Home
                </a>
              </>
            }
          />
        </Section>

        <Section title="Action bar (sticky bottom, with optional progress fill)">
          <p style={{ color: 'var(--muted)' }}>
            The action bar at the bottom of this page is mounted via the primitive — scroll down to
            confirm it&apos;s pinned and the progress fill animates between the demo buttons.
          </p>
          <ActionBarDemo />
        </Section>
      </main>
    </ToastProvider>
  );
}

function ActionBarDemo() {
  const [step, setStep] = useState(0);
  const progress = Math.min(1, step / 4);
  return (
    <>
      <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
        <button
          type="button"
          className="btn btn--outline btn--sm"
          onClick={() => setStep((s) => Math.max(0, s - 1))}
        >
          - Step
        </button>
        <button
          type="button"
          className="btn btn--primary btn--sm"
          onClick={() => setStep((s) => Math.min(4, s + 1))}
        >
          + Step
        </button>
      </div>
      <ActionBar status={`STEP ${step} / 4 · DRAFT`} progress={progress}>
        <a href="#" className="btn btn--outline">
          Cancel
        </a>
        <button type="submit" className="btn btn--primary">
          Submit <span className="btn__arrow">→</span>
        </button>
      </ActionBar>
    </>
  );
}
