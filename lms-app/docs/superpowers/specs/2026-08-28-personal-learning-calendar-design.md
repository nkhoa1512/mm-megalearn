# Personal Learning Calendar — Design Spec

Date: 2026-08-28
Status: Approved by user, ready for implementation planning

## 1. Purpose

Add a personal "Learning Calendar" page, available to **all 6 roles**,
that shows the courses each person is currently participating in or
has been assigned, plotted by date (e-learning deadlines and live/ILT
session dates), so they can see at a glance what's due/happening when
and drill into details for a given day. It's a purely
`currentUser`-scoped view — never a team/managed-people calendar — so
the same component and logic serve every role with no per-role
branching.

Reference: a generic calendar-app screenshot the user supplied,
used only as a **structural** reference (month grid + day detail,
hover preview, click-to-pin full detail). Its purple/teal color
palette is explicitly not reused — the page must look like the rest
of MM MegaLearn (existing `Badge` tones, `.card` styling, tabler
icons).

## 2. Non-goals

- No week view, no agenda/list view, no drag-to-reschedule, no
  creating/editing events from the calendar. Month view only.
- No new backend/data source. Every event traces to fields that
  already exist in `CourseStore` (`myEnrollments`, `classrooms`). No
  new store actions, no new persisted state beyond the page's own
  `selectedDate` UI state.
- No team/manager view of other people's calendars — personal only,
  for every role.
- No per-session detail route/page. Clicking a live-session event
  navigates to the existing `/learner/classrooms` list (no new
  per-session URL invented).

## 3. Data Model & Event Aggregation

New pure utility module `src/utils/calendarEvents.js` (same style as
`utils/courseCatalog.js`/`utils/curriculumAssignment.js`: plain
functions, no React, no store access — everything passed in).

```js
export function buildCalendarEvents({ courses, myEnrollments, classrooms }) {
  // returns: Map<'YYYY-MM-DD', CalendarEvent[]>
}
```

**`CalendarEvent` shape:**
```
{
  id: string,                 // `deadline-${courseId}` | `session-${sessionId}`
  date: 'YYYY-MM-DD',
  kind: 'DEADLINE' | 'LIVE_SESSION',
  title: string,               // course title / session title
  subtitle: string,            // "Hạn hoàn thành" | "08:30 - 11:30 · <venue>"
  statusLabel: string,         // Vietnamese label matching existing statusLabel() conventions
  tone: 'sage' | 'rust' | 'blue' | 'amber' | 'slate',
  courseId?: string,           // present for DEADLINE, used to build the link
  sessionId?: string,          // present for LIVE_SESSION
}
```

**Deadline events** — one per entry in `myEnrollments` (the courseId →
enrollment map already produced by `enrollmentsForUser`):
- Resolve the course from `courses` by id; skip silently if not found
  (defensive — enrollments should always resolve, but the calendar
  must not crash on stale/mock data drift).
- `date = enrollment.completedAt || enrollment.dueDate || enrollment.lastActivityAt`.
  Self-enrolled electives (`enrollCourse()` in `CourseStore.jsx`) have
  `dueDate: null` — they're optional catalog courses, not
  curriculum-assigned, so there's no deadline to show. Without this
  third fallback they'd silently vanish from the calendar entirely,
  which contradicts the feature's purpose (courses the user is
  *participating in*, not just ones with a deadline). `lastActivityAt`
  is already set at enroll time and bumped on every progress save
  (`CourseStore.jsx:738,986`), so it's always defined once an
  enrollment exists — no entry is ever skipped for lack of a date.
- **This is why a course only ever plots once**: a finished course is
  dated at its actual completion day (turning the calendar into a
  learning history), an unfinished one with a deadline at that
  deadline (a reminder), and a deadline-less elective at wherever the
  learner last touched it (or enrolled, if never opened). No separate
  "assigned" marker — assignment/enrollment is implied by the entry
  existing at all.
- Tone/status mapping from `enrollment.status`: `COMPLETED`→sage,
  `OVERDUE`→rust, `FAILED`→rust, `IN_PROGRESS`→blue,
  `NOT_STARTED`→slate. Labels reuse the existing `statusLabel()`
  helper pattern already in `LearnerCourseDetail.jsx` (copy/adapt, not
  a shared import, to avoid coupling a page-local helper across
  modules — matches existing repo style of small local `statusLabel`
  functions per page).

**Live session events** — one per entry in `classrooms` where
`isEnrolled` is true (exactly the filter `LearnerClassrooms.jsx`
already uses for its "My Sessions" tab):
- `date = session.date`.
- `subtitle = `${session.time} · ${session.venue}``.
- Tone: `attendanceStatus === 'CHECKED_IN'` → sage,
  `attendanceStatus === 'ABSENT'` → rust, else (`PENDING_CHECKIN` and
  still upcoming) → blue.

Grouping into the `Map` happens once per render via `useMemo` in the
page component, keyed on `[courses, myEnrollments, classrooms]`.

**Date handling:** all dates in this codebase are plain `'YYYY-MM-DD'`
strings (see `isoPlusDays()` in `mockData.js`). The month-grid
generator must build/compare using string keys and
`Date.UTC`-free local integer math (year/month/day arithmetic), never
`new Date(isoString)` for grid-cell membership — that's a classic
timezone-shift bug (a UTC-parsed date can render as the wrong local
day). `new Date()` is fine only for getting "today" once at mount via
a plain `YYYY-MM-DD` string, matching how the rest of the app already
treats "today".

## 4. Components

### `src/pages/learner/LearnerCalendar.jsx` (new page)
- Props: `{ basePath = '/my-learning' }` — same override pattern as
  `LearnerCourseDetail`/`MyCertificates`/`LessonPlayer`.
- `useCourseStore()` → `currentUser, courses, myEnrollments, classrooms`.
- State: `viewMonth` (first-of-month `'YYYY-MM-01'`, defaults to the
  current month), `selectedDate` (defaults to today's `'YYYY-MM-DD'`).
- `events = useMemo(() => buildCalendarEvents({...}), [...])`.
- Layout: `<div className="page-header">` with `<h1>Lịch Học Tập</h1>`
  + a `Badge` showing this month's event count, then a two-column
  `.grid-2`-style row: `MonthCalendarGrid` on one side, the
  selected-day detail panel on the other (stacks to one column on
  mobile, matching the existing `.grid-2` breakpoint behavior).
- Selected-day panel: if `events.get(selectedDate)` is empty, an
  `empty-state` card ("Không có khóa học nào vào ngày này.").
  Otherwise a list of rows — icon by `kind`, title, `subtitle`,
  `Badge tone={tone}>{statusLabel}`, `onClick` navigates to
  `${basePath}/${courseId}` for `DEADLINE` events or
  `/learner/classrooms` for `LIVE_SESSION` events.

### `MonthCalendarGrid` (new, exported from `src/components/ui.jsx`)
- Props: `{ viewMonth, selectedDate, eventsByDate, onSelectDate, onMonthChange }`.
- Header row: `<` / month+year label / `>` + a "Hôm nay" button,
  mirroring the `VisualRoadmapTimeline`/`AppHeader` control-button
  style already in the app.
- 7-column grid, weeks as rows (`Sun`-`Sat` header labels), days from
  adjacent months shown dimmed/non-interactive (for calendar-shape
  continuity) but not clickable.
- Each in-month day cell: day number, today gets a distinct outline
  (reuse the `.active`/accent-bar visual language from the nav-drawer
  work done earlier in this app), selected day gets the `--rail-soft`
  fill (same token already used for active nav items / badges).
  Up to 2 event chips (colored dot + truncated title) then a
  `+N` overflow label if more.
- `onMouseEnter`/`onMouseLeave` per day cell (only when it has ≥1
  event) drives a hover tooltip: `createPortal`'d to `document.body`,
  `position: fixed`, coordinates from `getBoundingClientRect()` —
  identical technique to the existing `VisualRoadmapTimeline.jsx`
  hover popover and the `ActionsMenu` dropdown added this session.
  Tooltip content: the day's events listed compactly (title +
  `statusLabel`, no click targets — hover is read-only preview).
- `onClick` on a day cell sets `selectedDate` (this is what drives the
  full detail panel described above) — distinct from hover, per the
  user's explicit "hover = quick peek, click = pins full detail"
  requirement.

## 5. Routing & Navigation

One page component, two route registrations — same trick
`LearnerDashboard` already uses for `/learner` and
`/my-learning-dashboard`:

- `App.jsx`: `<Route path="/learner/calendar" element={<LearnerCalendar basePath="/learner/courses" />} />`
  in the Learner routes block.
- `App.jsx`: `<Route path="/my-learning-calendar" element={<LearnerCalendar />} />`
  (default `basePath="/my-learning"`) near the other `/my-learning-*`
  routes.
- `PAGE_META`: add both paths with `title: 'Lịch Học Tập'` and a
  `crumb` matching each route's sibling entries.

`AppHeader.jsx` nav wiring:
- `LEARNER_SELF_NAV` (shared "Học tập của tôi" group, rendered for
  the 5 non-learner roles): new entry
  `{ to: '/my-learning-calendar', label: 'Lịch Học Tập', labelVi: 'Lịch Học Tập', labelEn: 'Learning Calendar', icon: 'ti-calendar-event' }`,
  inserted right after "Bảng Điều Khiển Học Tập".
- `ROLE_WORK_NAV.learner`: same entry shape pointing at
  `/learner/calendar`, inserted right after that list's own
  "Bảng Điều Khiển Học Tập" item.

## 6. Visual Design

- Reuses existing tokens exclusively: `Badge` tones (`sage`, `rust`,
  `blue`, `amber`, `slate`), `.card`/`.card-pad`, `--rail`/`--rail-soft`
  for the "selected" state, `--line`/`--line-strong` for grid borders,
  tabler icons (`ti-calendar-event`, `ti-chevron-left`,
  `ti-chevron-right`, `ti-circle-check`, `ti-clock`, `ti-chalkboard`).
- New CSS added to `src/styles/app.css`, scoped and kebab-cased
  consistent with this session's `.actions-menu-*` additions:
  `.cal-grid`, `.cal-weekday-row`, `.cal-cell`, `.cal-cell.today`,
  `.cal-cell.selected`, `.cal-cell.other-month`, `.cal-event-chip`,
  `.cal-day-tooltip`, `.cal-day-panel-row`.
- No new color palette — explicitly not the reference image's
  purple/pink/teal.

## 7. Interaction Summary

| Action | Result |
|---|---|
| Hover a day with events | Lightweight read-only tooltip listing that day's events (title + status), portal-positioned near the cell. No navigation, no state change. |
| Click a day | Sets it as `selectedDate` → the side/below panel re-renders with the full, clickable list for that day. |
| Click an event row in the panel | Navigates to the course detail page (`${basePath}/${courseId}`) for a deadline, or `/learner/classrooms` for a live session. |
| Prev/Next/Hôm nay | Changes `viewMonth`; `selectedDate` is left as-is unless it falls outside the new month, in which case it resets to the 1st of the newly shown month. |

## 8. Edge Cases

- Day with zero events: not hoverable (no tooltip), still clickable
  (shows the empty-state panel).
- Month with zero events anywhere: grid renders normally, panel shows
  the empty state for whatever day is selected.
- Many events same day: capped chip display in the cell (2 + "+N"),
  but the tooltip and the full panel always show everything —
  nothing is silently dropped from either of those two views.
- Enrollment references a courseId no longer in `courses`: skipped
  when building events (defensive, see §3).
- Self-enrolled elective with no `dueDate`, not yet started: still
  plots, anchored at its `lastActivityAt` (which equals the enroll
  date until the learner opens a lesson) — see §3's fallback chain.
  This means such a course's chip can appear to "not move" day to day
  since `lastActivityAt` only updates on real progress saves; that's
  expected, not a bug.

## 9. Verification Approach

No automated test suite exists in this project beyond a manual
verification script (`scripts/verify-role-level-model.jsx`). Manual
verification for this feature: start the dev server, drive a headless
browser (as done earlier this session) to confirm — nav entry appears
and links correctly for both a learner persona and a non-learner
persona (e.g. sysadmin), the month grid renders the current month
correctly, a day known to have a seeded event (e.g. `2026-08-28`,
`ilt-001`'s date) shows a chip, hovering it shows the tooltip, clicking
it populates the side panel, and clicking an event row navigates to
the right destination.
