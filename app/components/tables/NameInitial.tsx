// NameInitial chip — ported from the prototype's `.col-name + .name-initial`
// composition (interns-dashboard.html, assessments.html picker). A square
// gold-canvas initial bubble paired with the intern's name in Archivo
// Black. Sits inside `<td>.col-name` cells; the wrapper applies the
// `.col-name` class so this composition can be dropped into any
// `.assessments` table row.

export interface NameInitialProps {
  /** Two-letter initial bubble (e.g. "BA" for Bayer). Will be uppercased. */
  initials: string;
  /** Display name shown to the right of the bubble. */
  name: string;
}

export function NameInitial({ initials, name }: NameInitialProps) {
  return (
    <div className="col-name">
      <span className="name-initial">{initials.toUpperCase()}</span>
      {name}
    </div>
  );
}
