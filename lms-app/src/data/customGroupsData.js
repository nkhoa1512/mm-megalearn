// ===========================================================================
// MM Mega Market Vietnam (MMVN) - Customized User Groups
// Enables User Admin to create and manage custom cohorts for batch assignments
// across Curriculum, Courses, Assessments, and Targeted Learning Tracks.
// ===========================================================================

export const DEFAULT_CUSTOM_GROUPS = [
  {
    id: 'grp-expat',
    code: 'ALL_EXPAT',
    title: 'ALL_EXPAT',
    name: 'ALL_EXPAT',
    description: 'All foreign experts and expatriate staff working at MM Mega Market Vietnam.',
    type: 'MANUAL',
    category: 'SPECIAL_COHORT',
    criteria: {
      businessUnitId: 'bu-mmvn',
      divisionId: null,
      departmentId: null,
      subDepartmentId: null,
      level: null,
      role: null,
    },
    memberUserIds: ['USR-1004', 'USR-1008', 'USR-1015', 'USR-1022', 'USR-1033', 'USR-1045', 'USR-1060', 'USR-1078', 'USR-1092', 'USR-1105'],
    memberCount: 10,
    lastProcessed: '4:56 PM 5/15/2026',
    createdAt: '2024-05-15T16:56:00Z',
    createdBy: 'USR-9002 (Phạm Thanh Thảo)',
    badgeColor: '#6366F1',
  },
  {
    id: 'grp-vn-all',
    code: 'ALL_VIETNAMESE_EMPLOYEES_ONLY',
    title: 'ALL_VIETNAMESE_EMPLOYEES_ONLY',
    name: 'ALL_VIETNAMESE_EMPLOYEES_ONLY',
    description: 'All Vietnamese-national employees across the full network of 42 stores and offices.',
    type: 'DYNAMIC',
    category: 'DEMOGRAPHIC',
    criteria: {
      businessUnitId: 'bu-mmvn',
      divisionId: null,
      departmentId: null,
      subDepartmentId: null,
      level: null,
      role: null,
    },
    memberUserIds: [], // Dynamically evaluates to all users except expats
    memberCount: 140,
    lastProcessed: '10:20 AM 1/2/2026',
    createdAt: '2024-01-02T10:20:00Z',
    createdBy: 'USR-9002 (Phạm Thanh Thảo)',
    badgeColor: '#0EA5E9',
  },
  {
    id: 'grp-vn-sustainability',
    code: 'ALL_VIETNAMESE_EMPLOYEES_ONLY_SUSTAINABILITY',
    title: 'ALL_VIETNAMESE_EMPLOYEES_ONLY_SUSTAINABILITY',
    name: 'ALL_VIETNAMESE_EMPLOYEES_ONLY_SUSTAINABILITY',
    description: 'Staff enrolled in the Sustainability, Green Energy & ESG 2026 program.',
    type: 'DYNAMIC',
    category: 'STRATEGIC_INITIATIVE',
    criteria: {
      businessUnitId: 'bu-mmvn',
      divisionId: null,
      departmentId: null,
      subDepartmentId: null,
      level: null,
      role: null,
    },
    memberUserIds: ['USR-0001', 'USR-0245', 'USR-0312', 'USR-1042', 'USR-1250', 'USR-2041', 'USR-9001', 'USR-9002', 'USR-9003', 'USR-9004', 'USR-9005', 'USR-9006', 'USR-1002', 'USR-1003', 'USR-1005', 'USR-1007', 'USR-1010', 'USR-1012', 'USR-1018', 'USR-1025'],
    memberCount: 20,
    lastProcessed: '2:28 PM 4/26/2026',
    createdAt: '2024-04-26T14:28:00Z',
    createdBy: 'USR-9002 (Phạm Thanh Thảo)',
    badgeColor: '#10B981',
  },
  {
    id: 'grp-new-joiners',
    code: 'NEW_COMERS_PROGRAM',
    title: 'Program for new employees',
    name: 'Program for new employees',
    description: 'New hires under 6 months — enrolled in the MMVN Culture & Safety Onboarding roadmap.',
    type: 'DYNAMIC',
    category: 'ONBOARDING',
    criteria: {
      businessUnitId: 'bu-mmvn',
      divisionId: null,
      departmentId: null,
      subDepartmentId: null,
      level: '7',
      role: null,
    },
    memberUserIds: ['USR-1042', 'USR-1001', 'USR-1002', 'USR-1003', 'USR-1004', 'USR-1005', 'USR-1006', 'USR-1007', 'USR-1008', 'USR-1009', 'USR-1010', 'USR-1011', 'USR-1012', 'USR-1013', 'USR-1014', 'USR-1015', 'USR-1016', 'USR-1017', 'USR-1018', 'USR-1019', 'USR-1020', 'USR-1021', 'USR-1022', 'USR-1023'],
    memberCount: 24,
    lastProcessed: '10:05 AM 8/29/2026',
    createdAt: '2026-08-29T10:05:00Z',
    createdBy: 'USR-0001 (Sarah Nguyen)',
    badgeColor: '#F59E0B',
  },
  {
    id: 'grp-hod',
    code: 'HEAD_OF_DEPARTMENT',
    title: 'Head of Department',
    name: 'Head of Department & Section Managers',
    description: 'Head Office department heads and store counter/category managers (Level 3 - 4).',
    type: 'DYNAMIC',
    category: 'LEADERSHIP',
    criteria: {
      businessUnitId: 'bu-mmvn',
      divisionId: null,
      departmentId: null,
      subDepartmentId: null,
      level: '4',
      role: null,
    },
    memberUserIds: ['USR-0312', 'USR-2041', 'USR-1024', 'USR-1025', 'USR-1026', 'USR-1027', 'USR-1028', 'USR-1029', 'USR-1030', 'USR-1031', 'USR-1032', 'USR-1033', 'USR-1034', 'USR-1035', 'USR-1036', 'USR-1037', 'USR-1038', 'USR-1039'],
    memberCount: 18,
    lastProcessed: '11:10 AM 1/18/2026',
    createdAt: '2022-01-18T11:10:00Z',
    createdBy: 'USR-9002 (Phạm Thanh Thảo)',
    badgeColor: '#8B5CF6',
  },
  {
    id: 'grp-dc-ops',
    code: 'DC_GROUP',
    title: 'DC Group',
    name: 'DC & Supply Chain Logistics Ops Group',
    description: 'Distribution Center division (DC Binh Duong, DC Bac Ninh), warehousing & supply chain operations.',
    type: 'DYNAMIC',
    category: 'OPERATIONS',
    criteria: {
      businessUnitId: 'bu-mmvn',
      divisionId: 'div-scm',
      departmentId: null,
      subDepartmentId: null,
      level: null,
      role: null,
    },
    memberUserIds: ['USR-1040', 'USR-1041', 'USR-1043', 'USR-1044', 'USR-1046', 'USR-1047', 'USR-1048', 'USR-1049', 'USR-1050', 'USR-1051', 'USR-1052', 'USR-1053', 'USR-1054', 'USR-1055', 'USR-1056'],
    memberCount: 15,
    lastProcessed: '8:15 PM 12/19/2025',
    createdAt: '2022-12-19T20:15:00Z',
    createdBy: 'USR-9002 (Phạm Thanh Thảo)',
    badgeColor: '#EC4899',
  },
  {
    id: 'grp-sgm-lead',
    code: 'SGM_PORTFOLIO_LEAD',
    title: 'Store General Managers & Deputy SGMs',
    name: 'Store General Managers & Deputy SGMs',
    description: 'Store General Managers & Deputy Center Operations Directors (Level 2).',
    type: 'DYNAMIC',
    category: 'LEADERSHIP',
    criteria: {
      businessUnitId: 'bu-mmvn',
      divisionId: 'div-ops',
      departmentId: null,
      subDepartmentId: null,
      level: '2',
      role: null,
    },
    memberUserIds: ['USR-0245', 'USR-9006', 'USR-1057', 'USR-1058', 'USR-1059', 'USR-1061', 'USR-1062', 'USR-1063', 'USR-1064', 'USR-1065', 'USR-1066', 'USR-1067'],
    memberCount: 12,
    lastProcessed: '3:45 PM 6/10/2026',
    createdAt: '2023-06-10T15:45:00Z',
    createdBy: 'USR-0001 (Sarah Nguyen)',
    badgeColor: '#D97706',
  },
  {
    id: 'grp-fsh-talents',
    code: 'FRESH_BAKERY_FASTTRACK',
    title: 'Fresh Food & Bakery Fast-Track Talents',
    name: 'Fresh Food & Bakery Fast-Track Talents',
    description: 'Successor talent pool for the Fresh Food & Bakery categories (HACCP Gold Standard).',
    type: 'DYNAMIC',
    category: 'TALENT_POOL',
    criteria: {
      businessUnitId: 'bu-mmvn',
      divisionId: 'div-fsh',
      departmentId: null,
      subDepartmentId: null,
      level: null,
      role: null,
    },
    memberUserIds: ['USR-1042', 'USR-2041', 'USR-1070', 'USR-1071', 'USR-1072', 'USR-1073', 'USR-1074', 'USR-1075', 'USR-1076', 'USR-1077', 'USR-1078', 'USR-1079', 'USR-1080'],
    memberCount: 13,
    lastProcessed: '9:15 AM 7/14/2026',
    createdAt: '2024-07-14T09:15:00Z',
    createdBy: 'USR-9003 (Nguyễn Văn Hùng)',
    badgeColor: '#16A34A',
  },
  {
    id: 'grp-cashiers',
    code: 'FRONTLINE_CASHIERS_CS',
    title: 'Frontline Cashiers & Customer Service Team',
    name: 'Frontline Cashiers & Customer Service Team',
    description: 'Front-line cashier, customer service reception & O2O delivery teams.',
    type: 'DYNAMIC',
    category: 'CUSTOMER_SERVICE',
    criteria: {
      businessUnitId: 'bu-mmvn',
      divisionId: null,
      departmentId: 'dept-ops-pos',
      subDepartmentId: null,
      level: null,
      role: null,
    },
    memberUserIds: ['USR-1081', 'USR-1082', 'USR-1083', 'USR-1084', 'USR-1085', 'USR-1086', 'USR-1087', 'USR-1088', 'USR-1089', 'USR-1090', 'USR-1091', 'USR-1093', 'USR-1094', 'USR-1095', 'USR-1096', 'USR-1097'],
    memberCount: 16,
    lastProcessed: '1:30 PM 8/12/2026',
    createdAt: '2024-08-12T13:30:00Z',
    createdBy: 'USR-9004 (Lê Thị Mai)',
    badgeColor: '#06B6D4',
  },
  {
    id: 'grp-hse-safety',
    code: 'HSE_EMERGENCY_TEAM',
    title: 'HSE & Fire Safety Emergency Response Team',
    name: 'HSE & Fire Safety Emergency Response Team',
    description: 'On-site rapid response team for occupational safety, fire prevention and rescue.',
    type: 'MANUAL',
    category: 'SAFETY_COMPLIANCE',
    criteria: {
      businessUnitId: 'bu-mmvn',
      divisionId: null,
      departmentId: null,
      subDepartmentId: null,
      level: null,
      role: null,
    },
    memberUserIds: ['USR-9005', 'USR-1098', 'USR-1099', 'USR-1100', 'USR-1101', 'USR-1102', 'USR-1103', 'USR-1104', 'USR-1106', 'USR-1107', 'USR-1108'],
    memberCount: 11,
    lastProcessed: '4:10 PM 8/20/2026',
    createdAt: '2024-08-20T16:10:00Z',
    createdBy: 'USR-9005 (Vũ Đức Thành)',
    badgeColor: '#EF4444',
  },
  {
    id: 'grp-book-club',
    code: 'BOOK_CLUB_PROMOTERS',
    title: 'Book Club Members',
    name: 'Book Club Members & Promoters',
    description: 'MMVN Reading Culture Club — knowledge-sharing ambassadors promoting lifelong self-learning.',
    type: 'MANUAL',
    category: 'CULTURE_ENGAGEMENT',
    criteria: {
      businessUnitId: 'bu-mmvn',
      divisionId: null,
      departmentId: null,
      subDepartmentId: null,
      level: null,
      role: null,
    },
    memberUserIds: ['USR-0001', 'USR-9002', 'USR-9003', 'USR-9004', 'USR-1042', 'USR-2041', 'USR-1110', 'USR-1111', 'USR-1112', 'USR-1113'],
    memberCount: 10,
    lastProcessed: '10:20 AM 11/3/2025',
    createdAt: '2021-11-03T10:20:00Z',
    createdBy: 'USR-9002 (Phạm Thanh Thảo)',
    badgeColor: '#84CC16',
  },
  {
    id: 'grp-qa-inspectors',
    code: 'QA_FOOD_SAFETY_PE',
    title: 'PE TEST',
    name: 'PE TEST & Quality Assurance Inspectors',
    description: 'Quality inspection specialists covering lab sample testing and food safety monitoring across the supply chain.',
    type: 'FILE_IMPORT',
    category: 'QUALITY_ASSURANCE',
    criteria: {
      businessUnitId: 'bu-mmvn',
      divisionId: null,
      departmentId: null,
      subDepartmentId: null,
      level: null,
      role: null,
    },
    memberUserIds: ['USR-1114', 'USR-1115', 'USR-1116', 'USR-1117', 'USR-1118', 'USR-1119', 'USR-1120', 'USR-1121'],
    memberCount: 8,
    lastProcessed: '5:15 AM 1/2/2026',
    createdAt: '2024-01-02T05:15:00Z',
    createdBy: 'USR-9002 (Phạm Thanh Thảo)',
    badgeColor: '#14B8A6',
  },
];

/**
 * Resolves the list of users belonging to a Custom Group.
 * Supports all 3 forms:
 * 1. DYNAMIC (filter by BU, DIV, DEPT, SUB-DEPT, Level, Role)
 * 2. MANUAL (chosen via the memberUserIds list)
 * 3. FILE_IMPORT (imported list of employee codes / user IDs)
 */
export function resolveGroupMembers(group, allUsersList = []) {
  if (!group || !Array.isArray(allUsersList)) return [];

  const explicitIds = new Set(group.memberUserIds || []);

  // For MANUAL or FILE_IMPORT, return users matching the explicit IDs
  if (group.type === 'MANUAL' || group.type === 'FILE_IMPORT') {
    if (explicitIds.size === 0) return [];
    return allUsersList.filter((u) => explicitIds.has(u.userId) || explicitIds.has(u.employeeCode));
  }

  // For DYNAMIC, combine the filter criteria with the explicit IDs
  const { criteria = {} } = group;
  const {
    businessUnitId,
    divisionId,
    departmentId,
    subDepartmentId,
    level,
    role,
  } = criteria;

  // Filter by the defined criteria
  return allUsersList.filter((u) => {
    // Check explicit include
    if (explicitIds.has(u.userId) || explicitIds.has(u.employeeCode)) return true;

    // If no criteria are selected and there is no explicit ID, there is no match
    const hasAnyCriteria = Boolean(divisionId || departmentId || subDepartmentId || level || role);
    if (!hasAnyCriteria && explicitIds.size === 0) {
      // Special group ALL_VIETNAMESE_EMPLOYEES_ONLY (all staff except expats)
      if (group.id === 'grp-vn-all' || group.code === 'ALL_VIETNAMESE_EMPLOYEES_ONLY') {
        const expatGroup = DEFAULT_CUSTOM_GROUPS.find((g) => g.id === 'grp-expat');
        const expatSet = new Set(expatGroup?.memberUserIds || []);
        return !expatSet.has(u.userId);
      }
      return false;
    }

    if (businessUnitId && businessUnitId !== 'ALL' && businessUnitId !== 'bu-mmvn' && u.businessUnitId !== businessUnitId) {
      return false;
    }
    if (divisionId && divisionId !== 'ALL' && u.divisionId !== divisionId && u.divisionCode !== divisionId) {
      return false;
    }
    if (departmentId && departmentId !== 'ALL' && u.departmentId !== departmentId && u.departmentCode !== departmentId) {
      return false;
    }
    if (subDepartmentId && subDepartmentId !== 'ALL' && u.subDepartmentId !== subDepartmentId && u.subDepartmentCode !== subDepartmentId) {
      return false;
    }
    if (level && level !== 'ALL' && String(u.level) !== String(level)) {
      return false;
    }
    if (role && role !== 'ALL' && (u.role || '').toLowerCase() !== role.toLowerCase()) {
      return false;
    }

    return true;
  });
}

/**
 * Checks whether a given `user` belongs to `group`.
 */
export function isUserInCustomGroup(user, group, allUsersList = []) {
  if (!user || !group) return false;
  const members = resolveGroupMembers(group, allUsersList);
  const uId = user.userId;
  const uCode = user.employeeCode;
  return members.some((m) => m.userId === uId || m.employeeCode === uCode);
}
