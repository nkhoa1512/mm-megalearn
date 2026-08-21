import React from 'react';
import { NavLink } from 'react-router-dom';
import { currentUser, managerUser, adminUser, orgPathLabel } from '../data/mockData';

const PROFILE_BY_ROLE = { learner: currentUser, manager: managerUser, admin: adminUser };

const NAV_BY_ROLE = {
  learner: [
    { to: '/learner', label: 'Dashboard', icon: 'ti-layout-dashboard', end: true },
    { to: '/learner/courses', label: 'My courses', icon: 'ti-book-2' },
    { to: '/learner/certificates', label: 'Certificates', icon: 'ti-certificate' },
    { to: '/learner/history', label: 'Learning history', icon: 'ti-history' },
  ],
  manager: [
    { to: '/manager', label: 'Dashboard', icon: 'ti-layout-dashboard', end: true },
    { to: '/manager/learning', label: 'My learning', icon: 'ti-book-2' },
    { to: '/manager/certificates', label: 'Certificates', icon: 'ti-certificate' },
    { to: '/manager/team', label: 'Team', icon: 'ti-users' },
    { to: '/manager/courses', label: 'Team courses', icon: 'ti-stack-2' },
    { to: '/manager/reports', label: 'Team reports', icon: 'ti-chart-bar' },
  ],
  admin: [
    { to: '/admin', label: 'Dashboard', icon: 'ti-layout-dashboard', end: true },
    { to: '/admin/courses', label: 'Courses', icon: 'ti-stack-2' },
    { to: '/admin/config', label: 'Configuration', icon: 'ti-settings' },
    { to: '/admin/reports', label: 'Analytics', icon: 'ti-chart-histogram' },
  ],
};

const ROLE_META = {
  learner: { label: 'User Learn', icon: 'ti-user', tone: 'rail' },
  manager: { label: 'Manager', icon: 'ti-briefcase', tone: 'amber' },
  admin: { label: 'Admin', icon: 'ti-shield-lock', tone: 'sage' },
};

export default function Sidebar({ role, collapsed }) {
  const items = NAV_BY_ROLE[role];
  const meta = ROLE_META[role];
  const profile = PROFILE_BY_ROLE[role];

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
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-foot">
        Mockup build &middot; demo data only
      </div>
    </aside>
  );
}
