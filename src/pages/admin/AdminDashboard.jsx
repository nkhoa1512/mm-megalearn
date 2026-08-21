import React from 'react';
import { orgReport } from '../../data/mockData';
import { StatCard, Badge, BarChart, StatusStackedBar, LineChart, DonutChart } from '../../components/ui';
import { useCourseStore } from '../../state/CourseStore';

const STATUS_TONE = { PUBLISHED: 'sage', DRAFT: 'rail', ARCHIVED: 'slate' };

// FR-DASH-ADM-001/002: organization-wide counts plus per-course performance,
// shown as a stacked bar (status mix), a line (trend), a donut (headcount split)
// and a bar chart (per-course ranking) so Admin has more than one lens on it.
export default function AdminDashboard() {
  const { courses } = useCourseStore();
  const mandatoryCount = courses.filter((c) => c.courseType === 'MANDATORY').length;
  const optionalCount = courses.filter((c) => c.courseType === 'OPTIONAL').length;
  return (
    <>
      <div className="page-header">
        <h1>Admin overview</h1>
        <p>Organization-wide status for the learning and development program.</p>
      </div>

      <div className="grid grid-4" style={{ marginBottom: 8 }}>
        <StatCard label="Total employees" value={orgReport.totalEmployees} />
        <StatCard label="Total managers" value={orgReport.totalManagers} />
        <StatCard label="Total User Learn" value={orgReport.totalUserLearn} />
        <StatCard label="Active courses" value={orgReport.totalActiveCourses} tone="rail" />
      </div>
      <div className="grid grid-4" style={{ marginBottom: 8 }}>
        <StatCard label="Mandatory courses" value={orgReport.totalMandatoryCourses} tone="amber" />
        <StatCard label="Optional courses" value={orgReport.totalOptionalCourses} />
        <StatCard label="Completed" value={orgReport.totalCompleted} tone="sage" />
        <StatCard label="Overdue" value={orgReport.totalOverdue} tone="rust" />
      </div>

      <div className="section-label">Enrollment status, org-wide</div>
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
          <div className="section-label">Completions trend, last 6 months</div>
          <div className="card card-pad">
            <LineChart data={orgReport.monthlyCompletions.map((m) => ({ label: m.month, value: m.value }))} />
          </div>
        </div>
        <div>
          <div className="section-label">Courses by type</div>
          <div className="card card-pad">
            <DonutChart
              data={[
                { label: 'Mandatory', value: mandatoryCount, tone: 'amber' },
                { label: 'Optional', value: optionalCount, tone: 'slate' },
              ]}
            />
          </div>
        </div>
      </div>

      <div className="section-label">Completion rate by course</div>
      <div className="card card-pad" style={{ marginBottom: 28 }}>
        <BarChart
          valueSuffix="%"
          data={orgReport.coursePerformance.map((cp) => ({
            label: cp.course, value: cp.completionRate,
            detail: `${cp.course}: ${cp.completed} of ${cp.assigned} completed (${cp.completionRate}%)`,
          }))}
        />
      </div>

      <div className="section-label">Course performance</div>
      <div className="card" style={{ marginBottom: 28 }}>
        <table className="table">
          <thead>
            <tr>
              <th>Course</th>
              <th>Assigned</th>
              <th>Completed</th>
              <th>Overdue</th>
              <th>Completion rate</th>
              <th>Avg. score</th>
            </tr>
          </thead>
          <tbody>
            {orgReport.coursePerformance.map((cp) => (
              <tr key={cp.course}>
                <td style={{ fontWeight: 600 }}>{cp.course}</td>
                <td>{cp.assigned}</td>
                <td>{cp.completed}</td>
                <td>{cp.overdue}</td>
                <td>{cp.completionRate}%</td>
                <td>{cp.avgScore != null ? `${cp.avgScore}%` : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="section-label">Courses</div>
      <div className="card">
        {courses.map((c, i) => (
          <div
            key={c.id}
            style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '14px 20px', borderBottom: i < courses.length - 1 ? '1px solid var(--line)' : 'none',
            }}
          >
            <div>
              <div style={{ fontWeight: 600, fontSize: 13.5 }}>{c.title}</div>
              <div style={{ fontSize: 11.5, color: 'var(--ink-faint)' }}>{c.code} &middot; {c.modules.length} modules &middot; {c.version}</div>
            </div>
            <Badge tone={STATUS_TONE[c.status]}>{c.status.charAt(0) + c.status.slice(1).toLowerCase()}</Badge>
          </div>
        ))}
      </div>
    </>
  );
}
