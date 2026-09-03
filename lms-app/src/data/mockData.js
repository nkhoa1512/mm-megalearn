// Mock data shaped after official MM Mega Market Vietnam (MMVN) Organizational Matrix:
// BUSINESS_UNIT (1) > DIVISION (16) > DEPARTMENT (56) > JOB_LEVELS (1-7, CL, IN) > USER,
// COURSE > COURSE_MODULE > COURSE_LESSON, COURSE_ASSIGNMENT,
// LEARNING_ENROLLMENT > LESSON_PROGRESS, ASSESSMENT_ATTEMPT.

export {
  businessUnits,
  orgBranches,
  operationsAreas,
  storeTypes,
  clusters,
  retailStores,
  storeDepartments,
  storeSections,
  divisions,
  departments,
  subDepartments,
  jobLevels,
  competencyFramework,
  meetingRoomsAndLabs,
  trainersDirectory,
  trainerUserIdFor,
} from './orgHierarchy';

import {
  generated100Users,
  generated100Courses,
  generated100EnrollmentMatrix,
  getCourseAccessControl,
  UNIVERSAL_COMPLIANCE_COURSE_IDS,
} from './generated100Data';
import { levelTitle, levelValue, normalizeLevel, checkCourseAccessRule } from './levelSystem';
import { normalizeRole, managedRolesOf, canManage, roleDefinition, hasCapability } from './roles';
import { COURSE_IMAGE_PRESETS, getCourseImage } from './courseImages';
import { canonicalizeCategory } from '../utils/courseCatalog';
import { withHrProfile } from './hrProfile';

export { UNIVERSAL_COMPLIANCE_COURSE_IDS } from './generated100Data';
export { COURSE_IMAGE_PRESETS, getCourseImage } from './courseImages';

// The 7-level scale & 6-role model are re-exported here so screens only need
// only need to import from a single place.
export {
  LEVEL_DEFINITIONS,
  LEVEL_ORDER,
  ACCESS_STATE,
  ENTRY_LEVEL,
  normalizeLevel,
  levelDefinition,
  levelTitle,
  levelShortLabel,
  levelValue,
  levelGap,
  nextLevelUp,
  levelRoadmap,
  checkCourseAccessRule,
  isCourseVisibleInCatalog,
} from './levelSystem';

export {
  ROLE_DEFINITIONS,
  ROLE_ORDER,
  ROLE_HOME,
  normalizeRole,
  roleDefinition,
  roleLabel,
  roleRank,
  managedRolesOf,
  managedScopeLabel,
  canManage,
  capabilitiesOf,
  hasCapability,
  canAuthorAnyCourse,
} from './roles';


// ---------------------------------------------------------------------------
// 100 Enterprise Demo Personas & Authenticated Accounts Matrix
// ---------------------------------------------------------------------------

export const demoUsers = generated100Users;

// ---------------------------------------------------------------------------
// The 6 standard demo personas for the 6 ranked roles (low -> high)
//   1. learner   Minh Tran          USR-1042  Level 7
//   2. manager   David Tran         USR-0245  Level 4
//   3. trainer   Nguyen Van Hung    USR-9003  Level 3
//   4. hrbp      Le Thi Mai         USR-9004  Level 2
//   5. useradmin Pham Thanh Thao    USR-9002  Level 2
//   6. sysadmin  Tran Quoc Bao      USR-9001  Level 1
// All 6 are Learners: every role has a personal learning portal.
// ---------------------------------------------------------------------------

export const managerUser = demoUsers[1]; // David Tran (Store Department Manager - Level 4)
export const currentUser = demoUsers[3]; // Minh Tran (Junior Bakery Associate - Level 7)

export const sysAdminUser = withHrProfile({
  userId: 'USR-9001',
  employeeCode: 'MMVN-9001',
  fullName: 'Tran Quoc Bao (IT)',
  email: 'bao.tran@mmvietnam.com',
  role: 'sysadmin',
  position: 'Lead IT Systems Administrator & Cybersecurity Lead',
  level: '1',
  levelTitle: levelTitle('1'),
  branch: 'SUPPORTING',
  branchName: 'Supporting Functions (Head Office)',
  businessUnitId: 'bu-mmvn', businessUnitCode: 'MMVN', businessUnitName: 'MM Mega Market Vietnam',
  divisionId: 'div-mis', divisionCode: 'MIS', divisionName: 'MIS',
  departmentId: 'dept-mis-dept', departmentCode: 'MIS', departmentName: 'MIS',
  subDepartmentId: 'sub-scm-lw', subDepartmentCode: 'SUB-SCM-LW', subDepartmentName: 'Logistics & Warehouse',
  areaId: 'area-south', areaName: 'Southern Region',
  storeId: null, storeName: 'Head Office (An Phu, Thu Duc City)',
  managerId: null,
  status: 'ACTIVE',
  yearsOfService: 6.4,
  avatar: 'TB',
  badgeTone: 'rust',
  description: 'Full authority over infrastructure, APIs, ISO 27001 audit logs and every role including User Admin.',
});

export const userAdminUser = withHrProfile({
  userId: 'USR-9002',
  employeeCode: 'MMVN-9002',
  fullName: 'Pham Thanh Thao (User Admin)',
  email: 'thao.pham@mmvietnam.com',
  role: 'useradmin',
  position: 'User Administration Lead & HR Master Data Owner',
  level: '2',
  levelTitle: levelTitle('2'),
  branch: 'SUPPORTING',
  branchName: 'Supporting Functions (Head Office)',
  businessUnitId: 'bu-mmvn', businessUnitCode: 'MMVN', businessUnitName: 'MM Mega Market Vietnam',
  divisionId: 'div-hrd', divisionCode: 'Human Resources', divisionName: 'Human Resources',
  departmentId: 'dept-hrd-tahrbp', departmentCode: 'HR_TA_HRBP', departmentName: 'HR - Talent Acquisition & HRBP',
  subDepartmentId: 'sub-hrd-hrbpho', subDepartmentCode: 'SUB-HRBP-HO', subDepartmentName: 'HR - HRBP HO',
  areaId: 'area-south', areaName: 'Southern Region',
  storeId: null, storeName: 'Head Office (An Phu, Thu Duc City)',
  managerId: 'USR-9001',
  status: 'ACTIVE',
  yearsOfService: 5.1,
  avatar: 'PT',
  badgeTone: 'blue',
  description: 'Managing employee records, allocating courses and assigning trainers to classes at each branch.',
});

export const trainerHungUser = withHrProfile({
  userId: 'USR-9003',
  employeeCode: 'MMVN-9003',
  fullName: 'Nguyen Van Hung (Master Trainer)',
  email: 'hung.nguyen@mmvietnam.com',
  role: 'trainer',
  position: 'Master Trainer & L&D Specialist (Faculty Lead)',
  level: '3',
  levelTitle: levelTitle('3'),
  branch: 'SUPPORTING',
  branchName: 'Supporting Functions (Head Office)',
  businessUnitId: 'bu-mmvn', businessUnitCode: 'MMVN', businessUnitName: 'MM Mega Market Vietnam',
  divisionId: 'div-hrd', divisionCode: 'Human Resources', divisionName: 'Human Resources',
  departmentId: 'dept-hrd-lod', departmentCode: 'HR_LOD', departmentName: 'HR - Learning & Organizational Development',
  subDepartmentId: 'sub-hrd-sfnl', subDepartmentCode: 'SUB-SF-NL', subDepartmentName: 'SF National Learning',
  areaId: 'area-south', areaName: 'Southern Region',
  storeId: null, storeName: 'Head Office (An Phu, Thu Duc City)',
  managerId: 'USR-9004',
  status: 'ACTIVE',
  yearsOfService: 8.2,
  avatar: 'NH',
  badgeTone: 'sage',
  description: 'Creating practical courses, teaching in the store workshop and displaying the Live QR for learner check-in.',
});

export const trainerThanhUser = withHrProfile({
  userId: 'USR-9005',
  employeeCode: 'MMVN-9005',
  fullName: 'Vu Duc Thanh (HSE Trainer)',
  email: 'thanh.vu@mmvietnam.com',
  role: 'trainer',
  position: 'Safety Trainer & HSE Section Manager',
  level: '3',
  levelTitle: levelTitle('3'),
  branch: 'SUPPORTING',
  branchName: 'Supporting Functions (Head Office)',
  businessUnitId: 'bu-mmvn', businessUnitCode: 'MMVN', businessUnitName: 'MM Mega Market Vietnam',
  divisionId: 'div-lpqa', divisionCode: 'LP-QA', divisionName: 'LP-QA',
  departmentId: 'dept-lpqa-lp', departmentCode: 'LP', departmentName: 'Loss Prevention',
  subDepartmentId: 'sub-df-chh-1010', subDepartmentCode: 'SUB-CHH', subDepartmentName: 'Cosmetics & Household & HBA',
  areaId: 'area-south', areaName: 'Southern Region',
  storeId: null, storeName: 'Head Office (An Phu, Thu Duc City)',
  managerId: 'USR-9004',
  status: 'ACTIVE',
  yearsOfService: 9.0,
  avatar: 'VT',
  badgeTone: 'sage',
  description: 'Leading fire drills, first aid and forklift safety sessions on the branch practice grounds.',
});

export const trainerQuangUser = withHrProfile({
  userId: 'USR-9006',
  employeeCode: 'MMVN-9006',
  fullName: 'Tran Minh Quang (SGM Mentor)',
  email: 'quang.tran@mmvietnam.com',
  role: 'trainer',
  position: 'Store General Manager & Management Trainer',
  level: '2',
  levelTitle: levelTitle('2'),
  branch: 'OPERATIONS',
  branchName: 'Store Operations',
  businessUnitId: 'bu-mmvn', businessUnitCode: 'MMVN', businessUnitName: 'MM Mega Market Vietnam',
  divisionId: 'div-opt', divisionCode: 'Operations', divisionName: 'Operations',
  departmentId: 'dept-opt-sm', departmentCode: 'OPS_SM', departmentName: 'Operations - Store Management',
  subDepartmentId: 'sub-opt-sm-south', subDepartmentCode: 'SUB-OPS-SOU', subDepartmentName: 'Regional Operations (South)',
  areaId: 'area-south', areaName: 'Southern Region',
  storeId: 'store-an-phu', storeName: 'MM Mega Market An Phu (Flagship)',
  managerId: 'USR-9001',
  status: 'ACTIVE',
  yearsOfService: 11.5,
  avatar: 'TQ',
  badgeTone: 'sage',
  description: 'Mentors the SGM succession roadmap and teaches Store P&L Management (a Level 2 course).',
});

export const trainerUser = trainerHungUser;
export const allTrainers = [trainerHungUser, trainerThanhUser, trainerQuangUser];

export const hrbpUser = withHrProfile({
  userId: 'USR-9004',
  employeeCode: 'MMVN-9004',
  fullName: 'Le Thi Mai (HRBP)',
  email: 'mai.le@mmvietnam.com',
  role: 'hrbp',
  position: 'HR Business Partner - Head of People Partnering',
  level: '2',
  levelTitle: levelTitle('2'),
  branch: 'SUPPORTING',
  branchName: 'Supporting Functions (Head Office)',
  businessUnitId: 'bu-mmvn', businessUnitCode: 'MMVN', businessUnitName: 'MM Mega Market Vietnam',
  divisionId: 'div-hrd', divisionCode: 'Human Resources', divisionName: 'Human Resources',
  departmentId: 'dept-hrd-tahrbp', departmentCode: 'HR_TA_HRBP', departmentName: 'HR - Talent Acquisition & HRBP',
  subDepartmentId: 'sub-hrd-hrbpho', subDepartmentCode: 'SUB-HRBP-HO', subDepartmentName: 'HR - HRBP HO',
  areaId: 'area-south', areaName: 'Southern Region',
  storeId: null, storeName: 'Head Office (An Phu, Thu Duc City)',
  managerId: 'USR-9002',
  status: 'ACTIVE',
  yearsOfService: 7.3,
  avatar: 'LM',
  badgeTone: 'blue',
  description: 'Skill gap analysis, 70-20-10 succession planning and regional training compliance monitoring.',
});

// Sarah Nguyen (USR-0001) is the L&D Director on the new scale: role `trainer`, Level 2.
// Keeps the `adminUser` export name so the older screens still compile.
export const lndDirectorUser = demoUsers[0];
export const adminUser = lndDirectorUser;

// The 6 core personas, ordered by role rank from low to high.
export const rolePersonas = [
  { role: 'learner', user: currentUser },
  { role: 'manager', user: managerUser },
  { role: 'trainer', user: trainerHungUser },
  { role: 'hrbp', user: hrbpUser },
  { role: 'useradmin', user: userAdminUser },
  { role: 'sysadmin', user: sysAdminUser },
];

export function personaForRole(role) {
  const normalized = normalizeRole(role);
  const match = rolePersonas.find((p) => p.role === normalized);
  return match ? match.user : currentUser;
}

export function allUsers() {
  const extras = [
    sysAdminUser,
    userAdminUser,
    hrbpUser,
    trainerHungUser,
    trainerThanhUser,
    trainerQuangUser,
  ];
  const seen = new Set(demoUsers.map((u) => u.userId));
  return [...demoUsers, ...extras.filter((u) => !seen.has(u.userId))];
}

// The list of employees `actor` is allowed to manage under the cascading matrix
// (Cascading Hierarchy): every role ranked below the actor's role.
// A Manager only sees people in their own department / reporting line; the other roles
// from Trainer upward can see across the whole organization.
export function getManagedUsers(actor) {
  if (!actor) return [];
  const actorRole = normalizeRole(actor.role);
  const allowedRoles = managedRolesOf(actorRole);
  if (allowedRoles.length === 0) return [];

  const pool = allUsers().filter(
    (u) => u.userId !== actor.userId && allowedRoles.includes(normalizeRole(u.role))
  );

  if (actorRole === 'manager') {
    const direct = pool.filter(
      (u) => u.managerId === actor.userId || u.departmentCode === actor.departmentCode
    );
    return direct.length > 0 ? direct : pool.filter((u) => u.divisionCode === actor.divisionCode);
  }

  return pool;
}

// The single source for "who may teach": every employee with the capability
// canBeAssignedToClass (Trainer/L&D, HRBP, User Admin, System Admin) — thay
// because the static trainersDirectory profile (only 4 people, with IDs that do not match system
// accounts) was previously used to pick a trainer when creating an in-person course.
export function teachingEligibleUsers() {
  return allUsers().filter((u) => hasCapability(normalizeRole(u.role), 'canBeAssignedToClass'));
}

// Teaching performance metrics (CSAT, sessions taught, total learners) for the 6
// staff who are the recurring "faces" of the demo — already present in classroomSessions/the
// sample course, so the pre-built figures match what other pages display.
const CURATED_TRAINER_STATS = {
  [trainerHungUser.userId]: { rating: 4.9, totalClassesTaught: 48, totalLearners: 1240 },
  [trainerThanhUser.userId]: { rating: 4.92, totalClassesTaught: 52, totalLearners: 1850 },
  [trainerQuangUser.userId]: { rating: 4.96, totalClassesTaught: 24, totalLearners: 410 },
  [hrbpUser.userId]: { rating: 4.85, totalClassesTaught: 9, totalLearners: 210 },
  [userAdminUser.userId]: { rating: 4.88, totalClassesTaught: 14, totalLearners: 340 },
  [sysAdminUser.userId]: { rating: 4.83, totalClassesTaught: 6, totalLearners: 180 },
};

/** CSAT/teaching metrics for anyone eligible to lead a class. Staff with no
 *  pre-built figures (trainers arising from the 100 sample employees) get a
 *  plausible number derived deterministically from userId rather than a fresh random each render. */
export function trainerStatsFor(userId) {
  if (CURATED_TRAINER_STATS[userId]) return CURATED_TRAINER_STATS[userId];
  let hash = 0;
  for (const ch of String(userId)) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return {
    rating: Math.round((4.5 + (hash % 41) / 100) * 100) / 100, // 4.50 - 4.90
    totalClassesTaught: 3 + (hash % 12),
    totalLearners: 60 + (hash % 25) * 15,
  };
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
    departmentId: 'dept-ops-s', departmentCode: 'OPS-S',
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
// Virtual Classroom (a sub-type of Online E-Learning): a live online class
// live over Zoom/Teams, unlike self-paced E-Learning (Module/Lesson/Quiz). Only
// Only User Admin/System Admin may create this type (canAuthorOnlineCourses); a Trainer
// still only teaches offline ILT as today. Attendance reuses exactly the same mechanism.
// Attendance already exists in TrainerHub — there is no closing quiz (completion =
// attended the session, as the user requested).
const virtualClassCourseImage = 'https://images.unsplash.com/photo-1587825140708-dfaf72ae4b04?auto=format&fit=crop&w=600&q=80';

courses.push(
  {
    id: 'CRS-VC-001',
    code: 'VC-LEAD-001',
    title: 'Online Webinar: Meeting Facilitation Skills & Managing Store Digital Transformation',
    category: 'Leadership & Management',
    domain: 'Virtual Live Classroom',
    thumbnail: virtualClassCourseImage,
    imageUrl: virtualClassCourseImage,
    milestoneImage: virtualClassCourseImage,
    deliveryType: 'ONLINE_ELEARNING',
    onlineClassType: 'VIRTUAL_CLASS',
    targetLevel: '4',
    targetLevelTitle: `Level 4: ${levelTitle('4')}`,
    modality: 'VIRTUAL_LIVE_CLASS',
    format: 'Microsoft Teams Live Class',
    platformSource: null,
    courseType: 'OPTIONAL',
    estimatedHours: '2.0h',
    passingScore: null,
    published: true,
    trainerId: trainerHungUser.userId,
    trainerName: trainerHungUser.fullName,
    venue: null, venueId: null, scheduleDate: null, scheduleTime: null,
    maxCapacity: 60,
    description: 'Live online class over Microsoft Teams: how to run effective meetings and lead a store team through digital transformation. Completion = full attendance, with no end-of-course test.',
    prerequisites: [],
    configuration: {
      assessmentEnabled: false, maxAttempts: 0, passingScorePercent: 0, certificateEnabled: true,
      questionBankSize: 0, questionsPerAttempt: 0, version: 'v1.0',
      lastReviewedBy: 'Nguyễn Văn Hùng (Master Trainer)', lastReviewedDate: '2026-08-10',
      changelog: [{ version: 'v1.0', date: '2026-08-10', reviewer: 'Nguyễn Văn Hùng (Master Trainer)', note: 'Seeds the first Virtual Class online session.' }],
    },
    assignment: null,
    modules: [],
    questionBank: [],
    virtualMeeting: {
      platform: 'TEAMS',
      meetingUrl: 'https://teams.microsoft.com/l/meetup-join/mmvn-virtual-class-vc001',
      meetingId: '312 486 771 05',
      passcode: 'MMVN-Lead1',
      instructorId: trainerHungUser.userId,
      instructorName: trainerHungUser.fullName,
      instructorTitle: trainerHungUser.position,
      scheduleDate: '2026-09-03',
      scheduleTime: '14:00 - 16:00 (2.0 hours)',
      maxCapacity: 60,
      instructions: 'Have your laptop/headset ready and log in 10 minutes before the session to test your connection. Keep your camera on throughout so the trainer can confirm attendance.',
      status: 'UPCOMING',
      recordingUrl: '',
      materials: [
        { name: 'Lecture slides: Running Effective Meetings.pdf', url: '#' },
        { name: 'Pre-Session Preparation Checklist.pdf', url: '#' },
      ],
    },
  },
  {
    id: 'CRS-VC-002',
    code: 'VC-HSE-002',
    title: 'Online Webinar: HACCP 2026 Food Safety Regulation Update',
    category: 'Compliance & Ethics',
    domain: 'Virtual Live Classroom',
    thumbnail: virtualClassCourseImage,
    imageUrl: virtualClassCourseImage,
    milestoneImage: virtualClassCourseImage,
    deliveryType: 'ONLINE_ELEARNING',
    onlineClassType: 'VIRTUAL_CLASS',
    targetLevel: '6',
    targetLevelTitle: `Level 6: ${levelTitle('6')}`,
    modality: 'VIRTUAL_LIVE_CLASS',
    format: 'Zoom Live Class',
    platformSource: null,
    courseType: 'MANDATORY',
    estimatedHours: '1.5h',
    passingScore: null,
    published: true,
    trainerId: trainerThanhUser.userId,
    trainerName: trainerThanhUser.fullName,
    venue: null, venueId: null, scheduleDate: null, scheduleTime: null,
    maxCapacity: 100,
    description: 'Online Zoom webinar covering the latest HACCP 2026 regulation updates for all Fresh Food division staff. Completion = full attendance, with no end-of-course test.',
    prerequisites: [],
    configuration: {
      assessmentEnabled: false, maxAttempts: 0, passingScorePercent: 0, certificateEnabled: true,
      questionBankSize: 0, questionsPerAttempt: 0, version: 'v1.0',
      lastReviewedBy: 'Vu Duc Thanh (HSE Trainer)', lastReviewedDate: '2026-08-12',
      changelog: [{ version: 'v1.0', date: '2026-08-12', reviewer: 'Vu Duc Thanh (HSE Trainer)', note: 'Seeds the HACCP 2026 online webinar.' }],
    },
    assignment: {
      assignmentType: 'LEVEL', targetBusinessUnitId: null, targetDivisionId: null, targetLevel: '6',
      assignedDate: '2026-08-12', dueDate: '2026-09-20', assignedBy: 'Sarah Nguyen (L&OD Admin)',
    },
    modules: [],
    questionBank: [],
    virtualMeeting: {
      platform: 'ZOOM',
      meetingUrl: 'https://zoom.us/j/8842150079?pwd=mmvn-vc002',
      meetingId: '884 215 0079',
      passcode: 'HACCP26',
      instructorId: trainerThanhUser.userId,
      instructorName: trainerThanhUser.fullName,
      instructorTitle: trainerThanhUser.position,
      scheduleDate: '2026-09-10',
      scheduleTime: '09:00 - 10:30 (1.5 hours)',
      maxCapacity: 100,
      instructions: 'Download the attached HACCP 2026 regulation material before the session. Bring real questions from your counter to discuss directly with the trainer.',
      status: 'UPCOMING',
      recordingUrl: '',
      materials: [
        { name: 'HACCP 2026 Regulations (Updated).pdf', url: '#' },
      ],
    },
  },
);

// Sample enrollments for the 2 Virtual Classes above, to give real illustrative data
// the learner experience. Pick learners whose level matches the course target
// each course (Level 4 / Level 6) — not currentUser (Minh Tran, Level 7)
// because it would break the "no self-enrollment above level" rule (the verify script blocks it).
const leadershipLevel4Learner = demoUsers.find((u) => u.level === '4' && normalizeRole(u.role) === 'learner');
if (leadershipLevel4Learner && generated100EnrollmentMatrix[leadershipLevel4Learner.userId]) {
  generated100EnrollmentMatrix[leadershipLevel4Learner.userId]['CRS-VC-001'] = {
    status: 'NOT_STARTED', progressPercent: 0, score: null, attemptsCount: 0, completedAt: null, dueDate: null,
  };
}
const hseLevel6Learner = demoUsers.find((u) => u.level === '6' && normalizeRole(u.role) === 'learner');
if (hseLevel6Learner && generated100EnrollmentMatrix[hseLevel6Learner.userId]) {
  generated100EnrollmentMatrix[hseLevel6Learner.userId]['CRS-VC-002'] = {
    status: 'NOT_STARTED', progressPercent: 0, score: null, attemptsCount: 0, completedAt: null, dueDate: '2026-09-20',
  };
}

// Course versioning (see resolveCourseView/publishNewCourseVersion below)
// below): every course (100 original + 22 gap-fill + 2 Virtual Class) must have
// currentVersion/versions{} ready — no course has ever been through "Publish
// New Version" yet, so versions{} is empty (no old version has been frozen).
courses.forEach((c) => {
  if (!c.currentVersion) c.currentVersion = c.version || 'v1.0';
  if (!c.versions) c.versions = {};
});

// ---------------------------------------------------------------------------
// Standardized category + date-driven lifecycle status (Draft/Upcoming/Open/Closed):
// every course is assigned categories[] (multi-domain, with category kept as
// categories[0] for backward compatibility) plus startDate/endDate, spread deterministically
// (no Math.random, so it stays stable across reloads) across all 4 lifecycle
// lifecycle states — including forcing 2 CLOSED courses with real enrollments (1 completed,
// 1 in progress) to exercise the learner display rules for closed courses.
// Xem computeLifecycleStatus() trong src/utils/courseCatalog.js.
const LIFECYCLE_TODAY = new Date('2026-08-26');
const FORCE_CLOSED_COURSE_IDS = new Set(['CRS-FSH-002', 'CRS-HSE-019']);
function isoPlusDays(base, days) {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}
const LIFECYCLE_BUCKET_CYCLE = [
  'DRAFT', 'UPCOMING', 'UPCOMING', 'CLOSED', 'CLOSED', 'OPEN', 'OPEN', 'OPEN', 'OPEN', 'OPEN',
  'OPEN', 'OPEN', 'OPEN', 'OPEN', 'OPEN', 'OPEN', 'OPEN', 'OPEN', 'OPEN', 'OPEN',
];
courses.forEach((c, i) => {
  c.category = canonicalizeCategory(c.category);
  c.categories = [c.category];

  const bucket = FORCE_CLOSED_COURSE_IDS.has(c.id) ? 'CLOSED' : LIFECYCLE_BUCKET_CYCLE[i % LIFECYCLE_BUCKET_CYCLE.length];
  if (bucket === 'DRAFT') {
    c.status = 'DRAFT';
    c.startDate = isoPlusDays(LIFECYCLE_TODAY, 20 + (i % 10));
    c.endDate = isoPlusDays(LIFECYCLE_TODAY, 110 + (i % 10));
  } else {
    c.status = 'PUBLISHED';
    if (bucket === 'UPCOMING') {
      c.startDate = isoPlusDays(LIFECYCLE_TODAY, 10 + (i % 15));
      c.endDate = isoPlusDays(LIFECYCLE_TODAY, 100 + (i % 15));
    } else if (bucket === 'CLOSED') {
      c.startDate = isoPlusDays(LIFECYCLE_TODAY, -120 - (i % 20));
      c.endDate = isoPlusDays(LIFECYCLE_TODAY, -10 - (i % 20));
    } else {
      c.startDate = isoPlusDays(LIFECYCLE_TODAY, -60 - (i % 20));
      c.endDate = isoPlusDays(LIFECYCLE_TODAY, 60 + (i % 20));
    }
  }
});

// ---------------------------------------------------------------------------
// Curriculum: a bundle of several self-paced E-Learning courses into one
// roadmap has the structure Curriculum -> Courses -> Modules -> Lessons. It only references
// real courseIds (without copying modules/lessons back) — only the courses
// deliveryType ONLINE_ELEARNING and onlineClassType other than VIRTUAL_CLASS.
// ---------------------------------------------------------------------------
export const curricula = [
  {
    id: 'CUR-FSH-FOUNDATIONS',
    title: 'Food Safety Foundation Program',
    description: 'E-Learning curriculum bundling every mandatory food safety & hygiene course for all Fresh Food division staff.',
    category: 'Food Safety & Hygiene',
    courseIds: ['CRS-FSH-001', 'CRS-FSH-003', 'CRS-FSH-004', 'CRS-FSH-005'],
    status: 'PUBLISHED',
    createdBy: userAdminUser.userId,
    createdAt: '2026-07-01',
    updatedAt: '2026-07-01',
    assignments: [
      {
        id: 'asg-fsh-1',
        assignmentType: 'DEPARTMENT',
        targetId: 'dept-ppf',
        targetLabel: 'Fresh Food Operations',
        assignedBy: userAdminUser.userId,
        assignedAt: '2026-07-01',
        dueDate: '2026-09-30',
      },
      {
        id: 'asg-fsh-2',
        assignmentType: 'USER',
        targetId: 'USR-1042',
        targetLabel: 'Minh Tran (MMVN-1042 · Lvl 7 · Bakery Section)',
        assignedBy: userAdminUser.userId,
        assignedAt: '2026-07-01',
        dueDate: '2026-09-30',
      },
    ],
  },
  {
    id: 'CUR-LEAD-TRACK',
    title: 'Leadership Competency Development Roadmap',
    description: 'E-Learning curriculum for middle management: coaching skills, feedback, strategic thinking and change management.',
    category: 'Leadership & Management',
    courseIds: ['CRS-LEAD-049', 'CRS-LEAD-050', 'CRS-LEAD-051', 'CRS-LEAD-052'],
    status: 'PUBLISHED',
    createdBy: userAdminUser.userId,
    createdAt: '2026-07-05',
    updatedAt: '2026-07-05',
    assignments: [
      {
        id: 'asg-lead-1',
        assignmentType: 'ROLE',
        targetId: 'manager',
        targetLabel: 'Line Manager (middle management, Level 4-5)',
        assignedBy: userAdminUser.userId,
        assignedAt: '2026-07-05',
        dueDate: '2026-10-15',
      },
      {
        id: 'asg-lead-2',
        assignmentType: 'LEVEL',
        targetId: '4',
        targetLabel: 'Level 4 - Senior Supervisor / Section Manager',
        assignedBy: userAdminUser.userId,
        assignedAt: '2026-07-05',
        dueDate: '2026-10-15',
      },
    ],
  },
  {
    id: 'CUR-ISA-SECURITY',
    title: 'Enterprise Information Security Curriculum',
    description: 'Company-wide mandatory E-Learning curriculum on cybersecurity awareness and customer data protection.',
    category: 'Information Security',
    courseIds: ['CRS-ISA-011', 'CRS-ISA-012', 'CRS-ISA-013'],
    status: 'PUBLISHED',
    createdBy: userAdminUser.userId,
    createdAt: '2026-07-10',
    updatedAt: '2026-07-10',
    assignments: [
      {
        id: 'asg-isa-1',
        assignmentType: 'BUSINESS_UNIT',
        targetId: 'bu-mmvn',
        targetLabel: 'MM Mega Market Vietnam (Enterprise-Wide)',
        assignedBy: userAdminUser.userId,
        assignedAt: '2026-07-10',
        dueDate: '2026-09-15',
      },
    ],
  },
  {
    id: 'CUR-SCM-OPS',
    title: 'Supply Chain & Warehouse Operations Curriculum',
    description: 'E-Learning curriculum for Supply Chain division staff: forklift safety, warehousing, fleet management.',
    category: 'Supply Chain & Logistics',
    courseIds: ['CRS-SCM-059', 'CRS-SCM-060', 'CRS-SCM-061'],
    status: 'DRAFT',
    createdBy: userAdminUser.userId,
    createdAt: '2026-08-01',
    updatedAt: '2026-08-01',
    assignments: [
      {
        id: 'asg-scm-1',
        assignmentType: 'DIVISION',
        targetId: 'div-scm',
        targetLabel: 'SCM - Supply Chain Management',
        assignedBy: userAdminUser.userId,
        assignedAt: '2026-08-01',
        dueDate: '2026-11-30',
      },
    ],
  },
  {
    id: 'CUR-ETHIC-COMPLIANCE',
    title: 'Corporate Compliance & Ethics Curriculum',
    description: 'Mandatory E-Learning curriculum: code of conduct, anti-corruption, and fair competition legal requirements.',
    category: 'Compliance & Ethics',
    courseIds: ['CRS-ETHIC-081', 'CRS-ETHIC-082', 'CRS-ETHIC-083'],
    status: 'PUBLISHED',
    createdBy: userAdminUser.userId,
    createdAt: '2026-08-05',
    updatedAt: '2026-08-05',
    assignments: [
      {
        id: 'asg-ethic-1',
        assignmentType: 'BUSINESS_UNIT',
        targetId: 'bu-mmvn',
        targetLabel: 'MM Mega Market Vietnam (Enterprise-Wide)',
        assignedBy: userAdminUser.userId,
        assignedAt: '2026-08-05',
        dueDate: '2026-09-25',
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Lecture Format Standardization: normalizes every lesson
// lesson onto the 5 standard formats — SCORM, VIDEO, PDF, PPT, EXTERNAL_LINK
// (Udemy/LinkedIn Learning/Coursera/YouTube/Other) — replacing the old lessonType
// scattered types (DOCUMENT, SCRIPT, IMAGE, TEXT) AND replacing the way course.modality
// (SCORM_PACKAGE/PPT_PRESENTATION/EXTERNAL_PLATFORM/YOUTUBE_LINK) used to override
// lessonType at the Lesson Player layer. From now on lesson.lessonType is the SINGLE SOURCE
// decides which Player is shown — LessonPlayer no longer reads course.modality.
// ASSESSMENT is not one of these 5 formats (it is a standalone competency gateway
// at course/version level, see course.questionBank) so it is kept separate.
const LEGACY_LESSON_TYPE_MAP = { DOCUMENT: 'PDF', SCRIPT: 'PDF', IMAGE: 'PPT', TEXT: 'PPT' };
const COURSE_MODALITY_LESSON_OVERRIDE = {
  SCORM_PACKAGE: 'SCORM',
  PPT_PRESENTATION: 'PPT',
  EXTERNAL_PLATFORM: 'EXTERNAL_LINK',
  YOUTUBE_LINK: 'EXTERNAL_LINK',
};
function derivedExternalPlatform(course) {
  if (course.modality === 'YOUTUBE_LINK') return 'YOUTUBE';
  const src = (course.platformSource || '').toLowerCase();
  if (src.includes('linkedin')) return 'LINKEDIN';
  if (src.includes('coursera')) return 'COURSERA';
  if (src.includes('udemy')) return 'UDEMY';
  return 'CUSTOM';
}
courses.forEach((course) => {
  const override = COURSE_MODALITY_LESSON_OVERRIDE[course.modality];
  (course.modules || []).forEach((m) => {
    (m.lessons || []).forEach((lesson) => {
      if (lesson.lessonType === 'ASSESSMENT') return;
      const mapped = override || LEGACY_LESSON_TYPE_MAP[lesson.lessonType] || lesson.lessonType;
      if (mapped === lesson.lessonType && !override) return;
      lesson.lessonType = mapped;
      if (mapped === 'EXTERNAL_LINK') {
        lesson.content = {
          platform: derivedExternalPlatform(course),
          url: lesson.content?.url || course.content?.youtubeUrl || '',
        };
      } else if (mapped === 'PDF' && !lesson.content?.url && !lesson.content?.fileName) {
        lesson.content = { url: '', fileName: null, fileType: null };
      } else if ((mapped === 'PPT' || mapped === 'SCORM') && lesson.content?.text) {
        // PPT/SCORM use a static illustrative slide deck and do not need the old text content.
        lesson.content = {};
      }
    });
  });
});

// ---------------------------------------------------------------------------
// Multi-Persona Synchronized User Enrollments Matrix
// Guarantees all 100 roles have fully coherent, unified data (Completed, In Progress, Not Started, Overdue, Failed)
// ---------------------------------------------------------------------------

export const userEnrollmentsMap = generated100EnrollmentMatrix;



export { getCourseAccessControl };

// A learner's enrollment = static HRIS data + the enrollments created during
// the working session (an overlay held by CourseStore, e.g. a level skip just approved).
export function enrollmentsForUser(user, overlay = null) {
  if (!user) return {};
  const base = userEnrollmentsMap[user.userId] || {};
  const extra = (overlay && overlay[user.userId]) || {};
  return { ...base, ...extra };
}

// Returns true when `course` is enrolled for `user`
export function isCourseAssignedToUser(course, user, overlay = null) {
  if (!user || !course) return false;
  return Boolean(enrollmentsForUser(user, overlay)[course.id]);
}

// Returns true when `user` is targeted by any assignment in `course`
export function isUserAssignedToCourse(course, user, customGroups = []) {
  if (!user || !course) return false;
  const asgList = course.assignments || (course.assignment ? [course.assignment] : []);
  return asgList.some((a) => {
    if (a.assignmentType === 'USER' && (a.targetId === user.userId || a.targetId === user.employeeCode)) return true;
    if (a.assignmentType === 'SUBDEPARTMENT' && (user.subDepartmentId === a.targetId || user.subDepartmentCode === a.targetId)) return true;
    if (a.assignmentType === 'DEPARTMENT' && (user.departmentId === a.targetId || user.departmentCode === a.targetId)) return true;
    if (a.assignmentType === 'DIVISION' && (user.divisionId === a.targetId || user.divisionCode === a.targetId)) return true;
    if (a.assignmentType === 'STORE' && (user.storeId === a.targetId || user.storeCode === a.targetId)) return true;
    if (a.assignmentType === 'BUSINESS_UNIT' && (user.businessUnitId === a.targetId || user.businessUnitCode === a.targetId)) return true;
    if (a.assignmentType === 'LEVEL' && String(user.level) === String(a.targetId)) return true;
    return false;
  });
}

// "My Learning" list for a given user: dynamically merges user-specific enrollments and direct assignments
export function myLearningCourses(courseList, user, overlay = null) {
  if (!user) return [];
  const enrollments = enrollmentsForUser(user, overlay);
  return (courseList || [])
    .filter((c) => {
      if (enrollments[c.id]) return true;
      const asgList = c.assignments || (c.assignment ? [c.assignment] : []);
      return asgList.some((a) => {
        if (a.assignmentType === 'USER' && (a.targetId === user.userId || a.targetId === user.employeeCode)) return true;
        if (a.assignmentType === 'SUBDEPARTMENT' && (user.subDepartmentId === a.targetId || user.subDepartmentCode === a.targetId)) return true;
        if (a.assignmentType === 'DEPARTMENT' && (user.departmentId === a.targetId || user.departmentCode === a.targetId)) return true;
        if (a.assignmentType === 'DIVISION' && (user.divisionId === a.targetId || user.divisionCode === a.targetId)) return true;
        if (a.assignmentType === 'STORE' && (user.storeId === a.targetId || user.storeCode === a.targetId)) return true;
        if (a.assignmentType === 'BUSINESS_UNIT' && (user.businessUnitId === a.targetId || user.businessUnitCode === a.targetId)) return true;
        if (a.assignmentType === 'LEVEL' && String(user.level) === String(a.targetId)) return true;
        return false;
      });
    })
    .map((c) => {
      const userEnrollment = enrollments[c.id];
      const asgList = c.assignments || (c.assignment ? [c.assignment] : []);
      const matchedAsg = asgList.find((a) => {
        if (a.assignmentType === 'USER' && (a.targetId === user.userId || a.targetId === user.employeeCode)) return true;
        if (a.assignmentType === 'SUBDEPARTMENT' && (user.subDepartmentId === a.targetId || user.subDepartmentCode === a.targetId)) return true;
        if (a.assignmentType === 'DEPARTMENT' && (user.departmentId === a.targetId || user.departmentCode === a.targetId)) return true;
        if (a.assignmentType === 'DIVISION' && (user.divisionId === a.targetId || user.divisionCode === a.targetId)) return true;
        if (a.assignmentType === 'STORE' && (user.storeId === a.targetId || user.storeCode === a.targetId)) return true;
        if (a.assignmentType === 'BUSINESS_UNIT' && (user.businessUnitId === a.targetId || user.businessUnitCode === a.targetId)) return true;
        if (a.assignmentType === 'LEVEL' && String(user.level) === String(a.targetId)) return true;
        return false;
      });

      const fallbackEnrollment = matchedAsg ? {
        status: 'NOT_STARTED',
        progressPercent: 0,
        score: null,
        isMandatory: true,
        dueDate: matchedAsg.dueDate || null,
        enrolledAt: matchedAsg.assignedAt || new Date().toISOString().slice(0, 10),
        enrolledVersion: c.currentVersion || 'v1.0',
        enrolledVia: 'MANDATORY_ASSIGNMENT',
      } : {};

      return {
        ...c,
        courseType: matchedAsg ? 'MANDATORY' : c.courseType,
        isDirectlyAssigned: Boolean(matchedAsg),
        enrollment: {
          ...(c.enrollment || {}),
          ...fallbackEnrollment,
          ...userEnrollment,
        },
      };
    });
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

// Learning hours actually invested: each course's estimatedHours (e.g. "3h",
// "1.5h remaining") weighted by the learner's real progress on it, summed
// across every course in their "My Learning" list.
export function totalLearningHours(courseList, user, overlay = null) {
  return myLearningCourses(courseList, user, overlay).reduce((sum, c) => {
    const hours = parseFloat(c.estimatedHours) || 0;
    const progress = (c.enrollment.progressPercent || 0) / 100;
    return sum + hours * progress;
  }, 0);
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
    categories: [],
    startDate: new Date().toISOString().slice(0, 10),
    endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    thumbnail: COURSE_IMAGE_PRESETS[8]?.url || 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?auto=format&fit=crop&w=600&q=80',
    imageUrl: COURSE_IMAGE_PRESETS[8]?.url || 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?auto=format&fit=crop&w=600&q=80',
    milestoneImage: COURSE_IMAGE_PRESETS[8]?.url || 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?auto=format&fit=crop&w=600&q=80',
    targetLevel: '',
    targetLevels: [],
    targetLevelTitle: '',
    deliveryType: 'ONLINE_ELEARNING', // 'ONLINE_ELEARNING' | 'IN_PERSON_CLASSROOM'
    // Only meaningful when deliveryType is ONLINE_ELEARNING: 'E_LEARNING' (self-paced
    // through Module/Lesson/Quiz, the current mechanism) or 'VIRTUAL_CLASS' (a class
    // live online over Zoom/Teams/Meet with a trainer hosting).
    onlineClassType: 'E_LEARNING',
    // Course versioning: currentVersion points at the live version (read/written
    // directly through modules/configuration below); versions{} stores snapshots of the
    // the OLD replaced version (frozen permanently at the moment of the next Publish
    // Publish) so learners who completed or are part-way through it are not
    // affected by later edits. See resolveCourseView()/publishNewCourseVersion().
    currentVersion: 'v1.0',
    versions: {},
    courseType: 'OPTIONAL',
    status: 'DRAFT',
    modality: 'SCORM_PACKAGE',
    format: 'SCORM 2004',
    version: 'v1.0',
    versionHistory: [{
      version: 'v1.0', updatedBy: adminUser.fullName, updatedAt: new Date().toISOString().slice(0, 10), note: 'Initial draft created.',
    }],
    estimatedHours: '2.0h',
    createdBy: adminUser.userId,
    publishedAt: null,
    // Real employee IDs (not the old trainersDirectory) so they stay in sync with
    // teachingEligibleUsers() — where the trainer is chosen when creating an in-person course.
    trainerId: trainerHungUser.userId,
    trainerName: trainerHungUser.fullName,
    venueId: 'lab-ap-fresh',
    venue: 'Fresh Food & Bakery Practical Lab (MM An Phu)',
    scheduleDate: '2026-08-28',
    scheduleTime: '08:30 - 11:30 (3.0 hours)',
    maxCapacity: 25,
    enrolledStudents: [],
    prerequisites: [],
    syllabus: [
      { step: 'Part 1: Introduction & Safety Preparation (30 minutes)', detail: 'Briefing the safety rules and course objectives, and checking the equipment.' },
      { step: 'Part 2: Guided Technique & Live Practice (90 minutes)', detail: 'Practising the standard technique per the SOP.' },
      { step: 'Part 3: Result Assessment & Q&A (60 minutes)', detail: 'Wrapping up the lesson, testing the skills and completing the attendance sheet.' },
    ],
    materials: [
      { id: 'mat-1', name: 'Standard Operating Guide (PDF)', type: 'PDF', size: '2.4 MB', url: '#' },
      { id: 'mat-2', name: 'Practical Lecture Slides & Scenarios (PPT)', type: 'PPT', size: '6.8 MB', url: '#' },
    ],
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
      validityPeriodMonths: 12,
      recertificationWarningDays: 30,
      recertificationMethod: 'RETAKE_FULL_COURSE',
      completionRule: 'Complete all required lessons.',
    },

    assignment: null,
    modules: [],
    enrollment: null,
    assessmentAttempts: [],
    questionBank: [],
    // Only filled in / used when onlineClassType === 'VIRTUAL_CLASS'.
    virtualMeeting: {
      platform: 'TEAMS', // 'TEAMS' | 'ZOOM' | 'MEET' | 'WEBEX' | 'CUSTOM'
      meetingUrl: '',
      meetingId: '',
      passcode: '',
      instructorId: '',
      instructorName: '',
      instructorTitle: '',
      scheduleDate: '',
      scheduleTime: '',
      maxCapacity: 50,
      instructions: '',
      status: 'UPCOMING', // 'UPCOMING' | 'COMPLETED'
      recordingUrl: '',
      materials: [],
    },
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

// Computes the next version tag: v1.0 -> v2.0 -> v3.0 -> ... (no cap on the number
// of versions, each Publish increments by exactly one integer step).
export function nextMajorVersion(v) {
  const m = /^v(\d+)/.exec(v || 'v1.0');
  const n = m ? Number(m[1]) : 1;
  return `v${n + 1}.0`;
}

// Returns the content "view" of a course (modules/configuration/modality/format)
// matching the version the learner actually enrolled in (enrolledVersion), NOT
// always the newest version:
//   - If enrolledVersion equals currentVersion (or is absent) -> return
//     course as it is today (reading course.modules directly — the live version).
//   - If enrolledVersion is an OLD version already replaced by a Publish -> return
//     the frozen snapshot in course.versions[enrolledVersion], so people
//     who completed or are part-way through that version are unaffected by later
//     edits the Admin later makes on the new version.
export function resolveCourseView(course, enrolledVersion) {
  if (!course) return course;
  const current = course.currentVersion || course.version || 'v1.0';
  // Enrollments seeded from the original HRIS matrix (100 sample learners) are created before
  // the versioning feature existed, so they have no enrolledVersion — by definition
  // definition those enrollments can only have arisen while the course was still at v1.0
  // (never having published a version), so it defaults to 'v1.0' rather than being treated as
  // "same as the current version" (so new content is never leaked to them by accident).
  const resolvedEnrolledVersion = enrolledVersion || 'v1.0';
  if (resolvedEnrolledVersion === current) return course;
  const snap = course.versions && course.versions[resolvedEnrolledVersion];
  if (!snap) return course;
  return {
    ...course,
    modules: snap.modules,
    configuration: { ...course.configuration, ...snap.configuration },
    modality: snap.modality || course.modality,
    format: snap.format || course.format,
    version: snap.version || resolvedEnrolledVersion,
    isArchivedVersionView: true,
  };
}

// `module.lessons[].status` in the source course data is the SHARED status of
// course (shared by every learner, not split per user), whereas
// enrollment.status/progressPercent is the REAL enrollment of each individual
// learner (taken from userEnrollmentsMap — the 100-employee HRIS matrix, generated independently of
// course.modules). These two sources do not line up by themselves for pre-existing courses
// pre-existing progress (seed data): without re-deriving it, a Completed course
// 100% would still show every lesson as "Not started", and the final exam would also be
// treated as not yet unlocked even with a certificate issued. This function re-normalizes
// modules to MATCH the real enrollment before feeding any screen
// display OR used to assign status (LearnerCourseDetail, LessonPlayer,
// AssessmentPlayer) — it must be called in ALL 3 places to keep the view page
// the detail page and the real study/exam pages.
export function deriveLessonStatuses(modules, enrollment) {
  if (!modules) return modules;
  const status = enrollment?.status;
  if (!enrollment || status === 'NOT_STARTED') {
    return modules.map((m) => ({
      ...m,
      lessons: m.lessons.map((l) => (l.lessonType === 'ASSESSMENT' ? l : { ...l, status: 'NOT_STARTED' })),
    }));
  }
  if (status === 'COMPLETED') {
    return modules.map((m) => ({
      ...m,
      lessons: m.lessons.map((l) => ({ ...l, status: 'COMPLETED' })),
    }));
  }
  // IN_PROGRESS / OVERDUE / FAILED: mark exactly the matching number of lessons complete
  // against the recorded progressPercent, the next lesson mid-progress, and the rest
  // not started.
  const flat = modules.flatMap((m) => m.lessons.filter((l) => l.lessonType !== 'ASSESSMENT'));
  const exactPosition = flat.length ? (flat.length * (enrollment.progressPercent || 0)) / 100 : 0;
  const completedCount = Math.round(exactPosition);
  // The fraction between the real position (before rounding) and the lessons finished: used as the partial %
  // of the lesson actually in progress, so it shows "45% complete" instead of always
  // "0% complete" on the lesson in progress — which looks more like real data.
  const inProgressPercent = Math.round((exactPosition - Math.floor(exactPosition)) * 100);
  let seen = 0;
  return modules.map((m) => ({
    ...m,
    lessons: m.lessons.map((l) => {
      if (l.lessonType === 'ASSESSMENT') return l;
      seen += 1;
      if (seen <= completedCount) return { ...l, status: 'COMPLETED' };
      if (seen === completedCount + 1) return { ...l, status: 'IN_PROGRESS', progressPercent: inProgressPercent || 10 };
      return { ...l, status: 'NOT_STARTED' };
    }),
  }));
}

// The same data gap as deriveLessonStatuses(), but for exam history:
// course.assessmentAttempts always starts empty on the template (it is only written for real
// when the learner takes the exam in the current session via AssessmentPlayer), so a
// course seeded with a COMPLETED enrollment (and an issued certificate) would still show "never
// taken" unless a matching passing attempt is derived when the enrollment says it is
// completed. Extra records are synthesized only when genuinely missing — never touching the
// real recorded exam attempts.
export function deriveAssessmentAttempts(attempts, enrollment, configuration) {
  const real = attempts || [];
  if (real.length > 0 || !configuration?.assessmentEnabled) return real;
  if (enrollment?.status !== 'COMPLETED') return real;
  return [{
    n: 1,
    score: enrollment.score || configuration.passingScorePercent || 80,
    passed: true,
    answered: configuration.questionsPerAttempt || 0,
    submittedAt: `${enrollment.completedAt || '2026-07-15'}T09:00:00.000Z`,
  }];
}

// Marks one lesson's progress and returns a new, immutable course object with
// enrollment recomputed — pass the result straight to CourseStore.updateCourse.
export function applyLessonProgress(course, lessonId, fields) {
  const next = cloneCourse(course);
  // Auto-generated courses carry no enrollment; enrollments are loaded from
  // the HRIS matrix or the CourseStore overlay, so a safe default is needed here.
  if (!next.enrollment) next.enrollment = { status: 'IN_PROGRESS', progressPercent: 0, score: null, attemptsCount: 0, completedAt: null };
  if (!next.assessmentAttempts) next.assessmentAttempts = [];
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
  if (!next.enrollment) next.enrollment = { status: 'IN_PROGRESS', progressPercent: 0, score: null, attemptsCount: 0, completedAt: null };
  if (!next.assessmentAttempts) next.assessmentAttempts = [];
  next.assessmentAttempts = [
    ...next.assessmentAttempts,
    { n: next.assessmentAttempts.length + 1, score, passed, answered, submittedAt: new Date().toISOString() },
  ];
  next.enrollment.lastActivityAt = new Date().toISOString().slice(0, 10);
  return recomputeEnrollment(next);
}

// `certificateTemplates` (from CourseStore) is optional — when a course has
// configuration.certificateTemplateId matches a template in the library, and its
// that template's signerName/signerTitle/issuerOrg fields replace the defaults
// on the CertificateModal; the issue date is always taken from enrollment.completedAt of
// each learner (auto-matched to the completion date, unchanged by the template).
export function deriveCertificates(courseList, user, overlay = null, certificateTemplates = []) {
  if (!user) return [];
  const list = myLearningCourses(courseList, user, overlay);
  const derived = list
    .filter((c) => c.enrollment?.status === 'COMPLETED' && c.configuration?.certificateEnabled)
    .map((c) => {
      const attempts = c.assessmentAttempts || [];
      const passingAttempt = [...attempts].reverse().find((a) => a.passed);
      const issueDate = c.enrollment.completedAt || '2025-08-10';
      const validityMonths = c.configuration?.validityPeriodMonths !== undefined ? parseInt(c.configuration.validityPeriodMonths, 10) : 12;
      const isLifetime = validityMonths === 0;

      // Recertification due date: taken from the enrollment (if just retaken) or computed from the cycle
      const validUntil = isLifetime ? null : (c.enrollment.validUntil || (
        c.id === 'CRS-FSH-001' ? '2026-08-15' // Sample scenario: 13 days overdue -> status RECERTIFICATION_REQUIRED
        : c.id === 'CRS-CS-002' ? '2026-09-10' // Sample scenario: 13 days until due -> status DUE_SOON
        : new Date(new Date(issueDate).setFullYear(new Date(issueDate).getFullYear() + (validityMonths / 12 || 1))).toISOString().slice(0, 10)
      ));
      const cleanEmpCode = (user.employeeCode || 'EMP-1042').replace('MMVN-', '');
      const template = (c.configuration?.certificateTemplateId
        ? certificateTemplates.find((t) => t.id === c.configuration.certificateTemplateId)
        : null) || certificateTemplates.find((t) => t.category === c.category || (c.categories && c.categories.includes(t.category))) || certificateTemplates[0] || null;

      return {
        id: `CERT-MMVN-${(c.code || c.id).toUpperCase()}-${cleanEmpCode}`,
        courseId: c.id,
        courseName: c.title,
        courseCode: c.code,
        courseVersion: c.version,
        completionDate: issueDate,
        issueDate: issueDate,
        validUntil: validUntil,
        isLifetime: isLifetime,
        validityPeriodMonths: validityMonths,
        isCompliance: c.courseType === 'MANDATORY',
        score: c.enrollment.score || (passingAttempt ? passingAttempt.score : 90),
        issuer: template?.issuerOrg || 'MM Mega Market Vietnam - Learning & Organizational Development',
        verificationUrl: `https://megalearn.mmvietnam.com/verify/CERT-MMVN-${c.code || 'LMS'}-${cleanEmpCode}`,
        recipientName: user.fullName,
        recipientPosition: user.position,
        department: orgPathLabel(user),
        template,
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

const WEEKDAY_LABELS_VI = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sunday'];

/**
 * Total study hours grouped by DAY OF WEEK (Monday -> Sunday), computed from every
 * real timeSpent + timestamp in getUserLearningHistory — not limited to one specific
 * calendar week, because the timestamps in the mock data are fixed dates (2026) that
 * do not line up with the real system clock during a demo. The result answers
 * "which weekday does this learner tend to study on", still 100% real data,
 * never invented, and never empty for a persona that has logs (including the
 * fallback to USR-1042 for personas without their own logs).
 */
export function weeklyStudyHours(user) {
  const logs = getUserLearningHistory(user);
  const hoursByDay = [0, 0, 0, 0, 0, 0, 0];
  logs.forEach((log) => {
    const ts = new Date(log.timestamp.replace(' ', 'T'));
    const idx = (ts.getDay() + 6) % 7; // 0=Monday .. 6=Sunday
    const minutes = parseInt(log.timeSpent, 10) || 0;
    hoursByDay[idx] += minutes / 60;
  });

  return WEEKDAY_LABELS_VI.map((label, i) => ({ label, value: Math.round(hoursByDay[i] * 10) / 10 }));
}


export const notifications = {
  learnerInbox: [
    { 
      id: 1, 
      type: 'COURSE_ASSIGNED', 
      title: 'New mandatory course assigned',
      titleVi: 'A new mandatory course has been assigned',
      titleEn: 'New mandatory course assigned',
      message: 'Risk Management Awareness has been assigned to your Division, due Sep 15.', 
      messageVi: 'The Risk Management & Compliance course has been assigned to your unit, due 15/09.',
      messageEn: 'Risk Management Awareness has been assigned to your Division, due Sep 15.',
      time: '2h ago',
      timeVi: '2 hours ago',
      timeEn: '2h ago',
      tagVi: 'Mandatory',
      tagEn: 'Mandatory',
      unread: true 
    },
    { 
      id: 2, 
      type: 'DEADLINE_REMINDER', 
      title: 'Due in 12 days', 
      titleVi: 'Due in 12 days',
      titleEn: 'Due in 12 days',
      message: 'Information Security Awareness is due Sep 30.', 
      messageVi: 'The Information Security Awareness course must be completed before 30/09.',
      messageEn: 'Information Security Awareness is due Sep 30.',
      time: '1d ago',
      timeVi: '1 day ago',
      timeEn: '1d ago',
      tagVi: 'Deadline',
      tagEn: 'Deadline',
      unread: true 
    },
    { 
      id: 3, 
      type: 'COURSE_UNFINISHED', 
      title: 'Continue learning', 
      titleVi: 'Reminder to continue learning',
      titleEn: 'Continue learning reminder',
      message: 'You have not continued Corporate Orientation in 6 days.', 
      messageVi: 'You have not continued the Corporate Onboarding course for 6 days.',
      messageEn: 'You have not continued Corporate Orientation in 6 days.',
      time: '5d ago',
      timeVi: '5 days ago',
      timeEn: '5d ago',
      tagVi: 'Progress',
      tagEn: 'Progress',
      unread: false 
    },
  ],
  managerAlerts: [
    { id: 1, type: 'EMPLOYEE_OVERDUE', employee: 'Lisa Wang', message: 'Risk Management Awareness is overdue.', messageVi: 'Lisa Wang did not complete the Risk Management course on time.', time: '3h ago', timeVi: '3 hours ago' },
    { id: 2, type: 'EMPLOYEE_INACTIVE', employee: 'John Doe', message: 'No learning activity in 15 days.', messageVi: 'John Doe has had no learning activity for 15 days.', time: '1d ago', timeVi: '1 day ago' },
    { id: 3, type: 'ASSESSMENT_FAILED', employee: 'Mike Chen', message: 'Failed Information Security Awareness after 3 attempts.', messageVi: 'Mike Chen has failed the Information Security test after 3 attempts.', time: '2d ago', timeVi: '2 days ago' },
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
    relatedCourseId: 'CRS-FSH-001',
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
    relatedCourseId: 'CRS-ISA-011',
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
    relatedCourseId: 'CRS-HSE-019',
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
    relatedCourseId: 'CRS-CSERV-087',
  },
];

export const aiRecommendations = [
  {
    courseId: 'CRS-FSH-001',
    title: 'Food Safety & Hygiene Standards (HACCP)',
    reason: 'Recommended by AI based on your Bakery Associate role and Fresh Food SOP completion history.',
    confidence: 96,
    matchSkills: ['Microbiology Control', 'Temperature Storage', 'HACCP Store Audit'],
    estimatedHours: '3.5h',
    badgeTone: 'sage',
  },
  {
    courseId: 'CRS-ISA-011',
    title: 'Information Security Awareness',
    reason: 'Mandatory Compliance Training — AI reminder to complete your remaining 35% before Sep 30 deadline.',
    confidence: 99,
    matchSkills: ['Phishing Awareness', 'Password Security', 'POS Data Safety'],
    estimatedHours: '1.5h remaining',
    badgeTone: 'amber',
  },
  {
    courseId: 'CRS-CSERV-087',
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
    title: 'Store Practical Lab: Food Safety Standards & Commercial Bakery Deck Operations',
    category: 'Fresh Food Practice',
    modality: 'OFFLINE_STORE',
    trainerId: trainerHungUser.userId,
    trainerName: trainerHungUser.fullName,
    trainerTitle: 'Master Trainer (L&OD)',
    coTrainerIds: [userAdminUser.userId, trainerThanhUser.userId],
    coTrainerNames: [userAdminUser.fullName, trainerThanhUser.fullName],
    coTrainers: [
      { id: userAdminUser.userId, userId: userAdminUser.userId, fullName: userAdminUser.fullName, name: userAdminUser.fullName, role: 'useradmin', title: 'HR Master Data & User Admin' },
      { id: trainerThanhUser.userId, userId: trainerThanhUser.userId, fullName: trainerThanhUser.fullName, name: trainerThanhUser.fullName, role: 'trainer', title: 'Loss Prevention & HSE Director' },
    ],
    trainerRating: 4.9,
    date: '2026-08-28',
    time: '08:30 - 11:30 (3.0 hours)',
    venueId: 'lab-ap-fresh',
    venue: 'Fresh Food & Bakery Lab - MM Mega Market An Phu (Flagship)',
    maxCapacity: 25,
    enrolledCount: 21,
    status: 'UPCOMING',
    isEnrolled: true,
    attendanceStatus: 'PENDING_CHECKIN',
    qrToken: 'MMVN-QR-ILT001-20260828',
    description: 'Hands-on sanitation and sterilization of dough mixers, oven pressure calibration, and mechanical jam handling compliant with Gold HACCP standards.',
    prerequisiteCourse: 'Food Safety & Hygiene Standards (HACCP)',
    prerequisiteCourseId: 'CRS-FSH-001',
    syllabus: [
      { step: 'Part 1: Preparation & Hygiene Safety Briefing (30 minutes)', detail: 'Gold HACCP hygiene rules and core temperature checks on the chiller holding fresh ingredients.' },
      { step: 'Part 2: Hands-On Oven Operation In The Workshop (90 minutes)', detail: 'Operating the industrial deck oven, kneading dough & calibrating French bread baking recipes.' },
      { step: 'Part 3: Evaluating The Bake & Sanitizing The Equipment (60 minutes)', detail: 'Checking the crispness of the bread, sanitizing the deck oven & finalizing the attendance sheet.' },
    ],
    materials: [
      { id: 'mat-fsh-1', name: 'SOP-OMD-04B: Deck Oven Operating Guide (PDF)', type: 'PDF', size: '2.4 MB', url: '#' },
      { id: 'mat-fsh-2', name: 'Lecture Slides: Controlling Cross-Contamination Risk (PPT)', type: 'PPT', size: '8.1 MB', url: '#' },
      { id: 'mat-fsh-3', name: 'Food Safety Hygiene Standard Checklist Form (PDF)', type: 'PDF', size: '1.1 MB', url: '#' },
    ],
    enrolledStudents: [
      { id: 'MMVN-1042', name: 'Minh Tran', position: 'Bakery Specialist', store: 'MM An Phu', attendance: 'CONFIRMED' },
      { id: 'MMVN-1078', name: 'Sarah Johnson', position: 'Pastry Chef Associate', store: 'MM An Phu', attendance: 'CONFIRMED' },
      { id: 'MMVN-2041', name: 'Quoc Bao', position: 'Store Fresh Associate', store: 'MM An Phu', attendance: 'PENDING' },
      { id: 'MMVN-2055', name: 'Nguyen Van An', position: 'Bakery Assistant', store: 'MM An Phu', attendance: 'CONFIRMED' },
      { id: 'MMVN-2068', name: 'Tran Thi Binh', position: 'Fresh Counter Lead', store: 'MM An Phu', attendance: 'CONFIRMED' },
      { id: 'MMVN-2089', name: 'Le Hoang Nam', position: 'Food Prep Associate', store: 'MM An Phu', attendance: 'ABSENT' },
    ],
  },
  {
    id: 'ilt-002',
    code: 'WS-PCCC-02',
    title: 'Store Emergency Response: Fire Drills, Evacuation & First Aid',
    category: 'Compliance & Safety',
    modality: 'OFFLINE_STORE',
    trainerId: trainerThanhUser.userId,
    trainerName: trainerThanhUser.fullName,
    trainerTitle: 'Loss Prevention & HSE Director',
    coTrainerIds: [hrbpUser.userId],
    coTrainerNames: [hrbpUser.fullName],
    coTrainers: [
      { id: hrbpUser.userId, userId: hrbpUser.userId, fullName: hrbpUser.fullName, name: hrbpUser.fullName, role: 'hrbp', title: 'HR Business Partner Lead' },
    ],
    trainerRating: 4.92,
    date: '2026-09-05',
    time: '14:00 - 17:00 (3.0 hours)',
    venueId: 'lab-tl-fire',
    venue: 'HSE Fire & Emergency Drill Grounds - MM Mega Market Thang Long (Hanoi)',
    maxCapacity: 60,
    enrolledCount: 52,
    status: 'OPEN',
    isEnrolled: false,
    attendanceStatus: 'NOT_REGISTERED',
    qrToken: 'MMVN-QR-ILT002-20260905',
    description: 'Hands-on gas fire suppression, fire blanket deployment, and peak-hour customer evacuation protocols in hypermarkets.',
    prerequisiteCourse: 'Workplace Health, Safety & Environment (HSE)',
    prerequisiteCourseId: 'CRS-HSE-019',
    syllabus: [
      { step: 'Part 1: Identifying Heat Sources & Fire Alarm Levels (45 minutes)', detail: 'Recognizing the 4 fire classes (A, B, C, F) and telling CO2 from ABC powder extinguishers.' },
      { step: 'Part 2: Fire Suppression Drill & Hose Operation On The Practice Ground (75 minutes)', detail: 'Practising pulling the safety pin, aiming the nozzle to extinguish a petrol tray fire and rolling out the pressure hose.' },
      { step: 'Part 3: Customer Evacuation & Basic First Aid Technique (60 minutes)', detail: 'Evacuation guidance for crowded areas, chest-compression CPR and wound dressing.' },
    ],
    materials: [
      { id: 'mat-hse-1', name: 'Fire Safety Handbook & 2026 Store Evacuation Plan (PDF)', type: 'PDF', size: '3.5 MB', url: '#' },
      { id: 'mat-hse-2', name: 'Lecture Slides: Using CO2 Extinguishers & Fire Hoses (PPT)', type: 'PPT', size: '12.0 MB', url: '#' },
      { id: 'mat-hse-3', name: 'Evacuation Route Map & Fire Hose Cabinet Locations By Branch (PDF)', type: 'PDF', size: '4.2 MB', url: '#' },
    ],
    enrolledStudents: [
      { id: 'MMVN-1120', name: 'Carlos Reyes', position: 'Warehouse Associate', store: 'MM Thang Long', attendance: 'CONFIRMED' },
      { id: 'MMVN-1155', name: 'Nguyen Thi Huong', position: 'Floor Supervisor', store: 'MM Thang Long', attendance: 'CONFIRMED' },
      { id: 'MMVN-1188', name: 'Pham Van Long', position: 'Security Guard', store: 'MM Thang Long', attendance: 'CONFIRMED' },
      { id: 'MMVN-1204', name: 'Hoang Van Duc', position: 'Forklift Operator', store: 'MM Thang Long', attendance: 'PENDING' },
    ],
  },
  {
    id: 'ilt-003',
    code: 'WEB-SEC-03',
    title: 'Webinar: POS Terminal Information Security & Anti-Phishing Tactics',
    category: 'Information Security',
    modality: 'ONLINE_WEBINAR',
    trainerId: sysAdminUser.userId,
    trainerName: sysAdminUser.fullName,
    trainerTitle: 'Lead IT Systems Administrator & Cybersecurity Lead',
    coTrainerIds: [userAdminUser.userId],
    coTrainerNames: [userAdminUser.fullName],
    coTrainers: [
      { id: userAdminUser.userId, userId: userAdminUser.userId, fullName: userAdminUser.fullName, name: userAdminUser.fullName, role: 'useradmin', title: 'HR Master Data & User Admin' },
    ],
    trainerRating: 4.83,
    date: '2026-08-15',
    time: '10:00 - 11:30 (1.5 hours)',
    venueId: 'room-ho-dia',
    venue: 'Microsoft Teams Live Webinar (An Phu Head Office Studio)',
    maxCapacity: 200,
    enrolledCount: 184,
    status: 'COMPLETED',
    isEnrolled: true,
    attendanceStatus: 'CHECKED_IN',
    qrToken: 'MMVN-QR-ILT003-COMPLETED',
    description: 'Case analysis of 5 phishing incidents identified in Q3/2026 and immediate POS workstation isolation protocols.',
    prerequisiteCourse: 'Information Security & Data Protection Awareness',
    prerequisiteCourseId: 'CRS-ISA-011',
    syllabus: [
      { step: 'Part 1: Phishing Attack Trends & Partner Email Spoofing (30 minutes)', detail: 'Analyzing phishing emails that impersonate suppliers and request a change of beneficiary bank account.' },
      { step: 'Part 2: Emergency POS Isolation Procedure After A Malware Incident (30 minutes)', detail: 'Unplugging the LAN cable, isolating the POS workstation and reporting the incident to the SOC IT Security hotline.' },
      { step: 'Part 3: Live Q&A & Multiple-Choice Scenario Exercises (30 minutes)', detail: 'Learners take an interactive quiz on MS Teams and get their customer data protection questions answered.' },
    ],
    materials: [
      { id: 'mat-sec-1', name: 'Phishing & Payment Fraud Prevention Guide (PDF)', type: 'PDF', size: '1.8 MB', url: '#' },
      { id: 'mat-sec-2', name: 'Webinar Slides: End-To-End Security For The POS Payment System (PPT)', type: 'PPT', size: '9.4 MB', url: '#' },
    ],
    enrolledStudents: [
      { id: 'MMVN-1042', name: 'Minh Tran', position: 'Bakery Specialist', store: 'MM An Phu', attendance: 'CONFIRMED' },
      { id: 'MMVN-1078', name: 'Sarah Johnson', position: 'Pastry Chef Associate', store: 'MM An Phu', attendance: 'CONFIRMED' },
      { id: 'MMVN-1120', name: 'Carlos Reyes', position: 'Warehouse Associate', store: 'MM Thang Long', attendance: 'CONFIRMED' },
      { id: 'MMVN-1301', name: 'Doan Van Binh', position: 'IT Support Specialist', store: 'MM Head Office', attendance: 'CONFIRMED' },
    ],
  },
  {
    id: 'ilt-004',
    code: 'WS-POS-04',
    title: 'Store Practical Lab: High-Speed POS Checkout & Customer Complaint Handling',
    category: 'Frontline Excellence',
    modality: 'OFFLINE_STORE',
    trainerId: hrbpUser.userId,
    trainerName: hrbpUser.fullName,
    trainerTitle: 'HR Business Partner - Head of People Partnering',
    coTrainerIds: [trainerHungUser.userId],
    coTrainerNames: [trainerHungUser.fullName],
    coTrainers: [
      { id: trainerHungUser.userId, userId: trainerHungUser.userId, fullName: trainerHungUser.fullName, name: trainerHungUser.fullName, role: 'trainer', title: 'Master Trainer (L&OD)' },
    ],
    trainerRating: 4.85,
    date: '2026-09-12',
    time: '09:00 - 12:00 (3.0 hours)',
    venueId: 'lab-ap-pos',
    venue: 'Cashier & Frontline Service Lab - MM Mega Market An Phu',
    maxCapacity: 20,
    enrolledCount: 18,
    status: 'OPEN',
    isEnrolled: false,
    attendanceStatus: 'NOT_REGISTERED',
    qrToken: 'MMVN-QR-ILT004-20260912',
    description: 'High-speed barcode scanning on physical POS units, digital voucher processing, and L.A.S.T customer complaint resolution.',
    prerequisiteCourse: 'Store Operations Excellence & Planogram Compliance',
    prerequisiteCourseId: 'CRS-STOPS-037',
    syllabus: [
      { step: 'Part 1: High-Speed Barcode Scanning Technique & Voucher Handling (60 minutes)', detail: 'Correct ergonomic standing posture, laser scan angle and applying discount vouchers on the POS.' },
      { step: 'Part 2: Applying The L.A.S.T Principle To Customer Complaints (75 minutes)', detail: 'Listen - Apologize - Solve - Thank. Includes role-play practice with a difficult customer.' },
      { step: 'Part 3: Timed Contest Scanning 20 Simulated Items & Wrap-Up (45 minutes)', detail: 'A 90-second error-free scanning challenge that awards the Express Cashier badge.' },
    ],
    materials: [
      { id: 'mat-pos-1', name: 'SOP-CAS-01: POS Checkout Standard Operating Procedure (PDF)', type: 'PDF', size: '2.9 MB', url: '#' },
      { id: 'mat-pos-2', name: 'Communication Skills & Customer Scenario Handling Slides (PPT)', type: 'PPT', size: '7.8 MB', url: '#' },
      { id: 'mat-pos-3', name: 'PLU Code Lookup Table For Produce & Fresh Weighed Goods (PDF)', type: 'PDF', size: '1.5 MB', url: '#' },
    ],
    enrolledStudents: [
      { id: 'MMVN-1402', name: 'Vu Thi Lan', position: 'Cashier Staff', store: 'MM An Phu', attendance: 'CONFIRMED' },
      { id: 'MMVN-1405', name: 'Pham Hong Nhung', position: 'Cashier Staff', store: 'MM An Phu', attendance: 'CONFIRMED' },
      { id: 'MMVN-1412', name: 'Le Quoc Thang', position: 'Customer Service Associate', store: 'MM An Phu', attendance: 'PENDING' },
    ],
  },
  {
    id: 'ilt-005',
    code: 'WS-ADM-05',
    title: 'Executive Workshop: MMVN Corporate Culture, Labor Code & Master Data Governance',
    category: 'Corporate Orientation',
    modality: 'OFFLINE_STORE',
    trainerId: userAdminUser.userId,
    trainerName: userAdminUser.fullName,
    trainerTitle: 'HR Master Data & User Administration Lead',
    coTrainerIds: [trainerHungUser.userId, hrbpUser.userId],
    coTrainerNames: [trainerHungUser.fullName, hrbpUser.fullName],
    coTrainers: [
      { id: trainerHungUser.userId, userId: trainerHungUser.userId, fullName: trainerHungUser.fullName, name: trainerHungUser.fullName, role: 'trainer', title: 'Master Trainer (L&OD)' },
      { id: hrbpUser.userId, userId: hrbpUser.userId, fullName: hrbpUser.fullName, name: hrbpUser.fullName, role: 'hrbp', title: 'HR Business Partner Lead' },
    ],
    trainerRating: 4.88,
    date: '2026-09-08',
    time: '13:30 - 16:30 (3.0 hours)',
    venueId: 'room-ho-dia',
    venue: 'Diamond Training Hall - MM Mega Market Head Office (An Phu)',
    maxCapacity: 35,
    enrolledCount: 28,
    status: 'UPCOMING',
    isEnrolled: false,
    attendanceStatus: 'NOT_REGISTERED',
    qrToken: 'MMVN-QR-ILT005-20260908',
    description: 'Orientation on MM Mega Market Vietnam core values, employee handbooks, labor regulations, and HR organizational structure governance.',
    prerequisiteCourse: 'Corporate Orientation & MMVN Cultural Values',
    prerequisiteCourseId: 'CRS-CULT-093',
    syllabus: [
      { step: 'Part 1: Introducing The MMVN Mission, Vision & 5 Core Values (45 minutes)', detail: 'The history of MM Mega Market VN, the corporate code of ethics and HR policy.' },
      { step: 'Part 2: Labour Regulations, Employee Rights & Obligations (75 minutes)', detail: 'Insurance entitlements, working hours, occupational health and safety, and the benefits claim process.' },
      { step: 'Part 3: Using The MMLearn Training Portal & Q&A (60 minutes)', detail: 'Looking up level roadmaps, enrolling in courses and getting direct answers on benefits policy.' },
    ],
    materials: [
      { id: 'mat-adm-1', name: 'MM Mega Market Vietnam Employee Handbook 2026 (PDF)', type: 'PDF', size: '4.8 MB', url: '#' },
      { id: 'mat-adm-2', name: 'Corporate Culture & Internal Regulations Introduction Slides (PPT)', type: 'PPT', size: '15.2 MB', url: '#' },
      { id: 'mat-adm-3', name: 'MMVN Employee Benefits & Insurance Handbook (PDF)', type: 'PDF', size: '2.1 MB', url: '#' },
    ],
    enrolledStudents: [
      { id: 'MMVN-2001', name: 'Nguyen Van An', position: 'Store Associate', store: 'MM Binh Phu', attendance: 'CONFIRMED' },
      { id: 'MMVN-2002', name: 'Tran Thi Binh', position: 'Customer Service Lead', store: 'MM An Phu', attendance: 'CONFIRMED' },
      { id: 'MMVN-2003', name: 'Le Hoang Nam', position: 'Department Manager', store: 'MM Hiep Phu', attendance: 'CONFIRMED' },
      { id: 'MMVN-2004', name: 'Pham Minh Chau', position: 'L&OD Specialist', store: 'MM Head Office', attendance: 'PENDING' },
      { id: 'MMVN-2005', name: 'Doan Van Binh', position: 'IT Support Specialist', store: 'MM Head Office', attendance: 'CONFIRMED' },
      { id: 'MMVN-2006', name: 'Hoang Kim Oanh', position: 'HR Assistant', store: 'MM Head Office', attendance: 'CONFIRMED' },
    ],
  },
  {
    id: 'ilt-006',
    code: 'WS-SGM-06',
    title: 'Store Leadership Seminar: Retail P&L Governance & SGM Operational Strategy',
    category: 'Leadership & Management',
    modality: 'OFFLINE_STORE',
    trainerId: trainerQuangUser.userId,
    trainerName: trainerQuangUser.fullName,
    trainerTitle: 'Senior Store General Manager (SGM) & Retail Strategy Mentor',
    coTrainerIds: [userAdminUser.userId, trainerThanhUser.userId],
    coTrainerNames: [userAdminUser.fullName, trainerThanhUser.fullName],
    coTrainers: [
      { id: userAdminUser.userId, userId: userAdminUser.userId, fullName: userAdminUser.fullName, name: userAdminUser.fullName, role: 'useradmin', title: 'HR Master Data & User Admin' },
      { id: trainerThanhUser.userId, userId: trainerThanhUser.userId, fullName: trainerThanhUser.fullName, name: trainerThanhUser.fullName, role: 'trainer', title: 'Loss Prevention & HSE Director' },
    ],
    trainerRating: 4.96,
    date: '2026-09-18',
    time: '09:00 - 16:30 (6.5 hours)',
    venueId: 'room-ho-pla',
    venue: 'Platinum Executive Conference Room - MM Mega Market Head Office',
    maxCapacity: 30,
    enrolledCount: 24,
    status: 'UPCOMING',
    isEnrolled: false,
    attendanceStatus: 'NOT_REGISTERED',
    qrToken: 'MMVN-QR-ILT006-20260918',
    description: 'In-depth analysis of hypermarket P&L statements, margin enhancement, shrinkage mitigation, and multi-department store coordination.',
    prerequisiteCourse: 'Store General Manager P&L Governance & Budget Ownership',
    prerequisiteCourseId: 'CRS-SUCC-107',
    syllabus: [
      { step: 'Part 1: Store P&L Report Structure & Break-Even Analysis (120 minutes)', detail: 'Breaking down operating expense (OPEX) and optimizing gross margin by category.' },
      { step: 'Part 2: Shrinkage Control Strategy & Reducing Fresh Food Write-Offs (120 minutes)', detail: 'Analyzing the shrinkage metric, supply chain management processes and stock rotation.' },
      { step: 'Part 3: Building A Quarterly Business Plan For A Sample Store (150 minutes)', detail: 'Store Manager groups build a hypothetical P&L budget and defend it before the Mentor Board.' },
    ],
    materials: [
      { id: 'mat-sgm-1', name: 'MMVN Standard Store P&L Financial Model (Excel / PDF)', type: 'PDF', size: '3.6 MB', url: '#' },
      { id: 'mat-sgm-2', name: 'Operations Management Strategy Slides For SGMs (PPT)', type: 'PPT', size: '18.4 MB', url: '#' },
    ],
    enrolledStudents: [
      { id: 'MMVN-3001', name: 'Vu Duc Thang', position: 'Store Manager', store: 'MM An Phu', attendance: 'CONFIRMED' },
      { id: 'MMVN-3002', name: 'Nguyen Thi Mai', position: 'Store Manager', store: 'MM Binh Phu', attendance: 'CONFIRMED' },
      { id: 'MMVN-3003', name: 'Tran Van Bach', position: 'Deputy Store Manager', store: 'MM Thang Long', attendance: 'CONFIRMED' },
      { id: 'MMVN-3004', name: 'Le Thi Thu', position: 'Section Manager', store: 'MM Da Nang', attendance: 'PENDING' },
    ],
  },
];

// ---------------------------------------------------------------------------
// Learning Paths (Career Progression, Onboarding, Thanh Giong, SGM, 10/20/70)
// ---------------------------------------------------------------------------

export const learningPaths = [
  {
    id: 'lp-store-onboarding',
    code: 'LP-ONB-STORE',
    title: 'Store Operations Onboarding Learning Path',
    trackType: 'ONBOARDING',
    targetBranch: 'OPERATIONS',
    targetRole: 'Store Associate / Junior Staff (Level 6-7, CL)',
    targetAudience: 'All newly joined hypermarket staff across MM Mega Market & Big C',
    totalCourses: 4,
    completedCourses: 3,
    progressPercent: 75,
    estimatedWeeks: '3 weeks',
    badgeReward: 'Certified Store Onboarder',
    xpReward: 600,
    framework702010: {
      formal10: 'E-Learning: Code of conduct, basic HACCP hygiene, and store fire safety.',
      social20: '1-on-1 mentoring with Buddy / Shift Leader; daily feedback sessions.',
      experiential70: 'Hands-on practice on sales floor; 14-day OJT operational checklist.',
    },
    milestones: [
      {
        step: 1,
        title: 'Stage 1: MMVN Culture, Labor Regulations & Core Values',
        courseId: 'CRS-CULT-093',
        courseTitle: 'Corporate Orientation & MMVN Cultural Values',
        type: 'E_LEARNING',
        status: 'COMPLETED',
        score: 100,
      },
      {
        step: 2,
        title: 'Stage 2: Food Safety Standards (HACCP) & Cold Chain Integrity',
        courseId: 'CRS-FSH-001',
        courseTitle: 'Food Safety & Hygiene Standards (HACCP)',
        type: 'E_LEARNING_ASSESSMENT',
        status: 'COMPLETED',
        score: 95,
      },
      {
        step: 3,
        title: 'Stage 3: Fire Safety, Emergency Evacuation & Workplace HSE',
        courseId: 'CRS-HSE-019',
        courseTitle: 'On-site Fire Safety & Emergency Evacuation (PCCC)',
        type: 'E_LEARNING_ASSESSMENT',
        status: 'COMPLETED',
        score: 90,
      },
      {
        step: 4,
        title: 'Stage 4: Store Practical Lab & On-the-Job Floor Checklist Audit',
        sessionId: 'ilt-001',
        courseId: 'CRS-FSH-001',
        courseTitle: 'Store Practical Lab: Food Safety Standards & Bakery Operations',
        type: 'CLASSROOM_PRACTICE',
        status: 'IN_PROGRESS',
        score: null,
      },
    ],
  },
  {
    id: 'lp-office-onboarding',
    code: 'LP-ONB-OFFICE',
    title: 'Head Office Supporting Functions Onboarding Path',
    trackType: 'ONBOARDING',
    targetBranch: 'SUPPORTING',
    targetRole: 'Head Office Executive / Specialist (Level 5-7)',
    targetAudience: 'New corporate hires (Merchandise, Finance, HRD, SCM, Marketing...)',
    totalCourses: 4,
    completedCourses: 2,
    progressPercent: 50,
    estimatedWeeks: '2 weeks',
    badgeReward: 'Head Office Pro Onboarder',
    xpReward: 500,
    framework702010: {
      formal10: 'E-learning: Information security, corporate governance, SAP ERP & Office tools.',
      social20: '1-on-1 alignment with Line Manager, immersive tour of Flagship An Phu store.',
      experiential70: 'Departmental project participation, cross-functional collaboration tasks.',
    },
    milestones: [
      {
        step: 1,
        title: 'Stage 1: MMVN Corporate Culture, Vision & Code of Conduct',
        courseId: 'CRS-CULT-093',
        courseTitle: 'Corporate Orientation & MMVN Cultural Values',
        type: 'E_LEARNING',
        status: 'COMPLETED',
        score: 95,
      },
      {
        step: 2,
        title: 'Stage 2: Information Security Awareness & Anti-Phishing Defense',
        courseId: 'CRS-ISA-011',
        courseTitle: 'Information Security Awareness & Phishing Defense',
        type: 'E_LEARNING_ASSESSMENT',
        status: 'COMPLETED',
        score: 92,
      },
      {
        step: 3,
        title: 'Stage 3: Corporate Code of Conduct, Anti-Bribery & Trade Compliance',
        courseId: 'CRS-ETHIC-081',
        courseTitle: 'Corporate Code of Conduct & Anti-Corruption Policy',
        type: 'E_LEARNING',
        status: 'IN_PROGRESS',
        score: null,
      },
      {
        step: 4,
        title: 'Stage 4: 1-on-1 Alignment Session with Line Manager & HRBP',
        sessionId: 'ilt-003',
        courseId: 'CRS-ISA-011',
        courseTitle: 'Webinar: POS Terminal Information Security & Phishing Tactics',
        type: 'CLASSROOM_PRACTICE',
        status: 'NOT_STARTED',
        score: null,
      },
    ],
  },
  {
    id: 'lp-thanh-giong',
    code: 'LP-THANH-GIONG',
    title: 'Thanh Giong Fast-track Retail Leadership Pipeline',
    trackType: 'TALENT_PIPELINE',
    targetBranch: 'OPERATIONS',
    targetRole: 'Hi-Potential Associates -> Shift Leaders / Section Supervisors',
    targetAudience: 'Top 5% high-potential operations talent nominated for leadership succession',
    totalCourses: 5,
    completedCourses: 2,
    progressPercent: 40,
    estimatedWeeks: '16 weeks (4 months)',
    badgeReward: 'Thanh Giong Leader Emblem',
    xpReward: 1500,
    framework702010: {
      formal10: 'Mid-level management leadership, Department P&L management, Shrinkage reduction.',
      social20: 'Mentored by Store General Manager (SGM); bi-weekly 1-on-1 coaching.',
      experiential70: 'Lead 1 Store Kaizen Improvement Project; rotational assignment across 2 depts.',
    },
    milestones: [
      {
        step: 1,
        title: 'Stage 1: Ownership Mindset & Team Leadership Fundamentals',
        courseId: 'CRS-LEAD-049',
        courseTitle: 'Leadership Essentials for Managers (MMVN & LinkedIn)',
        type: 'E_LEARNING',
        status: 'COMPLETED',
        score: 96,
      },
      {
        step: 2,
        title: 'Stage 2: Coaching Skills (Social 20%) & High-Impact Feedback',
        courseId: 'CRS-LEAD-050',
        courseTitle: 'Coaching & Giving High-Impact Constructive Feedback',
        type: 'E_LEARNING',
        status: 'COMPLETED',
        score: 92,
      },
      {
        step: 3,
        title: 'Stage 3: Store Operations Management & Shrinkage Reduction',
        courseId: 'CRS-STOPS-039',
        courseTitle: 'Shrinkage Reduction & Anti-Theft Surveillance',
        type: 'E_LEARNING_ASSESSMENT',
        status: 'IN_PROGRESS',
        score: null,
      },
      {
        step: 4,
        title: 'Stage 4: Experiential 70% Project: Supply Chain & Floor Layout Optimization',
        courseId: 'CRS-MERCH-069',
        courseTitle: 'Promotional Strategy & Space Range Merchandising',
        type: 'E_LEARNING',
        status: 'NOT_STARTED',
        score: null,
      },
      {
        step: 5,
        title: 'Stage 5: Capstone Project Defense before Board of Management (BOM)',
        sessionId: 'ilt-001',
        courseId: 'CRS-LEAD-049',
        courseTitle: 'Store Practical Lab & Leadership Capstone Defense',
        type: 'CAPSTONE_ASSESSMENT',
        status: 'NOT_STARTED',
        score: null,
      },
    ],
  },
  {
    id: 'lp-sgm-pipeline',
    code: 'LP-SGM-PIPELINE',
    title: 'Store General Manager (SGM) Talent Pipeline',
    trackType: 'TALENT_PIPELINE',
    targetBranch: 'OPERATIONS',
    targetRole: 'Department Managers -> Store General Managers (SGM)',
    targetAudience: 'Operations Department Leads & Deputy SGMs in succession planning',
    totalCourses: 5,
    completedCourses: 1,
    progressPercent: 20,
    estimatedWeeks: '24 weeks (6 months)',
    badgeReward: 'SGM Certified Master',
    xpReward: 2500,
    framework702010: {
      formal10: 'Store P&L financial literacy, Retail strategic thinking, Regulatory & crisis management.',
      social20: 'Direct coaching from Operations Director & Board of Management.',
      experiential70: 'Acting SGM operational tenure during 60-day peak trading season.',
    },
    milestones: [
      {
        step: 1,
        title: 'Stage 1: Store P&L Financial Literacy & Margin Optimization',
        courseId: 'CRS-LEAD-053',
        courseTitle: 'Store P&L Financial Literacy for General Managers',
        type: 'E_LEARNING_ASSESSMENT',
        status: 'COMPLETED',
        score: 94,
      },
      {
        step: 2,
        title: 'Stage 2: Strategic Thinking & Annual Retail Business Planning',
        courseId: 'CRS-LEAD-052',
        courseTitle: 'Strategic Thinking & Annual Retail Business Planning',
        type: 'E_LEARNING',
        status: 'IN_PROGRESS',
        score: null,
      },
      {
        step: 3,
        title: 'Stage 3: Vendor Negotiation & Joint Business Planning (JBP)',
        courseId: 'CRS-MERCH-068',
        courseTitle: 'Vendor Negotiation & Joint Business Planning (JBP)',
        type: 'E_LEARNING',
        status: 'NOT_STARTED',
        score: null,
      },
      {
        step: 4,
        title: 'Stage 4: Crisis Risk Management & In-Store Media Relations',
        courseId: 'CRS-ISA-016',
        courseTitle: 'Incident Escalation & Data Leakage Reporting Protocol',
        type: 'E_LEARNING',
        status: 'NOT_STARTED',
        score: null,
      },
      {
        step: 5,
        title: 'Stage 5: Acting SGM Operational Review & BOM Succession Sign-off',
        sessionId: 'ilt-001',
        courseId: 'CRS-LEAD-052',
        courseTitle: 'Executive Assessment Panel & Board Sign-off',
        type: 'CAPSTONE_ASSESSMENT',
        status: 'NOT_STARTED',
        score: null,
      },
    ],
  },
  {
    id: 'lp-bakery-master',
    code: 'LP-PPF-01',
    title: 'Bakery Specialist & Fresh Food Mastery Track',
    trackType: 'FUNCTIONAL',
    targetBranch: 'OPERATIONS',
    targetRole: 'Bakery Associate / Fresh Food Staff',
    targetAudience: 'All fresh bakery and processed food specialists',
    totalCourses: 4,
    completedCourses: 2,
    progressPercent: 65,
    estimatedWeeks: '4 weeks',
    badgeReward: 'Bakery Operations Master',
    xpReward: 500,
    framework702010: {
      formal10: 'HACCP standards, artisan dough kneading techniques, and commercial baking temperatures.',
      social20: 'Mentored by Master Baker on active shift.',
      experiential70: 'Direct responsibility for baking 250 French baguettes per shift meeting color and crust standards.',
    },
    milestones: [
      {
        step: 1,
        title: 'Stage 1: Corporate Orientation & MMVN Workplace Culture',
        courseId: 'CRS-CULT-093',
        courseTitle: 'Corporate Orientation & MMVN Cultural Values',
        type: 'E_LEARNING',
        status: 'COMPLETED',
        score: null,
      },
      {
        step: 2,
        title: 'Stage 2: Food Safety & Hygiene Standards (HACCP)',
        courseId: 'CRS-FSH-001',
        courseTitle: 'Food Safety & Hygiene Standards (HACCP)',
        type: 'E_LEARNING',
        status: 'COMPLETED',
        score: 95,
      },
      {
        step: 3,
        title: 'Stage 3: Bakery Utensil Sanitization & Counter Hygiene Standards',
        courseId: 'CRS-FSH-004',
        courseTitle: 'Bakery & Confectionery Sanitation Protocols',
        type: 'E_LEARNING_ASSESSMENT',
        status: 'IN_PROGRESS',
        score: null,
      },
      {
        step: 4,
        title: 'Stage 4: Store Practical Lab: Commercial Oven Operations & Mixer Safety',
        sessionId: 'ilt-001',
        courseId: 'CRS-FSH-004',
        courseTitle: 'Store Practical Lab: Food Safety Standards & Bakery Operations',
        type: 'CLASSROOM_PRACTICE',
        status: 'UPCOMING',
        score: null,
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Post-Training Action Plans & Kirkpatrick L1 / L3 Survey Tracking
// ---------------------------------------------------------------------------

export const actionPlans = [
  {
    id: 'act-plan-01',
    learnerId: 'USR-1042',
    learnerName: 'Minh Tran',
    learnerPosition: 'Bakery Section Specialist (MM An Phu)',
    managerId: 'USR-0245',
    managerName: 'David Tran',
    courseId: 'CRS-FSH-001',
    courseName: 'Food Safety & Hygiene Standards (HACCP)',
    targetCommitment: 'Implement 120-minute cold-chain logging checklist at An Phu Bakery and maintain zero microbiological infractions.',
    kpiTarget: '100% compliance with Form SOP-OMD-04B over 90 days',
    startDate: '2026-08-01',
    evaluationDate: '2026-11-01', // 3 months post-training
    status: 'IN_PROGRESS', // IN_PROGRESS, EVALUATED_L3, PENDING_REVIEW
    progress: 75,
    surveyL1Completed: true,
    surveyL1Score: 5.0,
    managerReviewL3: {
      score: 4.8, // out of 5
      behaviorChange: 'Proactively coached 2 new associates on 100% HACCP temperature recording compliance.',
      productivityGain: '+15% baking turnaround speed and 20% dough waste reduction.',
      status: 'VERIFIED_GOOD',
      signOffDate: '2026-08-20',
    },
  },
  {
    id: 'act-plan-02',
    learnerId: 'USR-1250',
    learnerName: 'Thanh Pham',
    learnerPosition: 'Logistics Specialist (Binh Duong DC)',
    managerId: 'USR-0245',
    managerName: 'David Tran',
    courseId: 'CRS-COLD-029',
    courseName: 'Cold Chain & Warehouse Perishables Quality Control',
    targetCommitment: 'Establish sub-15-minute perishable cross-docking process at Binh Duong DC to preserve -18°C temperature integrity.',
    kpiTarget: 'Zero refrigerated truck temperature deviation infractions',
    startDate: '2026-07-20',
    evaluationDate: '2026-10-20',
    status: 'IN_PROGRESS',
    progress: 60,
    surveyL1Completed: true,
    surveyL1Score: 4.7,
    managerReviewL3: null,
  },
  {
    id: 'act-plan-03',
    learnerId: 'USR-1078',
    learnerName: 'Sarah Johnson',
    learnerPosition: 'Pastry Chef Associate (MM An Phu)',
    managerId: 'USR-0245',
    managerName: 'David Tran',
    courseId: 'CRS-STOPS-037',
    courseName: 'Store Operations Excellence & Planogram Compliance',
    targetCommitment: 'Restructure fresh bakery planogram display to increase wholesale C&C customer conversion.',
    kpiTarget: '+12% pastry sales during peak 16:00-19:00 trading window',
    startDate: '2026-08-10',
    evaluationDate: '2026-11-10',
    status: 'IN_PROGRESS',
    progress: 40,
    surveyL1Completed: true,
    surveyL1Score: 4.9,
    managerReviewL3: null,
  },
];

// ---------------------------------------------------------------------------
// Team Competency Skill Gap Matrix (For Managers to diagnose & assign courses)
// ---------------------------------------------------------------------------

export const teamSkillGapMatrix = [
  {
    employeeId: 'MMVN-1042',
    employeeName: 'Minh Tran',
    position: 'Bakery Section Specialist',
    targetRole: 'Bakery Shift Supervisor (Thanh Giong Pipeline)',
    readiness: 'READY_IN_6_MONTHS',
    overallGap: -8,
    skills: [
      { name: 'HACCP & Hygiene Compliance', required: 90, actual: 95, gap: 0, status: 'EXCEEDED' },
      { name: 'Artisan Bakery Production', required: 85, actual: 90, gap: 0, status: 'EXCEEDED' },
      { name: 'Shrinkage & Spoilage Control', required: 80, actual: 65, gap: -15, status: 'GAP_IDENTIFIED', suggestedCourseId: 'CRS-STOPS-039', suggestedCourse: 'Shrinkage Reduction & Anti-Theft Surveillance' },
      { name: 'Team Coaching (Social 20%)', required: 75, actual: 60, gap: -15, status: 'GAP_IDENTIFIED', suggestedCourseId: 'CRS-LEAD-050', suggestedCourse: 'Coaching & Giving High-Impact Constructive Feedback' },
    ],
  },
  {
    employeeId: 'MMVN-1078',
    employeeName: 'Sarah Johnson',
    position: 'Pastry Chef Associate',
    targetRole: 'Senior Pastry Specialist',
    readiness: 'DEVELOPING',
    overallGap: -12,
    skills: [
      { name: 'HACCP & Hygiene Compliance', required: 85, actual: 80, gap: -5, status: 'GAP_IDENTIFIED', suggestedCourseId: 'CRS-FSH-001', suggestedCourse: 'Food Safety & Hygiene Standards (HACCP)' },
      { name: 'Planogram Space Merchandising', required: 80, actual: 60, gap: -20, status: 'GAP_IDENTIFIED', suggestedCourseId: 'CRS-STOPS-037', suggestedCourse: 'Store Operations Excellence & Planogram Compliance' },
      { name: 'Customer Advisory & Fresh Service', required: 75, actual: 85, gap: 0, status: 'EXCEEDED' },
    ],
  },
  {
    employeeId: 'MMVN-1111',
    employeeName: 'Lisa Wang',
    position: 'Fresh Food Counter Associate',
    targetRole: 'Fresh Food Section Lead',
    readiness: 'NEEDS_COACHING',
    overallGap: -25,
    skills: [
      { name: 'Cold Chain Perishables Preservation', required: 90, actual: 55, gap: -35, status: 'CRITICAL_GAP', suggestedCourseId: 'CRS-COLD-029', suggestedCourse: 'Cold Chain & Warehouse Perishables Quality Control' },
      { name: 'Workplace Fire Safety & HSE', required: 80, actual: 70, gap: -10, status: 'GAP_IDENTIFIED', suggestedCourseId: 'CRS-HSE-019', suggestedCourse: 'On-site Fire Safety & Emergency Evacuation (PCCC)' },
      { name: 'Horeca Client Communication', required: 75, actual: 72, gap: -3, status: 'GAP_IDENTIFIED', suggestedCourseId: 'CRS-CSERV-087', suggestedCourse: 'Customer Care Excellence & Horeca Client Service' },
    ],
  },
];

// ---------------------------------------------------------------------------
// Cost Tracking & L&D Training Budget Management Data
// ---------------------------------------------------------------------------

export const costTrackingData = {
  totalBudgetAnnual: 4500000000, // VND 4.5 billion
  totalSpentYTD: 2850000000, // VND 2.85 billion
  costPerLearnerAvg: 1328000, // ~1.3 million / employee
  budgetUtilization: '63.3%',
  externalPlatformLicenses: [
    { platform: 'LinkedIn Learning Enterprise (B2B Pack)', licenses: 250, costAnnual: 625000000, costPerSeat: 2500000, utilizationRate: '92%', activeLearners: 230 },
    { platform: 'Coursera for Business (Retail Specialization)', licenses: 100, costAnnual: 480000000, costPerSeat: 4800000, utilizationRate: '88%', activeLearners: 88 },
    { platform: 'Udemy Business Technical & Data Analytics', licenses: 50, costAnnual: 180000000, costPerSeat: 3600000, utilizationRate: '94%', activeLearners: 47 },
  ],
  departmentSpend: [
    { name: 'Store Operations', budget: 2200000000, spent: 1540000000, learners: 1450, costPerHead: 1062000, utilization: '70.0%' },
    { name: 'Supporting Functions / Office', budget: 1300000000, spent: 820000000, learners: 420, costPerHead: 1952000, utilization: '63.1%' },
    { name: 'Supply Chain & Logistics DC', budget: 650000000, spent: 340000000, learners: 210, costPerHead: 1619000, utilization: '52.3%' },
    { name: 'Thanh Giong & SGM Talent Pipeline program', budget: 350000000, spent: 150000000, learners: 65, costPerHead: 2307000, utilization: '42.8%' },
  ],
};

// ---------------------------------------------------------------------------
// Cross-Company Competency Gap Heatmap (Operations Stores vs Supporting Office)
// ---------------------------------------------------------------------------

export const companyHeatmapData = {
  operations: [
    { entity: 'MM An Phu (Flagship HCMC)', area: 'Southern Region', foodSafety: 96, coldChain: 94, shrinkControl: 88, posSpeed: 95, customerService: 92, leadership: 86, gapAvg: 8, auditReady: true },
    { entity: 'MM Binh Phu (District 6, HCMC)', area: 'Southern Region', foodSafety: 91, coldChain: 89, shrinkControl: 82, posSpeed: 90, customerService: 88, leadership: 80, gapAvg: 13, auditReady: true },
    { entity: 'MM Hiep Phu (District 12, HCMC)', area: 'Southern Region', foodSafety: 89, coldChain: 86, shrinkControl: 79, posSpeed: 87, customerService: 85, leadership: 78, gapAvg: 16, auditReady: false },
    { entity: 'MM Thang Long (Hanoi)', area: 'Northern Region', foodSafety: 94, coldChain: 92, shrinkControl: 86, posSpeed: 93, customerService: 90, leadership: 84, gapAvg: 9, auditReady: true },
    { entity: 'MM Ha Dong (Hanoi)', area: 'Northern Region', foodSafety: 88, coldChain: 85, shrinkControl: 80, posSpeed: 88, customerService: 86, leadership: 79, gapAvg: 16, auditReady: false },
    { entity: 'MM Da Nang (Central Region)', area: 'Central Region', foodSafety: 93, coldChain: 90, shrinkControl: 85, posSpeed: 92, customerService: 89, leadership: 82, gapAvg: 11, auditReady: true },
    { entity: 'MM Hung Loi (Can Tho)', area: 'Southern Region', foodSafety: 90, coldChain: 88, shrinkControl: 81, posSpeed: 89, customerService: 87, leadership: 80, gapAvg: 14, auditReady: true },
  ],
  supportingOffice: [
    { entity: 'OMD - Merchandise & Sourcing', branch: 'Head Office', foodSafety: 95, coldChain: 92, shrinkControl: 90, posSpeed: 75, customerService: 85, leadership: 92, gapAvg: 9, auditReady: true },
    { entity: 'SCM - Logistics & DCs', branch: 'Head Office / DC', foodSafety: 88, coldChain: 98, shrinkControl: 94, posSpeed: 70, customerService: 80, leadership: 88, gapAvg: 10, auditReady: true },
    { entity: 'HRD - Human Resource & L&OD', branch: 'Head Office', foodSafety: 85, coldChain: 80, shrinkControl: 82, posSpeed: 78, customerService: 96, leadership: 98, gapAvg: 7, auditReady: true },
    { entity: 'FAD - Finance & Controlling', branch: 'Head Office', foodSafety: 76, coldChain: 72, shrinkControl: 96, posSpeed: 85, customerService: 82, leadership: 90, gapAvg: 12, auditReady: true },
    { entity: 'IA - Internal Audit & SOP', branch: 'Head Office', foodSafety: 98, coldChain: 96, shrinkControl: 98, posSpeed: 90, customerService: 88, leadership: 94, gapAvg: 3, auditReady: true },
    { entity: 'LP - Loss Prevention & QA', branch: 'Head Office', foodSafety: 98, coldChain: 96, shrinkControl: 99, posSpeed: 92, customerService: 86, leadership: 90, gapAvg: 2, auditReady: true },
  ],
};

// ---------------------------------------------------------------------------
// Gamification & Engagement Data (Streak) — XP and the leaderboard were removed
// ---------------------------------------------------------------------------

export const gamificationData = {
  userStats: {
    streakDays: 8,
  },
};

// ---------------------------------------------------------------------------
// Manager Course Approval Requests
// ---------------------------------------------------------------------------

// Level skip requests (Sequential Level Gate). Each request covers exactly ONE course
// sits exactly one grade above the learner. The approver is always the User Admin
// or System Admin — the only 2 roles that still hold canApproveLevelSkip — regardless
// whichever role submitted it; Manager/Trainer/L&D/HRBP can now only submit requests for
// themselves, and approve for nobody else. The 6 requests below show all 5 roles
// submit their own level skip request, all landing in one shared queue.
export const pendingApprovalRequests = [
  {
    id: 'req-001',
    requestType: 'LEVEL_ADVANCE',
    employeeId: 'MMVN-2041',
    userId: 'USR-2041',
    employeeName: 'Quoc Bao',
    position: 'Store Fresh Food Associate (New Joiner)',
    department: 'PPF - Processed Fresh Food',
    currentLevel: '7',
    courseLevel: '6',
    courseId: 'CRS-FSH-004',
    courseName: 'Bakery & Confectionery Sanitation Protocols',
    requesterRole: 'learner',
    requestDate: '2026-08-19',
    justification: 'I have completed the Level 7 basic hygiene courses and would like to start the Level 6 advanced HACCP procedures early to prepare for the Bakery Counter Operations Specialist role.',
    courseCost: 'Free (Internal Talent Program)',
    status: 'PENDING', // PENDING, APPROVED, REJECTED
  },
  {
    id: 'req-002',
    requestType: 'LEVEL_ADVANCE',
    employeeId: 'MMVN-1021',
    userId: 'USR-1021',
    employeeName: 'Vo Ngoc',
    position: 'Dry Food Supply Chain Specialist',
    department: 'DSP - Dry Food Supply Chain',
    currentLevel: '7',
    courseLevel: '6',
    courseId: 'CRS-HSE-023',
    courseName: 'Hazardous Chemical Handling & Safety Data Sheets (SDS)',
    requesterRole: 'learner',
    requestDate: '2026-08-20',
    justification: 'I am on the MM An Phu fire response team and need the specialist-level certification for operating the dedicated equipment.',
    courseCost: 'Free (Internal HSE Program)',
    status: 'PENDING',
  },
  {
    id: 'req-003',
    requestType: 'LEVEL_ADVANCE',
    employeeId: 'MMVN-0245',
    userId: 'USR-0245',
    employeeName: 'David Tran',
    position: 'Department Manager - Fresh Food & Bakery',
    department: 'PPF - Processed Fresh Food',
    currentLevel: '4',
    courseLevel: '3',
    courseId: 'CRS-LEAD-052',
    courseName: 'Strategic Thinking & Annual Retail Business Planning',
    requesterRole: 'manager',
    requestDate: '2026-08-21',
    justification: 'I want to build strategic planning capability before being nominated for the Store General Manager role.',
    courseCost: 'Internal MMVN complimentary',
    status: 'PENDING',
  },
  {
    id: 'req-004',
    requestType: 'LEVEL_ADVANCE',
    employeeId: 'MMVN-9003',
    userId: 'USR-9003',
    employeeName: 'Nguyen Van Hung (Master Trainer)',
    position: 'Master Trainer & L&D Specialist (Faculty Lead)',
    department: 'L&OD - Learning & Org Development',
    currentLevel: '3',
    courseLevel: '2',
    courseId: 'CRS-LEAD-056',
    courseName: 'Performance Appraisal & KPI Setting Workshops',
    requesterRole: 'trainer',
    requestDate: '2026-08-21',
    justification: 'KPI evaluation skills need to be standardized against the Level 2 competency framework before rolling out to the full trainer team.',
    courseCost: 'Internal MMVN complimentary',
    status: 'PENDING',
  },
  {
    id: 'req-005',
    requestType: 'LEVEL_ADVANCE',
    employeeId: 'MMVN-9004',
    userId: 'USR-9004',
    employeeName: 'Le Thi Mai (HRBP)',
    position: 'HR Business Partner - Head of People Partnering',
    department: 'HRBP - HR Business Partnering',
    currentLevel: '2',
    courseLevel: '1',
    courseId: 'CRS-LEAD-058',
    courseName: 'Emotional Intelligence & Resilient Leadership in Retail',
    requesterRole: 'hrbp',
    requestDate: '2026-08-22',
    justification: 'Early enrollment in the Level 1 leadership framework to support the HR Department Head succession roadmap.',
    courseCost: 'Internal MMVN complimentary',
    status: 'PENDING',
  },
  {
    id: 'req-006',
    requestType: 'LEVEL_ADVANCE',
    employeeId: 'MMVN-9002',
    userId: 'USR-9002',
    employeeName: 'Pham Thanh Thao (User Admin)',
    position: 'User Administration Lead & HR Master Data Owner',
    department: 'C&B - Compensation, Benefits & HR Ops',
    currentLevel: '2',
    courseLevel: '1',
    courseId: 'CRS-LEAD-058',
    courseName: 'Emotional Intelligence & Resilient Leadership in Retail',
    requesterRole: 'useradmin',
    requestDate: '2026-08-22',
    justification: 'Building Level 1 leadership capability before expanding HR governance across the whole network.',
    courseCost: 'Internal MMVN complimentary',
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
    source: 'SAP SuccessFactors HRIS API (Nightly Batch Sync)',
    totalRecords: 2145,
    insertedCount: 14,
    updatedCount: 38,
    deactivatedCount: 3,
    status: 'SUCCESS',
    durationSeconds: '18.4s',
    fieldsMapped: ['EmployeeID', 'FullName', 'Email', 'Position', 'Branch', 'Area', 'StoreType', 'Cluster', 'StoreName', 'DeptCode', 'ManagerID', 'Status'],
  },
  {
    id: 'sync-002',
    timestamp: '2026-08-20 03:00:12',
    source: 'SAP SuccessFactors HRIS API (Nightly Batch Sync)',
    totalRecords: 2134,
    insertedCount: 8,
    updatedCount: 12,
    deactivatedCount: 1,
    status: 'SUCCESS',
    durationSeconds: '17.8s',
    fieldsMapped: ['EmployeeID', 'FullName', 'Email', 'Position', 'Branch', 'Area', 'StoreType', 'Cluster', 'StoreName', 'DeptCode', 'ManagerID', 'Status'],
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


