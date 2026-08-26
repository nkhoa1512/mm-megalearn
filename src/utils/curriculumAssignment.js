import { targetOptionsFor, assignmentTypeLabel } from '../data/assignmentTargets';

/**
 * Kiểm tra xem một giáo trình (Curriculum) có được phân bổ cho người dùng `user` hay không.
 * Đối chiếu theo danh sách `curriculum.assignments`:
 * - BUSINESS_UNIT: khớp `user.businessUnitId` hoặc 'ALL' / 'bu-mmvn'
 * - DIVISION: khớp `user.divisionId` hoặc `user.divisionCode`
 * - DEPARTMENT: khớp `user.departmentId` hoặc `user.departmentCode`
 * - SUBDEPARTMENT: khớp `user.subDepartmentId` hoặc `user.subDepartmentCode`
 * - AREA: khớp `user.areaId`
 * - STORE: khớp `user.storeId`
 * - STORE_TYPE: khớp `user.storeTypeId`
 * - CLUSTER: khớp `user.clusterId`
 * - LEVEL: khớp `user.level`
 * - ROLE: khớp `user.role`
 * - USER: khớp `user.userId` hoặc `user.employeeCode`
 */
export function isCurriculumAssignedToUser(curriculum, user) {
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

  for (const asg of assignments) {
    const type = asg.assignmentType;
    const targetId = asg.targetId || asg.targetValue;
    if (!targetId) continue;

    let matched = false;
    switch (type) {
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
 * Lấy danh sách tất cả các giáo trình Published được gán cho `user`.
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
 * Tính toán tiến độ học tập của một user đối với một giáo trình.
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
 * Sinh chuỗi mô tả tóm tắt đối tượng đã phân bổ cho giáo trình.
 */
export function assignmentTargetSummary(curriculum) {
  const assignments = curriculum?.assignments || [];
  if (assignments.length === 0) return 'Chưa phân bổ đối tượng';

  const labels = assignments.map((a) => {
    if (a.targetLabel) return a.targetLabel;
    const opts = targetOptionsFor(a.assignmentType) || [];
    const found = opts.find((o) => o.id === a.targetId);
    return found ? found.label : `${assignmentTypeLabel(a.assignmentType)}: ${a.targetId}`;
  });

  if (labels.length === 1) return labels[0];
  return `${labels[0]} (+${labels.length - 1} đối tượng khác)`;
}

/**
 * Tìm label hiển thị cho một target ID theo type.
 */
export function resolveTargetLabel(assignmentType, targetId) {
  const opts = targetOptionsFor(assignmentType) || [];
  const found = opts.find((o) => o.id === targetId);
  return found ? found.label : targetId;
}
