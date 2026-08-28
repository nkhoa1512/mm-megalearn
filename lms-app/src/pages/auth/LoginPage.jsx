import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCourseStore } from '../../store/CourseStore';
import {
  demoUsers,
  allUsers,
  personaForRole,
  currentUser,
  divisions,
  departments,
  jobLevels,
} from '../../data/mockData';
import { ROLE_ORDER, ROLE_HOME, normalizeRole, roleDefinition } from '../../data/roles';
import { levelShortLabel } from '../../data/levelSystem';
import { Badge, Button } from '../../features/common/ui';

// Nhãn hiển thị của 6 role, xếp theo rank từ thấp lên cao.
const ROLE_BADGE_EMOJI = {
  learner: '👤',
  manager: '💼',
  trainer: '🎓',
  hrbp: '📊',
  useradmin: '👥',
  sysadmin: '🔒',
};

function getRoleBadge(role) {
  const def = roleDefinition(role);
  return <Badge tone={def.tone}>{ROLE_BADGE_EMOJI[def.id]} {def.shortVi}</Badge>;
}

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useCourseStore();
  const [selectedUser, setSelectedUser] = useState(currentUser);
  const [employeeId, setEmployeeId] = useState(currentUser.employeeCode);
  const [password, setPassword] = useState('••••••••');
  const [ssoLoading, setSsoLoading] = useState(false);
  const [allUsersSearch, setAllUsersSearch] = useState('');
  const [showAllUsersModal, setShowAllUsersModal] = useState(false);
  const [divisionFilter, setDivisionFilter] = useState('ALL');

  const totalUserList = allUsers ? allUsers() : demoUsers;

  // 6 persona chuẩn, xếp đúng thứ tự phân cấp: Learner -> ... -> System Admin (IT).
  const featuredUsers = ROLE_ORDER.map((roleId, idx) => {
    const def = roleDefinition(roleId);
    const user = personaForRole(roleId);
    return {
      ...user,
      roleBadge: `${ROLE_BADGE_EMOJI[roleId]} ${idx + 1}. ${def.labelVi}`,
      roleTone: def.tone,
      roleSummary: def.summaryVi,
    };
  });

  const filteredAllUsers = totalUserList.filter((u) => {
    const matchDiv = divisionFilter === 'ALL' || u.divisionCode === divisionFilter;
    const q = allUsersSearch.toLowerCase().trim();
    const matchSearch = !q ||
      u.fullName.toLowerCase().includes(q) ||
      u.employeeCode.toLowerCase().includes(q) ||
      u.position.toLowerCase().includes(q) ||
      (u.departmentCode && u.departmentCode.toLowerCase().includes(q)) ||
      (u.role && u.role.toLowerCase().includes(q));
    return matchDiv && matchSearch;
  });

  function handleSelectPersona(user) {
    setSelectedUser(user);
    setEmployeeId(user.employeeCode);
    setShowAllUsersModal(false);
  }

  function handleDirectLogin(userToLogin) {
    const target = userToLogin || selectedUser;
    login(target);
    navigate(ROLE_HOME[normalizeRole(target.role)] || '/learner');
  }

  function handleSsoLogin() {
    setSsoLoading(true);
    setTimeout(() => {
      setSsoLoading(false);
      handleDirectLogin(selectedUser);
    }, 800);
  }

  function handleSubmitForm(e) {
    e.preventDefault();
    const matched = demoUsers.find(
      (u) => u.employeeCode.toLowerCase() === employeeId.trim().toLowerCase() ||
             u.userId.toLowerCase() === employeeId.trim().toLowerCase()
    ) || selectedUser;
    handleDirectLogin(matched);
  }

  return (
    <div style={{ minHeight: '100vh', background: 'radial-gradient(ellipse at top left, #F0FDF4 0%, #F8FAF9 50%, #EEF2FF 100%)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', fontFamily: 'var(--font-body)' }}>
      {/* Top Brand Bar */}
      <header style={{ padding: '16px 32px', borderBottom: '1px solid var(--line)', background: 'var(--paper-glass)', backdropFilter: 'blur(8px)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 10,
              background: 'linear-gradient(135deg, var(--bigc-green) 0%, #007A38 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontSize: 18,
              fontWeight: 900,
              boxShadow: '0 4px 12px rgba(0, 158, 73, 0.25)',
              position: 'relative',
            }}
          >
            MM
            <span style={{ position: 'absolute', top: -3, right: -3, width: 10, height: 10, borderRadius: '50%', background: 'var(--mm-red)', border: '2px solid #fff' }} />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--ink)', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>MM MEGA MARKET &amp; BIG C</span>
              <span style={{ background: 'var(--mm-blue-soft)', color: 'var(--mm-blue)', fontSize: 11, padding: '2px 8px', borderRadius: 4, fontWeight: 700 }}>
                VIETNAM
              </span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--ink-faint)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>
              Enterprise Learning &amp; Development Platform &middot; MM MegaLearn
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <Badge tone="sage" icon="ti-shield-lock">SAP SuccessFactors HRIS Connected</Badge>
          <Badge tone="blue" icon="ti-cloud-check">Azure AD SSO Active</Badge>
        </div>
      </header>

      {/* Main Content Area */}
      <main style={{ maxWidth: 1180, width: '100%', margin: '0 auto', padding: '32px 20px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        
        {/* Intro Tagline */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', background: 'var(--rail-soft)', color: 'var(--rail-soft-text)', borderRadius: 20, fontSize: 12, fontWeight: 600, marginBottom: 8 }}>
            <i className="ti ti-building-store" /> 100 Enterprise Associates &middot; 100 Curriculum Courses &middot; 16 Divisions
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: 'var(--ink)', margin: '0 0 6px', letterSpacing: '-0.02em' }}>
            Enterprise Portal Login &amp; Role Persona Switcher
          </h1>
          <p style={{ fontSize: 14, color: 'var(--ink-soft)', margin: 0, maxWidth: 680, marginLeft: 'auto', marginRight: 'auto' }}>
            Select any of the <strong>100 pre-authenticated employee personas</strong> across MM Mega Market, or sign in directly with your Employee ID.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 24, alignItems: 'stretch' }}>
          
          {/* LEFT: Quick 1-Click Role Persona Grid */}
          <div className="card card-pad" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderColor: 'var(--line-strong)' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, borderBottom: '1px solid var(--line)', paddingBottom: 10, flexWrap: 'wrap', gap: 8 }}>
                <div style={{ fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <i className="ti ti-users" style={{ color: 'var(--rail)' }} />
                  6 Persona Chuẩn Theo Thứ Tự Phân Cấp (Learner → System Admin IT)
                </div>
                <Button size="sm" variant="ai" icon="ti-search" onClick={() => setShowAllUsersModal(true)}>
                  Browse All 100 Users ({demoUsers.length})
                </Button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                {featuredUsers.map((user) => {
                  const isSelected = selectedUser.userId === user.userId;
                  return (
                    <div
                      key={user.userId}
                      onClick={() => handleSelectPersona(user)}
                      style={{
                        padding: '12px 14px',
                        borderRadius: 'var(--radius-md)',
                        border: '1.5px solid',
                        borderColor: isSelected ? 'var(--rail)' : 'var(--line)',
                        background: isSelected ? 'var(--rail-soft)' : 'var(--paper-raised)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        position: 'relative',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div>
                        {/* Top role & level tag */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                          <span style={{ fontSize: 10.5, fontWeight: 700, background: `var(--${user.roleTone}-soft)`, color: `var(--${user.roleTone}-soft-text)`, padding: '2px 7px', borderRadius: 12 }}>
                            {user.roleBadge}
                          </span>
                          <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--ink-faint)' }}>
                            {levelShortLabel(user.level)}
                          </span>
                        </div>

                        {/* User name & ID */}
                        <div style={{ fontWeight: 700, fontSize: 13.5, color: isSelected ? 'var(--rail-soft-text)' : 'var(--ink)', marginBottom: 2 }}>
                          {user.fullName}
                        </div>
                        <div style={{ fontSize: 11.5, color: 'var(--ink-soft)', marginBottom: 4 }}>
                          {user.position}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--ink-faint)', marginBottom: 6, lineHeight: 1.4 }}>
                          {user.roleSummary}
                        </div>

                        {/* Org Dept Tag */}
                        <div style={{ fontSize: 11, color: 'var(--ink-soft)', background: 'rgba(255,255,255,0.7)', padding: '4px 6px', borderRadius: 4, display: 'inline-block', border: '1px solid var(--line)' }}>
                          <strong>{user.divisionCode}</strong> &middot; {user.departmentCode} ({user.departmentName})
                        </div>
                      </div>

                      <div style={{ marginTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(0,0,0,0.05)', paddingTop: 8 }}>
                        <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--ink-faint)' }}>{user.employeeCode}</span>
                        <Button size="sm" variant={isSelected ? 'primary' : 'outline'} onClick={(e) => { e.stopPropagation(); handleDirectLogin(user); }}>
                          {isSelected ? 'Enter Portal' : 'Login'}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Matrix count summary footer */}
            <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11.5, color: 'var(--ink-soft)', flexWrap: 'wrap', gap: 8 }}>
              <span>Total Dataset: <strong>100 Active Users</strong> &middot; <strong>100 Courses</strong></span>
              <span style={{ color: 'var(--rail)', fontWeight: 600, cursor: 'pointer' }} onClick={() => setShowAllUsersModal(true)}>
                <i className="ti ti-list-details" /> Open Full 100 User Roster &rarr;
              </span>
            </div>
          </div>

          {/* RIGHT: Corporate Single Sign-On & Direct Credentials */}
          <div className="card card-pad" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderColor: 'var(--line-strong)' }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4, color: 'var(--ink)' }}>
                Sign In to MMVN Portal
              </div>
              <p style={{ fontSize: 12.5, color: 'var(--ink-soft)', marginBottom: 16 }}>
                Selected Profile: <strong>{selectedUser.fullName}</strong> ({selectedUser.employeeCode} &middot; Level {selectedUser.level})
              </p>

              {/* Azure AD SSO Button */}
              <button
                onClick={handleSsoLogin}
                disabled={ssoLoading}
                style={{
                  width: '100%',
                  padding: '11px 16px',
                  background: '#ffffff',
                  border: '1.5px solid #CBD5E1',
                  borderRadius: 'var(--radius-sm)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#1E293B',
                  cursor: 'pointer',
                  marginBottom: 16,
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                  transition: 'all 0.12s ease',
                }}
              >
                <i className={`ti ${ssoLoading ? 'ti-loader ti-spin' : 'ti-brand-windows'}`} style={{ color: '#0078D4', fontSize: 18 }} />
                {ssoLoading ? 'Authenticating with Azure AD...' : 'Sign in with Microsoft Office 365 (SSO)'}
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '14px 0', fontSize: 12, color: 'var(--ink-faint)' }}>
                <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
                <span>OR ENTER CREDENTIALS</span>
                <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
              </div>

              {/* Form Input */}
              <form onSubmit={handleSubmitForm} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <label className="field-label" style={{ fontSize: 12 }}>Employee Code / User ID</label>
                  <div style={{ position: 'relative' }}>
                    <i className="ti ti-id" style={{ position: 'absolute', left: 12, top: 11, color: 'var(--ink-faint)' }} />
                    <input
                      type="text"
                      className="field-input"
                      style={{ paddingLeft: 36, fontSize: 13 }}
                      value={employeeId}
                      onChange={(e) => setEmployeeId(e.target.value)}
                      placeholder="e.g. MMVN-0001 or MMVN-1042"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="field-label" style={{ fontSize: 12 }}>Password / Domain Pin</label>
                  <div style={{ position: 'relative' }}>
                    <i className="ti ti-lock" style={{ position: 'absolute', left: 12, top: 11, color: 'var(--ink-faint)' }} />
                    <input
                      type="password"
                      className="field-input"
                      style={{ paddingLeft: 36, fontSize: 13 }}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, marginTop: 4 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                    <input type="checkbox" defaultChecked />
                    <span style={{ color: 'var(--ink-soft)' }}>Remember session</span>
                  </label>
                  <a href="#forgot" onClick={(e) => e.preventDefault()} style={{ color: 'var(--rail)', textDecoration: 'none', fontWeight: 600 }}>
                    Helpdesk Support
                  </a>
                </div>

                <Button type="submit" variant="primary" block style={{ marginTop: 10, padding: '11px' }}>
                  <i className="ti ti-login" /> Enter Workspace as {selectedUser.fullName.split(' ')[0]}
                </Button>
              </form>
            </div>

            {/* Security Notice */}
            <div style={{ background: 'var(--paper-sunken)', padding: '10px 12px', borderRadius: 6, fontSize: 11.5, color: 'var(--ink-soft)', marginTop: 16, display: 'flex', gap: 8, alignItems: 'center' }}>
              <i className="ti ti-shield-check" style={{ color: 'var(--sage)', fontSize: 16 }} />
              <span>Protected by Enterprise Dynamic Watermark &amp; Role-based Access Control (RBAC).</span>
            </div>
          </div>
        </div>
      </main>

      {/* MODAL: Full 100 Users Roster Browser */}
      {showAllUsersModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: 20,
          }}
          onClick={() => setShowAllUsersModal(false)}
        >
          <div
            className="card card-pad"
            style={{
              maxWidth: 900,
              width: '100%',
              maxHeight: '85vh',
              display: 'flex',
              flexDirection: 'column',
              background: 'var(--paper-raised)',
              boxShadow: 'var(--shadow-xl)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, borderBottom: '1px solid var(--line)', paddingBottom: 12 }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 18, color: 'var(--ink)' }}>
                  MMVN 100 Employee Roster Directory
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--ink-soft)', marginTop: 2 }}>
                  Click any employee below to log in directly to their dedicated LMS workspace.
                </div>
              </div>
              <button
                onClick={() => setShowAllUsersModal(false)}
                style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--ink-faint)' }}
              >
                &times;
              </button>
            </div>

            {/* Modal Filter & Search */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, position: 'relative', minWidth: 240 }}>
                <i className="ti ti-search" style={{ position: 'absolute', left: 10, top: 10, color: 'var(--ink-faint)' }} />
                <input
                  type="text"
                  className="field-input"
                  style={{ paddingLeft: 34, height: 36, fontSize: 13 }}
                  placeholder="Search by name, code (MMVN-1042), position, or dept..."
                  value={allUsersSearch}
                  onChange={(e) => setAllUsersSearch(e.target.value)}
                />
              </div>

              <select
                className="field-select"
                style={{ width: 180, height: 36, fontSize: 12.5 }}
                value={divisionFilter}
                onChange={(e) => setDivisionFilter(e.target.value)}
              >
                <option value="ALL">All 16 Divisions</option>
                {divisions.map((d) => (
                  <option key={d.id} value={d.code}>{d.code} - {d.name}</option>
                ))}
              </select>
            </div>

            {/* Modal User Table */}
            <div style={{ flex: 1, overflowY: 'auto', border: '1px solid var(--line)', borderRadius: 6 }}>
              <table className="table">
                <thead>
                  <tr>
                    <th style={{ width: 110 }}>Code</th>
                    <th>Full Name &amp; Position</th>
                    <th style={{ width: 120 }}>Role</th>
                    <th style={{ width: 90 }}>Level</th>
                    <th style={{ width: 160 }}>Division / Dept</th>
                    <th style={{ width: 90 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAllUsers.slice(0, 50).map((u) => (
                    <tr key={u.userId} style={{ cursor: 'pointer' }} onClick={() => handleSelectPersona(u)}>
                      <td>
                        <strong style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{u.employeeCode}</strong>
                      </td>
                      <td>
                        <div style={{ fontWeight: 700, fontSize: 13 }}>{u.fullName}</div>
                        <div style={{ fontSize: 11.5, color: 'var(--ink-soft)' }}>{u.position}</div>
                      </td>
                      <td>
                        {getRoleBadge(u.role)}
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                        {levelShortLabel(u.level)}
                      </td>
                      <td style={{ fontSize: 11.5, color: 'var(--ink-soft)' }}>
                        <strong>{u.divisionCode}</strong> / {u.departmentCode}
                      </td>
                      <td>
                        <Button size="sm" variant="primary" onClick={(e) => { e.stopPropagation(); handleDirectLogin(u); }}>
                          Login
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Modal Footer */}
            <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, color: 'var(--ink-faint)' }}>
              <span>Showing {Math.min(filteredAllUsers.length, 50)} of {filteredAllUsers.length} matched employees (Total: 100)</span>
              <Button size="sm" variant="outline" onClick={() => setShowAllUsersModal(false)}>Close</Button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer style={{ padding: '14px 32px', borderTop: '1px solid var(--line)', background: 'var(--paper-raised)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, color: 'var(--ink-soft)' }}>
        <div>
          &copy; 2026 <strong>MM Mega Market Vietnam</strong> &middot; Learning &amp; Organizational Development (L&amp;OD)
        </div>
        <div style={{ display: 'flex', gap: 16 }}>
          <span>100 Users &middot; 100 Courses</span>
          <span>HRIS API v2.4</span>
          <span>Security Compliance ISO-27001</span>
        </div>
      </footer>
    </div>
  );
}
