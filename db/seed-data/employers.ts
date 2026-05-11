export interface SeedEmployer {
  id: string;
  name: string;
  contactName: string | null;
  contactEmail: string | null;
  phone: string | null;
  notes: string | null;
}

export const SEED_EMPLOYERS: SeedEmployer[] = [
  {
    id: '11111111-1111-1111-1111-111111111101',
    name: 'Riverbend Manufacturing',
    contactName: 'Dana Reyes',
    contactEmail: 'dana@riverbendmfg.example.com',
    phone: '(317) 555-0101',
    notes: 'Long-time partner; metal fabrication shop floor placements.',
  },
  {
    id: '11111111-1111-1111-1111-111111111102',
    name: 'Northside Hospital Network',
    contactName: 'Priya Shah',
    contactEmail: 'priya.shah@northsidehospital.example.com',
    phone: '(317) 555-0102',
    notes: 'CNA-track placements; requires background check before start.',
  },
  {
    id: '11111111-1111-1111-1111-111111111103',
    name: 'Capitol City Logistics',
    contactName: 'Marcus Hill',
    contactEmail: 'marcus@capcitylog.example.com',
    phone: '(317) 555-0103',
    notes: 'Warehouse + forklift cert pathway.',
  },
  {
    id: '11111111-1111-1111-1111-111111111104',
    name: 'Heartland Hospitality Group',
    contactName: 'Sara Okeke',
    contactEmail: 'sara@heartlandhg.example.com',
    phone: '(317) 555-0104',
    notes: 'Front-of-house and culinary placements across 3 properties.',
  },
  {
    id: '11111111-1111-1111-1111-111111111105',
    name: 'Crossroads Community Bank',
    contactName: 'Ellen Park',
    contactEmail: 'epark@crossroadscb.example.com',
    phone: '(317) 555-0105',
    notes: 'Teller-track placement; financial literacy curriculum overlap.',
  },
  {
    id: '11111111-1111-1111-1111-111111111106',
    name: 'GreenLine Landscaping Co-op',
    contactName: 'Tyrell Adams',
    contactEmail: 'tyrell@greenlineco.example.com',
    phone: '(317) 555-0106',
    notes: 'Seasonal; April–October cohorts only.',
  },
];
