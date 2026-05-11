export interface SeedRole {
  id: string;
  employerId: string;
  label: string;
  description: string | null;
}

export const SEED_ROLES: SeedRole[] = [
  {
    id: '22222222-2222-2222-2222-222222222201',
    employerId: '11111111-1111-1111-1111-111111111101',
    label: 'Production Assistant',
    description: 'Shop-floor support; basic fabrication and quality checks.',
  },
  {
    id: '22222222-2222-2222-2222-222222222202',
    employerId: '11111111-1111-1111-1111-111111111102',
    label: 'CNA Trainee',
    description: 'Patient-care support shadowing licensed CNAs.',
  },
  {
    id: '22222222-2222-2222-2222-222222222203',
    employerId: '11111111-1111-1111-1111-111111111103',
    label: 'Warehouse Associate',
    description: 'Pick/pack, inventory cycle counts, forklift cert track.',
  },
  {
    id: '22222222-2222-2222-2222-222222222204',
    employerId: '11111111-1111-1111-1111-111111111104',
    label: 'Hospitality Floor Trainee',
    description: 'Front-of-house and prep-kitchen rotations.',
  },
  {
    id: '22222222-2222-2222-2222-222222222205',
    employerId: '11111111-1111-1111-1111-111111111105',
    label: 'Teller Trainee',
    description: 'Branch teller line with financial literacy module.',
  },
  {
    id: '22222222-2222-2222-2222-222222222206',
    employerId: '11111111-1111-1111-1111-111111111106',
    label: 'Landscape Crew Member',
    description: 'Crew rotations across residential and commercial sites.',
  },
];
