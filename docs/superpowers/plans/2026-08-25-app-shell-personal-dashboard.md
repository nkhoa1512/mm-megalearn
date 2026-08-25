# App Shell & Personal Learning Dashboard Implementation Plan (Phase 1)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the left `Sidebar` + top `Topbar` with one unified top `AppHeader` + breadcrumb + `AppFooterBar`, and restructure `LearnerDashboard.jsx` into the reference "Personal Learning Dashboard" layout — stat cards, the 4-tab roadmap panel embedded inline (with click-to-inline-detail instead of a modal), an in-progress courses list, a real weekly study-hours chart, and a 3-card resource row — reachable by every role.

**Architecture:** `AppHeader.jsx` merges `Sidebar.jsx`'s nav data/role-pill and `Topbar.jsx`'s search/role-switcher/notifications/profile-menu into one horizontal bar; `AppFooterBar.jsx` is new. The roadmap 4-tab widget is extracted out of `LearnerLearningPaths.jsx` into a shared `RoadmapTabsPanel.jsx` so the dashboard and the dedicated page render the identical component. Every new widget traces to a real, already-existing field or computation — no invented data.

**Tech Stack:** React 18 + Vite 5, react-router-dom 6 (HashRouter), no TypeScript, no test framework — verification is `scripts/verify-role-level-model.jsx` (`npm run verify`) plus `npm run check:tables` and `npm run build`.

**Spec:** [docs/superpowers/specs/2026-08-25-app-shell-personal-dashboard-design.md](../specs/2026-08-25-app-shell-personal-dashboard-design.md)

## Global Constraints

- No new data or business logic invented to match the reference screenshots. Every dashboard widget must trace to a real field already in `CourseStore`/`mockData.js`/`levelRoadmapMatrix.js`. Reference widgets with no real backing (favorites/wishlist, SOP document library, a daily/weekly hour goal, per-lesson completion count) are replaced with the nearest real equivalent per the spec's §4.1 table — never fabricated.
- `Sidebar.jsx` and `Topbar.jsx` are imported ONLY from `App.jsx` (confirmed via grep) — no other call sites to update when they're deleted.
- Every summary widget on the dashboard needs a click target to the page with its full detail (spec §4.3).
- Timeline node click shows an inline detail panel below the timeline, not a modal (explicit user decision, overrides the already-built modal version).
- Follow the existing flex:1 + minWidth:0 + overflow:hidden/textOverflow:ellipsis/whiteSpace:nowrap pattern for every new text column/row — this codebase has a recurring letter-by-letter text-wrap bug from omitting it.

---

## Task 1: `AppHeader.jsx` + `AppFooterBar.jsx` — replace Sidebar + Topbar

**Files:**
- Create: `src/components/AppHeader.jsx`
- Create: `src/components/AppFooterBar.jsx`
- Modify: `src/App.jsx` (imports, `Shell` function)
- Modify: `src/styles/app.css` (replace `.sidebar*`/`.topbar` rules with `.app-header*`/`.app-footer-bar` rules, fix `.app-shell`/`.main-scroll` for the new column layout)
- Delete: `src/components/Sidebar.jsx`, `src/components/Topbar.jsx`
- Modify: `scripts/verify-role-level-model.jsx` (swap the `Sidebar` import/usages for `AppHeader`, new section)

**Interfaces:**
- Produces: `AppHeader({ role, onRoleChange, collapsed, onToggleCollapse, title, crumb })` — a full-width header component. `AppFooterBar({ role })` — a full-width footer status bar reading `currentUser`/`courses`/`gamification` from `useCourseStore()` directly (no props beyond `role`).

- [ ] **Step 1: Write `src/components/AppHeader.jsx`**

```jsx
import React, { useState, useRef, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useCourseStore } from '../state/CourseStore';
import { personaForRole } from '../data/mockData';
import { normalizeRole, roleDefinition, hasCapability, ROLE_HOME, ROLE_ORDER } from '../data/roles';
import { levelShortLabel } from '../data/levelSystem';
import { Button, Badge } from './ui';

// Nhóm "Học tập của tôi" — giống hệt nhau cho cả 6 role, vì role nào cũng là Learner.
const LEARNER_SELF_NAV = [
  { to: '/my-learning', label: 'Khóa Học Của Tôi', icon: 'ti-book-2' },
  { to: '/my-learning-dashboard', label: 'Bảng Điều Khiển Học Tập', icon: 'ti-layout-dashboard' },
  { to: '/my-learning-path', label: 'Lộ Trình Học Tập', icon: 'ti-git-branch' },
  { to: '/my-certificates', label: 'Chứng Chỉ Của Tôi', icon: 'ti-certificate' },
  { to: '/trainer-ratings', label: 'Đánh Giá Giảng Viên (CSAT)', icon: 'ti-star' },
];

// Nhóm "Công việc của <role>" — đặc thù từng role (dời nguyên từ Sidebar.jsx cũ).
const ROLE_WORK_NAV = {
  learner: [
    { to: '/learner', label: 'Bảng Điều Khiển Học Tập', icon: 'ti-layout-dashboard', end: true },
    { to: '/learner/courses', label: 'Khóa Học Của Tôi', icon: 'ti-book-2' },
    { to: '/learner/classrooms', label: 'Lớp Trực Tiếp & QR Check-in', icon: 'ti-chalkboard' },
    { to: '/learner/paths', label: 'Lộ Trình Học Tập', icon: 'ti-git-branch' },
    { to: '/learner/ai-hub', label: 'AI Learning Hub', icon: 'ti-sparkles', badge: 'AI' },
    { to: '/learner/certificates', label: 'Chứng Chỉ', icon: 'ti-certificate' },
    { to: '/learner/history', label: 'Lịch Sử Học Tập', icon: 'ti-history' },
    { to: '/trainer-ratings', label: 'Đánh Giá Giảng Viên (CSAT)', icon: 'ti-star' },
  ],
  manager: [
    { to: '/manager', label: 'Bảng Điều Khiển Đội Ngũ', icon: 'ti-layout-dashboard', end: true },
    { to: '/manager/team', label: 'Nhân Viên & Khoảng Cách Năng Lực', icon: 'ti-users' },
    { to: '/manager/courses', label: 'Khóa Học Của Phòng Ban', icon: 'ti-stack-2' },
    { to: '/manager/reports', label: 'Báo Cáo & Tuân Thủ', icon: 'ti-chart-bar' },
  ],
  trainer: [
    { to: '/trainer', label: 'Lớp Giảng Dạy & Live QR', icon: 'ti-school', end: true },
    { to: '/trainer/attendance', label: 'Quản Lý Điểm Danh Học Viên', icon: 'ti-user-check' },
    { to: '/trainer/feedback', label: 'Báo Cáo CSAT Từ Học Viên', icon: 'ti-star' },
    { to: '/trainer/courses', label: 'Tạo & Quản Lý Khóa Học', icon: 'ti-stack-2' },
    { to: '/trainer/training-ops', label: 'Lịch Giảng & Xưởng Thực Hành', icon: 'ti-building' },
    { to: '/trainer/reports', label: 'Báo Cáo ROI & Kirkpatrick', icon: 'ti-chart-histogram' },
  ],
  hrbp: [
    { to: '/hrbp', label: 'Phân Tích Nhân Tài & Tuân Thủ', icon: 'ti-chart-radar', end: false },
    { to: '/trainer', label: 'Lớp Giảng Dạy & Live QR', icon: 'ti-school' },
  ],
  useradmin: [
    { to: '/user-admin', label: 'Danh Mục 100+ Nhân Sự', icon: 'ti-address-book', end: true },
    { to: '/user-admin/hierarchy', label: 'Cây Cơ Cấu Tổ Chức 2 Nhánh', icon: 'ti-binary-tree' },
    { to: '/user-admin/job-levels', label: 'Khung 7 Cấp Bậc Định Biên', icon: 'ti-id-badge-2' },
    { to: '/user-admin/roadmaps', label: 'Quản Lý Lộ Trình Cấp Bậc', icon: 'ti-map-2' },
    { to: '/user-admin/allocation', label: 'Phân Bổ Khóa Học', icon: 'ti-stack-2' },
    { to: '/user-admin/trainers', label: 'Phân Công Giảng Viên Đứng Lớp', icon: 'ti-school' },
    { to: '/trainer', label: 'Lớp Giảng Dạy & Live QR', icon: 'ti-chalkboard' },
    { to: '/approvals', label: 'Duyệt Đơn Học Vượt Cấp', icon: 'ti-clipboard-check', approvalBadge: true },
  ],
  sysadmin: [
    { to: '/sysadmin', label: 'Hạ Tầng IT & API Pipeline', icon: 'ti-server-cog', end: true },
    { to: '/sysadmin/audit', label: 'Nhật Ký Bảo Mật (Audit Logs)', icon: 'ti-shield-check' },
    { to: '/sysadmin/policies', label: 'Chính Sách Chống Gian Lận', icon: 'ti-lock-access' },
    { to: '/sysadmin/roles', label: 'Quản Trị Toàn Bộ 6 Role', icon: 'ti-users-group' },
    { to: '/sysadmin/org-config', label: 'Cấu Hình HRIS & Cây Tổ Chức', icon: 'ti-settings' },
    { to: '/admin/roadmaps', label: 'Quản Lý Lộ Trình Cấp Bậc', icon: 'ti-map-2' },
    { to: '/trainer', label: 'Lớp Giảng Dạy & Live QR', icon: 'ti-school' },
    { to: '/approvals', label: 'Duyệt Đơn Học Vượt Cấp', icon: 'ti-clipboard-check', approvalBadge: true },
  ],
};

export default function AppHeader({ role, onRoleChange, collapsed, onToggleCollapse, title, crumb }) {
  const navigate = useNavigate();
  const { currentUser: authUser, approvals, gamification, notifications: notif, openAiAssistant, logout, switchUser, openTalentProfile } = useCourseStore();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [inbox, setInbox] = useState(notif?.learnerInbox || []);
  const profileRef = useRef(null);

  const effectiveRole = normalizeRole(role);
  const def = roleDefinition(effectiveRole);
  const workItems = ROLE_WORK_NAV[effectiveRole] || ROLE_WORK_NAV.learner;
  const selfItems = effectiveRole === 'learner' ? [] : LEARNER_SELF_NAV;
  const profile = authUser && normalizeRole(authUser.role) === effectiveRole ? authUser : personaForRole(effectiveRole);
  const rolePersonaList = ROLE_ORDER.map((r) => personaForRole(r));
  const unreadCount = inbox.filter((n) => n.unread).length;
  const pendingApprovalCount = hasCapability(effectiveRole, 'canApproveLevelSkip')
    ? (approvals || []).filter((a) => a.status === 'PENDING').length
    : 0;
  const streakDays = gamification?.userStats?.streakDays ?? 0;

  useEffect(() => {
    function handleClickOutside(e) {
      if (profileRef.current && !profileRef.current.contains(e.target)) setShowProfileMenu(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleRoleSwitch(e) {
    const nextRole = normalizeRole(e.target.value);
    onRoleChange(nextRole);
    switchUser(personaForRole(nextRole).userId);
    navigate(ROLE_HOME[nextRole] || '/learner');
  }

  function handleSwitchPersona(u) {
    const nextRole = normalizeRole(u.role);
    switchUser(u.userId);
    onRoleChange(nextRole);
    setShowProfileMenu(false);
    navigate(ROLE_HOME[nextRole] || '/learner');
  }

  function handleLogout() {
    logout();
    setShowProfileMenu(false);
    navigate('/login');
  }

  function markAllRead() {
    setInbox((prev) => prev.map((n) => ({ ...n, unread: false })));
  }

  function renderTab(item) {
    const badge = item.approvalBadge ? (pendingApprovalCount > 0 ? String(pendingApprovalCount) : null) : item.badge;
    return (
      <NavLink key={item.to} to={item.to} end={item.end} title={item.label} className={({ isActive }) => `app-tab ${isActive ? 'active' : ''}`}>
        <i className={`ti ${item.icon}`} aria-hidden="true" />
        <span>{item.label}</span>
        {badge && <span className="app-tab-badge" style={{ background: badge === 'AI' ? 'var(--ai-gradient)' : 'var(--amber)' }}>{badge}</span>}
      </NavLink>
    );
  }

  return (
    <header className={`app-header ${collapsed ? 'collapsed' : ''}`}>
      <div className="app-header-top">
        <div className="app-header-brand">
          <button className="icon-btn sidebar-toggle-btn" onClick={onToggleCollapse} aria-label="Thu gọn / Mở rộng thanh điều hướng" title="Thu gọn / Mở rộng thanh điều hướng">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
              <path d="M2.5 5H15.5M2.5 9H15.5M2.5 13H15.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
          <div className="brand-mark" style={{ background: 'linear-gradient(135deg, var(--bigc-green) 0%, #007A38 100%)', color: '#fff', width: 30, height: 30, flexShrink: 0 }}>
            <span style={{ color: '#fff', fontWeight: 900, fontSize: 12 }}>MM</span>
          </div>
          <div className="app-header-brand-text">
            <div className="brand-name" style={{ fontSize: 14 }}>MM Mega<span style={{ color: 'var(--bigc-green)' }}>Learn</span></div>
          </div>
          <Badge tone={def.tone} icon={def.icon}>{def.shortVi}</Badge>
        </div>

        <nav className="app-header-tabs">
          {workItems.map(renderTab)}
          {selfItems.length > 0 && <span className="app-tab-sep" aria-hidden="true" />}
          {selfItems.map(renderTab)}
        </nav>

        <div className="app-header-actions">
          <Button variant="ai" size="sm" icon="ti-sparkles" onClick={() => openAiAssistant('tutor')}>AI Tutor</Button>
          <select className="role-switcher-select" value={effectiveRole} onChange={handleRoleSwitch} title="Xem trước vai trò khác (demo)">
            {ROLE_ORDER.map((r) => (<option key={r} value={r}>{roleDefinition(r).shortVi}</option>))}
          </select>
          <Badge tone="rust" icon="ti-flame">{streakDays} ngày</Badge>
          <div style={{ position: 'relative' }}>
            <button className="icon-btn" onClick={() => setShowNotifications((v) => !v)} aria-label="Notifications" style={{ position: 'relative' }}>
              <i className="ti ti-bell" aria-hidden="true" />
              {unreadCount > 0 && <span className="app-notif-dot" />}
            </button>
            {showNotifications && (
              <div className="card card-pad app-popover">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div style={{ fontWeight: 800, fontSize: 14 }}>Notifications</div>
                  <button onClick={markAllRead} className="app-link-btn">Mark all as read</button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 280, overflowY: 'auto' }}>
                  {inbox.map((n) => (
                    <div key={n.id} className="app-notif-row" style={{ background: n.unread ? 'var(--rail-soft)' : 'var(--paper-sunken)' }}>
                      <i className={`ti ${n.type === 'ASSIGNED' ? 'ti-book-2' : 'ti-alert-triangle'}`} style={{ color: n.type === 'ASSIGNED' ? 'var(--rail)' : 'var(--rust)', marginTop: 2 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: n.unread ? 700 : 500, color: 'var(--ink)' }}>{n.title}</div>
                        <div style={{ fontSize: 11, color: 'var(--ink-soft)' }}>{n.time}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div ref={profileRef} style={{ position: 'relative' }}>
            <div onClick={() => setShowProfileMenu((v) => !v)} className="app-profile-pill">
              <div className="app-avatar">{profile.avatar || profile.fullName.slice(0, 2).toUpperCase()}</div>
              <i className="ti ti-chevron-down" style={{ fontSize: 12, color: 'var(--ink-faint)' }} />
            </div>
            {showProfileMenu && (
              <div className="card card-pad app-popover" style={{ width: 320 }}>
                <div style={{ borderBottom: '1px solid var(--line)', paddingBottom: 12, marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                    <div style={{ fontWeight: 800, fontSize: 14 }}>{profile.fullName}</div>
                    <Badge tone={roleDefinition(profile.role).tone}>{levelShortLabel(profile.level)}</Badge>
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--ink-soft)', marginTop: 2 }}>{profile.position}</div>
                  <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--ink-faint)', marginTop: 4 }}>{profile.employeeCode} &middot; {profile.email}</div>
                  <div style={{ marginTop: 10 }}>
                    <Button variant="primary" size="sm" block icon="ti-id-badge-2" onClick={() => { setShowProfileMenu(false); openTalentProfile(profile); }}>View Talent Profile</Button>
                  </div>
                </div>
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--ink-faint)', marginBottom: 6 }}>Đổi nhanh 6 Persona:</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 150, overflowY: 'auto' }}>
                    {rolePersonaList.map((u) => (
                      <button key={u.userId} onClick={() => handleSwitchPersona(u)} className="app-persona-row" style={{ borderColor: u.userId === profile.userId ? 'var(--rail)' : 'transparent', background: u.userId === profile.userId ? 'var(--rail-soft)' : 'transparent' }}>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: u.userId === profile.userId ? 700 : 500 }}>{u.fullName}</div>
                          <div style={{ fontSize: 10.5, color: 'var(--ink-soft)' }}>{roleDefinition(u.role).shortVi} &middot; {levelShortLabel(u.level)}</div>
                        </div>
                        {u.userId === profile.userId && <i className="ti ti-check" style={{ color: 'var(--rail)', flexShrink: 0 }} />}
                      </button>
                    ))}
                  </div>
                </div>
                <div style={{ borderTop: '1px solid var(--line)', paddingTop: 10 }}>
                  <Button variant="danger" size="sm" block icon="ti-logout" onClick={handleLogout}>Sign Out</Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {(crumb || title) && (
        <div className="app-crumb-row">
          {crumb && <span className="app-crumb">{crumb}</span>}
          {crumb && title && <i className="ti ti-chevron-right" style={{ fontSize: 10, margin: '0 6px', color: 'var(--ink-faint)' }} />}
          {title && <span className="app-title">{title}</span>}
        </div>
      )}
    </header>
  );
}
```

- [ ] **Step 2: Write `src/components/AppFooterBar.jsx`**

```jsx
import React from 'react';
import { useCourseStore } from '../state/CourseStore';
import { normalizeRole, roleDefinition } from '../data/roles';
import { myLearningCourses } from '../data/mockData';

export default function AppFooterBar({ role }) {
  const { currentUser, courses, gamification } = useCourseStore();
  const effectiveRole = normalizeRole(role);
  const def = roleDefinition(effectiveRole);
  const myCourses = myLearningCourses(courses, currentUser);
  const completed = myCourses.filter((c) => c.enrollment?.status === 'COMPLETED').length;
  const completionPercent = myCourses.length === 0 ? 0 : Math.round((completed / myCourses.length) * 100);
  const streakDays = gamification?.userStats?.streakDays ?? 0;

  return (
    <div className="app-footer-bar">
      <span><span className="app-footer-dot" /> BigC LMS Online Network</span>
      <span>Khối: <strong>{currentUser?.branch === 'OPERATIONS' ? 'Vận Hành Siêu Thị' : 'Văn Phòng Hỗ Trợ'}</strong></span>
      <span>Vai trò: <strong>{def.labelVi}</strong></span>
      <span>Tiến độ: <strong>{completionPercent}%</strong></span>
      <span><i className="ti ti-flame" aria-hidden="true" style={{ color: 'var(--rust)' }} /> Streak: <strong>{streakDays} ngày</strong></span>
    </div>
  );
}
```

- [ ] **Step 3: Wire `AppHeader`/`AppFooterBar` into `App.jsx`, delete `Sidebar.jsx`/`Topbar.jsx`**

In `src/App.jsx`, find:

```js
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
```

Replace with:

```js
import AppHeader from './components/AppHeader';
import AppFooterBar from './components/AppFooterBar';
```

Find:

```jsx
  return (
    <div className="app-shell">
      <Sidebar role={role} collapsed={collapsed} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <Topbar
          role={role}
          onRoleChange={setRole}
          onToggleSidebar={() => setCollapsed((v) => !v)}
          title={meta.title}
          crumb={meta.crumb}
        />
        <div className="main-scroll">
          <div className="content">
            <Routes>
```

Replace with:

```jsx
  return (
    <div className="app-shell">
      <AppHeader
        role={role}
        onRoleChange={setRole}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((v) => !v)}
        title={meta.title}
        crumb={meta.crumb}
      />
      <div className="main-scroll">
        <div className="content">
          <Routes>
```

The real file has 3 closing `</div>` after `</Routes>` (closing `.content`, `.main-scroll`, and the now-unused `flex: 1` wrapper that used to sit next to `Sidebar`), followed by the always-mounted global overlays, then the final `.app-shell` closing tag. Find the exact block:

```jsx
              <Route path="*" element={<Navigate to={roleHome} replace />} />
            </Routes>
          </div>
        </div>
      </div>

      {/* Global AI Assistant Floating Drawer */}
      <AiAssistantDrawer />

      {/* Global Modals: Talent Profile, L1/L3 Surveys */}
      <TalentProfileModal />
      <PostTrainingSurveyModal />
    </div>
  );
}
```

Replace with (dropping the now-redundant `flex: 1` wrapper's closing `</div>` — `.app-shell` itself is the column flex container now, see Step 4 — and adding `AppFooterBar` as the last child before the global overlays):

```jsx
              <Route path="*" element={<Navigate to={roleHome} replace />} />
            </Routes>
        </div>
      </div>

      <AppFooterBar role={role} />

      {/* Global AI Assistant Floating Drawer */}
      <AiAssistantDrawer />

      {/* Global Modals: Talent Profile, L1/L3 Surveys */}
      <TalentProfileModal />
      <PostTrainingSurveyModal />
    </div>
  );
}
```

Delete `src/components/Sidebar.jsx` and `src/components/Topbar.jsx`.

- [ ] **Step 4: Rewrite the layout CSS in `src/styles/app.css`**

Find:

```css
.app-shell {
  display: flex;
  min-height: 100vh;
  background: var(--paper);
}
```

Replace with:

```css
.app-shell {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: var(--paper);
  overflow: hidden;
}
```

Find:

```css
.main-scroll {
  flex: 1;
  overflow-y: auto;
  height: 100vh;
}
```

Replace with:

```css
.main-scroll {
  flex: 1;
  overflow-y: auto;
}
```

Find the entire `/* ---------- Sidebar ---------- */` block through the end of `.nav-item.active { ... }` (everything from `.sidebar {` through the closing brace of `.nav-item.active`, i.e. lines that were originally 7–134 before the collapse-button edit, now spanning through the `.sidebar-toggle-btn` rule added earlier) AND the `/* ---------- Topbar ---------- */` block through `.role-switcher .ti { font-size: 16px; }`-equivalent (i.e. everything through the existing `.role-switcher` rules) — replace the whole combined span with:

```css
/* ---------- App Header (top navbar, replaces Sidebar + Topbar) ---------- */
.app-header {
  background: var(--paper-raised);
  border-bottom: 1px solid var(--line);
  flex-shrink: 0;
}
.app-header-top {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 10px 20px;
}
.app-header-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}
.brand-mark {
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-brand);
}
.brand-name {
  font-family: var(--font-brand);
  font-weight: 500;
  color: var(--ink);
  white-space: nowrap;
}
.app-header.collapsed .app-header-brand-text { display: none; }

.app-header-tabs {
  display: flex;
  align-items: center;
  gap: 4px;
  flex: 1;
  overflow-x: auto;
  min-width: 0;
}
.app-tab {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border-radius: var(--radius-sm);
  font-size: 12.5px;
  font-weight: 600;
  color: var(--ink-soft);
  white-space: nowrap;
  flex-shrink: 0;
}
.app-tab:hover { background: var(--paper-sunken); color: var(--ink); }
.app-tab.active { background: var(--rail-soft); color: var(--rail-soft-text); }
.app-tab .ti { font-size: 16px; }
.app-tab-sep { width: 1px; height: 20px; background: var(--line-strong); margin: 0 6px; flex-shrink: 0; }
.app-tab-badge { font-size: 10px; font-weight: 700; padding: 1px 6px; border-radius: 10px; color: #fff; flex-shrink: 0; }
.app-header.collapsed .app-tab span { display: none; }

.app-header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}
.role-switcher-select {
  height: 32px;
  border-radius: 20px;
  border: 1px solid var(--line-strong);
  background: var(--paper-sunken);
  font-size: 12px;
  font-weight: 600;
  padding: 0 10px;
  color: var(--ink);
}
.icon-btn {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-sm);
  border: 1px solid transparent;
  background: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--ink-soft);
  font-size: 17px;
  transition: background var(--ease) 120ms, border-color var(--ease) 120ms;
}
.icon-btn:hover { background: var(--paper-sunken); border-color: var(--line); }
.sidebar-toggle-btn { border-color: var(--line-strong); background: var(--paper-sunken); }
.app-notif-dot { position: absolute; top: 2px; right: 2px; width: 8px; height: 8px; background: var(--rust); border-radius: 50%; }
.app-popover { position: absolute; right: 0; top: 44px; width: 340px; z-index: 1000; box-shadow: var(--shadow-modal); border-color: var(--line-strong); animation: fadeIn 0.15s ease; }
.app-notif-row { padding: 8px 10px; border-radius: 6px; font-size: 12px; display: flex; gap: 8px; align-items: start; }
.app-link-btn { background: none; border: none; font-size: 11.5px; color: var(--rail); cursor: pointer; font-weight: 600; }
.app-profile-pill { display: flex; align-items: center; gap: 6px; padding: 4px 8px; border-radius: 24px; background: var(--paper-raised); border: 1px solid var(--line); cursor: pointer; }
.app-avatar { background: var(--rail); color: #fff; font-weight: 700; font-size: 12px; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.app-persona-row { padding: 6px 8px; border-radius: 6px; border: 1px solid; display: flex; justify-content: space-between; align-items: center; gap: 8px; font-size: 12px; cursor: pointer; text-align: left; color: var(--ink); width: 100%; }

.app-crumb-row {
  padding: 6px 20px;
  font-size: 11.5px;
  color: var(--ink-faint);
  border-top: 1px solid var(--line);
  display: flex;
  align-items: center;
}
.app-title { font-weight: 600; color: var(--ink); }

.page-title { font-size: 15px; font-weight: 600; font-family: var(--font-body); color: var(--ink); }
.page-crumb { font-size: 11.5px; color: var(--ink-faint); }

.app-footer-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 8px 20px;
  border-top: 1px solid var(--line);
  background: var(--paper-raised);
  font-size: 11px;
  color: var(--ink-faint);
  flex-shrink: 0;
  flex-wrap: wrap;
}
.app-footer-bar strong { color: var(--ink-soft); font-weight: 600; }
.app-footer-dot { display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: var(--sage); margin-right: 4px; }
```

(The old `.role-pill`/`.org-pill`/`.nav-group-label`/`.nav-item`/`.sidebar-foot` rules are removed as part of this same replacement — nothing references them once `Sidebar.jsx` is deleted.)

- [ ] **Step 5: Update the verify harness to render `AppHeader` instead of `Sidebar`**

In `scripts/verify-role-level-model.jsx`, find:

```js
const Sidebar = (await import('../src/components/Sidebar')).default;
```

Replace with:

```js
const AppHeader = (await import('../src/components/AppHeader')).default;
```

There are 5 call sites using `<Sidebar role={...} collapsed={false} />` (grep confirms exactly these, at lines 273, 309, 315, 560, 563 as of this writing — re-grep `Sidebar` in this file to get current line numbers since earlier edits in this task may have shifted them):

```js
const html = render('Sidebar/' + role, <Sidebar role={role} collapsed={false} />, '/', '/');
const sidebarHtml = render(`Sidebar-noapproval/${role}`, <Sidebar role={role} collapsed={false} />, '/', '/');
const sidebarHtml = render(`Sidebar-approval/${role}`, <Sidebar role={role} collapsed={false} />, '/', '/');
const sidebarHtml = render(`${role} sidebar has Lộ Trình Học Tập nav item`, <Sidebar role={role} collapsed={false} />, '/', '/');
const learnerSidebarHtml = byRole.learner ? render('learner sidebar uses its own /learner/paths, not the shared route', <Sidebar role="learner" collapsed={false} />, '/', '/') : null;
```

In each, replace only the JSX element `<Sidebar role={role} collapsed={false} />` (or `role="learner"` in the last one) with `<AppHeader role={role} onRoleChange={() => {}} collapsed={false} onToggleCollapse={() => {}} title="" crumb="" />` (substituting `role="learner"` where that literal appears) — leave the `render(...)` label strings (e.g. `'Sidebar/' + role`) and every `check(...)` call around them untouched; they're just log text and still make sense.

Then append a new section after the current final section (before the `SMOKE PASSED` summary block):

```js
console.log('\n=== 16. AppHeader replaces Sidebar+Topbar: nav, role badge, collapse ===');
{
  for (const role of ROLE_ORDER) {
    actAs(role);
    const html = render(`AppHeader/${role}`, <AppHeader role={role} onRoleChange={() => {}} collapsed={false} onToggleCollapse={() => {}} title="Test Title" crumb="Test Crumb" />, '/', '/');
    check(`${role} AppHeader renders without crashing`, Boolean(html));
    check(`${role} AppHeader shows the role badge`, Boolean(html && html.includes(roleDefinition(role).shortVi)));
  }
  actAs('manager');
  const collapsedHtml = render('AppHeader collapsed hides tab labels via CSS class', <AppHeader role="manager" onRoleChange={() => {}} collapsed onToggleCollapse={() => {}} title="" crumb="" />, '/', '/');
  check('collapsed AppHeader carries the collapsed class', Boolean(collapsedHtml && collapsedHtml.includes('app-header collapsed')));
}
```

(This section needs `ROLE_ORDER` and `roleDefinition` imported at the top of the harness — both already imported earlier in the file per the existing `const { ROLE_ORDER, roleDefinition } = await import('../src/data/roles');` line; if that exact destructure isn't already present, add it near the other top-level imports.)

- [ ] **Step 6: Run verify, table-width audit, and build**

Run: `npm run verify`
Expected: section `=== 16. ... ===` all `ok`; every earlier section still passes (they exercise `AppHeader` indirectly through every page render now, since it's part of the shell — but the harness's `render()` helper wraps individual page elements directly, not the full `Shell`, so this only matters for the sections that explicitly rendered `<Sidebar>` before).

Run: `npm run check:tables`
Expected: clean (no `.table` elements changed in this task).

Run: `npm run build`
Expected: exits 0, no import errors for the deleted files.

- [ ] **Step 7: Manual smoke check**

Run: `npm run dev`, open the app, confirm the top navbar renders instead of the left sidebar, the collapse button now shrinks the tab row, the role-switcher dropdown changes persona, and the footer bar shows real Khối/Vai trò/Streak values.

- [ ] **Step 8: Commit**

```bash
git add src/components/AppHeader.jsx src/components/AppFooterBar.jsx src/App.jsx src/styles/app.css scripts/verify-role-level-model.jsx
git rm src/components/Sidebar.jsx src/components/Topbar.jsx
git commit -m "feat: replace Sidebar+Topbar with a unified top AppHeader and footer status bar"
```

---

## Task 2: `RoadmapTabsPanel.jsx` (shared) + inline-panel `VisualRoadmapTimeline.jsx`

**Files:**
- Create: `src/components/RoadmapTabsPanel.jsx`
- Modify: `src/components/VisualRoadmapTimeline.jsx` (modal → inline panel)
- Modify: `src/pages/learner/LearnerLearningPaths.jsx` (becomes a thin wrapper)
- Modify: `scripts/verify-role-level-model.jsx` (new section)

**Interfaces:**
- Consumes: `getUserRoadmapTabs` (from `CourseStore`, already built), `requestRoadmapPromotion`, `levelAdvanceRequestsFor`, `enrollCourse`.
- Produces: `RoadmapTabsPanel({ user })` — renders the full 4-tab widget (tab buttons + tab content) for the given user, used by both `LearnerLearningPaths.jsx` and (Task 3) `LearnerDashboard.jsx`. `VisualRoadmapTimeline({ milestones, locked, onOpenCourse })` — same props as before, but clicking a node now renders its detail inline below the track instead of opening a `Modal`.

- [ ] **Step 1: Rewrite `src/components/VisualRoadmapTimeline.jsx` — inline panel instead of modal**

Replace the file's `Modal`-based detail rendering. Keep every existing prop, the timeline track/nodes JSX, and `STATUS_META`/`LOCKED_META` exactly as they are; only the "how a click is shown" part changes:

Find:

```jsx
import React, { useState } from 'react';
import { Badge, Button, Modal } from './ui';
```

Replace with:

```jsx
import React, { useState } from 'react';
import { Badge, Button } from './ui';
```

Find the entire trailing `<Modal ...>...</Modal>` block (from `<Modal` through its closing `</Modal>`, right after the closing `</div>` of the scrollable timeline track) and the wrapping `<>...</>` fragment around the component's return — replace the whole return statement with:

```jsx
  return (
    <div>
      <div style={{ overflowX: 'auto', padding: '44px 10px 8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', minWidth: milestones.length * 140 + 120, position: 'relative' }}>
          <div style={{ position: 'absolute', left: 44, right: 44, top: '50%', height: 3, background: 'var(--line-strong)', zIndex: 0 }} />

          <div style={{ zIndex: 1, width: 40, height: 40, borderRadius: '50%', background: 'var(--rail)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }} title="Bạn">
            <i className="ti ti-user" aria-hidden="true" />
          </div>

          {milestones.map((m, idx) => {
            const isTop = idx % 2 === 0;
            const meta = locked ? LOCKED_META : (STATUS_META[m.status] || STATUS_META.NOT_STARTED);
            const isSelected = selected?.course.id === m.course.id;
            return (
              <div key={m.course.id} style={{ flex: 1, minWidth: 120, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', zIndex: 1 }}>
                {isTop && (
                  <div style={{ marginBottom: 8, textAlign: 'center', fontSize: 11, fontWeight: 700, color: 'var(--ink)', maxWidth: 118, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={m.course.title}>
                    {m.course.title}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => !locked && setSelected(isSelected ? null : m)}
                  disabled={locked}
                  style={{
                    width: 46, height: 46, borderRadius: '50%',
                    border: `3px solid ${meta.color}`, boxShadow: isSelected ? `0 0 0 3px ${meta.bg}` : 'none',
                    background: meta.bg, color: meta.color, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 18, cursor: locked ? 'default' : 'pointer', flexShrink: 0,
                  }}
                  title={m.course.title}
                >
                  <i className={`ti ${meta.icon}`} aria-hidden="true" />
                </button>
                {!isTop && (
                  <div style={{ marginTop: 8, textAlign: 'center', fontSize: 11, fontWeight: 700, color: 'var(--ink)', maxWidth: 118, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={m.course.title}>
                    {m.course.title}
                  </div>
                )}
              </div>
            );
          })}

          <div
            style={{
              zIndex: 1, width: 40, height: 40, borderRadius: '50%',
              background: allCompleted ? 'var(--sage)' : 'var(--paper-raised)',
              border: `2px solid ${allCompleted ? 'var(--sage)' : 'var(--line-strong)'}`,
              color: allCompleted ? '#fff' : 'var(--ink-faint)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}
            title="Đích đến"
          >
            <i className="ti ti-flag" aria-hidden="true" />
          </div>
        </div>
      </div>

      {selected && (
        <div className="card card-pad" style={{ marginTop: 4, borderColor: 'var(--rail)', borderWidth: 1.5 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 800, fontSize: 14.5, color: 'var(--ink)' }}>{selected.course.title}</div>
              <div style={{ fontSize: 11.5, color: 'var(--ink-faint)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
                {selected.course.code} &middot; {selected.course.estimatedHours || ''}
              </div>
            </div>
            <button onClick={() => setSelected(null)} className="icon-btn" aria-label="Đóng chi tiết"><i className="ti ti-x" /></button>
          </div>
          <div style={{ marginTop: 10 }}>
            <Badge tone={selected.completed ? 'sage' : selected.status === 'IN_PROGRESS' ? 'amber' : 'slate'} icon={selected.completed ? 'ti-check' : 'ti-clock'}>
              {selected.completed ? 'Đã hoàn thành' : selected.status === 'IN_PROGRESS' ? 'Đang học' : 'Chưa bắt đầu'}
            </Badge>
          </div>
          <p style={{ fontSize: 12.5, color: 'var(--ink-soft)', marginTop: 10, lineHeight: 1.6 }}>{selected.course.description}</p>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
            <Button variant="primary" icon={selected.completed ? 'ti-rotate' : 'ti-player-play'} onClick={() => onOpenCourse && onOpenCourse(selected.course)}>
              {selected.completed ? 'Xem Lại Bài Giảng' : 'Vào Học Ngay'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
```

Also find the function's opening (right after the empty-milestones early return) and add `const allCompleted = !locked && milestones.every((m) => m.completed);` line if not already present just above the `return` (it already exists in the current file per the earlier task — keep it, don't duplicate).

- [ ] **Step 2: Write `src/components/RoadmapTabsPanel.jsx`**

Extract the tab-switching + 4 tab bodies out of `LearnerLearningPaths.jsx` verbatim into this new file, parameterized by `user` instead of always reading `currentUser` directly (so a Manager viewing the shared dashboard can pass someone else's roadmap later if needed, though Phase 1 always passes the logged-in user):

```jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCourseStore } from '../state/CourseStore';
import { Badge, Button, ProgressBar } from './ui';
import VisualRoadmapTimeline from './VisualRoadmapTimeline';

const TABS = [
  { id: 'CURRENT', label: 'Lộ Trình Hiện Tại', icon: 'ti-map-pin' },
  { id: 'SUCCESSION', label: 'Lộ Trình Kế Cận', icon: 'ti-arrow-up-circle' },
  { id: 'SELF_PROPOSED', label: 'Lộ Trình Tự Đề Xuất', icon: 'ti-list-details' },
  { id: 'RECOMMENDED', label: 'Khóa Học Gợi Ý', icon: 'ti-sparkles' },
];

export default function RoadmapTabsPanel({ user, initialTab = 'CURRENT' }) {
  const navigate = useNavigate();
  const { getUserRoadmapTabs, requestRoadmapPromotion, levelAdvanceRequestsFor, enrollCourse } = useCourseStore();
  const [activeTab, setActiveTab] = useState(initialTab);
  const [requestState, setRequestState] = useState(null); // null | 'ok' | 'not-ready'

  const roadmap = getUserRoadmapTabs(user);

  const alreadyRequested = (levelAdvanceRequestsFor(user) || []).some(
    (a) => a.requestType === 'ROADMAP_PROMOTION' && a.userId === user?.userId && a.status === 'PENDING'
  );

  function handleRequestPromotion() {
    const result = requestRoadmapPromotion(user);
    setRequestState(result.ok ? 'ok' : 'not-ready');
  }

  function openCourse(course) {
    navigate(`/my-learning/${course.id}`);
  }

  function joinTrack(track) {
    track.milestones.forEach(({ course, completed }) => {
      if (!completed) enrollCourse(course.id, user);
    });
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="btn btn-sm"
            style={{
              background: activeTab === tab.id ? 'var(--rail)' : 'var(--paper-raised)',
              color: activeTab === tab.id ? '#fff' : 'var(--ink)',
              borderColor: activeTab === tab.id ? 'var(--rail)' : 'var(--line-strong)',
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            <i className={`ti ${tab.icon}`} />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'CURRENT' && (
        <div className="card card-pad">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
            <div style={{ fontWeight: 800, fontSize: 15 }}>Định Biên Level {roadmap.level}</div>
            <Badge tone={roadmap.current.done ? 'sage' : 'amber'}>{roadmap.current.percent}% Hoàn Thành</Badge>
          </div>
          <ProgressBar value={roadmap.current.percent} tone={roadmap.current.done ? 'sage' : 'rail'} />
          <div style={{ marginTop: 20 }}>
            <VisualRoadmapTimeline milestones={roadmap.current.milestones} onOpenCourse={openCourse} />
          </div>
        </div>
      )}

      {activeTab === 'SUCCESSION' && (
        <div className="card card-pad">
          {!roadmap.nextLevel ? (
            <div className="empty-state">
              <i className="ti ti-crown" style={{ color: 'var(--amber)' }} />
              <p>Đã ở cấp bậc cao nhất (Level 1) — không còn Lộ trình kế cận.</p>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 18, padding: '12px 16px', borderRadius: 8, background: roadmap.succession.locked ? '#FEF2F2' : '#F0FDF4', color: roadmap.succession.locked ? '#991B1B' : '#166534' }}>
                <i className={`ti ${roadmap.succession.locked ? 'ti-lock' : 'ti-confetti'}`} style={{ fontSize: 20 }} />
                <span style={{ fontSize: 13, fontWeight: 600 }}>
                  {roadmap.succession.locked
                    ? `Phải hoàn thành 100% Lộ trình hiện tại (Level ${roadmap.level}) để tham gia lộ trình này.`
                    : `Đã hoàn thành định biên Level ${roadmap.level}. Lộ trình kế cận Level ${roadmap.nextLevel} đã được mở khóa!`}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
                <div style={{ fontWeight: 800, fontSize: 15 }}>Kế Cận Level {roadmap.nextLevel}</div>
                <Badge tone={roadmap.succession.percent >= 100 ? 'sage' : 'amber'}>{roadmap.succession.percent}% Hoàn Thành</Badge>
              </div>
              <ProgressBar value={roadmap.succession.percent} tone={roadmap.succession.percent >= 100 ? 'sage' : 'rail'} />

              <div style={{ marginTop: 20 }}>
                <VisualRoadmapTimeline milestones={roadmap.succession.milestones} locked={roadmap.succession.locked} onOpenCourse={openCourse} />
              </div>

              {roadmap.succession.unlocked && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
                  {roadmap.succession.percent >= 100 ? (
                    alreadyRequested || requestState === 'ok' ? (
                      <Badge tone="sage" icon="ti-clock">Hồ sơ đề xuất đang chờ User Admin / System Admin duyệt</Badge>
                    ) : (
                      <Button variant="primary" icon="ti-award" onClick={handleRequestPromotion}>Gửi Hồ Sơ Đề Xuất Đánh Giá Thăng Cấp</Button>
                    )
                  ) : (
                    <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>Hoàn thành 100% các khóa trên để mở nút đề xuất thăng cấp.</span>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {activeTab === 'SELF_PROPOSED' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ background: 'var(--rail-soft)', color: 'var(--rail-soft-text)', padding: '12px 16px', borderRadius: 8, fontSize: 12.5 }}>
            <i className="ti ti-info-circle" style={{ marginRight: 6 }} />
            Các lộ trình chuyên đề mở rộng ngoài định biên — tự chọn theo định hướng phát triển bản thân, hoặc do Quản lý trực tiếp giao thêm.
          </div>
          {roadmap.selfProposed.tracks.length === 0 ? (
            <div className="card empty-state">
              <i className="ti ti-mood-empty" />
              <p>Chưa có track nào phù hợp cấp bậc hiện tại.</p>
            </div>
          ) : (
            roadmap.selfProposed.tracks.map((track) => (
              <div key={track.id} className="card card-pad">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap', marginBottom: 10 }}>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', minWidth: 0 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--rail-soft)', color: 'var(--rail)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <i className={`ti ${track.icon}`} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 800, fontSize: 14 }}>{track.titleVi}</div>
                      <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>{track.description}</div>
                    </div>
                  </div>
                  {track.joined ? (
                    <Badge tone={track.percent >= 100 ? 'sage' : 'amber'}>{track.percent}% Hoàn Thành</Badge>
                  ) : (
                    <Button size="sm" variant="outline" icon="ti-plus" onClick={() => joinTrack(track)}>Bắt Đầu Track Này</Button>
                  )}
                </div>
                {track.joined && <ProgressBar value={track.percent} tone={track.percent >= 100 ? 'sage' : 'rail'} size="sm" />}
                <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {track.milestones.map(({ course, completed }) => (
                    <Badge key={course.id} tone={completed ? 'sage' : 'slate'} icon={completed ? 'ti-check' : 'ti-book-2'}>{course.code}</Badge>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'RECOMMENDED' && (
        <div>
          <div style={{ background: 'var(--amber-soft)', color: 'var(--amber-soft-text)', padding: '12px 16px', borderRadius: 8, fontSize: 12.5, marginBottom: 16 }}>
            <i className="ti ti-sparkles" style={{ marginRight: 6 }} />
            Gợi ý dựa trên cấp bậc, khối công tác hiện tại và các khóa học chưa hoàn thành.
          </div>
          {roadmap.recommended.length === 0 ? (
            <div className="card empty-state">
              <i className="ti ti-mood-empty" />
              <p>Không có gợi ý mới — đã hoàn thành phần lớn nội dung phù hợp.</p>
            </div>
          ) : (
            <div className="grid grid-3" style={{ gap: 12 }}>
              {roadmap.recommended.map((course) => (
                <div key={course.id} className="card card-pad">
                  <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--ink-faint)', marginBottom: 4 }}>{course.code}</div>
                  <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8, minHeight: 36 }}>{course.title}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--ink-soft)', marginBottom: 10 }}>{course.domain} &middot; Level {course.targetLevel}</div>
                  <Button size="sm" variant="outline" icon="ti-player-play" block onClick={() => openCourse(course)}>Xem Khóa Học</Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Turn `LearnerLearningPaths.jsx` into a thin page wrapper**

Replace the whole file with:

```jsx
import React from 'react';
import { useCourseStore } from '../../state/CourseStore';
import { Badge } from '../../components/ui';
import RoadmapTabsPanel from '../../components/RoadmapTabsPanel';
import { levelDefinition } from '../../data/levelSystem';

export default function LearnerLearningPaths({ initialTab = 'CURRENT' }) {
  const { currentUser } = useCourseStore();
  const levelDef = levelDefinition(currentUser?.level);

  return (
    <>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <h1>Lộ Trình Học Tập Của Tôi</h1>
          <Badge tone="rail" icon="ti-map-2">{levelDef.emoji} Level {currentUser?.level} &middot; {levelDef.shortVi}</Badge>
        </div>
        <p>
          4 phân hệ lộ trình: Lộ trình cấp bậc hiện tại, Lộ trình kế cận thăng cấp, Lộ trình tự đề xuất
          và Khóa học gợi ý theo vị trí công việc.
        </p>
      </div>
      <RoadmapTabsPanel user={currentUser} initialTab={initialTab} />
    </>
  );
}
```

- [ ] **Step 4: Add a verify-harness section**

Append after the existing final section (before `SMOKE PASSED`):

```js
console.log('\n=== 17. RoadmapTabsPanel extraction + inline (non-modal) timeline detail ===');
{
  actAs('learner');
  const pathsHtml = render('LearnerLearningPaths still shows all 4 tabs after extraction', <LearnerLearningPaths initialTab="CURRENT" />, '/learner/paths', '/learner/paths');
  check('extracted RoadmapTabsPanel still renders all 4 tab labels', Boolean(pathsHtml
    && pathsHtml.includes('Lộ Trình Hiện Tại') && pathsHtml.includes('Lộ Trình Kế Cận')
    && pathsHtml.includes('Lộ Trình Tự Đề Xuất') && pathsHtml.includes('Khóa Học Gợi Ý')));

  const fs = await import('node:fs');
  const timelineSource = fs.readFileSync('src/components/VisualRoadmapTimeline.jsx', 'utf8');
  check('VisualRoadmapTimeline no longer imports Modal', !/import\s*\{[^}]*\bModal\b[^}]*\}\s*from\s*'\.\/ui'/.test(timelineSource));
  check('VisualRoadmapTimeline renders an inline detail card on selection', timelineSource.includes('{selected && (') && timelineSource.includes("className=\"card card-pad\""));
}
```

- [ ] **Step 5: Run verify and build**

Run: `npm run verify`
Expected: section `=== 17. ... ===` all `ok`.

Run: `npm run build`
Expected: exits 0.

- [ ] **Step 6: Commit**

```bash
git add src/components/RoadmapTabsPanel.jsx src/components/VisualRoadmapTimeline.jsx src/pages/learner/LearnerLearningPaths.jsx scripts/verify-role-level-model.jsx
git commit -m "refactor: extract RoadmapTabsPanel and switch timeline detail to an inline panel"
```

---

## Task 3: Weekly study-hours chart + `LearnerDashboard.jsx` restructure + shared route

**Files:**
- Modify: `src/data/mockData.js` (new `weeklyStudyHours(user)` export, alongside `getUserLearningHistory`)
- Modify: `src/pages/learner/LearnerDashboard.jsx` (full restructure)
- Modify: `src/App.jsx` (new `/my-learning-dashboard` route)
- Modify: `scripts/verify-role-level-model.jsx` (new section)

**Interfaces:**
- Consumes: `getUserLearningHistory(user)` (existing), `getUserRoadmapTabs` (existing), `myLearningCourses`/`totalLearningHours`/`deriveCertificates` (existing), `RoadmapTabsPanel` (Task 2), `BarChart` (existing, from `ui.jsx`).
- Produces: `weeklyStudyHours(user) => [{ label: 'Thứ 2'..'Chủ Nhật', value: hours }]` (7 entries, Monday-first), consumed only by `LearnerDashboard.jsx`.

- [ ] **Step 1: Add `weeklyStudyHours` to `src/data/mockData.js`**

Find the existing `getUserLearningHistory` function:

```js
export function getUserLearningHistory(user) {
  const userId = user?.userId || 'USR-1042';
  return userHistoryLogs[userId] || userHistoryLogs['USR-1042'] || [];
}
```

Add directly after it:

```js
const WEEKDAY_LABELS_VI = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ Nhật'];

/**
 * Giờ học theo từng ngày trong tuần hiện tại (Thứ 2 -> Chủ Nhật), tính từ
 * timeSpent + timestamp thật trong getUserLearningHistory (không phải số bịa) —
 * cùng nguồn dữ liệu trang Lịch Sử Học Tập đang dùng, kể cả giới hạn fallback
 * về USR-1042 cho các persona chưa có log riêng.
 */
export function weeklyStudyHours(user) {
  const logs = getUserLearningHistory(user);
  const now = new Date();
  const dayOfWeek = (now.getDay() + 6) % 7; // 0=Monday .. 6=Sunday
  const monday = new Date(now);
  monday.setDate(now.getDate() - dayOfWeek);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 7);

  const hoursByDay = [0, 0, 0, 0, 0, 0, 0];
  logs.forEach((log) => {
    const ts = new Date(log.timestamp.replace(' ', 'T'));
    if (ts < monday || ts >= sunday) return;
    const idx = (ts.getDay() + 6) % 7;
    const minutes = parseInt(log.timeSpent, 10) || 0;
    hoursByDay[idx] += minutes / 60;
  });

  return WEEKDAY_LABELS_VI.map((label, i) => ({ label, value: Math.round(hoursByDay[i] * 10) / 10 }));
}
```

- [ ] **Step 2: Restructure `src/pages/learner/LearnerDashboard.jsx`**

Replace the whole file with:

```jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  currentUser,
  myLearningCourses,
  notifications,
  deriveCertificates,
  totalLearningHours,
  weeklyStudyHours,
} from '../../data/mockData';
import { Badge, ProgressBar, Button, BarChart } from '../../components/ui';
import { useCourseStore } from '../../state/CourseStore';
import { levelDefinition } from '../../data/levelSystem';
import RoadmapTabsPanel from '../../components/RoadmapTabsPanel';

export default function LearnerDashboard() {
  const navigate = useNavigate();
  const { courses: allCourses, gamification, currentUser: authUser, getUserRoadmapTabs } = useCourseStore();
  const user = authUser || currentUser;
  const courses = myLearningCourses(allCourses, user);
  const certificates = deriveCertificates(allCourses, user);
  const mandatoryCourses = courses.filter((c) => c.courseType === 'MANDATORY');
  const mandatoryCount = mandatoryCourses.length;
  const mandatoryOutstanding = mandatoryCourses.filter((c) => c.enrollment.status !== 'COMPLETED').length;
  const inProgressCourses = courses.filter((c) => c.enrollment.status === 'IN_PROGRESS');
  const completedCount = courses.filter((c) => c.enrollment.status === 'COMPLETED').length;
  const learningHours = totalLearningHours(allCourses, user);
  const roadmap = getUserRoadmapTabs(user);
  const levelDef = levelDefinition(user.level);
  const chartData = weeklyStudyHours(user);
  const unreadCount = (notifications.learnerInbox || []).filter((n) => n.unread).length;

  return (
    <>
      <div className="card card-pad" style={{ marginBottom: 20, background: 'linear-gradient(135deg, #FFFFFF 0%, var(--sage-soft) 100%)', borderColor: 'var(--sage)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'var(--rail)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 18, flexShrink: 0 }}>
              {user.avatar || user.fullName.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <h1 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>Xin chào, {user.fullName.split(' ').pop()}! 👋</h1>
                <Badge tone="rail" icon="ti-map-2">{levelDef.emoji} Level {user.level} &middot; {levelDef.shortVi}</Badge>
              </div>
              <p style={{ marginTop: 2, marginBottom: 0 }}><strong>{user.position}</strong> &middot; MM Mega Market</p>
            </div>
          </div>
          <Button variant="primary" icon="ti-book-2" onClick={() => navigate('/learner/courses')}>Khóa Học Của Tôi ({courses.length})</Button>
        </div>
      </div>

      <div className="grid grid-4" style={{ marginBottom: 24 }}>
        <StatTile label="Giờ Học" value={`${learningHours.toFixed(1)}h`} tone="blue" icon="ti-clock-hour-4" onClick={() => navigate('/learner/history')} />
        <StatTile label="Khóa Đã Hoàn Thành" value={completedCount} tone="sage" icon="ti-circle-check" onClick={() => navigate('/learner/courses')} />
        <StatTile
          label="Lộ Trình Kế Cận"
          value={roadmap.nextLevel ? `${roadmap.succession.percent}%` : '—'}
          tone={roadmap.succession.percent >= 100 ? 'sage' : 'amber'}
          icon="ti-arrow-up-circle"
          onClick={() => navigate('/learner/paths')}
        />
        <StatTile label="Khóa Bắt Buộc" value={mandatoryCount} tone="amber" icon="ti-shield-alert" onClick={() => navigate('/learner/courses')} />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div className="section-label" style={{ margin: 0 }}>
          <i className="ti ti-route" style={{ marginRight: 6 }} />
          Trục Lộ Trình Đào Tạo &amp; Kế Cận Trực Quan
        </div>
        <Button size="sm" variant="ghost" icon="ti-arrow-right" onClick={() => navigate('/learner/paths')}>Xem Chi Tiết Học Phần</Button>
      </div>
      <div style={{ marginBottom: 28 }}>
        <RoadmapTabsPanel user={user} />
      </div>

      <div className="grid grid-2" style={{ gap: 16, marginBottom: 24 }}>
        <div className="card card-pad">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontWeight: 800, fontSize: 14 }}><i className="ti ti-book-2" style={{ marginRight: 6 }} />Khóa Học Đang Theo Dõi ({inProgressCourses.length})</div>
            <Button size="sm" variant="ghost" icon="ti-arrow-right" onClick={() => navigate('/learner/courses')}>Xem Tất Cả</Button>
          </div>
          {inProgressCourses.length === 0 ? (
            <div style={{ fontSize: 12.5, color: 'var(--ink-faint)' }}>Không có khóa nào đang học dở.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {inProgressCourses.slice(0, 4).map((c) => (
                <div key={c.id} className="card-interactive" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', border: '1px solid var(--line)', borderRadius: 8, cursor: 'pointer' }} onClick={() => navigate(`/learner/courses/${c.id}`)}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={c.title}>{c.title}</div>
                    <div style={{ marginTop: 6 }}><ProgressBar value={c.enrollment.progressPercent || 0} tone="rail" size="sm" /></div>
                  </div>
                  <Badge tone="amber">{c.enrollment.progressPercent || 0}%</Badge>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card card-pad">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontWeight: 800, fontSize: 14 }}><i className="ti ti-chart-bar" style={{ marginRight: 6 }} />Thời Lượng Học Tập</div>
            <Button size="sm" variant="ghost" icon="ti-arrow-right" onClick={() => navigate('/learner/history')}>Chi Tiết</Button>
          </div>
          <BarChart data={chartData} valueSuffix="h" tone="sage" />
        </div>
      </div>

      <div className="grid grid-3" style={{ gap: 16 }}>
        <ResourceCard icon="ti-certificate" tone="sage" title="Chứng Chỉ Đạt Được" value={`${certificates.length} chứng chỉ`} onClick={() => navigate('/learner/certificates')} />
        <ResourceCard icon="ti-shield-alert" tone="amber" title="Khóa Bắt Buộc Còn Lại" value={`${mandatoryOutstanding} khóa`} onClick={() => navigate('/learner/courses')} />
        {/* Không có trang chi tiết thông báo riêng trong app (chỉ có dropdown
            chuông ở AppHeader, state cục bộ không lift lên được dễ dàng) — thẻ
            này không có onClick, tránh giả vờ điều hướng đến nơi không tồn tại. */}
        <ResourceCard icon="ti-bell-ringing" tone="rail" title="Thông Báo Mới" value={`${unreadCount} thông báo`} />
      </div>
    </>
  );
}

function StatTile({ label, value, tone, icon, onClick }) {
  const color = tone ? `var(--${tone})` : 'var(--ink)';
  return (
    <div className="stat card-interactive" onClick={onClick} style={{ cursor: onClick ? 'pointer' : 'default' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 6 }}>
        <div className="stat-label">{label}</div>
        {icon && (
          <div className="stat-icon-badge" style={{ background: `var(--${tone || 'rail'}-soft)`, color: `var(--${tone || 'rail'}-soft-text)` }}>
            <i className={`ti ${icon}`} />
          </div>
        )}
      </div>
      <div className="stat-value" style={{ color }}>{value}</div>
    </div>
  );
}

function ResourceCard({ icon, tone, title, value, onClick }) {
  return (
    <div className={`card card-pad ${onClick ? 'card-interactive' : ''}`} onClick={onClick} style={{ display: 'flex', gap: 12, alignItems: 'center', cursor: onClick ? 'pointer' : 'default' }}>
      <div className="stat-icon-badge" style={{ background: `var(--${tone}-soft)`, color: `var(--${tone}-soft-text)`, width: 40, height: 40, fontSize: 18 }}>
        <i className={`ti ${icon}`} />
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</div>
        <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>{value}</div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Add the shared `/my-learning-dashboard` route**

In `src/App.jsx`, find:

```js
  '/my-learning': { title: 'Cổng Học Tập Cá Nhân — Mọi Role Đều Là Learner', crumb: 'Học tập của tôi' },
  '/my-learning-path': { title: 'Lộ Trình Học Tập Của Tôi — Mọi Role', crumb: 'Học tập của tôi' },
```

Replace with:

```js
  '/my-learning': { title: 'Cổng Học Tập Cá Nhân — Mọi Role Đều Là Learner', crumb: 'Học tập của tôi' },
  '/my-learning-dashboard': { title: 'Bảng Điều Khiển Học Tập Cá Nhân — Mọi Role', crumb: 'Học tập của tôi' },
  '/my-learning-path': { title: 'Lộ Trình Học Tập Của Tôi — Mọi Role', crumb: 'Học tập của tôi' },
```

Find:

```jsx
              <Route path="/my-learning-path" element={<LearnerLearningPaths />} />
```

Replace with:

```jsx
              <Route path="/my-learning-dashboard" element={<LearnerDashboard />} />
              <Route path="/my-learning-path" element={<LearnerLearningPaths />} />
```

- [ ] **Step 4: Add a verify-harness section**

Append after section 17 (before `SMOKE PASSED`):

```js
console.log('\n=== 18. LearnerDashboard restructure: real fields only, reachable by every role ===');
{
  const { weeklyStudyHours: seedWeeklyHours } = await import('../src/data/mockData');
  actAs('learner');
  const dashHtml = render('learner dashboard renders the restructured layout', <LearnerDashboard />, '/learner', '/learner');
  check('dashboard shows the 4 real stat tiles', Boolean(dashHtml
    && dashHtml.includes('Giờ Học') && dashHtml.includes('Khóa Đã Hoàn Thành')
    && dashHtml.includes('Lộ Trình Kế Cận') && dashHtml.includes('Khóa Bắt Buộc')));
  check('dashboard embeds the 4-tab roadmap panel inline', Boolean(dashHtml && dashHtml.includes('Trục Lộ Trình Đào Tạo')));
  check('dashboard shows the weekly study-hours chart section', Boolean(dashHtml && dashHtml.includes('Thời Lượng Học Tập')));
  check('dashboard does NOT show any fabricated field (favorites/wishlist/SOP library/daily goal)',
    !dashHtml.includes('yêu thích') && !dashHtml.includes('Kho tài liệu') && !dashHtml.includes('kế hoạch L&D'));

  const minh = generated100Users.find((u) => u.userId === 'USR-1042');
  const hours = seedWeeklyHours(minh);
  check('weeklyStudyHours returns 7 Mon-Sun entries', Array.isArray(hours) && hours.length === 7 && hours[0].label === 'Thứ 2' && hours[6].label === 'Chủ Nhật');

  for (const role of ['manager', 'trainer', 'hrbp', 'useradmin', 'sysadmin']) {
    actAs(role);
    const html = render(`${role} can open the shared /my-learning-dashboard`, <LearnerDashboard />, '/my-learning-dashboard', '/my-learning-dashboard');
    check(`${role} sees the personal dashboard with its own real data`, Boolean(html && html.includes('Trục Lộ Trình Đào Tạo')));
  }
}
```

(This section needs `LearnerDashboard` imported in the harness — it already is, per the existing `const LearnerDashboard = (await import('../src/pages/learner/LearnerDashboard')).default;` line.)

- [ ] **Step 5: Run verify, table-width audit, and build**

Run: `npm run verify`
Expected: section `=== 18. ... ===` all `ok`.

Run: `npm run check:tables`
Expected: clean.

Run: `npm run build`
Expected: exits 0.

- [ ] **Step 6: Manual smoke check**

Run: `npm run dev`, open the Learner dashboard, confirm the greeting card, 4 stat tiles, the 4-tab roadmap panel, the in-progress list, the weekly bar chart, and the 3 resource cards all render and every card navigates somewhere real when clicked. Switch role to Manager via the header's role-switcher, open `/my-learning-dashboard` via the new "Bảng Điều Khiển Học Tập" tab, confirm it shows the Manager persona's own data.

- [ ] **Step 7: Commit**

```bash
git add src/data/mockData.js src/pages/learner/LearnerDashboard.jsx src/App.jsx scripts/verify-role-level-model.jsx
git commit -m "feat: restructure LearnerDashboard into the shared Personal Learning Dashboard"
```

---

## Task 4: Final verification pass

**Files:** none (verification only).

- [ ] **Step 1: Run the full suite**

Run: `npm run verify`
Expected: every section from `0` through `18` prints only `ok` lines; final line is `SMOKE PASSED`.

Run: `npm run check:tables`
Expected: no horizontal-overflow warnings anywhere, including the new dashboard's in-progress-courses list and resource cards.

Run: `npm run build`
Expected: exits 0, no warnings about unused imports (in particular, confirm nothing still imports the deleted `Sidebar.jsx`/`Topbar.jsx`).

- [ ] **Step 2: Manual cross-role smoke pass**

Run: `npm run dev`. For each of the 6 roles (switch via the header's role-switcher pill): confirm the top navbar shows the correct role badge and work tabs, the collapse button shrinks it to icon rail and back, the footer bar shows correct Khối/Vai trò/Streak, and (for the 5 non-learner roles) the shared "Bảng Điều Khiển Học Tập" tab opens `/my-learning-dashboard` showing that persona's own real roadmap/course data.

- [ ] **Step 3: Final commit (if anything was left uncommitted)**

```bash
git status --short
```

If clean, nothing to do. If not, stage and commit the remainder with a message describing what was fixed during the final pass.
