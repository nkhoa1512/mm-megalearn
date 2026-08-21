import React from 'react';
import { useNavigate } from 'react-router-dom';
import { courseHasParticipants } from '../../data/mockData';
import { Badge, Button, CourseTypeBadge } from '../../components/ui';
import { useCourseStore } from '../../state/CourseStore';

const STATUS_TONE = { PUBLISHED: 'sage', DRAFT: 'rail', ARCHIVED: 'slate' };

export default function AdminCourses() {
  const navigate = useNavigate();
  const { courses, updateCourse, removeCourse } = useCourseStore();

  function publish(course) {
    updateCourse(course.id, { ...course, status: 'PUBLISHED', publishedAt: new Date().toISOString().slice(0, 10) });
  }

  function remove(course) {
    if (window.confirm(`Delete "${course.title}"? This cannot be undone.`)) {
      removeCourse(course.id);
    }
  }

  return (
    <>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1>Manage courses</h1>
          <p>Define what employees must learn, in modules and lessons, and who Mandatory courses target.</p>
        </div>
        <Button variant="primary" icon="ti-plus" onClick={() => navigate('/admin/courses/new')}>New course</Button>
      </div>

      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>Course</th>
              <th>Type</th>
              <th>Assigned to</th>
              <th>Modules</th>
              <th>Version</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {courses.map((c) => {
              const hasParticipants = courseHasParticipants(c);
              return (
                <tr key={c.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{c.title}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--ink-faint)' }}>{c.code} &middot; {c.category}</div>
                  </td>
                  <td><CourseTypeBadge courseType={c.courseType} /></td>
                  <td style={{ color: 'var(--ink-soft)', fontSize: 12.5 }}>
                    {c.courseType === 'MANDATORY' ? c.assignment?.targetLabel : 'Course catalog'}
                  </td>
                  <td>{c.modules.length}</td>
                  <td style={{ color: 'var(--ink-soft)' }}>{c.version}</td>
                  <td><Badge tone={STATUS_TONE[c.status]}>{c.status.charAt(0) + c.status.slice(1).toLowerCase()}</Badge></td>
                  <td>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                      <Button size="sm" onClick={() => navigate(`/admin/courses/${c.id}`)}>Edit</Button>
                      {c.status === 'DRAFT' && <Button size="sm" variant="primary" onClick={() => publish(c)}>Publish</Button>}
                      <span title={hasParticipants ? 'Cannot delete: employees have already started this course.' : undefined}>
                        <Button size="sm" variant="danger" icon="ti-trash" disabled={hasParticipants} onClick={() => remove(c)}>Delete</Button>
                      </span>
                    </div>
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
