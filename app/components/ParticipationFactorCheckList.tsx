export interface ParticipationFactorItem {
  id: string;
  label: string;
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
            <label htmlFor={id}>{f.label}</label>
          </div>
        );
      })}
    </div>
  );
}
