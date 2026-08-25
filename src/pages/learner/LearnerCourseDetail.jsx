import React, { useMemo, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Badge, ProgressBar, Button, ModuleList, CourseTypeBadge, Modal, JobLevelBadge, LevelAccessBadge } from '../../components/ui';
import { useCourseStore } from '../../state/CourseStore';
import { currentUser } from '../../data/mockData';
import { ACCESS_STATE, levelShortLabel, nextLevelUp } from '../../data/levelSystem';

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
  const { courses, currentUser: authUser, enrollCourse, accessFor, requestLevelAdvanceApproval, myEnrollments } = useCourseStore();
  const user = authUser || currentUser;
  const rawCourse = courses.find((c) => c.id === courseId);
  const [requestOpen, setRequestOpen] = useState(false);
  const [justification, setJustification] = useState('');
  const [notice, setNotice] = useState(null);

  // Gộp ghi danh phát sinh trong phiên (ví dụ vừa được duyệt học vượt cấp).
  const course = rawCourse
    ? { ...rawCourse, enrollment: myEnrollments[rawCourse.id] || rawCourse.enrollment }
    : null;

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

  // Điều kiện tiên quyết được đối chiếu với ghi danh thật của học viên
  // (ma trận HRIS + overlay), không phải field `enrollment` của object khóa học.
  const unmetPrerequisites = (course.prerequisites || []).filter((pid) => {
    const p = courses.find((c) => c.id === pid);
    return !p || myEnrollments[pid]?.status !== 'COMPLETED';
  });
  const isPrereqLocked = unmetPrerequisites.length > 0;

  const completedRequired = allRequiredLessons.filter((l) => l.status === 'COMPLETED').length;
  const completionPct = allRequiredLessons.length
    ? Math.round((completedRequired / allRequiredLessons.length) * 100)
    : 100;
  const cfg = course.configuration || {};
  const access = accessFor(course, user);
  const isLevelLocked = access.isLevelLocked;
  const assessmentUnlocked = !isPrereqLocked && !isLevelLocked && completionPct >= 100 && cfg.assessmentEnabled;

  function submitRequest() {
    const result = requestLevelAdvanceApproval(course, justification, user);
    setRequestOpen(false);
    setNotice(
      result.ok
        ? 'Đã gửi đơn xin học vượt cấp tới Quản lý trực tiếp. Khóa học sẽ mở ngay khi được phê duyệt.'
        : result.reason
    );
  }

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

      {notice && (
        <div className="card card-pad" style={{ marginBottom: 16, borderLeft: '4px solid var(--sage)', background: '#F0FDF4', fontSize: 13, color: '#166534', fontWeight: 600 }}>
          <i className="ti ti-info-circle" style={{ marginRight: 6 }} />
          {notice}
        </div>
      )}

      {/* BẢNG SO SÁNH CẤP BẬC & QUYỀN TRUY CẬP */}
      <div className="card card-pad" style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>Cấp bậc của bạn:</span>
          <JobLevelBadge level={access.userLevel} />
          <i className="ti ti-arrow-right" style={{ color: 'var(--ink-faint)' }} />
          <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>Cấp bậc khóa học:</span>
          <JobLevelBadge level={access.courseLevel} />
        </div>
        <LevelAccessBadge access={access} />
      </div>

      {isLevelLocked ? (
        /* KHÓA BỞI QUY TẮC CẤP BẬC TUẦN TỰ */
        <div
          className="card card-pad"
          style={{
            marginBottom: 20,
            borderLeft: `4px solid ${access.state === ACCESS_STATE.LOCKED_LEVEL_GAP ? 'var(--rust)' : 'var(--blue)'}`,
            background: access.state === ACCESS_STATE.LOCKED_LEVEL_GAP ? '#FEF2F2' : '#EFF6FF',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
            <div style={{ maxWidth: 640 }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: access.state === ACCESS_STATE.LOCKED_LEVEL_GAP ? '#991B1B' : '#1E40AF', marginBottom: 4 }}>
                {access.state === ACCESS_STATE.LOCKED_LEVEL_GAP
                  ? '⛔ Bị Chặn Nhảy Cóc Cấp Bậc'
                  : access.state === ACCESS_STATE.PENDING_APPROVAL
                    ? '⏳ Đơn Học Vượt Cấp Đang Chờ Duyệt'
                    : '🔒 Khóa Học Vượt 1 Cấp — Cần Phê Duyệt'}
              </div>
              <p style={{ fontSize: 12.5, color: 'var(--ink-soft)', margin: 0, lineHeight: 1.5 }}>{access.reason}</p>

              {access.state === ACCESS_STATE.LOCKED_LEVEL_GAP && access.blockedRoadmap?.length > 0 && (
                <div style={{ marginTop: 10, display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 11.5, color: 'var(--ink-soft)' }}>Lộ trình bắt buộc phải đi qua:</span>
                  {access.blockedRoadmap.map((lvl, idx) => (
                    <React.Fragment key={lvl}>
                      {idx > 0 && <i className="ti ti-arrow-right" style={{ fontSize: 11, color: 'var(--ink-faint)' }} />}
                      <JobLevelBadge level={lvl} compact />
                    </React.Fragment>
                  ))}
                </div>
              )}
            </div>

            {access.requiresApproval && (
              <Button variant="primary" icon="ti-lock" onClick={() => setRequestOpen(true)}>
                🔒 Xin Phê Duyệt Học Vượt Cấp
              </Button>
            )}
          </div>
        </div>
      ) : isPrereqLocked ? (
        /* PREREQUISITES LOCKED */
        <div className="card card-pad empty-state" style={{ marginBottom: 20 }}>
          <i className="ti ti-lock" aria-hidden="true" />
          <p>Khóa học này yêu cầu bạn phải hoàn thành trước: {unmetPrerequisites.map((pid) => courses.find((c) => c.id === pid)?.title).join(', ')}.</p>
        </div>
      ) : !course.enrollment ? (
        /* CHƯA GHI DANH — ĐƯỢC PHÉP HỌC NGAY */
        <div
          className="card card-pad"
          style={{
            background: access.state === ACCESS_STATE.APPROVED ? 'linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 100%)' : '#EFF6FF',
            borderColor: access.state === ACCESS_STATE.APPROVED ? 'var(--sage)' : 'var(--blue)',
            marginBottom: 20,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, color: access.state === ACCESS_STATE.APPROVED ? '#166534' : '#1E40AF' }}>
                {access.state === ACCESS_STATE.APPROVED
                  ? `✅ Quản Lý Đã Duyệt Học Vượt Lên ${levelShortLabel(access.courseLevel)}`
                  : 'Khóa Học Thuộc Cấp Bậc Của Bạn — Học Ngay Không Cần Duyệt'}
              </div>
              <p style={{ fontSize: 12.5, color: 'var(--ink-soft)', margin: '2px 0 0' }}>
                {access.state === ACCESS_STATE.APPROVED
                  ? 'Bạn đã được phê duyệt riêng cho khóa học này. Bấm để ghi danh và bắt đầu.'
                  : 'Khóa học ở cấp bậc hiện tại hoặc thấp hơn của bạn nên mở tự do. Bấm để ghi danh và bắt đầu học.'}
              </p>
            </div>
            <Button variant="primary" icon="ti-plus" onClick={() => enrollCourse(course.id, user)}>
              {access.state === ACCESS_STATE.APPROVED ? 'Vào Học Ngay' : 'Đăng Ký Học Ngay'}
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
            disabled={isLevelLocked}
            getLessonHref={(l) => {
              if (isPrereqLocked || isLevelLocked) return null;
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
              <Badge tone="slate" icon="ti-lock">
                {isLevelLocked ? 'Khóa học chưa được mở theo cấp bậc' : 'Hoàn thành bài học để mở bài thi'}
              </Badge>
            )}
          </div>
        </div>
      )}

      {/* MODAL: GỬI ĐƠN XIN HỌC VƯỢT CẤP */}
      <Modal
        isOpen={requestOpen}
        onClose={() => setRequestOpen(false)}
        title="Đơn Xin Phê Duyệt Học Vượt Cấp"
        subtitle={`Xin học vượt từ ${levelShortLabel(access.userLevel)} lên ${levelShortLabel(access.courseLevel)} cho riêng khóa học này.`}
        size="md"
      >
        <div>
          <div style={{ background: 'var(--paper-sunken)', padding: '14px 16px', borderRadius: 8, marginBottom: 16 }}>
            <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 6 }}>{course.title}</div>
            <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
              Người duyệt: <strong>Quản lý trực tiếp ({user.managerId || 'Line Manager'})</strong> &middot; Khóa vượt đúng 1 cấp liền kề nên hợp lệ để xin.
            </div>
          </div>
          <label className="field-label">Lý do xin học vượt cấp</label>
          <textarea
            className="field-input"
            rows={4}
            style={{ resize: 'vertical', marginBottom: 16 }}
            placeholder="Nêu rõ lý do phát triển năng lực và mức độ sẵn sàng của bạn..."
            value={justification}
            onChange={(e) => setJustification(e.target.value)}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <Button variant="ghost" onClick={() => setRequestOpen(false)}>Hủy</Button>
            <Button variant="primary" icon="ti-send" onClick={submitRequest}>Gửi Đơn Cho Quản Lý</Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
