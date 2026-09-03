# LMS 4-Feature Upgrade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship four LMS upgrades in this order — (1) a real course-enrollment gate before lesson content, (2) an organization-wide monthly calendar with mandatory/optional color coding and direct enroll/assign actions, (3) four standalone assessment modes (Promotion/Survey/Test/EES) with a registration gate and Promotion-exam confidentiality + passcode security, and (4) dual check-in/check-out QR attendance with a real 30-second rotating token and a check-out-triggered CSAT survey.

**Architecture:** All four features are additive layers on the existing single-page React app's single client-side store (`CourseStore.jsx`, which plays the role of "the backend" — there is no server). Each feature reuses an existing UI pattern already established elsewhere in the codebase (the course-enrollment card pattern, the `EVENT_CATEGORIES` calendar pattern, the `hasCapability` RBAC pattern, the `AssessmentPlayer` phase-machine pattern) rather than inventing new ones.

**Tech Stack:** React 18.2 (function components, hooks), react-router-dom 6.22 (`HashRouter`), no CSS framework (hand-written `app.css` with CSS custom properties), no test runner — verification is `npm run verify` (`scripts/verify-role-level-model.jsx`, esbuild-bundled, `react-dom/server`'s `renderToStaticMarkup` + hand-written `check()` assertions). One new dependency this plan adds: `qrcode` (npm, browser-safe SVG/data-URL QR encoding) — verified present on the npm registry (`1.5.4`) before this plan was written.

**Spec:** `docs/superpowers/specs/2026-09-03-lms-4-feature-upgrade-design.md`

> **Progress as of 2026-09-03:** Tasks 1-6 are DONE and already merged into `main` (commit `d28a70a` and its parents `6871a75..5f5224e`), each independently code-reviewed with no unresolved Critical/Important findings. **Start at Task 7.** Do not redo Tasks 1-6 — re-read them only for context (they establish the exact `ASSESSMENT_MODES`, `assessmentRegistrations`/`enrollAssessment`, and `canViewConfidentialAssessments` interfaces Task 7 consumes). Before starting Task 7, run `npm run verify` on a fresh checkout of `main` to confirm the baseline: it should show exactly 10 pre-existing unrelated SMOKE FAILURE(s) (same list documented in this plan's Global Constraints) plus all of verify-script Sections 29-34 passing — if that doesn't match, something changed on `main` since this note was written and should be investigated before proceeding.

## Global Constraints

- **Verification discipline (product-owner mandate):** after every task, before marking it complete, confirm three things concretely, not just "it compiles": (1) **data completeness** — the new UI has real seed data behind it, add more mock rows if a state would otherwise render empty; (2) **cross-page linkage** — every new button/link lands on a real route, and every store mutation is immediately visible on every other page reading that state; (3) **logic correctness** — the gate/branch conditions match this plan's state tables exactly. `npm run verify` must show the **same or fewer** failures than the baseline (10 pre-existing, unrelated failures were present before this plan started — see "Baseline" below — never attributable to this plan's changes; introducing a NEW failure is a blocker).
- **Baseline:** `npm run verify` on a clean checkout of this branch, before any task starts, reports 10 pre-existing SMOKE FAILUREs unrelated to any of these 4 features (catalog level-gate copy assertions, an offline-only-notice assertion, a nav-drawer-DOM assertion). These are NOT in scope to fix. Record the exact failure count/list before Task 1 and after every task; the list must never grow.
- **No new backend.** `CourseStore.jsx` is the single source of truth every page reads from; there is no server, so "server-side validation" (e.g. QR token freshness) means "validated inside a `CourseStore` action," not a network call.
- **English-only UI copy**, except Vietnamese person names — this project's standing rule. Two pre-existing violations were found while reading files this plan touches and must be fixed in the task that touches that exact line (not deferred): `PostTrainingSurveyModal.jsx` renders `"/ 5 Sao"` twice (should read `"/ 5 Stars"`) — fix in Task 10. `AssessmentPlayer.jsx` renders `'SAI'` for an incorrect answer (should read `'INCORRECT'`) — fix in Task 5.
- **Dates** are plain `'YYYY-MM-DD'` strings elsewhere in this codebase (see `utils/calendarDate.js`); new date-string logic in this plan (Task 2/3) follows the same rule — never `new Date(isoString)` for date-only math.
- **Visuals reuse existing tokens**: `Badge` tones `sage/rust/blue/amber/slate`, `.card`/`.card-pad`, `--rail`/`--rail-soft`, `--line`/`--line-strong`, Tabler icons (`ti ti-*`), `Modal`/`Button` from `features/common/ui.jsx`. No new color palette beyond the two literal hex values the spec calls for (`#DC2626` red, `var(--bigc-green)` green) for the calendar's mandatory/optional coding — those two are explicitly required by the spec's state matrix.
- **RBAC**: use `hasCapability(role, capability)` from `data/roles.js` for every new permission check in this plan (the `canViewConfidentialAssessments` capability from Task 4, and the existing `canAllocateCourses` capability for the calendar's "Assign to Team" button) — never a new ad-hoc `role === 'x'` string check when a capability exists.
- **Ruling — QR secret/window fields**: seed `classroomSessions` in `data/mockData.js` are NOT edited to add a `qrSecret` or window fields (there are dozens of them). Instead, Task 8 adds pure derivation helpers (`sessionQrSecret(session)` defaults to `session.id` when `session.qrSecret` is absent; `deriveAttendanceWindows(session)` computes windows from the session's existing `date`/`time` fields when explicit window fields are absent) — every consumer calls the helper, never the raw field, so no seed data needs to change.
- **Never run `npm audit fix --force`** — the 4 existing vulnerabilities reported by `npm install` are pre-existing/unrelated to this plan; do not touch them.

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `src/pages/learner/LearnerCourseDetail.jsx` | Modify | Lesson links locked when not enrolled |
| `src/pages/player/LessonPlayer.jsx` | Modify | Full-page enrollment gate before lesson content |
| `src/utils/calendarEvents.js` | Modify | Add `buildOrganizationMonthlyEvents()`, real (non-fixture) standalone-assessment events |
| `src/features/calendar/UniversalCalendar.jsx` | Modify | Org-wide month view, metric bar, new filter chips, Enroll/Assign actions |
| `src/data/assessmentData.js` | Modify | `ASSESSMENT_MODES`, new per-assessment security/mode fields, 4-mode seed data |
| `src/data/roles.js` | Modify | New `canViewConfidentialAssessments` capability (sysadmin only) |
| `src/store/CourseStore.jsx` | Modify | `assessmentRegistrations` state + `enrollAssessment`; `checkOutClassroom` + `classroomSurveys` state |
| `src/pages/player/AssessmentPlayer.jsx` | Modify | Registration gate, Promotion passcode gate, mode-specific result screens, `SAI`→`INCORRECT` fix |
| `src/features/assessment/AssessmentDetailModal.jsx` | Modify | Confidentiality masking for non-Examination-Board viewers |
| `src/pages/admin/AdminCourses.jsx` | Modify | Confidentiality masking in the assessment list rows |
| `src/features/assessment/AssessmentEditorModal.jsx` | Modify | 4-way mode selector, passcode field, EES audience restriction |
| `src/utils/qrAttendance.js` | Create | Pure 30s-bucket token generation/validation + window derivation helpers |
| `src/pages/trainer/TrainerHub.jsx` | Modify | Real `qrcode`-rendered QR, check-in/check-out toggle, automatic 30s rotation |
| `src/pages/learner/LearnerClassrooms.jsx` | Modify | Dual scan flow (check-in vs check-out), check-out triggers survey |
| `src/features/common/PostTrainingSurveyModal.jsx` | Modify | `CLASSROOM_CSAT` submit now calls `checkOutClassroom`; `Sao`→`Stars` fix |
| `lms-app/package.json` | Modify | Add `qrcode` dependency |
| `scripts/verify-role-level-model.jsx` | Modify (every task) | Append smoke-check sections for each feature, appended not split out |

---

### Task 1: Course Enrollment Gate

**Files:**
- Modify: `src/pages/learner/LearnerCourseDetail.jsx`
- Modify: `src/pages/player/LessonPlayer.jsx`
- Modify: `scripts/verify-role-level-model.jsx` (append new section before the final summary block)

**Interfaces:**
- Consumes: existing `myEnrollments`, `accessFor(course, user)`, `enrollCourse(courseId, user)` from `useCourseStore()` (all pre-existing, no signature change).
- Produces: no new exports; this task only tightens existing gate logic.

- [ ] **Step 1: Read the current gate logic**

Read `src/pages/learner/LearnerCourseDetail.jsx` fully, focusing on the `ModuleList` component and its `getLessonHref` function (currently: `if (isPrereqLocked || isLevelLocked || isRegistrationClosed) return null;`). Read `src/pages/player/LessonPlayer.jsx` fully, focusing on the gate chain near the top of the component (currently: not-found check → `access.isLevelLocked` check → `isRegistrationClosed` check → unconditional lesson render).

- [ ] **Step 2: Lock lesson links in `LearnerCourseDetail.jsx` when not enrolled**

In the `getLessonHref` function (or equivalent lesson-link-building logic), add `!course.enrollment` to the existing OR-chain of lock reasons, so it reads (adapt to the exact existing variable names found in Step 1):

```jsx
function getLessonHref(module, lesson) {
  if (isPrereqLocked || isLevelLocked || isRegistrationClosed || !course.enrollment) return null;
  // ...existing href-building logic unchanged below this line
}
```

Also update whatever renders the lesson row's locked/disabled visual state (the existing lock icon shown for the other three reasons) so an unenrolled-but-otherwise-unlocked lesson shows the same lock icon/tooltip, with tooltip/title text along the lines of `"Enroll in this course to unlock lessons"` (English; follow the existing tooltip pattern used for the other lock reasons in that same component).

- [ ] **Step 3: Add the enrollment gate to `LessonPlayer.jsx`**

Locate the existing gate chain (not-found → level-locked → registration-closed → render). Insert a fourth gate, `!enrollment`, immediately after the `isRegistrationClosed` check and before the lesson renders, using the exact same empty-state JSX pattern/styling already used for the "Lesson not found" state in that file (a centered `.card.card-pad.empty-state`-style block — copy the exact classNames/structure already present in the file for the other empty states, don't invent new styling):

```jsx
if (!enrollment) {
  return (
    <div className="card card-pad empty-state" style={{ margin: '40px auto', maxWidth: 560 }}>
      <i className="ti ti-lock" style={{ fontSize: 48, color: 'var(--rust)' }} />
      <h2 style={{ fontSize: 18, marginTop: 10 }}>You Have Not Enrolled In This Course Yet</h2>
      <p style={{ color: 'var(--ink-soft)' }}>Please enroll to start learning and track your progress.</p>
      <Link to={`${basePath}/${course.id}`}>
        <Button variant="primary" icon="ti-arrow-right">Go To Course Detail &amp; Enroll</Button>
      </Link>
    </div>
  );
}
```

Adapt `basePath` to whatever variable/prop `LessonPlayer.jsx` already uses to build its "back to course" links elsewhere in the file (read Step 1's findings — do not hardcode `/learner/courses`, follow the existing prop). Confirm `Button` and `Link` are already imported at the top of the file; if `Button` is not imported, add it from `'../../features/common/ui'` alongside whatever is already imported from there.

- [ ] **Step 4: Manual verification — the golden path and the gated path**

Run `npm run dev`, log in as a learner (any seeded learner account works — use whatever the app's existing dev-login/persona-switch mechanism is), and:
1. Find a course you are NOT enrolled in. Navigate directly to its lesson-player URL by editing the address bar to `#/learner/courses/<courseId>/lessons/<lessonId>` (use any real lesson id from that course's `modules`). Confirm the new gate renders instead of lesson content, and the button navigates to the course detail page.
2. From the course detail page, click Enroll. Confirm the module list's lesson links become clickable (no longer locked), and clicking one now loads the real lesson content in `LessonPlayer`.
3. Re-check a course you ARE already enrolled in (from before this change) still opens lessons normally — no regression.

- [ ] **Step 5: Append verify-script checks**

In `scripts/verify-role-level-model.jsx`, add a new numbered section (use the next sequential section number after the last one in the file) that: (a) as a learner persona, renders `LessonPlayer` for a lesson belonging to a course the persona is NOT enrolled in, and asserts the rendered HTML contains the "have not enrolled" text and does NOT contain the lesson's real content/title; (b) renders `LessonPlayer` for a lesson belonging to a course the persona IS enrolled in (use an existing enrolled fixture already exercised elsewhere in the file), and asserts the lesson content DOES render. Follow the exact `actAs()`/`render()`/`check()` helper pattern already used throughout the file (read a nearby existing section first and copy its structure).

- [ ] **Step 6: Run verify and confirm no new failures**

Run: `npm run verify`
Expected: the same 10 pre-existing baseline failures (see Global Constraints), plus the new checks from Step 5 all passing (`ok`, not `FAIL`).

- [ ] **Step 7: Commit**

```bash
git add src/pages/learner/LearnerCourseDetail.jsx src/pages/player/LessonPlayer.jsx scripts/verify-role-level-model.jsx
git commit -m "feat(lms): gate lesson content behind course enrollment"
```

---

### Task 2: Organization-Wide Monthly Calendar Events

**Files:**
- Modify: `src/utils/calendarEvents.js`
- Modify: `scripts/verify-role-level-model.jsx`

**Interfaces:**
- Consumes: `courses` (full list, not just enrolled), `myEnrollments`, `role`, `currentUser` from `CourseStore` (all already passed into `buildCalendarEvents` today).
- Produces (consumed by Task 3's `UniversalCalendar.jsx`):
  - `export function buildOrganizationMonthlyEvents({ courses, myEnrollments, viewMonth, currentUser })` → returns `Array<OrgCalendarEvent>` (a flat array, not a Map — Task 3 buckets it by date itself, matching how it already consumes `buildCalendarEvents`'s events internally).
  - `OrgCalendarEvent` shape (all fields required on every event this function returns):
    ```ts
    {
      id: string,              // `org-${course.id}`
      scope: 'ORGANIZATION',
      date: string,             // 'YYYY-MM-DD', the event's day within viewMonth
      courseId: string,
      courseCode: string,
      title: string,
      courseType: 'MANDATORY' | 'OPTIONAL',
      isEnrolled: boolean,
      tone: 'rust' | 'sage',
      color: '#DC2626' | 'var(--bigc-green)',
      icon: 'ti-alert-circle' | 'ti-sparkles',
      subtitle: string,          // exact 4 strings from the spec's state matrix
      actionType: 'ENROLL_COURSE' | 'START_COURSE',
      actionLabel: string,       // exact 4 strings from the spec's state matrix
    }
    ```

- [ ] **Step 1: Read the existing file fully**

Read `src/utils/calendarEvents.js` in full — note the exact shape `EVENT_CATEGORIES` uses, the exact shape `buildCalendarEvents` returns (a `Map` with `.allEvents`/`.personalEvents`/`.operationalEvents` bolted on), and the existing per-event field names (`tone`, `actionType`, `actionLabel`, etc.) so the new event objects use identical field names for identical concepts (don't invent parallel field names).

- [ ] **Step 2: Write `buildOrganizationMonthlyEvents`**

Add this function to `calendarEvents.js` (adapt the `todayDateString`/date-string helpers to whatever is already imported at the top of the file from `./calendarDate` — do not re-implement date math, reuse what's imported):

```js
export function buildOrganizationMonthlyEvents({ courses = [], myEnrollments = {}, viewMonth, currentUser }) {
  if (!viewMonth) return [];
  const [viewYear, viewMonthNum] = viewMonth.split('-').map(Number);

  return (courses || [])
    .filter((course) => course.published !== false && (course.courseType === 'MANDATORY' || course.courseType === 'OPTIONAL'))
    .map((course) => {
      const isEnrolled = Boolean(myEnrollments[course.id]);
      const dueDate = course.assignment?.dueDate || null;

      let eventDate;
      if (dueDate) {
        const [dy, dm] = dueDate.split('-').map(Number);
        if (dy !== viewYear || dm !== viewMonthNum) return null; // due date falls outside the viewed month
        eventDate = dueDate;
      } else {
        // No due date (typically an optional elective) — represent it on the 1st of the viewed month
        // so every month's overview always lists it, per the spec's "org-wide overview" requirement.
        eventDate = `${viewYear}-${String(viewMonthNum).padStart(2, '0')}-01`;
      }

      const isMandatory = course.courseType === 'MANDATORY';
      return {
        id: `org-${course.id}`,
        scope: 'ORGANIZATION',
        date: eventDate,
        courseId: course.id,
        courseCode: course.code,
        title: course.title,
        courseType: course.courseType,
        isEnrolled,
        tone: isMandatory ? 'rust' : 'sage',
        color: isMandatory ? '#DC2626' : 'var(--bigc-green)',
        icon: isMandatory ? 'ti-alert-circle' : 'ti-sparkles',
        subtitle: isMandatory
          ? (isEnrolled ? 'Mandatory · Enrolled (In Progress / Completed)' : 'Mandatory · Action Required (Not Enrolled)')
          : (isEnrolled ? 'Optional · Enrolled' : 'Optional · Available to Join'),
        actionType: isEnrolled ? 'START_COURSE' : 'ENROLL_COURSE',
        actionLabel: isEnrolled
          ? (isMandatory ? 'Continue Learning' : 'Open Course')
          : 'Enroll in Course',
      };
    })
    .filter(Boolean);
}
```

- [ ] **Step 3: Manual verification via a scratch Node check**

Since this is a pure function, verify it directly before wiring it into the UI. Create a throwaway script (do not commit it) that imports `buildOrganizationMonthlyEvents` and a sample of `courses`/`myEnrollments` from `data/mockData.js`, calls it for the current month, and logs the count of MANDATORY vs OPTIONAL events and one full example object of each. Confirm: every course with `courseType MANDATORY|OPTIONAL` and `published !== false` appears exactly once; the `subtitle`/`actionLabel`/`tone`/`color` match the spec's 4-row matrix exactly for both enrolled and unenrolled examples. Delete the scratch script when done (or write it directly under the OS temp/scratchpad directory, never inside `src/`).

- [ ] **Step 4: Append verify-script checks**

In `scripts/verify-role-level-model.jsx`, add a new section that imports `buildOrganizationMonthlyEvents` and `courses`/`generated100Courses` directly (no React render needed — this is a pure data assertion, follow the pattern of the file's existing direct data-layer `check()` calls, e.g. the `generated100Courses.length === 124` style assertions), and asserts: (a) at least one MANDATORY event has `tone === 'rust'` and `color === '#DC2626'`; (b) at least one OPTIONAL event has `tone === 'sage'`; (c) an event for a course present in `myEnrollments` has `actionType === 'START_COURSE'`; (d) an event for a course absent from `myEnrollments` has `actionType === 'ENROLL_COURSE'`.

- [ ] **Step 5: Run verify and confirm no new failures**

Run: `npm run verify`
Expected: baseline 10 failures unchanged, new checks passing.

- [ ] **Step 6: Commit**

```bash
git add src/utils/calendarEvents.js scripts/verify-role-level-model.jsx
git commit -m "feat(calendar): add organization-wide monthly course events"
```

---

### Task 3: Universal Calendar — Organization View, Metric Bar, Filters, Actions

**Files:**
- Modify: `src/features/calendar/UniversalCalendar.jsx`
- Modify: `scripts/verify-role-level-model.jsx`

**Interfaces:**
- Consumes: `buildOrganizationMonthlyEvents` from Task 2 (exact signature above); existing `courses`, `myEnrollments`, `enrollCourse`, `currentUser`, `role` from `useCourseStore()`; `hasCapability` from `data/roles.js` (import it — confirm it is not already imported in this file, and add the import if missing).
- Produces: no new exports (this is a page-level component, not consumed elsewhere).

- [ ] **Step 1: Read the current file fully**

Read `src/features/calendar/UniversalCalendar.jsx` in full. Note exactly: the `weeks = getMonthGridWeeks(viewMonth)` grid-building code and where day cells are rendered (`cal-week-row-seamless`/`cal-seamless-cell` classes); the existing `EVENT_CATEGORIES` filter-chip rendering block; the existing `categoryFilter`/`scope`/`searchQuery` state; the existing event-detail modal (`detailModalEvent` state) and its JSX; how `courses`, `myEnrollments`, `enrollCourse` are already destructured from `useCourseStore()` (add any that are missing from the current destructuring).

- [ ] **Step 2: Compute and bucket organization events per viewed month**

Near where the existing `buildCalendarEvents(...)` call already happens, add a call to Task 2's function and bucket its results by date into a plain object (not a Map, to keep it simple to merge with the day-cell rendering loop that already iterates `weeks`):

```jsx
const orgEvents = useMemo(
  () => buildOrganizationMonthlyEvents({ courses, myEnrollments, viewMonth, currentUser }),
  [courses, myEnrollments, viewMonth, currentUser]
);
const orgEventsByDate = useMemo(() => {
  const map = {};
  orgEvents.forEach((ev) => {
    if (!map[ev.date]) map[ev.date] = [];
    map[ev.date].push(ev);
  });
  return map;
}, [orgEvents]);
```

Import `buildOrganizationMonthlyEvents` alongside the existing `buildCalendarEvents`/`EVENT_CATEGORIES` import from `'../../utils/calendarEvents'`. Ensure `useMemo` is imported from `'react'` (add it if the file doesn't already import it).

- [ ] **Step 3: Add the header metric bar**

Directly above the existing filter-chip row, add a metric bar reading from `orgEvents`:

```jsx
<div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
  {[
    { label: 'Total Monthly Events', value: orgEvents.length, tone: 'slate' },
    { label: 'Mandatory', value: orgEvents.filter((e) => e.courseType === 'MANDATORY').length, tone: 'rust' },
    { label: 'Optional', value: orgEvents.filter((e) => e.courseType === 'OPTIONAL').length, tone: 'sage' },
    { label: 'Enrolled', value: orgEvents.filter((e) => e.isEnrolled).length, tone: 'blue' },
    { label: 'Action Required', value: orgEvents.filter((e) => !e.isEnrolled).length, tone: 'amber' },
  ].map((m) => (
    <div key={m.label} className="card card-pad" style={{ flex: '1 1 140px', textAlign: 'center' }}>
      <div style={{ fontSize: 22, fontWeight: 800, color: `var(--${m.tone})` }}>{m.value}</div>
      <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>{m.label}</div>
    </div>
  ))}
</div>
```

- [ ] **Step 4: Add the new quick filter chips and wire them into the day-cell render**

Add a second `orgFilter` state (`'ALL' | 'MANDATORY' | 'OPTIONAL' | 'ENROLLED' | 'ACTION_REQUIRED'`) alongside the existing `categoryFilter` state, and render chips for it using the same chip-button JSX pattern already used for `EVENT_CATEGORIES` (copy that block's exact styling, just with these 5 new entries: `All`, `🔴 Mandatory`, `🟢 Optional`, `✅ Enrolled`, `⏳ Action Required`). Filter `orgEventsByDate` accordingly before rendering into day cells (`MANDATORY`/`OPTIONAL` filter on `courseType`; `ENROLLED`/`ACTION_REQUIRED` filter on `isEnrolled`). In the existing day-cell rendering loop (from Step 1's findings), render one small colored pill per org event on that date — reuse whatever pill/badge markup the file already uses for its existing personal events in the same day cells (same size/class), setting the pill's background/border to the event's `color`/`tone`.

- [ ] **Step 5: Wire the event-detail modal's Enroll / Assign actions**

When the existing detail modal (`detailModalEvent`) is opened for an org event (`detailModalEvent.scope === 'ORGANIZATION'`), render:
```jsx
{detailModalEvent.scope === 'ORGANIZATION' && !detailModalEvent.isEnrolled && (
  <Button variant="primary" icon="ti-circle-check" onClick={() => { enrollCourse(detailModalEvent.courseId, currentUser); setDetailModalEvent(null); }}>
    Enroll Now
  </Button>
)}
{detailModalEvent.scope === 'ORGANIZATION' && hasCapability(role, 'canAllocateCourses') && (
  <Button variant="outline" icon="ti-users" onClick={() => navigate(`/admin/courses/${detailModalEvent.courseId}`)}>
    Assign to Team
  </Button>
)}
```
Adapt variable names (`setDetailModalEvent`, `navigate`) to whatever the file already calls them (confirm from Step 1 — if `navigate` isn't already available, import `useNavigate` from `react-router-dom` and call it at the top of the component). The "Assign to Team" button navigates to the existing admin course page rather than duplicating the assignment UI — confirm `/admin/courses/:courseId` is a real existing route in `App.jsx` before using it; if the exact admin route differs, use the real one (grep `App.jsx` for `AdminCourses` to confirm the path pattern).

- [ ] **Step 6: Manual verification**

Run `npm run dev`. As a learner persona: open the calendar, confirm both enrolled and unenrolled courses for the current month appear as colored pills (red for mandatory, green for optional) even though they weren't visible before this task. Click an unenrolled event, click "Enroll Now" in the modal, confirm the pill immediately updates (still same page, no reload) to the enrolled subtitle/action without needing to reopen the calendar. Switch to a manager or user-admin persona and confirm the "Assign to Team" button appears and navigates correctly. Change the metric-bar counts sanity-check against the visible pills.

- [ ] **Step 7: Append verify-script checks and run verify**

Add a section rendering `UniversalCalendar` under a learner persona and asserting the rendered HTML contains at least one of the new subtitle strings (`'Mandatory · Action Required'` or `'Optional · Available to Join'`) and the metric-bar label `'Total Monthly Events'`. Run `npm run verify`, confirm baseline unchanged plus new checks passing.

- [ ] **Step 8: Commit**

```bash
git add src/features/calendar/UniversalCalendar.jsx scripts/verify-role-level-model.jsx
git commit -m "feat(calendar): render organization-wide monthly overview with enroll/assign actions"
```

---

### Task 4: Assessment Data Model, RBAC Capability, Registration State

**Files:**
- Modify: `src/data/assessmentData.js`
- Modify: `src/data/roles.js`
- Modify: `src/store/CourseStore.jsx`
- Modify: `scripts/verify-role-level-model.jsx`

**Interfaces:**
- Produces (consumed by Tasks 5-7):
  - `ASSESSMENT_MODES` (exact object from the spec: `{ PROMOTION: 'PROMOTION', SURVEY: 'SURVEY', TEST: 'TEST', EES: 'EES' }`), exported from `assessmentData.js`.
  - New fields on assessment records: `evaluationMode`, `isConfidential`, `requiresPasscode`, `passcode`, `hideImmediateResult`, `hideAnswers`, `isAnonymous`.
  - `hasCapability('sysadmin', 'canViewConfidentialAssessments') === true`; `hasCapability('useradmin', 'canViewConfidentialAssessments') === false`.
  - `assessmentRegistrations` state (shape `{ [userId]: { [assessmentId]: { registeredAt: string } } }`) and `enrollAssessment(assessmentId, user = currentUser)` action, both exposed from `useCourseStore()`.

- [ ] **Step 1: Add `ASSESSMENT_MODES` and the new fields to `assessmentData.js`**

Read the file fully first (already summarized in the spec — confirm current field names before editing). Add near the existing `ASSESSMENT_TYPES`/`CONTENT_FORMATS` exports:

```js
export const ASSESSMENT_MODES = {
  PROMOTION: 'PROMOTION',
  SURVEY: 'SURVEY',
  TEST: 'TEST',
  EES: 'EES',
};
```

- [ ] **Step 2: Add 4 new seed assessments, one per mode, to `INITIAL_ASSESSMENTS`**

Append 4 new objects to the existing `INITIAL_ASSESSMENTS` array (do not remove/renumber existing ones), following the exact existing object shape (all fields the existing objects already carry: `id, title, code, description, type, types, contentFormat, deliveryFormat, category, categories, status, timeLimitMinutes, passingScorePercent, maxAttempts, questionsPerAttempt, questionTypesList, antiCheatSettings, feedbackSettings, questionIds, assignments, createdBy, createdByName, createdAt, updatedAt`), plus the new mode fields:

```js
{
  id: 'ASM-PROMO-001',
  title: 'Level 5 to Level 4 Promotion Examination',
  code: 'ASM-PROMO-001',
  description: 'Official promotion-gate examination for candidates nominated for Level 4 advancement. Requires an Exam Room Passcode issued by the Examination Board.',
  type: 'QUIZ',
  types: ['QUIZ'],
  contentFormat: 'INTERACTIVE_BANK',
  deliveryFormat: 'STANDALONE',
  category: 'Leadership Development',
  categories: ['Leadership Development'],
  status: 'PUBLISHED',
  timeLimitMinutes: 60,
  passingScorePercent: 80,
  maxAttempts: 1,
  questionsPerAttempt: 10,
  questionTypesList: ['SINGLE_CHOICE', 'SCENARIO_BASED', 'ESSAY'],
  antiCheatSettings: { enforceFullscreen: true, detectTabSwitch: true, maxTabSwitches: 2, randomizeQuestions: true, randomizeOptions: true, showWatermark: true, webcamProctoringSimulation: false, preventCopyPaste: true },
  feedbackSettings: { showAnswersAfterSubmit: false, showExplanations: false, allowReview: false },
  questionIds: [],
  assignments: [{ assignmentType: 'LEVEL', targetId: '5', targetName: 'Level 5', dueDate: null, isMandatory: false }],
  evaluationMode: ASSESSMENT_MODES.PROMOTION,
  isConfidential: true,
  requiresPasscode: true,
  passcode: 'GATE2026',
  hideImmediateResult: true,
  hideAnswers: true,
  isAnonymous: false,
  createdBy: 'USR-ADMIN-01',
  createdByName: 'System Administrator',
  createdAt: '2026-08-01T00:00:00.000Z',
  updatedAt: '2026-08-01T00:00:00.000Z',
},
{
  id: 'ASM-SURVEY-001',
  title: 'Onboarding Training Satisfaction Survey',
  code: 'ASM-SURVEY-001',
  description: 'Post-onboarding CSAT survey measuring satisfaction with the new-hire training program.',
  type: 'SURVEY',
  types: ['SURVEY'],
  contentFormat: 'INTERACTIVE_BANK',
  deliveryFormat: 'STANDALONE',
  category: 'Onboarding',
  categories: ['Onboarding'],
  status: 'PUBLISHED',
  timeLimitMinutes: 10,
  passingScorePercent: 0,
  maxAttempts: 1,
  questionsPerAttempt: 5,
  questionTypesList: ['RATING_SCALE', 'SHORT_ANSWER'],
  antiCheatSettings: { enforceFullscreen: false, detectTabSwitch: false, maxTabSwitches: 99, randomizeQuestions: false, randomizeOptions: false, showWatermark: false, webcamProctoringSimulation: false, preventCopyPaste: false },
  feedbackSettings: { showAnswersAfterSubmit: false, showExplanations: false, allowReview: false },
  questionIds: [],
  assignments: [{ assignmentType: 'ALL', targetId: 'ALL', targetName: 'All Employees', dueDate: null, isMandatory: false }],
  evaluationMode: ASSESSMENT_MODES.SURVEY,
  isConfidential: false,
  requiresPasscode: false,
  passcode: null,
  hideImmediateResult: false,
  hideAnswers: false,
  isAnonymous: false,
  createdBy: 'USR-ADMIN-01',
  createdByName: 'System Administrator',
  createdAt: '2026-08-01T00:00:00.000Z',
  updatedAt: '2026-08-01T00:00:00.000Z',
},
{
  id: 'ASM-TEST-001',
  title: 'Food Safety & Hygiene Standards Knowledge Test',
  code: 'ASM-TEST-001',
  description: 'Standard scored knowledge quiz on HACCP food safety compliance, with instant scoring and answer review.',
  type: 'QUIZ',
  types: ['QUIZ'],
  contentFormat: 'INTERACTIVE_BANK',
  deliveryFormat: 'STANDALONE',
  category: 'Compliance',
  categories: ['Compliance'],
  status: 'PUBLISHED',
  timeLimitMinutes: 20,
  passingScorePercent: 70,
  maxAttempts: 3,
  questionsPerAttempt: 8,
  questionTypesList: ['SINGLE_CHOICE', 'TRUE_FALSE'],
  antiCheatSettings: { enforceFullscreen: false, detectTabSwitch: true, maxTabSwitches: 3, randomizeQuestions: true, randomizeOptions: true, showWatermark: true, webcamProctoringSimulation: false, preventCopyPaste: false },
  feedbackSettings: { showAnswersAfterSubmit: true, showExplanations: true, allowReview: true },
  questionIds: [],
  assignments: [{ assignmentType: 'ALL', targetId: 'ALL', targetName: 'All Employees', dueDate: null, isMandatory: true }],
  evaluationMode: ASSESSMENT_MODES.TEST,
  isConfidential: false,
  requiresPasscode: false,
  passcode: null,
  hideImmediateResult: false,
  hideAnswers: false,
  isAnonymous: false,
  createdBy: 'USR-ADMIN-01',
  createdByName: 'System Administrator',
  createdAt: '2026-08-01T00:00:00.000Z',
  updatedAt: '2026-08-01T00:00:00.000Z',
},
{
  id: 'ASM-EES-001',
  title: '2026 Employee Engagement Survey (EES)',
  code: 'ASM-EES-001',
  description: 'Annual company-wide anonymous engagement and eNPS survey.',
  type: 'SURVEY',
  types: ['SURVEY'],
  contentFormat: 'INTERACTIVE_BANK',
  deliveryFormat: 'STANDALONE',
  category: 'Organizational Climate',
  categories: ['Organizational Climate'],
  status: 'PUBLISHED',
  timeLimitMinutes: 15,
  passingScorePercent: 0,
  maxAttempts: 1,
  questionsPerAttempt: 10,
  questionTypesList: ['RATING_SCALE', 'SHORT_ANSWER'],
  antiCheatSettings: { enforceFullscreen: false, detectTabSwitch: false, maxTabSwitches: 99, randomizeQuestions: false, randomizeOptions: false, showWatermark: false, webcamProctoringSimulation: false, preventCopyPaste: false },
  feedbackSettings: { showAnswersAfterSubmit: false, showExplanations: false, allowReview: false },
  questionIds: [],
  assignments: [{ assignmentType: 'ALL', targetId: 'ALL', targetName: 'All Employees', dueDate: null, isMandatory: false }],
  evaluationMode: ASSESSMENT_MODES.EES,
  isConfidential: false,
  requiresPasscode: false,
  passcode: null,
  hideImmediateResult: false,
  hideAnswers: false,
  isAnonymous: true,
  createdBy: 'USR-ADMIN-01',
  createdByName: 'System Administrator',
  createdAt: '2026-08-01T00:00:00.000Z',
  updatedAt: '2026-08-01T00:00:00.000Z',
},
```

For each new seed assessment's `questionIds: []`, instead populate it with 4-6 real ids drawn from the existing `QUESTION_BANK` array in the same file whose `questionType` matches that assessment's `questionTypesList` (read `QUESTION_BANK` first and pick real matching ids — an empty `questionIds` with an empty bank-derived pool would make `AssessmentPlayer.jsx`'s `start()` function fall back to its generic `questionBanks.slice(0,4)` default, which is acceptable but picking real matching ids gives a more realistic demo, per the Global Constraints' data-completeness mandate). For every EXISTING assessment object already in `INITIAL_ASSESSMENTS` (not the 4 new ones), also add the 6 new fields with safe defaults so no existing assessment silently has `undefined` mode fields: `evaluationMode: ASSESSMENT_MODES.TEST, isConfidential: false, requiresPasscode: false, passcode: null, hideImmediateResult: false, hideAnswers: false, isAnonymous: false` — do this as a bulk default-merge in code (not by hand-editing every object), e.g. wrap the final exported array:

```js
export const INITIAL_ASSESSMENTS = RAW_INITIAL_ASSESSMENTS.map((a) => ({
  evaluationMode: ASSESSMENT_MODES.TEST,
  isConfidential: false,
  requiresPasscode: false,
  passcode: null,
  hideImmediateResult: false,
  hideAnswers: false,
  isAnonymous: false,
  ...a,
}));
```
(rename the existing `const INITIAL_ASSESSMENTS = [...]` array literal to `RAW_INITIAL_ASSESSMENTS`, keep every existing object exactly as-is inside it including the 4 new ones from this step, and add the wrapping `export const INITIAL_ASSESSMENTS = ...map(...)` line shown above at the end of the file, ensuring nothing else in the file references the old binding name after the rename).

- [ ] **Step 3: Add `canViewConfidentialAssessments` to `data/roles.js`**

In `ROLE_DEFINITIONS`, add `'canViewConfidentialAssessments'` to the `capabilities` array of **only** the `sysadmin` role object (rank 6). Do not add it to `useradmin` or any other role — this is the exact mechanism the spec's Ruling 1 requires. Add a one-line comment directly above the `sysadmin` capabilities array (matching the file's existing comment style) explaining why: `// canViewConfidentialAssessments is the ONE capability sysadmin has that useradmin does not — Promotion Exam confidentiality (Examination Board access) is deliberately narrower than the rest of admin access.`

- [ ] **Step 4: Add `assessmentRegistrations` state and `enrollAssessment` action to `CourseStore.jsx`**

Read the existing `enrollCourse` action (around line 1366) fully first — mirror its exact style (how it reads `currentUser` default param, how it updates state via `setEnrollments`/equivalent setter, any transaction/logging side effect pattern) but do NOT create a Cost Center transaction for assessment registration (that's specific to paid course enrollment, out of scope here). Add new state near wherever `enrollments` state is declared:

```js
const [assessmentRegistrations, setAssessmentRegistrations] = useState({});

function enrollAssessment(assessmentId, user = currentUser) {
  const userId = user?.userId;
  if (!userId) return;
  setAssessmentRegistrations((prev) => ({
    ...prev,
    [userId]: {
      ...(prev[userId] || {}),
      [assessmentId]: { registeredAt: new Date().toISOString() },
    },
  }));
}

function isAssessmentRegistered(assessmentId, user = currentUser) {
  const userId = user?.userId;
  if (!userId) return false;
  return Boolean(assessmentRegistrations[userId]?.[assessmentId]);
}
```

Expose `assessmentRegistrations`, `enrollAssessment`, and `isAssessmentRegistered` in the context value object alongside the existing `currentUser`/`role`/etc. exports (find the exact object literal returned by the provider — same one that already exposes `checkInClassroom`/`enrollClassroom` — and add these three keys to it).

- [ ] **Step 5: Manual verification**

Run `npm run dev`, open the browser devtools console, and from any page confirm (via React DevTools or a temporary `console.log` you remove afterward) that `assessmentRegistrations` starts as `{}` and that calling `enrollAssessment` (e.g. temporarily wire a button, or verify in Task 5 once the UI exists) updates it correctly per-user. Confirm `hasCapability('sysadmin', 'canViewConfidentialAssessments')` returns `true` and `hasCapability('useradmin', 'canViewConfidentialAssessments')` returns `false` (add a throwaway `console.log` in `roles.js`'s module scope temporarily, run `npm run dev`, check the browser console, then remove the log — do not leave debug logging committed).

- [ ] **Step 6: Append verify-script checks**

Add a section that: (a) imports `ASSESSMENT_MODES`, `INITIAL_ASSESSMENTS` from `assessmentData.js` and asserts all 4 modes are represented at least once across the seed list (`INITIAL_ASSESSMENTS.some(a => a.evaluationMode === 'PROMOTION')`, etc. for all 4); (b) imports `hasCapability` from `roles.js` and asserts `hasCapability('sysadmin','canViewConfidentialAssessments') === true` and `hasCapability('useradmin','canViewConfidentialAssessments') === false`.

- [ ] **Step 7: Run verify and confirm no new failures, then commit**

Run: `npm run verify` — confirm baseline unchanged, new checks passing.

```bash
git add src/data/assessmentData.js src/data/roles.js src/store/CourseStore.jsx scripts/verify-role-level-model.jsx
git commit -m "feat(assessment): add 4 evaluation modes, confidentiality RBAC, and registration state"
```

---

### Task 5: Assessment Player — Registration Gate, Passcode Gate, Mode-Specific Results

**Files:**
- Modify: `src/pages/player/AssessmentPlayer.jsx`
- Modify: `scripts/verify-role-level-model.jsx`

**Interfaces:**
- Consumes: `ASSESSMENT_MODES` from `data/assessmentData.js` (Task 4); `assessmentRegistrations`, `enrollAssessment`, `isAssessmentRegistered` from `useCourseStore()` (Task 4).
- Produces: no new exports.

- [ ] **Step 1: Read the full current file again with these exact insertion points in mind**

`phase === 'start'` block (currently ends with the "Start The Exam Now" button) — this is where the registration gate and passcode gate are inserted. The final `return` block (the RESULT screen, after the `in-progress` block) — this is where mode branching goes. The `isAnswerCorrect`-adjacent per-question review badge (`'CORRECT' : 'SAI'`) — fix to `'INCORRECT'`.

- [ ] **Step 2: Add registration + passcode state**

Near the existing `phase`/`questions`/`answers` state declarations, add:

```jsx
const [passcodeInput, setPasscodeInput] = useState('');
const [passcodeError, setPasscodeError] = useState('');
const [passcodeVerified, setPasscodeVerified] = useState(false);
```

Add `assessmentRegistrations, enrollAssessment, isAssessmentRegistered` to the existing destructuring of `useCourseStore()` at the top of the component. Compute, alongside the existing `access` memo: `const isRegistered = standaloneAssessment ? isAssessmentRegistered(activeAssessment?.id) : true;` (course-linked exams have no registration concept — always treated as registered, matching current behavior).

- [ ] **Step 3: Rework the `phase === 'start'` block's action button**

Replace the block's closing button row (currently just the single "Start The Exam Now" button) with mode-aware branching. The three states, in order:

```jsx
{!isRegistered ? (
  <Button variant="primary" icon="ti-clipboard-check" size="lg" onClick={() => enrollAssessment(activeAssessment.id)}>
    Enroll / Register for Examination
  </Button>
) : activeAssessment.evaluationMode === ASSESSMENT_MODES.PROMOTION && !passcodeVerified ? (
  <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>
      <i className="ti ti-lock" style={{ marginRight: 6, color: 'var(--rust)' }} />
      Enter The Exam Room / Proctor Passcode To Continue
    </div>
    <input
      type="password"
      className="field-input"
      value={passcodeInput}
      onChange={(e) => { setPasscodeInput(e.target.value); setPasscodeError(''); }}
      placeholder="Exam Room Passcode"
      style={{ maxWidth: 260 }}
    />
    {passcodeError && <div style={{ fontSize: 12, color: 'var(--rust)' }}>{passcodeError}</div>}
    <div>
      <Button
        variant="primary"
        icon="ti-key"
        onClick={() => {
          if (passcodeInput === activeAssessment.passcode) { setPasscodeVerified(true); }
          else { setPasscodeError('Incorrect passcode. Please contact your Proctor / Examination Board.'); }
        }}
      >
        Unlock Exam Paper
      </Button>
    </div>
  </div>
) : (
  <Button variant="primary" icon="ti-player-play" size="lg" onClick={start}>
    {activeAssessment.evaluationMode === ASSESSMENT_MODES.PROMOTION ? 'Enter Exam Room' : 'Start The Exam Now'}
  </Button>
)}
```

Import `ASSESSMENT_MODES` from `'../../data/assessmentData'` (it likely already imports `QUESTION_TYPES, DELIVERY_FORMATS` from that same module — add to the same import line).

- [ ] **Step 4: Mode-branch the RESULT screen**

Wrap the existing RESULT screen's score card, competency-gap card, and explanations card in a mode check. At the very top of the final `return` block (before the existing `<div style={{maxWidth:760...}}>`), branch:

```jsx
if (activeAssessment.evaluationMode === ASSESSMENT_MODES.PROMOTION) {
  return (
    <div style={{ maxWidth: 640, margin: '60px auto', textAlign: 'center' }}>
      <div className="card card-pad" style={{ padding: 32 }}>
        <i className="ti ti-shield-check" style={{ fontSize: 56, color: 'var(--rail)' }} />
        <h2 style={{ marginTop: 16, fontSize: 20 }}>Submission Recorded</h2>
        <p style={{ color: 'var(--ink-soft)', marginTop: 8, lineHeight: 1.6 }}>
          Your promotion examination submission has been securely recorded. Official results will be validated and published by the Evaluation Committee &amp; HR Department.
        </p>
        <Button variant="primary" style={{ marginTop: 16 }} onClick={() => navigate(basePath)}>
          Finish &amp; Return To The Course Catalog
        </Button>
      </div>
    </div>
  );
}
if (activeAssessment.evaluationMode === ASSESSMENT_MODES.SURVEY || activeAssessment.evaluationMode === ASSESSMENT_MODES.EES) {
  const isEes = activeAssessment.evaluationMode === ASSESSMENT_MODES.EES;
  return (
    <div style={{ maxWidth: 640, margin: '60px auto', textAlign: 'center' }}>
      <div className="card card-pad" style={{ padding: 32 }}>
        <i className="ti ti-heart-handshake" style={{ fontSize: 56, color: 'var(--sage)' }} />
        <h2 style={{ marginTop: 16, fontSize: 20 }}>Thank You For Your Feedback!</h2>
        <p style={{ color: 'var(--ink-soft)', marginTop: 8, lineHeight: 1.6 }}>
          {isEes
            ? 'Your response has been recorded anonymously and will be included in the company-wide engagement analysis.'
            : 'Your feedback has been recorded and helps us improve future training.'}
        </p>
        <Button variant="primary" style={{ marginTop: 16 }} onClick={() => navigate(basePath)}>
          Finish &amp; Return To The Course Catalog
        </Button>
      </div>
    </div>
  );
}
// existing RESULT screen JSX (TEST / undefined mode) continues unchanged below this line
```

Leave the existing RESULT screen JSX exactly as-is beneath this new branch (it now only runs for `TEST` mode or course-linked exams without an `evaluationMode`).

- [ ] **Step 5: Suppress the watermark for EES (anonymous) mode**

In the `phase === 'in-progress'` block, find the watermark `<div>` (rendered when `activeAssessment.antiCheatSettings?.showWatermark` is true, showing `user?.fullName` / employee code). Change its guard to also require non-anonymous mode: `{activeAssessment.antiCheatSettings?.showWatermark && activeAssessment.evaluationMode !== ASSESSMENT_MODES.EES && ( ... )}`.

- [ ] **Step 6: Fix the `SAI` → `INCORRECT` English-only-UI bug**

In the per-question review badge inside the explanations card, change `{isCorrect ? 'CORRECT' : 'SAI'}` to `{isCorrect ? 'CORRECT' : 'INCORRECT'}`.

- [ ] **Step 7: Manual verification — all 4 modes end to end**

Run `npm run dev` as a learner. For each of the 4 new seed assessments from Task 4: navigate to it from `LearnerCourses.jsx`'s assessment list. Confirm: (a) before registering, the primary button reads "Enroll / Register for Examination" and clicking it does not start the exam, just registers; (b) after registering, PROMOTION shows the passcode field — test a wrong passcode (rejected, inline error) then the real passcode `GATE2026` (unlocks "Enter Exam Room"); SURVEY/TEST/EES show their normal start button immediately (no passcode step); (c) complete each exam and confirm the exact result screen per mode: PROMOTION shows only the pending-review message (no score/answers anywhere in the DOM — verify via browser devtools that no score text is even present, not just visually hidden); TEST shows score/pass-fail/explanations as before with `INCORRECT` (not `SAI`) on wrong answers; SURVEY/EES show the thank-you screen; EES's in-progress screen has no name/employee-code watermark.

- [ ] **Step 8: Append verify-script checks and run verify**

Add a section rendering `AssessmentPlayer` for each of the 4 new seed assessment ids under a registered vs unregistered learner persona (use `enrollAssessment` directly on the store before rendering, or seed `assessmentRegistrations` via the localStorage shim if that's how other sections in the file pre-seed state — follow whatever pattern nearby sections already use for pre-seeding store state before a render), and assert: unregistered → HTML contains `'Enroll / Register for Examination'`; registered PROMOTION → HTML contains `'Exam Room / Proctor Passcode'` and does NOT contain `'Start The Exam Now'`. Run `npm run verify`, confirm baseline unchanged plus new checks passing.

- [ ] **Step 9: Commit**

```bash
git add src/pages/player/AssessmentPlayer.jsx scripts/verify-role-level-model.jsx
git commit -m "feat(assessment): registration gate, promotion passcode gate, mode-specific results"
```

---

### Task 6: Confidentiality Masking (Admin/Detail Views)

**Files:**
- Modify: `src/features/assessment/AssessmentDetailModal.jsx`
- Modify: `src/pages/admin/AdminCourses.jsx`
- Modify: `scripts/verify-role-level-model.jsx`

**Interfaces:**
- Consumes: `hasCapability(role, 'canViewConfidentialAssessments')` (Task 4); `assessment.isConfidential` (Task 4).

- [ ] **Step 1: Read both files fully, focused on where assessments are listed/opened**

In `AdminCourses.jsx`, locate every place a standalone assessment is rendered as a list row/card (search for where `AssessmentDetailModal`/`AssessmentEditorModal` are opened — that's the click target whose surrounding row markup needs masking) and where the current user's role is already available in that file (it's used elsewhere for other permission checks — reuse the same variable, don't re-derive it).

- [ ] **Step 2: Mask confidential assessment rows in `AdminCourses.jsx`'s list**

For each assessment row where `assessment.isConfidential && !hasCapability(role, 'canViewConfidentialAssessments')`: render the row with only its title and a `<Badge tone="rust" icon="ti-lock">🔒 Confidential — Examination Board Only</Badge>`, no description, no stats, no clickable action to open the editor/detail modal for that row (replace the row's onClick/button with a disabled-looking element, or keep it clickable but have it show the access-denied panel from Step 3 instead of the real modal — pick whichever the existing row-click wiring in this file makes simpler, and prefer the latter if the row is already a single reusable click handler that just changes which modal state is set, since it requires less structural change).

- [ ] **Step 3: Add the access-denied panel to `AssessmentDetailModal.jsx`**

At the top of the modal's render (right after the existing `if (!isOpen) return null;` early-return, before any other content), add:

```jsx
if (assessment?.isConfidential && !hasCapability(role, 'canViewConfidentialAssessments')) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Access Restricted" size="sm">
      <div style={{ textAlign: 'center', padding: '20px 10px' }}>
        <i className="ti ti-lock" style={{ fontSize: 44, color: 'var(--rust)' }} />
        <h3 style={{ marginTop: 12, fontSize: 16 }}>Confidential — Examination Board Only</h3>
        <p style={{ color: 'var(--ink-soft)', fontSize: 13, marginTop: 6 }}>
          This is a Promotion Examination. Its content, questions, and results are restricted to the Examination Board.
        </p>
      </div>
    </Modal>
  );
}
```

Import `hasCapability` from `'../../data/roles.js'` and pull `role` from `useCourseStore()` inside the component (add both if not already present — check the current imports/destructuring first).

- [ ] **Step 4: Manual verification**

Run `npm run dev`. As `useradmin`, open `AdminCourses.jsx`'s assessment list — confirm the PROMOTION seed assessment (`ASM-PROMO-001`) shows only the locked badge, and clicking it shows the access-denied panel (not the real editor/detail content, not even briefly). As `sysadmin`, confirm the same row shows full title/description/stats and opens normally with full content.

- [ ] **Step 5: Append verify-script checks and run verify**

Add a section: as `useradmin`, render `AssessmentDetailModal` with `assessment = <the ASM-PROMO-001 seed object>` and assert the HTML contains `'Examination Board Only'` and does NOT contain the assessment's real `description` text. As `sysadmin`, render the same and assert the real description text IS present. Run `npm run verify`, confirm baseline unchanged plus new checks passing.

- [ ] **Step 6: Commit**

```bash
git add src/features/assessment/AssessmentDetailModal.jsx src/pages/admin/AdminCourses.jsx scripts/verify-role-level-model.jsx
git commit -m "feat(assessment): mask confidential promotion-exam content from non-Examination-Board roles"
```

---

### Task 7: Assessment Editor — Mode Selector, Passcode Field, EES Restriction

**Files:**
- Modify: `src/features/assessment/AssessmentEditorModal.jsx`
- Modify: `scripts/verify-role-level-model.jsx`

**Interfaces:**
- Consumes: `ASSESSMENT_MODES` from Task 4.

- [x] **Step 1: Read the file's `GENERAL` tab section and `formData` state fully**

Confirm the exact shape of `formData` (already listed in the codebase report: `types, categories, contentFormats, quizSourceMode, ...`) and where the `GENERAL` tab's JSX lives, so the new mode selector is added as a sibling field within that existing tab rather than a new tab (the spec calls for adding it to the existing `GENERAL` tab).

- [x] **Step 2: Add `evaluationMode` (and the 6 dependent fields) to `formData`'s initial-state derivation**

Wherever `formData` is seeded from the `assessment` prop (the large default-derivation block already in the file), add: `evaluationMode: assessment?.evaluationMode || ASSESSMENT_MODES.TEST, isConfidential: assessment?.isConfidential || false, requiresPasscode: assessment?.requiresPasscode || false, passcode: assessment?.passcode || '', hideImmediateResult: assessment?.hideImmediateResult || false, hideAnswers: assessment?.hideAnswers || false, isAnonymous: assessment?.isAnonymous || false,`.

- [x] **Step 3: Add the 4-way mode selector to the `GENERAL` tab**

```jsx
<div className="field-group">
  <label className="field-label">Evaluation Mode</label>
  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
    {[
      { mode: ASSESSMENT_MODES.PROMOTION, label: '🏆 Promotion / Level Gate', icon: 'ti-trophy' },
      { mode: ASSESSMENT_MODES.SURVEY, label: '📋 Survey / CSAT', icon: 'ti-clipboard-list' },
      { mode: ASSESSMENT_MODES.TEST, label: '📝 Standard Test', icon: 'ti-file-text' },
      { mode: ASSESSMENT_MODES.EES, label: '📊 EES (Engagement Survey)', icon: 'ti-chart-bar' },
    ].map((opt) => (
      <button
        key={opt.mode}
        type="button"
        className="filter-chip"
        style={{
          border: formData.evaluationMode === opt.mode ? '2px solid var(--rail)' : '1px solid var(--line)',
          background: formData.evaluationMode === opt.mode ? 'var(--rail-soft)' : 'var(--paper-raised)',
          padding: '10px 14px',
          borderRadius: 8,
          cursor: 'pointer',
        }}
        onClick={() => setFormData((prev) => ({
          ...prev,
          evaluationMode: opt.mode,
          isConfidential: opt.mode === ASSESSMENT_MODES.PROMOTION,
          requiresPasscode: opt.mode === ASSESSMENT_MODES.PROMOTION,
          hideImmediateResult: opt.mode === ASSESSMENT_MODES.PROMOTION,
          hideAnswers: opt.mode === ASSESSMENT_MODES.PROMOTION,
          isAnonymous: opt.mode === ASSESSMENT_MODES.EES,
        }))}
      >
        <i className={`ti ${opt.icon}`} style={{ marginRight: 6 }} />
        {opt.label}
      </button>
    ))}
  </div>

  {formData.evaluationMode === ASSESSMENT_MODES.PROMOTION && (
    <div className="card card-pad" style={{ marginTop: 10, borderColor: 'var(--rust)', background: 'var(--rust-soft, rgba(220,38,38,0.05))' }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--rust)', marginBottom: 6 }}>
        <i className="ti ti-alert-triangle" style={{ marginRight: 6 }} />
        Security Notice: Promotion Exam Confidentiality
      </div>
      <p style={{ fontSize: 12, color: 'var(--ink-soft)', marginBottom: 10 }}>
        This exam's content, questions, and raw results will be restricted to the Examination Board (System Administrator). Regular User Admins will not be able to view or edit it. Answer review and immediate results are automatically disabled for candidates.
      </p>
      <label className="field-label">Exam Room / Proctor Passcode</label>
      <input
        type="text"
        className="field-input"
        value={formData.passcode}
        onChange={(e) => setFormData((prev) => ({ ...prev, passcode: e.target.value }))}
        placeholder="e.g. GATE2026"
        style={{ maxWidth: 260 }}
      />
    </div>
  )}
</div>
```

Import `ASSESSMENT_MODES` alongside the existing `assessmentData.js` imports in this file.

- [x] **Step 4: Restrict the EES audience picker to broad targets only**

In the `ASSIGNMENTS` tab's audience-picker logic (the cascading-target picker also used for courses, per the codebase report — `getCascadingTargetOptions` from `data/assignmentTargets.js`), when `formData.evaluationMode === ASSESSMENT_MODES.EES`, hide/disable whichever `assignmentType` option targets a single named individual (read the existing `ASSIGNMENT_TYPES` options rendered in that tab first — there should be a per-person or per-user target type distinct from `ALL/DEPARTMENT/LEVEL/STORE`; if the existing types are already all group-level with no single-person option, note this in the commit message as "no per-person target existed to restrict" and skip this step's UI change, but still keep the `isAnonymous: true` default from Step 3).

- [x] **Step 5: Ensure `passcode`/mode fields are included when saving**

Confirm the existing `onSave`/submit handler (wherever it assembles the final assessment object from `formData` before calling the `onSave` prop) already spreads all of `formData` into the saved object (it very likely does, given the existing large `formData` shape) — if it instead explicitly lists fields one by one, add the 6 new fields to that explicit list.

- [x] **Step 6: Manual verification**

Run `npm run dev` as `sysadmin` (or `useradmin` for non-Promotion modes). Open the assessment editor for a new assessment, select each of the 4 modes, confirm: selecting Promotion reveals the passcode field and the security notice, and auto-checks the confidentiality flags (verify by saving and re-opening the editor — the flags should persist); selecting any other mode hides the passcode field; selecting EES doesn't crash the Assignments tab. Save a Promotion-mode assessment with a passcode and confirm (from Task 6's masking) that it now shows locked for `useradmin` and open for `sysadmin`.

- [x] **Step 7: Append verify-script checks and run verify**

Add a section rendering `AssessmentEditorModal` with a Promotion-mode `formData`/`assessment` prop and asserting the HTML contains `'Exam Room / Proctor Passcode'` and `'Security Notice'`; render with a Test-mode prop and assert those strings are ABSENT. Run `npm run verify`, confirm baseline unchanged plus new checks passing.

- [x] **Step 8: Commit**

```bash
git add src/features/assessment/AssessmentEditorModal.jsx scripts/verify-role-level-model.jsx
git commit -m "feat(assessment): add 4-mode selector and promotion passcode field to the editor"
```

---

### Task 8: QR Token Helper, Check-Out Action, Attendance Windows

**Files:**
- Create: `src/utils/qrAttendance.js`
- Modify: `src/store/CourseStore.jsx`
- Modify: `lms-app/package.json`
- Modify: `scripts/verify-role-level-model.jsx`

**Interfaces:**
- Produces (consumed by Tasks 9-10):
  - `export function currentBucket(now = Date.now()): number`
  - `export function secondsUntilNextBucket(now = Date.now()): number`
  - `export function sessionQrSecret(session): string`
  - `export function generateQrToken(sessionId, qrSecret, phase, bucket = currentBucket()): string` — `phase` is `'CHECKIN' | 'CHECKOUT'`
  - `export function isQrTokenValid(token, sessionId, qrSecret, phase, now = Date.now()): boolean`
  - `export function deriveAttendanceWindows(session): { checkIn: {start, end}, checkOut: {start, end} }` — ISO datetime strings, derived from `session.date`/`session.time` when the session has no explicit window fields.
  - `checkOutClassroom(sessionId, surveyData, user = currentUser)` action and `classroomSurveys` state (`{ [sessionId]: { [userId]: {...surveyData, submittedAt} } }`), both exposed from `useCourseStore()`.

- [x] **Step 1: Add the `qrcode` dependency**

Run: `npm install qrcode`
Expected: `lms-app/package.json`'s `dependencies` gains `"qrcode": "^1.5.4"` (or whatever exact version resolves), `package-lock.json` updates. Confirm `npm run dev` still starts cleanly afterward.

- [x] **Step 2: Write `src/utils/qrAttendance.js`**

```js
const BUCKET_MS = 30000;

function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i += 1) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

export function currentBucket(now = Date.now()) {
  return Math.floor(now / BUCKET_MS);
}

export function secondsUntilNextBucket(now = Date.now()) {
  return Math.ceil((BUCKET_MS - (now % BUCKET_MS)) / 1000);
}

export function sessionQrSecret(session) {
  return session?.qrSecret || session?.id || 'unknown-session';
}

export function generateQrToken(sessionId, qrSecret, phase, bucket = currentBucket()) {
  return `${phase}-${hashString(`${sessionId}:${qrSecret}:${phase}:${bucket}`)}`;
}

export function isQrTokenValid(token, sessionId, qrSecret, phase, now = Date.now()) {
  const bucket = currentBucket(now);
  return (
    token === generateQrToken(sessionId, qrSecret, phase, bucket) ||
    token === generateQrToken(sessionId, qrSecret, phase, bucket - 1)
  );
}

function combineDateTime(dateStr, timeStr, offsetMinutes = 0) {
  if (!dateStr) return null;
  const [y, m, d] = dateStr.split('-').map(Number);
  const [hh, mm] = (timeStr || '09:00').split(':').map(Number);
  const dt = new Date(y, (m || 1) - 1, d || 1, hh || 9, mm || 0);
  dt.setMinutes(dt.getMinutes() + offsetMinutes);
  return dt.toISOString();
}

export function deriveAttendanceWindows(session) {
  if (session?.checkInWindowStart && session?.checkInWindowEnd && session?.checkOutWindowStart && session?.checkOutWindowEnd) {
    return {
      checkIn: { start: session.checkInWindowStart, end: session.checkInWindowEnd },
      checkOut: { start: session.checkOutWindowStart, end: session.checkOutWindowEnd },
    };
  }
  return {
    checkIn: { start: combineDateTime(session?.date, session?.time, -15), end: combineDateTime(session?.date, session?.time, 30) },
    checkOut: { start: combineDateTime(session?.date, session?.time, 90), end: combineDateTime(session?.date, session?.time, 180) },
  };
}
```

- [x] **Step 3: Add `checkOutClassroom` and `classroomSurveys` to `CourseStore.jsx`**

Read the existing `checkInClassroom` action fully first (mirror its exact style — how it finds/updates the session inside the `classrooms` state array). Add near it:

```js
const [classroomSurveys, setClassroomSurveys] = useState({});

function checkOutClassroom(sessionId, surveyData = {}, user = currentUser) {
  const userId = user?.userId;
  setClassrooms((prev) => prev.map((session) => (
    session.id === sessionId ? { ...session, attendanceStatus: 'CHECKED_OUT' } : session
  )));
  if (userId) {
    setClassroomSurveys((prev) => ({
      ...prev,
      [sessionId]: {
        ...(prev[sessionId] || {}),
        [userId]: { ...surveyData, submittedAt: new Date().toISOString() },
      },
    }));
  }
}
```

(Adapt `setClassrooms`/the state setter name to whatever `checkInClassroom` already uses — read Step 1's findings first, do not assume the exact setter name without confirming it.) Expose `checkOutClassroom` and `classroomSurveys` in the same context-value object where `checkInClassroom` is already exposed.

- [x] **Step 4: Manual verification of the pure helpers**

Write a throwaway scratch script (in the OS temp/scratchpad directory, not committed) that imports `generateQrToken`/`isQrTokenValid`/`currentBucket` and confirms: a token generated for bucket N validates against `isQrTokenValid` called immediately after (same bucket) and also ~29 seconds later (still bucket N, or now bucket N+1 but within the "previous bucket" tolerance) — but does NOT validate against a token from bucket N-5 (far outside tolerance). Confirm `deriveAttendanceWindows` returns sane ISO strings for a real seeded session (pick one from `mockData.js`'s `classroomSessions`).

- [x] **Step 5: Append verify-script checks and run verify**

Add a section importing `generateQrToken`/`isQrTokenValid` directly (pure function assertions, no render needed) and asserting: same-bucket token validates; a token forced to bucket `currentBucket() - 5` does NOT validate. Run `npm run verify`, confirm baseline unchanged plus new checks passing.

- [x] **Step 6: Commit**

```bash
git add src/utils/qrAttendance.js src/store/CourseStore.jsx package.json package-lock.json scripts/verify-role-level-model.jsx
git commit -m "feat(attendance): add 30s rotating QR token helper, checkOutClassroom action, and qrcode dependency"
```

---

### Task 9: Trainer Hub — Real Rotating QR with Check-in/Check-out Toggle

**Files:**
- Modify: `src/pages/trainer/TrainerHub.jsx`
- Modify: `scripts/verify-role-level-model.jsx`

**Interfaces:**
- Consumes: `generateQrToken`, `currentBucket`, `secondsUntilNextBucket`, `sessionQrSecret` from Task 8's `utils/qrAttendance.js`; the `qrcode` package (Task 8) for rendering.

- [x] **Step 1: Read the existing live-QR modal section fully**

Locate `liveQrClass`/`openLiveQrModal`/`qrTokenSuffix` and the existing manual-refresh QR display (the Tabler-icon-or-mock-SVG block). Note the exact button that currently does manual refresh (`qrTokenSuffix = Date.now()...`) — this whole manual-refresh mechanism is replaced by automatic rotation in this task.

- [x] **Step 2: Add a check-in/check-out phase toggle and automatic rotation**

Add local state `const [qrPhase, setQrPhase] = useState('CHECKIN');` and a ticking re-render every second while the modal is open:

```jsx
const [nowTick, setNowTick] = useState(Date.now());
useEffect(() => {
  if (!liveQrClass) return;
  const interval = setInterval(() => setNowTick(Date.now()), 1000);
  return () => clearInterval(interval);
}, [liveQrClass]);
```

Import `useEffect` if not already imported. Replace the old `qrTokenSuffix`-based token string with:

```jsx
const qrToken = liveQrClass ? generateQrToken(liveQrClass.id, sessionQrSecret(liveQrClass), qrPhase, currentBucket(nowTick)) : '';
const secondsLeft = secondsUntilNextBucket(nowTick);
```

Import `generateQrToken, currentBucket, secondsUntilNextBucket, sessionQrSecret` from `'../../utils/qrAttendance'`.

- [x] **Step 2b: Display the (derived) attendance window for the active phase**

Also import `deriveAttendanceWindows` from `'../../utils/qrAttendance'`. Compute `const windows = liveQrClass ? deriveAttendanceWindows(liveQrClass) : null;` and render a small read-only line above the toggle buttons, e.g. `Check-in window: {new Date(windows.checkIn.start).toLocaleTimeString()} – {new Date(windows.checkIn.end).toLocaleTimeString()}` (swap to `windows.checkOut` when `qrPhase === 'CHECKOUT'`). This satisfies the spec's "configurable attendance windows" requirement via the Task 8 Ruling's derive-from-schedule default (no separate window-editing UI is built in this plan — the window is computed, not hand-configured, per that ruling) — purely informational, does not gate anything in this file (gating happens in Task 10, learner side).

- [x] **Step 3: Render the toggle, the real QR (via `qrcode`), and the countdown ring**

```jsx
<div style={{ display: 'flex', gap: 8, marginBottom: 14, justifyContent: 'center' }}>
  <Button variant={qrPhase === 'CHECKIN' ? 'primary' : 'outline'} onClick={() => setQrPhase('CHECKIN')}>
    QR Check-in (Class Start)
  </Button>
  <Button variant={qrPhase === 'CHECKOUT' ? 'primary' : 'outline'} onClick={() => setQrPhase('CHECKOUT')}>
    QR Check-out &amp; Survey (Class End)
  </Button>
</div>

<QrCodeDisplay value={qrToken} />

<div style={{ textAlign: 'center', marginTop: 10 }}>
  <Badge tone={secondsLeft <= 5 ? 'rust' : 'amber'} icon="ti-clock" size="lg">
    Refreshing in {secondsLeft}s
  </Badge>
</div>
```

Add a small local component in the same file (above the default export, or as an inline sub-component — follow whatever pattern the file already uses for small local helper components, if any; otherwise define it as a plain function component at module scope):

```jsx
function QrCodeDisplay({ value }) {
  const [dataUrl, setDataUrl] = useState('');
  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(value, { width: 220, margin: 1 }).then((url) => { if (!cancelled) setDataUrl(url); });
    return () => { cancelled = true; };
  }, [value]);
  if (!dataUrl) return <div style={{ width: 220, height: 220, margin: '0 auto' }} />;
  return <img src={dataUrl} alt="Live attendance QR code" style={{ width: 220, height: 220, margin: '0 auto', display: 'block' }} />;
}
```

Import `QRCode from 'qrcode'` at the top of the file. Remove the old manual "Refresh" button and the old hand-drawn SVG/icon QR mock entirely — they're superseded by `QrCodeDisplay` + automatic rotation.

- [x] **Step 4: Manual verification**

Run `npm run dev` as a trainer. Open the Live QR modal for a class you teach. Confirm a real scannable-looking QR renders (not an icon/mock), the countdown badge ticks down from 30 to 0 and the QR image visibly changes (different image) each time it hits 0, and toggling between Check-in/Check-out changes the QR image immediately (different token/phase). Leave the modal open for over 60 seconds and confirm it keeps rotating indefinitely without needing any manual action.

- [x] **Step 5: Append verify-script checks and run verify**

Add a section rendering `TrainerHub` under a trainer persona with the Live QR modal pre-opened (follow whichever state-seeding approach nearby existing `TrainerHub` sections in the file already use, if any exist — otherwise this can be a lighter check that just confirms `TrainerHub` still renders without throwing after this change, since fully exercising a ticking `setInterval` inside a static `renderToStaticMarkup` render is not meaningful — a smoke render is sufficient here). Run `npm run verify`, confirm baseline unchanged plus new checks passing.

- [x] **Step 6: Commit**

```bash
git add src/pages/trainer/TrainerHub.jsx scripts/verify-role-level-model.jsx
git commit -m "feat(attendance): real rotating QR with check-in/check-out toggle in Trainer Hub"
```

---

### Task 10: Learner Classroom Scan Flow — Dual Check-in/Check-out + Check-out Survey Wiring

**Files:**
- Modify: `src/pages/learner/LearnerClassrooms.jsx`
- Modify: `src/features/common/PostTrainingSurveyModal.jsx`
- Modify: `scripts/verify-role-level-model.jsx`

**Interfaces:**
- Consumes: `isQrTokenValid`, `sessionQrSecret` from Task 8; `checkOutClassroom` from Task 8; `openSurveyModal`/`closeSurveyModal` (existing).

- [x] **Step 1: Read both files fully with these insertion points in mind**

`LearnerClassrooms.jsx`: the `scanningSession`/`scanState`/`handleSimulateScan` flow, and exactly where it currently calls `checkInClassroom` then `handleOpenSurvey`/`openSurveyModal(session, 'CLASSROOM_CSAT')` right after check-in succeeds — this survey-on-checkin call is removed/moved in this task. `PostTrainingSurveyModal.jsx`: the `handleSubmit` function's `if (isL1) {...} else if (!isL1 && !isClassroomCsat && learner?.planId) {...}` structure — note the `isClassroomCsat` case currently has no branch (the bug being fixed), and the two `"/ 5 Sao"` occurrences (lines ~140 and ~189 per the codebase report) to fix to `"/ 5 Stars"`.

- [x] **Step 2: Add a scan-phase concept to `LearnerClassrooms.jsx`**

Add a `scanPhase` state (`'CHECKIN' | 'CHECKOUT'`) set when the learner opens the scanner (from whatever UI element currently triggers `scanningSession` — likely two now-separate buttons/entry points instead of one: a "Scan Check-in QR" and a "Scan Check-out QR" action, gated by the session's current `attendanceStatus`: check-in scan only available when `attendanceStatus === 'PENDING_CHECKIN'`, check-out scan only available when `attendanceStatus === 'CHECKED_IN'`).

Additionally gate each button by its window, using Task 8's `deriveAttendanceWindows(session)` (import it from `'../../utils/qrAttendance'`): the "Scan Check-in QR" button is disabled with a tooltip/inline note (`"Check-in opens at {time}"` / `"Check-in window has closed"`) when `Date.now()` is outside `windows.checkIn`; same pattern for check-out against `windows.checkOut`. Compare using plain `Date` comparisons (`new Date(windows.checkIn.start).getTime() <= Date.now() <= new Date(windows.checkIn.end).getTime()`), no new date-string utilities needed since `deriveAttendanceWindows` already returns ISO datetime strings.

In `handleSimulateScan` (or equivalent), after the existing `VERIFYING` → 1000ms delay, branch on `scanPhase`:

```js
if (scanPhase === 'CHECKIN') {
  checkInClassroom(scanningSession.id);
  setScanState('SUCCESS');
  setTimeout(() => { setScanningSession(null); setScanState(null); }, 1500);
} else {
  // CHECKOUT: do not mutate attendance yet — the survey submit is what finalizes it
  setScanState('SUCCESS');
  setTimeout(() => {
    setScanningSession(null);
    setScanState(null);
    openSurveyModal(scanningSession, 'CLASSROOM_CSAT');
  }, 1500);
}
```

Adapt exact variable names (`scanningSession`, `setScanState`, etc.) to what Step 1 found. The simulated freshness check (`isQrTokenValid`) is exercised at the point the "scan" is simulated — since this app has no real camera/QR decode, treat the simulate-scan button itself as always presenting a fresh token (the anti-proxy rejection path is demonstrated via a SEPARATE explicit "Simulate an Expired Scan" secondary action/button in the same modal, which calls `isQrTokenValid` with a bucket forced 5+ buckets in the past and, when it returns `false`, shows an alert: `"This QR code has expired. Please scan the live screen currently being projected."` — add this as a second button next to the existing simulate-scan button, wired to `isQrTokenValid(fakeStaleToken, scanningSession.id, sessionQrSecret(scanningSession), scanPhase, Date.now() - 5*30000)`).

- [x] **Step 3: Fix `PostTrainingSurveyModal.jsx`'s `isClassroomCsat` submit branch**

In `handleSubmit`, add the missing branch (the function currently has `if (isL1) {...} else if (!isL1 && !isClassroomCsat && learner?.planId) {...}` — add an `else if (isClassroomCsat)` branch before or in place of that structure):

```js
if (isL1 && actionPlanCommitment.trim()) {
  // ...existing L1 branch unchanged
} else if (isClassroomCsat) {
  checkOutClassroom(course.id, {
    csatTrainerRating,
    csatContentRating,
    csatFacilityRating,
    csatComment,
  });
} else if (!isL1 && !isClassroomCsat && learner?.planId) {
  // ...existing L3 branch unchanged
}
```

Add `checkOutClassroom` to the existing `useCourseStore()` destructuring at the top of the file. Recall from the design spec that `course` here is actually the classroom session object (passed as `openSurveyModal(session, 'CLASSROOM_CSAT')`'s first argument) — so `course.id` is the session id, matching `checkOutClassroom(sessionId, surveyData)`'s expected first argument.

- [x] **Step 4: Fix the two `"Sao"` → `"Stars"` occurrences**

Change both `{q.value} / 5 Sao` (CSAT block) and `{trainerRating} / 5 Sao` (L1 block — confirm exact variable name at that call site, it may differ per-question) to end in `/ 5 Stars`.

- [x] **Step 5: Update the "Certificate unlocked" signal in `LearnerClassrooms.jsx`**

Wherever the session card currently shows attendance status badges (`PENDING_CHECKIN`/`CHECKED_IN`/etc.), add a `CHECKED_OUT` case showing a `Badge tone="sage" icon="ti-certificate"` reading `"Completed · Certificate Unlocked"`, with a button/link to `/learner/certificates` (reuse the exact navigation the codebase already uses elsewhere for "view certificate" — e.g. `AssessmentPlayer.jsx`'s result screen already does `navigate('/learner/certificates')`; use the same route).

- [x] **Step 6: Manual verification — the full dual flow**

Run `npm run dev` as a learner enrolled in an in-person class. Open the classroom, trigger "Scan Check-in QR" → confirm status becomes `CHECKED_IN` and **no survey modal appears** (this is the behavior change from before). Trigger "Scan Check-out QR" → confirm the CSAT survey modal opens automatically. Fill in the 3 star ratings + comment, submit → confirm the modal shows the thank-you state, then closes, and the session card now shows `CHECKED_OUT`/"Certificate Unlocked". Reload the page and confirm the status persists (survives a re-render from the store, not just local component state). Trigger "Simulate an Expired Scan" and confirm the rejection alert appears and no state changes.

- [x] **Step 7: Append verify-script checks and run verify**

Add a section that calls `checkOutClassroom` directly on a store instance (or via whatever pre-seeding pattern the file's other sections use) with sample survey data, then asserts `classroomSurveys[sessionId][userId].csatTrainerRating` matches what was passed and the session's `attendanceStatus === 'CHECKED_OUT'` — this directly proves the previously-silent-discard bug is fixed. Run `npm run verify`, confirm baseline unchanged plus new checks passing.

- [x] **Step 8: Commit**

```bash
git add src/pages/learner/LearnerClassrooms.jsx src/features/common/PostTrainingSurveyModal.jsx scripts/verify-role-level-model.jsx
git commit -m "feat(attendance): dual check-in/check-out scan flow with check-out-triggered CSAT survey"
```

---

## Final Note For The Executor

After Task 10, run the full manual verification pass one more time end-to-end (all 4 features, as both a learner and an admin/sysadmin persona) before the final whole-branch review — the product owner's explicit requirement is that nothing is discovered broken only after everything is "done." Cross-check in particular: enrolling from the Calendar (Task 3) is reflected on `LearnerCourseDetail`/`LearnerCourses`; registering for a Promotion exam from `AssessmentPlayer` (Task 5) is reflected if the same assessment is reopened from `LearnerCourses`' list; checking out of a class (Task 10) is reflected on the Calendar's classroom event card.
