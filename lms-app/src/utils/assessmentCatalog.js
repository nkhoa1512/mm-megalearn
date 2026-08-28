import { ASSESSMENT_TYPES, DELIVERY_FORMATS, QUESTION_TYPES } from '../data/assessmentData';
import { normalizeRole, hasCapability } from '../data/roles';
import { checkCourseAccessRule, ACCESS_STATE } from '../data/levelSystem';

export const ASSESSMENT_GROUP_BY_OPTIONS = [
  { id: 'NONE', label: 'Không Gộp Nhóm' },
  { id: 'CATEGORY', label: 'Lĩnh Vực (Category)' },
  { id: 'TYPE', label: 'Loại Hình (Quiz / Assignment / Survey)' },
  { id: 'DELIVERY_FORMAT', label: 'Hình Thức (Độc Lập / Gắn Khóa Học)' },
  { id: 'STATUS', label: 'Trạng Thái (Published / Draft)' },
];

function stripDiacritics(str) {
  return (str || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

export function generateAssessmentCode(title = '', existingCodes = []) {
  const clean = stripDiacritics(title)
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .trim();
  const words = clean.split(/\s+/).filter(Boolean);
  let prefix = words.map((w) => w[0].toUpperCase()).join('').slice(0, 6);
  if (!prefix) prefix = 'ASM';
  if (!prefix.startsWith('ASM')) prefix = `ASM-${prefix}`;

  const existingSet = new Set((existingCodes || []).map((c) => (c || '').toUpperCase()));
  let candidate = '';
  let attempts = 0;
  do {
    const num = Math.floor(Math.random() * 900) + 100;
    candidate = `${prefix}-${String(num)}`;
    attempts++;
  } while (existingSet.has(candidate) && attempts < 200);
  return candidate;
}

/**
 * Kiểm tra xem một Assessment Độc Lập có phân bổ cho người dùng hay không.
 */
export function isAssessmentAssignedToUser(assessment, user) {
  if (!assessment || !user) return { isAssigned: false, isPublic: false, assignment: null };
  const assignments = assessment.assignments || [];
  if (assignments.length === 0) {
    // Nếu không có assignment nào được set: mặc định coi như unassigned trừ khi là Public
    return { isAssigned: false, isPublic: false, assignment: null };
  }

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
    if (type === 'ALL' || targetId === 'ALL') {
      return { isAssigned: true, isPublic: true, assignment: asg };
    }
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
      return { isAssigned: true, isPublic: false, assignment: asg };
    }
  }

  return { isAssigned: false, isPublic: false, assignment: null };
}

/**
 * Thẩm định quyền truy cập & làm bài của User đối với một Assessment.
 */
export function getAssessmentAccess(assessment, user, courses = []) {
  const role = normalizeRole(user?.role);
  const isSysOrUserAdmin = role === 'sysadmin' || role === 'useradmin';

  if (!assessment) {
    return { canTake: false, isLocked: true, reason: 'Assessment không tồn tại' };
  }

  // SysAdmin & UserAdmin luôn có quyền xem và thi thử
  if (isSysOrUserAdmin) {
    return {
      canTake: true,
      isLocked: false,
      isPublic: true,
      isAssigned: true,
      isAdminPreview: true,
      reason: 'Quản trị viên toàn quyền truy cập & thử nghiệm',
    };
  }

  // Trainer: Có quyền nếu là người tạo hoặc assessment thuộc khóa do Trainer phụ trách
  if (role === 'trainer') {
    if (assessment.createdBy === user?.userId) {
      return {
        canTake: true,
        isLocked: false,
        isAssigned: true,
        reason: 'Bạn là Giảng viên / Tác giả phụ trách assessment này',
      };
    }
  }

  // 1. Assessment Độc lập (Standalone)
  if (assessment.deliveryFormat === DELIVERY_FORMATS.STANDALONE) {
    const { isAssigned, isPublic, assignment } = isAssessmentAssignedToUser(assessment, user);
    if (isPublic || isAssigned) {
      return {
        canTake: true,
        isLocked: false,
        isPublic,
        isAssigned,
        assignment,
        reason: isPublic ? 'Bài kiểm tra công khai cho mọi nhân viên' : 'Bạn đã được phân bổ bài kiểm tra này',
      };
    }
    return {
      canTake: false,
      isLocked: true,
      isPublic: false,
      isAssigned: false,
      reason: 'Assessment không dành cho bạn (Chưa được phân bổ theo Đơn vị / Cấp bậc / Cá nhân)',
    };
  }

  // 2. Assessment Theo Khóa Học (Course-linked)
  if (assessment.deliveryFormat === DELIVERY_FORMATS.COURSE_LINKED) {
    const linkedCourse = (courses || []).find((c) => c.id === assessment.courseId);
    if (!linkedCourse) {
      return {
        canTake: false,
        isLocked: true,
        linkedCourse: null,
        reason: 'Khóa học liên kết chưa sẵn sàng hoặc đã lưu trữ',
      };
    }

    const accessRule = checkCourseAccessRule(linkedCourse, user);
    const isOptional = linkedCourse.isMandatory === false || linkedCourse.targetJobLevel === null;

    if (accessRule.state === ACCESS_STATE.UNLOCKED || isOptional) {
      return {
        canTake: true,
        isLocked: false,
        linkedCourse,
        isOptional,
        reason: isOptional ? 'Khóa học tự chọn mở cho bạn tham gia' : 'Bạn đủ điều kiện tham gia khóa học và làm bài kiểm tra',
      };
    }

    return {
      canTake: false,
      isLocked: true,
      linkedCourse,
      isOptional: false,
      reason: `Khóa học/Assessment này không thuộc phạm vi đào tạo của bạn (${accessRule.reason || 'Bị khóa theo cấp bậc / phân bổ'})`,
    };
  }

  return { canTake: false, isLocked: true, reason: 'Chưa xác định quyền truy cập' };
}

/**
 * Filter danh sách Assessment
 */
export function filterAssessments(assessments = [], {
  search = '',
  selectedType = 'ALL',
  selectedFormat = 'ALL',
  selectedCategory = 'ALL',
  selectedStatus = 'ALL',
  currentUser = null,
  courses = [],
} = {}) {
  const query = search.trim().toLowerCase();

  return assessments.filter((asm) => {
    if (query) {
      const matchTitle = (asm.title || '').toLowerCase().includes(query);
      const matchCode = (asm.code || '').toLowerCase().includes(query);
      const matchDesc = (asm.description || '').toLowerCase().includes(query);
      const matchCat = (asm.category || '').toLowerCase().includes(query) ||
        (asm.categories && asm.categories.some((c) => c.toLowerCase().includes(query)));
      const matchCourses = (asm.courseTitle || '').toLowerCase().includes(query) ||
        (asm.courseIds && asm.courseIds.some((cid) => cid.toLowerCase().includes(query)));
      if (!matchTitle && !matchCode && !matchDesc && !matchCat && !matchCourses) return false;
    }

    if (selectedType !== 'ALL') {
      const typesList = asm.types || (asm.type ? [asm.type] : []);
      if (!typesList.includes(selectedType)) return false;
    }

    if (selectedFormat !== 'ALL' && asm.deliveryFormat !== selectedFormat) return false;

    if (selectedCategory !== 'ALL') {
      const catsList = asm.categories || (asm.category ? [asm.category] : []);
      if (!catsList.includes(selectedCategory)) return false;
    }

    if (selectedStatus !== 'ALL' && asm.status !== selectedStatus) return false;

    return true;
  });
}

/**
 * Group By danh sách Assessment
 */
export function buildAssessmentGroups(assessments = [], groupBy = 'NONE', questionBankMap = {}) {
  if (groupBy === 'NONE') {
    return [{ id: 'ALL', title: 'Tất Cả Bài Kiểm Tra & Khảo Sát', items: assessments }];
  }

  const groupsMap = new Map();

  assessments.forEach((asm) => {
    let key = 'Khác';
    let label = 'Khác';

    if (groupBy === 'CATEGORY') {
      key = asm.category || 'Chung';
      label = asm.category || 'Chung';
    } else if (groupBy === 'TYPE') {
      key = asm.type || 'QUIZ';
      label = asm.type === ASSESSMENT_TYPES.QUIZ ? '📝 Trắc Nghiệm / Quiz'
        : asm.type === ASSESSMENT_TYPES.ASSIGNMENT ? '📂 Bài Tập Tự Luận / Assignment'
        : '📊 Khảo Sát / Survey';
    } else if (groupBy === 'DELIVERY_FORMAT') {
      key = asm.deliveryFormat || DELIVERY_FORMATS.STANDALONE;
      label = asm.deliveryFormat === DELIVERY_FORMATS.STANDALONE ? '🎯 Assessment Độc Lập' : '🔗 Gắn Khóa Học (Course-linked)';
    } else if (groupBy === 'STATUS') {
      key = asm.status || 'PUBLISHED';
      label = asm.status === 'PUBLISHED' ? '🟢 Published' : '⚪ Draft';
    }

    if (!groupsMap.has(key)) {
      groupsMap.set(key, { id: key, title: label, items: [] });
    }
    groupsMap.get(key).items.push(asm);
  });

  return Array.from(groupsMap.values());
}
