import React, { useState } from 'react';
import { getTeamMembersForManager, managerUser as defaultManager, teamSkillGapMatrix, allUsers } from '../../data/mockData';
import { useCourseStore } from '../../store/CourseStore';
import { canManage } from '../../data/roles';
import { Badge, ProgressBar, Button, CourseTypeBadge, Modal } from '../../features/common/ui';
import UserTranscriptModal from '../../features/common/UserTranscriptModal';
import RoadmapProgressSummary from '../../features/roadmaps/RoadmapProgressSummary';

const STATUS_META = {
  NOT_STARTED: { tone: 'slate', label: 'Not Started' },
  IN_PROGRESS: { tone: 'rail', label: 'In Progress' },
  COMPLETED: { tone: 'sage', label: 'Completed' },
  FAILED: { tone: 'rust', label: 'Failed' },
  OVERDUE: { tone: 'rust', label: 'Overdue' },
};

const FILTERS = ['All', 'Not Started', 'In Progress', 'Completed', 'Failed', 'Overdue'];

export default function ManagerTeam() {
  const { currentUser: authUser, openSurveyModal, actionPlans, updateActionPlan, users, getUserRoadmapTabs } = useCourseStore();
  const activeManager = canManage(authUser?.role, 'learner') ? authUser : defaultManager;
  const teamMembers = getTeamMembersForManager(activeManager);

  const [activeTab, setActiveTab] = useState('ROSTER'); // ROSTER, SKILL_GAP, ACTION_PLANS
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [selectedMember, setSelectedMember] = useState(null);
  const [transcriptUser, setTranscriptUser] = useState(null);
  const [roadmapUser, setRoadmapUser] = useState(null);
  const [reminderSent, setReminderSent] = useState(false);

  const filtered = teamMembers.filter((m) => {
    const meta = STATUS_META[m.status]?.label;
    const matchFilter = filter === 'All' || meta === filter;
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
            <h1>Direct Reports &amp; Team Competency Management</h1>
            <Badge tone="amber" icon="ti-briefcase">
              {activeManager.storeName || `${activeManager.divisionCode} - ${activeManager.departmentCode}`}
            </Badge>
          </div>
          <p>
            Monitor learning progress, analyze team skill gaps, and conduct 3-6 month Level 3 behavioral evaluations for {teamMembers.length} direct reports under {activeManager.fullName}. Course assignment is handled by User Admin.
          </p>
        </div>
      </div>

      {/* TABS SWITCHER */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, borderBottom: '1px solid var(--line)', paddingBottom: 8, flexWrap: 'wrap' }}>
        {[
          { id: 'ROSTER', label: 'Direct Reports Roster & Progress', icon: 'ti-users' },
          { id: 'SKILL_GAP', label: 'Team Skill Gap Analysis Matrix', icon: 'ti-chart-bar' },
          { id: 'ACTION_PLANS', label: 'Action Plans & Level 3 Review (3-6 Months)', icon: 'ti-checklist' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="btn btn-sm"
            style={{
              background: activeTab === tab.id ? 'var(--rail)' : 'var(--paper-raised)',
              color: activeTab === tab.id ? '#fff' : 'var(--ink)',
              borderColor: activeTab === tab.id ? 'var(--rail)' : 'var(--line-strong)',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <i className={`ti ${tab.icon}`} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: TEAM ROSTER & ACTIONS */}
      {activeTab === 'ROSTER' && (
        <>
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

            <div style={{ position: 'relative', width: 260 }}>
              <i className="ti ti-search" style={{ position: 'absolute', left: 10, top: 10, color: 'var(--ink-faint)', fontSize: 14 }} />
              <input
                type="text"
                className="field-input"
                style={{ paddingLeft: 32, height: 34, fontSize: 12.5 }}
                placeholder="Search direct reports, title, course..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          {/* Team Table */}
          <div className="card" style={{ overflowX: 'auto', marginBottom: 28, width: '100%' }}>
            <table className="table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th style={{ width: '21%' }}>Employee</th>
                  <th style={{ width: '23%' }}>Assigned Curriculum</th>
                  <th style={{ width: '9%' }}>Type</th>
                  <th style={{ width: '13%' }}>Progress</th>
                  <th style={{ width: '10%' }}>Status</th>
                  <th style={{ width: '6%' }}>Score</th>
                  <th style={{ width: '9%' }}>Due Date</th>
                  <th style={{ width: '9%', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>

              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--ink-faint)' }}>
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
                            Lvl {m.level} &middot; {m.storeName || 'MM An Phu'}
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
                        <td>
                          {m.score !== null ? (
                            <span style={{ fontWeight: 700, color: m.score >= 80 ? 'var(--sage)' : 'var(--rust)', fontSize: 12.5 }}>
                              {m.score}%
                            </span>
                          ) : (
                            <span style={{ color: 'var(--ink-faint)', fontSize: 12 }}>—</span>
                          )}
                        </td>
                        <td style={{ color: m.overdue ? 'var(--rust)' : 'var(--ink-soft)', fontSize: 12, fontWeight: m.overdue ? 700 : 400 }}>
                          {m.dueDate}
                        </td>
                        {/* Manager chỉ xem, không được gán khóa học — việc gán thuộc quyền
                            User Admin / System Admin. */}
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                            <Button
                              size="sm"
                              variant="outline"
                              icon="ti-eye"
                              onClick={() => {
                                const list = users && users.length > 0 ? users : allUsers ? allUsers() : [];
                                const fullUser = list.find(u => u.userId === m.userId || u.employeeCode === m.employeeId || u.fullName === m.name) || m;
                                setTranscriptUser(fullUser);
                              }}
                              title="Xem toàn bộ khóa học nhân sự này đang học"
                            >
                              Chi Tiết
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              icon="ti-map-2"
                              onClick={() => {
                                const list = users && users.length > 0 ? users : allUsers ? allUsers() : [];
                                const fullUser = list.find(u => u.userId === m.userId || u.employeeCode === m.employeeId || u.fullName === m.name) || m;
                                setRoadmapUser(fullUser);
                              }}
                              title="Xem Lộ Trình Cấp Bậc (Tab 1 & Tab 2) của nhân sự này"
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* TAB 2: TEAM SKILL GAP ANALYSIS MATRIX */}
      {activeTab === 'SKILL_GAP' && (
        <div style={{ marginBottom: 28 }}>
          <div style={{ background: 'var(--rail-soft)', color: 'var(--rail-soft-text)', padding: '12px 16px', borderRadius: 8, fontSize: 12.5, marginBottom: 18 }}>
            <i className="ti ti-info-circle" style={{ marginRight: 6 }} />
            Diagnostic matrix comparing <strong>Required Competencies for Target Succession Roles</strong> against <strong>Actual Demonstrated Skill Scores</strong>. Assigning the suggested course is done by User Admin.
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {teamSkillGapMatrix.map((item, idx) => (
              <div key={idx} className="card card-pad">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10, borderBottom: '1px solid var(--line)', paddingBottom: 10 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontWeight: 800, fontSize: 15 }}>{item.employeeName}</span>
                      <span style={{ fontSize: 12, color: 'var(--ink-faint)', fontFamily: 'var(--font-mono)' }}>({item.employeeId})</span>
                      <Badge tone={item.overallGap >= 0 ? 'sage' : item.overallGap > -15 ? 'amber' : 'rust'}>
                        Net Gap: {item.overallGap}%
                      </Badge>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 2 }}>
                      Current Role: <strong>{item.position}</strong> &rarr; Target Succession: <strong>{item.targetRole}</strong>
                    </div>
                  </div>
                </div>

                {/* Skill Items Breakdown */}
                <div className="grid grid-2" style={{ gap: 12 }}>
                  {item.skills.map((sk, sIdx) => {
                    const isGap = sk.gap < 0;
                    return (
                      <div
                        key={sIdx}
                        style={{
                          background: 'var(--paper-sunken)',
                          borderRadius: 8,
                          padding: '10px 14px',
                          borderLeft: isGap ? '4px solid var(--rust)' : '4px solid var(--sage)',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                          <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--ink)' }}>{sk.name}</span>
                          <Badge tone={sk.status === 'EXCEEDED' ? 'sage' : sk.status === 'CRITICAL_GAP' ? 'rust' : 'amber'}>
                            {sk.status === 'EXCEEDED' ? 'Standard Met' : `Gap ${sk.gap}%`}
                          </Badge>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, color: 'var(--ink-soft)', marginBottom: 6 }}>
                          <span>Required: <strong>{sk.required}%</strong></span>
                          <span>Demonstrated: <strong style={{ color: isGap ? 'var(--rust)' : 'var(--sage)' }}>{sk.actual}%</strong></span>
                        </div>
                        <ProgressBar value={sk.actual} tone={isGap ? 'rust' : 'sage'} size="sm" />

                        {sk.suggestedCourse && (
                          <div style={{ marginTop: 8, fontSize: 11.5, color: 'var(--rail)' }}>
                            Suggested Course: <strong>{sk.suggestedCourse}</strong>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: TEAM ACTION PLANS & 3-6 MONTH L3 REVIEW */}
      {activeTab === 'ACTION_PLANS' && (
        <div style={{ marginBottom: 28 }}>
          <div style={{ background: 'var(--amber-soft)', color: 'var(--amber-soft-text)', padding: '12px 16px', borderRadius: 8, fontSize: 12.5, marginBottom: 18 }}>
            <i className="ti ti-checklist" style={{ marginRight: 6 }} />
            Monitor Direct Reports' Action Plan Commitments and complete <strong>Post-Training Behavioral Impact Evaluations (Kirkpatrick Level 3)</strong>.
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {actionPlans.map((plan) => (
              <div key={plan.id} className="card card-pad" style={{ borderLeft: '4px solid var(--amber)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10, flexWrap: 'wrap', gap: 10 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontWeight: 800, fontSize: 14.5 }}>{plan.learnerName}</span>
                      <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>&middot; {plan.learnerPosition}</span>
                      <Badge tone={plan.managerReviewL3 ? 'sage' : 'amber'}>
                        {plan.managerReviewL3 ? 'Level 3 Review Signed-off' : 'Pending Level 3 Review'}
                      </Badge>
                    </div>
                    <div style={{ fontSize: 12.5, color: 'var(--rail)', fontWeight: 600, marginTop: 3 }}>
                      Linked Course: {plan.courseName}
                    </div>
                  </div>

                  <Button
                    size="sm"
                    variant={plan.managerReviewL3 ? 'outline' : 'primary'}
                    icon="ti-award"
                    onClick={() => openSurveyModal({ title: plan.courseName }, 'L3', { name: plan.learnerName, fullName: plan.learnerName })}
                  >
                    {plan.managerReviewL3 ? 'Edit Level 3 Review' : 'Conduct Level 3 Review (3-6 Mos)'}
                  </Button>
                </div>

                <div style={{ background: 'var(--paper-sunken)', borderRadius: 8, padding: '12px 14px', marginBottom: 12 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-soft)', marginBottom: 2 }}>
                    Workplace Commitment &amp; Action Plan Target:
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--ink)', fontWeight: 600, marginBottom: 6 }}>
                    "{plan.targetCommitment}"
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
                    Target KPI: <strong>{plan.kpiTarget}</strong> &middot; Review Deadline: <strong>{plan.evaluationDate}</strong>
                  </div>
                </div>

                {plan.managerReviewL3 && (
                  <div style={{ background: 'var(--sage-soft)', color: 'var(--sage-soft-text)', borderRadius: 8, padding: '10px 14px', fontSize: 12 }}>
                    <div style={{ fontWeight: 700, marginBottom: 2 }}>
                      ✓ Manager Review Rating ({plan.managerReviewL3.score}/5.0 Stars):
                    </div>
                    <div>{plan.managerReviewL3.behaviorChange} - {plan.managerReviewL3.productivityGain}</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Member Details Modal */}
      <Modal
        isOpen={Boolean(selectedMember)}
        onClose={() => setSelectedMember(null)}
        title="Direct Report Learning Detail"
        subtitle={selectedMember ? `${selectedMember.name} (${selectedMember.employeeId}) · ${selectedMember.position}` : ''}
        size="md"
        footer={
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
            <Button variant="ghost" onClick={() => setSelectedMember(null)}>Close</Button>
            <div style={{ display: 'flex', gap: 8 }}>
              <Button
                variant="primary"
                icon={reminderSent ? 'ti-check' : 'ti-bell-ringing'}
                onClick={handleSendReminder}
                disabled={reminderSent}
              >
                {reminderSent ? 'Reminder Dispatched!' : 'Send Learning Reminder'}
              </Button>
            </div>
          </div>
        }
      >
        {selectedMember && (
          <div>
            <div className="card card-pad" style={{ background: 'var(--paper-sunken)', marginBottom: 14 }}>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{selectedMember.course}</div>
              <div style={{ fontSize: 12, color: 'var(--ink-soft)', display: 'flex', gap: 12 }}>
                <span>Type: <strong>{selectedMember.courseType}</strong></span>
                <span>Due Date: <strong>{selectedMember.dueDate}</strong></span>
                <span>Status: <strong>{selectedMember.status}</strong></span>
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                <span>Curriculum Progress</span>
                <strong>{selectedMember.progress}%</strong>
              </div>
              <ProgressBar value={selectedMember.progress} tone={selectedMember.progress >= 100 ? 'sage' : 'rail'} />
            </div>

            <div style={{ fontSize: 12.5, color: 'var(--ink-soft)', lineHeight: 1.5 }}>
              Last activity recorded: <strong>{selectedMember.lastActivity || 'No recent activity'}</strong> ({selectedMember.inactiveDays || 0} days inactive).
            </div>
          </div>
        )}
      </Modal>

      {/* USER TRANSCRIPT DRILL-DOWN MODAL */}
      <UserTranscriptModal
        targetUser={transcriptUser}
        isOpen={Boolean(transcriptUser)}
        onClose={() => setTranscriptUser(null)}
      />

      {/* ROADMAP DRILL-DOWN MODAL (Tab 1 & Tab 2 progress) */}
      <Modal
        isOpen={Boolean(roadmapUser)}
        onClose={() => setRoadmapUser(null)}
        title="Lộ Trình Cấp Bậc Của Nhân Sự"
        subtitle={roadmapUser ? `${roadmapUser.fullName} · Level ${roadmapUser.level}` : ''}
        size="md"
      >
        {roadmapUser && <RoadmapProgressSummary roadmap={getUserRoadmapTabs(roadmapUser)} />}
      </Modal>
    </>
  );
}
