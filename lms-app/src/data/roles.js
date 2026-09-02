// ===========================================================================
// MM MegaLearn - 6 Ranked Roles (rank 1 = lowest, rank 6 = highest)
//
//   User Learner -> Manager -> Trainer / L&D -> HRBP -> User Admin -> System Admin (IT)
//
// All 6 roles are Learners: every role has a personal learning portal.
// Each role manages every role ranked below it (Cascading Hierarchy).
// ===========================================================================

export const ROLE_DEFINITIONS = [
  {
    id: 'learner',
    rank: 1,
    labelVi: 'Employee / Learner (User Learner)',
    labelEn: 'User Learner',
    shortVi: 'Learner',
    defaultLevel: '7',
    icon: 'ti-user',
    tone: 'rail',
    home: '/learner',
    summaryVi: 'Takes the courses at their own level and submits requests to study exactly one grade above.',
    capabilities: ['canLearn', 'canRequestLevelSkip', 'canViewCsat'],
  },
  {
    id: 'manager',
    rank: 2,
    labelVi: 'Line Manager (Manager)',
    labelEn: 'Line Manager',
    shortVi: 'Manager',
    defaultLevel: '4',
    icon: 'ti-briefcase',
    tone: 'amber',
    home: '/manager',
    summaryVi: 'Manages department staff and tracks the team\'s learning progress.',
    // Level skip approval is NO LONGER with the Manager — only User Admin/SysAdmin
    // see and approve them (see the useradmin/sysadmin roles below).
    // The Training Cost Center is reserved for User Admin & SysAdmin only.
    capabilities: ['canLearn', 'canRequestLevelSkip', 'canViewTeam', 'canViewCsat'],
  },
  {
    id: 'trainer',
    rank: 3,
    labelVi: 'Trainer / L&D (Trainer)',
    labelEn: 'Trainer / L&D',
    shortVi: 'Trainer',
    defaultLevel: '3',
    icon: 'ti-school',
    tone: 'sage',
    home: '/trainer',
    summaryVi: 'Creates in-person courses, teaches, displays the Live QR for attendance and tracks CSAT.',
    capabilities: [
      'canLearn', 'canRequestLevelSkip', 'canViewTeam',
      // Trainer/L&D can only create in-person courses (that they teach) — without
      // canAuthorOnlineCourses, without canAssignTrainers (they only teach themselves).
      // No level skip approval — only User Admin/SysAdmin may approve.
      'canAuthorOfflineCourses', 'canTeach', 'canBeAssignedToClass', 'canManageAttendance', 'canViewCsat',
    ],
  },
  {
    id: 'hrbp',
    rank: 4,
    labelVi: 'HR Business Partner (HRBP)',
    labelEn: 'HR Business Partner',
    shortVi: 'HRBP',
    defaultLevel: '2',
    icon: 'ti-users',
    tone: 'blue',
    home: '/hrbp',
    summaryVi: 'Skill gap analysis, 70-20-10 succession planning and regional compliance monitoring.',
    capabilities: [
      'canLearn', 'canRequestLevelSkip', 'canViewTeam',
      'canViewOrgProgress', 'canManageSkillMatrix', 'canManageSuccession', 'canViewCsat',
      // HRBP cannot create courses (online or offline) — they may only
      // are assigned by User Admin/SysAdmin to teach the senior-level courses.
      // No level skip approval — only User Admin/SysAdmin may approve.
      'canTeach', 'canBeAssignedToClass', 'canManageAttendance',
      // Curriculum: HRBP may ONLY view (not edit/delete) and nominate talent
      // candidates for enrollment — a nomination only takes effect once User Admin/SysAdmin approves it.
      'canProposeCurriculum',
    ],
  },
  {
    id: 'useradmin',
    rank: 5,
    labelVi: 'People Administration (User Admin)',
    labelEn: 'User Administrator',
    shortVi: 'User Admin',
    defaultLevel: '2',
    icon: 'ti-users-group',
    tone: 'blue',
    home: '/user-admin',
    summaryVi: 'Manages 100+ employee records, allocates courses and assigns trainers to classes.',
    capabilities: [
      'canLearn', 'canRequestLevelSkip', 'canApproveLevelSkip', 'canViewTeam',
      'canViewOrgProgress', 'canManageUsers', 'canAllocateCourses',
      'canAssignTrainers', 'canConfigureOrg', 'canViewCsat',
      // Full authority to create both Online and Offline courses, and may teach them.
      'canAuthorOnlineCourses', 'canAuthorOfflineCourses', 'canTeach', 'canBeAssignedToClass', 'canManageAttendance',
      // Only User Admin & SysAdmin configure Level Roadmaps (Tab 1/Tab 2).
      'canManageLevelRoadmaps',
      // Only User Admin & SysAdmin may create/edit/delete Curricula and allocate them
      // directly to a learning audience — other roles only see what is allocated to them.
      'canManageCurriculum',
      // Full Cost Center authority: view company-wide income/expense reports and assign
      // participation rating for the course.
      'canViewCostCenter', 'canViewAllCostCenters', 'canManageCostCenter',
      // User Admin & SysAdmin both have full authority to create all 3 course formats
      // (E-Learning, Virtual Class Zoom/Teams, In-Person ILT) and name
      // the hosting trainer — Trainer/L&D can only create in-person courses (that they teach).
      'canCreateVirtualClass',
    ],
  },
  {
    id: 'sysadmin',
    rank: 6,
    labelVi: 'IT System Administration (System Admin)',
    labelEn: 'System Administrator (IT)',
    shortVi: 'System Admin',
    defaultLevel: '1',
    icon: 'ti-shield-lock',
    tone: 'rust',
    home: '/sysadmin',
    summaryVi: 'Full authority over infrastructure, APIs, ISO 27001 audit logs and every role including User Admin.',
    capabilities: [
      'canLearn', 'canRequestLevelSkip', 'canApproveLevelSkip', 'canViewTeam',
      'canViewOrgProgress', 'canManageUsers', 'canAllocateCourses',
      'canAssignTrainers', 'canConfigureOrg', 'canConfigureSystem', 'canViewAuditLogs',
      'canManageAllRoles', 'canDevelopPlatform', 'canViewCsat',
      'canAuthorOnlineCourses', 'canAuthorOfflineCourses', 'canTeach', 'canBeAssignedToClass', 'canManageAttendance',
      'canManageLevelRoadmaps', 'canManageCurriculum',
      'canViewCostCenter', 'canViewAllCostCenters', 'canManageCostCenter',
      // Full authority to create all 3 course formats (E-Learning, Virtual Class
      // Zoom/Teams, In-Person ILT) and names the hosting trainer — same as User Admin.
      'canCreateVirtualClass',
    ],
  },
];

export const ROLE_ORDER = ROLE_DEFINITIONS.map((r) => r.id);

// Legacy roles in the data/localStorage are normalized onto the 6-role model.
// `admin` (L&D Admin) becomes `trainer` (Trainer / L&D) under the new architecture.
export const LEGACY_ROLE_ALIAS = {
  admin: 'trainer',
  lnd: 'trainer',
  'l&d': 'trainer',
  instructor: 'trainer',
  employee: 'learner',
  student: 'learner',
  it: 'sysadmin',
};

/** Normalizes any role onto one of the 6 valid roleIds. */
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

/** Returns the roleIds that `role` is allowed to manage (every lower rank). */
export function managedRolesOf(role) {
  const rank = roleRank(role);
  return ROLE_DEFINITIONS.filter((r) => r.rank < rank).map((r) => r.id);
}

/** Can `actorRole` manage `targetRole`? */
export function canManage(actorRole, targetRole) {
  return roleRank(actorRole) > roleRank(targetRole);
}

export function capabilitiesOf(role) {
  return roleDefinition(role).capabilities;
}

export function hasCapability(role, capability) {
  return capabilitiesOf(role).includes(capability);
}

/** May they create a course in any format (Online or Offline/ILT)? Used to
 *  decide whether the "Create New Course" button is shown. */
export function canAuthorAnyCourse(role) {
  return hasCapability(role, 'canAuthorOnlineCourses') || hasCapability(role, 'canAuthorOfflineCourses');
}

/** May they view the ENTIRE curriculum catalog (not just what is allocated to them)?
 *  User Admin/SysAdmin view it to administer; HRBP views it to nominate talent candidates.
 *  Learner/Manager/Trainer only see the curricula allocated to them. */
export function canSeeAllCurricula(role) {
  return hasCapability(role, 'canManageCurriculum') || hasCapability(role, 'canProposeCurriculum');
}

/** Label describing the management scope, used in team/scope page headers. */
export function managedScopeLabel(role) {
  const managed = managedRolesOf(role);
  if (managed.length === 0) return 'Does not manage other employees (only their own learning record)';
  return managed.map((id) => roleDefinition(id).shortVi).join(', ');
}
