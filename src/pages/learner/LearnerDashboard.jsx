import React from 'react';
import { useNavigate } from 'react-router-dom';
import { currentUser, myLearningCourses, notifications, deriveCertificates, orgPathLabel } from '../../data/mockData';
import { Badge, ProgressBar, Button, CourseTypeBadge } from '../../components/ui';
import { useCourseStore } from '../../state/CourseStore';

export default function LearnerDashboard() {
  const navigate = useNavigate();
  const { courses: allCourses } = useCourseStore();
  const courses = myLearningCourses(allCourses, currentUser);
  const certificates = deriveCertificates(allCourses, currentUser);
  const active = courses.find((c) => c.enrollment.status === 'IN_PROGRESS');
  const mandatoryCount = courses.filter((c) => c.courseType === 'MANDATORY').length;
  const optionalCount = courses.filter((c) => c.courseType === 'OPTIONAL').length;
  const inProgressCount = courses.filter((c) => c.enrollment.status === 'IN_PROGRESS').length;
  const notStartedCount = courses.filter((c) => c.enrollment.status === 'NOT_STARTED').length;
  const completedCount = courses.filter((c) => c.enrollment.status === 'COMPLETED').length;
  const overdueCount = courses.filter((c) => c.enrollment.status === 'OVERDUE').length;

  return (
    <>
      <div className="page-header">
        <h1>Welcome back, {currentUser.fullName.split(' ')[0]}</h1>
        <p>
          {currentUser.position} &middot; {orgPathLabel(currentUser)}
          {' — '}here is where you left off, plus everything assigned to you.
        </p>
      </div>

      {active && (
        <div className="card card-pad" style={{ marginBottom: 24, borderColor: 'var(--rail)', borderWidth: 1.5 }}>
          <div className="section-label" style={{ margin: '0 0 12px' }}>Continue learning</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 260 }}>
              <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>{active.title}</div>
              <div style={{ fontSize: 12.5, color: 'var(--ink-soft)', marginBottom: 12 }}>
                Last activity: {active.enrollment.lastLessonTitle || '—'}
              </div>
              <div style={{ maxWidth: 320 }}>
                <ProgressBar value={active.enrollment.progressPercent} />
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--ink-faint)', marginTop: 6 }}>
                {active.enrollment.progressPercent}% complete
                {active.enrollment.dueDate ? ` · due ${formatDate(active.enrollment.dueDate)}` : ''}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <Button variant="primary" icon="ti-player-play" onClick={() => navigate(`/learner/courses/${active.id}`)}>
                Continue learning
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-4" style={{ marginBottom: 8 }}>
        <StatTile label="Mandatory courses" value={mandatoryCount} tone="amber" />
        <StatTile label="Optional courses" value={optionalCount} />
        <StatTile label="In progress" value={inProgressCount} tone="rail" />
        <StatTile label="Completed" value={completedCount} tone="sage" />
      </div>
      <div className="grid grid-4" style={{ marginBottom: 8 }}>
        <StatTile label="Not started" value={notStartedCount} />
        <StatTile label="Overdue" value={overdueCount} tone="rust" />
        <StatTile label="Certificates" value={certificates.length} tone="sage" />
        <StatTile label="Total assigned" value={courses.length} />
      </div>

      <div className="section-label">My courses</div>
      <div className="grid grid-auto">
        {courses.map((c) => (
          <CourseCard key={c.id} course={c} onOpen={() => navigate(`/learner/courses/${c.id}`)} />
        ))}
      </div>

      <div className="section-label">Notifications</div>
      <div className="card">
        {notifications.learnerInbox.map((n, i) => (
          <div
            key={n.id}
            style={{
              display: 'flex', gap: 12, padding: '14px 20px',
              borderBottom: i < notifications.learnerInbox.length - 1 ? '1px solid var(--line)' : 'none',
              background: n.unread ? 'var(--rail-soft)' : 'transparent',
            }}
          >
            <i className="ti ti-bell-ringing" style={{ color: 'var(--rail)', fontSize: 16, marginTop: 2 }} aria-hidden="true" />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{n.title}</div>
              <div style={{ fontSize: 12.5, color: 'var(--ink-soft)' }}>{n.message}</div>
            </div>
            <div style={{ fontSize: 11, color: 'var(--ink-faint)', whiteSpace: 'nowrap' }}>{n.time}</div>
          </div>
        ))}
      </div>
    </>
  );
}

function StatTile({ label, value, tone }) {
  const color = tone ? `var(--${tone})` : 'var(--ink)';
  return (
    <div className="stat">
      <div className="stat-label">{label}</div>
      <div className="stat-value" style={{ color }}>{value}</div>
    </div>
  );
}

function CourseCard({ course, onOpen }) {
  const statusMap = {
    IN_PROGRESS: { tone: 'amber', label: 'In progress' },
    NOT_STARTED: { tone: 'slate', label: 'Not started' },
    COMPLETED: { tone: 'sage', label: 'Completed' },
    OVERDUE: { tone: 'rust', label: 'Overdue' },
    FAILED: { tone: 'rust', label: 'Failed' },
  };
  const s = statusMap[course.enrollment.status];
  return (
    <div className="card card-pad card-interactive">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>{course.title}</div>
          <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 2 }}>{course.category} &middot; {course.modules.length} modules</div>
        </div>
        <Badge tone={s.tone}>{s.label}</Badge>
      </div>
      <div style={{ marginBottom: 10 }}>
        <CourseTypeBadge courseType={course.courseType} />
      </div>
      <div style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, color: 'var(--ink-soft)', marginBottom: 5 }}>
          <span>Progress</span>
          <span>{course.enrollment.progressPercent}%</span>
        </div>
        <ProgressBar value={course.enrollment.progressPercent} tone={course.enrollment.status === 'COMPLETED' ? 'sage' : 'rail'} />
      </div>
      <div style={{ fontSize: 11.5, color: 'var(--ink-faint)', marginBottom: 14 }}>
        <i className="ti ti-calendar" style={{ marginRight: 5, verticalAlign: -2 }} aria-hidden="true" />
        {course.enrollment.dueDate ? `Due ${formatDate(course.enrollment.dueDate)}` : 'No due date'}
      </div>
      <Button block onClick={onOpen}>View course</Button>
    </div>
  );
}

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
