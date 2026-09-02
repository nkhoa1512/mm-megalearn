// ===========================================================================
// MM MegaLearn - 7-Level Job Grade Scale (INVERTED)
// Level 7 = LOWEST (new front-line staff)
// Level 1 = HIGHEST (Board of Management / BOM)
//
// Every level comparison in the system must go through the helpers in this file to avoid
// repeating the old scale's "bigger number = higher grade" mistake.
// ===========================================================================

export const ENTRY_LEVEL = '7';
export const TOP_LEVEL = '1';

export const LEVEL_DEFINITIONS = [
  {
    level: '1',
    code: 'L1_DIRECTOR',
    emoji: '👑',
    shortVi: 'Director / Senior Leadership',
    titleVi: 'Director / Senior Leadership',
    titleEn: 'Director',
    band: 'EXECUTIVE',
    note: 'Director / Senior Leadership — the highest level in the company',
    colors: { bg: '#FEE2E2', text: '#991B1B', border: '#FCA5A5' },
    tone: 'red',
  },
  {
    level: '2',
    code: 'L2_HEAD',
    emoji: '👑',
    shortVi: 'Associate Director / Head of Department or Division',
    titleVi: 'Associate Director / Head of Department or Division',
    titleEn: 'Associate Director / Head of Department',
    band: 'EXECUTIVE',
    note: 'Associate Director / Head of Department',
    colors: { bg: '#FEF3C7', text: '#92400E', border: '#FCD34D' },
    tone: 'amber',
  },
  {
    level: '3',
    code: 'L3_SENIOR_MANAGER',
    emoji: '🟠',
    shortVi: 'Senior Manager',
    titleVi: 'Senior Manager',
    titleEn: 'Senior Manager',
    band: 'SENIOR_MANAGEMENT',
    note: 'Senior Manager',
    colors: { bg: '#FFEDD5', text: '#9A3412', border: '#FDBA74' },
    tone: 'orange',
  },
  {
    level: '4',
    code: 'L4_MANAGER',
    emoji: '🔵',
    shortVi: 'Manager',
    titleVi: 'Manager',
    titleEn: 'Manager',
    band: 'MANAGEMENT',
    note: 'Manager',
    colors: { bg: '#DBEAFE', text: '#1E40AF', border: '#93C5FD' },
    tone: 'blue',
  },
  {
    level: '5',
    code: 'L5_SUPERVISOR',
    emoji: '🟢',
    shortVi: 'Supervisor / Senior Executive',
    titleVi: 'Supervisor / Senior Executive',
    titleEn: 'Supervisor / Senior Executive',
    band: 'SUPERVISORY',
    note: 'Supervisor / Senior Executive',
    colors: { bg: '#D1FAE5', text: '#065F46', border: '#6EE7B7' },
    tone: 'teal',
  },
  {
    level: '6',
    code: 'L6_EXECUTIVE',
    emoji: '🟢',
    shortVi: 'Executive / Operations Specialist',
    titleVi: 'Executive / Operations Specialist',
    titleEn: 'Executive',
    band: 'PROFESSIONAL',
    note: 'Executive / Operations Specialist',
    colors: { bg: '#DCFCE7', text: '#166534', border: '#BBF7D0' },
    tone: 'green',
  },
  {
    level: '7',
    code: 'L7_STAFF',
    emoji: '⚪',
    shortVi: 'Staff',
    titleVi: 'Staff',
    titleEn: 'Staff',
    band: 'ENTRY',
    note: 'Staff — the lowest level',
    colors: { bg: '#F1F5F9', text: '#475569', border: '#CBD5E1' },
    tone: 'slate',
  },
];

export const LEVEL_ORDER = LEVEL_DEFINITIONS.map((l) => l.level);

// Any level code outside the 1-7 scale in legacy HRIS data falls back to the lowest level.
const LEGACY_LEVEL_ALIAS = { CL: '7', IN: '7', '0': '7' };

/** Normalizes any level value to the string '1'..'7'. */
export function normalizeLevel(level) {
  if (level === null || level === undefined) return ENTRY_LEVEL;
  const raw = String(level).trim().toUpperCase().replace(/^LVL-?/, '');
  if (LEVEL_ORDER.includes(raw)) return raw;
  if (LEGACY_LEVEL_ALIAS[raw]) return LEGACY_LEVEL_ALIAS[raw];
  const num = Number(raw);
  if (Number.isFinite(num) && raw !== '') {
    if (num >= 1 && num <= 7) return String(Math.round(num));
    return num < 1 ? TOP_LEVEL : ENTRY_LEVEL;
  }
  return ENTRY_LEVEL;
}

export function levelDefinition(level) {
  const norm = normalizeLevel(level);
  return LEVEL_DEFINITIONS.find((l) => l.level === norm) || LEVEL_DEFINITIONS[LEVEL_DEFINITIONS.length - 1];
}

export function levelTitle(level) {
  return levelDefinition(level).titleVi;
}

export function levelShortLabel(level) {
  const def = levelDefinition(level);
  return `${def.emoji} Level ${def.level}: ${def.shortVi}`;
}

/** Smaller means higher. Returns an integer 1..7 for comparison. */
export function levelValue(level) {
  return Number(normalizeLevel(level));
}

/**
 * Level gap = how many grades the course sits ABOVE the learner.
 *   <= 0 : same level or lower (freely open)
 *   === 1: exactly one grade above (approval required)
 *   >= 2 : skipping grades (hard block)
 * Because the scale is inverted, Level 7 (lowest) minus Level 6 = 1 grade above.
 */
export function levelGap(userLevel, courseLevel) {
  return levelValue(userLevel) - levelValue(courseLevel);
}

/** The grade directly above (Level 7 -> Level 6). Returns null at the top of the scale. */
export function nextLevelUp(level) {
  const value = levelValue(level);
  return value <= 1 ? null : String(value - 1);
}

/** The grades that must be passed in order to climb from `fromLevel` to `toLevel`. */
export function levelRoadmap(fromLevel, toLevel) {
  const from = levelValue(fromLevel);
  const to = levelValue(toLevel);
  const steps = [];
  for (let v = from - 1; v >= to; v -= 1) steps.push(String(v));
  return steps;
}

/**
 * Is the course ALLOWED TO APPEAR in the learner's catalog?
 * - MANDATORY courses: shown only if the learner is in the assigned audience or already enrolled.
 * - OPTIONAL courses: shown to every learner (even when the level differs, so they can read the outline).
 */
export function isCourseVisibleInCatalog(userLevel, courseLevel, course = null, isAssigned = false) {
  if (course) {
    if (course.courseType === 'MANDATORY') {
      return Boolean(isAssigned);
    }
    return true;
  }
  return levelGap(userLevel, courseLevel) <= 1;
}

// ---------------------------------------------------------------------------
// Access gating & sequential level skip rules (Sequential Level Gate)
// ---------------------------------------------------------------------------

export const ACCESS_STATE = {
  OPEN: 'OPEN',                         // Same grade or lower -> start immediately
  APPROVED: 'APPROVED',                 // One grade above & manager approved / admin assigned
  PENDING_APPROVAL: 'PENDING_APPROVAL', // Request submitted, awaiting manager approval
  REJECTED: 'REJECTED',                 // The manager rejected the request
  REQUESTABLE: 'REQUESTABLE',           // Exactly one grade above -> may request approval
  LOCKED_LEVEL_GAP: 'LOCKED_LEVEL_GAP', // Skipping >= 2 grades -> strictly forbidden
};

/**
 * Extracts a course's target levels (normalized to an array of strings).
 */
export function getCourseTargetLevels(course) {
  if (!course) return [ENTRY_LEVEL];
  if (Array.isArray(course.targetLevels) && course.targetLevels.length > 0) {
    return course.targetLevels.map(normalizeLevel);
  }
  if (course.targetLevel) {
    return [normalizeLevel(course.targetLevel)];
  }
  if (course.level) {
    return [normalizeLevel(course.level)];
  }
  return [ENTRY_LEVEL];
}

/**
 * Returns the levels allowed to take the course without hitting the level gate.
 * On the inverted scale a smaller number means higher authority.
 * Example: for a course targeting Level 2 and 3, Levels 1, 2 and 3 may all enroll freely.
 */
export function getCourseEligibleLevels(course) {
  const targetLevels = getCourseTargetLevels(course);
  const lowestLevelNum = Math.max(...targetLevels.map(Number));
  const eligible = [];
  for (let lvl = 1; lvl <= lowestLevelNum; lvl += 1) {
    eligible.push(String(lvl));
  }
  return eligible;
}

/**
 * Evaluates a user's level compatibility with a course.
 * Returns the detail: eligible, one grade above, or hard blocked.
 */
export function evaluateUserEligibilityForCourse(user, course) {
  if (!user || !course) {
    return {
      isEligible: true,
      canAssign: true,
      matchType: 'EXACT_MATCH',
      badgeTone: 'sage',
      label: '✅ Eligible',
      gap: 0,
      userLevel: ENTRY_LEVEL,
      targetLevels: [ENTRY_LEVEL],
    };
  }

  const userLevel = normalizeLevel(user.level);
  const targetLevels = getCourseTargetLevels(course);
  const lowestTargetLevelNum = Math.max(...targetLevels.map(Number));
  const lowestTargetLevel = String(lowestTargetLevelNum);
  const uLevelNum = Number(userLevel);

  // 1. Exactly matches one of the course's target levels
  if (targetLevels.includes(userLevel)) {
    return {
      isEligible: true,
      canAssign: true,
      matchType: 'EXACT_MATCH',
      badgeTone: 'sage',
      label: `✅ Correct level (Level ${userLevel})`,
      gap: 0,
      userLevel,
      targetLevels,
      lowestTargetLevel,
    };
  }

  // 2. The user's level is higher than the course target (e.g. a Level 1 user taking a Level 3 course)
  if (uLevelNum < lowestTargetLevelNum) {
    return {
      isEligible: true,
      canAssign: true,
      matchType: 'HIGHER_LEVEL',
      badgeTone: 'blue',
      label: `👑 Higher level (Level ${userLevel})`,
      gap: uLevelNum - lowestTargetLevelNum,
      userLevel,
      targetLevels,
      lowestTargetLevel,
    };
  }

  // 3. The user is exactly one grade below (e.g. a Level 4 user wants a Level 3 course)
  const gap = uLevelNum - lowestTargetLevelNum;
  if (gap === 1) {
    return {
      isEligible: false,
      canAssign: true, // Assignment allowed but flagged with a level warning
      matchType: 'GAP_ONE_STEP',
      badgeTone: 'amber',
      label: `⚠️ One grade above (Lvl ${userLevel} → Lvl ${lowestTargetLevel})`,
      gap: 1,
      userLevel,
      targetLevels,
      lowestTargetLevel,
      warning: `This Level ${userLevel} learner is one grade below the course requirement (Level ${lowestTargetLevel}).`,
    };
  }

  // 4. The user is two or more grades below (grade skipping - normal assignment is forbidden)
  return {
    isEligible: false,
    canAssign: false, // Blocked from free assignment
    matchType: 'BLOCKED_LEVEL_GAP',
    badgeTone: 'crimson',
    label: `🚫 Level too low (Lvl ${userLevel}, ${gap} grades away)`,
    gap,
    userLevel,
    targetLevels,
    lowestTargetLevel,
    error: `This Level ${userLevel} learner is ${gap} grades away from Level ${lowestTargetLevel} and is blocked by the sequential level rule.`,
  };
}

/**
 * Evaluates the level compatibility of every member of a Custom Group.
 */
export function evaluateGroupEligibilityForCourse(group, course, allUsers = []) {
  if (!group || !course) {
    return {
      totalMembers: 0,
      eligibleMembers: [],
      ineligibleMembers: [],
      gapOneMembers: [],
      blockedMembers: [],
      eligibleCount: 0,
      ineligibleCount: 0,
      summaryLabel: '0 members',
    };
  }

  const explicitIds = new Set(group.memberUserIds || []);
  let members = [];

  if (group.type === 'MANUAL' || group.type === 'FILE_IMPORT') {
    members = allUsers.filter((u) => explicitIds.has(u.userId) || explicitIds.has(u.employeeCode));
  } else {
    // Dynamic
    const { criteria = {} } = group;
    const { divisionId, departmentId, subDepartmentId, level, role } = criteria;
    members = allUsers.filter((u) => {
      if (explicitIds.has(u.userId) || explicitIds.has(u.employeeCode)) return true;
      if (divisionId && divisionId !== 'ALL' && u.divisionId !== divisionId && u.divisionCode !== divisionId) return false;
      if (departmentId && departmentId !== 'ALL' && u.departmentId !== departmentId && u.departmentCode !== departmentId) return false;
      if (subDepartmentId && subDepartmentId !== 'ALL' && u.subDepartmentId !== subDepartmentId && u.subDepartmentCode !== subDepartmentId) return false;
      if (level && level !== 'ALL' && String(u.level) !== String(level)) return false;
      if (role && role !== 'ALL' && (u.role || '').toLowerCase() !== role.toLowerCase()) return false;
      return true;
    });
  }

  const eligibleMembers = [];
  const gapOneMembers = [];
  const blockedMembers = [];
  const ineligibleMembers = [];

  members.forEach((m) => {
    const evalRes = evaluateUserEligibilityForCourse(m, course);
    if (evalRes.isEligible) {
      eligibleMembers.push({ user: m, eval: evalRes });
    } else {
      ineligibleMembers.push({ user: m, eval: evalRes });
      if (evalRes.matchType === 'GAP_ONE_STEP') {
        gapOneMembers.push({ user: m, eval: evalRes });
      } else {
        blockedMembers.push({ user: m, eval: evalRes });
      }
    }
  });

  return {
    totalMembers: members.length,
    eligibleMembers,
    ineligibleMembers,
    gapOneMembers,
    blockedMembers,
    eligibleCount: eligibleMembers.length,
    ineligibleCount: ineligibleMembers.length,
    summaryLabel: `${eligibleMembers.length}/${members.length} eligible (${ineligibleMembers.length} level mismatch)`,
  };
}

/**
 * Filters a user list down to the people who meet the course level requirement.
 */
export function filterUsersByCourseEligibility(usersList = [], course, allowGap1 = false) {
  if (!course || !Array.isArray(usersList)) return usersList;
  return usersList.filter((u) => {
    const evalRes = evaluateUserEligibilityForCourse(u, course);
    if (evalRes.isEligible) return true;
    if (allowGap1 && evalRes.matchType === 'GAP_ONE_STEP') return true;
    return false;
  });
}

/**
 * Course access rules by job level.
 *
 * @param {object} course The course (reads `targetLevels` or `targetLevel`).
 * @param {object} user   The learner (reads `level`).
 * @param {object} ctx    { approvedCourseIds, pendingCourseIds, rejectedCourseIds, isDirectlyAssigned }
 */
export function checkCourseAccessRule(course, user, ctx = {}) {
  const approvedCourseIds = ctx.approvedCourseIds || [];
  const pendingCourseIds = ctx.pendingCourseIds || [];
  const rejectedCourseIds = ctx.rejectedCourseIds || [];
  const isDirectlyAssigned = ctx.isDirectlyAssigned || false;

  if (!course || !user) {
    return {
      state: ACCESS_STATE.OPEN,
      canAccess: true,
      isLevelLocked: false,
      requiresApproval: false,
      gap: 0,
      userLevel: ENTRY_LEVEL,
      courseLevel: ENTRY_LEVEL,
      reason: null,
    };
  }

  // When the course is assigned as mandatory directly by the User Admin / HRBP
  if (isDirectlyAssigned) {
    return {
      state: ACCESS_STATE.APPROVED,
      canAccess: true,
      isLevelLocked: false,
      requiresApproval: false,
      gap: 0,
      userLevel: normalizeLevel(user.level),
      courseLevel: normalizeLevel(course.targetLevel),
      reason: 'The User Admin assigned this course to you as mandatory learning.',
    };
  }

  const evalRes = evaluateUserEligibilityForCourse(user, course);
  const userLevel = evalRes.userLevel;
  const courseLevel = evalRes.lowestTargetLevel || normalizeLevel(course.targetLevel);
  const gap = evalRes.gap;
  const base = { gap, userLevel, courseLevel, targetLevels: evalRes.targetLevels };

  // Case 1: same grade or higher -> freely open
  if (evalRes.isEligible) {
    return {
      ...base,
      state: ACCESS_STATE.OPEN,
      canAccess: true,
      isLevelLocked: false,
      requiresApproval: false,
      reason: null,
    };
  }

  // Case 2: exactly one grade above (a Level 7 user wants a Level 6 course)
  if (evalRes.matchType === 'GAP_ONE_STEP') {
    if (approvedCourseIds.includes(course.id)) {
      return {
        ...base,
        state: ACCESS_STATE.APPROVED,
        canAccess: true,
        isLevelLocked: false,
        requiresApproval: false,
        reason: `Your manager approved the level skip up to Level ${courseLevel}.`,
      };
    }
    if (pendingCourseIds.includes(course.id)) {
      return {
        ...base,
        state: ACCESS_STATE.PENDING_APPROVAL,
        canAccess: false,
        isLevelLocked: true,
        requiresApproval: false,
        reason: `The request to study up to Level ${courseLevel} is awaiting manager approval.`,
      };
    }
    if (rejectedCourseIds.includes(course.id)) {
      return {
        ...base,
        state: ACCESS_STATE.REJECTED,
        canAccess: false,
        isLevelLocked: true,
        requiresApproval: true,
        reason: 'Your manager rejected this level skip request. You can resubmit it with a stronger justification.',
      };
    }
    return {
      ...base,
      state: ACCESS_STATE.REQUESTABLE,
      canAccess: false,
      isLevelLocked: true,
      requiresApproval: true,
      reason: `This Level ${courseLevel} course is above your current level (Level ${userLevel}). You need to submit a request for your Manager to approve the level skip.`,
    };
  }

  // Case 3: skipping two or more grades -> hard block
  const mustFinishLevel = nextLevelUp(userLevel);
  return {
    ...base,
    state: ACCESS_STATE.LOCKED_LEVEL_GAP,
    canAccess: false,
    isLevelLocked: true,
    requiresApproval: false,
    blockedRoadmap: levelRoadmap(userLevel, courseLevel),
    reason: `You cannot skip ahead to Level ${courseLevel}. You must first complete the entire Level ${mustFinishLevel} training program.`,
  };
}
