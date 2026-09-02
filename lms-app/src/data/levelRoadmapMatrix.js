// ===========================================================================
// MM MegaLearn - 4-Tab Universal Learning Roadmap
//   Tab 1 CURRENT     - The standard requirement framework of the current Level (100% mandatory)
//   Tab 2 SUCCESSION  - The requirement framework of the next Level (current Level - 1),
//                       unlocked only when Tab 1 is 100% complete. There is no separate
//                       dataset: SUCCESSION for Level N is exactly the CURRENT roadmap
//                       of Level N-1, resolved dynamically via successionMilestonesFor.
//   Tab 3 SELF_PROPOSED - Optional specialist tracks (not tied to a Level requirement).
//   Tab 4 RECOMMENDED - Suggestions by level/division, computed dynamically, never persisted.
// ===========================================================================

import { LEVEL_ORDER, nextLevelUp, isCourseVisibleInCatalog } from './levelSystem';
import { generated100Courses } from './generated100Data';
import { getRoadmapForScope, migrateLevelBranchMatrix } from './roadmapScopeMatrix';

export const ROADMAP_BRANCHES = { OPERATIONS: 'OPERATIONS', SUPPORTING: 'SUPPORTING' };

// Courses have no branch field of their own (only a domain) — this table decides
// which Division a course belongs to on the roadmap. Do NOT use course.targetId/division because that
// data is inconsistent for this purpose (e.g. a Food Safety course targets
// div-omd yet its content is meant for front-line operations staff).
const DOMAIN_BRANCH_MAP = {
  'Food Safety & Hygiene': ['OPERATIONS'],
  'Cold Chain': ['OPERATIONS'],
  'Store Operations': ['OPERATIONS'],
  'Customer Service': ['OPERATIONS'],
  'Merchandising': ['OPERATIONS'],
  'Information Security': ['SUPPORTING'],
  'Supply Chain': ['SUPPORTING'],
  'E-Commerce': ['SUPPORTING'],
  'Health & Safety': ['OPERATIONS', 'SUPPORTING'],
  'Leadership': ['OPERATIONS', 'SUPPORTING'],
  'Compliance & Ethics': ['OPERATIONS', 'SUPPORTING'],
  'Culture & Onboarding': ['OPERATIONS', 'SUPPORTING'],
  'Train-The-Trainer & Coaching Standards': ['OPERATIONS', 'SUPPORTING'],
  'Master Trainer & Section Governance': ['OPERATIONS', 'SUPPORTING'],
  'Succession & Store P&L Governance': ['OPERATIONS', 'SUPPORTING'],
  'Corporate Governance & ESG': ['OPERATIONS', 'SUPPORTING'],
  'Executive Strategy Electives': ['OPERATIONS', 'SUPPORTING'],
  'Talent & Store Portfolio Electives': ['OPERATIONS', 'SUPPORTING'],
  'OJT Capstone & Promotion Defense': ['OPERATIONS', 'SUPPORTING'],
};

export function branchesForCourse(course) {
  return DOMAIN_BRANCH_MAP[course.domain] || ['OPERATIONS', 'SUPPORTING'];
}

// Every user (personas and the 100 generated employees alike) already has a branch field —
// see generated100Data.js. There is no need to re-derive it from divisionCode.
export function branchForUser(user) {
  return user?.branch === 'OPERATIONS' ? ROADMAP_BRANCHES.OPERATIONS : ROADMAP_BRANCHES.SUPPORTING;
}

// ---------------------------------------------------------------------------
// Tab 1 / Tab 2: CURRENT_ROADMAPS — one ordered stage list for each
// Level x Division, covering every MANDATORY course (required framework), the
// CLASSROOM_LAB (certification/capstone, max 2 courses) is appended to the END of the list
// acts as the "gatekeeper" stage before promotion eligibility.
// ---------------------------------------------------------------------------
function emptyBranchSet() {
  return { OPERATIONS: { courseIds: [] }, SUPPORTING: { courseIds: [] } };
}

export function buildCurrentRoadmaps(courses) {
  const config = {};
  LEVEL_ORDER.forEach((level) => { config[level] = emptyBranchSet(); });

  const capstoneCount = {};
  LEVEL_ORDER.forEach((level) => { capstoneCount[level] = { OPERATIONS: 0, SUPPORTING: 0 }; });

  const mandatoryCore = courses.filter((c) => c.courseType === 'MANDATORY' && c.modality !== 'CLASSROOM_LAB');
  const capstones = courses.filter((c) => c.courseType === 'MANDATORY' && c.modality === 'CLASSROOM_LAB');

  mandatoryCore.forEach((course) => {
    const level = course.targetLevel;
    if (!config[level]) return;
    branchesForCourse(course).forEach((branch) => config[level][branch].courseIds.push(course.id));
  });

  capstones.forEach((course) => {
    const level = course.targetLevel;
    if (!config[level]) return;
    branchesForCourse(course).forEach((branch) => {
      if (capstoneCount[level][branch] < 2) {
        config[level][branch].courseIds.push(course.id);
        capstoneCount[level][branch] += 1;
      }
    });
  });

  return config;
}

export const CURRENT_ROADMAPS = buildCurrentRoadmaps(generated100Courses);

// The persisted roadmap configuration is now a multi-tier Scope Key matrix (BU ->
// Division -> Department -> Sub-Department x Level), seeded from the same
// old Level x Branch content so no data is lost on upgrade.
export const SCOPE_ROADMAP_MATRIX = migrateLevelBranchMatrix(CURRENT_ROADMAPS);

/**
 * The succession roadmap for `user` at `level` = the roadmap (resolved through Scope Key
 * inheritance) of the level directly above (N-1), within that user's own org branch.
 */
export function successionMilestonesFor(user, roadmapsConfig, level, userEnrollments = {}) {
  const nextLevel = nextLevelUp(level);
  if (!nextLevel) return { level: null, courseIds: [] };
  const resolved = getRoadmapForScope(roadmapsConfig, user, nextLevel, userEnrollments);
  return { level: nextLevel, courseIds: resolved.courseIds };
}

// ---------------------------------------------------------------------------
// Tab 3: SELF_PROPOSED_TRACKS — optional specialist tracks, not tied to a single Level
// specifically (grouped from OPTIONAL courses by domain). What the user sees is filtered again
// by isCourseVisibleInCatalog so the sequential level gate is never broken.
// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// Tab 3: SELF_PROPOSED_TRACKS — Personalized self-proposed roadmaps by Department,
// The employee's job position and level.
// ---------------------------------------------------------------------------
export function generateSelfProposedTracksForUser(user, courses, userEnrollments = {}) {
  const level = user?.level;
  const divCode = (user?.divisionCode || '').toUpperCase();
  const deptCode = (user?.departmentCode || '').toUpperCase();
  const pos = (user?.position || '').toLowerCase();

  const isVisible = (c) => isCourseVisibleInCatalog(level, c.targetLevel);
  const isCompleted = (id) => userEnrollments[id]?.status === 'COMPLETED';
  const statusOf = (id) => {
    if (isCompleted(id)) return 'COMPLETED';
    return userEnrollments[id]?.status === 'IN_PROGRESS' ? 'IN_PROGRESS' : 'NOT_STARTED';
  };

  function toMilestones(courseList) {
    return courseList.map((course) => ({
      course,
      status: statusOf(course.id),
      completed: isCompleted(course.id),
    }));
  }

  const isIT = divCode === 'MIS' || deptCode === 'MIS' || deptCode === 'IT' || pos.includes('it') || pos.includes('cyber') || pos.includes('system');
  const isStoreFresh = divCode === 'OPT' || deptCode === 'BAKERY' || deptCode === 'MEAT' || deptCode === 'SEAFOOD' || pos.includes('bakery') || pos.includes('meat') || pos.includes('fresh') || pos.includes('store') || pos.includes('cashier');
  const isMerch = divCode === 'OMD' || divCode === 'PRC' || deptCode === 'MERCH' || pos.includes('merchandis') || pos.includes('buyer') || pos.includes('pricing');
  const isSCM = divCode === 'SCM' || deptCode === 'LOG' || pos.includes('warehouse') || pos.includes('supply') || pos.includes('logistics');
  const isHRorLOD = divCode === 'HRD' || deptCode === 'L&OD' || deptCode === 'HR' || pos.includes('hr') || pos.includes('trainer') || pos.includes('learning');

  const tracks = [];

  // Track 1: Department Mastery
  if (isIT) {
    const itCourses = courses.filter((c) => (c.domain === 'Information Security' || c.domain === 'E-Commerce' || c.title.toLowerCase().includes('it') || c.title.toLowerCase().includes('security')) && isVisible(c));
    tracks.push({
      id: 'track-it-security',
      titleVi: 'Information Security Architecture & Digital Infrastructure',
      titleEn: 'Cybersecurity & Digital Infrastructure Mastery',
      icon: 'ti-shield-lock',
      description: 'Cybersecurity, customer data protection and digital infrastructure compliance for IT staff.',
      courseIds: itCourses.slice(0, 4).map((c) => c.id),
      courses: itCourses.slice(0, 4),
    });
  } else if (isStoreFresh) {
    const foodCourses = courses.filter((c) => (c.domain === 'Food Safety & Hygiene' || c.domain === 'Cold Chain' || c.domain === 'Store Operations') && isVisible(c));
    tracks.push({
      id: 'track-fresh-mastery',
      titleVi: 'Counter Standardization & End-To-End HACCP Expert',
      titleEn: 'Store Operations & HACCP Excellence',
      icon: 'ti-meat',
      description: 'Advances cold chain temperature control, HACCP standards and shrinkage reduction at the counter.',
      courseIds: foodCourses.slice(0, 4).map((c) => c.id),
      courses: foodCourses.slice(0, 4),
    });
  } else if (isMerch) {
    const merchCourses = courses.filter((c) => (c.domain === 'Merchandising' || c.domain === 'Supply Chain') && isVisible(c));
    tracks.push({
      id: 'track-merch-mastery',
      titleVi: 'Commercial Negotiation & Margin Optimization',
      titleEn: 'Commercial Negotiation & Margin Strategy',
      icon: 'ti-shopping-cart',
      description: 'Supplier contract negotiation, margin analysis and merchandise category management skills.',
      courseIds: merchCourses.slice(0, 4).map((c) => c.id),
      courses: merchCourses.slice(0, 4),
    });
  } else if (isSCM) {
    const scmCourses = courses.filter((c) => (c.domain === 'Supply Chain' || c.domain === 'Cold Chain') && isVisible(c));
    tracks.push({
      id: 'track-scm-logistics',
      titleVi: 'High-Speed Warehousing & Supply Chain Operations',
      titleEn: 'Fast-Flow Warehouse & SCM Logistics',
      icon: 'ti-truck',
      description: 'Optimizes cross-docking distribution flow, forklift safety and central warehouse logistics.',
      courseIds: scmCourses.slice(0, 4).map((c) => c.id),
      courses: scmCourses.slice(0, 4),
    });
  } else if (isHRorLOD) {
    const hrCourses = courses.filter((c) => (c.domain === 'Leadership' || c.domain === 'Culture & Onboarding' || c.domain.includes('Trainer')) && isVisible(c));
    tracks.push({
      id: 'track-talent-trainer',
      titleVi: 'Internationally Certified Internal Trainer & 70/20/10 Coaching',
      titleEn: 'Master Trainer & Talent Coaching Standards',
      icon: 'ti-presentation',
      description: 'Modern teaching methods, on-the-job coaching skills and succession roadmap development.',
      courseIds: hrCourses.slice(0, 4).map((c) => c.id),
      courses: hrCourses.slice(0, 4),
    });
  } else {
    const generalOps = courses.filter((c) => (c.domain === 'Store Operations' || c.domain === 'Customer Service') && isVisible(c));
    tracks.push({
      id: 'track-general-ops',
      titleVi: 'Standardized Operations & Customer Service Excellence',
      titleEn: 'Operations Excellence & Customer Experience',
      icon: 'ti-building-store',
      description: 'Professional customer service skills, scenario handling and operational optimization.',
      courseIds: generalOps.slice(0, 4).map((c) => c.id),
      courses: generalOps.slice(0, 4),
    });
  }

  // Track 2: Leadership & Management Skills Development (Leadership Track)
  const leadCourses = courses.filter((c) => (c.domain === 'Leadership' || c.domain.includes('Leadership')) && isVisible(c));
  if (leadCourses.length > 0) {
    tracks.push({
      id: 'track-leadership-growth',
      titleVi: 'Leadership & Modern Retail Team Management',
      titleEn: 'Modern Retail Leadership & Team Management',
      icon: 'ti-crown',
      description: 'Builds delegation, conflict resolution, staff coaching and KPI goal-setting capability.',
      courseIds: leadCourses.slice(0, 3).map((c) => c.id),
      courses: leadCourses.slice(0, 3),
    });
  }

  // Track 3: Digital Retail & E-Commerce
  const digitalCourses = courses.filter((c) => (c.domain === 'E-Commerce' || c.title.toLowerCase().includes('digital') || c.title.toLowerCase().includes('online') || c.domain === 'Information Security') && isVisible(c));
  if (digitalCourses.length > 0) {
    tracks.push({
      id: 'track-digital-retail',
      titleVi: 'Digital Retail & Omnichannel Customer Experience',
      titleEn: 'Digital Retail & Omnichannel Customer Experience',
      icon: 'ti-device-laptop',
      description: 'Online order fulfilment, digital payments and cross-platform customer experience.',
      courseIds: digitalCourses.slice(0, 3).map((c) => c.id),
      courses: digitalCourses.slice(0, 3),
    });
  }

  // Track 4: Corporate Culture, Safety & ESG
  const esgCourses = courses.filter((c) => (c.domain === 'Culture & Onboarding' || c.domain === 'Health & Safety' || c.domain === 'Compliance & Ethics') && isVisible(c));
  if (esgCourses.length > 0) {
    tracks.push({
      id: 'track-esg-culture',
      titleVi: 'Corporate Culture, Occupational Safety & ESG',
      titleEn: 'Corporate Culture, Health Safety & ESG',
      icon: 'ti-leaf',
      description: 'Professional conduct standards, fire prevention and sustainable retail chain development.',
      courseIds: esgCourses.slice(0, 3).map((c) => c.id),
      courses: esgCourses.slice(0, 3),
    });
  }

  return tracks.map((track) => {
    const milestones = toMilestones(track.courses);
    const joined = milestones.some((m) => userEnrollments[m.course.id]);
    const percent = milestones.length === 0
      ? 0
      : Math.round((milestones.filter((m) => m.completed).length / milestones.length) * 100);
    return { ...track, milestones, joined, percent };
  }).filter((t) => t.milestones.length > 0);
}

export const SELF_PROPOSED_TRACKS = [];

// ---------------------------------------------------------------------------
// Tab 4: RECOMMENDED — Smart course suggestions based on Department, Position & Level
// ---------------------------------------------------------------------------
export function recommendCoursesFor(user, courses, userEnrollments = {}, excludeIds = []) {
  const level = user?.level;
  const divCode = (user?.divisionCode || '').toUpperCase();
  const deptCode = (user?.departmentCode || '').toUpperCase();
  const deptName = user?.departmentName || user?.departmentCode || user?.divisionName || 'Sub-Department';
  const pos = (user?.position || '').toLowerCase();
  const branch = branchForUser(user);
  const nextLevel = nextLevelUp(level);
  const exclude = new Set(excludeIds);

  const isIT = divCode === 'MIS' || deptCode === 'MIS' || deptCode === 'IT' || pos.includes('it') || pos.includes('cyber') || pos.includes('system');
  const isStoreFresh = divCode === 'OPT' || deptCode === 'BAKERY' || deptCode === 'MEAT' || deptCode === 'SEAFOOD' || pos.includes('bakery') || pos.includes('meat') || pos.includes('fresh') || pos.includes('store') || pos.includes('cashier');
  const isMerch = divCode === 'OMD' || divCode === 'PRC' || deptCode === 'MERCH' || pos.includes('merchandis') || pos.includes('buyer') || pos.includes('pricing');
  const isSCM = divCode === 'SCM' || deptCode === 'LOG' || pos.includes('warehouse') || pos.includes('supply') || pos.includes('logistics');
  const isHRorLOD = divCode === 'HRD' || deptCode === 'L&OD' || deptCode === 'HR' || pos.includes('hr') || pos.includes('trainer') || pos.includes('learning');

  const scoredCourses = courses
    .filter((c) => !exclude.has(c.id))
    .filter((c) => !userEnrollments[c.id] || userEnrollments[c.id].status !== 'COMPLETED')
    .filter((c) => isCourseVisibleInCatalog(level, c.targetLevel))
    .map((c) => {
      let score = 0;
      let reasonTag = `Suits Level ${c.targetLevel}`;

      // 1. Matches the job level
      if (c.targetLevel === level) {
        score += 35;
        reasonTag = `Meets the Level ${level} requirement framework`;
      } else if (c.targetLevel === nextLevel) {
        score += 30;
        reasonTag = `Succession development for Level ${nextLevel}`;
      } else {
        score += 15;
      }

      // 2. Matches the job family & department
      if (isIT) {
        if (c.domain === 'Information Security' || c.domain === 'E-Commerce' || c.title.toLowerCase().includes('security') || c.title.toLowerCase().includes('it')) {
          score += 60;
          reasonTag = `Recommended for ${deptName}`;
        }
      } else if (isStoreFresh) {
        if (c.domain === 'Food Safety & Hygiene' || c.domain === 'Cold Chain' || c.domain === 'Store Operations') {
          score += 60;
          reasonTag = `${deptName} counter operations`;
        }
      } else if (isMerch) {
        if (c.domain === 'Merchandising' || c.domain === 'Supply Chain' || c.domain === 'E-Commerce') {
          score += 60;
          reasonTag = `${deptName} category strategy`;
        }
      } else if (isSCM) {
        if (c.domain === 'Supply Chain' || c.domain === 'Cold Chain') {
          score += 60;
          reasonTag = `Logistics & Warehouse Operations`;
        }
      } else if (isHRorLOD) {
        if (c.domain === 'Leadership' || c.domain === 'Culture & Onboarding' || (c.domain || '').includes('Trainer')) {
          score += 60;
          reasonTag = `Training & Talent Development`;
        }
      } else {
        if (c.domain === 'Store Operations' || c.domain === 'Customer Service' || c.domain === 'Leadership') {
          score += 40;
          reasonTag = `Customer service skills`;
        }
      }

      if (branchesForCourse(c).includes(branch)) {
        score += 15;
      }

      return {
        ...c,
        recommendationScore: score,
        recommendationReason: reasonTag,
      };
    });

  return scoredCourses
    .sort((a, b) => b.recommendationScore - a.recommendationScore || (b.passingScore || 0) - (a.passingScore || 0))
    .slice(0, 6);
}

/**
 * Computes the state of all 4 tabs for one user. `roadmapsConfig` is CURRENT_ROADMAPS
 * (which the Admin may have edited), `enrollments` is { [userId]: { [courseId]:
 * { status, ... } } }, the exact shape used in CourseStore.
 */
export function computeUserRoadmapTabs(user, roadmapsConfig, enrollments, courses) {
  const level = user?.level;
  const branch = branchForUser(user);
  const userEnrollments = (user && enrollments[user.userId]) || {};
  const isCompleted = (id) => userEnrollments[id]?.status === 'COMPLETED';
  const statusOf = (id) => {
    if (isCompleted(id)) return 'COMPLETED';
    return userEnrollments[id]?.status === 'IN_PROGRESS' ? 'IN_PROGRESS' : 'NOT_STARTED';
  };
  const courseById = (id) => courses.find((c) => c.id === id);

  function buildMilestones(ids) {
    return ids
      .map((id) => courseById(id))
      .filter(Boolean)
      .map((course) => ({ course, status: statusOf(course.id), completed: isCompleted(course.id) }));
  }

  const resolvedCurrent = getRoadmapForScope(roadmapsConfig, user, level, userEnrollments);
  const currentIds = resolvedCurrent.courseIds;
  const currentMilestones = buildMilestones(currentIds);
  const currentDone = currentMilestones.length > 0 && currentMilestones.every((m) => m.completed);
  const currentPercent = currentMilestones.length === 0
    ? 100
    : Math.round((currentMilestones.filter((m) => m.completed).length / currentMilestones.length) * 100);

  const succession = successionMilestonesFor(user, roadmapsConfig, level, userEnrollments);
  const successionMilestones = buildMilestones(succession.courseIds);
  const successionPercent = successionMilestones.length === 0
    ? 0
    : Math.round((successionMilestones.filter((m) => m.completed).length / successionMilestones.length) * 100);

  const tracks = generateSelfProposedTracksForUser(user, courses, userEnrollments);
  const recommended = recommendCoursesFor(user, courses, userEnrollments, [...currentIds, ...succession.courseIds]);

  return {
    level,
    branch,
    scopeKey: resolvedCurrent.scopeKey,
    inheritedFrom: resolvedCurrent.inheritedFrom,
    roadmapVersion: resolvedCurrent.version,
    isArchivedRoadmapVersion: resolvedCurrent.isArchived,
    nextLevel: succession.level,
    current: { milestones: currentMilestones, percent: currentPercent, done: currentDone },
    succession: {
      level: succession.level,
      milestones: successionMilestones,
      percent: successionPercent,
      locked: succession.level !== null && !currentDone,
      unlocked: succession.level !== null && currentDone,
    },
    selfProposed: { tracks },
    recommended,
    readyForPromotion: succession.level !== null && currentDone && successionPercent >= 100,
  };
}
