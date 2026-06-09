// app/components/UserStatusPill.tsx
// Small status chip for the Users area. Inline token styles keep it self-
// contained (no shared-CSS edit). Colors map to the brand tokens.
import type { CSSProperties } from 'react';
import type { AccountStatus } from '~/lib/users.server';

const STYLE: Record<AccountStatus, { label: string; bg: string; color: string }> = {
  active: { label: 'Active', bg: 'rgba(27,143,74,.14)', color: 'var(--success)' },
  invited: { label: 'Invited', bg: 'rgba(255,215,31,.22)', color: '#8a6a00' },
  deactivated: { label: 'Deactivated', bg: 'var(--canvas-alt)', color: 'var(--muted)' },
};

export function UserStatusPill({ status }: { status: AccountStatus }) {
  const s = STYLE[status];
  const style: CSSProperties = {
    fontFamily: 'var(--font-mono)',
    fontSize: 11,
    letterSpacing: '.3px',
    padding: '3px 10px',
    borderRadius: 20,
    background: s.bg,
    color: s.color,
    whiteSpace: 'nowrap',
  };
  return <span style={style}>{s.label}</span>;
}
