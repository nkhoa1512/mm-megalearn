# Enterprise 7-Level Learning Roadmap System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the static, hand-curated "Career Learning Paths" learner page with a dynamic, per-employee 3-tier learning roadmap (Core Mandatory / Functional Elective / OJT Promotion Gate) computed live from the existing 7-level job scale, editable only by User Admin & System Admin, and surfaced read-only to Manager/HRBP/Talent-review UIs.

**Architecture:** A new pure-function data module (`levelRoadmapMatrix.js`) owns the roadmap config shape, branch derivation, and completion math; `CourseStore.jsx` holds the config as React state (localStorage-persisted, same pattern as courses/approvals) and exposes CRUD actions plus a `ROADMAP_PROMOTION` approval-request type that reuses the existing approvals queue and the existing `promoteUserLevel` action. A new admin page edits the config; a shared read-only `RoadmapTierView` component renders it everywhere else (learner page rewrite, Manager team view, User Admin/HRBP review modals).

**Tech Stack:** React 18 + Vite 5, react-router-dom 6, no TypeScript, no test framework — this repo's test suite is a hand-rolled SSR smoke harness (`scripts/verify-role-level-model.jsx`, run via `npm run verify`) plus a table-overflow auditor (`scripts/check-table-widths.jsx`, run via `npm run check:tables`). All "tests" in this plan are `check(label, ok, extra)` assertions added to that harness, run with `npm run verify`.

**Spec:** [docs/superpowers/specs/2026-08-25-level-roadmap-system-design.md](../specs/2026-08-25-level-roadmap-system-design.md) — read it alongside this plan. Two corrections made during planning research (the spec file has not been re-edited, note them here instead):
1. §4 said promoting a user's level required new code — it doesn't. `CourseStore.jsx` already has `promoteUserLevel(userId, newLevel, reason)` (sets `level`, `levelTitle`, `lastPromotedAt`, syncs `currentUser`, persists to `USERS_KEY`), already wired into `UserTranscriptModal.jsx`'s manual "⭐ Thăng Cấp Bậc" flow. The new `approveRequest` branch for `ROADMAP_PROMOTION` calls this existing action instead of reinventing it.
2. §3.2 proposed deriving a user's branch from `divisionCode === 'OPT'`. Unnecessary — every user object (hero personas and all 100 generated users) already carries an explicit `branch: 'OPERATIONS' | 'SUPPORTING'` field (see `generated100Data.js`), already read directly in `TalentProfileModal.jsx` (`u.branch`). Use `user.branch` directly.

## Global Constraints

- Every new/changed table, list row, or flex row with a growing text column MUST use `flex: 1, minWidth: 0` on that column plus `overflow: hidden; textOverflow: ellipsis; whiteSpace: nowrap` — this codebase has a recurring letter-by-letter text-wrap bug from omitting this, and horizontal scroll to see a column is never acceptable (see `src/styles/app.css`'s `.table` rule comment for the root-cause writeup).
- Only `useradmin` and `sysadmin` may create/edit roadmap config (capability `canManageLevelRoadmaps`, added to both role's `capabilities` arrays in `src/data/roles.js`) — every other role gets the existing "không có quyền" empty-state pattern (see `AdminCourseBuilder.jsx:185-193`) if they somehow reach the route.
- Course counts must not be hand-matched to the original ~18/18/16/16/14/12/8-per-level table from the request — only "every Level × Branch has real content in all 3 tiers" is required (confirmed with the user during brainstorming).
- No automatic instant promotion — reaching 100%×3 tiers only unlocks a request; `useradmin`/`sysadmin` still approves it via the existing approvals queue.
- Follow existing Vietnamese-UI-copy convention for all new user-facing strings; keep English for code identifiers, matching the rest of the codebase.

---

## Task 1: Mock data gap-fill — add Level 1–4 roadmap content to the 100-course catalog

**Files:**
- Modify: `src/data/generated100Data.js:591-604` (COURSE_LEVEL_LADDER), `src/data/generated100Data.js:575-576` (end of COURSE_CATALOG_TEMPLATES)
- Modify: `scripts/verify-role-level-model.jsx:88` (course-count assertion)

**Interfaces:**
- Produces: 22 new courses (122 total) spanning 7 new `domain` values, each with a `targetLevel` resolved the same way as existing courses (via `COURSE_LEVEL_LADDER[codePrefix]`). No new fields, no schema change — later tasks read `course.domain`, `course.targetLevel`, `course.modality`, `course.courseType`, `course.id`, `course.code`, `course.title` exactly as today.

Today, `resolveCourseTargetLevel` + `COURSE_LEVEL_LADDER` puts almost nothing at Level 1 (1 course) or Level 2 (3 courses), and no domain has classroom/capstone content at Levels 4, 3, 2, or 1 — Tier 3 (OJT/Promotion Gate) would be empty at those levels for both branches. This task adds 7 small domains (22 courses) that close every gap; the exact algorithm that proves coverage is complete lives in Task 2's test.

- [ ] **Step 1: Add 7 new entries to `COURSE_LEVEL_LADDER`**

In `src/data/generated100Data.js`, find the end of the `COURSE_LEVEL_LADDER` object:

```js
  CSERV: [['7', 3], ['6', Infinity]],
  CULT:  [['7', 5], ['6', Infinity]],
};
```

Replace with:

```js
  CSERV: [['7', 3], ['6', Infinity]],
  CULT:  [['7', 5], ['6', Infinity]],
  TTT:      [['4', Infinity]],
  MGT3:     [['3', Infinity]],
  SUCC:     [['2', Infinity]],
  GOV:      [['1', Infinity]],
  EXEC:     [['1', Infinity]],
  TALENT:   [['2', Infinity]],
  CAPSTONE: [['4', 1], ['3', 2], ['2', 3], ['1', Infinity]],
};
```

- [ ] **Step 2: Add 7 new templates to `COURSE_CATALOG_TEMPLATES`**

Find the end of the `COURSE_CATALOG_TEMPLATES` array:

```js
    'Trade Union Benefits & Social Insurance Policies',
  ]},
];
```

Replace with:

```js
    'Trade Union Benefits & Social Insurance Policies',
  ]},

  // 13. Train-The-Trainer & Coaching Standards (3 courses) — Level 4 gap-fill
  { domain: 'Train-The-Trainer & Coaching Standards', codePrefix: 'TTT', count: 3, cat: 'Leadership & Management', isMandatory: true, targetType: 'LEVEL', targetId: '4', passScore: 80, time: '3h', modality: 'SCORM_PACKAGE', format: 'SCORM 2004', titles: [
    'Train-The-Trainer Certification & Coaching Standards (TTT)',
    'Department On-the-Job Coaching & Skill Transfer Framework',
    'Structured Feedback & Performance Coaching for Line Managers',
  ]},

  // 14. Master Trainer & Section Governance (3 courses) — Level 3 gap-fill
  { domain: 'Master Trainer & Section Governance', codePrefix: 'MGT3', count: 3, cat: 'Leadership & Management', isMandatory: true, targetType: 'LEVEL', targetId: '3', passScore: 82, time: '4h', modality: 'SCORM_PACKAGE', format: 'SCORM 2004', titles: [
    'Section Governance & Category P&L Ownership',
    'Master Trainer Curriculum Design & Facilitation Standards',
    'Cross-Functional Vendor & Supply Chain Negotiation Governance',
  ]},

  // 15. Succession & Store P&L Governance (4 courses) — Level 2 gap-fill
  { domain: 'Succession & Store P&L Governance', codePrefix: 'SUCC', count: 4, cat: 'Leadership & Management', isMandatory: true, targetType: 'LEVEL', targetId: '2', passScore: 82, time: '4h', modality: 'SCORM_PACKAGE', format: 'SCORM 2004', titles: [
    'Store General Manager P&L Governance & Budget Ownership',
    'Succession Planning & Talent Pipeline Committee Standards',
    'Multi-Store Crisis Management & Legal Escalation',
    'SGM Store Portfolio Strategic Planning',
  ]},

  // 16. Corporate Governance & ESG (4 courses) — Level 1 gap-fill
  { domain: 'Corporate Governance & ESG', codePrefix: 'GOV', count: 4, cat: 'Compliance & Ethics', isMandatory: true, targetType: 'LEVEL', targetId: '1', passScore: 85, time: '4h', modality: 'SCORM_PACKAGE', format: 'SCORM 2004', titles: [
    'Corporate Governance & Board Reporting Standards',
    'ESG Strategy & Sustainable Retail Compliance',
    'Enterprise Risk Management & Crisis Governance',
    'Regulatory Affairs & National Retail Market Policy',
  ]},

  // 17. Executive Strategy Electives (2 courses) — Level 1 elective gap-fill
  { domain: 'Executive Strategy Electives', codePrefix: 'EXEC', count: 2, cat: 'Leadership & Management', isMandatory: false, targetType: 'LEVEL', targetId: '1', passScore: 75, time: '5h', modality: 'EXTERNAL_PLATFORM', platformSource: 'Coursera / Udemy Executive Education', format: 'Coursera Embed', titles: [
    'Executive Retail Strategy (Coursera Executive Education)',
    'M&A and International Market Expansion Fundamentals',
  ]},

  // 18. Talent & Store Portfolio Electives (2 courses) — Level 2 elective gap-fill
  { domain: 'Talent & Store Portfolio Electives', codePrefix: 'TALENT', count: 2, cat: 'Leadership & Management', isMandatory: false, targetType: 'LEVEL', targetId: '2', passScore: 75, time: '4h', modality: 'EXTERNAL_PLATFORM', platformSource: 'LinkedIn Learning / Coursera', format: 'LinkedIn Learning Embed', titles: [
    'Omnichannel Retail Leadership (LinkedIn Learning)',
    'Advanced Talent Analytics & Workforce Planning',
  ]},

  // 19. OJT Capstone & Promotion Defense (4 courses) — Tier 3 gap-fill, Levels 4/3/2/1
  { domain: 'OJT Capstone & Promotion Defense', codePrefix: 'CAPSTONE', count: 4, cat: 'Leadership & Management', isMandatory: true, targetType: 'LEVEL', targetId: '1', passScore: 85, time: '4h', modality: 'CLASSROOM_LAB', format: 'Capstone Defense & Committee Review', titles: [
    'Line Manager Practical Coaching Capstone Defense',
    'Master Trainer / Thánh Gióng Fast-Track Capstone Defense',
    'Store General Manager (SGM) Portfolio Capstone Defense',
    'Board Capstone Review & Executive Case Defense',
  ]},
];
```

- [ ] **Step 3: Update the stale course-count assertion in the verify harness**

In `scripts/verify-role-level-model.jsx`, find:

```js
check('100 courses generated', generated100Courses.length === 100, String(generated100Courses.length));
```

Replace with:

```js
check('122 courses generated (100 base + 22 Level 1-4 roadmap gap-fill)', generated100Courses.length === 122, String(generated100Courses.length));
const newRoadmapDomains = [
  'Train-The-Trainer & Coaching Standards', 'Master Trainer & Section Governance',
  'Succession & Store P&L Governance', 'Corporate Governance & ESG',
  'Executive Strategy Electives', 'Talent & Store Portfolio Electives',
  'OJT Capstone & Promotion Defense',
];
check('all 7 gap-fill domains present', newRoadmapDomains.every((d) => generated100Courses.some((c) => c.domain === d)),
  newRoadmapDomains.filter((d) => !generated100Courses.some((c) => c.domain === d)).join(','));
```

- [ ] **Step 4: Run verify and build**

Run: `npm run verify`
Expected: all lines print `ok`, including the two new checks above; total failure count printed at the end is `0`.

Run: `npm run build`
Expected: exits 0, no errors.

- [ ] **Step 5: Commit**

```bash
git add src/data/generated100Data.js scripts/verify-role-level-model.jsx
git commit -m "feat: add 22 Level 1-4 roadmap gap-fill courses to the catalog"
```

---

## Task 2: `src/data/levelRoadmapMatrix.js` — roadmap data model & pure functions

**Files:**
- Create: `src/data/levelRoadmapMatrix.js`
- Modify: `scripts/verify-role-level-model.jsx` (new section)

**Interfaces:**
- Consumes: `LEVEL_ORDER`, `nextLevelUp` from `./levelSystem`; `generated100Courses` from `./generated100Data`.
- Produces (all consumed by Task 3 onward):
  - `ROADMAP_BRANCHES = { OPERATIONS: 'OPERATIONS', SUPPORTING: 'SUPPORTING' }`
  - `ROADMAP_TIERS = { CORE_MANDATORY: {id, labelVi}, FUNCTIONAL_ELECTIVE: {...}, OJT_PROMOTION_GATE: {...} }`
  - `TIER_ORDER = ['CORE_MANDATORY', 'FUNCTIONAL_ELECTIVE', 'OJT_PROMOTION_GATE']`
  - `branchForUser(user) => 'OPERATIONS' | 'SUPPORTING'`
  - `branchesForCourse(course) => string[]` (1 or 2 of the branch constants)
  - `INITIAL_LEVEL_ROADMAPS` — the full seeded config object, shape `{ [level]: { [branch]: { [tierId]: { courseIds: string[], minRequired?: number } } } }`
  - `computeUserRoadmap(user, roadmapsConfig, enrollments, courses) => { level, branch, tiers: { [tierId]: { courses: [{course, completed}], completedCount, requiredCount, percent, done } }, readyForPromotion: boolean, nextLevel: string|null }`
  - `addCourseToRoadmap(roadmaps, level, branch, tier, courseId) => newRoadmaps` (pure, immutable)
  - `removeCourseFromRoadmap(roadmaps, level, branch, tier, courseId) => newRoadmaps` (pure, immutable)
  - `updateRoadmapConfig(roadmaps, level, branch, tier, patch) => newRoadmaps` (pure, immutable)

- [ ] **Step 1: Write `src/data/levelRoadmapMatrix.js`**

```js
// ===========================================================================
// MM MegaLearn - Lộ Trình Cấp Bậc 3 Tầng (Level Roadmap Matrix)
// Mỗi Level (7->1) x Khối (OPERATIONS/SUPPORTING) có 3 tầng:
//   CORE_MANDATORY      - phải hoàn thành 100%
//   FUNCTIONAL_ELECTIVE - phải hoàn thành tối thiểu N khóa (minRequired)
//   OJT_PROMOTION_GATE  - phải hoàn thành 100%, mở khóa "Sẵn sàng Thăng cấp"
// ===========================================================================

import { LEVEL_ORDER, nextLevelUp } from './levelSystem';
import { generated100Courses } from './generated100Data';

export const ROADMAP_BRANCHES = { OPERATIONS: 'OPERATIONS', SUPPORTING: 'SUPPORTING' };

export const ROADMAP_TIERS = {
  CORE_MANDATORY: { id: 'CORE_MANDATORY', labelVi: 'Tầng 1: Định Biên Bắt Buộc' },
  FUNCTIONAL_ELECTIVE: { id: 'FUNCTIONAL_ELECTIVE', labelVi: 'Tầng 2: Kỹ Năng Chuyên Môn & Tích Lũy' },
  OJT_PROMOTION_GATE: { id: 'OJT_PROMOTION_GATE', labelVi: 'Tầng 3: Thực Hành Thực Địa & Sát Hạch Thăng Cấp' },
};

export const TIER_ORDER = ['CORE_MANDATORY', 'FUNCTIONAL_ELECTIVE', 'OJT_PROMOTION_GATE'];

// Khóa học không có trường branch riêng (chỉ có domain) — bảng này quyết định
// khóa thuộc Khối nào trên lộ trình. KHÔNG dùng course.targetId/division vì dữ
// liệu đó không nhất quán cho mục đích này (vd. khóa An Toàn Thực Phẩm target
// div-omd nhưng lại là nội dung dành cho nhân viên vận hành tuyến đầu).
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

// Mọi user (persona lẫn 100 nhân sự generate) đã có sẵn field branch —
// xem generated100Data.js. Không cần suy luận lại từ divisionCode.
export function branchForUser(user) {
  return user?.branch === 'OPERATIONS' ? ROADMAP_BRANCHES.OPERATIONS : ROADMAP_BRANCHES.SUPPORTING;
}

function emptyTierSet() {
  return {
    CORE_MANDATORY: { courseIds: [] },
    FUNCTIONAL_ELECTIVE: { courseIds: [], minRequired: 0 },
    OJT_PROMOTION_GATE: { courseIds: [] },
  };
}

/**
 * Xây dựng cấu hình lộ trình mặc định từ danh mục khóa học hiện có:
 *   - Khóa CLASSROOM_LAB (tối đa 2 khóa/Level/Khối) -> Tầng 3 (OJT/Sát hạch).
 *   - Khóa MANDATORY còn lại -> Tầng 1 (Định biên bắt buộc).
 *   - Khóa OPTIONAL -> Tầng 2 (Kỹ năng chuyên môn).
 * minRequired của Tầng 2 mặc định = min(3, tổng số khóa elective của tầng đó).
 */
export function buildInitialRoadmaps(courses) {
  const config = {};
  LEVEL_ORDER.forEach((level) => {
    config[level] = { OPERATIONS: emptyTierSet(), SUPPORTING: emptyTierSet() };
  });

  courses.forEach((course) => {
    const level = course.targetLevel;
    if (!config[level]) return;
    branchesForCourse(course).forEach((branch) => {
      const tierSet = config[level][branch];
      if (course.modality === 'CLASSROOM_LAB' && tierSet.OJT_PROMOTION_GATE.courseIds.length < 2) {
        tierSet.OJT_PROMOTION_GATE.courseIds.push(course.id);
      } else if (course.courseType === 'MANDATORY') {
        tierSet.CORE_MANDATORY.courseIds.push(course.id);
      } else {
        tierSet.FUNCTIONAL_ELECTIVE.courseIds.push(course.id);
      }
    });
  });

  LEVEL_ORDER.forEach((level) => {
    Object.values(ROADMAP_BRANCHES).forEach((branch) => {
      const tierSet = config[level][branch];
      tierSet.FUNCTIONAL_ELECTIVE.minRequired = Math.min(3, tierSet.FUNCTIONAL_ELECTIVE.courseIds.length);
    });
  });

  return config;
}

export const INITIAL_LEVEL_ROADMAPS = buildInitialRoadmaps(generated100Courses);

/**
 * Tính % hoàn thành từng tầng + trạng thái sẵn sàng thăng cấp cho 1 user.
 * `enrollments` là object { [userId]: { [courseId]: { status, ... } } } —
 * đúng shape đang dùng trong CourseStore.
 */
export function computeUserRoadmap(user, roadmapsConfig, enrollments, courses) {
  const level = user?.level;
  const branch = branchForUser(user);
  const levelConfig = roadmapsConfig[level]?.[branch];
  const userEnrollments = (user && enrollments[user.userId]) || {};

  const isCompleted = (courseId) => userEnrollments[courseId]?.status === 'COMPLETED';
  const courseById = (courseId) => courses.find((c) => c.id === courseId);

  function buildTier(tierId) {
    const tierConfig = levelConfig?.[tierId] || { courseIds: [] };
    const tierCourses = tierConfig.courseIds
      .map((id) => courseById(id))
      .filter(Boolean)
      .map((course) => ({ course, completed: isCompleted(course.id) }));
    const completedCount = tierCourses.filter((c) => c.completed).length;
    const requiredCount = tierId === 'FUNCTIONAL_ELECTIVE'
      ? (tierConfig.minRequired ?? tierCourses.length)
      : tierCourses.length;
    const percent = requiredCount === 0 ? 100 : Math.min(100, Math.round((completedCount / requiredCount) * 100));
    return { courses: tierCourses, completedCount, requiredCount, percent, done: percent >= 100 };
  }

  const tiers = {
    CORE_MANDATORY: buildTier('CORE_MANDATORY'),
    FUNCTIONAL_ELECTIVE: buildTier('FUNCTIONAL_ELECTIVE'),
    OJT_PROMOTION_GATE: buildTier('OJT_PROMOTION_GATE'),
  };

  const nextLevel = nextLevelUp(level);
  const readyForPromotion = nextLevel !== null
    && tiers.CORE_MANDATORY.done
    && tiers.FUNCTIONAL_ELECTIVE.done
    && tiers.OJT_PROMOTION_GATE.done;

  return { level, branch, tiers, readyForPromotion, nextLevel };
}

export function addCourseToRoadmap(roadmaps, level, branch, tier, courseId) {
  const tierSet = roadmaps[level]?.[branch]?.[tier];
  if (!tierSet || tierSet.courseIds.includes(courseId)) return roadmaps;
  return {
    ...roadmaps,
    [level]: {
      ...roadmaps[level],
      [branch]: {
        ...roadmaps[level][branch],
        [tier]: { ...tierSet, courseIds: [...tierSet.courseIds, courseId] },
      },
    },
  };
}

export function removeCourseFromRoadmap(roadmaps, level, branch, tier, courseId) {
  const tierSet = roadmaps[level]?.[branch]?.[tier];
  if (!tierSet) return roadmaps;
  return {
    ...roadmaps,
    [level]: {
      ...roadmaps[level],
      [branch]: {
        ...roadmaps[level][branch],
        [tier]: { ...tierSet, courseIds: tierSet.courseIds.filter((id) => id !== courseId) },
      },
    },
  };
}

export function updateRoadmapConfig(roadmaps, level, branch, tier, patch) {
  const tierSet = roadmaps[level]?.[branch]?.[tier];
  if (!tierSet) return roadmaps;
  return {
    ...roadmaps,
    [level]: {
      ...roadmaps[level],
      [branch]: {
        ...roadmaps[level][branch],
        [tier]: { ...tierSet, ...patch },
      },
    },
  };
}
```

- [ ] **Step 2: Add a new verify-harness section**

In `scripts/verify-role-level-model.jsx`, after the last existing `console.log('=== ...')` section (find the highest-numbered section header, e.g. `=== 13. ...` — append after its checks, before any trailing summary/exit code), add:

```js
// ---------------------------------------------------------------------------
console.log('=== 14. Level Roadmap Matrix: data model & pure functions ===');
const {
  ROADMAP_BRANCHES, ROADMAP_TIERS, TIER_ORDER, INITIAL_LEVEL_ROADMAPS,
  computeUserRoadmap, addCourseToRoadmap, removeCourseFromRoadmap, branchForUser, branchesForCourse,
} = await import('../src/data/levelRoadmapMatrix');

let coverageGaps = [];
for (const level of ['1', '2', '3', '4', '5', '6', '7']) {
  for (const branch of Object.values(ROADMAP_BRANCHES)) {
    for (const tier of TIER_ORDER) {
      if (INITIAL_LEVEL_ROADMAPS[level][branch][tier].courseIds.length === 0) coverageGaps.push(`${level}/${branch}/${tier}`);
    }
  }
}
check('every Level x Branch has content in all 3 tiers', coverageGaps.length === 0, coverageGaps.join(', '));

check('branchForUser reads user.branch directly', branchForUser({ branch: 'OPERATIONS' }) === 'OPERATIONS');
check('branchForUser defaults to SUPPORTING', branchForUser({ branch: 'SUPPORTING' }) === 'SUPPORTING');
const fshCourse = generated100Courses.find((c) => c.domain === 'Food Safety & Hygiene');
check('Food Safety course maps to OPERATIONS only', JSON.stringify(branchesForCourse(fshCourse)) === JSON.stringify(['OPERATIONS']));

const minhUser = generated100Users.find((u) => u.userId === 'USR-1042');
const emptyRoadmap = computeUserRoadmap(minhUser, INITIAL_LEVEL_ROADMAPS, {}, generated100Courses);
check('fresh learner has 0% on all 3 tiers', TIER_ORDER.every((t) => emptyRoadmap.tiers[t].percent === 0));
check('fresh learner not ready for promotion', emptyRoadmap.readyForPromotion === false);

const minhBranch = branchForUser(minhUser);
const minhTierConfig = INITIAL_LEVEL_ROADMAPS['7'][minhBranch];
const fullEnrollments = { [minhUser.userId]: {} };
['CORE_MANDATORY', 'OJT_PROMOTION_GATE'].forEach((t) => {
  minhTierConfig[t].courseIds.forEach((id) => { fullEnrollments[minhUser.userId][id] = { status: 'COMPLETED' }; });
});
minhTierConfig.FUNCTIONAL_ELECTIVE.courseIds.slice(0, minhTierConfig.FUNCTIONAL_ELECTIVE.minRequired).forEach((id) => {
  fullEnrollments[minhUser.userId][id] = { status: 'COMPLETED' };
});
const readyRoadmap = computeUserRoadmap(minhUser, INITIAL_LEVEL_ROADMAPS, fullEnrollments, generated100Courses);
check('learner who finished all 3 tiers is ready for promotion', readyRoadmap.readyForPromotion === true, JSON.stringify(readyRoadmap.tiers.CORE_MANDATORY.percent) + '/' + JSON.stringify(readyRoadmap.tiers.FUNCTIONAL_ELECTIVE.percent) + '/' + JSON.stringify(readyRoadmap.tiers.OJT_PROMOTION_GATE.percent));
check('readyForPromotion carries nextLevel', readyRoadmap.nextLevel === '6', readyRoadmap.nextLevel);

const sysadminPersona = personaForRole('sysadmin');
const topRoadmap = computeUserRoadmap(sysadminPersona, INITIAL_LEVEL_ROADMAPS, {}, generated100Courses);
check('Level 1 user has null nextLevel', topRoadmap.nextLevel === null);

const added = addCourseToRoadmap(INITIAL_LEVEL_ROADMAPS, '7', 'OPERATIONS', 'FUNCTIONAL_ELECTIVE', 'CRS-TEST-999');
check('addCourseToRoadmap adds without mutating original',
  added['7'].OPERATIONS.FUNCTIONAL_ELECTIVE.courseIds.includes('CRS-TEST-999')
  && !INITIAL_LEVEL_ROADMAPS['7'].OPERATIONS.FUNCTIONAL_ELECTIVE.courseIds.includes('CRS-TEST-999'));
const removed = removeCourseFromRoadmap(added, '7', 'OPERATIONS', 'FUNCTIONAL_ELECTIVE', 'CRS-TEST-999');
check('removeCourseFromRoadmap removes it back out', !removed['7'].OPERATIONS.FUNCTIONAL_ELECTIVE.courseIds.includes('CRS-TEST-999'));
```

- [ ] **Step 3: Run verify and build**

Run: `npm run verify`
Expected: section `=== 14. ... ===` prints, all `ok`, in particular `every Level x Branch has content in all 3 tiers` with no gap list printed as `extra`. If it fails, the `extra` output lists exactly which `level/branch/tier` combos are empty — cross-check against Task 1's new domains before assuming the algorithm is wrong.

Run: `npm run build`
Expected: exits 0.

- [ ] **Step 4: Commit**

```bash
git add src/data/levelRoadmapMatrix.js scripts/verify-role-level-model.jsx
git commit -m "feat: add level roadmap data model with full 7x2x3 coverage"
```

---

## Task 3: CourseStore wiring — roadmap state, ROADMAP_PROMOTION requests, ManagerApprovals UI

**Files:**
- Modify: `src/data/roles.js:89-95` (useradmin capabilities), `src/data/roles.js:108-114` (sysadmin capabilities)
- Modify: `src/state/CourseStore.jsx` (imports, state, persistence, actions, context value)
- Modify: `src/pages/manager/ManagerApprovals.jsx` (render ROADMAP_PROMOTION cards)
- Modify: `scripts/verify-role-level-model.jsx` (new section)

**Interfaces:**
- Consumes: `INITIAL_LEVEL_ROADMAPS`, `computeUserRoadmap`, `addCourseToRoadmap`, `removeCourseFromRoadmap`, `updateRoadmapConfig` from `../data/levelRoadmapMatrix` (Task 2); existing `promoteUserLevel` (already in `CourseStore.jsx:114`).
- Produces (context value additions, consumed by Tasks 4-7): `roadmapsConfig`, `getUserCareerRoadmap(user?)`, `addCourseToRoadmap(level, branch, tier, courseId)`, `removeCourseFromRoadmap(level, branch, tier, courseId)`, `updateRoadmapConfig(level, branch, tier, patch)`, `requestRoadmapPromotion(user?) => { ok, request? , reason? }`.

- [ ] **Step 1: Add `canManageLevelRoadmaps` capability to `useradmin` and `sysadmin`**

In `src/data/roles.js`, find (useradmin block):

```js
    capabilities: [
      'canLearn', 'canRequestLevelSkip', 'canApproveLevelSkip', 'canViewTeam',
      'canViewOrgProgress', 'canManageUsers', 'canAllocateCourses',
      'canAssignTrainers', 'canConfigureOrg', 'canViewCsat',
      // Toàn quyền tạo cả khóa Online lẫn Offline, và có thể tự đứng lớp.
      'canAuthorOnlineCourses', 'canAuthorOfflineCourses', 'canTeach', 'canBeAssignedToClass', 'canManageAttendance',
    ],
```

Replace with:

```js
    capabilities: [
      'canLearn', 'canRequestLevelSkip', 'canApproveLevelSkip', 'canViewTeam',
      'canViewOrgProgress', 'canManageUsers', 'canAllocateCourses',
      'canAssignTrainers', 'canConfigureOrg', 'canViewCsat',
      // Toàn quyền tạo cả khóa Online lẫn Offline, và có thể tự đứng lớp.
      'canAuthorOnlineCourses', 'canAuthorOfflineCourses', 'canTeach', 'canBeAssignedToClass', 'canManageAttendance',
      // Chỉ User Admin & SysAdmin cấu hình Lộ trình Cấp bậc 3 tầng.
      'canManageLevelRoadmaps',
    ],
```

Find (sysadmin block):

```js
    capabilities: [
      'canLearn', 'canRequestLevelSkip', 'canApproveLevelSkip', 'canViewTeam',
      'canViewOrgProgress', 'canManageUsers', 'canAllocateCourses',
      'canAssignTrainers', 'canConfigureOrg', 'canConfigureSystem', 'canViewAuditLogs',
      'canManageAllRoles', 'canDevelopPlatform', 'canViewCsat',
      'canAuthorOnlineCourses', 'canAuthorOfflineCourses', 'canTeach', 'canBeAssignedToClass', 'canManageAttendance',
    ],
```

Replace with:

```js
    capabilities: [
      'canLearn', 'canRequestLevelSkip', 'canApproveLevelSkip', 'canViewTeam',
      'canViewOrgProgress', 'canManageUsers', 'canAllocateCourses',
      'canAssignTrainers', 'canConfigureOrg', 'canConfigureSystem', 'canViewAuditLogs',
      'canManageAllRoles', 'canDevelopPlatform', 'canViewCsat',
      'canAuthorOnlineCourses', 'canAuthorOfflineCourses', 'canTeach', 'canBeAssignedToClass', 'canManageAttendance',
      'canManageLevelRoadmaps',
    ],
```

- [ ] **Step 2: Wire `roadmapsConfig` state + persistence in `CourseStore.jsx`**

Find the import block:

```js
import { checkCourseAccessRule, ACCESS_STATE, normalizeLevel } from '../data/levelSystem';
import { normalizeRole, hasCapability } from '../data/roles';
```

Replace with:

```js
import { checkCourseAccessRule, ACCESS_STATE, normalizeLevel } from '../data/levelSystem';
import { normalizeRole, hasCapability } from '../data/roles';
import {
  INITIAL_LEVEL_ROADMAPS,
  computeUserRoadmap,
  addCourseToRoadmap as addCourseToRoadmapPure,
  removeCourseFromRoadmap as removeCourseFromRoadmapPure,
  updateRoadmapConfig as updateRoadmapConfigPure,
} from '../data/levelRoadmapMatrix';
```

Find:

```js
const ENROLLMENT_KEY = 'mm-megalearn-enrollments-v6';
const USERS_KEY = 'mm-megalearn-users-v6';
```

Replace with:

```js
const ENROLLMENT_KEY = 'mm-megalearn-enrollments-v6';
const USERS_KEY = 'mm-megalearn-users-v6';
const ROADMAP_KEY = 'mm-megalearn-roadmaps-v6';
```

Find:

```js
  // Ghi danh phát sinh trong phiên: { [userId]: { [courseId]: enrollment } }.
  // Chồng lên ma trận ghi danh tĩnh của HRIS.
  const [enrollments, setEnrollments] = useState(() => loadItem(ENROLLMENT_KEY, {}));
```

Replace with:

```js
  // Ghi danh phát sinh trong phiên: { [userId]: { [courseId]: enrollment } }.
  // Chồng lên ma trận ghi danh tĩnh của HRIS.
  const [enrollments, setEnrollments] = useState(() => loadItem(ENROLLMENT_KEY, {}));

  // Cấu hình Lộ trình Cấp bậc 3 tầng: chỉ User Admin/SysAdmin sửa (UI gate),
  // mọi role đọc để tính % hoàn thành của chính mình hoặc của nhân sự khác.
  const [roadmapsConfig, setRoadmapsConfig] = useState(() => loadItem(ROADMAP_KEY, INITIAL_LEVEL_ROADMAPS));
```

Find:

```js
      localStorage.setItem(ENROLLMENT_KEY, JSON.stringify(enrollments));
    } catch {
      // ignore quota / private browsing
    }
  }, [isAuthenticated, currentUser, users, courses, classrooms, approvals, gamification, actionPlans, enrollments]);
```

Replace with:

```js
      localStorage.setItem(ENROLLMENT_KEY, JSON.stringify(enrollments));
      localStorage.setItem(ROADMAP_KEY, JSON.stringify(roadmapsConfig));
    } catch {
      // ignore quota / private browsing
    }
  }, [isAuthenticated, currentUser, users, courses, classrooms, approvals, gamification, actionPlans, enrollments, roadmapsConfig]);
```

- [ ] **Step 3: Rewrite `approveRequest` to handle `ROADMAP_PROMOTION`, add `requestRoadmapPromotion` and roadmap CRUD actions**

Find:

```js
  const approveRequest = useCallback(
    (reqId) => {
      const target = approvals.find((r) => r.id === reqId);
      const course = target ? courses.find((c) => c.id === target.courseId) : null;
      const learnerId = target?.userId;

      setApprovals((prev) =>
        prev.map((r) => (r.id === reqId ? { ...r, status: 'APPROVED', decidedAt: todayIso() } : r))
      );

      if (!learnerId || !course) return;
      setEnrollments((prev) => {
        const forUser = prev[learnerId] || {};
        if (forUser[course.id]) return prev;
        return {
          ...prev,
          [learnerId]: {
            ...forUser,
            [course.id]: {
              courseId: course.id,
              userId: learnerId,
              courseType: course.courseType,
              status: 'NOT_STARTED',
              progressPercent: 0,
              score: null,
              attemptsCount: 0,
              completedAt: null,
              dueDate: course.assignment?.dueDate || null,
              lastLessonTitle: course.modules?.[0]?.lessons?.[0]?.title || null,
              lastActivityAt: todayIso(),
              enrolledVia: 'LEVEL_ADVANCE_APPROVAL',
            },
          },
        };
      });
    },
    [approvals, courses]
  );
```

Replace with:

```js
  const approveRequest = useCallback(
    (reqId) => {
      const target = approvals.find((r) => r.id === reqId);

      setApprovals((prev) =>
        prev.map((r) => (r.id === reqId ? { ...r, status: 'APPROVED', decidedAt: todayIso() } : r))
      );

      if (!target) return;

      // Đơn Đề xuất Đánh giá Thăng cấp (roadmap 3 tầng) không gắn với 1 khóa
      // học cụ thể như LEVEL_ADVANCE — duyệt xong là thăng cấp thật cho học
      // viên luôn, tái dùng promoteUserLevel đã có sẵn thay vì tự viết lại.
      if (target.requestType === 'ROADMAP_PROMOTION') {
        if (target.targetLevel) promoteUserLevel(target.userId, target.targetLevel, target.justification);
        return;
      }

      const course = courses.find((c) => c.id === target.courseId);
      const learnerId = target.userId;
      if (!learnerId || !course) return;
      setEnrollments((prev) => {
        const forUser = prev[learnerId] || {};
        if (forUser[course.id]) return prev;
        return {
          ...prev,
          [learnerId]: {
            ...forUser,
            [course.id]: {
              courseId: course.id,
              userId: learnerId,
              courseType: course.courseType,
              status: 'NOT_STARTED',
              progressPercent: 0,
              score: null,
              attemptsCount: 0,
              completedAt: null,
              dueDate: course.assignment?.dueDate || null,
              lastLessonTitle: course.modules?.[0]?.lessons?.[0]?.title || null,
              lastActivityAt: todayIso(),
              enrolledVia: 'LEVEL_ADVANCE_APPROVAL',
            },
          },
        };
      });
    },
    [approvals, courses, promoteUserLevel]
  );

  const getUserCareerRoadmap = useCallback(
    (user = currentUser) => computeUserRoadmap(user, roadmapsConfig, enrollments, courses),
    [roadmapsConfig, enrollments, courses, currentUser]
  );

  const addCourseToRoadmapAction = useCallback(
    (level, branch, tier, courseId) => setRoadmapsConfig((prev) => addCourseToRoadmapPure(prev, level, branch, tier, courseId)),
    []
  );

  const removeCourseFromRoadmapAction = useCallback(
    (level, branch, tier, courseId) => setRoadmapsConfig((prev) => removeCourseFromRoadmapPure(prev, level, branch, tier, courseId)),
    []
  );

  const updateRoadmapConfigAction = useCallback(
    (level, branch, tier, patch) => setRoadmapsConfig((prev) => updateRoadmapConfigPure(prev, level, branch, tier, patch)),
    []
  );

  /**
   * Đề xuất Đánh giá Thăng cấp: học viên đã hoàn thành 100% cả 3 tầng lộ
   * trình cấp bậc hiện tại, gửi 1 đơn ROADMAP_PROMOTION vào cùng hàng đợi
   * approvals với LEVEL_ADVANCE — chỉ User Admin/System Admin thấy & duyệt.
   */
  const requestRoadmapPromotion = useCallback(
    (user = currentUser) => {
      const roadmap = computeUserRoadmap(user, roadmapsConfig, enrollments, courses);
      if (!roadmap.readyForPromotion) {
        return { ok: false, reason: 'Chưa hoàn thành 100% cả 3 tầng lộ trình cấp bậc hiện tại.' };
      }
      const request = {
        id: `req-roadmap-${Date.now()}`,
        requestType: 'ROADMAP_PROMOTION',
        userId: user.userId,
        employeeId: user.employeeCode,
        employeeName: user.fullName,
        position: user.position,
        department: `${user.departmentCode || ''} - ${user.departmentName || ''}`.replace(/^ - /, ''),
        currentLevel: roadmap.level,
        targetLevel: roadmap.nextLevel,
        requestDate: todayIso(),
        justification: 'Đã hoàn thành 100% cả 3 tầng của Lộ trình Cấp bậc hiện tại (Định biên Bắt buộc, Kỹ năng Chuyên môn, Thực hành & Sát hạch).',
        status: 'PENDING',
      };
      setApprovals((prev) => [
        request,
        ...prev.filter((a) => !(a.requestType === 'ROADMAP_PROMOTION' && a.userId === user.userId)),
      ]);
      return { ok: true, request };
    },
    [roadmapsConfig, enrollments, courses, currentUser]
  );
```

- [ ] **Step 4: Widen `levelAdvanceRequestsFor` to include `ROADMAP_PROMOTION`**

Find:

```js
  const levelAdvanceRequestsFor = useCallback(
    (approver = currentUser) => {
      const approverRole = normalizeRole(approver?.role);
      if (!approver || !hasCapability(approverRole, 'canApproveLevelSkip')) return [];
      return approvals.filter((a) => a.requestType === 'LEVEL_ADVANCE');
    },
    [approvals, currentUser]
  );
```

Replace with:

```js
  const levelAdvanceRequestsFor = useCallback(
    (approver = currentUser) => {
      const approverRole = normalizeRole(approver?.role);
      if (!approver || !hasCapability(approverRole, 'canApproveLevelSkip')) return [];
      return approvals.filter((a) => a.requestType === 'LEVEL_ADVANCE' || a.requestType === 'ROADMAP_PROMOTION');
    },
    [approvals, currentUser]
  );
```

- [ ] **Step 5: Expose the new actions/state on the context value**

Find:

```js
        approveRequest,
        rejectRequest,
        levelAdvanceRequestsFor,
        requestLevelAdvanceApproval,
```

Replace with:

```js
        approveRequest,
        rejectRequest,
        levelAdvanceRequestsFor,
        requestLevelAdvanceApproval,
        roadmapsConfig,
        getUserCareerRoadmap,
        addCourseToRoadmap: addCourseToRoadmapAction,
        removeCourseFromRoadmap: removeCourseFromRoadmapAction,
        updateRoadmapConfig: updateRoadmapConfigAction,
        requestRoadmapPromotion,
```

- [ ] **Step 6: Render `ROADMAP_PROMOTION` cards in `ManagerApprovals.jsx`**

Find:

```js
  function renderRequestCard(req) {
    const isLevelSkip = req.requestType === 'LEVEL_ADVANCE';
    const readiness = isLevelSkip ? readinessOf(req) : null;
    const jumpIsLegal = !isLevelSkip
      || String(nextLevelUp(req.currentLevel)) === String(normalizeLevel(req.courseLevel));

    return (
      <div
        key={req.id}
        className="card card-pad"
        style={{ borderColor: isLevelSkip ? 'var(--blue)' : 'var(--amber)', borderWidth: 1.5 }}
      >
```

Replace with:

```js
  function renderRequestCard(req) {
    const isLevelSkip = req.requestType === 'LEVEL_ADVANCE';
    const isRoadmapPromotion = req.requestType === 'ROADMAP_PROMOTION';
    const readiness = isLevelSkip ? readinessOf(req) : null;
    const jumpIsLegal = !isLevelSkip
      || String(nextLevelUp(req.currentLevel)) === String(normalizeLevel(req.courseLevel));

    return (
      <div
        key={req.id}
        className="card card-pad"
        style={{ borderColor: isLevelSkip ? 'var(--blue)' : isRoadmapPromotion ? 'var(--sage)' : 'var(--amber)', borderWidth: 1.5 }}
      >
```

Find:

```js
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            {isLevelSkip && <Badge tone="blue" icon="ti-stairs-up">Học vượt cấp</Badge>}
            <Badge tone="amber" icon="ti-clock">Gửi ngày: {req.requestDate}</Badge>
          </div>
        </div>

        {/* Cấp hiện tại -> cấp khóa học */}
        {isLevelSkip && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 12, padding: '10px 14px', background: '#EFF6FF', borderRadius: 8 }}>
            <span style={{ fontSize: 12, color: '#1E3A8A' }}>Cấp bậc hiện tại:</span>
            <JobLevelBadge level={req.currentLevel} />
            <i className="ti ti-arrow-right" style={{ color: '#1E40AF' }} />
            <span style={{ fontSize: 12, color: '#1E3A8A' }}>Xin học khóa cấp:</span>
            <JobLevelBadge level={req.courseLevel} />
            {jumpIsLegal ? (
              <Badge tone="sage" icon="ti-check">Vượt đúng 1 cấp liền kề — hợp lệ</Badge>
            ) : (
              <Badge tone="rust" icon="ti-ban">Nhảy cóc ≥ 2 cấp — không được phép duyệt</Badge>
            )}
          </div>
        )}

        <div style={{ background: 'var(--paper-sunken)', padding: '14px 16px', borderRadius: 8, marginBottom: 14 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--rail)', marginBottom: 4 }}>
            Khóa học xin duyệt: {req.courseName}
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--ink-soft)', marginBottom: 8 }}>
            Chi phí / Đơn vị tổ chức: <strong>{req.courseCost}</strong>
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--ink)' }}>
            <strong>Lý do của học viên:</strong> "{req.justification}"
          </div>
        </div>
```

Replace with:

```js
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            {isLevelSkip && <Badge tone="blue" icon="ti-stairs-up">Học vượt cấp</Badge>}
            {isRoadmapPromotion && <Badge tone="sage" icon="ti-trophy">Đề xuất Thăng cấp Lộ trình</Badge>}
            <Badge tone="amber" icon="ti-clock">Gửi ngày: {req.requestDate}</Badge>
          </div>
        </div>

        {/* Cấp hiện tại -> cấp khóa học (LEVEL_ADVANCE) hoặc cấp hiện tại -> cấp mục tiêu (ROADMAP_PROMOTION) */}
        {isLevelSkip && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 12, padding: '10px 14px', background: '#EFF6FF', borderRadius: 8 }}>
            <span style={{ fontSize: 12, color: '#1E3A8A' }}>Cấp bậc hiện tại:</span>
            <JobLevelBadge level={req.currentLevel} />
            <i className="ti ti-arrow-right" style={{ color: '#1E40AF' }} />
            <span style={{ fontSize: 12, color: '#1E3A8A' }}>Xin học khóa cấp:</span>
            <JobLevelBadge level={req.courseLevel} />
            {jumpIsLegal ? (
              <Badge tone="sage" icon="ti-check">Vượt đúng 1 cấp liền kề — hợp lệ</Badge>
            ) : (
              <Badge tone="rust" icon="ti-ban">Nhảy cóc ≥ 2 cấp — không được phép duyệt</Badge>
            )}
          </div>
        )}
        {isRoadmapPromotion && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 12, padding: '10px 14px', background: '#F0FDF4', borderRadius: 8 }}>
            <span style={{ fontSize: 12, color: '#166534' }}>Cấp bậc hiện tại:</span>
            <JobLevelBadge level={req.currentLevel} />
            <i className="ti ti-arrow-right" style={{ color: '#166534' }} />
            <span style={{ fontSize: 12, color: '#166534' }}>Đề xuất thăng lên:</span>
            <JobLevelBadge level={req.targetLevel} />
            <Badge tone="sage" icon="ti-check">Đã hoàn thành 100% cả 3 tầng lộ trình</Badge>
          </div>
        )}

        {!isRoadmapPromotion && (
          <div style={{ background: 'var(--paper-sunken)', padding: '14px 16px', borderRadius: 8, marginBottom: 14 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--rail)', marginBottom: 4 }}>
              Khóa học xin duyệt: {req.courseName}
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--ink-soft)', marginBottom: 8 }}>
              Chi phí / Đơn vị tổ chức: <strong>{req.courseCost}</strong>
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--ink)' }}>
              <strong>Lý do của học viên:</strong> "{req.justification}"
            </div>
          </div>
        )}
        {isRoadmapPromotion && (
          <div style={{ background: 'var(--paper-sunken)', padding: '14px 16px', borderRadius: 8, marginBottom: 14, fontSize: 12.5, color: 'var(--ink)' }}>
            <strong>Căn cứ đề xuất:</strong> "{req.justification}"
          </div>
        )}
```

Find:

```js
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
          <span style={{ fontSize: 12, color: 'var(--ink-faint)', maxWidth: 460 }}>
            <i className="ti ti-info-circle" style={{ marginRight: 4 }} />
            Phê duyệt sẽ mở khóa <strong>riêng khóa học này</strong> cho học viên và ghi danh ngay — không mở toàn bộ cấp bậc.
          </span>
          <div style={{ display: 'flex', gap: 10 }}>
            <Button variant="ghost" icon="ti-x" onClick={() => rejectRequest(req.id)}>Từ Chối</Button>
            <Button
              variant="primary"
              icon="ti-check"
              disabled={!jumpIsLegal}
              title={jumpIsLegal ? undefined : 'Không thể duyệt đơn nhảy cóc từ 2 cấp trở lên.'}
              onClick={() => approveRequest(req.id)}
            >
              Phê Duyệt Đơn Học Vượt Cấp
            </Button>
          </div>
        </div>
```

Replace with:

```js
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
          <span style={{ fontSize: 12, color: 'var(--ink-faint)', maxWidth: 460 }}>
            <i className="ti ti-info-circle" style={{ marginRight: 4 }} />
            {isRoadmapPromotion
              ? 'Phê duyệt sẽ thăng cấp bậc thật cho nhân sự này ngay lập tức.'
              : 'Phê duyệt sẽ mở khóa riêng khóa học này cho học viên và ghi danh ngay — không mở toàn bộ cấp bậc.'}
          </span>
          <div style={{ display: 'flex', gap: 10 }}>
            <Button variant="ghost" icon="ti-x" onClick={() => rejectRequest(req.id)}>Từ Chối</Button>
            <Button
              variant="primary"
              icon="ti-check"
              disabled={!jumpIsLegal}
              title={jumpIsLegal ? undefined : 'Không thể duyệt đơn nhảy cóc từ 2 cấp trở lên.'}
              onClick={() => approveRequest(req.id)}
            >
              {isRoadmapPromotion ? 'Phê Duyệt Thăng Cấp Bậc' : 'Phê Duyệt Đơn Học Vượt Cấp'}
            </Button>
          </div>
        </div>
```

Also update the processed-history table to not silently show blank cells for roadmap entries. Find:

```js
                    <td style={{ fontWeight: 500 }}>{req.courseName}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                        {req.currentLevel && <JobLevelBadge level={req.currentLevel} compact />}
                        {req.courseLevel && (
                          <>
                            <i className="ti ti-arrow-right" style={{ fontSize: 11, color: 'var(--ink-faint)' }} />
                            <JobLevelBadge level={req.courseLevel} compact />
                          </>
                        )}
                      </div>
                    </td>
```

Replace with:

```js
                    <td style={{ fontWeight: 500 }}>
                      {req.requestType === 'ROADMAP_PROMOTION' ? 'Đề xuất Thăng cấp Lộ trình' : req.courseName}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                        {req.currentLevel && <JobLevelBadge level={req.currentLevel} compact />}
                        {(req.courseLevel || req.targetLevel) && (
                          <>
                            <i className="ti ti-arrow-right" style={{ fontSize: 11, color: 'var(--ink-faint)' }} />
                            <JobLevelBadge level={req.courseLevel || req.targetLevel} compact />
                          </>
                        )}
                      </div>
                    </td>
```

- [ ] **Step 7: Add a verify-harness section**

Append after Task 2's section 14:

```js
// ---------------------------------------------------------------------------
console.log('=== 15. CourseStore: ROADMAP_PROMOTION request queue (useradmin/sysadmin only) ===');
store.set(APPROVAL_KEY, JSON.stringify([
  {
    id: 'req-roadmap-test-1', requestType: 'ROADMAP_PROMOTION', userId: 'USR-1042',
    employeeId: 'EMP-1042', employeeName: 'Minh Tran', position: 'Junior Associate',
    department: 'OPT - Operations Executive', currentLevel: '7', targetLevel: '6',
    requestDate: '2026-08-01', justification: 'Test roadmap promotion request.', status: 'PENDING',
  },
]));

actAs('useradmin');
const roadmapApprovalHtmlAdmin = render('useradmin sees ROADMAP_PROMOTION card', <ManagerApprovals />, '/approvals', '/approvals');
check('useradmin sees the roadmap promotion card', Boolean(roadmapApprovalHtmlAdmin && roadmapApprovalHtmlAdmin.includes('Đề xuất Thăng cấp Lộ trình')));
check('useradmin sees the roadmap-specific approve button label', Boolean(roadmapApprovalHtmlAdmin && roadmapApprovalHtmlAdmin.includes('Phê Duyệt Thăng Cấp Bậc')));

actAs('manager');
const roadmapApprovalHtmlManager = render('manager cannot see approvals at all', <ManagerApprovals />, '/manager/approvals', '/manager/approvals');
check('manager still sees the permission-denied empty state', Boolean(roadmapApprovalHtmlManager && roadmapApprovalHtmlManager.includes('Bạn không có quyền phê duyệt học vượt cấp')));

store.set(APPROVAL_KEY, JSON.stringify(pendingApprovalRequests));
```

- [ ] **Step 8: Run verify and build**

Run: `npm run verify`
Expected: section `=== 15. ... ===` all `ok`.

Run: `npm run build`
Expected: exits 0.

- [ ] **Step 9: Commit**

```bash
git add src/data/roles.js src/state/CourseStore.jsx src/pages/manager/ManagerApprovals.jsx scripts/verify-role-level-model.jsx
git commit -m "feat: wire roadmap state and ROADMAP_PROMOTION approvals into CourseStore"
```

---

## Task 4: `AdminLevelRoadmaps.jsx` — admin builder page + routing

**Files:**
- Create: `src/pages/admin/AdminLevelRoadmaps.jsx`
- Modify: `src/App.jsx` (import, PAGE_META, 2 routes)
- Modify: `src/components/Sidebar.jsx` (nav entries for `useradmin` and `sysadmin`)
- Modify: `scripts/verify-role-level-model.jsx` (new section)
- Modify: `scripts/check-table-widths.jsx` (add to PAGES)

**Interfaces:**
- Consumes: `useCourseStore()` → `currentUser, courses, roadmapsConfig, addCourseToRoadmap, removeCourseFromRoadmap, updateRoadmapConfig` (Task 3); `ROADMAP_TIERS, TIER_ORDER, ROADMAP_BRANCHES` (Task 2); `hasCapability(role, 'canManageLevelRoadmaps')` (Task 3).
- Produces: routes `/admin/roadmaps` and `/user-admin/roadmaps`, both rendering `AdminLevelRoadmaps`.

- [ ] **Step 1: Write `src/pages/admin/AdminLevelRoadmaps.jsx`**

```jsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useCourseStore } from '../../state/CourseStore';
import { normalizeRole, hasCapability } from '../../data/roles';
import { LEVEL_DEFINITIONS } from '../../data/levelSystem';
import { ROADMAP_TIERS, TIER_ORDER, ROADMAP_BRANCHES } from '../../data/levelRoadmapMatrix';
import { Badge, Button, Modal } from '../../components/ui';

const BRANCH_LABEL = { OPERATIONS: 'Khối Vận Hành Siêu Thị', SUPPORTING: 'Khối Văn Phòng Hỗ Trợ' };

export default function AdminLevelRoadmaps() {
  const { currentUser, courses, roadmapsConfig, addCourseToRoadmap, removeCourseFromRoadmap, updateRoadmapConfig } = useCourseStore();
  const role = normalizeRole(currentUser?.role);
  const canManage = hasCapability(role, 'canManageLevelRoadmaps');

  const [selectedLevel, setSelectedLevel] = useState('7');
  const [selectedBranch, setSelectedBranch] = useState(ROADMAP_BRANCHES.OPERATIONS);
  const [pickerTier, setPickerTier] = useState(null);
  const [pickerSearch, setPickerSearch] = useState('');

  if (!canManage) {
    return (
      <div className="empty-state">
        <i className="ti ti-lock" aria-hidden="true" style={{ color: 'var(--rust)' }} />
        <p>Bạn không có quyền quản lý Lộ trình Cấp bậc.</p>
        <Link to="/">Về trang chủ</Link>
      </div>
    );
  }

  const tierSet = roadmapsConfig[selectedLevel][selectedBranch];
  const courseById = (id) => courses.find((c) => c.id === id);

  const pickerCandidates = pickerTier
    ? courses
        .filter((c) => !tierSet[pickerTier].courseIds.includes(c.id))
        .filter((c) => !pickerSearch
          || c.title.toLowerCase().includes(pickerSearch.toLowerCase())
          || c.code.toLowerCase().includes(pickerSearch.toLowerCase()))
        .slice(0, 40)
    : [];

  return (
    <>
      <div className="page-header">
        <h1>Quản Lý Lộ Trình Cấp Bậc</h1>
        <p>Cấu hình 3 tầng khóa học cho từng Cấp bậc &times; Khối. Học viên thấy đúng nội dung này ngay khi bạn lưu.</p>
      </div>

      <div className="card card-pad" style={{ marginBottom: 20, display: 'flex', gap: 24, flexWrap: 'wrap' }}>
        <div>
          <div className="field-label" style={{ marginBottom: 6 }}>Cấp Bậc</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {LEVEL_DEFINITIONS.map((lvl) => (
              <button
                key={lvl.level}
                onClick={() => setSelectedLevel(lvl.level)}
                className="btn btn-sm"
                style={{
                  background: selectedLevel === lvl.level ? 'var(--rail)' : 'var(--paper-raised)',
                  color: selectedLevel === lvl.level ? '#fff' : 'var(--ink)',
                  borderColor: selectedLevel === lvl.level ? 'var(--rail)' : 'var(--line-strong)',
                }}
              >
                {lvl.emoji} Level {lvl.level}
              </button>
            ))}
          </div>
        </div>
        <div>
          <div className="field-label" style={{ marginBottom: 6 }}>Khối</div>
          <div style={{ display: 'flex', gap: 6 }}>
            {Object.values(ROADMAP_BRANCHES).map((branch) => (
              <button
                key={branch}
                onClick={() => setSelectedBranch(branch)}
                className="btn btn-sm"
                style={{
                  background: selectedBranch === branch ? 'var(--rail)' : 'var(--paper-raised)',
                  color: selectedBranch === branch ? '#fff' : 'var(--ink)',
                  borderColor: selectedBranch === branch ? 'var(--rail)' : 'var(--line-strong)',
                }}
              >
                {BRANCH_LABEL[branch]}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {TIER_ORDER.map((tierId) => {
          const meta = ROADMAP_TIERS[tierId];
          const tier = tierSet[tierId];
          return (
            <div key={tierId} className="card card-pad">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 10 }}>
                <div style={{ fontWeight: 800, fontSize: 14 }}>{meta.labelVi}</div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  {tierId === 'FUNCTIONAL_ELECTIVE' && (
                    <span style={{ fontSize: 12, color: 'var(--ink-soft)', display: 'flex', alignItems: 'center', gap: 6 }}>
                      Yêu cầu tối thiểu:
                      <input
                        type="number"
                        min={0}
                        max={tier.courseIds.length}
                        value={tier.minRequired}
                        onChange={(e) => updateRoadmapConfig(selectedLevel, selectedBranch, tierId, { minRequired: Number(e.target.value) })}
                        className="field-input"
                        style={{ width: 56, height: 28, fontSize: 12, textAlign: 'center' }}
                      />
                      / {tier.courseIds.length} khóa
                    </span>
                  )}
                  <Button size="sm" variant="outline" icon="ti-plus" onClick={() => { setPickerTier(tierId); setPickerSearch(''); }}>
                    Thêm Khóa Học
                  </Button>
                </div>
              </div>

              {tier.courseIds.length === 0 ? (
                <div style={{ fontSize: 12.5, color: 'var(--ink-faint)' }}>Chưa có khóa học nào ở tầng này.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {tier.courseIds.map((id) => {
                    const course = courseById(id);
                    if (!course) return null;
                    return (
                      <div key={id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 10px', background: 'var(--paper-sunken)', borderRadius: 6 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={course.title}>
                            {course.title}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--ink-faint)', fontFamily: 'var(--font-mono)' }}>{course.code} &middot; {course.domain}</div>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          icon="ti-trash"
                          onClick={() => removeCourseFromRoadmap(selectedLevel, selectedBranch, tierId, id)}
                          title="Xóa khỏi lộ trình"
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <Modal
        isOpen={Boolean(pickerTier)}
        onClose={() => setPickerTier(null)}
        title="Thêm Khóa Học Vào Lộ Trình"
        subtitle={pickerTier ? ROADMAP_TIERS[pickerTier].labelVi : ''}
        size="lg"
      >
        <input
          type="text"
          className="field-input"
          placeholder="Tìm theo tên hoặc mã khóa học..."
          value={pickerSearch}
          onChange={(e) => setPickerSearch(e.target.value)}
          style={{ width: '100%', marginBottom: 14 }}
        />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 420, overflowY: 'auto' }}>
          {pickerCandidates.length === 0 ? (
            <div style={{ fontSize: 12.5, color: 'var(--ink-faint)', textAlign: 'center', padding: 20 }}>
              Không tìm thấy khóa học phù hợp.
            </div>
          ) : (
            pickerCandidates.map((course) => (
              <div key={course.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', border: '1px solid var(--line)', borderRadius: 6 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={course.title}>
                    {course.title}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--ink-faint)' }}>
                    {course.code} &middot; {course.domain} &middot; Level {course.targetLevel}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="primary"
                  icon="ti-plus"
                  onClick={() => addCourseToRoadmap(selectedLevel, selectedBranch, pickerTier, course.id)}
                >
                  Thêm
                </Button>
              </div>
            ))
          )}
        </div>
      </Modal>
    </>
  );
}
```

- [ ] **Step 2: Wire routes and sidebar**

In `src/App.jsx`, find:

```js
import AdminTrainingOps from './pages/admin/AdminTrainingOps';
```

Replace with:

```js
import AdminTrainingOps from './pages/admin/AdminTrainingOps';
import AdminLevelRoadmaps from './pages/admin/AdminLevelRoadmaps';
```

Find:

```js
  '/admin/training-ops': { title: 'Đặt Phòng Thực Hành & Upload Danh Sách Học Viên', crumb: 'L&D Faculty' },
```

Replace with:

```js
  '/admin/training-ops': { title: 'Đặt Phòng Thực Hành & Upload Danh Sách Học Viên', crumb: 'L&D Faculty' },
  '/admin/roadmaps': { title: 'Quản Lý Lộ Trình Cấp Bậc (Level Roadmaps)', crumb: 'L&D Faculty' },
  '/user-admin/roadmaps': { title: 'Quản Lý Lộ Trình Cấp Bậc (Level Roadmaps)', crumb: 'User Admin (Level 2)' },
```

Find:

```js
              <Route path="/user-admin/trainers" element={<UserAdminPortal initialTab="TRAINER_ASSIGNMENT" />} />
```

Replace with:

```js
              <Route path="/user-admin/trainers" element={<UserAdminPortal initialTab="TRAINER_ASSIGNMENT" />} />
              <Route path="/user-admin/roadmaps" element={<AdminLevelRoadmaps />} />
```

Find:

```js
              <Route path="/admin/reports" element={<AdminReports />} />
```

Replace with:

```js
              <Route path="/admin/reports" element={<AdminReports />} />
              <Route path="/admin/roadmaps" element={<AdminLevelRoadmaps />} />
```

In `src/components/Sidebar.jsx`, find (useradmin array):

```js
    { to: '/user-admin/job-levels', label: 'Khung 7 Cấp Bậc Định Biên', icon: 'ti-id-badge-2' },
    { to: '/user-admin/allocation', label: 'Phân Bổ Khóa Học', icon: 'ti-stack-2' },
```

Replace with:

```js
    { to: '/user-admin/job-levels', label: 'Khung 7 Cấp Bậc Định Biên', icon: 'ti-id-badge-2' },
    { to: '/user-admin/roadmaps', label: 'Quản Lý Lộ Trình Cấp Bậc', icon: 'ti-map-2' },
    { to: '/user-admin/allocation', label: 'Phân Bổ Khóa Học', icon: 'ti-stack-2' },
```

Find (sysadmin array):

```js
    { to: '/sysadmin/org-config', label: 'Cấu Hình HRIS & Cây Tổ Chức', icon: 'ti-settings' },
    { to: '/trainer', label: 'Lớp Giảng Dạy & Live QR', icon: 'ti-school' },
    { to: '/approvals', label: 'Duyệt Đơn Học Vượt Cấp', icon: 'ti-clipboard-check', approvalBadge: true },
  ],
};
```

Replace with:

```js
    { to: '/sysadmin/org-config', label: 'Cấu Hình HRIS & Cây Tổ Chức', icon: 'ti-settings' },
    { to: '/admin/roadmaps', label: 'Quản Lý Lộ Trình Cấp Bậc', icon: 'ti-map-2' },
    { to: '/trainer', label: 'Lớp Giảng Dạy & Live QR', icon: 'ti-school' },
    { to: '/approvals', label: 'Duyệt Đơn Học Vượt Cấp', icon: 'ti-clipboard-check', approvalBadge: true },
  ],
};
```

- [ ] **Step 3: Add to the verify harness and the table-width auditor**

In `scripts/verify-role-level-model.jsx`, add the import near the other page imports:

```js
const AdminLevelRoadmaps = (await import('../src/pages/admin/AdminLevelRoadmaps')).default;
```

Append a new section after section 15:

```js
// ---------------------------------------------------------------------------
console.log('=== 16. AdminLevelRoadmaps: useradmin/sysadmin only ===');
for (const role of ['useradmin', 'sysadmin']) {
  actAs(role);
  const html = render(`${role} sees the roadmap builder`, <AdminLevelRoadmaps />, '/admin/roadmaps', '/admin/roadmaps');
  check(`${role} sees the Level/Branch selector`, Boolean(html && html.includes('Cấp Bậc') && html.includes('Khối')));
  check(`${role} sees at least one of the 3 tier labels`, Boolean(html && html.includes('Định Biên Bắt Buộc')));
}
for (const role of ['manager', 'trainer', 'hrbp', 'learner']) {
  actAs(role);
  const html = render(`${role} is denied the roadmap builder`, <AdminLevelRoadmaps />, '/admin/roadmaps', '/admin/roadmaps');
  check(`${role} sees the permission-denied empty state`, Boolean(html && html.includes('Bạn không có quyền quản lý Lộ trình Cấp bậc')));
}
```

In `scripts/check-table-widths.jsx`, find:

```js
  ['Hồ Sơ Nhân Sự (UserTranscriptModal)', <UserTranscriptModal targetUser={personaForRole('learner')} isOpen onClose={() => {}} />, '/manager/team'],
];
```

Replace with:

```js
  ['Hồ Sơ Nhân Sự (UserTranscriptModal)', <UserTranscriptModal targetUser={personaForRole('learner')} isOpen onClose={() => {}} />, '/manager/team'],
  ['Quản Lý Lộ Trình Cấp Bậc (Admin)', <AdminLevelRoadmaps />, '/admin/roadmaps'],
];
```

And add its import near the other page imports in that file (mirror the `AdminTrainingOps` import line):

```js
const AdminLevelRoadmaps = (await import('../src/pages/admin/AdminLevelRoadmaps')).default;
```

- [ ] **Step 4: Run verify, table-width audit, and build**

Run: `npm run verify`
Expected: section `=== 16. ... ===` all `ok`.

Run: `npm run check:tables`
Expected: no overflow reported for "Quản Lý Lộ Trình Cấp Bậc (Admin)".

Run: `npm run build`
Expected: exits 0.

- [ ] **Step 5: Commit**

```bash
git add src/pages/admin/AdminLevelRoadmaps.jsx src/App.jsx src/components/Sidebar.jsx scripts/verify-role-level-model.jsx scripts/check-table-widths.jsx
git commit -m "feat: add AdminLevelRoadmaps builder page for useradmin/sysadmin"
```

---

## Task 5: `RoadmapTierView.jsx` + rewrite `LearnerLearningPaths.jsx`

**Files:**
- Create: `src/components/RoadmapTierView.jsx`
- Modify: `src/pages/learner/LearnerLearningPaths.jsx` (full rewrite)
- Modify: `src/components/Sidebar.jsx:22` (learner nav label)
- Modify: `scripts/verify-role-level-model.jsx` (new section)

**Interfaces:**
- Consumes: `ROADMAP_TIERS, TIER_ORDER` (Task 2); `getUserCareerRoadmap, requestRoadmapPromotion, levelAdvanceRequestsFor` (Task 3).
- Produces: `RoadmapTierView({ roadmap })` — a read-only renderer consumed again by Tasks 6 and 7. `roadmap` must be the exact object shape returned by `computeUserRoadmap` (Task 2).

- [ ] **Step 1: Write `src/components/RoadmapTierView.jsx`**

```jsx
import React from 'react';
import { Badge, ProgressBar } from './ui';
import { ROADMAP_TIERS, TIER_ORDER } from '../data/levelRoadmapMatrix';

export default function RoadmapTierView({ roadmap }) {
  if (!roadmap) return null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {TIER_ORDER.map((tierId) => {
        const tier = roadmap.tiers[tierId];
        const meta = ROADMAP_TIERS[tierId];
        return (
          <div key={tierId} className="card card-pad">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
              <div style={{ fontWeight: 800, fontSize: 13.5, color: 'var(--ink)' }}>{meta.labelVi}</div>
              <Badge tone={tier.done ? 'sage' : 'amber'} icon={tier.done ? 'ti-circle-check' : 'ti-clock'}>
                {tier.completedCount}/{tier.requiredCount} &middot; {tier.percent}%
              </Badge>
            </div>
            <ProgressBar value={tier.percent} tone={tier.done ? 'sage' : 'rail'} size="sm" />
            <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {tier.courses.length === 0 ? (
                <div style={{ fontSize: 12, color: 'var(--ink-faint)' }}>Chưa có khóa học nào được cấu hình.</div>
              ) : (
                tier.courses.map(({ course, completed }) => (
                  <div key={course.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, padding: '6px 10px', background: 'var(--paper-sunken)', borderRadius: 6 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={course.title}>
                        {course.title}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--ink-faint)', fontFamily: 'var(--font-mono)' }}>{course.code}</div>
                    </div>
                    <Badge tone={completed ? 'sage' : 'slate'} icon={completed ? 'ti-check' : 'ti-hourglass'}>
                      {completed ? 'Hoàn thành' : 'Chưa xong'}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Rewrite `src/pages/learner/LearnerLearningPaths.jsx`**

Replace the entire file content with:

```jsx
import React, { useState } from 'react';
import { useCourseStore } from '../../state/CourseStore';
import { Badge, Button, ProgressBar } from '../../components/ui';
import RoadmapTierView from '../../components/RoadmapTierView';
import { levelDefinition } from '../../data/levelSystem';

export default function LearnerLearningPaths() {
  const { currentUser, getUserCareerRoadmap, requestRoadmapPromotion, levelAdvanceRequestsFor } = useCourseStore();
  const roadmap = getUserCareerRoadmap(currentUser);
  const levelDef = levelDefinition(roadmap.level);
  const [requestState, setRequestState] = useState(null); // null | 'ok' | 'not-ready'

  const alreadyRequested = (levelAdvanceRequestsFor(currentUser) || []).some(
    (a) => a.requestType === 'ROADMAP_PROMOTION' && a.userId === currentUser?.userId && a.status === 'PENDING'
  );

  const overallPercent = Math.round(
    (roadmap.tiers.CORE_MANDATORY.percent + roadmap.tiers.FUNCTIONAL_ELECTIVE.percent + roadmap.tiers.OJT_PROMOTION_GATE.percent) / 3
  );

  function handleRequestPromotion() {
    const result = requestRoadmapPromotion(currentUser);
    setRequestState(result.ok ? 'ok' : 'not-ready');
  }

  return (
    <>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <h1>Lộ Trình Cấp Bậc Của Tôi</h1>
            <Badge tone="rail" icon="ti-map-2">{levelDef.emoji} Level {roadmap.level} &middot; {levelDef.shortVi}</Badge>
          </div>
          <p>
            Lộ trình 3 tầng do User Admin / System Admin thiết lập cho{' '}
            <strong>{roadmap.branch === 'OPERATIONS' ? 'Khối Vận Hành Siêu Thị' : 'Khối Văn Phòng Hỗ Trợ'}</strong>.
            Hoàn thành cả 3 tầng để đủ điều kiện đề xuất thăng cấp{roadmap.nextLevel ? ` lên Level ${roadmap.nextLevel}` : ''}.
          </p>
        </div>
      </div>

      <div className="card card-pad" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 12, color: 'var(--ink-soft)', textTransform: 'uppercase', fontWeight: 700 }}>
              Điểm Sẵn Sàng Thăng Cấp
            </div>
            <div style={{ fontSize: 30, fontWeight: 900, color: overallPercent >= 100 ? 'var(--sage)' : 'var(--rail)' }}>
              {overallPercent}%
            </div>
          </div>
          {roadmap.nextLevel ? (
            <div style={{ textAlign: 'right' }}>
              {roadmap.readyForPromotion ? (
                alreadyRequested || requestState === 'ok' ? (
                  <Badge tone="sage" icon="ti-clock">Đơn thăng cấp đang chờ User Admin / System Admin duyệt</Badge>
                ) : (
                  <Button variant="primary" icon="ti-award" onClick={handleRequestPromotion}>
                    Đề Xuất Đánh Giá Thăng Cấp
                  </Button>
                )
              ) : (
                <Button variant="outline" icon="ti-lock" disabled title="Hoàn thành 100% cả 3 tầng để mở nút này">
                  Đề Xuất Đánh Giá Thăng Cấp
                </Button>
              )}
            </div>
          ) : (
            <Badge tone="amber" icon="ti-crown">Đã ở cấp bậc cao nhất (Level 1)</Badge>
          )}
        </div>
        <ProgressBar value={overallPercent} tone={overallPercent >= 100 ? 'sage' : 'rail'} />
      </div>

      <RoadmapTierView roadmap={roadmap} />
    </>
  );
}
```

- [ ] **Step 3: Update the sidebar label**

In `src/components/Sidebar.jsx`, find:

```js
    { to: '/learner/paths', label: 'Lộ Trình Nghề Nghiệp 70/20/10', icon: 'ti-git-branch' },
```

Replace with:

```js
    { to: '/learner/paths', label: 'Lộ Trình Cấp Bậc', icon: 'ti-git-branch' },
```

- [ ] **Step 4: Add a verify-harness section**

Append after Task 4's section 16:

```js
// ---------------------------------------------------------------------------
console.log('=== 17. LearnerLearningPaths: dynamic per-level roadmap ===');
actAs('learner');
const learnerPathsHtml = render('learner sees own roadmap', <LearnerLearningPaths />, '/learner/paths', '/learner/paths');
check('learner page renders the 3 tier labels', Boolean(learnerPathsHtml
  && learnerPathsHtml.includes('Định Biên Bắt Buộc')
  && learnerPathsHtml.includes('Kỹ Năng Chuyên Môn')
  && learnerPathsHtml.includes('Thực Hành Thực Địa')));
check('fresh learner sees a disabled promotion-request button', Boolean(learnerPathsHtml && learnerPathsHtml.includes('disabled') && learnerPathsHtml.includes('Đề Xuất Đánh Giá Thăng Cấp')));
check('learner page no longer references the retired 70-20-10 static paths', !learnerPathsHtml.includes('Thánh Gióng Fast-track Leadership & Store General Manager'));
```

- [ ] **Step 5: Run verify, table-width audit, and build**

Run: `npm run verify`
Expected: section `=== 17. ... ===` all `ok`.

Run: `npm run check:tables`
Expected: clean.

Run: `npm run build`
Expected: exits 0.

- [ ] **Step 6: Manual smoke check**

Run: `npm run dev`, log in as the Learner persona, open "Lộ Trình Cấp Bậc" from the sidebar.
Expected: page shows the learner's Level badge, 3 progress bars each with a course list, and a disabled "Đề Xuất Đánh Giá Thăng Cấp" button (fresh personas have 0% completion, so this is correct, not a bug).

- [ ] **Step 7: Commit**

```bash
git add src/components/RoadmapTierView.jsx src/pages/learner/LearnerLearningPaths.jsx src/components/Sidebar.jsx scripts/verify-role-level-model.jsx
git commit -m "feat: rewrite LearnerLearningPaths as a dynamic 3-tier level roadmap"
```

---

## Task 6: `ManagerTeam.jsx` — per-report roadmap view

**Files:**
- Modify: `src/pages/manager/ManagerTeam.jsx`
- Modify: `scripts/verify-role-level-model.jsx` (new section)

**Interfaces:**
- Consumes: `getUserCareerRoadmap` (Task 3), `RoadmapTierView` (Task 5).

A new table column is **not** used here — the Direct Reports table already has 8 columns at tight widths (memory: tables must fit without horizontal scroll). Instead, add a second, icon-only action button next to the existing "Chi Tiết" button that opens a roadmap modal.

- [ ] **Step 1: Add roadmap modal state and button**

Find:

```jsx
import UserTranscriptModal from '../../components/UserTranscriptModal';
```

Replace with:

```jsx
import UserTranscriptModal from '../../components/UserTranscriptModal';
import RoadmapTierView from '../../components/RoadmapTierView';
```

Find:

```jsx
  const { currentUser: authUser, openSurveyModal, actionPlans, updateActionPlan, users } = useCourseStore();
```

Replace with:

```jsx
  const { currentUser: authUser, openSurveyModal, actionPlans, updateActionPlan, users, getUserCareerRoadmap } = useCourseStore();
```

Find:

```jsx
  const [transcriptUser, setTranscriptUser] = useState(null);
  const [reminderSent, setReminderSent] = useState(false);
```

Replace with:

```jsx
  const [transcriptUser, setTranscriptUser] = useState(null);
  const [roadmapUser, setRoadmapUser] = useState(null);
  const [reminderSent, setReminderSent] = useState(false);
```

Find:

```jsx
                        {/* Manager chỉ xem, không được gán khóa học — việc gán thuộc quyền
                            User Admin / System Admin. */}
                        <td style={{ textAlign: 'right' }}>
                          <Button
                            size="sm"
                            variant="outline"
                            icon="ti-eye"
                            onClick={() => {
                              const list = users && users.length > 0 ? users : allUsers ? allUsers() : [];
                              const fullUser = list.find(u => u.userId === m.userId || u.employeeCode === m.employeeId || u.fullName === m.name) || m;
                              setTranscriptUser(fullUser);
                            }}
                            title="Xem toàn bộ khóa học nhân sự này đang học"
                          >
                            Chi Tiết
                          </Button>
                        </td>
```

Replace with:

```jsx
                        {/* Manager chỉ xem, không được gán khóa học — việc gán thuộc quyền
                            User Admin / System Admin. */}
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                            <Button
                              size="sm"
                              variant="outline"
                              icon="ti-eye"
                              onClick={() => {
                                const list = users && users.length > 0 ? users : allUsers ? allUsers() : [];
                                const fullUser = list.find(u => u.userId === m.userId || u.employeeCode === m.employeeId || u.fullName === m.name) || m;
                                setTranscriptUser(fullUser);
                              }}
                              title="Xem toàn bộ khóa học nhân sự này đang học"
                            >
                              Chi Tiết
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              icon="ti-map-2"
                              onClick={() => {
                                const list = users && users.length > 0 ? users : allUsers ? allUsers() : [];
                                const fullUser = list.find(u => u.userId === m.userId || u.employeeCode === m.employeeId || u.fullName === m.name) || m;
                                setRoadmapUser(fullUser);
                              }}
                              title="Xem Lộ Trình Cấp Bậc của nhân sự này"
                            />
                          </div>
                        </td>
```

Find:

```jsx
      {/* USER TRANSCRIPT DRILL-DOWN MODAL */}
      <UserTranscriptModal
        targetUser={transcriptUser}
        isOpen={Boolean(transcriptUser)}
        onClose={() => setTranscriptUser(null)}
      />
    </>
  );
}
```

Replace with:

```jsx
      {/* USER TRANSCRIPT DRILL-DOWN MODAL */}
      <UserTranscriptModal
        targetUser={transcriptUser}
        isOpen={Boolean(transcriptUser)}
        onClose={() => setTranscriptUser(null)}
      />

      {/* ROADMAP DRILL-DOWN MODAL */}
      <Modal
        isOpen={Boolean(roadmapUser)}
        onClose={() => setRoadmapUser(null)}
        title="Lộ Trình Cấp Bậc Của Nhân Sự"
        subtitle={roadmapUser ? `${roadmapUser.fullName} · Level ${roadmapUser.level}` : ''}
        size="lg"
      >
        {roadmapUser && <RoadmapTierView roadmap={getUserCareerRoadmap(roadmapUser)} />}
      </Modal>
    </>
  );
}
```

- [ ] **Step 2: Add a verify-harness section**

Append after Task 5's section 17:

```js
// ---------------------------------------------------------------------------
console.log('=== 18. ManagerTeam: per-report roadmap drill-down button ===');
actAs('manager');
const managerTeamHtml = render('manager sees roadmap button per report', <ManagerTeam />, '/manager/team', '/manager/team');
check('manager team page renders the roadmap icon button', Boolean(managerTeamHtml && managerTeamHtml.includes('ti-map-2')));
```

- [ ] **Step 3: Run verify, table-width audit, and build**

Run: `npm run verify`
Expected: section `=== 18. ... ===` all `ok`.

Run: `npm run check:tables`
Expected: no new overflow on the "Manager · Đội ngũ" table (already in `PAGES` at `/manager/team`) — this is the check that guards the two-button Actions cell.

Run: `npm run build`
Expected: exits 0.

- [ ] **Step 4: Commit**

```bash
git add src/pages/manager/ManagerTeam.jsx scripts/verify-role-level-model.jsx
git commit -m "feat: add per-direct-report roadmap drill-down to ManagerTeam"
```

---

## Task 7: `UserTranscriptModal.jsx` + `TalentProfileModal.jsx` — roadmap tab

**Files:**
- Modify: `src/components/UserTranscriptModal.jsx`
- Modify: `src/components/TalentProfileModal.jsx`
- Modify: `scripts/verify-role-level-model.jsx` (new section)

**Interfaces:**
- Consumes: `getUserCareerRoadmap` (Task 3), `RoadmapTierView` (Task 5).

- [ ] **Step 1: Add a tab switcher to `UserTranscriptModal.jsx`**

Find:

```jsx
import { Badge, Button, ProgressBar, Modal, JobLevelBadge } from './ui';
import { useCourseStore } from '../state/CourseStore';
import { levelTitle, LEVEL_DEFINITIONS } from '../data/levelSystem';
```

Replace with:

```jsx
import { Badge, Button, ProgressBar, Modal, JobLevelBadge } from './ui';
import { useCourseStore } from '../state/CourseStore';
import { levelTitle, LEVEL_DEFINITIONS } from '../data/levelSystem';
import RoadmapTierView from './RoadmapTierView';
```

Find:

```jsx
export default function UserTranscriptModal({ targetUser, isOpen, onClose, onEdit }) {
  const { courses, currentUser, promoteUserLevel, myCourses } = useCourseStore();

  const [promoteModalOpen, setPromoteModalOpen] = useState(false);
```

Replace with:

```jsx
export default function UserTranscriptModal({ targetUser, isOpen, onClose, onEdit }) {
  const { courses, currentUser, promoteUserLevel, myCourses, getUserCareerRoadmap } = useCourseStore();

  const [activeTab, setActiveTab] = useState('transcript'); // transcript | roadmap
  const [promoteModalOpen, setPromoteModalOpen] = useState(false);
```

Find:

```jsx
          {/* KPI SUMMARY CARDS */}
          <div className="grid grid-4" style={{ gap: 12, marginBottom: 20 }}>
```

Replace with:

```jsx
          {/* TAB SWITCHER */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
            <button
              onClick={() => setActiveTab('transcript')}
              className={`btn btn-sm ${activeTab === 'transcript' ? 'btn-primary' : 'btn-outline'}`}
            >
              <i className="ti ti-table" /> Bảng Điểm Khóa Học
            </button>
            <button
              onClick={() => setActiveTab('roadmap')}
              className={`btn btn-sm ${activeTab === 'roadmap' ? 'btn-primary' : 'btn-outline'}`}
            >
              <i className="ti ti-map-2" /> Lộ Trình Cấp Bậc
            </button>
          </div>

          {activeTab === 'roadmap' ? (
            <RoadmapTierView roadmap={getUserCareerRoadmap(targetUser)} />
          ) : (
          <>
          {/* KPI SUMMARY CARDS */}
          <div className="grid grid-4" style={{ gap: 12, marginBottom: 20 }}>
```

Find (the end of the transcript table, right before the modal closes):

```jsx
            </table>
          </div>
        </div>
      </Modal>
```

Replace with:

```jsx
            </table>
          </div>
          </>
          )}
        </div>
      </Modal>
```

- [ ] **Step 2: Add a 5th tab to `TalentProfileModal.jsx`**

Find:

```jsx
import { Modal, Badge, ProgressBar, Button } from './ui';
```

Replace with:

```jsx
import { Modal, Badge, ProgressBar, Button } from './ui';
import RoadmapTierView from './RoadmapTierView';
```

Find:

```jsx
export default function TalentProfileModal() {
  const { talentProfileUser, closeTalentProfile } = useCourseStore();
```

Replace with:

```jsx
export default function TalentProfileModal() {
  const { talentProfileUser, closeTalentProfile, getUserCareerRoadmap } = useCourseStore();
```

Find:

```jsx
        {[
          { id: 'talent', label: 'Talent & Succession Roadmap', icon: 'ti-trophy' },
          { id: 'career', label: 'Career History & Past Roles', icon: 'ti-briefcase' },
          { id: 'projects', label: 'Strategic Projects & Taskforces', icon: 'ti-folder' },
          { id: 'learning', label: 'Training Curriculum & Scores', icon: 'ti-school' },
        ].map((tab) => (
```

Replace with:

```jsx
        {[
          { id: 'talent', label: 'Talent & Succession Roadmap', icon: 'ti-trophy' },
          { id: 'career', label: 'Career History & Past Roles', icon: 'ti-briefcase' },
          { id: 'projects', label: 'Strategic Projects & Taskforces', icon: 'ti-folder' },
          { id: 'learning', label: 'Training Curriculum & Scores', icon: 'ti-school' },
          { id: 'roadmap', label: 'Lộ Trình Cấp Bậc', icon: 'ti-map-2' },
        ].map((tab) => (
```

Find (end of the "learning" tab block, just before the modal's closing tag):

```jsx
          <div className="card card-pad">
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Enrolled Career Pipeline</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>Thánh Gióng Fast-track Leadership Program</span>
              <Badge tone="amber">65% Progress</Badge>
            </div>
            <ProgressBar value={65} tone="rail" size="sm" />
          </div>
        </div>
      )}
    </Modal>
  );
}
```

Replace with:

```jsx
          <div className="card card-pad">
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Enrolled Career Pipeline</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>Thánh Gióng Fast-track Leadership Program</span>
              <Badge tone="amber">65% Progress</Badge>
            </div>
            <ProgressBar value={65} tone="rail" size="sm" />
          </div>
        </div>
      )}

      {/* Tab 5: Level Roadmap */}
      {activeTab === 'roadmap' && <RoadmapTierView roadmap={getUserCareerRoadmap(u)} />}
    </Modal>
  );
}
```

- [ ] **Step 3: Add a verify-harness section**

Append after Task 6's section 18:

```js
// ---------------------------------------------------------------------------
console.log('=== 19. UserTranscriptModal & TalentProfileModal: roadmap tab present ===');
actAs('manager');
const transcriptTabHtml = render(
  'UserTranscriptModal shows the roadmap tab',
  <UserTranscriptModal targetUser={personaForRole('learner')} isOpen onClose={() => {}} />,
  '/manager/team', '/manager/team'
);
check('UserTranscriptModal has a "Lộ Trình Cấp Bậc" tab', Boolean(transcriptTabHtml && transcriptTabHtml.includes('Lộ Trình Cấp Bậc')));
check('UserTranscriptModal default tab is still the transcript table', Boolean(transcriptTabHtml && transcriptTabHtml.includes('Chi Tiết Tiến Độ Từng Khóa Học')));
```

(`TalentProfileModal` reads `talentProfileUser` from store-internal state with no override props, so it cannot be forced open in this SSR-only harness without a broader refactor that is out of scope here. Its new tab reuses the already-audited `RoadmapTierView`, the same component covered by sections 17-19, so it is covered by code review rather than a forced render — note this explicitly rather than skipping verification silently.)

- [ ] **Step 4: Run verify, table-width audit, and build**

Run: `npm run verify`
Expected: section `=== 19. ... ===` all `ok`.

Run: `npm run check:tables`
Expected: clean.

Run: `npm run build`
Expected: exits 0.

- [ ] **Step 5: Commit**

```bash
git add src/components/UserTranscriptModal.jsx src/components/TalentProfileModal.jsx scripts/verify-role-level-model.jsx
git commit -m "feat: add Lộ Trình Cấp Bậc tab to UserTranscriptModal and TalentProfileModal"
```

---

## Task 8: End-to-end promotion flow verification + final sign-off

**Files:**
- Modify: `scripts/verify-role-level-model.jsx` (final section)

**Interfaces:**
- Consumes everything from Tasks 1-7. No new production code — this task proves the full request → approve → promote → roadmap-updates loop end to end using the SSR harness's localStorage-seeding pattern (the same technique the existing course-ownership test in section 10b already uses).

- [ ] **Step 1: Add the end-to-end scenario**

Append a final section to `scripts/verify-role-level-model.jsx`:

```js
// ---------------------------------------------------------------------------
console.log('=== 20. End-to-end: roadmap completion -> promotion request -> approval -> level bump ===');
{
  const { INITIAL_LEVEL_ROADMAPS: SeedRoadmaps, branchForUser: seedBranchForUser } = await import('../src/data/levelRoadmapMatrix');
  const minh = generated100Users.find((u) => u.userId === 'USR-1042');
  const minhBranch = seedBranchForUser(minh);
  const tierConfig = SeedRoadmaps['7'][minhBranch];

  // 1) Seed 100%-complete enrollments for every tier of Minh's Level 7 roadmap.
  const fullEnrollments = { [minh.userId]: {} };
  ['CORE_MANDATORY', 'OJT_PROMOTION_GATE'].forEach((t) => {
    tierConfig[t].courseIds.forEach((id) => { fullEnrollments[minh.userId][id] = { status: 'COMPLETED' }; });
  });
  tierConfig.FUNCTIONAL_ELECTIVE.courseIds.slice(0, tierConfig.FUNCTIONAL_ELECTIVE.minRequired).forEach((id) => {
    fullEnrollments[minh.userId][id] = { status: 'COMPLETED' };
  });
  store.set(ENROLLMENT_KEY, JSON.stringify(fullEnrollments));

  actAs('learner');
  const readyPageHtml = render('Minh (100% complete) sees an enabled promotion-request button', <LearnerLearningPaths />, '/learner/paths', '/learner/paths');
  check('learner with all 3 tiers complete sees 100%', Boolean(readyPageHtml && readyPageHtml.includes('100%')));
  check('learner with all 3 tiers complete sees an ENABLED request button (no disabled attr on that button)',
    Boolean(readyPageHtml && readyPageHtml.includes('Đề Xuất Đánh Giá Thăng Cấp') && !/disabled[^>]*>[^<]*Đề Xuất Đánh Giá Thăng Cấp/.test(readyPageHtml)));

  // 2) Seed a PENDING ROADMAP_PROMOTION request for Minh (7 -> 6) and confirm
  //    only useradmin/sysadmin can see + act on it.
  store.set(APPROVAL_KEY, JSON.stringify([
    {
      id: 'req-roadmap-e2e', requestType: 'ROADMAP_PROMOTION', userId: minh.userId,
      employeeId: minh.employeeCode, employeeName: minh.fullName, position: minh.position,
      department: `${minh.departmentCode} - ${minh.departmentName}`, currentLevel: '7', targetLevel: '6',
      requestDate: '2026-08-01', justification: 'E2E test.', status: 'PENDING',
    },
  ]));
  actAs('useradmin');
  const adminApprovalHtml = render('useradmin sees the pending e2e roadmap promotion', <ManagerApprovals />, '/approvals', '/approvals');
  check('useradmin sees Minh Tran\'s roadmap promotion request', Boolean(adminApprovalHtml && adminApprovalHtml.includes(minh.fullName) && adminApprovalHtml.includes('Đề xuất Thăng cấp Lộ trình')));

  // 3) Confirm CourseStore's approveRequest source wires ROADMAP_PROMOTION to
  //    promoteUserLevel (can't simulate a click in this SSR-only harness, so
  //    this is a source-level correctness check rather than a live click).
  const fs = await import('node:fs');
  const storeSource = fs.readFileSync(new URL('../src/state/CourseStore.jsx', import.meta.url), 'utf8');
  check('approveRequest calls promoteUserLevel for ROADMAP_PROMOTION requests',
    /requestType === 'ROADMAP_PROMOTION'[\s\S]{0,200}promoteUserLevel\(target\.userId, target\.targetLevel/.test(storeSource));

  // Reset shared state for anything appended after this section.
  store.set(ENROLLMENT_KEY, JSON.stringify({}));
  store.set(APPROVAL_KEY, JSON.stringify(pendingApprovalRequests));
}

console.log('');
console.log(failures === 0 ? 'SMOKE PASSED' : `SMOKE FAILED (${failures} failure(s))`);
```

If the file already ends with a `console.log(failures === 0 ? 'SMOKE PASSED' : ...)` block (check before appending — this repo's harness prints that summary today per the existing conversation history), remove the duplicate old one so only this final copy remains at the very end of the file.

- [ ] **Step 2: Run the full verification suite**

Run: `npm run verify`
Expected: every section from `0` through `20` prints only `ok` lines; final line is `SMOKE PASSED`.

Run: `npm run check:tables`
Expected: no horizontal-overflow warnings on any page, including the two new/changed surfaces from Tasks 4 and 6.

Run: `npm run build`
Expected: exits 0, no warnings about unused imports (double-check `RoadmapTierView`, `getUserCareerRoadmap`, etc. are actually referenced in every file that imports them).

- [ ] **Step 3: Manual smoke pass**

Run: `npm run dev`. As `useradmin`: open "Quản Lý Lộ Trình Cấp Bậc", add and remove a course from Level 5 / Operations / Tier 2, confirm the UI updates immediately. As `learner` (a different browser tab or after switching persona): open "Lộ Trình Cấp Bậc", confirm tiers render. As `manager`: open "Nhân Viên & Khoảng Cách Năng Lực", click the new map icon next to a report, confirm the roadmap modal opens.

- [ ] **Step 4: Final commit**

```bash
git add scripts/verify-role-level-model.jsx
git commit -m "test: add end-to-end roadmap completion -> promotion -> approval verification"
```
