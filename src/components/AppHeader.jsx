import React, { useState, useRef, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useCourseStore } from '../state/CourseStore';
import { personaForRole, notifications } from '../data/mockData';
import { normalizeRole, roleDefinition, hasCapability, ROLE_HOME, ROLE_ORDER } from '../data/roles';
import { levelShortLabel } from '../data/levelSystem';
import { Button, Badge } from './ui';

// Nhóm "Học tập của tôi" — giống hệt nhau cho cả 6 role, vì role nào cũng là Learner.
const LEARNER_SELF_NAV = [
  { to: '/my-learning', label: 'Khóa Học Của Tôi', labelVi: 'Khóa Học Của Tôi', labelEn: 'My Courses', icon: 'ti-book-2' },
  { to: '/my-learning-dashboard', label: 'Bảng Điều Khiển Học Tập', labelVi: 'Bảng Điều Khiển Học Tập', labelEn: 'Learning Dashboard', icon: 'ti-layout-dashboard' },
  { to: '/my-learning-path', label: 'Lộ Trình Học Tập', labelVi: 'Lộ Trình Học Tập', labelEn: 'Learning Roadmap', icon: 'ti-git-branch' },
  { to: '/my-certificates', label: 'Chứng Chỉ Của Tôi', labelVi: 'Chứng Chỉ Của Tôi', labelEn: 'My Certificates', icon: 'ti-certificate' },
  { to: '/trainer-ratings', label: 'Đánh Giá Giảng Viên (CSAT)', labelVi: 'Đánh Giá Giảng Viên (CSAT)', labelEn: 'Trainer Ratings (CSAT)', icon: 'ti-star' },
];

// Nhóm "Công việc của <role>" — đặc thù từng role (dời nguyên từ Sidebar.jsx cũ).
const ROLE_WORK_NAV = {
  learner: [
    { to: '/learner', label: 'Bảng Điều Khiển Học Tập', labelVi: 'Bảng Điều Khiển Học Tập', labelEn: 'Learning Dashboard', icon: 'ti-layout-dashboard', end: true },
    { to: '/learner/courses', label: 'Khóa Học Của Tôi', labelVi: 'Khóa Học Của Tôi', labelEn: 'My Courses', icon: 'ti-book-2' },
    { to: '/learner/catalog', label: 'Danh Mục Toàn Bộ Khóa Học', labelVi: 'Danh Mục Toàn Bộ Khóa Học', labelEn: 'Full Course Catalog', icon: 'ti-stack-2' },
    { to: '/learner/classrooms', label: 'Lớp Trực Tiếp & QR Check-in', labelVi: 'Lớp Trực Tiếp & QR Check-in', labelEn: 'Live Classrooms & QR', icon: 'ti-chalkboard' },
    { to: '/learner/paths', label: 'Lộ Trình Học Tập', labelVi: 'Lộ Trình Học Tập', labelEn: 'Learning Roadmap', icon: 'ti-git-branch' },
    { to: '/learner/ai-hub', label: 'AI Learning Hub', labelVi: 'AI Learning Hub', labelEn: 'AI Learning Hub', icon: 'ti-sparkles', badge: 'AI' },
    { to: '/learner/certificates', label: 'Chứng Chỉ', labelVi: 'Chứng Chỉ', labelEn: 'Certificates', icon: 'ti-certificate' },
    { to: '/learner/history', label: 'Lịch Sử Học Tập', labelVi: 'Lịch Sử Học Tập', labelEn: 'Learning History', icon: 'ti-history' },
    { to: '/trainer-ratings', label: 'Đánh Giá Giảng Viên (CSAT)', labelVi: 'Đánh Giá Giảng Viên (CSAT)', labelEn: 'Trainer Ratings (CSAT)', icon: 'ti-star' },
  ],
  manager: [
    { to: '/manager', label: 'Bảng Điều Khiển Đội Ngũ', labelVi: 'Bảng Điều Khiển Đội Ngũ', labelEn: 'Team Dashboard', icon: 'ti-layout-dashboard', end: true },
    { to: '/manager/team', label: 'Nhân Viên & Khoảng Cách Năng Lực', labelVi: 'Nhân Viên & Khoảng Cách Năng Lực', labelEn: 'Team Skills & Competencies', icon: 'ti-users' },
    { to: '/manager/courses', label: 'Khóa Học Của Phòng Ban', labelVi: 'Khóa Học Của Phòng Ban', labelEn: 'Department Courses', icon: 'ti-stack-2' },
    { to: '/manager/catalog', label: 'Danh Mục Toàn Bộ Khóa Học', labelVi: 'Danh Mục Toàn Bộ Khóa Học', labelEn: 'Full Course Catalog', icon: 'ti-database' },
    { to: '/manager/reports', label: 'Báo Cáo & Tuân Thủ', labelVi: 'Báo Cáo & Tuân Thủ', labelEn: 'Compliance & Reports', icon: 'ti-chart-bar' },
  ],
  trainer: [
    { to: '/trainer', label: 'Lớp Giảng Dạy & Hoạt Động Đào Tạo', labelVi: 'Lớp Giảng Dạy & Hoạt Động Đào Tạo', labelEn: 'Teaching Classes & Training Ops', icon: 'ti-school', end: true },
    { to: '/admin/courses', label: 'Tạo & Quản Lý Khóa Học', labelVi: 'Tạo & Quản Lý Khóa Học', labelEn: 'Create & Manage Courses', icon: 'ti-stack-2' },
    { to: '/trainer/reports', label: 'Báo Cáo ROI & Kirkpatrick', labelVi: 'Báo Cáo ROI & Kirkpatrick', labelEn: 'ROI & Kirkpatrick Reports', icon: 'ti-chart-histogram' },
  ],
  hrbp: [
    { to: '/hrbp', label: 'Phân Tích Nhân Tài & Tuân Thủ', labelVi: 'Phân Tích Nhân Tài & Tuân Thủ', labelEn: 'Talent & Compliance Analytics', icon: 'ti-chart-radar', end: false },
    { to: '/hrbp/catalog', label: 'Danh Mục Toàn Bộ Khóa Học', labelVi: 'Danh Mục Toàn Bộ Khóa Học', labelEn: 'Full Course Catalog', icon: 'ti-database' },
    { to: '/trainer', label: 'Lớp Giảng Dạy & Live QR', labelVi: 'Lớp Giảng Dạy & Live QR', labelEn: 'Teaching Classes & Live QR', icon: 'ti-school' },
  ],
  useradmin: [
    { to: '/user-admin', label: 'Quản Trị Nhân Sự & Cơ Cấu Tổ Chức', labelVi: 'Quản Trị Nhân Sự & Cơ Cấu Tổ Chức', labelEn: 'User & Org Administration', icon: 'ti-users-group', end: true },
    { to: '/admin/courses', label: 'Tạo & Quản Lý Khóa Học', labelVi: 'Tạo & Quản Lý Khóa Học', labelEn: 'Create & Manage Courses', icon: 'ti-stack-2' },
    { to: '/trainer', label: 'Lớp Giảng Dạy & Live QR', labelVi: 'Lớp Giảng Dạy & Live QR', labelEn: 'Teaching Classes & Live QR', icon: 'ti-school' },
    { to: '/admin/roadmaps', label: 'Quản Lý Lộ Trình Cấp Bậc', labelVi: 'Quản Lý Lộ Trình Cấp Bậc', labelEn: 'Level Roadmaps Management', icon: 'ti-map-2' },
    { to: '/approvals', label: 'Duyệt Đơn Học Vượt Cấp', labelVi: 'Duyệt Đơn Học Vượt Cấp', labelEn: 'Level Advance Approvals', icon: 'ti-clipboard-check', approvalBadge: true },
  ],
  sysadmin: [
    { to: '/sysadmin', label: 'Quản Trị Hệ Thống & Bảo Mật', labelVi: 'Quản Trị Hệ Thống & Bảo Mật', labelEn: 'System Admin & Security', icon: 'ti-server-cog', end: true },
    { to: '/admin/courses', label: 'Tạo & Quản Lý Khóa Học', labelVi: 'Tạo & Quản Lý Khóa Học', labelEn: 'Create & Manage Courses', icon: 'ti-stack-2' },
    { to: '/trainer', label: 'Lớp Giảng Dạy & Live QR', labelVi: 'Lớp Giảng Dạy & Live QR', labelEn: 'Teaching Classes & Live QR', icon: 'ti-school' },
    { to: '/admin/roadmaps', label: 'Quản Lý Lộ Trình Cấp Bậc', labelVi: 'Quản Lý Lộ Trình Cấp Bậc', labelEn: 'Level Roadmaps Management', icon: 'ti-map-2' },
    { to: '/approvals', label: 'Duyệt Đơn Học Vượt Cấp', labelVi: 'Duyệt Đơn Học Vượt Cấp', labelEn: 'Level Advance Approvals', icon: 'ti-clipboard-check', approvalBadge: true },
  ],
};

export default function AppHeader({ role, onRoleChange, title, crumb }) {
  const navigate = useNavigate();
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
    toggleLanguage,
    t,
  } = useCourseStore();
  const [navOpen, setNavOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [inbox, setInbox] = useState(notifications.learnerInbox);
  const navRef = useRef(null);
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

  const roleLabel = language === 'en' ? (def.labelEn || def.labelVi) : def.labelVi;
  const roleShort = language === 'en' ? (def.shortEn || def.shortVi) : def.shortVi;

  useEffect(() => {
    function handleClickOutside(e) {
      if (navRef.current && !navRef.current.contains(e.target)) setNavOpen(false);
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

  function renderNavItem(item) {
    const badge = item.approvalBadge ? (pendingApprovalCount > 0 ? String(pendingApprovalCount) : null) : item.badge;
    const displayLabel = language === 'en' ? (item.labelEn || item.label) : (item.labelVi || item.label);
    return (
      <NavLink
        key={item.to}
        to={item.to}
        end={item.end}
        title={displayLabel}
        onClick={() => setNavOpen(false)}
        className={({ isActive }) => `app-nav-item ${isActive ? 'active' : ''}`}
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
        <div className="app-header-brand" ref={navRef} style={{ position: 'relative' }}>
          <button
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
            <div className="brand-name" style={{ fontSize: 14 }}>MM Mega<span style={{ color: 'var(--bigc-green)' }}>Learn</span></div>
          </div>
          <span title={roleLabel}>
            <Badge tone={def.tone} icon={def.icon}>{roleShort}</Badge>
          </span>

          {/* Cột điều hướng dạng dropdown bên trái, bật/tắt bằng nút hamburger */}
          <nav className={`app-nav-drawer ${navOpen ? 'open' : ''}`}>
            <div className="app-nav-drawer-group">
              <div className="app-nav-drawer-group-label">
                {language === 'en' ? `Work · ${roleShort}` : `Công việc của ${roleShort}`}
              </div>
              {workItems.map(renderNavItem)}
            </div>
            {selfItems.length > 0 && (
              <div className="app-nav-drawer-group">
                <div className="app-nav-drawer-group-label">
                  {language === 'en' ? 'My Learning' : 'Học tập của tôi'}
                </div>
                {selfItems.map(renderNavItem)}
              </div>
            )}
          </nav>
        </div>

        <div className="app-header-actions" style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Nút Toggle Theme Sáng / Tối Nổi Bật */}
          <button
            className="btn btn-sm"
            onClick={toggleTheme}
            title={theme === 'dark' ? (language === 'en' ? 'Switch to Light Theme' : 'Chuyển sang Giao Diện Sáng') : (language === 'en' ? 'Switch to Dark Theme' : 'Chuyển sang Giao Diện Tối')}
            aria-label="Toggle Dark Light Theme"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '4px 12px',
              height: 34,
              fontSize: 12.5,
              fontWeight: 700,
              borderRadius: 8,
              border: '1px solid var(--line-strong)',
              background: theme === 'dark' ? '#1e293b' : 'var(--paper-sunken)',
              color: theme === 'dark' ? '#f59e0b' : 'var(--ink)',
              cursor: 'pointer',
            }}
          >
            <span style={{ fontSize: 14 }}>{theme === 'dark' ? '☀️' : '🌙'}</span>
            <span>{theme === 'dark' ? (language === 'en' ? 'Dark' : 'Tối') : (language === 'en' ? 'Light' : 'Sáng')}</span>
          </button>

          {/* Nút Toggle Ngôn Ngữ Anh / Việt Nổi Bật */}
          <button
            className="btn btn-sm"
            onClick={toggleLanguage}
            title={language === 'en' ? 'Chuyển sang Tiếng Việt' : 'Switch to English'}
            aria-label="Toggle Language"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '4px 12px',
              height: 34,
              fontSize: 12.5,
              fontWeight: 800,
              borderRadius: 8,
              border: '1px solid var(--rail)',
              background: 'var(--rail-soft)',
              color: 'var(--rail-soft-text)',
              cursor: 'pointer',
            }}
          >
            <span style={{ fontSize: 14 }}>{language === 'en' ? '🇺🇸' : '🇻🇳'}</span>
            <span>{language === 'en' ? 'EN' : 'VI'}</span>
          </button>

          <Button variant="ai" size="sm" icon="ti-sparkles" onClick={() => openAiAssistant('tutor')}>{t('aiTutor', 'AI Tutor')}</Button>
          
          <select className="role-switcher-select" value={effectiveRole} onChange={handleRoleSwitch} title="Demo Persona">
            {ROLE_ORDER.map((r) => {
              const rDef = roleDefinition(r);
              return <option key={r} value={r}>{language === 'en' ? (rDef.shortEn || rDef.shortVi) : rDef.shortVi}</option>;
            })}
          </select>
          
          <Badge tone="rust" icon="ti-flame">{streakDays} {t('days', 'days')}</Badge>
          
          <div style={{ position: 'relative' }}>
            <button className="icon-btn" onClick={() => setShowNotifications((v) => !v)} aria-label="Notifications" style={{ position: 'relative' }}>
              <i className="ti ti-bell" aria-hidden="true" />
              {unreadCount > 0 && <span className="app-notif-dot" />}
            </button>
            {showNotifications && (
              <div className="card card-pad app-popover">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div style={{ fontWeight: 800, fontSize: 14 }}>{t('notifications', 'Notifications')}</div>
                  <button onClick={markAllRead} className="app-link-btn">{t('markAllRead', 'Mark all as read')}</button>
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
              <div className="app-profile-pill-text">
                <div style={{ fontSize: 12, fontWeight: 700, lineHeight: 1.2, color: 'var(--ink)' }}>{profile.fullName}</div>
                <div style={{ fontSize: 10.5, color: 'var(--ink-faint)', fontFamily: 'var(--font-mono)' }}>{profile.employeeCode} &middot; {profile.position}</div>
              </div>
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
                    <Button variant="primary" size="sm" block icon="ti-id-badge-2" onClick={() => { setShowProfileMenu(false); openTalentProfile(profile); }}>{t('viewTalentProfile', 'View Talent Profile')}</Button>
                  </div>
                </div>
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--ink-faint)', marginBottom: 6 }}>{t('switchRoleDemo', 'Quick Persona Switch:')}</div>
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
                  <Button variant="danger" size="sm" block icon="ti-logout" onClick={handleLogout}>{t('signOut', 'Sign Out')}</Button>
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
