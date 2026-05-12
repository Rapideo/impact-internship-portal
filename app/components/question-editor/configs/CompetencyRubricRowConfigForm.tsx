import type { CompetencyRubricRowQuestion as Q } from '../../../lib/question-types';

interface Props {
  question: Q;
  onChange: (next: Q) => void;
}

// Intentionally non-reactive: this component takes the same props shape as
// its siblings to keep the editor dispatch simple, but renders only a hint.
export function CompetencyRubricRowConfigForm(_props: Props) {
  return (
    <p style={{ color: 'var(--muted)', fontSize: 13, margin: '8px 0' }}>
      No additional config — fixed Emerging / Developing / Ready + Notes layout.
    </p>
  );
}
