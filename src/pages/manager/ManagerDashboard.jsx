import React from 'react';
import { teamMembers, notifications } from '../../data/mockData';
import { Badge, Button, StatCard, StatusStackedBar } from '../../components/ui';

// Manager dashboard is monitoring-only (BR-024/BR-025): no approval or assignment
// actions live here, only visibility into User Learn employees within scope.
export default function ManagerDashboard() {
  const total = teamMembers.length;
  const completed = teamMembers.filter((m) => m.status === 'COMPLETED').length;
  const inProgress = teamMembers.filter((m) => m.status === 'IN_PROGRESS').length;
  const notStarted = teamMembers.filter((m) => m.status === 'NOT_STARTED').length;
  const overdue = teamMembers.filter((m) => m.status === 'OVERDUE').length;
  const failed = teamMembers.filter((m) => m.status === 'FAILED').length;
  const needsAttention = teamMembers.filter((m) => m.status === 'OVERDUE' || m.inactiveDays >= 3);
  const avgCompletion = Math.round(teamMembers.reduce((s, m) => s + m.progress, 0) / total);
  const scored = teamMembers.filter((m) => m.score != null);
  const avgScore = scored.length ? Math.round(scored.reduce((s, m) => s + m.score, 0) / scored.length) : null;

  return (
    <>
      <div className="page-header">
        <h1>Team dashboard</h1>
        <p>Scoped to the {total} employees within your authorized management scope.</p>
      </div>

      <div className="grid grid-4" style={{ marginBottom: 8 }}>
        <StatCard label="Total employees" value={total} />
        <StatCard label="Completed" value={completed} tone="sage" />
        <StatCard label="In progress" value={inProgress} tone="rail" />
        <StatCard label="Not started" value={notStarted} />
      </div>
      <div className="grid grid-4" style={{ marginBottom: 8 }}>
        <StatCard label="Overdue" value={overdue} tone="rust" />
        <StatCard label="Avg. completion rate" value={`${avgCompletion}%`} tone="rail" />
        <StatCard label="Avg. assessment score" value={avgScore != null ? `${avgScore}%` : '—'} tone="sage" />
        <StatCard label="Needs attention" value={needsAttention.length} tone="rust" />
      </div>

      <div className="section-label">Team status breakdown</div>
      <div className="card card-pad" style={{ marginBottom: 8 }}>
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

      <div className="section-label">Needs attention</div>
      <div className="card" style={{ marginBottom: 8 }}>
        {needsAttention.length === 0 ? (
          <div className="empty-state">
            <i className="ti ti-square-check" aria-hidden="true" />
            <p>Nobody needs attention right now.</p>
          </div>
        ) : (
          needsAttention.map((m, i) => (
            <div
              key={m.employeeId}
              style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12,
                padding: '16px 20px', borderBottom: i < needsAttention.length - 1 ? '1px solid var(--line)' : 'none',
              }}
            >
              <div>
                <div style={{ fontWeight: 600, fontSize: 13.5 }}>{m.name}</div>
                <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>{m.course} &middot; {m.progress}% complete</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Badge tone={m.status === 'OVERDUE' ? 'rust' : 'amber'}>
                  {m.status === 'OVERDUE' ? 'Overdue' : `Inactive ${m.inactiveDays}d`}
                </Badge>
                <Button size="sm" icon="ti-bell">Send reminder</Button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="section-label">Alerts</div>
      <div className="card">
        {notifications.managerAlerts.map((a, i) => (
          <div
            key={a.id}
            style={{
              display: 'flex', gap: 12, padding: '13px 20px',
              borderBottom: i < notifications.managerAlerts.length - 1 ? '1px solid var(--line)' : 'none',
            }}
          >
            <i className="ti ti-alert-triangle" style={{ color: 'var(--rust)', fontSize: 15, marginTop: 2 }} aria-hidden="true" />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{a.employee}</div>
              <div style={{ fontSize: 12.5, color: 'var(--ink-soft)' }}>{a.message}</div>
            </div>
            <div style={{ fontSize: 11, color: 'var(--ink-faint)', whiteSpace: 'nowrap' }}>{a.time}</div>
          </div>
        ))}
      </div>
    </>
  );
}
