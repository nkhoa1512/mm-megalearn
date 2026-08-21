import React, { useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Badge, ProgressBar, Button, ModuleList, CourseTypeBadge } from '../../components/ui';
import { useCourseStore } from '../../state/CourseStore';

export default function LearnerCourseDetail({ basePath = '/learner/courses' }) {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { courses } = useCourseStore();
  const course = courses.find((c) => c.id === courseId);

  const allRequiredLessons = useMemo(() => {
    if (!course) return [];
    return course.modules.flatMap((m) => m.lessons.filter((l) => l.isRequired && l.lessonType !== 'ASSESSMENT'));
  }, [course]);

  if (!course || !course.enrollment) {
    return (
      <div className="empty-state">
        <i className="ti ti-mood-empty" aria-hidden="true" />
        <p>Course not found, or not assigned to you.</p>
        <Link to={basePath}>Back to my courses</Link>
      </div>
    );
  }

  const unmetPrerequisites = course.prerequisites.filter((pid) => {
    const p = courses.find((c) => c.id === pid);
    return !p || p.enrollment?.status !== 'COMPLETED';
  });
  const isLocked = unmetPrerequisites.length > 0;

  const completedRequired = allRequiredLessons.filter((l) => l.status === 'COMPLETED').length;
  const completionPct = allRequiredLessons.length
    ? Math.round((completedRequired / allRequiredLessons.length) * 100)
    : 100;
  const assessmentUnlocked = !isLocked && completionPct >= 100 && course.configuration.assessmentEnabled;
  const cfg = course.configuration;

  return (
    <>
      <div className="page-crumb" style={{ marginBottom: 6 }}>
        <Link to={basePath} style={{ color: 'var(--ink-soft)', textDecoration: 'none' }}>My courses</Link> / {course.title}
      </div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1>{course.title}</h1>
          <p>{course.category} &middot; {course.estimatedDuration} estimated &middot; {course.version}</p>
        </div>
        <CourseTypeBadge courseType={course.courseType} />
      </div>

      {isLocked ? (
        <div className="card card-pad empty-state">
          <i className="ti ti-lock" aria-hidden="true" />
          <p>This course requires the following to be completed first: {unmetPrerequisites.map((pid) => courses.find((c) => c.id === pid)?.title).join(', ')}.</p>
        </div>
      ) : (
        <>
          <div className="card card-pad" style={{ marginBottom: 16, borderColor: 'var(--rail)', borderWidth: 1.5 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 600 }}>Course progress</div>
                {course.courseType === 'MANDATORY' && (
                  <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>Due {formatDate(course.enrollment.dueDate)}</div>
                )}
              </div>
              <Badge tone={course.enrollment.status === 'COMPLETED' ? 'sage' : course.enrollment.status === 'OVERDUE' ? 'rust' : 'amber'}>
                {statusLabel(course.enrollment.status)}
              </Badge>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ flex: 1 }}><ProgressBar value={course.enrollment.progressPercent} tone={course.enrollment.status === 'COMPLETED' ? 'sage' : 'rail'} /></div>
              <span style={{ fontSize: 12.5, fontWeight: 600 }}>{course.enrollment.progressPercent}%</span>
            </div>
          </div>

          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-pad" style={{ paddingBottom: 4 }}>
              <div className="section-label" style={{ margin: '0 0 4px' }}>Modules &amp; lessons</div>
            </div>
            <div className="card-pad" style={{ paddingTop: 4 }}>
              <ModuleList
                modules={course.modules}
                getLessonHref={(l) => (l.lessonType === 'ASSESSMENT' ? null : `${basePath}/${course.id}/lessons/${l.id}`)}
              />
            </div>
          </div>

          {cfg.assessmentEnabled && (
            <div className="card card-pad" style={{ borderColor: assessmentUnlocked ? 'var(--rail)' : 'var(--line)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <div className="activity-icon" style={{ background: 'var(--rail-soft)', color: 'var(--rail-soft-text)' }}>
                    <i className="ti ti-writing" aria-hidden="true" />
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13.5 }}>Final assessment</div>
                    <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
                      {cfg.questionsPerAttempt} of {cfg.questionBankSize} questions &middot; {cfg.assessmentTimeLimit} min &middot; passing score {cfg.passingScorePercent}% &middot; {cfg.maxAttempts} attempts max
                    </div>
                  </div>
                </div>
                {assessmentUnlocked ? (
                  <Button variant="primary" icon="ti-player-play" onClick={() => navigate(`${basePath}/${course.id}/assessment`)}>
                    {course.assessmentAttempts?.length ? 'Retake assessment' : 'Start assessment'}
                  </Button>
                ) : (
                  <Button variant="ghost" icon="ti-lock">Complete all required lessons first</Button>
                )}
              </div>

              {(course.assessmentAttempts || []).length > 0 && (
                <div style={{ marginTop: 16, borderTop: '1px solid var(--line)', paddingTop: 14 }}>
                  <div style={{ fontSize: 11.5, color: 'var(--ink-faint)', marginBottom: 8 }}>Attempt history</div>
                  {course.assessmentAttempts.map((att) => (
                    <div key={att.n} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '6px 0' }}>
                      <span>Attempt {att.n}</span>
                      <Badge tone={att.score >= cfg.passingScorePercent ? 'sage' : 'rust'}>{att.score}%</Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </>
  );
}

function statusLabel(status) {
  return { NOT_STARTED: 'Not started', IN_PROGRESS: 'In progress', COMPLETED: 'Completed', FAILED: 'Failed', OVERDUE: 'Overdue' }[status] || status;
}

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
