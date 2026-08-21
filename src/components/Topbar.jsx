import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCourseStore } from '../state/CourseStore';
import { notifications } from '../data/mockData';
import { Button, Badge } from './ui';

export default function Topbar({ role, onRoleChange, onToggleSidebar, title, crumb }) {
  const navigate = useNavigate();
  const { currentUser, openAiAssistant, logout, switchUser, demoUsers } = useCourseStore();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [inbox, setInbox] = useState(notifications.learnerInbox);

  const profile = currentUser || demoUsers[0];
  const unreadCount = inbox.filter((n) => n.unread).length;

  const profileRef = useRef(null);

  // Close profile dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setShowProfileMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleRoleChange(e) {
    const nextRole = e.target.value;
    onRoleChange(nextRole);
    // Switch to a suitable demo user for this role if needed
    const targetUser = demoUsers.find((u) => u.role === nextRole);
    if (targetUser) {
      switchUser(targetUser.userId);
    }
    navigate(`/${nextRole}`);
  }

  function handleSwitchPersona(user) {
    switchUser(user.userId);
    onRoleChange(user.role);
    setShowProfileMenu(false);
    if (user.role === 'admin') navigate('/admin');
    else if (user.role === 'manager') navigate('/manager');
    else navigate('/learner');
  }

  function handleLogout() {
    logout();
    setShowProfileMenu(false);
    navigate('/login');
  }

  function markAllRead() {
    setInbox((prev) => prev.map((n) => ({ ...n, unread: false })));
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

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* Quick AI Assistant Trigger */}
        <Button
          variant="ai"
          size="sm"
          icon="ti-sparkles"
          onClick={() => openAiAssistant('tutor')}
        >
          AI Tutor &amp; SOPs
        </Button>

        {/* Role Switcher */}
        <div className="role-switcher">
          <label htmlFor="role-select" style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
            Role
          </label>
          <select id="role-select" value={role} onChange={handleRoleChange} className="field-select" style={{ padding: '6px 28px 6px 10px', fontSize: 12.5, width: 'auto' }}>
            <option value="learner">Learner (Store / HO)</option>
            <option value="manager">Line Manager</option>
            <option value="admin">L&amp;D Admin (HR Director Level 1)</option>
          </select>
        </div>

        {/* Notification Bell */}
        <div style={{ position: 'relative' }}>
          <button
            className="icon-btn"
            onClick={() => setShowNotifications((v) => !v)}
            aria-label="Notifications"
            style={{ position: 'relative' }}
          >
            <i className="ti ti-bell" aria-hidden="true" />
            {unreadCount > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: 2,
                  right: 2,
                  width: 8,
                  height: 8,
                  background: 'var(--rust)',
                  borderRadius: '50%',
                }}
              />
            )}
          </button>

          {/* Notification Popover */}
          {showNotifications && (
            <div className="notification-popover">
              <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontWeight: 700, fontSize: 13 }}>Notifications ({unreadCount} new)</div>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    style={{ background: 'none', border: 'none', color: 'var(--rail)', fontSize: 11.5, cursor: 'pointer', fontWeight: 600 }}
                  >
                    Mark all as read
                  </button>
                )}
              </div>
              <div style={{ maxHeight: 280, overflowY: 'auto' }}>
                {inbox.map((n) => (
                  <div
                    key={n.id}
                    style={{
                      padding: '10px 14px',
                      borderBottom: '1px solid var(--line)',
                      background: n.unread ? 'var(--rail-soft)' : 'transparent',
                      display: 'flex',
                      gap: 10,
                    }}
                  >
                    <i className="ti ti-bell-ringing" style={{ color: 'var(--rail)', marginTop: 2 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 600 }}>{n.title}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--ink-soft)' }}>{n.message}</div>
                      <div style={{ fontSize: 10.5, color: 'var(--ink-faint)', marginTop: 2 }}>{n.time}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* User Avatar & Profile Dropdown */}
        <div ref={profileRef} style={{ position: 'relative' }}>
          <div
            onClick={() => setShowProfileMenu((v) => !v)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '4px 8px 4px 4px',
              borderRadius: 24,
              border: '1px solid var(--line)',
              background: 'var(--paper-raised)',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <div
              className="avatar"
              style={{
                background: profile.role === 'admin' ? 'var(--ai-gradient)' : 'var(--rail)',
                color: '#fff',
                fontWeight: 700,
                fontSize: 12,
                width: 32,
                height: 32,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {profile.avatar || profile.fullName.split(' ').map((n) => n[0]).slice(0, 2).join('')}
            </div>

            {/* Level & Dept Pill */}
            <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontSize: 12, fontWeight: 700, lineHeight: 1.2, color: 'var(--ink)' }}>
                {profile.fullName.split(' ')[0]}
              </div>
              <div style={{ fontSize: 10.5, color: 'var(--ink-faint)', fontFamily: 'var(--font-mono)' }}>
                Lvl {profile.level} &middot; {profile.divisionCode}
              </div>
            </div>

            <i className="ti ti-chevron-down" style={{ fontSize: 12, color: 'var(--ink-faint)', marginLeft: 2 }} />
          </div>

          {/* User Profile Dropdown Menu */}
          {showProfileMenu && (
            <div
              className="card card-pad"
              style={{
                position: 'absolute',
                right: 0,
                top: 44,
                width: 310,
                zIndex: 1000,
                boxShadow: 'var(--shadow-modal)',
                borderColor: 'var(--line-strong)',
                animation: 'fadeIn 0.15s ease',
              }}
            >
              {/* User Identity Header */}
              <div style={{ borderBottom: '1px solid var(--line)', paddingBottom: 12, marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                  <div style={{ fontWeight: 800, fontSize: 14 }}>{profile.fullName}</div>
                  <Badge tone={profile.role === 'admin' ? 'ai' : profile.role === 'manager' ? 'amber' : 'sage'}>
                    Level {profile.level}
                  </Badge>
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--ink-soft)', marginTop: 2 }}>
                  {profile.position}
                </div>
                <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--ink-faint)', marginTop: 4 }}>
                  {profile.employeeCode} &middot; {profile.email}
                </div>

                {/* Division & Dept Details */}
                <div style={{ background: 'var(--paper-sunken)', padding: '6px 10px', borderRadius: 6, fontSize: 11.5, marginTop: 8, color: 'var(--ink)' }}>
                  <div><strong>Division:</strong> {profile.divisionCode} ({profile.divisionName})</div>
                  <div><strong>Department:</strong> {profile.departmentCode} ({profile.departmentName})</div>
                  <div style={{ fontSize: 10.5, color: 'var(--ink-soft)', marginTop: 2 }}>{profile.levelTitle}</div>
                </div>
              </div>

              {/* Quick Persona Switcher */}
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--ink-faint)', marginBottom: 6 }}>
                  Switch Authenticated Persona:
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 160, overflowY: 'auto' }}>
                  {demoUsers.map((u) => (
                    <button
                      key={u.userId}
                      onClick={() => handleSwitchPersona(u)}
                      style={{
                        padding: '6px 8px',
                        borderRadius: 6,
                        border: '1px solid',
                        borderColor: u.userId === profile.userId ? 'var(--rail)' : 'transparent',
                        background: u.userId === profile.userId ? 'var(--rail-soft)' : 'transparent',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontSize: 12,
                        cursor: 'pointer',
                        textAlign: 'left',
                        color: 'var(--ink)',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: u.userId === profile.userId ? 700 : 500 }}>{u.fullName}</div>
                        <div style={{ fontSize: 10.5, color: 'var(--ink-soft)' }}>Level {u.level} &middot; {u.divisionCode}-{u.departmentCode}</div>
                      </div>
                      {u.userId === profile.userId && <i className="ti ti-check" style={{ color: 'var(--rail)' }} />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sign Out Button */}
              <div style={{ borderTop: '1px solid var(--line)', paddingTop: 10 }}>
                <Button variant="danger" size="sm" block icon="ti-logout" onClick={handleLogout}>
                  Sign Out (Log Out)
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}


