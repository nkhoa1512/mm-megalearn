import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getTeamMembersForManager, managerUser as defaultManager, notifications } from '../../data/mockData';
import { useCourseStore } from '../../state/CourseStore';
import { canManage } from '../../data/roles';
import { Badge, Button, StatCard, StatusStackedBar, Modal } from '../../components/ui';

export default function ManagerDashboard() {
  const navigate = useNavigate();
  const { approvals, currentUser: authUser } = useCourseStore();
  const activeManager = canManage(authUser?.role, 'learner') ? authUser : defaultManager;
  const teamMembers = getTeamMembersForManager(activeManager);

  const [remindTarget, setRemindTarget] = useState(null);
  const [remindSent, setRemindSent] = useState(false);

  const pendingApprovals = approvals.filter((a) => a.status === 'PENDING');
  const total = teamMembers.length;
  const completed = teamMembers.filter((m) => m.status === 'COMPLETED').length;
  const inProgress = teamMembers.filter((m) => m.status === 'IN_PROGRESS').length;
  const notStarted = teamMembers.filter((m) => m.status === 'NOT_STARTED').length;
  const overdue = teamMembers.filter((m) => m.status === 'OVERDUE').length;
  const failed = teamMembers.filter((m) => m.status === 'FAILED').length;
  const needsAttention = teamMembers.filter((m) => m.status === 'OVERDUE' || m.status === 'FAILED' || m.inactiveDays >= 3);
  const avgCompletion = total > 0 ? Math.round(teamMembers.reduce((s, m) => s + m.progress, 0) / total) : 0;

  function handleSendReminder() {
    setRemindSent(true);
    setTimeout(() => {
      setRemindTarget(null);
      setRemindSent(false);
    }, 1200);
  }

  function handleUnlockRetake(member) {
    alert(`Unlocked 1 additional exam attempt for ${member.name} (${member.course}). Notification sent!`);
  }

  return (
    <>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <h1>Team Dashboard &amp; Compliance Monitoring</h1>
            <Badge tone="amber" icon="ti-briefcase">
              {activeManager.divisionCode} &middot; {activeManager.departmentName || activeManager.departmentCode}
            </Badge>
          </div>
          <p>
            Monitor learning progress, mandatory compliance rates, and process training enrollments for {total} direct reports under {activeManager.fullName} ({activeManager.position}).
          </p>
        </div>


        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <Button variant="outline" icon="ti-user-circle" onClick={() => navigate('/my-learning-dashboard')}>
            Xem Giao Diện Học Tập Cá Nhân
          </Button>
          {pendingApprovals.length > 0 && (
            <Button variant="primary" icon="ti-clipboard-check" onClick={() => navigate('/manager/approvals')}>
              Review {pendingApprovals.length} Pending Approvals
            </Button>
          )}
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-4" style={{ marginBottom: 24 }}>
        <StatCard label="Total Direct Reports" value={total} icon="ti-users" />
        <StatCard label="Completed Courses" value={completed} tone="sage" icon="ti-circle-check" />
        <StatCard label="Avg Completion Rate" value={`${avgCompletion}%`} tone="rail" icon="ti-chart-pie" />
        <StatCard label="Needs Attention" value={needsAttention.length} tone="rust" icon="ti-alert-triangle" />
      </div>

      <div className="section-label">Team Learning Status Breakdown</div>
      <div className="card card-pad" style={{ marginBottom: 24 }}>
        <StatusStackedBar
          segments={[
            { status: 'COMPLETED', value: completed },
            { status: 'IN_PROGRESS', value: inProgress },
            { status: 'NOT_STARTED', value: notStarted },
            { status: 'OVERDUE', value: overdue },
            { status: 'FAILED', value: failed },
          ]}
        />
      </div>

      {/* Needs Attention Table */}
      <div className="section-label">Associates Requiring Manager Follow-up</div>
      <div className="card" style={{ marginBottom: 24 }}>
        {needsAttention.length === 0 ? (
          <div className="empty-state">
            <i className="ti ti-square-check" />
            <p>All team members are maintaining healthy training progression!</p>
          </div>
        ) : (
          needsAttention.map((m, i) => (
            <div
              key={m.employeeId}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 12,
                padding: '16px 20px',
                borderBottom: i < needsAttention.length - 1 ? '1px solid var(--line)' : 'none',
                background: m.status === 'FAILED' ? '#FEF2F2' : m.status === 'OVERDUE' ? '#FFFBEB' : 'transparent',
              }}
            >
              <div style={{ flex: 1, minWidth: 260 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                  <span style={{ fontWeight: 800, fontSize: 14, color: 'var(--ink)' }}>{m.name}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--ink-faint)' }}>({m.employeeId})</span>
                  <span style={{ fontSize: 11.5, color: 'var(--ink-soft)' }}>&middot; {m.position}</span>
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--ink-soft)', marginBottom: 4 }}>
                  Course: <strong>{m.course}</strong> &middot; Progress: <strong>{m.progress}%</strong> &middot; Due: <strong>{m.dueDate || 'Unset'}</strong>
                </div>
                {m.reason && (
                  <div style={{ fontSize: 11.5, color: m.status === 'FAILED' ? '#B91C1C' : m.status === 'OVERDUE' ? '#B45309' : 'var(--ink-soft)', display: 'flex', alignItems: 'center', gap: 5 }}>
                    <i className={m.status === 'FAILED' ? 'ti ti-alert-triangle' : m.status === 'OVERDUE' ? 'ti-clock-alert' : 'ti-info-circle'} />
                    {m.reason}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {m.status === 'FAILED' ? (
                  <>
                    <Badge tone="rust" icon="ti-x">Failed Exam (Score: {m.score}%)</Badge>
                    <Button size="sm" variant="danger" icon="ti-lock-open" onClick={() => handleUnlockRetake(m)}>
                      Unlock Retake Attempt
                    </Button>
                  </>
                ) : m.status === 'OVERDUE' ? (
                  <>
                    <Badge tone="rust" icon="ti-alert-circle">Overdue (Inactive {m.inactiveDays}d)</Badge>
                    <Button size="sm" icon="ti-bell-ringing" variant="primary" onClick={() => setRemindTarget(m)}>
                      Send Urgent Zalo/Teams Ping
                    </Button>
                  </>
                ) : (
                  <>
                    <Badge tone="amber" icon="ti-clock-pause">Inactive {m.inactiveDays}d</Badge>
                    <Button size="sm" icon="ti-bell" variant="outline" onClick={() => setRemindTarget(m)}>
                      Send Reminder
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Manager Alerts */}
      <div className="section-label">System Automated Alert Log</div>
      <div className="card">
        {notifications.managerAlerts.map((a, i) => (
          <div
            key={a.id}
            style={{
              display: 'flex',
              gap: 14,
              padding: '13px 20px',
              borderBottom: i < notifications.managerAlerts.length - 1 ? '1px solid var(--line)' : 'none',
              alignItems: 'center',
            }}
          >
            <div className="stat-icon-badge" style={{ background: 'var(--rust-soft)', color: 'var(--rust-soft-text)' }}>
              <i className="ti ti-alert-triangle" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700 }}>{a.employee}</div>
              <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>{a.message}</div>
            </div>
            <div style={{ fontSize: 11, color: 'var(--ink-faint)', whiteSpace: 'nowrap' }}>{a.time}</div>
          </div>
        ))}
      </div>

      {/* Multi-channel Reminder Modal */}
      <Modal
        isOpen={Boolean(remindTarget)}
        onClose={() => setRemindTarget(null)}
        title="Send Multi-Channel Training Reminder"
        subtitle={remindTarget ? `Recipient: ${remindTarget.name} (${remindTarget.position})` : ''}
        size="md"
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <Button variant="ghost" onClick={() => setRemindTarget(null)}>Cancel</Button>
            <Button variant="primary" icon="ti-send" onClick={handleSendReminder}>
              {remindSent ? 'Notification Dispatched!' : 'Send Reminder Now'}
            </Button>
          </div>
        }
      >
        {remindTarget && (
          <div>
            <div style={{ background: 'var(--paper-sunken)', padding: '12px 16px', borderRadius: 8, marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>Message preview:</div>
              <div style={{ fontSize: 12.5, color: 'var(--ink-soft)', marginTop: 4 }}>
                "Reminder to complete your mandatory training <strong>{remindTarget.course}</strong> before the compliance due date."
              </div>
            </div>

            <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 10 }}>Dispatch Channels:</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13 }}>
                <input type="checkbox" defaultChecked />
                <span><strong>Zalo ZNS / SMS</strong> (Optimized for Store &amp; Kitchen associates)</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13 }}>
                <input type="checkbox" defaultChecked />
                <span><strong>Corporate Email</strong> (Direct notification with instructions)</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13 }}>
                <input type="checkbox" defaultChecked />
                <span><strong>In-App Push Notification</strong></span>
              </label>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}


