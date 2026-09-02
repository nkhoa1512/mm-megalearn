import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  currentUser,
  myLearningCourses,
  notifications,
  deriveCertificates,
  totalLearningHours,
  weeklyStudyHours,
  getCourseImage,
} from '../../data/mockData';
import { Badge, ProgressBar, Button, BarChart, DonutChart, LineChart } from '../../features/common/ui';
import { useCourseStore } from '../../store/CourseStore';
import { levelDefinition } from '../../data/levelSystem';
import { normalizeRole, roleDefinition, ROLE_HOME } from '../../data/roles';
import { computeCourseRecertification } from '../../utils/recertification';
import RoadmapTabsPanel from '../../features/roadmaps/RoadmapTabsPanel';

export default function LearnerDashboard() {
  const navigate = useNavigate();
  const { courses: allCourses, currentUser: authUser, enrollments, classrooms, myCourses, certificateTemplates } = useCourseStore();
  const user = authUser || currentUser;
  const [activeChartType, setActiveChartType] = useState('BAR'); // 'BAR' | 'DONUT' | 'LINE'

  const userRole = normalizeRole(user.role);
  const isNonLearner = userRole !== 'learner';
  const courses = myCourses ? myCourses(allCourses, user) : myLearningCourses(allCourses, user, enrollments);
  const certificates = deriveCertificates(allCourses, user, enrollments, certificateTemplates);

  const recertAlerts = courses
    .map((c) => {
      const cert = certificates.find((cert) => cert.courseId === c.id);
      const recert = computeCourseRecertification(c, c.enrollment, cert);
      return { course: c, recert };
    })
    .filter((item) => item.recert.needsRecertification);

  const mandatoryCourses = courses.filter((c) => c.courseType === 'MANDATORY');
  const mandatoryCount = mandatoryCourses.length;
  const mandatoryOutstanding = mandatoryCourses.filter((c) => c.enrollment.status !== 'COMPLETED').length;
  const inProgressCourses = courses.filter((c) => c.enrollment.status === 'IN_PROGRESS');
  const completedCourses = courses.filter((c) => c.enrollment.status === 'COMPLETED');
  const completedCount = completedCourses.length;
  const learningHours = totalLearningHours(allCourses, user, enrollments);
  const levelDef = levelDefinition(user.level);
  const chartData = weeklyStudyHours(user);
  const unreadCount = (notifications.learnerInbox || []).filter((n) => n.unread).length;

  // Fetch the upcoming practice classes / webinars
  const upcomingClassrooms = (classrooms || []).filter((s) => s.isEnrolled || s.status === 'UPCOMING' || s.status === 'OPEN').slice(0, 2);

  // Computes the training capability distribution by specialist group
  const categoryStats = computeCategoryDistribution(courses);

  // Data for the donut chart
  const donutChartData = categoryStats.map((c) => ({
    label: c.name,
    value: Math.max(1, c.completedCount),
    tone: c.tone,
  }));

  // Data for the line chart
  const lineTrendData = [
    { label: 'Week 1', value: Math.max(1, Math.round(learningHours * 0.2)) },
    { label: 'Week 2', value: Math.max(2, Math.round(learningHours * 0.45)) },
    { label: 'Week 3', value: Math.max(3, Math.round(learningHours * 0.75)) },
    { label: 'Week 4', value: Math.max(4, Math.round(learningHours)) },
  ];

  // Competency Readiness Score
  const competencyScore = courses.length > 0
    ? Math.min(100, Math.round(((completedCount * 1.0 + inProgressCourses.length * 0.4) / Math.max(1, mandatoryCount || courses.length)) * 100))
    : 75;

  const streakDays = user.streakDays || 8;
  const totalXp = user.totalXp || (completedCount * 150 + inProgressCourses.length * 50 + 200);

  return (
    <>
      {/* 1. HERO PROFILE & LEARNING STATUS BANNER */}
      <div
        className="card card-pad"
        style={{
          marginBottom: 20,
          background: 'linear-gradient(135deg, var(--paper-raised) 0%, var(--sage-soft) 100%)',
          borderColor: 'var(--sage, #10B981)',
          boxShadow: '0 4px 20px rgba(16, 185, 129, 0.08)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--rail, #0F766E) 0%, #115E59 100%)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: 20,
                boxShadow: '0 4px 12px rgba(15, 118, 110, 0.3)',
                flexShrink: 0,
              }}
            >
              {user.avatar || user.fullName.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0, color: 'var(--ink)', letterSpacing: '-0.015em' }}>
                  Hello, {firstNameOf(user.fullName)}! 👋
                </h1>
                <Badge tone="rail" icon="ti-map-2">
                  {levelDef.emoji} Level {user.level} &middot; {levelDef.shortVi}
                </Badge>
                <Badge tone="amber" icon="ti-flame">
                  🔥 {streakDays}-Day Streak
                </Badge>
                <Badge tone="sage" icon="ti-certificate">
                  📜 {certificates.length} Certificates Earned
                </Badge>
              </div>
              <p style={{ marginTop: 4, marginBottom: 0, color: 'var(--ink-soft)', fontSize: 13 }}>
                <strong>{user.position}</strong> &middot; {user.departmentName || user.departmentCode || user.divisionName || 'MM Mega Market'} &middot; {user.employeeCode || 'MMVN'}
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            {isNonLearner && (
              <Button variant="outline" icon="ti-layout-dashboard" onClick={() => navigate(ROLE_HOME[userRole] || '/learner')}>
                Open The {roleDefinition(userRole).shortVi} Dashboard
              </Button>
            )}
            <Button variant="outline" icon="ti-calendar-event" onClick={() => navigate('/learner/calendar')}>
              Class Schedule
            </Button>
            <Button variant="primary" icon="ti-book-2" onClick={() => navigate('/learner/courses')}>
              My Courses ({courses.length})
            </Button>
          </div>
        </div>
      </div>

      {/* RECERTIFICATION ALERT (IF ANY) */}
      {recertAlerts.length > 0 && (
        <div
          className="card card-pad"
          style={{
            marginBottom: 20,
            borderLeft: `4px solid ${recertAlerts.some((a) => a.recert.isExpired) ? 'var(--rust)' : 'var(--amber)'}`,
            background: recertAlerts.some((a) => a.recert.isExpired) ? 'var(--rust-soft)' : 'var(--amber-soft)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <i
              className={`ti ${recertAlerts.some((a) => a.recert.isExpired) ? 'ti-alert-circle' : 'ti-clock'}`}
              style={{ fontSize: 24, color: recertAlerts.some((a) => a.recert.isExpired) ? 'var(--rust)' : 'var(--amber)' }}
            />
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: recertAlerts.some((a) => a.recert.isExpired) ? 'var(--rust-soft-text)' : 'var(--amber-soft-text)' }}>
                You have {recertAlerts.length} courses needing a recertification exam!
              </div>
              <div style={{ fontSize: 13, color: 'var(--ink-soft)', marginTop: 2 }}>
                {recertAlerts.map((a) => `${a.course.title} (${a.recert.statusLabel})`).join(' · ')}
              </div>
            </div>
          </div>
          <Button
            size="sm"
            variant="primary"
            tone={recertAlerts.some((a) => a.recert.isExpired) ? 'danger' : 'primary'}
            icon="ti-refresh"
            onClick={() => navigate('/learner/certificates')}
          >
            View Certificates &amp; Recertification Exam
          </Button>
        </div>
      )}

      {/* 2. FOUR HERO METRIC TILES */}
      <div className="grid grid-4" style={{ marginBottom: 24, gap: 16 }}>
        <StatTile
          label="Study Hours"
          value={`${learningHours.toFixed(1)}h`}
          subtext="+2.5h in the last 7 days"
          tone="blue"
          icon="ti-clock-hour-4"
          onClick={() => navigate('/learner/history')}
        />
        <StatTile
          label="Courses Completed"
          value={completedCount}
          subtext={`${Math.round((completedCount / Math.max(1, courses.length)) * 100)}% of all courses`}
          tone="sage"
          icon="ti-circle-check"
          onClick={() => navigate('/learner/courses')}
        />
        <StatTile
          label="Mandatory Course"
          value={mandatoryCount}
          subtext={`${mandatoryOutstanding} courses outstanding`}
          tone="amber"
          icon="ti-alert-triangle"
          onClick={() => navigate('/learner/courses')}
        />
        <StatTile
          label="Competency Index"
          value={`${competencyScore}%`}
          subtext={`Level ${user.level} standard framework`}
          tone="rail"
          icon="ti-shield-check"
          onClick={() => navigate('/learner/paths')}
        />
      </div>

      {/* 3. FOUR-TAB LEARNING ROADMAP */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
        <div>
          <div className="section-label" style={{ margin: 0, fontSize: 15, fontWeight: 800, color: 'var(--ink)' }}>
            <i className="ti ti-route" style={{ marginRight: 6, color: 'var(--rail)' }} />
            Training Roadmap &amp; Requirement Track
          </div>
          <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 2 }}>
            The standard job-title framework by level, promotion nominations, optional specialist tracks and smart course suggestions.
          </div>
        </div>
        <Button size="sm" variant="ghost" icon="ti-arrow-right" onClick={() => navigate('/learner/paths')}>
          View All Modules
        </Button>
      </div>

      <div style={{ marginBottom: 28 }}>
        <RoadmapTabsPanel user={user} />
      </div>

      {/* 4. MULTI-CHART ANALYTICS (BAR, DONUT, LINE) */}
      <div className="grid grid-2" style={{ gap: 20, marginBottom: 24, alignItems: 'start' }}>
        {/* CHART 1: COMPETENCY & DOMAIN DISTRIBUTION */}
        <div className="card card-pad" style={{ border: '1px solid var(--line)', background: 'var(--paper-raised)', borderRadius: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--ink)' }}>
                <i className="ti ti-chart-pie" style={{ marginRight: 6, color: 'var(--blue)' }} />
                Capability Distribution By Business Area
              </div>
              <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 2 }}>
                Completion progress across the 5 core skill groups
              </div>
            </div>
            <Badge tone="blue">5 Skill Groups</Badge>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {categoryStats.map((cat, idx) => (
              <div key={idx} style={{ background: 'var(--paper-sunken)', borderRadius: 8, padding: '10px 12px', border: '1px solid var(--line)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <i className={`ti ${cat.icon}`} style={{ color: `var(--${cat.tone})`, fontSize: 16 }} />
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>{cat.name}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>{cat.completedCount}/{cat.totalCount} Locked</span>
                    <Badge tone={cat.tone} size="sm">{cat.percent}%</Badge>
                  </div>
                </div>
                <ProgressBar value={cat.percent} tone={cat.tone} size="sm" />
              </div>
            ))}
          </div>
        </div>

        {/* CHART 2: MULTI-VIEW LEARNING ACTIVITY (BAR / DONUT / LINE SWITCHER) */}
        <div className="card card-pad" style={{ border: '1px solid var(--line)', background: 'var(--paper-raised)', borderRadius: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--ink)' }}>
                <i className="ti ti-chart-bar" style={{ marginRight: 6, color: 'var(--sage)' }} />
                Study Hours &amp; Progress
              </div>
              <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 2 }}>
                Visual analysis with bar, donut and line charts
              </div>
            </div>

            {/* CHART TYPE SWITCHER CONTROLS */}
            <div style={{ display: 'flex', gap: 4, background: 'var(--paper-sunken)', padding: 3, borderRadius: 8, border: '1px solid var(--line)' }}>
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => setActiveChartType('BAR')}
                style={{
                  fontSize: 11,
                  padding: '4px 8px',
                  background: activeChartType === 'BAR' ? 'var(--sage)' : 'transparent',
                  color: activeChartType === 'BAR' ? '#fff' : 'var(--ink-soft)',
                  border: 'none',
                }}
                title="Bar chart by weekday"
              >
                📊 Bar
              </button>
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => setActiveChartType('DONUT')}
                style={{
                  fontSize: 11,
                  padding: '4px 8px',
                  background: activeChartType === 'DONUT' ? 'var(--blue)' : 'transparent',
                  color: activeChartType === 'DONUT' ? '#fff' : 'var(--ink-soft)',
                  border: 'none',
                }}
                title="Donut distribution chart"
              >
                🍩 Donut
              </button>
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => setActiveChartType('LINE')}
                style={{
                  fontSize: 11,
                  padding: '4px 8px',
                  background: activeChartType === 'LINE' ? 'var(--rail)' : 'transparent',
                  color: activeChartType === 'LINE' ? '#fff' : 'var(--ink-soft)',
                  border: 'none',
                }}
                title="Weekly trend line chart"
              >
                📈 Line
              </button>
            </div>
          </div>

          <div style={{ marginBottom: 16, minHeight: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {activeChartType === 'BAR' && (
              <div style={{ width: '100%' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)', marginBottom: 8 }}>
                  Study Hours By Weekday
                </div>
                <BarChart data={chartData} valueSuffix="h" tone="sage" />
              </div>
            )}
            {activeChartType === 'DONUT' && (
              <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
                <DonutChart data={donutChartData} valueSuffix=" course" />
              </div>
            )}
            {activeChartType === 'LINE' && (
              <div style={{ width: '100%' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)', marginBottom: 8 }}>
                  Study Hours Trend Over The Last 4 Weeks
                </div>
                <LineChart data={lineTrendData} valueSuffix="h" tone="rail" />
              </div>
            )}
          </div>

          <div style={{ background: 'var(--sage-soft)', borderRadius: 8, padding: '10px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <i className="ti ti-flame" style={{ color: 'var(--amber)', fontSize: 18 }} />
              <div style={{ fontSize: 12, color: 'var(--ink)' }}>
                Maintain <strong>a {streakDays}-day study streak</strong> &middot; 88% of the monthly goal complete.
              </div>
            </div>
            <Badge tone="sage">+15%</Badge>
          </div>
        </div>
      </div>

      {/* 5. IN-PROGRESS COURSES & UPCOMING LIVE WORKSHOPS */}
      <div className="grid grid-2" style={{ gap: 20, marginBottom: 24, alignItems: 'start' }}>
        {/* COLUMN 1: IN-PROGRESS COURSES */}
        <div className="card card-pad" style={{ border: '1px solid var(--line)', background: 'var(--paper-raised)', borderRadius: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--ink)' }}>
                <i className="ti ti-player-play" style={{ marginRight: 6, color: 'var(--amber)' }} />
                Courses In Progress ({inProgressCourses.length})
              </div>
              <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 2 }}>
                Continue the lesson in progress to earn your certificate
              </div>
            </div>
            <Button size="sm" variant="ghost" icon="ti-arrow-right" onClick={() => navigate('/learner/courses')}>
              View All
            </Button>
          </div>

          {inProgressCourses.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 12px', background: 'var(--paper-sunken)', borderRadius: 8, color: 'var(--ink-soft)', fontSize: 13 }}>
              <i className="ti ti-circle-check" style={{ fontSize: 32, color: 'var(--sage)', marginBottom: 6, display: 'block' }} />
              You have finished every course you are enrolled in! Pick more courses from your roadmap.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {inProgressCourses.slice(0, 3).map((c) => (
                <div
                  key={c.id}
                  className="card-interactive"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '12px',
                    border: '1px solid var(--line)',
                    borderRadius: 8,
                    background: 'var(--paper-raised)',
                  }}
                  onClick={() => navigate(`/learner/courses/${c.id}`)}
                >
                  <div style={{ width: 44, height: 44, borderRadius: 6, overflow: 'hidden', flexShrink: 0, background: 'var(--paper-sunken)' }}>
                    <img src={getCourseImage(c)} alt={c.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={c.title}>
                      {c.title}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                      <div style={{ flex: 1 }}>
                        <ProgressBar value={c.enrollment.progressPercent || 0} tone="rail" size="sm" />
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--amber)' }}>{c.enrollment.progressPercent || 0}%</span>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" icon="ti-player-play">
                    Continue
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* COLUMN 2: UPCOMING LIVE WORKSHOPS & WEBINARS */}
        <div className="card card-pad" style={{ border: '1px solid var(--line)', background: 'var(--paper-raised)', borderRadius: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--ink)' }}>
                <i className="ti ti-users-group" style={{ marginRight: 6, color: 'var(--rail)' }} />
                Upcoming In-Person Classes &amp; Workshops
              </div>
              <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 2 }}>
                Hands-on sessions in the workshop/store and online webinar classes
              </div>
            </div>
            <Button size="sm" variant="ghost" icon="ti-arrow-right" onClick={() => navigate('/learner/classrooms')}>
              View Classes
            </Button>
          </div>

          {upcomingClassrooms.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 12px', background: 'var(--paper-sunken)', borderRadius: 8, color: 'var(--ink-soft)', fontSize: 13 }}>
              <i className="ti ti-calendar" style={{ fontSize: 32, color: 'var(--rail)', marginBottom: 6, display: 'block' }} />
              No new practice class scheduled. Click "View Classes" to register for upcoming workshops.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {upcomingClassrooms.map((cls) => (
                <div
                  key={cls.id}
                  style={{
                    background: 'var(--paper-sunken)',
                    border: '1px solid var(--line)',
                    borderRadius: 8,
                    padding: '12px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: 10,
                  }}
                >
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                      <Badge tone={cls.modality === 'OFFLINE_STORE' ? 'rust' : 'blue'} size="sm">
                        {cls.modality === 'OFFLINE_STORE' ? 'Store Practice' : 'Webinar Online'}
                      </Badge>
                      <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--ink-faint)' }}>{cls.code}</span>
                    </div>
                    <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {cls.title}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 2 }}>
                      <i className="ti ti-map-pin" style={{ marginRight: 4 }} />
                      {cls.venue} &middot; Trainer: <strong>{cls.trainerName}</strong>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" icon="ti-file-description" onClick={() => navigate('/learner/classrooms')}>
                    Syllabus &amp; QR
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 6. ACHIEVEMENTS, RANKING & NOTIFICATIONS */}
      <div className="grid grid-3" style={{ gap: 16 }}>
        <ResourceCard
          icon="ti-certificate"
          tone="sage"
          title="Certificates Earned"
          value={`${certificates.length} digital certificates`}
          subtext="MMVN security verified"
          onClick={() => navigate('/learner/certificates')}
        />
        <ResourceCard
          icon="ti-trophy"
          tone="amber"
          title="Learning Leaderboard"
          value={`Top 3 Departments`}
          subtext={`Level ${user.level} · meets the role standard`}
          onClick={() => navigate('/learner/history')}
        />
        <ResourceCard
          icon="ti-bell-ringing"
          tone="rail"
          title="Notifications & Reminders"
          value={`${unreadCount} new notifications`}
          subtext="Progress & examination updates"
        />
      </div>
    </>
  );
}

function StatTile({ label, value, subtext, tone, icon, onClick }) {
  const color = tone ? `var(--${tone})` : 'var(--ink)';
  return (
    <div className="stat card-interactive" onClick={onClick} style={{ cursor: onClick ? 'pointer' : 'default', background: 'var(--paper-raised)', border: '1px solid var(--line)', borderRadius: 10, padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 6 }}>
        <div className="stat-label" style={{ fontSize: 13, fontWeight: 700 }}>{label}</div>
        {icon && (
          <div className="stat-icon-badge" style={{ background: `var(--${tone || 'rail'}-soft)`, color: `var(--${tone || 'rail'}-soft-text)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, width: 36, height: 36, borderRadius: 8 }}>
            <i className={`ti ${icon}`} />
          </div>
        )}
      </div>
      <div className="stat-value" style={{ color, fontSize: 22, fontWeight: 800 }}>{value}</div>
      {subtext && <div style={{ fontSize: 11, color: 'var(--ink-soft)', marginTop: 4 }}>{subtext}</div>}
    </div>
  );
}

function ResourceCard({ icon, tone, title, value, subtext, onClick }) {
  return (
    <div className={`card card-pad ${onClick ? 'card-interactive' : ''}`} onClick={onClick} style={{ display: 'flex', gap: 14, alignItems: 'center', cursor: onClick ? 'pointer' : 'default', background: 'var(--paper-raised)', border: '1px solid var(--line)', borderRadius: 10 }}>
      <div className="stat-icon-badge" style={{ background: `var(--${tone}-soft)`, color: `var(--${tone}-soft-text)`, width: 44, height: 44, fontSize: 20, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <i className={`ti ${icon}`} />
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</div>
        <div style={{ fontSize: 13, fontWeight: 800, color: `var(--${tone})`, marginTop: 1 }}>{value}</div>
        {subtext && <div style={{ fontSize: 11, color: 'var(--ink-soft)', marginTop: 2 }}>{subtext}</div>}
      </div>
    </div>
  );
}

function computeCategoryDistribution(courses) {
  const groups = [
    { name: 'Operations & Counter Standards', tone: 'rail', icon: 'ti-building-store', keywords: ['store', 'operation', 'planogram', 'cashier', 'pos', 'shrinkage', 'trolley', 'stock'] },
    { name: 'Food Safety, HACCP & Fire Prevention', tone: 'rust', icon: 'ti-shield-alert', keywords: ['food', 'safety', 'haccp', 'hygiene', 'cold', 'chain', 'fire', 'pccc', 'evacuation', 'hazard'] },
    { name: 'Category Expertise & IT', tone: 'blue', icon: 'ti-device-laptop', keywords: ['it', 'security', 'cyber', 'merchandis', 'pricing', 'supply', 'logistics', 'e-commerce', 'forklift'] },
    { name: 'Leadership & Team Management', tone: 'amber', icon: 'ti-crown', keywords: ['leadership', 'coach', 'conflict', 'management', 'kpi', 'strategic', 'appraisal', 'trainer'] },
    { name: 'Customer Service & Culture', tone: 'sage', icon: 'ti-heart-handshake', keywords: ['customer', 'service', 'horeca', 'culture', 'conduct', 'ethics', 'onboarding'] },
  ];

  return groups.map((grp) => {
    const matched = courses.filter((c) => {
      const text = `${c.title} ${c.domain || ''} ${c.category || ''}`.toLowerCase();
      return grp.keywords.some((kw) => text.includes(kw));
    });

    const totalCount = Math.max(1, matched.length);
    const completedCount = matched.filter((c) => c.enrollment?.status === 'COMPLETED').length;
    const percent = Math.round((completedCount / totalCount) * 100);

    return {
      name: grp.name,
      tone: grp.tone,
      icon: grp.icon,
      totalCount: matched.length,
      completedCount,
      percent: matched.length === 0 ? 0 : percent,
    };
  });
}

function firstNameOf(fullName) {
  return (fullName || '').replace(/\s*\([^)]*\)\s*$/, '').trim().split(' ').pop();
}

