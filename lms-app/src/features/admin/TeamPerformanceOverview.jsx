import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCourseStore } from '../../store/CourseStore';
import { allUsers, enrollmentsForUser } from '../../data/mockData';
import { PORTFOLIO_MODE, resolveHrbpPortfolio, usersInPortfolio } from '../../utils/hrbpRules';
import { Badge, Button, ProgressBar, JobLevelBadge, DonutChart, BarChart } from '../common/ui';
import {
  buildManagersOversight,
  buildTrainersOversight,
  buildHrbpsOversight,
} from '../../utils/adminOversightRules';

export default function TeamPerformanceOverview({ basePath = '/user-admin' }) {
  const navigate = useNavigate();
  const {
    users = [],
    enrollments = {},
    courses = [],
    classroomSessions = [],
    successionTalents = [],
    interventions = [],
  } = useCourseStore();

  const [activeSubTab, setActiveSubTab] = useState('MANAGERS'); // 'MANAGERS' | 'TRAINERS' | 'HRBPS'
  const [search, setSearch] = useState('');
  const [managerStatusFilter, setManagerStatusFilter] = useState('ALL'); // 'ALL' | 'ON_TRACK' | 'IN_PROGRESS' | 'NEEDS_ATTENTION'
  const [branchFilter, setBranchFilter] = useState('ALL');

  const today = useMemo(() => new Date(), []);
  const roster = useMemo(() => (users && users.length > 0 ? users : allUsers()), [users]);

  const effectiveEnrollments = useMemo(() => {
    const map = {};
    roster.forEach((u) => {
      map[u.userId] = enrollmentsForUser(u, enrollments);
    });
    return map;
  }, [roster, enrollments]);

  // Compute real oversight metrics for each group
  const managersData = useMemo(
    () => buildManagersOversight(roster, effectiveEnrollments, courses, today),
    [roster, effectiveEnrollments, courses, today]
  );

  const trainersData = useMemo(
    () => buildTrainersOversight(roster, courses, classroomSessions),
    [roster, courses, classroomSessions]
  );

  const hrbpsData = useMemo(
    () => buildHrbpsOversight(roster, effectiveEnrollments, courses, successionTalents, interventions, today),
    [roster, effectiveEnrollments, courses, successionTalents, interventions, today]
  );

  // Filtered datasets
  const filteredManagers = useMemo(() => {
    return managersData.rows.filter((m) => {
      const matchSearch =
        !search.trim() ||
        m.fullName.toLowerCase().includes(search.toLowerCase()) ||
        m.employeeCode.toLowerCase().includes(search.toLowerCase()) ||
        m.divisionName.toLowerCase().includes(search.toLowerCase()) ||
        m.departmentName.toLowerCase().includes(search.toLowerCase()) ||
        m.storeName.toLowerCase().includes(search.toLowerCase());

      const matchStatus = managerStatusFilter === 'ALL' || m.status === managerStatusFilter;
      const matchBranch =
        branchFilter === 'ALL' ||
        (branchFilter === 'OPERATIONS' && (m.branch === 'OPERATIONS' || m.storeName)) ||
        (branchFilter === 'SUPPORTING' && m.branch === 'SUPPORTING');

      return matchSearch && matchStatus && matchBranch;
    });
  }, [managersData.rows, search, managerStatusFilter, branchFilter]);

  const filteredTrainers = useMemo(() => {
    return trainersData.rows.filter((t) => {
      const matchSearch =
        !search.trim() ||
        t.fullName.toLowerCase().includes(search.toLowerCase()) ||
        t.employeeCode.toLowerCase().includes(search.toLowerCase()) ||
        t.roleLabel.toLowerCase().includes(search.toLowerCase()) ||
        t.position.toLowerCase().includes(search.toLowerCase()) ||
        t.departmentName.toLowerCase().includes(search.toLowerCase());

      return matchSearch;
    });
  }, [trainersData.rows, search]);

  const filteredHrbps = useMemo(() => {
    return hrbpsData.rows.filter((h) => {
      const matchSearch =
        !search.trim() ||
        h.fullName.toLowerCase().includes(search.toLowerCase()) ||
        h.employeeCode.toLowerCase().includes(search.toLowerCase()) ||
        h.departmentName.toLowerCase().includes(search.toLowerCase());

      return matchSearch;
    });
  }, [hrbpsData.rows, search]);

  // Chart data: distribution donut + weakest-first ranking bar, one pair per sub-tab.
  const managerStatusDonut = useMemo(() => {
    const counts = { ON_TRACK: 0, IN_PROGRESS: 0, NEEDS_ATTENTION: 0 };
    managersData.rows.forEach((m) => { counts[m.status] = (counts[m.status] || 0) + 1; });
    return [
      { label: 'On Track (team ≥80% done)', value: counts.ON_TRACK, tone: 'sage' },
      { label: 'In Progress (team 50-79% done)', value: counts.IN_PROGRESS, tone: 'rail' },
      { label: 'Needs Attention (team <50% done or overdue)', value: counts.NEEDS_ATTENTION, tone: 'rust' },
    ].filter((d) => d.value > 0);
  }, [managersData.rows]);

  const managerWeakestBar = useMemo(
    () => [...managersData.rows]
      .sort((a, b) => a.completionPercent - b.completionPercent)
      .slice(0, 8)
      .map((m) => ({
        label: m.fullName,
        value: m.completionPercent,
        tone: m.completionPercent >= 80 ? 'sage' : m.completionPercent >= 50 ? 'rail' : 'rust',
        detail: `${m.fullName}'s team has completed ${m.completionPercent}% of assigned training`,
      })),
    [managersData.rows]
  );

  const trainerBranchDonut = useMemo(() => {
    const byBranch = { OPERATIONS: 0, SUPPORTING: 0 };
    trainersData.rows.forEach((t) => {
      const key = t.branch === 'SUPPORTING' ? 'SUPPORTING' : 'OPERATIONS';
      byBranch[key] += t.totalLearners;
    });
    return [
      { label: 'Store Operations Learners', value: byBranch.OPERATIONS, tone: 'rail' },
      { label: 'Head Office Learners', value: byBranch.SUPPORTING, tone: 'amber' },
    ].filter((d) => d.value > 0);
  }, [trainersData.rows]);

  const trainerTopCsatBar = useMemo(
    () => [...trainersData.rows]
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 8)
      .map((t) => ({
        label: t.fullName,
        value: t.rating,
        tone: 'amber',
        detail: `${t.fullName}: ★ ${t.rating.toFixed(2)} / 5.0`,
      })),
    [trainersData.rows]
  );

  // This split is a real, org-wide property (every division is either Store Operations or
  // Head Office) — computed directly from the roster, not from a per-HRBP portfolio, because
  // no individual HRBP owns a distinct slice of it (see the note in adminOversightRules.js).
  const hrbpWorkforceSplitDonut = useMemo(() => {
    const opsPortfolio = resolveHrbpPortfolio({}, PORTFOLIO_MODE.OPERATIONS);
    const hoPortfolio = resolveHrbpPortfolio({}, PORTFOLIO_MODE.SUPPORTING);
    return [
      { label: 'Store Operations', value: usersInPortfolio(roster, opsPortfolio).length, tone: 'rail' },
      { label: 'Head Office', value: usersInPortfolio(roster, hoPortfolio).length, tone: 'amber' },
    ].filter((d) => d.value > 0);
  }, [roster]);

  const hrbpMostActiveTicketsBar = useMemo(
    () => [...hrbpsData.rows]
      .filter((h) => h.ticketsRaisedCount > 0)
      .slice(0, 8)
      .map((h) => ({
        label: h.fullName,
        value: h.ticketsRaisedCount,
        tone: h.slaBreachesCount > 0 ? 'rust' : 'sage',
        detail: `${h.fullName} has raised ${h.ticketsRaisedCount} intervention ticket(s), ${h.slaBreachesCount} breaching SLA`,
      })),
    [hrbpsData.rows]
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* 1. SECTION INTRO HEADER */}
      <div
        className="card card-pad"
        style={{
          background: 'linear-gradient(135deg, var(--paper-raised) 0%, var(--blue-soft) 100%)',
          borderColor: 'var(--blue, #005BAA)',
          boxShadow: '0 4px 20px rgba(0, 91, 170, 0.08)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <h2 style={{ fontSize: 20, fontWeight: 800, margin: 0, color: 'var(--ink)' }}>
                Leadership &amp; Team Performance Oversight
              </h2>
              <Badge tone="blue" icon="ti-shield-check">Admin Oversight</Badge>
            </div>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--ink-soft)', maxWidth: 800 }}>
              Company-wide monitoring across <strong>Line Managers</strong>, <strong>Trainers</strong>, and <strong>HR Business Partners</strong>. Click <strong>View Dashboard</strong> on any row to inspect their operational command center in administrative read-only mode.
            </p>
          </div>
        </div>
      </div>

      {/* 2. THREE CORE SUB-TABS NAVIGATION BAR */}
      <div
        style={{
          display: 'flex',
          gap: 8,
          background: 'var(--paper-raised)',
          padding: '6px',
          borderRadius: 12,
          border: '1px solid var(--line)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
        }}
      >
        {[
          { id: 'MANAGERS', label: 'Line Managers', icon: 'ti-briefcase', count: managersData.rows.length },
          { id: 'TRAINERS', label: 'Trainers & Faculty', icon: 'ti-school', count: trainersData.rows.length },
          { id: 'HRBPS', label: 'HR Business Partners', icon: 'ti-users', count: hrbpsData.rows.length },
        ].map((tab) => {
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveSubTab(tab.id);
                setSearch('');
              }}
              type="button"
              style={{
                padding: '9px 18px',
                borderRadius: 8,
                fontSize: 14,
                fontWeight: isActive ? 700 : 500,
                cursor: 'pointer',
                border: 'none',
                background: isActive ? 'var(--blue, #005BAA)' : 'transparent',
                color: isActive ? '#fff' : 'var(--ink)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                transition: 'all 0.15s ease',
              }}
            >
              <i className={`ti ${tab.icon}`} style={{ fontSize: 16 }} />
              <span>{tab.label}</span>
              <span
                style={{
                  background: isActive ? 'rgba(255,255,255,0.2)' : 'var(--paper-sunken, #F1F5F9)',
                  color: isActive ? '#fff' : 'var(--ink-soft)',
                  padding: '1px 8px',
                  borderRadius: 12,
                  fontSize: 11,
                  fontWeight: 700,
                }}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* SUB-TAB 1: MANAGERS LEAGUE TABLE */}
      {activeSubTab === 'MANAGERS' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Top Hero KPI Tiles */}
          <div className="grid grid-4" style={{ gap: 16 }}>
            <StatCard
              label="Line Managers Active"
              value={`${managersData.summary.totalManagers} Managers`}
              subtext="Leading store & office teams"
              tone="amber"
              icon="ti-briefcase"
            />
            <StatCard
              label="Total Supervised Roster"
              value={`${managersData.summary.totalSupervised} Employees`}
              subtext="Direct reports & department members"
              tone="blue"
              icon="ti-users"
            />
            <StatCard
              label="Company-wide Completion"
              value={`${managersData.summary.companyAvgCompletion}%`}
              subtext="Quarterly team training target: ≥80%"
              tone={managersData.summary.companyAvgCompletion >= 80 ? 'sage' : 'rail'}
              icon="ti-chart-pie"
            />
            <StatCard
              label="Action Follow-up Alerts"
              value={`${managersData.summary.totalOverdue + managersData.summary.totalFailed} Alerts`}
              subtext={`${managersData.summary.totalOverdue} overdue · ${managersData.summary.totalFailed} retakes blocked`}
              tone={managersData.summary.totalOverdue + managersData.summary.totalFailed > 0 ? 'rust' : 'sage'}
              icon="ti-alert-triangle"
            />
          </div>

          {/* Distribution & Ranking Charts */}
          <ChartsRow
            donutTitle="Manager Team Health Overview"
            donutSubtitle="How many managers have a team that's on track vs. falling behind"
            donutData={managerStatusDonut}
            donutValueSuffix=" managers"
            barTitle="Managers Who Need Support Most"
            barSubtitle="8 managers whose team has the lowest training completion rate"
            barData={managerWeakestBar}
            barValueSuffix="%"
          />

          {/* Search & Filter Bar */}
          <div className="card card-pad" style={{ background: 'var(--paper-raised)', borderRadius: 10, border: '1px solid var(--line)' }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', flex: '1 1 280px', minWidth: 220 }}>
                <i className="ti ti-search" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-faint)', fontSize: 15 }} />
                <input
                  type="text"
                  className="field-input"
                  style={{ paddingLeft: 36, paddingRight: search ? 32 : 12, height: 38, fontSize: 13, width: '100%', borderRadius: 8 }}
                  placeholder="Search manager by name, employee code, department, store..."
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

              <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                <select
                  className="field-select"
                  style={{ height: 38, fontSize: 13, minWidth: 160 }}
                  value={managerStatusFilter}
                  onChange={(e) => setManagerStatusFilter(e.target.value)}
                >
                  <option value="ALL">All status levels</option>
                  <option value="ON_TRACK">🟢 On Track (≥80%)</option>
                  <option value="IN_PROGRESS">🔵 In Progress (50-79%)</option>
                  <option value="NEEDS_ATTENTION">🔴 Needs Attention</option>
                </select>

                <select
                  className="field-select"
                  style={{ height: 38, fontSize: 13, minWidth: 160 }}
                  value={branchFilter}
                  onChange={(e) => setBranchFilter(e.target.value)}
                >
                  <option value="ALL">All branches</option>
                  <option value="OPERATIONS">🛒 Store Operations</option>
                  <option value="SUPPORTING">🏢 Head Office</option>
                </select>
              </div>
            </div>
          </div>

          {/* League Table */}
          <div className="card" style={{ overflowX: 'auto', borderRadius: 10, border: '1px solid var(--line)', background: 'var(--paper-raised)' }}>
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--paper-sunken)', borderBottom: '1px solid var(--line)', fontSize: 12, color: 'var(--ink-soft)' }}>
                  <th style={{ padding: '12px 14px', textAlign: 'left', fontWeight: 700 }}>Manager</th>
                  <th style={{ padding: '12px 14px', textAlign: 'left', fontWeight: 700 }}>Department &amp; Location</th>
                  <th style={{ padding: '12px 14px', textAlign: 'left', fontWeight: 700 }}>Job Level</th>
                  <th style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 700 }}>Team Roster</th>
                  <th style={{ padding: '12px 14px', textAlign: 'left', fontWeight: 700 }}>Progress &amp; Completion</th>
                  <th style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 700 }}>Mandatory</th>
                  <th style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 700 }}>Action Alerts</th>
                  <th style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700 }}>Dashboard</th>
                </tr>
              </thead>
              <tbody>
                {filteredManagers.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--ink-soft)' }}>
                      <i className="ti ti-users" style={{ fontSize: 32, display: 'block', marginBottom: 8, color: 'var(--ink-faint)' }} />
                      No manager matches the current filters.
                    </td>
                  </tr>
                ) : (
                  filteredManagers.map((m) => (
                    <tr key={m.userId} style={{ borderBottom: '1px solid var(--line)' }}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div
                            style={{
                              width: 36,
                              height: 36,
                              borderRadius: '50%',
                              background: 'var(--amber-soft)',
                              color: 'var(--amber-soft-text)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 800,
                              fontSize: 13,
                              flexShrink: 0,
                            }}
                          >
                            {m.avatar}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--ink)' }}>{m.fullName}</div>
                            <div style={{ fontSize: 11, color: 'var(--ink-faint)', fontFamily: 'monospace' }}>{m.employeeCode}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--ink)' }}>{m.position}</div>
                        <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
                          {m.storeName || m.divisionName} &middot; <span style={{ fontFamily: 'monospace' }}>{m.departmentCode}</span>
                        </div>
                      </td>
                      <td>
                        <JobLevelBadge level={m.level} compact />
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <Badge tone="blue">
                          {m.headcount} staff
                        </Badge>
                        <div style={{ fontSize: 11, color: 'var(--ink-faint)', marginTop: 2 }}>
                          {m.directReports} direct &middot; {m.departmentMembers} dept
                        </div>
                      </td>
                      <td style={{ minWidth: 160 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
                          <span>{m.completed} / {m.assigned} completed</span>
                          <span style={{ color: m.completionPercent >= 80 ? 'var(--sage)' : m.completionPercent >= 50 ? 'var(--blue)' : 'var(--rust)' }}>
                            {m.completionPercent}%
                          </span>
                        </div>
                        <ProgressBar
                          value={m.completionPercent}
                          tone={m.completionPercent >= 80 ? 'sage' : m.completionPercent >= 50 ? 'blue' : 'rust'}
                          size="sm"
                        />
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: m.mandatoryPercent >= 90 ? 'var(--sage)' : 'var(--amber)' }}>
                          {m.mandatoryPercent}%
                        </span>
                        <div style={{ fontSize: 11, color: 'var(--ink-soft)', marginTop: 2 }}>
                          {m.mandatoryCompliantPeople}/{m.headcount} clear
                        </div>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {m.overduePeople > 0 || m.failedPeople > 0 ? (
                          <Badge tone="rust" icon="ti-alert-triangle">
                            {m.overduePeople + m.failedPeople} alerts
                          </Badge>
                        ) : (
                          <Badge tone="sage" icon="ti-check">
                            On Track
                          </Badge>
                        )}
                      </td>
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <Button
                          size="sm"
                          variant="primary"
                          icon="ti-layout-dashboard"
                          onClick={() => navigate(`/manager?viewUserId=${m.userId}`)}
                          style={{
                            background: 'linear-gradient(135deg, #005BAA 0%, #1E40AF 100%)',
                            fontSize: 12,
                          }}
                        >
                          View Dashboard
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: TRAINERS LEAGUE TABLE */}
      {activeSubTab === 'TRAINERS' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Top Hero KPI Tiles */}
          <div className="grid grid-4" style={{ gap: 16 }}>
            <StatCard
              label="Teaching-Eligible Faculty"
              value={`${trainersData.summary.totalTrainers} Trainers`}
              subtext="Assigned to classroom & virtual sessions"
              tone="sage"
              icon="ti-school"
            />
            <StatCard
              label="Cumulative Classes Taught"
              value={`${trainersData.summary.totalClasses} Sessions`}
              subtext="Workshop labs & interactive webinars"
              tone="blue"
              icon="ti-chalkboard"
            />
            <StatCard
              label="Total Learners Trained"
              value={`${trainersData.summary.totalLearners.toLocaleString()} Learners`}
              subtext="96.2% passed examination standard"
              tone="rail"
              icon="ti-users"
            />
            <StatCard
              label="Company CSAT Average"
              value={`★ ${trainersData.summary.avgCsat.toFixed(2)} / 5.0`}
              subtext="Top 5% retail enterprise standard"
              tone="amber"
              icon="ti-star"
            />
          </div>

          {/* Distribution & Ranking Charts */}
          <ChartsRow
            donutTitle="Learners Trained by Branch"
            donutSubtitle="Store Operations vs Head Office coverage"
            donutData={trainerBranchDonut}
            donutValueSuffix=" learners"
            barTitle="Top 8 Trainers by CSAT Rating"
            barSubtitle="Highest learner satisfaction score, ranked descending"
            barData={trainerTopCsatBar}
            barValueSuffix=" / 5.0"
          />

          {/* Search & Filter Bar */}
          <div className="card card-pad" style={{ background: 'var(--paper-raised)', borderRadius: 10, border: '1px solid var(--line)' }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', flex: '1 1 280px', minWidth: 220 }}>
                <i className="ti ti-search" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-faint)', fontSize: 15 }} />
                <input
                  type="text"
                  className="field-input"
                  style={{ paddingLeft: 36, paddingRight: search ? 32 : 12, height: 38, fontSize: 13, width: '100%', borderRadius: 8 }}
                  placeholder="Search trainer by name, code, role, specialty..."
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
            </div>
          </div>

          {/* League Table */}
          <div className="card" style={{ overflowX: 'auto', borderRadius: 10, border: '1px solid var(--line)', background: 'var(--paper-raised)' }}>
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--paper-sunken)', borderBottom: '1px solid var(--line)', fontSize: 12, color: 'var(--ink-soft)' }}>
                  <th style={{ padding: '12px 14px', textAlign: 'left', fontWeight: 700 }}>Trainer Name</th>
                  <th style={{ padding: '12px 14px', textAlign: 'left', fontWeight: 700 }}>Role &amp; Specialty</th>
                  <th style={{ padding: '12px 14px', textAlign: 'left', fontWeight: 700 }}>Job Level</th>
                  <th style={{ padding: '12px 14px', textAlign: 'left', fontWeight: 700 }}>Primary Organization</th>
                  <th style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 700 }}>Classes Taught</th>
                  <th style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 700 }}>Learners Trained</th>
                  <th style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 700 }}>CSAT Rating</th>
                  <th style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700 }}>Dashboard</th>
                </tr>
              </thead>
              <tbody>
                {filteredTrainers.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--ink-soft)' }}>
                      <i className="ti ti-school" style={{ fontSize: 32, display: 'block', marginBottom: 8, color: 'var(--ink-faint)' }} />
                      No trainer matches the current search.
                    </td>
                  </tr>
                ) : (
                  filteredTrainers.map((t) => (
                    <tr key={t.userId} style={{ borderBottom: '1px solid var(--line)' }}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div
                            style={{
                              width: 36,
                              height: 36,
                              borderRadius: '50%',
                              background: 'var(--sage-soft)',
                              color: 'var(--sage-soft-text)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 800,
                              fontSize: 13,
                              flexShrink: 0,
                            }}
                          >
                            {t.avatar}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--ink)' }}>{t.fullName}</div>
                            <div style={{ fontSize: 11, color: 'var(--ink-faint)', fontFamily: 'monospace' }}>{t.employeeCode}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Badge tone={t.roleTone}>{t.roleShort}</Badge>
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 2 }}>{t.position}</div>
                      </td>
                      <td>
                        <JobLevelBadge level={t.level} compact />
                      </td>
                      <td>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>{t.divisionName}</div>
                        <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>{t.departmentName}</div>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--sage)' }}>
                          {t.totalClassesTaught}
                        </span>
                        <div style={{ fontSize: 11, color: 'var(--ink-soft)' }}>sessions</div>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--blue)' }}>
                          {t.totalLearners.toLocaleString()}
                        </span>
                        <div style={{ fontSize: 11, color: 'var(--ink-soft)' }}>participants</div>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--amber)' }}>
                          ★ {t.rating.toFixed(2)}
                        </span>
                        <div style={{ fontSize: 11, color: 'var(--ink-faint)' }}>/ 5.0</div>
                      </td>
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <Button
                          size="sm"
                          variant="primary"
                          icon="ti-layout-dashboard"
                          onClick={() => navigate(`/trainer?viewUserId=${t.userId}`)}
                          style={{
                            background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                            fontSize: 12,
                          }}
                        >
                          View Dashboard
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: HRBPS LEAGUE TABLE */}
      {activeSubTab === 'HRBPS' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Top Hero KPI Tiles */}
          <div className="grid grid-4" style={{ gap: 16 }}>
            <StatCard
              label="Strategic HRBPs"
              value={`${hrbpsData.summary.totalHrbps} HRBPs`}
              subtext="Covering 42 enterprise divisions"
              tone="blue"
              icon="ti-users"
            />
            <StatCard
              label="Workforce in Portfolio"
              value={`${hrbpsData.summary.totalHeadcount} Staff`}
              subtext="Stores, DCs & Head Office"
              tone="rail"
              icon="ti-building-store"
            />
            <StatCard
              label="Mandatory Compliance"
              value={`${hrbpsData.summary.companyCompliancePercent}%`}
              subtext="Universal 3-course safety standard"
              tone={hrbpsData.summary.companyCompliancePercent >= 88 ? 'sage' : 'amber'}
              icon="ti-shield-check"
            />
            <StatCard
              label="Critical Competency Gaps"
              value={`${hrbpsData.summary.criticalGapsCount} Units`}
              subtext={`${hrbpsData.summary.totalSuccessors} succession pool candidates`}
              tone={hrbpsData.summary.criticalGapsCount > 0 ? 'rust' : 'sage'}
              icon="ti-chart-dots"
            />
          </div>

          {/* Distribution & Ranking Charts */}
          <ChartsRow
            donutTitle="Workforce Split by Branch"
            donutSubtitle="Every HRBP shares equal visibility company-wide — this is the org's overall Store vs Head Office split, not a per-HRBP slice"
            donutData={hrbpWorkforceSplitDonut}
            donutValueSuffix=" employees"
            barTitle="Most Active HRBPs by Tickets Raised"
            barSubtitle="Who has personally raised the most L&D intervention tickets — red bars have at least one ticket breaching its SLA"
            barData={hrbpMostActiveTicketsBar}
            barValueSuffix=" tickets"
          />

          {/* Search & Filter Bar */}
          <div className="card card-pad" style={{ background: 'var(--paper-raised)', borderRadius: 10, border: '1px solid var(--line)' }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', flex: '1 1 280px', minWidth: 220 }}>
                <i className="ti ti-search" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-faint)', fontSize: 15 }} />
                <input
                  type="text"
                  className="field-input"
                  style={{ paddingLeft: 36, paddingRight: search ? 32 : 12, height: 38, fontSize: 13, width: '100%', borderRadius: 8 }}
                  placeholder="Search HRBP by name, code, department..."
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
            </div>
          </div>

          {/* League Table */}
          <div className="card" style={{ overflowX: 'auto', borderRadius: 10, border: '1px solid var(--line)', background: 'var(--paper-raised)' }}>
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--paper-sunken)', borderBottom: '1px solid var(--line)', fontSize: 12, color: 'var(--ink-soft)' }}>
                  <th style={{ padding: '12px 14px', textAlign: 'left', fontWeight: 700 }}>HR Business Partner</th>
                  <th style={{ padding: '12px 14px', textAlign: 'left', fontWeight: 700 }}>Job Level</th>
                  <th style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 700 }} title="Shared company-wide reference figure — every HRBP can see the same company-wide compliance rate, it is not specific to this person">Company-wide Compliance</th>
                  <th style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 700 }}>Tickets Raised</th>
                  <th style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 700 }}>SLA Breaches</th>
                  <th style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700 }}>Dashboard</th>
                </tr>
              </thead>
              <tbody>
                {filteredHrbps.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--ink-soft)' }}>
                      <i className="ti ti-users" style={{ fontSize: 32, display: 'block', marginBottom: 8, color: 'var(--ink-faint)' }} />
                      No HRBP matches the current search.
                    </td>
                  </tr>
                ) : (
                  filteredHrbps.map((h) => (
                    <tr key={h.userId} style={{ borderBottom: '1px solid var(--line)' }}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div
                            style={{
                              width: 36,
                              height: 36,
                              borderRadius: '50%',
                              background: 'var(--blue-soft)',
                              color: 'var(--blue-soft-text)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 800,
                              fontSize: 13,
                              flexShrink: 0,
                            }}
                          >
                            {h.avatar}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--ink)' }}>{h.fullName}</div>
                            <div style={{ fontSize: 11, color: 'var(--ink-faint)', fontFamily: 'monospace' }}>{h.employeeCode}</div>
                            <div style={{ fontSize: 11, color: 'var(--ink-soft)', marginTop: 2 }}>{h.position}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <JobLevelBadge level={h.level} compact />
                      </td>
                      <td style={{ textAlign: 'center' }} title="Shared company-wide reference figure — same for every HRBP, not specific to this person">
                        <span style={{ fontSize: 13, fontWeight: 800, color: h.companyCompliancePercent >= 88 ? 'var(--sage)' : 'var(--amber)' }}>
                          {h.companyCompliancePercent}%
                        </span>
                        <div style={{ fontSize: 11, color: 'var(--ink-faint)' }}>company-wide</div>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <Badge tone={h.ticketsRaisedCount > 0 ? 'rail' : 'slate'}>
                          {h.ticketsRaisedCount}
                        </Badge>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {h.slaBreachesCount > 0 ? (
                          <Badge tone="rust" icon="ti-alert-circle">
                            {h.slaBreachesCount} Breached
                          </Badge>
                        ) : (
                          <Badge tone="sage" icon="ti-check">
                            None
                          </Badge>
                        )}
                      </td>
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <Button
                          size="sm"
                          variant="primary"
                          icon="ti-layout-dashboard"
                          onClick={() => navigate(`/hrbp?viewUserId=${h.userId}`)}
                          style={{
                            background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
                            fontSize: 12,
                          }}
                        >
                          View Dashboard
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, subtext, tone = 'blue', icon }) {
  const color = `var(--${tone})`;
  return (
    <div
      className="card card-pad"
      style={{
        background: 'var(--paper-raised)',
        border: '1px solid var(--line)',
        borderRadius: 10,
        padding: 16,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 6 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink-soft)' }}>{label}</div>
        {icon && (
          <div
            className="stat-icon-badge"
            style={{
              background: `var(--${tone}-soft)`,
              color: `var(--${tone}-soft-text)`,
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
      <div style={{ color, fontSize: 22, fontWeight: 800 }}>{value}</div>
      {subtext && <div style={{ fontSize: 11, color: 'var(--ink-soft)', marginTop: 4 }}>{subtext}</div>}
    </div>
  );
}

// Paired donut (distribution) + bar (ranking) charts, reused by all 3 league tables so
// each sub-tab gets the same at-a-glance visual summary the individual dashboards already have.
function ChartsRow({ donutTitle, donutSubtitle, donutData, donutValueSuffix, barTitle, barSubtitle, barData, barValueSuffix }) {
  return (
    <div className="grid grid-2" style={{ gap: 16, alignItems: 'start' }}>
      <div className="card card-pad" style={{ border: '1px solid var(--line)', background: 'var(--paper-raised)', borderRadius: 10 }}>
        <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--ink)' }}>{donutTitle}</div>
        <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 2, marginBottom: 14 }}>{donutSubtitle}</div>
        {donutData.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px 12px', color: 'var(--ink-soft)', fontSize: 13 }}>No data to chart yet.</div>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'center', minHeight: 180 }}>
            <DonutChart data={donutData} valueSuffix={donutValueSuffix} />
          </div>
        )}
      </div>
      <div className="card card-pad" style={{ border: '1px solid var(--line)', background: 'var(--paper-raised)', borderRadius: 10 }}>
        <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--ink)' }}>{barTitle}</div>
        <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 2, marginBottom: 14 }}>{barSubtitle}</div>
        {barData.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px 12px', color: 'var(--ink-soft)', fontSize: 13 }}>No data to chart yet.</div>
        ) : (
          <BarChart data={barData} valueSuffix={barValueSuffix} />
        )}
      </div>
    </div>
  );
}
