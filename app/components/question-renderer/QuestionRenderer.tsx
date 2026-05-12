import { Fragment, type ReactNode } from 'react';
import { SectionHeader } from './SectionHeader';
import { TextareaQuestion } from './TextareaQuestion';
import { ShortTextQuestion } from './ShortTextQuestion';
import { RadioQuestion } from './RadioQuestion';
import { CheckboxGroupQuestion } from './CheckboxGroupQuestion';
import { LikertQuestion } from './LikertQuestion';
import { CompetencyRubricRowQuestion } from './CompetencyRubricRowQuestion';
import type {
  Question,
  Answers,
  SectionBoundary,
  RadioAnswer,
  CheckboxGroupAnswer,
  CompetencyRubricRowAnswer,
} from '../../lib/question-types';

export interface QuestionRendererProps {
  questions: Question[];
  answers: Answers;
  errors?: Record<string, string>;
  disabled?: boolean;
  onChange: (questionId: string, next: unknown) => void;
  sectionBoundaries?: SectionBoundary[];
}

function boundariesAfter(
  boundaries: SectionBoundary[] | undefined,
  index: number,
): SectionBoundary[] {
  if (!boundaries) return [];
  return boundaries.filter((b) => b.afterIndex === index);
}

export function QuestionRenderer({
  questions,
  answers,
  errors,
  disabled,
  onChange,
  sectionBoundaries,
}: QuestionRendererProps) {
  return (
    <>
      {boundariesAfter(sectionBoundaries, -1).map((b, i) => (
        <SectionHeader key={`pre-${i}`} label={b.label} subLabel={b.subLabel} />
      ))}
      {questions.map((q, i) => (
        <Fragment key={q.id}>
          {renderOne(q, i, answers[q.id], (next) => onChange(q.id, next), disabled, errors?.[q.id])}
          {boundariesAfter(sectionBoundaries, i).map((b, bi) => (
            <SectionHeader key={`b-${i}-${bi}`} label={b.label} subLabel={b.subLabel} />
          ))}
        </Fragment>
      ))}
    </>
  );
}

function renderOne(
  q: Question,
  index: number,
  value: unknown,
  onChange: (next: unknown) => void,
  disabled: boolean | undefined,
  error: string | undefined,
): ReactNode {
  switch (q.type) {
    case 'textarea':
      return (
        <TextareaQuestion
          question={q}
          index={index}
          value={typeof value === 'string' ? value : ''}
          onChange={onChange as (s: string) => void}
          disabled={disabled}
          error={error}
        />
      );
    case 'short-text':
      return (
        <ShortTextQuestion
          question={q}
          index={index}
          value={typeof value === 'string' ? value : ''}
          onChange={onChange as (s: string) => void}
          disabled={disabled}
          error={error}
        />
      );
    case 'radio':
      return (
        <RadioQuestion
          question={q}
          index={index}
          value={value as RadioAnswer}
          onChange={onChange as (next: RadioAnswer) => void}
          disabled={disabled}
          error={error}
        />
      );
    case 'checkbox-group':
      return (
        <CheckboxGroupQuestion
          question={q}
          index={index}
          value={value as CheckboxGroupAnswer}
          onChange={onChange as (next: CheckboxGroupAnswer) => void}
          disabled={disabled}
          error={error}
        />
      );
    case 'likert':
      return (
        <LikertQuestion
          question={q}
          index={index}
          value={typeof value === 'string' ? value : null}
          onChange={onChange as (next: string | null) => void}
          disabled={disabled}
          error={error}
        />
      );
    case 'competency-rubric-row':
      return (
        <CompetencyRubricRowQuestion
          question={q}
          index={index}
          value={value as CompetencyRubricRowAnswer | null | undefined}
          onChange={onChange as (next: CompetencyRubricRowAnswer) => void}
          disabled={disabled}
          error={error}
        />
      );
  }
}
