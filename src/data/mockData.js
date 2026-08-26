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
} from './orgHierarchy';

import {
  generated100Users,
  generated100Courses,
  generated100EnrollmentMatrix,
  getCourseAccessControl,
} from './generated100Data';
import { levelTitle, levelValue, normalizeLevel, checkCourseAccessRule } from './levelSystem';
import { normalizeRole, managedRolesOf, canManage, roleDefinition, hasCapability } from './roles';
import { COURSE_IMAGE_PRESETS, getCourseImage } from './courseImages';
import { canonicalizeCategory } from '../utils/courseCatalog';

export { COURSE_IMAGE_PRESETS, getCourseImage } from './courseImages';

// Thang 7 cấp bậc & mô hình 6 role được tái xuất khẩu ở đây để các màn hình chỉ
// cần import từ một nơi duy nhất.
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
// 6 Demo Persona chuẩn cho 6 Role phân cấp (thấp -> cao)
//   1. learner   Minh Tran          USR-1042  Level 7
//   2. manager   David Tran         USR-0245  Level 4
//   3. trainer   Nguyen Van Hung    USR-9003  Level 3
//   4. hrbp      Le Thi Mai         USR-9004  Level 2
//   5. useradmin Pham Thanh Thao    USR-9002  Level 2
//   6. sysadmin  Tran Quoc Bao      USR-9001  Level 1
// Cả 6 đều là Learner: role nào cũng có cổng học tập cá nhân.
// ---------------------------------------------------------------------------

export const managerUser = demoUsers[1]; // David Tran (Store Department Manager - Level 4)
export const currentUser = demoUsers[3]; // Minh Tran (Junior Bakery Associate - Level 7)

export const sysAdminUser = {
  userId: 'USR-9001',
  employeeCode: 'MMVN-9001',
  fullName: 'Tran Quoc Bao (IT)',
  email: 'bao.tran@mmvietnam.com',
  role: 'sysadmin',
  position: 'Lead IT Systems Administrator & Cybersecurity Lead',
  level: '1',
  levelTitle: levelTitle('1'),
  branch: 'SUPPORTING',
  branchName: 'Khối Chức năng Hỗ trợ (Head Office)',
  businessUnitId: 'bu-mmvn', businessUnitCode: 'MMVN',
  divisionId: 'div-it', divisionCode: 'IT', divisionName: 'Information Technology',
  departmentId: 'dept-mis', departmentCode: 'MIS', departmentName: 'IT & Security Infrastructure',
  areaId: 'area-south', areaName: 'Khu vực Miền Nam',
  storeId: null, storeName: 'Head Office (An Phú, TP. Thủ Đức)',
  managerId: null,
  status: 'ACTIVE',
  yearsOfService: 6.4,
  avatar: 'TB',
  badgeTone: 'rust',
  description: 'Toàn quyền hạ tầng, API, audit log ISO 27001 và quản trị mọi role kể cả User Admin.',
};

export const userAdminUser = {
  userId: 'USR-9002',
  employeeCode: 'MMVN-9002',
  fullName: 'Pham Thanh Thao (User Admin)',
  email: 'thao.pham@mmvietnam.com',
  role: 'useradmin',
  position: 'User Administration Lead & HR Master Data Owner',
  level: '2',
  levelTitle: levelTitle('2'),
  branch: 'SUPPORTING',
  branchName: 'Khối Chức năng Hỗ trợ (Head Office)',
  businessUnitId: 'bu-mmvn', businessUnitCode: 'MMVN',
  divisionId: 'div-hrd', divisionCode: 'HRD', divisionName: 'Human Resource & L&OD',
  departmentId: 'dept-cb', departmentCode: 'C&B', departmentName: 'Compensation, Benefits & HR Ops',
  areaId: 'area-south', areaName: 'Khu vực Miền Nam',
  storeId: null, storeName: 'Head Office (An Phú, TP. Thủ Đức)',
  managerId: 'USR-9001',
  status: 'ACTIVE',
  yearsOfService: 5.1,
  avatar: 'PT',
  badgeTone: 'blue',
  description: 'Quản trị hồ sơ 100+ nhân sự, phân bổ khóa học và phân công Giảng viên đứng lớp tại các chi nhánh.',
};

export const trainerHungUser = {
  userId: 'USR-9003',
  employeeCode: 'MMVN-9003',
  fullName: 'Nguyen Van Hung (Master Trainer)',
  email: 'hung.nguyen@mmvietnam.com',
  role: 'trainer',
  position: 'Master Trainer & L&D Specialist (Faculty Lead)',
  level: '3',
  levelTitle: levelTitle('3'),
  branch: 'SUPPORTING',
  branchName: 'Khối Chức năng Hỗ trợ (Head Office)',
  businessUnitId: 'bu-mmvn', businessUnitCode: 'MMVN',
  divisionId: 'div-hrd', divisionCode: 'HRD', divisionName: 'Human Resource & L&OD',
  departmentId: 'dept-lod', departmentCode: 'L&OD', departmentName: 'Learning & Org Development',
  areaId: 'area-south', areaName: 'Khu vực Miền Nam',
  storeId: null, storeName: 'Head Office (An Phú, TP. Thủ Đức)',
  managerId: 'USR-9004',
  status: 'ACTIVE',
  yearsOfService: 8.2,
  avatar: 'NH',
  badgeTone: 'sage',
  description: 'Tạo khóa học thực hành, đứng lớp tại xưởng siêu thị và chiếu Live QR cho học viên điểm danh.',
};

export const trainerThanhUser = {
  userId: 'USR-9005',
  employeeCode: 'MMVN-9005',
  fullName: 'Vu Duc Thanh (HSE Trainer)',
  email: 'thanh.vu@mmvietnam.com',
  role: 'trainer',
  position: 'Giảng Viên An Toàn & HSE Section Manager',
  level: '3',
  levelTitle: levelTitle('3'),
  branch: 'SUPPORTING',
  branchName: 'Khối Chức năng Hỗ trợ (Head Office)',
  businessUnitId: 'bu-mmvn', businessUnitCode: 'MMVN',
  divisionId: 'div-qa', divisionCode: 'QA-LP', divisionName: 'Loss Prevention & HSE',
  departmentId: 'dept-hse', departmentCode: 'HSE', departmentName: 'Health, Safety & Environment',
  areaId: 'area-south', areaName: 'Khu vực Miền Nam',
  storeId: null, storeName: 'Head Office (An Phú, TP. Thủ Đức)',
  managerId: 'USR-9004',
  status: 'ACTIVE',
  yearsOfService: 9.0,
  avatar: 'VT',
  badgeTone: 'sage',
  description: 'Đứng lớp diễn tập PCCC, sơ cấp cứu và an toàn xe nâng tại các sân thực hành chi nhánh.',
};

export const trainerQuangUser = {
  userId: 'USR-9006',
  employeeCode: 'MMVN-9006',
  fullName: 'Tran Minh Quang (SGM Mentor)',
  email: 'quang.tran@mmvietnam.com',
  role: 'trainer',
  position: 'Store General Manager kiêm Giảng Viên Quản Trị',
  level: '2',
  levelTitle: levelTitle('2'),
  branch: 'OPERATIONS',
  branchName: 'Khối Vận hành Siêu thị (Operations)',
  businessUnitId: 'bu-mmvn', businessUnitCode: 'MMVN',
  divisionId: 'div-opt', divisionCode: 'OPS-S', divisionName: 'Operations South Region',
  departmentId: 'dept-ops-s', departmentCode: 'STR-AP', departmentName: 'MM Mega Market An Phú',
  areaId: 'area-south', areaName: 'Khu vực Miền Nam',
  storeId: 'store-an-phu', storeName: 'MM Mega Market An Phú (Flagship)',
  managerId: 'USR-9001',
  status: 'ACTIVE',
  yearsOfService: 11.5,
  avatar: 'TQ',
  badgeTone: 'sage',
  description: 'Mentor lộ trình kế nhiệm SGM và giảng dạy Quản trị P&L siêu thị (khóa Level 2).',
};

export const trainerUser = trainerHungUser;
export const allTrainers = [trainerHungUser, trainerThanhUser, trainerQuangUser];

export const hrbpUser = {
  userId: 'USR-9004',
  employeeCode: 'MMVN-9004',
  fullName: 'Le Thi Mai (HRBP)',
  email: 'mai.le@mmvietnam.com',
  role: 'hrbp',
  position: 'HR Business Partner - Head of People Partnering',
  level: '2',
  levelTitle: levelTitle('2'),
  branch: 'SUPPORTING',
  branchName: 'Khối Chức năng Hỗ trợ (Head Office)',
  businessUnitId: 'bu-mmvn', businessUnitCode: 'MMVN',
  divisionId: 'div-hrd', divisionCode: 'HRD', divisionName: 'Human Resource & L&OD',
  departmentId: 'dept-hrbp', departmentCode: 'HRBP', departmentName: 'HR Business Partnering',
  areaId: 'area-south', areaName: 'Khu vực Miền Nam',
  storeId: null, storeName: 'Head Office (An Phú, TP. Thủ Đức)',
  managerId: 'USR-9002',
  status: 'ACTIVE',
  yearsOfService: 7.3,
  avatar: 'LM',
  badgeTone: 'blue',
  description: 'Phân tích Skill Gap, quy hoạch kế nhiệm 70-20-10 và giám sát tuân thủ đào tạo theo vùng.',
};

// Sarah Nguyen (USR-0001) là L&D Director trong thang mới: role `trainer`, Level 2.
// Giữ tên export `adminUser` để các màn hình cũ tiếp tục biên dịch được.
export const lndDirectorUser = demoUsers[0];
export const adminUser = lndDirectorUser;

// 6 persona chính, xếp theo rank role từ thấp đến cao.
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

// Danh sách nhân sự mà `actor` được phép quản lý theo ma trận xếp tầng
// (Cascading Hierarchy): mọi role có rank thấp hơn role của actor.
// Manager chỉ thấy người trong phòng ban / tuyến báo cáo của mình; các role
// từ Trainer trở lên nhìn xuyên toàn tổ chức.
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

// Nguồn duy nhất cho "ai được phép đứng lớp": mọi nhân sự có capability
// canBeAssignedToClass (Trainer/L&D, HRBP, User Admin, System Admin) — thay
// vì hồ sơ tĩnh trainersDirectory (chỉ 4 người, ID không khớp tài khoản hệ
// thống thật) từng dùng cho việc chọn Giảng viên khi tạo khóa Trực tiếp.
export function teachingEligibleUsers() {
  return allUsers().filter((u) => hasCapability(normalizeRole(u.role), 'canBeAssignedToClass'));
}

// Chỉ số hiệu suất giảng dạy (CSAT, số buổi đã dạy, tổng học viên) cho 6 nhân
// sự "gương mặt" hay xuất hiện trong demo — có sẵn ở classroomSessions/khóa
// học mẫu nên số liệu dựng sẵn khớp với những gì hiển thị trên các trang khác.
const CURATED_TRAINER_STATS = {
  [trainerHungUser.userId]: { rating: 4.9, totalClassesTaught: 48, totalLearners: 1240 },
  [trainerThanhUser.userId]: { rating: 4.92, totalClassesTaught: 52, totalLearners: 1850 },
  [trainerQuangUser.userId]: { rating: 4.96, totalClassesTaught: 24, totalLearners: 410 },
  [hrbpUser.userId]: { rating: 4.85, totalClassesTaught: 9, totalLearners: 210 },
  [userAdminUser.userId]: { rating: 4.88, totalClassesTaught: 14, totalLearners: 340 },
  [sysAdminUser.userId]: { rating: 4.83, totalClassesTaught: 6, totalLearners: 180 },
};

/** Chỉ số CSAT/giảng dạy cho bất kỳ ai đủ điều kiện đứng lớp. Nhân sự chưa có
 *  số liệu dựng sẵn (giảng viên phát sinh trong 100 nhân sự mẫu) được gán một
 *  con số hợp lý, ổn định theo userId thay vì random mỗi lần render. */
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
// Virtual Classroom (Online E-Learning con sub-type): lớp học trực tuyến trực
// tiếp qua Zoom/Teams, khác với E-Learning tự học (Module/Bài học/Quiz). Chỉ
// User Admin/System Admin được tạo loại này (canAuthorOnlineCourses); Trainer
// vẫn chỉ đứng lớp Offline ILT như hiện tại. Điểm danh tái dùng nguyên cơ chế
// Attendance đã có ở TrainerHub — không có Quiz kết thúc khóa (hoàn thành =
// đã tham gia buổi học, theo yêu cầu người dùng).
const virtualClassCourseImage = 'https://images.unsplash.com/photo-1587825140708-dfaf72ae4b04?auto=format&fit=crop&w=600&q=80';

courses.push(
  {
    id: 'CRS-VC-001',
    code: 'VC-LEAD-001',
    title: 'Webinar Trực Tuyến: Kỹ Năng Điều Hành Cuộc Họp & Quản Trị Thay Đổi Số Hóa Cửa Hàng',
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
    description: 'Lớp học trực tuyến trực tiếp (live) qua Microsoft Teams: kỹ năng điều hành cuộc họp hiệu quả và dẫn dắt đội ngũ cửa hàng qua giai đoạn chuyển đổi số. Hoàn thành = tham gia đầy đủ buổi học, không có bài kiểm tra cuối khóa.',
    prerequisites: [],
    configuration: {
      assessmentEnabled: false, maxAttempts: 0, passingScorePercent: 0, certificateEnabled: true,
      questionBankSize: 0, questionsPerAttempt: 0, version: 'v1.0',
      lastReviewedBy: 'Nguyễn Văn Hùng (Master Trainer)', lastReviewedDate: '2026-08-10',
      changelog: [{ version: 'v1.0', date: '2026-08-10', reviewer: 'Nguyễn Văn Hùng (Master Trainer)', note: 'Khởi tạo lớp học trực tuyến Virtual Class đầu tiên.' }],
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
      scheduleTime: '14:00 - 16:00 (2.0 giờ)',
      maxCapacity: 60,
      instructions: 'Chuẩn bị laptop/tai nghe, đăng nhập trước giờ học 10 phút để kiểm tra đường truyền. Bật camera trong suốt buổi học để Giảng viên xác nhận tham gia.',
      status: 'UPCOMING',
      recordingUrl: '',
      materials: [
        { name: 'Slide bài giảng: Điều Hành Cuộc Họp Hiệu Quả.pdf', url: '#' },
        { name: 'Checklist Chuẩn Bị Trước Buổi Học.pdf', url: '#' },
      ],
    },
  },
  {
    id: 'CRS-VC-002',
    code: 'VC-HSE-002',
    title: 'Hội Thảo Trực Tuyến: Cập Nhật Quy Định An Toàn Thực Phẩm HACCP 2026',
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
    description: 'Hội thảo trực tuyến qua Zoom cập nhật quy định HACCP 2026 mới nhất cho toàn bộ nhân sự khối Tươi sống. Hoàn thành = tham gia đầy đủ buổi học, không có bài kiểm tra cuối khóa.',
    prerequisites: [],
    configuration: {
      assessmentEnabled: false, maxAttempts: 0, passingScorePercent: 0, certificateEnabled: true,
      questionBankSize: 0, questionsPerAttempt: 0, version: 'v1.0',
      lastReviewedBy: 'Vu Duc Thanh (HSE Trainer)', lastReviewedDate: '2026-08-12',
      changelog: [{ version: 'v1.0', date: '2026-08-12', reviewer: 'Vu Duc Thanh (HSE Trainer)', note: 'Khởi tạo hội thảo trực tuyến HACCP 2026.' }],
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
      scheduleTime: '09:00 - 10:30 (1.5 giờ)',
      maxCapacity: 100,
      instructions: 'Tải sẵn tài liệu quy định HACCP 2026 đính kèm trước buổi học. Chuẩn bị câu hỏi thực tế phát sinh tại quầy để trao đổi trực tiếp cùng Giảng viên.',
      status: 'UPCOMING',
      recordingUrl: '',
      materials: [
        { name: 'Quy Định HACCP 2026 (Bản Cập Nhật).pdf', url: '#' },
      ],
    },
  },
);

// Ghi danh mẫu cho 2 lớp Virtual Class ở trên, để có dữ liệu thật minh họa
// trải nghiệm học viên. Phải chọn đúng học viên cùng cấp bậc mục tiêu của
// từng khóa (Level 4 / Level 6) — không dùng currentUser (Minh Tran, Level 7)
// vì sẽ vi phạm quy tắc "không tự ghi danh vượt cấp" (verify script chặn).
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

// Đa phiên bản khóa học (xem resolveCourseView/publishNewCourseVersion bên
// dưới): mọi khóa học (100 khóa gốc + 22 gap-fill + 2 Virtual Class) cần có
// sẵn currentVersion/versions{} — chưa khóa nào từng được "Phát Hành Phiên
// Bản Mới" nên versions{} rỗng (không có phiên bản cũ nào bị đóng băng cả).
courses.forEach((c) => {
  if (!c.currentVersion) c.currentVersion = c.version || 'v1.0';
  if (!c.versions) c.versions = {};
});

// ---------------------------------------------------------------------------
// Category chuẩn hóa + Lifecycle Status theo ngày (Draft/Upcoming/Open/Closed):
// mọi khóa học được gán categories[] (đa lĩnh vực, category giữ nguyên làm
// categories[0] để tương thích ngược) và startDate/endDate, rải đều xác định
// (không dùng Math.random, để ổn định qua các lần tải lại) trên cả 4 trạng
// thái vòng đời — bao gồm ép 2 khóa CLOSED có ghi danh thật (1 đã hoàn thành,
// 1 đang học dở) để kiểm thử quy tắc hiển thị của học viên với khóa đã đóng.
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
// Curriculum (Giáo Trình Học): tập hợp nhiều khóa E-Learning tự học thành một
// lộ trình có cấu trúc Curriculum -> Courses -> Modules -> Lessons. Chỉ tham
// chiếu courseIds thật (không sao chép lại modules/lessons) — chỉ những khóa
// deliveryType ONLINE_ELEARNING & onlineClassType không phải VIRTUAL_CLASS.
// ---------------------------------------------------------------------------
export const curricula = [
  {
    id: 'CUR-FSH-FOUNDATIONS',
    title: 'Chương Trình Nền Tảng An Toàn Thực Phẩm',
    description: 'Giáo trình E-Learning tổng hợp các khóa an toàn & vệ sinh thực phẩm bắt buộc cho toàn bộ nhân sự khối Tươi Sống.',
    category: 'Food Safety & Hygiene',
    courseIds: ['CRS-FSH-001', 'CRS-FSH-003', 'CRS-FSH-004', 'CRS-FSH-005'],
    status: 'PUBLISHED',
    createdBy: adminUser.userId,
    createdAt: '2026-07-01',
    updatedAt: '2026-07-01',
  },
  {
    id: 'CUR-LEAD-TRACK',
    title: 'Lộ Trình Phát Triển Năng Lực Lãnh Đạo',
    description: 'Giáo trình E-Learning dành cho quản lý cấp trung: kỹ năng huấn luyện, phản hồi, tư duy chiến lược và quản trị thay đổi.',
    category: 'Leadership & Management',
    courseIds: ['CRS-LEAD-049', 'CRS-LEAD-050', 'CRS-LEAD-051', 'CRS-LEAD-052'],
    status: 'PUBLISHED',
    createdBy: adminUser.userId,
    createdAt: '2026-07-05',
    updatedAt: '2026-07-05',
  },
  {
    id: 'CUR-ISA-SECURITY',
    title: 'Giáo Trình An Ninh Thông Tin Doanh Nghiệp',
    description: 'Giáo trình E-Learning bắt buộc toàn công ty về nhận thức an ninh mạng và bảo vệ dữ liệu khách hàng.',
    category: 'Information Security',
    courseIds: ['CRS-ISA-011', 'CRS-ISA-012', 'CRS-ISA-013'],
    status: 'PUBLISHED',
    createdBy: adminUser.userId,
    createdAt: '2026-07-10',
    updatedAt: '2026-07-10',
  },
  {
    id: 'CUR-SCM-OPS',
    title: 'Giáo Trình Vận Hành Chuỗi Cung Ứng & Kho Vận',
    description: 'Giáo trình E-Learning cho nhân sự Khối Chuỗi Cung Ứng: an toàn xe nâng, kho vận, quản lý đội xe.',
    category: 'Supply Chain & Logistics',
    courseIds: ['CRS-SCM-059', 'CRS-SCM-060', 'CRS-SCM-061'],
    status: 'DRAFT',
    createdBy: adminUser.userId,
    createdAt: '2026-08-01',
    updatedAt: '2026-08-01',
  },
  {
    id: 'CUR-ETHIC-COMPLIANCE',
    title: 'Giáo Trình Tuân Thủ & Đạo Đức Doanh Nghiệp',
    description: 'Giáo trình E-Learning bắt buộc: quy tắc ứng xử, chống tham nhũng, và các quy định pháp lý cạnh tranh công bằng.',
    category: 'Compliance & Ethics',
    courseIds: ['CRS-ETHIC-081', 'CRS-ETHIC-082', 'CRS-ETHIC-083'],
    status: 'PUBLISHED',
    createdBy: adminUser.userId,
    createdAt: '2026-08-05',
    updatedAt: '2026-08-05',
  },
];

// ---------------------------------------------------------------------------
// Chuẩn hóa Định Dạng Bài Giảng (Format Standardization): quy hoạch mọi bài
// giảng về đúng 5 định dạng chuẩn — SCORM, VIDEO, PDF, PPT, EXTERNAL_LINK
// (Udemy/LinkedIn Learning/Coursera/YouTube/Khác) — thay cho các lessonType cũ
// phân tán (DOCUMENT, SCRIPT, IMAGE, TEXT) VÀ thay cho việc course.modality
// (SCORM_PACKAGE/PPT_PRESENTATION/EXTERNAL_PLATFORM/YOUTUBE_LINK) từng ghi đè
// lessonType ở tầng Lesson Player. Từ nay lesson.lessonType là NGUỒN DUY NHẤT
// quyết định Player nào hiển thị — không còn đọc course.modality ở LessonPlayer.
// ASSESSMENT không nằm trong 5 định dạng này (là cổng thẩm định năng lực độc
// lập cấp khóa học/phiên bản, xem course.questionBank) nên giữ nguyên riêng.
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
        // PPT/SCORM dùng bộ trình chiếu minh họa tĩnh, không cần nội dung text cũ.
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

// Ghi danh của một học viên = dữ liệu HRIS tĩnh + phần ghi danh phát sinh trong
// phiên làm việc (overlay do CourseStore giữ, ví dụ khóa vừa được duyệt học vượt).
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

// "My Learning" list for a given user: dynamically merges user-specific enrollments
export function myLearningCourses(courseList, user, overlay = null) {
  if (!user) return [];
  const enrollments = enrollmentsForUser(user, overlay);
  return (courseList || [])
    .filter((c) => Boolean(enrollments[c.id]))
    .map((c) => {
      const userEnrollment = enrollments[c.id];
      return {
        ...c,
        enrollment: {
          ...(c.enrollment || {}),
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
    category: 'Store Operations',
    categories: ['Store Operations'],
    startDate: new Date().toISOString().slice(0, 10),
    endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    thumbnail: COURSE_IMAGE_PRESETS[8]?.url || 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?auto=format&fit=crop&w=600&q=80',
    imageUrl: COURSE_IMAGE_PRESETS[8]?.url || 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?auto=format&fit=crop&w=600&q=80',
    milestoneImage: COURSE_IMAGE_PRESETS[8]?.url || 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?auto=format&fit=crop&w=600&q=80',
    // Mặc định khóa mới nhắm tới cấp thấp nhất (Level 7) để mở tối đa cho học viên;
    // người biên soạn nâng cấp bậc mục tiêu trong Course Builder nếu cần.
    targetLevel: '7',
    targetLevelTitle: `Level 7: ${levelTitle('7')}`,
    deliveryType: 'ONLINE_ELEARNING', // 'ONLINE_ELEARNING' | 'IN_PERSON_CLASSROOM'
    // Chỉ có ý nghĩa khi deliveryType là ONLINE_ELEARNING: 'E_LEARNING' (tự học
    // qua Module/Bài học/Quiz, cơ chế hiện tại) hoặc 'VIRTUAL_CLASS' (lớp học
    // trực tuyến trực tiếp qua Zoom/Teams/Meet với Giảng viên chủ trì).
    onlineClassType: 'E_LEARNING',
    // Đa phiên bản khóa học: currentVersion trỏ tới phiên bản đang sống (đọc/ghi
    // trực tiếp qua modules/configuration bên dưới); versions{} lưu snapshot các
    // phiên bản CŨ đã bị thay thế (đóng băng vĩnh viễn tại thời điểm Publish kế
    // tiếp) để học viên đã hoàn thành/đang học dở phiên bản đó không bị ảnh
    // hưởng bởi các chỉnh sửa sau này. Xem resolveCourseView()/publishNewCourseVersion().
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
    // ID nhân sự thật (không phải trainersDirectory cũ) để đồng bộ với
    // teachingEligibleUsers() — nơi chọn Giảng viên khi tạo khóa Trực tiếp.
    trainerId: trainerHungUser.userId,
    trainerName: trainerHungUser.fullName,
    venueId: 'lab-ap-fresh',
    venue: 'Fresh Food & Bakery Practical Lab (MM An Phu)',
    scheduleDate: '2026-08-28',
    scheduleTime: '08:30 - 11:30 (3.0 hours)',
    maxCapacity: 25,
    enrolledStudents: [],
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
    // Chỉ được điền/dùng khi onlineClassType === 'VIRTUAL_CLASS'.
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

// Tính tag phiên bản kế tiếp: v1.0 -> v2.0 -> v3.0 -> ... (không giới hạn số
// lượng phiên bản, mỗi lần Publish tăng đúng 1 bậc số nguyên).
export function nextMajorVersion(v) {
  const m = /^v(\d+)/.exec(v || 'v1.0');
  const n = m ? Number(m[1]) : 1;
  return `v${n + 1}.0`;
}

// Trả về "góc nhìn" nội dung khóa học (modules/configuration/modality/format)
// đúng với phiên bản mà học viên đã ghi danh (enrolledVersion), KHÔNG PHẢI
// luôn luôn là phiên bản mới nhất:
//   - Nếu enrolledVersion trùng currentVersion (hoặc không có) -> trả về
//     course như hiện tại (đọc trực tiếp course.modules — phiên bản đang sống).
//   - Nếu enrolledVersion là một phiên bản CŨ đã bị Publish thay thế -> trả về
//     bản snapshot đóng băng trong course.versions[enrolledVersion], để người
//     đã hoàn thành/đang học dở phiên bản đó không bị ảnh hưởng bởi các chỉnh
//     sửa Admin thực hiện sau này trên phiên bản mới.
export function resolveCourseView(course, enrolledVersion) {
  if (!course) return course;
  const current = course.currentVersion || course.version || 'v1.0';
  // Ghi danh có sẵn từ ma trận HRIS gốc (100 học viên mẫu) được tạo trước khi
  // tính năng đa phiên bản tồn tại nên không có enrolledVersion — theo định
  // nghĩa, những ghi danh đó chỉ có thể phát sinh khi khóa học còn ở v1.0
  // (chưa từng Publish phiên bản nào), nên mặc định về 'v1.0' thay vì coi là
  // "trùng phiên bản hiện tại" (tránh vô tình lộ nội dung mới cho họ).
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

// Marks one lesson's progress and returns a new, immutable course object with
// enrollment recomputed — pass the result straight to CourseStore.updateCourse.
export function applyLessonProgress(course, lessonId, fields) {
  const next = cloneCourse(course);
  // Khóa học sinh tự động không mang sẵn enrollment; ghi danh được nạp từ
  // ma trận HRIS hoặc overlay của CourseStore nên cần default an toàn ở đây.
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

const WEEKDAY_LABELS_VI = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ Nhật'];

/**
 * Tổng giờ học gộp theo THỨ trong tuần (Thứ 2 -> Chủ Nhật), tính từ toàn bộ
 * timeSpent + timestamp thật trong getUserLearningHistory — không giới hạn
 * theo 1 tuần lịch cụ thể, vì các mốc thời gian trong mock data là ngày cố
 * định (2026) không khớp với đồng hồ hệ thống thật lúc chạy demo. Kết quả là
 * "học viên này có xu hướng học nhiều vào thứ mấy", vẫn 100% dữ liệu thật,
 * không phải số bịa, và không bao giờ rỗng cho persona có log (kể cả giới
 * hạn fallback về USR-1042 cho các persona chưa có log riêng).
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
    title: 'Store Practical Lab: Food Safety Standards & Commercial Bakery Deck Operations',
    category: 'Fresh Food Practice',
    modality: 'OFFLINE_STORE',
    trainerId: trainerHungUser.userId,
    trainerName: trainerHungUser.fullName,
    trainerTitle: 'Master Trainer (L&OD)',
    trainerRating: 4.9,
    date: '2026-08-28',
    time: '08:30 - 11:30 (3.0 hours)',
    venueId: 'lab-ap-fresh',
    venue: 'Fresh Food & Bakery Lab - MM Mega Market An Phu (Flagship)',
    maxCapacity: 25,
    enrolledCount: 21,
    status: 'UPCOMING',
    isEnrolled: true,
    attendanceStatus: 'PENDING_CHECKIN', // PENDING_CHECKIN, CHECKED_IN, ABSENT
    qrToken: 'MMVN-QR-ILT001-20260828',
    description: 'Hands-on sanitation and sterilization of dough mixers, oven pressure calibration, and mechanical jam handling compliant with Gold HACCP standards.',
    prerequisiteCourse: 'Food Safety & Hygiene Standards (HACCP)',
    enrolledStudents: [
      { id: 'MMVN-1042', name: 'Minh Tran', position: 'Bakery Specialist', store: 'MM An Phu', attendance: 'CONFIRMED' },
      { id: 'MMVN-1078', name: 'Sarah Johnson', position: 'Pastry Chef Associate', store: 'MM An Phu', attendance: 'CONFIRMED' },
      { id: 'MMVN-2041', name: 'Quoc Bao', position: 'Store Fresh Associate', store: 'MM An Phu', attendance: 'CONFIRMED' },
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
    prerequisiteCourse: 'Corporate Orientation',
    enrolledStudents: [],
  },
  {
    id: 'ilt-003',
    code: 'WEB-SEC-03',
    title: 'Webinar: POS Terminal Information Security & Anti-Phishing Tactics',
    category: 'Information Security',
    modality: 'ONLINE_WEBINAR',
    // Minh họa System Admin cũng đứng lớp khi được phân công — chủ đề bảo mật
    // thông tin khớp đúng chuyên môn IT/Cybersecurity của SysAdmin.
    trainerId: sysAdminUser.userId,
    trainerName: sysAdminUser.fullName,
    trainerTitle: 'Lead IT Systems Administrator & Cybersecurity Lead',
    trainerRating: 4.85,
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
    prerequisiteCourse: 'Information Security Awareness',
    enrolledStudents: [],
  },
  {
    id: 'ilt-004',
    code: 'WS-POS-04',
    title: 'Store Practical Lab: High-Speed POS Checkout & Customer Complaint Handling',
    category: 'Frontline Excellence',
    modality: 'OFFLINE_STORE',
    // Minh họa HRBP cũng đứng lớp khi được phân công — chủ đề xử lý khiếu nại
    // khách hàng gắn liền với năng lực People Partnering của HRBP.
    trainerId: hrbpUser.userId,
    trainerName: hrbpUser.fullName,
    trainerTitle: 'HR Business Partner - Head of People Partnering',
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
    enrolledStudents: [],
  },
];

// ---------------------------------------------------------------------------
// Learning Paths (Career Progression, Onboarding, Thánh Gióng, SGM, 10/20/70)
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
        courseId: 'CRS-CULT-095',
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
        courseId: 'CRS-HSE-017',
        courseTitle: 'On-site Fire Safety & Emergency Evacuation (PCCC)',
        type: 'E_LEARNING_ASSESSMENT',
        status: 'COMPLETED',
        score: 90,
      },
      {
        step: 4,
        title: 'Stage 4: Store Practical Lab & On-the-Job Floor Checklist Audit',
        courseId: 'ilt-001',
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
        courseId: 'CRS-CULT-095',
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
        courseId: 'ilt-003',
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
    title: 'Thánh Gióng Fast-track Retail Leadership Pipeline',
    trackType: 'TALENT_PIPELINE',
    targetBranch: 'OPERATIONS',
    targetRole: 'Hi-Potential Associates -> Shift Leaders / Section Supervisors',
    targetAudience: 'Top 5% high-potential operations talent nominated for leadership succession',
    totalCourses: 5,
    completedCourses: 2,
    progressPercent: 40,
    estimatedWeeks: '16 weeks (4 months)',
    badgeReward: 'Thánh Gióng Leader Emblem',
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
        courseId: 'CRS-LEAD-043',
        courseTitle: 'Leadership Essentials for Managers (MMVN & LinkedIn)',
        type: 'E_LEARNING',
        status: 'COMPLETED',
        score: 96,
      },
      {
        step: 2,
        title: 'Stage 2: Coaching Skills (Social 20%) & High-Impact Feedback',
        courseId: 'CRS-LEAD-044',
        courseTitle: 'Coaching & Giving High-Impact Constructive Feedback',
        type: 'E_LEARNING',
        status: 'COMPLETED',
        score: 92,
      },
      {
        step: 3,
        title: 'Stage 3: Store Operations Management & Shrinkage Reduction',
        courseId: 'CRS-STOPS-035',
        courseTitle: 'Shrinkage Reduction & Anti-Theft Surveillance',
        type: 'E_LEARNING_ASSESSMENT',
        status: 'IN_PROGRESS',
        score: null,
      },
      {
        step: 4,
        title: 'Stage 4: Experiential 70% Project: Supply Chain & Floor Layout Optimization',
        courseId: 'CRS-MERCH-067',
        courseTitle: 'Promotional Strategy & Space Range Merchandising',
        type: 'E_LEARNING',
        status: 'NOT_STARTED',
        score: null,
      },
      {
        step: 5,
        title: 'Stage 5: Capstone Project Defense before Board of Management (BOM)',
        courseId: 'ilt-001',
        courseTitle: 'Store Practical Lab: Food Safety Standards & Bakery Operations',
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
        courseId: 'CRS-LEAD-047',
        courseTitle: 'Store P&L Financial Literacy for General Managers',
        type: 'E_LEARNING_ASSESSMENT',
        status: 'COMPLETED',
        score: 94,
      },
      {
        step: 2,
        title: 'Stage 2: Strategic Thinking & Annual Retail Business Planning',
        courseId: 'CRS-LEAD-046',
        courseTitle: 'Strategic Thinking & Annual Retail Business Planning',
        type: 'E_LEARNING',
        status: 'IN_PROGRESS',
        score: null,
      },
      {
        step: 3,
        title: 'Stage 3: Vendor Negotiation & Joint Business Planning (JBP)',
        courseId: 'CRS-MERCH-066',
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
        courseId: 'ilt-001',
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
        courseId: 'CRS-CULT-095',
        courseTitle: 'Corporate Orientation',
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
        courseId: 'ilt-001',
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
    courseId: 'CRS-COLD-025',
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
    courseId: 'CRS-STOPS-033',
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
    targetRole: 'Bakery Shift Supervisor (Thánh Gióng Pipeline)',
    readiness: 'READY_IN_6_MONTHS',
    overallGap: -8,
    skills: [
      { name: 'HACCP & Hygiene Compliance', required: 90, actual: 95, gap: 0, status: 'EXCEEDED' },
      { name: 'Artisan Bakery Production', required: 85, actual: 90, gap: 0, status: 'EXCEEDED' },
      { name: 'Shrinkage & Spoilage Control', required: 80, actual: 65, gap: -15, status: 'GAP_IDENTIFIED', suggestedCourseId: 'CRS-STOPS-035', suggestedCourse: 'Shrinkage Reduction & Anti-Theft Surveillance' },
      { name: 'Team Coaching (Social 20%)', required: 75, actual: 60, gap: -15, status: 'GAP_IDENTIFIED', suggestedCourseId: 'CRS-LEAD-044', suggestedCourse: 'Coaching & Giving High-Impact Constructive Feedback' },
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
      { name: 'Planogram Space Merchandising', required: 80, actual: 60, gap: -20, status: 'GAP_IDENTIFIED', suggestedCourseId: 'CRS-STOPS-033', suggestedCourse: 'Store Operations Excellence & Planogram Compliance' },
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
      { name: 'Cold Chain Perishables Preservation', required: 90, actual: 55, gap: -35, status: 'CRITICAL_GAP', suggestedCourseId: 'CRS-COLD-025', suggestedCourse: 'Cold Chain & Warehouse Perishables Quality Control' },
      { name: 'Workplace Fire Safety & HSE', required: 80, actual: 70, gap: -10, status: 'GAP_IDENTIFIED', suggestedCourseId: 'CRS-HSE-017', suggestedCourse: 'On-site Fire Safety & Emergency Evacuation (PCCC)' },
      { name: 'Horeca Client Communication', required: 75, actual: 72, gap: -3, status: 'GAP_IDENTIFIED', suggestedCourseId: 'CRS-CSERV-087', suggestedCourse: 'Customer Care Excellence & Horeca Client Service' },
    ],
  },
];

// ---------------------------------------------------------------------------
// Cost Tracking & L&D Training Budget Management Data
// ---------------------------------------------------------------------------

export const costTrackingData = {
  totalBudgetAnnual: 4500000000, // 4.5 tỷ VNĐ
  totalSpentYTD: 2850000000, // 2.85 tỷ VNĐ
  costPerLearnerAvg: 1328000, // ~1.3 triệu / nhân viên
  budgetUtilization: '63.3%',
  externalPlatformLicenses: [
    { platform: 'LinkedIn Learning Enterprise (B2B Pack)', licenses: 250, costAnnual: 625000000, costPerSeat: 2500000, utilizationRate: '92%', activeLearners: 230 },
    { platform: 'Coursera for Business (Retail Specialization)', licenses: 100, costAnnual: 480000000, costPerSeat: 4800000, utilizationRate: '88%', activeLearners: 88 },
    { platform: 'Udemy Business Technical & Data Analytics', licenses: 50, costAnnual: 180000000, costPerSeat: 3600000, utilizationRate: '94%', activeLearners: 47 },
  ],
  departmentSpend: [
    { name: 'Khối Vận hành Siêu thị (Store Operations)', budget: 2200000000, spent: 1540000000, learners: 1450, costPerHead: 1062000, utilization: '70.0%' },
    { name: 'Khối Trụ sở chính (Supporting Functions / Office)', budget: 1300000000, spent: 820000000, learners: 420, costPerHead: 1952000, utilization: '63.1%' },
    { name: 'Chuỗi Cung ứng & Logistics DC', budget: 650000000, spent: 340000000, learners: 210, costPerHead: 1619000, utilization: '52.3%' },
    { name: 'Chương trình Thánh Gióng & SGM Talent Pipeline', budget: 350000000, spent: 150000000, learners: 65, costPerHead: 2307000, utilization: '42.8%' },
  ],
};

// ---------------------------------------------------------------------------
// Cross-Company Competency Gap Heatmap (Operations Stores vs Supporting Office)
// ---------------------------------------------------------------------------

export const companyHeatmapData = {
  operations: [
    { entity: 'MM An Phú (Flagship HCMC)', area: 'Miền Nam', foodSafety: 96, coldChain: 94, shrinkControl: 88, posSpeed: 95, customerService: 92, leadership: 86, gapAvg: 8, auditReady: true },
    { entity: 'MM Bình Phú (Quận 6 HCMC)', area: 'Miền Nam', foodSafety: 91, coldChain: 89, shrinkControl: 82, posSpeed: 90, customerService: 88, leadership: 80, gapAvg: 13, auditReady: true },
    { entity: 'MM Hiệp Phú (Quận 12 HCMC)', area: 'Miền Nam', foodSafety: 89, coldChain: 86, shrinkControl: 79, posSpeed: 87, customerService: 85, leadership: 78, gapAvg: 16, auditReady: false },
    { entity: 'MM Thăng Long (Hà Nội)', area: 'Miền Bắc', foodSafety: 94, coldChain: 92, shrinkControl: 86, posSpeed: 93, customerService: 90, leadership: 84, gapAvg: 9, auditReady: true },
    { entity: 'MM Hà Đông (Hà Nội)', area: 'Miền Bắc', foodSafety: 88, coldChain: 85, shrinkControl: 80, posSpeed: 88, customerService: 86, leadership: 79, gapAvg: 16, auditReady: false },
    { entity: 'MM Đà Nẵng (Miền Trung)', area: 'Miền Trung', foodSafety: 93, coldChain: 90, shrinkControl: 85, posSpeed: 92, customerService: 89, leadership: 82, gapAvg: 11, auditReady: true },
    { entity: 'MM Hưng Lợi (Cần Thơ)', area: 'Miền Nam', foodSafety: 90, coldChain: 88, shrinkControl: 81, posSpeed: 89, customerService: 87, leadership: 80, gapAvg: 14, auditReady: true },
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

// Đơn xin học vượt cấp (Sequential Level Gate). Mỗi đơn xin đúng MỘT khóa học
// nằm cao hơn học viên đúng 1 cấp liền kề. Người duyệt luôn là User Admin
// hoặc System Admin — 2 role duy nhất còn giữ canApproveLevelSkip — bất kể
// người gửi đơn là role nào; Manager/Trainer/L&D/HRBP chỉ còn gửi đơn cho
// chính mình, không duyệt cho ai nữa. 6 đơn dưới đây minh họa cả 5 role đều
// tự gửi đơn xin vượt cấp cho bản thân, tất cả cùng đổ về 1 hàng đợi chung.
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
    justification: 'Em đã hoàn thành các khóa vệ sinh cơ bản Level 7 và muốn học sớm quy trình HACCP chuyên sâu của Level 6 để chuẩn bị lên Chuyên viên vận hành quầy bánh.',
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
    justification: 'Em tham gia đội phản ứng nhanh PCCC của MM An Phú và cần chứng chỉ vận hành thiết bị chuyên dụng ở cấp Chuyên viên.',
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
    justification: 'Tôi muốn chuẩn bị năng lực hoạch định chiến lược trước khi được quy hoạch lên vị trí Store General Manager.',
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
    justification: 'Cần chuẩn hóa kỹ năng đánh giá KPI để đồng bộ với khung năng lực Level 2 trước khi triển khai đại trà cho đội giảng viên.',
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
    justification: 'Đăng ký học trước khung năng lực lãnh đạo Level 1 phục vụ lộ trình kế nhiệm Trưởng phòng Nhân sự.',
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
    justification: 'Chuẩn bị năng lực lãnh đạo Level 1 trước khi mở rộng phạm vi quản trị nhân sự toàn hệ thống.',
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


