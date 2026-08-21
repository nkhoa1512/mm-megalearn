import React, { useState } from 'react';
import { getTeamMembersForManager, managerUser as defaultManager } from '../../data/mockData';
import { useCourseStore } from '../../state/CourseStore';
import { Badge, ProgressBar, Button, CourseTypeBadge, Modal } from '../../components/ui';

const STATUS_META = {
  NOT_STARTED: { tone: 'slate', label: 'Not started' },
  IN_PROGRESS: { tone: 'rail', label: 'In progress' },
  COMPLETED: { tone: 'sage', label: 'Completed' },
  FAILED: { tone: 'rust', label: 'Failed' },
  OVERDUE: { tone: 'rust', label: 'Overdue' },
};

const FILTERS = ['All', 'Not started', 'In progress', 'Completed', 'Failed', 'Overdue'];

export default function ManagerTeam() {
  const { currentUser: authUser } = useCourseStore();
  const activeManager = authUser?.role === 'manager' || authUser?.role === 'admin' ? authUser : defaultManager;
  const teamMembers = getTeamMembersForManager(activeManager);

  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [selectedMember, setSelectedMember] = useState(null);
  const [reminderSent, setReminderSent] = useState(false);

  const filtered = teamMembers.filter((m) => {
    const matchFilter = filter === 'All' || STATUS_META[m.status]?.label === filter;
    const matchSearch =
      !search ||
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.employeeId.toLowerCase().includes(search.toLowerCase()) ||
      m.course.toLowerCase().includes(search.toLowerCase()) ||
      m.position.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  function handleSendReminder() {
    setReminderSent(true);
    setTimeout(() => {
      setReminderSent(false);
      setSelectedMember(null);
    }, 1500);
  }

  return (
    <>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <h1>Direct Reports &amp; Team Roster</h1>
            <Badge tone="amber" icon="ti-briefcase">
              {activeManager.divisionCode} &middot; {activeManager.departmentName || activeManager.departmentCode}
            </Badge>
          </div>
          <p>
            Monitor learning progress, mandatory certifications, and compliance status for {teamMembers.length} direct reports under {activeManager.fullName} ({activeManager.position}).
          </p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="card card-pad" style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
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

        <div style={{ position: 'relative', width: 240 }}>
          <i className="ti ti-search" style={{ position: 'absolute', left: 10, top: 10, color: 'var(--ink-faint)', fontSize: 14 }} />
          <input
            type="text"
            className="field-input"
            style={{ paddingLeft: 32, height: 34, fontSize: 12.5 }}
            placeholder="Search direct reports..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Team Table Stretched Full Width */}
      <div className="card" style={{ overflowX: 'auto', marginBottom: 28, width: '100%' }}>
        <table className="table" style={{ width: '100%' }}>
          <thead>
            <tr>
              <th style={{ width: '18%' }}>Employee</th>
              <th style={{ width: '22%' }}>Assigned Course</th>
              <th style={{ width: '12%' }}>Type</th>
              <th style={{ width: '14%' }}>Progress</th>
              <th style={{ width: '10%' }}>Status</th>
              <th style={{ width: '6%' }}>Score</th>
              <th style={{ width: '6%' }}>Attempts</th>
              <th style={{ width: '9%' }}>Due Date</th>
              <th style={{ width: '9%' }}>Last Activity</th>
              <th style={{ width: '6%', textAlign: 'right' }}>Action</th>
            </tr>
          </thead>

          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={10} style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--ink-faint)' }}>
                  <i className="ti ti-users" style={{ fontSize: 24, display: 'block', marginBottom: 8 }} />
                  No direct reports matching the selected filter.
                </td>
              </tr>
            ) : (
              filtered.map((m) => {
                const meta = STATUS_META[m.status] || STATUS_META.NOT_STARTED;
                return (
                  <tr key={m.employeeId}>
                    <td>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>{m.name}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--ink-faint)' }}>
                        <span style={{ fontFamily: 'var(--font-mono)' }}>{m.employeeId}</span> &middot; {m.position}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--ink)' }}>{m.course}</div>
                      <div style={{ fontSize: 11, color: 'var(--ink-faint)' }}>
                        {m.divisionCode} / {m.departmentCode} (Lvl {m.level})
                      </div>
                    </td>
                    <td><CourseTypeBadge courseType={m.courseType} /></td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ flex: 1 }}>
                          <ProgressBar
                            value={m.progress}
                            tone={meta.tone === 'rust' ? 'rust' : meta.tone === 'sage' ? 'sage' : 'rail'}
                          />
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-soft)', minWidth: 32 }}>
                          {m.progress}%
                        </span>
                      </div>
                    </td>
                    <td><Badge tone={meta.tone}>{meta.label}</Badge></td>
                    <td style={{ color: 'var(--ink-soft)', fontWeight: m.score ? 700 : 400 }}>
                      {m.score != null ? `${m.score}%` : '—'}
                    </td>
                    <td style={{ color: 'var(--ink-soft)', fontFamily: 'var(--font-mono)' }}>
                      {m.attempts}
                    </td>
                    <td style={{ color: m.status === 'OVERDUE' ? 'var(--rust)' : 'var(--ink-soft)', fontSize: 12.5, fontWeight: m.status === 'OVERDUE' ? 700 : 400 }}>
                      {formatDate(m.dueDate)}
                    </td>
                    <td style={{ color: 'var(--ink-soft)', fontSize: 12.5 }}>
                      {m.lastActivity ? formatDate(m.lastActivity) : '—'}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <Button size="sm" variant="outline" onClick={() => setSelectedMember(m)}>
                        Details
                      </Button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Member Details Modal */}
      {selectedMember && (
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
          onClick={() => setSelectedMember(null)}
        >
          <div
            className="card card-pad"
            style={{ maxWidth: 560, width: '100%', background: 'var(--paper-raised)', boxShadow: 'var(--shadow-xl)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, borderBottom: '1px solid var(--line)', paddingBottom: 12 }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 17, color: 'var(--ink)' }}>
                  {selectedMember.name}
                </div>
                <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
                  {selectedMember.employeeId} &middot; {selectedMember.position} &middot; Level {selectedMember.level}
                </div>
              </div>
              <button
                onClick={() => setSelectedMember(null)}
                style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--ink-faint)' }}
              >
                &times;
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ background: 'var(--paper-sunken)', padding: 14, borderRadius: 'var(--radius-md)', border: '1px solid var(--line)' }}>
                <div style={{ fontSize: 11, color: 'var(--ink-faint)', textTransform: 'uppercase', fontWeight: 700, marginBottom: 4 }}>
                  Current Assigned Curriculum
                </div>
                <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--ink)', marginBottom: 8 }}>
                  {selectedMember.course}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, fontSize: 12 }}>
                  <div>
                    <span style={{ color: 'var(--ink-faint)' }}>Status: </span>
                    <Badge tone={STATUS_META[selectedMember.status]?.tone}>
                      {STATUS_META[selectedMember.status]?.label}
                    </Badge>
                  </div>
                  <div>
                    <span style={{ color: 'var(--ink-faint)' }}>Progress: </span>
                    <strong>{selectedMember.progress}%</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--ink-faint)' }}>Score: </span>
                    <strong>{selectedMember.score != null ? `${selectedMember.score}%` : 'N/A'}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--ink-faint)' }}>Attempts: </span>
                    <strong>{selectedMember.attempts} / 3</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--ink-faint)' }}>Due Date: </span>
                    <strong>{formatDate(selectedMember.dueDate)}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--ink-faint)' }}>Last Active: </span>
                    <strong>{formatDate(selectedMember.lastActivity)}</strong>
                  </div>
                </div>
              </div>

              {selectedMember.reason && (
                <div style={{ background: '#FFFBEB', border: '1px solid #FCD34D', padding: '10px 14px', borderRadius: 6, fontSize: 12, color: '#92400E' }}>
                  <i className="ti ti-alert-circle" style={{ marginRight: 6 }} />
                  <strong>Attention Note:</strong> {selectedMember.reason}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20, borderTop: '1px solid var(--line)', paddingTop: 14 }}>
              <Button variant="outline" onClick={() => setSelectedMember(null)}>
                Close
              </Button>
              <Button
                variant="primary"
                icon={reminderSent ? 'ti-check' : 'ti-bell'}
                onClick={handleSendReminder}
              >
                {reminderSent ? 'Notification Sent via Zalo & Teams!' : 'Send Direct Reminder'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
