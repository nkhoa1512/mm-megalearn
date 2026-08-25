import React, { useState, useRef, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useCourseStore } from '../state/CourseStore';
import { personaForRole, notifications } from '../data/mockData';
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

export default function AppHeader({ role, onRoleChange, title, crumb }) {
  const navigate = useNavigate();
  const { currentUser: authUser, approvals, gamification, openAiAssistant, logout, switchUser, openTalentProfile } = useCourseStore();
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
    return (
      <NavLink
        key={item.to}
        to={item.to}
        end={item.end}
        title={item.label}
        onClick={() => setNavOpen(false)}
        className={({ isActive }) => `app-nav-item ${isActive ? 'active' : ''}`}
      >
        <i className={`ti ${item.icon}`} aria-hidden="true" />
        <span style={{ flex: 1 }}>{item.label}</span>
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
            aria-label="Mở / Đóng danh sách điều hướng"
            title="Mở / Đóng danh sách điều hướng"
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
          <span title={def.labelVi}>
            <Badge tone={def.tone} icon={def.icon}>{def.shortVi}</Badge>
          </span>

          {/* Cột điều hướng dạng dropdown bên trái, bật/tắt bằng nút hamburger —
              DOM luôn render (để các trang khác/kiểm thử tìm thấy nội dung),
              chỉ ẩn/hiện bằng CSS class "open" thay vì tháo lắp khỏi cây DOM. */}
          <nav className={`app-nav-drawer ${navOpen ? 'open' : ''}`}>
            <div className="app-nav-drawer-group-label">Công việc của {def.shortVi}</div>
            {workItems.map(renderNavItem)}
            {selfItems.length > 0 && (
              <>
                <div className="app-nav-drawer-group-label" style={{ marginTop: 10 }}>Học tập của tôi</div>
                {selfItems.map(renderNavItem)}
              </>
            )}
          </nav>
        </div>

        <div className="app-header-actions" style={{ marginLeft: 'auto' }}>
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
