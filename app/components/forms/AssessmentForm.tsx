// Shared form body used by Personal Goals, Midpoint Reflection, Participant
// Feedback, and (via wrapper) Exit Employer Survey.
//
// SP7 Phase C rewrite — preserves the existing prop API verbatim. New props
// (`sectionBreaks`, `cancelHref`, `cancelLabel`, `statusCaption`,
// `identityChip`) are additive with safe defaults so every existing call
// site keeps compiling. Internal markup now mirrors the prototype's
// free-form intern self-assessment pages (personal-goals.html,
// midpoint-reflection.html, participant-feedback.html):
//
//   - The optional <IdentityConfirmedChip> renders once at the top of the
//     form. The page-level "SUBMITTING AS" micro-label that some routes
//     wrap the chip with is unnecessary — the chip already carries that
//     label per prototype.
//   - Question stack inside `.rubric.assessment-questions` (existing).
//   - `sectionBreaks` injects a navy display-font `<h3
//     class="assessment-section-head">` between two question groups —
//     matches Personal Goals' "My Focus for This Internship" break between
//     Q4 and Q5. Implemented by computing a `SectionBoundary[]` from the
//     friendlier `{afterQuestionIndex, title}` shape so the existing
//     QuestionRenderer pipeline handles the placement.
//   - Submit row is now the sticky <ActionBar> primitive (SP7 Phase B,
//     position: fixed bottom), with an optional Cancel button on the left
//     of the button group and a mono status caption on the left of the
//     bar. Defaults preserve the SP4 behavior (no Cancel; uppercased
//     submitLabel as the status caption).
//
// SP3 contract drift (relative to the SP4 plan freeze):
//   - `Question` + `SerializedAnswers` live in `~/lib/question-types`, not
//     `~/lib/question-engine`.
//   - `QuestionRenderer` is exported from `~/components/question-renderer`,
//     not from `~/lib/question-engine`.
//   - The renderer takes `disabled` (not `readOnly`) and accepts an optional
//     `errors` prop. We adapt by passing `disabled={true}` when readOnly is
//     true and by omitting `errors` in read-only mode.

import { useMemo, useRef, useState, type ReactNode } from 'react';
import { Form, Link } from 'react-router';
import { ActionBar } from '~/components/ActionBar';
import { QuestionRenderer } from '~/components/question-renderer';
import type { Question, SectionBoundary, SerializedAnswers } from '~/lib/question-types';
import { IdentityConfirmedChip } from './IdentityConfirmedChip';
import { SubmitConfirmModal } from './SubmitConfirmModal';

export interface AssessmentFormSectionBreak {
  /** Zero-based index of the question this break sits AFTER. */
  afterQuestionIndex: number;
  /** Display-font heading rendered into `.assessment-section-head`. */
  title: string;
}

export interface AssessmentFormIdentityChip {
  firstInitial: string;
  lastName: string;
  employerName: string;
  cohortName: string;
}

export interface AssessmentFormProps {
  questions: Question[];
  initialAnswers: SerializedAnswers;
  errors: Record<string, string>;
  actionPath: string;
  submitLabel: string;
  modalTitle: string;
  modalBody: string;
  readOnly: boolean;
  setLevelError?: string | null;
  /** Existing SP3 boundary shape (admin self-assessment viewer uses this). */
  sectionBoundaries?: SectionBoundary[];
  /**
   * Friendlier section-break shape mapped into `SectionBoundary` internally.
   * Personal Goals uses it (between Q4 and Q5, title "My Focus for This
   * Internship"). Compatible with `sectionBoundaries`; callers pick
   * whichever shape is more ergonomic.
   */
  sectionBreaks?: AssessmentFormSectionBreak[];
  /** Optional identity chip rendered once at the top of the form. */
  identityChip?: AssessmentFormIdentityChip;
  /** When provided, the action bar shows a Cancel link on the left. */
  cancelHref?: string;
  /** Cancel button label (defaults to "Cancel"). */
  cancelLabel?: string;
  /**
   * Mono status caption rendered on the left of the sticky action bar.
   * Defaults to the prototype-style uppercased `submitLabel` — pages
   * typically pass e.g. `PERSONAL GOALS · ONE SUBMISSION`.
   */
  statusCaption?: ReactNode;
}

/** Coerce the friendlier sectionBreaks shape into renderer SectionBoundary. */
function breaksToBoundaries(breaks: AssessmentFormSectionBreak[]): SectionBoundary[] {
  return breaks.map((b) => ({
    afterIndex: b.afterQuestionIndex,
    label: b.title,
  }));
}

export function AssessmentForm(props: AssessmentFormProps) {
  const [answers, setAnswers] = useState<SerializedAnswers>(props.initialAnswers);
  const [modalOpen, setModalOpen] = useState(false);
  const formRef = useRef<HTMLFormElement | null>(null);

  const handleChange = (questionId: string, value: unknown) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  // Merge the SP3 sectionBoundaries with the new sectionBreaks shape. When
  // both are supplied (uncommon) callers get the union — boundaries first.
  const boundaries = useMemo<SectionBoundary[] | undefined>(() => {
    const fromBreaks = props.sectionBreaks ? breaksToBoundaries(props.sectionBreaks) : [];
    const fromBoundaries = props.sectionBoundaries ?? [];
    const merged = [...fromBoundaries, ...fromBreaks];
    return merged.length ? merged : undefined;
  }, [props.sectionBreaks, props.sectionBoundaries]);

  const chip = props.identityChip ? (
    <IdentityConfirmedChip
      firstInitial={props.identityChip.firstInitial}
      lastName={props.identityChip.lastName}
      employerName={props.identityChip.employerName}
      cohortName={props.identityChip.cohortName}
    />
  ) : null;

  // Read-only mode: render the question stack without the surrounding form
  // or action bar so the submit pathway is unreachable. The viewer routes
  // (admin self-assessment viewers) use this branch.
  if (props.readOnly) {
    return (
      <>
        {chip}
        <div className="rubric assessment-questions">
          <QuestionRenderer
            questions={props.questions}
            answers={answers}
            onChange={() => {}}
            disabled
            {...(boundaries ? { sectionBoundaries: boundaries } : {})}
          />
        </div>
      </>
    );
  }

  const statusCaption = props.statusCaption ?? props.submitLabel.toUpperCase();
  const cancelLabel = props.cancelLabel ?? 'Cancel';

  return (
    <>
      {chip}
      <Form method="post" action={props.actionPath} ref={formRef}>
        <div className="rubric assessment-questions">
          {props.setLevelError ? (
            <div role="alert" className="form-banner form-banner--danger">
              {props.setLevelError}
            </div>
          ) : null}
          <QuestionRenderer
            questions={props.questions}
            answers={answers}
            errors={props.errors}
            onChange={handleChange}
            {...(boundaries ? { sectionBoundaries: boundaries } : {})}
          />
        </div>

        {/* Hidden input mirroring serialized answers — the action reads this. */}
        <input type="hidden" name="answers" value={JSON.stringify(answers)} />

        <ActionBar status={statusCaption}>
          {props.cancelHref ? (
            <Link to={props.cancelHref} className="btn btn--outline">
              {cancelLabel}
            </Link>
          ) : null}
          <button type="button" className="btn btn--primary" onClick={() => setModalOpen(true)}>
            {props.submitLabel} <span className="btn__arrow">&rarr;</span>
          </button>
        </ActionBar>

        <SubmitConfirmModal
          open={modalOpen}
          title={props.modalTitle}
          body={props.modalBody}
          confirmLabel="Submit"
          onClose={() => setModalOpen(false)}
          onConfirm={() => {
            setModalOpen(false);
            // Submit the form programmatically. Using the ref avoids the
            // brittle DOM-query approach in the plan and works with multiple
            // forms on the same page.
            formRef.current?.requestSubmit();
          }}
        />
      </Form>
    </>
  );
}
