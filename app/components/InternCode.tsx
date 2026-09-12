// The Intern ID, rendered the same way everywhere (spec §6): IBM Plex Mono,
// tabular digits. Registered in admin.css as `.intern-code` (+ `--lg`).
export interface InternCodeProps {
  code: string;
  size?: 'md' | 'lg';
  /** Table-row emphasis — the ID is the row's identity, so it carries the weight the name used to. */
  strong?: boolean;
}

export function InternCode({ code, size = 'md', strong = false }: InternCodeProps) {
  const cls = [
    'intern-code',
    size === 'lg' ? 'intern-code--lg' : '',
    strong ? 'intern-code--strong' : '',
  ]
    .filter(Boolean)
    .join(' ');
  return <span className={cls}>{code}</span>;
}
