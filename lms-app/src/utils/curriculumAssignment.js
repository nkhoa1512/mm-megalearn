import { targetOptionsFor, assignmentTypeLabel } from '../data/assignmentTargets';
import { hasCapability, normalizeRole } from '../data/roles';
import { DEFAULT_CUSTOM_GROUPS, isUserInCustomGroup } from '../data/customGroupsData';

/**
 * Checks whether a curriculum is allocated to the user `user`.
 * It is matched against the `curriculum.assignments` list:
 * - GROUP: matches if `user` belongs to the named custom group
 * - BUSINESS_UNIT: matches `user.businessUnitId` or 'ALL' / 'bu-mmvn'
 * - DIVISION: matches `user.divisionId` or `user.divisionCode`
 * - DEPARTMENT: matches `user.departmentId` or `user.departmentCode`
 * - SUBDEPARTMENT: matches `user.subDepartmentId` or `user.subDepartmentCode`
 * - AREA: matches `user.areaId`
 * - STORE: matches `user.storeId`
 * - STORE_TYPE: matches `user.storeTypeId`
 * - CLUSTER: matches `user.clusterId`
 * - LEVEL: matches `user.level`
 * - ROLE: matches `user.role`
 * - USER: matches `user.userId` or `user.employeeCode`
 */
export function isCurriculumAssignedToUser(curriculum, user, customGroupsList = null) {
  if (!curriculum || !user) return { isAssigned: false, assignment: null };
  const assignments = curriculum.assignments || [];
  if (assignments.length === 0) return { isAssigned: false, assignment: null };

  const uLevel = String(user.level || '');
  const uRole = (user.role || '').toLowerCase();
  const uId = user.userId;
  const uCode = user.employeeCode;
  const uBu = user.businessUnitId || 'bu-mmvn';
  const uDivId = user.divisionId;
  const uDivCode = user.divisionCode;
  const uDeptId = user.departmentId;
  const uDeptCode = user.departmentCode;
  const uSubDeptId = user.subDepartmentId;
  const uSubDeptCode = user.subDepartmentCode;
  const uAreaId = user.areaId;
  const uStoreId = user.storeId;
  const uStoreTypeId = user.storeTypeId;
  const uClusterId = user.clusterId;

  for (const asg of assignments) {
    const type = asg.assignmentType;
    const targetId = asg.targetId || asg.targetValue;
    if (!targetId) continue;

    let matched = false;
    switch (type) {
      case 'GROUP': {
        const groups = (customGroupsList && customGroupsList.length > 0) ? customGroupsList : DEFAULT_CUSTOM_GROUPS;
        const targetGroup = groups.find((g) => g.id === targetId || g.code === targetId);
        if (targetGroup) {
          matched = isUserInCustomGroup(user, targetGroup);
        }
        break;
      }
      case 'BUSINESS_UNIT':
        matched = targetId === 'ALL' || targetId === 'bu-mmvn' || targetId === uBu;
        break;
      case 'DIVISION':
        matched = targetId === uDivId || (uDivCode && targetId.toUpperCase().includes(uDivCode.toUpperCase()));
        break;
      case 'DEPARTMENT':
        matched = targetId === uDeptId || (uDeptCode && targetId.toUpperCase().includes(uDeptCode.toUpperCase()));
        break;
      case 'SUBDEPARTMENT':
        matched = targetId === uSubDeptId || (uSubDeptCode && targetId.toUpperCase().includes(uSubDeptCode.toUpperCase()));
        break;
      case 'AREA':
        matched = targetId === uAreaId;
        break;
      case 'STORE':
        matched = targetId === uStoreId;
        break;
      case 'STORE_TYPE':
        matched = targetId === uStoreTypeId;
        break;
      case 'CLUSTER':
        matched = targetId === uClusterId;
        break;
      case 'LEVEL':
        matched = String(targetId) === uLevel;
        break;
      case 'ROLE':
        matched = (targetId || '').toLowerCase() === uRole;
        break;
      case 'USER':
        matched = targetId === uId || targetId === uCode;
        break;
      default:
        matched = false;
    }

    if (matched) {
      return { isAssigned: true, assignment: asg };
    }
  }

  return { isAssigned: false, assignment: null };
}

/**
 * Returns every published curriculum assigned to `user`.
 */
export function getAssignedCurriculaForUser(curricula = [], user) {
  if (!user || !Array.isArray(curricula)) return [];
  return curricula
    .filter((cur) => cur.status === 'PUBLISHED')
    .map((cur) => {
      const { isAssigned, assignment } = isCurriculumAssignedToUser(cur, user);
      if (!isAssigned) return null;
      return {
        ...cur,
        assignedVia: assignment,
      };
    })
    .filter(Boolean);
}

/**
 * Computes a user's learning progress on a curriculum.
 */
export function getCurriculumProgress(curriculum, user, enrollmentsMap = {}, allCourses = []) {
  const courseIds = curriculum?.courseIds || [];
  if (courseIds.length === 0) {
    return {
      totalCourses: 0,
      completedCourses: 0,
      inProgressCourses: 0,
      progressPercent: 0,
      status: 'NOT_STARTED',
    };
  }

  let completedCount = 0;
  let inProgressCount = 0;
  let totalPctSum = 0;

  courseIds.forEach((cId) => {
    const userEnrollment = enrollmentsMap[cId];
    const rawCourse = allCourses.find((c) => c.id === cId);
    const enrollment = userEnrollment || rawCourse?.enrollment || {};

    const status = enrollment.status || 'NOT_STARTED';
    const pct = enrollment.progressPercent || 0;
    totalPctSum += pct;

    if (status === 'COMPLETED' || pct >= 100) {
      completedCount += 1;
    } else if (status === 'IN_PROGRESS' || pct > 0) {
      inProgressCount += 1;
    }
  });

  const totalCourses = courseIds.length;
  const progressPercent = totalCourses > 0 ? Math.round(totalPctSum / totalCourses) : 0;
  
  let status = 'NOT_STARTED';
  if (completedCount === totalCourses) {
    status = 'COMPLETED';
  } else if (completedCount > 0 || inProgressCount > 0 || progressPercent > 0) {
    status = 'IN_PROGRESS';
  }

  return {
    totalCourses,
    completedCourses: completedCount,
    inProgressCourses: inProgressCount,
    progressPercent,
    status,
  };
}

/**
 * Builds a summary string of the audiences a curriculum is allocated to.
 */
export function assignmentTargetSummary(curriculum) {
  const assignments = curriculum?.assignments || [];
  if (assignments.length === 0) return 'No audience allocated';

  const labels = assignments.map((a) => {
    if (a.targetLabel) return a.targetLabel;
    const opts = targetOptionsFor(a.assignmentType) || [];
    const found = opts.find((o) => o.id === a.targetId);
    return found ? found.label : `${assignmentTypeLabel(a.assignmentType)}: ${a.targetId}`;
  });

  if (labels.length === 1) return labels[0];
  return `${labels[0]} (+${labels.length - 1} more)`;
}

/**
 * Finds the display label for a target ID by type.
 */
export function resolveTargetLabel(assignmentType, targetId) {
  const opts = targetOptionsFor(assignmentType) || [];
  const found = opts.find((o) => o.id === targetId);
  return found ? found.label : targetId;
}

// ---------------------------------------------------------------------------
// Curriculum permissions — the SINGLE source of truth for the question
// "which curricula this role sees and what they may do with them", shared by
// AdminCourses, LearnerCourses and the HRBP's Curriculum tab.
//
//   MANAGE_ALL    (User Admin, SysAdmin) — sees every curriculum including drafts,
//                 full rights to create/edit/delete and allocate directly.
//   VIEW_ALL      (HRBP) — sees every published curriculum but READ-ONLY;
//                 they may nominate talent candidates to enrol (subject to approval).
//   ASSIGNED_ONLY (Learner, Manager, Trainer/L&D) — sees only the curricula
//                 that User Admin/SysAdmin allocated to them.
// ---------------------------------------------------------------------------
export const CURRICULUM_ACCESS_MODE = {
  MANAGE_ALL: 'MANAGE_ALL',
  VIEW_ALL: 'VIEW_ALL',
  ASSIGNED_ONLY: 'ASSIGNED_ONLY',
};

export function curriculumAccessOf(user) {
  const role = normalizeRole(user?.role);
  const canEdit = hasCapability(role, 'canManageCurriculum');
  const canPropose = !canEdit && hasCapability(role, 'canProposeCurriculum');
  const mode = canEdit
    ? CURRICULUM_ACCESS_MODE.MANAGE_ALL
    : canPropose
      ? CURRICULUM_ACCESS_MODE.VIEW_ALL
      : CURRICULUM_ACCESS_MODE.ASSIGNED_ONLY;
  return {
    mode,
    role,
    canEdit,
    canDirectAssign: canEdit,
    canPropose,
    canSeeDrafts: canEdit,
  };
}

/** The curricula `user` may SEE, following the 3 modes above. */
export function visibleCurriculaFor(curricula = [], user) {
  if (!Array.isArray(curricula)) return [];
  const { mode } = curriculumAccessOf(user);
  if (mode === CURRICULUM_ACCESS_MODE.MANAGE_ALL) return curricula;
  if (mode === CURRICULUM_ACCESS_MODE.VIEW_ALL) return curricula.filter((c) => c.status === 'PUBLISHED');
  return getAssignedCurriculaForUser(curricula, user);
}

/**
 * Two curriculum groups for the HRBP's filter:
 *   mine     — the HRBP's own curricula as a learner (allocated to them).
 *   proposed — curricula the HRBP proposed for other people, together with the proposal
 *              (`request`) so the Pending / Approved / Rejected status can be shown.
 *
 * `proposed` is traced through BOTH sources: requests in `approvals` (still pending or
 * rejected) and `assignments[].proposedBy` (approved requests written onto the
 * curriculum) — because after approval, `assignedBy` is the APPROVER, not the HRBP.
 */
export function hrbpCurriculumBuckets(curricula = [], user, approvals = []) {
  const mine = getAssignedCurriculaForUser(curricula, user);
  const uid = user?.userId;
  if (!uid) return { mine, proposed: [] };

  const myRequests = (approvals || []).filter(
    (a) => a.requestType === 'CURRICULUM_ASSIGNMENT' && a.requesterId === uid
  );

  const proposed = [];
  const seen = new Set();
  const pushOnce = (cur, request, assignment) => {
    const key = `${cur.id}::${request?.id || assignment?.id}`;
    if (seen.has(key)) return;
    seen.add(key);
    proposed.push({ ...cur, proposalRequest: request || null, proposalAssignment: assignment || null });
  };

  myRequests.forEach((req) => {
    const cur = curricula.find((c) => c.id === req.curriculumId);
    if (cur) pushOnce(cur, req, null);
  });

  curricula.forEach((cur) => {
    (cur.assignments || []).forEach((asg) => {
      if (asg.proposedBy !== uid) return;
      const linked = myRequests.find((r) => r.id === asg.sourceRequestId);
      if (linked) return; // already added in the previous pass through that same request
      pushOnce(cur, null, asg);
    });
  });

  return { mine, proposed };
}
