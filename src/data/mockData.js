// Mock data shaped after official MM Mega Market Vietnam (MMVN) Organizational Matrix:
// BUSINESS_UNIT (1) > DIVISION (16) > DEPARTMENT (56) > JOB_LEVELS (1-7, CL, IN) > USER,
// COURSE > COURSE_MODULE > COURSE_LESSON, COURSE_ASSIGNMENT,
// LEARNING_ENROLLMENT > LESSON_PROGRESS, ASSESSMENT_ATTEMPT.

export { businessUnits, divisions, departments, jobLevels } from './orgHierarchy';

import {
  generated100Users,
  generated100Courses,
  generated100EnrollmentMatrix,
} from './generated100Data';


// ---------------------------------------------------------------------------
// 100 Enterprise Demo Personas & Authenticated Accounts Matrix
// ---------------------------------------------------------------------------

export const demoUsers = generated100Users;

// Default user export references for backward compatibility
export const adminUser = demoUsers[0];
export const managerUser = demoUsers[1];
export const currentUser = demoUsers[3];

export function allUsers() {
  return demoUsers;
}

// Direct reports of Line Manager (Fresh Food & Operations) with authentic diverse cases
export const teamMembers = [
  {
    employeeId: 'MMVN-1042',
    name: 'Minh Tran',
    position: 'Bakery Section Specialist',
    divisionId: 'div-omd', divisionCode: 'OMD',
    departmentId: 'dept-ppf', departmentCode: 'PPF',
    level: '6',
    course: 'Food Safety & Hygiene Standards (HACCP)',
    courseType: 'MANDATORY',
    progress: 100,
    status: 'COMPLETED',
    score: 94,
    attempts: 1,
    dueDate: '2026-08-30',
    lastActivity: '2026-08-20',
    inactiveDays: 1,
    overdue: false,
  },
  {
    employeeId: 'MMVN-1078',
    name: 'Sarah Johnson',
    position: 'Pastry Chef Associate',
    divisionId: 'div-omd', divisionCode: 'OMD',
    departmentId: 'dept-ppf', departmentCode: 'PPF',
    level: '6',
    course: 'Bakery & Confectionery Sanitation Protocols',
    courseType: 'MANDATORY',
    progress: 65,
    status: 'IN_PROGRESS',
    score: null,
    attempts: 0,
    dueDate: '2026-09-30',
    lastActivity: '2026-08-19',
    inactiveDays: 2,
    overdue: false,
  },
  {
    employeeId: 'MMVN-1111',
    name: 'Lisa Wang',
    position: 'Fresh Food Counter Associate',
    divisionId: 'div-omd', divisionCode: 'OMD',
    departmentId: 'dept-ppf', departmentCode: 'PPF',
    level: '6',
    course: 'Fresh Meat & Poultry Cold Storage Procedures',
    courseType: 'MANDATORY',
    progress: 25,
    status: 'OVERDUE',
    score: null,
    attempts: 0,
    dueDate: '2026-08-10', // 12 days past due!
    lastActivity: '2026-08-05',
    inactiveDays: 16,
    overdue: true,
    actionRequired: 'URGENT_OVERDUE',
    reason: 'Past compliance due date by 12 days without recent activity.',
  },
  {
    employeeId: 'MMVN-1099',
    name: 'Mike Chen',
    position: 'Line Cook Specialist',
    divisionId: 'div-omd', divisionCode: 'OMD',
    departmentId: 'dept-ppf', departmentCode: 'PPF',
    level: '6',
    course: 'Information Security Awareness & Phishing Defense',
    courseType: 'MANDATORY',
    progress: 100,
    status: 'FAILED',
    score: 55,
    attempts: 3, // Exhausted max attempts!
    dueDate: '2026-08-25',
    lastActivity: '2026-08-17',
    inactiveDays: 5,
    overdue: false,
    actionRequired: 'FAILED_EXAM',
    reason: 'Failed 3 assessment attempts (Score 55% vs passing 80%). Requires manager review & retake unlock.',
  },
  {
    employeeId: 'MMVN-1103',
    name: 'John Doe',
    position: 'Bakery Associate',
    divisionId: 'div-omd', divisionCode: 'OMD',
    departmentId: 'dept-ppf', departmentCode: 'PPF',
    level: '7',
    course: 'Corporate Orientation & MMVN Cultural Values',
    courseType: 'OPTIONAL',
    progress: 20,
    status: 'IN_PROGRESS',
    score: null,
    attempts: 0,
    dueDate: '2026-09-15',
    lastActivity: '2026-08-02',
    inactiveDays: 19, // Inactive > 3 days!
    overdue: false,
    actionRequired: 'LONG_INACTIVE',
    reason: 'Inactive for 19 days without completing Module 2.',
  },
  {
    employeeId: 'MMVN-1120',
    name: 'Carlos Reyes',
    position: 'Dough Prep Associate',
    divisionId: 'div-omd', divisionCode: 'OMD',
    departmentId: 'dept-ppf', departmentCode: 'PPF',
    level: 'CL',
    course: 'On-site Fire Safety & Emergency Evacuation (PCCC)',
    courseType: 'MANDATORY',
    progress: 100,
    status: 'COMPLETED',
    score: 88,
    attempts: 1,
    dueDate: '2026-08-15',
    lastActivity: '2026-08-14',
    inactiveDays: 7,
    overdue: false,
  },
  {
    employeeId: 'MMVN-1135',
    name: 'Huong Pham',
    position: 'Deli Counter Associate',
    divisionId: 'div-omd', divisionCode: 'OMD',
    departmentId: 'dept-ppf', departmentCode: 'PPF',
    level: '6',
    course: 'Ready-to-Eat Food Prep & Glove Hand Hygiene',
    courseType: 'MANDATORY',
    progress: 45,
    status: 'IN_PROGRESS',
    score: null,
    attempts: 0,
    dueDate: '2026-09-10',
    lastActivity: '2026-08-21',
    inactiveDays: 1,
    overdue: false,
  },
  {
    employeeId: 'MMVN-1142',
    name: 'Quoc Bao',
    position: 'Store Floor Assistant',
    divisionId: 'div-opt', divisionCode: 'OPT',
    departmentId: 'dept-opt', departmentCode: 'OPT',
    level: 'CL',
    course: 'Store Floor Merchandising & Shelf Restocking SOP',
    courseType: 'OPTIONAL',
    progress: 0,
    status: 'NOT_STARTED',
    score: null,
    attempts: 0,
    dueDate: '2026-09-30',
    lastActivity: null,
    inactiveDays: 0,
    overdue: false,
  },
];

// Returns the authenticated manager's direct reports and department team
export function getTeamMembersForManager(manager) {
  if (!manager) return teamMembers;

  // If the manager is David Tran (OMD/PPF), return the canonical Fresh Food team
  if (manager.userId === 'USR-0245' || (manager.divisionCode === 'OMD' && manager.departmentCode === 'PPF')) {
    return teamMembers;
  }

  // Filter 100 enterprise users by matching department or division
  let pool = generated100Users.filter((u) => u.userId !== manager.userId && (u.managerId === manager.userId || u.departmentCode === manager.departmentCode));
  if (pool.length < 5) {
    const divPool = generated100Users.filter((u) => u.userId !== manager.userId && u.divisionCode === manager.divisionCode && !pool.some((p) => p.userId === u.userId));
    pool = [...pool, ...divPool];
  }
  if (pool.length === 0) {
    pool = generated100Users.filter((u) => u.userId !== manager.userId && u.role === 'learner').slice(0, 8);
  } else {
    pool = pool.slice(0, 8);
  }

  return pool.map((u, idx) => {
    const assignedCourses = generated100Courses.filter((c) => isCourseAssignedToUser(c, u));
    const course = assignedCourses[idx % assignedCourses.length] || generated100Courses[idx % 10] || generated100Courses[0];

    const status = (idx === 0) ? 'COMPLETED' : (idx === 1) ? 'IN_PROGRESS' : (idx === 2) ? 'OVERDUE' : (idx === 3) ? 'FAILED' : (idx === 4) ? 'IN_PROGRESS' : (idx === 5) ? 'COMPLETED' : 'NOT_STARTED';
    const progress = (status === 'COMPLETED') ? 100 : (status === 'FAILED') ? 100 : (status === 'OVERDUE') ? 25 : (status === 'IN_PROGRESS') ? (idx === 1 ? 65 : 20) : 0;
    const score = (status === 'COMPLETED') ? (88 + (idx % 8)) : (status === 'FAILED') ? 55 : null;
    const attempts = (status === 'COMPLETED') ? 1 : (status === 'FAILED') ? 3 : 0;
    const dueDate = (status === 'OVERDUE') ? '2026-08-10' : '2026-09-30';
    const lastActivity = (status === 'OVERDUE') ? '2026-08-05' : (status === 'NOT_STARTED') ? null : '2026-08-19';
    const inactiveDays = (status === 'OVERDUE') ? 16 : (idx === 4) ? 19 : 2;
    const overdue = (status === 'OVERDUE');

    let actionRequired = null;
    let reason = null;
    if (status === 'OVERDUE') {
      actionRequired = 'URGENT_OVERDUE';
      reason = 'Past compliance due date by 12 days without recent activity.';
    } else if (status === 'FAILED') {
      actionRequired = 'FAILED_EXAM';
      reason = 'Failed 3 assessment attempts (Score 55% vs passing 80%). Requires manager review & retake unlock.';
    } else if (inactiveDays >= 3) {
      actionRequired = 'LONG_INACTIVE';
      reason = `Inactive for ${inactiveDays} days without completing lesson modules.`;
    }

    return {
      employeeId: u.employeeCode,
      name: u.fullName,
      position: u.position,
      divisionId: u.divisionId,
      divisionCode: u.divisionCode,
      departmentId: u.departmentId,
      departmentCode: u.departmentCode,
      level: u.level,
      course: course.title,
      courseType: course.courseType,
      progress,
      status,
      score,
      attempts,
      dueDate,
      lastActivity,
      inactiveDays,
      overdue,
      actionRequired,
      reason,
    };
  });
}



// ---------------------------------------------------------------------------
// 100 Enterprise Courses Curriculum across 12 Business Domains
// ---------------------------------------------------------------------------

export const courses = generated100Courses;

// ---------------------------------------------------------------------------
// Multi-Persona Synchronized User Enrollments Matrix
// Guarantees all 100 roles have fully coherent, unified data (Completed, In Progress, Not Started, Overdue, Failed)
// ---------------------------------------------------------------------------

export const userEnrollmentsMap = generated100EnrollmentMatrix;



// Returns true when `course` is in `user`'s assignment scope
export function isCourseAssignedToUser(course, user) {
  if (!user) return true;
  if (course.courseType === 'OPTIONAL') return true;
  const a = course.assignment;
  if (!a) return true;
  switch (a.assignmentType) {
    case 'BUSINESS_UNIT': return user.businessUnitId === a.targetBusinessUnitId || user.businessUnitCode === a.targetBusinessUnitCode;
    case 'DIVISION': return user.divisionId === a.targetDivisionId || user.divisionCode === a.targetDivisionCode;
    case 'DEPARTMENT': return user.departmentId === a.targetDepartmentId || user.departmentCode === a.targetDepartmentCode;
    case 'LEVEL': return user.level === a.targetLevel;
    case 'ROLE': return user.role === a.targetRole || (a.targetRole === 'MANAGER' && (user.role === 'manager' || user.role === 'admin')) || (a.targetRole === 'USER_LEARN' && user.role === 'learner');
    case 'USER': return user.userId === a.targetUserId || user.employeeCode === a.targetEmployeeCode;
    default: return true;
  }
}

// "My Learning" list for a given user: dynamically merges user-specific enrollments
export function myLearningCourses(courseList, user) {
  if (!user) return [];
  const enrollments = userEnrollmentsMap[user.userId] || userEnrollmentsMap['USR-1042'] || {};
  return courseList
    .filter((c) => isCourseAssignedToUser(c, user))
    .map((c) => {
      const userEnrollment = enrollments[c.id];
      if (userEnrollment) {
        return {
          ...c,
          enrollment: {
            ...(c.enrollment || {}),
            ...userEnrollment,
          },
        };
      }
      return c.enrollment ? c : null;
    })
    .filter(Boolean);
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

export function orgPathLabel(user) {
  if (!user) return '—';
  const divCode = user.divisionCode || divisions.find((d) => d.id === user.divisionId)?.code || '';
  const deptCode = user.departmentCode || departments.find((d) => d.id === user.departmentId)?.code || '';
  const path = [divCode, deptCode].filter(Boolean).join(' / ');
  return user.level ? `${path} · Lvl ${user.level}` : path || '—';
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

export function deriveCertificates(courseList, user) {
  if (!user) return [];
  const list = myLearningCourses(courseList, user);
  const derived = list
    .filter((c) => c.enrollment?.status === 'COMPLETED' && c.configuration?.certificateEnabled)
    .map((c) => {
      const attempts = c.assessmentAttempts || [];
      const passingAttempt = [...attempts].reverse().find((a) => a.passed);
      const issueDate = c.enrollment.completedAt || '2026-07-15';
      const validUntil = new Date(new Date(issueDate).setFullYear(new Date(issueDate).getFullYear() + 1)).toISOString().slice(0, 10);
      const cleanEmpCode = (user.employeeCode || 'EMP-1042').replace('MMVN-', '');
      return {
        id: `CERT-MMVN-${(c.code || c.id).toUpperCase()}-${cleanEmpCode}`,
        courseId: c.id,
        courseName: c.title,
        courseCode: c.code,
        courseVersion: c.version,
        completionDate: issueDate,
        issueDate: issueDate,
        validUntil: validUntil,
        isCompliance: c.courseType === 'MANDATORY',
        score: c.enrollment.score || (passingAttempt ? passingAttempt.score : 90),
        issuer: 'MM Mega Market Vietnam - Learning & Organizational Development',
        verificationUrl: `https://megalearn.mmvietnam.com/verify/CERT-MMVN-${c.code || 'LMS'}-${cleanEmpCode}`,
        recipientName: user.fullName,
        recipientPosition: user.position,
        department: orgPathLabel(user),
      };
    });

  return derived;
}



// ---------------------------------------------------------------------------
// Permanent Learning History & Immutable Assessment Audit Logs
// ---------------------------------------------------------------------------

export const userHistoryLogs = {
  // Thanh Pham (SCM Specialist - USR-1250)
  'USR-1250': [
    {
      id: 'LOG-SCM-101',
      title: 'Cold Chain & Warehouse Perishables Quality Control',
      moduleTitle: 'Final Certification Assessment',
      type: 'ASSESSMENT',
      attempt: 1,
      score: 95,
      passingScore: 80,
      passed: true,
      timestamp: '2026-07-20 14:15:30',
      timeSpent: '22 mins',
      auditCode: 'MMVN-AUD-COLD-9501',
      details: 'Scored 19/20 questions correctly. Watermark verification passed.',
    },
    {
      id: 'LOG-SCM-102',
      title: 'Risk Management Awareness in Logistics',
      moduleTitle: 'Final Risk Evaluation Test',
      type: 'ASSESSMENT',
      attempt: 1,
      score: 88,
      passingScore: 75,
      passed: true,
      timestamp: '2026-07-25 10:20:10',
      timeSpent: '16 mins',
      auditCode: 'MMVN-AUD-RSK-8822',
      details: 'Scored 14/15 questions correctly.',
    },
    {
      id: 'LOG-SCM-103',
      title: 'Corporate Orientation',
      moduleTitle: 'Company Culture & Code of Conduct Quiz',
      type: 'ASSESSMENT',
      attempt: 1,
      score: 94,
      passingScore: 80,
      passed: true,
      timestamp: '2026-06-05 09:40:00',
      timeSpent: '14 mins',
      auditCode: 'MMVN-AUD-ORNT-9403',
      details: 'All required policy comprehension checks confirmed.',
    },
    {
      id: 'LOG-SCM-104',
      title: 'Cold Chain & Warehouse Perishables Quality Control',
      moduleTitle: 'Cold Chain Temperature Monitoring SOP',
      type: 'LESSON',
      attempt: null,
      score: 100,
      passingScore: null,
      passed: true,
      timestamp: '2026-07-18 16:30:00',
      timeSpent: '18 mins',
      auditCode: 'MMVN-AUD-LES-7712',
      details: 'Completed 100% video stream playback (no fast-forward).',
    },
    {
      id: 'LOG-SCM-105',
      title: 'Information Security Awareness',
      moduleTitle: 'Phishing & Social Engineering Vectors',
      type: 'LESSON',
      attempt: null,
      score: 60,
      passingScore: null,
      passed: false,
      timestamp: '2026-08-17 11:15:00',
      timeSpent: '12 mins',
      auditCode: 'MMVN-AUD-LES-5541',
      details: 'Lesson in-progress: 60% completed.',
    },
    {
      id: 'LOG-SCM-106',
      title: 'Store Operations & Logistics Receiving Lab',
      moduleTitle: 'Interactive Practical Workshop (Store #04)',
      type: 'CLASSROOM_CHECKIN',
      attempt: null,
      score: null,
      passingScore: null,
      passed: true,
      timestamp: '2026-07-28 08:30:00',
      timeSpent: '4 hours',
      auditCode: 'MMVN-ILT-QR-STORE04',
      details: 'Verified on-site check-in via QR badge scan. Instructor: Master Trainer.',
    },
  ],

  // Minh Tran (Bakery Specialist - USR-1042)
  'USR-1042': [
    {
      id: 'LOG-BAK-201',
      title: 'Food Safety & Hygiene Standards (HACCP)',
      moduleTitle: 'HACCP Compliance & Hygiene Assessment',
      type: 'ASSESSMENT',
      attempt: 1,
      score: 92,
      passingScore: 80,
      passed: true,
      timestamp: '2026-07-15 15:40:22',
      timeSpent: '24 mins',
      auditCode: 'MMVN-AUD-FSH-9210',
      details: 'Passed on first attempt. Certificate CERT-MMVN-FSH-1042 issued.',
    },
    {
      id: 'LOG-BAK-202',
      title: 'Corporate Orientation',
      moduleTitle: 'Company Orientation Final Quiz',
      type: 'ASSESSMENT',
      attempt: 1,
      score: 90,
      passingScore: 80,
      passed: true,
      timestamp: '2026-06-10 11:25:00',
      timeSpent: '15 mins',
      auditCode: 'MMVN-AUD-ORNT-9011',
      details: 'Completed all required compliance modules.',
    },
    {
      id: 'LOG-BAK-203',
      title: 'Information Security Awareness',
      moduleTitle: 'Why Information Security Matters',
      type: 'LESSON',
      attempt: null,
      score: 100,
      passingScore: null,
      passed: true,
      timestamp: '2026-08-10 14:20:15',
      timeSpent: '15 mins',
      auditCode: 'MMVN-AUD-LES-1042-1',
      details: 'Completed video playback with 100% attendance.',
    },
    {
      id: 'LOG-BAK-204',
      title: 'Information Security Awareness',
      moduleTitle: 'Information Security Policy.pdf',
      type: 'LESSON',
      attempt: null,
      score: 100,
      passingScore: null,
      passed: true,
      timestamp: '2026-08-12 09:15:00',
      timeSpent: '20 mins',
      auditCode: 'MMVN-AUD-LES-1042-2',
      details: 'Document read time criteria satisfied.',
    },
    {
      id: 'LOG-BAK-205',
      title: 'Store Bakery Hygiene & HACCP Lab',
      moduleTitle: 'On-site Practical Lab Assessment (An Phu Store)',
      type: 'CLASSROOM_CHECKIN',
      attempt: null,
      score: null,
      passingScore: null,
      passed: true,
      timestamp: '2026-08-05 08:15:00',
      timeSpent: '3.5 hours',
      auditCode: 'MMVN-ILT-QR-ANPHU-01',
      details: 'Verified on-site check-in via Store QR terminal.',
    },
  ],

  // David Tran (Line Manager - USR-0245)
  'USR-0245': [
    {
      id: 'LOG-MGR-301',
      title: 'Leadership Essentials for Managers',
      moduleTitle: 'People Management & Coaching Competency Assessment',
      type: 'ASSESSMENT',
      attempt: 1,
      score: 96,
      passingScore: 75,
      passed: true,
      timestamp: '2026-05-15 16:00:00',
      timeSpent: '20 mins',
      auditCode: 'MMVN-AUD-LDR-9601',
      details: 'Executive score achieved. Certified Line Manager.',
    },
    {
      id: 'LOG-MGR-302',
      title: 'Information Security Awareness',
      moduleTitle: 'Managerial Data Protection Final Assessment',
      type: 'ASSESSMENT',
      attempt: 1,
      score: 90,
      passingScore: 80,
      passed: true,
      timestamp: '2026-07-02 10:30:00',
      timeSpent: '18 mins',
      auditCode: 'MMVN-AUD-ISA-9002',
      details: 'Passed with zero violations.',
    },
    {
      id: 'LOG-MGR-303',
      title: 'Risk Management Awareness',
      moduleTitle: 'Department Risk Framework Evaluation',
      type: 'ASSESSMENT',
      attempt: 1,
      score: 92,
      passingScore: 75,
      passed: true,
      timestamp: '2026-07-10 14:45:00',
      timeSpent: '15 mins',
      auditCode: 'MMVN-AUD-RSK-9203',
      details: 'Completed required compliance review.',
    },
  ],

  // Sarah Nguyen (Admin & HR Director - USR-0001)
  'USR-0001': [
    {
      id: 'LOG-ADM-401',
      title: 'Executive Leadership & Corporate Governance',
      moduleTitle: 'BOM Governance Strategy Assessment',
      type: 'ASSESSMENT',
      attempt: 1,
      score: 98,
      passingScore: 80,
      passed: true,
      timestamp: '2026-04-10 09:15:00',
      timeSpent: '25 mins',
      auditCode: 'MMVN-AUD-EXEC-9801',
      details: 'Supreme score recorded.',
    },
    {
      id: 'LOG-ADM-402',
      title: 'Enterprise Risk Management & SOP Governance',
      moduleTitle: 'Company-Wide Risk Audit Evaluation',
      type: 'ASSESSMENT',
      attempt: 1,
      score: 96,
      passingScore: 75,
      passed: true,
      timestamp: '2026-07-01 14:20:00',
      timeSpent: '20 mins',
      auditCode: 'MMVN-AUD-ERM-9602',
      details: 'All enterprise audit controls verified.',
    },
  ],

  // Quoc Bao (Casual Labor - USR-2041)
  'USR-2041': [
    {
      id: 'LOG-CL-501',
      title: 'Corporate Orientation',
      moduleTitle: 'Store Operations Safety & Onboarding Check',
      type: 'ASSESSMENT',
      attempt: 1,
      score: 85,
      passingScore: 80,
      passed: true,
      timestamp: '2026-08-01 10:00:00',
      timeSpent: '15 mins',
      auditCode: 'MMVN-AUD-CL-8501',
      details: 'Onboarding completed and approved for floor rotation.',
    },
  ],
};

export function getUserLearningHistory(user) {
  const userId = user?.userId || 'USR-1042';
  return userHistoryLogs[userId] || userHistoryLogs['USR-1042'] || [];
}


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
// Admin dashboard aggregates & Executive Governance Metrics
// ---------------------------------------------------------------------------

export const orgReport = {
  totalEmployees: 2145,
  totalManagers: 186,
  totalUserLearn: 1959,
  totalActiveCourses: courses.filter((c) => c.status === 'PUBLISHED').length,
  totalMandatoryCourses: courses.filter((c) => c.courseType === 'MANDATORY').length,
  totalOptionalCourses: courses.filter((c) => c.courseType === 'OPTIONAL').length,
  totalCompleted: 1605,
  totalInProgress: 385,
  totalNotStarted: 95,
  totalOverdue: 60,
  overallCompletionRate: 74.8,
  avgPassingScore: 88.4,
  firstTimePassRate: 91.2,
  
  coursePerformance: [
    { course: 'Information Security Awareness', code: 'ISA-001', assigned: 2145, started: 2050, inProgress: 310, completed: 1780, overdue: 55, completionRate: 83, avgScore: 86.4, avgAttempts: 1.3, frictionNote: 'Module 2 Phishing recognition has highest re-attempt rate' },
    { course: 'Food Safety & Hygiene Standards (HACCP)', code: 'FSH-101', assigned: 890, started: 870, inProgress: 105, completed: 765, overdue: 20, completionRate: 86, avgScore: 91.2, avgAttempts: 1.1, frictionNote: 'High engagement across Bakery & Fresh Meat sections' },
    { course: 'Risk Management Awareness', code: 'RSK-001', assigned: 1450, started: 1200, inProgress: 220, completed: 980, overdue: 50, completionRate: 68, avgScore: 78.5, avgAttempts: 1.5, frictionNote: 'Quiz question #2 on Risk Ownership requires explanation tweak' },
    { course: 'Leadership Essentials for Managers', code: 'LDR-001', assigned: 320, started: 310, inProgress: 15, completed: 295, overdue: 10, completionRate: 92, avgScore: 89.0, avgAttempts: 1.2, frictionNote: 'Highest CSAT rating (4.9/5) among Department Managers' },
    { course: 'Corporate Orientation', code: 'ORNT-001', assigned: 450, started: 440, inProgress: 50, completed: 390, overdue: 10, completionRate: 87, avgScore: 90.0, avgAttempts: 1.1, frictionNote: 'Smooth onboarding progression for store interns' },
    { course: 'Cold Chain & Warehouse Storage SOP', code: 'COLD-101', assigned: 620, started: 580, inProgress: 150, completed: 430, overdue: 40, completionRate: 69, avgScore: 84.5, avgAttempts: 1.4, frictionNote: 'Temperature logging video requires mandatory watch' },
  ],

  managerPerformance: [
    { manager: 'David Tran', employeeCode: 'MMVN-0245', division: 'OMD', department: 'PPF - Processed Fresh Food', teamSize: 6, completed: 4, inProgress: 1, overdue: 1, avgScore: 89.2, completionRate: 83.3, status: 'GOOD' },
    { manager: 'Le Hoang Nam', employeeCode: 'MMVN-0312', division: 'OPT', department: 'OPX - Store Operations', teamSize: 12, completed: 8, inProgress: 2, overdue: 2, avgScore: 82.5, completionRate: 66.7, status: 'ATTENTION' },
    { manager: 'Tran Thu Hang', employeeCode: 'MMVN-0188', division: 'IA', department: 'RSK - Risk Management', teamSize: 5, completed: 5, inProgress: 0, overdue: 0, avgScore: 96.0, completionRate: 100.0, status: 'EXCELLENT' },
    { manager: 'Vu Dinh Bao', employeeCode: 'MMVN-0410', division: 'LP', department: 'QA - Quality Assurance', teamSize: 8, completed: 7, inProgress: 1, overdue: 0, avgScore: 92.4, completionRate: 87.5, status: 'EXCELLENT' },
    { manager: 'Nguyen Hoang', employeeCode: 'MMVN-0520', division: 'SCM', department: 'SC - Supply Chain', teamSize: 10, completed: 8, inProgress: 1, overdue: 1, avgScore: 87.6, completionRate: 80.0, status: 'GOOD' },
  ],

  departmentPerformance: [
    { dept: 'L&OD - Learning & Org Dev', completion: 98 },
    { dept: 'RSK - Risk Management', completion: 95 },
    { dept: 'QA - Quality Assurance', completion: 92 },
    { dept: 'PPF - Fresh Food (Bakery/Meat)', completion: 86 },
    { dept: 'SC - Supply Chain', completion: 84 },
    { dept: 'OPX - Store Operations', completion: 65 },
    { dept: 'DF - Dry Food Grocery', completion: 62 },
  ],

  monthlyCompletions: [
    { month: 'Mar', value: 185 },
    { month: 'Apr', value: 240 },
    { month: 'May', value: 310 },
    { month: 'Jun', value: 275 },
    { month: 'Jul', value: 395 },
    { month: 'Aug', value: 480 },
  ],
};

// 16 MMVN Divisions Compliance League Table
export const divisionComplianceLeague = [
  { rank: 1, code: 'HRD', name: 'Human Resource', headcount: 85, completedCount: 82, inProgressCount: 3, overdueCount: 0, completionRate: 96.5, avgScore: 94.2, status: 'AUDIT_READY', director: 'Sarah Nguyen' },
  { rank: 2, code: 'IA', name: 'Internal Audit', headcount: 24, completedCount: 23, inProgressCount: 1, overdueCount: 0, completionRate: 95.8, avgScore: 96.0, status: 'AUDIT_READY', director: 'Tran Thu Hang' },
  { rank: 3, code: 'LGD', name: 'Legal & Compliance', headcount: 18, completedCount: 17, inProgressCount: 1, overdueCount: 0, completionRate: 94.4, avgScore: 95.0, status: 'AUDIT_READY', director: 'Dinh Van Hung' },
  { rank: 4, code: 'TU', name: 'Transformation Unit & PMO', headcount: 18, completedCount: 17, inProgressCount: 1, overdueCount: 0, completionRate: 94.4, avgScore: 93.0, status: 'AUDIT_READY', director: 'Jessica Lee' },
  { rank: 5, code: 'LP', name: 'Loss Prevention & QA', headcount: 110, completedCount: 100, inProgressCount: 8, overdueCount: 2, completionRate: 91.2, avgScore: 92.4, status: 'AUDIT_READY', director: 'Vu Dinh Bao' },
  { rank: 6, code: 'FAD', name: 'Finance & Accounting', headcount: 95, completedCount: 84, inProgressCount: 9, overdueCount: 2, completionRate: 88.4, avgScore: 90.1, status: 'AUDIT_READY', director: 'Doan Thi Kim' },
  { rank: 7, code: 'SCM', name: 'Supply Chain Management', headcount: 280, completedCount: 236, inProgressCount: 39, overdueCount: 5, completionRate: 84.5, avgScore: 87.6, status: 'AUDIT_READY', director: 'Nguyen Hoang' },
  { rank: 8, code: 'PRC', name: 'Pricing & Commercial', headcount: 65, completedCount: 53, inProgressCount: 11, overdueCount: 1, completionRate: 82.0, avgScore: 88.5, status: 'AUDIT_READY', director: 'Le Thu Thao' },
  { rank: 9, code: 'ECOM', name: 'E-Commerce & Omnichannel', headcount: 80, completedCount: 64, inProgressCount: 14, overdueCount: 2, completionRate: 80.5, avgScore: 87.0, status: 'AUDIT_READY', director: 'Hoang Long' },
  { rank: 10, code: 'MKT', name: 'Marketing & Brand', headcount: 55, completedCount: 44, inProgressCount: 10, overdueCount: 1, completionRate: 79.5, avgScore: 85.4, status: 'AUDIT_READY', director: 'Nguyen Ha' },
  { rank: 11, code: 'OMD', name: 'Operations & Merchandise', headcount: 490, completedCount: 383, inProgressCount: 93, overdueCount: 14, completionRate: 78.2, avgScore: 86.8, status: 'NEEDS_ATTENTION', director: 'David Tran' },
  { rank: 12, code: 'CDD', name: 'Customer Development', headcount: 75, completedCount: 57, inProgressCount: 15, overdueCount: 3, completionRate: 76.0, avgScore: 84.0, status: 'NEEDS_ATTENTION', director: 'Vo Tan Tai' },
  { rank: 13, code: 'CAP', name: 'Construction & Expansion', headcount: 32, completedCount: 24, inProgressCount: 7, overdueCount: 1, completionRate: 75.0, avgScore: 81.5, status: 'AUDIT_READY', director: 'Bui Van Minh' },
  { rank: 14, code: 'GM', name: 'General Merchandise', headcount: 210, completedCount: 152, inProgressCount: 50, overdueCount: 8, completionRate: 72.5, avgScore: 82.0, status: 'NEEDS_ATTENTION', director: 'Tran Duc' },
  { rank: 15, code: 'PROP', name: 'Property & Facilities Mgmt', headcount: 48, completedCount: 34, inProgressCount: 11, overdueCount: 3, completionRate: 70.8, avgScore: 80.2, status: 'NEEDS_ATTENTION', director: 'Ngo Tien Dat' },
  { rank: 16, code: 'OPT', name: 'Store Operations & Floors', headcount: 460, completedCount: 298, inProgressCount: 144, overdueCount: 18, completionRate: 64.8, avgScore: 78.5, status: 'HIGH_RISK', director: 'Le Hoang Nam' },
];

// Live Enterprise System Audit & Learning Stream
export const liveSystemActivity = [
  { id: 'act-1', type: 'COMPLETION', user: 'Minh Tran', code: 'MMVN-1042', role: 'Bakery Specialist (OMD/PPF)', title: 'Food Safety & Hygiene Standards (HACCP)', score: 92, time: '3 mins ago', verified: true },
  { id: 'act-2', type: 'SAP_SYNC', source: 'SAP SuccessFactors HRIS API', details: 'Automated nightly sync: 2,148 records verified. 3 new hires enrolled.', time: '14 mins ago', verified: true },
  { id: 'act-3', type: 'QR_CHECKIN', user: 'Thanh Pham', code: 'MMVN-1250', role: 'Logistics Specialist (SCM/SC)', title: 'Store #04 Fresh Food & Perishables Storage Workshop', time: '42 mins ago', verified: true },
  { id: 'act-4', type: 'ESCALATION', user: 'Lisa Wang', code: 'MMVN-1111', role: 'Fresh Counter (OMD/PPF)', title: 'Risk Management Awareness Overdue (>20 days). Escalation sent to Manager David Tran.', time: '1 hour ago', alert: true },
  { id: 'act-5', type: 'COMPLETION', user: 'David Tran', code: 'MMVN-0245', role: 'Department Manager (OMD/PPF)', title: 'Leadership Essentials for Managers (Executive Certification)', score: 96, time: '2 hours ago', verified: true },
];

// Strategic Kirkpatrick 4-Level ROI & Training Impact
export const kirkpatrickROI = {
  level1: {
    title: 'Level 1: Learner Reaction & Satisfaction (CSAT)',
    csatScore: '4.82 / 5.0',
    usefulRate: '94.6%',
    netPromoter: '+72 NPS',
    summary: '94.6% of store frontline and office staff confirmed digital course materials and video simulations are directly actionable in daily shift operations.',
  },
  level2: {
    title: 'Level 2: Learning & Knowledge Retention',
    avgScore: '88.4%',
    firstAttemptPass: '91.2%',
    assessmentsCompleted: 3420,
    summary: 'Average assessment score exceeds enterprise 80% passing mark with high first-time mastery across Food Safety and Information Security.',
  },
  level3: {
    title: 'Level 3: On-the-Floor Behavioral Impact',
    metric1: '34% Reduction in Cold-Chain Temperature Log Errors',
    metric2: '99.2% POS & Payment Terminal Security Compliance',
    metric3: 'Zero Food Safety Cross-Contamination Violations',
    summary: 'Internal Audit inspections recorded significant measurable adherence to Bakery & Fresh Food standard operating procedures.',
  },
  level4: {
    title: 'Level 4: Business Results & Financial ROI',
    costSavingsEstimated: '$145,000 / year',
    spoilageReduction: '18.4% less fresh meat/bakery shrink',
    auditFinesAvoided: '$60,000 (100% regulatory compliance rating)',
    roiRatio: '320% Return on Learning Investment',
    summary: 'Direct correlation between store team training completion and shrinkage reduction across MM Mega Market 21 hypermarket stores.',
  },
};

// Skill Competency Heatmap Matrix across Core Divisions
export const competencySkillHeatmap = [
  { division: 'OMD - Operations & Merchandise', foodSafety: 94, infoSec: 83, riskMgmt: 78, coldChain: 90, leadership: 85, customerService: 88 },
  { division: 'OPT - Store Operations & Frontline', foodSafety: 82, infoSec: 75, riskMgmt: 70, coldChain: 78, leadership: 74, customerService: 92 },
  { division: 'SCM - Supply Chain & Logistics', foodSafety: 80, infoSec: 85, riskMgmt: 88, coldChain: 96, leadership: 82, customerService: 79 },
  { division: 'LP - Loss Prevention & QA', foodSafety: 98, infoSec: 92, riskMgmt: 95, coldChain: 94, leadership: 88, customerService: 85 },
  { division: 'HRD - Human Resource', foodSafety: 85, infoSec: 96, riskMgmt: 96, coldChain: 80, leadership: 96, customerService: 95 },
  { division: 'FAD - Finance & Accounting', foodSafety: 75, infoSec: 95, riskMgmt: 92, coldChain: 70, leadership: 89, customerService: 80 },
];


// ---------------------------------------------------------------------------
// Phase 2: AI-Powered Learning Hub & Semantic Search Index
// ---------------------------------------------------------------------------

export const aiKnowledgeBase = [
  {
    id: 'kb-sop-01',
    title: 'SOP-OMD-04: Bakery Temperature Control & Sanitation Standards',
    category: 'SOP & Operations',
    docType: 'PDF Document',
    pages: 14,
    updatedAt: '2026-08-10',
    summary: 'Standard dough proofing temperature (28-32°C), convection oven checks, 120-minute temperature logging frequency, and sanitization protocols with standard chemical solutions.',
    matchedExcerpt: '...Bakery associates must log temperature records in Form SOP-OMD-04B every 120 minutes. If deviation exceeds ±3°C, immediately report to the Shift Supervisor...',
    relevance: 98,
    tags: ['Bakery', 'SOP', 'Food Safety', 'Store Ops'],
    relatedCourseId: 'course-food-safety',
  },
  {
    id: 'kb-sec-02',
    title: 'SEC-POL-01: Information Security & Customer Data Protection Policy',
    category: 'Information Security',
    docType: 'PDF & Video',
    pages: 22,
    updatedAt: '2026-07-20',
    summary: 'Phishing identification procedures, strict prohibition of unauthorized USB devices on POS terminals, and 4-tier data classification (Public, Internal, Confidential, Restricted).',
    matchedExcerpt: '...All Store POS workstations and handheld scanners must strictly connect only to the authorized whitelist network and must never store unencrypted credit card data...',
    relevance: 95,
    tags: ['Security', 'Phishing', 'Data Privacy', 'POS'],
    relatedCourseId: 'course-infosec',
  },
  {
    id: 'kb-fire-03',
    title: 'HSE-PCCC-02: Emergency Evacuation & Fire Safety Response Protocol',
    category: 'Health & Safety',
    docType: 'Video Guide & SOP',
    pages: 8,
    updatedAt: '2026-06-15',
    summary: 'Locations of CO2 and Foam extinguishers in warehouse & fresh food prep areas; 4-door store emergency evacuation routing at MM Mega Market.',
    matchedExcerpt: '...Upon Level 2 alarm: Immediately cut main sector power breaker, guide customers along photoluminescent exit paths toward Assembly Point 1 in the main parking lot...',
    relevance: 91,
    tags: ['Fire Safety', 'Emergency', 'Store Ops', 'HSE'],
    relatedCourseId: 'course-orientation',
  },
  {
    id: 'kb-cust-04',
    title: 'CS-GUIDE-03: B2B & Horeca Customer Conflict Resolution Standard',
    category: 'Customer Service',
    docType: 'Interactive Script',
    pages: 12,
    updatedAt: '2026-08-01',
    summary: 'L.A.S.T principle (Listen - Apologize - Solve - Thank), store-level authority to replace fresh goods within 15 minutes without senior manager escalation.',
    matchedExcerpt: '...Listen attentively without interruption, verify digital receipt in POS system, and complete replacement with equivalent fresh product within 10 minutes...',
    relevance: 87,
    tags: ['Customer Service', 'Horeca', 'Store Ops'],
    relatedCourseId: 'course-orientation',
  },
];

export const aiRecommendations = [
  {
    courseId: 'course-food-safety',
    title: 'Food Safety & Hygiene Standards (HACCP)',
    reason: 'Recommended by AI based on your Bakery Associate role and Fresh Food SOP completion history.',
    confidence: 96,
    matchSkills: ['Microbiology Control', 'Temperature Storage', 'HACCP Store Audit'],
    estimatedHours: '3.5h',
    badgeTone: 'sage',
  },
  {
    courseId: 'course-infosec',
    title: 'Information Security Awareness',
    reason: 'Mandatory Compliance Training — AI reminder to complete your remaining 35% before Sep 30 deadline.',
    confidence: 99,
    matchSkills: ['Phishing Awareness', 'Password Security', 'POS Data Safety'],
    estimatedHours: '1.5h remaining',
    badgeTone: 'amber',
  },
  {
    courseId: 'course-customer-exp',
    title: 'Excellence in Fresh Food Customer Service',
    reason: 'Supplementary course recommended by PPF Department Manager to enhance counter service delivery.',
    confidence: 89,
    matchSkills: ['Fresh Food Advisory', 'Conflict Handling', 'Cross-selling Fresh'],
    estimatedHours: '2.0h',
    badgeTone: 'rail',
  },
];

export const aiChatSamplePrompts = [
  'What is the required proofing temperature for Bakery dough in °C?',
  'What are the 4 data classification tiers under MMVN policy?',
  'How do I register for next week\'s hands-on Fire Safety workshop?',
  'Summarize the most common pitfalls in the Information Security assessment',
];

// ---------------------------------------------------------------------------
// Offline / Blended Learning (ILT - Instructor-Led Training & QR Attendance)
// ---------------------------------------------------------------------------

export const classroomSessions = [
  {
    id: 'ilt-001',
    code: 'WS-FSH-01',
    title: 'Hands-on Food Safety Standards & Industrial Oven Operation',
    category: 'Fresh Food Practice',
    modality: 'OFFLINE_STORE',
    trainerName: 'Chef Vo Van Tan (Master Baker)',
    trainerTitle: 'Senior Specialist Fresh Food Trainer',
    date: '2026-08-28',
    time: '08:30 - 11:30 (3.0 hours)',
    venue: 'Culinary Demo Kitchen & Bakery Lab - An Phu Store (HCMC)',
    maxCapacity: 25,
    enrolledCount: 21,
    status: 'UPCOMING',
    isEnrolled: true,
    attendanceStatus: 'PENDING_CHECKIN', // PENDING_CHECKIN, CHECKED_IN, ABSENT
    qrToken: 'MMVN-QR-ILT001-20260828',
    description: 'Hands-on workshop covering industrial mixer sanitization, convection oven pressure gauge calibration, and safe mechanical jam resolution.',
    prerequisiteCourse: 'Food Safety & Hygiene Standards (HACCP)',
  },
  {
    id: 'ilt-002',
    code: 'WS-PCCC-02',
    title: 'On-site Fire Safety Drill & Emergency First Aid Training',
    category: 'Compliance & Safety',
    modality: 'OFFLINE_STORE',
    trainerName: 'Occupational Health & Safety (HSE) Committee',
    trainerTitle: 'HSE Committee',
    date: '2026-09-05',
    time: '14:00 - 17:00 (3.0 hours)',
    venue: 'Logistics Distribution Yard - MM Mega Market Binh Phu Store',
    maxCapacity: 40,
    enrolledCount: 38,
    status: 'OPEN',
    isEnrolled: false,
    attendanceStatus: 'NOT_REGISTERED',
    qrToken: 'MMVN-QR-ILT002-20260905',
    description: 'Live simulated gas fire suppression, fire blanket deployment, and peak-hour customer evacuation drill.',
    prerequisiteCourse: 'Corporate Orientation',
  },
  {
    id: 'ilt-003',
    code: 'WEB-SEC-03',
    title: 'Webinar: Emerging Phishing Threats & Executive Impersonation Scams',
    category: 'Information Security',
    modality: 'ONLINE_WEBINAR',
    trainerName: 'Doan Quoc Bao (IT Security Lead)',
    trainerTitle: 'Head of Information Security MIS',
    date: '2026-08-15',
    time: '10:00 - 11:30 (1.5 hours)',
    venue: 'Microsoft Teams Live Event (Internal SSO Link)',
    maxCapacity: 200,
    enrolledCount: 184,
    status: 'COMPLETED',
    isEnrolled: true,
    attendanceStatus: 'CHECKED_IN',
    qrToken: 'MMVN-QR-ILT003-COMPLETED',
    description: 'Interactive briefing dissecting 5 recent spoofing email samples detected in Q3/2026 and immediate reporting workflows.',
    prerequisiteCourse: 'Information Security Awareness',
  },
];

// ---------------------------------------------------------------------------
// Learning Paths (Career Progression & Role-Based Tracks)
// ---------------------------------------------------------------------------

export const learningPaths = [
  {
    id: 'lp-bakery-master',
    code: 'LP-PPF-01',
    title: 'Bakery Specialist & Fresh Food Mastery Track',
    targetRole: 'Bakery Associate / Fresh Food Staff',
    targetAudience: 'All Store Bakery & Fresh Food Team Associates',
    totalCourses: 4,
    completedCourses: 2,
    progressPercent: 65,
    estimatedWeeks: '4 weeks',
    badgeReward: 'Bakery Operations Master',
    xpReward: 500,
    milestones: [
      {
        step: 1,
        title: 'Corporate Orientation & MMVN Workplace Culture',
        courseId: 'course-orientation',
        courseTitle: 'Corporate Orientation',
        type: 'E_LEARNING',
        status: 'COMPLETED',
        score: null,
      },
      {
        step: 2,
        title: 'Food Safety & Hygiene Standards (HACCP)',
        courseId: 'course-food-safety',
        courseTitle: 'Food Safety & Hygiene Standards (HACCP)',
        type: 'E_LEARNING',
        status: 'COMPLETED',
        score: 95,
      },
      {
        step: 3,
        title: 'Information Security & POS Counter Operations',
        courseId: 'course-infosec',
        courseTitle: 'Information Security Awareness',
        type: 'E_LEARNING_ASSESSMENT',
        status: 'IN_PROGRESS',
        score: null,
      },
      {
        step: 4,
        title: 'Hands-on Bakery Equipment & Oven Operation (ILT Workshop)',
        courseId: 'ilt-001',
        courseTitle: 'Hands-on Food Safety Standards & Industrial Oven Operation',
        type: 'CLASSROOM_PRACTICE',
        status: 'UPCOMING',
        score: null,
      },
    ],
  },
  {
    id: 'lp-shift-leader',
    code: 'LP-LEAD-02',
    title: 'Store Shift Leader Readiness Track',
    targetRole: 'Senior Associate / Shift Leader Candidate',
    targetAudience: 'High-performing associates nominated for leadership',
    totalCourses: 3,
    completedCourses: 0,
    progressPercent: 15,
    estimatedWeeks: '6 weeks',
    badgeReward: 'Future Leader Badge',
    xpReward: 800,
    milestones: [
      {
        step: 1,
        title: 'Risk Management & Store Operations Control',
        courseId: 'course-risk',
        courseTitle: 'Risk Management Awareness',
        type: 'E_LEARNING_ASSESSMENT',
        status: 'NOT_STARTED',
        score: null,
      },
      {
        step: 2,
        title: 'Leadership Essentials for Managers: Coaching & Feedback',
        courseId: 'course-leadership',
        courseTitle: 'Leadership Essentials for Managers',
        type: 'E_LEARNING',
        status: 'NOT_STARTED',
        score: null,
      },
      {
        step: 3,
        title: 'SOP & Internal Audit Compliance Capstone Assessment',
        courseId: 'course-sop-audit',
        courseTitle: 'SOP & Internal Audit Compliance',
        type: 'CAPSTONE_ASSESSMENT',
        status: 'NOT_STARTED',
        score: null,
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Gamification & Engagement Data (XP, Streak, Leaderboard)
// ---------------------------------------------------------------------------

export const gamificationData = {
  userStats: {
    userId: 'USR-1042',
    fullName: 'Minh Tran',
    points: 1680,
    currentLevel: 4,
    levelTitle: 'Elite Operations Specialist',
    nextLevelXp: 2200,
    streakDays: 8,
    rankInDept: 2,
    rankInCompany: 14,
    totalBadgesEarned: 5,
  },
  badges: [
    {
      id: 'b-01',
      code: 'FAST_STARTER',
      name: 'Fast Starter',
      description: 'Completed your first lesson within 24 hours of assignment.',
      icon: 'ti-bolt',
      earned: true,
      earnedDate: '2026-07-12',
      tier: 'Bronze',
    },
    {
      id: 'b-02',
      code: 'HACCP_MASTER',
      name: 'Food Safety Expert',
      description: 'Scored 95%+ on the Food Safety & Hygiene compliance assessment.',
      icon: 'ti-shield-check',
      earned: true,
      earnedDate: '2026-07-15',
      tier: 'Gold',
    },
    {
      id: 'b-03',
      code: 'STREAK_7',
      name: '7-Day Streak',
      description: 'Studied consistently for 7 consecutive days without interruption.',
      icon: 'ti-flame',
      earned: true,
      earnedDate: '2026-08-19',
      tier: 'Silver',
    },
    {
      id: 'b-04',
      code: 'AI_EXPLORER',
      name: 'AI Explorer',
      description: 'Used AI SOP Search and interacted with AI Tutor over 10 times.',
      icon: 'ti-sparkles',
      earned: true,
      earnedDate: '2026-08-20',
      tier: 'Silver',
    },
    {
      id: 'b-05',
      code: 'PERFECT_ATTENDANCE',
      name: 'Perfect Attendance',
      description: 'Checked in on time to all scheduled Instructor-Led Training sessions.',
      icon: 'ti-calendar-check',
      earned: true,
      earnedDate: '2026-08-15',
      tier: 'Bronze',
    },
    {
      id: 'b-06',
      code: 'COMPLIANCE_HERO',
      name: 'Compliance Hero',
      description: 'Completed 100% of mandatory compliance courses at least 10 days before deadline.',
      icon: 'ti-trophy',
      earned: false,
      tier: 'Platinum',
    },
  ],
  leaderboard: [
    { rank: 1, name: 'Tran Thi Thu', avatar: 'TT', department: 'RSK - Risk Management', points: 2350, streak: 15, level: 5, isCurrent: false },
    { rank: 2, name: 'Minh Tran', avatar: 'MT', department: 'PPF - Fresh Food (Store)', points: 1680, streak: 8, level: 4, isCurrent: true },
    { rank: 3, name: 'Sarah Johnson', avatar: 'SJ', department: 'PPF - Fresh Food (Store)', points: 1520, streak: 5, level: 4, isCurrent: false },
    { rank: 4, name: 'Le Hoang Nam', avatar: 'LN', department: 'L&OD - Human Resource', points: 1410, streak: 6, level: 3, isCurrent: false },
    { rank: 5, name: 'Pham Thanh Tung', avatar: 'PT', department: 'DF - Dry Food', points: 1290, streak: 3, level: 3, isCurrent: false },
    { rank: 6, name: 'Nguyen Thi Mai', avatar: 'NM', department: 'OMD - Merchandise', points: 1150, streak: 4, level: 3, isCurrent: false },
  ],
};

// ---------------------------------------------------------------------------
// Manager Course Approval Requests
// ---------------------------------------------------------------------------

export const pendingApprovalRequests = [
  {
    id: 'req-001',
    employeeId: 'EMP-1103',
    employeeName: 'John Doe',
    position: 'Bakery Associate',
    department: 'PPF - Processed Fresh Food',
    courseId: 'course-leadership',
    courseName: 'Leadership Essentials for Managers',
    requestDate: '2026-08-19',
    justification: 'Aiming to develop peer coaching skills and prepare for the upcoming Bakery Shift Leader assessment.',
    courseCost: 'Free (Internal L&D Program)',
    status: 'PENDING', // PENDING, APPROVED, REJECTED
  },
  {
    id: 'req-002',
    employeeId: 'EMP-1099',
    employeeName: 'Mike Chen',
    position: 'Line Cook',
    department: 'PPF - Processed Fresh Food',
    courseId: 'ilt-002',
    courseName: 'On-site Fire Safety Drill & Emergency First Aid Training',
    requestDate: '2026-08-20',
    justification: 'Volunteered for the store emergency response team per annual safety compliance quota.',
    courseCost: 'Free (Internal HSE Program)',
    status: 'PENDING',
  },
];

// ---------------------------------------------------------------------------
// HRIS Integration Logs & Security/Compliance Settings
// ---------------------------------------------------------------------------

export const hrisSyncLogs = [
  {
    id: 'sync-001',
    timestamp: '2026-08-21 03:00:15',
    source: 'SAP SuccessFactors HRIS API (Nightly Batch)',
    totalRecords: 2145,
    insertedCount: 14,
    updatedCount: 38,
    deactivatedCount: 3,
    status: 'SUCCESS',
    durationSeconds: '18.4s',
    fieldsMapped: ['EmployeeID', 'FullName', 'Email', 'Position', 'DeptCode', 'DivisionCode', 'ManagerID', 'StoreLocation', 'Status'],
  },
  {
    id: 'sync-002',
    timestamp: '2026-08-20 03:00:12',
    source: 'SAP SuccessFactors HRIS API (Nightly Batch)',
    totalRecords: 2134,
    insertedCount: 8,
    updatedCount: 12,
    deactivatedCount: 1,
    status: 'SUCCESS',
    durationSeconds: '17.8s',
    fieldsMapped: ['EmployeeID', 'FullName', 'Email', 'Position', 'DeptCode', 'DivisionCode', 'ManagerID', 'StoreLocation', 'Status'],
  },
];

export const securityComplianceConfig = {
  watermark: {
    enabled: true,
    pattern: 'EMP_CODE + FULL_NAME + IP_ADDRESS + TIMESTAMP',
    opacity: 0.15,
    showOnVideo: true,
    showOnPdf: true,
  },
  antiCheat: {
    forceVideoWatchPercent: 90,
    preventFastForward: true,
    disableMultiTabLearning: true,
    preventCopyPasteInQuiz: true,
    maxQuizWindowBlurCount: 3,
  },
  ssoIntegration: {
    provider: 'Microsoft Azure Active Directory (OIDC / SAML 2.0)',
    status: 'ACTIVE',
    tenantId: 'mmvn-org.onmicrosoft.com',
    autoProvisioning: true,
    enforceMfa: true,
  },
  notificationChannels: {
    email: { enabled: true, provider: 'SendGrid / Internal SMTP', templateCount: 12 },
    zaloZns: { enabled: true, provider: 'Zalo Business Solution (ZNS API)', targetAudience: 'Store Associates (Store Operations)' },
    msTeams: { enabled: true, provider: 'Microsoft Graph Webhook Bot', targetAudience: 'Head Office & Managers' },
    inApp: { enabled: true, pushEnabled: true },
  },
};

