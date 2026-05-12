import { NavLink } from 'react-router';

export type SettingsTab = 'employers' | 'questions' | 'phases' | 'barriers' | 'program-info';

const ITEMS: Array<{ tab: SettingsTab; to: string; label: string }> = [
  { tab: 'employers', to: '/admin/settings/employers', label: 'Employers' },
  { tab: 'questions', to: '/admin/settings/questions', label: 'Assessments' },
  { tab: 'phases', to: '/admin/settings/phases', label: 'Assessment Phases' },
  { tab: 'barriers', to: '/admin/settings/barriers', label: 'Barriers' },
  { tab: 'program-info', to: '/admin/settings/program-info', label: 'Program Info' },
];

export function SettingsRail({ active }: { active: SettingsTab }) {
  return (
    <aside className="settings-rail">
      <span className="settings-rail__group">Settings</span>
      {ITEMS.map((it) => (
        <NavLink
          key={it.tab}
          to={it.to}
          className={() =>
            `settings-rail__item${active === it.tab ? ' settings-rail__item--active' : ''}`
          }
        >
          {it.label}
        </NavLink>
      ))}
    </aside>
  );
}
