import React, { useState, useMemo } from 'react';
import { getTeamMembersForManager, managerUser as defaultManager, allUsers } from '../../data/mockData';
import { useCourseStore } from '../../store/CourseStore';
import { canManage } from '../../data/roles';
import { Badge, ProgressBar, Button, CourseTypeBadge, StatCard, Modal } from '../../features/common/ui';
import { downloadCsv } from '../../lib/exportCsv';
import UserTranscriptModal from '../../features/common/UserTranscriptModal';
import RoadmapProgressSummary from '../../features/roadmaps/RoadmapProgressSummary';

const STATUS_META = {
  NOT_STARTED: { tone: 'slate', label: 'Not Started', enLabel: 'Not Started' },
  IN_PROGRESS: { tone: 'rail', label: 'In Progress', enLabel: 'In Progress' },
  COMPLETED: { tone: 'sage', label: 'Completed', enLabel: 'Completed' },
  FAILED: { tone: 'rust', label: 'Score Not Passed', enLabel: 'Failed' },
  OVERDUE: { tone: 'rust', label: 'Overdue', enLabel: 'Overdue' },
};

const GROUP_BY_OPTIONS = [
  { id: 'NONE', label: 'No grouping' },
  { id: 'STATUS', label: 'By Status' },
  { id: 'RISK', label: 'By Compliance Risk Level' },
  { id: 'COURSE_TYPE', label: 'By Course Classification' },
  { id: 'POSITION', label: 'By Job Title' },
];

export default function ManagerReports() {
  const { currentUser: authUser, users, actionPlans, openSurveyModal, getUserRoadmapTabs } = useCourseStore();
  const activeManager = canManage(authUser?.role, 'learner') ? authUser : defaultManager;
  const teamMembers = useMemo(() => getTeamMembersForManager(activeManager), [activeManager]);

  // Main Tabs
  const [activeTab, setActiveTab] = useState('COMPLIANCE_ROSTER'); // COMPLIANCE_ROSTER | SCORE_ANALYTICS | RISK_ALERTS | ACTION_PLANS

  // Filters
  const [quickFilter, setQuickFilter] = useState('ALL'); // ALL | COMPLIANT | IN_PROGRESS | COMPLETED | RISK_OVERDUE
  const [search, setSearch] = useState('');
  const [groupBy, setGroupBy] = useState('NONE');
  const [showFilters, setShowFilters] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState(() => new Set());

  const [levelFilter, setLevelFilter] = useState('ALL');
  const [courseTypeFilter, setCourseTypeFilter] = useState('ALL');
  const [scoreRangeFilter, setScoreRangeFilter] = useState('ALL'); // ALL | PASS | FAIL | UNGRADED
  const [riskFilter, setRiskFilter] = useState('ALL'); // ALL | SAFE | WARNING | CRITICAL

  // Modals & Actions
  const [transcriptUser, setTranscriptUser] = useState(null);
  const [roadmapUser, setRoadmapUser] = useState(null);
  const [reminderMember, setReminderMember] = useState(null);
  const [batchReminderSent, setBatchReminderSent] = useState(false);
  const [singleReminderSent, setSingleReminderSent] = useState(false);

  // Computed Team Summary KPIs
  const kpis = useMemo(() => {
    const total = teamMembers.length;
    const completed = teamMembers.filter((m) => m.status === 'COMPLETED').length;
    const inProgress = teamMembers.filter((m) => m.status === 'IN_PROGRESS').length;
    const overdue = teamMembers.filter((m) => m.status === 'OVERDUE').length;
    const failed = teamMembers.filter((m) => m.status === 'FAILED').length;
    const notStarted = teamMembers.filter((m) => m.status === 'NOT_STARTED').length;

    const mandatoryList = teamMembers.filter((m) => m.courseType === 'MANDATORY');
    const mandatoryCompleted = mandatoryList.filter((m) => m.status === 'COMPLETED').length;
    const mandatoryComplianceRate = mandatoryList.length > 0 ? Math.round((mandatoryCompleted / mandatoryList.length) * 100) : 100;

    const avgProgress = total > 0 ? Math.round(teamMembers.reduce((s, m) => s + (m.progress || 0), 0) / total) : 0;

    const scoredList = teamMembers.filter((m) => m.score != null);
    const avgScore = scoredList.length > 0 ? Math.round(scoredList.reduce((s, m) => s + m.score, 0) / scoredList.length) : null;
    const passCount = scoredList.filter((m) => m.score >= 80).length;
    const passRate = scoredList.length > 0 ? Math.round((passCount / scoredList.length) * 100) : 100;

    const criticalRisks = teamMembers.filter((m) => m.status === 'OVERDUE' || m.status === 'FAILED');
    const warningRisks = teamMembers.filter((m) => m.inactiveDays >= 3 && m.status !== 'COMPLETED' && m.status !== 'OVERDUE' && m.status !== 'FAILED');
    const totalNeedsAttention = criticalRisks.length + warningRisks.length;

    return {
      total,
      completed,
      inProgress,
      overdue,
      failed,
      notStarted,
      mandatoryListCount: mandatoryList.length,
      mandatoryComplianceRate,
      avgProgress,
      avgScore,
      passRate,
      totalNeedsAttention,
      criticalRisksCount: criticalRisks.length,
      warningRisksCount: warningRisks.length,
    };
  }, [teamMembers]);

  // Tag each member with a normalized Risk Level
  const enrichedTeamMembers = useMemo(() => {
    return teamMembers.map((m) => {
      let riskLevel = 'SAFE'; // SAFE | WARNING | CRITICAL
      let riskLabel = '🟢 Compliance Standard Met';
      let riskDetail = 'On schedule or has already completed the course.';

      if (m.status === 'OVERDUE') {
        riskLevel = 'CRITICAL';
        riskLabel = '🔴 Overdue Risk';
        riskDetail = `Past the deadline (${m.dueDate}) — at risk of being logged as a compliance audit breach.`;
      } else if (m.status === 'FAILED') {
        riskLevel = 'CRITICAL';
        riskLabel = '🔴 Score Not Passed';
        riskDetail = `Exam score ${m.score}% (below the 80% standard) after ${m.attempts || 1} attempts. A retake must be unlocked.`;
      } else if (m.inactiveDays >= 3 && m.status !== 'COMPLETED') {
        riskLevel = 'WARNING';
        riskLabel = '🟡 Needs A Reminder';
        riskDetail = `No learning login for ${m.inactiveDays} days.`;
      }

      return {
        ...m,
        riskLevel,
        riskLabel,
        riskDetail,
      };
    });
  }, [teamMembers]);

  // Active filters count
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (levelFilter !== 'ALL') count++;
    if (courseTypeFilter !== 'ALL') count++;
    if (scoreRangeFilter !== 'ALL') count++;
    if (riskFilter !== 'ALL') count++;
    return count;
  }, [levelFilter, courseTypeFilter, scoreRangeFilter, riskFilter]);

  // Filtered List
  const filteredList = useMemo(() => {
    return enrichedTeamMembers.filter((m) => {
      // Quick Filter Pills
      if (quickFilter === 'COMPLIANT' && m.riskLevel !== 'SAFE') return false;
      if (quickFilter === 'IN_PROGRESS' && m.status !== 'IN_PROGRESS') return false;
      if (quickFilter === 'COMPLETED' && m.status !== 'COMPLETED') return false;
      if (quickFilter === 'RISK_OVERDUE' && m.riskLevel === 'SAFE') return false;

      // Dropdown Panel Filters
      if (levelFilter !== 'ALL' && String(m.level) !== levelFilter) return false;
      if (courseTypeFilter !== 'ALL' && m.courseType !== courseTypeFilter) return false;
      if (scoreRangeFilter !== 'ALL') {
        if (scoreRangeFilter === 'PASS' && (m.score == null || m.score < 80)) return false;
        if (scoreRangeFilter === 'FAIL' && (m.score == null || m.score >= 80)) return false;
        if (scoreRangeFilter === 'UNGRADED' && m.score != null) return false;
      }
      if (riskFilter !== 'ALL' && m.riskLevel !== riskFilter) return false;

      // Search Query
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const matchName = m.name?.toLowerCase().includes(q);
        const matchId = m.employeeId?.toLowerCase().includes(q);
        const matchCourse = m.course?.toLowerCase().includes(q);
        const matchPos = m.position?.toLowerCase().includes(q);
        if (!matchName && !matchId && !matchCourse && !matchPos) return false;
      }

      return true;
    });
  }, [enrichedTeamMembers, quickFilter, levelFilter, courseTypeFilter, scoreRangeFilter, riskFilter, search]);

  // Grouping logic
  function groupKeyOf(m) {
    if (groupBy === 'STATUS') {
      const meta = STATUS_META[m.status] || STATUS_META.NOT_STARTED;
      return { key: m.status, label: meta.label, icon: 'ti-progress-check' };
    }
    if (groupBy === 'RISK') {
      return {
        key: m.riskLevel,
        label: m.riskLevel === 'CRITICAL' ? '🔴 High Risk (Overdue / Failed)' : m.riskLevel === 'WARNING' ? '🟡 Warning (Inactive)' : '🟢 Safe & Fully Compliant',
        icon: m.riskLevel === 'CRITICAL' ? 'ti-alert-octagon' : m.riskLevel === 'WARNING' ? 'ti-alert-triangle' : 'ti-circle-check',
      };
    }
    if (groupBy === 'COURSE_TYPE') {
      return {
        key: m.courseType,
        label: m.courseType === 'MANDATORY' ? '🔒 Mandatory Compliance Courses' : m.courseType === 'ROADMAP' ? '🏆 Roadmap Courses' : '✨ Optional Courses',
        icon: 'ti-certificate',
      };
    }
    if (groupBy === 'POSITION') {
      return {
        key: m.position || 'OTHER',
        label: m.position || 'No Position Assigned',
        icon: 'ti-briefcase',
      };
    }
    return { key: 'ALL', label: '', icon: '' };
  }

  const groups = useMemo(() => {
    if (groupBy === 'NONE') return null;
    const map = new Map();
    filteredList.forEach((m) => {
      const g = groupKeyOf(m);
      if (!map.has(g.key)) map.set(g.key, { ...g, rows: [] });
      map.get(g.key).rows.push(m);
    });
    return Array.from(map.values());
  }, [filteredList, groupBy]);

  function toggleGroup(key) {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  function handleResetAllFilters() {
    setSearch('');
    setQuickFilter('ALL');
    setLevelFilter('ALL');
    setCourseTypeFilter('ALL');
    setScoreRangeFilter('ALL');
    setRiskFilter('ALL');
    setGroupBy('NONE');
  }

  function handleExportCsv() {
    const headers = [
      'Employee Code',
      'Full Name',
      'Job Title',
      'Job Level',
      'Allocated Courses',
      'Classification',
      'Progress (%)',
      'Status',
      'Score (%)',
      'Deadline',
      'Last Study Date',
      'Days Without Study',
      'Compliance Risk Assessment',
    ];

    const rows = filteredList.map((m) => [
      m.employeeId || '',
      m.name || '',
      m.position || '',
      `Level ${m.level || 7}`,
      m.course || '',
      m.courseType === 'MANDATORY' ? 'Mandatory' : m.courseType === 'ROADMAP' ? 'Roadmap' : 'Optional',
      `${m.progress || 0}%`,
      STATUS_META[m.status]?.label || m.status,
      m.score != null ? `${m.score}%` : 'Not taken',
      m.dueDate || '—',
      m.lastActivity || 'Not recorded',
      m.inactiveDays || 0,
      m.riskLabel || '',
    ]);

    downloadCsv(`Bao_Cao_Tuan_Thu_Dao_Tao_${activeManager.divisionCode || 'Team'}_${new Date().toISOString().slice(0, 10)}.csv`, [headers, ...rows]);
  }

  function handleSendBatchReminder() {
    setBatchReminderSent(true);
    setTimeout(() => setBatchReminderSent(false), 3000);
  }

  function handleSendSingleReminder() {
    setSingleReminderSent(true);
    setTimeout(() => {
      setSingleReminderSent(false);
      setReminderMember(null);
    }, 1500);
  }

  function renderRosterTable(members) {
    return (
      <div className="card" style={{ borderRadius: 10, border: '1px solid var(--line)', overflowX: 'auto', marginBottom: 14 }}>
        <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--paper-sunken)' }}>
              <th style={{ width: '22%' }}>Employee</th>
              <th style={{ width: '22%' }}>Allocated Courses</th>
              <th style={{ width: '8%' }}>Classification</th>
              <th style={{ width: '12%' }}>Progress</th>
              <th style={{ width: '9%' }}>Status</th>
              <th style={{ width: '8%' }}>Exam Score</th>
              <th style={{ width: '10%' }}>Deadline</th>
              <th style={{ width: '9%', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {members.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '36px 16px', color: 'var(--ink-faint)' }}>
                  <i className="ti ti-users" style={{ fontSize: 28, display: 'block', marginBottom: 8 }} />
                  No employee matches the current filters.
                </td>
              </tr>
            ) : (
              members.map((m) => {
                const meta = STATUS_META[m.status] || STATUS_META.NOT_STARTED;
                const isCritical = m.riskLevel === 'CRITICAL';
                const isWarning = m.riskLevel === 'WARNING';

                return (
                  <tr key={m.employeeId} style={{ background: isCritical ? 'rgba(239, 68, 68, 0.03)' : 'transparent' }}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div
                          style={{
                            width: 34,
                            height: 34,
                            borderRadius: '50%',
                            background: isCritical ? 'var(--rust-soft)' : isWarning ? 'var(--amber-soft)' : 'var(--blue-soft)',
                            color: isCritical ? '#DC2626' : isWarning ? '#D97706' : '#1D4ED8',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 800,
                            fontSize: 12,
                            flexShrink: 0,
                          }}
                        >
                          {(m.name || 'NV').split(' ').map((n) => n[0]).slice(0, 2).join('')}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--ink)' }}>{m.name}</div>
                          <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
                            <span style={{ fontFamily: 'var(--font-mono)' }}>{m.employeeId}</span> &middot; {m.position}
                          </div>
                          <div style={{ fontSize: 11, color: isCritical ? 'var(--rust)' : isWarning ? 'var(--amber-soft-text)' : 'var(--sage)', fontWeight: 600, marginTop: 2 }}>
                            {m.riskLabel}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td>
                      <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--ink)' }}>{m.course}</div>
                      <div style={{ fontSize: 11, color: 'var(--ink-faint)' }}>
                        Level {m.level} &middot; {m.divisionCode}
                      </div>
                    </td>

                    <td>
                      <CourseTypeBadge courseType={m.courseType} />
                    </td>

                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ flex: 1 }}>
                          <ProgressBar
                            value={m.progress}
                            tone={m.progress >= 100 ? 'sage' : m.status === 'OVERDUE' || m.status === 'FAILED' ? 'rust' : 'rail'}
                            size="sm"
                          />
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)', minWidth: 32 }}>
                          {m.progress}%
                        </span>
                      </div>
                    </td>

                    <td>
                      <Badge tone={meta.tone}>{meta.label}</Badge>
                    </td>

                    <td>
                      {m.score !== null ? (
                        <div>
                          <span style={{ fontWeight: 800, fontSize: 13, color: m.score >= 80 ? 'var(--sage)' : 'var(--rust)' }}>
                            {m.score}%
                          </span>
                          {m.attempts && (
                            <span style={{ fontSize: 11, color: 'var(--ink-faint)', marginLeft: 4 }}>
                              ({m.attempts}L)
                            </span>
                          )}
                        </div>
                      ) : (
                        <span style={{ color: 'var(--ink-faint)', fontSize: 12 }}>—</span>
                      )}
                    </td>

                    <td>
                      <div style={{ fontSize: 12, fontWeight: m.overdue ? 700 : 500, color: m.overdue ? 'var(--rust)' : 'var(--ink)' }}>
                        {m.dueDate}
                      </div>
                      {m.inactiveDays > 0 && m.status !== 'COMPLETED' && (
                        <div style={{ fontSize: 11, color: m.inactiveDays >= 3 ? '#D97706' : 'var(--ink-faint)' }}>
                          Absent {m.inactiveDays} days
                        </div>
                      )}
                    </td>

                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                        <Button
                          size="sm"
                          variant="outline"
                          icon="ti-bell"
                          onClick={() => setReminderMember(m)}
                          title="Send a progress reminder email"
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          icon="ti-file-certificate"
                          onClick={() => {
                            const list = users && users.length > 0 ? users : allUsers ? allUsers() : [];
                            const fullUser = list.find((u) => u.userId === m.userId || u.employeeCode === m.employeeId || u.fullName === m.name) || m;
                            setTranscriptUser(fullUser);
                          }}
                          title="View this employee's full transcript & courses"
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
    );
  }

  return (
    <>
      {/* PAGE HEADER */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <h1>Team Training Compliance Report &amp; Analysis</h1>
            <Badge tone="amber" icon="ti-report-analytics">
              {activeManager.storeName || `${activeManager.divisionCode} - ${activeManager.departmentCode}`}
            </Badge>
          </div>
          <p style={{ margin: 0 }}>
            Monitor mandatory compliance, analyse the exam score distribution, track overdue cases and manage real-world action commitments (Kirkpatrick L3) for the {teamMembers.length} employees reporting to {activeManager.fullName}.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Button
            variant="outline"
            icon="ti-download"
            onClick={handleExportCsv}
          >
            Export The Report To Excel / CSV
          </Button>
          <Button
            variant="primary"
            icon={batchReminderSent ? 'ti-check' : 'ti-bell-ringing'}
            onClick={handleSendBatchReminder}
            disabled={batchReminderSent || kpis.totalNeedsAttention === 0}
          >
            {batchReminderSent ? 'Bulk Reminder Sent!' : `Nudge ${kpis.totalNeedsAttention} Cases Needing Attention`}
          </Button>
        </div>
      </div>

      {/* TOP 4 EXECUTIVE METRIC CARDS */}
      <div className="grid grid-4" style={{ marginBottom: 24, gap: 14 }}>
        <div className="card card-pad" style={{ borderLeft: '4px solid var(--sage, #10B981)', background: 'var(--paper-raised)' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-soft)', textTransform: 'uppercase', marginBottom: 4 }}>
            Mandatory Course Compliance
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontSize: 28, fontWeight: 900, color: 'var(--sage)' }}>{kpis.mandatoryComplianceRate}%</span>
            <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
              ({kpis.mandatoryListCount} compliance courses)
            </span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 4 }}>
            Meets the MM Mega Market audit standard
          </div>
        </div>

        <div className="card card-pad" style={{ borderLeft: '4px solid var(--rail, #005BAA)', background: 'var(--paper-raised)' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-soft)', textTransform: 'uppercase', marginBottom: 4 }}>
            Overall Completion Progress
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontSize: 28, fontWeight: 900, color: 'var(--rail)' }}>{kpis.avgProgress}%</span>
            <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
              ({kpis.completed}/{kpis.total} xong)
            </span>
          </div>
          <ProgressBar value={kpis.avgProgress} tone="rail" size="sm" />
        </div>

        <div className="card card-pad" style={{ borderLeft: '4px solid #8B5CF6', background: 'var(--paper-raised)' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-soft)', textTransform: 'uppercase', marginBottom: 4 }}>
            Avg Competency Score
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontSize: 28, fontWeight: 900, color: '#8B5CF6' }}>
              {kpis.avgScore != null ? `${kpis.avgScore}%` : '—'}
            </span>
            <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
              (Pass rate: {kpis.passRate}%)
            </span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 4 }}>
            Exam pass mark ≥ 80%
          </div>
        </div>

        <div className="card card-pad" style={{ borderLeft: '4px solid var(--rust, #EF4444)', background: 'var(--paper-raised)' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-soft)', textTransform: 'uppercase', marginBottom: 4 }}>
            Alerts To Handle
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontSize: 28, fontWeight: 900, color: kpis.totalNeedsAttention > 0 ? 'var(--rust)' : 'var(--sage)' }}>
              {kpis.totalNeedsAttention}
            </span>
            <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
              cases at risk
            </span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 4 }}>
            {kpis.criticalRisksCount} overdue/failed &middot; {kpis.warningRisksCount} inactive
          </div>
        </div>
      </div>

      {/* SUB-TABS SWITCHER */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, borderBottom: '1px solid var(--line)', paddingBottom: 8, flexWrap: 'wrap' }}>
        {[
          { id: 'COMPLIANCE_ROSTER', label: 'Per-Employee Detail Report', icon: 'ti-list-check' },
          { id: 'SCORE_ANALYTICS', label: 'Score & Competency Analysis', icon: 'ti-chart-pie' },
          { id: 'RISK_ALERTS', label: 'Risk Monitoring & Deadline Nudges', icon: 'ti-alert-triangle', badge: kpis.totalNeedsAttention },
          { id: 'ACTION_PLANS', label: 'Real Action Commitment (L3)', icon: 'ti-checklist' },
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
              fontWeight: activeTab === tab.id ? 700 : 500,
            }}
          >
            <i className={`ti ${tab.icon}`} />
            <span>{tab.label}</span>
            {tab.badge > 0 && (
              <span style={{
                background: activeTab === tab.id ? 'var(--paper-raised)' : 'var(--rust)',
                color: activeTab === tab.id ? 'var(--rust)' : '#fff',
                padding: '1px 6px',
                borderRadius: 10,
                fontSize: 11,
                fontWeight: 800,
              }}>
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* TAB 1: PER-EMPLOYEE DETAIL REPORT (COMPLIANCE ROSTER) */}
      {activeTab === 'COMPLIANCE_ROSTER' && (
        <>
          {/* STANDARDIZED FILTER TOOLBAR CARD */}
          <div className="card card-pad" style={{ marginBottom: 18, background: 'var(--paper-raised)', borderRadius: 10, border: '1px solid var(--line)' }}>
            {/* Row 0: Quick filter pills */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14, paddingBottom: 14, borderBottom: '1px solid var(--line)' }}>
              {[
                { id: 'ALL', label: 'All Employees', count: teamMembers.length },
                { id: 'COMPLIANT', label: 'Compliance Standard Met', count: enrichedTeamMembers.filter((m) => m.riskLevel === 'SAFE').length },
                { id: 'IN_PROGRESS', label: 'In Progress', count: teamMembers.filter((m) => m.status === 'IN_PROGRESS').length },
                { id: 'COMPLETED', label: '100% Complete', count: teamMembers.filter((m) => m.status === 'COMPLETED').length },
                { id: 'RISK_OVERDUE', label: '🔴 Needs Attention / Overdue', count: kpis.totalNeedsAttention, highlight: true },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setQuickFilter(f.id)}
                  className={`btn btn-sm ${quickFilter === f.id ? 'btn-primary' : 'btn-outline'}`}
                  style={{
                    borderRadius: 20,
                    fontSize: 12,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    borderColor: quickFilter === f.id ? 'var(--blue)' : f.highlight && f.count > 0 ? 'var(--rust)' : 'var(--line)',
                    background: quickFilter === f.id ? (f.highlight ? 'var(--rust)' : 'var(--blue)') : f.highlight && f.count > 0 ? 'var(--rust-soft)' : 'transparent',
                    color: quickFilter === f.id ? '#fff' : f.highlight && f.count > 0 ? 'var(--rust-soft-text)' : 'var(--ink)',
                    fontWeight: quickFilter === f.id || f.highlight ? 700 : 500,
                  }}
                >
                  {f.label}
                  <span style={{
                    background: quickFilter === f.id ? 'rgba(255,255,255,0.3)' : f.highlight && f.count > 0 ? 'var(--rust)' : 'var(--paper-sunken)',
                    color: quickFilter === f.id || (f.highlight && f.count > 0) ? '#fff' : 'var(--ink-soft)',
                    padding: '1px 6px',
                    borderRadius: 10,
                    fontSize: 11,
                    fontWeight: 700,
                  }}>
                    {f.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Row 1: Search, Group By & Filter Toggle */}
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
              {/* Search input */}
              <div style={{ position: 'relative', flex: '1 1 280px', minWidth: 220 }}>
                <i className="ti ti-search" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-faint)', fontSize: 15 }} />
                <input
                  type="text"
                  className="field-input"
                  style={{ paddingLeft: 36, paddingRight: search ? 32 : 12, height: 38, fontSize: 13, width: '100%', borderRadius: 8 }}
                  placeholder="Search by employee name, code, course, job title..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--ink-faint)', fontSize: 14 }}
                  >
                    <i className="ti ti-x" />
                  </button>
                )}
              </div>

              {/* Right controls: Group By & Filter Button */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                {/* Group By select */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--paper-sunken)', padding: '3px 10px', borderRadius: 8, border: '1px solid var(--line)', height: 38 }}>
                  <span style={{ fontSize: 12, color: 'var(--ink-soft)', whiteSpace: 'nowrap', fontWeight: 600 }}>Group by:</span>
                  <select
                    value={groupBy}
                    onChange={(e) => { setGroupBy(e.target.value); setCollapsedGroups(new Set()); }}
                    style={{
                      border: 'none',
                      background: 'transparent',
                      fontSize: 13,
                      fontWeight: groupBy !== 'NONE' ? 700 : 500,
                      color: groupBy !== 'NONE' ? 'var(--blue, #005BAA)' : 'var(--ink)',
                      cursor: 'pointer',
                      outline: 'none',
                    }}
                  >
                    {GROUP_BY_OPTIONS.map((opt) => (
                      <option key={opt.id} value={opt.id}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                {/* Filter Toggle Button */}
                <button
                  type="button"
                  onClick={() => setShowFilters(!showFilters)}
                  className={`btn btn-sm ${activeFiltersCount > 0 ? 'btn-primary' : 'btn-outline'}`}
                  style={{ height: 38, display: 'flex', alignItems: 'center', gap: 6, padding: '0 14px', borderRadius: 8 }}
                >
                  <i className="ti ti-filter" />
                  <span>Filters</span>
                  {activeFiltersCount > 0 && (
                    <span style={{ background: 'var(--paper-raised)', color: 'var(--rail, #005BAA)', borderRadius: 10, padding: '1px 6px', fontSize: 11, fontWeight: 800 }}>
                      {activeFiltersCount}
                    </span>
                  )}
                  <i className={`ti ${showFilters ? 'ti-chevron-up' : 'ti-chevron-down'}`} style={{ fontSize: 12, marginLeft: 2 }} />
                </button>
              </div>
            </div>

            {/* Row 2: Collapsible Filter Panel */}
            {showFilters && (
              <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px dashed var(--line)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                  {/* Risk Level Filter */}
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--ink-soft)', marginBottom: 4 }}>
                      COMPLIANCE RISK LEVEL
                    </label>
                    <select
                      className="field-select"
                      style={{
                        width: '100%',
                        height: 36,
                        fontSize: 12,
                        borderRadius: 6,
                        background: riskFilter !== 'ALL' ? 'var(--blue-soft)' : 'var(--paper)',
                        borderColor: riskFilter !== 'ALL' ? 'var(--blue)' : 'var(--line)',
                        color: riskFilter !== 'ALL' ? 'var(--blue)' : 'var(--ink)',
                        fontWeight: riskFilter !== 'ALL' ? 700 : 500,
                      }}
                      value={riskFilter}
                      onChange={(e) => setRiskFilter(e.target.value)}
                    >
                      <option value="ALL">All levels</option>
                      <option value="SAFE">🟢 Safe / meets the compliance standard</option>
                      <option value="WARNING">🟡 Warning / absent &gt; 3 days</option>
                      <option value="CRITICAL">🔴 High risk / overdue or failed</option>
                    </select>
                  </div>

                  {/* Course Type Filter */}
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--ink-soft)', marginBottom: 4 }}>
                      COURSE CLASSIFICATION
                    </label>
                    <select
                      className="field-select"
                      style={{
                        width: '100%',
                        height: 36,
                        fontSize: 12,
                        borderRadius: 6,
                        background: courseTypeFilter !== 'ALL' ? 'var(--blue-soft)' : 'var(--paper)',
                        borderColor: courseTypeFilter !== 'ALL' ? 'var(--blue)' : 'var(--line)',
                        color: courseTypeFilter !== 'ALL' ? 'var(--blue)' : 'var(--ink)',
                        fontWeight: courseTypeFilter !== 'ALL' ? 700 : 500,
                      }}
                      value={courseTypeFilter}
                      onChange={(e) => setCourseTypeFilter(e.target.value)}
                    >
                      <option value="ALL">All classifications</option>
                      <option value="MANDATORY">Compliance Mandatory</option>
                      <option value="ROADMAP">By Level Roadmap</option>
                      <option value="ELECTIVE">Elective</option>
                    </select>
                  </div>

                  {/* Score Range Filter */}
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--ink-soft)', marginBottom: 4 }}>
                      EXAM RESULT
                    </label>
                    <select
                      className="field-select"
                      style={{
                        width: '100%',
                        height: 36,
                        fontSize: 12,
                        borderRadius: 6,
                        background: scoreRangeFilter !== 'ALL' ? 'var(--blue-soft)' : 'var(--paper)',
                        borderColor: scoreRangeFilter !== 'ALL' ? 'var(--blue)' : 'var(--line)',
                        color: scoreRangeFilter !== 'ALL' ? 'var(--blue)' : 'var(--ink)',
                        fontWeight: scoreRangeFilter !== 'ALL' ? 700 : 500,
                      }}
                      value={scoreRangeFilter}
                      onChange={(e) => setScoreRangeFilter(e.target.value)}
                    >
                      <option value="ALL">All results</option>
                      <option value="PASS">🟢 Meets the standard (&ge; 80%)</option>
                      <option value="FAIL">🔴 Not passed (&lt; 80%)</option>
                      <option value="UNGRADED">⚪ Test not taken</option>
                    </select>
                  </div>

                  {/* Level Filter */}
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--ink-soft)', marginBottom: 4 }}>
                      EMPLOYEE JOB LEVEL
                    </label>
                    <select
                      className="field-select"
                      style={{
                        width: '100%',
                        height: 36,
                        fontSize: 12,
                        borderRadius: 6,
                        background: levelFilter !== 'ALL' ? 'var(--blue-soft)' : 'var(--paper)',
                        borderColor: levelFilter !== 'ALL' ? 'var(--blue)' : 'var(--line)',
                        color: levelFilter !== 'ALL' ? 'var(--blue)' : 'var(--ink)',
                        fontWeight: levelFilter !== 'ALL' ? 700 : 500,
                      }}
                      value={levelFilter}
                      onChange={(e) => setLevelFilter(e.target.value)}
                    >
                      <option value="ALL">All job levels</option>
                      <option value="5">Level 5 (Supervisor)</option>
                      <option value="6">Level 6 (Specialist / Officer)</option>
                      <option value="7">Level 7 (Staff)</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Row 3: Active Filters Summary Bar */}
            {(search || quickFilter !== 'ALL' || levelFilter !== 'ALL' || courseTypeFilter !== 'ALL' || scoreRangeFilter !== 'ALL' || riskFilter !== 'ALL' || groupBy !== 'NONE') && (
              <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px dashed var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>Filtering by:</span>
                  {search && (
                    <span className="badge" style={{ background: 'var(--blue-soft)', color: 'var(--blue-soft-text)', border: '1px solid #BFDBFE', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      Search term: <strong>"{search}"</strong>
                      <i className="ti ti-x" style={{ cursor: 'pointer' }} onClick={() => setSearch('')} />
                    </span>
                  )}
                  {quickFilter !== 'ALL' && (
                    <span className="badge" style={{ background: 'var(--blue-soft)', color: 'var(--blue-soft-text)', border: '1px solid #BFDBFE', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      Quick range: <strong>{quickFilter === 'COMPLIANT' ? 'Meets the standard' : quickFilter === 'IN_PROGRESS' ? 'In progress' : quickFilter === 'COMPLETED' ? 'Done' : 'Warning'}</strong>
                      <i className="ti ti-x" style={{ cursor: 'pointer' }} onClick={() => setQuickFilter('ALL')} />
                    </span>
                  )}
                  {riskFilter !== 'ALL' && (
                    <span className="badge" style={{ background: 'var(--blue-soft)', color: 'var(--blue-soft-text)', border: '1px solid #BFDBFE', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      Risk: <strong>{riskFilter === 'SAFE' ? 'Safe' : riskFilter === 'WARNING' ? 'Warning' : 'High risk'}</strong>
                      <i className="ti ti-x" style={{ cursor: 'pointer' }} onClick={() => setRiskFilter('ALL')} />
                    </span>
                  )}
                  {courseTypeFilter !== 'ALL' && (
                    <span className="badge" style={{ background: 'var(--blue-soft)', color: 'var(--blue-soft-text)', border: '1px solid #BFDBFE', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      Course type: <strong>{courseTypeFilter}</strong>
                      <i className="ti ti-x" style={{ cursor: 'pointer' }} onClick={() => setCourseTypeFilter('ALL')} />
                    </span>
                  )}
                  {scoreRangeFilter !== 'ALL' && (
                    <span className="badge" style={{ background: 'var(--blue-soft)', color: 'var(--blue-soft-text)', border: '1px solid #BFDBFE', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      Score: <strong>{scoreRangeFilter === 'PASS' ? '>=80%' : scoreRangeFilter === 'FAIL' ? '<80%' : 'Not taken'}</strong>
                      <i className="ti ti-x" style={{ cursor: 'pointer' }} onClick={() => setScoreRangeFilter('ALL')} />
                    </span>
                  )}
                  {levelFilter !== 'ALL' && (
                    <span className="badge" style={{ background: 'var(--blue-soft)', color: 'var(--blue-soft-text)', border: '1px solid #BFDBFE', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      Job level: <strong>Level {levelFilter}</strong>
                      <i className="ti ti-x" style={{ cursor: 'pointer' }} onClick={() => setLevelFilter('ALL')} />
                    </span>
                  )}
                  {groupBy !== 'NONE' && (
                    <span className="badge" style={{ background: 'var(--paper-sunken)', color: 'var(--ink-soft)', border: '1px solid var(--line)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      Group by: <strong>{GROUP_BY_OPTIONS.find((o) => o.id === groupBy)?.label}</strong>
                      <i className="ti ti-x" style={{ cursor: 'pointer' }} onClick={() => setGroupBy('NONE')} />
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={handleResetAllFilters}
                    style={{ border: 'none', background: 'transparent', color: 'var(--rust, #DC2626)', fontSize: 12, cursor: 'pointer', fontWeight: 600, textDecoration: 'underline', padding: '2px 4px' }}
                  >
                    Clear all filters
                  </button>
                </div>
                <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
                  Found <strong>{filteredList.length}</strong> / {teamMembers.length} employees
                </div>
              </div>
            )}
          </div>

          {/* TABLE CONTENT */}
          {groupBy === 'NONE' || !groups ? (
            renderRosterTable(filteredList)
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 24 }}>
              {groups.map((g) => {
                const isCollapsed = collapsedGroups.has(g.key);
                return (
                  <div key={g.key} className="card" style={{ overflow: 'hidden', background: 'var(--paper-raised)', borderRadius: 10, border: '1px solid var(--line)' }}>
                    <button
                      onClick={() => toggleGroup(g.key)}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: '12px 16px',
                        background: 'var(--paper-sunken)',
                        border: 'none',
                        borderBottom: isCollapsed ? 'none' : '1px solid var(--line)',
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      <i className={`ti ${isCollapsed ? 'ti-chevron-right' : 'ti-chevron-down'}`} style={{ color: 'var(--ink-faint)' }} />
                      <div style={{ width: 28, height: 28, borderRadius: 6, background: 'var(--blue-soft)', color: 'var(--blue, #005BAA)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <i className={`ti ${g.icon}`} style={{ fontSize: 15 }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0, fontWeight: 800, fontSize: 14, color: 'var(--ink)' }}>{g.label}</div>
                      <Badge tone="slate">{g.rows.length} employees</Badge>
                    </button>
                    {!isCollapsed && (
                      <div style={{ padding: '8px 12px 0' }}>
                        {renderRosterTable(g.rows)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* TAB 2: SCORE & COMPETENCY ANALYSIS (SCORE ANALYTICS) */}
      {activeTab === 'SCORE_ANALYTICS' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginBottom: 28 }}>
          <div className="grid grid-2" style={{ gap: 16 }}>
            {/* Test score distribution */}
            <div className="card card-pad">
              <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 6, color: 'var(--ink)' }}>
                Team Competency Score Distribution
              </div>
              <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginBottom: 14 }}>
                The share of employees scoring excellent (≥ 90%), at standard (80% - 89%) and needing improvement (&lt; 80%).
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  { label: 'Excellent (90% - 100%)', count: teamMembers.filter((m) => m.score >= 90).length, tone: 'sage', color: '#10B981' },
                  { label: 'At Standard (80% - 89%)', count: teamMembers.filter((m) => m.score >= 80 && m.score < 90).length, tone: 'rail', color: 'var(--blue)' },
                  { label: 'Approaching (70% - 79%)', count: teamMembers.filter((m) => m.score >= 70 && m.score < 80).length, tone: 'amber', color: '#F59E0B' },
                  { label: 'Needs Improvement (< 70%)', count: teamMembers.filter((m) => m.score != null && m.score < 70).length, tone: 'rust', color: '#EF4444' },
                ].map((item) => {
                  const percent = teamMembers.length > 0 ? Math.round((item.count / teamMembers.length) * 100) : 0;
                  return (
                    <div key={item.label}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                        <span style={{ fontWeight: 600 }}>{item.label}</span>
                        <span><strong>{item.count}</strong> employees ({percent}%)</span>
                      </div>
                      <div style={{ width: '100%', height: 8, background: 'var(--paper-sunken)', borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{ width: `${percent}%`, height: '100%', background: item.color, borderRadius: 4 }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Learning Achievement Leaderboard */}
            <div className="card card-pad">
              <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 6, color: 'var(--ink)' }}>
                🏆 Top Performing Employees
              </div>
              <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginBottom: 14 }}>
                The employees with the highest scores who finished their courses earliest.
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {teamMembers
                  .slice()
                  .sort((a, b) => (b.score || 0) - (a.score || 0))
                  .slice(0, 5)
                  .map((m, idx) => (
                    <div
                      key={m.employeeId}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 12px',
                        background: idx === 0 ? '#FEF9C3' : idx === 1 ? 'var(--slate-soft)' : idx === 2 ? '#FFEDD5' : 'var(--paper-sunken)',
                        borderRadius: 8,
                        border: idx === 0 ? '1px solid #FDE047' : '1px solid transparent',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontWeight: 900, fontSize: 14, color: idx === 0 ? '#CA8A04' : 'var(--ink-soft)', width: 20 }}>
                          #{idx + 1}
                        </span>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 13 }}>{m.name}</div>
                          <div style={{ fontSize: 11, color: 'var(--ink-soft)' }}>{m.position} &middot; {m.course}</div>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 900, fontSize: 14, color: m.score >= 80 ? 'var(--sage)' : 'var(--rust)' }}>
                          {m.score != null ? `${m.score}%` : `${m.progress}%`}
                        </div>
                        <span style={{ fontSize: 11, color: 'var(--ink-faint)' }}>
                          {m.status === 'COMPLETED' ? 'Completed' : 'In progress'}
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: RISK MONITORING & NUDGES (RISK ALERTS) */}
      {activeTab === 'RISK_ALERTS' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18, marginBottom: 28 }}>
          <div style={{ background: 'var(--rust-soft)', border: '1px solid #FECACA', color: 'var(--rust-soft-text)', padding: '14px 18px', borderRadius: 8, fontSize: 13, lineHeight: 1.6 }}>
            <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
              <i className="ti ti-alert-octagon" style={{ fontSize: 18 }} />
              Recurring Compliance Audit Notice
            </div>
            There are <strong>{kpis.criticalRisksCount} employees overdue or not passing</strong> and <strong>{kpis.warningRisksCount} employees inactive for a long time</strong>. The manager should send a reminder or arrange direct coaching to reach a 100% completion rate before the audit.
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {enrichedTeamMembers
              .filter((m) => m.riskLevel !== 'SAFE')
              .map((m) => (
                <div
                  key={m.employeeId}
                  className="card card-pad"
                  style={{
                    borderLeft: `5px solid ${m.riskLevel === 'CRITICAL' ? 'var(--rust)' : '#F59E0B'}`,
                    background: 'var(--paper-raised)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 10 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontWeight: 800, fontSize: 15 }}>{m.name}</span>
                        <span style={{ fontSize: 12, color: 'var(--ink-faint)', fontFamily: 'var(--font-mono)' }}>({m.employeeId})</span>
                        <Badge tone={m.riskLevel === 'CRITICAL' ? 'rust' : 'amber'}>{m.riskLabel}</Badge>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 2 }}>
                        {m.position} &middot; Job level: Level {m.level} &middot; Locked: <strong>{m.course}</strong>
                      </div>
                    </div>

                    <Button
                      size="sm"
                      variant="primary"
                      icon="ti-bell-ringing"
                      onClick={() => setReminderMember(m)}
                    >
                      Send A Nudge Notification
                    </Button>
                  </div>

                  <div style={{ background: 'var(--paper-sunken)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'var(--ink)' }}>
                    <strong>Alert cause:</strong> {m.riskDetail}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* TAB 4: REAL ACTION COMMITMENTS (KIRKPATRICK L3) */}
      {activeTab === 'ACTION_PLANS' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 28 }}>
          <div style={{ background: 'var(--amber-soft)', color: 'var(--amber-soft-text)', padding: '12px 16px', borderRadius: 8, fontSize: 13 }}>
            <i className="ti ti-checklist" style={{ marginRight: 6 }} />
            Tracks the action plan for applying the learning in real operations and its completion <strong>Behavioural Impact Review (Kirkpatrick Level 3)</strong> after 3-6 months.
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {actionPlans.map((plan) => (
              <div key={plan.id} className="card card-pad" style={{ borderLeft: '4px solid var(--amber)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10, flexWrap: 'wrap', gap: 10 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontWeight: 800, fontSize: 15 }}>{plan.learnerName}</span>
                      <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>&middot; {plan.learnerPosition}</span>
                      <Badge tone={plan.managerReviewL3 ? 'sage' : 'amber'}>
                        {plan.managerReviewL3 ? 'Level 3 Review Signed-off' : 'Pending Level 3 Review'}
                      </Badge>
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--rail)', fontWeight: 600, marginTop: 3 }}>
                      Linked course: {plan.courseName}
                    </div>
                  </div>

                  <Button
                    size="sm"
                    variant={plan.managerReviewL3 ? 'outline' : 'primary'}
                    icon="ti-award"
                    onClick={() => openSurveyModal({ title: plan.courseName }, 'L3', { name: plan.learnerName, fullName: plan.learnerName })}
                  >
                    {plan.managerReviewL3 ? 'Edit The L3 Review' : 'Behavioural Review (3-6 Months)'}
                  </Button>
                </div>

                <div style={{ background: 'var(--paper-sunken)', borderRadius: 8, padding: '12px 14px', marginBottom: 12 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-soft)', marginBottom: 2 }}>
                    Workplace action commitment:
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
                      ✓ Manager review ({plan.managerReviewL3.score}/5.0 stars):
                    </div>
                    <div>{plan.managerReviewL3.behaviorChange} - {plan.managerReviewL3.productivityGain}</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SINGLE REMINDER MODAL */}
      <Modal
        isOpen={Boolean(reminderMember)}
        onClose={() => setReminderMember(null)}
        title="Send A Learning Progress Nudge"
        subtitle={reminderMember ? `${reminderMember.name} (${reminderMember.employeeId}) · ${reminderMember.position}` : ''}
        size="md"
        footer={
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
            <Button variant="ghost" onClick={() => setReminderMember(null)}>Close</Button>
            <Button
              variant="primary"
              icon={singleReminderSent ? 'ti-check' : 'ti-send'}
              onClick={handleSendSingleReminder}
              disabled={singleReminderSent}
            >
              {singleReminderSent ? 'Email Sent Successfully!' : 'Send Email & App Notification'}
            </Button>
          </div>
        }
      >
        {reminderMember && (
          <div>
            <div className="card card-pad" style={{ background: 'var(--paper-sunken)', marginBottom: 14 }}>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{reminderMember.course}</div>
              <div style={{ fontSize: 12, color: 'var(--ink-soft)', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <span>Classification: <strong>{reminderMember.courseType}</strong></span>
                <span>Deadline: <strong style={{ color: reminderMember.overdue ? 'var(--rust)' : 'inherit' }}>{reminderMember.dueDate}</strong></span>
                <span>Progress: <strong>{reminderMember.progress}%</strong></span>
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--ink-soft)', marginBottom: 4 }}>
                Reminder Message From The Manager:
              </label>
              <textarea
                className="field-input"
                rows={4}
                style={{ width: '100%', fontSize: 13, borderRadius: 8, padding: 10 }}
                defaultValue={`Hi ${reminderMember.name}, your manager has noticed that your progress on "${reminderMember.course}" is at ${reminderMember.progress}%. Please make time to finish the lessons and the test before the ${reminderMember.dueDate} deadline so we stay compliant with store operating standards.`}
              />
            </div>
          </div>
        )}
      </Modal>

      {/* USER TRANSCRIPT MODAL */}
      <UserTranscriptModal
        targetUser={transcriptUser}
        isOpen={Boolean(transcriptUser)}
        onClose={() => setTranscriptUser(null)}
      />

      {/* ROADMAP MODAL */}
      <Modal
        isOpen={Boolean(roadmapUser)}
        onClose={() => setRoadmapUser(null)}
        title="The Employee's Level Roadmap"
        subtitle={roadmapUser ? `${roadmapUser.fullName} · Level ${roadmapUser.level}` : ''}
        size="md"
      >
        {roadmapUser && <RoadmapProgressSummary roadmap={getUserRoadmapTabs(roadmapUser)} />}
      </Modal>
    </>
  );
}
