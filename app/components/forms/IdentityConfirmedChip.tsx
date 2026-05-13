// Stateless presentational chip used at the top of intern self-assessment
// forms (and the admin chooser hub) to confirm "you are signed in as ...".
//
// The markup mirrors the prototype's `.identity-confirmed` block: a checkmark
// glyph followed by 4 label/value pairs separated by dividers, with an
// optional "Switch" button (only the chooser hub passes `onSwitch`).
//
// Styles come from app/styles/admin.css (`.identity-confirmed*` BEM classes —
// added alongside this component as part of SP4 Phase B).

export interface IdentityConfirmedChipProps {
  firstInitial: string;
  lastName: string;
  employerName: string;
  cohortName: string;
  onSwitch?: () => void;
}

export function IdentityConfirmedChip({
  firstInitial,
  lastName,
  employerName,
  cohortName,
  onSwitch,
}: IdentityConfirmedChipProps) {
  const displayName = `${firstInitial}. ${lastName}`.trim();
  return (
    <div className="identity-confirmed" data-testid="identity-confirmed-chip">
      <span className="identity-confirmed__check" aria-hidden="true">
        {/* simple checkmark glyph — matches prototype */}
        &#10003;
      </span>
      <span className="identity-confirmed__label">Confirmed as</span>
      <span className="identity-confirmed__value">{displayName}</span>
      <span className="identity-confirmed__divider" aria-hidden="true">
        |
      </span>
      <span className="identity-confirmed__label">Employer</span>
      <span className="identity-confirmed__value">{employerName}</span>
      <span className="identity-confirmed__divider" aria-hidden="true">
        |
      </span>
      <span className="identity-confirmed__label">Cohort</span>
      <span className="identity-confirmed__value">{cohortName}</span>
      {onSwitch ? (
        <button
          type="button"
          className="identity-confirmed__switch btn btn--ghost"
          onClick={onSwitch}
        >
          Switch
        </button>
      ) : null}
    </div>
  );
}
