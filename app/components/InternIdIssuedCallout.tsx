import { useState } from 'react';
import { InternCode } from './InternCode';

// One-time callout shown on the intern detail page right after creation
// (`?issued=1`). Copy is fixed by the spec (§6) — do not reword.
export function InternIdIssuedCallout({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable (insecure context / permissions) — the code is on screen.
    }
  }

  return (
    <section>
      <div className="container">
        <div className="issued-callout" role="status" data-testid="intern-id-issued">
          <div className="issued-callout__label">Intern ID issued</div>
          <div className="issued-callout__row">
            <InternCode code={code} size="lg" />
            <button type="button" className="btn btn--outline btn--sm" onClick={copy}>
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <p className="issued-callout__body">
            Record this ID against the intern&apos;s name in the program roster now, and give it to
            the intern. The portal does not know who this person is and cannot look it up for you.
          </p>
        </div>
      </div>
    </section>
  );
}
