import React from 'react';
import { teamMembers } from '../../data/mockData';
import { Badge, BarChart, CourseTypeBadge } from '../../components/ui';

function groupByCourse(members) {
  const map = new Map();
  for (const m of members) {
    if (!map.has(m.course)) map.set(m.course, { course: m.course, courseType: m.courseType, members: [] });
    map.get(m.course).members.push(m);
  }
  return [...map.values()].map((g) => {
    const assigned = g.members.length;
    const completed = g.members.filter((m) => m.status === 'COMPLETED').length;
    const inProgress = g.members.filter((m) => m.status === 'IN_PROGRESS').length;
    const notStarted = g.members.filter((m) => m.status === 'NOT_STARTED').length;
    const overdue = g.members.filter((m) => m.status === 'OVERDUE').length;
    const failed = g.members.filter((m) => m.status === 'FAILED').length;
    const scored = g.members.filter((m) => m.score != null);
    const avgScore = scored.length ? Math.round(scored.reduce((s, m) => s + m.score, 0) / scored.length) : null;
    return { ...g, assigned, completed, inProgress, notStarted, overdue, failed, avgScore, completionRate: Math.round((completed / assigned) * 100) };
  });
}

// The Manager's employee-centric view lives at /manager/team; this is the
// course-centric complement so a Division/Department manager can see, per
// course, how the team within their scope is doing on it (FR-DASH-MGR-002).
export default function ManagerCourses() {
  const groups = groupByCourse(teamMembers);

  return (
    <>
      <div className="page-header">
        <h1>Team courses</h1>
        <p>Every course your team is taking, and how your scope is doing on each one.</p>
      </div>

      <div className="section-label">Completion rate by course</div>
      <div className="card card-pad" style={{ marginBottom: 28 }}>
        <BarChart
          valueSuffix="%"
          data={groups.map((g) => ({ label: g.course, value: g.completionRate, detail: `${g.course}: ${g.completed} of ${g.assigned} completed` }))}
        />
      </div>

      <div className="section-label">Course breakdown</div>
      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>Course</th>
              <th>Type</th>
              <th>Assigned</th>
              <th>Completed</th>
              <th>In progress</th>
              <th>Not started</th>
              <th>Overdue</th>
              <th>Failed</th>
              <th>Avg. score</th>
            </tr>
          </thead>
          <tbody>
            {groups.map((g) => (
              <tr key={g.course}>
                <td style={{ fontWeight: 600 }}>{g.course}</td>
                <td><CourseTypeBadge courseType={g.courseType} /></td>
                <td>{g.assigned}</td>
                <td>{g.completed}</td>
                <td>{g.inProgress}</td>
                <td>{g.notStarted}</td>
                <td>{g.overdue > 0 ? <Badge tone="rust">{g.overdue}</Badge> : g.overdue}</td>
                <td>{g.failed > 0 ? <Badge tone="rust">{g.failed}</Badge> : g.failed}</td>
                <td>{g.avgScore != null ? `${g.avgScore}%` : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
