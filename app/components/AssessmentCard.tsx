// Assessment-card primitive — ported from the prototype's
// `.assessment-card` block (assessments.html admin hub). White surface
// card with an optional gold "stage" pill, a mono meta line
// ("COMPETENCY ASSESSMENT"), an Archivo Black title, body prose, and an
// action slot at the bottom (typically a `.btn` or a `.assessment-card__pill`
// completed-state badge).

import type { ReactNode } from 'react';

export interface AssessmentCardProps {
  /** Optional gold-pill stage hint (e.g. "PER INTERN · PHASED"). */
  stage?: ReactNode;
  /** Mono meta label above the title (e.g. "COMPETENCY ASSESSMENT"). */
  meta: ReactNode;
  /** Display-font title. */
  title: ReactNode;
  /** Body prose. */
  body: ReactNode;
  /** Action / CTA slot (button, link, or status pill). */
  action: ReactNode;
  /** Mark the card as completed (greyed-out + canvas surface). */
  done?: boolean;
}

export function AssessmentCard({ stage, meta, title, body, action, done }: AssessmentCardProps) {
  const cls = done ? 'assessment-card assessment-card--done' : 'assessment-card';
  return (
    <article className={cls}>
      {stage ? <span className="assessment-card__stage">{stage}</span> : null}
      <span className="assessment-card__meta">{meta}</span>
      <h2 className="assessment-card__title">{title}</h2>
      <p className="assessment-card__body">{body}</p>
      <div className="assessment-card__status">{action}</div>
    </article>
  );
}
