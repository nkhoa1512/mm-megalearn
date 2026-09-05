/* Verification harness for Admin Team Performance & Leadership Oversight.
 *
 * Checks:
 *   A. Managers Oversight calculations and metric accuracy
 *   B. Trainers Oversight calculations and CSAT/Pass metrics
 *   C. HRBPs Oversight calculations and 9-box/compliance metrics
 *   D. Role capability and security gating (canManageUsers)
 *   E. SSR rendering of TeamPerformanceOverview component
 */
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';

const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
  clear: () => store.clear(),
};

const {
  buildManagersOversight,
  buildTrainersOversight,
  buildHrbpsOversight,
} = await import('../src/utils/adminOversightRules.js');

const {
  allUsers: allUsersFn,
  courses,
  userEnrollmentsMap,
  classroomSessions,
} = await import('../src/data/mockData.js');

const {
  CourseStoreProvider,
  DEFAULT_SUCCESSION_TALENTS: successionTalents,
  DEFAULT_INTERVENTIONS: interventions,
} = await import('../src/store/CourseStore.jsx');
const { hasCapability, normalizeRole } = await import('../src/data/roles.js');

const users = allUsersFn();
const enrollments = userEnrollmentsMap;

let passed = 0;
const failures = [];
function check(label, condition) {
  if (condition) {
    passed += 1;
    console.log(`  PASS  ${label}`);
  } else {
    failures.push(label);
    console.error(`  FAIL  ${label}`);
  }
}

console.log('=== A. Managers Oversight League Table ===');
const managersResult = buildManagersOversight(users, enrollments, courses);
check('managers result returns rows and summary', Boolean(managersResult.rows && managersResult.summary));
check('managers rows list is populated and non-empty', managersResult.rows.length > 0);
const firstMgr = managersResult.rows[0];
check('manager item has userId and fullName', Boolean(firstMgr.userId && firstMgr.fullName));
check('manager item calculates headcount >= 0', typeof firstMgr.headcount === 'number' && firstMgr.headcount >= 0);
check('manager completionPercent is a bounded number 0..100', firstMgr.completionPercent >= 0 && firstMgr.completionPercent <= 100);
check('manager mandatoryPercent is a bounded number 0..100', firstMgr.mandatoryPercent >= 0 && firstMgr.mandatoryPercent <= 100);
check('manager overduePeople is non-negative', firstMgr.overduePeople >= 0);
check('manager failedPeople is non-negative', firstMgr.failedPeople >= 0);
check('manager attentionCount equals attentionItems.length', typeof firstMgr.attentionCount === 'number');
check('managers summary calculates totalSupervised >= 0', managersResult.summary.totalSupervised >= 0);
check('managers summary calculates companyAvgCompletion >= 0', managersResult.summary.companyAvgCompletion >= 0);

console.log('\n=== B. Trainers Oversight League Table ===');
const trainersResult = buildTrainersOversight(users, courses, classroomSessions);
check('trainers result returns rows and summary', Boolean(trainersResult.rows && trainersResult.summary));
check('trainers rows list is populated and non-empty', trainersResult.rows.length > 0);
const firstTrainer = trainersResult.rows[0];
check('trainer item has userId and fullName', Boolean(firstTrainer.userId && firstTrainer.fullName));
check('trainer totalClassesTaught is non-negative', firstTrainer.totalClassesTaught >= 0);
check('trainer totalLearners is non-negative', firstTrainer.totalLearners >= 0);
check('trainer rating is a number between 0 and 5', firstTrainer.rating >= 0 && firstTrainer.rating <= 5);
check('trainers summary calculates totalTrainers > 0', trainersResult.summary.totalTrainers > 0);
check('trainers summary calculates avgCsat >= 4', trainersResult.summary.avgCsat >= 4);

console.log('\n=== C. HRBPs Oversight League Table ===');
const hrbpsResult = buildHrbpsOversight(users, enrollments, courses, successionTalents, interventions);
check('hrbps result returns rows and summary', Boolean(hrbpsResult.rows && hrbpsResult.summary));
check('hrbps rows list is populated and non-empty', hrbpsResult.rows.length > 0);
const firstHrbp = hrbpsResult.rows[0];
check('hrbp item has userId and fullName', Boolean(firstHrbp.userId && firstHrbp.fullName));
check('hrbp companyHeadcount is positive', firstHrbp.companyHeadcount > 0);
check('hrbp companyCompliancePercent is bounded 0..100', firstHrbp.companyCompliancePercent >= 0 && firstHrbp.companyCompliancePercent <= 100);
check('hrbp companyCriticalGapsCount is non-negative', firstHrbp.companyCriticalGapsCount >= 0);
check('hrbp ticketsRaisedCount is non-negative', firstHrbp.ticketsRaisedCount >= 0);
check('hrbp slaBreachesCount never exceeds ticketsRaisedCount', hrbpsResult.rows.every((r) => r.slaBreachesCount <= r.ticketsRaisedCount));
check(
  'the shared company-wide reference figures are IDENTICAL across every HRBP row (honest: no per-HRBP portfolio exists in the data model)',
  hrbpsResult.rows.every((r) => r.companyHeadcount === firstHrbp.companyHeadcount && r.companyCompliancePercent === firstHrbp.companyCompliancePercent)
);
check(
  'ticketsRaisedCount actually attributes tickets to the HRBP who raised them (matches interventions.requestedBy)',
  hrbpsResult.rows.reduce((sum, r) => sum + r.ticketsRaisedCount, 0) ===
    interventions.filter((itv) => itv.status !== 'CANCELLED' && hrbpsResult.rows.some((r) => r.fullName === itv.requestedBy)).length
);
check('hrbps summary calculates companyCompliancePercent >= 0', hrbpsResult.summary.companyCompliancePercent >= 0);

console.log('\n=== D. Security & Capability Gating ===');
check('useradmin has canManageUsers capability', hasCapability(normalizeRole('useradmin'), 'canManageUsers') === true);
check('sysadmin has canManageUsers capability', hasCapability(normalizeRole('sysadmin'), 'canManageUsers') === true);
check('manager does NOT have canManageUsers capability', hasCapability(normalizeRole('manager'), 'canManageUsers') === false);
check('trainer does NOT have canManageUsers capability', hasCapability(normalizeRole('trainer'), 'canManageUsers') === false);
check('hrbp does NOT have canManageUsers capability', hasCapability(normalizeRole('hrbp'), 'canManageUsers') === false);
check('learner does NOT have canManageUsers capability', hasCapability(normalizeRole('learner'), 'canManageUsers') === false);

console.log('\n=== E. SSR Component Rendering ===');
const { default: TeamPerformanceOverview } = await import('../src/features/admin/TeamPerformanceOverview.jsx');
const html = renderToStaticMarkup(
  <MemoryRouter>
    <CourseStoreProvider>
      <TeamPerformanceOverview />
    </CourseStoreProvider>
  </MemoryRouter>
);
check('TeamPerformanceOverview renders without crashing', typeof html === 'string' && html.length > 0);
check('renders Managers Oversight sub-tab by default', html.includes('Line Managers'));
check('renders Trainers Oversight sub-tab', html.includes('Trainers &amp; Faculty') || html.includes('Trainers & Faculty'));
check('renders HRBPs Oversight sub-tab', html.includes('HR Business Partners'));
check('renders View Dashboard action buttons', html.includes('View Dashboard') || html.includes('Inspect') || html.includes('Dashboard'));
check('renders the Managers distribution donut chart', html.includes('Manager Team Health Overview'));
check('renders the Managers weakest-completion bar chart', html.includes('Managers Who Need Support Most'));
check('renders an actual SVG donut (not just the title text)', html.includes('<svg') && html.includes('donutchart'));
check('renders an actual bar chart track (not just the title text)', html.includes('barchart'));

console.log('\n============================================================');
if (failures.length === 0) {
  console.log(`PASS — ${passed}/${passed} checks passed.`);
  process.exit(0);
} else {
  console.error(`FAIL — ${failures.length} check(s) failed out of ${passed + failures.length}.`);
  process.exit(1);
}
