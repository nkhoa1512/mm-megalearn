// Mock data shaped after SRS.md: BUSINESS_UNIT > DIVISION > DEPARTMENT > USER,
// COURSE > COURSE_MODULE > COURSE_LESSON, COURSE_ASSIGNMENT (target scope),
// LEARNING_ENROLLMENT > LESSON_PROGRESS, ASSESSMENT_ATTEMPT.
// Replace with real API calls when wiring up a backend.

// ---------------------------------------------------------------------------
// Organization structure (BU -> Division -> Department), subset of the SRS org chart
// ---------------------------------------------------------------------------

export const businessUnits = [
  { id: 'bu-mmvn', code: 'MMVN', name: 'MM Mega Market Vietnam' },
];

export const divisions = [
  { id: 'div-omd', businessUnitId: 'bu-mmvn', code: 'OMD', name: 'Merchandise' },
  { id: 'div-ia', businessUnitId: 'bu-mmvn', code: 'IA', name: 'Internal Audit & SOP & Risk Management' },
  { id: 'div-hrd', businessUnitId: 'bu-mmvn', code: 'HRD', name: 'Human Resource' },
];

export const departments = [
  { id: 'dept-ppf', divisionId: 'div-omd', code: 'PPF', name: 'Processed Fresh Food' },
  { id: 'dept-df', divisionId: 'div-omd', code: 'DF', name: 'Dry Food' },
  { id: 'dept-rsk', divisionId: 'div-ia', code: 'RSK', name: 'Risk Management' },
  { id: 'dept-lod', divisionId: 'div-hrd', code: 'L&OD', name: 'Learning & Organizational Development' },
];

// ---------------------------------------------------------------------------
// Users (ADMIN / MANAGER / USER_LEARN)
// ---------------------------------------------------------------------------

export const managerUser = {
  userId: 'USR-1030',
  employeeCode: 'EMP-1030',
  fullName: 'Nguyen Van Manager',
  role: 'MANAGER',
  position: 'Department Manager',
  businessUnitId: 'bu-mmvn',
  divisionId: 'div-omd',
  departmentId: 'dept-ppf',
  status: 'ACTIVE',
};

export const currentUser = {
  userId: 'USR-1042',
  employeeCode: 'EMP-1042',
  fullName: 'Minh Tran',
  role: 'USER_LEARN',
  position: 'Bakery Associate',
  businessUnitId: 'bu-mmvn',
  divisionId: 'div-omd',
  departmentId: 'dept-ppf',
  managerId: 'USR-1030',
  status: 'ACTIVE',
};

// Flat roster of the "real" persona users tracked in this mockup — used to
// populate the Individual User picker in Admin's target-audience selector.
export function allUsers() {
  return [managerUser, currentUser, adminUser];
}

export const adminUser = {
  userId: 'USR-1000',
  employeeCode: 'EMP-1000',
  fullName: 'Le Thi Admin',
  role: 'ADMIN',
  position: 'L&OD Administrator',
  businessUnitId: 'bu-mmvn',
  divisionId: 'div-hrd',
  departmentId: 'dept-lod',
  status: 'ACTIVE',
};

// Direct reports of managerUser — all within the Manager's authorized scope (OMD / PPF)
export const teamMembers = [
  {
    employeeId: 'EMP-1042', name: 'Minh Tran', position: 'Bakery Associate',
    departmentId: 'dept-ppf',
    course: 'Information Security Awareness', courseType: 'MANDATORY', progress: 65,
    status: 'IN_PROGRESS', score: null, attempts: 0, dueDate: '2026-09-30',
    lastActivity: '2026-08-15', inactiveDays: 6, overdue: false,
  },
  {
    employeeId: 'EMP-1078', name: 'Sarah Johnson', position: 'Bakery Associate',
    departmentId: 'dept-ppf',
    course: 'Risk Management Awareness', courseType: 'MANDATORY', progress: 100,
    status: 'COMPLETED', score: 82, attempts: 1, dueDate: '2026-09-15',
    lastActivity: '2026-08-18', inactiveDays: 0, overdue: false,
  },
  {
    employeeId: 'EMP-1099', name: 'Mike Chen', position: 'Line Cook',
    departmentId: 'dept-ppf',
    course: 'Information Security Awareness', courseType: 'MANDATORY', progress: 100,
    status: 'FAILED', score: 55, attempts: 3, dueDate: '2026-08-20',
    lastActivity: '2026-08-17', inactiveDays: 0, overdue: false,
  },
  {
    employeeId: 'EMP-1103', name: 'John Doe', position: 'Bakery Associate',
    departmentId: 'dept-ppf',
    course: 'Corporate Orientation', courseType: 'OPTIONAL', progress: 20,
    status: 'IN_PROGRESS', score: null, attempts: 0, dueDate: null,
    lastActivity: '2026-08-06', inactiveDays: 15, overdue: false,
  },
  {
    employeeId: 'EMP-1111', name: 'Lisa Wang', position: 'Front Counter',
    departmentId: 'dept-ppf',
    course: 'Risk Management Awareness', courseType: 'MANDATORY', progress: 20,
    status: 'OVERDUE', score: null, attempts: 0, dueDate: '2026-08-10',
    lastActivity: '2026-08-01', inactiveDays: 20, overdue: true,
  },
  {
    employeeId: 'EMP-1120', name: 'Carlos Reyes', position: 'Bakery Associate',
    departmentId: 'dept-ppf',
    course: 'Information Security Awareness', courseType: 'MANDATORY', progress: 0,
    status: 'NOT_STARTED', score: null, attempts: 0, dueDate: '2026-09-30',
    lastActivity: null, inactiveDays: 0, overdue: false,
  },
];

// ---------------------------------------------------------------------------
// Courses: COURSE -> COURSE_MODULE -> COURSE_LESSON, plus COURSE_CONFIGURATION
// and COURSE_ASSIGNMENT (only present when courseType === 'MANDATORY').
// ---------------------------------------------------------------------------

export const courses = [
  {
    id: 'course-orientation',
    code: 'ORNT-001',
    title: 'Corporate Orientation',
    description: 'Introduction to company history, values and workplace policies for new and existing employees.',
    category: 'Orientation',
    courseType: 'OPTIONAL',
    status: 'PUBLISHED',
    version: 'v1.0',
    estimatedDuration: '2h',
    createdBy: 'USR-1000',
    publishedAt: '2026-06-01',
    prerequisites: [],
    configuration: {
      assessmentEnabled: false,
      certificateEnabled: true,
      completionRule: 'Complete all required lessons in every module.',
    },
    assignment: null,
    modules: [
      {
        id: 'ornt-m1',
        title: 'Welcome to MM Mega Market',
        displayOrder: 1,
        lessons: [
          { id: 'ornt-l1', title: 'Company overview video', lessonType: 'VIDEO', isRequired: true, status: 'COMPLETED', progressPercent: 100, rule: { requiredWatchPercent: 90 } },
          { id: 'ornt-l2', title: 'Workplace code of conduct', lessonType: 'DOCUMENT', isRequired: true, status: 'IN_PROGRESS', progressPercent: 40, rule: { requiredReadPercent: 90 } },
          { id: 'ornt-l3', title: 'Facilities & benefits guide', lessonType: 'TEXT', isRequired: false, status: 'NOT_STARTED', progressPercent: 0, rule: { requiredReadPercent: 80 } },
        ],
      },
    ],
    enrollment: {
      status: 'IN_PROGRESS', progressPercent: 45,
      startedAt: '2026-08-10', completedAt: null,
      startDate: null, dueDate: null,
      lastLessonTitle: 'Workplace code of conduct', lastActivityAt: '2026-08-16',
    },
  },
  {
    id: 'course-infosec',
    code: 'ISA-001',
    title: 'Information Security Awareness',
    description: 'Mandatory compliance training covering data protection, phishing awareness and acceptable use of company systems.',
    category: 'Information Security',
    courseType: 'MANDATORY',
    status: 'PUBLISHED',
    version: 'v2.1',
    estimatedDuration: '5h',
    createdBy: 'USR-1000',
    publishedAt: '2026-07-01',
    prerequisites: [],
    configuration: {
      assessmentEnabled: true,
      questionBankSize: 50,
      questionsPerAttempt: 20,
      passingScorePercent: 80,
      maxAttempts: 3,
      assessmentTimeLimit: 30,
      randomizeQuestions: true,
      randomizeAnswers: true,
      showCorrectAnswers: 'AFTER_FINAL_ATTEMPT',
      certificateEnabled: true,
      completionRule: 'Complete all required modules and pass the final assessment with at least 80%.',
    },
    assignment: {
      assignmentType: 'BUSINESS_UNIT',
      targetBusinessUnitId: 'bu-mmvn',
      targetLabel: 'MM Mega Market Vietnam',
      assignedBy: 'USR-1000',
      assignedAt: '2026-07-01',
      startDate: '2026-07-05',
      dueDate: '2026-09-30',
    },
    modules: [
      {
        id: 'isa-m1',
        title: 'Understanding Information Security',
        displayOrder: 1,
        lessons: [
          { id: 'isa-l1', title: 'Why information security matters', lessonType: 'VIDEO', isRequired: true, status: 'COMPLETED', progressPercent: 100, rule: { requiredWatchPercent: 90 } },
          { id: 'isa-l2', title: 'Information Security Policy.pdf', lessonType: 'DOCUMENT', isRequired: true, status: 'COMPLETED', progressPercent: 100, rule: { requiredReadPercent: 90 } },
          { id: 'isa-l3', title: 'Data classification basics', lessonType: 'TEXT', isRequired: true, status: 'COMPLETED', progressPercent: 100, rule: { requiredReadPercent: 90 } },
        ],
      },
      {
        id: 'isa-m2',
        title: 'Phishing & Social Engineering',
        displayOrder: 2,
        lessons: [
          { id: 'isa-l4', title: 'Recognizing phishing emails', lessonType: 'VIDEO', isRequired: true, status: 'IN_PROGRESS', progressPercent: 60, rule: { requiredWatchPercent: 90 } },
          { id: 'isa-l5', title: 'Reported phishing samples', lessonType: 'IMAGE', isRequired: true, status: 'NOT_STARTED', progressPercent: 0, rule: { requireAllViewed: true, imageCount: 6 } },
          { id: 'isa-l6', title: 'Incident reporting procedure', lessonType: 'SCRIPT', isRequired: true, status: 'NOT_STARTED', progressPercent: 0, rule: { requiredReadPercent: 90 } },
        ],
      },
      {
        id: 'isa-m3',
        title: 'Final Assessment',
        displayOrder: 3,
        lessons: [
          { id: 'isa-l7', title: 'Information Security final assessment', lessonType: 'ASSESSMENT', isRequired: true, status: 'NOT_STARTED', progressPercent: 0, rule: {} },
        ],
      },
    ],
    enrollment: {
      status: 'IN_PROGRESS', progressPercent: 65,
      startedAt: '2026-07-10', completedAt: null,
      startDate: '2026-07-05', dueDate: '2026-09-30',
      lastLessonTitle: 'Recognizing phishing emails', lastActivityAt: '2026-08-15',
    },
    assessmentAttempts: [],
    // FR-ASSESS-001: Question Bank. Admin builds this bank; each attempt draws
    // `questionsPerAttempt` from it (see configuration.questionsPerAttempt above).
    questionBank: [
      {
        id: 'isa-q1', category: 'Phishing', difficulty: 'EASY', score: 5,
        text: 'What is the safest action when you receive an email asking you to reset your password urgently?',
        type: 'SINGLE_CHOICE',
        options: [
          { id: 'o1', text: 'Click the link and reset it immediately', isCorrect: false },
          { id: 'o2', text: 'Verify the sender through a separate known channel first', isCorrect: true },
          { id: 'o3', text: 'Forward it to a coworker to check', isCorrect: false },
          { id: 'o4', text: 'Reply asking for more details', isCorrect: false },
        ],
        explanation: 'Never act on urgency alone — verify through a channel you already trust.',
      },
      {
        id: 'isa-q2', category: 'Data Classification', difficulty: 'MEDIUM', score: 5,
        text: 'Which of the following should always be classified as Confidential? (select all that apply)',
        type: 'MULTIPLE_CHOICE',
        options: [
          { id: 'o1', text: 'Customer personal data', isCorrect: true },
          { id: 'o2', text: 'Public marketing brochures', isCorrect: false },
          { id: 'o3', text: 'Unreleased financial results', isCorrect: true },
          { id: 'o4', text: 'Company holiday calendar', isCorrect: false },
        ],
        explanation: 'Customer data and unreleased financials are both Confidential by policy.',
      },
      {
        id: 'isa-q3', category: 'Incident Reporting', difficulty: 'EASY', score: 5,
        text: 'You should report a suspected security incident within 24 hours of noticing it.',
        type: 'TRUE_FALSE',
        options: [
          { id: 'o1', text: 'True', isCorrect: true },
          { id: 'o2', text: 'False', isCorrect: false },
        ],
        explanation: 'Policy requires reporting within 24 hours to limit potential impact.',
      },
    ],
  },
  {
    id: 'course-risk',
    code: 'RSK-001',
    title: 'Risk Management Awareness',
    description: 'Overview of the organization risk framework, control ownership, and escalation procedures.',
    category: 'Risk Management',
    courseType: 'MANDATORY',
    status: 'PUBLISHED',
    version: 'v1.0',
    estimatedDuration: '3h',
    createdBy: 'USR-1000',
    publishedAt: '2026-06-15',
    prerequisites: [],
    configuration: {
      assessmentEnabled: true,
      questionBankSize: 30,
      questionsPerAttempt: 15,
      passingScorePercent: 75,
      maxAttempts: 2,
      assessmentTimeLimit: 20,
      randomizeQuestions: true,
      randomizeAnswers: false,
      showCorrectAnswers: 'AFTER_PASSING',
      certificateEnabled: true,
      completionRule: 'Complete all required modules and pass the final assessment with at least 75%.',
    },
    assignment: {
      assignmentType: 'DIVISION',
      targetDivisionId: 'div-omd',
      targetLabel: 'OMD - Merchandise',
      assignedBy: 'USR-1000',
      assignedAt: '2026-06-15',
      startDate: '2026-06-20',
      dueDate: '2026-09-15',
    },
    modules: [
      {
        id: 'rsk-m1',
        title: 'Risk Fundamentals',
        displayOrder: 1,
        lessons: [
          { id: 'rsk-l1', title: 'Risk management framework overview', lessonType: 'VIDEO', isRequired: true, status: 'NOT_STARTED', progressPercent: 0, rule: { requiredWatchPercent: 90 } },
          { id: 'rsk-l2', title: 'Risk Management Procedure.pdf', lessonType: 'DOCUMENT', isRequired: true, status: 'NOT_STARTED', progressPercent: 0, rule: { requiredReadPercent: 90 } },
        ],
      },
      {
        id: 'rsk-m2',
        title: 'Final Assessment',
        displayOrder: 2,
        lessons: [
          { id: 'rsk-l3', title: 'Risk Management final assessment', lessonType: 'ASSESSMENT', isRequired: true, status: 'NOT_STARTED', progressPercent: 0, rule: {} },
        ],
      },
    ],
    enrollment: {
      status: 'NOT_STARTED', progressPercent: 0,
      startedAt: null, completedAt: null,
      startDate: '2026-06-20', dueDate: '2026-09-15',
      lastLessonTitle: null, lastActivityAt: null,
    },
    assessmentAttempts: [],
    questionBank: [
      {
        id: 'rsk-q1', category: 'Risk Framework', difficulty: 'MEDIUM', score: 10,
        text: 'Who owns a risk once it has been identified and logged in the risk register?',
        type: 'SINGLE_CHOICE',
        options: [
          { id: 'o1', text: 'The Internal Audit team', isCorrect: false },
          { id: 'o2', text: 'The designated control/process owner', isCorrect: true },
          { id: 'o3', text: 'Whoever logged it', isCorrect: false },
          { id: 'o4', text: 'No one until it materializes', isCorrect: false },
        ],
        explanation: 'The process/control owner is accountable for treatment and monitoring.',
      },
      {
        id: 'rsk-q2', category: 'Escalation', difficulty: 'EASY', score: 10,
        text: 'A critical risk must be escalated to the Risk Management department immediately, regardless of the reporting employee\'s department.',
        type: 'TRUE_FALSE',
        options: [
          { id: 'o1', text: 'True', isCorrect: true },
          { id: 'o2', text: 'False', isCorrect: false },
        ],
        explanation: 'Critical risks bypass the normal cadence and escalate immediately.',
      },
    ],
  },
  {
    id: 'course-sop-audit',
    code: 'SOP-101',
    title: 'SOP & Internal Audit Compliance',
    description: 'Required training for the Risk Management department on SOP documentation and internal audit readiness.',
    category: 'SOP',
    courseType: 'MANDATORY',
    status: 'PUBLISHED',
    version: 'v1.0',
    estimatedDuration: '4h',
    createdBy: 'USR-1000',
    publishedAt: '2026-05-20',
    prerequisites: [],
    configuration: {
      assessmentEnabled: true,
      questionBankSize: 25,
      questionsPerAttempt: 15,
      passingScorePercent: 80,
      maxAttempts: 3,
      assessmentTimeLimit: 25,
      randomizeQuestions: true,
      randomizeAnswers: true,
      showCorrectAnswers: 'NEVER',
      certificateEnabled: true,
      completionRule: 'Complete all required modules and pass the final assessment with at least 80%.',
    },
    assignment: {
      assignmentType: 'DEPARTMENT',
      targetDepartmentId: 'dept-rsk',
      targetLabel: 'IA / RSK - Risk Management',
      assignedBy: 'USR-1000',
      assignedAt: '2026-05-20',
      startDate: '2026-05-25',
      dueDate: '2026-08-31',
    },
    modules: [
      {
        id: 'sop-m1',
        title: 'SOP Documentation Standards',
        displayOrder: 1,
        lessons: [
          { id: 'sop-l1', title: 'SOP writing standards', lessonType: 'SCRIPT', isRequired: true, status: 'NOT_STARTED', progressPercent: 0, rule: { requiredReadPercent: 90 } },
        ],
      },
    ],
    // Not assigned to the current viewer's department — demonstrates assignment scoping.
    enrollment: null,
    assessmentAttempts: [],
  },
  {
    id: 'course-leadership',
    code: 'LDR-001',
    title: 'Leadership Essentials for Managers',
    description: 'Core people-management skills for anyone holding the Manager role: coaching, feedback and team monitoring.',
    category: 'Leadership and Management',
    courseType: 'MANDATORY',
    status: 'PUBLISHED',
    version: 'v1.0',
    estimatedDuration: '4h',
    createdBy: 'USR-1000',
    publishedAt: '2026-06-01',
    prerequisites: [],
    configuration: {
      assessmentEnabled: true,
      questionBankSize: 20,
      questionsPerAttempt: 15,
      passingScorePercent: 75,
      maxAttempts: 3,
      assessmentTimeLimit: 25,
      randomizeQuestions: false,
      randomizeAnswers: false,
      showCorrectAnswers: 'IMMEDIATELY',
      certificateEnabled: true,
      completionRule: 'Complete all required modules and pass the final assessment with at least 75%.',
    },
    assignment: {
      assignmentType: 'ROLE',
      targetRole: 'MANAGER',
      targetLabel: 'Role: MANAGER',
      assignedBy: 'USR-1000',
      assignedAt: '2026-06-01',
      startDate: '2026-06-05',
      dueDate: '2026-10-31',
    },
    modules: [
      {
        id: 'ldr-m1',
        title: 'Coaching & Feedback',
        displayOrder: 1,
        lessons: [
          { id: 'ldr-l1', title: 'Giving effective feedback', lessonType: 'VIDEO', isRequired: true, status: 'NOT_STARTED', progressPercent: 0, rule: { requiredWatchPercent: 90 } },
        ],
      },
    ],
    // Only assigned to users with role MANAGER — not shown for USER_LEARN viewers.
    enrollment: {
      status: 'NOT_STARTED', progressPercent: 0,
      startedAt: null, completedAt: null,
      startDate: '2026-06-05', dueDate: '2026-10-31',
      lastLessonTitle: null, lastActivityAt: null,
    },
    assessmentAttempts: [],
  },
  {
    id: 'course-sop-refresher',
    code: 'SOP-102',
    title: 'SOP Compliance Refresher',
    description: 'Individually assigned refresher on updated SOP escalation procedures.',
    category: 'SOP',
    courseType: 'MANDATORY',
    status: 'PUBLISHED',
    version: 'v1.0',
    estimatedDuration: '1h',
    createdBy: 'USR-1000',
    publishedAt: '2026-08-01',
    prerequisites: [],
    configuration: {
      assessmentEnabled: false,
      certificateEnabled: false,
      completionRule: 'Complete the required lesson.',
    },
    assignment: {
      assignmentType: 'USER',
      targetLabel: 'Nguyen Van Manager (EMP-1030)',
      targetUserId: 'USR-1030',
      assignedBy: 'USR-1000',
      assignedAt: '2026-08-01',
      startDate: '2026-08-01',
      dueDate: '2026-08-31',
    },
    modules: [
      {
        id: 'sopr-m1',
        title: 'Escalation Procedure Update',
        displayOrder: 1,
        lessons: [
          { id: 'sopr-l1', title: 'Updated escalation procedure', lessonType: 'DOCUMENT', isRequired: true, status: 'NOT_STARTED', progressPercent: 0, rule: { requiredReadPercent: 90 } },
        ],
      },
    ],
    enrollment: {
      status: 'NOT_STARTED', progressPercent: 0,
      startedAt: null, completedAt: null,
      startDate: '2026-08-01', dueDate: '2026-08-31',
      lastLessonTitle: null, lastActivityAt: null,
    },
    assessmentAttempts: [],
  },
];

// Ensure every course carries a question bank array, even ones authored without one.
courses.forEach((c) => { if (!c.questionBank) c.questionBank = []; });

const SAMPLE_LESSON_TEXT = {
  'ornt-l3': 'Full-time employees are entitled to annual leave, health insurance from day one, and access to the on-site canteen at all MMVN sites. The Workplace Management team (HRD / ADMIN) handles facility requests — submit them through the internal portal. For benefits questions, contact your HRBP.',
  'isa-l3': 'Data at MM Mega Market Vietnam is classified into four tiers: Public, Internal, Confidential and Restricted. Confidential data (customer records, unreleased financials) must never be shared outside the company without Legal sign-off. Restricted data (payment credentials, national ID numbers) requires encryption at rest and in transit at all times.',
};

// Every VIDEO/DOCUMENT/SCRIPT lesson references content by URL (a link to hosted
// media) plus an optional locally-uploaded file preview that only lives for the
// current browser session — this mockup has no media server to persist uploads to.
// IMAGE lessons hold a list of such files; TEXT lessons hold admin-authored copy.
courses.forEach((c) => {
  c.modules.forEach((m) => {
    m.lessons.forEach((l) => {
      if (l.content) return;
      if (l.lessonType === 'IMAGE') l.content = { files: [] };
      else if (l.lessonType === 'TEXT') l.content = { text: SAMPLE_LESSON_TEXT[l.id] || '' };
      else if (l.lessonType === 'ASSESSMENT') l.content = {};
      else l.content = { url: '', fileName: null, fileType: null };
    });
  });
});

// Returns true when `course` is in `user`'s assignment scope per BR-009/BR-010:
// OPTIONAL courses are open to everyone; MANDATORY courses only to the target scope.
// Reads the assignment's actual configured target id, never a hardcoded scope, so
// this stays correct for courses Admin creates or re-targets after launch.
export function isCourseAssignedToUser(course, user) {
  if (course.courseType === 'OPTIONAL') return true;
  const a = course.assignment;
  if (!a) return false;
  switch (a.assignmentType) {
    case 'BUSINESS_UNIT': return user.businessUnitId === a.targetBusinessUnitId;
    case 'DIVISION': return user.divisionId === a.targetDivisionId;
    case 'DEPARTMENT': return user.departmentId === a.targetDepartmentId;
    case 'ROLE': return user.role === a.targetRole;
    case 'USER': return user.userId === a.targetUserId;
    default: return false;
  }
}

// "My Learning" list for a given user: Optional courses (catalog) + Mandatory
// courses within that user's assignment scope, per FR-COURSE / section 27.
// Takes the live course list (from the course store) rather than reading the
// static export directly, so it reflects Admin's in-session edits.
export function myLearningCourses(courseList, user) {
  return courseList.filter((c) => isCourseAssignedToUser(c, user) && c.enrollment);
}

// A course can only be deleted while nobody has engaged with it yet: not the
// tracked persona's own enrollment, and not any of the Manager's team members
// (a separate roster, since the single `enrollment` field only tracks one
// persona). Once anyone has started it, Admin can archive it but not delete it.
export function courseHasParticipants(course) {
  const ownEnrollmentStarted = Boolean(
    course.enrollment && (course.enrollment.status !== 'NOT_STARTED' || course.enrollment.progressPercent > 0)
  );
  const teamMemberStarted = teamMembers.some((m) => m.course === course.title && (m.progress > 0 || m.status !== 'NOT_STARTED'));
  return ownEnrollmentStarted || teamMemberStarted;
}

// Human-readable "Division / Department" path for a user, per FR-ORG-001 — shown
// in the UI so every Manager/User Learn can see their own org placement at a glance.
export function orgPathLabel(user) {
  const division = divisions.find((d) => d.id === user.divisionId);
  const department = departments.find((d) => d.id === user.departmentId);
  return [division?.code, department?.code].filter(Boolean).join(' / ') || '—';
}

let nextCourseSeq = 1;

// Blank COURSE + COURSE_CONFIGURATION template for the "New course" flow (FR-COURSE-001).
export function createBlankCourse() {
  const seq = nextCourseSeq++;
  return {
    id: `course-draft-${Date.now()}-${seq}`,
    code: '',
    title: 'Untitled course',
    description: '',
    category: '',
    courseType: 'OPTIONAL',
    status: 'DRAFT',
    version: 'v1.0',
    estimatedDuration: '',
    createdBy: adminUser.userId,
    publishedAt: null,
    prerequisites: [],
    configuration: {
      assessmentEnabled: false,
      questionBankSize: 0,
      questionsPerAttempt: 0,
      passingScorePercent: 80,
      maxAttempts: 3,
      assessmentTimeLimit: 30,
      randomizeQuestions: true,
      randomizeAnswers: true,
      showCorrectAnswers: 'AFTER_FINAL_ATTEMPT',
      certificateEnabled: false,
      completionRule: 'Complete all required lessons.',
    },
    assignment: null,
    modules: [],
    enrollment: null,
    assessmentAttempts: [],
    questionBank: [],
  };
}

// ---------------------------------------------------------------------------
// Learning player helpers: lesson completion, randomized assessment draw &
// scoring, course-completion recomputation, and derived certificates.
// ---------------------------------------------------------------------------

function cloneCourse(course) {
  return typeof structuredClone === 'function' ? structuredClone(course) : JSON.parse(JSON.stringify(course));
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// FR-ASSESS-003/007/008: draw `count` distinct random questions out of the full
// bank (the "50 of 1000" behavior), independent of the randomize toggles — those
// toggles only control presentation order, never whether the draw is a subset.
export function drawAssessmentQuestions(course) {
  const cfg = course.configuration;
  const pool = shuffle(course.questionBank).slice(0, Math.min(cfg.questionsPerAttempt, course.questionBank.length));
  const ordered = cfg.randomizeQuestions ? pool : [...pool].sort((a, b) => a.id.localeCompare(b.id));
  return ordered.map((q) => ({
    ...q,
    options: cfg.randomizeAnswers ? shuffle(q.options) : q.options,
  }));
}

function requiredLessons(course) {
  return course.modules.flatMap((m) => m.lessons.filter((l) => l.isRequired && l.lessonType !== 'ASSESSMENT'));
}

// Recomputes enrollment.status/progressPercent from lesson + assessment state —
// the single source of truth so a lesson or attempt update can never leave the
// enrollment record inconsistent (BR-018: COMPLETED only once every required
// condition is met).
function recomputeEnrollment(course) {
  const req = requiredLessons(course);
  const completedReq = req.filter((l) => l.status === 'COMPLETED').length;
  const lessonsDone = req.length === 0 || completedReq === req.length;
  const progressPercent = req.length ? Math.round((completedReq / req.length) * 100) : 100;
  const attempts = course.assessmentAttempts || [];
  const lastAttempt = attempts[attempts.length - 1];
  const passed = lastAttempt ? lastAttempt.score >= course.configuration.passingScorePercent : false;

  let status;
  if (!lessonsDone) {
    status = progressPercent > 0 ? 'IN_PROGRESS' : course.enrollment.status;
  } else if (!course.configuration.assessmentEnabled) {
    status = 'COMPLETED';
  } else if (passed) {
    status = 'COMPLETED';
  } else if (attempts.length >= course.configuration.maxAttempts) {
    status = 'FAILED';
  } else {
    status = 'IN_PROGRESS';
  }

  course.enrollment.status = status;
  // Lessons are worth 70% of overall progress and the assessment the remaining
  // 30% when one is configured, so progress never reads 100% on unpassed courses.
  course.enrollment.progressPercent = course.configuration.assessmentEnabled
    ? Math.round(progressPercent * 0.7 + (passed ? 30 : 0))
    : progressPercent;
  if (status === 'COMPLETED' && !course.enrollment.completedAt) {
    course.enrollment.completedAt = new Date().toISOString().slice(0, 10);
    course.enrollment.progressPercent = 100;
  }
  if (course.enrollment.status !== 'NOT_STARTED' && !course.enrollment.startedAt) {
    course.enrollment.startedAt = new Date().toISOString().slice(0, 10);
  }
  return course;
}

// Marks one lesson's progress and returns a new, immutable course object with
// enrollment recomputed — pass the result straight to CourseStore.updateCourse.
export function applyLessonProgress(course, lessonId, fields) {
  const next = cloneCourse(course);
  for (const m of next.modules) {
    const lesson = m.lessons.find((l) => l.id === lessonId);
    if (lesson) {
      Object.assign(lesson, fields);
      next.enrollment.lastLessonTitle = lesson.title;
      next.enrollment.lastActivityAt = new Date().toISOString().slice(0, 10);
      break;
    }
  }
  return recomputeEnrollment(next);
}

// Records one ASSESSMENT_ATTEMPT and returns a new course with enrollment
// recomputed (pass/fail/exhausted-attempts) per BR-019/BR-020.
export function applyAssessmentAttempt(course, { score, passed, answered }) {
  const next = cloneCourse(course);
  next.assessmentAttempts = [
    ...next.assessmentAttempts,
    { n: next.assessmentAttempts.length + 1, score, passed, answered, submittedAt: new Date().toISOString() },
  ];
  next.enrollment.lastActivityAt = new Date().toISOString().slice(0, 10);
  return recomputeEnrollment(next);
}

// Certificates are derived, never stored separately: a course only "has" one for
// a user once that user's own enrollment reads COMPLETED with certificates
// enabled, so a certificate can never exist without an actual completed course.
export function deriveCertificates(courseList, user) {
  return myLearningCourses(courseList, user)
    .filter((c) => c.enrollment.status === 'COMPLETED' && c.configuration.certificateEnabled)
    .map((c) => {
      const attempts = c.assessmentAttempts || [];
      const passingAttempt = [...attempts].reverse().find((a) => a.passed);
      return {
        id: `CERT-${c.id}`,
        courseName: c.title,
        courseVersion: c.version,
        completionDate: c.enrollment.completedAt,
        issueDate: c.enrollment.completedAt,
        score: passingAttempt ? passingAttempt.score : null,
      };
    });
}

// ---------------------------------------------------------------------------
// Notifications (section 21)
// ---------------------------------------------------------------------------

export const notifications = {
  learnerInbox: [
    { id: 1, type: 'COURSE_ASSIGNED', title: 'New mandatory course assigned', message: 'Risk Management Awareness has been assigned to your Division, due Sep 15.', time: '2h ago', unread: true },
    { id: 2, type: 'DEADLINE_REMINDER', title: 'Due in 12 days', message: 'Information Security Awareness is due Sep 30.', time: '1d ago', unread: true },
    { id: 3, type: 'COURSE_UNFINISHED', title: 'Continue learning', message: 'You have not continued Corporate Orientation in 6 days.', time: '5d ago', unread: false },
  ],
  managerAlerts: [
    { id: 1, type: 'EMPLOYEE_OVERDUE', employee: 'Lisa Wang', message: 'Risk Management Awareness is overdue.', time: '3h ago' },
    { id: 2, type: 'EMPLOYEE_INACTIVE', employee: 'John Doe', message: 'No learning activity in 15 days.', time: '1d ago' },
    { id: 3, type: 'ASSESSMENT_FAILED', employee: 'Mike Chen', message: 'Failed Information Security Awareness after 3 attempts.', time: '2d ago' },
  ],
};

// ---------------------------------------------------------------------------
// Admin configuration (global rules — section 24, BR-022/BR-023)
// ---------------------------------------------------------------------------

export const adminConfig = {
  inactiveThresholdDays: 3,
  reminderFrequencyDays: [3, 6, 9],
  maxReminderCount: 3,
  managerAlertAfterDays: 7,
  defaultVideoWatchPercent: 90,
  defaultDocumentReadPercent: 90,
  defaultPassingScorePercent: 80,
};

// ---------------------------------------------------------------------------
// Admin dashboard aggregates (FR-DASH-ADM-001..004)
// ---------------------------------------------------------------------------

export const orgReport = {
  totalEmployees: 247,
  totalManagers: 34,
  totalUserLearn: 213,
  totalActiveCourses: courses.filter((c) => c.status === 'PUBLISHED').length,
  totalMandatoryCourses: courses.filter((c) => c.courseType === 'MANDATORY').length,
  totalOptionalCourses: courses.filter((c) => c.courseType === 'OPTIONAL').length,
  totalCompleted: 168,
  totalInProgress: 54,
  totalNotStarted: 20,
  totalOverdue: 12,
  coursePerformance: [
    { course: 'Information Security Awareness', assigned: 247, started: 190, inProgress: 96, completed: 88, overdue: 6, completionRate: 36, avgScore: 79, avgAttempts: 1.4 },
    { course: 'Risk Management Awareness', assigned: 118, started: 60, inProgress: 22, completed: 34, overdue: 4, completionRate: 29, avgScore: 81, avgAttempts: 1.1 },
    { course: 'Corporate Orientation', assigned: 247, started: 140, inProgress: 40, completed: 96, overdue: 0, completionRate: 39, avgScore: null, avgAttempts: null },
    { course: 'Leadership Essentials for Managers', assigned: 34, started: 20, inProgress: 8, completed: 10, overdue: 2, completionRate: 29, avgScore: 74, avgAttempts: 1.6 },
  ],
  managerPerformance: [
    { manager: 'Nguyen Van Manager', businessUnit: 'MMVN', division: 'OMD', department: 'PPF', assigned: 6, completed: 2, inProgress: 3, overdue: 1, avgScore: 79, completionRate: 33 },
    { manager: 'Tran Thi Huong', businessUnit: 'MMVN', division: 'IA', department: 'RSK', assigned: 5, completed: 3, inProgress: 1, overdue: 1, avgScore: 85, completionRate: 60 },
  ],
  departmentPerformance: [
    { dept: 'PPF - Processed Fresh Food', completion: 85 },
    { dept: 'RSK - Risk Management', completion: 91 },
    { dept: 'L&OD - Learning & Organizational Development', completion: 96 },
    { dept: 'DF - Dry Food', completion: 58 },
  ],
  monthlyCompletions: [
    { month: 'Mar', value: 18 },
    { month: 'Apr', value: 24 },
    { month: 'May', value: 31 },
    { month: 'Jun', value: 27 },
    { month: 'Jul', value: 39 },
    { month: 'Aug', value: 29 },
  ],
};
