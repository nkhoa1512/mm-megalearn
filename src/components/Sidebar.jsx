import React from 'react';
import { NavLink } from 'react-router-dom';
import { useCourseStore } from '../state/CourseStore';
import { currentUser, managerUser, adminUser, orgPathLabel } from '../data/mockData';

const PROFILE_BY_ROLE = {
  learner: currentUser,
  manager: managerUser,
  admin: adminUser,
  hrbp: managerUser,
  trainer: adminUser,
  sysadmin: adminUser,
  useradmin: adminUser,
};

const NAV_BY_ROLE = {
  learner: [
    { to: '/learner', label: 'Dashboard', icon: 'ti-layout-dashboard', end: true },
    { to: '/learner/courses', label: 'My Courses', icon: 'ti-book-2' },
    { to: '/learner/classrooms', label: 'Classrooms & QR Check-in', icon: 'ti-chalkboard' },
    { to: '/learner/paths', label: 'Learning Paths & 70/20/10', icon: 'ti-git-branch' },
    { to: '/learner/ai-hub', label: 'AI Learning Hub & SOPs', icon: 'ti-sparkles', badge: 'AI' },
    { to: '/learner/leaderboard', label: 'Leaderboard & XP', icon: 'ti-trophy' },
    { to: '/learner/certificates', label: 'Certificates', icon: 'ti-certificate' },
    { to: '/learner/history', label: 'Learning History', icon: 'ti-history' },
  ],
  manager: [
    { to: '/manager', label: 'Team Dashboard', icon: 'ti-layout-dashboard', end: true },
    { to: '/manager/team', label: 'Direct Reports & Skill Gaps', icon: 'ti-users' },
    { to: '/manager/approvals', label: 'Course Approvals', icon: 'ti-circle-check', badge: '2' },
    { to: '/manager/courses', label: 'Team Courses', icon: 'ti-stack-2' },
    { to: '/manager/reports', label: 'Reports & Compliance', icon: 'ti-chart-bar' },
    { to: '/manager/learning', label: 'My Learning', icon: 'ti-book-2' },
    { to: '/manager/certificates', label: 'My Certificates', icon: 'ti-certificate' },
  ],
  hrbp: [
    { to: '/manager/reports', label: 'HRBP Regional Analytics', icon: 'ti-chart-pie', end: true },
    { to: '/manager/team', label: 'Talent Pipelines & Gaps', icon: 'ti-users' },
    { to: '/admin/reports', label: 'Compliance & Heatmap', icon: 'ti-chart-histogram' },
  ],
  trainer: [
    { to: '/admin/training-ops', label: 'Trainer Hub & Classrooms', icon: 'ti-school', end: true },
    { to: '/learner/classrooms', label: 'QR Attendance Live', icon: 'ti-qrcode' },
    { to: '/admin/courses', label: 'Course Materials & PPT', icon: 'ti-stack-2' },
  ],
  admin: [
    { to: '/admin', label: 'Executive Dashboard & AI', icon: 'ti-layout-dashboard', end: true },
    { to: '/admin/courses', label: 'Course Catalog & Builder', icon: 'ti-stack-2' },
    { to: '/admin/training-ops', label: 'Training Ops, Trainers & Labs', icon: 'ti-school' },
    { to: '/admin/reports', label: 'Strategic ROI & Audit Center', icon: 'ti-chart-histogram' },
    { to: '/admin/config', label: 'HRIS & MMVN Dual Hierarchy', icon: 'ti-settings' },
  ],
  sysadmin: [
    { to: '/admin/config', label: 'IT Security & HRIS Sync', icon: 'ti-settings', end: true },
    { to: '/admin/reports', label: 'Audit Logs & Heatmap', icon: 'ti-shield-lock' },
    { to: '/admin', label: 'System Overview', icon: 'ti-layout-dashboard' },
  ],
  useradmin: [
    { to: '/admin/config', label: 'Employee Master & Org Structure', icon: 'ti-users-group', end: true },
    { to: '/admin/reports', label: 'Workforce Compliance Reports', icon: 'ti-chart-histogram' },
    { to: '/admin', label: 'System Overview', icon: 'ti-layout-dashboard' },
  ],
};

const ROLE_META = {
  learner: { label: 'Employee / Learner (Store & HO)', icon: 'ti-user', tone: 'rail' },
  manager: { label: 'Line Manager (Operations / Dept)', icon: 'ti-briefcase', tone: 'amber' },
  hrbp: { label: 'HRBP (Regional Partner)', icon: 'ti-users', tone: 'blue' },
  trainer: { label: 'L&D Trainer / Instructor', icon: 'ti-school', tone: 'sage' },
  admin: { label: 'L&D Administrator', icon: 'ti-shield-lock', tone: 'sage' },
  sysadmin: { label: 'System Administrator (IT)', icon: 'ti-lock', tone: 'rust' },
  useradmin: { label: 'User Administrator (HR Ops)', icon: 'ti-users-group', tone: 'blue' },
};

export default function Sidebar({ role, collapsed }) {
  const { currentUser: authUser } = useCourseStore();
  const effectiveRole = NAV_BY_ROLE[role] ? role : 'learner';
  const items = NAV_BY_ROLE[effectiveRole] || NAV_BY_ROLE.learner;
  const meta = ROLE_META[effectiveRole] || ROLE_META.learner;
  const profile = (authUser && authUser.role === effectiveRole) ? authUser : (PROFILE_BY_ROLE[effectiveRole] || currentUser);

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
          background: `var(--${meta.tone}-soft)`,
          color: `var(--${meta.tone}-soft-text)`,
        }}
      >
        <i className={`ti ${meta.icon}`} aria-hidden="true" />
        <div>
          <div className="role-pill-label">Viewing as</div>
          <div className="role-pill-value">{meta.label}</div>
        </div>
      </div>
      {profile && (
        <div className="org-pill" title="Your Business Unit / Division / Department / Store">
          <i className="ti ti-sitemap" aria-hidden="true" />
          <div>
            <div className="role-pill-label">{profile.fullName}</div>
            <div className="org-pill-value">
              {profile.storeName ? `${profile.storeName} (${profile.branchName ? 'Ops' : 'HO'})` : `MMVN · ${orgPathLabel(profile)}`}
            </div>
          </div>
        </div>
      )}

      <div className="nav-group-label">Navigate</div>
      <nav>
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <i className={`ti ${item.icon}`} aria-hidden="true" />
            <span style={{ flex: 1 }}>{item.label}</span>
            {item.badge && (
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  padding: '1px 6px',
                  borderRadius: 10,
                  background: item.badge === 'AI' ? 'var(--ai-gradient)' : 'var(--amber)',
                  color: '#fff',
                }}
              >
                {item.badge}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-foot">
        MM Mega Market &middot; LMS 2026 Production Standard
      </div>
    </aside>
  );
}
