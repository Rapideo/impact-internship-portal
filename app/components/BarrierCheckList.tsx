export interface BarrierItem {
  id: string;
  label: string;
}

export function BarrierCheckList({
  barriers,
  checkedIds,
  name = 'barrierIds',
  disabled,
}: {
  barriers: BarrierItem[];
  checkedIds: string[];
  name?: string;
  disabled?: boolean;
}) {
  const set = new Set(checkedIds);
  return (
    <div className="barrier-check-list" data-barrier-list>
      {barriers.map((b) => {
        const id = `barrier-${b.id}`;
        return (
          <div className="outcome-check" key={b.id}>
            <input
              type="checkbox"
              id={id}
              name={name}
              value={b.id}
              defaultChecked={set.has(b.id)}
              disabled={disabled}
            />
            <label htmlFor={id}>{b.label}</label>
          </div>
        );
      })}
    </div>
  );
}
