export interface ParticipationFactorItem {
  id: string;
  label: string;
  description?: string | null;
}

export function ParticipationFactorCheckList({
  factors,
  checkedIds,
  name = 'participationFactorIds',
  disabled,
}: {
  factors: ParticipationFactorItem[];
  checkedIds: string[];
  name?: string;
  disabled?: boolean;
}) {
  const set = new Set(checkedIds);
  return (
    <div className="participation-factor-check-list" data-participation-factor-list>
      {/* KP July-2026 feedback: testers could not tell whether a check meant
          "applies" or "does not apply". Say it once, above the list. */}
      <p className="participation-factor-check-list__intro">
        Check each factor that applied to this intern&apos;s participation in the program. Leave a
        factor unchecked if it did not apply.
      </p>
      {factors.map((f) => {
        const id = `participation-factor-${f.id}`;
        return (
          <div className="outcome-check" key={f.id}>
            <input
              type="checkbox"
              id={id}
              name={name}
              value={f.id}
              defaultChecked={set.has(f.id)}
              disabled={disabled}
            />
            <label htmlFor={id}>
              {f.label}
              {f.description ? (
                <span className="participation-factor-check-list__desc">{f.description}</span>
              ) : null}
            </label>
          </div>
        );
      })}
    </div>
  );
}
