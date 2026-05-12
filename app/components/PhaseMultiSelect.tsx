export interface PhaseItem {
  id: string;
  label: string;
}

export function PhaseMultiSelect({
  phases,
  selectedIds,
  name = 'phaseIds',
  legend = 'Phases applicable to this cohort',
  error,
}: {
  phases: PhaseItem[];
  selectedIds: string[];
  name?: string;
  legend?: string;
  error?: string;
}) {
  const set = new Set(selectedIds);
  return (
    <fieldset className={`phase-multi-select${error ? ' input--error' : ''}`}>
      <legend>{legend}</legend>
      {phases.map((p) => {
        const id = `phase-${p.id}`;
        return (
          <label className="phase-multi-select__item" key={p.id} htmlFor={id}>
            <input
              type="checkbox"
              id={id}
              name={name}
              value={p.id}
              defaultChecked={set.has(p.id)}
            />
            <span>{p.label}</span>
          </label>
        );
      })}
      {error ? (
        <div className="field__error" style={{ marginTop: 8 }}>
          {error}
        </div>
      ) : null}
    </fieldset>
  );
}
