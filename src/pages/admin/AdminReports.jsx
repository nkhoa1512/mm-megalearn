import React from 'react';
import { orgReport } from '../../data/mockData';
import { StatCard, BarChart } from '../../components/ui';

// FR-DASH-ADM-002/003/004: course performance, employee performance (filterable by
// BU/Division/Department/Role/Employee/Course/Status/Date), manager performance.
export default function AdminReports() {
  const overallCompletion = Math.round(
    (orgReport.totalCompleted / (orgReport.totalCompleted + orgReport.totalInProgress + orgReport.totalNotStarted + orgReport.totalOverdue)) * 100
  );

  return (
    <>
      <div className="page-header">
        <h1>Analytics</h1>
        <p>Organization-wide learning performance across Business Units, Divisions and Departments.</p>
      </div>

      <div className="grid grid-4" style={{ marginBottom: 28 }}>
        <StatCard label="Total employees" value={orgReport.totalEmployees} />
        <StatCard label="Completion rate" value={`${overallCompletion}%`} tone="sage" />
        <StatCard label="In progress" value={orgReport.totalInProgress} tone="rail" />
        <StatCard label="Overdue" value={orgReport.totalOverdue} tone="rust" />
      </div>

      <div className="section-label">Manager performance</div>
      <div className="card" style={{ marginBottom: 28 }}>
        <table className="table">
          <thead>
            <tr>
              <th>Manager</th>
              <th>Business Unit / Division / Department</th>
              <th>Assigned</th>
              <th>Completed</th>
              <th>Overdue</th>
              <th>Avg. score</th>
              <th>Completion rate</th>
            </tr>
          </thead>
          <tbody>
            {orgReport.managerPerformance.map((mp) => (
              <tr key={mp.manager}>
                <td style={{ fontWeight: 600 }}>{mp.manager}</td>
                <td style={{ color: 'var(--ink-soft)', fontSize: 12.5 }}>{mp.businessUnit} / {mp.division} / {mp.department}</td>
                <td>{mp.assigned}</td>
                <td>{mp.completed}</td>
                <td>{mp.overdue}</td>
                <td>{mp.avgScore}%</td>
                <td>{mp.completionRate}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="section-label">Manager completion rate</div>
      <div className="card card-pad" style={{ marginBottom: 28 }}>
        <BarChart
          valueSuffix="%"
          data={orgReport.managerPerformance.map((mp) => ({
            label: mp.manager, value: mp.completionRate,
            detail: `${mp.manager}: ${mp.completed} of ${mp.assigned} completed (${mp.completionRate}%)`,
          }))}
        />
      </div>

      <div className="section-label">Department completion rate</div>
      <div className="card card-pad">
        <BarChart
          valueSuffix="%"
          data={orgReport.departmentPerformance.map((d) => ({ label: d.dept, value: d.completion }))}
        />
      </div>
    </>
  );
}
