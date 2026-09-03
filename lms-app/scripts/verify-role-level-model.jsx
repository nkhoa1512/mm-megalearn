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

const { CourseStoreProvider, useCourseStore } = await import('../src/store/CourseStore');
const { personaForRole, pendingApprovalRequests, courses: mockCourses } = await import('../src/data/mockData');
const { ROLE_ORDER, roleDefinition } = await import('../src/data/roles');

// CRS-FSH-005 (used below as the "1 level up, requires approval" fixture)
// lands in mockData's date-driven CLOSED lifecycle bucket by pure index
// cycling (~10% of courses are seeded CLOSED). Since AdminCourses now shows
// CLOSED courses to non-admin roles (labeled "Enrollment Window Closed") and
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

const AppHeader = (await import('../src/features/layout/AppHeader')).default;
const LearnerDashboard = (await import('../src/pages/learner/LearnerDashboard')).default;
const LearnerCourses = (await import('../src/pages/learner/LearnerCourses')).default;
const LearnerCourseDetail = (await import('../src/pages/learner/LearnerCourseDetail')).default;
const LearnerCertificates = (await import('../src/pages/learner/LearnerCertificates')).default;
const LearnerHistory = (await import('../src/pages/learner/LearnerHistory')).default;
const LearnerClassrooms = (await import('../src/pages/learner/LearnerClassrooms')).default;
const LearnerLearningPaths = (await import('../src/pages/learner/LearnerLearningPaths')).default;
const LearnerCalendar = (await import('../src/pages/learner/LearnerCalendar')).default;
const AiLearningHub = (await import('../src/pages/learner/AiLearningHub')).default;
const ManagerDashboard = (await import('../src/pages/manager/ManagerDashboard')).default;
const ManagerTeam = (await import('../src/pages/manager/ManagerTeam')).default;
const ManagerCourses = (await import('../src/pages/manager/ManagerCourses')).default;
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
const UserTranscriptModal = (await import('../src/features/common/UserTranscriptModal')).default;
const TrainerRatingsDirectory = (await import('../src/features/ratings/TrainerRatingsDirectory')).default;

const AUTH_KEY = 'mm-megalearn-auth-v6';
const APPROVAL_KEY = 'mm-megalearn-approvals-v6';
const COURSES_KEY = 'mm-megalearn-courses-v11';
const ENROLLMENT_KEY = 'mm-megalearn-enrollments-v6';

let failures = 0;
const failureLog = [];
function check(label, ok, extra = '') {
  if (!ok) { failures += 1; failureLog.push(label + (extra ? ' :: ' + extra : '')); console.log('FAIL  ' + label + (extra ? ' :: ' + extra : '')); }
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
    failureLog.push('RENDER ERROR [' + label + ']: ' + (err.message || err));
    console.log('FAIL  ' + label + ' :: ' + (err.stack || err.message));
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
check('users generated (expanded, no longer capped at 100)', generated100Users.length >= 100, String(generated100Users.length));
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
  ['SharedLearningCalendar', <LearnerCalendar />, '/my-learning-calendar', '/my-learning-calendar'],
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
    if (label === 'AdminTrainingOps') {
      console.log('Rendering AdminTrainingOps for role:', role, '-> html length:', html ? html.length : null);
    }
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
  // AppHeader renders the self-study items inside the horizontal tab row; there is
  // no longer a separate "My Learning" group label the way the old vertical sidebar
  // had one — so assert on the "My Courses" item itself (present in both
  // ROLE_WORK_NAV.learner and the LEARNER_SELF_NAV shared by the other 5 roles).
  const hasLearningGroup = html.includes('My Courses');
  const esc = (t) => t.replace(/&/g, '&amp;');
  check(`Sidebar/${role}: persona ${persona.fullName} + learner access`,
    html.includes(esc(persona.fullName)) && html.includes(esc(def.labelVi)) && hasLearningGroup);
}

console.log('\n=== 3. Sequential level gate — Minh Tran (Level 7 learner) ===');
{
  const p = byRole.learner;
  check('L7 course opens without approval', !p['CourseDetail L7 (open)'].includes('Request Level Skip Approval'));
  check('L6 course offers the approval request', p['CourseDetail L6 (1 level up)'].includes('Request Level Skip Approval'));
  check('L1 course is hard-blocked as a level jump', p['CourseDetail L1 (blocked)'].includes('Grade Skipping Blocked'));
  check('blocked course shows the roadmap it must climb', p['CourseDetail L1 (blocked)'].includes('The roadmap you must follow'));
  check('lesson player opens for an L7 course', !p['LessonPlayer L7'].includes('Lesson not found') && !p['LessonPlayer L7'].includes('not open under the sequential level rule'));
  check('lesson player blocks an L1 course', p['LessonPlayer L1 blocked'].includes('not open under the sequential level rule'));
  check('assessment player opens for an L7 course', !p['AssessmentPlayer L7'].includes('Assessment not found'));
  check('catalog states the level-gate rule', p['LearnerCourses'].includes('Sequential Level Gate'));
  check('learner cannot open the approvals queue', p['ManagerApprovals'].includes('do not have permission to approve level skips'));
}

console.log('\n=== 4. Approvals queue: ONLY User Admin & SysAdmin (Manager/Trainer/HRBP removed) ===');
{
  for (const role of ['useradmin', 'sysadmin']) {
    const html = byRole[role]['ManagerApprovals'];
    check(`${role} sees the level-skip queue`,
      html.includes('Level skip') && html.includes('Approve The Level Skip Request'));
  }
  for (const role of ['manager', 'trainer', 'hrbp']) {
    const html = byRole[role]['ManagerApprovals'];
    check(`${role} no longer has the approvals queue (permission denied)`,
      html.includes('do not have permission to approve level skips'));
    actAs(role);
    const sidebarHtml = render(`Sidebar-noapproval/${role}`, <AppHeader role={role} onRoleChange={() => {}} title="" crumb="" />, '/', '/');
    check(`${role} has no "Approve Level Skip Requests" nav item in the sidebar`,
      sidebarHtml && !sidebarHtml.includes('Approve Level Skip Requests'));
  }
  for (const role of ['useradmin', 'sysadmin']) {
    actAs(role);
    const sidebarHtml = render(`Sidebar-approval/${role}`, <AppHeader role={role} onRoleChange={() => {}} title="" crumb="" />, '/', '/');
    check(`${role} still has "Approve Level Skip Requests" nav item in the sidebar`,
      sidebarHtml && sidebarHtml.includes('Approve Level Skip Requests'));
  }
}

console.log('\n=== 5. Seeded approval requests: all visible to User Admin & SysAdmin, hidden elsewhere ===');
{
  // No longer split by level — every request lands in one shared queue that only
  // User Admin and SysAdmin can act on, whoever submitted it.
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
  check('request cards mark a 1-level jump as valid', byRole.useradmin['ManagerApprovals'].includes('Exactly one grade above — valid'));
}

console.log('\n=== 6. Every role reaches its own learning portal ===');
for (const role of ROLE_ORDER) {
  const html = byRole[role]['MyLearning'];
  const persona = personaForRole(role);
  check(`${role} sees a personal catalog at their own level`,
    html.includes(persona.fullName) && html.includes('Sequential Level Gate'));
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
  check('while PENDING the course shows waiting-for-approval', html.includes('Awaiting Approval'));
  check('while PENDING the request button is gone', !html.includes('Request Level Skip Approval'));

  store.set(APPROVAL_KEY, JSON.stringify([{ ...req, status: 'APPROVED' }]));
  html = render('approved detail', <LearnerCourseDetail />, '/learner/courses/CRS-FSH-005', '/learner/courses/:courseId');
  check('once APPROVED the L6 course unlocks', html.includes('Approved Studying Up To'));
  const lessonHtml = render('approved lesson', <LessonPlayer />, '/learner/courses/CRS-FSH-005/lessons/les-1-1-CRS-FSH-005', '/learner/courses/:courseId/lessons/:lessonId');
  check('once APPROVED the lesson player opens', !lessonHtml.includes('not open under the sequential level rule'));

  store.set(APPROVAL_KEY, JSON.stringify([{ ...req, status: 'REJECTED' }]));
  html = render('rejected detail', <LearnerCourseDetail />, '/learner/courses/CRS-FSH-005', '/learner/courses/:courseId');
  check('once REJECTED the learner may re-apply', html.includes('Request Level Skip Approval') && html.includes('rejected this level skip request'));

  store.set(APPROVAL_KEY, JSON.stringify([{ ...req, courseId: 'CRS-LEAD-058', courseLevel: '1', status: 'APPROVED' }]));
  html = render('approved 2-level jump', <LearnerCourseDetail />, '/learner/courses/CRS-LEAD-058', '/learner/courses/:courseId');
  check('an approval cannot unlock a 2+ level jump', html.includes('Grade Skipping Blocked'));
  store.delete(APPROVAL_KEY);
}

console.log('\n=== 8. Manager "Details" drill-down opens without crashing, and cannot assign courses ===');
{
  // UserTranscriptModal used to call enrollmentsForUser(courses, targetUser) — wrong
  // argument order and wrong return type (an object, not an array) — so opening
  // "Details" from Manager/Trainer/HRBP always crashed with "userCourses.filter is
  // not a function". A static page render does not catch this because the modal only
  // opens when transcriptUser !== null, so render UserTranscriptModal directly with
  // isOpen=true to reproduce the exact crash path.
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
  check('Manager sees "Detail" (view-only) on direct reports', teamHtml.includes('Detail'));
  check('Manager has no assign-course action', !teamHtml.includes('Assign Course') && !teamHtml.includes('Assign Developmental Course') && !teamHtml.includes('Assign Now'));

  for (const role of ['trainer', 'hrbp']) {
    const html2 = byRole[role]['ManagerApprovals'];
    check(`${role} approvals page has no assign/allocate action either`, !html2.includes('Assign Course'));
  }
}

console.log('\n=== 9. .table CSS cannot collapse an unconstrained column to a few characters ===');
{
  // The real bug: overflow-wrap:anywhere on .table feeds into the min-content-width
  // calculation of table-layout:auto, so the "Course" column (which sets no fixed
  // width) collapses next to columns that do, breaking course titles vertically down
  // the page instead of wrapping normally.
  // word-break:break-word is EXACTLY equivalent to overflow-wrap:anywhere per spec
  // (both in how it breaks and in how min-content-width is computed) despite the
  // safer-sounding name — only overflow-wrap:break-word leaves min-width alone. This
  // is a pure CSS defect: the server-rendered HTML text is still correct even when
  // the layout breaks, so it cannot be caught by checking text; lock the CSS instead.
  const fs = await import('node:fs');
  // Strip /* ... */ comments before matching, because the comment explaining why
  // these values are avoided contains the very phrases we search for.
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
  // HRBP: no permission to create any course at all.
  check('hrbp sees a permission-denied CourseBuilder', byRole.hrbp['AdminCourseBuilder'].includes('do not have permission to create or edit courses'));
  check('hrbp has no "Create New Course" button on AdminCourses', !byRole.hrbp['AdminCourses'].includes('Create New Course'));
  check('manager has no "Create New Course" button either', !byRole.manager['AdminCourses'].includes('Create New Course'));
  check('learner has no "Create New Course" button either', !byRole.learner['AdminCourses'].includes('Create New Course'));

  // Trainer/L&D: in-person courses only, and always the teaching trainer.
  const trainerBuilder = byRole.trainer['AdminCourseBuilder'];
  check('trainer sees the CourseBuilder (not permission-denied)', !trainerBuilder.includes('do not have permission to create or edit courses'));
  check('trainer does NOT see the Online delivery mode option', !trainerBuilder.includes('Online E-learning Course'));
  check('trainer sees the offline-only notice', trainerBuilder.includes('may only create and edit In-Person (ILT) courses'));
  check('trainer is locked in as their own instructor (yourself)', trainerBuilder.includes('(yourself)'));
  check('trainer has a "Create New Course" button on AdminCourses', byRole.trainer['AdminCourses'].includes('Create New Course'));

  // User Admin & SysAdmin: full rights over both formats.
  for (const role of ['useradmin', 'sysadmin']) {
    const html = byRole[role]['AdminCourseBuilder'];
    check(`${role} sees the Online delivery mode option`, html.includes('Online E-learning Course'));
    check(`${role} sees the Offline/In-person delivery mode option`, html.includes('In-Person Workshop'));
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
    check(`${role} can open "Teaching Classes & Live QR"`, !html.includes('not assigned to teach classes'));
  }
  for (const role of ['manager', 'learner']) {
    const html = byRole[role]['TrainerHub/CLASSES'];
    check(`${role} is blocked from the teaching portal`, html.includes('not assigned to teach classes'));
  }
}

console.log('\n=== 12. Trainer Ratings Directory (CSAT) is public to all 6 roles ===');
{
  const mockAgain = await import('../src/data/mockData');
  const eligible = mockAgain.teachingEligibleUsers();
  for (const role of ROLE_ORDER) {
    const html = byRole[role]['TrainerRatingsDirectory'];
    check(`${role} can open the CSAT directory`, html.includes('Trainer Ratings'));
    check(`${role} sees every eligible trainer listed`, eligible.every((t) => html.includes(t.fullName)));
  }
  check('HRBP/UserAdmin/SysAdmin personas appear in the eligible-trainer pool',
    ['hrbp', 'useradmin', 'sysadmin'].every((r) => eligible.some((t) => t.role === r)));
}

console.log('\n=== 13. Training Ops trimmed to Room Booking + Batch Upload only ===');
{
  const html = byRole.trainer['AdminTrainingOps'] || render('AdminTrainingOps direct', <AdminTrainingOps />, '/admin/training-ops', '/admin/training-ops');
  check('Room Booking tab present', Boolean(html && html.includes('Room Booking')));
  check('Batch Upload tab present', Boolean(html && html.includes('Batch Upload')));
  check('Faculty Directory / CSAT tab removed (moved to shared directory)', Boolean(html && !html.includes('Faculty Directory & CSAT Ratings')));
  check('duplicate Calendar tab removed', Boolean(html && !html.includes('Enterprise Master Training Calendar')));
}

console.log('\n=== 14. 4-Tab Universal Learning Roadmap (Current / Succession / Self-Proposed / Recommended) ===');
{
  for (const role of ['useradmin', 'sysadmin']) {
    const html = byRole[role]['AdminLevelRoadmaps'];
    check(`${role} sees the Level/Branch roadmap editor`, html.includes('Job Level') && html.includes('Division') && html.includes('Level 7'));
  }
  for (const role of ['manager', 'trainer', 'hrbp', 'learner']) {
    const html = byRole[role]['AdminLevelRoadmaps'];
    check(`${role} sees the permission-denied empty state on AdminLevelRoadmaps`, html.includes('do not have permission to manage level roadmaps'));
  }

  const currentHtml = byRole.learner['LearnerLearningPaths/CURRENT'];
  check('learner sees all 4 tab labels', ['Current Roadmap', 'Succession Roadmap', 'Self-Proposed Roadmap', 'Suggested Courses'].every((label) => currentHtml.includes(label)));
  check('CURRENT tab renders the timeline (start icon + finish flag)', (currentHtml.includes('ti-user') || currentHtml.includes('ti-player-play') || currentHtml.includes('Start')) && (currentHtml.includes('ti-flag') || currentHtml.includes('Finish')));

  const successionHtmlFresh = byRole.learner['LearnerLearningPaths/SUCCESSION'];
  check('fresh learner sees the SUCCESSION tab locked banner', successionHtmlFresh.includes('must complete 100% of your current roadmap'));
  check('fresh learner does NOT see the promotion-request button yet', !successionHtmlFresh.includes('Submit Promotion Review Nomination'));

  const selfProposedHtml = byRole.learner['LearnerLearningPaths/SELF_PROPOSED'];
  check('SELF_PROPOSED tab lists at least one track', selfProposedHtml.includes('Start This Track') || selfProposedHtml.includes('Complete'));

  const recommendedHtml = byRole.learner['LearnerLearningPaths/RECOMMENDED'];
  check('RECOMMENDED tab renders its guidance banner', recommendedHtml.includes('Suggested from your job level'));
}

console.log('\n=== 14b. The Learning Roadmap belongs to ALL 6 roles, not only the Learner ===');
{
  for (const role of ['manager', 'trainer', 'hrbp', 'useradmin', 'sysadmin']) {
    const html = byRole[role]['SharedLearningPath'];
    check(`${role} can open the shared /my-learning-path and sees the 4 tabs`,
      Boolean(html && ['Current Roadmap', 'Succession Roadmap', 'Self-Proposed Roadmap', 'Suggested Courses'].every((label) => html.includes(label))));

    actAs(role);
    const sidebarHtml = render(`${role} sidebar has Learning Roadmap nav item`, <AppHeader role={role} onRoleChange={() => {}} title="" crumb="" />, '/', '/');
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
  check('succession tab shows the unlock celebration banner', Boolean(successionReadyHtml && successionReadyHtml.includes('succession roadmap is now unlocked')));
  check('succession tab shows an ENABLED promotion-request button', Boolean(successionReadyHtml
    && successionReadyHtml.includes('Submit Promotion Review Nomination')
    && !/disabled[^>]*>[^<]*Submit Promotion Review Nomination/.test(successionReadyHtml)));

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
  check("useradmin sees Minh Tran's roadmap promotion request", Boolean(adminApprovalHtml && adminApprovalHtml.includes(minh.fullName) && adminApprovalHtml.includes('Roadmap Promotion Proposal')));

  actAs('manager');
  const managerApprovalHtml = render('manager still cannot see any approvals queue', <ManagerApprovals />, '/manager/approvals', '/manager/approvals');
  check('manager still sees the permission-denied empty state', Boolean(managerApprovalHtml && managerApprovalHtml.includes('You do not have permission to approve level skips')));

  const fs = await import('node:fs');
  const storeSource = fs.readFileSync('src/store/CourseStore.jsx', 'utf8');
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
    Boolean(drawerHtml && drawerHtml.includes('Employee &amp; Competency Gap')));
}

console.log('\n=== 17. RoadmapTabsPanel extraction + hover-popover (non-modal) timeline detail ===');
{
  actAs('learner');
  const pathsHtml = render('LearnerLearningPaths still shows all 4 tabs after extraction', <LearnerLearningPaths initialTab="CURRENT" />, '/learner/paths', '/learner/paths');
  check('extracted RoadmapTabsPanel still renders all 4 tab labels', Boolean(pathsHtml
    && pathsHtml.includes('Current Roadmap') && pathsHtml.includes('Succession Roadmap')
    && pathsHtml.includes('Self-Proposed Roadmap') && pathsHtml.includes('Suggested Courses')));

  const fs = await import('node:fs');
  const timelineSource = fs.readFileSync('src/features/roadmaps/VisualRoadmapTimeline.jsx', 'utf8');
  check('VisualRoadmapTimeline no longer imports Modal', !/import\s*\{[^}]*\bModal\b[^}]*\}\s*from\s*'\.\/ui'/.test(timelineSource));
  // Current design: hovering a milestone shows an information popover (portalled to
  // document.body because the parent ".card" has overflow:hidden), and clicking a
  // milestone navigates straight to the course — there is no longer a "selected"
  // state rendering an inline detail card as in the old design.
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
    && dashHtml.includes('Study Hours') && dashHtml.includes('Courses Completed')
    && dashHtml.includes('Mandatory Course')));
  check('dashboard no longer has a standalone "Succession Roadmap" stat tile (only the tab label remains)',
    Boolean(dashHtml) && (dashHtml.match(/Succession Roadmap/g) || []).length === 1);
  check('dashboard embeds the 4-tab roadmap panel inline', Boolean(dashHtml && dashHtml.includes('Training Roadmap')));
  check('dashboard shows the weekly study-hours chart section', Boolean(dashHtml && dashHtml.includes('Study Hours')));
  check('dashboard does NOT show any fabricated field (favorites/wishlist/SOP library/daily goal)',
    !dashHtml.includes('Favourites') && !dashHtml.includes('Document Library') && !dashHtml.includes('L&D plan'));

  const minhForChart = generated100Users.find((u) => u.userId === 'USR-1042');
  const hours = seedWeeklyHours(minhForChart);
  check('weeklyStudyHours returns 7 Mon-Sun entries', Array.isArray(hours) && hours.length === 7 && hours[0].label === 'Mon' && hours[6].label === 'Sunday');
  check('weeklyStudyHours is not all-zero for a persona with real history logs', hours.some((h) => h.value > 0));

  for (const role of ['manager', 'trainer', 'hrbp', 'useradmin', 'sysadmin']) {
    actAs(role);
    const html = render(`${role} can open the shared /my-learning-dashboard`, <LearnerDashboard />, '/my-learning-dashboard', '/my-learning-dashboard');
    check(`${role} sees the personal dashboard with its own real data`, Boolean(html && html.includes('Training Roadmap')));
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
    PORTFOLIO_MODE,
    resolveHrbpPortfolio,
    usersInPortfolio,
    portfolioComplianceRate,
    complianceByDivision,
    skillGapByUnit,
  } = await import('../src/utils/hrbpRules');
  const { userEnrollmentsMap } = await import('../src/data/mockData');
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

  // HRBP analytics — derived by src/utils/hrbpRules.js. The retired hrbpAnalytics
  // module invented 85/90/92% defaults whenever an enrollment record was missing;
  // the rules engine reports the missing record instead. See scripts/verify-hrbp.jsx
  // for the full HRBP rule suite.
  const hrbpPortfolio = resolveHrbpPortfolio(hrbpUser, PORTFOLIO_MODE.OPERATIONS);
  check('the HRBP portfolio resolves to the 23 operations divisions', hrbpPortfolio.divisions.length === 23);

  const hrbpScoped = usersInPortfolio(allUsers(), hrbpPortfolio);
  check('the HRBP portfolio narrows headcount below the company total',
    hrbpScoped.length > 0 && hrbpScoped.length < allUsers().length);

  const hrbpRate = portfolioComplianceRate(allUsers(), userEnrollmentsMap, hrbpPortfolio);
  check('portfolio compliance is a real percentage over real headcount',
    typeof hrbpRate.compliancePercent === 'number' &&
    hrbpRate.compliancePercent >= 0 && hrbpRate.compliancePercent <= 100 &&
    hrbpRate.headcount === hrbpScoped.length);
  check('compliance is not invented when enrollments are absent',
    portfolioComplianceRate(allUsers(), {}, hrbpPortfolio).compliancePercent === 0);

  const hrbpDivisions = complianceByDivision(allUsers(), userEnrollmentsMap, hrbpPortfolio);
  check('a compliance row is produced for every division in the portfolio', hrbpDivisions.length === 23);
  check('an empty division is banded NO_HEADCOUNT rather than assumed compliant',
    hrbpDivisions.filter((d) => d.headcount === 0).every((d) => d.band === 'NO_HEADCOUNT'));

  const hrbpGaps = skillGapByUnit(allUsers(), userEnrollmentsMap, courses, hrbpPortfolio);
  check('competency gaps are derived per division and domain with affected headcount',
    Array.isArray(hrbpGaps) && hrbpGaps.length > 0 &&
    hrbpGaps.every((c) => c.headcount > 0 && c.affected <= c.headcount && c.gap <= -5));

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
    Boolean(hrbpCurriculumHtml && hrbpCurriculumHtml.includes('My Own Curricula')
      && hrbpCurriculumHtml.includes('Curricula I Have Proposed')
      && hrbpCurriculumHtml.includes('All Curricula')));
  check('HRBP Curriculum Tab renders proposal tracking table',
    Boolean(hrbpCurriculumHtml && hrbpCurriculumHtml.includes('Your Proposal Tracking Queue')));

  actAs('useradmin');
  const userAdminCoursesHtml = render('useradmin AdminCourses curriculum tab renders without crashing', <AdminCourses />, '/admin/courses?tab=curriculum', '/admin/courses');
  check('useradmin sees Curriculum tab and Details & Allocation buttons',
    Boolean(userAdminCoursesHtml && userAdminCoursesHtml.includes('Details &amp; Allocation')));

  actAs('sysadmin');
  const sysAdminCoursesHtml = render('sysadmin AdminCourses curriculum tab renders without crashing', <AdminCourses />, '/admin/courses?tab=curriculum', '/admin/courses');
  check('sysadmin sees Curriculum tab and Details & Allocation buttons',
    Boolean(sysAdminCoursesHtml && sysAdminCoursesHtml.includes('Details &amp; Allocation')));

  // Section 20: Multi-Target Assignment & Builder Multi-Level Support
  console.log('\n--- Section 20: Multi-Target Batch Assignment, CourseBuilder Multi-Levels & Learner Badges ---');
  actAs('useradmin');
  const courseBuilderHtml = render('CourseBuilder renders with multi-level selector', <AdminCourseBuilder />, '/admin/courses/new', '/admin/courses/new');
  check('CourseBuilder renders Level 1 through Level 7 multi-selector buttons',
    Boolean(courseBuilderHtml && courseBuilderHtml.includes('Level 1') && courseBuilderHtml.includes('Level 7') && courseBuilderHtml.includes('Select All (Lv 1 - 7)')));

  actAs('learner');
  const learnerCoursesHtml = render('LearnerCourses renders without Level badges in table/cards', <LearnerCourses />, '/learner/courses', '/learner/courses');
  check('LearnerCourses does not render JobLevelBadge in catalog table header',
    Boolean(learnerCoursesHtml && !learnerCoursesHtml.includes('>Job Level<')));

  // Section 21: Curriculum Editor Modal & Editing Flow
  console.log('\n--- Section 21: Curriculum Editor Modal & Detail Modal Rendering ---');
  actAs('useradmin');
  const userAdminCurriculaHtml = render('User Admin Curriculum tab render', <AdminCourses />, '/admin/courses?tab=curriculum', '/admin/courses');
  check('User Admin can view curriculum list with Edit buttons',
    Boolean(userAdminCurriculaHtml && userAdminCurriculaHtml.includes('Edit') && userAdminCurriculaHtml.includes('Details &amp; Allocation')));

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
    Boolean(editorHtml && editorHtml.includes('Edit Curriculum') && editorHtml.includes('E-Learning course list')));
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

  const feb2024Weeks = getMonthGridWeeks('2024-02-01');
  const feb2024InMonthCount = feb2024Weeks.flat().filter((d) => d.inMonth).length;
  check('February 2024 (leap year) has 29 in-month cells', feb2024InMonthCount === 29, String(feb2024InMonthCount));

  const feb2026Weeks = getMonthGridWeeks('2026-02-01');
  const feb2026InMonthCount = feb2026Weeks.flat().filter((d) => d.inMonth).length;
  check('February 2026 (non-leap year) has 28 in-month cells', feb2026InMonthCount === 28, String(feb2026InMonthCount));

  check('August 1st 2026 is flagged inMonth', flatDays.find((d) => d.date === '2026-08-01')?.inMonth === true);

  check('formatMonthLabel vi', formatMonthLabel('2026-08-01', 'vi') === 'August, 2026', formatMonthLabel('2026-08-01', 'vi'));
  check('formatMonthLabel en', formatMonthLabel('2026-08-01', 'en') === 'August 2026', formatMonthLabel('2026-08-01', 'en'));
}

// ---------------------------------------------------------------------------
console.log('\n=== Section 23: Personal Learning Calendar — event aggregation ===');
{
  const { buildCalendarEvents } = await import('../src/utils/calendarEvents');

  const fixtureCourses = [
    { id: 'CRS-TEST-001', title: 'Completed Course' },
    { id: 'CRS-TEST-002', title: 'Overdue Course' },
    { id: 'CRS-TEST-003', title: 'Elective No Deadline' },
  ];
  const fixtureEnrollments = {
    'CRS-TEST-001': { status: 'COMPLETED', completedAt: '2026-08-10', dueDate: '2026-08-30', lastActivityAt: '2026-08-10' },
    'CRS-TEST-002': { status: 'OVERDUE', completedAt: null, dueDate: '2026-08-15', lastActivityAt: '2026-08-05' },
    'CRS-TEST-003': { status: 'NOT_STARTED', completedAt: null, dueDate: null, lastActivityAt: '2026-08-20' },
    'CRS-TEST-MISSING': { status: 'IN_PROGRESS', completedAt: null, dueDate: '2026-08-22', lastActivityAt: '2026-08-01' },
  };
  const fixtureClassrooms = [
    { id: 'ilt-fixture-1', title: 'Fixture Session', date: '2026-08-15', time: '09:00', venue: 'Room A', isEnrolled: true, attendanceStatus: 'PENDING_CHECKIN' },
    { id: 'ilt-fixture-2', title: 'Not My Session', date: '2026-08-16', time: '09:00', venue: 'Room B', isEnrolled: false, attendanceStatus: 'NOT_REGISTERED' },
  ];

  const evMap = buildCalendarEvents({ courses: fixtureCourses, myEnrollments: fixtureEnrollments, classrooms: fixtureClassrooms });
  const allFixtureEvents = Array.from(evMap.values()).flat();

  check('completed course dated at completedAt, not dueDate',
    (evMap.get('2026-08-10') || []).some((e) => e.courseId === 'CRS-TEST-001'));
  check('completed-course tone is sage',
    (evMap.get('2026-08-10') || []).find((e) => e.courseId === 'CRS-TEST-001')?.tone === 'sage');
  check('overdue course dated at dueDate, tone rust',
    (evMap.get('2026-08-15') || []).some((e) => e.courseId === 'CRS-TEST-002' && e.tone === 'rust'));
  check('elective with no dueDate falls back to lastActivityAt',
    (evMap.get('2026-08-20') || []).some((e) => e.courseId === 'CRS-TEST-003'));
  check('enrollment referencing a missing course is skipped, no crash',
    !allFixtureEvents.some((e) => e.courseId === 'CRS-TEST-MISSING'));
  check('enrolled live session appears on its date',
    (evMap.get('2026-08-15') || []).some((e) => e.sessionId === 'ilt-fixture-1'));
  check('non-enrolled live session is excluded',
    !allFixtureEvents.some((e) => e.sessionId === 'ilt-fixture-2'));

  // Real seed-data smoke check
  const minhEnrollments = mock.enrollmentsForUser(mock.currentUser);
  const realMap = buildCalendarEvents({ courses: mock.courses, myEnrollments: minhEnrollments, classrooms: mock.classroomSessions });
  const allRealEvents = Array.from(realMap.values()).flat();
  check('real seed data builds without throwing and produces at least 1 event', allRealEvents.length > 0, String(allRealEvents.length));
  check('ilt-001 (Minh Tran enrolled live session, 2026-08-28) appears on its date',
    (realMap.get('2026-08-28') || []).some((e) => e.sessionId === 'ilt-001'));
}

// ---------------------------------------------------------------------------
console.log('\n=== Section 24: MonthCalendarGrid — standalone render ===');
{
  const { MonthCalendarGrid } = await import('../src/features/common/ui');

  const fixtureEventsByDate = new Map([
    ['2026-08-15', [
      { id: 'deadline-CRS-X', date: '2026-08-15', kind: 'DEADLINE', title: 'Sample Course Title', subtitle: 'Completion deadline', statusLabel: 'In Progress', tone: 'blue', courseId: 'CRS-X' },
    ]],
  ]);

  const gridHtml = render(
    'MonthCalendarGrid renders August 2026 with a fixture event chip',
    <MonthCalendarGrid
      viewMonth="2026-08-01"
      selectedDate="2026-08-15"
      eventsByDate={fixtureEventsByDate}
      onSelectDate={() => {}}
      onMonthChange={() => {}}
      language="vi"
    />,
    '/x', '/x'
  );
  check('MonthCalendarGrid output contains the month label', Boolean(gridHtml && gridHtml.includes('August, 2026')));
  check('MonthCalendarGrid output contains the fixture event chip title', Boolean(gridHtml && gridHtml.includes('Sample Course Title')));
  check('MonthCalendarGrid marks the selected day', Boolean(gridHtml && gridHtml.includes('selected')));
  check('MonthCalendarGrid renders 42 day cells', Boolean(gridHtml && (gridHtml.match(/cal-cell-daynum/g) || []).length === 42));
}

// ---------------------------------------------------------------------------
console.log('\n=== Section 25: LearnerCalendar page renders at both routes ===');
{
  const LearnerCalendar = (await import('../src/pages/learner/LearnerCalendar')).default;
  actAs('learner');

  const learnerRouteHtml = render(
    'LearnerCalendar renders at /learner/calendar',
    <LearnerCalendar basePath="/learner/courses" />,
    '/learner/calendar', '/learner/calendar'
  );
  check('LearnerCalendar (/learner/calendar) renders the page title', Boolean(learnerRouteHtml && learnerRouteHtml.includes('Learning &amp; Operations')));
  check('LearnerCalendar (/learner/calendar) renders the month grid', Boolean(learnerRouteHtml && learnerRouteHtml.includes('cal-grid-card')));

  const sharedRouteHtml = render(
    'LearnerCalendar renders at /my-learning-calendar',
    <LearnerCalendar />,
    '/my-learning-calendar', '/my-learning-calendar'
  );
  check('LearnerCalendar (/my-learning-calendar) renders without crashing', Boolean(sharedRouteHtml));
}

// ---------------------------------------------------------------------------
console.log('\n=== Section 26: Learning Calendar nav entry — all 6 roles ===');
{
  const nonLearnerRoles = ['manager', 'trainer', 'hrbp', 'useradmin', 'sysadmin'];
  for (const role of nonLearnerRoles) {
    actAs(role);
    const headerHtml = render(
      `${role} header has Learning Calendar nav item`,
      <AppHeader role={role} onRoleChange={() => {}} title="" crumb="" />,
      '/', '/'
    );
    check(`${role} header links to /my-learning-calendar`,
      Boolean(headerHtml && headerHtml.includes('Learning Calendar') && headerHtml.includes('my-learning-calendar')));
  }

  actAs('learner');
  const learnerHeaderHtml = render(
    'learner header uses its own /learner/calendar, not the shared route',
    <AppHeader role="learner" onRoleChange={() => {}} title="" crumb="" />,
    '/', '/'
  );
  check('learner header links to its own /learner/calendar (not the shared /my-learning-calendar)',
    Boolean(learnerHeaderHtml && learnerHeaderHtml.includes('/learner/calendar') && !learnerHeaderHtml.includes('my-learning-calendar')));
}

// ---------------------------------------------------------------------------
console.log('\n=== Section 27: SharedLearningCalendar renders for all 6 roles (fixes final-review gap: was only ever rendered under the learner persona) ===');
{
  for (const role of ROLE_ORDER) {
    const html = byRole[role]['SharedLearningCalendar'];
    check(`${role} renders /my-learning-calendar with the calendar page title`,
      Boolean(html && html.includes('Learning &amp; Operations')));
    check(`${role} renders /my-learning-calendar with the month grid`,
      Boolean(html && html.includes('cal-grid-card')));
  }
}

// ---------------------------------------------------------------------------
console.log('\n=== Section 28: Master Plan Verification — Mandatory vs Optional, Post-Creation Assignments, Org Unit Grouping, and Level Gating ===');
{
  const { isCourseVisibleInCatalog, checkCourseAccessRule, ACCESS_STATE } = await import('../src/data/levelSystem');
  const { courseOrgUnitGroups, buildCourseGroups } = await import('../src/utils/courseCatalog');

  // Test fixture: unassigned Mandatory Course (created without target audience)
  const unassignedMandatoryCourse = {
    id: 'CRS-TEST-MANDATORY-001',
    title: 'Advanced Forklift Operation Safety',
    courseType: 'MANDATORY',
    targetLevel: '6',
    assignments: [],
    assignment: null,
    status: 'OPEN',
  };

  // Test fixture: Optional Course
  const optionalCourseL6 = {
    id: 'CRS-TEST-OPTIONAL-001',
    title: 'Supplier Negotiation Skills',
    courseType: 'OPTIONAL',
    targetLevel: '6',
    assignments: [],
    assignment: null,
    status: 'OPEN',
  };

  const optionalCourseL5 = {
    id: 'CRS-TEST-OPTIONAL-002',
    title: 'Merchandise Category Management Strategy',
    courseType: 'OPTIONAL',
    targetLevel: '5',
    assignments: [],
    assignment: null,
    status: 'OPEN',
  };

  const optionalCourseL7 = {
    id: 'CRS-TEST-OPTIONAL-003',
    title: 'Shelf Merchandising Standards',
    courseType: 'OPTIONAL',
    targetLevel: '7',
    assignments: [],
    assignment: null,
    status: 'OPEN',
  };

  // 1. Mandatory course with NO assignment is HIDDEN from learners who are not targeted & not enrolled
  check(
    'Unassigned Mandatory course is HIDDEN from learner catalog when not assigned',
    isCourseVisibleInCatalog('7', '6', unassignedMandatoryCourse, false) === false
  );

  // 2. Mandatory course becomes VISIBLE to learner once assigned to them
  check(
    'Mandatory course becomes VISIBLE in learner catalog once assigned to user/org-unit',
    isCourseVisibleInCatalog('7', '6', unassignedMandatoryCourse, true) === true
  );

  // 3. Optional course is ALWAYS visible in learner catalog regardless of assignment
  check(
    'Optional course L7 is VISIBLE in catalog for Level 7 learner (gap 0)',
    isCourseVisibleInCatalog('7', '7', optionalCourseL7, false) === true
  );
  check(
    'Optional course L6 is VISIBLE in catalog for Level 7 learner (gap 1)',
    isCourseVisibleInCatalog('7', '6', optionalCourseL6, false) === true
  );

  // 4. Level Gate Rules for Optional Courses:
  // Gap <= 0 (same level or higher): OPEN (can learn immediately)
  const ruleGap0 = checkCourseAccessRule(optionalCourseL7, { level: '7' });
  check('Optional Course with Gap 0 is OPEN to enroll & learn immediately', ruleGap0.state === ACCESS_STATE.OPEN);

  // Gap = 1 (1 level up): REQUESTABLE (must submit approval request to Admin)
  const ruleGap1 = checkCourseAccessRule(optionalCourseL6, { level: '7' });
  check('Optional Course with Gap 1 is REQUESTABLE (requires Admin approval)', ruleGap1.state === ACCESS_STATE.REQUESTABLE);

  // Gap >= 2 (2+ levels up): LOCKED_LEVEL_GAP (hard locked, request blocked, view info only)
  const ruleGap2 = checkCourseAccessRule(optionalCourseL5, { level: '7' });
  check('Optional Course with Gap >= 2 is LOCKED_LEVEL_GAP (request disabled)', ruleGap2.state === ACCESS_STATE.LOCKED_LEVEL_GAP);

  // 5. Post-creation assignment to an Optional course:
  // Assigning department to an Optional course keeps it Optional globally, but makes it Mandatory with deadline for assigned targets
  const assignedOptionalCourse = {
    ...optionalCourseL6,
    assignments: [
      {
        id: 'asg-test-1',
        assignmentType: 'DEPARTMENT',
        targetId: 'dept-bakery',
        targetLabel: 'Bakery Sub-Department',
        targetLevel: '7',
        dueDate: '2026-10-15',
        assignedBy: 'System Admin',
      },
    ],
  };

  check(
    'Assigned Optional course remains VISIBLE on catalog for unassigned learner',
    isCourseVisibleInCatalog('7', '6', assignedOptionalCourse, false) === true
  );

  // 6. Org Unit Grouping (courseOrgUnitGroups & buildCourseGroups) handles multi-target assignments
  const multiAssignedCourse = {
    id: 'CRS-TEST-MULTI-001',
    title: 'Multi-Department Training Course',
    courseType: 'MANDATORY',
    targetLevel: '6',
    assignments: [
      { id: 'asg-1', assignmentType: 'BUSINESS_UNIT', targetId: 'bu-mmvn', targetLabel: 'Nationwide Business Unit' },
      { id: 'asg-2', assignmentType: 'DIVISION', targetId: 'div-opt', targetLabel: 'Division Operations' },
      { id: 'asg-3', assignmentType: 'DEPARTMENT', targetId: 'dept-bakery', targetLabel: 'Bakery Department' },
    ],
  };

  const orgGroups = courseOrgUnitGroups(multiAssignedCourse);
  check('courseOrgUnitGroups extracts all 3 assigned org units', orgGroups.length === 3);
  check('courseOrgUnitGroups includes BU group', orgGroups.some((g) => g.key === 'BU'));
  check('courseOrgUnitGroups includes Division group', orgGroups.some((g) => g.key === 'DIV-div-opt'));
  check('courseOrgUnitGroups includes Department group', orgGroups.some((g) => g.key === 'DEPT-dept-bakery'));

  const groupedCatalog = buildCourseGroups([multiAssignedCourse], 'ORG_UNIT');
  check('buildCourseGroups ORG_UNIT lists course under each assigned org unit group',
    groupedCatalog.some((g) => g.key === 'BU' && g.items.some((c) => c.id === multiAssignedCourse.id)) &&
    groupedCatalog.some((g) => g.key === 'DIV-div-opt' && g.items.some((c) => c.id === multiAssignedCourse.id)) &&
    groupedCatalog.some((g) => g.key === 'DEPT-dept-bakery' && g.items.some((c) => c.id === multiAssignedCourse.id))
  );

  // 7. Cascading Options Resolution by Scope
  const { getCascadingTargetOptions, divisions, departments, subDepartments } = await import('../src/data/assignmentTargets');

  // BU scope options
  const buOpts = getCascadingTargetOptions({ scope: 'BUSINESS_UNIT' });
  check('getCascadingTargetOptions(BUSINESS_UNIT) returns BU options', buOpts.length > 0 && buOpts.some((b) => b.id === 'bu-mmvn'));

  // Department scope with division filter
  const sampleDiv = divisions[0];
  const deptOptsFiltered = getCascadingTargetOptions({ scope: 'DEPARTMENT', divisionFilter: sampleDiv.id });
  check('getCascadingTargetOptions(DEPARTMENT, divisionFilter) returns only depts belonging to that division',
    deptOptsFiltered.length > 0 && deptOptsFiltered.every((d) => d.divisionId === sampleDiv.id));

  // SubDepartment scope with dept filter
  const sampleDept = departments.find((d) => subDepartments.some((s) => s.departmentId === d.id));
  if (sampleDept) {
    const subOptsFiltered = getCascadingTargetOptions({ scope: 'SUBDEPARTMENT', deptFilter: sampleDept.id });
    check('getCascadingTargetOptions(SUBDEPARTMENT, deptFilter) returns only subDepts belonging to that dept',
      subOptsFiltered.length > 0 && subOptsFiltered.every((s) => s.departmentId === sampleDept.id));
  }

  // Group scope options without needing cascading filters
  const grpOpts = getCascadingTargetOptions({ scope: 'GROUP' });
  check('getCascadingTargetOptions(GROUP) returns custom groups list directly', grpOpts.length > 0);

  // BU filter cascading checks
  const divOptsBuFiltered = getCascadingTargetOptions({ scope: 'DIVISION', buFilter: 'bu-mmvn' });
  check('getCascadingTargetOptions(DIVISION, buFilter) returns divisions belonging to that BU',
    divOptsBuFiltered.length > 0 && divOptsBuFiltered.every((d) => d.businessUnitId === 'bu-mmvn'));

  const deptOptsBuFiltered = getCascadingTargetOptions({ scope: 'DEPARTMENT', buFilter: 'bu-mmvn' });
  check('getCascadingTargetOptions(DEPARTMENT, buFilter) returns departments belonging to that BU',
    deptOptsBuFiltered.length > 0 && deptOptsBuFiltered.every((d) => d.businessUnitId === 'bu-mmvn'));

  // resolveTargetLabel verification
  const { resolveTargetLabel } = await import('../src/data/assignmentTargets');
  check('resolveTargetLabel formats DIVISION target div-omd to human-friendly label',
    resolveTargetLabel('DIVISION', 'div-omd').includes('Merchandise') && resolveTargetLabel('DIVISION', 'div-omd').includes('OMD'));
  check('resolveTargetLabel formats BUSINESS_UNIT target bu-mmvn to human-friendly label',
    resolveTargetLabel('BUSINESS_UNIT', 'bu-mmvn').includes('MM Mega Market'));
}

console.log('\n=== 29: Course Enrollment Gate — LessonPlayer blocks lesson content until the learner has enrolled ===');
{
  // Course/lesson titles in this dataset can contain "&" (e.g. "Food Safety & Hygiene
  // Standards"), which renderToStaticMarkup escapes to "&amp;" — escape the same way
  // before substring-matching the rendered HTML.
  const esc = (t) => t.replace(/&/g, '&amp;');
  actAs('learner');
  // CRS-ISA-013 is a Level 7 course (matches Minh Tran/USR-1042's own level, so the
  // sequential level gate does not interfere) that is OPEN for registration but is NOT
  // one of the 12 courses in generated100EnrollmentMatrix['USR-1042'] — i.e. Minh Tran
  // has never enrolled in it. CRS-FSH-001 IS one of those 12 (already used as the
  // "enrolled" fixture in Section 3 above) — reused here as the enrolled fixture.
  const notEnrolledCourse = generated100Courses.find((c) => c.id === 'CRS-ISA-013');
  const notEnrolledLesson = notEnrolledCourse.modules[0].lessons[0];
  const notEnrolledHtml = render(
    'LessonPlayer not-enrolled',
    <LessonPlayer />,
    `/learner/courses/${notEnrolledCourse.id}/lessons/${notEnrolledLesson.id}`,
    '/learner/courses/:courseId/lessons/:lessonId'
  );
  check('unenrolled learner sees the "have not enrolled" gate instead of the lesson',
    notEnrolledHtml.includes('You Have Not Enrolled In This Course Yet'));
  check('unenrolled learner does NOT see the real course/lesson title',
    !notEnrolledHtml.includes(esc(notEnrolledCourse.title)) && !notEnrolledHtml.includes(esc(notEnrolledLesson.title)));

  const enrolledCourse = generated100Courses.find((c) => c.id === 'CRS-FSH-001');
  const enrolledLesson = enrolledCourse.modules[0].lessons[0];
  const enrolledHtml = render(
    'LessonPlayer enrolled',
    <LessonPlayer />,
    `/learner/courses/${enrolledCourse.id}/lessons/${enrolledLesson.id}`,
    '/learner/courses/:courseId/lessons/:lessonId'
  );
  check('enrolled learner does NOT see the "have not enrolled" gate',
    !enrolledHtml.includes('You Have Not Enrolled In This Course Yet'));
  check('enrolled learner sees the real course/lesson content',
    enrolledHtml.includes(esc(enrolledCourse.title)) && enrolledHtml.includes(esc(enrolledLesson.title)));

  // Also cover the module list on the course detail page: an unenrolled learner's
  // lesson links must be locked (no href), the same as the other three lock reasons.
  const detailHtml = render(
    'CourseDetail not-enrolled module list',
    <LearnerCourseDetail />,
    `/learner/courses/${notEnrolledCourse.id}`,
    '/learner/courses/:courseId'
  );
  check('unenrolled learner\'s course detail page has no clickable link to the lesson',
    !detailHtml.includes(`/learner/courses/${notEnrolledCourse.id}/lessons/${notEnrolledLesson.id}`));
}

console.log('\n=== 30: Organization-wide monthly calendar events ===');
{
  const { buildOrganizationMonthlyEvents } = await import('../src/utils/calendarEvents');

  const orgEventsTest = buildOrganizationMonthlyEvents({
    courses: generated100Courses,
    myEnrollments: generated100EnrollmentMatrix['USR-1042'],
    viewMonth: '2026-09',
    currentUser: { userId: 'USR-1042' },
  });

  check('buildOrganizationMonthlyEvents returns array', Array.isArray(orgEventsTest));

  const mandatoryTestEvents = orgEventsTest.filter((e) => e.courseType === 'MANDATORY');
  const optionalTestEvents = orgEventsTest.filter((e) => e.courseType === 'OPTIONAL');

  check('at least one MANDATORY event has tone=rust & color=#DC2626',
    mandatoryTestEvents.some((e) => e.tone === 'rust' && e.color === '#DC2626'));

  check('at least one OPTIONAL event has tone=sage',
    optionalTestEvents.some((e) => e.tone === 'sage'));

  const enrolledTestEvents = orgEventsTest.filter((e) => e.isEnrolled);
  check('enrolled event has actionType=START_COURSE',
    enrolledTestEvents.length > 0 && enrolledTestEvents.some((e) => e.actionType === 'START_COURSE'));

  const unenrolledTestEvents = orgEventsTest.filter((e) => !e.isEnrolled);
  check('unenrolled event has actionType=ENROLL_COURSE',
    unenrolledTestEvents.length > 0 && unenrolledTestEvents.some((e) => e.actionType === 'ENROLL_COURSE'));
}

console.log('\n=== 31: UniversalCalendar — organization-wide monthly overview (metric bar, filters, pills) ===');
{
  const { default: UniversalCalendar } = await import('../src/features/calendar/UniversalCalendar');

  actAs('learner');
  const orgCalHtml = render(
    'UniversalCalendar learner org overview',
    <UniversalCalendar basePath="/learner/courses" />,
    '/learner/calendar',
    '/learner/calendar'
  );
  check('UniversalCalendar (learner) renders the metric-bar label "Total Monthly Events"',
    Boolean(orgCalHtml && orgCalHtml.includes('Total Monthly Events')));
  check('UniversalCalendar (learner) renders at least one organization event subtitle',
    Boolean(orgCalHtml && (orgCalHtml.includes('Mandatory · Action Required') || orgCalHtml.includes('Optional · Available to Join'))));
}

console.log('\n=== 32: Assessment evaluation modes (PROMOTION/SURVEY/TEST/EES) and canViewConfidentialAssessments RBAC ===');
{
  const { ASSESSMENT_MODES, INITIAL_ASSESSMENTS } = await import('../src/data/assessmentData');
  const { hasCapability } = await import('../src/data/roles');

  check('ASSESSMENT_MODES has exactly the 4 expected keys/values',
    ASSESSMENT_MODES.PROMOTION === 'PROMOTION' && ASSESSMENT_MODES.SURVEY === 'SURVEY' &&
    ASSESSMENT_MODES.TEST === 'TEST' && ASSESSMENT_MODES.EES === 'EES' &&
    Object.keys(ASSESSMENT_MODES).length === 4);

  check('at least one seed assessment has evaluationMode=PROMOTION',
    INITIAL_ASSESSMENTS.some((a) => a.evaluationMode === 'PROMOTION'));
  check('at least one seed assessment has evaluationMode=SURVEY',
    INITIAL_ASSESSMENTS.some((a) => a.evaluationMode === 'SURVEY'));
  check('at least one seed assessment has evaluationMode=TEST',
    INITIAL_ASSESSMENTS.some((a) => a.evaluationMode === 'TEST'));
  check('at least one seed assessment has evaluationMode=EES',
    INITIAL_ASSESSMENTS.some((a) => a.evaluationMode === 'EES'));

  check('every seed assessment carries all 6 evaluation-mode fields (no undefined)',
    INITIAL_ASSESSMENTS.every((a) =>
      a.evaluationMode !== undefined && a.isConfidential !== undefined &&
      a.requiresPasscode !== undefined && 'passcode' in a &&
      a.hideImmediateResult !== undefined && a.hideAnswers !== undefined &&
      a.isAnonymous !== undefined));

  const promoExam = INITIAL_ASSESSMENTS.find((a) => a.id === 'ASM-PROMO-001');
  check('ASM-PROMO-001 is confidential and passcode-gated',
    Boolean(promoExam) && promoExam.isConfidential === true && promoExam.requiresPasscode === true &&
    promoExam.passcode === 'GATE2026' && promoExam.hideImmediateResult === true && promoExam.hideAnswers === true);

  const eesSurvey = INITIAL_ASSESSMENTS.find((a) => a.id === 'ASM-EES-001');
  check('ASM-EES-001 is anonymous', Boolean(eesSurvey) && eesSurvey.isAnonymous === true);

  check('hasCapability(sysadmin, canViewConfidentialAssessments) === true',
    hasCapability('sysadmin', 'canViewConfidentialAssessments') === true);
  check('hasCapability(useradmin, canViewConfidentialAssessments) === false',
    hasCapability('useradmin', 'canViewConfidentialAssessments') === false);
  check('hasCapability(hrbp, canViewConfidentialAssessments) === false',
    hasCapability('hrbp', 'canViewConfidentialAssessments') === false);
}

console.log('\n=== 33: Assessment Player — registration gate, promotion passcode gate, mode-specific results ===');
{
  // AssessmentPlayer's `assessmentRegistrations` is intentionally session-only
  // (useState({}) with no localStorage persistence — see the comment above its
  // declaration in CourseStore.jsx), unlike `enrollments`, so it cannot be
  // pre-seeded via the localStorage shim the way other sections seed
  // ENROLLMENT_KEY. Instead, this thin wrapper reads the *same* live
  // `assessmentRegistrations` object reference out of context and mutates it
  // in place before its child (AssessmentPlayer) renders — since React passes
  // context values by reference and both components render within the same
  // synchronous renderToStaticMarkup pass, the mutation is visible to
  // `isAssessmentRegistered`'s closure without needing a second render pass.
  function PreRegistered({ assessmentId, children }) {
    const { assessmentRegistrations: regs, currentUser: cu } = useCourseStore();
    const userId = cu?.userId;
    if (userId) {
      regs[userId] = { ...(regs[userId] || {}), [assessmentId]: { registeredAt: '2026-01-01T00:00:00.000Z' } };
    }
    return children;
  }

  // ASM-PROMO-001 is assigned only to LEVEL 5 (`assignments: [{ assignmentType:
  // 'LEVEL', targetId: '5', ... }]`), and the learner persona (Minh Tran) is
  // Level 7, so `getAssessmentAccess` would lock it out before the registration
  // gate is ever reached. sysadmin bypasses that assignment-scope check
  // unconditionally (see `isSysOrUserAdmin` in assessmentCatalog.js), while the
  // registration/passcode gate itself is role-agnostic — it depends only on
  // `assessmentRegistrations[userId]`, not on role — so this still exercises the
  // real gate this task is about.
  actAs('sysadmin');

  const unregisteredHtml = render(
    'AssessmentPlayer ASM-PROMO-001 unregistered',
    <AssessmentPlayer />,
    '/learner/assessment/ASM-PROMO-001',
    '/learner/assessment/:assessmentId'
  );
  check('unregistered learner sees "Enroll / Register for Examination" instead of a start button',
    Boolean(unregisteredHtml) && unregisteredHtml.includes('Enroll / Register for Examination'));
  check('unregistered learner does NOT see the passcode gate or start button',
    Boolean(unregisteredHtml) && !unregisteredHtml.includes('Exam Room / Proctor Passcode') && !unregisteredHtml.includes('Start The Exam Now'));

  const registeredPromoHtml = render(
    'AssessmentPlayer ASM-PROMO-001 registered',
    <PreRegistered assessmentId="ASM-PROMO-001">
      <AssessmentPlayer />
    </PreRegistered>,
    '/learner/assessment/ASM-PROMO-001',
    '/learner/assessment/:assessmentId'
  );
  check('registered PROMOTION learner sees the Exam Room / Proctor Passcode gate',
    Boolean(registeredPromoHtml) && registeredPromoHtml.includes('Exam Room / Proctor Passcode'));
  check('registered PROMOTION learner (not yet passcode-verified) does NOT see "Start The Exam Now"',
    Boolean(registeredPromoHtml) && !registeredPromoHtml.includes('Start The Exam Now') && !registeredPromoHtml.includes('Enroll / Register for Examination'));

  // ASM-TEST-001 is assigned to ALL, so the ordinary learner persona has access —
  // switch back to it here to also cover the non-admin path.
  actAs('learner');
  const registeredTestHtml = render(
    'AssessmentPlayer ASM-TEST-001 registered',
    <PreRegistered assessmentId="ASM-TEST-001">
      <AssessmentPlayer />
    </PreRegistered>,
    '/learner/assessment/ASM-TEST-001',
    '/learner/assessment/:assessmentId'
  );
  check('registered TEST-mode learner goes straight to "Start The Exam Now" (no passcode gate)',
    Boolean(registeredTestHtml) && registeredTestHtml.includes('Start The Exam Now') && !registeredTestHtml.includes('Exam Room / Proctor Passcode'));

  // Static source checks for behavior not reachable via a single-pass SSR render
  // (the in-progress watermark and result screens require client-side phase
  // transitions triggered by button clicks, which renderToStaticMarkup cannot
  // simulate).
  const fs = await import('node:fs');
  const playerSource = fs.readFileSync('src/pages/player/AssessmentPlayer.jsx', 'utf8');
  check('the "SAI" mistranslation no longer appears anywhere in AssessmentPlayer.jsx',
    !playerSource.includes('SAI'));
  check('the per-question review badge now renders INCORRECT for wrong answers',
    playerSource.includes("isCorrect ? 'CORRECT' : 'INCORRECT'"));
  check('the anti-cheat watermark guard excludes ONLY EES (anonymous) mode',
    playerSource.includes("activeAssessment.antiCheatSettings?.showWatermark && activeAssessment.evaluationMode !== ASSESSMENT_MODES.EES"));
  check('the RESULT screen branches on PROMOTION before falling through to the TEST-mode score card',
    playerSource.includes("activeAssessment.evaluationMode === ASSESSMENT_MODES.PROMOTION") &&
    playerSource.includes('Submission Recorded'));
  check('the RESULT screen branches on SURVEY/EES to the thank-you screen with EES-specific copy',
    playerSource.includes("activeAssessment.evaluationMode === ASSESSMENT_MODES.SURVEY || activeAssessment.evaluationMode === ASSESSMENT_MODES.EES") &&
    playerSource.includes('recorded anonymously'));
}

console.log('\n' + (failures === 0 ? 'SMOKE PASSED' : failures + ' SMOKE FAILURE(S)'));
console.log('FAILURES LIST:', JSON.stringify(failureLog, null, 2));
process.exit(failures === 0 ? 0 : 1);
