/* Temporary smoke harness: server-renders every route, for every persona. */
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

// In-memory localStorage so CourseStore can hydrate a chosen persona.
const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
  clear: () => store.clear(),
};

const { CourseStoreProvider } = await import('../src/state/CourseStore');
const { personaForRole, pendingApprovalRequests } = await import('../src/data/mockData');
const { ROLE_ORDER, roleDefinition } = await import('../src/data/roles');

const Sidebar = (await import('../src/components/Sidebar')).default;
const LearnerDashboard = (await import('../src/pages/learner/LearnerDashboard')).default;
const LearnerCourses = (await import('../src/pages/learner/LearnerCourses')).default;
const LearnerCourseDetail = (await import('../src/pages/learner/LearnerCourseDetail')).default;
const LearnerCertificates = (await import('../src/pages/learner/LearnerCertificates')).default;
const LearnerHistory = (await import('../src/pages/learner/LearnerHistory')).default;
const LearnerClassrooms = (await import('../src/pages/learner/LearnerClassrooms')).default;
const LearnerLearningPaths = (await import('../src/pages/learner/LearnerLearningPaths')).default;
const AiLearningHub = (await import('../src/pages/learner/AiLearningHub')).default;
const ManagerDashboard = (await import('../src/pages/manager/ManagerDashboard')).default;
const ManagerTeam = (await import('../src/pages/manager/ManagerTeam')).default;
const ManagerCourses = (await import('../src/pages/manager/ManagerCourses')).default;
const ManagerReports = (await import('../src/pages/manager/ManagerReports')).default;
const ManagerApprovals = (await import('../src/pages/manager/ManagerApprovals')).default;
const MyLearning = (await import('../src/pages/shared/MyLearning')).default;
const MyCertificates = (await import('../src/pages/shared/MyCertificates')).default;
const LessonPlayer = (await import('../src/pages/player/LessonPlayer')).default;
const AssessmentPlayer = (await import('../src/pages/player/AssessmentPlayer')).default;
const AdminDashboard = (await import('../src/pages/admin/AdminDashboard')).default;
const AdminCourses = (await import('../src/pages/admin/AdminCourses')).default;
const AdminCourseBuilder = (await import('../src/pages/admin/AdminCourseBuilder')).default;
const AdminConfig = (await import('../src/pages/admin/AdminConfig')).default;
const AdminReports = (await import('../src/pages/admin/AdminReports')).default;
const AdminTrainingOps = (await import('../src/pages/admin/AdminTrainingOps')).default;
const TrainerHub = (await import('../src/pages/trainer/TrainerHub')).default;
const HrbpDashboard = (await import('../src/pages/hrbp/HrbpDashboard')).default;
const UserAdminPortal = (await import('../src/pages/useradmin/UserAdminPortal')).default;
const SysAdminPortal = (await import('../src/pages/sysadmin/SysAdminPortal')).default;

const AUTH_KEY = 'mm-megalearn-auth-v6';
const APPROVAL_KEY = 'mm-megalearn-approvals-v6';

let failures = 0;
function check(label, ok, extra = '') {
  if (!ok) { failures += 1; console.log('FAIL  ' + label + (extra ? ' :: ' + extra : '')); }
  else console.log('ok    ' + label);
}

function actAs(role) {
  store.set(AUTH_KEY, JSON.stringify(personaForRole(role)));
}

function render(label, element, path, pattern) {
  try {
    return renderToStaticMarkup(
      <MemoryRouter initialEntries={[path]}>
        <CourseStoreProvider>
          <Routes><Route path={pattern} element={element} /></Routes>
        </CourseStoreProvider>
      </MemoryRouter>
    );
  } catch (err) {
    failures += 1;
    console.log('FAIL  ' + label + ' :: ' + err.message);
    return null;
  }
}

// ---------------------------------------------------------------------------
console.log('=== 0. Data model: 7 levels, 6 roles, sequential gate ===');
const { generated100Users, generated100Courses, generated100EnrollmentMatrix } = await import('../src/data/generated100Data');
const { checkCourseAccessRule, ACCESS_STATE } = await import('../src/data/levelSystem');
const mock = await import('../src/data/mockData');


// --- Courses -------------------------------------------------------------
check('100 courses generated', generated100Courses.length === 100, String(generated100Courses.length));
const byLevel = {};
for (const c of generated100Courses) byLevel[c.targetLevel] = (byLevel[c.targetLevel] || 0) + 1;
console.log('      course targetLevel distribution:', JSON.stringify(byLevel));
check('every course targetLevel in 1..7', generated100Courses.every((c) => ['1','2','3','4','5','6','7'].includes(String(c.targetLevel))));
check('all 7 levels represented in catalog', Object.keys(byLevel).length === 7, Object.keys(byLevel).join(','));
check('course targetLevelTitle derived', generated100Courses[0].targetLevelTitle.startsWith('Level '), generated100Courses[0].targetLevelTitle);
check('mandatory assignment.targetLevel synced',
  generated100Courses.filter((c) => c.assignment).every((c) => c.assignment.targetLevel === c.targetLevel));

// --- Users ---------------------------------------------------------------
check('100 users generated', generated100Users.length === 100);
const userLevels = {};
for (const u of generated100Users) userLevels[u.level] = (userLevels[u.level] || 0) + 1;
console.log('      user level distribution:', JSON.stringify(userLevels));
check('no legacy CL/IN levels remain', !('CL' in userLevels) && !('IN' in userLevels));
check('no legacy admin role remains', generated100Users.every((u) => u.role !== 'admin'));

const minh = generated100Users.find((u) => u.userId === 'USR-1042');
check('Minh Tran is Level 7 learner', minh.level === '7' && minh.role === 'learner', minh.level + '/' + minh.role);
const david = generated100Users.find((u) => u.userId === 'USR-0245');
check('David Tran is Level 4 manager', david.level === '4' && david.role === 'manager');

// --- Personas ------------------------------------------------------------
const personaExpect = [
  ['learner', 'USR-1042', '7'],
  ['manager', 'USR-0245', '4'],
  ['trainer', 'USR-9003', '3'],
  ['hrbp', 'USR-9004', '2'],
  ['useradmin', 'USR-9002', '2'],
  ['sysadmin', 'USR-9001', '1'],
];
for (const [role, id, level] of personaExpect) {
  const p = mock.personaForRole(role);
  check(`persona ${role} = ${id} Level ${level}`, p.userId === id && p.level === level && p.role === role,
    `${p.userId}/${p.level}/${p.role}`);
}
check('allUsers has no duplicate ids', new Set(mock.allUsers().map((u) => u.userId)).size === mock.allUsers().length);
check('allUsers covers 6 roles', new Set(mock.allUsers().map((u) => u.role)).size === 6,
  [...new Set(mock.allUsers().map((u) => u.role))].join(','));

// --- Enrollments ---------------------------------------------------------
const minhEnr = generated100EnrollmentMatrix['USR-1042'];
check('Minh Tran has enrollments (P8 regression)', Object.keys(minhEnr).length === 12, String(Object.keys(minhEnr).length));
check('Minh Tran enrollments all resolve to real courses',
  Object.keys(minhEnr).every((id) => generated100Courses.some((c) => c.id === id)));
check('Minh Tran only enrolled in Level 7 courses',
  Object.keys(minhEnr).every((id) => generated100Courses.find((c) => c.id === id).targetLevel === '7'));

const violations = [];
for (const u of generated100Users) {
  for (const id of Object.keys(generated100EnrollmentMatrix[u.userId] || {})) {
    const c = generated100Courses.find((x) => x.id === id);
    if (Number(u.level) - Number(c.targetLevel) > 0) violations.push(`${u.userId}(L${u.level}) -> ${id}(L${c.targetLevel})`);
  }
}
check('nobody auto-enrolled above their level', violations.length === 0, violations.slice(0, 3).join(' | '));
const emptyUsers = generated100Users.filter((u) => Object.keys(generated100EnrollmentMatrix[u.userId] || {}).length === 0);
check('every user has at least 1 enrollment', emptyUsers.length === 0, emptyUsers.slice(0, 3).map((u) => u.userId + ' L' + u.level).join(','));

// --- Sequential Level Gate ----------------------------------------------
const L7 = { level: '7' };
const c7 = { id: 'c7', targetLevel: '7' };
const c6 = { id: 'c6', targetLevel: '6' };
const c5 = { id: 'c5', targetLevel: '5' };
const c1 = { id: 'c1', targetLevel: '1' };
check('L7 -> L7 course OPEN', checkCourseAccessRule(c7, L7).state === ACCESS_STATE.OPEN);
check('L7 -> L6 course REQUESTABLE', checkCourseAccessRule(c6, L7).state === ACCESS_STATE.REQUESTABLE);
check('L7 -> L6 pending', checkCourseAccessRule(c6, L7, { pendingCourseIds: ['c6'] }).state === ACCESS_STATE.PENDING_APPROVAL);
check('L7 -> L6 approved unlocks', checkCourseAccessRule(c6, L7, { approvedCourseIds: ['c6'] }).canAccess === true);
check('L7 -> L5 hard locked', checkCourseAccessRule(c5, L7).state === ACCESS_STATE.LOCKED_LEVEL_GAP);
check('L7 -> L5 not requestable', checkCourseAccessRule(c5, L7).requiresApproval === false);
check('L7 -> L1 hard locked', checkCourseAccessRule(c1, L7).state === ACCESS_STATE.LOCKED_LEVEL_GAP);
check('approval cannot bypass 2-level jump', checkCourseAccessRule(c5, L7, { approvedCourseIds: ['c5'] }).canAccess === false);
check('L4 manager -> L7 course OPEN', checkCourseAccessRule(c7, { level: '4' }).state === ACCESS_STATE.OPEN);
check('L4 manager -> L3 course REQUESTABLE', checkCourseAccessRule({ id: 'x', targetLevel: '3' }, { level: '4' }).state === ACCESS_STATE.REQUESTABLE);
check('L1 BOM -> L1 course OPEN', checkCourseAccessRule(c1, { level: '1' }).state === ACCESS_STATE.OPEN);
check('legacy CL level treated as 7', checkCourseAccessRule(c6, { level: 'CL' }).state === ACCESS_STATE.REQUESTABLE);
check('roadmap listed for blocked jump',
  (checkCourseAccessRule(c5, L7).blockedRoadmap || []).join(',') === '6,5');

// --- Approval seed data --------------------------------------------------
for (const req of mock.pendingApprovalRequests) {
  const c = generated100Courses.find((x) => x.id === req.courseId);
  check(`approval ${req.id} points at a real course`, Boolean(c), req.courseId);
  if (c) check(`approval ${req.id} is exactly 1 level up`, Number(req.currentLevel) - Number(c.targetLevel) === 1,
    `${req.currentLevel} vs ${c.targetLevel}`);
}

// --- Managed hierarchy ---------------------------------------------------
const scopes = {};
for (const [role] of personaExpect) {
  const managed = mock.getManagedUsers(mock.personaForRole(role));
  scopes[role] = [...new Set(managed.map((u) => u.role))].sort().join(',');
}
console.log('      managed role scope:', JSON.stringify(scopes, null, 0));
check('learner manages nobody', mock.getManagedUsers(mock.personaForRole('learner')).length === 0);
check('manager manages only learners', scopes.manager === 'learner', scopes.manager);
check('sysadmin manages useradmin too', scopes.sysadmin.includes('useradmin'), scopes.sysadmin);
check('useradmin does not manage sysadmin', !scopes.useradmin.includes('sysadmin'), scopes.useradmin);


const PAGES = [
  ['LearnerDashboard', <LearnerDashboard />, '/learner', '/learner'],
  ['LearnerCourses', <LearnerCourses />, '/learner/courses', '/learner/courses'],
  ['CourseDetail L7 (open)', <LearnerCourseDetail />, '/learner/courses/CRS-FSH-001', '/learner/courses/:courseId'],
  ['CourseDetail L6 (1 level up)', <LearnerCourseDetail />, '/learner/courses/CRS-FSH-005', '/learner/courses/:courseId'],
  ['CourseDetail L1 (blocked)', <LearnerCourseDetail />, '/learner/courses/CRS-LEAD-058', '/learner/courses/:courseId'],
  ['LearnerCertificates', <LearnerCertificates />, '/learner/certificates', '/learner/certificates'],
  ['LearnerHistory', <LearnerHistory />, '/learner/history', '/learner/history'],
  ['LearnerClassrooms', <LearnerClassrooms />, '/learner/classrooms', '/learner/classrooms'],
  ['LearnerLearningPaths', <LearnerLearningPaths />, '/learner/paths', '/learner/paths'],
  ['AiLearningHub', <AiLearningHub />, '/learner/ai-hub', '/learner/ai-hub'],
  ['LessonPlayer L7', <LessonPlayer />, '/learner/courses/CRS-FSH-001/lessons/les-1-1-CRS-FSH-001', '/learner/courses/:courseId/lessons/:lessonId'],
  ['LessonPlayer L1 blocked', <LessonPlayer />, '/learner/courses/CRS-LEAD-058/lessons/les-1-1-CRS-LEAD-058', '/learner/courses/:courseId/lessons/:lessonId'],
  ['AssessmentPlayer L7', <AssessmentPlayer />, '/learner/courses/CRS-FSH-001/assessment', '/learner/courses/:courseId/assessment'],
  ['ManagerDashboard', <ManagerDashboard />, '/manager', '/manager'],
  ['ManagerTeam', <ManagerTeam />, '/manager/team', '/manager/team'],
  ['ManagerCourses', <ManagerCourses />, '/manager/courses', '/manager/courses'],
  ['ManagerReports', <ManagerReports />, '/manager/reports', '/manager/reports'],
  ['ManagerApprovals', <ManagerApprovals />, '/manager/approvals', '/manager/approvals'],
  ['MyLearning', <MyLearning />, '/my-learning', '/my-learning'],
  ['MyCertificates', <MyCertificates />, '/my-certificates', '/my-certificates'],
  ['TrainerHub/CLASSES', <TrainerHub initialTab="CLASSES" />, '/trainer', '/trainer'],
  ['TrainerHub/ATTENDANCE', <TrainerHub initialTab="ATTENDANCE" />, '/trainer/attendance', '/trainer/attendance'],
  ['TrainerHub/FEEDBACK', <TrainerHub initialTab="FEEDBACK" />, '/trainer/feedback', '/trainer/feedback'],
  ['TrainerHub/LABS', <TrainerHub initialTab="LABS" />, '/trainer/labs', '/trainer/labs'],
  ['Hrbp/SKILL_GAP', <HrbpDashboard initialTab="SKILL_GAP" />, '/hrbp', '/hrbp'],
  ['Hrbp/SUCCESSION', <HrbpDashboard initialTab="SUCCESSION" />, '/hrbp/succession', '/hrbp/succession'],
  ['Hrbp/COMPLIANCE', <HrbpDashboard initialTab="COMPLIANCE" />, '/hrbp/compliance', '/hrbp/compliance'],
  ['UserAdmin/DIRECTORY', <UserAdminPortal initialTab="DIRECTORY" />, '/user-admin', '/user-admin'],
  ['UserAdmin/HIERARCHY', <UserAdminPortal initialTab="HIERARCHY" />, '/user-admin/hierarchy', '/user-admin/hierarchy'],
  ['UserAdmin/JOB_LEVELS', <UserAdminPortal initialTab="JOB_LEVELS" />, '/user-admin/job-levels', '/user-admin/job-levels'],
  ['UserAdmin/ALLOCATION', <UserAdminPortal initialTab="ALLOCATION" />, '/user-admin/allocation', '/user-admin/allocation'],
  ['UserAdmin/TRAINERS', <UserAdminPortal initialTab="TRAINER_ASSIGNMENT" />, '/user-admin/trainers', '/user-admin/trainers'],
  ['SysAdmin/HRIS', <SysAdminPortal initialTab="HRIS" />, '/sysadmin', '/sysadmin'],
  ['SysAdmin/AUDIT', <SysAdminPortal initialTab="AUDIT_LOGS" />, '/sysadmin/audit', '/sysadmin/audit'],
  ['SysAdmin/POLICIES', <SysAdminPortal initialTab="POLICIES" />, '/sysadmin/policies', '/sysadmin/policies'],
  ['SysAdmin/ROLES', <SysAdminPortal initialTab="ROLE_GOVERNANCE" />, '/sysadmin/roles', '/sysadmin/roles'],
  ['AdminDashboard', <AdminDashboard />, '/admin', '/admin'],
  ['AdminCourses', <AdminCourses />, '/admin/courses', '/admin/courses'],
  ['AdminCourseBuilder', <AdminCourseBuilder />, '/admin/courses/new', '/admin/courses/:courseId'],
  ['AdminConfig', <AdminConfig />, '/admin/config', '/admin/config'],
  ['AdminReports', <AdminReports />, '/admin/reports', '/admin/reports'],
  ['AdminTrainingOps', <AdminTrainingOps />, '/admin/training-ops', '/admin/training-ops'],
];

// ---------------------------------------------------------------------------
console.log(String.fromCharCode(10) + '=== 1. Every page renders for every one of the 6 roles ===');
const byRole = {};
for (const role of ROLE_ORDER) {
  actAs(role);
  byRole[role] = {};
  let okCount = 0;
  for (const [label, element, path, pattern] of PAGES) {
    const html = render(role + ' / ' + label, element, path, pattern);
    if (html) { byRole[role][label] = html; okCount += 1; }
  }
  console.log(`      ${role.padEnd(10)} ${okCount}/${PAGES.length} pages rendered`);
}

console.log('\n=== 2. Sidebar shows the right persona & nav per role ===');
for (const role of ROLE_ORDER) {
  actAs(role);
  const html = render('Sidebar/' + role, <Sidebar role={role} collapsed={false} />, '/', '/');
  if (!html) continue;
  const persona = personaForRole(role);
  const def = roleDefinition(role);
  const hasLearningGroup = role === 'learner' ? html.includes('Khóa Học Của Tôi') : html.includes('Học tập của tôi');
  const esc = (t) => t.replace(/&/g, '&amp;');
  check(`Sidebar/${role}: persona ${persona.fullName} + learner access`,
    html.includes(esc(persona.fullName)) && html.includes(esc(def.labelVi)) && hasLearningGroup);
}

console.log('\n=== 3. Sequential level gate — Minh Tran (Level 7 learner) ===');
{
  const p = byRole.learner;
  check('L7 course opens without approval', !p['CourseDetail L7 (open)'].includes('Xin Phê Duyệt Học Vượt Cấp'));
  check('L6 course offers the approval request', p['CourseDetail L6 (1 level up)'].includes('Xin Phê Duyệt Học Vượt Cấp'));
  check('L1 course is hard-blocked as a level jump', p['CourseDetail L1 (blocked)'].includes('Bị Chặn Nhảy Cóc Cấp Bậc'));
  check('blocked course shows the roadmap it must climb', p['CourseDetail L1 (blocked)'].includes('Lộ trình bắt buộc phải đi qua'));
  check('lesson player opens for an L7 course', !p['LessonPlayer L7'].includes('Lesson not found') && !p['LessonPlayer L7'].includes('chưa mở theo quy tắc'));
  check('lesson player blocks an L1 course', p['LessonPlayer L1 blocked'].includes('chưa mở theo quy tắc'));
  check('assessment player opens for an L7 course', !p['AssessmentPlayer L7'].includes('Assessment not found'));
  check('catalog states the level-gate rule', p['LearnerCourses'].includes('Sequential Level Gate'));
  check('learner cannot open the approvals queue', p['ManagerApprovals'].includes('không có quyền phê duyệt'));
}

console.log('\n=== 4. Approvals queue for the 5 management roles ===');
for (const role of ROLE_ORDER.filter((r) => r !== 'learner')) {
  const html = byRole[role]['ManagerApprovals'];
  check(`${role} sees the level-skip queue`,
    html.includes('Học vượt cấp') && html.includes('Phê Duyệt Đơn Học Vượt Cấp'));
}

console.log('\n=== 5. Seeded approval requests are coherent ===');
{
  const html = byRole.manager['ManagerApprovals'];
  for (const req of pendingApprovalRequests) {
    check(`request from ${req.employeeName} is listed`, html.includes(req.employeeName));
  }
  check('request cards mark a 1-level jump as valid', html.includes('Vượt đúng 1 cấp liền kề — hợp lệ'));
}

console.log('\n=== 6. Every role reaches its own learning portal ===');
for (const role of ROLE_ORDER) {
  const html = byRole[role]['MyLearning'];
  const persona = personaForRole(role);
  check(`${role} sees a personal catalog at their own level`,
    html.includes(persona.fullName) && html.includes('Lộ Trình Học Vượt Cấp Tuần Tự'));
}

console.log('\n=== 7. Request -> approve -> unlock state transitions (L7 -> L6) ===');
{
  actAs('learner');
  const req = {
    id: 'req-test-1', requestType: 'LEVEL_ADVANCE', userId: 'USR-1042', employeeId: 'MMVN-1042',
    employeeName: 'Minh Tran', position: 'Junior Bakery Associate', department: 'PPF',
    currentLevel: '7', courseLevel: '6', courseId: 'CRS-FSH-005',
    courseName: 'Bakery Sanitation', requestDate: '2026-08-24',
    justification: 'Test', courseCost: 'Internal', status: 'PENDING',
  };

  store.set(APPROVAL_KEY, JSON.stringify([req]));
  let html = render('pending detail', <LearnerCourseDetail />, '/learner/courses/CRS-FSH-005', '/learner/courses/:courseId');
  check('while PENDING the course shows waiting-for-approval', html.includes('Đang Chờ Duyệt'));
  check('while PENDING the request button is gone', !html.includes('Xin Phê Duyệt Học Vượt Cấp'));

  store.set(APPROVAL_KEY, JSON.stringify([{ ...req, status: 'APPROVED' }]));
  html = render('approved detail', <LearnerCourseDetail />, '/learner/courses/CRS-FSH-005', '/learner/courses/:courseId');
  check('once APPROVED the L6 course unlocks', html.includes('Đã Duyệt Học Vượt'));
  const lessonHtml = render('approved lesson', <LessonPlayer />, '/learner/courses/CRS-FSH-005/lessons/les-1-1-CRS-FSH-005', '/learner/courses/:courseId/lessons/:lessonId');
  check('once APPROVED the lesson player opens', !lessonHtml.includes('chưa mở theo quy tắc'));

  store.set(APPROVAL_KEY, JSON.stringify([{ ...req, status: 'REJECTED' }]));
  html = render('rejected detail', <LearnerCourseDetail />, '/learner/courses/CRS-FSH-005', '/learner/courses/:courseId');
  check('once REJECTED the learner may re-apply', html.includes('Xin Phê Duyệt Học Vượt Cấp') && html.includes('từ chối'));

  store.set(APPROVAL_KEY, JSON.stringify([{ ...req, courseId: 'CRS-LEAD-058', courseLevel: '1', status: 'APPROVED' }]));
  html = render('approved 2-level jump', <LearnerCourseDetail />, '/learner/courses/CRS-LEAD-058', '/learner/courses/:courseId');
  check('an approval cannot unlock a 2+ level jump', html.includes('Bị Chặn Nhảy Cóc Cấp Bậc'));
  store.delete(APPROVAL_KEY);
}

console.log('\n' + (failures === 0 ? 'SMOKE PASSED' : failures + ' SMOKE FAILURE(S)'));
process.exit(failures === 0 ? 0 : 1);
