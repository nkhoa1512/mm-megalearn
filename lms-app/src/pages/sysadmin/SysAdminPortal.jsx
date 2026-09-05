import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  sysAdminUser,
  hrisSyncLogs,
  securityComplianceConfig,
  allUsers,
  personaForRole,
} from '../../data/mockData';
import { Badge, Button, Modal, ProgressBar, JobLevelBadge } from '../../features/common/ui';
import { ROLE_DEFINITIONS, roleDefinition, normalizeRole, managedScopeLabel, capabilitiesOf, hasCapability } from '../../data/roles';
import { normalizeLevel } from '../../data/levelSystem';
import { useCourseStore } from '../../store/CourseStore';
import UserTranscriptModal from '../../features/common/UserTranscriptModal';
import TeamPerformanceOverview from '../../features/admin/TeamPerformanceOverview';

// The capabilities shown on the role permission matrix.
const CAPABILITY_ROWS = [
  { key: 'canLearn', label: 'Take courses (the personal Learner portal)' },
  { key: 'canRequestLevelSkip', label: 'Submit a level skip request' },
  { key: 'canApproveLevelSkip', label: 'Approve level skips for direct reports' },
  { key: 'canTeach', label: 'Teach & display the Live QR for attendance' },
  { key: 'canAuthorOnlineCourses', label: 'Create online courses' },
  { key: 'canAuthorOfflineCourses', label: 'Create in-person courses (Offline/ILT)' },
  { key: 'canAssignTrainers', label: 'Assign trainers to a class' },
  { key: 'canViewCsat', label: 'View trainers\' CSAT ratings' },
  { key: 'canViewOrgProgress', label: 'Track learning progress across the organization' },
  { key: 'canManageUsers', label: 'Employee master data administration' },
  { key: 'canConfigureSystem', label: 'System configuration (HRIS / SSO / security)' },
  { key: 'canViewAuditLogs', label: 'View security and audit logs' },
  { key: 'canDevelopPlatform', label: 'Change code, schema & platform infrastructure' },
];

export default function SysAdminPortal({ initialTab = 'HRIS' }) {
  const navigate = useNavigate();
  const { currentUser } = useCourseStore();
  const canManageUsers = hasCapability(normalizeRole(currentUser?.role || sysAdminUser.role), 'canManageUsers');

  // HRIS | AUDIT_LOGS | POLICIES | ROLE_GOVERNANCE | TEAM_PERFORMANCE
  const [activeTab, setActiveTab] = useState(initialTab);
  useEffect(() => { setActiveTab(initialTab); }, [initialTab]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState(false);
  // The employee profile open in the modal (null = closed).
  const [transcriptUser, setTranscriptUser] = useState(null);

  const [auditSearch, setAuditSearch] = useState('');
  const [auditLevelFilter, setAuditLevelFilter] = useState('ALL');
  const [watermarkEnabled, setWatermarkEnabled] = useState(true);
  const [windowBlurGuard, setWindowBlurGuard] = useState(true);
  const [sessionTimeoutMins, setSessionTimeoutMins] = useState(30);
  const [twoFactorAuth, setTwoFactorAuth] = useState(true);
  const [policySaved, setPolicySaved] = useState(false);

  function handleTriggerSync() {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
      setSyncSuccess(true);
      setTimeout(() => setSyncSuccess(false), 2500);
    }, 1500);
  }

  function handleSavePolicy() {
    setPolicySaved(true);
    setTimeout(() => setPolicySaved(false), 2000);
  }

  const TABS = [
    { id: 'HRIS', label: 'HRIS Data Integration & Sync (API Pipeline)', icon: 'ti-refresh', count: 'Active' },
    { id: 'AUDIT_LOGS', label: 'Security Audit Log & Session Monitoring (Security Audit Logs)', icon: 'ti-shield-check', count: '100% Secure' },
    { id: 'POLICIES', label: 'Security & Anti-Cheating Policy (Security Policies)', icon: 'ti-shield-lock', count: 'Standard' },
    { id: 'ROLE_GOVERNANCE', label: 'Governance For All 6 Roles & Permission Matrix', icon: 'ti-users-group', count: '6 Role' },
    ...(canManageUsers ? [{ id: 'TEAM_PERFORMANCE', label: 'Team Performance & Role Oversight', icon: 'ti-trophy', count: 'Overview' }] : []),
  ];

  return (
    <>
      {/* HEADER */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <h1>IT Security, HRIS Integration &amp; Infrastructure</h1>
            <Badge tone="rust" icon="ti-shield-lock">IT System Administrator</Badge>
          </div>
          <p style={{ margin: 0 }}>
            Technical administration: <strong>{sysAdminUser.fullName}</strong>{(sysAdminUser.departmentName || sysAdminUser.department) ? <> &middot; {sysAdminUser.departmentName || sysAdminUser.department}</> : null} &middot; Monitors the HRIS API connection, system security &amp; audit logs
          </p>
        </div>

        <Button variant="outline" icon="ti-user-circle" onClick={() => navigate('/my-learning-dashboard')}>
          View The Personal Learning Interface
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-4" style={{ marginBottom: 24 }}>
        <div className="card card-pad" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="stat-icon-badge" style={{ background: 'var(--sage-soft)', color: 'var(--sage-soft-text)', width: 40, height: 40, fontSize: 20 }}>
            <i className="ti ti-activity" />
          </div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--sage)' }}>99.98%</div>
            <div style={{ fontSize: 11, color: 'var(--ink-soft)' }}>Infrastructure SLA<br />Uptime Health</div>
          </div>
        </div>
        <div className="card card-pad" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="stat-icon-badge" style={{ background: 'var(--blue-soft)', color: 'var(--blue-soft-text)', width: 40, height: 40, fontSize: 20 }}>
            <i className="ti ti-cloud-computing" />
          </div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--blue)' }}>CONNECTED</div>
            <div style={{ fontSize: 11, color: 'var(--ink-soft)' }}>SAP HRIS Sync<br />REST API Pipeline</div>
          </div>
        </div>
        <div className="card card-pad" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="stat-icon-badge" style={{ background: 'var(--rail-soft)', color: 'var(--rail-soft-text)', width: 40, height: 40, fontSize: 20 }}>
            <i className="ti ti-shield-check" />
          </div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--rail)' }}>0 Alerts</div>
            <div style={{ fontSize: 11, color: 'var(--ink-soft)' }}>Security Incidents<br />In the last 24 hours</div>
          </div>
        </div>
        <div className="card card-pad" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="stat-icon-badge" style={{ background: 'var(--amber-soft)', color: 'var(--amber-soft-text)', width: 40, height: 40, fontSize: 20 }}>
            <i className="ti ti-user-check" />
          </div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--amber)' }}>24</div>
            <div style={{ fontSize: 11, color: 'var(--ink-soft)' }}>Sessions<br />Active</div>
          </div>
        </div>
      </div>

      {/* TABS SWITCHER */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, borderBottom: '1px solid var(--line)', paddingBottom: 8, flexWrap: 'wrap' }}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="btn btn-sm"
            style={{
              background: activeTab === tab.id ? 'var(--rust)' : 'var(--paper-raised)',
              color: activeTab === tab.id ? '#fff' : 'var(--ink)',
              borderColor: activeTab === tab.id ? 'var(--rust)' : 'var(--line-strong)',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontWeight: activeTab === tab.id ? 700 : 500,
            }}
          >
            <i className={`ti ${tab.icon}`} />
            <span>{tab.label}</span>
            <span style={{
              background: activeTab === tab.id ? 'rgba(255,255,255,0.25)' : 'var(--line)',
              padding: '1px 6px',
              borderRadius: 10,
              fontSize: 11,
              fontWeight: 700,
            }}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* TAB 1: HRIS API PIPELINE */}
      {activeTab === 'HRIS' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card card-pad" style={{ background: 'linear-gradient(135deg, #FEF2F2 0%, #FEE2E2 100%)', borderColor: 'var(--rust)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--rust-soft-text)' }}>
                  Automatic Data Sync With The Enterprise HR System (SAP SuccessFactors API)
                </div>
                <p style={{ fontSize: 13, color: '#7F1D1D', margin: '4px 0 0' }}>
                  An automatic sync pipeline runs daily at 02:00 AM: it updates new hires, promotions, branch transfers and termination status.
                </p>
              </div>
              <Button
                variant="primary"
                icon={isSyncing ? 'ti-loader' : syncSuccess ? 'ti-check' : 'ti-refresh'}
                disabled={isSyncing}
                onClick={handleTriggerSync}
              >
                {isSyncing ? 'Running The Pipeline...' : syncSuccess ? 'Sync Successful (100 Records)!' : 'Trigger The API Sync Now'}
              </Button>
            </div>
          </div>

          <div className="section-label">Recent HRIS Sync Run History:</div>
          <div className="card" style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>Sync Time</th>
                  <th>Protocol &amp; Endpoint</th>
                  <th>Records Processed</th>
                  <th>New / Updated Employees</th>
                  <th>Pipeline Status</th>
                  <th style={{ textAlign: 'right' }}>Processing Time</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { time: '2026-08-24 02:00:15', endpoint: 'https://hris.mmvietnam.com/api/v2/employees/delta', records: 100, delta: '+3 new, 5 updated', status: 'SUCCESS', duration: '1.2s' },
                  { time: '2026-08-23 02:00:12', endpoint: 'https://hris.mmvietnam.com/api/v2/employees/delta', records: 100, delta: '+0 new, 2 updated', status: 'SUCCESS', duration: '1.1s' },
                  { time: '2026-08-22 02:00:18', endpoint: 'https://hris.mmvietnam.com/api/v2/employees/delta', records: 100, delta: '+1 new, 4 updated', status: 'SUCCESS', duration: '1.3s' },
                  { time: '2026-08-21 02:00:10', endpoint: 'https://hris.mmvietnam.com/api/v2/employees/delta', records: 100, delta: '+2 new, 1 updated', status: 'SUCCESS', duration: '1.2s' },
                ].map((log, idx) => (
                  <tr key={idx}>
                    <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{log.time}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--ink-soft)' }}>{log.endpoint}</td>
                    <td style={{ fontWeight: 700 }}>{log.records} records</td>
                    <td><Badge tone="blue">{log.delta}</Badge></td>
                    <td><Badge tone="sage" icon="ti-check">{log.status}</Badge></td>
                    <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{log.duration}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: AUDIT LOGS */}
      {activeTab === 'AUDIT_LOGS' && (() => {
        const auditLogData = [
          { time: '2026-08-24 16:15:22', ip: '113.161.42.18 (HCMC)', user: 'Tran Quoc Bao (sysadmin)', action: 'Approved system security policy configuration v2.1', level: 'INFO', tone: 'blue' },
          { time: '2026-08-24 15:40:10', ip: '14.169.88.204 (HCMC)', user: 'Sarah Nguyen (admin)', action: 'Published the course: Bakery Oven Practice & HACCP', level: 'NOTICE', tone: 'sage' },
          { time: '2026-08-24 14:20:05', ip: '171.244.12.90 (Hanoi)', user: 'Minh Tran (learner)', action: 'Passed the HACCP quiz with 100/100', level: 'INFO', tone: 'blue' },
          { time: '2026-08-24 11:10:45', ip: '42.112.30.15 (HCMC)', user: 'Le Thi Mai (useradmin)', action: 'Updated the job titles of 3 checkout counter staff', level: 'NOTICE', tone: 'sage' },
          { time: '2026-08-24 09:05:12', ip: '118.69.182.50 (Danang)', user: 'Nguyen Van Hung (trainer)', action: 'Activated the Live QR attendance code for the Bakery Counter practice class', level: 'INFO', tone: 'blue' },
        ];

        const filteredLogs = auditLogData.filter((item) => {
          if (auditLevelFilter !== 'ALL' && item.level !== auditLevelFilter) return false;
          if (auditSearch) {
            const q = auditSearch.toLowerCase().trim();
            const ipMatch = item.ip.toLowerCase().includes(q);
            const userMatch = item.user.toLowerCase().includes(q);
            const actionMatch = item.action.toLowerCase().includes(q);
            if (!ipMatch && !userMatch && !actionMatch) return false;
          }
          return true;
        });

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="card card-pad" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--ink)' }}>
                  Security Audit Log &amp; Access Monitoring (Security Audit Logs)
                </div>
                <p style={{ fontSize: 13, color: 'var(--ink-soft)', margin: '4px 0 0' }}>
                  Records 100% of sign-ins, permission changes, certificate issuance and data exports, compliant with ISO 27001.
                </p>
              </div>
              <Button variant="outline" icon="ti-download">
                Export The Audit Log File (.LOG)
              </Button>
            </div>

            {/* STANDARDIZED FILTER TOOLBAR CARD */}
            <div className="card card-pad" style={{ background: 'var(--paper-raised)', borderRadius: 10, border: '1px solid var(--line)' }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                {/* Search input */}
                <div style={{ position: 'relative', flex: '1 1 280px', minWidth: 220 }}>
                  <i className="ti ti-search" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-faint)', fontSize: 15 }} />
                  <input
                    type="text"
                    className="field-input"
                    style={{ paddingLeft: 36, paddingRight: auditSearch ? 32 : 12, height: 38, fontSize: 13, width: '100%', borderRadius: 8 }}
                    placeholder="Search by IP address, user, action..."
                    value={auditSearch}
                    onChange={(e) => setAuditSearch(e.target.value)}
                  />
                  {auditSearch && (
                    <button
                      type="button"
                      onClick={() => setAuditSearch('')}
                      style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--ink-faint)', fontSize: 14 }}
                    >
                      <i className="ti ti-x" />
                    </button>
                  )}
                </div>

                {/* Level Filter */}
                <div style={{ minWidth: 180 }}>
                  <select
                    className="field-select"
                    style={{
                      width: '100%',
                      height: 38,
                      fontSize: 13,
                      borderRadius: 8,
                      background: auditLevelFilter !== 'ALL' ? 'var(--blue-soft)' : 'var(--paper)',
                      borderColor: auditLevelFilter !== 'ALL' ? '#005BAA' : 'var(--line)',
                      color: auditLevelFilter !== 'ALL' ? 'var(--blue)' : 'var(--ink)',
                      fontWeight: auditLevelFilter !== 'ALL' ? 700 : 500,
                    }}
                    value={auditLevelFilter}
                    onChange={(e) => setAuditLevelFilter(e.target.value)}
                  >
                    <option value="ALL">All levels</option>
                    <option value="INFO">🔵 INFO</option>
                    <option value="NOTICE">🟢 NOTICE</option>
                    <option value="WARNING">🟡 WARNING</option>
                    <option value="ERROR">🔴 ERROR</option>
                  </select>
                </div>
              </div>

              {/* ACTIVE FILTER TAGS & RESET */}
              {(auditSearch || auditLevelFilter !== 'ALL') && (
                <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px dashed var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>Filtering by:</span>
                    {auditSearch && (
                      <span className="badge" style={{ background: 'var(--blue-soft)', color: 'var(--blue-soft-text)', border: '1px solid #BFDBFE', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        Search term: <strong>"{auditSearch}"</strong>
                        <i className="ti ti-x" style={{ cursor: 'pointer' }} onClick={() => setAuditSearch('')} />
                      </span>
                    )}
                    {auditLevelFilter !== 'ALL' && (
                      <span className="badge" style={{ background: 'var(--blue-soft)', color: 'var(--blue-soft-text)', border: '1px solid #BFDBFE', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        Severity: <strong>{auditLevelFilter}</strong>
                        <i className="ti ti-x" style={{ cursor: 'pointer' }} onClick={() => setAuditLevelFilter('ALL')} />
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => { setAuditSearch(''); setAuditLevelFilter('ALL'); }}
                      style={{ border: 'none', background: 'transparent', color: 'var(--rust, #DC2626)', fontSize: 12, cursor: 'pointer', fontWeight: 600, textDecoration: 'underline', padding: '2px 4px' }}
                    >
                      Clear all filters
                    </button>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
                    Found <strong>{filteredLogs.length}</strong> / {auditLogData.length} records
                  </div>
                </div>
              )}
            </div>

            <div className="card" style={{ overflowX: 'auto', borderRadius: 10, border: '1px solid var(--line)' }}>
              <table className="table" style={{ width: '100%' }}>
                <thead>
                  <tr style={{ background: 'var(--paper-sunken)' }}>
                    <th>Time</th>
                    <th>IP Address</th>
                    <th>Account / User</th>
                    <th>System Event Action</th>
                    <th>Result / Severity</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', padding: '28px 0', color: 'var(--ink-soft)' }}>
                        No log record matches the filters.
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map((item, idx) => (
                      <tr key={idx}>
                        <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{item.time}</td>
                        <td style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--ink-soft)' }}>{item.ip}</td>
                        <td><strong>{item.user}</strong></td>
                        <td style={{ color: 'var(--ink)' }}>{item.action}</td>
                        <td><Badge tone={item.tone}>{item.level}</Badge></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}

      {/* TAB 3: SECURITY POLICIES */}
      {activeTab === 'POLICIES' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card card-pad">
            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--ink)', marginBottom: 6 }}>
              Security &amp; Exam Anti-Cheating Policy Configuration (Security Policies)
            </div>
            <p style={{ fontSize: 13, color: 'var(--ink-soft)', marginBottom: 16 }}>
              Applies mandatory information security policy across the whole MMLearn platform.
            </p>

            <div className="grid grid-2" style={{ marginBottom: 16 }}>
              <div style={{ background: 'var(--paper-sunken)', borderRadius: 8, padding: '12px 16px', border: '1px solid var(--line)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontWeight: 700, fontSize: 13 }}>Dynamic Watermark While Viewing Lessons</span>
                  <input type="checkbox" checked={watermarkEnabled} onChange={(e) => setWatermarkEnabled(e.target.checked)} style={{ width: 18, height: 18 }} />
                </div>
                <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
                  Displays a faint employee code and IP address over the lesson screen to deter photographing internal material.
                </div>
              </div>

              <div style={{ background: 'var(--paper-sunken)', borderRadius: 8, padding: '12px 16px', border: '1px solid var(--line)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontWeight: 700, fontSize: 13 }}>Exam Tab-Switch Monitoring (Window Blur Guard)</span>
                  <input type="checkbox" checked={windowBlurGuard} onChange={(e) => setWindowBlurGuard(e.target.checked)} style={{ width: 18, height: 18 }} />
                </div>
                <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
                  Warns and automatically locks the exam if the candidate switches browser tabs more than 3 times.
                </div>
              </div>
            </div>

            <div className="grid grid-2" style={{ marginBottom: 16 }}>
              <div>
                <label className="field-label">Automatic Sign-Out After Inactivity (Session Timeout)</label>
                <select className="field-select" value={sessionTimeoutMins} onChange={(e) => setSessionTimeoutMins(Number(e.target.value))}>
                  <option value={15}>15 Minutes</option>
                  <option value={30}>30 Minutes (recommended)</option>
                  <option value={60}>60 Minutes</option>
                </select>
              </div>

              <div>
                <label className="field-label">Two-Factor Authentication (2FA) For Admin Accounts</label>
                <select className="field-select" value={twoFactorAuth ? 'ENABLE' : 'DISABLE'} onChange={(e) => setTwoFactorAuth(e.target.value === 'ENABLE')}>
                  <option value="ENABLE">Enforce 2FA</option>
                  <option value="DISABLE">Optional</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              {policySaved && <Badge tone="sage" icon="ti-check">Policy Saved!</Badge>}
              <Button variant="primary" icon="ti-device-floppy" onClick={handleSavePolicy}>
                Save The Security Configuration
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: GOVERNANCE FOR ALL 6 ROLES & THE PERMISSION MATRIX */}
      {activeTab === 'ROLE_GOVERNANCE' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card card-pad" style={{ background: 'linear-gradient(135deg, #FEF2F2 0%, #FEE2E2 100%)', borderColor: '#FCA5A5' }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--rust-soft-text)' }}>
              System Admin (IT) — The Highest Authority In The System
            </div>
            <p style={{ fontSize: 13, color: '#7F1D1D', margin: '4px 0 0' }}>
              The System Admin can manage <strong>all 5 other roles, including the User Admin</strong>. The only difference from the
              User Admin is the right to <strong>change code, schema and platform infrastructure</strong> — the User Admin only administers HR and course operations.
            </p>
          </div>

          {/* The 6-role hierarchy */}
          <div className="card card-pad">
            <div className="section-label">The 6-Role Hierarchy (low → high)</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'stretch' }}>
              {ROLE_DEFINITIONS.map((def, idx) => {
                const persona = personaForRole(def.id);
                return (
                  <React.Fragment key={def.id}>
                    {idx > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', color: 'var(--ink-faint)' }}>
                        <i className="ti ti-chevron-right" />
                      </div>
                    )}
                    <div
                      className="card card-pad"
                      style={{ flex: '1 1 190px', minWidth: 190, background: `var(--${def.tone}-soft)`, borderColor: 'transparent' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                        <i className={`ti ${def.icon}`} />
                        <strong style={{ fontSize: 13 }}>{def.rank}. {def.shortVi}</strong>
                      </div>
                      <div style={{ fontSize: 12, marginBottom: 6 }}>{persona.fullName}</div>
                      <JobLevelBadge level={persona.level} compact />
                      <div style={{ fontSize: 11, marginTop: 8, lineHeight: 1.45 }}>{def.summaryVi}</div>
                      <div style={{ fontSize: 11, marginTop: 8, opacity: 0.85 }}>
                        <strong>Manager:</strong> {managedScopeLabel(def.id)}
                      </div>
                    </div>
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          {/* Capability matrix by role */}
          <div className="card" style={{ overflowX: 'auto' }}>
            <div className="card-pad" style={{ paddingBottom: 0 }}>
              <div className="section-label">Permission Matrix By Role (not by job level)</div>
            </div>
            <table className="table">
              <thead>
                <tr>
                  <th style={{ minWidth: 280 }}>System capability</th>
                  {ROLE_DEFINITIONS.map((def) => (
                    <th key={def.id} style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                      {def.rank}. {def.shortVi}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {CAPABILITY_ROWS.map((row) => (
                  <tr key={row.key}>
                    <td style={{ fontWeight: 600, fontSize: 13 }}>{row.label}</td>
                    {ROLE_DEFINITIONS.map((def) => {
                      const has = capabilitiesOf(def.id).includes(row.key);
                      return (
                        <td key={def.id} style={{ textAlign: 'center' }}>
                          {has
                            ? <i className="ti ti-circle-check" style={{ color: 'var(--sage)', fontSize: 18 }} />
                            : <span style={{ color: 'var(--ink-faint)' }}>—</span>}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Allocate accounts by role */}
          <div className="card" style={{ overflowX: 'auto' }}>
            <div className="card-pad" style={{ paddingBottom: 0 }}>
              <div className="section-label">Account Distribution By Role & Job Level</div>
            </div>
            <table className="table">
              <thead>
                <tr>
                  <th>Role</th>
                  <th>Representative Persona</th>
                  <th>Default Job Level</th>
                  <th>Accounts</th>
                  <th>Management Scope</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {ROLE_DEFINITIONS.map((def) => {
                  const users = allUsers().filter((u) => normalizeRole(u.role) === def.id);
                  const persona = personaForRole(def.id);
                  return (
                    <tr key={def.id}>
                      <td>
                        <Badge tone={def.tone}>{def.rank}. {def.labelVi}</Badge>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{persona.fullName}</div>
                        <div style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--ink-faint)' }}>{persona.userId}</div>
                      </td>
                      <td><JobLevelBadge level={def.defaultLevel} /></td>
                      <td><Badge tone="blue">{users.length} accounts</Badge></td>
                      <td style={{ fontSize: 12, color: 'var(--ink-soft)' }}>{managedScopeLabel(def.id)}</td>
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <Button
                          size="sm"
                          variant="outline"
                          icon="ti-eye"
                          onClick={() => setTranscriptUser(persona)}
                          style={{ fontSize: 12 }}
                        >
                          Details &amp; Promote Level
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Actions reserved for the System Admin */}
          <div className="card card-pad">
            <div className="section-label">Actions Only The System Admin (IT) May Perform</div>
            <div className="grid grid-2" style={{ gap: 12 }}>
              {[
                { icon: 'ti-code', title: 'Add Functions & Change The Platform Schema', desc: 'Deploying new modules, changing data structures and migrations.' },
                { icon: 'ti-plug-connected', title: 'SAP HRIS REST API & SSO Configuration', desc: 'API keys, sync endpoints, SAML/OIDC certificates.' },
                { icon: 'ti-server-bolt', title: 'Infrastructure & Backup Administration', desc: 'Servers, CDN, backup schedule and disaster recovery.' },
                { icon: 'ti-shield-lock', title: 'ISO 27001 Security Policy', desc: 'Watermarking, anti-cheating, immutable audit logs.' },
              ].map((item) => (
                <div key={item.title} className="card card-pad" style={{ background: 'var(--paper-sunken)' }}>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'start' }}>
                    <i className={`ti ${item.icon}`} style={{ fontSize: 20, color: 'var(--rust)' }} />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>{item.title}</div>
                      <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 2 }}>{item.desc}</div>
                      <div style={{ fontSize: 11, color: 'var(--rust)', marginTop: 6, fontWeight: 600 }}>
                        The User Admin is blocked from this action
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: TEAM PERFORMANCE OVERSIGHT */}
      {activeTab === 'TEAM_PERFORMANCE' && canManageUsers && (
        <TeamPerformanceOverview basePath="/sysadmin" />
      )}

      {/* USER TRANSCRIPT & PROMOTION MODAL */}
      <UserTranscriptModal
        targetUser={transcriptUser}
        isOpen={Boolean(transcriptUser)}
        onClose={() => setTranscriptUser(null)}
      />
    </>
  );
}
