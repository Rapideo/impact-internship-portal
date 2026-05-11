(function (window) {
  // -------- Mock dataset (single source of truth for demo) --------
  const EMPLOYERS = [
    {
      id: 'eskenazi-health',
      name: 'Eskenazi Health',
      contactName: 'Maya Reyes',
      contactEmail: 'maya.reyes@eskenazihealth.edu',
      phone: '(317) 555-0148',
      notes: 'Primary-care MA placements across 4 clinics. Quarterly cohorts.'
    },
    {
      id: 'indy-tech-trades',
      name: 'Indy Tech Trades',
      contactName: 'Wesley Park',
      contactEmail: 'wesley@indytechtrades.org',
      phone: '(317) 555-0291',
      notes: 'Construction apprenticeship pipeline; OSHA + tooling certs included.'
    },
    {
      id: 'habitat-indy',
      name: 'Habitat Indianapolis',
      contactName: 'Renee Coleman',
      contactEmail: 'rcoleman@habitatindy.org',
      phone: '(317) 555-0762',
      notes: 'Community builder track; runs alongside neighborhood revitalization sites.'
    },
    {
      id: 'elevate-ventures',
      name: 'Elevate Ventures',
      contactName: 'Priya Shah',
      contactEmail: 'priya.shah@elevateventures.com',
      phone: '(317) 555-0413',
      notes: 'Customer-service track at growth-stage portfolio companies.'
    },
    {
      id: 'geminus-behavioral',
      name: 'Geminus Behavioral',
      contactName: 'Aaron Mendez',
      contactEmail: 'aaron.mendez@geminusbh.org',
      phone: '(219) 555-0184',
      notes: 'Behavioral-health intake placements across NW Indiana clinics.'
    },
    {
      id: 'healthlink-indiana',
      name: 'HealthLink Indiana',
      contactName: 'Tasha Whitlock',
      contactEmail: 'twhitlock@healthlinkin.org',
      phone: '(317) 555-0856',
      notes: 'Clinic admin / care coordination roles; multi-site rotations.'
    }
  ];

  const PHASES = [
    { id: 'intake',   label: 'Intake'   },
    { id: 'week-2',   label: 'Week 2'   },
    { id: 'week-4',   label: 'Week 4'   },
    { id: 'midpoint', label: 'Midpoint' },
    { id: 'week-8',   label: 'Week 8'   },
    { id: 'final',    label: 'Final'    }
  ];

  // Roles are scoped to their parent employer (mirrors the Cohort → Employer
  // relationship). Each employer maintains its own set of roles editable from
  // the per-employer detail page in Settings → Employers.
  const ROLES = [
    { id: 'medical-assistant',       label: 'Medical Assistant',       employerId: 'eskenazi-health'    },
    { id: 'construction-apprentice', label: 'Construction Apprentice', employerId: 'indy-tech-trades'   },
    { id: 'community-builder',       label: 'Community Builder',       employerId: 'habitat-indy'       },
    { id: 'customer-service',        label: 'Customer Service',        employerId: 'elevate-ventures'   },
    { id: 'behavioral-health',       label: 'Behavioral Health',       employerId: 'geminus-behavioral' },
    { id: 'clinic-admin',            label: 'Clinic Admin',            employerId: 'healthlink-indiana' }
  ];

  const BARRIERS = [
    { id: 'transport',     label: 'No reliable transportation to placement site' },
    { id: 'childcare',     label: 'No childcare arrangements during placement hours' },
    { id: 'housing',       label: 'Housing instability or lack of permanent address' },
    { id: 'clothing',      label: 'Limited access to professional or work-appropriate clothing' },
    { id: 'connectivity',  label: 'Limited internet or phone access at home' },
    { id: 'health',        label: 'Health or medical concerns affecting attendance' },
    { id: 'literacy',      label: 'Limited literacy, numeracy, or English-language proficiency' },
    { id: 'justice',       label: 'Justice involvement or background-related barriers' },
    { id: 'caregiving',    label: 'Caregiving responsibilities for adult family members' },
    { id: 'finances',      label: 'Limited financial reserves before first paycheck' },
    { id: 'documentation', label: 'Missing required documentation (ID, SSN, work auth)' },
    { id: 'work-history',  label: 'Limited prior work history, references, or formal employment' }
  ];

  const PROGRAM_INFO_DEFAULTS = {
    programName:              'IMPACT Internship Program',
    organizationName:         'IMPACT / Indiana',
    contactEmail:             'kortney@impact.org',
    phone:                    '(317) 555-0100',
    defaultCohortLengthWeeks: 26,
    fiscalYearStartMonth:     'July'
  };

  // PROGRAM_INFO is the live record (defaults + sessionStorage overlay).
  // Reads sessionStorage at module init; writes happen via saveProgramInfo().
  var PROGRAM_INFO = (function () {
    try {
      var raw = window.sessionStorage.getItem('impact.settings.programInfo');
      if (!raw) return Object.assign({}, PROGRAM_INFO_DEFAULTS);
      var parsed = JSON.parse(raw);
      return Object.assign({}, PROGRAM_INFO_DEFAULTS, parsed || {});
    } catch (e) {
      return Object.assign({}, PROGRAM_INFO_DEFAULTS);
    }
  })();

  const QUESTION_SETS_DEFAULTS = [
    {
      id: 'personal-goals',
      name: 'Personal Goals',
      minRequired: 4,
      questions: [
        {
          id:         'pg-skills',
          type:       'textarea',
          label:      'What skills do you want to build or improve during this internship?',
          helperText: 'Think about both workplace skills and personal strengths.',
          required:   false,
          config:     { rows: 4, placeholder: 'Your response…' }
        },
        {
          id:         'pg-gain',
          type:       'textarea',
          label:      'What are you hoping to gain from this experience?',
          helperText: 'This could include confidence, experience, clarity about your goals — or something else.',
          required:   false,
          config:     { rows: 4, placeholder: 'Your response…' }
        },
        {
          id:         'pg-success',
          type:       'textarea',
          label:      'What would success look like for you by the end of this internship?',
          helperText: '2–3 sentences is ideal.',
          required:   false,
          config:     { rows: 4, placeholder: 'Your response…' }
        },
        {
          id:         'pg-challenge',
          type:       'textarea',
          label:      'What is one area you want to challenge yourself in?',
          helperText: 'Something new, uncomfortable, or a skill you want to grow.',
          required:   false,
          config:     { rows: 4, placeholder: 'Your response…' }
        },
        {
          id:         'pg-confident',
          type:       'short-text',
          label:      'I want to leave this experience feeling more confident in:',
          helperText: 'A short phrase or single word is fine.',
          required:   false,
          config:     { placeholder: '…', maxLength: 200 }
        }
      ]
    },
    {
      id: 'midpoint-reflection',
      name: 'Midpoint Reflection',
      minRequired: 4,
      questions: [
        {
          id:         'mr-learned',
          type:       'textarea',
          label:      'What have you learned or improved since starting your internship?',
          helperText: 'Think about skills, confidence, or new experiences.',
          required:   false,
          config:     { rows: 4, placeholder: 'Your response…' }
        },
        {
          id:         'mr-gone-well',
          type:       'textarea',
          label:      'What has gone well for you so far? What are you proud of?',
          helperText: 'Be specific — call out a moment if you can.',
          required:   false,
          config:     { rows: 4, placeholder: 'Your response…' }
        },
        {
          id:         'mr-challenges',
          type:       'textarea',
          label:      'What challenges have you experienced?',
          helperText: 'Name them honestly — this helps your team support you.',
          required:   false,
          config:     { rows: 4, placeholder: 'Your response…' }
        },
        {
          id:         'mr-improving',
          type:       'textarea',
          label:      'What is one area you want to continue improving?',
          helperText: 'Pick one — focus matters.',
          required:   false,
          config:     { rows: 4, placeholder: 'Your response…' }
        },
        {
          id:         'mr-support',
          type:       'textarea',
          label:      'What support would help you be more successful moving forward?',
          helperText: 'Think about people, tools, or training.',
          required:   false,
          config:     { rows: 4, placeholder: 'Your response…' }
        },
        {
          id:         'mr-success',
          type:       'textarea',
          label:      'Looking ahead, what would success look like for the rest of your internship?',
          helperText: 'Paint a picture of what "going well" means.',
          required:   false,
          config:     { rows: 4, placeholder: 'Your response…' }
        }
      ]
    },
    {
      id: 'participant-feedback',
      name: 'Participant Feedback',
      minRequired: 4,
      questions: [
        {
          id:         'pf-leaving',
          type:       'radio',
          label:      'Why are you leaving this internship?',
          helperText: '',
          required:   false,
          config: {
            options: [
              { value: 'completed',   label: 'Completed the program' },
              { value: 'job',         label: 'Got a job offer' },
              { value: 'school',      label: 'Returning to school' },
              { value: 'family',      label: 'Family or caregiving needs' },
              { value: 'health',      label: 'Health reasons' },
              { value: 'fit',         label: 'Not a good fit' }
            ],
            otherWithText: true
          }
        },
        {
          id:         'pf-overall',
          type:       'likert',
          label:      'Overall, how would you rate your experience?',
          helperText: '',
          required:   false,
          config: { min: 1, max: 5, leftLabel: 'Very negative', rightLabel: 'Very positive' }
        },
        {
          id:         'pf-prepared',
          type:       'radio',
          label:      'Do you feel more prepared for employment after this internship?',
          helperText: '',
          required:   false,
          config: {
            options: [
              { value: 'yes', label: 'Yes' },
              { value: 'no',  label: 'No' }
            ],
            otherWithText: false
          }
        },
        {
          id:         'pf-supported',
          type:       'radio',
          label:      'Did you feel supported during the internship?',
          helperText: '',
          required:   false,
          config: {
            options: [
              { value: 'yes',      label: 'Yes' },
              { value: 'somewhat', label: 'Somewhat' },
              { value: 'no',       label: 'No' }
            ],
            otherWithText: false
          }
        },
        {
          id:         'pf-supported-detail',
          type:       'textarea',
          label:      'Tell us more about the support you received (or didn\'t):',
          helperText: '',
          required:   false,
          config:     { rows: 3, placeholder: 'Your response…' }
        },
        {
          id:         'pf-barriers',
          type:       'radio',
          label:      'Did you experience any barriers during the internship?',
          helperText: '',
          required:   false,
          config: {
            options: [
              { value: 'yes', label: 'Yes' },
              { value: 'no',  label: 'No' }
            ],
            otherWithText: false
          }
        },
        {
          id:         'pf-barriers-detail',
          type:       'textarea',
          label:      'If yes, what were the barriers — and were they addressed?',
          helperText: '',
          required:   false,
          config:     { rows: 3, placeholder: 'Your response…' }
        },
        {
          id:         'pf-recommend',
          type:       'radio',
          label:      'Would you recommend this experience to others?',
          helperText: '',
          required:   false,
          config: {
            options: [
              { value: 'yes',   label: 'Yes' },
              { value: 'maybe', label: 'Maybe' },
              { value: 'no',    label: 'No' }
            ],
            otherWithText: false
          }
        },
        {
          id:         'pf-improve',
          type:       'textarea',
          label:      'Anything we could improve?',
          helperText: '',
          required:   false,
          config:     { rows: 4, placeholder: 'Your response…' }
        }
      ]
    },
    {
      id: 'exit-employer-survey',
      name: 'Exit Employer Survey',
      minRequired: 4,
      questions: [
        {
          id:         'ees-outcome',
          type:       'radio',
          label:      'Outcome status:',
          helperText: '',
          required:   true,
          config: {
            options: [
              { value: 'hired',                label: 'Hired by this employer' },
              { value: 'completed',            label: 'Completed — not hired' },
              { value: 'extended',             label: 'Internship extended' },
              { value: 'early-exit-perf',      label: 'Early exit — performance' },
              { value: 'early-exit-fit',       label: 'Early exit — fit' },
              { value: 'early-exit-circ',      label: 'Early exit — personal circumstances' }
            ],
            otherWithText: false
          }
        },
        {
          id:         'ees-offered',
          type:       'radio',
          label:      'Was employment offered?',
          helperText: '',
          required:   false,
          config: {
            options: [
              { value: 'yes', label: 'Yes' },
              { value: 'no',  label: 'No' }
            ],
            otherWithText: false
          }
        },
        {
          id:         'ees-offered-detail',
          type:       'textarea',
          label:      'If not, what was the primary reason?',
          helperText: '',
          required:   false,
          config:     { rows: 3, placeholder: 'Your response…' }
        },
        {
          id:         'ees-performance',
          type:       'likert',
          label:      'Overall performance rating:',
          helperText: '1 = Limited / 5 = Strong',
          required:   true,
          config: { min: 1, max: 5, leftLabel: 'Limited', rightLabel: 'Strong' }
        },
        {
          id:         'ees-strengths',
          type:       'textarea',
          label:      'Strengths:',
          helperText: '',
          required:   false,
          config:     { rows: 3, placeholder: 'Your response…' }
        },
        {
          id:         'ees-improvements',
          type:       'textarea',
          label:      'Areas for improvement:',
          helperText: '',
          required:   false,
          config:     { rows: 3, placeholder: 'Your response…' }
        },
        {
          id:         'ees-readiness',
          type:       'checkbox-group',
          label:      'Work readiness indicators (check all that apply):',
          helperText: '',
          required:   false,
          config: {
            options: [
              { value: 'punctual',     label: 'Reliable and punctual' },
              { value: 'communicates', label: 'Communicates clearly' },
              { value: 'feedback',     label: 'Receives feedback well' },
              { value: 'teamwork',     label: 'Works well on a team' },
              { value: 'initiative',   label: 'Takes initiative' },
              { value: 'workplace',    label: 'Understands workplace norms' }
            ],
            otherWithText: false
          }
        },
        {
          id:         'ees-barriers',
          type:       'checkbox-group',
          label:      'Barriers observed (check all that apply):',
          helperText: '',
          required:   false,
          config: {
            options: [
              { value: 'transport',     label: 'Transportation' },
              { value: 'attendance',    label: 'Attendance' },
              { value: 'communication', label: 'Communication' },
              { value: 'tasks',         label: 'Difficulty with tasks' },
              { value: 'feedback',      label: 'Trouble with feedback' },
              { value: 'family',        label: 'Family or personal' }
            ],
            otherWithText: true
          }
        },
        {
          id:         'ees-comments',
          type:       'textarea',
          label:      'Additional comments:',
          helperText: '',
          required:   false,
          config:     { rows: 3, placeholder: 'Your response…' }
        }
      ]
    },
    {
      id: 'competency-core',
      name: 'Competency Rubric — Core',
      minRequired: 0,
      questions: [
        { id: 'comp-attendance',      type: 'competency-rubric-row', label: 'Attendance & Punctuality',      helperText: 'Arrives on time, communicates absences appropriately, meets hour expectations',                           required: false, config: {} },
        { id: 'comp-conduct',         type: 'competency-rubric-row', label: 'Professional Conduct',          helperText: 'Respectful, follows workplace norms, appropriate language and behavior',                                   required: false, config: {} },
        { id: 'comp-communication',   type: 'competency-rubric-row', label: 'Communication',                 helperText: 'Asks clarifying questions, provides updates, communicates professionally with supervisor and coworkers',    required: false, config: {} },
        { id: 'comp-direction',       type: 'competency-rubric-row', label: 'Following Direction',           helperText: 'Understands instructions, completes tasks as assigned, confirms priorities',                                required: false, config: {} },
        { id: 'comp-problem-solving', type: 'competency-rubric-row', label: 'Problem-Solving',               helperText: 'Identifies issues, proposes solutions, escalates appropriately',                                          required: false, config: {} },
        { id: 'comp-teamwork',        type: 'competency-rubric-row', label: 'Teamwork',                      helperText: 'Collaborates effectively, supports peers, contributes to shared work',                                     required: false, config: {} },
        { id: 'comp-quality',         type: 'competency-rubric-row', label: 'Quality & Attention to Detail', helperText: 'Produces accurate work, double-checks before submitting, takes pride in output',                          required: false, config: {} }
      ]
    },
    {
      id: 'competency-cohort-eskenazi-2026',
      name: 'Eskenazi 2026 — Role-Specific',
      cohortId: 'eskenazi-2026',
      minRequired: 0,
      questions: [
        { id: 'cc-eskenazi-intake', type: 'competency-rubric-row', label: 'Patient Intake & Vitals', helperText: 'Captures vitals accurately, follows intake protocol, documents in EHR',   required: false, config: {} },
        { id: 'cc-eskenazi-ehr',    type: 'competency-rubric-row', label: 'EHR Tooling',             helperText: 'Navigates EHR, completes notes, uses templates appropriately',             required: false, config: {} },
        { id: 'cc-eskenazi-pace',   type: 'competency-rubric-row', label: 'Pace & Accuracy',         helperText: 'Maintains throughput without sacrificing patient safety',                   required: false, config: {} },
        { id: 'cc-eskenazi-hipaa',  type: 'competency-rubric-row', label: 'HIPAA & Compliance',      helperText: 'Handles PHI appropriately, follows privacy protocols, escalates concerns',  required: false, config: {} }
      ]
    }
  ];

  // QUESTION_SETS is the live record (defaults + sessionStorage overlay).
  // Reads sessionStorage at module init; writes happen via saveQuestionSet().
  // Includes sessionStorage-only entries (e.g. competency-cohort-* / competency-intern-*
  // authored at runtime) so they survive page reloads in the same tab.
  var QUESTION_SETS = (function () {
    try {
      var raw = window.sessionStorage.getItem('impact.settings.questionSets');
      if (!raw) {
        return QUESTION_SETS_DEFAULTS.map(function (s) {
          return JSON.parse(JSON.stringify(s));
        });
      }
      var parsed = JSON.parse(raw);
      // Per-set merge: fall back to defaults for any default missing from
      // sessionStorage, EXCEPT explicit tombstones (parsed[id] === null) which
      // mean "deleted by admin; do not resurrect from defaults".
      var out = [];
      QUESTION_SETS_DEFAULTS.forEach(function (def) {
        if (parsed[def.id] === null) return;                     // tombstone — skip
        out.push(parsed[def.id] ? parsed[def.id] : JSON.parse(JSON.stringify(def)));
      });
      // Append any sessionStorage-only sets (not in defaults — e.g. runtime-authored
      // cohort/intern competency sets). Skip null tombstones.
      Object.keys(parsed).forEach(function (id) {
        if (parsed[id] === null) return;                          // tombstone — skip
        var inDefaults = QUESTION_SETS_DEFAULTS.some(function (d) { return d.id === id; });
        if (!inDefaults) out.push(parsed[id]);
      });
      return out;
    } catch (e) {
      return QUESTION_SETS_DEFAULTS.map(function (s) {
        return JSON.parse(JSON.stringify(s));
      });
    }
  })();

  const COHORTS = [
    { id: 'eskenazi-2026',   name: 'MA — 2026',                  employerId: 'eskenazi-health',     roleId: 'medical-assistant',       phaseIds: ['intake','week-2','week-4','midpoint','week-8','final'], start: '04.01.2026', end: '09.30.2026', members: 15 },
    { id: 'ttt-2026',        name: 'Construction — 2026',        employerId: 'indy-tech-trades',    roleId: 'construction-apprentice', phaseIds: ['intake','week-2','week-4','week-8','final'],            start: '04.01.2026', end: '09.30.2026', members: 12 },
    { id: 'habitat-2026',    name: 'Community Builder — 2026',   employerId: 'habitat-indy',        roleId: 'community-builder',       phaseIds: ['intake','week-2','week-4','midpoint','final'],          start: '04.05.2026', end: '10.05.2026', members: 8  },
    { id: 'elevate-2026',    name: 'Customer Service — 2026',    employerId: 'elevate-ventures',    roleId: 'customer-service',        phaseIds: ['intake','week-2','midpoint','final'],                   start: '04.01.2026', end: '08.31.2026', members: 10 },
    { id: 'geminus-2026',    name: 'Behavioral Health — 2026',   employerId: 'geminus-behavioral',  roleId: 'behavioral-health',       phaseIds: ['intake','week-2','week-4','midpoint','final'],          start: '04.05.2026', end: '09.30.2026', members: 6  },
    { id: 'healthlink-2026', name: 'Clinic Admin — 2026',        employerId: 'healthlink-indiana',  roleId: 'clinic-admin',            phaseIds: ['intake','week-2','week-4','midpoint','week-8','final'], start: '04.01.2026', end: '09.30.2026', members: 11 },
  ];

  // Intern record stores only the minimum PII required to identify the intern at
  // assessment time: first initial, last name, and cohort (which itself implies
  // the employer). No first name, no date of birth, no zipcode are persisted.
  // The intern's role defaults to the cohort's role on cohort selection but is
  // stored independently so an admin can override per intern.
  const INTERNS = [
    { id: 'bayer',     firstInitial: 'M', last: 'Bayer',     cohortId: 'eskenazi-2026', roleId: 'medical-assistant',       start: '04.14.2026', endDate: '09.30.2026', phase: 'Week 2',    outcome: 'none' },
    { id: 'clark',     firstInitial: 'D', last: 'Clark',     cohortId: 'ttt-2026',      roleId: 'construction-apprentice', start: '04.12.2026', endDate: '09.30.2026', phase: 'Week 4',    outcome: 'none' },
    { id: 'evans',     firstInitial: 'J', last: 'Evans',     cohortId: 'elevate-2026',  roleId: 'customer-service',        start: '04.09.2026', endDate: '08.31.2026', phase: 'Midpoint',  outcome: '90d'  },
    { id: 'holt',      firstInitial: 'T', last: 'Holt',      cohortId: 'geminus-2026',  roleId: 'behavioral-health',       start: '04.07.2026', endDate: '09.30.2026', phase: 'Week 4',    outcome: 'none' },
    { id: 'patterson', firstInitial: 'S', last: 'Patterson', cohortId: 'eskenazi-2026', roleId: 'medical-assistant',       start: '04.02.2026', endDate: '09.30.2026', phase: 'Final',     outcome: '180d' },
  ];

  const COMPETENCY = [
    { id: 'c-bayer-w2',   internId: 'bayer',     phase: 'Week 2', date: '04.15.2026', result: 'pass' },
    { id: 'c-bayer-in',   internId: 'bayer',     phase: 'Intake', date: '04.01.2026', result: 'pass' },
    { id: 'c-clark-w4',   internId: 'clark',     phase: 'Week 4', date: '04.14.2026', result: 'pass' },
    { id: 'c-clark-w2',   internId: 'clark',     phase: 'Week 2', date: '04.02.2026', result: 'fail' },
    { id: 'c-evans-mid',  internId: 'evans',     phase: 'Midpoint', date: '04.10.2026', result: 'pass' },
    { id: 'c-holt-w2',    internId: 'holt',      phase: 'Week 2', date: '04.08.2026', result: 'pass' },
    { id: 'c-nguyen-in',  firstInitial: 'A', last: 'Nguyen', cohortId: 'healthlink-2026', phase: 'Intake', date: '04.05.2026', result: 'fail' },
  ];

  const SELF = [
    { id: 's-bayer',     internId: 'bayer',     submitted: '04.20.2026' },
    { id: 's-clark',     internId: 'clark',     submitted: '04.19.2026' },
    { id: 's-evans',     internId: 'evans',     submitted: '04.18.2026' },
    { id: 's-patterson', internId: 'patterson', submitted: '04.15.2026' },
  ];

  function cohortById(id)  { return COHORTS.find(c => c.id === id); }
  function internById(id)  { return INTERNS.find(i => i.id === id); }

  // Look up an intern by the composite identity the public-side flow collects:
  // first initial (case-insensitive), last name (case-insensitive), and cohort.
  // Employer is implied by cohort, so it isn't part of the match — it's still
  // captured separately for display purposes.
  function internByIdentity(firstInitial, last, cohortId) {
    if (!firstInitial || !last || !cohortId) return null;
    var fi = String(firstInitial).trim().toUpperCase();
    var ln = String(last).trim().toLowerCase();
    return INTERNS.find(function (i) {
      if (!i) return false;
      if (String(i.firstInitial || '').toUpperCase() !== fi) return false;
      if (String(i.last || '').toLowerCase() !== ln) return false;
      return i.cohortId === cohortId;
    }) || null;
  }

  // Persistent intern-identity store (localStorage so a confirmed intern doesn't
  // have to re-identify between visits). Stores the full lookup payload, not
  // just the id, so the chooser can show the readable identity even before
  // re-resolving against the roster.
  var INTERN_IDENTITY_KEY = 'impact.intern.identity';
  function getInternIdentity() {
    try {
      var raw = window.localStorage.getItem(INTERN_IDENTITY_KEY);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      if (!parsed || !parsed.internId) return null;
      return parsed;
    } catch (e) { return null; }
  }
  function setInternIdentity(payload) {
    try { window.localStorage.setItem(INTERN_IDENTITY_KEY, JSON.stringify(payload)); }
    catch (e) { /* localStorage unavailable; no-op */ }
  }
  function clearInternIdentity() {
    try { window.localStorage.removeItem(INTERN_IDENTITY_KEY); }
    catch (e) { /* no-op */ }
  }
  function cohortNameFor(intern) {
    if (!intern) return '';
    var c = cohortById(intern.cohortId);
    return c ? c.name : '';
  }

  function employerById(id) {
    return EMPLOYERS.find(function (e) { return e.id === id; }) || null;
  }

  function cohortsForEmployer(employerId) {
    return COHORTS.filter(function (c) { return c.employerId === employerId; });
  }

  function employerNameFor(cohort) {
    if (!cohort) return '';
    var e = employerById(cohort.employerId);
    return e ? e.name : '';
  }

  function phaseById(id) {
    return PHASES.find(function (p) { return p.id === id; }) || null;
  }

  function barrierById(id) {
    return BARRIERS.find(function (b) { return b.id === id; }) || null;
  }

  function roleById(id) {
    return ROLES.find(function (r) { return r.id === id; }) || null;
  }

  function rolesForEmployer(employerId) {
    if (!employerId) return [];
    return ROLES.filter(function (r) { return r.employerId === employerId; });
  }

  function roleNameFor(cohort) {
    if (!cohort) return '';
    var r = roleById(cohort.roleId);
    return r ? r.label : '';
  }

  function phasesForCohort(cohort) {
    if (!cohort || !Array.isArray(cohort.phaseIds)) return [];
    var ids = cohort.phaseIds;
    return PHASES.filter(function (p) { return ids.indexOf(p.id) !== -1; });
  }

  function saveProgramInfo(payload) {
    try {
      var merged = Object.assign({}, PROGRAM_INFO_DEFAULTS, payload || {});
      window.sessionStorage.setItem('impact.settings.programInfo', JSON.stringify(merged));
      // Update the live reference so subsequent reads in this tab see the new values.
      Object.keys(merged).forEach(function (k) { PROGRAM_INFO[k] = merged[k]; });
    } catch (e) { /* sessionStorage unavailable; silently no-op */ }
  }

  function questionSetById(id) {
    return QUESTION_SETS.find(function (s) { return s.id === id; }) || null;
  }

  function saveQuestionSet(setId, payload) {
    try {
      var raw = window.sessionStorage.getItem('impact.settings.questionSets');
      var existing = raw ? JSON.parse(raw) : {};
      // Stamp the lastEdited timestamp so the Settings list page can show it.
      payload.lastEdited = new Date().toISOString();
      existing[setId] = payload;
      window.sessionStorage.setItem('impact.settings.questionSets', JSON.stringify(existing));
      // Update the live reference (replace if exists, push if new).
      var idx = QUESTION_SETS.findIndex(function (s) { return s.id === setId; });
      if (idx !== -1) QUESTION_SETS[idx] = payload;
      else QUESTION_SETS.push(payload);
    } catch (e) { /* sessionStorage unavailable; silently no-op */ }
  }

  function deleteQuestionSet(setId) {
    try {
      var raw = window.sessionStorage.getItem('impact.settings.questionSets');
      var existing = raw ? JSON.parse(raw) : {};
      // Tombstone the id so the QUESTION_SETS IIFE knows on next load that this
      // was deleted (vs. simply absent from sessionStorage = use the default).
      existing[setId] = null;
      window.sessionStorage.setItem('impact.settings.questionSets', JSON.stringify(existing));
      var idx = QUESTION_SETS.findIndex(function (s) { return s.id === setId; });
      if (idx !== -1) QUESTION_SETS.splice(idx, 1);
    } catch (e) { /* sessionStorage unavailable; silently no-op */ }
  }

  function competencyCoreSet() {
    return questionSetById('competency-core');
  }

  function competencyCohortSet(cohortId) {
    if (!cohortId) return null;
    return questionSetById('competency-cohort-' + cohortId);
  }

  function competencyInternSet(internId) {
    if (!internId) return null;
    return questionSetById('competency-intern-' + internId);
  }

  function stitchedCompetencyQuestions(internId) {
    var intern = internById(internId);
    var core      = competencyCoreSet();
    var cohort    = intern ? competencyCohortSet(intern.cohortId) : null;
    var perIntern = competencyInternSet(internId);
    var out = [];
    [core, cohort, perIntern].forEach(function (set) {
      if (set && set.questions) {
        set.questions.forEach(function (q) { out.push(Object.assign({}, q)); });
      }
    });
    return out;
  }

  function renderEmployerLink(el, employer) {
    if (!el) return;
    if (employer) {
      el.innerHTML = '<a href="settings-employer.html?id=' + employer.id +
        '" style="color:inherit;">' + employer.name + '</a>';
    } else {
      el.textContent = '—';
    }
  }

  function qs(name) { return new URLSearchParams(location.search).get(name); }

  // -------- Modal helper --------
  function wireModals() {
    document.querySelectorAll('[data-open]').forEach(function (el) {
      el.addEventListener('click', function (e) {
        e.preventDefault();
        var m = document.getElementById(el.dataset.open);
        if (m) m.hidden = false;
      });
    });
    document.addEventListener('click', function (e) {
      var c = e.target.closest('[data-close]');
      if (c) { var m = c.closest('.modal'); if (m) m.hidden = true; }
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        document.querySelectorAll('.modal:not([hidden])').forEach(function (m) { m.hidden = true; });
      }
    });
  }

  function toast(opts) {
    opts = opts || {};
    var stack = document.querySelector('.toast-stack');
    if (!stack) {
      stack = document.createElement('div');
      stack.className = 'toast-stack';
      document.body.appendChild(stack);
    }
    var t = document.createElement('div');
    t.className = 'toast toast--' + (opts.kind || 'info');
    t.innerHTML = '<span class="toast__label">' + (opts.label || 'OK') + '</span>' + (opts.message || '');
    stack.appendChild(t);
    setTimeout(function () { t.remove(); }, opts.duration || 3200);
  }

  function fillText(sel, value) {
    document.querySelectorAll(sel).forEach(function (el) { el.textContent = value; });
  }

  function competencyById(id)  { return COMPETENCY.find(c => c.id === id); }
  function selfById(id)        { return SELF.find(s => s.id === id); }

  // Build a display name from the minimum PII the intern record stores:
  // first initial + last (e.g. "J. Evans"). Falls back to last name only if
  // the initial is missing.
  function internDisplayName(intern) {
    if (!intern) return '';
    return (intern.firstInitial ? intern.firstInitial + '. ' : '') + (intern.last || '');
  }

  // Resolve the participant identity for a COMPETENCY record, whether it
  // references an existing intern or contains its own (fail-case) fields.
  function resolveParticipant(record) {
    if (!record) return null;
    if (record.internId) {
      var intern = internById(record.internId);
      var cohort = cohortById(intern.cohortId);
      var employer = cohort ? employerById(cohort.employerId) : null;
      return {
        firstInitial: intern.firstInitial || '',
        last:         intern.last,
        cohortName:   cohort ? cohort.name : '',
        employerName: employer ? employer.name : ''
      };
    }
    var cohort2 = cohortById(record.cohortId);
    var employer2 = cohort2 ? employerById(cohort2.employerId) : null;
    return {
      firstInitial: record.firstInitial || '',
      last:         record.last,
      cohortName:   cohort2 ? cohort2.name : '',
      employerName: employer2 ? employer2.name : ''
    };
  }

  function hydrateCompetencyDetail() {
    var id = qs('id') || 'c-bayer-w2';
    var rec = competencyById(id);
    var p = resolveParticipant(rec);
    if (!p) return;
    var cohort = rec.internId ? cohortById(internById(rec.internId).cohortId) : cohortById(rec.cohortId);
    fillText('[data-field="first-initial"]', p.firstInitial || '—');
    fillText('[data-field="last"]',     p.last);
    fillText('[data-field="cohort"]',   p.cohortName);
    fillText('[data-field="employer"]', p.employerName);
    fillText('[data-field="role"]',     roleNameFor(cohort));
    fillText('[data-field="phase"]',    rec.phase);
    fillText('[data-field="date"]',     rec.date);
    fillText('[data-field="title-name"]', p.last.toUpperCase());
    var pill = document.querySelector('[data-field="result-pill"]');
    if (pill) {
      pill.className = 'pill ' + (rec.result === 'pass' ? 'pill--pass' : 'pill--fail');
      pill.textContent = rec.result === 'pass' ? 'Pass' : 'Fail';
    }
  }

  function hydrateCohortDetail() {
    var id = qs('id') || 'eskenazi-2026';
    var cohort = cohortById(id);
    if (!cohort) return;
    fillText('[data-field="name"]',        cohort.name);
    fillText('[data-field="title-name"]',  cohort.name.toUpperCase());
    var employer = employerById(cohort.employerId);
    renderEmployerLink(document.querySelector('[data-field="employer"]'), employer);
    fillText('[data-field="role"]',        roleNameFor(cohort) || '—');
    // Render the cohort's phases as a comma-separated list.
    var phaseEl = document.querySelector('[data-field="phases"]');
    if (phaseEl) {
      var phases = phasesForCohort(cohort);
      phaseEl.textContent = phases.length
        ? phases.map(function (p) { return p.label; }).join(', ')
        : 'No phases configured.';
    }
    fillText('[data-field="start"]',       cohort.start);
    fillText('[data-field="end"]',         cohort.end);
    fillText('[data-field="members"]',     String(cohort.members));
  }

  function hydrateSelfDetail() {
    var id = qs('id') || 's-bayer';
    var rec = selfById(id);
    if (!rec) return;
    var intern = internById(rec.internId);
    var cohort = cohortById(intern.cohortId);
    var employer = cohort ? employerById(cohort.employerId) : null;
    fillText('[data-field="first-initial"]', intern.firstInitial || '—');
    fillText('[data-field="last"]',        intern.last);
    fillText('[data-field="cohort"]',      cohort ? cohort.name : '—');
    fillText('[data-field="employer"]',    employer ? employer.name : '—');
    fillText('[data-field="submitted"]',   rec.submitted);
    fillText('[data-field="title-name"]',  intern.last.toUpperCase());
  }

  function wireTableFilter(spec) {
    var table = document.querySelector(spec.table);
    if (!table) return;
    var rows = Array.from(table.querySelectorAll('tbody tr[data-id]'));
    var inputs = (spec.inputs || []).map(function (s) { return document.querySelector(s); }).filter(Boolean);
    var countEl = document.querySelector(spec.countEl);

    // Create empty-state row (hidden by default)
    var tbody = table.querySelector('tbody');
    var emptyRow = document.createElement('tr');
    emptyRow.className = 'empty-row';
    var colCount = table.querySelectorAll('thead th').length || 6;
    emptyRow.innerHTML = '<td colspan="' + colCount + '" class="empty-cell">No records match the current filters.</td>';
    emptyRow.style.display = 'none';
    tbody.appendChild(emptyRow);

    function apply() {
      var visible = 0;
      rows.forEach(function (row) {
        var rowText = row.textContent.toLowerCase();
        var match = inputs.every(function (input) {
          var raw = (input.value || '').trim().toLowerCase();
          if (!raw) return true;
          // Any option whose text starts with "all " is treated as "no filter"
          if (raw.indexOf('all ') === 0 || raw === 'all') return true;
          return rowText.indexOf(raw) !== -1;
        });
        row.style.display = match ? '' : 'none';
        if (match) visible++;
      });
      emptyRow.style.display = visible === 0 ? '' : 'none';
      if (countEl) countEl.textContent = String(visible).padStart(2, '0');
    }

    inputs.forEach(function (input) {
      input.addEventListener('input', apply);
      input.addEventListener('change', apply);
    });
    apply();
  }

  function internsByCohort(cohortId) {
    return INTERNS.filter(function (i) { return i.cohortId === cohortId; });
  }

  function validate(fieldSpecs) {
    var valid = true;
    fieldSpecs.forEach(function (spec) {
      var input = document.querySelector(spec.selector);
      var field = input && input.closest('.field');
      if (!input || !field) return;
      // Clear previous errors
      field.classList.remove('field--error');
      var existing = field.querySelector('.field__error');
      if (existing) existing.remove();
      // Check
      var value = input.value.trim();
      var message = null;
      if (spec.required && !value) message = 'Required';
      else if (spec.required && input.tagName === 'SELECT' && (value.toLowerCase().indexOf('select') === 0)) message = 'Required';
      else if (spec.pattern && value && !spec.pattern.test(value)) message = spec.message || 'Invalid format';
      if (message) {
        valid = false;
        field.classList.add('field--error');
        var err = document.createElement('span');
        err.className = 'field__error';
        err.textContent = message;
        field.appendChild(err);
      }
    });
    return valid;
  }

  // -------- Question renderers --------
  // Each _render* helper takes a question record and a container element,
  // appends a complete .assessment-question wrapper, and returns nothing.
  // The wrapper includes data-qid="<question.id>" so collectAnswers can
  // walk the DOM and find each answer element by id.

  function _escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c];
    });
  }

  function _questionNum(idx) {
    return String(idx + 1).padStart(2, '0');
  }

  function _renderQuestionWrapper(question, idx, inputHtml) {
    // Common wrapper used by every type. Only the inputHtml differs.
    var helper = question.helperText
      ? '<span class="assessment-question__hint">' + _escapeHtml(question.helperText) + '</span>'
      : '';
    return (
      '<div class="assessment-question" data-qid="' + _escapeHtml(question.id) + '" data-qtype="' + _escapeHtml(question.type) + '">' +
        '<div class="assessment-question__head">' +
          '<span class="assessment-question__num">' + _questionNum(idx) + '</span>' +
          '<div>' +
            '<span class="assessment-question__label">Question ' + _questionNum(idx) + '</span>' +
            '<p class="assessment-question__text">' + _escapeHtml(question.label) + '</p>' +
            helper +
          '</div>' +
        '</div>' +
        inputHtml +
      '</div>'
    );
  }

  function _renderTextarea(question, idx) {
    var cfg = question.config || {};
    var rows = cfg.rows || 4;
    var placeholder = cfg.placeholder || 'Your response…';
    var input = '<textarea class="assessment-question__input" rows="' + rows +
      '" placeholder="' + _escapeHtml(placeholder) + '" data-qinput></textarea>';
    return _renderQuestionWrapper(question, idx, input);
  }

  function _renderShortText(question, idx) {
    var cfg = question.config || {};
    var placeholder = cfg.placeholder || '…';
    var maxLength = cfg.maxLength ? ' maxlength="' + cfg.maxLength + '"' : '';
    var input = '<input class="assessment-question__input" type="text"' + maxLength +
      ' placeholder="' + _escapeHtml(placeholder) +
      '" style="font-family: var(--font-body); font-size: 15px;" data-qinput />';
    return _renderQuestionWrapper(question, idx, input);
  }

  function _renderRadio(question, idx) {
    var cfg = question.config || {};
    var opts = Array.isArray(cfg.options) ? cfg.options : [];
    var includeOther = !!cfg.otherWithText;
    var qid = _escapeHtml(question.id);
    var optHtml = opts.map(function (o, i) {
      var inputId = 'q-' + qid + '-' + i;
      return (
        '<label class="assessment-radio">' +
          '<input type="radio" id="' + inputId + '" name="q-' + qid +
            '" value="' + _escapeHtml(o.value) + '" data-qinput />' +
          '<span>' + _escapeHtml(o.label) + '</span>' +
        '</label>'
      );
    }).join('');
    if (includeOther) {
      var otherId = 'q-' + qid + '-other';
      var otherTextId = 'q-' + qid + '-other-text';
      optHtml += (
        '<label class="assessment-radio">' +
          '<input type="radio" id="' + otherId + '" name="q-' + qid +
            '" value="__other" data-qinput data-other-trigger />' +
          '<span>Other</span>' +
        '</label>' +
        '<input type="text" id="' + otherTextId + '" class="assessment-question__input assessment-other-text" ' +
          'placeholder="Please specify…" data-other-text style="display:none; margin-top: 8px;" />'
      );
    }
    var input = '<div class="assessment-options" data-qoptions>' + optHtml + '</div>';
    return _renderQuestionWrapper(question, idx, input);
  }

  function _renderCheckboxGroup(question, idx) {
    var cfg = question.config || {};
    var opts = Array.isArray(cfg.options) ? cfg.options : [];
    var includeOther = !!cfg.otherWithText;
    var qid = _escapeHtml(question.id);
    var optHtml = opts.map(function (o, i) {
      var inputId = 'q-' + qid + '-' + i;
      return (
        '<label class="assessment-check">' +
          '<input type="checkbox" id="' + inputId + '" name="q-' + qid +
            '" value="' + _escapeHtml(o.value) + '" data-qinput />' +
          '<span>' + _escapeHtml(o.label) + '</span>' +
        '</label>'
      );
    }).join('');
    if (includeOther) {
      var otherId = 'q-' + qid + '-other';
      var otherTextId = 'q-' + qid + '-other-text';
      optHtml += (
        '<label class="assessment-check">' +
          '<input type="checkbox" id="' + otherId + '" name="q-' + qid +
            '" value="__other" data-qinput data-other-trigger />' +
          '<span>Other</span>' +
        '</label>' +
        '<input type="text" id="' + otherTextId + '" class="assessment-question__input assessment-other-text" ' +
          'placeholder="Please specify…" data-other-text style="display:none; margin-top: 8px;" />'
      );
    }
    var input = '<div class="assessment-options" data-qoptions>' + optHtml + '</div>';
    return _renderQuestionWrapper(question, idx, input);
  }

  function _renderLikert(question, idx) {
    var cfg = question.config || {};
    var min = cfg.min || 1;
    var max = cfg.max || 5;
    var leftLabel = cfg.leftLabel || '';
    var rightLabel = cfg.rightLabel || '';
    var qid = _escapeHtml(question.id);
    var segments = '';
    for (var n = min; n <= max; n++) {
      var inputId = 'q-' + qid + '-' + n;
      segments += (
        '<label class="assessment-likert__seg">' +
          '<input type="radio" id="' + inputId + '" name="q-' + qid +
            '" value="' + n + '" data-qinput />' +
          '<span>' + n + '</span>' +
        '</label>'
      );
    }
    var input = (
      '<div class="assessment-likert" data-qoptions>' +
        '<span class="assessment-likert__anchor assessment-likert__anchor--left">' + _escapeHtml(leftLabel) + '</span>' +
        '<div class="assessment-likert__segments">' + segments + '</div>' +
        '<span class="assessment-likert__anchor assessment-likert__anchor--right">' + _escapeHtml(rightLabel) + '</span>' +
      '</div>'
    );
    return _renderQuestionWrapper(question, idx, input);
  }

  function _renderCompetencyRubricRow(question, idx) {
    // Compound: 3-segment radio (Emerging/Developing/Ready) + Notes textarea.
    // Output classes use the .assessment-rubric-* prefix (matching the renderer's
    // .assessment-options / .assessment-likert* convention) so they don't collide
    // with .rubric-row / .rubric-pill in self-assessment-detail.html.
    var qid = _escapeHtml(question.id);
    var segments = ['emerging', 'developing', 'ready'].map(function (val) {
      var inputId = 'q-' + qid + '-' + val;
      var label = val.charAt(0).toUpperCase() + val.slice(1);
      return (
        '<label class="assessment-rubric-pill">' +
          '<input type="radio" id="' + inputId + '" name="q-' + qid +
            '" value="' + val + '" data-qinput />' +
          '<span>' + label + '</span>' +
        '</label>'
      );
    }).join('');
    var input = (
      '<div class="assessment-rubric-row" data-qoptions>' +
        '<div class="assessment-rubric-pills">' + segments + '</div>' +
        '<textarea class="assessment-rubric-notes" placeholder="Notes…" rows="2" data-qnotes></textarea>' +
      '</div>'
    );
    return _renderQuestionWrapper(question, idx, input);
  }

  function renderQuestion(question, container, idx) {
    if (!question || !container) return;
    var i = (typeof idx === 'number') ? idx : container.querySelectorAll('.assessment-question').length;
    var html;
    switch (question.type) {
      case 'textarea':              html = _renderTextarea(question, i); break;
      case 'short-text':            html = _renderShortText(question, i); break;
      case 'radio':                 html = _renderRadio(question, i); break;
      case 'checkbox-group':        html = _renderCheckboxGroup(question, i); break;
      case 'likert':                html = _renderLikert(question, i); break;
      case 'competency-rubric-row': html = _renderCompetencyRubricRow(question, i); break;
      default:
        html = '<div class="assessment-question input--error" data-qid="' + _escapeHtml(question.id) +
          '">Unknown question type: ' + _escapeHtml(question.type) + '</div>';
    }
    container.insertAdjacentHTML('beforeend', html);
    // After inserting, wire the "Other-with-text" reveal if applicable.
    if (question.type === 'radio' || question.type === 'checkbox-group') {
      _wireOtherReveal(container.querySelector('[data-qid="' + question.id + '"]'));
    }
  }

  // Renders a competency section header into a container. Escapes both args
  // to prevent XSS via cohort/intern names that flow into label / sub.
  function appendCompetencySectionHeader(container, label, sub) {
    var h = document.createElement('header');
    h.className = 'rubric-section-head';
    h.innerHTML = '<div><span class="rubric-section-head__label">Section</span>' +
      '<h2 class="rubric-section-head__title">' + _escapeHtml(label) + '</h2></div>' +
      (sub ? '<span class="rubric-section-head__aside">' + _escapeHtml(sub) + '</span>' : '');
    container.appendChild(h);
  }

  function _wireOtherReveal(qWrapper) {
    if (!qWrapper) return;
    var trigger = qWrapper.querySelector('[data-other-trigger]');
    var textInput = qWrapper.querySelector('[data-other-text]');
    if (!trigger || !textInput) return;
    var radios = qWrapper.querySelectorAll('input[type="radio"][data-qinput]');
    var checks = qWrapper.querySelectorAll('input[type="checkbox"][data-qinput]');
    function update() {
      textInput.style.display = trigger.checked ? 'block' : 'none';
    }
    if (radios.length) radios.forEach(function (r) { r.addEventListener('change', update); });
    if (checks.length) checks.forEach(function (c) { c.addEventListener('change', update); });
    update();
  }

  function collectAnswers(setOrId, container) {
    var set = (typeof setOrId === 'object' && setOrId !== null) ? setOrId : questionSetById(setOrId);
    if (!set || !container) return {};
    var answers = {};
    set.questions.forEach(function (q) {
      var safeQid = (window.CSS && CSS.escape) ? CSS.escape(q.id) : q.id;
      var wrapper = container.querySelector('[data-qid="' + safeQid + '"]');
      if (!wrapper) { answers[q.id] = null; return; }
      switch (q.type) {
        case 'textarea':
        case 'short-text': {
          var input = wrapper.querySelector('[data-qinput]');
          answers[q.id] = input ? input.value : '';
          break;
        }
        case 'radio':
        case 'likert': {
          var checked = wrapper.querySelector('input[type="radio"][data-qinput]:checked');
          if (!checked) { answers[q.id] = null; break; }
          if (checked.value === '__other') {
            var otherText = wrapper.querySelector('[data-other-text]');
            answers[q.id] = { value: '__other', otherText: otherText ? otherText.value : '' };
          } else {
            answers[q.id] = checked.value;
          }
          break;
        }
        case 'checkbox-group': {
          var checks = wrapper.querySelectorAll('input[type="checkbox"][data-qinput]:checked');
          var values = [];
          var otherSelected = false;
          checks.forEach(function (c) {
            if (c.value === '__other') { otherSelected = true; }
            else { values.push(c.value); }
          });
          if (otherSelected) {
            var otherText2 = wrapper.querySelector('[data-other-text]');
            answers[q.id] = { values: values, otherText: otherText2 ? otherText2.value : '' };
          } else {
            answers[q.id] = values;
          }
          break;
        }
        case 'competency-rubric-row': {
          var checked3 = wrapper.querySelector('input[type="radio"][data-qinput]:checked');
          var notes = wrapper.querySelector('[data-qnotes]');
          answers[q.id] = {
            rating: checked3 ? checked3.value : null,
            notes:  notes ? notes.value : ''
          };
          break;
        }
        default:
          answers[q.id] = null;
      }
    });
    return answers;
  }

  function validateAnswers(setOrId, answers) {
    var set = (typeof setOrId === 'object' && setOrId !== null) ? setOrId : questionSetById(setOrId);
    if (!set) return { ok: true, errors: {} };
    answers = answers || {};
    var errors = {};
    var answeredCount = 0;
    set.questions.forEach(function (q) {
      var a = answers[q.id];
      var isAnswered = _isAnswered(q, a);
      if (q.required && !isAnswered) {
        errors[q.id] = 'Required';
      }
      if (isAnswered) answeredCount++;
    });
    if (typeof set.minRequired === 'number' && answeredCount < set.minRequired) {
      // Set-level error — applies to the form as a whole, not a specific question.
      errors.__minRequired = 'Please answer at least ' + set.minRequired + ' of ' +
        set.questions.length + ' questions before submitting.';
    }
    return { ok: Object.keys(errors).length === 0, errors: errors };
  }

  function restoreAnswers(setOrId, container, payload) {
    var set = (typeof setOrId === 'object' && setOrId !== null) ? setOrId : questionSetById(setOrId);
    if (!set || !container || !payload) return;
    set.questions.forEach(function (q) {
      var ans = payload[q.id];
      if (ans == null) return;
      var safeQid = (window.CSS && CSS.escape) ? CSS.escape(q.id) : q.id;
      var wrapper = container.querySelector('[data-qid="' + safeQid + '"]');
      if (!wrapper) return;
      switch (q.type) {
        case 'textarea':
        case 'short-text': {
          var input = wrapper.querySelector('[data-qinput]');
          if (input) input.value = ans;
          break;
        }
        case 'radio':
        case 'likert': {
          var val, otherText;
          if (typeof ans === 'object') {
            val = ans.value;
            otherText = ans.otherText;
          } else {
            val = ans;
          }
          var radio = wrapper.querySelector('input[type="radio"][value="' + String(val).replace(/"/g, '\\"') + '"]');
          if (radio) {
            radio.checked = true;
            // Dispatch change so _wireOtherReveal can reveal the otherText input.
            radio.dispatchEvent(new Event('change', { bubbles: true }));
          }
          if (val === '__other' && otherText != null) {
            var otherInput = wrapper.querySelector('[data-other-text]');
            if (otherInput) otherInput.value = otherText;
          }
          break;
        }
        case 'checkbox-group': {
          var values, checkOtherText;
          if (Array.isArray(ans)) {
            values = ans;
          } else if (typeof ans === 'object') {
            values = ans.values || [];
            checkOtherText = ans.otherText;
          } else {
            values = [];
          }
          values.forEach(function (v) {
            var cb = wrapper.querySelector('input[type="checkbox"][value="' + String(v).replace(/"/g, '\\"') + '"]');
            if (cb) cb.checked = true;
          });
          if (checkOtherText != null) {
            var otherCb = wrapper.querySelector('input[type="checkbox"][data-other-trigger]');
            if (otherCb) {
              otherCb.checked = true;
              otherCb.dispatchEvent(new Event('change', { bubbles: true }));
            }
            var otherText2 = wrapper.querySelector('[data-other-text]');
            if (otherText2) otherText2.value = checkOtherText;
          }
          break;
        }
        case 'competency-rubric-row': {
          var rating = (typeof ans === 'object') ? ans.rating : null;
          var notes = (typeof ans === 'object') ? ans.notes : '';
          if (rating) {
            var ratingRadio = wrapper.querySelector('input[type="radio"][value="' + String(rating).replace(/"/g, '\\"') + '"]');
            if (ratingRadio) ratingRadio.checked = true;
          }
          if (notes != null) {
            var notesInput = wrapper.querySelector('[data-qnotes]');
            if (notesInput) notesInput.value = notes;
          }
          break;
        }
      }
    });
  }

  function _isAnswered(question, answer) {
    if (answer == null) return false;
    switch (question.type) {
      case 'textarea':
      case 'short-text':
        return String(answer).trim().length > 0;
      case 'radio':
      case 'likert':
        if (typeof answer === 'object') {
          if (answer.value === '__other') {
            return String(answer.otherText || '').trim().length > 0;
          }
          // Any other object with a non-empty value is also "answered".
          return answer.value != null && String(answer.value).length > 0;
        }
        return String(answer).length > 0;
      case 'checkbox-group':
        if (typeof answer === 'object' && !Array.isArray(answer)) {
          // "Other-with-text" — at least one value OR a non-empty otherText.
          return (answer.values && answer.values.length > 0) ||
                 String(answer.otherText || '').trim().length > 0;
        }
        return Array.isArray(answer) && answer.length > 0;
      case 'competency-rubric-row':
        return answer.rating != null;
      default:
        return false;
    }
  }

  // -------- Intern Record (unified new + edit page) --------

  function hydrateInternRecord() {
    // Render the 12-barrier checkbox list (always present in both modes)
    var barrierList = document.querySelector('[data-barrier-list]');
    if (barrierList) {
      barrierList.innerHTML = '';
      BARRIERS.forEach(function (barrier) {
        var checkboxId = 'barrier-' + barrier.id;
        var row = document.createElement('div');
        row.className = 'outcome-check';
        row.innerHTML =
          '<input type="checkbox" id="' + checkboxId + '" name="barriers" value="' + barrier.id + '" />' +
          '<label for="' + checkboxId + '">' + barrier.label + '</label>';
        barrierList.appendChild(row);
      });
    }

    var id = qs('id');
    var titleEl = document.querySelector('[data-record="title"]');
    var crumbEl = document.querySelector('[data-record="breadcrumb"]');
    var metaStrip = document.querySelector('[data-record="meta-strip"]');
    var deleteBtn = document.querySelector('[data-record="delete-button"]');
    var statusChip = document.querySelector('[data-field="status-chip"]');
    var personalInfoPanel = document.querySelector('[data-section="personal-info"]');
    var internshipDetailsPanel = document.querySelector('[data-section="internship-details"]');

    if (!id) {
      // ---- New mode ----
      if (titleEl) titleEl.textContent = 'NEW INTERN.';
      if (crumbEl) crumbEl.innerHTML = '<a href="interns-dashboard.html" style="color:inherit; text-decoration:none;">ADMIN / INTERNS</a> / NEW';
      if (statusChip) statusChip.textContent = 'INTERN RECORD · NEW';

      // Disable Panel 07 (Employment Details) in new mode
      var o1 = document.getElementById('o1-check');
      var o2 = document.getElementById('o2-check');
      var o1Hint = document.querySelector('[data-field="o1-hint"]');
      var o2Hint = document.querySelector('[data-field="o2-hint"]');
      var o1Notes = document.getElementById('o1-notes');
      var o2Notes = document.getElementById('o2-notes');
      if (o1) o1.disabled = true;
      if (o2) o2.disabled = true;
      if (o1Hint) o1Hint.textContent = 'To be tracked once placed';
      if (o2Hint) o2Hint.textContent = 'To be tracked once placed';
      if (o1Notes) o1Notes.disabled = true;
      if (o2Notes) o2Notes.disabled = true;

      renderSelfAssessmentLinks(null);
      renderEvaluationLinks(null);
      return;
    }

    // ---- Edit mode ----
    if (titleEl) titleEl.textContent = 'EDIT INTERN.';
    if (crumbEl) crumbEl.innerHTML = '<a href="interns-dashboard.html" style="color:inherit; text-decoration:none;">ADMIN / INTERNS</a> / EDIT';
    if (deleteBtn) deleteBtn.hidden = false;

    var intern = internById(id);
    if (!intern) {
      toast({ kind: 'danger', label: 'NOT FOUND', message: 'No intern with that ID.' });
      if (statusChip) statusChip.textContent = 'INTERN RECORD · NOT FOUND';
      if (personalInfoPanel) personalInfoPanel.hidden = true;
      if (internshipDetailsPanel) internshipDetailsPanel.hidden = true;
      if (metaStrip) metaStrip.hidden = false;
      renderSelfAssessmentLinks(null);
      renderEvaluationLinks(null);
      return;
    }

    // Hide editable identity panels; show meta-strip with intern data
    if (personalInfoPanel) personalInfoPanel.hidden = true;
    if (internshipDetailsPanel) internshipDetailsPanel.hidden = true;
    if (metaStrip) metaStrip.hidden = false;

    var cohort = cohortById(intern.cohortId);
    fillText('[data-field="first-initial"]', intern.firstInitial || '—');
    fillText('[data-field="last"]',     intern.last);
    fillText('[data-field="cohort"]',   cohort ? cohort.name : '—');
    var iEmployer = cohort ? employerById(cohort.employerId) : null;
    renderEmployerLink(document.querySelector('[data-field="employer"]'), iEmployer);
    var iRole = roleById(intern.roleId);
    fillText('[data-field="role"]',     iRole ? iRole.label : (cohort ? roleNameFor(cohort) : '—'));
    fillText('[data-field="start"]',    intern.start || '—');
    fillText('[data-field="end"]',      intern.endDate || '—');

    if (statusChip) {
      statusChip.textContent = 'INTERN RECORD · ' + intern.last.toUpperCase() +
        (cohort ? ' / ' + cohort.name.toUpperCase() : '');
    }

    // Hydrate Panel 07 outcome checkboxes from the intern's outcome status
    var o1 = document.getElementById('o1-check');
    var o2 = document.getElementById('o2-check');
    if (o1) o1.checked = intern.outcome === '90d' || intern.outcome === '180d';
    if (o2) o2.checked = intern.outcome === '180d';

    renderSelfAssessmentLinks(intern);
    renderEvaluationLinks(intern);
  }

  function renderSelfAssessmentLinks(intern) {
    var grid = document.querySelector('[data-record-link-grid="self-assessments"]');
    if (!grid) return;
    grid.innerHTML = '';

    var items = [
      { type: 'personal-goals',       label: 'PERSONAL GOALS',       title: 'Personal Goals' },
      { type: 'midpoint-reflection',  label: 'MID-POINT GOALS',      title: 'Mid-Point Goals' },
      { type: 'participant-feedback', label: 'PARTICIPANT FEEDBACK', title: 'Participant Feedback Form' }
    ];

    items.forEach(function (item) {
      // For the unsaved (no intern) and unsubmitted states, render a flat
      // placeholder div. For the submitted state, render an <a> linking to
      // the type-aware detail page so admins can view the responses.
      // Per-intern keying: each intern record only surfaces the submissions
      // that intern made. Lookup is intern.id-scoped so different interns
      // can independently submit / not submit each assessment.
      var status = intern ? assessmentStatus(item.type, intern.id) : null;
      var isCompleted = status && status.completed;

      var card = document.createElement(isCompleted ? 'a' : 'div');
      // Submitted cards are real clickable anchors; everything else stays as
      // a flat placeholder div with the muted background.
      card.className = isCompleted ? 'record-link' : 'record-link record-link--placeholder';
      if (isCompleted) {
        card.href = 'self-assessment-detail.html?type=' + item.type + '&internId=' + intern.id;
      }

      var statusText;
      if (!intern) {
        statusText = 'Will appear after this intern record is saved';
      } else if (isCompleted) {
        statusText = 'Submitted on ' + formatCompletionDate(status.completedAt) + ' · View →';
      } else {
        statusText = 'Not yet submitted';
      }
      card.innerHTML =
        '<div class="record-link__head">' +
          '<span class="record-link__label">' + item.label + '</span>' +
          '<span class="record-link__title">' + item.title + '</span>' +
        '</div>' +
        '<span class="record-link__status">' + statusText + '</span>';
      grid.appendChild(card);
    });
  }

  function renderEvaluationLinks(intern) {
    var grid = document.querySelector('[data-record-link-grid="evaluations"]');
    if (!grid) return;
    grid.innerHTML = '';

    if (intern) {
      var competencyRecords = COMPETENCY.filter(function (c) { return c.internId === intern.id; });
      if (competencyRecords.length === 0) {
        var empty = document.createElement('div');
        empty.className = 'record-link record-link--placeholder';
        empty.innerHTML =
          '<div class="record-link__head">' +
            '<span class="record-link__label">COMPETENCY</span>' +
            '<span class="record-link__title">Competency Assessments</span>' +
          '</div>' +
          '<span class="record-link__status">No competency assessments yet</span>';
        grid.appendChild(empty);
      } else {
        competencyRecords.forEach(function (c) {
          var a = document.createElement('a');
          a.className = 'record-link';
          a.href = 'competency-detail.html?id=' + c.id;
          a.innerHTML =
            '<div class="record-link__head">' +
              '<span class="record-link__label">COMPETENCY · ' + c.phase.toUpperCase() + '</span>' +
              '<span class="record-link__title">Competency Detail</span>' +
            '</div>' +
            '<span class="record-link__status">' + c.date + ' · ' + (c.result === 'pass' ? 'Pass' : 'Fail') + '</span>';
          grid.appendChild(a);
        });
      }
    } else {
      var newCard = document.createElement('div');
      newCard.className = 'record-link record-link--placeholder';
      newCard.innerHTML =
        '<div class="record-link__head">' +
          '<span class="record-link__label">COMPETENCY</span>' +
          '<span class="record-link__title">Competency Assessments</span>' +
        '</div>' +
        '<span class="record-link__status">Will appear after this intern record is saved</span>';
      grid.appendChild(newCard);
    }

    // Exit Employer Survey card — real link with per-intern status (existing intern only).
    if (intern) {
      var exitStatus = assessmentStatus('exit-employer-survey', intern.id);
      var exitCard = document.createElement('a');
      exitCard.className = 'record-link';
      exitCard.href = 'exit-employer-survey.html?internId=' + intern.id;
      var exitStatusText = exitStatus.completed
        ? 'Submitted on ' + formatCompletionDate(exitStatus.completedAt) + ' · Edit'
        : 'Not yet submitted';
      exitCard.innerHTML =
        '<div class="record-link__head">' +
          '<span class="record-link__label">EXIT SURVEY</span>' +
          '<span class="record-link__title">Exit Employer Survey</span>' +
        '</div>' +
        '<span class="record-link__status">' + exitStatusText + '</span>';
      grid.appendChild(exitCard);
    } else {
      var newExit = document.createElement('div');
      newExit.className = 'record-link record-link--placeholder';
      newExit.innerHTML =
        '<div class="record-link__head">' +
          '<span class="record-link__label">EXIT SURVEY</span>' +
          '<span class="record-link__title">Exit Employer Survey</span>' +
        '</div>' +
        '<span class="record-link__status">Will appear after this intern record is saved</span>';
      grid.appendChild(newExit);
    }
  }

  // -------- Assessment completion state (sessionStorage-backed) --------

  const ASSESSMENT_TYPES = {
    PERSONAL_GOALS:        'personal-goals',
    MIDPOINT:              'midpoint-reflection',
    PARTICIPANT_FEEDBACK:  'participant-feedback',
    EXIT_EMPLOYER_SURVEY:  'exit-employer-survey',
    COMPETENCY:            'competency'
  };

  function assessmentStorageKey(type, internId) {
    return 'impact.assessment.' + type + (internId ? '.' + internId : '') + '.completedAt';
  }

  function assessmentStatus(type, internId) {
    try {
      var raw = window.sessionStorage.getItem(assessmentStorageKey(type, internId));
      if (!raw) return { completed: false, completedAt: null, payload: null };

      // Try to parse as JSON ({ completedAt, payload }); fall back to raw ISO string.
      var parsed = null;
      try { parsed = JSON.parse(raw); } catch (e) { parsed = null; }
      var iso, payload;
      if (parsed && typeof parsed === 'object' && parsed.completedAt) {
        iso = parsed.completedAt;
        payload = parsed.payload || null;
      } else {
        iso = raw;
        payload = null;
      }

      var date = new Date(iso);
      if (isNaN(date.getTime())) return { completed: false, completedAt: null, payload: null };
      return { completed: true, completedAt: date, payload: payload };
    } catch (err) {
      return { completed: false, completedAt: null, payload: null };
    }
  }

  function markAssessmentComplete(type, internId, payload) {
    try {
      var key = assessmentStorageKey(type, internId);
      var value;
      if (payload) {
        value = JSON.stringify({ completedAt: new Date().toISOString(), payload: payload });
      } else {
        value = new Date().toISOString();
      }
      window.sessionStorage.setItem(key, value);
    } catch (err) {
      // No-op on storage failure (privacy mode, etc.)
    }
  }

  function formatCompletionDate(date) {
    try {
      return new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).format(date);
    } catch (err) {
      return '';
    }
  }

  window.IMPACT = {
    COHORTS, INTERNS, COMPETENCY, SELF, EMPLOYERS,
    PHASES, BARRIERS, ROLES, PROGRAM_INFO, QUESTION_SETS,
    cohortById, internById, internByIdentity, internDisplayName, cohortNameFor, qs, wireModals, toast,
    getInternIdentity, setInternIdentity, clearInternIdentity,
    fillText, hydrateInternRecord,
    competencyById, selfById, resolveParticipant,
    hydrateCompetencyDetail, hydrateCohortDetail, hydrateSelfDetail,
    wireTableFilter, internsByCohort, validate,
    employerById, cohortsForEmployer, employerNameFor, renderEmployerLink,
    phaseById, barrierById, roleById, rolesForEmployer, roleNameFor, phasesForCohort,
    saveProgramInfo,
    questionSetById, saveQuestionSet, deleteQuestionSet, renderQuestion, collectAnswers, validateAnswers, restoreAnswers,
    competencyCoreSet, competencyCohortSet, competencyInternSet, stitchedCompetencyQuestions,
    ASSESSMENT_TYPES, assessmentStatus, markAssessmentComplete, formatCompletionDate,
    appendCompetencySectionHeader,
  };
})(window);
