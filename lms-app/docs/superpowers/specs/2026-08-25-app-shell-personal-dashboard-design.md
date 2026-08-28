# App Shell Restructure & Personal Learning Dashboard — Design Spec (Phase 1)

Date: 2026-08-25
Status: Approved by user, ready for implementation planning

## 1. Purpose

Phase 1 of a larger visual restructure (reference: 11 screenshots of a
"BigC LMS" UI the user is standardizing on). The full restructure has 4
parts; this spec covers only the first two, which are the foundation
everything else sits on:

1. **App Shell** — replace the current left `Sidebar` + top `Topbar`
   with a single unified top navigation bar + breadcrumb + persistent
   footer status bar, matching the reference screenshots' header
   pattern, for all 6 roles.
2. **Personal Learning Dashboard** — a single reusable dashboard
   (stat cards, the existing 4-tab roadmap timeline embedded inline,
   an in-progress courses list, a real weekly study-hours chart, and a
   3-card resource row) that is the Learner's main dashboard, and that
   every other role can also reach for viewing their *own* learning.

Deferred to Phase 2 (separate spec, one sub-project per role): the 5
role-specific "Cockpit" dashboards (Manager/Trainer/HRBP/UserAdmin/
SysAdmin) and their "Xem giao diện Học tập Cá nhân" toggle button back
into this Personal Learning Dashboard.

## 2. Non-goals (Phase 1)

- No new data/logic invented to match the reference screenshots
  exactly. Every widget in the Personal Learning Dashboard must trace
  to a real, already-existing field or computation. See §4 for the
  explicit mapping table — reference widgets with no real backing
  (favorites/wishlist, SOP document library, a daily/weekly hour
  goal, per-lesson completion count) are replaced with the nearest
  real equivalent, not fabricated.
- No Cockpit dashboard redesign (Phase 2).
- No change to `CourseStore.jsx` data/actions — this phase is pure UI
  restructuring on top of existing, already-correct data and logic.

## 3. App Shell

### 3.1 Layout

Replace `<Sidebar role .../>` + `<Topbar .../>` (currently two
separate components stacked side-by-side per `App.jsx`'s `Shell`) with
a single `AppHeader` component rendered above the routed content, full
width:

```
┌─────────────────────────────────────────────────────────────────┐
│ [MM] MM MegaLearn   [ROLE BADGE]  Tab Tab Tab | Tab Tab   [search][role▾][🌙][🔥14][🔔][avatar] │
├─────────────────────────────────────────────────────────────────┤
│ 🏠 MM MegaLearn Portal › <crumb>                                  │
├─────────────────────────────────────────────────────────────────┤
│                         (routed page content)                     │
├─────────────────────────────────────────────────────────────────┤
│ ● Network  ·  Khối: <branch>  ·  Vai trò: <role>  ·  <completion>% ·  🔥 Streak: N ngày │
└─────────────────────────────────────────────────────────────────┘
```

- **Tabs**: the role's own `ROLE_WORK_NAV` items rendered first, then a
  visual separator (`|`), then the shared `LEARNER_SELF_NAV` items —
  same two arrays already in `Sidebar.jsx`, just rendered horizontally
  instead of vertically. No new nav data.
- **Collapse**: the existing collapse toggle (hamburger button, already
  fixed to use inline SVG) now collapses the tab row to icon-only
  (labels hidden, `title` tooltip shown on hover) instead of hiding a
  vertical sidebar — same `collapsed` state threaded from `Shell` in
  `App.jsx`, same on/off toggle, different CSS target.
- **Role badge**: colored pill reusing `roleDefinition(role).tone` /
  `.labelVi` — same data `Sidebar.jsx`'s `role-pill` already uses.
- **Role switcher**: existing `Topbar.jsx` role-switcher dropdown,
  unchanged behavior, moved into the new header.
- **Search / dark mode / streak / notifications / avatar**: existing
  `Topbar.jsx` pieces, carried over as-is (dark mode toggle is
  currently decorative in the reference — if `Topbar.jsx` doesn't
  already have real dark-mode wiring, it stays decorative here too;
  not introducing new theme logic in this phase).
- **Breadcrumb row**: existing `PAGE_META[pathname].crumb` /
  `.title`, restyled into its own row instead of stacked in the
  original Topbar.
- **Footer status bar**: new, thin, fixed to the bottom of the content
  area (not the viewport, to avoid overlapping modals). Fields:
  `Khối: user.branch`, `Vai trò: roleDefinition(role).labelVi`, a real
  completion percentage (`completedCount / totalCount` from the
  current role's own enrolled courses — reuses existing counts, no new
  calculation concept), and `Streak: gamification.userStats.streakDays`.

### 3.2 Files

- New: `src/components/AppHeader.jsx` (replaces the combined role of
  `Sidebar.jsx` + `Topbar.jsx` for layout purposes).
- New: `src/components/AppFooterBar.jsx` (the status bar).
- Modify: `src/App.jsx`'s `Shell` — swap `<Sidebar/>` + `<Topbar/>` for
  `<AppHeader/>` + `<AppFooterBar/>`, keep the same `collapsed` state
  and `onToggleSidebar` wiring (renamed conceptually to
  `onToggleNav` but same mechanism).
- `src/components/Sidebar.jsx` and `src/components/Topbar.jsx`:
  logic (nav arrays, role switcher, notifications, profile menu)
  moves into `AppHeader.jsx`; the old files are deleted once nothing
  imports them. (`Sidebar`/`Topbar` are also imported directly in a
  few pages for role-preview purposes — grep before deleting and
  update those call sites to `AppHeader` too.)
- CSS: new rules in `app.css` for `.app-header`, `.app-header-tabs`,
  `.app-footer-bar`, replacing `.sidebar`/`.sidebar.collapsed`/
  `.topbar` rules (old rules removed once unused).

## 4. Personal Learning Dashboard

### 4.1 Field mapping (reference widget → real source)

| Reference widget | Real source used | Notes |
|---|---|---|
| Greeting + avatar + level badge + role tag | `user.fullName`, `user.avatar`/initials, `JobLevelBadge level={user.level}`, `roleDefinition(role)` | unchanged from today's `LearnerDashboard.jsx` |
| Streak badge | `gamification.userStats.streakDays` | already exists, unused today on this page |
| Giờ Học (stat) | `totalLearningHours(courses, user)` | today's existing "Learning Hours" tile — no weekly bucket/goal invented |
| Khóa Đã Hoàn Thành (stat) | `completedCount` | today's existing "Completed" tile |
| Lộ Trình Kế Cận Đang Học (stat) | `getUserRoadmapTabs(user).succession.{level,percent}` | new wiring, but the underlying computation already exists (built for `/learner/paths`) |
| Khóa Bắt Buộc (stat) | `mandatoryCount` | today's existing "Mandatory Courses" tile, replaces "Khóa yêu thích" (no favorites system exists) |
| 4-tab roadmap section (Hiện tại/Kế cận/Tự đề xuất/Gợi ý) | `getUserRoadmapTabs(user)` | reuses the exact component logic built for `LearnerLearningPaths.jsx`, embedded inline on the dashboard via a shared sub-component (see §4.2) |
| Khóa học đang theo dõi (list) | in-progress courses from `myLearningCourses` | same data as today's course grid, restyled as a compact list |
| Thời lượng học tập (Mon–Sun bar chart) | `getUserLearningHistory(user)` timestamps + `timeSpent`, bucketed by ISO weekday, rendered with the existing `BarChart` from `ui.jsx` | the one new chart added; real (if per-persona limited — same fallback-to-Minh-Tran behavior `LearnerHistory.jsx` already has) |
| Chứng Chỉ Đạt Được (card) | `deriveCertificates(courses, user).length` | existing |
| Khóa Bắt Buộc Còn Lại (card) | `mandatoryCount - completedMandatoryCount` | derivable from existing per-course fields |
| Thông Báo Mới (card) | `notifications.learnerInbox` (or role-appropriate inbox) unread count | existing |
| Roadmap node click → detail | Inline panel below the timeline (not a modal) | `VisualRoadmapTimeline.jsx` rewritten per user's explicit choice |

Explicitly dropped (no real data, not fabricated): weekly hour goal
("/10h"), per-lesson completion counter, favorites/saved courses, SOP
document library, "111% of L&D plan" daily-goal framing.

### 4.2 Components

- Modify `src/pages/learner/LearnerDashboard.jsx`: restructure to the
  reference's visual layout (greeting card → stat row → roadmap
  section → courses list + chart row → 3-card resource row), keeping
  every existing data source, adding only the weekly-hours aggregation
  described above.
- Extract the 4-tab roadmap block (tabs + `VisualRoadmapTimeline`)
  from `LearnerLearningPaths.jsx` into a shared
  `src/components/RoadmapTabsPanel.jsx` so both the dashboard and the
  dedicated `/learner/paths` (and `/my-learning-path`) page render the
  identical widget instead of duplicating the tab-switching logic.
  `LearnerLearningPaths.jsx` becomes a thin page wrapper around it
  (page header + `RoadmapTabsPanel`), same as `MyLearning.jsx` wraps
  `LearnerCourses.jsx` today.
- Rewrite `VisualRoadmapTimeline.jsx`: clicking a node opens an inline
  detail panel rendered directly below the timeline (replacing the
  currently-selected milestone's card in place) instead of the
  `Modal`. Same data shown (title, code, status, description, action
  button); the click target and layout shift, not the information.
- New `src/lib/weeklyStudyHours.js` (or a function alongside
  `getUserLearningHistory` in `mockData.js`): parses `timeSpent`
  strings (`"22 mins"`) and `timestamp` dates into a 7-entry
  Mon–Sun array of hours for the current ISO week, for the `BarChart`.

### 4.3 Click-through to detail pages

Every summary widget on the dashboard is a summary, not the full
picture — each one gets a click target that navigates to the page
that already shows its full detail (all routes already exist, no new
pages needed):

| Widget | Navigates to |
|---|---|
| Giờ Học stat | `/learner/history` |
| Khóa Đã Hoàn Thành stat | `/learner/courses` (existing filter UI) |
| Lộ Trình Kế Cận stat | `/learner/paths` (or `/my-learning-path` off-Learner) |
| Khóa Bắt Buộc stat | `/learner/courses` |
| Roadmap 4-tab panel header | `/learner/paths` ("Xem chi tiết học phần" button, matching the reference) |
| Khóa học đang theo dõi list | each row → `/learner/courses/:id`; the list header → `/learner/courses` |
| Thời lượng học tập chart | `/learner/history` |
| Chứng Chỉ Đạt Được card | `/learner/certificates` |
| Khóa Bắt Buộc Còn Lại card | `/learner/courses` |
| Thông Báo Mới card | opens the existing notification panel (`Topbar`'s bell dropdown logic, carried into `AppHeader`) |

### 4.4 Reachability for every role

`LearnerDashboard` (renamed conceptually "Personal Learning
Dashboard" but keeping its file name/route for now) already computes
everything from `currentUser`, not from a hardcoded role — same
pattern already proven with `getUserRoadmapTabs`/`getUserCareerRoadmap`
in the prior roadmap feature. This phase adds the route
`/my-learning-dashboard` (alongside the existing `/learner` route)
mounting the same component, plus a nav entry in the shared
`LEARNER_SELF_NAV` block (visible to every non-learner role in the new
`AppHeader` tabs) so every role can already reach their own version of
this dashboard even before Phase 2 wires the Cockpit-side toggle
button into it.

## 5. Testing

- Extend `scripts/verify-role-level-model.jsx`: render `AppHeader` for
  each of the 6 roles and assert the role-appropriate tabs + role
  badge text appear, and the collapsed state hides labels; render
  `LearnerDashboard` for `learner` and for one non-learner role (e.g.
  `manager`) via the new `/my-learning-dashboard` route and assert the
  stat cards, roadmap tab labels, and weekly chart render without
  crashing and without showing any of the dropped/fabricated fields
  (`grep` the rendered HTML for absence of invented strings like
  "yêu thích" as a smoke check that nothing fake slipped in).
- `npm run build`, `npm run check:tables` (new list/table surfaces),
  same as every prior phase in this project.

## 6. Open items resolved during brainstorming

- Timeline node click shows an **inline panel below the timeline**,
  not a modal (user's explicit choice, overriding the already-built
  modal version).
- Every dashboard widget must map to real, already-existing data —
  reference fields with no backing data are replaced with the nearest
  real equivalent (§4.1 table), never fabricated.
- Phase 2 (the 5 Cockpit dashboards) is out of scope for this spec and
  will get its own spec/plan per role once Phase 1 ships.
