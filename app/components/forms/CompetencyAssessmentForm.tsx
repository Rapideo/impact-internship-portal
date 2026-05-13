// Competency assessment form — admin-facing wrapper around <AssessmentForm>.
//
// Adds three things on top of the standard form body:
//   1. A meta strip with intern/cohort/employer/role/start/end (reuses the
//      shared <MetaStrip> primitive from sub-project 2).
//   2. A required phase dropdown. When `phases` is empty the select is
//      disabled and a helper message replaces it — mirrors the prototype's
//      competency-new.html behaviour.
//   3. A 3-tier rendered question stack with sectionBoundaries (Core / Cohort
//      Add-Ons / Role-Specific) coming from sub-project 3's stitched
//      competency loader.
//
// The form body is delegated to <AssessmentForm> so the answer-state plumbing
// and the submit-confirm modal are shared with the four standard forms.
// We pre-mount AssessmentForm with no submitLabel of its own and supply the
// phase field as a sibling hidden-then-form-merged input via the natural
// React composition (it's a child of the same <Form>).
//
// Implementation note: because <AssessmentForm> owns its own <Form>, this
// wrapper renders the phase dropdown and meta strip OUTSIDE the form and
// uses an `aria-controls` / form attribute pattern... Actually the simplest
// thing is to render the form here directly and only delegate the question
// stack to a thin inner render. That keeps the phase select inside the same
// <Form> so it submits naturally as `phase`.

import { useRef, useState } from 'react';
import { Form } from 'react-router';
import { MetaStrip } from '~/components/MetaStrip';
import { QuestionRenderer } from '~/components/question-renderer';
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

  // Read-only mode: render meta + (read-only) phase indicator + question
  // stack with no submit affordance. The intern internalId still flows
  // through props but no <Form> wraps it.
  if (props.readOnly) {
    return (
      <div className="competency-form competency-form--readonly">
        <MetaStrip items={metaItems} />
        <div className="competency-form__phase">
          <label htmlFor={phaseSelectId} className="competency-form__phase-label">
            Phase
          </label>
          <select
            id={phaseSelectId}
            value={phase}
            disabled
            className="competency-form__phase-select"
          >
            <option value="">{phase ? '' : '—'}</option>
            {props.phases.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
        <div className="rubric assessment-questions">
          <QuestionRenderer
            questions={props.questions}
            answers={answers}
            onChange={() => {}}
            disabled
            sectionBoundaries={props.sectionBoundaries}
          />
        </div>
      </div>
    );
  }

  return (
    <Form method="post" action={props.actionPath} ref={formRef} className="competency-form">
      <MetaStrip items={metaItems} />
      <input type="hidden" name="internId" value={props.internId} />

      <div className="competency-form__phase">
        <label htmlFor={phaseSelectId} className="competency-form__phase-label">
          Phase
        </label>
        <select
          id={phaseSelectId}
          name="phase"
          required
          disabled={phasesEmpty}
          value={phase}
          onChange={(e) => setPhase(e.target.value)}
          className="competency-form__phase-select"
        >
          <option value="">Select a phase…</option>
          {props.phases.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
        {phasesEmpty ? (
          <p className="competency-form__phase-helper">
            No phases are configured for this intern&apos;s cohort yet. Add phases in Settings to
            enable competency assessments.
          </p>
        ) : null}
      </div>

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
          sectionBoundaries={props.sectionBoundaries}
        />
      </div>

      <input type="hidden" name="answers" value={JSON.stringify(answers)} />

      <div className="action-bar">
        <div className="action-bar__inner">
          <div className="action-bar__buttons">
            <button
              type="button"
              className="btn btn--primary"
              disabled={phasesEmpty}
              onClick={() => setModalOpen(true)}
            >
              {props.submitLabel}
            </button>
          </div>
        </div>
      </div>

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
