interface SectionHeaderProps {
  label: string;
  subLabel?: string;
}

export function SectionHeader({ label, subLabel }: SectionHeaderProps) {
  return (
    <header className="rubric-section-head">
      <div>
        <span className="rubric-section-head__label">Section</span>
        <h2 className="rubric-section-head__title">{label}</h2>
      </div>
      {subLabel ? <span className="rubric-section-head__aside">{subLabel}</span> : null}
    </header>
  );
}
