import React from 'react';
import { NavLink } from 'react-router-dom';
import { useCourseStore } from '../state/CourseStore';
import { currentUser, managerUser, adminUser, orgPathLabel } from '../data/mockData';

const PROFILE_BY_ROLE = { learner: currentUser, manager: managerUser, admin: adminUser };

const NAV_BY_ROLE = {
  learner: [
    { to: '/learner', label: 'Dashboard', icon: 'ti-layout-dashboard', end: true },
    { to: '/learner/courses', label: 'My Courses', icon: 'ti-book-2' },
    { to: '/learner/classrooms', label: 'Classrooms & QR Check-in', icon: 'ti-chalkboard' },
    { to: '/learner/paths', label: 'Learning Paths', icon: 'ti-git-branch' },
    { to: '/learner/ai-hub', label: 'AI Learning Hub & SOPs', icon: 'ti-sparkles', badge: 'AI' },
    { to: '/learner/leaderboard', label: 'Leaderboard & XP', icon: 'ti-trophy' },
    { to: '/learner/certificates', label: 'Certificates', icon: 'ti-certificate' },
    { to: '/learner/history', label: 'Learning History', icon: 'ti-history' },
  ],
  manager: [
    { to: '/manager', label: 'Team Dashboard', icon: 'ti-layout-dashboard', end: true },
    { to: '/manager/team', label: 'Direct Reports', icon: 'ti-users' },
    { to: '/manager/approvals', label: 'Course Approvals', icon: 'ti-circle-check', badge: '2' },
    { to: '/manager/courses', label: 'Team Courses', icon: 'ti-stack-2' },
    { to: '/manager/reports', label: 'Reports & Compliance', icon: 'ti-chart-bar' },
    { to: '/manager/learning', label: 'My Learning', icon: 'ti-book-2' },
    { to: '/manager/certificates', label: 'My Certificates', icon: 'ti-certificate' },
  ],
  admin: [
    { to: '/admin', label: 'Executive Dashboard & AI', icon: 'ti-layout-dashboard', end: true },
    { to: '/admin/courses', label: 'Course Catalog & Builder', icon: 'ti-stack-2' },
    { to: '/admin/config', label: 'HRIS & MMVN Governance', icon: 'ti-settings' },
    { to: '/admin/reports', label: 'Strategic ROI & Audit Center', icon: 'ti-chart-histogram' },
  ],

};

const ROLE_META = {
  learner: { label: 'Learner (Store / HO)', icon: 'ti-user', tone: 'rail' },
  manager: { label: 'Line Manager', icon: 'ti-briefcase', tone: 'amber' },
  admin: { label: 'L&D Administrator', icon: 'ti-shield-lock', tone: 'sage' },
};

export default function Sidebar({ role, collapsed }) {
  const { currentUser: authUser } = useCourseStore();
  const items = NAV_BY_ROLE[role];
  const meta = ROLE_META[role];
  const profile = (authUser && authUser.role === role) ? authUser : PROFILE_BY_ROLE[role];


  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="brand">
        <div className="brand-mark">R</div>
        <div>
          <div className="brand-name">Ridgeline</div>
          <div className="brand-sub">Learning &amp; development</div>
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
        <div className="org-pill" title="Your Business Unit / Division / Department">
          <i className="ti ti-sitemap" aria-hidden="true" />
          <div>
            <div className="role-pill-label">{profile.fullName}</div>
            <div className="org-pill-value">MMVN &middot; {orgPathLabel(profile)}</div>
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
        Mockup build &middot; demo data only
      </div>
    </aside>
  );
}
