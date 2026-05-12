import type { ReactNode } from 'react';
import { SettingsRail, type SettingsTab } from './SettingsRail';

export function SettingsShell({ active, children }: { active: SettingsTab; children: ReactNode }) {
  return (
    <section className="container">
      <div className="settings-shell">
        <SettingsRail active={active} />
        <main>{children}</main>
      </div>
    </section>
  );
}
