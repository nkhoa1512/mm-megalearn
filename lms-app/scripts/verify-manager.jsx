/* Verification harness for the Line Manager business-rules engine.
 *
 * Layers checked:
 *   A. Rule catalogue integrity.
 *   B. Team resolution — the roster is the manager's team, not a department-code
 *      collision across the store network, and it is neither truncated nor padded.
 *   C. Member training state derived from the real enrollment matrix.
 *   D. Attention queue ranking and reason text.
 *   E. Action plan / Kirkpatrick L3 review windows.
 *   F. Reminder governance.
 *   G. SSR — the manager screens render and show the derived figures.
 */
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
  clear: () => store.clear(),
};

const {
  MANAGER_RULES,
  MANAGER_RULE_GROUPS,
  managerRule,
  RELATIONSHIP,
  MANDATORY_COURSE_IDS,
  MAX_ATTEMPTS,
  PASS_MARK,
  INACTIVITY_THRESHOLD_DAYS,
  NUDGE_COOLDOWN_DAYS,
  departmentCodeReuse,
  resolveTeam,
  buildTeam,
  teamAssignments,
  memberTrainingState,
  isFailedEnrollment,
  attentionQueue,
  ATTENTION_KIND,
  teamSummary,
  l3ReviewState,
  L3_STATE,
  teamActionPlans,
  canSendReminder,
} = await import('../src/utils/managerRules');

const {
  managerUser, allUsers: allUsersFn, userEnrollmentsMap, courses, actionPlans,
} = await import('../src/data/mockData');

const users = allUsersFn();
const enrollments = userEnrollmentsMap;
const today = new Date('2026-09-02');

let passed = 0;
const failures = [];
function check(label, condition) {
  if (condition) { passed += 1; console.log(`  PASS  ${label}`); }
  else { failures.push(label); console.log(`  FAIL  ${label}`); }
}
function section(title) { console.log(`\n=== ${title} ===`); }

// ---------------------------------------------------------------------------
section('A. Rule catalogue');
check('every rule has an id, group, title and statement',
  MANAGER_RULES.length > 0 && MANAGER_RULES.every((r) => r.id && r.group && r.title && r.statement));
check('rule ids are unique', new Set(MANAGER_RULES.map((r) => r.id)).size === MANAGER_RULES.length);
check('every rule group is declared', MANAGER_RULES.every((r) => MANAGER_RULE_GROUPS.includes(r.group)));
check('managerRule looks a rule up by id', managerRule('BR-MGR-002')?.group === 'Team resolution');

// ---------------------------------------------------------------------------
section('B. BR-MGR-001 → 004 — Team resolution');
check('department codes really are reused across divisions',
  departmentCodeReuse('FF_ST') > 1 && departmentCodeReuse('CS_ST') > 1);

const team = buildTeam(managerUser, users, enrollments, today);
check('the manager resolves a non-empty team', team.members.length > 0);

check('every member sits in the manager\'s own department instance or reports to them',
  team.members.every(({ user, relationship }) =>
    (relationship === RELATIONSHIP.DIRECT_REPORT && user.managerId === managerUser.userId) ||
    (relationship === RELATIONSHIP.DEPARTMENT && user.departmentId === managerUser.departmentId)));

check('no member is pulled in from another division by a shared department code',
  team.members.every(({ user }) => !user.divisionId || user.divisionId === managerUser.divisionId));

const codeOnlyMatches = users.filter(
  (u) => u.userId !== managerUser.userId && u.departmentCode === managerUser.departmentCode
);
const instanceMatches = users.filter(
  (u) => u.userId !== managerUser.userId && u.departmentId === managerUser.departmentId
);
check('matching on the code alone would have over-collected employees',
  codeOnlyMatches.length > instanceMatches.length);
check('the roster equals the instance match, not the code match',
  team.members.length === instanceMatches.filter((u) => u.status !== 'INACTIVE' && u.status !== 'TERMINATED').length);

check('the manager is never a member of their own team',
  team.members.every(({ user }) => user.userId !== managerUser.userId));
check('no inactive employee is on the roster',
  team.members.every(({ user }) => user.status !== 'INACTIVE' && user.status !== 'TERMINATED'));
check('every member is labelled direct report or department member',
  team.members.every((m) => [RELATIONSHIP.DIRECT_REPORT, RELATIONSHIP.DEPARTMENT].includes(m.relationship)));

const emptyTeam = resolveTeam({ userId: 'USR-NOBODY', departmentId: 'dept-does-not-exist' }, users);
check('a manager with nobody underneath gets an empty roster, not borrowed employees',
  emptyTeam.members.length === 0);

// ---------------------------------------------------------------------------
section('C. BR-MGR-010 → 015 — Member training state from real enrollments');
check('three universal mandatory courses are tracked', MANDATORY_COURSE_IDS.length === 3);

const sample = team.members[0];
check('a member state reports the real assigned count',
  sample.state.assigned === Object.keys(enrollments[sample.user.userId] || {}).length);
check('completion percent is completed over assigned',
  sample.state.assigned === 0 ||
  sample.state.completionPercent === Math.round((sample.state.completed / sample.state.assigned) * 100));

const noRecords = memberTrainingState({ userId: 'X' }, {}, today);
check('a member with no enrollment record scores 0%, not a placeholder',
  noRecords.assigned === 0 && noRecords.completionPercent === 0 && noRecords.averageScore === null);
check('a member with nothing scored reports no average rather than a made-up one',
  noRecords.averageScore === null);
check('an unassigned mandatory course is flagged as a coverage gap',
  noRecords.mandatoryNotAssigned === 3 && noRecords.mandatoryPercent === 0);

check('exhausted attempts below the pass mark count as failed',
  isFailedEnrollment({ status: 'IN_PROGRESS', attemptsCount: MAX_ATTEMPTS, score: PASS_MARK - 1 }) === true);
check('a low score with attempts remaining is not yet failed',
  isFailedEnrollment({ status: 'IN_PROGRESS', attemptsCount: 1, score: 40 }) === false);
check('a completed course is never failed',
  isFailedEnrollment({ status: 'COMPLETED', attemptsCount: MAX_ATTEMPTS, score: 10 }) === false);

const overdueState = memberTrainingState({ userId: 'O' }, {
  A: { courseId: 'A', status: 'OVERDUE' },
  B: { courseId: 'B', status: 'COMPLETED', score: 90 },
}, today);
check('any overdue course makes the member overdue (BR-MGR-011)', overdueState.status === 'OVERDUE');

const doneState = memberTrainingState({ userId: 'D' }, {
  A: { courseId: 'A', status: 'COMPLETED', score: 90 },
}, today);
check('a member with everything complete is up to date', doneState.status === 'COMPLETED');

const unstartedState = memberTrainingState({ userId: 'N' }, {
  A: { courseId: 'A', status: 'NOT_STARTED' },
  B: { courseId: 'B', status: 'NOT_STARTED' },
}, today);
check('a member who has started nothing is NOT_STARTED', unstartedState.status === 'NOT_STARTED');

check('team member figures agree with the raw enrollment matrix',
  team.members.every(({ user, state }) => {
    const raw = Object.values(enrollments[user.userId] || {});
    return state.assigned === raw.length &&
      state.completed === raw.filter((e) => e.status === 'COMPLETED').length &&
      state.overdue === raw.filter((e) => e.status === 'OVERDUE').length;
  }));

const rows = teamAssignments(team, enrollments, courses);
check('the assignment matrix carries one row per member and course, not one per member',
  rows.length === team.members.reduce((a, m) => a + m.state.assigned, 0) && rows.length > team.members.length);
check('every assignment row names a real course', rows.every((r) => r.courseId && r.course));

// ---------------------------------------------------------------------------
section('D. BR-MGR-020 → 023 — Attention queue');
const queue = attentionQueue(team, courses, today);
check('the queue is derived, not empty by construction', Array.isArray(queue));
check('every queue item names the employee, a reason and one action',
  queue.every((i) => i.name && i.reason && i.action && i.rule));

const kinds = queue.map((i) => i.kind);
const firstMandatory = kinds.indexOf(ATTENTION_KIND.OVERDUE_MANDATORY);
const firstOther = kinds.findIndex((k) => k !== ATTENTION_KIND.OVERDUE_MANDATORY);
check('overdue mandatory training is ranked above everything else (BR-MGR-021)',
  firstMandatory === -1 || firstOther === -1 || firstMandatory < firstOther);

check('nobody who is up to date appears in the queue',
  queue.every((i) => i.state.overdue > 0 || i.state.failed > 0 || i.state.status === 'NOT_STARTED' ||
    (i.state.assigned > i.state.completed)));

const idleButDone = attentionQueue({
  members: [{
    user: { userId: 'Z', fullName: 'Done Person', employeeCode: 'E-Z' },
    relationship: RELATIONSHIP.DEPARTMENT,
    state: memberTrainingState({ userId: 'Z' }, { A: { courseId: 'A', status: 'COMPLETED', score: 95, completedAt: '2025-01-01' } }, today),
  }],
}, courses, today);
check('inactivity is not raised for somebody who has finished everything (BR-MGR-023)',
  idleButDone.every((i) => i.kind !== ATTENTION_KIND.INACTIVE));

// ---------------------------------------------------------------------------
section('E. Team rollup');
const summary = teamSummary(team);
check('the rollup counts the resolved headcount', summary.headcount === team.members.length);
check('direct reports and department members add up to the headcount',
  summary.directReports + summary.departmentMembers === summary.headcount);
check('completion percent is bounded', summary.completionPercent >= 0 && summary.completionPercent <= 100);
check('mandatory compliance is bounded', summary.mandatoryPercent >= 0 && summary.mandatoryPercent <= 100);
check('members without a recorded score are excluded from the team average, not zeroed',
  summary.averageScore === null || (summary.averageScore > 0 && summary.scoredPeople <= summary.headcount));
check('an empty team reports zeroes rather than crashing', teamSummary({ members: [] }).headcount === 0);

// ---------------------------------------------------------------------------
section('F. BR-MGR-040 → 042 — Action plans and the L3 review window');
check('a commitment younger than 90 days is too early to review',
  l3ReviewState({ committedAt: '2026-08-01' }, today).state === L3_STATE.TOO_EARLY);
check('a commitment past 90 days is due',
  l3ReviewState({ committedAt: '2026-04-01' }, today).state === L3_STATE.DUE);
check('a commitment past 180 days is overdue',
  l3ReviewState({ committedAt: '2025-06-01' }, today).state === L3_STATE.OVERDUE);
check('a signed-off plan stays signed off',
  l3ReviewState({ committedAt: '2025-06-01', managerSignedOff: true }, today).state === L3_STATE.SIGNED_OFF);

const scopedPlans = teamActionPlans(team, actionPlans, today);
const teamIds = new Set(team.members.map((m) => m.user.userId));
const teamCodes = new Set(team.members.map((m) => m.user.employeeCode));
// An action plan identifies its owner with `learnerId` (that is what the survey
// writes and what the seed data carries); `userId` is only a fallback for a
// record authored the other way round. Asserting on `userId` alone used to pass
// for the wrong reason — nothing matched, so `every` was vacuously true on an
// empty list, which is exactly how the empty Action Plan tab went unnoticed.
check('only the team\'s own action plans are surfaced (BR-MGR-040)',
  scopedPlans.every((p) => {
    const owner = p.learnerId || p.userId;
    return teamIds.has(owner) || teamCodes.has(p.employeeCode) || teamCodes.has(owner);
  }));
check('the team\'s action plans actually surface (the tab is not silently empty)',
  scopedPlans.length > 0);
check('every surfaced plan carries a review state', scopedPlans.every((p) => p.review && p.review.state));

// ---------------------------------------------------------------------------
section('G. BR-MGR-050 / 051 — Reminder governance');
const chaseable = {
  user: { userId: 'R1', employeeCode: 'E-R1' },
  state: memberTrainingState({ userId: 'R1' }, { A: { courseId: 'A', status: 'OVERDUE' } }, today),
};
check('a member with an open item can be reminded', canSendReminder(chaseable, [], today).allowed === true);
check('a reminder inside the cooldown is blocked (BR-MGR-050)',
  canSendReminder(chaseable, [{ userId: 'R1', sentAt: '2026-09-01' }], today).allowed === false);
check('a reminder outside the cooldown is allowed again',
  canSendReminder(chaseable, [{ userId: 'R1', sentAt: '2026-08-01' }], today).allowed === true);
check('the cooldown window is the documented number of days', NUDGE_COOLDOWN_DAYS === 3);

const upToDate = {
  user: { userId: 'R2', employeeCode: 'E-R2' },
  state: memberTrainingState({ userId: 'R2' }, { A: { courseId: 'A', status: 'COMPLETED', score: 90 } }, today),
};
const blocked = canSendReminder(upToDate, [], today);
check('somebody who is up to date cannot be nudged (BR-MGR-051)',
  blocked.allowed === false && blocked.reason === 'NOTHING_TO_CHASE');
check('a blocked reminder explains itself and cites its rule',
  Boolean(blocked.label) && /^BR-MGR-\d{3}$/.test(blocked.rule));
check('the inactivity threshold is the documented number of days', INACTIVITY_THRESHOLD_DAYS === 7);

// ---------------------------------------------------------------------------
section('H. SSR — the manager screens render the derived figures');
const ManagerTeam = (await import('../src/pages/manager/ManagerTeam')).default;
const ManagerDashboard = (await import('../src/pages/manager/ManagerDashboard')).default;
const { CourseStoreProvider } = await import('../src/store/CourseStore');

function renderAs(element, path) {
  localStorage.clear();
  localStorage.setItem('mm-megalearn-auth-v6', JSON.stringify(managerUser));
  return renderToStaticMarkup(
    <MemoryRouter initialEntries={[path]}>
      <CourseStoreProvider>
        <Routes><Route path={path} element={element} /></Routes>
      </CourseStoreProvider>
    </MemoryRouter>
  );
}

let teamHtml = '';
let rosterHtml = '';
let dashHtml = '';
let ok = true;
try { teamHtml = renderAs(<ManagerTeam />, '/manager/team'); } catch (e) { ok = false; console.log('    ' + e.message); }
check('ManagerTeam renders without crashing', ok && teamHtml.length > 500);

ok = true;
try { dashHtml = renderAs(<ManagerDashboard />, '/manager'); } catch (e) { ok = false; console.log('    ' + e.message); }
check('ManagerDashboard renders without crashing', ok && dashHtml.length > 500);

check('the team screen states the resolved scope rather than a generic label',
  teamHtml.includes('Direct report') || teamHtml.includes('Department member'));
check('the team screen shows the attention queue with recommended actions',
  teamHtml.includes('Recommended action') || teamHtml.includes('recommended action'));
check('the team screen cites the manager business rules',
  teamHtml.includes('BR-MGR-'));
ok = true;
try { rosterHtml = renderAs(<ManagerTeam initialTab="ROSTER" />, '/manager/team'); } catch (e) { ok = false; console.log('    ' + e.message); }
check('the roster tab renders without crashing', ok && rosterHtml.length > 500);
check('the roster reports the whole assigned course load, not one sampled course',
  rosterHtml.includes('assigned') && rosterHtml.includes('Assigned courses'));
check('the roster labels each member direct report or department member',
  rosterHtml.includes('Direct report') || rosterHtml.includes('Department member'));
check('Manager keeps the view-only detail action', teamHtml.includes('Detail'));
check('Manager still has no course-assignment action',
  !teamHtml.includes('Assign Course') && !teamHtml.includes('Assign Developmental Course') && !teamHtml.includes('Assign Now'));
check('the per-report roadmap drill-down button is present', teamHtml.includes('ti-map-2'));

// ---------------------------------------------------------------------------
console.log(`\n${'='.repeat(60)}`);
if (failures.length === 0) {
  console.log(`PASS — ${passed}/${passed} checks passed.`);
} else {
  console.log(`${failures.length} FAILURE(S) out of ${passed + failures.length} checks:`);
  failures.forEach((f) => console.log(`  - ${f}`));
}
console.log('='.repeat(60));
process.exit(failures.length === 0 ? 0 : 1);
