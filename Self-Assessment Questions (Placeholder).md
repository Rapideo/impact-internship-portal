# Question-Set Source Reference

> **Purpose:** Map each prototype question set to its real source document (or note when content is still placeholder pending real-doc migration). Source docs live in `../DOCS/` (one level above this repo).

## Current question sets in the prototype

| # | Form | File | Source doc | Content status |
|---|---|---|---|---|
| 1 | Personal Goals | `Prototypes/PROTOTYPE/personal-goals.html` | `DOCS/Documents for Today's Meeting/Personal Goals.docx` | **Placeholder** — real doc has 4 reflection questions + 1 "I want to feel more confident in:" focus closer; prototype has 7 generic placeholders. Migration scoped to **sub-project C** (Questions library). |
| 2 | Midpoint Reflection | `Prototypes/PROTOTYPE/midpoint-reflection.html` | `DOCS/Documents for Today's Meeting/Midpoint Reflection.docx` | **Placeholder** — real doc has 6 questions (learned/improved, gone-well, challenges, area to keep improving, support needed, success ahead); prototype has 8 generic placeholders. Migration scoped to **sub-project C**. |
| 3 | Participant Feedback | `Prototypes/PROTOTYPE/participant-feedback.html` | `DOCS/_extracted/Participant Exit Feedback.docx` | ✅ Faithful (iter 2). |
| 4 | Competency Assessment | `Prototypes/PROTOTYPE/competency-new.html` (rubric-panels) | `DOCS/_extracted/Competency Rubric Sample.docx` | ✅ Faithful. The source has more detailed "What 'Ready' Looks Like" descriptors per domain — could enrich `rubric-panel__meta` strings in sub-project C. |
| 5 | Exit Employer Survey | `Prototypes/PROTOTYPE/exit-employer-survey.html` | `DOCS/_extracted/Participant Outcome Form.docx` | ✅ Faithful (iter 2). |

## Source docs not yet implemented as forms

These exist in `DOCS/` and could become new forms in future iterations beyond v1:

- **`Readiness Interview.docx`** (`_extracted/`, `FW_ HirePath Documents/`) — admin-administered intake interview. 12 questions: 3 open-ended intro, 5 scored 1–3 on traits (Workplace Expectations, Work Ethic, Problem-Solving, Coachability, Reliability), schedule/availability, support/barriers. Could replace or augment the existing Entry Assessment panel on the intern record.
- **`Site Review.docx`** (`_extracted/`, `FW_ HirePath Documents/`) — admin-completed employer site vetting. 10 rating criteria (1–3), logistics (cert/background/drug screen/dress/schedule), approval status. Naturally fits inside the new Settings → Employer detail (per-employer scored form).
- **`Midpoint Performance Review Sample.docx`** (`FW_ HirePath Documents/`) — mid-program review with supervisor + participant + program staff. Currently flagged out-of-scope in PRD.
- **`Corrective Action Plan Sample.docx`** (`FW_ HirePath Documents/`) — workflow form triggered when midpoint flags concerns. Not periodic; complex to model. Out of scope for v1.

## Other relevant docs in DOCS/

- **`Internship Placement Plan.docx`** — captures Position Title, Department, Supervisor, Position Overview, Duties & Responsibilities, **Skills to Be Developed, Learning Outcomes**. Reveals additional Cohort fields program staff care about; relevant for **sub-project B** scoping.
- **`Placement Plans/`** folder — 7 real completed placement plans across roles (HR, office manager, peer recovery coach, proctor, recruiter, retail business, retail customer service) plus an `I.P.P. Answers.docx`. Useful as demo cohort/role data.
- **`Resources and Support.docx`** — static info page (crisis resources, accommodations, EEOC/DOL/Lambda Legal links). Future "Support & Resources" footer or help section.
- **`Internship Participant Agreement.docx`** — terms-of-service with participant signature. Future digital onboarding agreement.

## Conventions when migrating real content

- Preserve question order and wording from the source doc verbatim.
- Where the real doc uses fill-in blanks ("I want to feel more confident in: ___________"), translate to a labeled `<textarea>` or short `<input>` matching the visual length of the blank.
- The 4-of-N answered-rule pattern from iter 2 (Participant Feedback) is the right default for free-form intern forms.
