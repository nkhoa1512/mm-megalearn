import React, { useState } from 'react';
import { teamMembers } from '../../data/mockData';
import { Badge, ProgressBar, Button, CourseTypeBadge } from '../../components/ui';

const STATUS_META = {
  NOT_STARTED: { tone: 'slate', label: 'Not started' },
  IN_PROGRESS: { tone: 'rail', label: 'In progress' },
  COMPLETED: { tone: 'sage', label: 'Completed' },
  FAILED: { tone: 'rust', label: 'Failed' },
  OVERDUE: { tone: 'rust', label: 'Overdue' },
};

const FILTERS = ['All', 'Not started', 'In progress', 'Completed', 'Failed', 'Overdue'];

// FR-DASH-MGR-002: Manager can monitor employee/course/progress/status/score/attempts/
// due date/last activity within scope. No action here changes an assignment (BR-025).
export default function ManagerTeam() {
  const [filter, setFilter] = useState('All');

  const filtered = teamMembers.filter((m) => {
    if (filter === 'All') return true;
    return STATUS_META[m.status].label === filter;
  });

  return (
    <>
      <div className="page-header">
        <h1>Team</h1>
        <p>Every User Learn employee within your authorized management scope and their assigned training.</p>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className="btn btn-sm"
            style={{
              background: filter === f ? 'var(--rail)' : 'var(--paper-raised)',
              color: filter === f ? '#fff' : 'var(--ink)',
              borderColor: filter === f ? 'var(--rail)' : 'var(--line-strong)',
            }}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>Employee</th>
              <th>Course</th>
              <th>Type</th>
              <th>Progress</th>
              <th>Status</th>
              <th>Score</th>
              <th>Attempts</th>
              <th>Due date</th>
              <th>Last activity</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((m) => {
              const meta = STATUS_META[m.status];
              return (
                <tr key={m.employeeId}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{m.name}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--ink-faint)' }}>{m.position}</div>
                  </td>
                  <td>{m.course}</td>
                  <td><CourseTypeBadge courseType={m.courseType} /></td>
                  <td style={{ minWidth: 130 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ flex: 1 }}><ProgressBar value={m.progress} tone={meta.tone === 'rust' ? 'rust' : meta.tone === 'sage' ? 'sage' : 'rail'} /></div>
                      <span style={{ fontSize: 12 }}>{m.progress}%</span>
                    </div>
                  </td>
                  <td><Badge tone={meta.tone}>{meta.label}</Badge></td>
                  <td style={{ color: 'var(--ink-soft)' }}>{m.score != null ? `${m.score}%` : '—'}</td>
                  <td style={{ color: 'var(--ink-soft)' }}>{m.attempts}</td>
                  <td style={{ color: 'var(--ink-soft)', fontSize: 12.5 }}>{formatDate(m.dueDate)}</td>
                  <td style={{ color: 'var(--ink-soft)', fontSize: 12.5 }}>{m.lastActivity ? formatDate(m.lastActivity) : '—'}</td>
                  <td><Button size="sm">View</Button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
