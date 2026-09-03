// ===========================================================================
// LINE MANAGER BUSINESS RULES ENGINE
//
// A Line Manager answers one question every morning: who on my team is behind,
// on what, and what do I do about it today. Everything here is derived from the
// real employee roster and the real enrollment matrix — no figure is sampled by
// array index, and no status is assumed when the underlying record is missing.
//
// Scope discipline matters as much as arithmetic here. A Line Manager owns the
// execution of their own team's training; organisation-wide competency analysis
// belongs to the HR Business Partner, and course authoring belongs to L&D. The
// rules below draw that boundary explicitly (BR-MGR-030 → 032).
// ===========================================================================

import { departments } from '../data/orgHierarchy';
import { UNIVERSAL_COMPLIANCE_COURSE_IDS } from '../data/generated100Data';

// ---------------------------------------------------------------------------
// Rule catalogue — rendered in the UI so the role's logic is inspectable.
// ---------------------------------------------------------------------------
export const MANAGER_RULES = [
  {
    id: 'BR-MGR-001',
    group: 'Team resolution',
    title: 'A team is direct reports plus the manager\'s own department',
    statement:
      'The roster is every active employee who either reports to the manager directly, or sits in the same department instance the manager sits in. Both groups are shown, and each row states which of the two it is, because a manager owes a direct report a different conversation than a departmental colleague.',
  },
  {
    id: 'BR-MGR-002',
    group: 'Team resolution',
    title: 'Match the department instance, never the department code',
    statement:
      'Department codes repeat across the store network: FF_ST exists in 15 divisions, CS_ST and DELIV_ST in 16 each. Matching on the code alone pulls dozens of employees from other stores into a manager\'s roster. Membership is therefore resolved on departmentId, which is unique, and confirmed against the manager\'s divisionId.',
  },
  {
    id: 'BR-MGR-003',
    group: 'Team resolution',
    title: 'The roster is never truncated and never padded',
    statement:
      'Every qualifying employee appears. A manager with 3 reports sees 3, a manager with 40 sees 40. Where a manager has no team at all the screen says so plainly instead of borrowing somebody else\'s employees to fill the page.',
  },
  {
    id: 'BR-MGR-004',
    group: 'Team resolution',
    title: 'Inactive employees leave the roster but stay in history',
    statement:
      'Only employees with an active status count towards the roster, the completion rates and the attention queue. Leavers remain visible in transcripts and audit history, but never dilute a live compliance figure.',
  },
  {
    id: 'BR-MGR-010',
    group: 'Team training state',
    title: 'Progress is counted across every assigned course',
    statement:
      'A team member\'s completion rate is the number of their completed enrollments divided by the number assigned to them. Employees carry between four and twelve assigned courses, so reporting a single sampled course as though it were the whole picture misstates who is behind.',
  },
  {
    id: 'BR-MGR-011',
    group: 'Team training state',
    title: 'Member status follows a severity order',
    statement:
      'A member is OVERDUE if any assigned course is overdue; otherwise FAILED if any course has exhausted its attempts below the pass mark; otherwise NOT_STARTED if nothing has been started; otherwise IN_PROGRESS while work remains; otherwise COMPLETED. The worst open state wins, because that is the one the manager has to act on.',
  },
  {
    id: 'BR-MGR-012',
    group: 'Team training state',
    title: 'Mandatory compliance is completion of the three universal courses',
    statement:
      'Compliance is measured only against the three mandatory courses every employee carries — information security, fire and occupational safety, and store operations and food safety. Only COMPLETED counts. A course never assigned counts as zero and is flagged, because it is an allocation defect rather than a performance one.',
  },
  {
    id: 'BR-MGR-013',
    group: 'Team training state',
    title: 'An average score needs recorded scores',
    statement:
      'A member\'s average is the mean of the scores actually recorded against their completed courses. Where nothing has been scored the average is reported as unavailable rather than substituted with a placeholder, and that member is excluded from the team average instead of dragging it in either direction.',
  },
  {
    id: 'BR-MGR-014',
    group: 'Team training state',
    title: 'Inactivity is measured from the last recorded activity',
    statement:
      'Days inactive is counted from the most recent activity timestamp across the member\'s enrollments. A member with no activity record at all and no started course is reported as never having started, not as inactive for zero days.',
  },
  {
    id: 'BR-MGR-015',
    group: 'Team training state',
    title: 'Failed means attempts exhausted, not simply a low score',
    statement:
      'A course counts as failed when the recorded attempts have reached the allowed limit and the best score is still below the pass mark. Only then does the learner need the manager to unlock a retake, which is what makes this the one queue item nobody else can clear.',
  },
  {
    id: 'BR-MGR-020',
    group: 'Attention queue',
    title: 'The queue is ranked by what costs the business most',
    statement:
      'Attention items are ordered: overdue mandatory training first, then exhausted assessment attempts, then prolonged inactivity with work still open, then unstarted courses whose deadline is inside two weeks. Every item names the employee, the specific courses, the reason, and the single action the manager should take.',
  },
  {
    id: 'BR-MGR-021',
    group: 'Attention queue',
    title: 'Overdue mandatory training outranks everything',
    statement:
      'An overdue mandatory course is audit exposure for the store, not merely a late learner, so it sits at the top of the queue regardless of how the rest of that employee\'s record looks.',
  },
  {
    id: 'BR-MGR-022',
    group: 'Attention queue',
    title: 'An exhausted retake is the manager\'s to unlock',
    statement:
      'When a learner has used every attempt and still not passed, the platform blocks further attempts by design. Clearing it requires a manager decision, so it is raised as an action rather than a statistic.',
  },
  {
    id: 'BR-MGR-023',
    group: 'Attention queue',
    title: 'Inactivity only counts while work is open',
    statement:
      'Seven days without activity raises a nudge only where the member still has unfinished assigned courses. Somebody who has completed everything is not inactive, they are done, and chasing them wastes the manager\'s credibility.',
  },
  {
    id: 'BR-MGR-024',
    group: 'Attention queue',
    title: 'One employee, one line in the queue',
    statement:
      'The queue lists each employee once, under their most severe open reason, with any further reasons shown beneath it. Telling a manager three separate times to chase the same person turns a to-do list into a wall, and the manager stops reading it. The exception is an exhausted retake, which is kept visible in its own right because it needs a different decision from a reminder.',
  },
  {
    id: 'BR-MGR-030',
    group: 'Scope boundaries',
    title: 'A manager sees their team, never the organisation',
    statement:
      'Every figure on the manager screens is bounded by the resolved team. Cross-store comparison, competency modelling and succession planning belong to the HR Business Partner, who has the organisation-wide mandate the Line Manager does not.',
  },
  {
    id: 'BR-MGR-031',
    group: 'Scope boundaries',
    title: 'A manager approves cost, not grade progression',
    statement:
      'A Line Manager approves a request to take a chargeable development course and accepts the cost against the department budget. A request to study a grade above the learner\'s own is not theirs: level skip approval sits with User Administration and System Administration.',
  },
  {
    id: 'BR-MGR-032',
    group: 'Scope boundaries',
    title: 'A manager reads employee records, never edits them',
    statement:
      'Job titles, grades, org placement and course authoring are all read-only to a Line Manager. The manager acts through reminders, approvals, retake unlocks and behavioural reviews — the levers that belong to a line relationship.',
  },
  {
    id: 'BR-MGR-040',
    group: 'Action plans (Kirkpatrick L3)',
    title: 'A manager reviews only their own team\'s commitments',
    statement:
      'The action plan queue is filtered to the resolved team. A commitment made by somebody in another department is not this manager\'s to sign off, and showing it invites the wrong person to close it.',
  },
  {
    id: 'BR-MGR-041',
    group: 'Action plans (Kirkpatrick L3)',
    title: 'A behavioural review falls due 90 days after the commitment',
    statement:
      'An action plan becomes reviewable 90 days after it was committed and overdue at 180. Before 90 days there is not yet enough on-the-job evidence to judge behaviour change, and after 180 the recollection is too thin to be worth recording.',
  },
  {
    id: 'BR-MGR-042',
    group: 'Action plans (Kirkpatrick L3)',
    title: 'Sign-off is the manager\'s and is recorded',
    statement:
      'The Level 3 rating and its sign-off carry the manager\'s name and the date. This is the evidence the Level 4 return-on-investment report is later built from, so an unsigned review leaves a hole in the chain rather than a blank cell.',
  },
  {
    id: 'BR-MGR-050',
    group: 'Reminder governance',
    title: 'A reminder has a cooldown',
    statement:
      'The same employee cannot be nudged about the same thing more than once every three days. Reminder fatigue is the fastest way to make a compliance channel invisible, so the platform enforces the pause rather than trusting the manager to remember.',
  },
  {
    id: 'BR-MGR-051',
    group: 'Reminder governance',
    title: 'A reminder must have something to be about',
    statement:
      'The nudge action is only offered where the member has an open attention item. A reminder sent to somebody who is up to date reads as noise and trains the team to ignore the next one.',
  },
];

export const MANAGER_RULE_GROUPS = [
  'Team resolution',
  'Team training state',
  'Attention queue',
  'Scope boundaries',
  'Action plans (Kirkpatrick L3)',
  'Reminder governance',
];

export function managerRule(id) {
  return MANAGER_RULES.find((r) => r.id === id) || null;
}

// ---------------------------------------------------------------------------
// Shared constants
// ---------------------------------------------------------------------------
export const MANDATORY_COURSE_IDS = UNIVERSAL_COMPLIANCE_COURSE_IDS;
export const PASS_MARK = 80;
export const MAX_ATTEMPTS = 3;
export const INACTIVITY_THRESHOLD_DAYS = 7;
export const DUE_SOON_WINDOW_DAYS = 14;
export const NUDGE_COOLDOWN_DAYS = 3;
export const L3_REVIEW_DUE_DAYS = 90;
export const L3_REVIEW_OVERDUE_DAYS = 180;

export const RELATIONSHIP = {
  DIRECT_REPORT: 'DIRECT_REPORT',
  DEPARTMENT: 'DEPARTMENT',
};

export const RELATIONSHIP_LABELS = {
  DIRECT_REPORT: 'Direct report',
  DEPARTMENT: 'Department member',
};

function isActive(user) {
  return !user || (user.status !== 'INACTIVE' && user.status !== 'TERMINATED');
}

function parseDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function daysBetween(from, to) {
  if (!from || !to) return null;
  return Math.floor((to.getTime() - from.getTime()) / 86400000);
}

// ---------------------------------------------------------------------------
// BR-MGR-001 → 004 — Team resolution
// ---------------------------------------------------------------------------

/**
 * How many divisions reuse each department code. Used to explain, in the UI, why
 * membership cannot be resolved on the code (BR-MGR-002).
 */
export function departmentCodeReuse(code) {
  return departments.filter((d) => d.code === code).length;
}

/**
 * Resolves the manager's team.
 * BR-MGR-001: direct reports plus the manager's own department instance.
 * BR-MGR-002: departmentId, never departmentCode.
 * BR-MGR-003/004: no truncation, no padding, active employees only.
 */
export function resolveTeam(manager, users = []) {
  if (!manager) {
    return { members: [], directReports: 0, departmentMembers: 0, departmentId: null, departmentCode: null, codeReuse: 0 };
  }

  const roster = (users || []).filter((u) => u && u.userId !== manager.userId && isActive(u));

  const seen = new Set();
  const members = [];

  roster.forEach((u) => {
    if (u.managerId && u.managerId === manager.userId) {
      seen.add(u.userId);
      members.push({ user: u, relationship: RELATIONSHIP.DIRECT_REPORT });
    }
  });

  if (manager.departmentId) {
    roster.forEach((u) => {
      if (seen.has(u.userId)) return;
      // BR-MGR-002 — the department INSTANCE, cross-checked against the division.
      const sameDepartment = u.departmentId === manager.departmentId;
      const sameDivision = !manager.divisionId || !u.divisionId || u.divisionId === manager.divisionId;
      if (sameDepartment && sameDivision) {
        seen.add(u.userId);
        members.push({ user: u, relationship: RELATIONSHIP.DEPARTMENT });
      }
    });
  }

  return {
    members,
    directReports: members.filter((m) => m.relationship === RELATIONSHIP.DIRECT_REPORT).length,
    departmentMembers: members.filter((m) => m.relationship === RELATIONSHIP.DEPARTMENT).length,
    departmentId: manager.departmentId || null,
    departmentCode: manager.departmentCode || null,
    divisionId: manager.divisionId || null,
    divisionName: manager.divisionName || null,
    departmentName: manager.departmentName || null,
    codeReuse: manager.departmentCode ? departmentCodeReuse(manager.departmentCode) : 0,
  };
}

// ---------------------------------------------------------------------------
// BR-MGR-010 → 015 — Per-member training state, from real enrollments
// ---------------------------------------------------------------------------

export const MEMBER_STATUS_ORDER = ['OVERDUE', 'FAILED', 'NOT_STARTED', 'IN_PROGRESS', 'COMPLETED'];

export const MEMBER_STATUS_LABELS = {
  OVERDUE: 'Overdue',
  FAILED: 'Retake blocked',
  NOT_STARTED: 'Not started',
  IN_PROGRESS: 'In progress',
  COMPLETED: 'Up to date',
};

/** BR-MGR-015 — a single enrollment has exhausted its attempts below the pass mark. */
export function isFailedEnrollment(enr) {
  if (!enr || enr.status === 'COMPLETED') return false;
  const attempts = Number(enr.attemptsCount) || 0;
  const score = typeof enr.score === 'number' ? enr.score : null;
  return attempts >= MAX_ATTEMPTS && (score === null || score < PASS_MARK);
}

/**
 * The training state of one team member, derived from every course assigned to
 * them (BR-MGR-010 → 014).
 */
export function memberTrainingState(user, userEnrollments = {}, today = new Date()) {
  const enrollments = Object.values(userEnrollments || {});

  const assigned = enrollments.length;
  const completed = enrollments.filter((e) => e.status === 'COMPLETED').length;
  const overdueList = enrollments.filter((e) => e.status === 'OVERDUE');
  const failedList = enrollments.filter(isFailedEnrollment);
  const started = enrollments.filter((e) => e.status !== 'NOT_STARTED').length;
  const notStarted = enrollments.filter((e) => e.status === 'NOT_STARTED').length;

  // BR-MGR-013 — only recorded scores.
  const scored = enrollments.filter((e) => typeof e.score === 'number');
  const averageScore = scored.length > 0
    ? Math.round(scored.reduce((a, e) => a + e.score, 0) / scored.length)
    : null;

  // BR-MGR-012 — mandatory compliance over the three universal courses.
  const mandatoryLines = MANDATORY_COURSE_IDS.map((courseId) => {
    const enr = userEnrollments[courseId];
    return {
      courseId,
      assigned: Boolean(enr),
      state: enr ? (enr.status || 'NOT_STARTED') : 'NOT_ASSIGNED',
      compliant: Boolean(enr) && enr.status === 'COMPLETED',
    };
  });
  const mandatoryCompleted = mandatoryLines.filter((l) => l.compliant).length;
  const mandatoryNotAssigned = mandatoryLines.filter((l) => !l.assigned).length;
  const mandatoryOverdue = mandatoryLines.filter((l) => l.state === 'OVERDUE').length;

  // BR-MGR-014 — inactivity from the latest real activity timestamp.
  let lastActivity = null;
  enrollments.forEach((e) => {
    const d = parseDate(e.completedAt) || parseDate(e.lastActivityAt);
    if (d && (!lastActivity || d > lastActivity)) lastActivity = d;
  });
  const inactiveDays = lastActivity ? daysBetween(lastActivity, today) : null;

  // BR-MGR-011 — the worst open state wins.
  let status;
  if (overdueList.length > 0) status = 'OVERDUE';
  else if (failedList.length > 0) status = 'FAILED';
  else if (assigned > 0 && started === 0) status = 'NOT_STARTED';
  else if (completed < assigned) status = 'IN_PROGRESS';
  else status = 'COMPLETED';

  // The soonest deadline still open, which is what a manager plans around.
  let nextDue = null;
  enrollments.forEach((e) => {
    if (e.status === 'COMPLETED') return;
    const d = parseDate(e.dueDate);
    if (d && (!nextDue || d < nextDue)) nextDue = d;
  });

  return {
    userId: user?.userId,
    assigned,
    completed,
    inProgress: enrollments.filter((e) => e.status === 'IN_PROGRESS').length,
    notStarted,
    overdue: overdueList.length,
    failed: failedList.length,
    completionPercent: assigned > 0 ? Math.round((completed / assigned) * 100) : 0,
    averageScore,
    scoredCount: scored.length,
    status,
    statusLabel: MEMBER_STATUS_LABELS[status],
    mandatoryLines,
    mandatoryRequired: mandatoryLines.length,
    mandatoryCompleted,
    mandatoryNotAssigned,
    mandatoryOverdue,
    mandatoryCompliant: mandatoryCompleted === mandatoryLines.length,
    mandatoryPercent: Math.round((mandatoryCompleted / mandatoryLines.length) * 100),
    lastActivity: lastActivity ? lastActivity.toISOString().slice(0, 10) : null,
    inactiveDays,
    nextDueDate: nextDue ? nextDue.toISOString().slice(0, 10) : null,
    overdueCourseIds: overdueList.map((e) => e.courseId),
    failedCourseIds: failedList.map((e) => e.courseId),
  };
}

/** The full team, each member carrying their derived training state. */
export function buildTeam(manager, users = [], enrollments = {}, today = new Date()) {
  const resolved = resolveTeam(manager, users);
  const members = resolved.members.map(({ user, relationship }) => ({
    user,
    relationship,
    relationshipLabel: RELATIONSHIP_LABELS[relationship],
    state: memberTrainingState(user, enrollments[user.userId] || {}, today),
  }));
  return { ...resolved, members };
}

/**
 * One row per (member x assigned course) — the real assignment matrix.
 * This is what a per-course view of the team needs: who is on which course and
 * where each of them actually stands, rather than one sampled course per person.
 */
export function teamAssignments(team, enrollments = {}, courses = []) {
  const byId = new Map((courses || []).map((c) => [c.id, c]));
  const rows = [];

  (team?.members || []).forEach(({ user, relationship }) => {
    const userEnrollments = enrollments[user.userId] || {};
    Object.values(userEnrollments).forEach((enr) => {
      const course = byId.get(enr.courseId);
      const failed = isFailedEnrollment(enr);
      rows.push({
        userId: user.userId,
        employeeId: user.employeeCode,
        name: user.fullName,
        position: user.position,
        level: user.level,
        divisionCode: user.divisionCode,
        departmentCode: user.departmentCode,
        relationship,
        courseId: enr.courseId,
        course: course?.title || enr.courseId,
        courseType: enr.courseType || course?.courseType || 'OPTIONAL',
        mandatory: MANDATORY_COURSE_IDS.includes(enr.courseId),
        status: failed ? 'FAILED' : (enr.status || 'NOT_STARTED'),
        progress: Number(enr.progressPercent) || 0,
        score: typeof enr.score === 'number' ? enr.score : null,
        attempts: Number(enr.attemptsCount) || 0,
        dueDate: enr.dueDate || null,
        completedAt: enr.completedAt || null,
        lastActivity: enr.completedAt || enr.lastActivityAt || null,
      });
    });
  });

  return rows;
}

// ---------------------------------------------------------------------------
// BR-MGR-020 → 023 — Attention queue
// ---------------------------------------------------------------------------

export const ATTENTION_KIND = {
  OVERDUE_MANDATORY: 'OVERDUE_MANDATORY',
  OVERDUE: 'OVERDUE',
  RETAKE_BLOCKED: 'RETAKE_BLOCKED',
  INACTIVE: 'INACTIVE',
  DUE_SOON_UNSTARTED: 'DUE_SOON_UNSTARTED',
};

const ATTENTION_RANK = {
  OVERDUE_MANDATORY: 1,
  RETAKE_BLOCKED: 2,
  OVERDUE: 3,
  INACTIVE: 4,
  DUE_SOON_UNSTARTED: 5,
};

export const ATTENTION_META = {
  OVERDUE_MANDATORY: {
    label: 'Overdue mandatory training',
    action: 'Send a reminder and confirm a completion date today',
    tone: 'rust',
    rule: 'BR-MGR-021',
  },
  RETAKE_BLOCKED: {
    label: 'Assessment attempts exhausted',
    action: 'Review with the employee and unlock a retake',
    tone: 'rust',
    rule: 'BR-MGR-022',
  },
  OVERDUE: {
    label: 'Overdue course',
    action: 'Send a reminder with a new agreed deadline',
    tone: 'amber',
    rule: 'BR-MGR-020',
  },
  INACTIVE: {
    label: 'Inactive with work still open',
    action: 'Check for a blocker, then nudge',
    tone: 'amber',
    rule: 'BR-MGR-023',
  },
  DUE_SOON_UNSTARTED: {
    label: 'Deadline approaching, not started',
    action: 'Ask the employee to book time this week',
    tone: 'blue',
    rule: 'BR-MGR-020',
  },
};

/**
 * BR-MGR-020 → 023 — what the manager should act on, ranked, each item naming
 * the employee, the reason and the single recommended action.
 */
export function attentionQueue(team, courses = [], today = new Date()) {
  const courseTitle = (id) => (courses || []).find((c) => c.id === id)?.title || id;
  const items = [];

  (team?.members || []).forEach(({ user, relationship, state }) => {
    const base = {
      userId: user.userId,
      employeeCode: user.employeeCode,
      name: user.fullName,
      position: user.position,
      relationship,
      state,
    };

    if (state.mandatoryOverdue > 0) {
      const ids = state.mandatoryLines.filter((l) => l.state === 'OVERDUE').map((l) => l.courseId);
      items.push({
        ...base,
        kind: ATTENTION_KIND.OVERDUE_MANDATORY,
        courseIds: ids,
        reason: `${ids.length} mandatory course(s) past the deadline: ${ids.map(courseTitle).join(', ')}`,
      });
    } else if (state.overdue > 0) {
      items.push({
        ...base,
        kind: ATTENTION_KIND.OVERDUE,
        courseIds: state.overdueCourseIds,
        reason: `${state.overdue} course(s) past the deadline: ${state.overdueCourseIds.map(courseTitle).join(', ')}`,
      });
    }

    if (state.failed > 0) {
      items.push({
        ...base,
        kind: ATTENTION_KIND.RETAKE_BLOCKED,
        courseIds: state.failedCourseIds,
        reason: `${state.failed} assessment(s) at the ${MAX_ATTEMPTS}-attempt limit without a pass: ${state.failedCourseIds.map(courseTitle).join(', ')}`,
      });
    }

    // BR-MGR-023 — inactivity only counts while work is open.
    const workOpen = state.assigned > state.completed;
    if (workOpen && state.inactiveDays !== null && state.inactiveDays >= INACTIVITY_THRESHOLD_DAYS) {
      items.push({
        ...base,
        kind: ATTENTION_KIND.INACTIVE,
        courseIds: [],
        reason: `No learning activity for ${state.inactiveDays} days with ${state.assigned - state.completed} course(s) still open`,
      });
    }

    if (state.status === 'NOT_STARTED' && state.nextDueDate) {
      const daysToDue = daysBetween(today, parseDate(state.nextDueDate));
      if (daysToDue !== null && daysToDue >= 0 && daysToDue <= DUE_SOON_WINDOW_DAYS) {
        items.push({
          ...base,
          kind: ATTENTION_KIND.DUE_SOON_UNSTARTED,
          courseIds: [],
          reason: `Nothing started and the first deadline is in ${daysToDue} day(s), on ${state.nextDueDate}`,
        });
      }
    }
  });

  return items
    .map((item) => ({ ...item, ...ATTENTION_META[item.kind] }))
    .sort((a, b) => ATTENTION_RANK[a.kind] - ATTENTION_RANK[b.kind] || a.name.localeCompare(b.name));
}

/**
 * BR-MGR-024 — one row per employee, at their most severe reason, with the
 * remaining reasons carried alongside it.
 */
export function attentionByMember(team, courses = [], today = new Date()) {
  const flat = attentionQueue(team, courses, today);
  const byUser = new Map();

  flat.forEach((item) => {
    const existing = byUser.get(item.userId);
    if (!existing) {
      byUser.set(item.userId, { ...item, alsoFlagged: [] });
      return;
    }
    // attentionQueue is already ranked, so the first hit is the most severe.
    existing.alsoFlagged.push({ kind: item.kind, label: item.label, reason: item.reason, action: item.action, rule: item.rule });
  });

  return Array.from(byUser.values());
}

// ---------------------------------------------------------------------------
// Team-level rollup
// ---------------------------------------------------------------------------

export function teamSummary(team) {
  const members = team?.members || [];
  const headcount = members.length;
  if (headcount === 0) {
    return {
      headcount: 0, directReports: 0, departmentMembers: 0,
      assigned: 0, completed: 0, completionPercent: 0,
      mandatoryPercent: 0, mandatoryCompliantPeople: 0,
      overduePeople: 0, failedPeople: 0, notStartedPeople: 0, inactivePeople: 0,
      averageScore: null, scoredPeople: 0,
    };
  }

  const assigned = members.reduce((a, m) => a + m.state.assigned, 0);
  const completed = members.reduce((a, m) => a + m.state.completed, 0);
  const scoredMembers = members.filter((m) => m.state.averageScore !== null);

  return {
    headcount,
    directReports: team.directReports,
    departmentMembers: team.departmentMembers,
    assigned,
    completed,
    completionPercent: assigned > 0 ? Math.round((completed / assigned) * 100) : 0,
    // BR-MGR-012 — a headcount-weighted mandatory compliance rate.
    mandatoryPercent: Math.round(members.reduce((a, m) => a + m.state.mandatoryPercent, 0) / headcount),
    mandatoryCompliantPeople: members.filter((m) => m.state.mandatoryCompliant).length,
    overduePeople: members.filter((m) => m.state.overdue > 0).length,
    failedPeople: members.filter((m) => m.state.failed > 0).length,
    notStartedPeople: members.filter((m) => m.state.status === 'NOT_STARTED').length,
    inactivePeople: members.filter(
      (m) => m.state.assigned > m.state.completed && m.state.inactiveDays !== null && m.state.inactiveDays >= INACTIVITY_THRESHOLD_DAYS
    ).length,
    // BR-MGR-013 — members without a recorded score are excluded, not zeroed.
    averageScore: scoredMembers.length > 0
      ? Math.round(scoredMembers.reduce((a, m) => a + m.state.averageScore, 0) / scoredMembers.length)
      : null,
    scoredPeople: scoredMembers.length,
  };
}

// ---------------------------------------------------------------------------
// BR-MGR-040 → 042 — Action plans and the Kirkpatrick L3 review
// ---------------------------------------------------------------------------

export const L3_STATE = {
  TOO_EARLY: 'TOO_EARLY',
  DUE: 'DUE',
  OVERDUE: 'OVERDUE',
  SIGNED_OFF: 'SIGNED_OFF',
};

export const L3_STATE_LABELS = {
  TOO_EARLY: 'Too early to review',
  DUE: 'Review due',
  OVERDUE: 'Review overdue',
  SIGNED_OFF: 'Signed off',
};

/** BR-MGR-041 — where an action plan sits in its review window. */
export function l3ReviewState(plan, today = new Date()) {
  const signedOff =
    plan?.managerSignedOff ||
    plan?.status === 'REVIEWED' ||
    plan?.status === 'EVALUATED_L3' ||
    Boolean(plan?.l3Rating) ||
    Boolean(plan?.managerReviewL3);
  if (signedOff) {
    return { state: L3_STATE.SIGNED_OFF, label: L3_STATE_LABELS.SIGNED_OFF, ageDays: null };
  }
  const committed = parseDate(plan?.committedAt || plan?.createdAt || plan?.startDate);
  const ageDays = committed ? daysBetween(committed, today) : null;
  if (ageDays === null) return { state: L3_STATE.DUE, label: L3_STATE_LABELS.DUE, ageDays: null };
  if (ageDays < L3_REVIEW_DUE_DAYS) return { state: L3_STATE.TOO_EARLY, label: L3_STATE_LABELS.TOO_EARLY, ageDays };
  if (ageDays > L3_REVIEW_OVERDUE_DAYS) return { state: L3_STATE.OVERDUE, label: L3_STATE_LABELS.OVERDUE, ageDays };
  return { state: L3_STATE.DUE, label: L3_STATE_LABELS.DUE, ageDays };
}

/** BR-MGR-040 — only the resolved team's commitments. */
export function teamActionPlans(team, actionPlans = [], today = new Date()) {
  const ids = new Set();
  const codes = new Set();
  (team?.members || []).forEach(({ user }) => {
    if (user.userId) ids.add(user.userId);
    if (user.employeeCode) codes.add(user.employeeCode);
  });

  return (actionPlans || [])
    // Action plans are keyed by learnerId (the learner who made the commitment),
    // with userId kept as a fallback for any record authored the other way.
    .filter((p) => {
      const learnerRef = p.learnerId || p.userId;
      return ids.has(learnerRef) || codes.has(p.employeeCode) || codes.has(learnerRef);
    })
    .map((p) => ({ ...p, review: l3ReviewState(p, today) }));
}

// ---------------------------------------------------------------------------
// BR-MGR-050 / 051 — Reminder governance
// ---------------------------------------------------------------------------

/**
 * Whether the manager may nudge this member right now.
 * BR-MGR-050 enforces the cooldown; BR-MGR-051 requires something to nudge about.
 */
export function canSendReminder(member, reminderLog = [], today = new Date()) {
  const hasOpenItem =
    member?.state &&
    (member.state.overdue > 0 ||
      member.state.failed > 0 ||
      member.state.status === 'NOT_STARTED' ||
      (member.state.assigned > member.state.completed &&
        member.state.inactiveDays !== null &&
        member.state.inactiveDays >= INACTIVITY_THRESHOLD_DAYS));

  if (!hasOpenItem) {
    return { allowed: false, reason: 'NOTHING_TO_CHASE', rule: 'BR-MGR-051', label: 'Up to date — nothing to remind about' };
  }

  const last = (reminderLog || [])
    .filter((r) => r.userId === member.user?.userId || r.employeeCode === member.user?.employeeCode)
    .map((r) => parseDate(r.sentAt))
    .filter(Boolean)
    .sort((a, b) => b - a)[0];

  if (last) {
    const since = daysBetween(last, today);
    if (since !== null && since < NUDGE_COOLDOWN_DAYS) {
      return {
        allowed: false,
        reason: 'COOLDOWN',
        rule: 'BR-MGR-050',
        label: `Reminded ${since} day(s) ago — the ${NUDGE_COOLDOWN_DAYS}-day cooldown is still running`,
      };
    }
  }

  return { allowed: true, reason: null, rule: 'BR-MGR-050', label: 'Send a reminder' };
}
