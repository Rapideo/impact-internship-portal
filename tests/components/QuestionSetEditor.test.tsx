import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { QuestionSetEditor } from '../../app/components/question-editor/QuestionSetEditor';
import type { Question } from '../../app/lib/question-types';

const seedQuestions: Question[] = [
  {
    id: 'a',
    type: 'textarea',
    label: 'First',
    required: false,
    sortOrder: 1,
    config: { rows: 4, placeholder: '' },
  },
  {
    id: 'b',
    type: 'radio',
    label: 'Second',
    required: false,
    sortOrder: 2,
    config: { options: [{ value: 'y', label: 'Y' }], otherWithText: false },
  },
  {
    id: 'c',
    type: 'textarea',
    label: 'Third',
    required: false,
    sortOrder: 3,
    config: { rows: 4, placeholder: '' },
  },
];

function renderEditor(overrides?: Partial<Parameters<typeof QuestionSetEditor>[0]>) {
  const onSave = vi.fn();
  const onCancel = vi.fn();
  render(
    <QuestionSetEditor
      initial={{
        name: 'Test Set',
        minRequired: 1,
        allowMultiple: false,
        questions: seedQuestions,
      }}
      nameEditable={false}
      onSave={onSave}
      onCancel={onCancel}
      {...overrides}
    />,
  );
  return { onSave, onCancel };
}

function getRow(id: string): HTMLElement {
  const el = document.querySelector(`[data-question-id="${id}"]`);
  if (!el) throw new Error(`row ${id} not found`);
  return el as HTMLElement;
}

function isExpanded(id: string): boolean {
  return getRow(id).classList.contains('qs-question-row--expanded');
}

function clickHead(id: string) {
  const head = getRow(id).querySelector('.qs-question-row__head') as HTMLElement;
  fireEvent.click(head);
}

describe('QuestionSetEditor accordion regression', () => {
  it('expanding a row leaves siblings collapsed', () => {
    renderEditor();
    clickHead('a');
    expect(isExpanded('a')).toBe(true);
    expect(isExpanded('b')).toBe(false);
    expect(isExpanded('c')).toBe(false);
  });

  it('editing a label in row A does not collapse row A or any sibling', () => {
    renderEditor();
    clickHead('a');
    clickHead('c');
    const labelInput = document.querySelector('#q-a-label') as HTMLInputElement;
    expect(labelInput).not.toBeNull();
    fireEvent.change(labelInput, { target: { value: 'First (edited)' } });
    expect(isExpanded('a')).toBe(true);
    expect(isExpanded('c')).toBe(true);
    expect((document.querySelector('#q-a-label') as HTMLInputElement).value).toBe('First (edited)');
  });

  it('adding a radio option to row B does NOT collapse expanded rows', () => {
    renderEditor();
    clickHead('a');
    clickHead('b');
    clickHead('c');
    // Click "+ Add Option" inside row B.
    const rowB = getRow('b');
    const addOpt = within(rowB).getByText('+ Add Option');
    fireEvent.click(addOpt);
    expect(isExpanded('a')).toBe(true);
    expect(isExpanded('b')).toBe(true);
    expect(isExpanded('c')).toBe(true);
  });

  it('moving row C up does NOT collapse expanded rows; row C stays expanded after move', () => {
    renderEditor();
    clickHead('a');
    clickHead('c');
    const moveUp = within(getRow('c')).getByLabelText('Move up');
    fireEvent.click(moveUp);
    expect(isExpanded('a')).toBe(true);
    expect(isExpanded('c')).toBe(true);
  });

  it('removing row B does NOT collapse rows A or C', () => {
    renderEditor();
    clickHead('a');
    clickHead('c');
    const removeBtn = within(getRow('b')).getByLabelText('Remove');
    fireEvent.click(removeBtn);
    expect(isExpanded('a')).toBe(true);
    expect(isExpanded('c')).toBe(true);
  });

  it('Add Question pick type produces a new row that auto-expands; existing rows stay expanded', () => {
    renderEditor();
    clickHead('a');
    const addBtn = screen.getByText('+ Add Question');
    fireEvent.click(addBtn);
    fireEvent.click(screen.getByText('Likert'));
    const allRows = document.querySelectorAll('[data-question-id]');
    expect(allRows.length).toBe(4);
    // The new row is the last; it must be expanded.
    const newRow = allRows[allRows.length - 1] as HTMLElement;
    expect(newRow.classList.contains('qs-question-row--expanded')).toBe(true);
    expect(isExpanded('a')).toBe(true);
  });

  it('Save calls onSave with the current working copy + reindexed sortOrder', () => {
    const { onSave } = renderEditor();
    fireEvent.click(screen.getByText('Save Changes'));
    expect(onSave).toHaveBeenCalledTimes(1);
    const payload = onSave.mock.calls[0]![0] as {
      name: string;
      minRequired: number | null;
      allowMultiple: boolean;
      questions: Question[];
    };
    expect(payload.name).toBe('Test Set');
    expect(payload.minRequired).toBe(1);
    expect(payload.allowMultiple).toBe(false);
    expect(payload.questions.map((q) => q.sortOrder)).toEqual([1, 2, 3]);
  });
});
