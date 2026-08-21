import React from 'react';
import { useNavigate } from 'react-router-dom';
import { currentUser, myLearningCourses } from '../../data/mockData';
import { Badge, ProgressBar, Button, CourseTypeBadge } from '../../components/ui';
import { useCourseStore } from '../../state/CourseStore';

const statusMap = {
  IN_PROGRESS: { tone: 'amber', label: 'In progress' },
  NOT_STARTED: { tone: 'slate', label: 'Not started' },
  COMPLETED: { tone: 'sage', label: 'Completed' },
  FAILED: { tone: 'rust', label: 'Failed' },
  OVERDUE: { tone: 'rust', label: 'Overdue' },
};

export default function LearnerCourses({ user = currentUser, basePath = '/learner/courses' }) {
  const navigate = useNavigate();
  const { courses: allCourses } = useCourseStore();
  const courses = myLearningCourses(allCourses, user);

  return (
    <>
      <div className="page-header">
        <h1>My courses</h1>
        <p>Optional courses from the catalog, plus Mandatory courses assigned to you by Admin.</p>
      </div>

      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>Course</th>
              <th>Type</th>
              <th>Progress</th>
              <th>Status</th>
              <th>Due date</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {courses.map((c) => {
              const s = statusMap[c.enrollment.status];
              return (
                <tr key={c.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{c.title}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--ink-faint)' }}>{c.code} &middot; {c.category}</div>
                  </td>
                  <td><CourseTypeBadge courseType={c.courseType} /></td>
                  <td style={{ minWidth: 160 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ flex: 1 }}><ProgressBar value={c.enrollment.progressPercent} tone={c.enrollment.status === 'COMPLETED' ? 'sage' : 'rail'} /></div>
                      <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>{c.enrollment.progressPercent}%</span>
                    </div>
                  </td>
                  <td><Badge tone={s.tone}>{s.label}</Badge></td>
                  <td style={{ color: 'var(--ink-soft)' }}>{formatDate(c.enrollment.dueDate)}</td>
                  <td>
                    <Button size="sm" onClick={() => navigate(`${basePath}/${c.id}`)}>Open</Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
