import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  currentUser,
  myLearningCourses,
  notifications,
  deriveCertificates,
  orgPathLabel,
  aiRecommendations,
  classroomSessions,
} from '../../data/mockData';
import { Badge, ProgressBar, Button, CourseTypeBadge } from '../../components/ui';
import { useCourseStore } from '../../state/CourseStore';

export default function LearnerDashboard() {
  const navigate = useNavigate();
  const { courses: allCourses, gamification, openAiAssistant, currentUser: authUser } = useCourseStore();
  const user = authUser || currentUser;
  const courses = myLearningCourses(allCourses, user);
  const certificates = deriveCertificates(allCourses, user);
  const active = courses.find((c) => c.enrollment.status === 'IN_PROGRESS');
  const mandatoryCount = courses.filter((c) => c.courseType === 'MANDATORY').length;
  const inProgressCount = courses.filter((c) => c.enrollment.status === 'IN_PROGRESS').length;
  const completedCount = courses.filter((c) => c.enrollment.status === 'COMPLETED').length;

  const { userStats } = gamification;
  const upcomingILT = classroomSessions.find((s) => s.isEnrolled && s.status === 'UPCOMING');
  const topAI = aiRecommendations[0];

  return (
    <>
      {/* Page Header with Gamification Bar */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800 }}>Welcome back, {user.fullName.split(' ').pop()}! 👋</h1>
          <p style={{ marginTop: 2 }}>
            <strong>{user.position}</strong> &middot; MM Mega Market &middot; {orgPathLabel(user)}
          </p>
        </div>


        {/* Gamification Quick Stats */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <div
            className="streak-pill"
            onClick={() => navigate('/learner/leaderboard')}
            style={{ cursor: 'pointer' }}
            title="Click to view full Leaderboard"
          >
            <i className="ti ti-flame" /> {userStats.streakDays}-Day Streak
          </div>
          <div
            className="xp-badge"
            onClick={() => navigate('/learner/leaderboard')}
            style={{ cursor: 'pointer' }}
            title="Learning Experience Points"
          >
            <i className="ti ti-sparkles" /> Level {userStats.currentLevel} &middot; {userStats.points} XP
          </div>
        </div>
      </div>

      {/* Highlights Grid: Active Learning + AI Recommender + ILT Alert */}
      <div className="grid grid-2" style={{ marginBottom: 24 }}>
        {/* Active Course Card */}
        {active ? (
          <div className="card card-pad" style={{ borderColor: 'var(--rail)', borderWidth: 1.5, background: 'linear-gradient(135deg, #FFFFFF 0%, var(--rail-soft) 100%)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 8 }}>
                <span className="section-label" style={{ margin: 0, color: 'var(--rail)' }}>In Progress</span>
                <Badge tone="amber" icon="ti-player-play">{active.enrollment.progressPercent}% Complete</Badge>
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)', marginBottom: 4 }}>{active.title}</div>
              <div style={{ fontSize: 12.5, color: 'var(--ink-soft)', marginBottom: 12 }}>
                Current lesson: <strong>{active.enrollment.lastLessonTitle || '—'}</strong>
              </div>
              <div style={{ marginBottom: 8 }}>
                <ProgressBar value={active.enrollment.progressPercent} tone="rail" size="md" />
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--ink-faint)' }}>
                {active.enrollment.dueDate ? `Due date: ${formatDate(active.enrollment.dueDate)}` : 'Self-paced'}
              </div>
            </div>

            <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
              <Button variant="primary" icon="ti-player-play" onClick={() => navigate(`/learner/courses/${active.id}`)}>
                Continue Lesson
              </Button>
            </div>
          </div>
        ) : (
          <div className="card card-pad empty-state" style={{ padding: 24 }}>
            <i className="ti ti-sparkles" />
            <p>You have completed all active assigned courses!</p>
          </div>
        )}

        {/* AI & ILT Quick Widget */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* AI Recommendation Widget */}
          {topAI && (
            <div className="card card-pad" style={{ background: 'var(--ai-soft)', borderColor: '#DDD6FE', padding: '14px 18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--ai-soft-text)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <i className="ti ti-sparkles" /> AI Course Recommendation ({topAI.confidence}% match)
                </div>
                <Button size="sm" variant="ai" onClick={() => openAiAssistant('insights')}>Details</Button>
              </div>
              <div style={{ fontWeight: 600, fontSize: 13.5 }}>{topAI.title}</div>
              <div style={{ fontSize: 11.5, color: 'var(--ink-soft)', marginTop: 2 }}>{topAI.reason}</div>
            </div>
          )}

          {/* Upcoming ILT Classroom Alert */}
          {upcomingILT && (
            <div className="card card-pad" style={{ borderColor: 'var(--blue)', background: 'var(--blue-soft)', padding: '14px 18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--blue-soft-text)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <i className="ti ti-chalkboard" /> Upcoming Classroom Workshop
                </div>
                <Badge tone="blue">Enrolled</Badge>
              </div>
              <div style={{ fontWeight: 600, fontSize: 13.5 }}>{upcomingILT.title}</div>
              <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 2, display: 'flex', gap: 12 }}>
                <span><i className="ti ti-calendar" /> {upcomingILT.date} ({upcomingILT.time})</span>
                <span><i className="ti ti-map-pin" /> {upcomingILT.venue}</span>
              </div>
              <div style={{ marginTop: 10, display: 'flex', justifyContent: 'flex-end' }}>
                <Button size="sm" variant="primary" icon="ti-qrcode" onClick={() => navigate('/learner/classrooms')}>
                  Open QR Attendance
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-4" style={{ marginBottom: 24 }}>
        <StatTile label="Mandatory Courses" value={mandatoryCount} tone="amber" icon="ti-shield-alert" />
        <StatTile label="In Progress" value={inProgressCount} tone="rail" icon="ti-loader" />
        <StatTile label="Completed" value={completedCount} tone="sage" icon="ti-circle-check" />
        <StatTile label="Certificates Earned" value={certificates.length} tone="sage" icon="ti-certificate" />
      </div>

      {/* Assigned Courses Grid */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div className="section-label" style={{ margin: 0 }}>My Courses ({courses.length})</div>
        <Button size="sm" variant="ghost" icon="ti-arrow-right" onClick={() => navigate('/learner/courses')}>
          View All Courses
        </Button>
      </div>

      <div className="grid grid-auto" style={{ marginBottom: 28 }}>
        {courses.map((c) => (
          <CourseCard key={c.id} course={c} onOpen={() => navigate(`/learner/courses/${c.id}`)} />
        ))}
      </div>

      {/* Notification Center */}
      <div className="section-label">Learning Notifications &amp; Alerts</div>
      <div className="card">
        {notifications.learnerInbox.map((n, i) => (
          <div
            key={n.id}
            style={{
              display: 'flex',
              gap: 14,
              padding: '14px 20px',
              borderBottom: i < notifications.learnerInbox.length - 1 ? '1px solid var(--line)' : 'none',
              background: n.unread ? 'var(--rail-soft)' : 'transparent',
              alignItems: 'center',
            }}
          >
            <div className="stat-icon-badge" style={{ background: n.unread ? 'var(--rail)' : 'var(--paper-sunken)', color: n.unread ? '#fff' : 'var(--ink-soft)' }}>
              <i className="ti ti-bell-ringing" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>{n.title}</div>
              <div style={{ fontSize: 12.5, color: 'var(--ink-soft)', marginTop: 2 }}>{n.message}</div>
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--ink-faint)', whiteSpace: 'nowrap' }}>{n.time}</div>
          </div>
        ))}
      </div>
    </>
  );
}

function StatTile({ label, value, tone, icon }) {
  const color = tone ? `var(--${tone})` : 'var(--ink)';
  return (
    <div className="stat card-interactive">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 6 }}>
        <div className="stat-label">{label}</div>
        {icon && (
          <div className="stat-icon-badge" style={{ background: `var(--${tone || 'rail'}-soft)`, color: `var(--${tone || 'rail'}-soft-text)` }}>
            <i className={`ti ${icon}`} />
          </div>
        )}
      </div>
      <div className="stat-value" style={{ color }}>{value}</div>
    </div>
  );
}

function CourseCard({ course, onOpen }) {
  const statusMap = {
    IN_PROGRESS: { tone: 'amber', label: 'In Progress' },
    NOT_STARTED: { tone: 'slate', label: 'Not Started' },
    COMPLETED: { tone: 'sage', label: 'Completed' },
    OVERDUE: { tone: 'rust', label: 'Overdue' },
    FAILED: { tone: 'rust', label: 'Failed' },
  };
  const s = statusMap[course.enrollment.status] || { tone: 'slate', label: 'Not Enrolled' };

  return (
    <div className="card card-pad card-interactive" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 10 }}>
          <div>
            <div style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--ink)' }}>{course.title}</div>
            <div style={{ fontSize: 11.5, color: 'var(--ink-faint)', marginTop: 2 }}>
              {course.category} &middot; {course.modules.length} modules &middot; {course.estimatedDuration}
            </div>
          </div>
          <Badge tone={s.tone}>{s.label}</Badge>
        </div>

        <div style={{ marginBottom: 12 }}>
          <CourseTypeBadge courseType={course.courseType} />
        </div>

        <div style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, color: 'var(--ink-soft)', marginBottom: 5 }}>
            <span>Progress</span>
            <span style={{ fontWeight: 600 }}>{course.enrollment.progressPercent}%</span>
          </div>
          <ProgressBar value={course.enrollment.progressPercent} tone={course.enrollment.status === 'COMPLETED' ? 'sage' : 'rail'} size="sm" />
        </div>
      </div>

      <div>
        <div style={{ fontSize: 11.5, color: 'var(--ink-faint)', marginBottom: 12 }}>
          <i className="ti ti-calendar" style={{ marginRight: 5, verticalAlign: -2 }} />
          {course.enrollment.dueDate ? `Due date: ${formatDate(course.enrollment.dueDate)}` : 'Self-paced'}
        </div>
        <Button block variant={course.enrollment.status === 'COMPLETED' ? 'outline' : 'primary'} onClick={onOpen}>
          {course.enrollment.status === 'COMPLETED' ? 'Review Course' : 'Start Course'}
        </Button>
      </div>
    </div>
  );
}

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
}


