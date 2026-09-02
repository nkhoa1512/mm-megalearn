// ===========================================================================
// HRBP BUSINESS RULES ENGINE
//
// Every number an HR Business Partner acts on is derived here, from real user
// records and real enrollments. Nothing in this file invents a percentage when
// the underlying data is missing — a missing record is itself a finding, and is
// reported as one (see BR-HRBP-011).
//
// The rules carry stable ids (BR-HRBP-xxx) so the UI can show a learner or an
// auditor exactly which rule produced a verdict, the same way the platform
// engines are referenced elsewhere (BR-018/019 for progress, BR-022→026 for
// assessments, and so on).
// ===========================================================================

import { divisions } from '../data/orgHierarchy';
import { UNIVERSAL_COMPLIANCE_COURSE_IDS } from '../data/generated100Data';
import { levelValue } from '../data/levelSystem';

// ---------------------------------------------------------------------------
// Rule catalogue — rendered in the UI so the role's logic is inspectable.
// ---------------------------------------------------------------------------
export const HRBP_RULES = [
  {
    id: 'BR-HRBP-001',
    group: 'Portfolio & scope',
    title: 'An HRBP owns a portfolio, not the whole company',
    statement:
      'Every HRBP figure is computed over a declared portfolio of org units. The portfolio resolves from the HRBP record itself: the branch they partner (OPERATIONS or SUPPORTING) plus the divisions in that branch. Company-wide numbers are only shown when the portfolio is explicitly set to company-wide.',
  },
  {
    id: 'BR-HRBP-002',
    group: 'Portfolio & scope',
    title: 'A store is an OPERATIONS division, not a retail-store record',
    statement:
      'Employees are attached to the org tree through divisionId. The 23 OPERATIONS divisions are the stores and depots; the 19 SUPPORTING divisions are head office. Compliance and gap analysis therefore group by division, which is the only dimension every employee record actually carries.',
  },
  {
    id: 'BR-HRBP-003',
    group: 'Portfolio & scope',
    title: 'Headcount in scope excludes inactive employees',
    statement:
      'Only records with status ACTIVE count towards headcount, compliance denominators and bench strength. Leavers stay visible in history but never dilute a compliance rate.',
  },
  {
    id: 'BR-HRBP-010',
    group: 'Compliance',
    title: 'Compliant means completed — nothing else',
    statement:
      'For the three universal mandatory courses (information security, fire and occupational safety, store operations and food safety), only status COMPLETED counts as compliant. In progress, not started and overdue are all non-compliant.',
  },
  {
    id: 'BR-HRBP-011',
    group: 'Compliance',
    title: 'Never assigned is a coverage failure, reported separately',
    statement:
      'An employee with no enrollment record at all for a mandatory course is counted as 0% on that course AND raised as a coverage gap. Coverage (assigned / required) and compliance (completed / required) are reported as two different numbers, because they have two different owners: coverage is an allocation defect for User Admin, compliance is a completion defect for the line.',
  },
  {
    id: 'BR-HRBP-012',
    group: 'Compliance',
    title: 'Unit compliance thresholds',
    statement:
      'Division compliance is banded: 95% and above EXCELLENT, 88 to 94.9 MEETS_STANDARD, 70 to 87.9 WARNING_REQUIRED, below 70 CRITICAL. A division with any overdue mandatory enrollment can never be banded EXCELLENT regardless of its average.',
  },
  {
    id: 'BR-HRBP-013',
    group: 'Compliance',
    title: 'Escalation is driven by people, not by percentages',
    statement:
      'A division is escalated when it is banded CRITICAL, or when its count of employees missing at least one mandatory course exceeds 5, whichever comes first. This keeps small units with a handful of failures from hiding behind a healthy-looking average.',
  },
  {
    id: 'BR-HRBP-020',
    group: 'Competency gap',
    title: 'Required competency is set by job level',
    statement:
      'The required standard per skill domain follows the 7-level job framework: Levels 1-2 require 90, Levels 3-4 require 85, Level 5 requires 80, Levels 6-7 require 75. A gap is the actual score minus that required standard.',
  },
  {
    id: 'BR-HRBP-021',
    group: 'Competency gap',
    title: 'Actual competency comes from completed learning in that domain',
    statement:
      'A domain score is the mean credit across every domain course assigned to the employee. A completed course credits its assessment score (or the 80 pass mark when the completion carries no score). A course still in progress credits only its progress against the 70 pass mark, so half-finished learning counts as half-competence and never as full competence. A course not started credits nothing.',
  },
  {
    id: 'BR-HRBP-022',
    group: 'Competency gap',
    title: 'Gaps are escalated per unit and domain, never per person',
    statement:
      'Individual scores are aggregated to (division x skill domain) with the affected headcount attached. An HRBP raises one intervention for a unit, not one per employee, and the ticket carries how many people it will move.',
  },
  {
    id: 'BR-HRBP-023',
    group: 'Competency gap',
    title: 'Gap severity bands',
    statement:
      'A gap of -15 points or worse is CRITICAL and requires an intervention ticket. Between -5 and -15 it is MONITORING. Better than -5 is within tolerance and is not listed.',
  },
  {
    id: 'BR-HRBP-024',
    group: 'Competency gap',
    title: 'No completion means no measurement, not a gap of minus ninety',
    statement:
      'A domain in which the employee has not completed a single course carries no competency evidence. It is reported as UNMEASURED and routed to the coverage list, never scored as a catastrophic gap. Claiming a precise negative number from an empty evidence base would be inventing data, which is the defect these rules exist to remove.',
  },
  {
    id: 'BR-HRBP-030',
    group: 'Succession 70-20-10',
    title: 'Only the 10% is owned by the LMS',
    statement:
      'In the 70-20-10 model the platform can measure exactly one component: formal learning. The 10% is therefore always derived from real enrollment and curriculum data and can never be typed in. The 70% on-the-job and 20% mentoring components are captured by the HRBP in the 1-on-1 review, and are labelled as manually captured wherever they are shown.',
  },
  {
    id: 'BR-HRBP-031',
    group: 'Succession 70-20-10',
    title: 'Formal learning score',
    statement:
      'The formal component is the completion percentage of the curriculum assigned to the candidate for the target role. With no curriculum assigned the formal score is 0 and the candidate is blocked from READY_NOW, because there is no evidence of formal preparation.',
  },
  {
    id: 'BR-HRBP-032',
    group: 'Succession 70-20-10',
    title: 'Blended readiness score',
    statement:
      'The blended score weights the three components exactly as the model names them: 0.7 x on-the-job + 0.2 x mentoring + 0.1 x formal.',
  },
  {
    id: 'BR-HRBP-033',
    group: 'Succession 70-20-10',
    title: 'Readiness is derived, and gated',
    statement:
      'READY_NOW requires a blended score of 85 or more, a formal score of 80 or more, full mandatory compliance, and an alignment review recorded in the last 180 days. READY_IN_6_MONTHS requires 70 or more blended. READY_IN_1_YEAR requires 55 or more. Below that the candidate is DEVELOPING. Any failed condition is returned as a named blocker rather than silently downgrading the candidate.',
  },
  {
    id: 'BR-HRBP-034',
    group: 'Succession 70-20-10',
    title: 'A non-compliant candidate is never ready now',
    statement:
      'Mandatory training compliance is a hard gate on promotion readiness. A candidate carrying an incomplete mandatory course is capped at READY_IN_6_MONTHS however strong the rest of their profile is.',
  },
  {
    id: 'BR-HRBP-035',
    group: 'Succession 70-20-10',
    title: 'An alignment review expires after 180 days',
    statement:
      'A 1-on-1 alignment record older than 180 days no longer supports a READY_NOW verdict. The candidate stays in the pool but is flagged as needing a fresh review, because succession data decays.',
  },
  {
    id: 'BR-HRBP-040',
    group: 'Talent grid',
    title: 'Performance is measured from delivery, not opinion',
    statement:
      'Performance blends three measured signals: mandatory compliance (50%), the mean assessment score across completed courses (30%), and on-time delivery, meaning one minus the share of assigned courses that went overdue (20%). Where an employee has no scored assessment the remaining weights are renormalised rather than assuming a score.',
  },
  {
    id: 'BR-HRBP-041',
    group: 'Talent grid',
    title: 'Potential is measured from learning behaviour, and ranked against peers',
    statement:
      'Potential blends learning velocity, meaning completions per year of service (40%), breadth across distinct skill domains (30%), and stretch, meaning the share of completions at or above the employee\'s own job level (30%). These are behavioural proxies drawn from the platform and are labelled as such. The raw blend is then ranked within the portfolio, because high potential is a comparative judgement rather than an absolute one: the top 15% of the peer group band high, the next 25% band medium, the rest band low. Ranking against peers also stops an arbitrary ceiling on the raw scale from collapsing a whole workforce into a single column.',
  },
  {
    id: 'BR-HRBP-042',
    group: 'Talent grid',
    title: 'Nine-box placement',
    statement:
      'Performance is banded against an absolute standard — low below 60, medium 60 to 79, high 80 and above — because an HRBP needs to know whether someone is meeting the bar, not merely whether they beat their neighbour. Potential is banded by rank within the portfolio. The two axes produce the standard nine-box grid from Underperforming through to Star. Placement is advisory input to the HRBP conversation, never an automated decision.',
  },
  {
    id: 'BR-HRBP-050',
    group: 'Bench strength',
    title: 'Every key role needs two ready successors',
    statement:
      'Bench strength for a target role is measured against a target of two READY_NOW successors. Coverage is the count of ready successors divided by that target.',
  },
  {
    id: 'BR-HRBP-051',
    group: 'Bench strength',
    title: 'Single point of failure',
    statement:
      'A target role with no candidate at all in the pool is flagged SINGLE_POINT_OF_FAILURE. A role with candidates but none ready now is flagged AT_RISK. Both are escalated to the HR leadership review.',
  },
  {
    id: 'BR-HRBP-052',
    group: 'Bench strength',
    title: 'Concentration risk on mentors',
    statement:
      'When one mentor carries more than three succession candidates the pipeline is flagged for mentor concentration, because the development plan then depends on a single person\'s availability.',
  },
  {
    id: 'BR-HRBP-060',
    group: 'Intervention SLA',
    title: 'Urgency sets the response deadline',
    statement:
      'An L&D intervention ticket is due within 7 calendar days when raised HIGH, 14 days when MEDIUM and 30 days when LOW, counted from the date it was submitted.',
  },
  {
    id: 'BR-HRBP-061',
    group: 'Intervention SLA',
    title: 'Ticket SLA states',
    statement:
      'A ticket is ON_TRACK until 3 days before its due date, DUE_SOON inside that window, and BREACHED once the due date passes without the ticket being scheduled or completed. Scheduled and completed tickets stop ageing.',
  },
  {
    id: 'BR-HRBP-062',
    group: 'Intervention SLA',
    title: 'Breach escalates to L&D leadership',
    statement:
      'A HIGH urgency ticket that breaches its SLA is escalated to the L&D Director. The HRBP raises the gap; the platform tracks whether L&D acted on it, which is what makes the ticket an accountability record rather than a note.',
  },
];

export const HRBP_RULE_GROUPS = [
  'Portfolio & scope',
  'Compliance',
  'Competency gap',
  'Succession 70-20-10',
  'Talent grid',
  'Bench strength',
  'Intervention SLA',
];

/** Look a rule up by id, for inline citations in the UI. */
export function hrbpRule(id) {
  return HRBP_RULES.find((r) => r.id === id) || null;
}

// ---------------------------------------------------------------------------
// BR-HRBP-001 / 002 / 003 — Portfolio resolution
// ---------------------------------------------------------------------------

export const PORTFOLIO_MODE = {
  OPERATIONS: 'OPERATIONS',
  SUPPORTING: 'SUPPORTING',
  COMPANY: 'COMPANY',
};

/** The 23 OPERATIONS divisions — these are the stores and depots (BR-HRBP-002). */
export function operationsDivisions() {
  return divisions.filter((d) => d.branch === 'OPERATIONS');
}

/** The 19 SUPPORTING divisions — head office. */
export function supportingDivisions() {
  return divisions.filter((d) => d.branch === 'SUPPORTING');
}

/**
 * Resolves which org units an HRBP is accountable for.
 * BR-HRBP-001: the portfolio comes from the HRBP record, and the default for a
 * People Partnering HRBP is the OPERATIONS branch (the stores), because that is
 * where the mandatory-training population sits.
 */
export function resolveHrbpPortfolio(hrbpUserRecord = {}, mode = PORTFOLIO_MODE.OPERATIONS) {
  if (mode === PORTFOLIO_MODE.COMPANY) {
    return {
      mode,
      label: 'Company-wide (all 42 divisions)',
      branch: null,
      divisions: divisions.slice(),
      divisionIds: divisions.map((d) => d.id),
    };
  }
  const branch = mode === PORTFOLIO_MODE.SUPPORTING ? 'SUPPORTING' : 'OPERATIONS';
  const list = divisions.filter((d) => d.branch === branch);
  return {
    mode,
    branch,
    label:
      branch === 'OPERATIONS'
        ? `Store Operations — ${list.length} stores & depots`
        : `Head Office — ${list.length} support divisions`,
    partneredBy: hrbpUserRecord.fullName || null,
    divisions: list,
    divisionIds: list.map((d) => d.id),
  };
}

/** BR-HRBP-003: active employees attached to a division inside the portfolio. */
export function usersInPortfolio(users = [], portfolio) {
  if (!portfolio) return [];
  const ids = new Set(portfolio.divisionIds);
  return (users || []).filter(
    (u) => u && u.status !== 'INACTIVE' && u.status !== 'TERMINATED' && ids.has(u.divisionId)
  );
}

// ---------------------------------------------------------------------------
// BR-HRBP-010 / 011 — Per-employee mandatory compliance
// ---------------------------------------------------------------------------

export const MANDATORY_COURSE_IDS = UNIVERSAL_COMPLIANCE_COURSE_IDS;

export const MANDATORY_COURSE_LABELS = {
  'CRS-ISA-011': 'Information Security',
  'CRS-HSE-019': 'Fire & Occupational Safety',
  'CRS-STOPS-037': 'Store Operations & Food Safety',
};

/**
 * Compliance record for one employee.
 * BR-HRBP-010: only COMPLETED counts.
 * BR-HRBP-011: a missing enrollment is NOT_ASSIGNED — a coverage gap, scored 0.
 */
export function complianceForUser(user, userEnrollments = {}, mandatoryIds = MANDATORY_COURSE_IDS) {
  const lines = mandatoryIds.map((courseId) => {
    const enr = userEnrollments[courseId];
    if (!enr) {
      return { courseId, label: MANDATORY_COURSE_LABELS[courseId] || courseId, state: 'NOT_ASSIGNED', compliant: false, assigned: false };
    }
    const state = enr.status || 'NOT_STARTED';
    return {
      courseId,
      label: MANDATORY_COURSE_LABELS[courseId] || courseId,
      state,
      compliant: state === 'COMPLETED',
      assigned: true,
      overdue: state === 'OVERDUE',
    };
  });

  const required = lines.length;
  const assigned = lines.filter((l) => l.assigned).length;
  const completed = lines.filter((l) => l.compliant).length;
  const overdue = lines.filter((l) => l.overdue).length;

  return {
    userId: user?.userId,
    lines,
    required,
    assigned,
    completed,
    overdue,
    notAssigned: required - assigned,
    compliancePercent: required === 0 ? 100 : Math.round((completed / required) * 100),
    coveragePercent: required === 0 ? 100 : Math.round((assigned / required) * 100),
    fullyCompliant: completed === required,
  };
}

// ---------------------------------------------------------------------------
// BR-HRBP-012 / 013 — Compliance rolled up per division
// ---------------------------------------------------------------------------

export function bandCompliance(percent, hasOverdue) {
  if (percent < 70) return 'CRITICAL';
  if (percent < 88) return 'WARNING_REQUIRED';
  // BR-HRBP-012: any overdue mandatory enrollment blocks the EXCELLENT band.
  if (percent >= 95 && !hasOverdue) return 'EXCELLENT_STANDARD';
  return 'MEETS_STANDARD';
}

export const COMPLIANCE_BAND_LABELS = {
  EXCELLENT_STANDARD: 'Excellent',
  MEETS_STANDARD: 'Meets standard',
  WARNING_REQUIRED: 'Warning',
  CRITICAL: 'Critical',
};

/**
 * Compliance for every division in the portfolio, computed from real enrollments.
 * Divisions with no headcount are returned with headcount 0 and are excluded from
 * the portfolio average — an empty unit is not a 100% unit and not a 0% unit.
 */
export function complianceByDivision(users = [], enrollments = {}, portfolio) {
  const scoped = usersInPortfolio(users, portfolio);
  const byDivision = new Map();

  (portfolio?.divisions || []).forEach((div) => {
    byDivision.set(div.id, {
      id: div.id,
      code: div.code,
      name: div.name,
      location: div.location,
      costCenter: div.costCenter,
      branch: div.branch,
      headcount: 0,
      fullyCompliant: 0,
      notAssignedPeople: 0,
      overduePeople: 0,
      nonCompliantPeople: 0,
      perCourse: {},
      _complianceSum: 0,
      _coverageSum: 0,
      _hasOverdue: false,
    });
  });

  scoped.forEach((u) => {
    const bucket = byDivision.get(u.divisionId);
    if (!bucket) return;
    const rec = complianceForUser(u, enrollments[u.userId] || {});
    bucket.headcount += 1;
    bucket._complianceSum += rec.compliancePercent;
    bucket._coverageSum += rec.coveragePercent;
    if (rec.fullyCompliant) bucket.fullyCompliant += 1;
    else bucket.nonCompliantPeople += 1;
    if (rec.notAssigned > 0) bucket.notAssignedPeople += 1;
    if (rec.overdue > 0) {
      bucket.overduePeople += 1;
      bucket._hasOverdue = true;
    }
    rec.lines.forEach((line) => {
      const slot = bucket.perCourse[line.courseId] || { completed: 0, assigned: 0, total: 0 };
      slot.total += 1;
      if (line.assigned) slot.assigned += 1;
      if (line.compliant) slot.completed += 1;
      bucket.perCourse[line.courseId] = slot;
    });
  });

  return Array.from(byDivision.values()).map((b) => {
    const compliancePercent = b.headcount > 0 ? Number((b._complianceSum / b.headcount).toFixed(1)) : 0;
    const coveragePercent = b.headcount > 0 ? Number((b._coverageSum / b.headcount).toFixed(1)) : 0;
    const band = b.headcount > 0 ? bandCompliance(compliancePercent, b._hasOverdue) : 'NO_HEADCOUNT';
    // BR-HRBP-013 — escalate on people, not on the average.
    const escalate = b.headcount > 0 && (band === 'CRITICAL' || b.nonCompliantPeople > 5);
    const { _complianceSum, _coverageSum, _hasOverdue, ...rest } = b;
    return { ...rest, compliancePercent, coveragePercent, band, escalate };
  });
}

/** Portfolio-wide compliance: headcount-weighted, empty divisions excluded. */
export function portfolioComplianceRate(users = [], enrollments = {}, portfolio) {
  const scoped = usersInPortfolio(users, portfolio);
  if (scoped.length === 0) return { compliancePercent: 0, coveragePercent: 0, headcount: 0, nonCompliantPeople: 0, notAssignedPeople: 0 };

  let complianceSum = 0;
  let coverageSum = 0;
  let nonCompliantPeople = 0;
  let notAssignedPeople = 0;

  scoped.forEach((u) => {
    const rec = complianceForUser(u, enrollments[u.userId] || {});
    complianceSum += rec.compliancePercent;
    coverageSum += rec.coveragePercent;
    if (!rec.fullyCompliant) nonCompliantPeople += 1;
    if (rec.notAssigned > 0) notAssignedPeople += 1;
  });

  return {
    headcount: scoped.length,
    compliancePercent: Number((complianceSum / scoped.length).toFixed(1)),
    coveragePercent: Number((coverageSum / scoped.length).toFixed(1)),
    nonCompliantPeople,
    notAssignedPeople,
  };
}

// ---------------------------------------------------------------------------
// BR-HRBP-020 → 023 — Competency gap
// ---------------------------------------------------------------------------

/** Skill domains, mapped onto the course code families already in the catalogue. */
export const SKILL_DOMAINS = [
  { id: 'FOOD_SAFETY', label: 'Food Safety & HACCP', codes: ['FSH'], anchorCourseId: 'CRS-FSH-001' },
  { id: 'SAFETY', label: 'Fire & Occupational Safety', codes: ['HSE'], anchorCourseId: 'CRS-HSE-019' },
  { id: 'INFO_SECURITY', label: 'Information Security', codes: ['ISA'], anchorCourseId: 'CRS-ISA-011' },
  { id: 'STORE_OPS', label: 'Store Operations & POS', codes: ['STOPS'], anchorCourseId: 'CRS-STOPS-037' },
  { id: 'SUPPLY_CHAIN', label: 'Supply Chain & Cold Chain', codes: ['SCM', 'COLD'], anchorCourseId: null },
  { id: 'LEADERSHIP', label: 'Leadership & Management', codes: ['LEAD'], anchorCourseId: null },
  { id: 'SERVICE', label: 'Customer Service', codes: ['CSERV'], anchorCourseId: null },
];

/** BR-HRBP-020: required standard follows the 7-level job framework. */
export function requiredStandardForLevel(level) {
  // The scale is inverted: Level 1 is the top of the house, Level 7 the front line.
  const v = levelValue(level);
  if (v <= 2) return 90; // Levels 1-2
  if (v <= 4) return 85; // Levels 3-4
  if (v === 5) return 80; // Level 5
  return 75; // Levels 6-7
}

function domainOfCourse(course) {
  const code = course?.code || '';
  const family = String(code).split('-')[0].replace(/[0-9]/g, '');
  return SKILL_DOMAINS.find((d) => d.codes.includes(family)) || null;
}

/**
 * BR-HRBP-021: a domain score is the mean score of completed domain courses,
 * scaled by how many of the assigned domain courses were actually finished.
 * Returns null for a domain the employee was never assigned — no assignment
 * means no evidence, and no evidence must not be scored as a gap.
 */
export const DOMAIN_PASS_MARK = 70;
export const DOMAIN_UNSCORED_COMPLETION_CREDIT = 80;

export function skillDomainProfile(user, userEnrollments = {}, courses = []) {
  const byDomain = {};

  Object.values(userEnrollments || {}).forEach((enr) => {
    const course = (courses || []).find((c) => c.id === enr.courseId);
    if (!course) return;
    const domain = domainOfCourse(course);
    if (!domain) return;
    const slot = byDomain[domain.id] || { assigned: 0, completed: 0, creditSum: 0, scoreSum: 0, scored: 0, overdue: 0 };
    slot.assigned += 1;

    // BR-HRBP-021 — credit per course, never a flat assumption.
    if (enr.status === 'COMPLETED') {
      slot.completed += 1;
      const credit = typeof enr.score === 'number' ? enr.score : DOMAIN_UNSCORED_COMPLETION_CREDIT;
      slot.creditSum += credit;
      if (typeof enr.score === 'number') {
        slot.scoreSum += enr.score;
        slot.scored += 1;
      }
    } else if (enr.status === 'NOT_STARTED') {
      slot.creditSum += 0;
    } else {
      // In progress or overdue: partial credit against the pass mark only.
      const pct = Math.max(0, Math.min(Number(enr.progressPercent) || 0, 100));
      slot.creditSum += (pct / 100) * DOMAIN_PASS_MARK;
    }

    if (enr.status === 'OVERDUE') slot.overdue += 1;
    byDomain[domain.id] = slot;
  });

  const required = requiredStandardForLevel(user?.level);

  return SKILL_DOMAINS.map((domain) => {
    const slot = byDomain[domain.id];
    if (!slot || slot.assigned === 0) {
      return { domainId: domain.id, label: domain.label, assigned: 0, completed: 0, actual: null, required, gap: null, severity: 'NOT_ASSIGNED' };
    }
    // BR-HRBP-024 — no completion means no measurement.
    if (slot.completed === 0) {
      return {
        domainId: domain.id,
        label: domain.label,
        assigned: slot.assigned,
        completed: 0,
        overdue: slot.overdue,
        inProgressCredit: Math.round(slot.creditSum / slot.assigned),
        actual: null,
        required,
        gap: null,
        severity: 'UNMEASURED',
      };
    }
    const actual = Math.round(slot.creditSum / slot.assigned);
    const gap = actual - required;
    let severity = 'WITHIN_TOLERANCE';
    if (gap <= -15) severity = 'CRITICAL_GAP';
    else if (gap <= -5) severity = 'GAP_IDENTIFIED';
    return {
      domainId: domain.id,
      label: domain.label,
      assigned: slot.assigned,
      completed: slot.completed,
      overdue: slot.overdue,
      meanScore: slot.scored > 0 ? Math.round(slot.scoreSum / slot.scored) : null,
      actual,
      required,
      gap,
      severity,
    };
  });
}

/**
 * BR-HRBP-022: aggregate individual domain scores to (division x domain) with the
 * affected headcount, which is the unit an HRBP actually raises a ticket on.
 */
export function skillGapByUnit(users = [], enrollments = {}, courses = [], portfolio) {
  const scoped = usersInPortfolio(users, portfolio);
  const cells = new Map();

  scoped.forEach((u) => {
    const profile = skillDomainProfile(u, enrollments[u.userId] || {}, courses);
    profile.forEach((row) => {
      // BR-HRBP-024 — an unmeasured domain is a coverage finding, not a gap cell.
      if (row.severity === 'NOT_ASSIGNED' || row.severity === 'UNMEASURED') return;
      const key = `${u.divisionId}::${row.domainId}`;
      const cell = cells.get(key) || {
        divisionId: u.divisionId,
        divisionCode: u.divisionCode,
        divisionName: u.divisionName,
        domainId: row.domainId,
        domainLabel: row.label,
        headcount: 0,
        affected: 0,
        critical: 0,
        _actualSum: 0,
        _requiredSum: 0,
      };
      cell.headcount += 1;
      cell._actualSum += row.actual;
      cell._requiredSum += row.required;
      if (row.severity !== 'WITHIN_TOLERANCE') cell.affected += 1;
      if (row.severity === 'CRITICAL_GAP') cell.critical += 1;
      cells.set(key, cell);
    });
  });

  const domainMeta = SKILL_DOMAINS.reduce((acc, d) => { acc[d.id] = d; return acc; }, {});

  return Array.from(cells.values())
    .map((c) => {
      const actual = Math.round(c._actualSum / c.headcount);
      const required = Math.round(c._requiredSum / c.headcount);
      const gap = actual - required;
      // BR-HRBP-023
      let severity = 'WITHIN_TOLERANCE';
      if (gap <= -15) severity = 'CRITICAL_GAP';
      else if (gap <= -5) severity = 'GAP_IDENTIFIED';
      const { _actualSum, _requiredSum, ...rest } = c;
      return {
        ...rest,
        actual,
        required,
        gap,
        severity,
        anchorCourseId: domainMeta[c.domainId]?.anchorCourseId || null,
        affectedPercent: Math.round((c.affected / c.headcount) * 100),
      };
    })
    .filter((c) => c.severity !== 'WITHIN_TOLERANCE')
    .sort((a, b) => a.gap - b.gap || b.affected - a.affected);
}

/**
 * BR-HRBP-024 — domains where the portfolio holds assigned learning but no
 * completion at all. These are handed to L&D as a coverage problem: the courses
 * were allocated, nobody finished one, so there is nothing to measure yet.
 */
export function unmeasuredDomainsByUnit(users = [], enrollments = {}, courses = [], portfolio) {
  const scoped = usersInPortfolio(users, portfolio);
  const cells = new Map();

  scoped.forEach((u) => {
    const profile = skillDomainProfile(u, enrollments[u.userId] || {}, courses);
    profile.forEach((row) => {
      if (row.severity !== 'UNMEASURED') return;
      const key = `${u.divisionId}::${row.domainId}`;
      const cell = cells.get(key) || {
        divisionId: u.divisionId,
        divisionCode: u.divisionCode,
        divisionName: u.divisionName,
        domainId: row.domainId,
        domainLabel: row.label,
        people: 0,
        assignedCourses: 0,
        overdue: 0,
      };
      cell.people += 1;
      cell.assignedCourses += row.assigned;
      cell.overdue += row.overdue || 0;
      cells.set(key, cell);
    });
  });

  return Array.from(cells.values()).sort((a, b) => b.people - a.people || b.overdue - a.overdue);
}

// ---------------------------------------------------------------------------
// BR-HRBP-030 → 035 — Succession, 70-20-10 and readiness
// ---------------------------------------------------------------------------

export const READINESS_ORDER = ['DEVELOPING', 'READY_IN_1_YEAR', 'READY_IN_6_MONTHS', 'READY_NOW'];

export const READINESS_LABELS = {
  READY_NOW: 'Ready Now',
  READY_IN_6_MONTHS: 'Ready in 6 Months',
  READY_IN_1_YEAR: 'Ready in 1-2 Years',
  DEVELOPING: 'Developing',
};

/**
 * BR-HRBP-031: the formal (10%) component, derived from the curriculum actually
 * assigned to the candidate. No curriculum assigned means no formal evidence.
 */
export function formalLearningScore(talent, { curricula = [], users = [], enrollments = {}, courses = [], curriculumProgressFn } = {}) {
  if (!talent?.curriculumId) return { score: 0, reason: 'NO_CURRICULUM_ASSIGNED', curriculumTitle: null };
  const curriculum = (curricula || []).find((c) => c.id === talent.curriculumId);
  if (!curriculum) return { score: 0, reason: 'CURRICULUM_NOT_FOUND', curriculumTitle: null };

  const candidate =
    (users || []).find((u) => u.userId === talent.userId || u.employeeCode === talent.id) ||
    { userId: talent.userId || talent.id, level: '6' };

  if (typeof curriculumProgressFn === 'function') {
    const progress = curriculumProgressFn(curriculum, candidate, enrollments[candidate.userId] || {}, courses);
    return { score: Math.round(progress?.progressPercent || 0), reason: 'DERIVED_FROM_CURRICULUM', curriculumTitle: curriculum.title };
  }

  // Fallback: straight completion ratio over the curriculum's course list.
  const ids = curriculum.courseIds || [];
  if (ids.length === 0) return { score: 0, reason: 'CURRICULUM_EMPTY', curriculumTitle: curriculum.title };
  const userEnr = enrollments[candidate.userId] || {};
  const done = ids.filter((id) => userEnr[id]?.status === 'COMPLETED').length;
  return { score: Math.round((done / ids.length) * 100), reason: 'DERIVED_FROM_CURRICULUM', curriculumTitle: curriculum.title };
}

/** BR-HRBP-032 — the 70-20-10 weighting, applied literally. */
export function blendedReadinessScore({ ojt70 = 0, mentoring20 = 0, formal10 = 0 }) {
  return Math.round(0.7 * ojt70 + 0.2 * mentoring20 + 0.1 * formal10);
}

function daysBetween(fromIso, toDate) {
  const from = new Date(fromIso);
  if (Number.isNaN(from.getTime())) return null;
  return Math.floor((toDate.getTime() - from.getTime()) / 86400000);
}

/**
 * BR-HRBP-033/034/035 — derive readiness and return every blocker by name.
 * The caller keeps the HRBP's stored readiness for reference; this returns what
 * the rules say it should be, plus why.
 */
export function deriveReadiness(talent, ctx = {}) {
  const {
    formalScore = 0,
    compliance = null,
    alignments = [],
    today = new Date(),
  } = ctx;

  const ojt70 = Number(talent?.ojt70 ?? 0);
  const mentoring20 = Number(talent?.mentoring20 ?? 0);
  const blended = blendedReadinessScore({ ojt70, mentoring20, formal10: formalScore });

  const latestAlignment = (alignments || [])
    .filter((a) => a.candidateId === talent?.id || a.candidateName === talent?.name)
    .map((a) => a.updatedAt)
    .filter(Boolean)
    .sort()
    .pop();
  const alignmentAgeDays = latestAlignment ? daysBetween(latestAlignment, today) : null;
  const alignmentFresh = alignmentAgeDays !== null && alignmentAgeDays <= 180;

  const blockers = [];
  if (blended < 85) blockers.push({ code: 'BLENDED_BELOW_85', rule: 'BR-HRBP-033', label: `Blended 70-20-10 score is ${blended}, below the 85 required for Ready Now` });
  if (formalScore < 80) blockers.push({ code: 'FORMAL_BELOW_80', rule: 'BR-HRBP-031', label: `Formal learning is ${formalScore}%, below the 80% required` });
  if (compliance && !compliance.fullyCompliant) {
    blockers.push({
      code: 'MANDATORY_INCOMPLETE',
      rule: 'BR-HRBP-034',
      label: `${compliance.required - compliance.completed} of ${compliance.required} mandatory courses outstanding`,
    });
  }
  if (!alignmentFresh) {
    blockers.push({
      code: 'ALIGNMENT_STALE',
      rule: 'BR-HRBP-035',
      label: latestAlignment
        ? `Last 1-on-1 alignment was ${alignmentAgeDays} days ago, past the 180-day validity`
        : 'No 1-on-1 alignment review on record',
    });
  }

  let readiness;
  if (blockers.length === 0) readiness = 'READY_NOW';
  else if (blended >= 70) readiness = 'READY_IN_6_MONTHS';
  else if (blended >= 55) readiness = 'READY_IN_1_YEAR';
  else readiness = 'DEVELOPING';

  // BR-HRBP-034 — hard cap for a non-compliant candidate.
  const complianceBlocked = compliance && !compliance.fullyCompliant;
  if (complianceBlocked && READINESS_ORDER.indexOf(readiness) > READINESS_ORDER.indexOf('READY_IN_6_MONTHS')) {
    readiness = 'READY_IN_6_MONTHS';
  }

  return {
    readiness,
    label: READINESS_LABELS[readiness],
    blended,
    ojt70,
    mentoring20,
    formal10: formalScore,
    blockers,
    alignmentAgeDays,
    alignmentFresh,
    storedReadiness: talent?.readiness || null,
    divergesFromStored: !!talent?.readiness && talent.readiness !== readiness,
  };
}

// ---------------------------------------------------------------------------
// BR-HRBP-040 → 042 — Nine-box talent grid
// ---------------------------------------------------------------------------

export const NINE_BOX = {
  '3-3': { key: 'STAR', label: 'Star', tone: 'sage' },
  '3-2': { key: 'HIGH_PERFORMER', label: 'High Performer', tone: 'sage' },
  '3-1': { key: 'SPECIALIST', label: 'Trusted Specialist', tone: 'blue' },
  '2-3': { key: 'HIGH_POTENTIAL', label: 'High Potential', tone: 'sage' },
  '2-2': { key: 'CORE', label: 'Core Player', tone: 'blue' },
  '2-1': { key: 'SOLID', label: 'Solid Contributor', tone: 'slate' },
  '1-3': { key: 'ENIGMA', label: 'Enigma', tone: 'amber' },
  '1-2': { key: 'INCONSISTENT', label: 'Inconsistent', tone: 'amber' },
  '1-1': { key: 'RISK', label: 'Underperforming', tone: 'rust' },
};

function band3(score) {
  if (score >= 80) return 3;
  if (score >= 60) return 2;
  return 1;
}

/** BR-HRBP-040 — performance from measured delivery. */
export function performanceScore(user, userEnrollments = {}) {
  const enrs = Object.values(userEnrollments || {});
  const compliance = complianceForUser(user, userEnrollments);

  const completed = enrs.filter((e) => e.status === 'COMPLETED');
  const scored = completed.filter((e) => typeof e.score === 'number');
  const assigned = enrs.length;
  const overdue = enrs.filter((e) => e.status === 'OVERDUE').length;

  const parts = [{ weight: 0.5, value: compliance.compliancePercent }];
  if (scored.length > 0) {
    parts.push({ weight: 0.3, value: scored.reduce((a, e) => a + e.score, 0) / scored.length });
  }
  if (assigned > 0) {
    parts.push({ weight: 0.2, value: (1 - overdue / assigned) * 100 });
  }

  const totalWeight = parts.reduce((a, p) => a + p.weight, 0);
  const score = totalWeight === 0 ? 0 : Math.round(parts.reduce((a, p) => a + p.weight * p.value, 0) / totalWeight);
  return { score, compliancePercent: compliance.compliancePercent, meanScore: scored.length ? Math.round(scored.reduce((a, e) => a + e.score, 0) / scored.length) : null, overdue, assigned };
}

/** BR-HRBP-041 — potential from learning behaviour. */
export function potentialScore(user, userEnrollments = {}, courses = []) {
  const enrs = Object.values(userEnrollments || {});
  const completed = enrs.filter((e) => e.status === 'COMPLETED');
  const years = Math.max(Number(user?.yearsOfService) || 1, 1);

  // Velocity — completions per year, 6 per year treated as the top of the scale.
  const velocity = Math.min((completed.length / years) / 6, 1) * 100;

  // Breadth — distinct skill domains touched, all 7 treated as the top of the scale.
  const domains = new Set();
  completed.forEach((e) => {
    const course = (courses || []).find((c) => c.id === e.courseId);
    const domain = course ? domainOfCourse(course) : null;
    if (domain) domains.add(domain.id);
  });
  const breadth = Math.min(domains.size / SKILL_DOMAINS.length, 1) * 100;

  // Stretch — completions at or above the employee's own job level.
  const userLevelValue = levelValue(user?.level);
  let stretchCount = 0;
  completed.forEach((e) => {
    const course = (courses || []).find((c) => c.id === e.courseId);
    if (!course) return;
    // Inverted scale: a course at or above the employee's grade has the lower number.
    if (levelValue(course.targetLevel) <= userLevelValue) stretchCount += 1;
  });
  const stretch = completed.length > 0 ? (stretchCount / completed.length) * 100 : 0;

  const score = Math.round(0.4 * velocity + 0.3 * breadth + 0.3 * stretch);
  return { score, velocity: Math.round(velocity), breadth: Math.round(breadth), stretch: Math.round(stretch), completedCount: completed.length, domainCount: domains.size };
}

/** Share of the peer group that bands high / medium on potential (BR-HRBP-041). */
export const POTENTIAL_HIGH_SHARE = 0.15;
export const POTENTIAL_MEDIUM_SHARE = 0.25;

/**
 * BR-HRBP-041 — the two potential cut-offs for a peer group, by rank.
 * Returns the raw-score thresholds { high, medium }. A group too small to rank
 * meaningfully falls back to the absolute 80 / 60 bands.
 */
export function potentialThresholds(scores = []) {
  const sorted = scores.filter((n) => typeof n === 'number').sort((a, b) => b - a);
  if (sorted.length < 5) return { high: 80, medium: 60 };
  const highIdx = Math.max(0, Math.floor(sorted.length * POTENTIAL_HIGH_SHARE) - 1);
  const medIdx = Math.max(0, Math.floor(sorted.length * (POTENTIAL_HIGH_SHARE + POTENTIAL_MEDIUM_SHARE)) - 1);
  return { high: sorted[highIdx], medium: sorted[medIdx] };
}

function bandPotential(score, thresholds) {
  if (!thresholds) return band3(score);
  if (score >= thresholds.high) return 3;
  if (score >= thresholds.medium) return 2;
  return 1;
}

/**
 * BR-HRBP-042 — nine-box placement for one employee.
 * `potentialCuts` comes from potentialThresholds() over the whole portfolio; without
 * it the potential axis falls back to the absolute bands.
 */
export function ninePlacement(user, userEnrollments = {}, courses = [], potentialCuts = null) {
  const perf = performanceScore(user, userEnrollments);
  const pot = potentialScore(user, userEnrollments, courses);
  const pBand = band3(perf.score);
  const potBand = bandPotential(pot.score, potentialCuts);
  const box = NINE_BOX[`${pBand}-${potBand}`] || NINE_BOX['2-2'];
  return { performance: perf, potential: pot, performanceBand: pBand, potentialBand: potBand, box };
}

/** Places a whole portfolio on the grid, ranking potential within that portfolio. */
export function ninePlacementsForPortfolio(users = [], enrollments = {}, courses = []) {
  const raw = (users || []).map((u) => ({
    user: u,
    performance: performanceScore(u, enrollments[u.userId] || {}),
    potential: potentialScore(u, enrollments[u.userId] || {}, courses),
  }));
  const cuts = potentialThresholds(raw.map((r) => r.potential.score));
  return raw.map((r) => {
    const performanceBand = band3(r.performance.score);
    const potentialBand = bandPotential(r.potential.score, cuts);
    return {
      user: r.user,
      placement: {
        performance: r.performance,
        potential: r.potential,
        performanceBand,
        potentialBand,
        box: NINE_BOX[`${performanceBand}-${potentialBand}`] || NINE_BOX['2-2'],
      },
    };
  });
}

// ---------------------------------------------------------------------------
// BR-HRBP-050 → 052 — Bench strength
// ---------------------------------------------------------------------------

export const READY_SUCCESSOR_TARGET = 2;

/**
 * Bench strength per target role, using the derived readiness rather than the
 * stored one, so the coverage number obeys the same gates as the pipeline.
 */
export function benchStrength(talents = [], derivedByTalentId = {}) {
  const byRole = new Map();

  (talents || []).forEach((t) => {
    const role = t.targetRole || 'Unassigned target role';
    const bucket = byRole.get(role) || { targetRole: role, candidates: [], readyNow: 0, mentors: new Set() };
    const derived = derivedByTalentId[t.id];
    bucket.candidates.push({ ...t, derived });
    if ((derived?.readiness || t.readiness) === 'READY_NOW') bucket.readyNow += 1;
    if (t.mentor) bucket.mentors.add(t.mentor);
    byRole.set(role, bucket);
  });

  return Array.from(byRole.values()).map((b) => {
    const coverage = Math.round((b.readyNow / READY_SUCCESSOR_TARGET) * 100);
    let risk = 'COVERED';
    if (b.candidates.length === 0) risk = 'SINGLE_POINT_OF_FAILURE';
    else if (b.readyNow === 0) risk = 'AT_RISK';
    else if (b.readyNow < READY_SUCCESSOR_TARGET) risk = 'THIN';
    return {
      targetRole: b.targetRole,
      candidateCount: b.candidates.length,
      readyNow: b.readyNow,
      coverage: Math.min(coverage, 100),
      risk,
      candidates: b.candidates,
      mentors: Array.from(b.mentors),
    };
  }).sort((a, b) => a.readyNow - b.readyNow || b.candidateCount - a.candidateCount);
}

/** BR-HRBP-052 — a mentor carrying more than three candidates is a concentration risk. */
export function mentorConcentration(talents = [], threshold = 3) {
  const counts = new Map();
  (talents || []).forEach((t) => {
    if (!t.mentor) return;
    counts.set(t.mentor, (counts.get(t.mentor) || 0) + 1);
  });
  return Array.from(counts.entries())
    .filter(([, n]) => n > threshold)
    .map(([mentor, count]) => ({ mentor, count }))
    .sort((a, b) => b.count - a.count);
}

// ---------------------------------------------------------------------------
// BR-HRBP-060 → 062 — Intervention ticket SLA
// ---------------------------------------------------------------------------

export const SLA_DAYS_BY_URGENCY = { HIGH: 7, MEDIUM: 14, LOW: 30 };
export const SLA_DUE_SOON_WINDOW_DAYS = 3;

function addDays(iso, days) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  d.setDate(d.getDate() + days);
  return d;
}

function isoDate(d) {
  return d ? d.toISOString().slice(0, 10) : null;
}

/**
 * BR-HRBP-060/061/062 — the SLA state of one intervention ticket.
 * Scheduled and completed tickets stop ageing; cancelled tickets are closed.
 */
export function interventionSla(ticket, today = new Date()) {
  const slaDays = SLA_DAYS_BY_URGENCY[ticket?.urgency] ?? SLA_DAYS_BY_URGENCY.MEDIUM;
  const dueDate = ticket?.requestedAt ? addDays(ticket.requestedAt, slaDays) : null;
  const ageDays = ticket?.requestedAt ? daysBetween(ticket.requestedAt, today) : null;
  const settled = ticket?.status === 'SCHEDULED' || ticket?.status === 'COMPLETED' || ticket?.status === 'CANCELLED';

  let state = 'ON_TRACK';
  let daysRemaining = null;
  if (dueDate) {
    daysRemaining = Math.ceil((dueDate.getTime() - today.getTime()) / 86400000);
    if (settled) state = ticket.status === 'CANCELLED' ? 'CLOSED' : 'SETTLED';
    else if (daysRemaining < 0) state = 'BREACHED';
    else if (daysRemaining <= SLA_DUE_SOON_WINDOW_DAYS) state = 'DUE_SOON';
  } else if (settled) {
    state = ticket?.status === 'CANCELLED' ? 'CLOSED' : 'SETTLED';
  }

  // BR-HRBP-062 — a breached HIGH ticket escalates to the L&D Director.
  const escalated = state === 'BREACHED' && ticket?.urgency === 'HIGH';

  return { slaDays, dueDate: isoDate(dueDate), ageDays, daysRemaining, state, escalated };
}

export const SLA_STATE_LABELS = {
  ON_TRACK: 'On track',
  DUE_SOON: 'Due soon',
  BREACHED: 'SLA breached',
  SETTLED: 'Settled',
  CLOSED: 'Closed',
};
