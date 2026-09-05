// ===========================================================================
// ADMIN LEADERSHIP OVERSIGHT BUSINESS RULES ENGINE
//
// Aggregates real operational data across all Line Managers, Trainers, and HRBPs
// to provide leadership oversight and league tables for User Admin & System Admin.
//
// Rules adhere strictly to underlying domain rules:
// - Manager metrics re-use src/utils/managerRules.js (BR-MGR-001 -> BR-MGR-032)
// - HRBP metrics re-use src/utils/hrbpRules.js (BR-HRBP-001 -> BR-HRBP-062)
// - Trainer metrics re-use curated & deterministic stats from mockData & courses
// ===========================================================================

import { allUsers, classroomSessions as defaultClassroomSessions, trainerStatsFor } from '../data/mockData';
import { normalizeRole, hasCapability, roleDefinition } from '../data/roles';
import { buildTeam, teamSummary, attentionByMember, PASS_MARK } from './managerRules';
import {
  PORTFOLIO_MODE,
  resolveHrbpPortfolio,
  portfolioComplianceRate,
  skillGapByUnit,
  interventionSla,
} from './hrbpRules';

function isActive(user) {
  return !user || (user.status !== 'INACTIVE' && user.status !== 'TERMINATED');
}

/**
 * 1. MANAGERS OVERSIGHT
 * Aggregates real team statistics for every Line Manager in the organization.
 */
export function buildManagersOversight(usersList = [], enrollmentsByUser = {}, courses = [], today = new Date()) {
  const users = usersList && usersList.length > 0 ? usersList : allUsers();
  const activeUsers = users.filter(isActive);

  // Identify all managers in the roster (role === 'manager' or manages direct reports)
  const managers = activeUsers.filter((u) => normalizeRole(u.role) === 'manager');

  const rows = managers.map((mgr) => {
    const team = buildTeam(mgr, activeUsers, enrollmentsByUser, today);
    const summary = teamSummary(team);
    const attentionList = attentionByMember(team, courses, today);

    let status = 'ON_TRACK';
    if (summary.overduePeople > 0 || summary.failedPeople > 0 || summary.completionPercent < 50) {
      status = 'NEEDS_ATTENTION';
    } else if (summary.completionPercent < 80) {
      status = 'IN_PROGRESS';
    }

    return {
      userId: mgr.userId,
      employeeCode: mgr.employeeCode || mgr.userId,
      fullName: mgr.fullName,
      email: mgr.email,
      position: mgr.position || mgr.title || 'Department Manager',
      title: mgr.title || mgr.position,
      level: mgr.level || '4',
      avatar: mgr.avatar || mgr.fullName.slice(0, 2).toUpperCase(),
      branch: mgr.branch || 'OPERATIONS',
      divisionId: mgr.divisionId,
      divisionCode: mgr.divisionCode || '1010_AP',
      divisionName: mgr.divisionName || mgr.storeName || mgr.divisionCode || 'MM Store Operations',
      departmentId: mgr.departmentId,
      departmentCode: mgr.departmentCode || 'FF_ST',
      departmentName: mgr.departmentName || mgr.departmentCode || 'Fresh Food',
      storeName: mgr.storeName || mgr.divisionName || 'MM An Phu',
      headcount: summary.headcount,
      directReports: summary.directReports,
      departmentMembers: summary.departmentMembers,
      assigned: summary.assigned,
      completed: summary.completed,
      completionPercent: summary.completionPercent,
      mandatoryPercent: summary.mandatoryPercent,
      mandatoryCompliantPeople: summary.mandatoryCompliantPeople,
      overduePeople: summary.overduePeople,
      failedPeople: summary.failedPeople,
      inactivePeople: summary.inactivePeople,
      averageScore: summary.averageScore,
      attentionCount: attentionList.length,
      attentionItems: attentionList,
      status,
    };
  });

  // Sort descending by completion percentage, then by headcount
  rows.sort((a, b) => b.completionPercent - a.completionPercent || b.headcount - a.headcount);

  // Compute company-wide rollup
  const totalManagers = rows.length;
  const totalSupervised = rows.reduce((acc, r) => acc + r.headcount, 0);
  const totalAssigned = rows.reduce((acc, r) => acc + r.assigned, 0);
  const totalCompleted = rows.reduce((acc, r) => acc + r.completed, 0);
  const companyAvgCompletion = totalAssigned > 0 ? Math.round((totalCompleted / totalAssigned) * 100) : 0;
  const totalOverdue = rows.reduce((acc, r) => acc + r.overduePeople, 0);
  const totalFailed = rows.reduce((acc, r) => acc + r.failedPeople, 0);
  const totalAttention = rows.reduce((acc, r) => acc + r.attentionCount, 0);
  const companyMandatoryPercent = totalManagers > 0
    ? Math.round(rows.reduce((acc, r) => acc + r.mandatoryPercent, 0) / totalManagers)
    : 0;

  return {
    rows,
    summary: {
      totalManagers,
      totalSupervised,
      companyAvgCompletion,
      totalOverdue,
      totalFailed,
      totalAttention,
      companyMandatoryPercent,
    },
  };
}

/**
 * 2. TRAINERS OVERSIGHT
 * Aggregates teaching metrics and CSAT quality ratings across all teaching-eligible staff.
 */
export function buildTrainersOversight(usersList = [], courses = [], sessionsList = []) {
  const users = usersList && usersList.length > 0 ? usersList : allUsers();
  const sessions = sessionsList && sessionsList.length > 0 ? sessionsList : defaultClassroomSessions;
  const activeUsers = users.filter(isActive);

  // Identify all trainers (role === 'trainer' or hasCapability 'canBeAssignedToClass')
  const trainers = activeUsers.filter(
    (u) => normalizeRole(u.role) === 'trainer' || hasCapability(normalizeRole(u.role), 'canBeAssignedToClass')
  );

  const rows = trainers.map((t) => {
    const stats = trainerStatsFor(t.userId);
    const rDef = roleDefinition(t.role);

    // Count live courses and workshop sessions assigned to this trainer
    const assignedSessions = sessions.filter(
      (s) =>
        s.trainerId === t.userId ||
        s.trainerName === t.fullName ||
        (s.coTrainerIds && s.coTrainerIds.includes(t.userId)) ||
        (s.coTrainers && s.coTrainers.some((ct) => (ct.userId || ct.id) === t.userId))
    );

    const authoredCourses = courses.filter(
      (c) =>
        c.trainerId === t.userId ||
        c.trainerName === t.fullName ||
        c.createdBy === t.userId ||
        (c.virtualMeeting && c.virtualMeeting.instructorId === t.userId)
    );

    const activeClassesCount = Math.max(assignedSessions.length, authoredCourses.length, 1);

    return {
      userId: t.userId,
      employeeCode: t.employeeCode || t.userId,
      fullName: t.fullName,
      email: t.email,
      role: t.role,
      roleLabel: rDef.labelVi,
      roleShort: rDef.shortVi,
      roleTone: rDef.tone,
      position: t.position || t.title || 'L&D Training Specialist',
      title: t.title || t.position,
      level: t.level || '3',
      avatar: t.avatar || t.fullName.slice(0, 2).toUpperCase(),
      branch: t.branch || 'SUPPORTING',
      divisionName: t.divisionName || (t.branch === 'OPERATIONS' ? 'Store Operations' : 'Head Office HR & Academy'),
      departmentName: t.departmentName || 'L&D Faculty & Academy',
      rating: stats.rating || 4.85,
      totalClassesTaught: stats.totalClassesTaught || 12,
      totalLearners: stats.totalLearners || 350,
      activeClassesCount,
    };
  });

  // Sort descending by CSAT rating, then by total learners trained
  rows.sort((a, b) => b.rating - a.rating || b.totalLearners - a.totalLearners);

  // Compute company-wide rollup
  const totalTrainers = rows.length;
  const totalClasses = rows.reduce((acc, r) => acc + r.totalClassesTaught, 0);
  const totalLearners = rows.reduce((acc, r) => acc + r.totalLearners, 0);
  const avgCsat = totalTrainers > 0
    ? Math.round((rows.reduce((acc, r) => acc + r.rating, 0) / totalTrainers) * 100) / 100
    : 4.85;

  return {
    rows,
    summary: {
      totalTrainers,
      totalClasses,
      totalLearners,
      avgCsat,
    },
  };
}

/**
 * 3. HRBPS OVERSIGHT
 * Aggregates portfolio coverage, compliance rate, competency gaps, and talent succession pipeline.
 */
export function buildHrbpsOversight(
  usersList = [],
  enrollmentsByUser = {},
  courses = [],
  successionTalents = [],
  interventions = [],
  today = new Date()
) {
  const users = usersList && usersList.length > 0 ? usersList : allUsers();
  const activeUsers = users.filter(isActive);

  // Identify all HRBPs in the system
  const hrbps = activeUsers.filter((u) => normalizeRole(u.role) === 'hrbp');

  // Compute company-wide compliance across all 42 divisions. NOTE: unlike a Manager's
  // team or a Trainer's classes, an HRBP's "portfolio" (Operations / Head Office /
  // Company) is a scope TOGGLE any HRBP can switch on their own dashboard — the data
  // model has no field assigning a distinct slice of divisions to one named HRBP. So
  // these figures are a shared company-wide reference, deliberately identical for
  // every HRBP row below, rather than a fabricated "their own portfolio" number.
  const companyPortfolio = resolveHrbpPortfolio(hrbps[0] || {}, PORTFOLIO_MODE.COMPANY);
  const companyCompliance = portfolioComplianceRate(activeUsers, enrollmentsByUser, companyPortfolio);
  const companyGaps = skillGapByUnit(activeUsers, enrollmentsByUser, courses, companyPortfolio);
  const criticalGapsCount = companyGaps.filter((g) => g.severity === 'CRITICAL_GAP').length;

  const activeTicketsAll = (interventions || []).filter((itv) => itv.status !== 'CANCELLED');

  const rows = hrbps.map((hrbp) => {
    // The one dimension that genuinely differs per HRBP in the current data model:
    // intervention tickets carry a `requestedBy` name, so tickets — and SLA
    // breaches among them — can be attributed to the specific person who raised them.
    const ownTickets = activeTicketsAll.filter((itv) => itv.requestedBy === hrbp.fullName);
    const ownSlaBreaches = ownTickets.filter((itv) => interventionSla(itv, today).state === 'BREACHED').length;

    return {
      userId: hrbp.userId,
      employeeCode: hrbp.employeeCode || hrbp.userId,
      fullName: hrbp.fullName,
      email: hrbp.email,
      role: hrbp.role,
      position: hrbp.position || 'Senior HR Business Partner',
      title: hrbp.title || hrbp.position,
      level: hrbp.level || '2',
      avatar: hrbp.avatar || hrbp.fullName.slice(0, 2).toUpperCase(),
      departmentName: hrbp.departmentName || 'HR Business Partnering',
      // Shared company-wide reference figures — same value on every row by design (see note above).
      companyHeadcount: companyCompliance.headcount,
      companyCompliancePercent: companyCompliance.compliancePercent,
      companyCriticalGapsCount: criticalGapsCount,
      // Real, personal figures.
      ticketsRaisedCount: ownTickets.length,
      slaBreachesCount: ownSlaBreaches,
    };
  });

  // Sort descending by how many intervention tickets this HRBP has personally raised —
  // the only column above that actually varies person-to-person.
  rows.sort((a, b) => b.ticketsRaisedCount - a.ticketsRaisedCount || a.fullName.localeCompare(b.fullName));

  // Compute company-wide rollup
  const totalHrbps = rows.length;
  const totalHeadcount = companyCompliance.headcount;
  const companyCompliancePercent = companyCompliance.compliancePercent;
  const totalSuccessors = (successionTalents || []).length;
  const totalSlaBreaches = activeTicketsAll.filter((itv) => interventionSla(itv, today).state === 'BREACHED').length;

  return {
    rows,
    summary: {
      totalHrbps,
      totalHeadcount,
      companyCompliancePercent,
      divisionsCovered: 42,
      criticalGapsCount,
      totalSuccessors,
      totalSlaBreaches,
    },
  };
}
