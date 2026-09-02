import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  orgReport,
  divisionComplianceLeague,
  liveSystemActivity,
  courses,
} from '../../data/mockData';
import { StatCard, Badge, BarChart, StatusStackedBar, LineChart, DonutChart, Button } from '../../features/common/ui';
import { useCourseStore } from '../../store/CourseStore';

const STATUS_TONE = {
  PUBLISHED: 'sage',
  DRAFT: 'rail',
  ARCHIVED: 'slate',
};

const LEAGUE_STATUS_META = {
  AUDIT_READY: { label: 'Audit Ready', tone: 'sage', icon: 'ti-shield-check' },
  NEEDS_ATTENTION: { label: 'Needs Attention', tone: 'amber', icon: 'ti-alert-circle' },
  HIGH_RISK: { label: 'High Risk', tone: 'rust', icon: 'ti-alert-triangle' },
};

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { courses: storeCourses } = useCourseStore();
  const [leagueFilter, setLeagueFilter] = useState('ALL');

  const mandatoryCount = storeCourses.filter((c) => c.courseType === 'MANDATORY').length;
  const optionalCount = storeCourses.filter((c) => c.courseType === 'OPTIONAL').length;

  const filteredLeague = divisionComplianceLeague.filter((d) => {
    if (leagueFilter === 'ALL') return true;
    return d.status === leagueFilter;
  });

  return (
    <>
      {/* Executive Command Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <h1>Executive L&amp;D Command &amp; Compliance Hub</h1>
            <Badge tone="ai" icon="ti-crown">HRD Level 1 Enterprise Authority</Badge>
          </div>
          <p>
            Real-time compliance monitoring, course lifecycle governance, and AI predictive insights across <strong>2,145 associates</strong> in <strong>16 Divisions &middot; 56 Departments</strong>.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Button variant="outline" icon="ti-settings" onClick={() => navigate('/admin/config')}>
            HRIS &amp; Governance
          </Button>
          <Button variant="outline" icon="ti-chart-histogram" onClick={() => navigate('/admin/reports')}>
            Strategic ROI &amp; Audit
          </Button>
          <Button variant="primary" icon="ti-plus" onClick={() => navigate('/admin/courses/new')}>
            Create New Course
          </Button>
        </div>
      </div>

      {/* 6 Executive KPI Stat Cards */}
      <div className="grid grid-3" style={{ marginBottom: 16 }}>
        <StatCard
          label="Total Enterprise Headcount"
          value={`${orgReport.totalEmployees.toLocaleString()} Associates`}
          icon="ti-users"
          sublabel="186 Managers · 1,959 Frontline/Staff"
        />
        <StatCard
          label="Overall Compliance Rate"
          value={`${orgReport.overallCompletionRate}%`}
          tone="sage"
          icon="ti-shield-check"
          sublabel="Target benchmark: ≥80.0%"
        />
        <StatCard
          label="Certified Competencies Issued"
          value={`${orgReport.totalCompleted.toLocaleString()} Credentials`}
          tone="rail"
          icon="ti-certificate"
          sublabel="Verifiable digital QR certificates"
        />
      </div>

      <div className="grid grid-3" style={{ marginBottom: 24 }}>
        <StatCard
          label="Active Catalog Programs"
          value={`${orgReport.totalActiveCourses} Courses`}
          icon="ti-stack-2"
          sublabel={`${mandatoryCount} Mandatory · ${optionalCount} Elective`}
        />
        <StatCard
          label="Overdue Compliance Enrollments"
          value={`${orgReport.totalOverdue} Associates`}
          tone="rust"
          icon="ti-alert-triangle"
          sublabel="Down -14% vs last month"
        />
        <StatCard
          label="Average Assessment Score"
          value={`${orgReport.avgPassingScore}%`}
          tone="amber"
          icon="ti-award"
          sublabel={`${orgReport.firstTimePassRate}% First-attempt pass rate`}
        />
      </div>

      {/* 16 MMVN Divisions Compliance League Table */}
      <div className="card card-pad" style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--ink)' }}>
              MMVN 16 Divisions Compliance League Table &amp; Audit Radar
            </div>
            <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
              Real-time training completion across all 16 business divisions at MM Mega Market Vietnam.
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {[
              { id: 'ALL', label: 'All 16 Divisions' },
              { id: 'AUDIT_READY', label: 'Audit Ready' },
              { id: 'NEEDS_ATTENTION', label: 'Needs Attention' },
              { id: 'HIGH_RISK', label: 'High Risk' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setLeagueFilter(f.id)}
                className="btn btn-sm"
                style={{
                  background: leagueFilter === f.id ? 'var(--rail)' : 'var(--paper-raised)',
                  color: leagueFilter === f.id ? '#fff' : 'var(--ink)',
                  borderColor: leagueFilter === f.id ? 'var(--rail)' : 'var(--line-strong)',
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: 60 }}>Rank</th>
                <th style={{ width: 140 }}>Division</th>
                <th>Division Name &amp; Head</th>
                <th style={{ width: 100 }}>Headcount</th>
                <th style={{ minWidth: 160 }}>Completion Progress</th>
                <th style={{ width: 90 }}>Overdue</th>
                <th style={{ width: 100 }}>Avg Score</th>
                <th style={{ width: 140 }}>Compliance Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredLeague.map((div) => {
                const meta = LEAGUE_STATUS_META[div.status] || LEAGUE_STATUS_META.AUDIT_READY;
                return (
                  <tr key={div.code}>
                    <td style={{ fontWeight: 700, color: div.rank <= 3 ? 'var(--amber)' : 'var(--ink-soft)' }}>
                      #{div.rank}
                    </td>
                    <td>
                      <strong style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}>{div.code}</strong>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{div.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--ink-faint)' }}>Head: {div.director}</div>
                    </td>
                    <td>{div.headcount}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ flex: 1, height: 7, background: 'var(--paper-sunken)', borderRadius: 4, overflow: 'hidden' }}>
                          <div
                            style={{
                              width: `${div.completionRate}%`,
                              height: '100%',
                              background: div.completionRate >= 85 ? 'var(--sage)' : div.completionRate >= 70 ? 'var(--rail)' : 'var(--rust)',
                              borderRadius: 4,
                            }}
                          />
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 700, minWidth: 42 }}>{div.completionRate}%</span>
                      </div>
                    </td>
                    <td style={{ color: div.overdueCount > 0 ? 'var(--rust)' : 'var(--sage)', fontWeight: div.overdueCount > 0 ? 700 : 500 }}>
                      {div.overdueCount}
                    </td>
                    <td>
                      <strong>{div.avgScore}%</strong>
                    </td>
                    <td>
                      <Badge tone={meta.tone} icon={meta.icon}>
                        {meta.label}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Charts: Status Stacked Bar & Trajectory */}
      <div className="section-label">Organization-Wide Enrollment Status Breakdown</div>
      <div className="card card-pad" style={{ marginBottom: 28 }}>
        <StatusStackedBar
          segments={[
            { status: 'COMPLETED', value: orgReport.totalCompleted },
            { status: 'IN_PROGRESS', value: orgReport.totalInProgress },
            { status: 'NOT_STARTED', value: orgReport.totalNotStarted },
            { status: 'OVERDUE', value: orgReport.totalOverdue },
          ]}
        />
      </div>

      <div className="grid grid-2" style={{ marginBottom: 28, alignItems: 'start' }}>
        <div>
          <div className="section-label">Monthly Completion Trajectory</div>
          <div className="card card-pad">
            <LineChart data={orgReport.monthlyCompletions.map((m) => ({ label: m.month, value: m.value }))} />
          </div>
        </div>
        <div>
          <div className="section-label">Course Distribution by Category</div>
          <div className="card card-pad">
            <DonutChart
              data={[
                { label: 'Mandatory Compliance', value: mandatoryCount, tone: 'amber' },
                { label: 'Elective Catalog', value: optionalCount, tone: 'slate' },
              ]}
            />
          </div>
        </div>
      </div>

      {/* Detailed Course Performance with Friction Analysis */}
      <div className="section-label">Course Program Performance &amp; Friction Diagnostics</div>
      <div className="card" style={{ marginBottom: 28, overflowX: 'auto' }}>
        <table className="table">
          <thead>
            <tr>
              <th>Course Program</th>
              <th style={{ width: 100 }}>Assigned</th>
              <th style={{ width: 100 }}>Completed</th>
              <th style={{ width: 90 }}>Overdue</th>
              <th style={{ width: 130 }}>Completion Rate</th>
              <th style={{ width: 100 }}>Avg Score</th>
              <th>AI Diagnostic &amp; Content Friction Note</th>
            </tr>
          </thead>
          <tbody>
            {orgReport.coursePerformance.map((cp) => (
              <tr key={cp.code}>
                <td>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>{cp.course}</div>
                  <div style={{ fontSize: 11, color: 'var(--ink-faint)', fontFamily: 'var(--font-mono)' }}>{cp.code}</div>
                </td>
                <td>{cp.assigned.toLocaleString()}</td>
                <td style={{ color: 'var(--sage)', fontWeight: 700 }}>{cp.completed.toLocaleString()}</td>
                <td style={{ color: cp.overdue > 0 ? 'var(--rust)' : 'var(--ink-soft)', fontWeight: cp.overdue > 0 ? 700 : 500 }}>
                  {cp.overdue}
                </td>
                <td>
                  <strong style={{ fontSize: 13 }}>{cp.completionRate}%</strong>
                </td>
                <td>
                  <strong>{cp.avgScore != null ? `${cp.avgScore}%` : '—'}</strong>
                </td>
                <td style={{ fontSize: 12, color: 'var(--ink-soft)', fontStyle: 'italic' }}>
                  <i className="ti ti-bulb" style={{ color: 'var(--amber)', marginRight: 4 }} />
                  {cp.frictionNote}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Real-time Live Enterprise System Audit Stream */}
      <div className="section-label">Live Enterprise System Activity &amp; Audit Feed</div>
      <div className="card card-pad" style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {liveSystemActivity.map((act) => (
            <div
              key={act.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '10px 14px',
                borderRadius: 8,
                background: act.alert ? 'var(--rust-soft)' : 'var(--paper-sunken)',
                border: act.alert ? '1px solid #FECACA' : '1px solid var(--line)',
                flexWrap: 'wrap',
                gap: 10,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 8,
                    background: act.type === 'SAP_SYNC' ? '#EEF2FF' : act.alert ? 'var(--rust-soft)' : 'var(--sage-soft)',
                    color: act.type === 'SAP_SYNC' ? '#4F46E5' : act.alert ? '#DC2626' : '#059669',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 16,
                  }}
                >
                  <i className={act.type === 'SAP_SYNC' ? 'ti ti-cloud-computing' : act.alert ? 'ti-alert-triangle' : act.type === 'QR_CHECKIN' ? 'ti-qrcode' : 'ti-certificate'} />
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: act.alert ? 'var(--rust-soft-text)' : 'var(--ink)' }}>
                    {act.user ? `${act.user} (${act.code} · ${act.role})` : act.source}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 2 }}>
                    {act.title || act.details}
                  </div>
                </div>
              </div>
              <div style={{ fontSize: 12, color: 'var(--ink-faint)', fontFamily: 'var(--font-mono)' }}>
                {act.time}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
