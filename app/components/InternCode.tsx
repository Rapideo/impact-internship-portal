// The Intern ID, rendered the same way everywhere (spec §6): IBM Plex Mono,
// tabular digits. Registered in admin.css as `.intern-code` (+ `--lg`).
export interface InternCodeProps {
  code: string;
  size?: 'md' | 'lg';
}

export function InternCode({ code, size = 'md' }: InternCodeProps) {
  return <span className={`intern-code${size === 'lg' ? ' intern-code--lg' : ''}`}>{code}</span>;
}
