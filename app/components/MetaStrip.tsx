export interface MetaItem {
  label: string;
  value: string;
  mono?: boolean;
}

export function MetaStrip({ items }: { items: MetaItem[] }) {
  return (
    <div className="meta-strip">
      {items.map((it) => (
        <div className="meta-strip__item" key={it.label}>
          <span className="meta-strip__label">{it.label}</span>
          <span className={`meta-strip__value${it.mono ? ' mono' : ''}`}>{it.value || '—'}</span>
        </div>
      ))}
    </div>
  );
}
