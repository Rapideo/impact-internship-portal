// Competency assessment form — admin + employer 3-tier rubric form.
//
// SP7 Phase C rewrite — preserves the existing prop API verbatim. Internal
// markup now mirrors `competency-new.html`:
//
//   - <IdentityCard> at the top of the form acts as the "Participant
//     Record" header with the prototype's `MULTIPLE PHASES ALLOWED`
//     subnote. <MetaStrip> renders inside the body, alongside the Phase
//     dropdown (the prototype's `id-grid--5` field row).
//   - The 3-tier section headers (Core, Cohort-specific, Intern-specific)
//     are emitted via the SP7 Phase B <RubricSectionHead> primitive. We
//     split the renderer pass by `sectionBoundaries` (which the SP3
//     stitching loader supplies) so each tier gets its own labelled
//     section with mono label + display title + aside, instead of the
//     SP3 SectionHeader's hardcoded "Section" prefix.
//   - Submit row is now the sticky <ActionBar> primitive with the
//     prototype's `PASS = ALL READY` mono caption.
//
// Why we drive renderer passes manually instead of forwarding
// `sectionBoundaries` to QuestionRenderer wholesale: the SP3
// SectionHeader hardcodes the literal "Section" label and emits an <h2>,
// while the prototype expects a per-tier label like "PROFESSIONAL
// COMPETENCIES" rendered as the rubric-section-head's mono `__label`. The
// SP7 Phase B `<RubricSectionHead>` honors both label + title + aside,
// matching prototype's `appendCompetencySectionHeader(container, title,
// aside)` shape. Bypassing the bundled SectionHeader keeps SP3
// unchanged.

import { useMemo, useRef, useState } from 'react';
import { Form, Link } from 'react-router';
import { ActionBar } from '~/components/ActionBar';
import { IdentityCard } from '~/components/IdentityCard';
import { MetaStrip } from '~/components/MetaStrip';
import { QuestionRenderer } from '~/components/question-renderer';
import { RubricSectionHead } from '~/components/RubricSectionHead';
import type { Question, SectionBoundary, SerializedAnswers } from '~/lib/question-types';
import { SubmitConfirmModal } from './SubmitConfirmModal';

export interface CompetencyMeta {
  internName: string;
  cohortName: string;
  employerName: string;
  roleName: string;
  startDate: string;
  endDate: string;
}

export interface CompetencyPhase {
  id: string;
  label: string;
}

export interface CompetencyAssessmentFormProps {
  internId: string;
  phases: CompetencyPhase[];
  questions: Question[];
  sectionBoundaries: SectionBoundary[];
  initialAnswers: SerializedAnswers;
  initialPhase: string | null;
  errors: Record<string, string>;
  setLevelError?: string | null;
  actionPath: string;
  submitLabel: string;
  readOnly: boolean;
  meta: CompetencyMeta;
  /**
   * Optional Cancel target on the sticky action bar. Defaults to no Cancel
   * (caller may handle navigation elsewhere). Admin + employer routes
   * typically point this at the relevant intern record / assessments hub.
   */
  cancelHref?: string;
  /** Cancel link label. */
  cancelLabel?: string;
  /** Status caption (mono) on the left of the action bar. Defaults to "PASS = ALL READY". */
  statusCaption?: string;
}

interface QuestionSlice {
  /** `null` for the implicit pre-first-boundary tier. With the SP3 stitching
   * loader's contract every tier carries an explicit boundary (the Core tier
   * gets `afterIndex: -1` so its header sits BEFORE question 0), so this is
   * only null when callers pass `sectionBoundaries: []`. */
  boundary: SectionBoundary | null;
  questions: Question[];
}

/**
 * Split `questions` into tier slices using `sectionBoundaries.afterIndex`
 * as the cut points. Each boundary HEADS the slice that begins AT
 * `boundary.afterIndex + 1` and runs up to (but not including) the next
 * boundary's start — or to the end of the array.
 *
 * Sanity: SP3's stitching loader emits a boundary per non-empty tier with
 * `afterIndex = tagged.length - 1` BEFORE that tier's questions are pushed
 * — so Core gets `afterIndex: -1`, Cohort gets `afterIndex: (coreCount-1)`,
 * Intern gets `afterIndex: (coreCount + cohortCount - 1)`. This produces a
 * clean per-tier slice in the loop below.
 *
 * If the caller passes a boundary that sits BEFORE the implicit zero (e.g.
 * `afterIndex: -2`) it's clamped to -1.
 */
function sliceByBoundaries(questions: Question[], boundaries: SectionBoundary[]): QuestionSlice[] {
  if (boundaries.length === 0) {
    return [{ boundary: null, questions }];
  }
  const sorted = [...boundaries].sort((a, b) => a.afterIndex - b.afterIndex);
  const slices: QuestionSlice[] = [];

  // Implicit pre-first-boundary slice — covers any questions BEFORE the
  // first boundary's start (sorted[0].afterIndex + 1). When the first
  // boundary already sits at -1 (the SP3 stitching default), this slice is
  // empty and gets filtered out by the renderer's `s.questions.length > 0`
  // guard.
  const firstStart = Math.max(0, sorted[0]!.afterIndex + 1);
  if (firstStart > 0) {
    slices.push({ boundary: null, questions: questions.slice(0, firstStart) });
  }

  for (let i = 0; i < sorted.length; i++) {
    const b = sorted[i]!;
    const start = Math.max(0, b.afterIndex + 1);
    const end = i + 1 < sorted.length ? sorted[i + 1]!.afterIndex + 1 : questions.length;
    slices.push({ boundary: b, questions: questions.slice(start, end) });
  }

  return slices;
}

export function CompetencyAssessmentForm(props: CompetencyAssessmentFormProps) {
  const [answers, setAnswers] = useState<SerializedAnswers>(props.initialAnswers);
  const [phase, setPhase] = useState<string>(props.initialPhase ?? '');
  const [modalOpen, setModalOpen] = useState(false);
  const formRef = useRef<HTMLFormElement | null>(null);

  const handleChange = (questionId: string, value: unknown) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const metaItems = [
    { label: 'Intern', value: props.meta.internName },
    { label: 'Cohort', value: props.meta.cohortName },
    { label: 'Employer', value: props.meta.employerName },
    { label: 'Role', value: props.meta.roleName },
    { label: 'Start', value: props.meta.startDate, mono: true },
    { label: 'End', value: props.meta.endDate, mono: true },
  ];

  const phasesEmpty = props.phases.length === 0;
  const phaseSelectId = 'competency-phase-select';

  const slices = useMemo(
    () => sliceByBoundaries(props.questions, props.sectionBoundaries),
    [props.questions, props.sectionBoundaries],
  );

  // Render the question stack as 1..N tier slices. Tier slices with no
  // questions are filtered out so empty boundaries don't leave dangling
  // headers (mirrors the prototype's "if (set.questions.length)" guards).
  const renderQuestionStack = (disabled: boolean) => (
    <div className="rubric assessment-questions">
      {props.setLevelError ? (
        <div role="alert" className="form-banner form-banner--danger">
          {props.setLevelError}
        </div>
      ) : null}
      {slices
        .filter((s) => s.questions.length > 0)
        .map((slice, sliceIdx) => (
          <div key={slice.boundary?.label ?? `tier-${sliceIdx}`}>
            {slice.boundary ? (
              <RubricSectionHead
                label="Tier"
                title={slice.boundary.label}
                aside={slice.boundary.subLabel}
                spaced
              />
            ) : null}
            <QuestionRenderer
              questions={slice.questions}
              answers={answers}
              {...(disabled ? {} : { errors: props.errors })}
              onChange={disabled ? () => {} : handleChange}
              disabled={disabled}
            />
          </div>
        ))}
    </div>
  );

  // Identity card — "Participant Record" header with the prototype's
  // `UNIQUE KEY · ... · MULTIPLE PHASES ALLOWED` subnote per
  // competency-new.html. The MetaStrip + Phase dropdown live inside the
  // card's body so the whole participant context is in one block.
  const participantHeader = (
    <IdentityCard
      title="Participant Record"
      subnote="UNIQUE KEY · FIRST INITIAL + LAST NAME + EMPLOYER + COHORT · MULTIPLE PHASES ALLOWED"
    >
      <MetaStrip items={metaItems} />
      <div className="competency-form__phase">
        <label htmlFor={phaseSelectId} className="competency-form__phase-label">
          Phase
        </label>
        <select
          id={phaseSelectId}
          name={props.readOnly ? undefined : 'phase'}
          required={!props.readOnly}
          disabled={props.readOnly || phasesEmpty}
          value={phase}
          onChange={(e) => setPhase(e.target.value)}
          className="competency-form__phase-select"
        >
          <option value="">{props.readOnly ? (phase ? '' : '—') : 'Select a phase…'}</option>
          {props.phases.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
        {!props.readOnly && phasesEmpty ? (
          <p className="competency-form__phase-helper">
            No phases are configured for this intern&apos;s cohort yet. Add phases in Settings to
            enable competency assessments.
          </p>
        ) : null}
      </div>
    </IdentityCard>
  );

  // Read-only mode: render participant header + question stack with no
  // submit affordance.
  if (props.readOnly) {
    return (
      <div className="competency-form competency-form--readonly">
        {participantHeader}
        {renderQuestionStack(true)}
      </div>
    );
  }

  const statusCaption = props.statusCaption ?? 'PASS = ALL READY';
  const cancelLabel = props.cancelLabel ?? 'Cancel';

  return (
    <Form method="post" action={props.actionPath} ref={formRef} className="competency-form">
      {participantHeader}
      <input type="hidden" name="internId" value={props.internId} />
      {renderQuestionStack(false)}
      <input type="hidden" name="answers" value={JSON.stringify(answers)} />

      <ActionBar status={statusCaption}>
        {props.cancelHref ? (
          <Link to={props.cancelHref} className="btn btn--outline">
            {cancelLabel}
          </Link>
        ) : null}
        <button
          type="button"
          className="btn btn--primary"
          disabled={phasesEmpty}
          onClick={() => setModalOpen(true)}
        >
          {props.submitLabel} <span className="btn__arrow">&rarr;</span>
        </button>
      </ActionBar>

      <SubmitConfirmModal
        open={modalOpen}
        title="Save competency assessment?"
        body="The intern won't see this; you can edit it later from the same screen."
        confirmLabel="Save"
        onClose={() => setModalOpen(false)}
        onConfirm={() => {
          setModalOpen(false);
          formRef.current?.requestSubmit();
        }}
      />
    </Form>
  );
}
