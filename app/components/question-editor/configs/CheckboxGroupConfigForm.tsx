import { OptionsListEditor } from '../OptionsListEditor';
import type { CheckboxGroupQuestion as Q } from '../../../lib/question-types';

interface Props {
  question: Q;
  onChange: (next: Q) => void;
}

export function CheckboxGroupConfigForm({ question, onChange }: Props) {
  return (
    <>
      <OptionsListEditor
        options={question.config.options}
        onChange={(opts) =>
          onChange({ ...question, config: { ...question.config, options: opts } })
        }
      />
      <div className="field" style={{ marginTop: 12 }}>
        <label>
          <input
            type="checkbox"
            checked={question.config.otherWithText}
            onChange={(e) =>
              onChange({
                ...question,
                config: { ...question.config, otherWithText: e.target.checked },
              })
            }
          />{' '}
          Allow &quot;Other&quot; with text reveal
        </label>
      </div>
    </>
  );
}
