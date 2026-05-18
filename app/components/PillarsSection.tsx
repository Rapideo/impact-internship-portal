// Pillars primitive — ported from the prototype's `.section` + `.pillars`
// block (index.html "Three stages. One trajectory."). A section with an
// asymmetric head (micro-label + display title on the left, intro prose on
// the right) and a 3-up grid of numbered pillar cards. Each pillar has a
// mono `01 / Stage One` numeral, an Archivo Black title, body prose, and
// a divided meta row at the bottom (left + right cells; right cell renders
// cyan per `.pillar__meta span:last-child`).

import type { ReactNode } from 'react';

export interface Pillar {
  num: string; // e.g. "01 / Stage One"
  title: ReactNode;
  body: ReactNode;
  metaLeft?: ReactNode;
  metaRight?: ReactNode;
}

export interface PillarsSectionProps {
  /** Section anchor id (used by `#about` from the hero CTA). */
  id?: string;
  microLabel: ReactNode;
  /** Display-font heading. JSX so callers can place `<br/>`. */
  title: ReactNode;
  intro: ReactNode;
  pillars: ReadonlyArray<Pillar>;
}

export function PillarsSection({ id, microLabel, title, intro, pillars }: PillarsSectionProps) {
  return (
    <section className="section" id={id}>
      <div className="container">
        <div className="section__head">
          <div>
            <span className="micro-label">{microLabel}</span>
            <h2 className="section__title">{title}</h2>
          </div>
          <p className="section__intro">{intro}</p>
        </div>
        <div className="pillars">
          {pillars.map((p, i) => (
            <article className="pillar" key={i}>
              <div className="pillar__num">{p.num}</div>
              <h3 className="pillar__title">{p.title}</h3>
              <p className="pillar__body">{p.body}</p>
              {(p.metaLeft || p.metaRight) && (
                <div className="pillar__meta">
                  <span>{p.metaLeft}</span>
                  <span>{p.metaRight}</span>
                </div>
              )}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
