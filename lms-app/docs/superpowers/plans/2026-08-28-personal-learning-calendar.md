# Personal Learning Calendar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Lịch Học Tập" (Learning Calendar) page, reachable by all 6 roles, that plots each person's own course deadlines and enrolled live/ILT sessions on a month grid, with a hover preview and a click-to-pin day-detail panel.

**Architecture:** Two new pure utility modules (date/grid math, event aggregation from existing `CourseStore` data) feed a new presentational `MonthCalendarGrid` component (added to the shared `src/components/ui.jsx`), which a new page (`src/pages/learner/LearnerCalendar.jsx`) wires together. The same page component is registered at two routes (`/learner/calendar` for the learner role's own nav, `/my-learning-calendar` for the other 5 roles' shared "Học tập của tôi" nav group) — the same trick already used for `LearnerDashboard`/`LearnerLearningPaths`.

**Tech Stack:** React 18 (function components, hooks), react-router-dom v6 (`HashRouter`), no CSS framework (hand-written `app.css` with CSS custom properties), no test runner — verification is a hand-written smoke-check script (`scripts/verify-role-level-model.jsx`, run via `npm run verify`, uses `react-dom/server`'s `renderToStaticMarkup` + string assertions) plus manual browser verification via a headless Chrome + CDP driver script (pattern established earlier in this project's history — see Task 4/5 verification steps for the exact commands).

**Spec:** `docs/superpowers/specs/2026-08-28-personal-learning-calendar-design.md`

## Global Constraints

- No new backend/data source — every event must trace to fields already in `CourseStore` (`myEnrollments`, `classrooms`). No new store actions, no new persisted state beyond the page's own `selectedDate`/`viewMonth` UI state.
- All dates are plain `'YYYY-MM-DD'` strings. Never use `new Date(isoString)` (string form) for date-grid math — it parses as UTC and can shift a day in some timezones. Only use the numeric constructor `new Date(year, monthIndex, day)`, and format back to `'YYYY-MM-DD'` via manual zero-padded string concatenation, never `.toISOString()`.
- Visuals reuse existing tokens exclusively (`Badge` tones `sage`/`rust`/`blue`/`amber`/`slate`, `.card`/`.card-pad`, `--rail`/`--rail-soft`, `--line`/`--line-strong`, tabler icons). No new color palette.
- Month view only for this plan — no week view, no drag-to-reschedule, no event creation/editing from the calendar.
- A course only ever produces one calendar event (never one for "assigned" + a separate one for "due"): completed → dated at `completedAt`; else has a `dueDate` → dated there; else (deadline-less elective) → dated at `lastActivityAt`.

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `src/utils/calendarDate.js` | Create | Pure date-string/month-grid arithmetic. No React, no store access. |
| `src/utils/calendarEvents.js` | Create | Pure aggregation: `CourseStore` data → `Map<'YYYY-MM-DD', CalendarEvent[]>`. No React, no store access. |
| `src/components/ui.jsx` | Modify | Add `MonthCalendarGrid`, a new shared presentational component (grid rendering, hover tooltip, click-to-select). |
| `src/styles/app.css` | Modify | Add `.cal-*` rules for the grid, cells, and hover tooltip. |
| `src/pages/learner/LearnerCalendar.jsx` | Create | The page: wires the store, the two utils, and `MonthCalendarGrid` together; renders the day-detail panel. |
| `src/App.jsx` | Modify | Import `LearnerCalendar`; register `/learner/calendar` and `/my-learning-calendar` routes; add both to `PAGE_META`. |
| `src/components/AppHeader.jsx` | Modify | Add the nav entry to `LEARNER_SELF_NAV` (shared, 5 roles) and to `ROLE_WORK_NAV.learner`. |
| `scripts/verify-role-level-model.jsx` | Modify | Append smoke-check sections for the new utils, component, page, and nav wiring (this file is the project's one existing regression harness — every prior feature's checks live here; new ones are appended, not split into a separate file). |

---

### Task 1: Date & month-grid utilities

**Files:**
- Create: `src/utils/calendarDate.js`
- Modify: `scripts/verify-role-level-model.jsx` (append new section at the end, before the final `console.log('\n' + (failures === 0 ...` summary line)

**Interfaces:**
- Produces (consumed by Task 3's `MonthCalendarGrid` and Task 4's `LearnerCalendar`):
  - `todayDateString(): string` — today as `'YYYY-MM-DD'` (local time).
  - `firstOfMonth(dateStr: string): string` — same year/month, day forced to `01`.
  - `addMonths(monthStr: string, delta: number): string` — `monthStr` shifted by `delta` months, rolling over years correctly. Input/output are always `'YYYY-MM-01'`.
  - `getMonthGridWeeks(monthStr: string): Array<Array<{date: string, inMonth: boolean}>>` — always exactly 6 weeks × 7 days = 42 cells, starting on Sunday, `inMonth` true only for days belonging to `monthStr`'s actual month.
  - `formatMonthLabel(monthStr: string, language: 'vi' | 'en'): string` — e.g. `'Tháng 8, 2026'` or `'August 2026'`.

- [ ] **Step 1: Write `src/utils/calendarDate.js`**

```js
// src/utils/calendarDate.js
//
// Ngày trong toàn bộ codebase là chuỗi 'YYYY-MM-DD' thuần (xem isoPlusDays()
// trong mockData.js) — các hàm ở đây tuyệt đối không dùng new Date(isoString)
// để tránh lỗi lệch múi giờ khi parse chuỗi ISO (JS coi 'YYYY-MM-DD' là UTC
// midnight; .getDate() ở múi giờ có offset âm có thể lùi 1 ngày). Chỉ dùng
// constructor số new Date(year, monthIndex, day) cho toán ngày, và luôn
// format ngược lại bằng ghép chuỗi thủ công, không dùng .toISOString().

function pad2(n) {
  return String(n).padStart(2, '0');
}

function parseDateString(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return { y, m, d }; // m là số tháng lịch (1-12), không phải zero-indexed
}

function formatDateString(y, m, d) {
  return `${y}-${pad2(m)}-${pad2(d)}`;
}

export function todayDateString() {
  const now = new Date();
  return formatDateString(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

export function firstOfMonth(dateStr) {
  const { y, m } = parseDateString(dateStr);
  return formatDateString(y, m, 1);
}

export function addMonths(monthStr, delta) {
  const { y, m } = parseDateString(monthStr);
  const target = new Date(y, m - 1 + delta, 1);
  return formatDateString(target.getFullYear(), target.getMonth() + 1, 1);
}

export function getMonthGridWeeks(monthStr) {
  const { y, m } = parseDateString(monthStr);
  const startWeekday = new Date(y, m - 1, 1).getDay(); // 0 = Sunday
  const gridStart = new Date(y, m - 1, 1 - startWeekday);

  const weeks = [];
  for (let week = 0; week < 6; week += 1) {
    const days = [];
    for (let dayIdx = 0; dayIdx < 7; dayIdx += 1) {
      const cellDate = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + week * 7 + dayIdx);
      days.push({
        date: formatDateString(cellDate.getFullYear(), cellDate.getMonth() + 1, cellDate.getDate()),
        inMonth: cellDate.getFullYear() === y && cellDate.getMonth() === m - 1,
      });
    }
    weeks.push(days);
  }
  return weeks;
}

const MONTH_LABELS_VI = ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'];
const MONTH_LABELS_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export function formatMonthLabel(monthStr, language) {
  const { y, m } = parseDateString(monthStr);
  if (language === 'en') return `${MONTH_LABELS_EN[m - 1]} ${y}`;
  return `${MONTH_LABELS_VI[m - 1]}, ${y}`;
}
```

- [ ] **Step 2: Append verification checks to `scripts/verify-role-level-model.jsx`**

Open the file and find the final two lines:
```js
console.log('\n' + (failures === 0 ? 'SMOKE PASSED' : failures + ' SMOKE FAILURE(S)'));
process.exit(failures === 0 ? 0 : 1);
```
Insert the following block **immediately before** those two lines:

```js
// ---------------------------------------------------------------------------
console.log('\n=== Section 22: Personal Learning Calendar — date math ===');
{
  const { todayDateString, firstOfMonth, addMonths, getMonthGridWeeks, formatMonthLabel } = await import('../src/utils/calendarDate');

  check('todayDateString returns YYYY-MM-DD', /^\d{4}-\d{2}-\d{2}$/.test(todayDateString()), todayDateString());
  check('firstOfMonth normalizes to day 01', firstOfMonth('2026-08-15') === '2026-08-01');
  check('addMonths forward within a year', addMonths('2026-08-01', 1) === '2026-09-01');
  check('addMonths rolls over year forward', addMonths('2026-12-01', 1) === '2027-01-01');
  check('addMonths rolls over year backward', addMonths('2026-01-01', -1) === '2025-12-01');

  const augWeeks = getMonthGridWeeks('2026-08-01');
  check('grid has 6 weeks', augWeeks.length === 6, String(augWeeks.length));
  check('every week has 7 days', augWeeks.every((w) => w.length === 7));
  const flatDays = augWeeks.flat();
  check('42 total cells', flatDays.length === 42, String(flatDays.length));

  let sequential = true;
  for (let i = 1; i < flatDays.length; i += 1) {
    const [py, pm, pd] = flatDays[i - 1].date.split('-').map(Number);
    const [cy, cm, cd] = flatDays[i].date.split('-').map(Number);
    const prev = new Date(py, pm - 1, pd);
    const cur = new Date(cy, cm - 1, cd);
    if (cur - prev !== 86400000) { sequential = false; break; }
  }
  check('grid dates are consecutive days', sequential);

  const inMonthCount = flatDays.filter((d) => d.inMonth).length;
  check('August 2026 has 31 in-month cells', inMonthCount === 31, String(inMonthCount));
  check('August 1st 2026 is flagged inMonth', flatDays.find((d) => d.date === '2026-08-01')?.inMonth === true);

  check('formatMonthLabel vi', formatMonthLabel('2026-08-01', 'vi') === 'Tháng 8, 2026', formatMonthLabel('2026-08-01', 'vi'));
  check('formatMonthLabel en', formatMonthLabel('2026-08-01', 'en') === 'August 2026', formatMonthLabel('2026-08-01', 'en'));
}
```

- [ ] **Step 3: Run the verify script and confirm no failures**

Run: `npm run verify`
Expected: the new "Section 22" lines all print `ok    ...`, and the final line still reads `SMOKE PASSED` (or, if there were pre-existing unrelated failures, the failure count did not increase). If any `FAIL` line appears under Section 22, fix `calendarDate.js` before proceeding — do not edit the check to make it pass.

- [ ] **Step 4: Commit**

```bash
git add src/utils/calendarDate.js scripts/verify-role-level-model.jsx
git commit -m "feat: add calendar date/month-grid utilities for the learning calendar"
```

---

### Task 2: Calendar event aggregation

**Files:**
- Create: `src/utils/calendarEvents.js`
- Modify: `scripts/verify-role-level-model.jsx` (append Section 23, same insertion point as before — immediately before the final summary/`process.exit` lines)

**Interfaces:**
- Consumes: nothing from Task 1 (fully independent pure module).
- Produces (consumed by Task 4's `LearnerCalendar`):
  - `buildCalendarEvents({ courses, myEnrollments, classrooms }): Map<string, CalendarEvent[]>` where `CalendarEvent` is:
    ```
    {
      id: string,            // `deadline-${courseId}` | `session-${sessionId}`
      date: string,           // 'YYYY-MM-DD'
      kind: 'DEADLINE' | 'LIVE_SESSION',
      title: string,
      subtitle: string,
      statusLabel: string,
      tone: 'sage' | 'rust' | 'blue' | 'amber' | 'slate',
      courseId?: string,      // present when kind === 'DEADLINE'
      sessionId?: string,     // present when kind === 'LIVE_SESSION'
    }
    ```

- [ ] **Step 1: Write `src/utils/calendarEvents.js`**

```js
// src/utils/calendarEvents.js
//
// Gom sự kiện lịch học cá nhân từ 2 nguồn dữ liệu đã có sẵn trong CourseStore:
// (a) myEnrollments — hạn hoàn thành khóa e-learning đang/đã tham gia hoặc
//     được assign; (b) classrooms — buổi học trực tiếp/ILT đã ghi danh
//     (đúng filter "My Sessions" mà LearnerClassrooms.jsx đã dùng: isEnrolled).
// Mỗi khóa chỉ tạo ĐÚNG 1 sự kiện (không lặp giữa ngày assign/due/complete) —
// xem quy tắc chọn ngày trong buildDeadlineEvents().

const DEADLINE_TONE_BY_STATUS = {
  COMPLETED: 'sage',
  OVERDUE: 'rust',
  FAILED: 'rust',
  IN_PROGRESS: 'blue',
  NOT_STARTED: 'slate',
};

const DEADLINE_STATUS_LABEL = {
  COMPLETED: 'Đã Hoàn Thành',
  OVERDUE: 'Quá Hạn',
  FAILED: 'Cần Thi Lại',
  IN_PROGRESS: 'Đang Học',
  NOT_STARTED: 'Chưa Bắt Đầu',
};

function buildDeadlineEvents(courses, myEnrollments) {
  const events = [];
  for (const courseId of Object.keys(myEnrollments)) {
    const enrollment = myEnrollments[courseId];
    const course = courses.find((c) => c.id === courseId);
    // Bảo vệ: bỏ qua nếu enrollment trỏ tới 1 courseId không còn tồn tại
    // trong catalog (dữ liệu mock có thể lệch), không được crash cả trang.
    if (!course) continue;

    // Khóa đã xong -> gắn đúng ngày hoàn thành thật (lịch thành nhật ký học
    // tập). Khóa còn hạn -> gắn ngày hạn (nhắc việc). Khóa tự chọn học không
    // có hạn (enrollCourse() gán dueDate: null cho elective) -> gắn vào lần
    // hoạt động gần nhất (lastActivityAt luôn có giá trị ngay từ lúc ghi danh
    // và được cập nhật mỗi lần lưu tiến độ), để không bị biến mất khỏi lịch.
    const date = enrollment.completedAt || enrollment.dueDate || enrollment.lastActivityAt;
    if (!date) continue;

    const tone = DEADLINE_TONE_BY_STATUS[enrollment.status] || 'slate';
    const statusLabel = DEADLINE_STATUS_LABEL[enrollment.status] || DEADLINE_STATUS_LABEL.NOT_STARTED;

    events.push({
      id: `deadline-${courseId}`,
      date,
      kind: 'DEADLINE',
      title: course.title,
      subtitle: enrollment.status === 'COMPLETED' ? 'Đã hoàn thành' : 'Hạn hoàn thành',
      statusLabel,
      tone,
      courseId,
    });
  }
  return events;
}

const SESSION_TONE_BY_ATTENDANCE = {
  CHECKED_IN: 'sage',
  ABSENT: 'rust',
};

const SESSION_STATUS_LABEL = {
  CHECKED_IN: 'Đã Điểm Danh',
  ABSENT: 'Vắng Mặt',
};

function buildLiveSessionEvents(classrooms) {
  const events = [];
  for (const session of classrooms) {
    if (!session.isEnrolled) continue;

    const tone = SESSION_TONE_BY_ATTENDANCE[session.attendanceStatus] || 'blue';
    const statusLabel = SESSION_STATUS_LABEL[session.attendanceStatus] || 'Sắp Diễn Ra';

    events.push({
      id: `session-${session.id}`,
      date: session.date,
      kind: 'LIVE_SESSION',
      title: session.title,
      subtitle: `${session.time} · ${session.venue}`,
      statusLabel,
      tone,
      sessionId: session.id,
    });
  }
  return events;
}

export function buildCalendarEvents({ courses, myEnrollments, classrooms }) {
  const allEvents = [
    ...buildDeadlineEvents(courses || [], myEnrollments || {}),
    ...buildLiveSessionEvents(classrooms || []),
  ];

  const byDate = new Map();
  for (const event of allEvents) {
    if (!byDate.has(event.date)) byDate.set(event.date, []);
    byDate.get(event.date).push(event);
  }
  return byDate;
}
```

- [ ] **Step 2: Append verification checks to `scripts/verify-role-level-model.jsx`**

Same insertion point as Task 1 (immediately before the final summary/`process.exit` lines — so this new block ends up directly after the Section 22 block you just added):

```js
// ---------------------------------------------------------------------------
console.log('\n=== Section 23: Personal Learning Calendar — event aggregation ===');
{
  const { buildCalendarEvents } = await import('../src/utils/calendarEvents');

  const fixtureCourses = [
    { id: 'CRS-TEST-001', title: 'Completed Course' },
    { id: 'CRS-TEST-002', title: 'Overdue Course' },
    { id: 'CRS-TEST-003', title: 'Elective No Deadline' },
  ];
  const fixtureEnrollments = {
    'CRS-TEST-001': { status: 'COMPLETED', completedAt: '2026-08-10', dueDate: '2026-08-30', lastActivityAt: '2026-08-10' },
    'CRS-TEST-002': { status: 'OVERDUE', completedAt: null, dueDate: '2026-08-15', lastActivityAt: '2026-08-05' },
    'CRS-TEST-003': { status: 'NOT_STARTED', completedAt: null, dueDate: null, lastActivityAt: '2026-08-20' },
    'CRS-TEST-MISSING': { status: 'IN_PROGRESS', completedAt: null, dueDate: '2026-08-22', lastActivityAt: '2026-08-01' },
  };
  const fixtureClassrooms = [
    { id: 'ilt-fixture-1', title: 'Fixture Session', date: '2026-08-15', time: '09:00', venue: 'Room A', isEnrolled: true, attendanceStatus: 'PENDING_CHECKIN' },
    { id: 'ilt-fixture-2', title: 'Not My Session', date: '2026-08-16', time: '09:00', venue: 'Room B', isEnrolled: false, attendanceStatus: 'NOT_REGISTERED' },
  ];

  const evMap = buildCalendarEvents({ courses: fixtureCourses, myEnrollments: fixtureEnrollments, classrooms: fixtureClassrooms });
  const allFixtureEvents = Array.from(evMap.values()).flat();

  check('completed course dated at completedAt, not dueDate',
    (evMap.get('2026-08-10') || []).some((e) => e.courseId === 'CRS-TEST-001'));
  check('completed-course tone is sage',
    (evMap.get('2026-08-10') || []).find((e) => e.courseId === 'CRS-TEST-001')?.tone === 'sage');
  check('overdue course dated at dueDate, tone rust',
    (evMap.get('2026-08-15') || []).some((e) => e.courseId === 'CRS-TEST-002' && e.tone === 'rust'));
  check('elective with no dueDate falls back to lastActivityAt',
    (evMap.get('2026-08-20') || []).some((e) => e.courseId === 'CRS-TEST-003'));
  check('enrollment referencing a missing course is skipped, no crash',
    !allFixtureEvents.some((e) => e.courseId === 'CRS-TEST-MISSING'));
  check('enrolled live session appears on its date',
    (evMap.get('2026-08-15') || []).some((e) => e.sessionId === 'ilt-fixture-1'));
  check('non-enrolled live session is excluded',
    !allFixtureEvents.some((e) => e.sessionId === 'ilt-fixture-2'));

  // Real seed-data smoke check — Minh Tran's actual default enrollments +
  // classroom sessions must build without throwing, using the exact same
  // enrollmentsForUser() helper CourseStore.jsx uses.
  const minhEnrollments = mock.enrollmentsForUser(mock.currentUser);
  const realMap = buildCalendarEvents({ courses: mock.courses, myEnrollments: minhEnrollments, classrooms: mock.classroomSessions });
  const allRealEvents = Array.from(realMap.values()).flat();
  check('real seed data builds without throwing and produces at least 1 event', allRealEvents.length > 0, String(allRealEvents.length));
  check('ilt-001 (Minh Tran enrolled live session, 2026-08-28) appears on its date',
    (realMap.get('2026-08-28') || []).some((e) => e.sessionId === 'ilt-001'));
}
```

- [ ] **Step 3: Run the verify script and confirm no failures**

Run: `npm run verify`
Expected: all Section 23 lines print `ok    ...`, final summary still `SMOKE PASSED`.

- [ ] **Step 4: Commit**

```bash
git add src/utils/calendarEvents.js scripts/verify-role-level-model.jsx
git commit -m "feat: add calendar event aggregation from enrollments and classroom sessions"
```

---

### Task 3: `MonthCalendarGrid` component

**Files:**
- Modify: `src/components/ui.jsx` (insert new component before `export function CourseTypeBadge`)
- Modify: `src/styles/app.css` (insert new `.cal-*` rules after the `.actions-menu-item i, .actions-menu-item .ti {...}` line, before the `/* ---------- Progress ---------- */` comment)
- Modify: `scripts/verify-role-level-model.jsx` (append Section 24)

**Interfaces:**
- Consumes: `todayDateString`, `addMonths`, `firstOfMonth`, `getMonthGridWeeks`, `formatMonthLabel` from `../utils/calendarDate` (Task 1); `Badge`, `Button` already exported in this same file.
- Produces (consumed by Task 4's `LearnerCalendar`):
  ```
  <MonthCalendarGrid
    viewMonth={string}          // 'YYYY-MM-01'
    selectedDate={string}       // 'YYYY-MM-DD'
    eventsByDate={Map}          // from buildCalendarEvents()
    onSelectDate={(date: string) => void}
    onMonthChange={(nextMonth: string) => void}
    language={'vi' | 'en'}      // optional, defaults to 'vi'
  />
  ```

- [ ] **Step 1: Add the `calendarDate` import to `src/components/ui.jsx`**

`ui.jsx` currently starts with:
```js
import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { levelDefinition, ACCESS_STATE } from '../data/levelSystem';
```
Add one more import line right after it:
```js
import { todayDateString, addMonths, firstOfMonth, getMonthGridWeeks, formatMonthLabel } from '../utils/calendarDate';
```
(`useState`, `useRef`/`useEffect`, and `createPortal` are already imported here from the `ActionsMenu` component added earlier — no changes needed to that line.)

- [ ] **Step 2: Insert the `MonthCalendarGrid` component**

Find `export function CourseTypeBadge({ courseType }) {` in `ui.jsx` and insert the following **immediately before** it:

```jsx
/**
 * Lịch dạng lưới tháng dùng cho Lịch Học Tập cá nhân (mọi role). Hover 1 ô
 * ngày có sự kiện hiện tooltip xem nhanh (chỉ đọc, không click được); bấm
 * vào ô ngày mới thực sự chọn ngày đó (điều khiển bởi component cha qua
 * onSelectDate) để hiện panel chi tiết đầy đủ. Tooltip portal ra
 * document.body giống ActionsMenu ở trên, để không bị cắt bởi container cha
 * có overflow.
 */
export function MonthCalendarGrid({ viewMonth, selectedDate, eventsByDate, onSelectDate, onMonthChange, language = 'vi' }) {
  const [hoverCell, setHoverCell] = useState(null); // { date, top, left } | null

  const weeks = getMonthGridWeeks(viewMonth);
  const weekdayLabels = language === 'en'
    ? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    : ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
  const today = todayDateString();

  function handleMouseEnter(date, evt) {
    if (!(eventsByDate.get(date) || []).length) return;
    const rect = evt.currentTarget.getBoundingClientRect();
    setHoverCell({ date, top: rect.bottom + 4, left: rect.left });
  }

  function handleMouseLeave() {
    setHoverCell(null);
  }

  return (
    <div className="card card-pad cal-grid-card">
      <div className="cal-grid-header">
        <button type="button" className="icon-btn" onClick={() => onMonthChange(addMonths(viewMonth, -1))} aria-label="Previous month">
          <i className="ti ti-chevron-left" aria-hidden="true" />
        </button>
        <div className="cal-grid-month-label">{formatMonthLabel(viewMonth, language)}</div>
        <button type="button" className="icon-btn" onClick={() => onMonthChange(addMonths(viewMonth, 1))} aria-label="Next month">
          <i className="ti ti-chevron-right" aria-hidden="true" />
        </button>
        <Button size="sm" variant="outline" onClick={() => onMonthChange(firstOfMonth(today))}>
          {language === 'en' ? 'Today' : 'Hôm nay'}
        </Button>
      </div>

      <div className="cal-weekday-row">
        {weekdayLabels.map((wd) => <div key={wd} className="cal-weekday-cell">{wd}</div>)}
      </div>

      {weeks.map((week, weekIdx) => (
        <div className="cal-week-row" key={weekIdx}>
          {week.map((cell) => {
            const dayEvents = eventsByDate.get(cell.date) || [];
            const visibleEvents = dayEvents.slice(0, 2);
            const overflowCount = dayEvents.length - visibleEvents.length;
            const cellClasses = ['cal-cell'];
            if (!cell.inMonth) cellClasses.push('other-month');
            if (cell.date === today) cellClasses.push('today');
            if (cell.date === selectedDate) cellClasses.push('selected');

            return (
              <div
                key={cell.date}
                className={cellClasses.join(' ')}
                onClick={() => cell.inMonth && onSelectDate(cell.date)}
                onMouseEnter={(e) => cell.inMonth && handleMouseEnter(cell.date, e)}
                onMouseLeave={handleMouseLeave}
              >
                <div className="cal-cell-daynum">{Number(cell.date.slice(8, 10))}</div>
                {visibleEvents.map((ev) => (
                  <div key={ev.id} className="cal-event-chip"><Badge tone={ev.tone} size="sm">{ev.title}</Badge></div>
                ))}
                {overflowCount > 0 && <div className="cal-event-chip-overflow">+{overflowCount}</div>}
              </div>
            );
          })}
        </div>
      ))}

      {hoverCell && createPortal(
        <div className="cal-day-tooltip" style={{ top: hoverCell.top, left: hoverCell.left }}>
          {(eventsByDate.get(hoverCell.date) || []).map((ev) => (
            <div key={ev.id} className="cal-day-tooltip-row">
              <span className="cal-day-tooltip-title">{ev.title}</span>
              <Badge tone={ev.tone} size="sm">{ev.statusLabel}</Badge>
            </div>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
}
```

- [ ] **Step 3: Add CSS rules to `src/styles/app.css`**

Find this line (end of the Actions Menu section added earlier this project):
```css
.actions-menu-item i, .actions-menu-item .ti { font-size: 15px; width: 16px; text-align: center; flex-shrink: 0; }
```
Insert the following **immediately after** it (before the `/* ---------- Progress ---------- */` comment):

```css

/* ---------- Personal Learning Calendar (Month Grid) ---------- */
.cal-grid-card { display: flex; flex-direction: column; gap: 8px; }
.cal-grid-header { display: flex; align-items: center; gap: 8px; margin-bottom: 2px; }
.cal-grid-month-label { flex: 1; text-align: center; font-weight: 700; font-size: 14px; color: var(--ink); }
.cal-weekday-row, .cal-week-row { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; }
.cal-weekday-cell { text-align: center; font-size: 11px; font-weight: 700; color: var(--ink-faint); text-transform: uppercase; padding: 4px 0; }
.cal-cell {
  min-height: 78px;
  border: 1px solid var(--line);
  border-radius: var(--radius-sm);
  padding: 4px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  cursor: pointer;
  transition: background 120ms var(--ease), border-color 120ms var(--ease);
}
.cal-cell:hover { background: var(--paper-sunken); }
.cal-cell.other-month { opacity: 0.4; cursor: default; pointer-events: none; }
.cal-cell.today { border-color: var(--rail); border-width: 1.5px; }
.cal-cell.selected { background: var(--rail-soft); border-color: var(--rail); }
.cal-cell-daynum { font-size: 12px; font-weight: 700; color: var(--ink-soft); }
.cal-event-chip { max-width: 100%; overflow: hidden; }
.cal-event-chip .badge { max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; display: block; }
.cal-event-chip-overflow { font-size: 10.5px; color: var(--ink-faint); font-weight: 700; padding: 0 2px; }
.cal-day-tooltip {
  position: fixed;
  min-width: 200px;
  max-width: 280px;
  background: var(--paper-raised);
  border: 1px solid var(--line-strong);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-modal);
  padding: 8px;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  gap: 6px;
  pointer-events: none;
  animation: fadeIn 0.12s ease;
}
.cal-day-tooltip-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; font-size: 12px; }
.cal-day-tooltip-title { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; color: var(--ink); }
.cal-day-panel-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--line);
  cursor: pointer;
  transition: background 120ms var(--ease);
}
.cal-day-panel-row:hover { background: var(--paper-sunken); }
.cal-day-panel-row i { font-size: 18px; color: var(--ink-soft); flex-shrink: 0; }
```

(`.cal-day-panel-row` is used by Task 4's `LearnerCalendar` page, not by this component — added here so all calendar CSS lives in one place.)

- [ ] **Step 4: Append a standalone render check to `scripts/verify-role-level-model.jsx`**

Same insertion point as before (immediately before the final summary/`process.exit` lines, i.e. directly after the Section 23 block from Task 2):

```js
// ---------------------------------------------------------------------------
console.log('\n=== Section 24: MonthCalendarGrid — standalone render ===');
{
  const { MonthCalendarGrid } = await import('../src/components/ui');

  const fixtureEventsByDate = new Map([
    ['2026-08-15', [
      { id: 'deadline-CRS-X', date: '2026-08-15', kind: 'DEADLINE', title: 'Sample Course Title', subtitle: 'Hạn hoàn thành', statusLabel: 'Đang Học', tone: 'blue', courseId: 'CRS-X' },
    ]],
  ]);

  const gridHtml = render(
    'MonthCalendarGrid renders August 2026 with a fixture event chip',
    <MonthCalendarGrid
      viewMonth="2026-08-01"
      selectedDate="2026-08-15"
      eventsByDate={fixtureEventsByDate}
      onSelectDate={() => {}}
      onMonthChange={() => {}}
      language="vi"
    />,
    '/x', '/x'
  );
  check('MonthCalendarGrid output contains the month label', Boolean(gridHtml && gridHtml.includes('Tháng 8, 2026')));
  check('MonthCalendarGrid output contains the fixture event chip title', Boolean(gridHtml && gridHtml.includes('Sample Course Title')));
  check('MonthCalendarGrid marks the selected day', Boolean(gridHtml && gridHtml.includes('selected')));
  check('MonthCalendarGrid renders 42 day cells', Boolean(gridHtml && (gridHtml.match(/cal-cell-daynum/g) || []).length === 42));
}
```

- [ ] **Step 5: Run the verify script and confirm no failures**

Run: `npm run verify`
Expected: all Section 24 lines print `ok    ...`, final summary still `SMOKE PASSED`.

- [ ] **Step 6: Commit**

```bash
git add src/components/ui.jsx src/styles/app.css scripts/verify-role-level-model.jsx
git commit -m "feat: add MonthCalendarGrid component with hover preview and day selection"
```

---

### Task 4: `LearnerCalendar` page and routing

**Files:**
- Create: `src/pages/learner/LearnerCalendar.jsx`
- Modify: `src/App.jsx:12-19` (add import in the Learner imports block), `src/App.jsx:57-62` (add `PAGE_META` entries), `src/App.jsx:171-193` (add the two routes)
- Modify: `scripts/verify-role-level-model.jsx` (append Section 25)

**Interfaces:**
- Consumes: `buildCalendarEvents` (Task 2), `MonthCalendarGrid`, `Badge` (Task 3, from `ui.jsx`), `todayDateString`, `firstOfMonth` (Task 1), `useCourseStore()` (existing — exposes `courses`, `myEnrollments`, `classrooms`, `language`).
- Produces: default-exported `LearnerCalendar` component with prop `{ basePath = '/my-learning' }`, registered at `/learner/calendar` (with `basePath="/learner/courses"`) and `/my-learning-calendar` (default `basePath`).

- [ ] **Step 1: Write `src/pages/learner/LearnerCalendar.jsx`**

```jsx
import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge, MonthCalendarGrid } from '../../components/ui';
import { useCourseStore } from '../../state/CourseStore';
import { buildCalendarEvents } from '../../utils/calendarEvents';
import { firstOfMonth, todayDateString } from '../../utils/calendarDate';

export default function LearnerCalendar({ basePath = '/my-learning' }) {
  const navigate = useNavigate();
  const { courses, myEnrollments, classrooms, language } = useCourseStore();
  const today = todayDateString();
  const [viewMonth, setViewMonth] = useState(() => firstOfMonth(today));
  const [selectedDate, setSelectedDate] = useState(today);

  const eventsByDate = useMemo(
    () => buildCalendarEvents({ courses, myEnrollments, classrooms }),
    [courses, myEnrollments, classrooms]
  );

  const monthEventCount = useMemo(() => {
    let count = 0;
    for (const [date, events] of eventsByDate) {
      if (date.slice(0, 7) === viewMonth.slice(0, 7)) count += events.length;
    }
    return count;
  }, [eventsByDate, viewMonth]);

  function handleMonthChange(nextMonth) {
    setViewMonth(nextMonth);
    if (selectedDate.slice(0, 7) !== nextMonth.slice(0, 7)) {
      setSelectedDate(nextMonth);
    }
  }

  function handleEventClick(event) {
    if (event.kind === 'DEADLINE') {
      navigate(`${basePath}/${event.courseId}`);
    } else {
      navigate('/learner/classrooms');
    }
  }

  const selectedEvents = eventsByDate.get(selectedDate) || [];

  return (
    <>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <h1>Lịch Học Tập</h1>
          <Badge tone="rail" icon="ti-calendar-event">{monthEventCount} sự kiện tháng này</Badge>
        </div>
        <p style={{ margin: 0 }}>Theo dõi hạn hoàn thành khóa học và các buổi học trực tiếp bạn đã đăng ký.</p>
      </div>

      <div className="grid grid-2" style={{ alignItems: 'flex-start' }}>
        <MonthCalendarGrid
          viewMonth={viewMonth}
          selectedDate={selectedDate}
          eventsByDate={eventsByDate}
          onSelectDate={setSelectedDate}
          onMonthChange={handleMonthChange}
          language={language}
        />

        <div className="card card-pad">
          <div className="section-label" style={{ margin: '0 0 10px' }}>{selectedDate}</div>
          {selectedEvents.length === 0 ? (
            <div className="empty-state">
              <i className="ti ti-calendar-off" aria-hidden="true" />
              <p>Không có khóa học nào vào ngày này.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {selectedEvents.map((event) => (
                <div key={event.id} className="cal-day-panel-row" onClick={() => handleEventClick(event)}>
                  <i className={`ti ${event.kind === 'LIVE_SESSION' ? 'ti-chalkboard' : 'ti-book-2'}`} aria-hidden="true" />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>{event.title}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--ink-soft)' }}>{event.subtitle}</div>
                  </div>
                  <Badge tone={event.tone}>{event.statusLabel}</Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 2: Register the routes and `PAGE_META` in `src/App.jsx`**

Add the import — find:
```js
import AiLearningHub from './pages/learner/AiLearningHub';
```
Add immediately after it:
```js
import LearnerCalendar from './pages/learner/LearnerCalendar';
```

Add `PAGE_META` entries — find:
```js
  '/learner/catalog': { title: 'Danh Mục Toàn Bộ Khóa Học (Chỉ Xem & Tham Gia Học)', crumb: 'Learner (Store & HO)' },

  '/my-learning': { title: 'Cổng Học Tập Cá Nhân — Mọi Role Đều Là Learner', crumb: 'Học tập của tôi' },
```
Change to:
```js
  '/learner/catalog': { title: 'Danh Mục Toàn Bộ Khóa Học (Chỉ Xem & Tham Gia Học)', crumb: 'Learner (Store & HO)' },
  '/learner/calendar': { title: 'Lịch Học Tập Cá Nhân', crumb: 'Learner (Store & HO)' },

  '/my-learning': { title: 'Cổng Học Tập Cá Nhân — Mọi Role Đều Là Learner', crumb: 'Học tập của tôi' },
  '/my-learning-calendar': { title: 'Lịch Học Tập Cá Nhân — Mọi Role', crumb: 'Học tập của tôi' },
```

Add the routes — find:
```js
              <Route path="/learner/catalog" element={<AdminCourses />} />

              {/* Cổng học tập cá nhân dùng chung cho cả 6 role */}
              <Route path="/my-learning" element={<MyLearning />} />
```
Change to:
```js
              <Route path="/learner/catalog" element={<AdminCourses />} />
              <Route path="/learner/calendar" element={<LearnerCalendar basePath="/learner/courses" />} />

              {/* Cổng học tập cá nhân dùng chung cho cả 6 role */}
              <Route path="/my-learning" element={<MyLearning />} />
```

And find:
```js
              <Route path="/my-learning-path" element={<LearnerLearningPaths />} />
              <Route path="/my-certificates" element={<MyCertificates />} />
```
Change to:
```js
              <Route path="/my-learning-path" element={<LearnerLearningPaths />} />
              <Route path="/my-learning-calendar" element={<LearnerCalendar />} />
              <Route path="/my-certificates" element={<MyCertificates />} />
```

- [ ] **Step 3: Append render-smoke checks to `scripts/verify-role-level-model.jsx`**

Same insertion point (before the final summary/`process.exit` lines):

```js
// ---------------------------------------------------------------------------
console.log('\n=== Section 25: LearnerCalendar page renders at both routes ===');
{
  const LearnerCalendar = (await import('../src/pages/learner/LearnerCalendar')).default;
  actAs('learner');

  const learnerRouteHtml = render(
    'LearnerCalendar renders at /learner/calendar',
    <LearnerCalendar basePath="/learner/courses" />,
    '/learner/calendar', '/learner/calendar'
  );
  check('LearnerCalendar (/learner/calendar) renders the page title', Boolean(learnerRouteHtml && learnerRouteHtml.includes('Lịch Học Tập')));
  check('LearnerCalendar (/learner/calendar) renders the month grid', Boolean(learnerRouteHtml && learnerRouteHtml.includes('cal-grid-card')));

  const sharedRouteHtml = render(
    'LearnerCalendar renders at /my-learning-calendar',
    <LearnerCalendar />,
    '/my-learning-calendar', '/my-learning-calendar'
  );
  check('LearnerCalendar (/my-learning-calendar) renders without crashing', Boolean(sharedRouteHtml));
}
```

- [ ] **Step 4: Run the verify script and confirm no failures**

Run: `npm run verify`
Expected: all Section 25 lines print `ok    ...`, final summary still `SMOKE PASSED`.

- [ ] **Step 5: Manual browser verification (interactive behavior the static-render check above cannot cover: hover tooltip, click-to-select, click-to-navigate)**

This project has no browser automation dependency installed (no Playwright/Puppeteer). Drive a locally-installed Chrome directly over the Chrome DevTools Protocol (CDP) via a small Node script — this is the same technique already proven to work in this environment.

Start the dev server:
```bash
npm run dev -- --port 5199 --strictPort
```

In a separate step, launch headless Chrome with remote debugging and no prior profile (a fresh `--user-data-dir` avoids stale `localStorage` from earlier manual sessions overriding the default demo persona):
```bash
"/c/Program Files/Google/Chrome/Application/chrome.exe" --headless --disable-gpu --remote-debugging-port=9500 --window-size=1300,950 --user-data-dir="/tmp/chrome-cal-verify" "about:blank"
```

Write a driver script (e.g. `/tmp/verify-calendar.mjs`) that, over the CDP WebSocket at `http://localhost:9500`:
1. Navigates to `http://localhost:5199/#/learner/calendar` (this app is a `HashRouter` — the route must appear after `#`, a plain `/learner/calendar` path will not match and falls back to the role's home route).
2. Waits ~2s for React to render, then screenshots (`Page.captureScreenshot`) to confirm the month grid renders and (navigate to `2026-08-01` view via the "Hôm nay"/prev-next controls if the current real date isn't already August 2026) the `2026-08-28` cell shows an event chip (Minh Tran's seeded `ilt-001` classroom session).
3. Uses `Runtime.evaluate` to find the DOM cell for `2026-08-28` (e.g. by locating the `.cal-cell` whose `.cal-cell-daynum` text is `28` within the correct week), and `Input.dispatchMouseEvent` with `type: 'mouseMoved'` at its center — then screenshot again and confirm a `.cal-day-tooltip` element is present in the DOM with text `Fixture Session`-equivalent (the real seeded session title, e.g. "Store Practical Lab: Food Safety Standards & Commercial Bakery Deck Operations").
4. Dispatches `mousePressed`/`mouseReleased` (a click) on that same cell, screenshots, and confirms the day-detail panel on the right now shows that session's row with its status badge.
5. Clicks that panel row (again via `Input.dispatchMouseEvent`) and confirms (via `Runtime.evaluate` reading `location.hash`) the URL changed to `/learner/classrooms`.

Expected: every step above matches — grid renders, hover tooltip appears with the right content, click selects the day and populates the panel, clicking the panel row navigates to `/learner/classrooms`.

Clean up afterward: stop the dev server and the headless Chrome process; do not leave them running.

- [ ] **Step 6: Commit**

```bash
git add src/pages/learner/LearnerCalendar.jsx src/App.jsx scripts/verify-role-level-model.jsx
git commit -m "feat: add LearnerCalendar page, routed at /learner/calendar and /my-learning-calendar"
```

---

### Task 5: Navigation wiring for all 6 roles

**Files:**
- Modify: `src/components/AppHeader.jsx:10-16` (`LEARNER_SELF_NAV`), `src/components/AppHeader.jsx:20-30` (`ROLE_WORK_NAV.learner`)
- Modify: `scripts/verify-role-level-model.jsx` (append Section 26)

**Interfaces:**
- Consumes: nothing new (pure data array edits in an existing file).
- Produces: nothing consumed by later tasks — this is the final task.

- [ ] **Step 1: Add the entry to `LEARNER_SELF_NAV`**

Find:
```js
const LEARNER_SELF_NAV = [
  { to: '/my-learning', label: 'Khóa Học Của Tôi', labelVi: 'Khóa Học Của Tôi', labelEn: 'My Courses', icon: 'ti-book-2' },
  { to: '/my-learning-dashboard', label: 'Bảng Điều Khiển Học Tập', labelVi: 'Bảng Điều Khiển Học Tập', labelEn: 'Learning Dashboard', icon: 'ti-layout-dashboard' },
  { to: '/my-learning-path', label: 'Lộ Trình Học Tập', labelVi: 'Lộ Trình Học Tập', labelEn: 'Learning Roadmap', icon: 'ti-git-branch' },
```
Change to:
```js
const LEARNER_SELF_NAV = [
  { to: '/my-learning', label: 'Khóa Học Của Tôi', labelVi: 'Khóa Học Của Tôi', labelEn: 'My Courses', icon: 'ti-book-2' },
  { to: '/my-learning-dashboard', label: 'Bảng Điều Khiển Học Tập', labelVi: 'Bảng Điều Khiển Học Tập', labelEn: 'Learning Dashboard', icon: 'ti-layout-dashboard' },
  { to: '/my-learning-calendar', label: 'Lịch Học Tập', labelVi: 'Lịch Học Tập', labelEn: 'Learning Calendar', icon: 'ti-calendar-event' },
  { to: '/my-learning-path', label: 'Lộ Trình Học Tập', labelVi: 'Lộ Trình Học Tập', labelEn: 'Learning Roadmap', icon: 'ti-git-branch' },
```

- [ ] **Step 2: Add the entry to `ROLE_WORK_NAV.learner`**

Find:
```js
  learner: [
    { to: '/learner', label: 'Bảng Điều Khiển Học Tập', labelVi: 'Bảng Điều Khiển Học Tập', labelEn: 'Learning Dashboard', icon: 'ti-layout-dashboard', end: true },
    { to: '/learner/courses', label: 'Khóa Học Của Tôi', labelVi: 'Khóa Học Của Tôi', labelEn: 'My Courses', icon: 'ti-book-2' },
```
Change to:
```js
  learner: [
    { to: '/learner', label: 'Bảng Điều Khiển Học Tập', labelVi: 'Bảng Điều Khiển Học Tập', labelEn: 'Learning Dashboard', icon: 'ti-layout-dashboard', end: true },
    { to: '/learner/calendar', label: 'Lịch Học Tập', labelVi: 'Lịch Học Tập', labelEn: 'Learning Calendar', icon: 'ti-calendar-event' },
    { to: '/learner/courses', label: 'Khóa Học Của Tôi', labelVi: 'Khóa Học Của Tôi', labelEn: 'My Courses', icon: 'ti-book-2' },
```

- [ ] **Step 3: Append nav-rendering checks to `scripts/verify-role-level-model.jsx`**

Same insertion point (before the final summary/`process.exit` lines):

This mirrors the existing precedent a few hundred lines earlier in the same
file for the analogous `/learner/paths` vs `/my-learning-path` shared-vs-own
route check (search for `sidebar has Lộ Trình Học Tập nav item` in the file)
— same `render(label, <AppHeader ... />, '/', '/')` call shape, same loose
`.includes()` string checks rather than exact `href="..."` matching (safer:
this harness renders `AppHeader` inside a `MemoryRouter`, and being exact
about the rendered `href` string's format is brittle and unnecessary — the
existing checks in this file never do it, so this section shouldn't either):

```js
// ---------------------------------------------------------------------------
console.log('\n=== Section 26: Learning Calendar nav entry — all 6 roles ===');
{
  const nonLearnerRoles = ['manager', 'trainer', 'hrbp', 'useradmin', 'sysadmin'];
  for (const role of nonLearnerRoles) {
    actAs(role);
    const headerHtml = render(
      `${role} header has Lịch Học Tập nav item`,
      <AppHeader role={role} onRoleChange={() => {}} title="" crumb="" />,
      '/', '/'
    );
    check(`${role} header links to /my-learning-calendar`,
      Boolean(headerHtml && headerHtml.includes('Lịch Học Tập') && headerHtml.includes('my-learning-calendar')));
  }

  actAs('learner');
  const learnerHeaderHtml = render(
    'learner header uses its own /learner/calendar, not the shared route',
    <AppHeader role="learner" onRoleChange={() => {}} title="" crumb="" />,
    '/', '/'
  );
  check('learner header links to its own /learner/calendar (not the shared /my-learning-calendar)',
    Boolean(learnerHeaderHtml && learnerHeaderHtml.includes('/learner/calendar') && !learnerHeaderHtml.includes('my-learning-calendar')));
}
```

- [ ] **Step 4: Run the verify script and confirm no failures**

Run: `npm run verify`
Expected: all Section 26 lines (one per role) print `ok    ...`, final summary still `SMOKE PASSED`.

- [ ] **Step 5: Manual browser verification across roles**

Using the same dev-server + headless-Chrome-over-CDP approach as Task 4 Step 5: for at least the `learner` persona and one non-learner persona (e.g. `sysadmin`), open the hamburger nav drawer and confirm "Lịch Học Tập" appears in the correct group (learner: under "Công việc của Học Viên", right after "Bảng Điều Khiển Học Tập"; sysadmin: under "Học tập của tôi", right after "Bảng Điều Khiển Học Tập"), and clicking it navigates to the calendar page and renders correctly for that role.

Clean up afterward: stop the dev server and headless Chrome process.

- [ ] **Step 6: Commit**

```bash
git add src/components/AppHeader.jsx scripts/verify-role-level-model.jsx
git commit -m "feat: add Learning Calendar nav entry for all 6 roles"
```

