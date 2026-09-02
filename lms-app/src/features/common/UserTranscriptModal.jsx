import React, { useState, useMemo } from 'react';
import { Badge, Button, ProgressBar, Modal, JobLevelBadge } from './ui';
import { useCourseStore } from '../../store/CourseStore';
import { levelTitle, LEVEL_DEFINITIONS } from '../../data/levelSystem';
import RoadmapProgressSummary from '../roadmaps/RoadmapProgressSummary';

const statusMap = {
  COMPLETED: { tone: 'sage', label: 'Completed' },
  IN_PROGRESS: { tone: 'amber', label: 'In Progress' },
  NOT_STARTED: { tone: 'slate', label: 'Not Started' },
  OVERDUE: { tone: 'rust', label: 'Overdue' },
  FAILED: { tone: 'rust', label: 'Retake Required' },
};

function formatDate(iso) {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return iso;
  }
}

export default function UserTranscriptModal({ targetUser, isOpen, onClose, onEdit, onDelete }) {
  const { courses, currentUser, promoteUserLevel, myCourses, getUserRoadmapTabs } = useCourseStore();

  const [activeTab, setActiveTab] = useState('transcript'); // transcript | roadmap
  const [promoteModalOpen, setPromoteModalOpen] = useState(false);
  const [selectedNewLevel, setSelectedNewLevel] = useState('6');
  const [promotionReason, setPromotionReason] = useState(
    'Excellent completion of the required courses and achievement of the L&OD operational competency standard.'
  );
  const [promotionSuccess, setPromotionSuccess] = useState(false);

  // All of this person's (enrolled) courses, including enrollments created
  // during the session — use the store's myCourses instead of enrollmentsForUser (that function
  // returns an object keyed by courseId, not an array, and takes (user, overlay) rather than
  // not (courseList, user) as it was once mistakenly called here, causing the "filter is
  // not a function").
  const userCourses = useMemo(() => {
    if (!targetUser) return [];
    return myCourses(courses, targetUser);
  }, [myCourses, courses, targetUser]);

  if (!isOpen || !targetUser) return null;

  // Stats calculation
  const totalCourses = userCourses.length;
  const completedList = userCourses.filter((c) => c.enrollment?.status === 'COMPLETED');
  const inProgressList = userCourses.filter((c) => c.enrollment?.status === 'IN_PROGRESS');
  const overdueList = userCourses.filter((c) => c.enrollment?.status === 'OVERDUE' || c.enrollment?.status === 'FAILED');

  const avgScore = completedList.length > 0
    ? Math.round(completedList.reduce((sum, c) => sum + (c.enrollment?.score || c.passingScore || 85), 0) / completedList.length)
    : '—';

  // Permission check for promoting Level
  const canPromote = currentUser?.role === 'useradmin' || currentUser?.role === 'sysadmin';

  function handlePromoteSubmit(e) {
    e.preventDefault();
    if (!selectedNewLevel) return;
    promoteUserLevel(targetUser.userId, selectedNewLevel, promotionReason);
    setPromotionSuccess(true);
    setTimeout(() => {
      setPromotionSuccess(false);
      setPromoteModalOpen(false);
    }, 1400);
  }

  return (
    <>
      <Modal
        isOpen={isOpen && !promoteModalOpen}
        onClose={onClose}
        title="Employee Profile &amp; Course Details"
        size="lg"
      >
        <div style={{ padding: '4px 0' }}>
          {/* USER HEADER CARD */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 16,
              background: 'var(--paper-sunken)',
              padding: '16px 20px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--line)',
              marginBottom: 20,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: '50%',
                  background: 'var(--rail)',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: 18,
                  flexShrink: 0,
                }}
              >
                {targetUser.avatar || (targetUser.fullName ? targetUser.fullName.slice(0, 2).toUpperCase() : 'NV')}
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--ink)' }}>
                    {targetUser.fullName}
                  </h3>
                  <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--ink-soft)' }}>
                    ({targetUser.employeeCode || targetUser.userId})
                  </span>
                  <JobLevelBadge level={targetUser.level} />
                </div>
                <div style={{ fontSize: 13, color: 'var(--ink-soft)', marginTop: 4 }}>
                  <strong>{targetUser.position}</strong> &middot; {targetUser.storeName || targetUser.branchName || 'MM Mega Market VN'}
                </div>
                <div style={{ fontSize: 12, color: 'var(--ink-faint)', marginTop: 2, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span>Department: <strong>{targetUser.departmentName || targetUser.departmentCode || targetUser.department}</strong></span>
                  {(targetUser.subDepartmentName || targetUser.subDepartmentCode) && (
                    <>
                      <span>&middot;</span>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        color: 'var(--blue-soft-text)',
                        background: 'var(--blue-soft)',
                        border: '1px solid #BFDBFE',
                        padding: '1px 8px',
                        borderRadius: 4,
                        fontWeight: 600,
                        fontSize: 11,
                      }}>
                        <i className="ti ti-git-branch" />
                        {targetUser.subDepartmentName || targetUser.subDepartmentCode}
                      </span>
                    </>
                  )}
                  <span>&middot;</span>
                  <span>Tenure: {targetUser.yearsOfService || '1.5'} years</span>
                </div>
              </div>
            </div>

            {/* Every action on an employee is gathered here rather than scattered around the directory table. */}
            {(onEdit || canPromote || onDelete) && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                {onEdit && (
                  <Button
                    variant="outline"
                    icon="ti-edit"
                    size="sm"
                    onClick={() => onEdit(targetUser)}
                    title="Edit the name, email, job title, level and system role"
                  >
                    Edit Details
                  </Button>
                )}
                {canPromote && (
                  <Button
                    variant="primary"
                    icon="ti-award"
                    size="sm"
                    onClick={() => setPromoteModalOpen(true)}
                    style={{
                      background: 'linear-gradient(135deg, #4338CA 0%, #6D28D9 100%)',
                      borderColor: '#4338CA',
                      fontWeight: 700,
                    }}
                  >
                    ⭐ Promote Level
                  </Button>
                )}
                {onDelete && (
                  <Button
                    variant="ghost"
                    icon="ti-trash"
                    size="sm"
                    onClick={() => onDelete(targetUser)}
                    title="Delete employee record"
                    style={{ color: 'var(--rose, #E11D48)' }}
                  >
                    Delete Employee
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* TAB SWITCHER */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
            <button
              onClick={() => setActiveTab('transcript')}
              className={`btn btn-sm ${activeTab === 'transcript' ? 'btn-primary' : 'btn-outline'}`}
            >
              <i className="ti ti-table" /> Course Score Report
            </button>
            <button
              onClick={() => setActiveTab('roadmap')}
              className={`btn btn-sm ${activeTab === 'roadmap' ? 'btn-primary' : 'btn-outline'}`}
            >
              <i className="ti ti-map-2" /> Level Roadmap
            </button>
          </div>

          {activeTab === 'roadmap' ? (
            <RoadmapProgressSummary roadmap={getUserRoadmapTabs(targetUser)} />
          ) : (
          <>
          {/* KPI SUMMARY CARDS */}
          <div className="grid grid-4" style={{ gap: 12, marginBottom: 20 }}>
            <div className="card card-pad" style={{ background: 'var(--paper-raised)', textAlign: 'center' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-soft)', textTransform: 'uppercase' }}>
                Total Assigned Courses
              </div>
              <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--ink)', marginTop: 4 }}>
                {totalCourses}
              </div>
            </div>

            <div className="card card-pad" style={{ background: 'var(--sage-soft)', borderColor: '#BBF7D0', textAlign: 'center' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--sage-soft-text)', textTransform: 'uppercase' }}>
                Completed
              </div>
              <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--sage-soft-text)', marginTop: 4 }}>
                {completedList.length}
                <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--sage-soft-text)', marginLeft: 4 }}>
                  (Avg: {avgScore}%)
                </span>
              </div>
            </div>

            <div className="card card-pad" style={{ background: 'var(--amber-soft)', borderColor: '#FEF08A', textAlign: 'center' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#854D0E', textTransform: 'uppercase' }}>
                In Progress
              </div>
              <div style={{ fontSize: 22, fontWeight: 900, color: '#A16207', marginTop: 4 }}>
                {inProgressList.length}
              </div>
            </div>

            <div className="card card-pad" style={{ background: 'var(--rust-soft)', borderColor: '#FECACA', textAlign: 'center' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--rust-soft-text)', textTransform: 'uppercase' }}>
                Overdue / Retake Required
              </div>
              <div style={{ fontSize: 22, fontWeight: 900, color: '#DC2626', marginTop: 4 }}>
                {overdueList.length}
              </div>
            </div>
          </div>

          {/* COURSE TRANSCRIPT TABLE */}
          <div className="card" style={{ overflowX: 'auto' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--ink)' }}>
                Per-Course Progress Detail ({userCourses.length} courses)
              </div>
              <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
                Standardize the job framework &amp; access rights
              </span>
            </div>

            <table className="table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>Course</th>
                  <th style={{ width: 120 }}>Job Level</th>
                  <th style={{ width: 120 }}>Status</th>
                  <th style={{ width: 130 }}>Progress</th>
                  <th style={{ width: 80 }}>Exam Score</th>
                  <th style={{ width: 110 }}>Due / Completed</th>
                </tr>
              </thead>
              <tbody>
                {userCourses.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '32px 0', color: 'var(--ink-soft)' }}>
                      No course has been recorded for this employee yet.
                    </td>
                  </tr>
                ) : (
                  userCourses.map((c) => {
                    const enr = c.enrollment;
                    const status = enr?.status || 'NOT_STARTED';
                    const st = statusMap[status] || statusMap.NOT_STARTED;
                    const isCompleted = status === 'COMPLETED';
                    const isFailed = status === 'FAILED';

                    return (
                      <tr key={c.id}>
                        {/* This summary table shows only the course code (compact, so it does not wrap awkwardly
                            in a narrow column) — the full name is in the tooltip or on the learner's "My
                            Courses" page, where it still appears in full as before. */}
                        <td>
                          <div
                            style={{ fontWeight: 700, fontSize: 13, color: 'var(--ink)', fontFamily: 'var(--font-mono)' }}
                            title={c.title}
                          >
                            {c.code}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--ink-soft)', display: 'flex', gap: 6, alignItems: 'center', marginTop: 2, flexWrap: 'wrap' }}>
                            <span>{c.category || c.domain}</span>
                            <span>&middot;</span>
                            <span>{c.estimatedHours || c.estimatedDuration || '3h'}</span>
                          </div>
                        </td>

                        <td>
                          <JobLevelBadge level={c.targetLevel || '7'} />
                        </td>

                        <td>
                          <Badge tone={st.tone}>
                            {st.label}
                          </Badge>
                        </td>

                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <div style={{ flex: 1 }}>
                              <ProgressBar
                                value={enr?.progressPercent || 0}
                                tone={isCompleted ? 'sage' : isFailed ? 'rust' : 'amber'}
                                size="sm"
                              />
                            </div>
                            <span style={{ fontSize: 11, fontWeight: 700, minWidth: 28 }}>
                              {enr?.progressPercent || 0}%
                            </span>
                          </div>
                        </td>

                        <td>
                          <span style={{ fontWeight: 700, fontSize: 12, color: isCompleted ? 'var(--sage)' : 'var(--ink-soft)' }}>
                            {enr?.score ? `${enr.score}%` : isCompleted ? `${c.passingScore || 80}%` : '—'}
                          </span>
                        </td>

                        <td style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
                          {isCompleted ? formatDate(enr?.completedAt) : formatDate(enr?.dueDate || c.assignment?.dueDate)}
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
        </div>
      </Modal>

      {/* PROMOTION SUB-MODAL */}
      {promoteModalOpen && (
        <Modal
          isOpen={promoteModalOpen}
          onClose={() => setPromoteModalOpen(false)}
          title="Job Level Promotion Decision"
          size="md"
        >
          {promotionSuccess ? (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--sage-soft)', color: '#16A34A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, margin: '0 auto 12px' }}>
                <i className="ti ti-check" />
              </div>
              <h3 style={{ margin: '0 0 6px', fontWeight: 800 }}>Promotion Successful!</h3>
              <p style={{ color: 'var(--ink-soft)', fontSize: 13, margin: 0 }}>
                Learner <strong>{targetUser.fullName}</strong> has been raised to <strong>Level {selectedNewLevel} ({levelTitle(selectedNewLevel)})</strong>.
              </p>
            </div>
          ) : (
            <form onSubmit={handlePromoteSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ background: 'var(--paper-sunken)', padding: 12, borderRadius: 'var(--radius-md)', border: '1px solid var(--line)' }}>
                <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>Employee under review:</div>
                <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--ink)', marginTop: 2 }}>
                  {targetUser.fullName} &middot; Current level: <JobLevelBadge level={targetUser.level} />
                </div>
              </div>

              <div>
                <label className="field-label" style={{ fontWeight: 700, marginBottom: 6, display: 'block' }}>
                  Choose The New Level (scale: Level 7 lowest &rarr; Level 1 highest):
                </label>
                <select
                  className="field-select"
                  value={selectedNewLevel}
                  onChange={(e) => setSelectedNewLevel(e.target.value)}
                  style={{ width: '100%', height: 38, fontSize: 13, fontWeight: 700 }}
                >
                  {LEVEL_DEFINITIONS
                    .filter((def) => Number(def.level) < Number(targetUser.level || 7)) // Only promotion to a higher level (a smaller number) is allowed
                    .map((def) => (
                      <option key={def.level} value={def.level}>
                        Level {def.level} &mdash; {def.titleEn || def.titleVi} ({def.titleVi}) [{def.code}]
                      </option>
                    ))}
                </select>
                <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 4 }}>
                  On a successful promotion the learner is automatically unlocked into the entire training program of the new level.
                </div>
              </div>

              <div>
                <label className="field-label" style={{ fontWeight: 700, marginBottom: 6, display: 'block' }}>
                  Reason / Basis For The Promotion Review:
                </label>
                <textarea
                  className="field-textarea"
                  rows={3}
                  value={promotionReason}
                  onChange={(e) => setPromotionReason(e.target.value)}
                  placeholder="Record learning achievements, certificates earned, the manager's 1-on-1 review..."
                  required
                  style={{ width: '100%', fontSize: 13 }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
                <Button variant="outline" type="button" onClick={() => setPromoteModalOpen(false)}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  type="submit"
                  icon="ti-award"
                  style={{ background: 'linear-gradient(135deg, #4338CA 0%, #6D28D9 100%)', borderColor: '#4338CA' }}
                >
                  Confirm The Promotion
                </Button>
              </div>
            </form>
          )}
        </Modal>
      )}
    </>
  );
}
