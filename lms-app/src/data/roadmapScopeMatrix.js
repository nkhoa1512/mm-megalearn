// ===========================================================================
// MM MegaLearn - Multi-Tier Roadmap Matrix By Scope Key
//   BU (Business Unit) -> Division -> Department -> Sub-Department x Level
//
// Built ON TOP of the organizational data already in orgHierarchy.js, NOT
// replacing it: the plan's 2 Business Units (bu-ho / bu-ops) map directly
// on the `branch` field (SUPPORTING / OPERATIONS) already used throughout the system,
// so none of the existing org/employee/dashboard data is broken.
//
// Each Scope Key (`${buId}:${divisionId}:${departmentId}:${subId}:${level}`)
// is ONE Roadmap record with its own versioning, exactly like the multi-version mechanism
// of a course (course.versions): `courseIds` is the LIVE list, `versions`
// is the archive of OLD replaced versions. When an Admin edits (adds/removes
// courses) and saves, the current version is frozen into `versions[oldVersion]`
// then bumped to a new version — a learner who HAS completed or IS part-way through
// a course from an older version keeps seeing exactly that version; only learners
// who have NEVER touched this roadmap see the newest version.
// ===========================================================================

import { nextMajorVersion } from './mockData';

export const SCOPE_BUSINESS_UNITS = [
  { id: 'bu-ho', branch: 'SUPPORTING', name: 'Head Office Support' },
  { id: 'bu-ops', branch: 'OPERATIONS', name: 'Store Operations' },
];

export function buIdForBranch(branch) {
  return branch === 'OPERATIONS' ? 'bu-ops' : 'bu-ho';
}

export function branchForBuId(buId) {
  return buId === 'bu-ops' ? 'OPERATIONS' : 'SUPPORTING';
}

/** Sub-Department slot: sectionId (stores) takes priority over subDepartmentId (office divisions). */
export function subScopeIdOf(entity) {
  return entity?.sectionId || entity?.subDepartmentId || null;
}

/** Builds the canonical Scope Key `${buId}:${divisionId}:${departmentId}:${subId}:${level}`, using '*' for empty slots. */
export function buildScopeKey({ buId, divisionId, departmentId, subDepartmentId, level }) {
  return [buId || '*', divisionId || '*', departmentId || '*', subDepartmentId || '*', level].join(':');
}

export function parseScopeKey(scopeKey) {
  const [buId, divisionId, departmentId, subDepartmentId, level] = String(scopeKey || '').split(':');
  return {
    buId: buId === '*' ? null : buId || null,
    divisionId: divisionId === '*' ? null : divisionId || null,
    departmentId: departmentId === '*' ? null : departmentId || null,
    subDepartmentId: subDepartmentId === '*' ? null : subDepartmentId || null,
    level: level || null,
  };
}

/** The chain of inherited Scope Keys for one user at one level, most specific -> most general. */
export function scopeChainFor(user, level) {
  const buId = buIdForBranch(user?.branch);
  const divisionId = user?.divisionId || null;
  const departmentId = user?.departmentId || null;
  const subDepartmentId = subScopeIdOf(user);
  const chain = [];
  if (subDepartmentId) chain.push(buildScopeKey({ buId, divisionId, departmentId, subDepartmentId, level }));
  if (departmentId) chain.push(buildScopeKey({ buId, divisionId, departmentId, subDepartmentId: null, level }));
  if (divisionId) chain.push(buildScopeKey({ buId, divisionId, departmentId: null, subDepartmentId: null, level }));
  chain.push(buildScopeKey({ buId, divisionId: null, departmentId: null, subDepartmentId: null, level }));
  return chain;
}

function versionNumber(v) {
  const m = /^v(\d+)/.exec(v || 'v1.0');
  return m ? Number(m[1]) : 1;
}

/**
 * The roadmap version that `userEnrollments` (one learner's course enrollments)
 * must actually see: scan the OLD versions of `entry` (old -> new); the first version
 * in which the learner already has progress (in progress/completed) on at least one course
 * wins — the learner is "locked" to the version they started on. A learner who has never
 * touched a course in this roadmap sees the LIVE (newest) version.
 */
export function resolveUserRoadmapVersion(entry, userEnrollments = {}) {
  if (!entry) return { version: null, courseIds: [], isArchived: false };
  const hasProgress = (ids) =>
    (ids || []).some((id) => {
      const e = userEnrollments[id];
      return e && (e.status === 'IN_PROGRESS' || e.status === 'COMPLETED');
    });
  const historyVersions = Object.keys(entry.versions || {}).sort((a, b) => versionNumber(a) - versionNumber(b));
  for (const v of historyVersions) {
    if (hasProgress(entry.versions[v].courseIds)) {
      return { version: v, courseIds: entry.versions[v].courseIds, isArchived: true };
    }
  }
  return { version: entry.currentVersion || 'v1.0', courseIds: entry.courseIds || [], isArchived: false };
}

/**
 * Looks up the course list for one user at one level using Smart Fallback &
 * Inheritance: try an exact Sub-Department match first, then fall back
 * outward to Department -> Division -> BU.
 * `userEnrollments` (optional) locks the learner to the version they already
 * started — leave it empty when an Admin is only previewing (always sees the newest).
 */
export function getRoadmapForScope(matrix, user, level, userEnrollments = {}) {
  const chain = scopeChainFor(user, level);
  for (let i = 0; i < chain.length; i += 1) {
    const key = chain[i];
    const entry = matrix?.[key];
    if (entry && entry.courseIds && entry.courseIds.length > 0) {
      const resolved = resolveUserRoadmapVersion(entry, userEnrollments);
      return {
        scopeKey: key,
        courseIds: resolved.courseIds,
        version: resolved.version,
        isArchived: resolved.isArchived,
        inheritedFrom: i === 0 ? null : key,
      };
    }
  }
  const fallbackKey = chain[chain.length - 1];
  const resolvedFallback = resolveUserRoadmapVersion(matrix?.[fallbackKey], userEnrollments);
  return {
    scopeKey: fallbackKey,
    courseIds: resolvedFallback.courseIds,
    version: resolvedFallback.version,
    isArchived: false,
    inheritedFrom: null,
  };
}

/**
 * Saves a new course list for exactly one Scope Key:
 *  - If the Scope Key does NOT exist yet (Create New Roadmap) -> initialize v1.0 and
 *    freeze nothing.
 *  - If it EXISTS and the list genuinely changed -> freeze the current version
 *    into `versions[oldVersion]` and bump to a new version (v1.0 ->
 *    v2.0 -> v3.0 -> ... unbounded), exactly like `publishNewCourseVersion`.
 *  - If the list is unchanged -> leave it alone and create no junk version.
 */
export function publishRoadmapScope(matrix, scopeKey, nextCourseIds, meta = {}) {
  const prev = matrix[scopeKey];
  const cleanIds = [...nextCourseIds];

  if (!prev) {
    return {
      ...matrix,
      [scopeKey]: {
        currentVersion: 'v1.0',
        courseIds: cleanIds,
        versions: {},
        versionHistory: [{ version: 'v1.0', updatedBy: meta.updatedBy || 'Admin', updatedAt: meta.updatedAt, note: meta.note || 'Roadmap created.' }],
      },
    };
  }

  const sameContent =
    prev.courseIds.length === cleanIds.length && prev.courseIds.every((id, idx) => id === cleanIds[idx]);
  if (sameContent) return matrix;

  const oldVersion = prev.currentVersion || 'v1.0';
  const newVersion = nextMajorVersion(oldVersion);
  return {
    ...matrix,
    [scopeKey]: {
      currentVersion: newVersion,
      courseIds: cleanIds,
      versions: {
        ...prev.versions,
        [oldVersion]: { courseIds: prev.courseIds, archivedAt: meta.updatedAt, updatedBy: meta.updatedBy || 'Admin', changeLog: meta.note || `Version ${oldVersion} was frozen when ${newVersion} was published.` },
      },
      versionHistory: [
        { version: newVersion, updatedBy: meta.updatedBy || 'Admin', updatedAt: meta.updatedAt, note: meta.note || `Published version ${newVersion}.` },
        ...(prev.versionHistory || []),
      ],
    },
  };
}

/**
 * Converts the old Level x Branch matrix (CURRENT_ROADMAPS) into flat scope keys
 * `${buId}:*:*:*:${level}` — preserving 100% of the existing configuration with no data loss
 * on upgrade to the multi-tier model. Each entry starts at v1.0.
 */
export function migrateLevelBranchMatrix(oldMatrix) {
  const next = {};
  Object.entries(oldMatrix || {}).forEach(([level, byBranch]) => {
    Object.entries(byBranch || {}).forEach(([branch, set]) => {
      const buId = buIdForBranch(branch);
      const key = buildScopeKey({ buId, level });
      next[key] = { currentVersion: 'v1.0', courseIds: [...(set?.courseIds || [])], versions: {}, versionHistory: [] };
    });
  });
  return next;
}

/**
 * Lists EVERY real organizational position (BU x Division x Department x
 * Sub-Department) that has at least 1 employee, with headcount per Level —
 * used to build the Roadmap Directory so it shows exactly what learners
 * actually see, instead of only the scopes an Admin happened to configure.
 */
export function listRealOrgPositions(users) {
  const map = new Map();
  (users || []).forEach((u) => {
    const buId = buIdForBranch(u.branch);
    const key = [buId, u.divisionId || '', u.departmentId || '', subScopeIdOf(u) || ''].join('|');
    if (!map.has(key)) {
      map.set(key, {
        buId,
        divisionId: u.divisionId || null,
        departmentId: u.departmentId || null,
        subDepartmentId: subScopeIdOf(u) || null,
        levelCounts: {},
      });
    }
    const entry = map.get(key);
    entry.levelCounts[u.level] = (entry.levelCounts[u.level] || 0) + 1;
  });
  return Array.from(map.values());
}
