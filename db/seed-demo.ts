/**
 * db/seed-demo.ts — Additive, idempotent demo-data generator for impact-dev.
 *
 * Adds ~19 employers, ~34 cohorts, ~144 interns plus entry assessments,
 * barriers, employment outcomes, and a subset of assessment submissions
 * so Reports charts show realistic, non-zero distributions.
 *
 * Rules:
 *   - NO TRUNCATE. Only INSERTs with .onConflictDoNothing().
 *   - Does NOT touch profiles, auth.users, question_sets, questions, or program_info.
 *   - All IDs are deterministic (no Math.random for ids) so re-running is safe.
 *   - Runtime `new Date()` is used ONLY for column VALUES (submittedAt offsets).
 *   - Prod guard: refuses to run against impact-prod.
 */

import { config } from 'dotenv';
config({ path: '.env.local' });
config();

import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './schema';

/* ─── Prod guard ────────────────────────────────────────────────────── */

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('ERROR: DATABASE_URL is required.');
  process.exit(1);
}

const PROD_PROJECT_REF = 'ptnhzdkspzquwcxdoqbt';
if (databaseUrl.includes(PROD_PROJECT_REF)) {
  console.error(
    `ERROR: DATABASE_URL points to impact-prod (${PROD_PROJECT_REF}). ` +
      'Refusing to run demo seed against production.',
  );
  console.error('Demo seeds are dev-only. Point DATABASE_URL at impact-dev and retry.');
  process.exit(1);
}

/* ─── ID helpers ─────────────────────────────────────────────────────
 *
 * UUID structure: xxxxxxxx-xxxx-4xxx-8xxx-xxxxxxxxxxxx (32 hex chars, dashes at positions 8/12/16/20).
 * The last segment must be exactly 12 hex chars.
 *
 * Prefix ranges (deliberately different from the base seed's 1111…/2222…/3333…/4444…):
 *   employers    ddde0000-0000-4000-8000-0000EE000000  (EE = 0-padded employer index, 2 hex)
 *   roles        dddr0000-0000-4000-8000-0000EERR0000  (EE = employer, RR = role within employer)
 *   cohorts      dddc0000-0000-4000-8000-0000EECC0000  (EE = employer, CC = cohort within employer)
 *   interns      dddi0000-0000-4000-8000-00IIIIIIIIII  (IIIIIIIIII = 10-digit zero-padded global index)
 *   submissions  ddds0000-0000-4000-8000-00SSSSSSSSSS  (SSSSSSSSSS = 10-digit zero-padded global index)
 *
 * All are valid v4-shaped UUIDs (version nibble = 4, variant nibble = 8).
 * All hex digits: d=d, e=e, i→ replaced with valid hex, r→ replaced with valid hex, etc.
 * Note: 'i' and 'r' are NOT valid hex — use fully-hex prefixes instead.
 */

function pad2(n: number): string {
  return n.toString().padStart(2, '0');
}

function pad10(n: number): string {
  return n.toString().padStart(10, '0');
}

function employerId(i: number): string {
  // Last segment: 0000 + EE + 000000 = 12 hex chars
  return `ddde0000-0000-4000-8000-0000${pad2(i)}000000`;
}

function roleId(empIdx: number, roleIdx: number): string {
  // Last segment: 0000 + EE + RR + 0000 = 12 hex chars
  return `dddf0000-0000-4000-8000-0000${pad2(empIdx)}${pad2(roleIdx)}0000`;
}

function cohortId(empIdx: number, cohortIdx: number): string {
  // Last segment: 0000 + EE + CC + 0000 = 12 hex chars
  return `ddd10000-0000-4000-8000-0000${pad2(empIdx)}${pad2(cohortIdx)}0000`;
}

function internId(globalIdx: number): string {
  // Last segment: 00 + IIIIIIIIII = 12 hex chars
  return `ddd20000-0000-4000-8000-00${pad10(globalIdx)}`;
}

function submissionId(globalIdx: number): string {
  // Last segment: 00 + SSSSSSSSSS = 12 hex chars
  return `ddd30000-0000-4000-8000-00${pad10(globalIdx)}`;
}

/* ─── Name pools ─────────────────────────────────────────────────────
 * Index-derived so the same index always produces the same name.
 * Intentionally short pools — we wrap with modulo.
 */

const FIRST_INITIALS = [
  'A',
  'B',
  'C',
  'D',
  'E',
  'F',
  'G',
  'H',
  'J',
  'K',
  'L',
  'M',
  'N',
  'P',
  'R',
  'S',
  'T',
  'V',
  'W',
  'Y',
];

const LAST_NAMES = [
  'Abernathy',
  'Blackwell',
  'Castillo',
  'Davenport',
  'Espinoza',
  'Fitzgerald',
  'Guerrero',
  'Hendricks',
  'Ingram',
  'Jefferson',
  'Kowalski',
  'Lawson',
  'Montalvo',
  'Nguyen',
  'Obafemi',
  'Peralta',
  'Quintero',
  'Rojas',
  'Santiago',
  'Thornton',
  'Underwood',
  'Vega',
  'Whitmore',
  'Xavier',
  'Yamamoto',
  'Zuberi',
  'Afolabi',
  'Bancroft',
  'Carrillo',
  'Dorsey',
];

function internName(idx: number): { firstInitial: string; lastName: string } {
  return {
    firstInitial: FIRST_INITIALS[idx % FIRST_INITIALS.length]!,
    lastName: LAST_NAMES[idx % LAST_NAMES.length]!,
  };
}

/* ─── Employer definitions ───────────────────────────────────────────
 * 19 new employers. Each has: name, contactName, contactEmail, and 1-2 roles.
 */

interface DemoEmployer {
  idx: number; // 0-based
  name: string;
  contactName: string;
  contactEmail: string;
  roles: { label: string; description: string }[];
}

const DEMO_EMPLOYERS: DemoEmployer[] = [
  {
    idx: 0,
    name: 'Lakeside Auto Group',
    contactName: 'Ray Flores',
    contactEmail: 'rflores@lakesideauto.example.com',
    roles: [
      { label: 'Lot Attendant', description: 'Vehicle prep, detailing, and lot organization.' },
    ],
  },
  {
    idx: 1,
    name: 'Prairie Electric Co-op',
    contactName: 'Donna Simmons',
    contactEmail: 'dsimmons@prairieelec.example.com',
    roles: [
      {
        label: 'Electrical Helper',
        description: 'Residential wiring support under journeyman supervision.',
      },
      { label: 'Meter Reader', description: 'Route-based meter reading and data logging.' },
    ],
  },
  {
    idx: 2,
    name: 'Midtown Pediatric Clinic',
    contactName: 'Aaliyah Jones',
    contactEmail: 'ajones@midtownpediatric.example.com',
    roles: [
      { label: 'Medical Office Aide', description: 'Scheduling, filing, and front-desk support.' },
    ],
  },
  {
    idx: 3,
    name: 'Summit Freight Solutions',
    contactName: 'Greg Payne',
    contactEmail: 'gpayne@summitfreight.example.com',
    roles: [
      { label: 'Driver Helper', description: 'Assist CDL drivers on local delivery routes.' },
      { label: 'Dock Worker', description: 'Load/unload freight, verify manifests.' },
    ],
  },
  {
    idx: 4,
    name: 'Indy Urban Farm Collective',
    contactName: 'Tasha Moreau',
    contactEmail: 'tmoreau@indyurbanfarm.example.com',
    roles: [
      { label: 'Farm Crew Member', description: 'Planting, harvesting, and market-stand support.' },
    ],
  },
  {
    idx: 5,
    name: 'Eastside Community Credit Union',
    contactName: 'Harold Webb',
    contactEmail: 'hwebb@eastsideccu.example.com',
    roles: [
      {
        label: 'Member Services Trainee',
        description: 'Front-line member support and account operations.',
      },
    ],
  },
  {
    idx: 6,
    name: 'Clearwater Plumbing & HVAC',
    contactName: 'Brittany Moss',
    contactEmail: 'bmoss@clearwaterph.example.com',
    roles: [
      {
        label: 'HVAC Helper',
        description: 'Assist technicians on residential and light commercial installs.',
      },
      {
        label: 'Plumbing Apprentice',
        description: 'Pipe fitting and fixture installation under license.',
      },
    ],
  },
  {
    idx: 7,
    name: 'Hoosier Heritage Bakery',
    contactName: 'Marco Bianchi',
    contactEmail: 'mbianchi@hoosierbakery.example.com',
    roles: [
      {
        label: 'Bakery Production Aide',
        description: 'Mixing, baking, and packaging on production line.',
      },
    ],
  },
  {
    idx: 8,
    name: 'Greenfield Early Learning Center',
    contactName: 'Camille Osei',
    contactEmail: 'cosei@greenfieldelc.example.com',
    roles: [
      {
        label: 'Childcare Aide',
        description: 'Classroom support for ages 2-5 under lead teacher.',
      },
    ],
  },
  {
    idx: 9,
    name: 'Apex Welding & Fabrication',
    contactName: 'Nick Taras',
    contactEmail: 'ntaras@apexweld.example.com',
    roles: [
      { label: 'Welder Trainee', description: 'MIG/TIG welding fundamentals and shop safety.' },
    ],
  },
  {
    idx: 10,
    name: 'Metro Transit Authority',
    contactName: 'Vivienne Okafor',
    contactEmail: 'vokafor@metrotransit.example.com',
    roles: [
      {
        label: 'Bus Service Worker',
        description: 'Interior cleaning and exterior wash of revenue vehicles.',
      },
      {
        label: 'Customer Service Agent',
        description: 'Fare payment support and route information at hubs.',
      },
    ],
  },
  {
    idx: 11,
    name: 'Starlight Event Staffing',
    contactName: 'Dion Chambers',
    contactEmail: 'dchambers@starlightstaffing.example.com',
    roles: [
      {
        label: 'Event Setup Crew',
        description: 'Venue setup, AV assist, and breakdown for live events.',
      },
    ],
  },
  {
    idx: 12,
    name: 'Hawthorne Assisted Living',
    contactName: 'Ruth Connelly',
    contactEmail: 'rconnelly@hawthorneassisted.example.com',
    roles: [
      {
        label: 'Resident Care Aide',
        description: 'ADL support for senior residents; supervised by RN.',
      },
    ],
  },
  {
    idx: 13,
    name: 'BlueSky Solar Contractors',
    contactName: 'Diego Ruiz',
    contactEmail: 'druiz@blueskysolar.example.com',
    roles: [
      {
        label: 'Solar Installer Helper',
        description: 'Panel mounting and wiring support on rooftop installs.',
      },
    ],
  },
  {
    idx: 14,
    name: 'IndyCycle Bike Share',
    contactName: 'Fatima Hussain',
    contactEmail: 'fhussain@indycycle.example.com',
    roles: [
      {
        label: 'Bike Mechanic Trainee',
        description: 'Basic maintenance, flat repair, and station stocking.',
      },
    ],
  },
  {
    idx: 15,
    name: 'Woodland Park Animal Clinic',
    contactName: 'Isaac Brennan',
    contactEmail: 'ibrennan@woodlandanimals.example.com',
    roles: [
      {
        label: 'Veterinary Assistant',
        description: 'Animal handling, kennel care, and reception support.',
      },
    ],
  },
  {
    idx: 16,
    name: 'River City Demolition & Salvage',
    contactName: 'Keisha Norman',
    contactEmail: 'knorman@rcdsalvage.example.com',
    roles: [
      {
        label: 'Deconstruction Laborer',
        description: 'Selective demo, material salvage, and site cleanup.',
      },
    ],
  },
  {
    idx: 17,
    name: 'Precision Print & Packaging',
    contactName: 'Owen Krause',
    contactEmail: 'okrause@precisionprint.example.com',
    roles: [
      {
        label: 'Press Operator Trainee',
        description: 'Offset and digital print setup under senior operator.',
      },
      {
        label: 'Bindery Associate',
        description: 'Cutting, folding, and finishing for print runs.',
      },
    ],
  },
  {
    idx: 18,
    name: 'Hopebridge Staffing Solutions',
    contactName: 'Anita Cole',
    contactEmail: 'acole@hopebridgestaffing.example.com',
    roles: [
      {
        label: 'General Labor Trainee',
        description: 'Flex placements across light-industrial client sites.',
      },
    ],
  },
];

/* ─── Cohort definitions ─────────────────────────────────────────────
 * ~2 cohorts per employer, varied durations, all in recent/current range.
 * We use at most 2 cohorts per employer (idx 0 and 1 within employer).
 */

interface DemoCohort {
  empIdx: number;
  cohortLocalIdx: number; // 0 or 1 within employer
  roleLocalIdx: number; // which role in that employer's role list
  name: string;
  startDate: string;
  endDate: string;
  description: string;
  phaseCount: number; // 1-4 phases to link (first N phases)
}

const DEMO_COHORTS: DemoCohort[] = [
  // Lakeside Auto (emp 0) — 1 role, 2 cohorts
  {
    empIdx: 0,
    cohortLocalIdx: 0,
    roleLocalIdx: 0,
    name: 'Lakeside Auto — Winter 2025 Lot',
    startDate: '2025-11-03',
    endDate: '2026-04-25',
    description: 'Winter lot operations cohort.',
    phaseCount: 2,
  },
  {
    empIdx: 0,
    cohortLocalIdx: 1,
    roleLocalIdx: 0,
    name: 'Lakeside Auto — Spring 2026 Lot',
    startDate: '2026-03-16',
    endDate: '2026-09-11',
    description: 'Spring/summer lot and prep crew.',
    phaseCount: 2,
  },
  // Prairie Electric (emp 1) — 2 roles, 2 cohorts
  {
    empIdx: 1,
    cohortLocalIdx: 0,
    roleLocalIdx: 0,
    name: 'Prairie Electric — Spring 2026 Helpers',
    startDate: '2026-01-05',
    endDate: '2026-07-03',
    description: 'Electrical helper cohort.',
    phaseCount: 3,
  },
  {
    empIdx: 1,
    cohortLocalIdx: 1,
    roleLocalIdx: 1,
    name: 'Prairie Electric — Spring 2026 Meters',
    startDate: '2026-02-09',
    endDate: '2026-08-07',
    description: 'Meter reader route cohort.',
    phaseCount: 2,
  },
  // Midtown Pediatric (emp 2) — 1 role, 2 cohorts
  {
    empIdx: 2,
    cohortLocalIdx: 0,
    roleLocalIdx: 0,
    name: 'Midtown Pediatric — Q1 2026 Office',
    startDate: '2026-01-12',
    endDate: '2026-06-12',
    description: 'Medical office aide cohort.',
    phaseCount: 2,
  },
  {
    empIdx: 2,
    cohortLocalIdx: 1,
    roleLocalIdx: 0,
    name: 'Midtown Pediatric — Q3 2026 Office',
    startDate: '2026-07-06',
    endDate: '2025-12-19',
    description: 'Second medical office aide cohort.',
    phaseCount: 2,
  },
  // Summit Freight (emp 3) — 2 roles, 2 cohorts
  {
    empIdx: 3,
    cohortLocalIdx: 0,
    roleLocalIdx: 0,
    name: 'Summit Freight — Q1 2026 Drivers',
    startDate: '2026-01-19',
    endDate: '2026-07-17',
    description: 'Driver helper route cohort.',
    phaseCount: 3,
  },
  {
    empIdx: 3,
    cohortLocalIdx: 1,
    roleLocalIdx: 1,
    name: 'Summit Freight — Q1 2026 Dock',
    startDate: '2026-02-02',
    endDate: '2026-07-31',
    description: 'Dock operations cohort.',
    phaseCount: 3,
  },
  // Indy Urban Farm (emp 4) — 1 role, 1 cohort
  {
    empIdx: 4,
    cohortLocalIdx: 0,
    roleLocalIdx: 0,
    name: 'Indy Urban Farm — Season 2026',
    startDate: '2026-04-13',
    endDate: '2026-10-09',
    description: 'Full-season farm crew cohort.',
    phaseCount: 2,
  },
  // Eastside CCU (emp 5) — 1 role, 2 cohorts
  {
    empIdx: 5,
    cohortLocalIdx: 0,
    roleLocalIdx: 0,
    name: 'Eastside CCU — Spring 2026 MST',
    startDate: '2026-01-26',
    endDate: '2026-07-24',
    description: 'Member services trainee cohort.',
    phaseCount: 3,
  },
  {
    empIdx: 5,
    cohortLocalIdx: 1,
    roleLocalIdx: 0,
    name: 'Eastside CCU — Fall 2026 MST',
    startDate: '2026-08-03',
    endDate: '2027-01-30',
    description: 'Second member services cohort.',
    phaseCount: 3,
  },
  // Clearwater (emp 6) — 2 roles, 2 cohorts
  {
    empIdx: 6,
    cohortLocalIdx: 0,
    roleLocalIdx: 0,
    name: 'Clearwater — Spring 2026 HVAC',
    startDate: '2026-02-23',
    endDate: '2026-08-21',
    description: 'HVAC helper training cohort.',
    phaseCount: 3,
  },
  {
    empIdx: 6,
    cohortLocalIdx: 1,
    roleLocalIdx: 1,
    name: 'Clearwater — Spring 2026 Plumbing',
    startDate: '2026-03-09',
    endDate: '2026-09-04',
    description: 'Plumbing apprentice cohort.',
    phaseCount: 3,
  },
  // Hoosier Bakery (emp 7) — 1 role, 2 cohorts
  {
    empIdx: 7,
    cohortLocalIdx: 0,
    roleLocalIdx: 0,
    name: 'Hoosier Bakery — Q1 2026 Prod',
    startDate: '2026-01-05',
    endDate: '2026-07-03',
    description: 'Winter/spring production cohort.',
    phaseCount: 2,
  },
  {
    empIdx: 7,
    cohortLocalIdx: 1,
    roleLocalIdx: 0,
    name: 'Hoosier Bakery — Q3 2026 Prod',
    startDate: '2026-07-06',
    endDate: '2026-12-31',
    description: 'Summer/fall production cohort.',
    phaseCount: 2,
  },
  // Greenfield ELC (emp 8) — 1 role, 2 cohorts
  {
    empIdx: 8,
    cohortLocalIdx: 0,
    roleLocalIdx: 0,
    name: 'Greenfield ELC — Spring 2026',
    startDate: '2026-01-12',
    endDate: '2026-06-05',
    description: 'Classroom aide cohort.',
    phaseCount: 2,
  },
  {
    empIdx: 8,
    cohortLocalIdx: 1,
    roleLocalIdx: 0,
    name: 'Greenfield ELC — Fall 2026',
    startDate: '2026-08-17',
    endDate: '2027-01-09',
    description: 'Fall classroom aide cohort.',
    phaseCount: 2,
  },
  // Apex Welding (emp 9) — 1 role, 2 cohorts
  {
    empIdx: 9,
    cohortLocalIdx: 0,
    roleLocalIdx: 0,
    name: 'Apex Welding — Q1 2026',
    startDate: '2026-02-02',
    endDate: '2026-07-31',
    description: 'MIG/TIG fundamentals cohort.',
    phaseCount: 3,
  },
  {
    empIdx: 9,
    cohortLocalIdx: 1,
    roleLocalIdx: 0,
    name: 'Apex Welding — Q3 2026',
    startDate: '2026-07-06',
    endDate: '2026-12-31',
    description: 'Advanced welding cohort.',
    phaseCount: 3,
  },
  // Metro Transit (emp 10) — 2 roles, 2 cohorts
  {
    empIdx: 10,
    cohortLocalIdx: 0,
    roleLocalIdx: 0,
    name: 'Metro Transit — Q1 2026 Service',
    startDate: '2026-01-19',
    endDate: '2026-06-19',
    description: 'Bus service worker cohort.',
    phaseCount: 2,
  },
  {
    empIdx: 10,
    cohortLocalIdx: 1,
    roleLocalIdx: 1,
    name: 'Metro Transit — Q1 2026 CS',
    startDate: '2026-02-16',
    endDate: '2026-07-17',
    description: 'Customer service agent cohort.',
    phaseCount: 2,
  },
  // Starlight Events (emp 11) — 1 role, 1 cohort
  {
    empIdx: 11,
    cohortLocalIdx: 0,
    roleLocalIdx: 0,
    name: 'Starlight Events — Spring 2026',
    startDate: '2026-03-02',
    endDate: '2026-08-28',
    description: 'Spring events season crew.',
    phaseCount: 2,
  },
  // Hawthorne AL (emp 12) — 1 role, 2 cohorts
  {
    empIdx: 12,
    cohortLocalIdx: 0,
    roleLocalIdx: 0,
    name: 'Hawthorne AL — Winter 2026 Care',
    startDate: '2026-01-05',
    endDate: '2026-06-05',
    description: 'Resident care aide cohort.',
    phaseCount: 3,
  },
  {
    empIdx: 12,
    cohortLocalIdx: 1,
    roleLocalIdx: 0,
    name: 'Hawthorne AL — Summer 2026 Care',
    startDate: '2026-06-08',
    endDate: '2026-11-20',
    description: 'Summer resident care cohort.',
    phaseCount: 3,
  },
  // BlueSky Solar (emp 13) — 1 role, 2 cohorts
  {
    empIdx: 13,
    cohortLocalIdx: 0,
    roleLocalIdx: 0,
    name: 'BlueSky Solar — Spring 2026',
    startDate: '2026-03-23',
    endDate: '2026-09-18',
    description: 'Spring install-season helpers.',
    phaseCount: 2,
  },
  {
    empIdx: 13,
    cohortLocalIdx: 1,
    roleLocalIdx: 0,
    name: 'BlueSky Solar — Summer 2026',
    startDate: '2026-06-01',
    endDate: '2026-11-27',
    description: 'Summer install-season helpers.',
    phaseCount: 2,
  },
  // IndyCycle (emp 14) — 1 role, 1 cohort
  {
    empIdx: 14,
    cohortLocalIdx: 0,
    roleLocalIdx: 0,
    name: 'IndyCycle — Season 2026',
    startDate: '2026-04-06',
    endDate: '2026-10-02',
    description: 'Bike mechanic trainee cohort.',
    phaseCount: 2,
  },
  // Woodland Park (emp 15) — 1 role, 2 cohorts
  {
    empIdx: 15,
    cohortLocalIdx: 0,
    roleLocalIdx: 0,
    name: 'Woodland Park — Q1 2026 Vet Aide',
    startDate: '2026-01-26',
    endDate: '2026-06-26',
    description: 'Vet assistant cohort.',
    phaseCount: 2,
  },
  {
    empIdx: 15,
    cohortLocalIdx: 1,
    roleLocalIdx: 0,
    name: 'Woodland Park — Q3 2026 Vet Aide',
    startDate: '2026-07-13',
    endDate: '2026-12-11',
    description: 'Second vet assistant cohort.',
    phaseCount: 2,
  },
  // River City Demo (emp 16) — 1 role, 2 cohorts
  {
    empIdx: 16,
    cohortLocalIdx: 0,
    roleLocalIdx: 0,
    name: 'River City Demo — Spring 2026',
    startDate: '2026-02-09',
    endDate: '2026-08-07',
    description: 'Deconstruction laborer cohort.',
    phaseCount: 2,
  },
  {
    empIdx: 16,
    cohortLocalIdx: 1,
    roleLocalIdx: 0,
    name: 'River City Demo — Fall 2026',
    startDate: '2026-08-10',
    endDate: '2027-02-05',
    description: 'Fall deconstruction cohort.',
    phaseCount: 2,
  },
  // Precision Print (emp 17) — 2 roles, 2 cohorts
  {
    empIdx: 17,
    cohortLocalIdx: 0,
    roleLocalIdx: 0,
    name: 'Precision Print — Q1 2026 Press',
    startDate: '2026-01-12',
    endDate: '2026-07-10',
    description: 'Press operator trainee cohort.',
    phaseCount: 3,
  },
  {
    empIdx: 17,
    cohortLocalIdx: 1,
    roleLocalIdx: 1,
    name: 'Precision Print — Q1 2026 Bindery',
    startDate: '2026-02-02',
    endDate: '2026-07-31',
    description: 'Bindery associate cohort.',
    phaseCount: 2,
  },
  // Hopebridge (emp 18) — 1 role, 1 cohort
  {
    empIdx: 18,
    cohortLocalIdx: 0,
    roleLocalIdx: 0,
    name: 'Hopebridge — Q1 2026 General',
    startDate: '2026-01-19',
    endDate: '2026-07-17',
    description: 'General labor flex placement cohort.',
    phaseCount: 2,
  },
];

/* ─── Intern distribution per cohort ────────────────────────────────
 * Non-uniform: intern count varies by (cohortGlobalIdx % 5) → [2,3,4,5,6].
 * Total: sum(2..6 cycling over 34 cohorts) = 34 * 4 avg ≈ 136, adjusted below.
 */

function internsForCohortIdx(cohortGlobalIdx: number): number {
  return 2 + (cohortGlobalIdx % 5);
}

/* ─── Barrier label pool (match exactly what SEED_BARRIERS defines) ─ */

const BARRIER_LABELS = [
  'Transportation',
  'Childcare',
  'Housing instability',
  'Food insecurity',
  'Mental health',
  'Physical health',
  'Substance use recovery',
  'Justice-system involvement',
  'Limited work history',
  'Education / credential gap',
  'Digital access',
  'Other',
];

/**
 * Returns 0-3 barrier labels for a given intern global index.
 * Pattern cycles so different interns get different barriers.
 */
function barriersForIntern(internGlobalIdx: number): string[] {
  // 0 barriers for ~30%, 1 for ~30%, 2 for ~25%, 3 for ~15%
  const pattern = internGlobalIdx % 10;
  if (pattern < 3) return [];
  if (pattern < 6) return [BARRIER_LABELS[internGlobalIdx % BARRIER_LABELS.length]!];
  if (pattern < 9)
    return [
      BARRIER_LABELS[internGlobalIdx % BARRIER_LABELS.length]!,
      BARRIER_LABELS[(internGlobalIdx + 3) % BARRIER_LABELS.length]!,
    ];
  return [
    BARRIER_LABELS[internGlobalIdx % BARRIER_LABELS.length]!,
    BARRIER_LABELS[(internGlobalIdx + 3) % BARRIER_LABELS.length]!,
    BARRIER_LABELS[(internGlobalIdx + 7) % BARRIER_LABELS.length]!,
  ];
}

/**
 * Employment outcomes: ~60% true for 90-day, ~40% true for 180-day.
 * Index-based so identical across runs.
 */
function employmentOutcomes(internGlobalIdx: number): {
  employed90Day: boolean;
  employed180Day: boolean;
} {
  const employed90Day = internGlobalIdx % 10 < 6;
  // 180-day is a subset: only some of those employed at 90 remain at 180
  const employed180Day = internGlobalIdx % 10 < 4;
  return { employed90Day, employed180Day };
}

/* ─── Submission offset helper ───────────────────────────────────────
 * Returns a Date spread across the last ~8 weeks (56 days).
 * Different interns get different offsets so the trend chart sees a curve.
 */
function submittedAt(submissionGlobalIdx: number): Date {
  const now = new Date();
  // Spread across 56 days (8 weeks), oldest first
  const dayOffset = 56 - (submissionGlobalIdx % 57);
  const d = new Date(now);
  d.setDate(d.getDate() - dayOffset);
  return d;
}

/* ─── Main ───────────────────────────────────────────────────────── */

async function main() {
  const client = postgres(databaseUrl!, { max: 1 });
  const db = drizzle(client, { schema });

  try {
    /* ── 1. Look up existing phases by label ─────────────────────── */
    console.log('Fetching existing phases...');
    const existingPhases = await db.select().from(schema.phases);
    const phaseByLabel = new Map(existingPhases.map((p) => [p.label, p]));

    if (phaseByLabel.size === 0) {
      console.error(
        'ERROR: No phases found in the database. ' +
          'Run `npm run db:seed` first to populate the phases library.',
      );
      process.exit(1);
    }
    console.log(`  Found ${phaseByLabel.size} phases: ${[...phaseByLabel.keys()].join(', ')}`);

    /* ── 2. Look up existing barriers by label ───────────────────── */
    console.log('Fetching existing barriers...');
    const existingBarriers = await db.select().from(schema.barriers);
    const barrierByLabel = new Map(existingBarriers.map((b) => [b.label, b]));

    if (barrierByLabel.size === 0) {
      console.error(
        'ERROR: No barriers found in the database. ' +
          'Run `npm run db:seed` first to populate the barriers library.',
      );
      process.exit(1);
    }
    console.log(`  Found ${barrierByLabel.size} barriers.`);

    // Build an ordered array of phase ids (Phase 1, Phase 2, …)
    const orderedPhaseIds = ['Phase 1', 'Phase 2', 'Phase 3', 'Phase 4']
      .map((label) => phaseByLabel.get(label)?.id)
      .filter((id): id is string => id !== undefined);

    /* ── 3. Insert employers ─────────────────────────────────────── */
    console.log('\nInserting demo employers...');
    const employerRows = DEMO_EMPLOYERS.map((e) => ({
      id: employerId(e.idx),
      name: e.name,
      contactName: e.contactName,
      contactEmail: e.contactEmail,
      phone: null as string | null,
      notes: null as string | null,
    }));
    const insertedEmployers = await db
      .insert(schema.employers)
      .values(employerRows)
      .onConflictDoNothing({ target: schema.employers.id })
      .returning({ id: schema.employers.id });
    console.log(
      `  Inserted ${insertedEmployers.length} new employers (${employerRows.length - insertedEmployers.length} already existed).`,
    );

    /* ── 4. Insert roles ─────────────────────────────────────────── */
    console.log('Inserting demo roles...');
    const roleRows: {
      id: string;
      employerId: string;
      label: string;
      description: string | null;
    }[] = [];
    for (const e of DEMO_EMPLOYERS) {
      e.roles.forEach((r, rIdx) => {
        roleRows.push({
          id: roleId(e.idx, rIdx),
          employerId: employerId(e.idx),
          label: r.label,
          description: r.description,
        });
      });
    }
    const insertedRoles = await db
      .insert(schema.roles)
      .values(roleRows)
      .onConflictDoNothing({ target: schema.roles.id })
      .returning({ id: schema.roles.id });
    console.log(
      `  Inserted ${insertedRoles.length} new roles (${roleRows.length - insertedRoles.length} already existed).`,
    );

    /* ── 5. Insert cohorts + cohort_phases ───────────────────────── */
    console.log('Inserting demo cohorts...');
    const cohortRows = DEMO_COHORTS.map((c) => ({
      id: cohortId(c.empIdx, c.cohortLocalIdx),
      employerId: employerId(c.empIdx),
      roleId: roleId(c.empIdx, c.roleLocalIdx),
      name: c.name,
      startDate: c.startDate,
      endDate: c.endDate,
      description: c.description,
    }));
    const insertedCohorts = await db
      .insert(schema.cohorts)
      .values(cohortRows)
      .onConflictDoNothing({ target: schema.cohorts.id })
      .returning({ id: schema.cohorts.id });
    console.log(
      `  Inserted ${insertedCohorts.length} new cohorts (${cohortRows.length - insertedCohorts.length} already existed).`,
    );

    // cohort_phases: link each new cohort to its first N phases
    console.log('Linking demo cohort_phases...');
    const cohortPhaseRows: { cohortId: string; phaseId: string; sortOrder: number }[] = [];
    for (const c of DEMO_COHORTS) {
      const cId = cohortId(c.empIdx, c.cohortLocalIdx);
      const n = Math.min(c.phaseCount, orderedPhaseIds.length);
      for (let i = 0; i < n; i++) {
        cohortPhaseRows.push({
          cohortId: cId,
          phaseId: orderedPhaseIds[i]!,
          sortOrder: i + 1,
        });
      }
    }
    if (cohortPhaseRows.length > 0) {
      // cohort_phases PK is (cohort_id, phase_id) — onConflictDoNothing on the composite PK
      await db.insert(schema.cohortPhases).values(cohortPhaseRows).onConflictDoNothing();
    }
    console.log(`  Linked ${cohortPhaseRows.length} cohort-phase associations.`);

    /* ── 6. Insert interns ───────────────────────────────────────── */
    console.log('Inserting demo interns, entry assessments, barriers, outcomes...');

    let globalInternIdx = 0;
    let globalSubmissionIdx = 0;

    // We'll collect unique barrier (internId, barrierId) pairs to avoid dupes within a single intern
    const internRows: {
      id: string;
      cohortId: string;
      roleId: string | null;
      firstInitial: string;
      lastName: string;
      startDate: string | null;
      endDate: string | null;
    }[] = [];

    const entryAssessmentRows: { internId: string; notes: string | null; completedAt: Date }[] = [];
    const entryBarrierRows: { internId: string; barrierId: string }[] = [];
    const outcomeRows: {
      internId: string;
      employed90Day: boolean;
      employed180Day: boolean;
    }[] = [];

    for (let cIdx = 0; cIdx < DEMO_COHORTS.length; cIdx++) {
      const c = DEMO_COHORTS[cIdx]!;
      const cId = cohortId(c.empIdx, c.cohortLocalIdx);
      const rId = roleId(c.empIdx, c.roleLocalIdx);
      const count = internsForCohortIdx(cIdx);

      for (let j = 0; j < count; j++) {
        const iIdx = globalInternIdx++;
        const iId = internId(iIdx);
        const { firstInitial, lastName } = internName(iIdx);

        internRows.push({
          id: iId,
          cohortId: cId,
          roleId: rId,
          firstInitial,
          lastName,
          startDate: c.startDate,
          endDate: null,
        });

        entryAssessmentRows.push({
          internId: iId,
          notes: null,
          completedAt: new Date(),
        });

        // Barriers — deduplicate within this intern
        const barrierLabels = barriersForIntern(iIdx);
        const seenBarrierIds = new Set<string>();
        for (const label of barrierLabels) {
          const barrier = barrierByLabel.get(label);
          if (barrier && !seenBarrierIds.has(barrier.id)) {
            seenBarrierIds.add(barrier.id);
            entryBarrierRows.push({ internId: iId, barrierId: barrier.id });
          }
        }

        const { employed90Day, employed180Day } = employmentOutcomes(iIdx);
        outcomeRows.push({ internId: iId, employed90Day, employed180Day });
      }
    }

    const totalInterns = internRows.length;
    console.log(`  Preparing ${totalInterns} interns across ${DEMO_COHORTS.length} cohorts...`);

    const insertedInterns = await db
      .insert(schema.interns)
      .values(internRows)
      .onConflictDoNothing({ target: schema.interns.id })
      .returning({ id: schema.interns.id });
    console.log(`  Inserted ${insertedInterns.length} new interns.`);

    // Build set of actually-inserted intern ids for dependent inserts
    const insertedInternIdSet = new Set(insertedInterns.map((r) => r.id));

    // Filter dependent rows to only inserted interns (idempotency: skip if intern already had these)
    const filteredEntryAssessments = entryAssessmentRows.filter((r) =>
      insertedInternIdSet.has(r.internId),
    );
    const filteredBarriers = entryBarrierRows.filter((r) => insertedInternIdSet.has(r.internId));
    const filteredOutcomes = outcomeRows.filter((r) => insertedInternIdSet.has(r.internId));

    if (filteredEntryAssessments.length > 0) {
      await db
        .insert(schema.internEntryAssessment)
        .values(filteredEntryAssessments)
        .onConflictDoNothing({ target: schema.internEntryAssessment.internId });
    }

    if (filteredBarriers.length > 0) {
      await db.insert(schema.internEntryBarriers).values(filteredBarriers).onConflictDoNothing();
    }

    if (filteredOutcomes.length > 0) {
      await db
        .insert(schema.internEmploymentOutcomes)
        .values(filteredOutcomes)
        .onConflictDoNothing({ target: schema.internEmploymentOutcomes.internId });
    }

    console.log(`  Entry assessments: ${filteredEntryAssessments.length} inserted.`);
    console.log(`  Entry barrier links: ${filteredBarriers.length} inserted.`);
    console.log(`  Employment outcomes: ${filteredOutcomes.length} inserted.`);

    /* ── 7. Insert assessment submissions ────────────────────────── */
    console.log('\nInserting demo assessment submissions...');

    // We submit for roughly the first 2/3 of newly-inserted interns.
    // Competency submissions: every other intern (alternating)
    // Self-assessment (one-shot) types: staggered by mod 3

    const submissionRows: {
      id: string;
      type:
        | 'competency'
        | 'personal-goals'
        | 'midpoint-reflection'
        | 'participant-feedback'
        | 'exit-employer-survey';
      internId: string;
      submittedBy: null;
      phase: string | null;
      answers: Record<string, unknown>;
      submittedAt: Date;
    }[] = [];

    // Rebuild the intern index map from the rows we built (all of them, not just inserted)
    // so submission IDs are stable regardless of idempotency state.
    for (let iIdx = 0; iIdx < internRows.length; iIdx++) {
      const iId = internRows[iIdx]!.id;
      const wasInserted = insertedInternIdSet.has(iId);

      // Only generate submissions for newly-inserted interns to stay idempotent.
      // On re-run insertedInternIdSet is empty so no new submissions are generated.
      if (!wasInserted) continue;

      // ~67% of interns get a competency submission
      if (iIdx % 3 !== 2) {
        const sId = submissionId(globalSubmissionIdx++);
        submissionRows.push({
          id: sId,
          type: 'competency',
          internId: iId,
          submittedBy: null,
          phase: 'Phase 1', // phase REQUIRED for competency
          answers: {},
          submittedAt: submittedAt(globalSubmissionIdx),
        });
      }

      // personal-goals: ~50% of interns (every other)
      if (iIdx % 2 === 0) {
        const sId = submissionId(globalSubmissionIdx++);
        submissionRows.push({
          id: sId,
          type: 'personal-goals',
          internId: iId,
          submittedBy: null,
          phase: null, // phase MUST be NULL for one-shot types
          answers: {},
          submittedAt: submittedAt(globalSubmissionIdx),
        });
      }

      // midpoint-reflection: ~33% of interns
      if (iIdx % 3 === 0) {
        const sId = submissionId(globalSubmissionIdx++);
        submissionRows.push({
          id: sId,
          type: 'midpoint-reflection',
          internId: iId,
          submittedBy: null,
          phase: null,
          answers: {},
          submittedAt: submittedAt(globalSubmissionIdx),
        });
      }

      // participant-feedback: ~25% of interns
      if (iIdx % 4 === 0) {
        const sId = submissionId(globalSubmissionIdx++);
        submissionRows.push({
          id: sId,
          type: 'participant-feedback',
          internId: iId,
          submittedBy: null,
          phase: null,
          answers: {},
          submittedAt: submittedAt(globalSubmissionIdx),
        });
      }
    }

    if (submissionRows.length > 0) {
      // Insert in batches to avoid "too many parameters" for large sets
      const BATCH = 50;
      let insertedSubs = 0;
      for (let i = 0; i < submissionRows.length; i += BATCH) {
        const batch = submissionRows.slice(i, i + BATCH);
        const result = await db
          .insert(schema.assessmentSubmissions)
          .values(batch)
          .onConflictDoNothing({ target: schema.assessmentSubmissions.id })
          .returning({ id: schema.assessmentSubmissions.id });
        insertedSubs += result.length;
      }
      console.log(
        `  Inserted ${insertedSubs} new assessment submissions (${submissionRows.length} attempted).`,
      );
    } else {
      console.log('  No new assessment submissions to insert (all interns pre-existing).');
    }

    /* ── 8. Count report ─────────────────────────────────────────── */
    console.log('\n─── Row counts after demo seed ───');

    const [{ count: empCount }] = await client<[{ count: string }]>`
      SELECT COUNT(*)::text AS count FROM public.employers
    `;
    const [{ count: cohortCount }] = await client<[{ count: string }]>`
      SELECT COUNT(*)::text AS count FROM public.cohorts
    `;
    const [{ count: internCount }] = await client<[{ count: string }]>`
      SELECT COUNT(*)::text AS count FROM public.interns WHERE deleted_at IS NULL
    `;
    const [{ count: out90Count }] = await client<[{ count: string }]>`
      SELECT COUNT(*)::text AS count FROM public.intern_employment_outcomes WHERE employed_90_day = true
    `;
    const [{ count: out180Count }] = await client<[{ count: string }]>`
      SELECT COUNT(*)::text AS count FROM public.intern_employment_outcomes WHERE employed_180_day = true
    `;
    const [{ count: subCount }] = await client<[{ count: string }]>`
      SELECT COUNT(*)::text AS count FROM public.assessment_submissions WHERE deleted_at IS NULL
    `;
    const [{ count: compCount }] = await client<[{ count: string }]>`
      SELECT COUNT(*)::text AS count FROM public.assessment_submissions WHERE type = 'competency' AND deleted_at IS NULL
    `;

    console.log(`  employers:                         ${empCount}`);
    console.log(`  cohorts:                           ${cohortCount}`);
    console.log(`  interns (active):                  ${internCount}`);
    console.log(`  intern_employment_outcomes 90-day: ${out90Count}`);
    console.log(`  intern_employment_outcomes 180-day: ${out180Count}`);
    console.log(`  assessment_submissions (total):    ${subCount}`);
    console.log(`    of which competency:             ${compCount}`);
    console.log('\nDemo seed complete.');
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
