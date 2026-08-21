import React, { useState } from 'react';
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

export default function LearnerCourses({ user: propUser, basePath = '/learner/courses' }) {
  const navigate = useNavigate();
  const { courses: allCourses, currentUser: authUser } = useCourseStore();
  const user = propUser || authUser || currentUser;
  const courses = myLearningCourses(allCourses, user);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const filtered = courses.filter((c) => {
    const s = c.enrollment?.status;
    const matchStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'MANDATORY' && c.courseType === 'MANDATORY') ||
      s === statusFilter;
    const matchSearch = !search ||
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.code.toLowerCase().includes(search.toLowerCase()) ||
      c.category.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const completedCount = courses.filter((c) => c.enrollment?.status === 'COMPLETED').length;
  const inProgressCount = courses.filter((c) => c.enrollment?.status === 'IN_PROGRESS').length;
  const overdueCount = courses.filter((c) => c.enrollment?.status === 'OVERDUE').length;
  const mandatoryCount = courses.filter((c) => c.courseType === 'MANDATORY').length;

  return (
    <>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <h1>My Assigned Curriculum &amp; Electives</h1>
            <Badge tone="rail">{courses.length} Enrolled Courses</Badge>
          </div>
          <p>
            Mandatory compliance training tailored to your role and division, plus self-paced catalog electives.
          </p>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="card card-pad" style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[
            { id: 'ALL', label: 'All Courses', count: courses.length },
            { id: 'IN_PROGRESS', label: 'In Progress', count: inProgressCount },
            { id: 'COMPLETED', label: 'Completed', count: completedCount },
            { id: 'OVERDUE', label: 'Overdue', count: overdueCount },
            { id: 'MANDATORY', label: 'Mandatory', count: mandatoryCount },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setStatusFilter(f.id)}
              className="btn btn-sm"
              style={{
                background: statusFilter === f.id ? 'var(--rail)' : 'var(--paper-raised)',
                color: statusFilter === f.id ? '#fff' : 'var(--ink)',
                borderColor: statusFilter === f.id ? 'var(--rail)' : 'var(--line-strong)',
              }}
            >
              {f.label} ({f.count})
            </button>
          ))}
        </div>

        <div style={{ position: 'relative', width: 240 }}>
          <i className="ti ti-search" style={{ position: 'absolute', left: 10, top: 10, color: 'var(--ink-faint)', fontSize: 14 }} />
          <input
            type="text"
            className="field-input"
            style={{ paddingLeft: 32, height: 34, fontSize: 12.5 }}
            placeholder="Search your courses..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Course Table */}
      {filtered.length === 0 ? (
        <div className="card empty-state">
          <i className="ti ti-book-off" aria-hidden="true" />
          <p>No courses matching the selected filter.</p>
        </div>
      ) : (
        <div className="card" style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th>Course Program</th>
                <th style={{ width: 140 }}>Type</th>
                <th style={{ minWidth: 160 }}>Progress</th>
                <th style={{ width: 120 }}>Status</th>
                <th style={{ width: 120 }}>Due Date</th>
                <th style={{ width: 90 }}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => {
                const s = statusMap[c.enrollment?.status] || statusMap.NOT_STARTED;
                const percent = c.enrollment?.progressPercent || 0;
                return (
                  <tr key={c.id}>
                    <td>
                      <div style={{ fontWeight: 700, fontSize: 13.5 }}>{c.title}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--ink-faint)' }}>
                        <span style={{ fontFamily: 'var(--font-mono)' }}>{c.code}</span> &middot; {c.category} &middot; {c.estimatedDuration || '2h'}
                      </div>
                    </td>
                    <td><CourseTypeBadge courseType={c.courseType} /></td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ flex: 1 }}>
                          <ProgressBar
                            value={percent}
                            tone={c.enrollment?.status === 'COMPLETED' ? 'sage' : c.enrollment?.status === 'OVERDUE' ? 'rust' : 'rail'}
                          />
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-soft)', minWidth: 36 }}>{percent}%</span>
                      </div>
                    </td>
                    <td><Badge tone={s.tone}>{s.label}</Badge></td>
                    <td style={{ color: c.enrollment?.status === 'OVERDUE' ? 'var(--rust)' : 'var(--ink-soft)', fontSize: 12.5, fontWeight: c.enrollment?.status === 'OVERDUE' ? 700 : 400 }}>
                      {formatDate(c.enrollment?.dueDate)}
                    </td>
                    <td>
                      <Button size="sm" variant="primary" onClick={() => navigate(`${basePath}/${c.id}`)}>
                        {c.enrollment?.status === 'COMPLETED' ? 'Review' : 'Continue'}
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
