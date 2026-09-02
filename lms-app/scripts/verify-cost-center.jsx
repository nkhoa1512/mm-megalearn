/* Verification harness for the Cost Center module.
 *
 * Two layers are checked:
 *   A. Pure ledger arithmetic (no React): pricing, building cost centers, seeding the
 *      opening ledger, report aggregation, new paid/free enrollments, no double counting.
 *   B. SSR: the AdminCostCenter page renders for every role without blowing up.
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
  buildCostCenters,
  buildEnrollmentTransaction,
  seedOpeningLedger,
  summarizeLedger,
  pricingOf,
  derivePricing,
  isPaidCourse,
  costCenterForUser,
  scopeLedgerForUser,
  summarizeLearnerCosts,
  buildEmployeeCostExportRows,
  formatVnd,
  formatVndShort,
  COST_TYPE,
  TXN_TYPE,
  TXN_SOURCE,
  CURRENCY,
} = await import('../src/utils/costCenter');

const { courses, allUsers: allUsersFn, userEnrollmentsMap, divisions } = await import('../src/data/mockData');
const allUsers = allUsersFn();

let failures = 0;
let checks = 0;

function check(label, condition, detail = '') {
  checks += 1;
  if (condition) {
    console.log(`  ✓ ${label}${detail ? ` — ${detail}` : ''}`);
  } else {
    failures += 1;
    console.log(`  ✗ ${label}${detail ? ` — ${detail}` : ''}`);
  }
}

function section(title) {
  console.log(`\n${title}`);
  console.log('-'.repeat(title.length));
}

// ===========================================================================
// A. LEDGER ARITHMETIC
// ===========================================================================

section('A1. Course pricing by delivery format');

const paid = courses.filter(isPaidCourse);
const free = courses.filter((c) => !isPaidCourse(c));

check('The catalog has both paid and free courses', paid.length > 0 && free.length > 0,
  `${paid.length} paid / ${free.length} free / ${courses.length} total`);

const externalSample = courses.find((c) => c.modality === 'EXTERNAL_PLATFORM');
const classroomSample = courses.find((c) => c.modality === 'CLASSROOM_LAB');
const scormSample = courses.find((c) => c.modality === 'SCORM_PACKAGE');

check('External-platform courses are charged per licence seat',
  pricingOf(externalSample).costType === COST_TYPE.EXTERNAL_LICENSE && pricingOf(externalSample).price > 0,
  `${externalSample.code} = ${formatVnd(pricingOf(externalSample).price)}`);

check('In-person classes charge a delivery cost per learner',
  pricingOf(classroomSample).costType === COST_TYPE.VENDOR_CLASSROOM && pricingOf(classroomSample).price > 0,
  `${classroomSample.code} = ${formatVnd(pricingOf(classroomSample).price)}`);

check('Internal e-learning is free (zero cost)',
  pricingOf(scormSample).isFree && pricingOf(scormSample).price === 0,
  `${scormSample.code} = ${formatVnd(0)}`);

const manualPriced = { ...scormSample, pricing: { isFree: false, price: 1234000, costType: COST_TYPE.CERTIFICATION_FEE } };
check('A price set by the Admin overrides the derived price',
  pricingOf(manualPriced).price === 1234000 && pricingOf(manualPriced).source === 'MANUAL',
  `${formatVnd(pricingOf(manualPriced).price)} thay cho ${formatVnd(derivePricing(scormSample).price)}`);

const manualFree = { ...externalSample, pricing: { isFree: true, price: 0 } };
check('The Admin can switch a paid course to free',
  pricingOf(manualFree).isFree && !isPaidCourse(manualFree));

// ---------------------------------------------------------------------------

section('A2. Cost centers & budgets');

const costCenters = buildCostCenters(divisions, allUsers);
const totalBudget = costCenters.reduce((s, c) => s + c.budgetAnnual, 0);
const totalHead = costCenters.reduce((s, c) => s + c.headcount, 0);

check('Every Division is a cost center', costCenters.length >= divisions.length,
  `${costCenters.length} cost center / ${divisions.length} division`);
check('Total headcount matches the employee list', totalHead === allUsers.length,
  `${totalHead} = ${allUsers.length}`);
check('Every cost center has a positive budget', costCenters.every((c) => c.budgetAnnual > 0),
  `total budget ${formatVndShort(totalBudget)}`);

const sampleUser = allUsers.find((u) => u.divisionId);
const sampleCc = costCenterForUser(sampleUser, costCenters);
check('A learner maps to the cost center of their own Division',
  sampleCc && sampleCc.divisionId === sampleUser.divisionId,
  `${sampleUser.fullName} -> ${sampleCc?.code} ${sampleCc?.name}`);

// ---------------------------------------------------------------------------

section('A3. Opening ledger & aggregated report');

const ledger = seedOpeningLedger({ costCenters, courses, users: allUsers, enrollmentMatrix: userEnrollmentsMap });
const report = summarizeLedger(ledger, { costCenters, courses });
const { totals } = report;

const incomeTxns = ledger.filter((t) => t.type === TXN_TYPE.INCOME);
const enrollTxns = ledger.filter((t) => t.source === TXN_SOURCE.ENROLLMENT);

check('The ledger holds both INCOME (budget grants) and EXPENSE (enrollments) entries',
  incomeTxns.length > 0 && enrollTxns.length > 0,
  `${incomeTxns.length} thu / ${enrollTxns.length} chi`);

check('Total income = the sum of every cost center budget', totals.income === totalBudget,
  formatVndShort(totals.income));

check('Enrollments split correctly into paid + free',
  totals.paidEnrollments + totals.freeEnrollments === totals.totalEnrollments,
  `${totals.paidEnrollments} paid + ${totals.freeEnrollments} free = ${totals.totalEnrollments}`);

check('A free course incurs no cost',
  enrollTxns.filter((t) => t.isFree).every((t) => t.amount === 0),
  `${totals.freeEnrollments} zero-cost internal enrollments`);

check('Every paid enrollment records a positive amount',
  enrollTxns.filter((t) => !t.isFree).every((t) => t.amount > 0));

const expenseSum = ledger.filter((t) => t.type === TXN_TYPE.EXPENSE).reduce((s, t) => s + t.amount, 0);
check('Total expense matches the sum of the expense entries', totals.expense === expenseSum, formatVndShort(totals.expense));
check('Balance = income - expense', totals.balance === totals.income - totals.expense, formatVndShort(totals.balance));
check('The budget is not overspent company-wide', totals.expense < totals.income,
  `${totals.utilization}% utilized`);

const ccSum = report.byCostCenter.reduce((s, c) => s + c.spent, 0);
check('Spend broken down by cost center adds up to the total', ccSum === totals.expense, formatVndShort(ccSum));

// An employee with no Division: their entries must still reach the report, never be dropped.
const orphanUser = { userId: 'USR-ORPHAN', fullName: 'Employee With No Department', divisionId: null, divisionCode: null };
const orphanTxn = buildEnrollmentTransaction({ course: paid[0], user: orphanUser, costCenters, date: '2026-08-31' });
const orphanReport = summarizeLedger([...ledger, orphanTxn], { costCenters, courses });
check('Entries for employees with no Division are not dropped from the report',
  orphanReport.byCostCenter.reduce((s, c) => s + c.spent, 0) === orphanReport.totals.expense &&
    orphanReport.totals.expense === totals.expense + orphanTxn.amount,
  `${orphanTxn.costCenterName} · ${formatVnd(orphanTxn.amount)}`);

const courseSum = report.byCourse.reduce((s, c) => s + c.spent, 0);
check('Spend broken down by course adds up to the total', courseSum === totals.expense, formatVndShort(courseSum));

check('The price list covers 100% of courses (including ones nobody has taken)',
  report.byCourse.length === courses.length, `${report.byCourse.length}/${courses.length}`);

check('The monthly spend chart has data spread across several months', report.byMonth.length >= 6,
  report.byMonth.map((m) => `${m.label}:${formatVndShort(m.value)}`).join(' · '));

const overspent = report.byCostCenter.filter((c) => c.remaining < 0);
console.log(`  ℹ ${overspent.length} cost center(s) over budget: ${overspent.slice(0, 3).map((c) => `${c.code} (${c.utilization}%)`).join(', ') || 'none'}`);

// ---------------------------------------------------------------------------

section('A4. A new enrollment pushes a transaction into the ledger');

const learner = allUsers.find((u) => u.divisionId && u.role === 'learner') || allUsers[0];
const learnerCc = costCenterForUser(learner, costCenters);
const paidCourse = paid[0];
const freeCourse = free[0];

const paidTxn = buildEnrollmentTransaction({ course: paidCourse, user: learner, costCenters, date: '2026-08-31' });
const freeTxn = buildEnrollmentTransaction({ course: freeCourse, user: learner, costCenters, date: '2026-08-31' });

check('Enrolling in a PAID course debits the learner\'s own cost center',
  paidTxn.costCenterId === learnerCc.id && paidTxn.amount === pricingOf(paidCourse).price && !paidTxn.isFree,
  `${learner.fullName} · ${paidCourse.code} · ${formatVnd(paidTxn.amount)} -> ${paidTxn.costCenterName}`);

check('Enrolling in a FREE course records zero but still writes an entry',
  freeTxn.isFree && freeTxn.amount === 0 && freeTxn.source === TXN_SOURCE.ENROLLMENT,
  `${freeCourse.code} · ${formatVnd(0)}`);

const afterLedger = [...ledger.filter((t) => t.id !== paidTxn.id && t.id !== freeTxn.id), paidTxn, freeTxn];
const afterReport = summarizeLedger(afterLedger, { costCenters, courses });
check('Total spend rises by exactly the price of the course just enrolled in',
  afterReport.totals.expense - summarizeLedger(ledger.filter((t) => t.id !== paidTxn.id && t.id !== freeTxn.id), { costCenters, courses }).totals.expense === paidTxn.amount,
  `+${formatVnd(paidTxn.amount)}`);

const dupTxn = buildEnrollmentTransaction({ course: paidCourse, user: learner, costCenters, date: '2026-09-01' });
check('Re-enrolling in the same course creates no new entry (deterministic id)',
  dupTxn.id === paidTxn.id, dupTxn.id);

// ---------------------------------------------------------------------------

section('A5. Creating a course with its price set up front (as AdminCourseBuilder does)');

// Mirrors exactly the field CoursePricingSection writes into draft.pricing when the
// Admin types a price while creating the course — NOT edited later via the "Price List" tab.
const brandNewCourse = {
  id: 'CRS-DEMO-NEW-001',
  code: 'DEMO-001',
  title: 'Newly Created Paid Demo Course',
  category: 'Leadership & Management',
  modality: 'SCORM_PACKAGE', // defaults to FREE unless pricing is set by hand
  pricing: { isFree: false, price: 1500000, currency: CURRENCY, costType: COST_TYPE.CERTIFICATION_FEE, vendor: 'PMI Vietnam' },
};

check('A newly created course takes the entered price instead of falling back to the modality default',
  pricingOf(brandNewCourse).price === 1500000 && !pricingOf(brandNewCourse).isFree,
  `${formatVnd(pricingOf(brandNewCourse).price)} (would be Free if unset, because modality=SCORM_PACKAGE)`);

const demoLearner = allUsers.find((u) => u.divisionId) || allUsers[0];
const demoTxn = buildEnrollmentTransaction({ course: brandNewCourse, user: demoLearner, costCenters, date: '2026-08-31' });
const ledgerWithNewCourse = [...ledger, demoTxn];
const reportWithNewCourse = summarizeLedger(ledgerWithNewCourse, { costCenters, courses: [...courses, brandNewCourse] });
const newCourseRow = reportWithNewCourse.byCourse.find((r) => r.courseId === brandNewCourse.id);

check('Enrolling in the newly created course books the right price into the ledger',
  demoTxn.amount === 1500000 && !demoTxn.isFree,
  `${demoTxn.userName} ghi danh ${brandNewCourse.title} -> ${formatVnd(demoTxn.amount)}`);

check('The newly created course appears in the Price List / Cost Center report with the right amount',
  newCourseRow && newCourseRow.spent === 1500000 && newCourseRow.seats === 1,
  `${newCourseRow?.title}: ${newCourseRow?.seats} seats, total spend ${formatVnd(newCourseRow?.spent || 0)}`);

check('Company-wide spend rises by exactly the tuition of the new course',
  reportWithNewCourse.totals.expense === totals.expense + 1500000,
  `+${formatVnd(1500000)}`);

// ===========================================================================
// B. SSR OF THE REPORT PAGE
// ===========================================================================

section('B. Rendering the Cost Center page for every role');

const { CourseStoreProvider } = await import('../src/store/CourseStore');
const { personaForRole } = await import('../src/data/mockData');
const { ROLE_ORDER } = await import('../src/data/roles');
const AdminCostCenter = (await import('../src/pages/admin/AdminCostCenter')).default;

const AUTH_KEY = 'mm-megalearn-auth-v6';

const { hasCapability } = await import('../src/data/roles');

ROLE_ORDER.forEach((role) => {
  store.clear();
  store.set(AUTH_KEY, JSON.stringify(personaForRole(role)));
  const shouldSee = hasCapability(role, 'canViewCostCenter');
  try {
    const html = renderToStaticMarkup(
      <CourseStoreProvider>
        <MemoryRouter initialEntries={['/admin/cost-center']}>
          <Routes>
            <Route path="/admin/cost-center" element={<AdminCostCenter />} />
          </Routes>
        </MemoryRouter>
      </CourseStoreProvider>
    );

    if (shouldSee) {
      check(`role=${role} can see the income/expense report`, html.length > 2000 && html.includes('₫'),
        `${html.length} characters of HTML`);
    } else {
      // An ordinary learner may not see the training finance report.
      check(`role=${role} is blocked from the finance report`,
        html.includes('Access Restricted') && !html.includes('₫'),
        'shows the access-denied card instead of the figures');
    }
  } catch (err) {
    check(`role=${role} render trang Cost Center`, false, err.message);
  }
});

// A Manager may only see the cost center of their own Division.
store.clear();
store.set(AUTH_KEY, JSON.stringify(personaForRole('manager')));
const managerPersona = personaForRole('manager');
const managerLedger = scopeLedgerForUser(ledger, managerPersona, { seeAll: false });
check('A Manager only sees entries from their own Division',
  managerLedger.length > 0 &&
    managerLedger.every((t) => t.costCenterCode === managerPersona.costCenterCode),
  `${managerLedger.length}/${ledger.length} ledger entries · ${managerPersona.divisionName} · CC ${managerPersona.costCenterCode}`);

// ===========================================================================

// ===========================================================================
// C. THE 5-DIGIT COST CENTER CODE & THE HR / AUDIT EXPORT FILE
// ===========================================================================

section('C1. Exactly one 5-digit Cost Center code per Division');

const ccCodes = costCenters.filter((c) => c.divisionId).map((c) => c.code);

check('Every cost center carries a 5-digit code',
  ccCodes.length > 0 && ccCodes.every((c) => /^\d{5}$/.test(c)),
  `${ccCodes.length} codes · e.g. ${ccCodes.slice(0, 4).join(', ')}`);

check('No code is shared between Divisions',
  new Set(ccCodes).size === ccCodes.length,
  `${new Set(ccCodes).size} unique codes / ${ccCodes.length} Divisions`);

check('The cost center count equals the Division count',
  ccCodes.length === divisions.length,
  `${ccCodes.length} cost center / ${divisions.length} Division`);

const multiDeptDivision = divisions.find((d) =>
  allUsers.filter((u) => u.divisionId === d.id).length > 1
);
const sameDivUsers = allUsers.filter((u) => u.divisionId === multiDeptDivision.id);

check('Employees in different Departments of the same Division share one code',
  new Set(sameDivUsers.map((u) => costCenterForUser(u, costCenters)?.code)).size === 1,
  `${multiDeptDivision.name}: ${sameDivUsers.length} people · ${new Set(sameDivUsers.map((u) => u.departmentName)).size} departments · 1 code ${costCenterForUser(sameDivUsers[0], costCenters)?.code}`);

check('An enrollment entry stores the learner\'s own cost center code',
  ledger
    .filter((t) => t.source === TXN_SOURCE.ENROLLMENT)
    .every((t) => t.costCenterCode === allUsers.find((u) => u.userId === t.userId)?.costCenterCode),
  '100% match between the ledger and the employee records');

section('C2. The per-employee cost export (15 HR columns + the cost section)');

const learnerRows = summarizeLearnerCosts(ledger, allUsers);
const exportRows = buildEmployeeCostExportRows(learnerRows);

const HR_COLUMNS = [
  'Employee Status', 'Personnel Number', 'Cost center', 'Full Name', 'Entry Date',
  'Gender', 'Date of birth', 'Business Email Address', 'Position', 'Level',
  'HO/Store', 'Division', 'Department', 'Sub Department', 'Location',
];

check('Every employee has a row in the export, including those who never studied',
  learnerRows.length >= allUsers.length,
  `${learnerRows.length} rows / ${allUsers.length} employees`);

check('The export has all 15 HR columns, in order',
  HR_COLUMNS.every((col, i) => Object.keys(exportRows[0])[i] === col),
  Object.keys(exportRows[0]).slice(0, 15).join(' | '));

check('No row is missing its Cost center code or Personnel Number',
  exportRows.every((r) => /^\d{5}$/.test(r['Cost center']) && r['Personnel Number']),
  `${exportRows.length} valid rows`);

const totalCompanyPaid = learnerRows.reduce((sum, r) => sum + r.companyPaid, 0);
const totalEnrollmentExpense = ledger
  .filter((t) => t.source === TXN_SOURCE.ENROLLMENT)
  .reduce((s, t) => s + t.amount, 0);

check('Per-employee spend adds up to the company-wide enrollment spend',
  totalCompanyPaid === totalEnrollmentExpense,
  `${formatVnd(totalCompanyPaid)} = ${formatVnd(totalEnrollmentExpense)}`);

// ===========================================================================

console.log(`\n${'='.repeat(60)}`);
console.log(failures === 0 ? `PASS — ${checks}/${checks} checks passed.` : `FAIL — ${failures}/${checks} checks failed.`);
console.log('='.repeat(60));
process.exit(failures === 0 ? 0 : 1);
