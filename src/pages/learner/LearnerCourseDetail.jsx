import React, { useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Badge, ProgressBar, Button, ModuleList, CourseTypeBadge } from '../../components/ui';
import { useCourseStore } from '../../state/CourseStore';
import { currentUser } from '../../data/mockData';
import { JobLevelBadge } from './LearnerCourses';

function statusLabel(status) {
  switch (status) {
    case 'COMPLETED': return 'Đã Hoàn Thành';
    case 'IN_PROGRESS': return 'Đang Học';
    case 'OVERDUE': return 'Quá Hạn';
    case 'FAILED': return 'Cần Thi Lại';
    default: return 'Chưa Bắt Đầu';
  }
}

function formatDate(iso) {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('vi-VN', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return iso;
  }
}

export default function LearnerCourseDetail({ basePath = '/learner/courses' }) {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { courses, currentUser: authUser, enrollCourse } = useCourseStore();
  const user = authUser || currentUser;
  const course = courses.find((c) => c.id === courseId);

  const allRequiredLessons = useMemo(() => {
    if (!course || !course.modules) return [];
    return course.modules.flatMap((m) => m.lessons.filter((l) => l.isRequired && l.lessonType !== 'ASSESSMENT'));
  }, [course]);

  if (!course) {
    return (
      <div className="empty-state">
        <i className="ti ti-mood-empty" aria-hidden="true" />
        <p>Không tìm thấy khóa học.</p>
        <Link to={basePath}>Quay lại danh sách khóa học</Link>
      </div>
    );
  }

  // Check prerequisites
  const unmetPrerequisites = (course.prerequisites || []).filter((pid) => {
    const p = courses.find((c) => c.id === pid);
    return !p || p.enrollment?.status !== 'COMPLETED';
  });
  const isPrereqLocked = unmetPrerequisites.length > 0;

  const completedRequired = allRequiredLessons.filter((l) => l.status === 'COMPLETED').length;
  const completionPct = allRequiredLessons.length
    ? Math.round((completedRequired / allRequiredLessons.length) * 100)
    : 100;
  const cfg = course.configuration || {};
  const assessmentUnlocked = !isPrereqLocked && completionPct >= 100 && cfg.assessmentEnabled;
  const isHigherLevel = Number(course.targetLevel || 1) > Number(user.level || 1);

  return (
    <>
      <div className="page-crumb" style={{ marginBottom: 6 }}>
        <Link to={basePath} style={{ color: 'var(--ink-soft)', textDecoration: 'none' }}>Khóa Học Của Tôi</Link> / {course.title}
      </div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
            <h1>{course.title}</h1>
            <JobLevelBadge level={course.targetLevel} title={course.targetLevelTitle} />
          </div>
          <p style={{ margin: 0 }}>
            {course.category || course.domain} &middot; Thời lượng: {course.estimatedDuration || '3h'} &middot; Phiên bản: {course.version || 'v2.1'}
          </p>
        </div>
        <CourseTypeBadge courseType={course.courseType} />
      </div>

      {isPrereqLocked ? (
        /* PREREQUISITES LOCKED */
        <div className="card card-pad empty-state" style={{ marginBottom: 20 }}>
          <i className="ti ti-lock" aria-hidden="true" />
          <p>Khóa học này yêu cầu bạn phải hoàn thành trước: {unmetPrerequisites.map((pid) => courses.find((c) => c.id === pid)?.title).join(', ')}.</p>
        </div>
      ) : !course.enrollment ? (
        /* NOT ENROLLED YET (CAN ENROLL SELF-PACED) */
        <div className="card card-pad" style={{ background: isHigherLevel ? 'linear-gradient(135deg, #FAF5FF 0%, #F3E8FF 100%)' : '#EFF6FF', borderColor: isHigherLevel ? '#C084FC' : 'var(--blue)', marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, color: isHigherLevel ? '#6B21A8' : '#1E40AF' }}>
                {isHigherLevel ? `Khóa Học Nâng Cao (Chuẩn Bị Lộ Trình Thăng Tiến Level ${course.targetLevel})` : 'Khóa Học Tự Chọn Chưa Đăng Ký'}
              </div>
              <p style={{ fontSize: 12.5, color: isHigherLevel ? '#7E22CE' : '#1E3A8A', margin: '2px 0 0' }}>
                {isHigherLevel
                  ? `Khóa học này được thiết kế theo chuẩn định biên của ${course.targetLevelTitle}. Học viên cấp dưới có thể tự đăng ký học nâng cao kỹ năng.`
                  : 'Khóa học này mở tự do cho nhân viên. Bấm nút bên phải để ghi danh và bắt đầu học ngay!'}
              </p>
            </div>
            <Button
              variant="primary"
              icon="ti-plus"
              onClick={() => {
                enrollCourse(course.id);
              }}
            >
              {isHigherLevel ? 'Đăng Ký Học Nâng Cao' : 'Đăng Ký Học Ngay'}
            </Button>
          </div>
        </div>
      ) : (
        /* ENROLLED PROGRESS CARD */
        <div className="card card-pad" style={{ marginBottom: 16, borderColor: 'var(--blue)', borderWidth: 1.5 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700 }}>Tiến độ học tập của bạn</div>
              {course.courseType === 'MANDATORY' && (
                <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>Hạn hoàn thành: {formatDate(course.enrollment.dueDate)}</div>
              )}
            </div>
            <Badge tone={course.enrollment.status === 'COMPLETED' ? 'sage' : course.enrollment.status === 'OVERDUE' ? 'rust' : 'amber'}>
              {statusLabel(course.enrollment.status)}
            </Badge>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ flex: 1 }}>
              <ProgressBar value={course.enrollment.progressPercent} tone={course.enrollment.status === 'COMPLETED' ? 'sage' : 'blue'} />
            </div>
            <span style={{ fontSize: 13, fontWeight: 800 }}>{course.enrollment.progressPercent}%</span>
          </div>
        </div>
      )}

      {/* MODULES & LESSONS */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-pad" style={{ paddingBottom: 4 }}>
          <div className="section-label" style={{ margin: '0 0 4px' }}>Cấu trúc chương trình &amp; Các bài học</div>
        </div>
        <div className="card-pad" style={{ paddingTop: 4 }}>
          <ModuleList
            modules={course.modules || []}
            getLessonHref={(l) => {
              if (isPrereqLocked) return null;
              return l.lessonType === 'ASSESSMENT' ? null : `${basePath}/${course.id}/lessons/${l.id}`;
            }}
          />
        </div>
      </div>

      {/* FINAL ASSESSMENT */}
      {cfg.assessmentEnabled && (
        <div className="card card-pad" style={{ borderColor: assessmentUnlocked ? 'var(--sage)' : 'var(--line)', marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <div className="activity-icon" style={{ background: 'var(--blue-soft)', color: 'var(--blue)' }}>
                <i className="ti ti-writing" aria-hidden="true" />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>Bài thi đánh giá cuối khóa (Final Assessment)</div>
                <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
                  {cfg.questionsPerAttempt || 5} câu hỏi &middot; Thời gian: {cfg.assessmentTimeLimit || 15} phút &middot; Điểm đạt: {cfg.passingScorePercent || 80}% &middot; Tối đa {cfg.maxAttempts || 3} lần thi
                </div>
              </div>
            </div>

            {assessmentUnlocked ? (
              <Button variant="primary" icon="ti-player-play" onClick={() => navigate(`${basePath}/${course.id}/assessment`)}>
                Vào Làm Bài Thi
              </Button>
            ) : (
              <Badge tone="slate" icon="ti-lock">Hoàn thành bài học để mở bài thi</Badge>
            )}
          </div>
        </div>
      )}
    </>
  );
}
