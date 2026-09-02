import React, { useState, useMemo } from 'react';
import { getTeamMembersForManager, managerUser as defaultManager, teamSkillGapMatrix, allUsers } from '../../data/mockData';
import { useCourseStore } from '../../store/CourseStore';
import { canManage } from '../../data/roles';
import { Badge, ProgressBar, Button, CourseTypeBadge, Modal } from '../../features/common/ui';
import { downloadCsv } from '../../lib/exportCsv';
import UserTranscriptModal from '../../features/common/UserTranscriptModal';
import RoadmapTabsPanel from '../../features/roadmaps/RoadmapTabsPanel';

const STATUS_META = {
  NOT_STARTED: { tone: 'slate', label: 'Not Started', enLabel: 'Not Started' },
  IN_PROGRESS: { tone: 'rail', label: 'In Progress', enLabel: 'In Progress' },
  COMPLETED: { tone: 'sage', label: 'Completed', enLabel: 'Completed' },
  FAILED: { tone: 'rust', label: 'Score Not Passed', enLabel: 'Failed' },
  OVERDUE: { tone: 'rust', label: 'Overdue', enLabel: 'Overdue' },
};

const MANAGER_GROUP_BY_OPTIONS = [
  { id: 'NONE', label: 'No grouping' },
  { id: 'STATUS', label: 'By Status' },
  { id: 'RISK', label: 'By Compliance Risk Level' },
  { id: 'COURSE_TYPE', label: 'By Course Classification' },
  { id: 'POSITION', label: 'By Job Title / Position' },
  { id: 'LEVEL', label: 'By Job Level' },
];

export default function ManagerTeam() {
  const { currentUser: authUser, openSurveyModal, actionPlans, users } = useCourseStore();
  const activeManager = canManage(authUser?.role, 'learner') ? authUser : defaultManager;
  const rawTeamMembers = useMemo(() => getTeamMembersForManager(activeManager), [activeManager]);

  // Main navigation tabs: ROSTER, SCORE_ANALYTICS, SKILL_GAP, ACTION_PLANS
  const [activeTab, setActiveTab] = useState('ROSTER');

  // Filter States
  const [quickFilter, setQuickFilter] = useState('ALL'); // ALL, COMPLIANT, IN_PROGRESS, COMPLETED, RISK_OVERDUE, FAILED, NOT_STARTED
  const [search, setSearch] = useState('');
  const [groupBy, setGroupBy] = useState('NONE');
  const [showFilters, setShowFilters] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState(() => new Set());

  const [positionFilter, setPositionFilter] = useState('ALL');
  const [levelFilter, setLevelFilter] = useState('ALL');
  const [courseTypeFilter, setCourseTypeFilter] = useState('ALL');
  const [scoreRangeFilter, setScoreRangeFilter] = useState('ALL'); // ALL, PASS, FAIL, UNGRADED
  const [riskFilter, setRiskFilter] = useState('ALL'); // ALL, SAFE, WARNING, CRITICAL

  // Modals & Action States
  const [transcriptUser, setTranscriptUser] = useState(null);
  const [roadmapUser, setRoadmapUser] = useState(null);
  const [reminderMember, setReminderMember] = useState(null);
  const [batchReminderSent, setBatchReminderSent] = useState(false);
  const [singleReminderSent, setSingleReminderSent] = useState(false);
  const [reminderMessage, setReminderMessage] = useState('');

  // Enrich team members with comprehensive risk level & details
  const enrichedTeamMembers = useMemo(() => {
    return rawTeamMembers.map((m) => {
      let riskLevel = 'SAFE'; // SAFE | WARNING | CRITICAL
      let riskLabel = '🟢 Compliance Standard Met';
      let riskDetail = 'On schedule or has already met the training target.';

      if (m.status === 'OVERDUE') {
        riskLevel = 'CRITICAL';
        riskLabel = '🔴 Overdue Risk';
        riskDetail = `Past the deadline (${m.dueDate}) — at risk of being logged as an operations audit breach.`;
      } else if (m.status === 'FAILED') {
        riskLevel = 'CRITICAL';
        riskLabel = '🔴 Score Not Passed';
        riskDetail = `Exam score ${m.score}% (below the 80% standard) after ${m.attempts || 1} attempts. Needs coaching & a retake.`;
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
  }, [rawTeamMembers]);

  // Executive KPI summary calculations
  const kpis = useMemo(() => {
    const total = enrichedTeamMembers.length;
    const completed = enrichedTeamMembers.filter((m) => m.status === 'COMPLETED').length;
    const inProgress = enrichedTeamMembers.filter((m) => m.status === 'IN_PROGRESS').length;
    const overdue = enrichedTeamMembers.filter((m) => m.status === 'OVERDUE').length;
    const failed = enrichedTeamMembers.filter((m) => m.status === 'FAILED').length;
    const notStarted = enrichedTeamMembers.filter((m) => m.status === 'NOT_STARTED').length;

    const mandatoryList = enrichedTeamMembers.filter((m) => m.courseType === 'MANDATORY');
    const mandatoryCompleted = mandatoryList.filter((m) => m.status === 'COMPLETED').length;
    const mandatoryComplianceRate = mandatoryList.length > 0 ? Math.round((mandatoryCompleted / mandatoryList.length) * 100) : 100;

    const avgProgress = total > 0 ? Math.round(enrichedTeamMembers.reduce((s, m) => s + (m.progress || 0), 0) / total) : 0;

    const scoredList = enrichedTeamMembers.filter((m) => m.score != null);
    const avgScore = scoredList.length > 0 ? Math.round(scoredList.reduce((s, m) => s + m.score, 0) / scoredList.length) : null;
    const passCount = scoredList.filter((m) => m.score >= 80).length;
    const passRate = scoredList.length > 0 ? Math.round((passCount / scoredList.length) * 100) : 100;

    const criticalRisks = enrichedTeamMembers.filter((m) => m.riskLevel === 'CRITICAL');
    const warningRisks = enrichedTeamMembers.filter((m) => m.riskLevel === 'WARNING');
    const totalNeedsAttention = criticalRisks.length + warningRisks.length;

    return {
      total,
      completed,
      inProgress,
      overdue,
      failed,
      notStarted,
      mandatoryListCount: mandatoryList.length,
      mandatoryCompleted,
      mandatoryComplianceRate,
      avgProgress,
      avgScore,
      passRate,
      totalNeedsAttention,
      criticalRisksCount: criticalRisks.length,
      warningRisksCount: warningRisks.length,
    };
  }, [enrichedTeamMembers]);

  // Unique filter lists
  const positionList = useMemo(() => {
    const set = new Set();
    enrichedTeamMembers.forEach((m) => { if (m.position) set.add(m.position); });
    return Array.from(set);
  }, [enrichedTeamMembers]);

  const levelList = useMemo(() => {
    const set = new Set();
    enrichedTeamMembers.forEach((m) => { if (m.level) set.add(String(m.level)); });
    return Array.from(set).sort();
  }, [enrichedTeamMembers]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (positionFilter !== 'ALL') count++;
    if (levelFilter !== 'ALL') count++;
    if (courseTypeFilter !== 'ALL') count++;
    if (scoreRangeFilter !== 'ALL') count++;
    if (riskFilter !== 'ALL') count++;
    return count;
  }, [positionFilter, levelFilter, courseTypeFilter, scoreRangeFilter, riskFilter]);

  // Filtered members list for Roster tab
  const filteredList = useMemo(() => {
    return enrichedTeamMembers.filter((m) => {
      // Quick Filter Pills
      if (quickFilter === 'COMPLIANT' && m.riskLevel !== 'SAFE') return false;
      if (quickFilter === 'IN_PROGRESS' && m.status !== 'IN_PROGRESS') return false;
      if (quickFilter === 'COMPLETED' && m.status !== 'COMPLETED') return false;
      if (quickFilter === 'RISK_OVERDUE' && m.riskLevel === 'SAFE') return false;
      if (quickFilter === 'FAILED' && m.status !== 'FAILED') return false;
      if (quickFilter === 'NOT_STARTED' && m.status !== 'NOT_STARTED') return false;

      // Dropdown Panel Filters
      if (positionFilter !== 'ALL' && m.position !== positionFilter) return false;
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
        const matchLvl = String(m.level || '').toLowerCase().includes(q);
        if (!matchName && !matchId && !matchCourse && !matchPos && !matchLvl) return false;
      }

      return true;
    });
  }, [enrichedTeamMembers, quickFilter, positionFilter, levelFilter, courseTypeFilter, scoreRangeFilter, riskFilter, search]);

  // Group By Logic
  function groupKeyOf(m) {
    if (groupBy === 'STATUS') {
      const meta = STATUS_META[m.status] || STATUS_META.NOT_STARTED;
      return { key: m.status, label: meta.label, icon: 'ti-progress-check' };
    }
    if (groupBy === 'RISK') {
      return {
        key: m.riskLevel,
        label: m.riskLevel === 'CRITICAL' ? '🔴 High Risk (Overdue / Failed)' : m.riskLevel === 'WARNING' ? '🟡 Warning (Inactive)' : '🟢 Safe & Meets The Standard',
        icon: m.riskLevel === 'CRITICAL' ? 'ti-alert-octagon' : m.riskLevel === 'WARNING' ? 'ti-alert-triangle' : 'ti-circle-check',
      };
    }
    if (groupBy === 'COURSE_TYPE') {
      return {
        key: m.courseType,
        label: m.courseType === 'MANDATORY' ? '🔒 Mandatory Compliance Courses' : m.courseType === 'ROADMAP' ? '🏆 Level Roadmap Courses' : '✨ Optional Courses',
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
    if (groupBy === 'LEVEL') {
      return {
        key: String(m.level || '7'),
        label: `Job Level: Level ${m.level || 7}`,
        icon: 'ti-stairs-up',
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
    setPositionFilter('ALL');
    setLevelFilter('ALL');
    setCourseTypeFilter('ALL');
    setScoreRangeFilter('ALL');
    setRiskFilter('ALL');
    setGroupBy('NONE');
  }

  // Export comprehensive CSV
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
      'Attempts',
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
      m.attempts || 0,
      m.dueDate || '—',
      m.lastActivity || 'Not recorded',
      m.inactiveDays || 0,
      m.riskLabel || '',
    ]);

    downloadCsv(`Bao_Cao_Dao_Tao_Doi_Ngu_${activeManager.divisionCode || 'Team'}_${new Date().toISOString().slice(0, 10)}.csv`, [headers, ...rows]);
  }

  // Batch reminder action
  function handleSendBatchReminder() {
    setBatchReminderSent(true);
    setTimeout(() => setBatchReminderSent(false), 3500);
  }

  // Single reminder trigger
  function openReminderModal(member) {
    setReminderMember(member);
    setReminderMessage(
      `Hi ${member.name},
Your course "${member.course}" must be completed before ${member.dueDate}. Please make time to finish it on schedule so the department stays compliant.`
    );
  }

  function handleSendSingleReminder() {
    setSingleReminderSent(true);
    setTimeout(() => {
      setSingleReminderSent(false);
      setReminderMember(null);
    }, 1500);
  }

  // Render Roster Table component
  function renderRosterTable(members) {
    return (
      <div className="card" style={{ borderRadius: 10, border: '1px solid var(--line)', overflowX: 'auto', marginBottom: 14, background: 'var(--paper-raised)' }}>
        <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--paper-sunken)' }}>
              <th style={{ width: '22%' }}>Employee</th>
              <th style={{ width: '22%' }}>Program / Course</th>
              <th style={{ width: '8%' }}>Classification</th>
              <th style={{ width: '12%' }}>Progress</th>
              <th style={{ width: '9%' }}>Status</th>
              <th style={{ width: '9%' }}>Exam Score</th>
              <th style={{ width: '9%' }}>Deadline</th>
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
                        Level {m.level} &middot; {m.storeName || activeManager.storeName || 'MM An Phu'}
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
                      <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                        <Button
                          size="sm"
                          variant="outline"
                          icon="ti-bell"
                          onClick={() => openReminderModal(m)}
                          title="Send a progress reminder email"
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          icon="ti-eye"
                          onClick={() => {
                            const list = users && users.length > 0 ? users : allUsers ? allUsers() : [];
                            const fullUser = list.find((u) => u.userId === m.userId || u.employeeCode === m.employeeId || u.fullName === m.name) || m;
                            setTranscriptUser(fullUser);
                          }}
                          title="View this employee's full course list & transcript"
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          icon="ti-stairs-up"
                          onClick={() => {
                            const list = users && users.length > 0 ? users : allUsers ? allUsers() : [];
                            let fullUser = list.find((u) => u.userId === m.userId || u.employeeCode === m.employeeId || u.fullName === m.name);
                            if (!fullUser) {
                              fullUser = {
                                userId: m.userId || m.employeeId || 'USR-TMP',
                                employeeCode: m.employeeId,
                                fullName: m.name,
                                name: m.name,
                                position: m.position,
                                level: m.level || 6,
                                divisionCode: m.divisionCode || 'OMD',
                                departmentCode: m.departmentCode || 'PPF',
                                storeName: m.storeName || activeManager.storeName || 'MM An Phu',
                              };
                            }
                            setRoadmapUser(fullUser);
                          }}
                          title="View this employee's job level roadmap"
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
      {/* 1. COMPREHENSIVE PAGE HEADER */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <h1>Team Training &amp; Competency Development Management</h1>
            <Badge tone="amber" icon="ti-briefcase">
              {activeManager.storeName || `${activeManager.divisionCode} - ${activeManager.departmentCode}`}
            </Badge>
          </div>
          <p style={{ margin: 0 }}>
            End-to-end monitoring of learning progress, audit compliance rate, skill gap diagnosis and behavioural application review (Kirkpatrick L3) for the {rawTeamMembers.length} employees reporting to {activeManager.fullName}.
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

      {/* 2. TOP 4 EXECUTIVE METRIC CARDS */}
      <div className="grid grid-4" style={{ marginBottom: 24, gap: 14 }}>
        {/* Card 1: Mandatory Compliance */}
        <div className="card card-pad" style={{ borderLeft: '4px solid var(--sage, #10B981)', background: 'var(--paper-raised)' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-soft)', textTransform: 'uppercase', marginBottom: 4 }}>
            Mandatory Course Compliance
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontSize: 28, fontWeight: 900, color: 'var(--sage)' }}>{kpis.mandatoryComplianceRate}%</span>
            <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
              ({kpis.mandatoryCompleted}/{kpis.mandatoryListCount} complete)
            </span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 4 }}>
            Meets the MM Mega Market audit standard
          </div>
        </div>

        {/* Card 2: Overall Progress */}
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

        {/* Card 3: Competency Score */}
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
            Knowledge exam pass mark ≥ 80%
          </div>
        </div>

        {/* Card 4: Risk / Attention Required */}
        <div
          className="card card-pad"
          style={{
            borderLeft: '4px solid var(--rust, #EF4444)',
            background: 'var(--paper-raised)',
            cursor: 'pointer',
            transition: 'box-shadow 0.2s',
          }}
          onClick={() => {
            setActiveTab('ROSTER');
            setQuickFilter('RISK_OVERDUE');
          }}
          title="Click to filter straight to the cases needing action"
        >
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-soft)', textTransform: 'uppercase', marginBottom: 4, display: 'flex', justifyContent: 'space-between' }}>
            <span>Alerts To Handle</span>
            <i className="ti ti-chevron-right" style={{ fontSize: 12, color: 'var(--ink-faint)' }} />
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

      {/* 3. DISTINCT 4 MAIN TABS (NON-REDUNDANT) */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, borderBottom: '1px solid var(--line)', paddingBottom: 8, flexWrap: 'wrap' }}>
        {[
          { id: 'ROSTER', label: 'Detailed Progress & Compliance', icon: 'ti-list-check' },
          { id: 'SCORE_ANALYTICS', label: 'Score & Competency Analysis', icon: 'ti-chart-pie' },
          { id: 'SKILL_GAP', label: 'Skill Gap Matrix', icon: 'ti-chart-radar' },
          { id: 'ACTION_PLANS', label: 'Action Commitments & L3 Review', icon: 'ti-checklist' },
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
          </button>
        ))}
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: DETAILED PROGRESS & COMPLIANCE (ROSTER & COMPLIANCE) */}
      {/* ========================================================================= */}
      {activeTab === 'ROSTER' && (
        <>
          {/* STANDARDIZED FILTER TOOLBAR */}
          <div className="card card-pad" style={{ marginBottom: 18, background: 'var(--paper-raised)', borderRadius: 10, border: '1px solid var(--line)' }}>
            {/* ROW 0: QUICK FILTER PILLS */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14, paddingBottom: 14, borderBottom: '1px solid var(--line)' }}>
              {[
                { id: 'ALL', label: 'All Employees', count: rawTeamMembers.length },
                { id: 'COMPLIANT', label: 'Compliance Standard Met', count: enrichedTeamMembers.filter((m) => m.riskLevel === 'SAFE').length },
                { id: 'IN_PROGRESS', label: 'In Progress', count: rawTeamMembers.filter((m) => m.status === 'IN_PROGRESS').length },
                { id: 'COMPLETED', label: 'Completed', count: rawTeamMembers.filter((m) => m.status === 'COMPLETED').length },
                { id: 'RISK_OVERDUE', label: '🔴 Needs Attention / Overdue', count: kpis.totalNeedsAttention, highlight: true },
                { id: 'FAILED', label: 'Score Not Passed', count: rawTeamMembers.filter((m) => m.status === 'FAILED').length },
                { id: 'NOT_STARTED', label: 'Not Started', count: rawTeamMembers.filter((m) => m.status === 'NOT_STARTED').length },
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
                    background: quickFilter === f.id ? 'rgba(255,255,255,0.3)' : 'var(--paper-sunken)',
                    color: quickFilter === f.id ? '#fff' : 'var(--ink-soft)',
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

            {/* ROW 1: SEARCH, GROUP BY, FILTER TOGGLE */}
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
              {/* Search Input */}
              <div style={{ position: 'relative', flex: '1 1 280px', minWidth: 220 }}>
                <i className="ti ti-search" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-faint)', fontSize: 15 }} />
                <input
                  type="text"
                  className="field-input"
                  style={{ paddingLeft: 36, paddingRight: search ? 32 : 12, height: 38, fontSize: 13, width: '100%', borderRadius: 8 }}
                  placeholder="Search by employee name, code, job title, course..."
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

              {/* Group By & Filter Toggle */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
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
                    {MANAGER_GROUP_BY_OPTIONS.map((opt) => (
                      <option key={opt.id} value={opt.id}>{opt.label}</option>
                    ))}
                  </select>
                </div>

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

            {/* ROW 2: COLLAPSIBLE ADVANCED FILTER PANEL */}
            {showFilters && (
              <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px dashed var(--line)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
                  {/* Position */}
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--ink-soft)', marginBottom: 4 }}>
                      JOB TITLE / POSITION
                    </label>
                    <select
                      className="field-select"
                      style={{ width: '100%', height: 36, fontSize: 12, borderRadius: 6 }}
                      value={positionFilter}
                      onChange={(e) => setPositionFilter(e.target.value)}
                    >
                      <option value="ALL">All job titles</option>
                      {positionList.map((pos) => (
                        <option key={pos} value={pos}>{pos}</option>
                      ))}
                    </select>
                  </div>

                  {/* Level */}
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--ink-soft)', marginBottom: 4 }}>
                      JOB LEVEL
                    </label>
                    <select
                      className="field-select"
                      style={{ width: '100%', height: 36, fontSize: 12, borderRadius: 6 }}
                      value={levelFilter}
                      onChange={(e) => setLevelFilter(e.target.value)}
                    >
                      <option value="ALL">All job levels</option>
                      {levelList.map((lvl) => (
                        <option key={lvl} value={lvl}>Level {lvl}</option>
                      ))}
                    </select>
                  </div>

                  {/* Course Type */}
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--ink-soft)', marginBottom: 4 }}>
                      COURSE CLASSIFICATION
                    </label>
                    <select
                      className="field-select"
                      style={{ width: '100%', height: 36, fontSize: 12, borderRadius: 6 }}
                      value={courseTypeFilter}
                      onChange={(e) => setCourseTypeFilter(e.target.value)}
                    >
                      <option value="ALL">All classifications</option>
                      <option value="MANDATORY">Compliance Mandatory</option>
                      <option value="ROADMAP">By Level Roadmap</option>
                      <option value="ELECTIVE">Elective</option>
                    </select>
                  </div>

                  {/* Score Range */}
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--ink-soft)', marginBottom: 4 }}>
                      EXAM RESULT
                    </label>
                    <select
                      className="field-select"
                      style={{ width: '100%', height: 36, fontSize: 12, borderRadius: 6 }}
                      value={scoreRangeFilter}
                      onChange={(e) => setScoreRangeFilter(e.target.value)}
                    >
                      <option value="ALL">All results</option>
                      <option value="PASS">🟢 Meets the standard (&ge; 80%)</option>
                      <option value="FAIL">🔴 Not passed (&lt; 80%)</option>
                      <option value="UNGRADED">⚪ Test not taken</option>
                    </select>
                  </div>

                  {/* Risk Level */}
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--ink-soft)', marginBottom: 4 }}>
                      RISK LEVEL
                    </label>
                    <select
                      className="field-select"
                      style={{ width: '100%', height: 36, fontSize: 12, borderRadius: 6 }}
                      value={riskFilter}
                      onChange={(e) => setRiskFilter(e.target.value)}
                    >
                      <option value="ALL">All levels</option>
                      <option value="SAFE">🟢 Safe / meets the standard</option>
                      <option value="WARNING">🟡 Warning / absent &gt; 3 days</option>
                      <option value="CRITICAL">🔴 High risk / overdue / failed</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* ROW 3: ACTIVE FILTERS SUMMARY BAR */}
            {(search || quickFilter !== 'ALL' || positionFilter !== 'ALL' || levelFilter !== 'ALL' || courseTypeFilter !== 'ALL' || scoreRangeFilter !== 'ALL' || riskFilter !== 'ALL' || groupBy !== 'NONE') && (
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
                      Range: <strong>{quickFilter}</strong>
                      <i className="ti ti-x" style={{ cursor: 'pointer' }} onClick={() => setQuickFilter('ALL')} />
                    </span>
                  )}
                  {positionFilter !== 'ALL' && (
                    <span className="badge" style={{ background: 'var(--blue-soft)', color: 'var(--blue-soft-text)', border: '1px solid #BFDBFE', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      Job title: <strong>{positionFilter}</strong>
                      <i className="ti ti-x" style={{ cursor: 'pointer' }} onClick={() => setPositionFilter('ALL')} />
                    </span>
                  )}
                  {levelFilter !== 'ALL' && (
                    <span className="badge" style={{ background: 'var(--blue-soft)', color: 'var(--blue-soft-text)', border: '1px solid #BFDBFE', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      Job level: <strong>Level {levelFilter}</strong>
                      <i className="ti ti-x" style={{ cursor: 'pointer' }} onClick={() => setLevelFilter('ALL')} />
                    </span>
                  )}
                  {courseTypeFilter !== 'ALL' && (
                    <span className="badge" style={{ background: 'var(--blue-soft)', color: 'var(--blue-soft-text)', border: '1px solid #BFDBFE', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      Type: <strong>{courseTypeFilter}</strong>
                      <i className="ti ti-x" style={{ cursor: 'pointer' }} onClick={() => setCourseTypeFilter('ALL')} />
                    </span>
                  )}
                  {scoreRangeFilter !== 'ALL' && (
                    <span className="badge" style={{ background: 'var(--blue-soft)', color: 'var(--blue-soft-text)', border: '1px solid #BFDBFE', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      Score: <strong>{scoreRangeFilter}</strong>
                      <i className="ti ti-x" style={{ cursor: 'pointer' }} onClick={() => setScoreRangeFilter('ALL')} />
                    </span>
                  )}
                  {riskFilter !== 'ALL' && (
                    <span className="badge" style={{ background: 'var(--blue-soft)', color: 'var(--blue-soft-text)', border: '1px solid #BFDBFE', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      Risk: <strong>{riskFilter}</strong>
                      <i className="ti ti-x" style={{ cursor: 'pointer' }} onClick={() => setRiskFilter('ALL')} />
                    </span>
                  )}
                  {groupBy !== 'NONE' && (
                    <span className="badge" style={{ background: 'var(--paper-sunken)', color: 'var(--ink-soft)', border: '1px solid var(--line)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      Group by: <strong>{MANAGER_GROUP_BY_OPTIONS.find((o) => o.id === groupBy)?.label}</strong>
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
                  Found <strong>{filteredList.length}</strong> / {rawTeamMembers.length} employees
                </div>
              </div>
            )}
          </div>

          {/* CONTENT: FLAT OR GROUPED TABLE */}
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

      {/* ========================================================================= */}
      {/* TAB 2: SCORE & TRAINING EFFECTIVENESS ANALYSIS (SCORE ANALYTICS) */}
      {/* ========================================================================= */}
      {activeTab === 'SCORE_ANALYTICS' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginBottom: 28 }}>
          <div className="grid grid-2" style={{ gap: 16 }}>
            {/* Competency Score Distribution */}
            <div className="card card-pad" style={{ background: 'var(--paper-raised)', borderRadius: 10, border: '1px solid var(--line)' }}>
              <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 6, color: 'var(--ink)' }}>
                Team Competency Score Distribution
              </div>
              <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginBottom: 14 }}>
                The share of employees scoring excellent (≥ 90%), at standard (80% - 89%), approaching (70% - 79%) and needing improvement (&lt; 70%).
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  { label: 'Excellent (90% - 100%)', count: rawTeamMembers.filter((m) => m.score >= 90).length, tone: 'sage', color: '#10B981' },
                  { label: 'At Standard (80% - 89%)', count: rawTeamMembers.filter((m) => m.score >= 80 && m.score < 90).length, tone: 'rail', color: 'var(--blue)' },
                  { label: 'Approaching (70% - 79%)', count: rawTeamMembers.filter((m) => m.score >= 70 && m.score < 80).length, tone: 'amber', color: '#F59E0B' },
                  { label: 'Needs Improvement (< 70%)', count: rawTeamMembers.filter((m) => m.score != null && m.score < 70).length, tone: 'rust', color: '#EF4444' },
                ].map((item) => {
                  const percent = rawTeamMembers.length > 0 ? Math.round((item.count / rawTeamMembers.length) * 100) : 0;
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

              <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px dashed var(--line)', fontSize: 12, color: 'var(--ink-soft)' }}>
                <i className="ti ti-info-circle" style={{ marginRight: 4 }} />
                The MM Mega Market mandatory pass standard is <strong>≥ 80%</strong> end-of-course exam scores.
              </div>
            </div>

            {/* Top Performing Employees Leaderboard */}
            <div className="card card-pad" style={{ background: 'var(--paper-raised)', borderRadius: 10, border: '1px solid var(--line)' }}>
              <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 6, color: 'var(--ink)' }}>
                🏆 Top Performing Employees
              </div>
              <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginBottom: 14 }}>
                The employees with the highest scores who finished their courses earliest in this training cycle.
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {rawTeamMembers
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
                        padding: '10px 12px',
                        background: idx === 0 ? '#FEF9C3' : idx === 1 ? 'var(--slate-soft)' : idx === 2 ? '#FFEDD5' : 'var(--paper-sunken)',
                        borderRadius: 8,
                        border: idx === 0 ? '1px solid #FDE047' : '1px solid transparent',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontWeight: 900, fontSize: 14, color: idx === 0 ? '#CA8A04' : 'var(--ink-soft)', width: 22 }}>
                          {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
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

          {/* Assessment Quality Insights */}
          <div className="card card-pad" style={{ background: 'var(--paper-sunken)', border: '1px solid var(--line)', borderRadius: 10 }}>
            <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6, color: 'var(--ink)' }}>
              <i className="ti ti-bulb" style={{ color: 'var(--amber)', fontSize: 18 }} />
              Review Metrics &amp; Recommendations For The Manager
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
              <div style={{ background: 'var(--paper-raised)', padding: '12px 14px', borderRadius: 8, border: '1px solid var(--line)' }}>
                <div style={{ fontSize: 12, color: 'var(--ink-soft)', fontWeight: 600 }}>FIRST-ATTEMPT PASS RATE</div>
                <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--rail)', margin: '4px 0' }}>87.5%</div>
                <div style={{ fontSize: 11, color: 'var(--ink-soft)' }}>7 of 8 employees passed the exam on the first attempt</div>
              </div>
              <div style={{ background: 'var(--paper-raised)', padding: '12px 14px', borderRadius: 8, border: '1px solid var(--line)' }}>
                <div style={{ fontSize: 12, color: 'var(--ink-soft)', fontWeight: 600 }}>AVERAGE ATTEMPTS</div>
                <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--ink)', margin: '4px 0' }}>1.25 attempts</div>
                <div style={{ fontSize: 11, color: 'var(--ink-soft)' }}>Knowledge is absorbed well, with few retakes</div>
              </div>
              <div style={{ background: 'var(--paper-raised)', padding: '12px 14px', borderRadius: 8, border: '1px solid var(--line)' }}>
                <div style={{ fontSize: 12, color: 'var(--ink-soft)', fontWeight: 600 }}>RETAKES TO UNLOCK</div>
                <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--rust)', margin: '4px 0' }}>1 ca (Lisa Wang)</div>
                <div style={{ fontSize: 11, color: 'var(--ink-soft)' }}>Failed the cold chain exam 3 times (55% vs the 80% standard)</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: SKILL GAP & SUCCESSION MATRIX (SKILL GAP MATRIX) */}
      {/* ========================================================================= */}
      {activeTab === 'SKILL_GAP' && (
        <div style={{ marginBottom: 28 }}>
          <div style={{ background: 'var(--rail-soft)', color: 'var(--rail-soft-text)', padding: '14px 18px', borderRadius: 8, fontSize: 13, marginBottom: 18, lineHeight: 1.5 }}>
            <i className="ti ti-chart-radar" style={{ marginRight: 8, fontSize: 16 }} />
            A diagnostic matrix comparing <strong>The Employee's Actual Competency</strong> against <strong>The Competency Standard Framework Of The Target Succession Role (Thanh Giong Pipeline)</strong>. Assign supplementary courses to employees managed by User Admin/L&amp;D.
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {teamSkillGapMatrix.map((item, idx) => (
              <div key={idx} className="card card-pad" style={{ background: 'var(--paper-raised)', borderRadius: 10, border: '1px solid var(--line)' }}>
                {/* Header card */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10, borderBottom: '1px solid var(--line)', paddingBottom: 10 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontWeight: 800, fontSize: 15 }}>{item.employeeName}</span>
                      <span style={{ fontSize: 12, color: 'var(--ink-faint)', fontFamily: 'var(--font-mono)' }}>({item.employeeId})</span>
                      <Badge tone={item.overallGap >= 0 ? 'sage' : item.overallGap > -15 ? 'amber' : 'rust'}>
                        Net Gap: {item.overallGap}%
                      </Badge>
                      <Badge tone={item.readiness === 'READY_IN_6_MONTHS' ? 'sage' : item.readiness === 'DEVELOPING' ? 'amber' : 'rust'}>
                        {item.readiness === 'READY_IN_6_MONTHS' ? 'Ready In 6 Months' : item.readiness === 'DEVELOPING' ? 'Developing' : 'Needs Close Coaching'}
                      </Badge>
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--ink-soft)', marginTop: 4 }}>
                      Current position: <strong>{item.position}</strong> &rarr; Target succession role: <strong>{item.targetRole}</strong>
                    </div>
                  </div>
                </div>

                {/* Skills Breakdown Table */}
                <div style={{ overflowX: 'auto' }}>
                  <table className="table" style={{ width: '100%', fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: 'var(--paper-sunken)' }}>
                        <th style={{ width: '30%' }}>Key Skills / Competencies</th>
                        <th style={{ width: '14%' }}>Required Standard</th>
                        <th style={{ width: '14%' }}>Actual Score</th>
                        <th style={{ width: '14%' }}>Gap</th>
                        <th style={{ width: '28%' }}>Recommended Supplementary Courses</th>
                      </tr>
                    </thead>
                    <tbody>
                      {item.skills.map((skill, sIdx) => {
                        const isExceeded = skill.status === 'EXCEEDED';
                        const isCritical = skill.status === 'CRITICAL_GAP';
                        return (
                          <tr key={sIdx}>
                            <td style={{ fontWeight: 600 }}>{skill.name}</td>
                            <td>{skill.required}%</td>
                            <td>
                              <span style={{ fontWeight: 700, color: skill.actual >= skill.required ? 'var(--sage)' : 'var(--rust)' }}>
                                {skill.actual}%
                              </span>
                            </td>
                            <td>
                              <Badge tone={isExceeded ? 'sage' : isCritical ? 'rust' : 'amber'}>
                                {isExceeded ? 'Above standard (+)' : `${skill.gap}%`}
                              </Badge>
                            </td>
                            <td>
                              {skill.suggestedCourse ? (
                                <div>
                                  <div style={{ fontWeight: 600, color: 'var(--rail)', fontSize: 12 }}>{skill.suggestedCourse}</div>
                                  <div style={{ fontSize: 11, color: 'var(--ink-faint)', fontFamily: 'var(--font-mono)' }}>{skill.suggestedCourseId}</div>
                                </div>
                              ) : (
                                <span style={{ color: 'var(--ink-faint)', fontSize: 12 }}>Meets the standard; no supplement needed</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: ACTION COMMITMENTS & L3 REVIEW (KIRKPATRICK ACTION PLANS) */}
      {/* ========================================================================= */}
      {activeTab === 'ACTION_PLANS' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 28 }}>
          <div style={{ background: 'var(--amber-soft)', color: 'var(--amber-soft-text)', padding: '14px 18px', borderRadius: 8, fontSize: 13, lineHeight: 1.5 }}>
            <i className="ti ti-checklist" style={{ marginRight: 8, fontSize: 16 }} />
            Tracks the action plan for applying the learning in real store operations and its execution <strong>Behavioural Impact Review (Kirkpatrick Level 3)</strong> after 3 - 6 months of training.
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {actionPlans.map((plan) => (
              <div key={plan.id} className="card card-pad" style={{ borderLeft: '4px solid var(--amber)', background: 'var(--paper-raised)', borderRadius: 10, border: '1px solid var(--line)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12, flexWrap: 'wrap', gap: 10 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontWeight: 800, fontSize: 15 }}>{plan.learnerName}</span>
                      <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>&middot; {plan.learnerPosition}</span>
                      <Badge tone={plan.managerReviewL3 ? 'sage' : 'amber'}>
                        {plan.managerReviewL3 ? 'L3 Review Approved' : 'Awaiting The Manager\'s L3 Review'}
                      </Badge>
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--rail)', fontWeight: 600, marginTop: 4 }}>
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

      {/* ========================================================================= */}
      {/* MODALS */}
      {/* ========================================================================= */}

      {/* 1. Modal: view the full course list & transcript */}
      {transcriptUser && (
        <UserTranscriptModal
          user={transcriptUser}
          onClose={() => setTranscriptUser(null)}
        />
      )}

      {/* 2. Modal: view the level roadmap */}
      {roadmapUser && (
        <Modal
          title={`Level Competency Roadmap: ${roadmapUser.fullName || roadmapUser.name} (${roadmapUser.position || 'Employee'})`}
          onClose={() => setRoadmapUser(null)}
          maxWidth={920}
        >
          <RoadmapTabsPanel user={roadmapUser} />
        </Modal>
      )}

      {/* 3. Modal: send an individual reminder email */}
      {reminderMember && (
        <Modal
          title={`Send A Progress Reminder Email: ${reminderMember.name}`}
          onClose={() => setReminderMember(null)}
          maxWidth={540}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ fontSize: 13, color: 'var(--ink-soft)' }}>
              Courses: <strong>{reminderMember.course}</strong> &middot; Deadline: <strong>{reminderMember.dueDate}</strong>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6, color: 'var(--ink)' }}>
                Message sent to the employee:
              </label>
              <textarea
                className="field-input"
                rows={4}
                style={{ width: '100%', fontSize: 13, lineHeight: 1.5, padding: '8px 12px', borderRadius: 6 }}
                value={reminderMessage}
                onChange={(e) => setReminderMessage(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 6 }}>
              <Button variant="outline" size="sm" onClick={() => setReminderMember(null)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                icon={singleReminderSent ? 'ti-check' : 'ti-send'}
                onClick={handleSendSingleReminder}
                disabled={singleReminderSent}
              >
                {singleReminderSent ? 'Sent Successfully!' : 'Send The Notification Now'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
