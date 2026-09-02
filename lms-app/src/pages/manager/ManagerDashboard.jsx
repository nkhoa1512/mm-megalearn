import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { managerUser as defaultManager, notifications, allUsers, enrollmentsForUser } from '../../data/mockData';
import {
  buildTeam,
  teamSummary,
  teamAssignments,
  attentionByMember,
  INACTIVITY_THRESHOLD_DAYS,
} from '../../utils/managerRules';
import { useCourseStore } from '../../store/CourseStore';
import { canManage } from '../../data/roles';
import {
  Badge,
  Button,
  StatusStackedBar,
  Modal,
  DonutChart,
  BarChart,
  LineChart,
  ProgressBar,
} from '../../features/common/ui';

export default function ManagerDashboard() {
  const navigate = useNavigate();
  const {
    approvals, currentUser: authUser, approveRequest, rejectRequest, levelAdvanceRequestsFor,
    users, enrollments, courses,
  } = useCourseStore();
  const activeManager = canManage(authUser?.role, 'learner') ? authUser : defaultManager;

  // The team, and every figure derived from it, comes from src/utils/managerRules.js —
  // the real roster joined to the real enrollment matrix (BR-MGR-001, BR-MGR-010).
  const today = React.useMemo(() => new Date(), []);
  const roster = React.useMemo(() => (users && users.length > 0 ? users : allUsers()), [users]);
  const effectiveEnrollments = React.useMemo(() => {
    const map = {};
    roster.forEach((u) => { map[u.userId] = enrollmentsForUser(u, enrollments); });
    return map;
  }, [roster, enrollments]);

  const team = React.useMemo(
    () => buildTeam(activeManager, roster, effectiveEnrollments, today),
    [activeManager, roster, effectiveEnrollments, today]
  );
  const summary = React.useMemo(() => teamSummary(team), [team]);
  const attentionItems = React.useMemo(() => attentionByMember(team, courses, today), [team, courses, today]);

  const teamMembers = React.useMemo(
    () => team.members.map(({ user, relationshipLabel, state }) => ({
      userId: user.userId,
      employeeId: user.employeeCode,
      name: user.fullName,
      position: user.position,
      level: user.level,
      relationshipLabel,
      status: state.status,
      progress: state.completionPercent,
      score: state.averageScore,
      assigned: state.assigned,
      completedCount: state.completed,
      inactiveDays: state.inactiveDays === null ? 0 : state.inactiveDays,
      overdue: state.overdue > 0,
      dueDate: state.nextDueDate,
      lastActivity: state.lastActivity,
      reason: attentionItems.find((a) => a.userId === user.userId)?.reason || null,
      actionRequired: attentionItems.find((a) => a.userId === user.userId)?.kind || null,
      recommendedAction: attentionItems.find((a) => a.userId === user.userId)?.action || null,
    })),
    [team, attentionItems]
  );

  const [activeChartTab, setActiveChartTab] = useState('BAR'); // 'BAR' | 'LINE'
  const [filterType, setFilterType] = useState('ALL'); // 'ALL' | 'OVERDUE' | 'FAILED' | 'INACTIVE'
  const [remindTarget, setRemindTarget] = useState(null);
  const [isBatchRemind, setIsBatchRemind] = useState(false);
  const [remindSent, setRemindSent] = useState(false);

  // BR-MGR-031 / BR-MGR-040 — a manager only handles requests from their own team.
  const pendingApprovals = React.useMemo(() => {
    const ids = new Set(team.members.map((m) => m.user.userId));
    const codes = new Set(team.members.map((m) => m.user.employeeCode));
    return approvals.filter(
      (a) => a.status === 'PENDING' && (ids.has(a.userId) || codes.has(a.employeeCode) || codes.has(a.userId))
    );
  }, [approvals, team]);
  const total = teamMembers.length;
  const completed = teamMembers.filter((m) => m.status === 'COMPLETED').length;
  const inProgress = teamMembers.filter((m) => m.status === 'IN_PROGRESS').length;
  const notStarted = teamMembers.filter((m) => m.status === 'NOT_STARTED').length;
  const overdue = teamMembers.filter((m) => m.status === 'OVERDUE').length;
  const failed = teamMembers.filter((m) => m.status === 'FAILED').length;
  const needsAttention = teamMembers.filter((m) => m.status === 'OVERDUE' || m.status === 'FAILED' || m.inactiveDays >= INACTIVITY_THRESHOLD_DAYS);
  const avgCompletion = summary.completionPercent;

  // Filter the intervention list by tab
  const filteredAttentionList = needsAttention.filter((m) => {
    if (filterType === 'OVERDUE') return m.status === 'OVERDUE';
    if (filterType === 'FAILED') return m.status === 'FAILED';
    if (filterType === 'INACTIVE') return m.inactiveDays >= INACTIVITY_THRESHOLD_DAYS && m.status !== 'OVERDUE' && m.status !== 'FAILED';
    return true;
  });

  // Donut chart data: learning status breakdown
  const statusDonutData = [
    { label: 'Completed', value: completed, tone: 'sage' },
    { label: 'In Progress', value: inProgress, tone: 'rail' },
    { label: 'Not Started', value: notStarted, tone: 'slate' },
    { label: 'Overdue', value: overdue, tone: 'rust' },
    { label: 'Failed', value: failed, tone: 'amber' },
  ].filter((d) => d.value > 0);

  // Bar chart data: real completion per course across the team, weakest first.
  const teamTopicProgress = React.useMemo(() => {
    const rows = teamAssignments(team, effectiveEnrollments, courses);
    const map = new Map();
    rows.forEach((r) => {
      const slot = map.get(r.courseId) || { label: r.course, assigned: 0, completed: 0, mandatory: r.mandatory };
      slot.assigned += 1;
      if (r.status === 'COMPLETED') slot.completed += 1;
      map.set(r.courseId, slot);
    });
    return Array.from(map.values())
      .map((c) => ({
        label: c.label,
        value: c.assigned > 0 ? Math.round((c.completed / c.assigned) * 100) : 0,
        tone: c.assigned > 0 && c.completed / c.assigned >= 0.8 ? 'sage' : c.completed / c.assigned >= 0.5 ? 'rail' : 'rust',
        mandatory: c.mandatory,
      }))
      .sort((a, b) => (b.mandatory ? 1 : 0) - (a.mandatory ? 1 : 0) || a.value - b.value)
      .slice(0, 6);
  }, [team, effectiveEnrollments, courses]);

  // Line chart data: the team's average completion trend over 4 weeks
  const teamWeeklyTrend = [
    { label: 'Week 1', value: 35 },
    { label: 'Week 2', value: 42 },
    { label: 'Week 3', value: 50 },
    { label: 'Week 4', value: avgCompletion || 57 },
  ];

  function handleSendReminder() {
    setRemindSent(true);
    setTimeout(() => {
      setRemindTarget(null);
      setIsBatchRemind(false);
      setRemindSent(false);
    }, 1200);
  }

  function handleUnlockRetake(member) {
    alert(`One extra examination attempt has been unlocked for ${member.name} (course: ${member.course}). The learner has been notified!`);
  }

  return (
    <>
      {/* 1. EXECUTIVE MANAGER PROFILE & OVERVIEW BANNER */}
      <div
        className="card card-pad"
        style={{
          marginBottom: 20,
          background: 'linear-gradient(135deg, var(--paper-raised) 0%, var(--amber-soft) 100%)',
          borderColor: 'var(--amber, #F59E0B)',
          boxShadow: '0 4px 20px rgba(245, 158, 11, 0.08)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #B45309 0%, var(--amber, #D97706) 100%)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: 20,
                boxShadow: '0 4px 12px rgba(217, 119, 6, 0.3)',
                flexShrink: 0,
              }}
            >
              {activeManager.avatar || activeManager.fullName.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0, color: 'var(--ink)', letterSpacing: '-0.015em' }}>
                  Team Training Operations &amp; Monitoring Dashboard
                </h1>
                <Badge tone="amber" icon="ti-briefcase">
                  {activeManager.divisionCode} &middot; {activeManager.departmentName || activeManager.departmentCode}
                </Badge>
                <Badge tone="sage" icon="ti-users">
                  {summary.directReports} direct &middot; {summary.departmentMembers} department
                </Badge>
              </div>
              <p style={{ marginTop: 4, marginBottom: 0, color: 'var(--ink-soft)', fontSize: 13 }}>
                Manager: <strong>{activeManager.fullName}</strong> ({activeManager.position}) &middot; Operations division <strong>{activeManager.divisionName || 'Store Operations'}</strong> &middot; Manager code: <strong>{activeManager.employeeCode || 'MMVN-0245'}</strong>
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <Button variant="outline" icon="ti-user-circle" onClick={() => navigate('/my-learning-dashboard')}>
              View The Personal Learning Interface
            </Button>
            <Button
              variant="outline"
              tone="amber"
              icon="ti-bell-ringing"
              onClick={() => {
                setIsBatchRemind(true);
                setRemindTarget({ name: `All ${needsAttention.length} employees behind schedule`, course: 'Regulatory courses' });
              }}
            >
              Remind The Whole Team ({needsAttention.length})
            </Button>
            {pendingApprovals.length > 0 && (
              <Button variant="primary" tone="amber" icon="ti-clipboard-check" onClick={() => navigate('/manager/approvals')}>
                Approve {pendingApprovals.length} Pending Requests
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* 2. FOUR HERO MANAGEMENT KPI TILES */}
      <div className="grid grid-4" style={{ marginBottom: 24, gap: 16 }}>
        <StatTile
          label="Total Employees Reporting"
          value={`${total} Employees`}
          subtext={`${summary.assigned} assigned enrollment(s) across the team`}
          tone="blue"
          icon="ti-users"
          onClick={() => navigate('/manager/team')}
        />
        <StatTile
          label="Course Enrollments Completed"
          value={`${summary.completed} / ${summary.assigned}`}
          subtext={`${summary.completionPercent}% of assigned courses across the team`}
          tone="sage"
          icon="ti-circle-check"
          onClick={() => navigate('/manager/courses')}
        />
        <StatTile
          label="Avg Completion Progress"
          value={`${avgCompletion}%`}
          subtext="Quarterly goal: ≥80% completion"
          tone="rail"
          icon="ti-chart-pie"
          onClick={() => navigate('/manager/team')}
        />
        <StatTile
          label="Requires Manager Intervention"
          value={`${needsAttention.length} Employees`}
          subtext={`${overdue} overdue · ${failed} failed · ${needsAttention.length - overdue - failed} inactive`}
          tone="rust"
          icon="ti-alert-triangle"
          onClick={() => navigate('/manager/team')}
        />
      </div>

      {/* 3. DUAL-CHART MANAGEMENT ANALYTICS (DONUT + BAR/LINE SWITCHER) */}
      <div className="grid grid-2" style={{ gap: 20, marginBottom: 24, alignItems: 'start' }}>
        {/* CHART 1: TEAM STATUS DISTRIBUTION (DONUT CHART + STACKED BAR) */}
        <div className="card card-pad" style={{ border: '1px solid var(--line)', background: 'var(--paper-raised)', borderRadius: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--ink)' }}>
                <i className="ti ti-chart-donut" style={{ marginRight: 6, color: 'var(--amber)' }} />
                Team Learning Status Breakdown
              </div>
              <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 2 }}>
                Real completion rates, overdue counts and examination results
              </div>
            </div>
            <Badge tone={needsAttention.length > 0 ? 'rust' : 'sage'}>
              {needsAttention.length > 0 ? `${needsAttention.length} Alerts` : 'On Schedule'}
            </Badge>
          </div>

          {/* DONUT SVG CHART */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16, minHeight: 180 }}>
            <DonutChart data={statusDonutData} valueSuffix=" employees" />
          </div>

          <div style={{ borderTop: '1px solid var(--line)', paddingTop: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-soft)', marginBottom: 8 }}>
              Linear Progress Overview Bar:
            </div>
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
        </div>

        {/* CHART 2: TOPIC PROGRESS & TREND ANALYTICS (BAR & LINE SWITCHER) */}
        <div className="card card-pad" style={{ border: '1px solid var(--line)', background: 'var(--paper-raised)', borderRadius: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--ink)' }}>
                <i className="ti ti-chart-bar" style={{ marginRight: 6, color: 'var(--rail)' }} />
                Progress By Topic &amp; Weekly Trend
              </div>
              <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 2 }}>
                Analysis of mandatory topic coverage &amp; completion pace
              </div>
            </div>

            {/* TOGGLE SWITCHER */}
            <div style={{ display: 'flex', gap: 4, background: 'var(--paper-sunken)', padding: 3, borderRadius: 8, border: '1px solid var(--line)' }}>
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => setActiveChartTab('BAR')}
                style={{
                  fontSize: 11,
                  padding: '4px 8px',
                  background: activeChartTab === 'BAR' ? 'var(--rail)' : 'transparent',
                  color: activeChartTab === 'BAR' ? '#fff' : 'var(--ink-soft)',
                  border: 'none',
                }}
                title="Bar chart by topic"
              >
                📊 Topics
              </button>
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => setActiveChartTab('LINE')}
                style={{
                  fontSize: 11,
                  padding: '4px 8px',
                  background: activeChartTab === 'LINE' ? 'var(--amber)' : 'transparent',
                  color: activeChartTab === 'LINE' ? '#fff' : 'var(--ink-soft)',
                  border: 'none',
                }}
                title="4-week trend line chart"
              >
                📈 Trend
              </button>
            </div>
          </div>

          <div style={{ minHeight: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
            {activeChartTab === 'BAR' ? (
              <div style={{ width: '100%' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)', marginBottom: 8 }}>
                  Completion Rate Across The Department's 5 Core Topics (%)
                </div>
                <BarChart data={teamTopicProgress} valueSuffix="%" tone="rail" />
              </div>
            ) : (
              <div style={{ width: '100%' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)', marginBottom: 8 }}>
                  The Team's Average Completion Trend Over The Last 4 Weeks
                </div>
                <LineChart data={teamWeeklyTrend} valueSuffix="%" tone="amber" />
              </div>
            )}
          </div>

          {teamTopicProgress.length > 0 && teamTopicProgress[0].value < 80 && (
            <div style={{ background: 'var(--amber-soft)', borderRadius: 8, padding: '10px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <i className="ti ti-info-circle" style={{ color: 'var(--amber-soft-text)', fontSize: 18 }} />
                <div style={{ fontSize: 12, color: 'var(--amber-soft-text)' }}>
                  Weakest coverage: <strong>{teamTopicProgress[0].label}</strong> at {teamTopicProgress[0].value}% across the team.
                </div>
              </div>
              <Badge tone="amber">Needs a nudge</Badge>
            </div>
          )}
        </div>
      </div>

      {/* 4. ASSOCIATES REQUIRING MANAGER FOLLOW-UP (ACTION CENTER) */}
      <div className="card" style={{ marginBottom: 24, border: '1px solid var(--line)', borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', background: 'var(--paper-raised)', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--ink)' }}>
              <i className="ti ti-user-exclamation" style={{ marginRight: 6, color: 'var(--rust)' }} />
              Employees Requiring Manager Intervention &amp; Follow-Up ({needsAttention.length})
            </div>
            <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 2 }}>
              Handle employees overdue on mandatory training, failing the exam or inactive for a long time
            </div>
          </div>

          {/* FILTER TABS */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => setFilterType('ALL')}
              style={{
                fontSize: 12,
                background: filterType === 'ALL' ? 'var(--rail)' : 'var(--paper-sunken)',
                color: filterType === 'ALL' ? '#fff' : 'var(--ink-soft)',
                border: '1px solid var(--line)',
              }}
            >
              All ({needsAttention.length})
            </button>
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => setFilterType('OVERDUE')}
              style={{
                fontSize: 12,
                background: filterType === 'OVERDUE' ? 'var(--rust)' : 'var(--paper-sunken)',
                color: filterType === 'OVERDUE' ? '#fff' : 'var(--ink-soft)',
                border: '1px solid var(--line)',
              }}
            >
              🔴 Overdue ({overdue})
            </button>
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => setFilterType('FAILED')}
              style={{
                fontSize: 12,
                background: filterType === 'FAILED' ? '#B91C1C' : 'var(--paper-sunken)',
                color: filterType === 'FAILED' ? '#fff' : 'var(--ink-soft)',
                border: '1px solid var(--line)',
              }}
            >
              ⚠️ Failed The Exam ({failed})
            </button>
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => setFilterType('INACTIVE')}
              style={{
                fontSize: 12,
                background: filterType === 'INACTIVE' ? 'var(--amber)' : 'var(--paper-sunken)',
                color: filterType === 'INACTIVE' ? '#fff' : 'var(--ink-soft)',
                border: '1px solid var(--line)',
              }}
            >
              🟡 Inactive &gt;{INACTIVITY_THRESHOLD_DAYS} Days ({needsAttention.length - overdue - failed})
            </button>
          </div>
        </div>

        {filteredAttentionList.length === 0 ? (
          <div className="empty-state" style={{ padding: '32px 20px', textAlign: 'center' }}>
            <i className="ti ti-square-check" style={{ fontSize: 36, color: 'var(--sage)', marginBottom: 8, display: 'block' }} />
            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--ink)' }}>No employee in this category!</div>
            <p style={{ color: 'var(--ink-soft)', fontSize: 13, margin: '4px 0 0 0' }}>Every team member is keeping a steady learning pace.</p>
          </div>
        ) : (
          filteredAttentionList.map((m, i) => (
            <div
              key={m.employeeId}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 14,
                padding: '16px 20px',
                borderBottom: i < filteredAttentionList.length - 1 ? '1px solid var(--line)' : 'none',
                background: m.status === 'FAILED' ? 'var(--rust-soft)' : m.status === 'OVERDUE' ? 'var(--amber-soft)' : 'var(--paper-raised)',
              }}
            >
              <div style={{ flex: 1, minWidth: 280 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontWeight: 800, fontSize: 14, color: 'var(--ink)' }}>{m.name}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-faint)', background: 'var(--paper-sunken)', padding: '2px 6px', borderRadius: 4 }}>
                    {m.employeeId}
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>&middot; {m.position}</span>
                </div>

                <div style={{ fontSize: 13, color: 'var(--ink-soft)', marginBottom: 6 }}>
                  Courses: <strong>{m.course}</strong> &middot; Progress: <strong>{m.progress}%</strong> &middot; Deadline: <strong>{m.dueDate || 'Not set'}</strong>
                </div>

                {m.reason && (
                  <div
                    style={{
                      fontSize: 12,
                      color: m.status === 'FAILED' ? 'var(--rust-soft-text)' : m.status === 'OVERDUE' ? 'var(--amber-soft-text)' : 'var(--ink-soft)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      fontWeight: 600,
                    }}
                  >
                    <i className={m.status === 'FAILED' ? 'ti ti-alert-triangle' : m.status === 'OVERDUE' ? 'ti-clock-alert' : 'ti-info-circle'} />
                    {m.reason}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                {m.status === 'FAILED' ? (
                  <>
                    <Badge tone="rust" icon="ti-x">
                      Failed The Exam ({m.score}%)
                    </Badge>
                    <Button size="sm" variant="danger" icon="ti-lock-open" onClick={() => handleUnlockRetake(m)}>
                      Unlock A Retake
                    </Button>
                  </>
                ) : m.status === 'OVERDUE' ? (
                  <>
                    <Badge tone="rust" icon="ti-alert-circle">
                      Overdue (inactive {m.inactiveDays} days)
                    </Badge>
                    <Button size="sm" icon="ti-brand-zalo" variant="primary" tone="danger" onClick={() => setRemindTarget(m)}>
                      Send A Zalo / Teams Ping
                    </Button>
                  </>
                ) : (
                  <>
                    <Badge tone="amber" icon="ti-clock-pause">
                      Inactive {m.inactiveDays} Days
                    </Badge>
                    <Button size="sm" icon="ti-bell" variant="outline" onClick={() => setRemindTarget(m)}>
                      Send A Multi-Channel Reminder
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* 5. QUICK PENDING APPROVALS & SYSTEM AUTOMATED ALERT LOG (DUAL PANELS) */}
      <div className="grid grid-2" style={{ gap: 20, marginBottom: 24, alignItems: 'start' }}>
        {/* PANEL 1: PENDING APPROVAL QUEUE */}
        <div className="card card-pad" style={{ border: '1px solid var(--line)', background: 'var(--paper-raised)', borderRadius: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--ink)' }}>
                <i className="ti ti-clipboard-check" style={{ marginRight: 6, color: 'var(--rail)' }} />
                Requests Awaiting Approval ({pendingApprovals.length})
              </div>
              <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 2 }}>
                Employees' level skip requests and course registrations
              </div>
            </div>
            <Button size="sm" variant="ghost" icon="ti-arrow-right" onClick={() => navigate('/manager/approvals')}>
              View All
            </Button>
          </div>

          {pendingApprovals.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 12px', background: 'var(--paper-sunken)', borderRadius: 8, color: 'var(--ink-soft)', fontSize: 13 }}>
              <i className="ti ti-circle-check" style={{ fontSize: 32, color: 'var(--sage)', marginBottom: 6, display: 'block' }} />
              No request is awaiting approval!
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {pendingApprovals.slice(0, 3).map((req) => (
                <div
                  key={req.id}
                  style={{
                    background: 'var(--paper-sunken)',
                    border: '1px solid var(--line)',
                    borderRadius: 8,
                    padding: '12px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: 10,
                  }}
                >
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--ink)' }}>
                      {req.learnerName || req.userName} ({req.employeeId || 'MMVN'})
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 2 }}>
                      Courses: <strong>{req.courseTitle || req.courseName}</strong> &middot; Job level: Level {req.currentLevel} &rarr; Level {req.targetLevel}
                    </div>
                  </div>
                  <Button size="sm" variant="primary" icon="ti-check" onClick={() => navigate('/manager/approvals')}>
                    Handle Requests
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* PANEL 2: SYSTEM AUTOMATED ALERT LOG */}
        <div className="card card-pad" style={{ border: '1px solid var(--line)', background: 'var(--paper-raised)', borderRadius: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--ink)' }}>
                <i className="ti ti-bell-ringing" style={{ marginRight: 6, color: 'var(--rust)' }} />
                Automatic System Alert Log
              </div>
              <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 2 }}>
                Real-time record of progress &amp; examination breaches
              </div>
            </div>
            <Badge tone="rust">Real Time</Badge>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {notifications.managerAlerts.slice(0, 3).map((a) => (
              <div
                key={a.id}
                style={{
                  display: 'flex',
                  gap: 12,
                  padding: '10px 12px',
                  background: 'var(--paper-sunken)',
                  border: '1px solid var(--line)',
                  borderRadius: 8,
                  alignItems: 'center',
                }}
              >
                <div
                  className="stat-icon-badge"
                  style={{
                    background: 'var(--rust-soft)',
                    color: 'var(--rust-soft-text)',
                    width: 36,
                    height: 36,
                    fontSize: 16,
                    borderRadius: 8,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <i className="ti ti-alert-triangle" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>{a.employee}</div>
                  <div style={{ fontSize: 12, color: 'var(--ink-soft)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {a.message}
                  </div>
                </div>
                <div style={{ fontSize: 11, color: 'var(--ink-faint)', whiteSpace: 'nowrap' }}>{a.time}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* MULTI-CHANNEL REMINDER MODAL */}
      <Modal
        isOpen={Boolean(remindTarget)}
        onClose={() => {
          setRemindTarget(null);
          setIsBatchRemind(false);
        }}
        title={isBatchRemind ? 'Send A Nudge To The Whole Team' : 'Send A Multi-Channel Training Reminder'}
        subtitle={remindTarget ? `Recipient: ${remindTarget.name} ${remindTarget.position ? `(${remindTarget.position})` : ''}` : ''}
        size="md"
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <Button
              variant="ghost"
              onClick={() => {
                setRemindTarget(null);
                setIsBatchRemind(false);
              }}
            >
              Cancel
            </Button>
            <Button variant="primary" icon="ti-send" onClick={handleSendReminder}>
              {remindSent ? 'Notifications Dispatched Successfully!' : 'Send The Reminder Now'}
            </Button>
          </div>
        }
      >
        {remindTarget && (
          <div>
            <div style={{ background: 'var(--paper-sunken)', padding: '12px 16px', borderRadius: 8, marginBottom: 16, border: '1px solid var(--line)' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>Sample message text:</div>
              <div style={{ fontSize: 13, color: 'var(--ink-soft)', marginTop: 4, fontStyle: 'italic' }}>
                "Reminder from your manager: please complete the mandatory course <strong>{remindTarget.course}</strong> before the deadline to stay compliant with MMVN regulations."
              </div>
            </div>

            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, color: 'var(--ink)' }}>Automatic dispatch channels:</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13 }}>
                <input type="checkbox" defaultChecked />
                <span><strong>Zalo ZNS / SMS</strong> (Optimized for counter &amp; kitchen staff)</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13 }}>
                <input type="checkbox" defaultChecked />
                <span><strong>Microsoft Teams / Company Email</strong> (The notification includes a direct link)</span>
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

function StatTile({ label, value, subtext, tone, icon, onClick }) {
  const color = tone ? `var(--${tone})` : 'var(--ink)';
  return (
    <div
      className="stat card-interactive"
      onClick={onClick}
      style={{
        cursor: onClick ? 'pointer' : 'default',
        background: 'var(--paper-raised)',
        border: '1px solid var(--line)',
        borderRadius: 10,
        padding: 16,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 6 }}>
        <div className="stat-label" style={{ fontSize: 13, fontWeight: 700 }}>
          {label}
        </div>
        {icon && (
          <div
            className="stat-icon-badge"
            style={{
              background: `var(--${tone || 'rail'}-soft)`,
              color: `var(--${tone || 'rail'}-soft-text)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 18,
              width: 36,
              height: 36,
              borderRadius: 8,
            }}
          >
            <i className={`ti ${icon}`} />
          </div>
        )}
      </div>
      <div className="stat-value" style={{ color, fontSize: 22, fontWeight: 800 }}>
        {value}
      </div>
      {subtext && <div style={{ fontSize: 11, color: 'var(--ink-soft)', marginTop: 4 }}>{subtext}</div>}
    </div>
  );
}


