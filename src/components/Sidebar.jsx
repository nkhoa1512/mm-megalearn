import React from 'react';
import { NavLink } from 'react-router-dom';
import { useCourseStore } from '../state/CourseStore';
import { personaForRole, orgPathLabel } from '../data/mockData';
import { normalizeRole, roleDefinition, managedScopeLabel, hasCapability } from '../data/roles';
import { levelShortLabel } from '../data/levelSystem';

// Nhóm "Học tập của tôi" — giống hệt nhau cho cả 6 role, vì role nào cũng là Learner.
const LEARNER_SELF_NAV = [
  { to: '/my-learning', label: 'Khóa Học Của Tôi', icon: 'ti-book-2' },
  { to: '/my-certificates', label: 'Chứng Chỉ Của Tôi', icon: 'ti-certificate' },
];

// Nhóm "Công việc của <role>" — đặc thù từng role.
const ROLE_WORK_NAV = {
  learner: [
    { to: '/learner', label: 'Bảng Điều Khiển Học Tập', icon: 'ti-layout-dashboard', end: true },
    { to: '/learner/courses', label: 'Khóa Học Của Tôi', icon: 'ti-book-2' },
    { to: '/learner/classrooms', label: 'Lớp Trực Tiếp & QR Check-in', icon: 'ti-chalkboard' },
    { to: '/learner/paths', label: 'Lộ Trình Nghề Nghiệp 70/20/10', icon: 'ti-git-branch' },
    { to: '/learner/ai-hub', label: 'AI Learning Hub', icon: 'ti-sparkles', badge: 'AI' },
    { to: '/learner/certificates', label: 'Chứng Chỉ', icon: 'ti-certificate' },
    { to: '/learner/history', label: 'Lịch Sử Học Tập', icon: 'ti-history' },
  ],
  manager: [
    { to: '/manager', label: 'Bảng Điều Khiển Đội Ngũ', icon: 'ti-layout-dashboard', end: true },
    { to: '/manager/team', label: 'Nhân Viên & Khoảng Cách Năng Lực', icon: 'ti-users' },
    { to: '/manager/approvals', label: 'Duyệt Đơn Học Vượt Cấp', icon: 'ti-clipboard-check', approvalBadge: true },
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
    { to: '/approvals', label: 'Duyệt Đơn Học Vượt Cấp', icon: 'ti-clipboard-check', approvalBadge: true },
  ],
  hrbp: [
    { to: '/hrbp', label: 'Ma Trận Khoảng Cách Năng Lực', icon: 'ti-chart-radar', end: true },
    { to: '/hrbp/succession', label: 'Lộ Trình Kế Nhiệm 70-20-10', icon: 'ti-git-branch' },
    { to: '/hrbp/compliance', label: 'Báo Cáo Tuân Thủ Theo Vùng', icon: 'ti-shield-check' },
    { to: '/approvals', label: 'Duyệt Đơn Học Vượt Cấp', icon: 'ti-clipboard-check', approvalBadge: true },
  ],
  useradmin: [
    { to: '/user-admin', label: 'Danh Mục 100+ Nhân Sự', icon: 'ti-address-book', end: true },
    { to: '/user-admin/hierarchy', label: 'Cây Cơ Cấu Tổ Chức 2 Nhánh', icon: 'ti-binary-tree' },
    { to: '/user-admin/job-levels', label: 'Khung 7 Cấp Bậc Định Biên', icon: 'ti-id-badge-2' },
    { to: '/user-admin/allocation', label: 'Phân Bổ Khóa Học', icon: 'ti-stack-2' },
    { to: '/user-admin/trainers', label: 'Phân Công Giảng Viên Đứng Lớp', icon: 'ti-school' },
    { to: '/approvals', label: 'Duyệt Đơn Học Vượt Cấp', icon: 'ti-clipboard-check', approvalBadge: true },
  ],
  sysadmin: [
    { to: '/sysadmin', label: 'Hạ Tầng IT & API Pipeline', icon: 'ti-server-cog', end: true },
    { to: '/sysadmin/audit', label: 'Nhật Ký Bảo Mật (Audit Logs)', icon: 'ti-shield-check' },
    { to: '/sysadmin/policies', label: 'Chính Sách Chống Gian Lận', icon: 'ti-lock-access' },
    { to: '/sysadmin/roles', label: 'Quản Trị Toàn Bộ 6 Role', icon: 'ti-users-group' },
    { to: '/sysadmin/org-config', label: 'Cấu Hình HRIS & Cây Tổ Chức', icon: 'ti-settings' },
    { to: '/approvals', label: 'Duyệt Đơn Học Vượt Cấp', icon: 'ti-clipboard-check', approvalBadge: true },
  ],
};

export default function Sidebar({ role, collapsed }) {
  const { currentUser: authUser, approvals } = useCourseStore();
  const effectiveRole = normalizeRole(role);
  const def = roleDefinition(effectiveRole);
  const workItems = ROLE_WORK_NAV[effectiveRole] || ROLE_WORK_NAV.learner;

  // Learner đã có "Khóa học của tôi" ngay trong nhóm công việc của mình.
  const selfItems = effectiveRole === 'learner' ? [] : LEARNER_SELF_NAV;

  const profile =
    authUser && normalizeRole(authUser.role) === effectiveRole ? authUser : personaForRole(effectiveRole);

  const pendingApprovalCount = hasCapability(effectiveRole, 'canApproveLevelSkip')
    ? (approvals || []).filter((a) => a.status === 'PENDING').length
    : 0;

  function renderItem(item) {
    const badge = item.approvalBadge
      ? (pendingApprovalCount > 0 ? String(pendingApprovalCount) : null)
      : item.badge;
    return (
      <NavLink
        key={item.to}
        to={item.to}
        end={item.end}
        className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
      >
        <i className={`ti ${item.icon}`} aria-hidden="true" />
        <span style={{ flex: 1 }}>{item.label}</span>
        {badge && (
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              padding: '1px 6px',
              borderRadius: 10,
              background: badge === 'AI' ? 'var(--ai-gradient)' : 'var(--amber)',
              color: '#fff',
            }}
          >
            {badge}
          </span>
        )}
      </NavLink>
    );
  }

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="brand">
        <div
          className="brand-mark"
          style={{
            background: 'linear-gradient(135deg, var(--bigc-green) 0%, #007A38 100%)',
            color: '#fff',
            fontWeight: 900,
            boxShadow: '0 2px 8px rgba(0, 158, 73, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
          }}
        >
          <span style={{ color: '#fff', fontWeight: 900, fontSize: 13 }}>MM</span>
          <span style={{ position: 'absolute', bottom: -2, right: -2, width: 8, height: 8, borderRadius: '50%', background: 'var(--mm-red)', border: '1.5px solid #fff' }} />
        </div>
        <div>
          <div className="brand-name" style={{ fontWeight: 800, color: 'var(--ink)' }}>
            MM Mega<span style={{ color: 'var(--bigc-green)' }}>Learn</span>
          </div>
          <div className="brand-sub" style={{ fontSize: 10, color: 'var(--ink-faint)', letterSpacing: '0.05em' }}>
            Big C &amp; MM Mega Market
          </div>
        </div>
      </div>

      <div
        className="role-pill"
        style={{
          background: `var(--${def.tone}-soft)`,
          color: `var(--${def.tone}-soft-text)`,
        }}
        title={`Role ${def.rank}/6 · Quản lý: ${managedScopeLabel(effectiveRole)}`}
      >
        <i className={`ti ${def.icon}`} aria-hidden="true" />
        <div>
          <div className="role-pill-label">Đang truy cập với vai trò {def.rank}/6</div>
          <div className="role-pill-value">{def.labelVi}</div>
        </div>
      </div>

      {profile && (
        <div className="org-pill" title="Cấp bậc định biên & đơn vị công tác">
          <i className="ti ti-sitemap" aria-hidden="true" />
          <div>
            <div className="role-pill-label">{profile.fullName}</div>
            <div className="org-pill-value">{levelShortLabel(profile.level)}</div>
            <div className="org-pill-value" style={{ opacity: 0.85 }}>
              {profile.storeName ? `${profile.storeName}` : `MMVN · ${orgPathLabel(profile)}`}
            </div>
          </div>
        </div>
      )}

      <div className="nav-group-label">Công việc của {def.shortVi}</div>
      <nav>{workItems.map(renderItem)}</nav>

      {selfItems.length > 0 && (
        <>
          <div className="nav-group-label" style={{ marginTop: 14 }}>Học tập của tôi</div>
          <nav>{selfItems.map(renderItem)}</nav>
        </>
      )}

      <div className="sidebar-foot">
        MM Mega Market &middot; LMS 2026 Production Standard
      </div>
    </aside>
  );
}
