// Landing — SP7 Phase D1 rebuild against Prototypes/PROTOTYPE/index.html.
// Composes the dark <PublicNav> + <HeroSection> + <PillarsSection> + dark
// <PublicFooter>. Copy is verbatim from the prototype.

import { Link } from 'react-router';
import type { Route } from './+types/_public._index';
import { HeroSection } from '~/components/HeroSection';
import { PillarsSection } from '~/components/PillarsSection';
import { PublicNav } from '~/components/nav/PublicNav';
import { PublicFooter } from '~/components/nav/PublicFooter';

export const meta: Route.MetaFunction = () => [
  { title: 'IMPACT Internship Assessment Portal' },
  {
    name: 'description',
    content:
      'Assessment portal for the IMPACT internship program: intake, multi-phase competency reviews, intern self-assessments, and 90-day employment outcomes.',
  },
];

const PILLARS = [
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
] as const;

export default function Landing() {
  return (
    <>
      <PublicNav />
      <main>
        <HeroSection
          microLabel="Indiana / Cohort Program / 2026"
          headline={
            <>
              EXPAND YOUR
              <br />
              <span className="accent-underline">OPPORTUNITIES.</span>
            </>
          }
          subhead={
            <>
              A structured intake, competency, and 90-day outcomes program for Indiana interns.
              Track progress, measure growth, and land the right placement.
            </>
          }
          ctas={
            <Link to="/intern/assessments" className="btn btn--primary">
              Intern? Start Here!
              <span className="btn__arrow">&rarr;</span>
            </Link>
          }
        />

        <PillarsSection
          id="about"
          microLabel="Program Pillars / 03"
          title={
            <>
              Three stages.
              <br />
              One trajectory.
            </>
          }
          intro="Every IMPACT participant moves through a structured sequence: capturing intake details, demonstrating competency, and delivering a measured outcome within 90 days of placement."
          pillars={PILLARS}
        />
      </main>
      <PublicFooter />
    </>
  );
}
