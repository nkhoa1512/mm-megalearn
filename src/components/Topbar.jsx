import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function Topbar({ role, onRoleChange, onToggleSidebar, title, crumb }) {
  const navigate = useNavigate();

  function handleRoleChange(e) {
    const next = e.target.value;
    onRoleChange(next);
    navigate(`/${next}`);
  }

  return (
    <header className="topbar">
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <button className="icon-btn" onClick={onToggleSidebar} aria-label="Toggle sidebar">
          <i className="ti ti-menu-2" aria-hidden="true" />
        </button>
        <div>
          {crumb && <div className="page-crumb">{crumb}</div>}
          <div className="page-title">{title}</div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div className="role-switcher">
          <label htmlFor="role-select" style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
            Role
          </label>
          <select id="role-select" value={role} onChange={handleRoleChange}>
            <option value="learner">User Learn</option>
            <option value="manager">Manager</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <button className="icon-btn" aria-label="Notifications">
          <i className="ti ti-bell" aria-hidden="true" />
        </button>
        <div className="avatar">MT</div>
      </div>
    </header>
  );
}
