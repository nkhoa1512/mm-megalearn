# LMS 4-Feature Upgrade — Design Spec

**Status:** Approved by product owner (via conversation on 2026-09-03). Order of build confirmed: **Course Enrollment Gate → Calendar → Assessment 4-Mode → QR Attendance**, all four in one branch/plan.

This spec adapts the original architecture brief the product owner supplied, corrected against the actual current state of the codebase (verified by direct code reading on 2026-09-03, `lms-app` at commit `ad7552a`). Anywhere the original brief assumed something that isn't true today (e.g. "the calendar already shows courses," "a QR library exists," "assessments already have an enrollment concept"), this spec states the real starting point and the real gap being closed.

## 0. Global product requirement (applies to every feature below)

Per explicit product-owner instruction: a feature is not "done" when the code compiles. After every task, the implementer and reviewer must confirm, concretely:
1. **Data completeness** — every new UI surface has real seed data behind it (no empty states from missing mock data); if the plan didn't specify enough seed rows, add more so the feature reads as populated/realistic in `npm run dev`.
2. **Cross-page linkage** — every button/link that is supposed to navigate somewhere lands on a real, wired route; every action that is supposed to update shared state (`CourseStore`) is visible immediately on every other page that reads that state (e.g. enrolling from the Calendar updates `LearnerCourseDetail` and `LearnerCourses` without a refresh).
3. **Logic correctness** — the gate/branch conditions match the spec's state matrix exactly (see each feature's table below) — not just "looks right in the happy path."
No task is marked complete until these three are true, in addition to `npm run verify` passing with no new failures.

## 1. Course Enrollment Gate (E-Learning)

### Current state (verified)
- `LearnerCourseDetail.jsx` already renders a "NOT ENROLLED" card with an **Enroll Now / Start Learning** button when `!course.enrollment`, calling `enrollCourse(course.id, user)` (free) or opening a payment-confirm modal (paid). This part already works.
- **The gap:** `LearnerCourseDetail.jsx`'s `ModuleList` only disables lesson links for `isPrereqLocked || isLevelLocked || isRegistrationClosed` — it does **not** check `!course.enrollment`, so lesson links are clickable before enrolling. And `LessonPlayer.jsx` has **no enrollment check at all** — a learner who guesses/bookmarks `/learner/courses/:courseId/lessons/:lessonId` gets full lesson content and can even complete it, with no `enrollment` object, purely by direct URL.

### Target behavior
- `LearnerCourseDetail.jsx`: `getLessonHref()` returns `null` (lesson not clickable, shown with a lock icon) whenever `!course.enrollment`, in addition to its existing three lock reasons.
- `LessonPlayer.jsx`: if `course` exists, is accessible in every other respect, but `!enrollment`, render a blocking full-page state (not the lesson) with the message and a button back to `LearnerCourseDetail` — same visual language as the existing "Lesson not found" / "Registration Closed" empty states already in that file.
- This must not interfere with the *level-lock* / *registration-closed* / *prerequisite-lock* gates, which take precedence in this order: not found → level-locked → registration-closed → **not enrolled (new)** → render lesson.

## 2. Full Monthly Organization Calendar Overview

### Current state (verified)
- `utils/calendarEvents.js`'s `buildCalendarEvents()` only ever returns the **logged-in user's own** data: enrolled-course deadlines, classroom sessions the user is *already* `isEnrolled` in, and two families of **hard-coded fixture events** (`buildPersonalAssessmentEvents` and `buildOperationalEventsByRole`) that ignore the real `assessments`/`courses` store data entirely.
- `features/calendar/UniversalCalendar.jsx` renders its own hand-built month grid (not the shared `MonthCalendarGrid` from `features/common/ui.jsx`), with category filter chips (`EVENT_CATEGORIES`: ALL/ELEARNING/CLASSROOM_ILT/VIRTUAL_CLASS/ASSESSMENT/CERTIFICATE/OPERATIONAL) and a simulated QR modal.
- **The gap:** no view of the calendar currently shows courses the learner is *not yet enrolled in* — i.e. exactly the "what's mandatory that I haven't started" and "what optional courses are available this month" views the product owner wants are entirely missing.

### Target behavior
Add a genuinely new event family — **organization-wide course events** — built from the real `courses` list (not fixtures), alongside the existing personal/operational events (kept as-is; this is additive, not a replacement). Every published course with a schedule-relevant date (its `assignment.dueDate` if mandatory, or, for optional courses with no due date, the 1st of the current view month — see Task 3 for the exact rule) becomes one calendar event per month, colored and labeled by this exact matrix:

| `courseType` | Enrollment state | Tone | Color token | Icon | Subtitle | Action |
|---|---|---|---|---|---|---|
| `MANDATORY` | `!isEnrolled` | `rust` | `#DC2626` | `ti-alert-circle` | "Mandatory · Action Required (Not Enrolled)" | `ENROLL_COURSE` → "Enroll in Course" |
| `MANDATORY` | `isEnrolled` | `rust` (badge only; event pill stays red per spec) | `#DC2626` | `ti-alert-circle` | "Mandatory · Enrolled (In Progress / Completed)" | `START_COURSE` → "Continue Learning" |
| `OPTIONAL` | `!isEnrolled` | `sage` | `var(--bigc-green)` | `ti-sparkles` | "Optional · Available to Join" | `ENROLL_COURSE` → "Enroll in Course" |
| `OPTIONAL` | `isEnrolled` | `sage` | `var(--bigc-green)` | `ti-sparkles` | "Optional · Enrolled" | `START_COURSE` → "Open Course" |

Plus: existing enrolled ILT/virtual sessions keep their current check-in/check-out actions; standalone assessments (once Task 4-8 land) appear as their own category using real `assessments` data instead of the current fixture stand-ins.

UI additions to `UniversalCalendar.jsx`:
- A header metric bar: Total Monthly Events | Mandatory (red count) | Optional (green count) | Enrolled | Unenrolled (Action Required).
- New quick filter chips, in addition to the existing `EVENT_CATEGORIES` chips: `🔴 Mandatory` / `🟢 Optional` / `✅ Enrolled` / `⏳ Action Required` / `🏢 In-Person Workshops` / `🏆 Assessments`.
- The event-detail modal gets a direct **"Enroll Now"** button (calls `enrollCourse`) for learners on an unenrolled event, and — for roles with `hasCapability(role, 'canAllocateCourses')` (Manager/HRBP/User Admin/SysAdmin, per `data/roles.js`) — an **"Assign to Team"** button that opens the existing course-assignment flow pattern (reuse, don't reinvent: point it at the same `assignCourseToOrgUnit`-style action already used by `AdminCourses.jsx`/curriculum allocation — Task 3's brief will name the exact function once located).

## 3. Four Standalone Assessment Modes with Promotion-Exam Security

### Current state (verified)
- `data/assessmentData.js` has `type: 'QUIZ'|'ASSIGNMENT'|'SURVEY'` — there is no `PROMOTION` or `EES` concept anywhere in the codebase (confirmed by full-repo grep). `type: 'SURVEY'` exists today but is barely special-cased (auto-passes in `AssessmentPlayer.jsx`).
- There is **no assessment enrollment/registration concept** at all — access is computed live by `getAssessmentAccess()` purely from `assessment.assignments` matching the learner's org attributes; once assigned, a learner clicks straight into the exam start screen (`AssessmentPlayer.jsx`'s `phase === 'start'`) with no registration step.
- There is **no confidentiality / passcode gate** anywhere — `useradmin` and `sysadmin` both get unconditional full visibility everywhere in the app (see `getAssessmentAccess()`'s `isSysOrUserAdmin` short-circuit). The 6-role model (`data/roles.js`) has no finer-grained "Examination Board" concept.
- `AssessmentPlayer.jsx`'s `phase === 'start'` screen **is** the "Overview / Rules" screen the product brief describes — it already shows time limit, pass mark, max attempts, and anti-cheat rules before a "Start The Exam Now" button. This is the natural place to add the registration gate and the passcode gate, rather than building a new page.
- `AssessmentDetailModal.jsx` is the modal used from `AdminCourses.jsx` (admin/trainer authoring & review side) — it is **not** the learner's take-the-exam entry point (that's `LearnerCourses.jsx` → `navigate('${basePath}/assessment/${item.id}')` → `AssessmentPlayer.jsx` directly).

### Rulings (binding — see plan Global Constraints for the authoritative copy)
1. **"Examination Board" access** is implemented as a new RBAC capability, `canViewConfidentialAssessments`, added to `ROLE_DEFINITIONS` for **`sysadmin` only** (not `useradmin`) in `data/roles.js`. This is the concrete mechanism that satisfies "even regular User Admin cannot view... without Examination Board credentials" — `useradmin` is deliberately excluded from this one capability while keeping every other capability it already has. This is a new, narrow exception to the otherwise-uniform "useradmin sees everything" rule elsewhere in the app; it applies **only** to assessments flagged `isConfidential: true`.
2. **Assessment registration** is new store state, `assessmentRegistrations` (shape: `{ [userId]: { [assessmentId]: { registeredAt: isoDate } } }`), plus a new action `enrollAssessment(assessmentId, user = currentUser)`, mirroring the existing `enrollCourse` pattern (see `CourseStore.jsx:1366`).
3. **Passcode** is a plaintext field on the assessment record (`assessment.passcode`) checked client-side in `AssessmentPlayer.jsx` before unlocking the exam — this mirrors the existing plaintext `virtualMeeting.passcode` pattern already in the codebase (`AdminCourseBuilder.jsx`), so it is consistent with the project's existing security posture (a mock LMS with no real backend/auth server) rather than a new weaker pattern.

### The 4 modes — exact model additions to `data/assessmentData.js`
```js
export const ASSESSMENT_MODES = {
  PROMOTION: 'PROMOTION',   // Level Gate / Promotion Examination
  SURVEY: 'SURVEY',         // Training CSAT & Feedback (Likert, no pass/fail)
  TEST: 'TEST',             // Standard scored knowledge quiz
  EES: 'EES',               // Employee Engagement Survey (anonymous, eNPS)
};
```
New per-assessment fields: `evaluationMode: keyof ASSESSMENT_MODES`, `isConfidential: boolean`, `requiresPasscode: boolean`, `passcode: string|null`, `hideImmediateResult: boolean`, `hideAnswers: boolean`, `isAnonymous: boolean`. `PROMOTION` seeds always set `isConfidential:true, requiresPasscode:true, hideImmediateResult:true, hideAnswers:true`. `EES` seeds always set `isAnonymous:true`.

### Target behavior — the gate sequence (`AssessmentPlayer.jsx`, `phase === 'start'`)
1. Not assigned to this user at all → existing `access.isLocked` empty state (unchanged).
2. Assigned but not registered (`!assessmentRegistrations[user.userId]?.[assessment.id]`) → show the Overview/Rules screen (existing content) with the primary button relabeled **"Enroll / Register for Examination"**, calling `enrollAssessment(assessment.id)`; the real "enter exam" action is **disabled** until registered.
3. Registered, `evaluationMode === 'PROMOTION'` and no valid passcode entered yet → show a passcode-entry screen (new) in place of the "Start The Exam Now" button; wrong passcode shows an inline error and does not advance; correct passcode (`=== assessment.passcode`) reveals the normal start button labeled "Enter Exam Room".
4. Registered (and, for PROMOTION, passcode-verified) → existing start button, unchanged for TEST/SURVEY/EES; for PROMOTION it reads "Enter Exam Room".

### Target behavior — the result screen (`phase === 'result' `, end of `AssessmentPlayer.jsx`)
Branch on `activeAssessment.evaluationMode`:
- **PROMOTION**: hide the score card, the competency-gap card, and the per-question explanation card entirely. Show one message card only: *"Your promotion examination submission has been securely recorded. Official results will be validated and published by the Evaluation Committee & HR Department."* No score, no pass/fail badge, no answers.
- **TEST** (and legacy/undefined mode, for course-linked exams that don't set `evaluationMode`): unchanged — current score/pass-fail/competency/explanations behavior.
- **SURVEY**: replace the score card with a "Thank you for your feedback" card (no percentage, no pass/fail — this mode never fails).
- **EES**: same thank-you treatment as SURVEY, plus a note confirming the response was recorded anonymously (no name/employeeCode shown, and the watermark shown during `phase === 'in-progress'` must be suppressed for this mode since it identifies the respondent).

### Admin-side confidentiality (`AssessmentDetailModal.jsx`, `AssessmentEditorModal.jsx`, `AdminCourses.jsx`'s assessment list)
Anywhere an assessment is listed or opened for a user whose role lacks `canViewConfidentialAssessments` (i.e. everyone except `sysadmin`) and the assessment has `isConfidential: true`: the list row shows a locked placeholder (title + a "🔒 Confidential — Examination Board Only" badge, no description/stats/question content), and attempting to open `AssessmentDetailModal`/`AssessmentEditorModal` for it instead shows a short access-denied panel in place of the modal's normal content. `useradmin` (rank 5) is explicitly included in "lacks the capability" here even though it has nearly every other admin capability — this is the one deliberate carve-out per Ruling 1 above.

### Editor mode selector (`AssessmentEditorModal.jsx`)
Add a 4-way mode selector (Promotion / Survey / Test / EES) to the existing `GENERAL` tab. Selecting **Promotion** auto-sets (and visually locks, with an explanatory note) `isConfidential:true, requiresPasscode:true, hideImmediateResult:true, hideAnswers:true`, and reveals a passcode text input (placeholder pattern like the doc's examples, e.g. `GATE2026`). Selecting **EES** auto-sets `isAnonymous:true` and hides the per-user assignment audience picker's "target specific people" option (EES should only target broad org units, consistent with "anonymous submission").

## 4. Dual In-Person QR Attendance (Check-in / Check-out) with 30-Second Dynamic QR & Post-Class Survey

### Current state (verified)
- **No QR library exists** in `package.json` (`react`, `react-dom`, `react-router-dom` only) — both existing "QR" UIs (`TrainerHub.jsx`'s live QR modal, `UniversalCalendar.jsx`'s live QR modal) render either a Tabler icon or a hand-drawn inline SVG with hardcoded finder-pattern shapes; the "token" is just a display string (`${qrToken}-${last4DigitsOfTimestamp}`), not a real encoded QR, and it does not expire — refresh is manual (a "Refresh" button), not automatic every 30s.
- `checkInClassroom(sessionId)` exists in `CourseStore.jsx`; **`checkOutClassroom` does not exist anywhere** (zero grep matches).
- `classrooms[].attendanceStatus` is a flat state machine (`PENDING_CHECKIN|CHECKED_IN|NOT_REGISTERED|ABSENT`) with **no time-boxed windows** (no `checkInWindowStart/End` fields) and no `CHECKED_OUT`/`COMPLETED` terminal state.
- In `LearnerClassrooms.jsx`, the existing "Simulate Scan" flow already auto-opens `PostTrainingSurveyModal` (`type: 'CLASSROOM_CSAT'`) immediately after check-in succeeds — **but this fires on check-IN, not check-OUT**, which is the wrong trigger point per the new spec (survey must fire at class end / check-out).
- **Confirmed pre-existing bug**: `PostTrainingSurveyModal.jsx`'s `handleSubmit()` only has branches for `isL1` and the L3 (manager-review) case — the `isClassroomCsat` branch falls through to neither, so the three star ratings + comment the learner enters are **silently discarded**, never persisted anywhere. This must be fixed as part of wiring check-out (the CSAT data now needs to reach `checkOutClassroom`).
- Two more pre-existing English-only-UI violations were found while reading this code, in scope to fix while these exact lines are being touched: `PostTrainingSurveyModal.jsx` renders `"{value} / 5 Sao"` (Vietnamese "star") twice (CSAT block and the L1 block) — must read `"/ 5 Stars"`; `AssessmentPlayer.jsx`'s per-question review badge renders `'CORRECT' : 'SAI'` (Vietnamese "wrong") — must read `'CORRECT' : 'INCORRECT'`.

### Rulings (binding)
1. **QR rendering**: add the `qrcode` npm package (verified reachable on the registry: `npm view qrcode version` → `1.5.4`) and use its browser-safe SVG/data-URL output to render a *real*, scannable-looking QR code of the rotating token — replacing the hand-drawn SVG mock. This is additive polish; it does not change the underlying token/validation logic below.
2. **Token rotation & "server-side" validation**: this app has no real backend — `CourseStore.jsx` is the closest thing to a server (it is the single source of truth all pages read from). The 30-second rotating token and its freshness check are therefore implemented as pure logic inside `CourseStore.jsx` / a new `utils/qrAttendance.js` helper, not a network call. Token = a deterministic function of `sessionId`, a per-session random `qrSecret` (generated once when the session is created/seeded), the attendance phase (`CHECKIN`/`CHECKOUT`), and the current 30-second time bucket (`Math.floor(Date.now() / 30000)`). Validation on scan recomputes the token for the **current** bucket and the **immediately preceding** bucket (to tolerate the few seconds of latency between the projector refreshing and the learner's scan completing) and rejects anything else — this is the concrete mechanism satisfying "a screenshot older than 30 seconds is rejected."
3. **Attendance windows**: add `checkInWindowStart/End` and `checkOutWindowStart/End` (ISO datetime strings) to the classroom session model, configurable by trainer/admin, defaulting to the session's existing `date`/`time` ± a reasonable margin (exact default in the plan's Task brief).

### Target behavior
- Trainer (`TrainerHub.jsx`'s live QR modal): a toggle between **"QR Check-in (Class Start)"** and **"QR Check-out & Survey (Class End)"**; whichever is active renders a real QR (via `qrcode`) of the current-bucket token plus an animated 30s→0s countdown ring, auto-regenerating every 30 seconds (no manual refresh needed — remove/repurpose the old manual "Refresh" button since rotation is now automatic).
- Learner (`LearnerClassrooms.jsx`): the existing "Simulate Scan" flow gets a `phase` param (`'CHECKIN'|'CHECKOUT'`) driven by which QR is currently being simulated/scanned. Scanning check-in (within the current/previous 30s bucket) → `checkInClassroom(sessionId)` as today, **no survey popup**. Scanning check-out (within its own 30s bucket) → does **not** call any store mutation yet; instead it opens `PostTrainingSurveyModal` (`type: 'CLASSROOM_CSAT'`) exactly as check-in does today, but submitting that survey is what finally calls the new `checkOutClassroom(sessionId, { csatTrainerRating, csatContentRating, csatFacilityRating, csatComment })` action, which sets `attendanceStatus: 'CHECKED_OUT'`, persists the CSAT numbers (fixing the silent-discard bug above), and is what the UI treats as "session complete, certificate unlocked." Scanning an expired token (outside the tolerated buckets) shows a rejection alert instructing the learner to re-scan the live screen.

---

*(End of design spec. See the paired plan file, `2026-09-03-lms-4-feature-upgrade.md`, for the exact task-by-task execution breakdown, in build order: Course Enrollment Gate → Calendar → Assessment 4-Mode → QR Attendance.)*
