// ===========================================================================
// MM MegaLearn - 6 Role Phân Cấp (rank 1 = thấp nhất, rank 6 = cao nhất)
//
//   User Learner -> Manager -> Trainer / L&D -> HRBP -> User Admin -> System Admin (IT)
//
// Cả 6 role đều là Learner: mọi role đều có cổng học tập cá nhân.
// Mỗi role quản lý được toàn bộ các role có rank thấp hơn (Cascading Hierarchy).
// ===========================================================================

export const ROLE_DEFINITIONS = [
  {
    id: 'learner',
    rank: 1,
    labelVi: 'Nhân Viên / Học Viên (User Learner)',
    labelEn: 'User Learner',
    shortVi: 'Học Viên',
    defaultLevel: '7',
    icon: 'ti-user',
    tone: 'rail',
    home: '/learner',
    summaryVi: 'Học các khóa thuộc cấp bậc của mình và gửi đơn xin học vượt đúng 1 cấp liền kề.',
    capabilities: ['canLearn', 'canRequestLevelSkip', 'canViewCsat'],
  },
  {
    id: 'manager',
    rank: 2,
    labelVi: 'Quản Lý Trực Tiếp (Manager)',
    labelEn: 'Line Manager',
    shortVi: 'Quản Lý',
    defaultLevel: '4',
    icon: 'ti-briefcase',
    tone: 'amber',
    home: '/manager',
    summaryVi: 'Quản lý nhân viên phòng ban và theo dõi tiến độ học tập của đội ngũ.',
    // Duyệt đơn học vượt cấp KHÔNG còn ở Manager — chỉ User Admin/SysAdmin
    // mới thấy và duyệt (xem roles useradmin/sysadmin bên dưới).
    capabilities: ['canLearn', 'canRequestLevelSkip', 'canViewTeam', 'canViewCsat'],
  },
  {
    id: 'trainer',
    rank: 3,
    labelVi: 'Giảng Viên / L&D (Trainer)',
    labelEn: 'Trainer / L&D',
    shortVi: 'Giảng Viên',
    defaultLevel: '3',
    icon: 'ti-school',
    tone: 'sage',
    home: '/trainer',
    summaryVi: 'Tạo khóa học trực tiếp, đứng lớp, chiếu Live QR điểm danh và theo dõi CSAT.',
    capabilities: [
      'canLearn', 'canRequestLevelSkip', 'canViewTeam',
      // Trainer/L&D chỉ tạo được khóa Trực Tiếp (tự dạy) — không có
      // canAuthorOnlineCourses, không có canAssignTrainers (chỉ tự đứng lớp).
      // Không duyệt đơn học vượt cấp — chỉ User Admin/SysAdmin mới duyệt.
      'canAuthorOfflineCourses', 'canTeach', 'canBeAssignedToClass', 'canManageAttendance', 'canViewCsat',
    ],
  },
  {
    id: 'hrbp',
    rank: 4,
    labelVi: 'Đối Tác Nhân Sự (HRBP)',
    labelEn: 'HR Business Partner',
    shortVi: 'HRBP',
    defaultLevel: '2',
    icon: 'ti-users',
    tone: 'blue',
    home: '/hrbp',
    summaryVi: 'Phân tích Skill Gap, quy hoạch kế nhiệm 70-20-10 và giám sát tuân thủ theo vùng.',
    capabilities: [
      'canLearn', 'canRequestLevelSkip', 'canViewTeam',
      'canViewOrgProgress', 'canManageSkillMatrix', 'canManageSuccession', 'canViewCsat',
      // HRBP không có quyền tạo khóa học (online lẫn offline) — chỉ có thể
      // được User Admin/SysAdmin phân công đứng lớp các khóa cấp cao.
      // Không duyệt đơn học vượt cấp — chỉ User Admin/SysAdmin mới duyệt.
      'canTeach', 'canBeAssignedToClass', 'canManageAttendance',
      // Giáo trình: HRBP CHỈ được xem (không sửa/xóa) và đề xuất ứng viên nhân
      // tài vào học — đề xuất phải qua User Admin/SysAdmin duyệt mới có hiệu lực.
      'canProposeCurriculum',
    ],
  },
  {
    id: 'useradmin',
    rank: 5,
    labelVi: 'Quản Trị Nhân Sự (User Admin)',
    labelEn: 'User Administrator',
    shortVi: 'User Admin',
    defaultLevel: '2',
    icon: 'ti-users-group',
    tone: 'blue',
    home: '/user-admin',
    summaryVi: 'Quản trị hồ sơ 100+ nhân sự, phân bổ khóa học và phân công Giảng viên đứng lớp.',
    capabilities: [
      'canLearn', 'canRequestLevelSkip', 'canApproveLevelSkip', 'canViewTeam',
      'canViewOrgProgress', 'canManageUsers', 'canAllocateCourses',
      'canAssignTrainers', 'canConfigureOrg', 'canViewCsat',
      // Toàn quyền tạo cả khóa Online lẫn Offline, và có thể tự đứng lớp.
      'canAuthorOnlineCourses', 'canAuthorOfflineCourses', 'canTeach', 'canBeAssignedToClass', 'canManageAttendance',
      // Chỉ User Admin & SysAdmin cấu hình Lộ trình Cấp bậc (Tab 1/Tab 2).
      'canManageLevelRoadmaps',
      // Chỉ User Admin & SysAdmin được tạo/sửa/xóa Giáo trình và phân bổ trực
      // tiếp cho đối tượng học — các role khác chỉ xem phần được phân bổ.
      'canManageCurriculum',
      // User Admin & SysAdmin đều toàn quyền tạo cả 3 hình thức khóa học
      // (E-Learning, Virtual Class Zoom/Teams, In-Person ILT) và chỉ định
      // Giảng viên chủ trì — Trainer/L&D chỉ tạo được khóa Trực Tiếp (tự dạy).
      'canCreateVirtualClass',
    ],
  },
  {
    id: 'sysadmin',
    rank: 6,
    labelVi: 'Quản Trị Hệ Thống IT (System Admin)',
    labelEn: 'System Administrator (IT)',
    shortVi: 'System Admin',
    defaultLevel: '1',
    icon: 'ti-shield-lock',
    tone: 'rust',
    home: '/sysadmin',
    summaryVi: 'Toàn quyền hạ tầng, API, audit log ISO 27001 và quản trị mọi role kể cả User Admin.',
    capabilities: [
      'canLearn', 'canRequestLevelSkip', 'canApproveLevelSkip', 'canViewTeam',
      'canViewOrgProgress', 'canManageUsers', 'canAllocateCourses',
      'canAssignTrainers', 'canConfigureOrg', 'canConfigureSystem', 'canViewAuditLogs',
      'canManageAllRoles', 'canDevelopPlatform', 'canViewCsat',
      'canAuthorOnlineCourses', 'canAuthorOfflineCourses', 'canTeach', 'canBeAssignedToClass', 'canManageAttendance',
      'canManageLevelRoadmaps', 'canManageCurriculum',
      // Toàn quyền tạo cả 3 hình thức khóa học (E-Learning, Virtual Class
      // Zoom/Teams, In-Person ILT) và chỉ định Giảng viên chủ trì — như User Admin.
      'canCreateVirtualClass',
    ],
  },
];

export const ROLE_ORDER = ROLE_DEFINITIONS.map((r) => r.id);

// Role cũ trong dữ liệu/localStorage được quy về mô hình 6 role.
// `admin` (L&D Admin) trở thành `trainer` (Trainer / L&D) theo kiến trúc mới.
export const LEGACY_ROLE_ALIAS = {
  admin: 'trainer',
  lnd: 'trainer',
  'l&d': 'trainer',
  instructor: 'trainer',
  employee: 'learner',
  student: 'learner',
  it: 'sysadmin',
};

/** Chuẩn hóa role bất kỳ về 1 trong 6 roleId hợp lệ. */
export function normalizeRole(role) {
  if (!role) return 'learner';
  const raw = String(role).trim().toLowerCase();
  if (ROLE_ORDER.includes(raw)) return raw;
  return LEGACY_ROLE_ALIAS[raw] || 'learner';
}

export function roleDefinition(role) {
  const id = normalizeRole(role);
  return ROLE_DEFINITIONS.find((r) => r.id === id) || ROLE_DEFINITIONS[0];
}

export function roleRank(role) {
  return roleDefinition(role).rank;
}

export function roleLabel(role) {
  return roleDefinition(role).labelVi;
}

export const ROLE_HOME = ROLE_DEFINITIONS.reduce((acc, r) => {
  acc[r.id] = r.home;
  return acc;
}, {});

/** Trả về mảng roleId mà `role` được phép quản lý (mọi rank thấp hơn). */
export function managedRolesOf(role) {
  const rank = roleRank(role);
  return ROLE_DEFINITIONS.filter((r) => r.rank < rank).map((r) => r.id);
}

/** `actorRole` có quản lý được `targetRole` không? */
export function canManage(actorRole, targetRole) {
  return roleRank(actorRole) > roleRank(targetRole);
}

export function capabilitiesOf(role) {
  return roleDefinition(role).capabilities;
}

export function hasCapability(role, capability) {
  return capabilitiesOf(role).includes(capability);
}

/** Được tạo khóa học ở bất kỳ hình thức nào (Online hoặc Offline/ILT)? Dùng để
 *  quyết định có hiện nút "Tạo Khóa Học Mới" hay không. */
export function canAuthorAnyCourse(role) {
  return hasCapability(role, 'canAuthorOnlineCourses') || hasCapability(role, 'canAuthorOfflineCourses');
}

/** Được xem TOÀN BỘ danh mục Giáo trình (không chỉ phần được phân bổ cho mình)?
 *  User Admin/SysAdmin xem để quản trị; HRBP xem để đề xuất ứng viên nhân tài.
 *  Learner/Manager/Trainer chỉ thấy giáo trình đã được phân bổ cho chính họ. */
export function canSeeAllCurricula(role) {
  return hasCapability(role, 'canManageCurriculum') || hasCapability(role, 'canProposeCurriculum');
}

/** Nhãn mô tả phạm vi quản lý, dùng cho header các trang team/scope. */
export function managedScopeLabel(role) {
  const managed = managedRolesOf(role);
  if (managed.length === 0) return 'Không quản lý nhân sự khác (chỉ hồ sơ học tập cá nhân)';
  return managed.map((id) => roleDefinition(id).shortVi).join(', ');
}
