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
const { personaForRole, pendingApprovalRequests, courses: mockCourses } = await import('../src/data/mockData');
const { ROLE_ORDER, roleDefinition } = await import('../src/data/roles');

// CRS-FSH-005 (used below as the "1 level up, requires approval" fixture)
// lands in mockData's date-driven CLOSED lifecycle bucket by pure index
// cycling (~10% of courses are seeded CLOSED). Since AdminCourses now shows
// CLOSED courses to non-admin roles (labeled "Đã Qua Thời Gian Tham Gia") and
// LearnerCourseDetail correctly blocks registration on them, that unrelated
// seeding coincidence was pre-empting these level-gate assertions. Force this
// one fixture course back into an OPEN window so the level-gate tests below
// exercise the approval flow they're actually about, not the closed-course path.
{
  const fixture = mockCourses.find((c) => c.id === 'CRS-FSH-005');
  if (fixture) {
    fixture.startDate = '2026-07-01';
    fixture.endDate = '2027-01-01';
  }
}

const AppHeader = (await import('../src/components/AppHeader')).default;
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
const { default: AdminCourses, CurriculumEditorModal } = await import('../src/pages/admin/AdminCourses');
const AdminCourseBuilder = (await import('../src/pages/admin/AdminCourseBuilder')).default;
const AdminConfig = (await import('../src/pages/admin/AdminConfig')).default;
const AdminReports = (await import('../src/pages/admin/AdminReports')).default;
const AdminTrainingOps = (await import('../src/pages/admin/AdminTrainingOps')).default;
const AdminLevelRoadmaps = (await import('../src/pages/admin/AdminLevelRoadmaps')).default;
const TrainerHub = (await import('../src/pages/trainer/TrainerHub')).default;
const HrbpDashboard = (await import('../src/pages/hrbp/HrbpDashboard')).default;
const UserAdminPortal = (await import('../src/pages/useradmin/UserAdminPortal')).default;
const SysAdminPortal = (await import('../src/pages/sysadmin/SysAdminPortal')).default;
const UserTranscriptModal = (await import('../src/components/UserTranscriptModal')).default;
const TrainerRatingsDirectory = (await import('../src/components/TrainerRatingsDirectory')).default;

const AUTH_KEY = 'mm-megalearn-auth-v6';
const APPROVAL_KEY = 'mm-megalearn-approvals-v6';
const COURSES_KEY = 'mm-megalearn-courses-v6';
const ENROLLMENT_KEY = 'mm-megalearn-enrollments-v6';

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
const { checkCourseAccessRule, ACCESS_STATE, isCourseVisibleInCatalog } = await import('../src/data/levelSystem');
const mock = await import('../src/data/mockData');


// --- Courses -------------------------------------------------------------
check('124 courses generated (100 base + 22 Level 1-4 roadmap gap-fill + 2 Virtual Class)', generated100Courses.length === 124, String(generated100Courses.length));
const newRoadmapDomains = [
  'Train-The-Trainer & Coaching Standards', 'Master Trainer & Section Governance',
  'Succession & Store P&L Governance', 'Corporate Governance & ESG',
  'Executive Strategy Electives', 'Talent & Store Portfolio Electives',
  'OJT Capstone & Promotion Defense',
];
check('all 7 gap-fill domains present', newRoadmapDomains.every((d) => generated100Courses.some((c) => c.domain === d)),
  newRoadmapDomains.filter((d) => !generated100Courses.some((c) => c.domain === d)).join(','));
const byLevel = {};
for (const c of generated100Courses) byLevel[c.targetLevel] = (byLevel[c.targetLevel] || 0) + 1;
console.log('      course targetLevel distribution:', JSON.stringify(byLevel));
check('every course targetLevel in 1..7', generated100Courses.every((c) => ['1','2','3','4','5','6','7'].includes(String(c.targetLevel))));
check('all 7 levels represented in catalog', Object.keys(byLevel).length === 7, Object.keys(byLevel).join(','));
check('course targetLevelTitle derived', generated100Courses[0].targetLevelTitle.startsWith('Level '), generated100Courses[0].targetLevelTitle);
check('mandatory assignment.targetLevel synced',
  generated100Courses.filter((c) => c.assignment).every((c) => c.assignment.targetLevel === c.targetLevel));

// --- Users ---------------------------------------------------------------
check('260 users generated (expanded, no longer capped at 100)', generated100Users.length === 260, String(generated100Users.length));
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
check('catalog visibility: L7 sees L7 (gap 0)', isCourseVisibleInCatalog('7', '7') === true);
check('catalog visibility: L7 sees L6 (gap 1)', isCourseVisibleInCatalog('7', '6') === true);
check('catalog visibility: L7 hides L5 (gap 2)', isCourseVisibleInCatalog('7', '5') === false);
check('catalog visibility: L7 hides L1 (gap 6)', isCourseVisibleInCatalog('7', '1') === false);
check('catalog visibility: L7 sees courses below their own level too', isCourseVisibleInCatalog('7', '7') === true);
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
  ['LearnerLearningPaths/CURRENT', <LearnerLearningPaths initialTab="CURRENT" />, '/learner/paths', '/learner/paths'],
  ['SharedLearningPath', <LearnerLearningPaths />, '/my-learning-path', '/my-learning-path'],
  ['LearnerLearningPaths/SUCCESSION', <LearnerLearningPaths initialTab="SUCCESSION" />, '/learner/paths', '/learner/paths'],
  ['LearnerLearningPaths/SELF_PROPOSED', <LearnerLearningPaths initialTab="SELF_PROPOSED" />, '/learner/paths', '/learner/paths'],
  ['LearnerLearningPaths/RECOMMENDED', <LearnerLearningPaths initialTab="RECOMMENDED" />, '/learner/paths', '/learner/paths'],
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
  ['TrainerRatingsDirectory', <TrainerRatingsDirectory />, '/trainer-ratings', '/trainer-ratings'],
  ['AdminLevelRoadmaps', <AdminLevelRoadmaps />, '/admin/roadmaps', '/admin/roadmaps'],
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
  const html = render('Sidebar/' + role, <AppHeader role={role} onRoleChange={() => {}} title="" crumb="" />, '/', '/');
  if (!html) continue;
  const persona = personaForRole(role);
  const def = roleDefinition(role);
  // AppHeader render các mục tự học ngay trong hàng tab ngang, không còn
  // group label "Học tập của tôi" riêng như Sidebar dọc cũ — kiểm tra sự có
  // mặt của chính mục "Khóa Học Của Tôi" (có ở cả ROLE_WORK_NAV.learner lẫn
  // LEARNER_SELF_NAV dùng chung cho 5 role còn lại) thay vì group label.
  const hasLearningGroup = html.includes('Khóa Học Của Tôi');
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

console.log('\n=== 4. Approvals queue: ONLY User Admin & SysAdmin (Manager/Trainer/HRBP removed) ===');
{
  for (const role of ['useradmin', 'sysadmin']) {
    const html = byRole[role]['ManagerApprovals'];
    check(`${role} sees the level-skip queue`,
      html.includes('Học vượt cấp') && html.includes('Phê Duyệt Đơn Học Vượt Cấp'));
  }
  for (const role of ['manager', 'trainer', 'hrbp']) {
    const html = byRole[role]['ManagerApprovals'];
    check(`${role} no longer has the approvals queue (permission denied)`,
      html.includes('không có quyền phê duyệt'));
    actAs(role);
    const sidebarHtml = render(`Sidebar-noapproval/${role}`, <AppHeader role={role} onRoleChange={() => {}} title="" crumb="" />, '/', '/');
    check(`${role} has no "Duyệt Đơn Học Vượt Cấp" nav item in the sidebar`,
      sidebarHtml && !sidebarHtml.includes('Duyệt Đơn Học Vượt Cấp'));
  }
  for (const role of ['useradmin', 'sysadmin']) {
    actAs(role);
    const sidebarHtml = render(`Sidebar-approval/${role}`, <AppHeader role={role} onRoleChange={() => {}} title="" crumb="" />, '/', '/');
    check(`${role} still has "Duyệt Đơn Học Vượt Cấp" nav item in the sidebar`,
      sidebarHtml && sidebarHtml.includes('Duyệt Đơn Học Vượt Cấp'));
  }
}

console.log('\n=== 5. Seeded approval requests: all visible to User Admin & SysAdmin, hidden elsewhere ===');
{
  // Không còn chia theo cấp — mọi đơn cùng đổ về 1 hàng đợi chung mà chỉ User
  // Admin và SysAdmin xử lý được, bất kể ai gửi đơn.
  for (const req of pendingApprovalRequests) {
    for (const approverRole of ['useradmin', 'sysadmin']) {
      check(`request from ${req.employeeName} is listed for ${approverRole}`,
        byRole[approverRole]['ManagerApprovals'].includes(req.employeeName));
    }
    for (const otherRole of ['learner', 'manager', 'trainer', 'hrbp']) {
      check(`request from ${req.employeeName} is NOT visible to ${otherRole}`,
        !byRole[otherRole]['ManagerApprovals'].includes(req.employeeName));
    }
  }
  check('request cards mark a 1-level jump as valid', byRole.useradmin['ManagerApprovals'].includes('Vượt đúng 1 cấp liền kề — hợp lệ'));
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

console.log('\n=== 8. Manager "Chi Tiết" drill-down opens without crashing, and cannot assign courses ===');
{
  // Trước đây UserTranscriptModal gọi enrollmentsForUser(courses, targetUser) —
  // sai thứ tự tham số và sai kiểu trả về (object, không phải mảng) — nên bấm
  // "Chi Tiết" từ Manager/Trainer/HRBP luôn crash "userCourses.filter is not a
  // function". Static page render không bắt được lỗi này vì modal chỉ mở khi
  // transcriptUser !== null, nên phải render trực tiếp UserTranscriptModal với
  // isOpen=true để tái hiện đúng đường crash.
  actAs('manager');
  const minhTran = personaForRole('learner');
  const html = render(
    'UserTranscriptModal open',
    <UserTranscriptModal targetUser={minhTran} isOpen={true} onClose={() => {}} />,
    '/manager/team', '/manager/team'
  );
  check('transcript modal renders without crashing', html !== null);
  if (html) {
    check('transcript modal lists the target user name', html.includes(minhTran.fullName));
  }

  const teamHtml = byRole.manager['ManagerTeam'];
  check('Manager sees "Chi Tiết" (view-only) on direct reports', teamHtml.includes('Chi Tiết'));
  check('Manager has no "Gán Khóa" / assign-course action', !teamHtml.includes('Gán Khóa') && !teamHtml.includes('Assign Developmental Course') && !teamHtml.includes('Assign Now'));

  for (const role of ['trainer', 'hrbp']) {
    const html2 = byRole[role]['ManagerApprovals'];
    check(`${role} approvals page has no assign/allocate action either`, !html2.includes('Gán Khóa'));
  }
}

console.log('\n=== 9. .table CSS cannot collapse an unconstrained column to a few characters ===');
{
  // Bug thực tế: overflow-wrap:anywhere trên .table tham gia vào tính
  // min-content-width của table-layout:auto, nên cột "Khóa Học" (không đặt
  // width cố định) bị co lại khi đứng cạnh các cột có width cố định khác,
  // làm tiêu đề khóa học vỡ chữ dọc trang thay vì xuống dòng bình thường.
  // word-break:break-word tương đương HỆT overflow-wrap:anywhere theo spec
  // (cả cách ngắt chữ lẫn cách tính min-content-width) dù tên nghe an toàn
  // hơn — chỉ overflow-wrap:break-word mới không co min-width. Đây là lỗi
  // thuần CSS, server-rendered HTML text vẫn đúng dù layout vỡ, nên không
  // thể bắt bằng cách check nội dung text; phải khoá trực tiếp CSS.
  const fs = await import('node:fs');
  // Bỏ comment /* ... */ trước khi match, vì chính comment giải thích lý do
  // tránh các giá trị này lại chứa cụm từ đó trong văn bản.
  const css = fs.readFileSync('src/styles/app.css', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  const tableRule = css.match(/\.table\s*\{[\s\S]*?\}/);
  check('.table rule exists in app.css', Boolean(tableRule));
  if (tableRule) {
    check('.table does not use overflow-wrap:anywhere (collapses auto-layout columns)',
      !/overflow-wrap:\s*anywhere/.test(tableRule[0]));
    check('.table does not use word-break:break-word (same collapse, different property name)',
      !/word-break:\s*break-word/.test(tableRule[0]));
    check('.table still uses overflow-wrap:break-word so long titles wrap instead of overflowing',
      /overflow-wrap:\s*break-word/.test(tableRule[0]));
  }
}

console.log('\n=== 10. Course authoring permission matrix (Online vs Offline vs none) ===');
{
  // HRBP: không có quyền tạo khóa nào cả.
  check('hrbp sees a permission-denied CourseBuilder', byRole.hrbp['AdminCourseBuilder'].includes('không có quyền tạo hoặc chỉnh sửa khóa học'));
  check('hrbp has no "Create New Course" button on AdminCourses', !byRole.hrbp['AdminCourses'].includes('Create New Course'));
  check('manager has no "Create New Course" button either', !byRole.manager['AdminCourses'].includes('Create New Course'));
  check('learner has no "Create New Course" button either', !byRole.learner['AdminCourses'].includes('Create New Course'));

  // Trainer/L&D: chỉ tạo Offline, tự động là giảng viên đứng lớp.
  const trainerBuilder = byRole.trainer['AdminCourseBuilder'];
  check('trainer sees the CourseBuilder (not permission-denied)', !trainerBuilder.includes('không có quyền tạo hoặc chỉnh sửa khóa học'));
  check('trainer does NOT see the Online delivery mode option', !trainerBuilder.includes('Khóa Học Trực Tuyến (Online E-learning)'));
  check('trainer sees the offline-only notice', trainerBuilder.includes('chỉ tạo được khóa Trực Tiếp'));
  check('trainer is locked in as their own instructor (chính bạn)', trainerBuilder.includes('(chính bạn)'));
  check('trainer has a "Create New Course" button on AdminCourses', byRole.trainer['AdminCourses'].includes('Create New Course'));

  // User Admin & SysAdmin: toàn quyền cả 2 hình thức.
  for (const role of ['useradmin', 'sysadmin']) {
    const html = byRole[role]['AdminCourseBuilder'];
    check(`${role} sees the Online delivery mode option`, html.includes('Khóa Học Trực Tuyến (Online E-learning)'));
    check(`${role} sees the Offline/In-person delivery mode option`, html.includes('Khóa Đào Tạo Trực Tiếp (In-Person Workshop)'));
    check(`${role} has a "Create New Course" button on AdminCourses`, byRole[role]['AdminCourses'].includes('Create New Course'));
  }
}

console.log('\n=== 10b. Course ownership: Trainer only edits their own courses, User Admin/SysAdmin manage all ===');
{
  const trainerHtml = byRole.trainer['AdminCourses'];
  const trainerEditCount = (trainerHtml.match(/>Edit</g) || []).length;
  const trainerViewCount = (trainerHtml.match(/View Course/g) || []).length;
  check('trainer has 0 Edit buttons on the seed catalog (none created by them)', trainerEditCount === 0);
  check('trainer sees View Course (read-only) on every listed course instead', trainerViewCount > 0 && trainerEditCount === 0);

  for (const role of ['useradmin', 'sysadmin']) {
    const html = byRole[role]['AdminCourses'];
    const editCount = (html.match(/>Edit</g) || []).length;
    const viewCount = (html.match(/View Course/g) || []).length;
    check(`${role} can Edit every listed course (manages the whole catalog)`, editCount > 0 && viewCount === 0);
  }

  // Once the trainer actually authors a course themselves, it should switch
  // to Edit/Delete for them specifically — ownership, not role, decides it.
  const hungTrainer = mock.personaForRole('trainer');
  const ownCourse = {
    id: 'course-owned-by-hung', code: 'OWN-001', title: 'Trainer-Authored Sample Course',
    category: 'Store Operations', version: 'v1.0', courseType: 'OPTIONAL', status: 'DRAFT',
    targetLevel: '6', deliveryType: 'IN_PERSON_CLASSROOM', modality: 'CLASSROOM_LAB',
    createdBy: hungTrainer.userId, modules: [], assignment: null,
  };
  store.set(COURSES_KEY, JSON.stringify([ownCourse]));
  actAs('trainer');
  const ownHtml = render('trainer own course', <AdminCourses />, '/admin/courses', '/admin/courses');
  check('trainer CAN Edit a course they personally authored', ownHtml.includes('>Edit<'));
  check('trainer sees no "View Course" fallback for their own course', !ownHtml.includes('View Course'));
  store.delete(COURSES_KEY);
}

console.log('\n=== 11. Teaching capability opened to L&D, HRBP, User Admin, SysAdmin ===');
{
  for (const role of ['trainer', 'hrbp', 'useradmin', 'sysadmin']) {
    const html = byRole[role]['TrainerHub/CLASSES'];
    check(`${role} can open "Lớp Giảng Dạy & Live QR"`, !html.includes('không được phân công đứng lớp'));
  }
  for (const role of ['manager', 'learner']) {
    const html = byRole[role]['TrainerHub/CLASSES'];
    check(`${role} is blocked from the teaching portal`, html.includes('không được phân công đứng lớp'));
  }
}

console.log('\n=== 12. Trainer Ratings Directory (CSAT) is public to all 6 roles ===');
{
  const mockAgain = await import('../src/data/mockData');
  const eligible = mockAgain.teachingEligibleUsers();
  for (const role of ROLE_ORDER) {
    const html = byRole[role]['TrainerRatingsDirectory'];
    check(`${role} can open the CSAT directory`, html.includes('Đánh Giá Giảng Viên'));
    check(`${role} sees every eligible trainer listed`, eligible.every((t) => html.includes(t.fullName)));
  }
  check('HRBP/UserAdmin/SysAdmin personas appear in the eligible-trainer pool',
    ['hrbp', 'useradmin', 'sysadmin'].every((r) => eligible.some((t) => t.role === r)));
}

console.log('\n=== 13. Training Ops trimmed to Room Booking + Batch Upload only ===');
{
  const html = byRole.trainer['AdminTrainingOps'];
  check('Room Booking tab present', html.includes('Đặt Phòng / Xưởng Thực Hành'));
  check('Batch Upload tab present', html.includes('Upload Danh Sách Học Viên'));
  check('Faculty Directory / CSAT tab removed (moved to shared directory)', !html.includes('Faculty Directory & CSAT Ratings'));
  check('duplicate Calendar tab removed', !html.includes('Enterprise Master Training Calendar'));
}

console.log('\n=== 14. 4-Tab Universal Learning Roadmap (Current / Succession / Self-Proposed / Recommended) ===');
{
  for (const role of ['useradmin', 'sysadmin']) {
    const html = byRole[role]['AdminLevelRoadmaps'];
    check(`${role} sees the Level/Branch roadmap editor`, html.includes('Cấp Bậc') && html.includes('Khối') && html.includes('Level 7'));
  }
  for (const role of ['manager', 'trainer', 'hrbp', 'learner']) {
    const html = byRole[role]['AdminLevelRoadmaps'];
    check(`${role} sees the permission-denied empty state on AdminLevelRoadmaps`, html.includes('Bạn không có quyền quản lý Lộ trình Cấp bậc'));
  }

  const currentHtml = byRole.learner['LearnerLearningPaths/CURRENT'];
  check('learner sees all 4 tab labels', ['Lộ Trình Hiện Tại', 'Lộ Trình Kế Cận', 'Lộ Trình Tự Đề Xuất', 'Khóa Học Gợi Ý'].every((label) => currentHtml.includes(label)));
  check('CURRENT tab renders the timeline (start icon + finish flag)', (currentHtml.includes('ti-user') || currentHtml.includes('ti-player-play') || currentHtml.includes('Xuất Phát')) && (currentHtml.includes('ti-flag') || currentHtml.includes('Về Đích')));

  const successionHtmlFresh = byRole.learner['LearnerLearningPaths/SUCCESSION'];
  check('fresh learner sees the SUCCESSION tab locked banner', successionHtmlFresh.includes('phải hoàn thành 100% Lộ trình hiện tại'));
  check('fresh learner does NOT see the promotion-request button yet', !successionHtmlFresh.includes('Gửi Hồ Sơ Đề Xuất Đánh Giá Thăng Cấp'));

  const selfProposedHtml = byRole.learner['LearnerLearningPaths/SELF_PROPOSED'];
  check('SELF_PROPOSED tab lists at least one track', selfProposedHtml.includes('Bắt Đầu Track Này') || selfProposedHtml.includes('Hoàn Thành'));

  const recommendedHtml = byRole.learner['LearnerLearningPaths/RECOMMENDED'];
  check('RECOMMENDED tab renders its guidance banner', recommendedHtml.includes('Gợi ý dựa trên cấp bậc'));
}

console.log('\n=== 14b. Lộ Trình Học Tập là của TOÀN BỘ 6 role, không riêng Learner ===');
{
  for (const role of ['manager', 'trainer', 'hrbp', 'useradmin', 'sysadmin']) {
    const html = byRole[role]['SharedLearningPath'];
    check(`${role} can open the shared /my-learning-path and sees the 4 tabs`,
      Boolean(html && ['Lộ Trình Hiện Tại', 'Lộ Trình Kế Cận', 'Lộ Trình Tự Đề Xuất', 'Khóa Học Gợi Ý'].every((label) => html.includes(label))));

    actAs(role);
    const sidebarHtml = render(`${role} sidebar has Lộ Trình Học Tập nav item`, <AppHeader role={role} onRoleChange={() => {}} title="" crumb="" />, '/', '/');
    check(`${role} sidebar links to /my-learning-path`, Boolean(sidebarHtml && sidebarHtml.includes('my-learning-path')));
  }
  const learnerSidebarHtml = byRole.learner ? render('learner sidebar uses its own /learner/paths, not the shared route', <AppHeader role="learner" onRoleChange={() => {}} title="" crumb="" />, '/', '/') : null;
  check('learner sidebar links to its own /learner/paths (not the shared /my-learning-path)', Boolean(learnerSidebarHtml && learnerSidebarHtml.includes('/learner/paths') && !learnerSidebarHtml.includes('/my-learning-path')));
}

console.log('\n=== 15. End-to-end: Tab 1 + Tab 2 completion -> promotion request -> useradmin approval -> level bump ===');
{
  const { CURRENT_ROADMAPS: SeedRoadmaps, branchForUser: seedBranchForUser } = await import('../src/data/levelRoadmapMatrix');
  const minh = generated100Users.find((u) => u.userId === 'USR-1042');
  const minhBranch = seedBranchForUser(minh);
  const currentIds = SeedRoadmaps['7'][minhBranch].courseIds;
  const successionIds = SeedRoadmaps['6'][minhBranch].courseIds;

  const fullEnrollments = { [minh.userId]: {} };
  currentIds.forEach((id) => { fullEnrollments[minh.userId][id] = { status: 'COMPLETED' }; });
  successionIds.forEach((id) => { fullEnrollments[minh.userId][id] = { status: 'COMPLETED' }; });
  store.set(ENROLLMENT_KEY, JSON.stringify(fullEnrollments));

  actAs('learner');
  const successionReadyHtml = render('Minh (Tab1+Tab2 100%) sees the unlocked + ready succession tab',
    <LearnerLearningPaths initialTab="SUCCESSION" />, '/learner/paths', '/learner/paths');
  check('succession tab shows the unlock celebration banner', Boolean(successionReadyHtml && successionReadyHtml.includes('đã được mở khóa')));
  check('succession tab shows an ENABLED promotion-request button', Boolean(successionReadyHtml
    && successionReadyHtml.includes('Gửi Hồ Sơ Đề Xuất Đánh Giá Thăng Cấp')
    && !/disabled[^>]*>[^<]*Gửi Hồ Sơ Đề Xuất Đánh Giá Thăng Cấp/.test(successionReadyHtml)));

  store.set(APPROVAL_KEY, JSON.stringify([
    {
      id: 'req-roadmap-e2e', requestType: 'ROADMAP_PROMOTION', userId: minh.userId,
      employeeId: minh.employeeCode, employeeName: minh.fullName, position: minh.position,
      department: `${minh.departmentCode} - ${minh.departmentName}`, currentLevel: '7', targetLevel: '6',
      requestDate: '2026-08-01', justification: 'E2E test.', status: 'PENDING',
    },
  ]));
  actAs('useradmin');
  const adminApprovalHtml = render('useradmin sees the pending e2e roadmap promotion', <ManagerApprovals />, '/approvals', '/approvals');
  check("useradmin sees Minh Tran's roadmap promotion request", Boolean(adminApprovalHtml && adminApprovalHtml.includes(minh.fullName) && adminApprovalHtml.includes('Đề xuất Thăng cấp Lộ trình')));

  actAs('manager');
  const managerApprovalHtml = render('manager still cannot see any approvals queue', <ManagerApprovals />, '/manager/approvals', '/manager/approvals');
  check('manager still sees the permission-denied empty state', Boolean(managerApprovalHtml && managerApprovalHtml.includes('Bạn không có quyền phê duyệt học vượt cấp')));

  const fs = await import('node:fs');
  const storeSource = fs.readFileSync('src/state/CourseStore.jsx', 'utf8');
  check('approveRequest calls promoteUserLevel for ROADMAP_PROMOTION requests',
    /requestType === 'ROADMAP_PROMOTION'[\s\S]{0,200}promoteUserLevel\(target\.userId, target\.targetLevel/.test(storeSource));

  const managerTeamRoadmapHtml = byRole.manager['ManagerTeam'];
  check('ManagerTeam renders the per-report roadmap drill-down icon button', managerTeamRoadmapHtml.includes('ti-map-2'));

  store.set(ENROLLMENT_KEY, JSON.stringify({}));
  store.set(APPROVAL_KEY, JSON.stringify(pendingApprovalRequests));
}

console.log('\n=== 16. AppHeader replaces Sidebar+Topbar: nav drawer, role badge ===');
{
  for (const role of ROLE_ORDER) {
    actAs(role);
    const html = render(`AppHeader/${role}`, <AppHeader role={role} onRoleChange={() => {}} title="Test Title" crumb="Test Crumb" />, '/', '/');
    check(`${role} AppHeader renders without crashing`, Boolean(html));
    check(`${role} AppHeader shows the role badge`, Boolean(html && html.includes(roleDefinition(role).shortVi)));
  }
  actAs('manager');
  const drawerHtml = render('AppHeader nav drawer is closed by default (CSS class, not "open")', <AppHeader role="manager" onRoleChange={() => {}} title="" crumb="" />, '/', '/');
  check('nav drawer DOM exists but is not marked open by default', Boolean(drawerHtml
    && drawerHtml.includes('app-nav-drawer') && !/app-nav-drawer open"/.test(drawerHtml)));
  check('nav drawer still contains the work-nav item labels (hidden via CSS, not removed from DOM)',
    Boolean(drawerHtml && drawerHtml.includes('Nhân Viên &amp; Khoảng Cách Năng Lực')));
}

console.log('\n=== 17. RoadmapTabsPanel extraction + hover-popover (non-modal) timeline detail ===');
{
  actAs('learner');
  const pathsHtml = render('LearnerLearningPaths still shows all 4 tabs after extraction', <LearnerLearningPaths initialTab="CURRENT" />, '/learner/paths', '/learner/paths');
  check('extracted RoadmapTabsPanel still renders all 4 tab labels', Boolean(pathsHtml
    && pathsHtml.includes('Lộ Trình Hiện Tại') && pathsHtml.includes('Lộ Trình Kế Cận')
    && pathsHtml.includes('Lộ Trình Tự Đề Xuất') && pathsHtml.includes('Khóa Học Gợi Ý')));

  const fs = await import('node:fs');
  const timelineSource = fs.readFileSync('src/components/VisualRoadmapTimeline.jsx', 'utf8');
  check('VisualRoadmapTimeline no longer imports Modal', !/import\s*\{[^}]*\bModal\b[^}]*\}\s*from\s*'\.\/ui'/.test(timelineSource));
  // Thiết kế hiện tại: hover vào 1 mốc hiện popover thông tin (portal ra
  // document.body vì thẻ cha ".card" có overflow:hidden), bấm vào mốc điều
  // hướng thẳng vào khóa học — không còn trạng thái "selected" hiện thẻ chi
  // tiết inline như thiết kế cũ (đã được thay thế theo yêu cầu người dùng).
  check('VisualRoadmapTimeline shows a hover-triggered popover portaled to document.body',
    timelineSource.includes('createPortal(') && timelineSource.includes('document.body'));
  check('VisualRoadmapTimeline opens the course directly on click (no inline selection state)',
    timelineSource.includes('onOpenCourse && onOpenCourse(m.course)') && !timelineSource.includes('useState(null); // selected'));
}

console.log('\n=== 18. LearnerDashboard restructure: real fields only, reachable by every role ===');
{
  const { weeklyStudyHours: seedWeeklyHours } = await import('../src/data/mockData');
  actAs('learner');
  const dashHtml = render('learner dashboard renders the restructured layout', <LearnerDashboard />, '/learner', '/learner');
  check('dashboard shows the 3 real stat tiles', Boolean(dashHtml
    && dashHtml.includes('Giờ Học') && dashHtml.includes('Khóa Đã Hoàn Thành')
    && dashHtml.includes('Khóa Bắt Buộc')));
  check('dashboard no longer has a standalone "Lộ Trình Kế Cận" stat tile (only the tab label remains)',
    Boolean(dashHtml) && (dashHtml.match(/Lộ Trình Kế Cận/g) || []).length === 1);
  check('dashboard embeds the 4-tab roadmap panel inline', Boolean(dashHtml && dashHtml.includes('Trục Lộ Trình Đào Tạo')));
  check('dashboard shows the weekly study-hours chart section', Boolean(dashHtml && dashHtml.includes('Thời Lượng Học Tập')));
  check('dashboard does NOT show any fabricated field (favorites/wishlist/SOP library/daily goal)',
    !dashHtml.includes('yêu thích') && !dashHtml.includes('Kho tài liệu') && !dashHtml.includes('kế hoạch L&D'));

  const minhForChart = generated100Users.find((u) => u.userId === 'USR-1042');
  const hours = seedWeeklyHours(minhForChart);
  check('weeklyStudyHours returns 7 Mon-Sun entries', Array.isArray(hours) && hours.length === 7 && hours[0].label === 'Thứ 2' && hours[6].label === 'Chủ Nhật');
  check('weeklyStudyHours is not all-zero for a persona with real history logs', hours.some((h) => h.value > 0));

  for (const role of ['manager', 'trainer', 'hrbp', 'useradmin', 'sysadmin']) {
    actAs(role);
    const html = render(`${role} can open the shared /my-learning-dashboard`, <LearnerDashboard />, '/my-learning-dashboard', '/my-learning-dashboard');
    check(`${role} sees the personal dashboard with its own real data`, Boolean(html && html.includes('Trục Lộ Trình Đào Tạo')));
  }
}

console.log('\n=== 19. Curriculum Permissions, HRBP Curriculum Tab, Analytics & Link Repairs ===');
{
  const { hasCapability, canSeeAllCurricula } = await import('../src/data/roles');
  const {
    curricula,
    userAdminUser,
    hrbpUser,
    currentUser: learnerMinh,
    allUsers,
    courses,
    classroomSessions,
    trainerUserIdFor,
    learningPaths,
    actionPlans,
    teamSkillGapMatrix,
    aiKnowledgeBase,
    aiRecommendations,
  } = await import('../src/data/mockData');
  const {
    visibleCurriculaFor,
    hrbpCurriculumBuckets,
    curriculumAccessOf,
    CURRICULUM_ACCESS_MODE,
  } = await import('../src/utils/curriculumAssignment');
  const {
    complianceByStore,
    regionalComplianceRate,
    headcountInScope,
    skillGapRows,
  } = await import('../src/utils/hrbpAnalytics');
  const HrbpCurriculumTab = (await import('../src/pages/hrbp/HrbpCurriculumTab')).default;

  // Referential Integrity: 100% of referenced course IDs must exist in real courses catalog
  const realCourseIds = new Set((courses || []).map((c) => c.id));
  check('all learningPaths milestones reference valid course IDs',
    (learningPaths || []).every((lp) => (lp.milestones || []).every((m) => !m.courseId || realCourseIds.has(m.courseId))));
  check('all actionPlans reference valid course IDs',
    (actionPlans || []).every((ap) => !ap.courseId || realCourseIds.has(ap.courseId)));
  check('all teamSkillGapMatrix suggested courses reference valid course IDs',
    (teamSkillGapMatrix || []).every((emp) => (emp.skills || []).every((sk) => !sk.suggestedCourseId || realCourseIds.has(sk.suggestedCourseId))));
  check('all aiKnowledgeBase articles reference valid course IDs',
    (aiKnowledgeBase || []).every((kb) => !kb.relatedCourseId || realCourseIds.has(kb.relatedCourseId)));
  check('all aiRecommendations reference valid course IDs',
    (aiRecommendations || []).every((ai) => !ai.courseId || realCourseIds.has(ai.courseId)));
  check('all curricula courseIds reference valid course IDs',
    (curricula || []).every((cur) => (cur.courseIds || []).every((cId) => realCourseIds.has(cId))));
  check('all classroomSessions prerequisiteCourseIds reference valid course IDs',
    (classroomSessions || []).every((cs) => !cs.prerequisiteCourseId || realCourseIds.has(cs.prerequisiteCourseId)));

  // Capabilities
  check('useradmin has canManageCurriculum', hasCapability('useradmin', 'canManageCurriculum') === true);
  check('sysadmin has canManageCurriculum', hasCapability('sysadmin', 'canManageCurriculum') === true);
  check('hrbp has canProposeCurriculum and NOT canManageCurriculum',
    hasCapability('hrbp', 'canProposeCurriculum') === true && hasCapability('hrbp', 'canManageCurriculum') === false);
  check('manager does NOT have canManageCurriculum nor canProposeCurriculum',
    hasCapability('manager', 'canManageCurriculum') === false && hasCapability('manager', 'canProposeCurriculum') === false);
  check('learner does NOT have canManageCurriculum nor canProposeCurriculum',
    hasCapability('learner', 'canManageCurriculum') === false && hasCapability('learner', 'canProposeCurriculum') === false);

  check('canSeeAllCurricula(sysadmin) is true', canSeeAllCurricula('sysadmin') === true);
  check('canSeeAllCurricula(useradmin) is true', canSeeAllCurricula('useradmin') === true);
  check('canSeeAllCurricula(hrbp) is true', canSeeAllCurricula('hrbp') === true);
  check('canSeeAllCurricula(learner) is false', canSeeAllCurricula('learner') === false);

  // Curriculum Access & Visibility
  const learnerVis = visibleCurriculaFor(curricula, learnerMinh);
  check('learner only sees assigned curricula in published status',
    learnerVis.every((c) => c.status === 'PUBLISHED'));

  const hrbpVis = visibleCurriculaFor(curricula, hrbpUser);
  check('hrbp sees all published curricula',
    hrbpVis.length >= 4 && hrbpVis.every((c) => c.status === 'PUBLISHED'));

  const userAdminVis = visibleCurriculaFor(curricula, userAdminUser);
  check('useradmin sees all curricula (including draft if any)', userAdminVis.length === curricula.length);

  check('curriculumAccessOf(sysadmin) is MANAGE_ALL', curriculumAccessOf({ role: 'sysadmin' }).mode === CURRICULUM_ACCESS_MODE.MANAGE_ALL);
  check('curriculumAccessOf(useradmin) is MANAGE_ALL', curriculumAccessOf(userAdminUser).mode === CURRICULUM_ACCESS_MODE.MANAGE_ALL);
  check('curriculumAccessOf(hrbp) is VIEW_ALL', curriculumAccessOf(hrbpUser).mode === CURRICULUM_ACCESS_MODE.VIEW_ALL);
  check('curriculumAccessOf(learner) is ASSIGNED_ONLY', curriculumAccessOf(learnerMinh).mode === CURRICULUM_ACCESS_MODE.ASSIGNED_ONLY);

  const buckets = hrbpCurriculumBuckets(curricula, hrbpUser, []);
  check('hrbpCurriculumBuckets returns mine and proposed buckets', Array.isArray(buckets.mine) && Array.isArray(buckets.proposed));

  // Analytics
  const storeList = complianceByStore(allUsers(), {}, courses);
  check('complianceByStore derives compliance for 8 stores', storeList.length === 8 && storeList.every((s) => s.overall > 0));
  const rate = regionalComplianceRate(allUsers(), {}, courses);
  check('regionalComplianceRate returns reasonable percentage', typeof rate === 'number' && rate >= 80 && rate <= 100);
  check('headcountInScope returns headcount', headcountInScope(allUsers()) >= 100);
  const gaps = skillGapRows(undefined, allUsers());
  check('skillGapRows returns non-empty gap list', Array.isArray(gaps) && gaps.length > 0);

  // Link repairs & Trainers
  check('trainerUserIdFor(tr-01) is USR-9003', trainerUserIdFor('tr-01') === 'USR-9003');
  check('trainerUserIdFor(tr-02) is null', trainerUserIdFor('tr-02') === null);
  check('trainerUserIdFor(tr-03) is USR-9006', trainerUserIdFor('tr-03') === 'USR-9006');
  check('classroomSessions have prerequisiteCourseId', classroomSessions.every((s) => Boolean(s.prerequisiteCourseId)));
  check('seed curricula createdBy & assignedBy point to useradmin',
    curricula.every((c) => c.createdBy === userAdminUser.userId && (c.assignments || []).every((a) => a.assignedBy === userAdminUser.userId)));

  // Component rendering
  actAs('hrbp');
  const hrbpCurriculumHtml = render('HRBP Curriculum Tab renders without crashing', <HrbpDashboard initialTab="CURRICULUM" />, '/hrbp/curriculum', '/hrbp/curriculum');
  check('HRBP Curriculum Tab renders tab switcher and filter controls',
    Boolean(hrbpCurriculumHtml && hrbpCurriculumHtml.includes('Giáo Trình Của Bản Thân')
      && hrbpCurriculumHtml.includes('Giáo Trình Tôi Đã Đề Xuất')
      && hrbpCurriculumHtml.includes('Toàn Bộ Giáo Trình')));
  check('HRBP Curriculum Tab renders proposal tracking table',
    Boolean(hrbpCurriculumHtml && hrbpCurriculumHtml.includes('Hàng Đợi Theo Dõi Đơn Đề Xuất Của Bạn')));

  actAs('useradmin');
  const userAdminCoursesHtml = render('useradmin AdminCourses curriculum tab renders without crashing', <AdminCourses />, '/admin/courses?tab=curriculum', '/admin/courses');
  check('useradmin sees Curriculum tab and Chi Tiết & Phân Bổ buttons',
    Boolean(userAdminCoursesHtml && userAdminCoursesHtml.includes('Chi Tiết &amp; Phân Bổ')));

  actAs('sysadmin');
  const sysAdminCoursesHtml = render('sysadmin AdminCourses curriculum tab renders without crashing', <AdminCourses />, '/admin/courses?tab=curriculum', '/admin/courses');
  check('sysadmin sees Curriculum tab and Chi Tiết & Phân Bổ buttons',
    Boolean(sysAdminCoursesHtml && sysAdminCoursesHtml.includes('Chi Tiết &amp; Phân Bổ')));

  // Section 20: Multi-Target Assignment & Builder Multi-Level Support
  console.log('\n--- Section 20: Multi-Target Batch Assignment, CourseBuilder Multi-Levels & Learner Badges ---');
  actAs('useradmin');
  const courseBuilderHtml = render('CourseBuilder renders with multi-level selector', <AdminCourseBuilder />, '/admin/courses/new', '/admin/courses/new');
  check('CourseBuilder renders Level 1 through Level 7 multi-selector buttons',
    Boolean(courseBuilderHtml && courseBuilderHtml.includes('Level 1') && courseBuilderHtml.includes('Level 7') && courseBuilderHtml.includes('Chọn Tất Cả (Lv 1 - 7)')));

  actAs('learner');
  const learnerCoursesHtml = render('LearnerCourses renders without Level badges in table/cards', <LearnerCourses />, '/learner/courses', '/learner/courses');
  check('LearnerCourses does not render JobLevelBadge in catalog table header',
    Boolean(learnerCoursesHtml && !learnerCoursesHtml.includes('>Cấp Bậc<')));

  // Section 21: Curriculum Editor Modal & Editing Flow
  console.log('\n--- Section 21: Curriculum Editor Modal & Detail Modal Rendering ---');
  actAs('useradmin');
  const userAdminCurriculaHtml = render('User Admin Curriculum tab render', <AdminCourses />, '/admin/courses?tab=curriculum', '/admin/courses');
  check('User Admin can view curriculum list with Edit buttons',
    Boolean(userAdminCurriculaHtml && userAdminCurriculaHtml.includes('Sửa') && userAdminCurriculaHtml.includes('Chi Tiết &amp; Phân Bổ')));

  const mockCurriculumDraft = { id: 'CUR-TEST', title: 'Test Curriculum', category: 'Store Operations', courseIds: ['course-fs-001'], status: 'PUBLISHED', assignments: [] };
  const editorHtml = render(
    'CurriculumEditorModal renders without crashing',
    <CurriculumEditorModal
      draft={mockCurriculumDraft}
      courses={mockCourses}
      companyCategories={['Store Operations', 'Fresh Food & Bakery']}
      onCancel={() => {}}
      onSave={() => {}}
    />,
    '/admin/courses', '/admin/courses'
  );
  check('CurriculumEditorModal renders with title input and course list',
    Boolean(editorHtml && editorHtml.includes('Chỉnh Sửa Giáo Trình') && editorHtml.includes('Danh sách khóa E-Learning')));
}

// ---------------------------------------------------------------------------
console.log('\n=== Section 22: Personal Learning Calendar — date math ===');
{
  const { todayDateString, firstOfMonth, addMonths, getMonthGridWeeks, formatMonthLabel } = await import('../src/utils/calendarDate');

  check('todayDateString returns YYYY-MM-DD', /^\d{4}-\d{2}-\d{2}$/.test(todayDateString()), todayDateString());
  check('firstOfMonth normalizes to day 01', firstOfMonth('2026-08-15') === '2026-08-01');
  check('addMonths forward within a year', addMonths('2026-08-01', 1) === '2026-09-01');
  check('addMonths rolls over year forward', addMonths('2026-12-01', 1) === '2027-01-01');
  check('addMonths rolls over year backward', addMonths('2026-01-01', -1) === '2025-12-01');

  const augWeeks = getMonthGridWeeks('2026-08-01');
  check('grid has 6 weeks', augWeeks.length === 6, String(augWeeks.length));
  check('every week has 7 days', augWeeks.every((w) => w.length === 7));
  const flatDays = augWeeks.flat();
  check('42 total cells', flatDays.length === 42, String(flatDays.length));

  let sequential = true;
  for (let i = 1; i < flatDays.length; i += 1) {
    const [py, pm, pd] = flatDays[i - 1].date.split('-').map(Number);
    const [cy, cm, cd] = flatDays[i].date.split('-').map(Number);
    const prev = new Date(py, pm - 1, pd);
    const cur = new Date(cy, cm - 1, cd);
    if (cur - prev !== 86400000) { sequential = false; break; }
  }
  check('grid dates are consecutive days', sequential);

  const inMonthCount = flatDays.filter((d) => d.inMonth).length;
  check('August 2026 has 31 in-month cells', inMonthCount === 31, String(inMonthCount));
  check('August 1st 2026 is flagged inMonth', flatDays.find((d) => d.date === '2026-08-01')?.inMonth === true);

  check('formatMonthLabel vi', formatMonthLabel('2026-08-01', 'vi') === 'Tháng 8, 2026', formatMonthLabel('2026-08-01', 'vi'));
  check('formatMonthLabel en', formatMonthLabel('2026-08-01', 'en') === 'August 2026', formatMonthLabel('2026-08-01', 'en'));
}

console.log('\n' + (failures === 0 ? 'SMOKE PASSED' : failures + ' SMOKE FAILURE(S)'));
process.exit(failures === 0 ? 0 : 1);

