// Shared form body used by Personal Goals, Midpoint Reflection, Participant
// Feedback, and (via wrapper) Exit Employer Survey.
//
// Renders the SP3 <QuestionRenderer> inside a react-router <Form> with a
// confirm-before-submit modal and a sticky action bar. Stateless from the
// caller's perspective: parent supplies questions, errors, and an action
// path; the form holds its own answer state and posts a single hidden
// `answers` field as JSON on submit.
//
// SP3 contract drift (relative to the SP4 plan freeze):
//   - `Question` + `SerializedAnswers` live in `~/lib/question-types`, not
//     `~/lib/question-engine`.
//   - `QuestionRenderer` is exported from `~/components/question-renderer`,
//     not from `~/lib/question-engine`.
//   - The renderer takes `disabled` (not `readOnly`) and accepts an optional
//     `errors` prop. We adapt by passing `disabled={true}` when readOnly is
//     true and by omitting `errors` in read-only mode.

import { useRef, useState } from 'react';
import { Form } from 'react-router';
import { QuestionRenderer } from '~/components/question-renderer';
import type { Question, SectionBoundary, SerializedAnswers } from '~/lib/question-types';
import { SubmitConfirmModal } from './SubmitConfirmModal';

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
  sectionBoundaries?: SectionBoundary[];
}

export function AssessmentForm(props: AssessmentFormProps) {
  const [answers, setAnswers] = useState<SerializedAnswers>(props.initialAnswers);
  const [modalOpen, setModalOpen] = useState(false);
  const formRef = useRef<HTMLFormElement | null>(null);

  const handleChange = (questionId: string, value: unknown) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  // Read-only mode: render the question stack without the surrounding form
  // or action bar so the submit pathway is unreachable. The viewer routes
  // (admin self-assessment viewers) use this branch.
  if (props.readOnly) {
    return (
      <div className="rubric assessment-questions">
        <QuestionRenderer
          questions={props.questions}
          answers={answers}
          onChange={() => {}}
          disabled
          {...(props.sectionBoundaries ? { sectionBoundaries: props.sectionBoundaries } : {})}
        />
      </div>
    );
  }

  return (
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
          {...(props.sectionBoundaries ? { sectionBoundaries: props.sectionBoundaries } : {})}
        />
      </div>

      {/* Hidden input mirroring serialized answers — the action reads this. */}
      <input type="hidden" name="answers" value={JSON.stringify(answers)} />

      <div className="action-bar">
        <div className="action-bar__inner">
          <div className="action-bar__buttons">
            <button type="button" className="btn btn--primary" onClick={() => setModalOpen(true)}>
              {props.submitLabel}
            </button>
          </div>
        </div>
      </div>

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
  );
}
