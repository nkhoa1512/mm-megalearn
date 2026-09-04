// ===========================================================================
// Cost Center — pure logic, with no React dependency.
//
// The MMVN L&D income/expense model:
//   • Each Division owns EXACTLY ONE cost center, identified by a fixed 5-digit
//     HR code (orgHierarchy.divisions[].costCenter). An employee in
//     any Department or Sub-Department of a Division maps to that same code, so
//     an internal transfer within a Division does not move the cost to a different code.
//   • The annual training budget is granted per code based on the division's headcount
//     (Operations / Supporting).
//   • INCOME  = the budget granted at the start of the year (+ refunds when an enrollment is cancelled).
//   • EXPENSE = every enrollment in a PAID course is debited to the cost center of
//     the learner themselves (by divisionId). The learner NEVER pays: all tuition
//     is paid by the company from that code's training budget. A free course still writes one
//     a zero-value entry so reports can count internal enrollments against paid ones.
//   • Every entry stores the Division / Department / Sub-Department and the employee
//     code, which is enough for an audit to trace every unit of spend.
//   • Balance = INCOME - EXPENSE; budget utilization = EXPENSE / INCOME.
//
// The course price is derived from the delivery modality when the course has not been given
// a price manually — see derivePricing(). When the Admin sets a specific price, `course.pricing`
// takes absolute priority (pricingOf()).
// ===========================================================================

import { hrExportRow, costCenterCodeOf } from '../data/hrProfile';
import { courseIntakes, intakeHours } from './classSchedule';

export const CURRENCY = 'VND';
export const FISCAL_YEAR = 2026;

// ---------------------------------------------------------------------------
// 1. COST TYPES
// ---------------------------------------------------------------------------

export const COST_TYPE = {
  INTERNAL_FREE: 'INTERNAL_FREE',
  EXTERNAL_LICENSE: 'EXTERNAL_LICENSE',
  VENDOR_CLASSROOM: 'VENDOR_CLASSROOM',
  CERTIFICATION_FEE: 'CERTIFICATION_FEE',
};

export const COST_TYPE_META = {
  INTERNAL_FREE: {
    labelVi: 'Internal — Free',
    labelEn: 'Internal — Free',
    tone: 'sage',
    icon: 'ti-gift',
    noteVi: 'Content produced in-house by MMVN L&D, with no cost per enrollment.',
  },
  EXTERNAL_LICENSE: {
    labelVi: 'External Platform Licence',
    labelEn: 'External Platform License',
    tone: 'blue',
    icon: 'ti-external-link',
    noteVi: 'Bought per seat from LinkedIn Learning / Coursera / Udemy Business.',
  },
  VENDOR_CLASSROOM: {
    labelVi: 'In-Person Class — Delivery Cost',
    labelEn: 'In-Person Classroom Cost',
    tone: 'amber',
    icon: 'ti-chalkboard',
    noteVi: 'Trainer, room/workshop and consumable costs per learner.',
  },
  CERTIFICATION_FEE: {
    labelVi: 'Examination & Certification Fee',
    labelEn: 'Certification Fee',
    tone: 'rust',
    icon: 'ti-certificate',
    noteVi: 'Examination and certification fees charged by an external body.',
  },
};

// ---------------------------------------------------------------------------
// 2. STANDARD PRICE LIST (VND / learner seat)
// ---------------------------------------------------------------------------

// Matches costPerSeat in costTrackingData (mockData.js) so the two reports
// so the figures do not contradict each other.
export const PLATFORM_SEAT_PRICE = [
  { match: 'linkedin', price: 2500000, platform: 'LinkedIn Learning Enterprise' },
  { match: 'udemy', price: 3600000, platform: 'Udemy Business' },
  { match: 'coursera', price: 4800000, platform: 'Coursera for Business' },
];
const DEFAULT_PLATFORM_SEAT_PRICE = 3000000;

// In-person class: the delivery cost per learner is computed from the duration.
export const CLASSROOM_COST_PER_HOUR = 250000;

// The training budget granted to each cost center = headcount × the annual rate. The rate
// is calibrated so company-wide utilization lands around ~60%, matching the
// 63.3% budgetUtilization that costTrackingData (mockData.js) publishes.
export const ANNUAL_ALLOWANCE_PER_HEAD = {
  OPERATIONS: 2000000,
  SUPPORTING: 3500000,
};
// A budget floor for small units — it must still cover the mandatory compliance
// mandatory courses even with only a few people.
export const MIN_ANNUAL_BUDGET = 12000000;

// ---------------------------------------------------------------------------
// 3. COURSE PRICING
// ---------------------------------------------------------------------------

/** '3h' | '3.5h' | 3 -> 3 (hours). Returns 2 when it cannot be parsed. */
export function hoursOf(estimatedHours) {
  if (typeof estimatedHours === 'number' && Number.isFinite(estimatedHours)) return estimatedHours;
  const parsed = parseFloat(String(estimatedHours ?? '').replace(',', '.'));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 2;
}

/** Rounds money up to a multiple of 50,000 VND to keep the price list tidy. */
export function roundPrice(amount) {
  return Math.round(amount / 50000) * 50000;
}

/**
 * Derives a course's default price from its delivery modality. This is only an initial
 * suggested price — once the Admin edits it in the "Course Price List" tab, `course.pricing`
 * completely overrides this function's result.
 */
export function derivePricing(course) {
  if (!course) {
    return { isFree: true, price: 0, currency: CURRENCY, costType: COST_TYPE.INTERNAL_FREE, vendor: null, source: 'DERIVED' };
  }

  if (course.modality === 'EXTERNAL_PLATFORM') {
    const src = String(course.platformSource || '').toLowerCase();
    const hit = PLATFORM_SEAT_PRICE.find((p) => src.includes(p.match));
    return {
      isFree: false,
      price: hit ? hit.price : DEFAULT_PLATFORM_SEAT_PRICE,
      currency: CURRENCY,
      costType: COST_TYPE.EXTERNAL_LICENSE,
      vendor: hit ? hit.platform : (course.platformSource || 'External Platform'),
      source: 'DERIVED',
    };
  }

  if (course.modality === 'CLASSROOM_LAB' || course.deliveryType === 'IN_PERSON_CLASSROOM') {
    // A seat costs what the classroom actually runs for. Read that off the timetable
    // rather than the free-text estimate, so a 2-day course is not priced as a 3-hour one.
    const scheduled = course.totalTrainingHours || intakeHours(courseIntakes(course)[0]);
    return {
      isFree: false,
      price: roundPrice((scheduled > 0 ? scheduled : hoursOf(course.estimatedHours)) * CLASSROOM_COST_PER_HOUR),
      currency: CURRENCY,
      costType: COST_TYPE.VENDOR_CLASSROOM,
      vendor: course.venue || 'MMVN Training Venue',
      source: 'DERIVED',
    };
  }

  return {
    isFree: true,
    price: 0,
    currency: CURRENCY,
    costType: COST_TYPE.INTERNAL_FREE,
    vendor: null,
    source: 'DERIVED',
  };
}

/** The effective course price: the Admin-set price wins, otherwise it is derived. */
export function pricingOf(course) {
  const manual = course?.pricing;
  if (manual && typeof manual === 'object') {
    const price = Number(manual.price) || 0;
    const isFree = manual.isFree ?? price <= 0;
    return {
      isFree,
      price: isFree ? 0 : price,
      currency: manual.currency || CURRENCY,
      costType: isFree ? COST_TYPE.INTERNAL_FREE : (manual.costType || COST_TYPE.EXTERNAL_LICENSE),
      vendor: manual.vendor || null,
      source: 'MANUAL',
    };
  }
  return derivePricing(course);
}

/** Does this course charge a fee to attend? */
export function isPaidCourse(course) {
  const p = pricingOf(course);
  return !p.isFree && p.price > 0;
}

// ---------------------------------------------------------------------------
// 4. CURRENCY FORMATTING
// ---------------------------------------------------------------------------

const vndFormatter = new Intl.NumberFormat('en-US');

export function formatVnd(amount) {
  return `${vndFormatter.format(Math.round(Number(amount) || 0))} ₫`;
}

/** Shortened for KPI tiles: 4,500,000,000 -> "4.5B ₫"; 2,500,000 -> "2.5M ₫". */
export function formatVndShort(amount) {
  const n = Number(amount) || 0;
  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(n);
  if (abs >= 1e9) return `${sign}${(abs / 1e9).toFixed(abs >= 1e10 ? 0 : 1)}B ₫`;
  if (abs >= 1e6) return `${sign}${(abs / 1e6).toFixed(abs >= 1e8 ? 0 : 1).replace('.', ',')} tr ₫`;
  if (abs >= 1e3) return `${sign}${vndFormatter.format(abs)} ₫`;
  return `${sign}${abs} ₫`;
}

export function priceLabel(course) {
  const p = pricingOf(course);
  return p.isFree ? 'Free' : formatVnd(p.price);
}

// ---------------------------------------------------------------------------
// 5. COST CENTERS
// ---------------------------------------------------------------------------

export const UNASSIGNED_COST_CENTER = {
  id: 'CC-UNASSIGNED',
  divisionId: null,
  divisionCode: null,
  code: 'UNASSIGNED',
  name: 'No Cost Center Assigned',
  branch: 'SUPPORTING',
  location: null,
  headcount: 0,
  budgetAnnual: 0,
};

/**
 * Builds the cost center list from the Division structure + real employees.
 * Each Division yields exactly one cost center, whose `code` is the Division's 5-digit HR code.
 * Annual budget = headcount × the division rate, with a floor of MIN_ANNUAL_BUDGET.
 */
export function buildCostCenters(divisions = [], users = []) {
  const headcountByDivision = users.reduce((acc, u) => {
    const key = u.divisionId || 'UNASSIGNED';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const centers = divisions.map((d) => {
    const headcount = headcountByDivision[d.id] || 0;
    const allowance = ANNUAL_ALLOWANCE_PER_HEAD[d.branch] ?? ANNUAL_ALLOWANCE_PER_HEAD.SUPPORTING;
    return {
      // The 5-digit code is the cost center's accounting identity.
      id: `CC-${d.costCenter || d.code}`,
      divisionId: d.id,
      divisionCode: d.code,
      code: d.costCenter || d.code,
      name: d.name,
      branch: d.branch,
      branchName: d.branch === 'OPERATIONS' ? 'Store Operations Division' : 'Supporting Functions Division',
      location: d.location || null,
      headcount,
      budgetAnnual: Math.max(MIN_ANNUAL_BUDGET, headcount * allowance),
      budgetPerHead: allowance,
    };
  });

  const unassignedHead = headcountByDivision.UNASSIGNED || 0;
  if (unassignedHead > 0) {
    centers.push({ ...UNASSIGNED_COST_CENTER, headcount: unassignedHead });
  }
  return centers;
}

/**
 * The cost center bearing a learner's cost = the cost center of their Division,
 * regardless of which Department or Sub-Department they sit in within it.
 */
export function costCenterForUser(user, costCenters = []) {
  if (!user) return null;
  return (
    costCenters.find((c) => c.divisionId && c.divisionId === user.divisionId) ||
    costCenters.find((c) => user.costCenterCode && c.code === user.costCenterCode) ||
    costCenters.find((c) => c.divisionCode && c.divisionCode === user.divisionCode) ||
    costCenters.find((c) => c.id === UNASSIGNED_COST_CENTER.id) ||
    null
  );
}

// ---------------------------------------------------------------------------
// 6. TRANSACTION LEDGER
// ---------------------------------------------------------------------------

export const TXN_TYPE = { INCOME: 'INCOME', EXPENSE: 'EXPENSE' };
export const TXN_SOURCE = {
  BUDGET_ALLOCATION: 'BUDGET_ALLOCATION',
  ENROLLMENT: 'ENROLLMENT',
  REFUND: 'REFUND',
  MANUAL: 'MANUAL',
};

export const TXN_SOURCE_META = {
  BUDGET_ALLOCATION: { labelVi: 'Training Budget Grant', tone: 'sage', icon: 'ti-wallet' },
  ENROLLMENT: { labelVi: 'Course Enrollment', tone: 'blue', icon: 'ti-user-plus' },
  REFUND: { labelVi: 'Enrollment Cancellation Refund', tone: 'amber', icon: 'ti-receipt-refund' },
  MANUAL: { labelVi: 'Manual Adjustment', tone: 'slate', icon: 'ti-pencil' },
};

/**
 * Creates one expense entry for an enrollment. A free course still produces an entry with
 * amount = 0 and isFree = true, so reports can separate "zero-cost internal enrollments"
 * from "budget-consuming enrollments" without looking back at the course catalog.
 */
export function buildEnrollmentTransaction({ course, user, costCenters = [], date, enrolledVia = 'SELF_ENROLL', id }) {
  if (!course || !user) return null;
  const pricing = pricingOf(course);
  const cc = costCenterForUser(user, costCenters);
  const txnDate = date || new Date().toISOString().slice(0, 10);

  return {
    id: id || `TXN-ENR-${user.userId}-${course.id}`,
    date: txnDate,
    fiscalYear: Number(txnDate.slice(0, 4)) || FISCAL_YEAR,
    type: TXN_TYPE.EXPENSE,
    source: TXN_SOURCE.ENROLLMENT,
    costCenterId: cc?.id || UNASSIGNED_COST_CENTER.id,
    costCenterCode: cc?.code || UNASSIGNED_COST_CENTER.code,
    costCenterName: cc?.name || UNASSIGNED_COST_CENTER.name,
    branch: cc?.branch || 'SUPPORTING',
    // The learner's org dimensions at enrollment time — kept on the entry so
    // so later reports need not join back to the employee directory (which may have changed).
    divisionId: user.divisionId || cc?.divisionId || null,
    divisionName: user.divisionName || cc?.name || null,
    departmentName: user.departmentName || null,
    subDepartmentName: user.subDepartmentName || null,
    courseId: course.id,
    courseCode: course.code || course.id,
    courseTitle: course.title,
    courseCategory: course.category || null,
    costType: pricing.costType,
    vendor: pricing.vendor,
    userId: user.userId,
    userName: user.fullName || user.userId,
    personnelNumber: user.personnelNumber || null,
    amount: pricing.price,
    currency: pricing.currency,
    isFree: pricing.isFree,
    enrolledVia,
    note: pricing.isFree
      ? 'A free internal course — the enrollment is recorded without drawing budget.'
      : `Enrollment in a paid course (${COST_TYPE_META[pricing.costType]?.labelVi || pricing.costType}).`,
  };
}

/** Income entry: granting the annual training budget to one cost center. */
export function buildBudgetTransaction(costCenter, fiscalYear = FISCAL_YEAR) {
  return {
    id: `TXN-BUD-${fiscalYear}-${costCenter.id}`,
    date: `${fiscalYear}-01-01`,
    fiscalYear,
    type: TXN_TYPE.INCOME,
    source: TXN_SOURCE.BUDGET_ALLOCATION,
    costCenterId: costCenter.id,
    costCenterCode: costCenter.code,
    costCenterName: costCenter.name,
    branch: costCenter.branch,
    divisionId: costCenter.divisionId || null,
    divisionName: costCenter.name,
    departmentName: null,
    subDepartmentName: null,
    courseId: null,
    courseCode: null,
    courseTitle: null,
    courseCategory: null,
    costType: null,
    vendor: null,
    userId: null,
    userName: null,
    personnelNumber: null,
    amount: costCenter.budgetAnnual,
    currency: CURRENCY,
    isFree: false,
    note: `The FY${fiscalYear} training budget granted for ${costCenter.headcount} employees.`,
  };
}

// Spread historical enrollment dates across the first 8 months of the fiscal year so the trend
// chart has real data instead of piling everything onto one date.
function seededHistoricalDate(seed, fiscalYear = FISCAL_YEAR) {
  const month = (seed % 8) + 1;
  const day = ((seed * 7) % 27) + 1;
  return `${fiscalYear}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/**
 * The opening ledger, derived from static HRIS data (the enrollment matrix + budget).
 * It is NOT persisted to localStorage — only transactions created in the session are saved,
 * following the same overlay model as `enrollments` in CourseStore.
 */
export function seedOpeningLedger({ costCenters = [], courses = [], users = [], enrollmentMatrix = {}, fiscalYear = FISCAL_YEAR }) {
  const ledger = costCenters.filter((c) => c.budgetAnnual > 0).map((c) => buildBudgetTransaction(c, fiscalYear));
  const courseById = new Map(courses.map((c) => [c.id, c]));

  users.forEach((user, uIdx) => {
    const enrolled = enrollmentMatrix[user.userId] || {};
    Object.keys(enrolled).forEach((courseId, cIdx) => {
      const course = courseById.get(courseId);
      if (!course) return;
      const txn = buildEnrollmentTransaction({
        course,
        user,
        costCenters,
        date: seededHistoricalDate(uIdx * 13 + cIdx * 5, fiscalYear),
        enrolledVia: enrolled[courseId]?.enrolledVia || 'HRIS_ASSIGNMENT',
        id: `TXN-ENR-${user.userId}-${courseId}`,
      });
      if (txn) ledger.push(txn);
    });
  });

  return ledger;
}

// ---------------------------------------------------------------------------
// 7. REPORT AGGREGATION
// ---------------------------------------------------------------------------

function percent(part, whole) {
  if (!whole) return 0;
  return Math.round((part / whole) * 1000) / 10;
}

/**
 * Aggregates the ledger into reporting slices: total income/expense, by cost center, by
 * course, by month and by cost type.
 */
export function summarizeLedger(ledger = [], { costCenters = [], courses = [] } = {}) {
  const totals = {
    income: 0,
    expense: 0,
    balance: 0,
    utilization: 0,
    txnCount: ledger.length,
    paidEnrollments: 0,
    freeEnrollments: 0,
    totalEnrollments: 0,
    distinctLearners: 0,
    costPerLearner: 0,
  };

  const ccMap = new Map(
    costCenters.map((c) => [
      c.id,
      { ...c, budget: c.budgetAnnual, income: 0, spent: 0, remaining: 0, utilization: 0, paidEnrollments: 0, freeEnrollments: 0, learners: new Set(), txnCount: 0 },
    ])
  );
  const courseMap = new Map();
  const byMonth = new Map();
  const byCostType = new Map();
  const learners = new Set();

  // An entry pointing at a cost center missing from the list (an employee with no
  // Division, or a Division deleted after entries were written) must still appear in the
  // report — skipping it would make the per-cost-center breakdown disagree with total spend.
  function bucketFor(t) {
    if (!t.costCenterId) return null;
    let cc = ccMap.get(t.costCenterId);
    if (!cc) {
      cc = {
        id: t.costCenterId,
        code: t.costCenterCode || t.costCenterId,
        name: t.costCenterName || t.costCenterId,
        branch: t.branch || null,
        branchName: null,
        headcount: 0,
        budgetAnnual: 0,
        budget: 0,
        income: 0,
        spent: 0,
        remaining: 0,
        utilization: 0,
        paidEnrollments: 0,
        freeEnrollments: 0,
        learners: new Set(),
        txnCount: 0,
      };
      ccMap.set(t.costCenterId, cc);
    }
    return cc;
  }

  ledger.forEach((t) => {
    const cc = bucketFor(t);

    if (t.type === TXN_TYPE.INCOME) {
      totals.income += t.amount;
      if (cc) {
        cc.income += t.amount;
        cc.txnCount += 1;
      }
      return;
    }

    totals.expense += t.amount;
    if (cc) {
      cc.spent += t.amount;
      cc.txnCount += 1;
    }

    if (t.source === TXN_SOURCE.ENROLLMENT) {
      totals.totalEnrollments += 1;
      if (t.isFree) totals.freeEnrollments += 1;
      else totals.paidEnrollments += 1;
      if (t.userId) learners.add(t.userId);
      if (cc) {
        if (t.isFree) cc.freeEnrollments += 1;
        else cc.paidEnrollments += 1;
        if (t.userId) cc.learners.add(t.userId);
      }

      const row = courseMap.get(t.courseId) || {
        courseId: t.courseId,
        courseCode: t.courseCode,
        title: t.courseTitle,
        category: t.courseCategory,
        costType: t.costType,
        isFree: t.isFree,
        unitPrice: t.amount,
        seats: 0,
        spent: 0,
      };
      row.seats += 1;
      row.spent += t.amount;
      courseMap.set(t.courseId, row);
    }

    const monthKey = String(t.date || '').slice(0, 7);
    if (monthKey) byMonth.set(monthKey, (byMonth.get(monthKey) || 0) + t.amount);

    if (t.costType) {
      const bucket = byCostType.get(t.costType) || { costType: t.costType, amount: 0, count: 0 };
      bucket.amount += t.amount;
      bucket.count += 1;
      byCostType.set(t.costType, bucket);
    }
  });

  totals.balance = totals.income - totals.expense;
  totals.utilization = percent(totals.expense, totals.income);
  totals.distinctLearners = learners.size;
  totals.costPerLearner = learners.size ? Math.round(totals.expense / learners.size) : 0;

  const byCostCenter = Array.from(ccMap.values())
    .map((c) => ({
      ...c,
      learners: c.learners.size,
      remaining: c.income - c.spent,
      utilization: percent(c.spent, c.income),
    }))
    .sort((a, b) => b.spent - a.spent);

  // A course nobody has enrolled in should still appear in the price list, with seats = 0.
  const priced = new Map(courseMap);
  courses.forEach((c) => {
    if (priced.has(c.id)) return;
    const p = pricingOf(c);
    priced.set(c.id, {
      courseId: c.id,
      courseCode: c.code || c.id,
      title: c.title,
      category: c.category || null,
      costType: p.costType,
      isFree: p.isFree,
      unitPrice: p.price,
      seats: 0,
      spent: 0,
    });
  });

  const byCourse = Array.from(priced.values()).sort((a, b) => b.spent - a.spent || b.seats - a.seats);

  return {
    totals,
    byCostCenter,
    byCourse,
    byMonth: Array.from(byMonth.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([key, value]) => ({ key, label: `T${Number(key.slice(5, 7))}`, value })),
    byCostType: Array.from(byCostType.values()).sort((a, b) => b.amount - a.amount),
  };
}

/**
 * Limits the ledger by view permission: a Manager only sees their own cost center.
 * Filter by divisionId first, then by the 5-digit code — `divisionCode` on an employee
 * record does not always match the Division's `code`, so it must not be used to
 * build the cost center id.
 */
export function scopeLedgerForUser(ledger = [], user, { seeAll = true } = {}) {
  if (seeAll || !user) return ledger;
  const divisionId = user.divisionId || null;
  const code = user.costCenterCode || null;
  if (!divisionId && !code) return [];
  return ledger.filter(
    (t) => (divisionId && t.divisionId === divisionId) || (code && t.costCenterCode === code)
  );
}

// ---------------------------------------------------------------------------
// 8. COST PER LEARNER (for audit & the HR export file)
// ---------------------------------------------------------------------------

/**
 * Aggregates the ledger down to individual employees: how much the company spent on this
 * person's learning and under which cost center code. An employee who has never studied still appears
 * with zero — an audit file needs every head in the cost center, not only those
 * with spending.
 */
export function summarizeLearnerCosts(ledger = [], users = []) {
  const rows = new Map();

  users.forEach((u) => {
    rows.set(u.userId, {
      user: u,
      userId: u.userId,
      personnelNumber: u.personnelNumber || null,
      fullName: u.fullName || u.userId,
      // An employee newly added through User Admin may not have a costCenterCode set —
      // derived from their Division so the table does not artificially show UNASSIGNED.
      costCenterCode: u.costCenterCode || costCenterCodeOf(u) || null,
      divisionId: u.divisionId || null,
      divisionName: u.divisionName || null,
      departmentName: u.departmentName || null,
      subDepartmentName: u.subDepartmentName || null,
      position: u.position || u.title || null,
      level: u.level || null,
      paidEnrollments: 0,
      freeEnrollments: 0,
      totalEnrollments: 0,
      companyPaid: 0,
    });
  });

  ledger.forEach((t) => {
    if (t.source !== TXN_SOURCE.ENROLLMENT || !t.userId) return;
    let row = rows.get(t.userId);
    if (!row) {
      // Entries for people who have left the directory must stay in the report, otherwise
      // the per-learner totals would be smaller than the cost center's total spend.
      row = {
        user: null,
        userId: t.userId,
        personnelNumber: t.personnelNumber || null,
        fullName: t.userName || t.userId,
        costCenterCode: t.costCenterCode || null,
        divisionId: t.divisionId || null,
        divisionName: t.divisionName || null,
        departmentName: t.departmentName || null,
        subDepartmentName: t.subDepartmentName || null,
        position: null,
        level: null,
        paidEnrollments: 0,
        freeEnrollments: 0,
        totalEnrollments: 0,
        companyPaid: 0,
      };
      rows.set(t.userId, row);
    }
    row.totalEnrollments += 1;
    if (t.isFree) row.freeEnrollments += 1;
    else {
      row.paidEnrollments += 1;
      row.companyPaid += t.amount;
    }
  });

  return Array.from(rows.values()).sort(
    (a, b) => b.companyPaid - a.companyPaid || b.totalEnrollments - a.totalEnrollments
  );
}

/**
 * The export for Accounting / Audit: the 15 standard HR employee columns, with the
 * training cost THE COMPANY spent on that employee appended. The HR column order and
 * names are preserved so the file can be joined straight into payroll / cost allocation sheets.
 */
export function buildEmployeeCostExportRows(learnerRows = [], { fiscalYear = FISCAL_YEAR } = {}) {
  return learnerRows.map((row) => ({
    ...hrExportRow(row.user || {
      fullName: row.fullName,
      personnelNumber: row.personnelNumber,
      costCenterCode: row.costCenterCode,
      divisionName: row.divisionName,
      departmentName: row.departmentName,
      subDepartmentName: row.subDepartmentName,
      position: row.position,
      level: row.level,
    }),
    'Fiscal Year': fiscalYear,
    'Paid Enrollments': row.paidEnrollments,
    'Free Enrollments': row.freeEnrollments,
    'Company Paid (VND)': row.companyPaid,
    Currency: CURRENCY,
  }));
}
