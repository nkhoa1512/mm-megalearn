// ===========================================================================
// ENTERPRISE REPORT ANALYTICS
//
// The compliance league table and the competency heatmap are derived here from
// the real employee roster and the real enrollment matrix — the same records the
// manager and learner screens read — rather than from hand-authored figures.
//
// Every number therefore moves when the underlying data moves, which is the
// whole point of these two reports: they are the evidence an auditor asks for.
// ===========================================================================

import { UNIVERSAL_COMPLIANCE_COURSE_IDS } from '../data/generated100Data';

const AUDIT_READY_THRESHOLD = 90;
const NEEDS_ATTENTION_THRESHOLD = 75;

function isActive(user) {
  return !user || (user.status !== 'INACTIVE' && user.status !== 'TERMINATED');
}

function round1(n) {
  return Math.round(n * 10) / 10;
}

/**
 * How far along one employee is on a set of courses, 0-100.
 * A recorded score is the truest signal of attainment; where a course has been
 * worked but never scored, progress stands in for it.
 */
function attainmentOf(enrollment) {
  if (typeof enrollment.score === 'number') return enrollment.score;
  return Number(enrollment.progressPercent) || 0;
}

/**
 * Mandatory-compliance standing per division.
 *
 * Two different measures, because they answer two different questions:
 *  - `completionRate` counts mandatory COURSE assignments completed. This is what
 *    ranks the table, because it is the measure that actually discriminates
 *    between divisions while the programme is still running.
 *  - `fullyCompliantCount` counts PEOPLE who have finished every mandatory
 *    course. That is the strict audit measure, and it stays visible beside the
 *    rate so a division cannot look healthy on averages while no individual is
 *    actually clear. A course never assigned counts against the employee.
 */
export function buildComplianceLeague(users = [], enrollmentsByUser = {}) {
  const byDivision = new Map();

  users.filter(isActive).forEach((user) => {
    const key = user.divisionCode || user.divisionId || 'UNASSIGNED';
    if (!byDivision.has(key)) {
      byDivision.set(key, {
        code: key,
        name: user.divisionName || key,
        headcount: 0,
        fullyCompliantCount: 0,
        inProgressCount: 0,
        overdueCount: 0,
        coursesRequired: 0,
        coursesCompleted: 0,
        scores: [],
        lead: null,
        leadLevel: Number.POSITIVE_INFINITY,
      });
    }
    const div = byDivision.get(key);
    div.headcount += 1;

    // The most senior employee on the roster stands as the division lead —
    // derived, rather than a name typed into the report.
    const level = Number(user.level);
    if (Number.isFinite(level) && level < div.leadLevel) {
      div.leadLevel = level;
      div.lead = user.fullName;
    }

    const enrollments = enrollmentsByUser[user.userId] || {};
    let completedAll = true;
    let anyOverdue = false;

    UNIVERSAL_COMPLIANCE_COURSE_IDS.forEach((courseId) => {
      const enr = enrollments[courseId];
      div.coursesRequired += 1;
      if (enr && enr.status === 'COMPLETED') div.coursesCompleted += 1;
      else completedAll = false;
      if (enr && enr.status === 'OVERDUE') anyOverdue = true;
      if (enr && typeof enr.score === 'number') div.scores.push(enr.score);
    });

    if (anyOverdue) div.overdueCount += 1;
    if (completedAll) div.fullyCompliantCount += 1;
    else if (!anyOverdue) div.inProgressCount += 1;
  });

  return Array.from(byDivision.values())
    .map((div) => {
      const completionRate = div.coursesRequired > 0
        ? round1((div.coursesCompleted / div.coursesRequired) * 100)
        : 0;
      const avgScore = div.scores.length > 0
        ? round1(div.scores.reduce((a, b) => a + b, 0) / div.scores.length)
        : null;
      return {
        code: div.code,
        name: div.name,
        headcount: div.headcount,
        fullyCompliantCount: div.fullyCompliantCount,
        inProgressCount: div.inProgressCount,
        overdueCount: div.overdueCount,
        coursesRequired: div.coursesRequired,
        coursesCompleted: div.coursesCompleted,
        completionRate,
        avgScore,
        director: div.lead || '—',
        status:
          completionRate >= AUDIT_READY_THRESHOLD ? 'AUDIT_READY'
            : completionRate >= NEEDS_ATTENTION_THRESHOLD ? 'NEEDS_ATTENTION'
            : 'HIGH_RISK',
      };
    })
    .sort((a, b) => b.completionRate - a.completionRate || b.headcount - a.headcount)
    .map((div, i) => ({ ...div, rank: i + 1 }));
}

/** The competency columns, each mapped to the real course categories behind it. */
export const OPERATIONS_COMPETENCIES = [
  { key: 'foodSafety', label: 'Food Safety & Hygiene', categories: ['Food Safety & Hygiene'] },
  { key: 'coldChain', label: 'Cold Chain', categories: ['Cold Chain'] },
  { key: 'storeOps', label: 'Store Operations', categories: ['Store Operations'] },
  { key: 'safety', label: 'Health & Safety', categories: ['Health & Safety'] },
  { key: 'customerService', label: 'Customer Service', categories: ['Customer Service'] },
  { key: 'leadership', label: 'Leadership', categories: ['Leadership & Management'] },
];

export const OFFICE_COMPETENCIES = [
  { key: 'infoSec', label: 'IT InfoSec', categories: ['Information Security'] },
  { key: 'compliance', label: 'Compliance & Ethics', categories: ['Compliance & Ethics'] },
  { key: 'supplyChain', label: 'Supply Chain', categories: ['Supply Chain'] },
  { key: 'safety', label: 'Health & Safety', categories: ['Health & Safety'] },
  { key: 'leadership', label: 'Strategic Leadership', categories: ['Leadership & Management'] },
  { key: 'orientation', label: 'Corporate Orientation', categories: ['Corporate Orientation'] },
];

/**
 * Competency attainment per organisational unit, per competency column.
 *
 * Operations units are the store divisions; supporting units are the head-office
 * divisions. A cell with no enrollments at all reports null rather than 0 — "we
 * have never trained this" is a different finding from "we trained and scored 0".
 */
export function buildCompetencyHeatmap(users = [], enrollmentsByUser = {}, courses = []) {
  const categoryOf = new Map((courses || []).map((c) => [c.id, c.category]));

  function unitsFor(branch, competencies) {
    const byUnit = new Map();

    users.filter((u) => isActive(u) && u.branch === branch).forEach((user) => {
      const key = user.divisionCode || user.divisionId || 'UNASSIGNED';
      if (!byUnit.has(key)) {
        byUnit.set(key, {
          entity: user.divisionName || key,
          area: user.areaName || user.branchName || '—',
          headcount: 0,
          buckets: new Map(competencies.map((c) => [c.key, []])),
        });
      }
      const unit = byUnit.get(key);
      unit.headcount += 1;

      Object.values(enrollmentsByUser[user.userId] || {}).forEach((enr) => {
        const category = categoryOf.get(enr.courseId);
        if (!category) return;
        const column = competencies.find((c) => c.categories.includes(category));
        if (!column) return;
        unit.buckets.get(column.key).push(attainmentOf(enr));
      });
    });

    return Array.from(byUnit.values())
      .map((unit) => {
        const row = { entity: unit.entity, area: unit.area, headcount: unit.headcount };
        const measured = [];
        competencies.forEach((c) => {
          const values = unit.buckets.get(c.key);
          const avg = values.length > 0
            ? Math.round(values.reduce((a, b) => a + b, 0) / values.length)
            : null;
          row[c.key] = avg;
          if (avg !== null) measured.push(avg);
        });
        row.gapAvg = measured.length > 0
          ? round1(100 - measured.reduce((a, b) => a + b, 0) / measured.length)
          : null;
        row.auditReady = row.gapAvg !== null && row.gapAvg <= 15;
        return row;
      })
      .sort((a, b) => (b.gapAvg ?? -1) - (a.gapAvg ?? -1));
  }

  return {
    operations: unitsFor('OPERATIONS', OPERATIONS_COMPETENCIES),
    supportingOffice: unitsFor('SUPPORTING', OFFICE_COMPETENCIES),
  };
}
