import { ASSESSMENT_TYPES, DELIVERY_FORMATS, QUESTION_TYPES } from '../data/assessmentData';
import { normalizeRole, hasCapability } from '../data/roles';
import { checkCourseAccessRule, ACCESS_STATE } from '../data/levelSystem';

export const ASSESSMENT_GROUP_BY_OPTIONS = [
  { id: 'NONE', label: 'No Grouping' },
  { id: 'CATEGORY', label: 'Category' },
  { id: 'TYPE', label: 'Type (Quiz / Assignment / Survey)' },
  { id: 'DELIVERY_FORMAT', label: 'Form (Standalone / Course-linked)' },
  { id: 'STATUS', label: 'Status (Published / Draft)' },
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
 * Checks whether a standalone assessment is allocated to a user.
 */
export function isAssessmentAssignedToUser(assessment, user) {
  if (!assessment || !user) return { isAssigned: false, isPublic: false, assignment: null };
  const assignments = assessment.assignments || [];
  if (assignments.length === 0) {
    // If no assignment is set: treat it as unassigned unless it is Public
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
 * Verifies a user's right to access and take an assessment.
 */
export function getAssessmentAccess(assessment, user, courses = []) {
  const role = normalizeRole(user?.role);
  const isSysOrUserAdmin = role === 'sysadmin' || role === 'useradmin';

  if (!assessment) {
    return { canTake: false, isLocked: true, reason: 'The assessment does not exist' };
  }

  // SysAdmin & UserAdmin always have the right to view and trial it
  if (isSysOrUserAdmin) {
    return {
      canTake: true,
      isLocked: false,
      isPublic: true,
      isAssigned: true,
      isAdminPreview: true,
      reason: 'Administrators have full access & trial rights',
    };
  }

  // Trainer: allowed if they are the author or the assessment belongs to a course they lead
  if (role === 'trainer') {
    if (assessment.createdBy === user?.userId) {
      return {
        canTake: true,
        isLocked: false,
        isAssigned: true,
        reason: 'You are the trainer / author responsible for this assessment',
      };
    }
  }

  // 1. Standalone Assessment
  if (assessment.deliveryFormat === DELIVERY_FORMATS.STANDALONE) {
    const { isAssigned, isPublic, assignment } = isAssessmentAssignedToUser(assessment, user);
    if (isPublic || isAssigned) {
      return {
        canTake: true,
        isLocked: false,
        isPublic,
        isAssigned,
        assignment,
        reason: isPublic ? 'A test open to every employee' : 'This test has been allocated to you',
      };
    }
    return {
      canTake: false,
      isLocked: true,
      isPublic: false,
      isAssigned: false,
      reason: 'This assessment is not for you (it has not been allocated by unit / level / individual)',
    };
  }

  // 2. Course-linked Assessment
  if (assessment.deliveryFormat === DELIVERY_FORMATS.COURSE_LINKED) {
    const linkedCourse = (courses || []).find((c) => c.id === assessment.courseId);
    if (!linkedCourse) {
      return {
        canTake: false,
        isLocked: true,
        linkedCourse: null,
        reason: 'The linked course is not ready or has been archived',
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
        reason: isOptional ? 'An optional course open for you to join' : 'You are eligible to take the course and sit the test',
      };
    }

    return {
      canTake: false,
      isLocked: true,
      linkedCourse,
      isOptional: false,
      reason: `This course/assessment is outside your training scope (${accessRule.reason || 'Locked by job level / allocation'})`,
    };
  }

  return { canTake: false, isLocked: true, reason: 'Access rights undetermined' };
}

/**
 * Filter the assessment list
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
 * Group the assessment list
 */
export function buildAssessmentGroups(assessments = [], groupBy = 'NONE', questionBankMap = {}) {
  if (groupBy === 'NONE') {
    return [{ id: 'ALL', title: 'All Tests & Surveys', items: assessments }];
  }

  const groupsMap = new Map();

  assessments.forEach((asm) => {
    let key = 'Other';
    let label = 'Other';

    if (groupBy === 'CATEGORY') {
      key = asm.category || 'Chung';
      label = asm.category || 'Chung';
    } else if (groupBy === 'TYPE') {
      key = asm.type || 'QUIZ';
      label = asm.type === ASSESSMENT_TYPES.QUIZ ? '📝 Quiz'
        : asm.type === ASSESSMENT_TYPES.ASSIGNMENT ? '📂 Essay Assignment'
        : '📊 Survey';
    } else if (groupBy === 'DELIVERY_FORMAT') {
      key = asm.deliveryFormat || DELIVERY_FORMATS.STANDALONE;
      label = asm.deliveryFormat === DELIVERY_FORMATS.STANDALONE ? '🎯 Standalone Assessment' : '🔗 Course-linked';
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
