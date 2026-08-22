# MM MegaLearn — Corporate Learning & Development Platform (MM Mega Market Vietnam)

Clickable front-end mockup & enterprise architecture for the Corporate Learning & Development System (MM MegaLearn)
described in the SRS / FSD. Built with React + Vite + React Router. No backend —
all data lives in `src/data/mockData.js` so the whole app runs standalone.

## Run it

```bash
npm install
npm run dev
```

Then open the printed local URL (usually `http://localhost:5173`).

## Build for hosting

```bash
npm run build
```

Outputs static files to `dist/`, deployable to Netlify, Vercel, S3, etc.

## Structure

```
src/
  App.jsx              routing + role state (learner / manager / admin)
  components/
    Sidebar.jsx         role-aware navigation
    Topbar.jsx           page header + role switcher
    ui.jsx               Badge, ProgressBar, StatCard, Button, ModuleList, LessonRow, CourseTypeBadge
  pages/
    learner/             dashboard, course list, course detail, certificates, history (USER_LEARN)
    manager/              dashboard, my learning, team, reports (monitoring only, no approvals)
    admin/                dashboard, course builder, configuration, analytics
  data/
    mockData.js           all mock data, shaped after the SRS entities (org hierarchy,
                           courses/modules/lessons, assignments, enrollments)
  styles/
    tokens.css             design tokens (colors, type, radius)
    app.css                 component styles
```

## Swapping in a real backend

Everything reads from `src/data/mockData.js`. To connect a real API:

1. Replace the static exports with fetch calls (e.g. React Query or SWR).
2. Keep the shape of each export the same — components don't know or care
   where the data comes from.
3. Role switching in the topbar is a UI convenience for this mockup only;
   a real build should derive the role from an authenticated session.

## Design notes

- Light theme only, warm paper background (`--paper: #FBF9F4`), no dark mode.
- Colors carry meaning: pine green (`--rail`) = brand/primary, amber = in
  progress/pending, sage = passed/completed, rust = overdue/blocked.
- The module/lesson syllabus (`components/ui.jsx` → `ModuleList`) is the
  signature element — it makes the SRS's core mechanic (Course > Module >
  Lesson, each lesson completed against its own content rule, no manager
  approval gate) visible at a glance. Manager is monitoring-only: it cannot
  assign courses or approve anything (BR-008, BR-025).
