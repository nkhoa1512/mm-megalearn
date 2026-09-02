import React, { useState, useMemo } from 'react';
import { managerUser as defaultManager, allUsers, enrollmentsForUser } from '../../data/mockData';
import { useCourseStore } from '../../store/CourseStore';
import { canManage } from '../../data/roles';
import { Badge, ProgressBar, Button, Modal } from '../../features/common/ui';
import { downloadCsv } from '../../lib/exportCsv';
import UserTranscriptModal from '../../features/common/UserTranscriptModal';
import RoadmapTabsPanel from '../../features/roadmaps/RoadmapTabsPanel';
import {
  buildTeam,
  teamSummary,
  teamAssignments,
  attentionByMember,
  teamActionPlans,
  canSendReminder,
  MEMBER_STATUS_LABELS,
  L3_STATE,
} from '../../utils/managerRules';
import {
  TeamScopeBar,
  ManagerKpiRow,
  AttentionQueue,
  TeamRoster,
  ManagerRuleReference,
  RuleTag,
} from './ManagerTeamInsights';

const TABS = [
  { id: 'ATTENTION', label: 'Needs Action Today', icon: 'ti-alert-triangle' },
  { id: 'ROSTER', label: 'Team Roster & Progress', icon: 'ti-list-check' },
  { id: 'COURSES', label: 'Course Coverage', icon: 'ti-stack-2' },
  { id: 'ACTION_PLANS', label: 'Action Commitments & L3 Review', icon: 'ti-checklist' },
];

const L3_TONE = {
  [L3_STATE.SIGNED_OFF]: 'sage',
  [L3_STATE.DUE]: 'amber',
  [L3_STATE.OVERDUE]: 'rust',
  [L3_STATE.TOO_EARLY]: 'slate',
};

export default function ManagerTeam({ initialTab = 'ATTENTION' }) {
  const { currentUser: authUser, openSurveyModal, actionPlans, users, enrollments, courses } = useCourseStore();
  const activeManager = canManage(authUser?.role, 'learner') ? authUser : defaultManager;

  const [activeTab, setActiveTab] = useState(initialTab);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const [transcriptUser, setTranscriptUser] = useState(null);
  const [roadmapUser, setRoadmapUser] = useState(null);
  const [reminderTarget, setReminderTarget] = useState(null);
  const [reminderMessage, setReminderMessage] = useState('');
  // Reminders live in session state: persisting them needs the notification
  // backend, which the prototype does not have. The cooldown rule still applies.
  const [reminderLog, setReminderLog] = useState([]);
  const [toast, setToast] = useState(null);

  const today = useMemo(() => new Date(), []);
  const roster = useMemo(() => (users && users.length > 0 ? users : allUsers()), [users]);

  // The store's `enrollments` holds only what was enrolled during this session.
  // The rules need the full picture, so the static HRIS matrix is merged underneath.
  const effectiveEnrollments = useMemo(() => {
    const map = {};
    roster.forEach((u) => { map[u.userId] = enrollmentsForUser(u, enrollments); });
    return map;
  }, [roster, enrollments]);

  const team = useMemo(
    () => buildTeam(activeManager, roster, effectiveEnrollments, today),
    [activeManager, roster, effectiveEnrollments, today]
  );

  const summary = useMemo(() => teamSummary(team), [team]);
  const attention = useMemo(() => attentionByMember(team, courses, today), [team, courses, today]);
  const assignments = useMemo(
    () => teamAssignments(team, effectiveEnrollments, courses),
    [team, effectiveEnrollments, courses]
  );
  const plans = useMemo(() => teamActionPlans(team, actionPlans, today), [team, actionPlans, today]);

  const filteredMembers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return team.members.filter(({ user, state }) => {
      if (statusFilter !== 'ALL' && state.status !== statusFilter) return false;
      if (!q) return true;
      return (
        user.fullName?.toLowerCase().includes(q) ||
        user.employeeCode?.toLowerCase().includes(q) ||
        user.position?.toLowerCase().includes(q)
      );
    });
  }, [team, search, statusFilter]);

  // Per-course coverage across the real assignment matrix.
  const courseCoverage = useMemo(() => {
    const map = new Map();
    assignments.forEach((row) => {
      const slot = map.get(row.courseId) || {
        courseId: row.courseId, course: row.course, mandatory: row.mandatory,
        assigned: 0, completed: 0, overdue: 0, notStarted: 0, failed: 0, scores: [],
      };
      slot.assigned += 1;
      if (row.status === 'COMPLETED') slot.completed += 1;
      if (row.status === 'OVERDUE') slot.overdue += 1;
      if (row.status === 'NOT_STARTED') slot.notStarted += 1;
      if (row.status === 'FAILED') slot.failed += 1;
      if (typeof row.score === 'number') slot.scores.push(row.score);
      map.set(row.courseId, slot);
    });
    return Array.from(map.values())
      .map((s) => ({
        ...s,
        completionPercent: s.assigned > 0 ? Math.round((s.completed / s.assigned) * 100) : 0,
        averageScore: s.scores.length ? Math.round(s.scores.reduce((a, b) => a + b, 0) / s.scores.length) : null,
      }))
      .sort((a, b) => (b.mandatory ? 1 : 0) - (a.mandatory ? 1 : 0) || a.completionPercent - b.completionPercent);
  }, [assignments]);

  function showToast(message) {
    setToast(message);
    setTimeout(() => setToast(null), 3500);
  }

  function reminderStateFor(item) {
    const member = team.members.find((m) => m.user.userId === item.userId);
    return canSendReminder(member, reminderLog, today);
  }

  function openReminder(item) {
    setReminderTarget(item);
    setReminderMessage(
      `${item.name}, ${item.reason}. ${item.action}. Please confirm a completion date with me this week.`
    );
  }

  function sendReminder(e) {
    e.preventDefault();
    if (!reminderTarget) return;
    setReminderLog((prev) => [
      ...prev,
      { userId: reminderTarget.userId, employeeCode: reminderTarget.employeeCode, sentAt: today.toISOString().slice(0, 10) },
    ]);
    showToast(`Reminder sent to ${reminderTarget.name}. A 3-day cooldown now applies (BR-MGR-050).`);
    setReminderTarget(null);
  }

  function memberUser(item) {
    return team.members.find((m) => m.user.userId === item.userId)?.user || null;
  }

  function handleExportCsv() {
    const headers = [
      'Employee code', 'Full name', 'Position', 'Relationship',
      'Assigned', 'Completed', 'Completion %', 'Overdue', 'Retake blocked',
      'Mandatory completed', 'Mandatory required', 'Average score', 'Last activity', 'Status',
    ];
    const rows = team.members.map(({ user, relationshipLabel, state }) => [
      user.employeeCode, user.fullName, user.position, relationshipLabel,
      state.assigned, state.completed, state.completionPercent, state.overdue, state.failed,
      state.mandatoryCompleted, state.mandatoryRequired,
      state.averageScore === null ? 'Not scored' : state.averageScore,
      state.lastActivity || 'Never', MEMBER_STATUS_LABELS[state.status],
    ]);
    downloadCsv(
      `Team_Training_Report_${activeManager.divisionCode || 'Team'}_${new Date().toISOString().slice(0, 10)}.csv`,
      [headers, ...rows]
    );
    showToast('Team training report exported.');
  }

  return (
    <>
      {toast && (
        <div
          style={{
            position: 'fixed', top: 24, right: 24, zIndex: 9999,
            background: '#111827', color: '#fff', padding: '12px 20px', borderRadius: 8,
            boxShadow: '0 8px 24px rgba(0,0,0,0.2)', fontSize: 14, fontWeight: 600,
            display: 'flex', alignItems: 'center', gap: 10,
          }}
        >
          <i className="ti ti-check" style={{ color: 'var(--sage)' }} />
          <span>{toast}</span>
        </div>
      )}

      {/* HEADER */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <h1>Team Training &amp; Competency Management</h1>
            <Badge tone="amber" icon="ti-briefcase">Line Manager (Level 4)</Badge>
          </div>
          <p style={{ margin: 0 }}>
            Line Manager: <strong>{activeManager.fullName}</strong> &middot;{' '}
            {team.departmentName || activeManager.departmentName || 'Department'} &middot;{' '}
            {team.members.length} employee{team.members.length === 1 ? '' : 's'} in scope
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="outline" icon="ti-download" onClick={handleExportCsv}>Export team report</Button>
        </div>
      </div>

      <TeamScopeBar manager={activeManager} team={team} />
      <ManagerKpiRow summary={summary} attentionCount={attention.length} />

      {/* TABS */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, borderBottom: '1px solid var(--line)', paddingBottom: 8, flexWrap: 'wrap' }}>
        {TABS.map((tab) => {
          const count =
            tab.id === 'ATTENTION' ? attention.length
              : tab.id === 'ROSTER' ? team.members.length
              : tab.id === 'COURSES' ? courseCoverage.length
              : plans.length;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="btn btn-sm"
              style={{
                background: activeTab === tab.id ? 'var(--rail)' : 'var(--paper-raised)',
                color: activeTab === tab.id ? '#fff' : 'var(--ink)',
                borderColor: activeTab === tab.id ? 'var(--rail)' : 'var(--line-strong)',
                display: 'flex', alignItems: 'center', gap: 6,
                fontWeight: activeTab === tab.id ? 700 : 500,
              }}
            >
              <i className={`ti ${tab.icon}`} />
              <span>{tab.label}</span>
              <span style={{
                background: activeTab === tab.id ? 'rgba(255,255,255,0.25)' : 'var(--line)',
                padding: '1px 6px', borderRadius: 10, fontSize: 11, fontWeight: 700,
              }}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* TAB 1 — NEEDS ACTION TODAY */}
      {activeTab === 'ATTENTION' && (
        <AttentionQueue
          items={attention}
          reminderState={reminderStateFor}
          onRemind={openReminder}
          onViewMember={(item) => setTranscriptUser(memberUser(item))}
          onViewRoadmap={(item) => setRoadmapUser(memberUser(item))}
        />
      )}

      {/* TAB 2 — ROSTER */}
      {activeTab === 'ROSTER' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card card-pad" style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: '1 1 280px', minWidth: 220 }}>
              <i className="ti ti-search" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-faint)', fontSize: 15 }} />
              <input
                type="text"
                className="field-input"
                style={{ paddingLeft: 36, height: 38, fontSize: 13, width: '100%', borderRadius: 8 }}
                placeholder="Search by name, employee code or job title..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select
              className="field-select"
              style={{ height: 38, fontSize: 13, borderRadius: 8, minWidth: 190 }}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">All statuses</option>
              <option value="OVERDUE">Overdue</option>
              <option value="FAILED">Retake blocked</option>
              <option value="NOT_STARTED">Not started</option>
              <option value="IN_PROGRESS">In progress</option>
              <option value="COMPLETED">Up to date</option>
            </select>
            <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
              Showing <strong>{filteredMembers.length}</strong> of {team.members.length}
            </span>
          </div>

          <TeamRoster
            members={filteredMembers}
            onViewTranscript={(user) => setTranscriptUser(user)}
            onViewRoadmap={(user) => setRoadmapUser(user)}
          />
        </div>
      )}

      {/* TAB 3 — COURSE COVERAGE */}
      {activeTab === 'COURSES' && (
        <div className="card card-pad">
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 15, fontWeight: 800 }}>
              Course coverage across the team ({courseCoverage.length} courses, {assignments.length} enrollments)
            </div>
            <p style={{ fontSize: 12, color: 'var(--ink-soft)', margin: '3px 0 0', maxWidth: 780 }}>
              One row per course actually assigned to somebody on this team, mandatory courses first and weakest coverage
              at the top. This is the real assignment matrix, not one sampled course per person. <RuleTag id="BR-MGR-010" />
            </p>
          </div>

          {courseCoverage.length === 0 ? (
            <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--ink-soft)', fontSize: 13 }}>
              Nobody on this team has an assigned course yet.
            </div>
          ) : (
            <table className="table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>Course</th>
                  <th style={{ width: 100 }}>Type</th>
                  <th style={{ minWidth: 150 }}>Completion</th>
                  <th style={{ width: 90 }}>Overdue</th>
                  <th style={{ width: 100 }}>Not started</th>
                  <th style={{ width: 90 }}>Avg score</th>
                </tr>
              </thead>
              <tbody>
                {courseCoverage.map((row) => (
                  <tr key={row.courseId}>
                    <td>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>{row.course}</div>
                      <div style={{ fontSize: 11, color: 'var(--ink-faint)', fontFamily: 'monospace' }}>{row.courseId}</div>
                    </td>
                    <td>
                      <Badge tone={row.mandatory ? 'rust' : 'slate'} size="sm">
                        {row.mandatory ? 'Mandatory' : 'Elective'}
                      </Badge>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ flex: 1 }}>
                          <ProgressBar
                            value={row.completionPercent}
                            tone={row.completionPercent >= 80 ? 'sage' : row.completionPercent >= 50 ? 'amber' : 'rust'}
                            size="sm"
                          />
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 700, minWidth: 38 }}>{row.completionPercent}%</span>
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--ink-faint)', marginTop: 3 }}>
                        {row.completed} of {row.assigned} employees
                      </div>
                    </td>
                    <td style={{ fontSize: 13, fontWeight: 700, color: row.overdue > 0 ? 'var(--rust)' : 'var(--ink-soft)' }}>
                      {row.overdue}
                    </td>
                    <td style={{ fontSize: 13, color: 'var(--ink-soft)' }}>{row.notStarted}</td>
                    <td style={{ fontSize: 13, fontWeight: 600 }}>
                      {row.averageScore === null
                        ? <span style={{ color: 'var(--ink-faint)', fontWeight: 400 }}>—</span>
                        : `${row.averageScore}%`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* TAB 4 — ACTION PLANS & L3 */}
      {activeTab === 'ACTION_PLANS' && (
        <div className="card card-pad">
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 15, fontWeight: 800 }}>
              Action commitments and behavioural review ({plans.length})
            </div>
            <p style={{ fontSize: 12, color: 'var(--ink-soft)', margin: '3px 0 0', maxWidth: 780 }}>
              Only this team&apos;s commitments appear — a plan made by somebody in another department is not this
              manager&apos;s to sign off. A review falls due 90 days after the commitment and is overdue at 180.
              {' '}<RuleTag id="BR-MGR-040" /> <RuleTag id="BR-MGR-041" />
            </p>
          </div>

          {plans.length === 0 ? (
            <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--ink-soft)', fontSize: 13 }}>
              Nobody on this team has an open action plan. Commitments are created by the learner after finishing a course.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {plans.map((plan) => (
                <div
                  key={plan.id || `${plan.userId}-${plan.courseId}`}
                  style={{
                    padding: '12px 14px', borderRadius: 10, background: 'var(--paper-sunken)',
                    border: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between',
                    alignItems: 'flex-start', gap: 16, flexWrap: 'wrap',
                  }}
                >
                  <div style={{ flex: 1, minWidth: 240 }}>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>
                      {plan.learnerName || plan.userId} &middot;{' '}
                      <span style={{ color: 'var(--rail)' }}>{plan.courseName || plan.courseId}</span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 3 }}>
                      {plan.commitment || plan.description || 'Behaviour change commitment made after the course.'}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <Badge tone={L3_TONE[plan.review.state] || 'slate'} size="sm">{plan.review.label}</Badge>
                    {plan.review.ageDays !== null && (
                      <div style={{ fontSize: 11, color: 'var(--ink-faint)', marginTop: 4 }}>
                        Committed {plan.review.ageDays} days ago
                      </div>
                    )}
                    {plan.review.state !== L3_STATE.TOO_EARLY && plan.review.state !== L3_STATE.SIGNED_OFF && (
                      <div style={{ marginTop: 6 }}>
                        <Button
                          size="sm"
                          variant="primary"
                          icon="ti-checklist"
                          onClick={() => openSurveyModal(
                            { title: plan.courseName || plan.courseId },
                            'L3',
                            { name: plan.learnerName, fullName: plan.learnerName }
                          )}
                        >
                          Record L3 review
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <ManagerRuleReference />

      {/* MODALS */}
      <UserTranscriptModal
        targetUser={transcriptUser}
        isOpen={Boolean(transcriptUser)}
        onClose={() => setTranscriptUser(null)}
      />

      {roadmapUser && (
        <Modal
          title={`Level Competency Roadmap: ${roadmapUser.fullName || roadmapUser.name}`}
          subtitle={roadmapUser.position}
          onClose={() => setRoadmapUser(null)}
          size="lg"
        >
          <RoadmapTabsPanel user={roadmapUser} />
        </Modal>
      )}

      {reminderTarget && (
        <Modal
          title={`Send a progress reminder: ${reminderTarget.name}`}
          subtitle={reminderTarget.reason}
          onClose={() => setReminderTarget(null)}
          size="md"
        >
          <form onSubmit={sendReminder}>
            <div style={{ marginBottom: 12, padding: '10px 12px', background: 'var(--paper-sunken)', borderRadius: 8, fontSize: 12, color: 'var(--ink-soft)' }}>
              <b>Recommended action:</b> {reminderTarget.action} <RuleTag id={reminderTarget.rule} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label className="field-label">Message</label>
              <textarea
                className="field-input"
                rows={4}
                value={reminderMessage}
                onChange={(e) => setReminderMessage(e.target.value)}
                required
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <Button variant="ghost" onClick={() => setReminderTarget(null)}>Cancel</Button>
              <Button type="submit" variant="primary" icon="ti-send">Send reminder</Button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
