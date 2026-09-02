/* Verification harness for the HRBP business-rules engine.
 *
 * Three layers are checked:
 *   A. Portfolio resolution — an HRBP owns a scope, not the whole company.
 *   B. Rule arithmetic (no React): compliance, coverage, competency gap,
 *      70-20-10 readiness gates, nine-box, bench strength, intervention SLA.
 *   C. SSR: the HRBP dashboard renders every tab without blowing up, and shows
 *      the derived numbers rather than the previous invented constants.
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
  HRBP_RULES,
  HRBP_RULE_GROUPS,
  hrbpRule,
  PORTFOLIO_MODE,
  resolveHrbpPortfolio,
  operationsDivisions,
  supportingDivisions,
  usersInPortfolio,
  MANDATORY_COURSE_IDS,
  complianceForUser,
  complianceByDivision,
  portfolioComplianceRate,
  bandCompliance,
  requiredStandardForLevel,
  skillDomainProfile,
  skillGapByUnit,
  formalLearningScore,
  blendedReadinessScore,
  deriveReadiness,
  performanceScore,
  potentialScore,
  ninePlacement,
  ninePlacementsForPortfolio,
  potentialThresholds,
  benchStrength,
  mentorConcentration,
  interventionSla,
  SLA_DAYS_BY_URGENCY,
} = await import('../src/utils/hrbpRules');

const { courses, allUsers: allUsersFn, userEnrollmentsMap, hrbpUser, curricula } = await import('../src/data/mockData');
const { DEFAULT_SUCCESSION_TALENTS, DEFAULT_INTERVENTIONS, DEFAULT_ALIGNMENTS } = await import('../src/store/CourseStore');

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
    console.log(`  FAIL  ${label}`);
  }
}
function section(title) {
  console.log(`\n=== ${title} ===`);
}

// ---------------------------------------------------------------------------
section('A. Rule catalogue');
check('every rule has an id, group, title and statement',
  HRBP_RULES.length > 0 && HRBP_RULES.every((r) => r.id && r.group && r.title && r.statement));
check('rule ids are unique', new Set(HRBP_RULES.map((r) => r.id)).size === HRBP_RULES.length);
check('every rule group is declared', HRBP_RULES.every((r) => HRBP_RULE_GROUPS.includes(r.group)));
check('hrbpRule looks a rule up by id', hrbpRule('BR-HRBP-010')?.group === 'Compliance');

// ---------------------------------------------------------------------------
section('B. BR-HRBP-001/002/003 — Portfolio scope');
const opsDivs = operationsDivisions();
const supDivs = supportingDivisions();
check('23 OPERATIONS divisions are the stores and depots', opsDivs.length === 23);
check('19 SUPPORTING divisions are head office', supDivs.length === 19);

const portfolio = resolveHrbpPortfolio(hrbpUser, PORTFOLIO_MODE.OPERATIONS);
check('the default HRBP portfolio is the OPERATIONS branch', portfolio.branch === 'OPERATIONS' && portfolio.divisions.length === 23);

const scoped = usersInPortfolio(users, portfolio);
check('the portfolio narrows headcount below the company total', scoped.length > 0 && scoped.length < users.length);
check('every scoped employee belongs to a portfolio division',
  scoped.every((u) => portfolio.divisionIds.includes(u.divisionId)));
check('no inactive employee is counted in scope',
  scoped.every((u) => u.status !== 'INACTIVE' && u.status !== 'TERMINATED'));

const companyPortfolio = resolveHrbpPortfolio(hrbpUser, PORTFOLIO_MODE.COMPANY);
check('the company-wide portfolio covers all 42 divisions', companyPortfolio.divisions.length === 42);
check('company scope is strictly wider than the operations scope',
  usersInPortfolio(users, companyPortfolio).length > scoped.length);

// ---------------------------------------------------------------------------
section('C. BR-HRBP-010/011 — Compliance is measured, never invented');
check('three universal mandatory courses are tracked', MANDATORY_COURSE_IDS.length === 3);

const noEnrollment = complianceForUser({ userId: 'X' }, {});
check('an employee with no enrollment record scores 0% compliance, not a default',
  noEnrollment.compliancePercent === 0 && noEnrollment.coveragePercent === 0);
check('a missing enrollment is reported as NOT_ASSIGNED',
  noEnrollment.lines.every((l) => l.state === 'NOT_ASSIGNED') && noEnrollment.notAssigned === 3);

const allDone = complianceForUser({ userId: 'Y' }, Object.fromEntries(
  MANDATORY_COURSE_IDS.map((id) => [id, { courseId: id, status: 'COMPLETED' }])
));
check('an employee who completed all three is 100% compliant',
  allDone.compliancePercent === 100 && allDone.fullyCompliant === true);

const inProgress = complianceForUser({ userId: 'Z' }, Object.fromEntries(
  MANDATORY_COURSE_IDS.map((id) => [id, { courseId: id, status: 'IN_PROGRESS', progressPercent: 99 }])
));
check('99% progress is still non-compliant — only COMPLETED counts',
  inProgress.compliancePercent === 0 && inProgress.coveragePercent === 100 && inProgress.fullyCompliant === false);

check('coverage and compliance are two different numbers',
  inProgress.coveragePercent === 100 && inProgress.compliancePercent === 0);

// ---------------------------------------------------------------------------
section('D. BR-HRBP-012/013 — Division roll-up and escalation');
const divisionRows = complianceByDivision(users, enrollments, portfolio);
check('a compliance row is produced for each of the 23 operations divisions', divisionRows.length === 23);
check('divisions with headcount report a real compliance percentage',
  divisionRows.filter((d) => d.headcount > 0).every((d) => d.compliancePercent >= 0 && d.compliancePercent <= 100));
check('at least one division actually has headcount from the employee roster',
  divisionRows.some((d) => d.headcount > 0));
check('an empty division is banded NO_HEADCOUNT rather than 100%',
  divisionRows.filter((d) => d.headcount === 0).every((d) => d.band === 'NO_HEADCOUNT'));
check('coverage is reported alongside compliance for every division',
  divisionRows.every((d) => typeof d.coveragePercent === 'number'));

check('a perfect score with an overdue enrollment cannot be banded EXCELLENT',
  bandCompliance(100, true) === 'MEETS_STANDARD' && bandCompliance(100, false) === 'EXCELLENT_STANDARD');
check('below 70% is CRITICAL', bandCompliance(65, false) === 'CRITICAL');
check('80% is a warning', bandCompliance(80, false) === 'WARNING_REQUIRED');

const escalated = divisionRows.filter((d) => d.escalate);
check('escalation triggers on people, not only on the average',
  escalated.every((d) => d.band === 'CRITICAL' || d.nonCompliantPeople > 5));

const portfolioRate = portfolioComplianceRate(users, enrollments, portfolio);
check('portfolio compliance is a real percentage over real headcount',
  portfolioRate.headcount === scoped.length && portfolioRate.compliancePercent >= 0 && portfolioRate.compliancePercent <= 100);
{
  const gapUsers = scoped.slice(0, 3).map((u) => u.userId);
  const holed = { ...enrollments };
  gapUsers.forEach((id) => { holed[id] = {}; });
  const holedRate = portfolioComplianceRate(users, holed, portfolio);
  check('removing an enrollment record surfaces a coverage gap, it does not vanish',
    holedRate.notAssignedPeople >= 3 && holedRate.coveragePercent < 100);
}
check('the portfolio reports how many people are non-compliant',
  typeof portfolioRate.nonCompliantPeople === 'number' && portfolioRate.nonCompliantPeople <= portfolioRate.headcount);

// ---------------------------------------------------------------------------
section('E. BR-HRBP-020/021/022/023 — Competency gap');
check('required standard rises with job level',
  requiredStandardForLevel('1') === 90 && requiredStandardForLevel('4') === 85 && requiredStandardForLevel('7') === 75);

const sampleUser = scoped.find((u) => Object.keys(enrollments[u.userId] || {}).length > 3) || scoped[0];
const profile = skillDomainProfile(sampleUser, enrollments[sampleUser.userId] || {}, courses);
check('a skill profile is produced for all seven domains', profile.length === 7);
check('a domain the employee was never assigned is NOT_ASSIGNED, not a gap',
  profile.filter((p) => p.assigned === 0).every((p) => p.severity === 'NOT_ASSIGNED' && p.actual === null));
check('a measured domain carries an actual score and a signed gap',
  profile.filter((p) => p.assigned > 0 && p.completed > 0).every((p) => typeof p.actual === 'number' && typeof p.gap === 'number'));
check('an assigned domain with no completion is UNMEASURED, not a minus-ninety gap (BR-HRBP-024)',
  profile.filter((p) => p.assigned > 0 && p.completed === 0).every((p) => p.severity === 'UNMEASURED' && p.actual === null && p.gap === null));

const gapCells = skillGapByUnit(users, enrollments, courses, portfolio);
check('competency gaps are aggregated per division and domain', Array.isArray(gapCells) && gapCells.length > 0);
check('every gap cell carries the affected headcount',
  gapCells.every((c) => c.headcount > 0 && c.affected >= 0 && c.affected <= c.headcount));
check('only real gaps are listed — nothing within tolerance',
  gapCells.every((c) => c.gap <= -5));
check('the worst gap is listed first', gapCells.length < 2 || gapCells[0].gap <= gapCells[1].gap);
check('critical gaps are labelled CRITICAL_GAP',
  gapCells.filter((c) => c.gap <= -15).every((c) => c.severity === 'CRITICAL_GAP'));

// ---------------------------------------------------------------------------
section('F. BR-HRBP-030→035 — 70-20-10 readiness gates');
check('the blend weights the components exactly as the model names them',
  blendedReadinessScore({ ojt70: 100, mentoring20: 0, formal10: 0 }) === 70 &&
  blendedReadinessScore({ ojt70: 0, mentoring20: 100, formal10: 0 }) === 20 &&
  blendedReadinessScore({ ojt70: 0, mentoring20: 0, formal10: 100 }) === 10);

const noCurriculum = formalLearningScore({ id: 'T1' }, { curricula, users, enrollments, courses });
check('no curriculum assigned means a formal score of 0, with a stated reason',
  noCurriculum.score === 0 && noCurriculum.reason === 'NO_CURRICULUM_ASSIGNED');

const talentWithCur = DEFAULT_SUCCESSION_TALENTS.find((t) => t.curriculumId);
const derivedFormal = formalLearningScore(talentWithCur, { curricula, users, enrollments, courses });
check('a formal score is derived from the assigned curriculum',
  derivedFormal.reason === 'DERIVED_FROM_CURRICULUM' && derivedFormal.score >= 0 && derivedFormal.score <= 100);

const today = new Date('2026-09-02');
const strongCompliant = deriveReadiness(
  { id: 'T-OK', name: 'Test', ojt70: 95, mentoring20: 95, readiness: 'READY_NOW' },
  { formalScore: 95, compliance: { fullyCompliant: true, required: 3, completed: 3 }, alignments: [{ candidateId: 'T-OK', updatedAt: '2026-08-01' }], today }
);
check('a candidate meeting every gate is Ready Now with no blockers',
  strongCompliant.readiness === 'READY_NOW' && strongCompliant.blockers.length === 0);

const nonCompliant = deriveReadiness(
  { id: 'T-NC', name: 'Test', ojt70: 95, mentoring20: 95, readiness: 'READY_NOW' },
  { formalScore: 95, compliance: { fullyCompliant: false, required: 3, completed: 1 }, alignments: [{ candidateId: 'T-NC', updatedAt: '2026-08-01' }], today }
);
check('an outstanding mandatory course caps readiness at 6 months (BR-HRBP-034)',
  nonCompliant.readiness === 'READY_IN_6_MONTHS' &&
  nonCompliant.blockers.some((b) => b.code === 'MANDATORY_INCOMPLETE'));

const staleAlignment = deriveReadiness(
  { id: 'T-ST', name: 'Test', ojt70: 95, mentoring20: 95 },
  { formalScore: 95, compliance: { fullyCompliant: true, required: 3, completed: 3 }, alignments: [{ candidateId: 'T-ST', updatedAt: '2025-01-01' }], today }
);
check('a 1-on-1 alignment older than 180 days blocks Ready Now (BR-HRBP-035)',
  staleAlignment.readiness !== 'READY_NOW' &&
  staleAlignment.blockers.some((b) => b.code === 'ALIGNMENT_STALE'));

const noFormal = deriveReadiness(
  { id: 'T-NF', name: 'Test', ojt70: 95, mentoring20: 95 },
  { formalScore: 10, compliance: { fullyCompliant: true, required: 3, completed: 3 }, alignments: [{ candidateId: 'T-NF', updatedAt: '2026-08-01' }], today }
);
check('a candidate without formal learning evidence is never Ready Now (BR-HRBP-031)',
  noFormal.readiness !== 'READY_NOW' && noFormal.blockers.some((b) => b.code === 'FORMAL_BELOW_80'));

check('a stored readiness that disagrees with the rules is flagged, not silently trusted',
  nonCompliant.storedReadiness === 'READY_NOW' && nonCompliant.divergesFromStored === true);

check('every blocker cites the rule that produced it',
  [nonCompliant, staleAlignment, noFormal].every((d) => d.blockers.every((b) => /^BR-HRBP-\d{3}$/.test(b.rule))));

// ---------------------------------------------------------------------------
section('G. BR-HRBP-040/041/042 — Nine-box talent grid');
const perf = performanceScore(sampleUser, enrollments[sampleUser.userId] || {});
check('performance is a percentage derived from delivery',
  perf.score >= 0 && perf.score <= 100);
check('performance renormalises rather than assuming a score when nothing is scored',
  performanceScore({ userId: 'N' }, {}).score === 0);

const pot = potentialScore(sampleUser, enrollments[sampleUser.userId] || {}, courses);
check('potential is a percentage derived from learning behaviour',
  pot.score >= 0 && pot.score <= 100 && pot.domainCount >= 0);

const placement = ninePlacement(sampleUser, enrollments[sampleUser.userId] || {}, courses);
check('nine-box placement returns a named box',
  !!placement.box?.key && placement.performanceBand >= 1 && placement.performanceBand <= 3 &&
  placement.potentialBand >= 1 && placement.potentialBand <= 3);

const portfolioPlacements = ninePlacementsForPortfolio(scoped, enrollments, courses);
check('a placement is produced for every employee in scope', portfolioPlacements.length === scoped.length);

const boxKeys = portfolioPlacements.map((p) => p.placement.box.key);
check('the roster spreads across more than one box', new Set(boxKeys).size > 1);

const potentialBands = portfolioPlacements.map((p) => p.placement.potentialBand);
check('potential is ranked within the portfolio, so the grid uses more than one column',
  new Set(potentialBands).size > 1);
check('high potential stays a scarce designation (roughly the top 15%)',
  potentialBands.filter((b) => b === 3).length <= Math.ceil(scoped.length * 0.25));

const cuts = potentialThresholds(portfolioPlacements.map((p) => p.placement.potential.score));
check('the potential cut-offs are ordered high above medium', cuts.high >= cuts.medium);
check('a peer group too small to rank falls back to the absolute bands',
  potentialThresholds([70, 60, 50]).high === 80);

// ---------------------------------------------------------------------------
section('H. BR-HRBP-050/051/052 — Bench strength');
const derivedByTalentId = {};
DEFAULT_SUCCESSION_TALENTS.forEach((t) => {
  const candidate = users.find((u) => u.userId === t.userId || u.employeeCode === t.id);
  const formal = formalLearningScore(t, { curricula, users, enrollments, courses });
  derivedByTalentId[t.id] = deriveReadiness(t, {
    formalScore: formal.score,
    compliance: candidate ? complianceForUser(candidate, enrollments[candidate.userId] || {}) : null,
    alignments: DEFAULT_ALIGNMENTS,
    today,
  });
});

const bench = benchStrength(DEFAULT_SUCCESSION_TALENTS, derivedByTalentId);
check('bench strength is grouped by target role', bench.length > 0 && bench.every((b) => b.targetRole));
check('every bench row reports coverage against the 2-successor target',
  bench.every((b) => b.coverage >= 0 && b.coverage <= 100 && b.readyNow <= b.candidateCount));
check('a role with candidates but none ready now is AT_RISK',
  bench.filter((b) => b.candidateCount > 0 && b.readyNow === 0).every((b) => b.risk === 'AT_RISK'));
check('the thinnest bench is surfaced first', bench.length < 2 || bench[0].readyNow <= bench[1].readyNow);

const concentration = mentorConcentration([
  { mentor: 'A', targetRole: 'R' }, { mentor: 'A', targetRole: 'R' },
  { mentor: 'A', targetRole: 'R' }, { mentor: 'A', targetRole: 'R' },
  { mentor: 'B', targetRole: 'R' },
]);
check('a mentor carrying more than three candidates is flagged (BR-HRBP-052)',
  concentration.length === 1 && concentration[0].mentor === 'A' && concentration[0].count === 4);

// ---------------------------------------------------------------------------
section('I. BR-HRBP-060/061/062 — Intervention SLA');
check('urgency sets the deadline', SLA_DAYS_BY_URGENCY.HIGH === 7 && SLA_DAYS_BY_URGENCY.MEDIUM === 14 && SLA_DAYS_BY_URGENCY.LOW === 30);

const freshHigh = interventionSla({ urgency: 'HIGH', requestedAt: '2026-09-01', status: 'PENDING_REVIEW' }, today);
check('a ticket raised yesterday is on track', freshHigh.state === 'ON_TRACK' && freshHigh.dueDate === '2026-09-08');

const dueSoon = interventionSla({ urgency: 'HIGH', requestedAt: '2026-08-28', status: 'PENDING_REVIEW' }, today);
check('a ticket inside the 3-day window is due soon', dueSoon.state === 'DUE_SOON');

const breached = interventionSla({ urgency: 'HIGH', requestedAt: '2026-08-01', status: 'PENDING_REVIEW' }, today);
check('an overdue HIGH ticket breaches and escalates', breached.state === 'BREACHED' && breached.escalated === true);

const breachedLow = interventionSla({ urgency: 'LOW', requestedAt: '2026-01-01', status: 'PENDING_REVIEW' }, today);
check('a breached LOW ticket does not escalate to the L&D Director',
  breachedLow.state === 'BREACHED' && breachedLow.escalated === false);

const scheduled = interventionSla({ urgency: 'HIGH', requestedAt: '2026-08-01', status: 'SCHEDULED' }, today);
check('a scheduled ticket stops ageing', scheduled.state === 'SETTLED' && scheduled.escalated === false);

const seededSla = DEFAULT_INTERVENTIONS.map((t) => interventionSla(t, today));
check('every seeded intervention resolves to a known SLA state',
  seededSla.every((s) => ['ON_TRACK', 'DUE_SOON', 'BREACHED', 'SETTLED', 'CLOSED'].includes(s.state)));

// ---------------------------------------------------------------------------
section('J. SSR — the HRBP dashboard renders every tab');
const HrbpDashboard = (await import('../src/pages/hrbp/HrbpDashboard')).default;
const { CourseStoreProvider } = await import('../src/store/CourseStore');

function renderHrbp(tab, path) {
  localStorage.clear();
  localStorage.setItem('mm-megalearn-auth-v6', JSON.stringify(hrbpUser));
  return renderToStaticMarkup(
    <MemoryRouter initialEntries={[path]}>
      <CourseStoreProvider>
        <Routes>
          <Route path={path} element={<HrbpDashboard initialTab={tab} />} />
        </Routes>
      </CourseStoreProvider>
    </MemoryRouter>
  );
}

const tabs = [
  ['SKILL_GAP', '/hrbp'],
  ['SUCCESSION', '/hrbp/succession'],
  ['COMPLIANCE', '/hrbp/compliance'],
  ['CURRICULUM', '/hrbp/curriculum'],
];

const html = {};
for (const [tab, path] of tabs) {
  let ok = true;
  try {
    html[tab] = renderHrbp(tab, path);
  } catch (err) {
    ok = false;
    console.log(`         render error on ${tab}: ${err.message}`);
  }
  check(`HRBP ${tab} renders without crashing`, ok && html[tab].length > 500);
}

check('the header states the resolved portfolio, not a hardcoded region',
  html.SKILL_GAP.includes('Store Operations') && html.SKILL_GAP.includes('stores &amp; depots'));
check('the compliance tab separates coverage from compliance',
  html.COMPLIANCE.includes('Coverage') && html.COMPLIANCE.includes('Compliance'));
check('the compliance tab reports course coverage as its own metric, separate from completion',
  html.COMPLIANCE.includes('Course coverage') && html.COMPLIANCE.includes('Portfolio compliance'));
check('the compliance tab states the allocation position rather than staying silent',
  html.COMPLIANCE.includes('Every employee in scope is assigned all three') ||
  html.COMPLIANCE.includes('never assigned') || html.COMPLIANCE.includes('Never assigned'));
check('the succession tab shows the derived readiness blockers',
  html.SUCCESSION.includes('Blocker') || html.SUCCESSION.includes('blocker'));
check('the succession tab shows the nine-box talent grid',
  html.SUCCESSION.includes('Nine-Box') || html.SUCCESSION.includes('nine-box'));
check('the succession tab shows bench strength per target role',
  html.SUCCESSION.includes('Bench strength') || html.SUCCESSION.includes('Bench Strength'));
check('the skill gap tab shows the affected headcount per unit',
  html.SKILL_GAP.includes('affected'));
check('the skill gap tab shows the intervention SLA state',
  html.SKILL_GAP.includes('SLA') || html.SKILL_GAP.includes('Due soon') || html.SKILL_GAP.includes('breached'));
check('the business-rule reference is reachable from the dashboard',
  html.SKILL_GAP.includes('BR-HRBP-'));

// ---------------------------------------------------------------------------
section('K. Navigation — exactly one nav item highlights per route');
{
  const AppHeader = (await import('../src/features/layout/AppHeader')).default;

  function navHtmlAt(path) {
    localStorage.clear();
    localStorage.setItem('mm-megalearn-auth-v6', JSON.stringify(hrbpUser));
    return renderToStaticMarkup(
      <MemoryRouter initialEntries={[path]}>
        <CourseStoreProvider>
          <Routes>
            <Route path="*" element={<AppHeader role="hrbp" />} />
          </Routes>
        </CourseStoreProvider>
      </MemoryRouter>
    );
  }

  // How many nav entries carry the active class on a given route.
  function activeCount(markup) {
    return (markup.match(/class="app-nav-item active"/g) || []).length;
  }

  const routes = ['/hrbp', '/hrbp/succession', '/hrbp/compliance', '/hrbp/curriculum', '/hrbp/catalog'];
  const counts = {};
  routes.forEach((r) => { counts[r] = activeCount(navHtmlAt(r)); });

  check('the analytics nav item stays highlighted across its own four tabs',
    ['/hrbp', '/hrbp/succession', '/hrbp/compliance', '/hrbp/curriculum'].every((r) => counts[r] === 1));
  check('no HRBP route highlights two workspace items at once',
    routes.every((r) => counts[r] <= 1));
  check('the catalog route highlights exactly one item',
    counts['/hrbp/catalog'] === 1);
}

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
