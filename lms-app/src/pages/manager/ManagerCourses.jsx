import React from 'react';
import { getTeamMembersForManager, managerUser as defaultManager } from '../../data/mockData';
import { useCourseStore } from '../../store/CourseStore';
import { canManage } from '../../data/roles';
import { Badge, BarChart, CourseTypeBadge } from '../../features/common/ui';

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

export default function ManagerCourses() {
  const { currentUser: authUser } = useCourseStore();
  const activeManager = canManage(authUser?.role, 'learner') ? authUser : defaultManager;
  const teamMembers = getTeamMembersForManager(activeManager);
  const groups = groupByCourse(teamMembers);

  return (
    <>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <h1>Team Curriculum &amp; Course Progress</h1>
            <Badge tone="amber">{activeManager.divisionCode} &middot; {activeManager.departmentCode}</Badge>
          </div>
          <p>
            Overview of curriculum modules assigned to direct reports under {activeManager.fullName} ({activeManager.position}).
          </p>
        </div>
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
