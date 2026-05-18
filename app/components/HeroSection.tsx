// Hero primitive — ported from the prototype's `.hero` block (index.html).
// Canvas background section with a mono micro-label row (with the
// `::before` baseline rule), an Archivo Black headline that uses the
// `.accent-underline` gold-bar treatment on a final word, a subhead
// paragraph, and a CTA row. The headline rendering accepts a ReactNode
// so callers can pass the multi-line + accent-underline structure
// directly (e.g. `<>EXPAND YOUR<br/><span className="accent-underline">
// OPPORTUNITIES.</span></>`).

import type { ReactNode } from 'react';

export interface HeroSectionProps {
  /** Mono eyebrow label (e.g. "Indiana / Cohort Program / 2026"). */
  microLabel: ReactNode;
  /** Display headline — JSX so callers can place `<br/>` + `.accent-underline`. */
  headline: ReactNode;
  /** Subhead prose beneath the headline. */
  subhead: ReactNode;
  /** CTA button row (typically a `.btn.btn--primary` link or two). */
  ctas: ReactNode;
  /** Render the gold-corner glyph in the headline corner. */
  showCorner?: boolean;
}

export function HeroSection({
  microLabel,
  headline,
  subhead,
  ctas,
  showCorner = true,
}: HeroSectionProps) {
  return (
    <section className="hero">
      <div className="container">
        <div className="hero__grid">
          <div className="hero__left">
            <div className="hero__label-row">
              <span className="micro-label">{microLabel}</span>
            </div>
            <h1 className="hero__headline" style={{ position: 'relative' }}>
              {showCorner ? <span className="hero__corner" /> : null}
              {headline}
            </h1>
            <p className="hero__subhead">{subhead}</p>
            <div className="hero__ctas">{ctas}</div>
          </div>
        </div>
      </div>
    </section>
  );
}
