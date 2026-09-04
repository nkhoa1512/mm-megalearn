import React, { useState, useRef, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useCourseStore } from '../../store/CourseStore';
import { personaForRole, notifications } from '../../data/mockData';
import { normalizeRole, roleDefinition, hasCapability, ROLE_HOME, ROLE_ORDER } from '../../data/roles';
import { levelShortLabel } from '../../data/levelSystem';
import { Button, Badge } from '../common/ui';

// The "My Learning" group — identical for all 6 roles, because every role is a Learner.
const LEARNER_SELF_NAV = [
  { to: '/my-learning', label: 'My Courses', labelVi: 'My Courses', labelEn: 'My Courses', icon: 'ti-book-2' },
  { to: '/my-learning-dashboard', label: 'Learning Dashboard', labelVi: 'Learning Dashboard', labelEn: 'Learning Dashboard', icon: 'ti-layout-dashboard' },
  { to: '/my-learning-calendar', label: 'Learning Calendar', labelVi: 'Learning Calendar', labelEn: 'Learning Calendar', icon: 'ti-calendar-event' },
  { to: '/my-learning-path', label: 'Learning Roadmap', labelVi: 'Learning Roadmap', labelEn: 'Learning Roadmap', icon: 'ti-git-branch' },
  { to: '/my-certificates', label: 'My Certificates', labelVi: 'My Certificates', labelEn: 'My Certificates', icon: 'ti-certificate' },
  { to: '/trainer-ratings', label: 'Trainer Ratings (CSAT)', labelVi: 'Trainer Ratings (CSAT)', labelEn: 'Trainer Ratings (CSAT)', icon: 'ti-star' },
];

// The "System Administration" group — for User Admin & System Admin only, kept separate
// from "<role> workspace" because these are 2 system-wide configuration pages
// (Certificate Template & Category), not day-to-day course management
// daily.
const SYSTEM_ADMIN_NAV = [
  { to: '/admin/certifications', label: 'Certificate Management', labelVi: 'Certificate Management', labelEn: 'Manage Certification', icon: 'ti-certificate' },
  { to: '/admin/categories', label: 'Category Management', labelVi: 'Category Management', labelEn: 'Manage Category', icon: 'ti-tags' },
];

// The "<role> workspace" group — specific to each role.
const ROLE_WORK_NAV = {
  learner: [
    { to: '/learner', label: 'Learning Dashboard', labelVi: 'Learning Dashboard', labelEn: 'Learning Dashboard', icon: 'ti-layout-dashboard', end: true },
    { to: '/learner/calendar', label: 'Learning Calendar', labelVi: 'Learning Calendar', labelEn: 'Learning Calendar', icon: 'ti-calendar-event' },
    { to: '/learner/courses', label: 'My Courses', labelVi: 'My Courses', labelEn: 'My Courses', icon: 'ti-book-2' },
    { to: '/learner/catalog', label: 'Full Course Catalog', labelVi: 'Full Course Catalog', labelEn: 'Full Course Catalog', icon: 'ti-stack-2' },
    { to: '/learner/classrooms', label: 'In-Person Class & QR Check-in', labelVi: 'In-Person Class & QR Check-in', labelEn: 'Live Classrooms & QR', icon: 'ti-chalkboard' },
    { to: '/learner/paths', label: 'Learning Roadmap', labelVi: 'Learning Roadmap', labelEn: 'Learning Roadmap', icon: 'ti-git-branch' },
    { to: '/learner/ai-hub', label: 'AI Learning Hub', labelVi: 'AI Learning Hub', labelEn: 'AI Learning Hub', icon: 'ti-sparkles', badge: 'AI' },
    { to: '/learner/certificates', label: 'Certificates', labelVi: 'Certificates', labelEn: 'Certificates', icon: 'ti-certificate' },
    { to: '/learner/history', label: 'Learning History', labelVi: 'Learning History', labelEn: 'Learning History', icon: 'ti-history' },
    { to: '/trainer-ratings', label: 'Trainer Ratings (CSAT)', labelVi: 'Trainer Ratings (CSAT)', labelEn: 'Trainer Ratings (CSAT)', icon: 'ti-star' },
  ],
  manager: [
    { to: '/manager', label: 'Team Dashboard', labelVi: 'Team Dashboard', labelEn: 'Team Dashboard', icon: 'ti-layout-dashboard', end: true },
    { to: '/manager/team', label: 'Team Management & Training', labelVi: 'Team Management & Training', labelEn: 'Team Learning & Competencies', icon: 'ti-users' },
    { to: '/manager/courses', label: 'Department Courses', labelVi: 'Department Courses', labelEn: 'Department Courses', icon: 'ti-stack-2' },
    { to: '/manager/catalog', label: 'Full Course Catalog', labelVi: 'Full Course Catalog', labelEn: 'Full Course Catalog', icon: 'ti-database' },
  ],
  trainer: [
    { to: '/trainer', label: 'Teaching & Classroom Dashboard', labelVi: 'Teaching & Classroom Dashboard', labelEn: 'Teaching Dashboard & Classes', icon: 'ti-school', end: true },
    { to: '/admin/courses', label: 'Create & Manage Courses', labelVi: 'Create & Manage Courses', labelEn: 'Create & Manage Courses', icon: 'ti-stack-2' },
    { to: '/trainer/reports', label: 'CSAT & Teaching Quality Report', labelVi: 'CSAT & Teaching Quality Report', labelEn: 'CSAT & Teaching Reports', icon: 'ti-chart-histogram' },
  ],
  hrbp: [
    {
      to: '/hrbp',
      label: 'Talent & Compliance Analytics',
      labelVi: 'Talent & Compliance Analytics',
      labelEn: 'Talent & Compliance Analytics',
      icon: 'ti-chart-radar',
      end: true,
      // The four tabs of HrbpDashboard live under /hrbp and all belong to this item.
      // /hrbp/catalog is a different page with its own entry below, so it is not listed
      // here — otherwise prefix matching would highlight both items at once.
      activePaths: ['/hrbp', '/hrbp/succession', '/hrbp/compliance', '/hrbp/curriculum'],
    },
    { to: '/hrbp/catalog', label: 'Full Course Catalog', labelVi: 'Full Course Catalog', labelEn: 'Full Course Catalog', icon: 'ti-database' },
    { to: '/trainer', label: 'Teaching Classes & Live QR', labelVi: 'Teaching Classes & Live QR', labelEn: 'Teaching Classes & Live QR', icon: 'ti-school' },
  ],
  useradmin: [
    { to: '/user-admin', label: 'People Administration & Org Structure', labelVi: 'People Administration & Org Structure', labelEn: 'User & Org Administration', icon: 'ti-users-group', end: true },
    { to: '/admin', label: 'Learner Progress & Records', labelVi: 'Learner Progress & Records', labelEn: 'Learner Progress & Records', icon: 'ti-report-analytics', activePaths: ['/admin', '/admin/reports'] },
    { to: '/admin/courses', label: 'Create & Manage Courses', labelVi: 'Create & Manage Courses', labelEn: 'Create & Manage Courses', icon: 'ti-stack-2' },
    { to: '/trainer', label: 'Teaching Classes & Live QR', labelVi: 'Teaching Classes & Live QR', labelEn: 'Teaching Classes & Live QR', icon: 'ti-school' },
    { to: '/admin/roadmaps', label: 'Level Roadmap Management', labelVi: 'Level Roadmap Management', labelEn: 'Level Roadmaps Management', icon: 'ti-map-2' },
    { to: '/approvals', label: 'Approve Level Skip Requests', labelVi: 'Approve Level Skip Requests', labelEn: 'Level Advance Approvals', icon: 'ti-clipboard-check', approvalBadge: true },
    { to: '/admin/cost-center', label: 'Training Cost Center', labelVi: 'Training Cost Center', labelEn: 'Training Cost Center', icon: 'ti-report-money' },
  ],
  sysadmin: [
    { to: '/sysadmin', label: 'System Administration & Security', labelVi: 'System Administration & Security', labelEn: 'System Admin & Security', icon: 'ti-server-cog', end: true },
    { to: '/admin', label: 'Learner Progress & Records', labelVi: 'Learner Progress & Records', labelEn: 'Learner Progress & Records', icon: 'ti-report-analytics', activePaths: ['/admin', '/admin/reports'] },
    { to: '/admin/courses', label: 'Create & Manage Courses', labelVi: 'Create & Manage Courses', labelEn: 'Create & Manage Courses', icon: 'ti-stack-2' },
    { to: '/trainer', label: 'Teaching Classes & Live QR', labelVi: 'Teaching Classes & Live QR', labelEn: 'Teaching Classes & Live QR', icon: 'ti-school' },
    { to: '/admin/roadmaps', label: 'Level Roadmap Management', labelVi: 'Level Roadmap Management', labelEn: 'Level Roadmaps Management', icon: 'ti-map-2' },
    { to: '/approvals', label: 'Approve Level Skip Requests', labelVi: 'Approve Level Skip Requests', labelEn: 'Level Advance Approvals', icon: 'ti-clipboard-check', approvalBadge: true },
    { to: '/admin/cost-center', label: 'Training Cost Center', labelVi: 'Training Cost Center', labelEn: 'Training Cost Center', icon: 'ti-report-money' },
  ],
};

export default function AppHeader({ role, onRoleChange, title, crumb }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const {
    currentUser: authUser,
    approvals,
    gamification,
    openAiAssistant,
    logout,
    switchUser,
    openTalentProfile,
    theme,
    toggleTheme,
    language,
    t,
  } = useCourseStore();
  const [navOpen, setNavOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifFilter, setNotifFilter] = useState('ALL'); // 'ALL' | 'UNREAD'
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [inbox, setInbox] = useState(notifications.learnerInbox);

  const navRef = useRef(null);
  const roleRef = useRef(null);
  const notifRef = useRef(null);
  const profileRef = useRef(null);

  const effectiveRole = normalizeRole(role);
  const def = roleDefinition(effectiveRole);
  const workItems = ROLE_WORK_NAV[effectiveRole] || ROLE_WORK_NAV.learner;
  const selfItems = effectiveRole === 'learner' ? [] : LEARNER_SELF_NAV;
  const systemAdminItems = (effectiveRole === 'useradmin' || effectiveRole === 'sysadmin') ? SYSTEM_ADMIN_NAV : [];
  const profile = authUser && normalizeRole(authUser.role) === effectiveRole ? authUser : personaForRole(effectiveRole);
  const rolePersonaList = ROLE_ORDER.map((r) => personaForRole(r));
  const unreadCount = inbox.filter((n) => n.unread).length;
  const pendingApprovalCount = hasCapability(effectiveRole, 'canApproveLevelSkip')
    ? (approvals || []).filter((a) => a.status === 'PENDING').length
    : 0;
  const streakDays = gamification?.userStats?.streakDays ?? 0;

  const roleLabel = language === 'en' ? (def.labelEn || def.labelVi) : def.labelVi;
  const roleShort = language === 'en' ? (def.shortEn || def.shortVi) : def.shortVi;

  const filteredInbox = notifFilter === 'UNREAD' ? inbox.filter((n) => n.unread) : inbox;

  useEffect(() => {
    function handleClickOutside(e) {
      if (navRef.current && !navRef.current.contains(e.target)) setNavOpen(false);
      if (roleRef.current && !roleRef.current.contains(e.target)) setShowRoleMenu(false);
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotifications(false);
      if (profileRef.current && !profileRef.current.contains(e.target)) setShowProfileMenu(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleRoleSelect(nextRole) {
    const normalized = normalizeRole(nextRole);
    onRoleChange(normalized);
    switchUser(personaForRole(normalized).userId);
    setShowRoleMenu(false);
    navigate(ROLE_HOME[normalized] || '/learner');
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

  function handleNotificationClick(n) {
    setInbox((prev) => prev.map((item) => (item.id === n.id ? { ...item, unread: false } : item)));
    setShowNotifications(false);
    navigate(effectiveRole === 'learner' ? '/learner/calendar' : '/my-learning-calendar');
  }

  function renderNavItem(item) {
    const badge = item.approvalBadge ? (pendingApprovalCount > 0 ? String(pendingApprovalCount) : null) : item.badge;
    const displayLabel = language === 'en' ? (item.labelEn || item.label) : (item.labelVi || item.label);
    // An item may own several routes (a page with tabs). Where it does, ownership is
    // listed explicitly rather than left to prefix matching, which cannot tell a tab of
    // this page apart from a sibling nav item nested under the same path.
    const ownsCurrentPath = item.activePaths ? item.activePaths.includes(pathname) : null;
    return (
      <NavLink
        key={item.to}
        to={item.to}
        end={item.end}
        title={displayLabel}
        onClick={() => setNavOpen(false)}
        className={({ isActive }) => `app-nav-item ${(ownsCurrentPath ?? isActive) ? 'active' : ''}`}
      >
        <i className={`ti ${item.icon}`} aria-hidden="true" />
        <span style={{ flex: 1 }}>{displayLabel}</span>
        {badge && <span className="app-tab-badge" style={{ background: badge === 'AI' ? 'var(--ai-gradient)' : 'var(--amber)' }}>{badge}</span>}
      </NavLink>
    );
  }

  return (
    <header className="app-header">
      <div className="app-header-top">
        {/* Brand & Left Navigation Drawer */}
        <div className="app-header-brand" ref={navRef} style={{ position: 'relative' }}>
          <button
            type="button"
            className={`icon-btn sidebar-toggle-btn ${navOpen ? 'active' : ''}`}
            onClick={() => setNavOpen((v) => !v)}
            aria-label="Navigation Drawer"
            title="Toggle Navigation Menu"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
              <path d="M2.5 5H15.5M2.5 9H15.5M2.5 13H15.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
          <div className="brand-mark" style={{ background: 'linear-gradient(135deg, var(--bigc-green) 0%, #007A38 100%)', color: '#fff', width: 30, height: 30, flexShrink: 0 }}>
            <span style={{ color: '#fff', fontWeight: 900, fontSize: 12 }}>MM</span>
          </div>
          <div className="app-header-brand-text">
            <div className="brand-name" style={{ fontSize: 14 }}>
              MM<span style={{ color: 'var(--bigc-green)' }}>Learn</span>
            </div>
          </div>
          <span title={roleLabel}>
            <Badge tone={def.tone} icon={def.icon}>{roleShort}</Badge>
          </span>

          {/* Left Navigation Drawer */}
          <nav className={`app-nav-drawer ${navOpen ? 'open' : ''}`}>
            <div className="app-nav-drawer-group">
              <div className="app-nav-drawer-group-label">
                {language === 'en' ? `Work · ${roleShort}` : `${roleShort} workspace`}
              </div>
              {workItems.map(renderNavItem)}
            </div>
            {systemAdminItems.length > 0 && (
              <div className="app-nav-drawer-group">
                <div className="app-nav-drawer-group-label">
                  {language === 'en' ? 'System Administration' : 'System Administration'}
                </div>
                {systemAdminItems.map(renderNavItem)}
              </div>
            )}
            {selfItems.length > 0 && (
              <div className="app-nav-drawer-group">
                <div className="app-nav-drawer-group-label">
                  {language === 'en' ? 'My Learning' : 'My Learning'}
                </div>
                {selfItems.map(renderNavItem)}
              </div>
            )}
          </nav>
        </div>

        {/* Right Header Actions Bar */}
        <div className="app-header-actions" style={{ marginLeft: 'auto' }}>
          {/* 1. Theme Toggle Button */}
          <button
            type="button"
            className="app-theme-btn"
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            aria-label="Toggle Dark Light Theme"
          >
            <i className={`ti ${theme === 'dark' ? 'ti-sun' : 'ti-moon-stars'} ${theme === 'dark' ? 'dark' : 'light'}`} aria-hidden="true" />
            <span>{theme === 'dark' ? 'Dark' : 'Light'}</span>
          </button>

          {/* 3. AI Assistant Trigger */}
          <button
            type="button"
            className="app-ai-trigger-btn"
            onClick={() => openAiAssistant('tutor')}
            title={t('aiTutor', 'AI Tutor')}
          >
            <span className="app-ai-sparkle-icon">
              <i className="ti ti-sparkles" aria-hidden="true" />
            </span>
            <span>{t('aiTutor', 'AI Assistant')}</span>
          </button>

          {/* 4. Role View Dropdown Switcher */}
          <div ref={roleRef} style={{ position: 'relative' }}>
            <button
              type="button"
              className={`app-role-dropdown-btn ${showRoleMenu ? 'active' : ''}`}
              onClick={() => setShowRoleMenu((v) => !v)}
              title={language === 'en' ? 'Switch Role View' : 'Switch role perspective'}
            >
              <i className={`ti ${def.icon}`} style={{ color: 'var(--rail)', fontSize: 14 }} />
              <span className="app-role-label">{roleShort}</span>
              <i className="ti ti-chevron-down" style={{ fontSize: 11, color: 'var(--ink-faint)', marginLeft: 2 }} />
            </button>

            {showRoleMenu && (
              <div className="app-role-popover">
                <div className="app-role-popover-title">
                  {t('select_role_view', 'Choose Role Perspective (6-Permission Demo):')}
                </div>
                <div className="app-role-list">
                  {ROLE_ORDER.map((r) => {
                    const rDef = roleDefinition(r);
                    const isSelected = r === effectiveRole;
                    const label = language === 'en' ? (rDef.labelEn || rDef.labelVi) : rDef.labelVi;
                    const short = language === 'en' ? (rDef.shortEn || rDef.shortVi) : rDef.shortVi;
                    return (
                      <button
                        key={r}
                        type="button"
                        className={`app-role-option ${isSelected ? 'active' : ''}`}
                        onClick={() => handleRoleSelect(r)}
                      >
                        <div className="app-role-option-icon">
                          <i className={`ti ${rDef.icon}`} />
                        </div>
                        <div className="app-role-option-text">
                          <div className="app-role-option-name">{short}</div>
                          <div className="app-role-option-desc">{label}</div>
                        </div>
                        {isSelected && <i className="ti ti-check app-role-check" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* 5. Gamification Streak Badge */}
          <div className="app-streak-badge" title={language === 'en' ? `${streakDays} days learning streak` : `${streakDays}-day learning streak`}>
            <i className="ti ti-flame app-streak-icon" aria-hidden="true" />
            <span className="app-streak-val">{streakDays}</span>
            <span className="app-streak-unit">{t('days', 'days')}</span>
          </div>

          {/* 6. Notifications Center */}
          <div ref={notifRef} style={{ position: 'relative' }}>
            <button
              type="button"
              className={`app-notif-btn ${showNotifications ? 'active' : ''}`}
              onClick={() => setShowNotifications((v) => !v)}
              aria-label="Notifications"
              title={t('notifications', 'Notifications')}
            >
              <i className="ti ti-bell" aria-hidden="true" />
              {unreadCount > 0 && (
                <span className="app-notif-badge">{unreadCount}</span>
              )}
            </button>

            {showNotifications && (
              <div className="app-notif-popover">
                <div className="app-notif-popover-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--ink)' }}>
                      {t('notifications', 'Notifications')}
                    </div>
                    {unreadCount > 0 && (
                      <span className="badge badge-rust" style={{ fontSize: 10, padding: '1px 6px' }}>
                        {unreadCount} {language === 'en' ? 'new' : 'new'}
                      </span>
                    )}
                  </div>
                  {unreadCount > 0 && (
                    <button type="button" onClick={markAllRead} className="app-link-btn" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
                      <i className="ti ti-checks" /> {t('markAllRead', 'Mark as read')}
                    </button>
                  )}
                </div>

                <div className="app-notif-tabs">
                  <button 
                    type="button"
                    className={`app-notif-tab ${notifFilter === 'ALL' ? 'active' : ''}`}
                    onClick={() => setNotifFilter('ALL')}
                  >
                    {t('all_notifications', 'All')} ({inbox.length})
                  </button>
                  <button 
                    type="button"
                    className={`app-notif-tab ${notifFilter === 'UNREAD' ? 'active' : ''}`}
                    onClick={() => setNotifFilter('UNREAD')}
                  >
                    {t('unread_notifications', 'Unread')} ({unreadCount})
                  </button>
                </div>

                <div className="app-notif-list">
                  {filteredInbox.length === 0 ? (
                    <div className="app-notif-empty">
                      <div className="app-notif-empty-icon">
                        <i className="ti ti-bell-check" />
                      </div>
                      <div style={{ fontWeight: 700, color: 'var(--ink)', fontSize: 13 }}>
                        {t('notifications_all_caught_up', 'You are all caught up!')}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 3 }}>
                        {t('notifications_empty_sub', 'No new notifications to act on.')}
                      </div>
                    </div>
                  ) : (
                    filteredInbox.map((n) => {
                      const isCourse = n.type === 'COURSE_ASSIGNED' || n.type === 'ASSIGNED';
                      const isDeadline = n.type === 'DEADLINE_REMINDER' || n.type === 'EMPLOYEE_OVERDUE';
                      const isProgress = n.type === 'COURSE_UNFINISHED' || n.type === 'EMPLOYEE_INACTIVE';
                      
                      const iconCls = isCourse ? 'ti-book-2' : isDeadline ? 'ti-clock-alert' : isProgress ? 'ti-player-play' : 'ti-alert-triangle';
                      const iconTone = isCourse ? 'blue' : isDeadline ? 'amber' : isProgress ? 'sage' : 'rust';
                      const displayTitle = language === 'en' ? (n.titleEn || n.title) : (n.titleVi || n.title);
                      const displayMessage = language === 'en' ? (n.messageEn || n.message) : (n.messageVi || n.message);
                      const displayTime = language === 'en' ? (n.timeEn || n.time) : (n.timeVi || n.time);
                      const displayTag = language === 'en' ? (n.tagEn || (isCourse ? 'Mandatory' : isDeadline ? 'Due Soon' : 'Reminder')) : (n.tagVi || (isCourse ? 'Mandatory' : isDeadline ? 'Deadline' : 'Reminder'));

                      return (
                        <div 
                          key={n.id} 
                          className={`app-notif-item ${n.unread ? 'unread' : ''}`}
                          onClick={() => handleNotificationClick(n)}
                        >
                          <div className={`app-notif-icon-circle tone-${iconTone}`}>
                            <i className={`ti ${iconCls}`} aria-hidden="true" />
                          </div>
                          <div className="app-notif-body">
                            <div className="app-notif-title-row">
                              <span className="app-notif-title">{displayTitle}</span>
                              {n.unread && <span className="app-notif-unread-dot" />}
                            </div>
                            <div className="app-notif-desc">{displayMessage}</div>
                            <div className="app-notif-meta">
                              <span className={`app-notif-tag tone-${iconTone}`}>{displayTag}</span>
                              <span className="app-notif-dot-sep">&middot;</span>
                              <span className="app-notif-time">{displayTime}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="app-notif-footer">
                  <button
                    type="button"
                    className="app-notif-footer-btn"
                    onClick={() => {
                      setShowNotifications(false);
                      navigate(effectiveRole === 'learner' ? '/learner/calendar' : '/my-learning-calendar');
                    }}
                  >
                    <i className="ti ti-calendar-event" /> {t('view_calendar_tasks', 'View Learning Calendar & Tasks')} &rarr;
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 7. User Profile Pill & Account Popover */}
          <div ref={profileRef} style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => setShowProfileMenu((v) => !v)}
              className={`app-profile-pill-btn ${showProfileMenu ? 'active' : ''}`}
              aria-label="User Profile Menu"
            >
              <div className="app-avatar-circle">
                {profile.avatar || profile.fullName.slice(0, 2).toUpperCase()}
              </div>
              <div className="app-profile-info">
                <div className="app-profile-name">{profile.fullName}</div>
                <div className="app-profile-sub">
                  {profile.employeeCode} &middot; {roleShort}
                </div>
              </div>
              <i className="ti ti-chevron-down app-profile-chevron" />
            </button>

            {showProfileMenu && (
              <div className="app-profile-popover">
                <div className="app-profile-header">
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <div className="app-avatar-large">
                      {profile.avatar || profile.fullName.slice(0, 2).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--ink)' }}>
                        {profile.fullName}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 1 }}>
                        {profile.position}
                      </div>
                      <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--ink-faint)', marginTop: 3 }}>
                        {profile.employeeCode} &middot; {profile.email}
                      </div>
                    </div>
                  </div>
                  <div style={{ marginTop: 10, display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                    <Badge tone={roleDefinition(profile.role).tone}>{roleLabel}</Badge>
                    <Badge tone="slate">{levelShortLabel(profile.level)}</Badge>
                  </div>
                  <div style={{ marginTop: 12 }}>
                    <Button
                      variant="primary"
                      size="sm"
                      block
                      icon="ti-id-badge-2"
                      onClick={() => {
                        setShowProfileMenu(false);
                        openTalentProfile(profile);
                      }}
                    >
                      {t('viewTalentProfile', 'View Competency Profile')}
                    </Button>
                  </div>
                </div>

                <div className="app-profile-section">
                  <div className="app-profile-section-title">
                    <i className="ti ti-users-group" /> {t('switchRoleDemo', 'Quick-switch 6 personas (demo):')}
                  </div>
                  <div className="app-persona-list">
                    {rolePersonaList.map((u) => {
                      const isCurrent = u.userId === profile.userId;
                      const uRoleDef = roleDefinition(u.role);
                      return (
                        <button
                          key={u.userId}
                          type="button"
                          onClick={() => handleSwitchPersona(u)}
                          className={`app-persona-item ${isCurrent ? 'active' : ''}`}
                        >
                          <div className="app-persona-avatar" style={{ background: isCurrent ? 'var(--rail)' : 'var(--paper-sunken)' }}>
                            {u.avatar || u.fullName.slice(0, 2).toUpperCase()}
                          </div>
                          <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                            <div className="app-persona-name">
                              {u.fullName}
                              {isCurrent && <span className="app-persona-current-tag">{t('active_tag', 'Selecting')}</span>}
                            </div>
                            <div className="app-persona-role">
                              {language === 'en' ? (uRoleDef.shortEn || uRoleDef.shortVi) : uRoleDef.shortVi} &middot; {levelShortLabel(u.level)}
                            </div>
                          </div>
                          {isCurrent && <i className="ti ti-check" style={{ color: 'var(--rail)', fontSize: 16 }} />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="app-profile-footer">
                  <button
                    type="button"
                    className="app-signout-btn"
                    onClick={handleLogout}
                  >
                    <i className="ti ti-logout" /> {t('signOut', 'Sign Out')}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sub-header Breadcrumb Row */}
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

