import React, { useMemo, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Badge, ProgressBar, Button, ModuleList, CourseTypeBadge, Modal, JobLevelBadge, LevelAccessBadge, CertificateModal } from '../../features/common/ui';
import { useCourseStore } from '../../store/CourseStore';
import { currentUser, resolveCourseView, deriveCertificates, deriveLessonStatuses } from '../../data/mockData';
import { ACCESS_STATE, levelShortLabel, nextLevelUp } from '../../data/levelSystem';
import { getCourseImage } from '../../data/courseImages';
import { getAssignedCurriculaForUser } from '../../utils/curriculumAssignment';
import { computeLifecycleStatus } from '../../utils/courseCatalog';
import { computeCourseRecertification, RECERTIFICATION_STATE } from '../../utils/recertification';


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
  const { courses, currentUser: authUser, enrollCourse, accessFor, requestLevelAdvanceApproval, myEnrollments, curricula } = useCourseStore();
  const user = authUser || currentUser;
  const rawCourse = courses.find((c) => c.id === courseId);
  const [requestOpen, setRequestOpen] = useState(false);
  const [justification, setJustification] = useState('');
  const [notice, setNotice] = useState(null);

  const assignedCurricula = useMemo(() => getAssignedCurriculaForUser(curricula, user), [curricula, user]);
  const parentCurriculum = useMemo(() => {
    if (!courseId) return null;
    return assignedCurricula.find((cur) => (cur.courseIds || []).includes(courseId));
  }, [assignedCurricula, courseId]);

  // Gộp ghi danh phát sinh trong phiên (ví dụ vừa được duyệt học vượt cấp).
  const rawEnrollment = rawCourse ? (myEnrollments[rawCourse.id] || rawCourse.enrollment) : null;
  // Đa phiên bản: CHỈ phục vụ snapshot đóng băng cho người ĐÃ GHI DANH (bảo vệ
  // họ khỏi các Publish sau này) — người chưa ghi danh luôn thấy phiên bản mới
  // nhất khi xem/chuẩn bị đăng ký, không áp dụng resolveCourseView cho họ.
  const versionedCourse = rawCourse
    ? (rawEnrollment ? resolveCourseView(rawCourse, rawEnrollment.enrolledVersion) : rawCourse)
    : null;
  const course = versionedCourse
    ? { ...versionedCourse, enrollment: rawEnrollment, modules: deriveLessonStatuses(versionedCourse.modules, rawEnrollment) }
    : null;

  const allRequiredLessons = useMemo(() => {
    if (!course || !course.modules) return [];
    return course.modules.flatMap((m) => m.lessons.filter((l) => l.isRequired && l.lessonType !== 'ASSESSMENT'));
  }, [course]);

  // Chứng chỉ (nếu có) cho đúng khóa đang xem — chỉ tồn tại khi đã hoàn thành
  // và khóa có bật certificateEnabled (xem deriveCertificates() trong mockData.js).
  const certificate = useMemo(() => {
    if (!course) return null;
    return deriveCertificates(courses, user, myEnrollments).find((cert) => cert.courseId === course.id) || null;
  }, [courses, user, course, myEnrollments]);

  const recert = useMemo(() => {
    return computeCourseRecertification(course, course?.enrollment, certificate);
  }, [course, certificate]);

  const [showCertificate, setShowCertificate] = useState(false);
  const [previewDoc, setPreviewDoc] = useState(null);

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
  // Khóa Đã Đóng mà chưa từng ghi danh: catalog giờ vẫn cho xem lại (đánh dấu
  // "Đã qua thời gian tham gia" thay vì ẩn hẳn như trước), nhưng chắc chắn
  // không cho đăng ký mới — cửa sổ ghi danh đã hết hạn.
  const isRegistrationClosed = !course.enrollment && computeLifecycleStatus(course) === 'CLOSED';

  const completedRequired = allRequiredLessons.filter((l) => l.status === 'COMPLETED').length;
  const completionPct = allRequiredLessons.length
    ? Math.round((completedRequired / allRequiredLessons.length) * 100)
    : 100;
  const cfg = course.configuration || {};
  const access = accessFor(course, user);
  const isLevelLocked = access.isLevelLocked;
  const assessmentUnlocked = ((!isPrereqLocked && !isLevelLocked && completionPct >= 100) || recert.needsRecertification) && cfg.assessmentEnabled;

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
      <div className="card" style={{ marginBottom: 20, overflow: 'hidden', border: '1px solid var(--line)' }}>
        <div style={{ position: 'relative', width: '100%', height: 180, background: 'var(--paper-sunken)' }}>
          <img
            src={getCourseImage(course)}
            alt={course.title}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 60%)' }} />
          <div style={{ position: 'absolute', bottom: 16, left: 16, right: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 8 }}>
            <div>
              <div style={{ display: 'flex', gap: 6, marginBottom: 4, alignItems: 'center' }}>
                <span style={{ background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(4px)', color: '#fff', padding: '2px 6px', borderRadius: 4, fontSize: 11, fontFamily: 'var(--font-mono)' }}>
                  {course.code}
                </span>
                <CourseTypeBadge courseType={course.courseType} />
              </div>
              <h1 style={{ color: '#fff', fontSize: 22, fontWeight: 800, margin: 0, textShadow: '0 2px 4px rgba(0,0,0,0.6)' }}>
                {course.title}
              </h1>
            </div>
            <div style={{ color: 'rgba(255,255,255,0.9)', fontSize: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
              <span>{course.category || course.domain}</span>
              <span>&middot;</span>
              <span>{course.estimatedDuration || '3h'}</span>
              <span>&middot;</span>
              <span>{course.version || 'v2.1'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* RECERTIFICATION ALERT BANNER */}
      {recert.needsRecertification && (
        <div
          className="card card-pad"
          style={{
            marginBottom: 16,
            borderLeft: `4px solid ${recert.isExpired ? 'var(--rust)' : 'var(--amber)'}`,
            background: recert.isExpired ? 'var(--rust-soft)' : 'var(--amber-soft)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 8,
                background: recert.isExpired ? 'var(--rust)' : 'var(--amber)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 20,
                flexShrink: 0,
              }}
            >
              <i className={`ti ${recert.isExpired ? 'ti-alert-circle' : 'ti-clock'}`} />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: recert.isExpired ? 'var(--rust-soft-text)' : 'var(--amber-soft-text)' }}>
                {recert.statusLabel}
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--ink-soft)', marginTop: 2 }}>
                {recert.alertMessage}
              </div>
            </div>
          </div>
          {cfg.assessmentEnabled && (
            <Button
              variant="primary"
              tone={recert.isExpired ? 'danger' : 'primary'}
              icon="ti-refresh"
              onClick={() => navigate(`${basePath}/${course.id}/assessment`)}
            >
              {recert.actionLabel}
            </Button>
          )}
        </div>
      )}

      {parentCurriculum && (
        <div className="card card-pad" style={{ marginBottom: 16, borderLeft: '4px solid var(--rail, #6366f1)', background: 'rgba(99,102,241,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 38, height: 38, borderRadius: 8, background: 'var(--rail)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
              <i className="ti ti-books" />
            </div>
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--ink)' }}>
                Khóa học thuộc Giáo Trình Bắt Buộc: <strong>{parentCurriculum.title}</strong>
              </div>
              <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 2 }}>
                Khóa học này nằm trong lộ trình giáo trình được gán bắt buộc cho bạn.
                {parentCurriculum.assignedVia?.dueDate ? ` Hạn hoàn thành: ${parentCurriculum.assignedVia.dueDate}.` : ''}
              </div>
            </div>
          </div>
          <Button size="sm" variant="outline" icon="ti-arrow-left" onClick={() => navigate(basePath)}>
            Xem Danh Sách Giáo Trình
          </Button>
        </div>
      )}

      {notice && (
        <div className="card card-pad" style={{ marginBottom: 16, borderLeft: '4px solid var(--sage)', background: '#F0FDF4', fontSize: 13, color: '#166534', fontWeight: 600 }}>
          <i className="ti ti-info-circle" style={{ marginRight: 6 }} />
          {notice}
        </div>
      )}

      {course.isArchivedVersionView && (
        <div className="card card-pad" style={{ marginBottom: 16, borderLeft: '4px solid var(--amber)', background: '#FFFBEB', fontSize: 12.5, color: '#92400E' }}>
          <i className="ti ti-history" style={{ marginRight: 6 }} />
          Bạn đã ghi danh khóa học này ở phiên bản <strong>{course.version}</strong>. Nội dung bài giảng vẫn được giữ nguyên như lúc bạn bắt đầu học, dù khóa học hiện đã có phiên bản mới hơn.
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

      {isRegistrationClosed ? (
        /* ĐÃ QUA THỜI GIAN THAM GIA — chưa từng ghi danh và cửa sổ đăng ký đã hết hạn */
        <div className="card card-pad empty-state" style={{ marginBottom: 20 }}>
          <i className="ti ti-lock" aria-hidden="true" style={{ color: 'var(--rust)' }} />
          <p>Khóa học này đã qua thời gian tham gia (hết hạn ghi danh) và bạn chưa từng đăng ký. Không thể đăng ký mới cho khóa đã đóng.</p>
        </div>
      ) : isLevelLocked ? (
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
            <Badge tone={recert.needsRecertification ? recert.badgeTone : course.enrollment.status === 'COMPLETED' ? 'sage' : course.enrollment.status === 'OVERDUE' ? 'rust' : 'amber'}>
              {recert.needsRecertification ? recert.statusLabel : statusLabel(course.enrollment.status)}
            </Badge>

          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ flex: 1 }}>
              <ProgressBar value={course.enrollment.progressPercent} tone={course.enrollment.status === 'COMPLETED' ? 'sage' : 'blue'} />
            </div>
            <span style={{ fontSize: 13, fontWeight: 800 }}>{course.enrollment.progressPercent}%</span>
          </div>

          {course.enrollment.status === 'COMPLETED' && certificate && (
            <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px dashed var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <div className="activity-icon" style={{ width: 40, height: 40, background: '#FEF3C7', color: '#B45309', borderRadius: 10 }}>
                  <i className="ti ti-certificate" style={{ fontSize: 20 }} aria-hidden="true" />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13.5 }}>Chứng chỉ đã cấp</div>
                  <div style={{ fontSize: 11.5, color: 'var(--ink-faint)', fontFamily: 'var(--font-mono)' }}>{certificate.id}</div>
                </div>
              </div>
              <Button size="sm" variant="primary" icon="ti-eye" onClick={() => setShowCertificate(true)}>
                Xem Chứng Chỉ
              </Button>
            </div>
          )}
        </div>
      )}

      {/* KHÓA HỌC THỰC HÀNH TRỰC TIẾP (IN-PERSON WORKSHOP / ILT) */}
      {course.deliveryType === 'IN_PERSON_CLASSROOM' ? (
        <InPersonClassroomCard
          course={course}
          isLocked={isPrereqLocked || isLevelLocked}
          isEnrolled={Boolean(course.enrollment)}
          onPreviewDoc={setPreviewDoc}
        />
      ) : course.deliveryType === 'ONLINE_ELEARNING' && course.onlineClassType === 'VIRTUAL_CLASS' ? (
        <VirtualClassCard
          course={course}
          isLocked={isPrereqLocked || isLevelLocked}
          isEnrolled={Boolean(course.enrollment)}
          onPreviewDoc={setPreviewDoc}
        />
      ) : (
        <>
          {/* MODULES & LESSONS */}
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-pad" style={{ paddingBottom: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="section-label" style={{ margin: '0 0 4px' }}>Cấu trúc chương trình &amp; Các bài học</div>
              {recert.needsRecertification && recert.isFullCourse && (
                <Badge tone="amber" icon="ti-refresh" size="sm">
                  Đã Mở Lại Toàn Bộ Bài Học Để Ôn Tập
                </Badge>
              )}
            </div>
            <div className="card-pad" style={{ paddingTop: 4 }}>
              <ModuleList
                modules={course.modules || []}
                disabled={isLevelLocked || isRegistrationClosed}
                getLessonHref={(l) => {
                  if (isPrereqLocked || isLevelLocked || isRegistrationClosed) return null;
                  return l.lessonType === 'ASSESSMENT' ? null : `${basePath}/${course.id}/lessons/${l.id}`;
                }}
              />
            </div>
          </div>

          {/* FINAL ASSESSMENT */}
          {cfg.assessmentEnabled && (
            <div className="card card-pad" style={{ borderColor: assessmentUnlocked ? (recert.needsRecertification ? (recert.isExpired ? 'var(--rust)' : 'var(--amber)') : 'var(--sage)') : 'var(--line)', marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <div className="activity-icon" style={{ background: recert.needsRecertification ? (recert.isExpired ? 'var(--rust-soft)' : 'var(--amber-soft)') : 'var(--blue-soft)', color: recert.needsRecertification ? (recert.isExpired ? 'var(--rust)' : 'var(--amber)') : 'var(--blue)' }}>
                    <i className={`ti ${recert.needsRecertification ? 'ti-refresh-alert' : 'ti-writing'}`} aria-hidden="true" />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>
                      {recert.needsRecertification ? 'Bài Thi Tái Sát Hạch Chuẩn Hóa (Recertification Exam)' : 'Bài thi đánh giá cuối khóa (Final Assessment)'}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
                      {cfg.questionsPerAttempt || 5} câu hỏi &middot; Thời gian: {cfg.assessmentTimeLimit || 15} phút &middot; Điểm đạt: {cfg.passingScorePercent || 80}% &middot; Tối đa {cfg.maxAttempts || 3} lần thi
                    </div>
                  </div>
                </div>

                {assessmentUnlocked ? (
                  <Button
                    variant="primary"
                    tone={recert.needsRecertification ? (recert.isExpired ? 'danger' : 'primary') : 'primary'}
                    icon={recert.needsRecertification ? 'ti-refresh' : 'ti-player-play'}
                    onClick={() => navigate(`${basePath}/${course.id}/assessment`)}
                  >
                    {recert.needsRecertification ? recert.actionLabel : 'Vào Làm Bài Thi'}
                  </Button>
                ) : (
                  <Badge tone="slate" icon="ti-lock">
                    {isLevelLocked ? 'Khóa học chưa được mở theo cấp bậc' : 'Hoàn thành bài học để mở bài thi'}
                  </Badge>
                )}
              </div>
            </div>
          )}
        </>
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

      {/* MODAL: XEM CHỨNG CHỈ */}
      <CertificateModal
        certificate={certificate}
        isOpen={showCertificate}
        onClose={() => setShowCertificate(false)}
      />

      {/* MODAL: XEM TRƯỚC GIÁO TRÌNH & TÀI LIỆU (EMBEDDED VIEWER) */}
      <DocumentPreviewModal
        material={previewDoc}
        isOpen={Boolean(previewDoc)}
        onClose={() => setPreviewDoc(null)}
      />
    </>
  );
}

const VC_PLATFORM_LABEL = {
  TEAMS: 'Microsoft Teams', ZOOM: 'Zoom', MEET: 'Google Meet', WEBEX: 'Cisco Webex', CUSTOM: 'Nền tảng trực tuyến',
};
const VC_PLATFORM_ICON = {
  TEAMS: 'ti-brand-teams', ZOOM: 'ti-video', MEET: 'ti-brand-google', WEBEX: 'ti-device-tv', CUSTOM: 'ti-broadcast',
};

function CopyField({ label, value }) {
  const [copied, setCopied] = useState(false);
  if (!value) return null;
  return (
    <div>
      <div style={{ fontSize: 11, color: 'var(--ink-soft)', marginBottom: 2 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700 }}>{value}</span>
        <button
          type="button"
          className="icon-btn"
          aria-label={`Copy ${label}`}
          onClick={async () => {
            try { await navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* clipboard unavailable */ }
          }}
        >
          <i className={`ti ${copied ? 'ti-check' : 'ti-copy'}`} aria-hidden="true" style={{ color: copied ? 'var(--sage)' : undefined }} />
        </button>
      </div>
    </div>
  );
}

/* =========================================================================
   COMPONENTS: KHÓA HỌC TRỰC TIẾP / TRỰC TUYẾN / E-LEARNING SYLLABUS & MATERIALS
   ========================================================================= */

function InPersonClassroomCard({ course, isLocked, isEnrolled, onPreviewDoc }) {
  const syllabus = course.syllabus || [];
  const materials = course.materials || [];

  return (
    <div className="card" style={{ marginBottom: 20, overflow: 'hidden', borderColor: 'var(--blue)' }}>
      {/* Top Banner Header */}
      <div
        className="card-pad"
        style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10,
          background: 'linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)',
          borderBottom: '1px solid #BFDBFE',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--blue)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
            <i className="ti ti-building-store" />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 14, color: '#1E3A8A' }}>
              Khóa Đào Tạo Trực Tiếp &amp; Xưởng Thực Hành (In-Person Workshop)
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--blue)' }}>
              Đào tạo tại chỗ kèm thực hành SOP &middot; Điểm danh qua quét mã QR Giảng viên
            </div>
          </div>
        </div>
        <Badge tone="blue" icon="ti-qrcode">Quét QR Điểm Danh</Badge>
      </div>

      <div className="card-pad">
        {/* Logistics Grid */}
        <div className="grid grid-2" style={{ marginBottom: 16, gap: 16, background: 'var(--paper-sunken)', borderRadius: 8, padding: 14 }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--ink-soft)', marginBottom: 4 }}>Giảng viên đứng lớp</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--blue)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 12 }}>
                {(course.trainerName || 'GV').split(' ').filter(Boolean).slice(-2).map((s) => s[0]).join('').toUpperCase()}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13 }}>{course.trainerName || 'Giảng viên Chuyên trách'}</div>
                <div style={{ fontSize: 11.5, color: 'var(--ink-soft)' }}>Master Trainer &middot; Ban Đào tạo L&amp;OD</div>
              </div>
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--ink-soft)', marginBottom: 4 }}>Địa điểm &amp; Thời gian</div>
            <div style={{ fontSize: 13, fontWeight: 700 }}>{course.venue || 'Xưởng Thực Hành MM Mega Market'}</div>
            <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 2 }}>
              {formatDate(course.scheduleDate || course.startDate)} &middot; {course.scheduleTime || '08:30 - 11:30 (3.0 tiếng)'}
            </div>
          </div>
        </div>

        {/* Section 1: Session Agenda & Syllabus */}
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--blue)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
            <i className="ti ti-list-check" /> Khung Chương Trình Buổi Học (Session Agenda &amp; Syllabus)
          </div>
          {syllabus.length === 0 ? (
            <div style={{ fontSize: 12.5, color: 'var(--ink-soft)', fontStyle: 'italic', padding: '10px 0' }}>
              Chưa cập nhật khung bài giảng chi tiết.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {syllabus.map((item, idx) => (
                <div key={idx} style={{ background: '#fff', borderRadius: 8, padding: '10px 14px', border: '1px solid var(--line)' }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ background: 'var(--blue)', color: '#fff', borderRadius: '50%', width: 20, height: 20, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, flexShrink: 0 }}>
                      {idx + 1}
                    </span>
                    {item.step}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 4, marginLeft: 28 }}>
                    {item.detail}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Section 2: Pre-Class Materials & Downloads */}
        <div style={{ borderTop: '1px solid var(--line)', paddingTop: 16, marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--bigc-green, #007A38)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <i className="ti ti-paperclip" /> Giáo Trình &amp; Slide Đính Kèm (Pre-Class Materials &amp; Downloads)
            </div>
            <span style={{ fontSize: 11.5, color: 'var(--ink-soft)' }}>Học viên tải về hoặc xem trực tuyến để chuẩn bị bài trước khi đến lớp</span>
          </div>

          {materials.length === 0 ? (
            <div style={{ fontSize: 12.5, color: 'var(--ink-soft)', fontStyle: 'italic', padding: '10px 0' }}>
              Chưa có tài liệu đính kèm cho buổi học này.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {materials.map((mat, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#F8FAFC', border: '1px solid var(--line)', borderRadius: 8, padding: '10px 14px', flexWrap: 'wrap', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, overflow: 'hidden' }}>
                    <i
                      className={mat.type === 'PDF' ? 'ti ti-file-type-pdf' : mat.type === 'PPT' ? 'ti ti-file-type-ppt' : mat.type === 'DOC' ? 'ti ti-file-type-doc' : 'ti ti-link'}
                      style={{ fontSize: 24, color: mat.type === 'PDF' ? 'var(--rust)' : mat.type === 'PPT' ? 'var(--amber)' : 'var(--blue)', flexShrink: 0 }}
                    />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>{mat.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--ink-soft)' }}>Định dạng: {mat.type} &middot; Dung lượng: {mat.size || '2.5 MB'}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <Button
                      size="sm"
                      variant="outline"
                      icon="ti-eye"
                      onClick={() => onPreviewDoc(mat)}
                    >
                      Xem Trực Tuyến
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      icon="ti-download"
                      onClick={() => alert(`Đang tải về máy tài liệu: ${mat.name}`)}
                    >
                      Tải Về Máy
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Attendance instructions footer */}
        <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#166534', display: 'flex', alignItems: 'center', gap: 8 }}>
          <i className="ti ti-info-circle" style={{ fontSize: 16 }} />
          <span>Buổi học thực hành không yêu cầu bài thi online. Giảng viên sẽ mở mã Live QR tại lớp để bạn quét mã điểm danh và hoàn tất khóa học.</span>
        </div>
      </div>
    </div>
  );
}

function VirtualClassCard({ course, isLocked, isEnrolled, onPreviewDoc }) {
  const vm = course.virtualMeeting || {};
  const isCompleted = vm.status === 'COMPLETED';
  const syllabus = course.syllabus || [];
  const materials = course.materials || vm.materials || [];

  return (
    <div className="card" style={{ marginBottom: 20, overflow: 'hidden', borderColor: isCompleted ? 'var(--line)' : 'var(--amber)' }}>
      <div
        className="card-pad"
        style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10,
          background: isCompleted ? 'var(--paper-sunken)' : 'var(--amber-soft)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <i className={`ti ${VC_PLATFORM_ICON[vm.platform] || 'ti-video'}`} style={{ fontSize: 18, color: isCompleted ? 'var(--ink-soft)' : 'var(--amber-soft-text)' }} />
          <span style={{ fontWeight: 800, fontSize: 13.5 }}>Lớp Học Trực Tuyến Trực Tiếp &middot; {VC_PLATFORM_LABEL[vm.platform] || 'Trực tuyến'}</span>
        </div>
        <Badge tone={isCompleted ? 'slate' : 'amber'} icon={isCompleted ? 'ti-circle-check' : 'ti-clock-hour-4'}>
          {isCompleted ? 'Đã Kết Thúc' : 'Sắp Diễn Ra'}
        </Badge>
      </div>

      <div className="card-pad">
        <div className="grid grid-2" style={{ marginBottom: 16, gap: 16 }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--ink-soft)', marginBottom: 4 }}>Giảng viên chủ trì</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--rail)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 12 }}>
                {(vm.instructorName || '?').split(' ').filter(Boolean).slice(-2).map((s) => s[0]).join('').toUpperCase()}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13 }}>{vm.instructorName || 'Chưa phân công'}</div>
                <div style={{ fontSize: 11.5, color: 'var(--ink-soft)' }}>{vm.instructorTitle}</div>
              </div>
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--ink-soft)', marginBottom: 4 }}>Lịch học</div>
            <div style={{ fontSize: 13, fontWeight: 700 }}>{formatDate(vm.scheduleDate)}</div>
            <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>{vm.scheduleTime}</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'center', background: 'var(--paper-sunken)', borderRadius: 8, padding: '12px 16px', marginBottom: 16 }}>
          <CopyField label="Meeting ID" value={vm.meetingId} />
          <CopyField label="Passcode" value={vm.passcode} />
          <div>
            <div style={{ fontSize: 11, color: 'var(--ink-soft)', marginBottom: 2 }}>Sức chứa</div>
            <span style={{ fontSize: 13, fontWeight: 700 }}>Tối đa {vm.maxCapacity || 0} học viên</span>
          </div>
        </div>

        {isLocked ? (
          <Badge tone="slate" icon="ti-lock">Khóa học chưa được mở — tham gia phòng họp sau khi đủ điều kiện</Badge>
        ) : !isEnrolled ? (
          <Badge tone="slate" icon="ti-info-circle">Ghi danh khóa học ở trên để nhận đường dẫn tham gia</Badge>
        ) : isCompleted ? (
          <Badge tone="sage" icon="ti-circle-check">Buổi học đã kết thúc &middot; Giảng viên đã điểm danh qua Cổng Giảng Dạy</Badge>
        ) : (
          <Button
            variant="primary"
            size="lg"
            icon="ti-video"
            onClick={() => window.open(vm.meetingUrl, '_blank', 'noopener,noreferrer')}
            disabled={!vm.meetingUrl}
          >
            Tham Gia Lớp Học Trực Tuyến
          </Button>
        )}

        {/* Section 1: Session Agenda & Syllabus */}
        {syllabus.length > 0 && (
          <div style={{ marginTop: 20, borderTop: '1px solid var(--line)', paddingTop: 16 }}>
            <div style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--blue)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
              <i className="ti ti-list-check" /> Khung Chương Trình Buổi Học (Session Agenda)
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {syllabus.map((item, idx) => (
                <div key={idx} style={{ background: '#fff', borderRadius: 8, padding: '10px 14px', border: '1px solid var(--line)' }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ background: 'var(--blue)', color: '#fff', borderRadius: '50%', width: 20, height: 20, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800 }}>
                      {idx + 1}
                    </span>
                    {item.step}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 4, marginLeft: 28 }}>
                    {item.detail}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Section 2: Pre-Class Materials */}
        {materials.length > 0 && (
          <div style={{ marginTop: 16, borderTop: '1px solid var(--line)', paddingTop: 14 }}>
            <div className="section-label" style={{ margin: '0 0 8px' }}>Tài liệu &amp; Slide đính kèm</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {materials.map((mat, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--paper-sunken)', borderRadius: 6, padding: '8px 12px', flexWrap: 'wrap', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <i
                      className={mat.type === 'PDF' ? 'ti ti-file-type-pdf' : mat.type === 'PPT' ? 'ti ti-file-type-ppt' : 'ti ti-paperclip'}
                      style={{ fontSize: 20, color: mat.type === 'PDF' ? 'var(--rust)' : mat.type === 'PPT' ? 'var(--amber)' : 'var(--blue)' }}
                    />
                    <div>
                      <div style={{ fontSize: 12.5, fontWeight: 700 }}>{mat.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--ink-soft)' }}>{mat.type} &middot; {mat.size || '2.0 MB'}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <Button size="sm" variant="outline" icon="ti-eye" onClick={() => onPreviewDoc(mat)}>
                      Xem Trực Tuyến
                    </Button>
                    <Button size="sm" variant="ghost" icon="ti-download" onClick={() => alert(`Đang tải về: ${mat.name}`)}>
                      Tải Về
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ marginTop: 14, fontSize: 11.5, color: 'var(--ink-faint)' }}>
          Không có bài thi cuối khóa — hoàn thành khóa học được ghi nhận khi bạn tham gia đầy đủ buổi học (Giảng viên điểm danh).
        </div>
      </div>
    </div>
  );
}

function DocumentPreviewModal({ material, isOpen, onClose }) {
  if (!material || !isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Xem Trước Tài Liệu: ${material.name}`}
      subtitle={`Định dạng: ${material.type} · Dung lượng: ${material.size || '2.5 MB'}`}
      size="lg"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Simulated Document Reader Top Toolbar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--paper-sunken)', padding: '8px 12px', borderRadius: 8, flexWrap: 'wrap', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Badge tone={material.type === 'PDF' ? 'rust' : material.type === 'PPT' ? 'amber' : 'blue'}>
              {material.type}
            </Badge>
            <span style={{ fontSize: 12, fontWeight: 600 }}>Trang 1 / 18</span>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button type="button" className="btn btn-sm btn-ghost" title="Thu nhỏ">
              <i className="ti ti-zoom-out" />
            </button>
            <span style={{ fontSize: 12, display: 'flex', alignItems: 'center' }}>100%</span>
            <button type="button" className="btn btn-sm btn-ghost" title="Phóng to">
              <i className="ti ti-zoom-in" />
            </button>
            <Button
              size="sm"
              variant="primary"
              icon="ti-download"
              onClick={() => alert(`Đang tải về máy tài liệu: ${material.name}`)}
            >
              Tải File
            </Button>
          </div>
        </div>

        {/* Simulated Document Canvas View */}
        <div style={{
          background: '#475569',
          borderRadius: 8,
          padding: 24,
          minHeight: 380,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.2)',
        }}>
          <div style={{
            background: '#FFFFFF',
            width: '100%',
            maxWidth: 520,
            borderRadius: 6,
            padding: '36px 32px',
            boxShadow: '0 8px 30px rgba(0,0,0,0.25)',
            color: '#1E293B',
            textAlign: 'left',
          }}>
            <div style={{ borderBottom: '2px solid #007A38', paddingBottom: 12, marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 800, color: '#007A38', textTransform: 'uppercase', letterSpacing: 1 }}>MM Mega Market Vietnam &middot; L&amp;OD</div>
                <div style={{ fontSize: 15, fontWeight: 800, color: '#0F172A', marginTop: 2 }}>{material.name}</div>
              </div>
              <i className="ti ti-certificate" style={{ fontSize: 28, color: '#007A38' }} />
            </div>

            <div style={{ fontSize: 12.5, lineHeight: 1.6, color: '#334155', marginBottom: 14 }}>
              <strong>Mục đích tài liệu:</strong> Chuẩn hóa toàn bộ quy trình thực hành, nguyên tắc bảo hộ lao động và tiêu chuẩn kiểm soát chất lượng tại chi nhánh siêu thị.
            </div>

            <div style={{ background: '#F1F5F9', borderRadius: 6, padding: '12px 14px', marginBottom: 14, fontSize: 12 }}>
              <div style={{ fontWeight: 700, marginBottom: 4, color: '#0F172A' }}>Các nội dung chính trong tài liệu:</div>
              <ul style={{ margin: 0, paddingLeft: 18, color: '#475569' }}>
                <li>Quy định an toàn lao động &amp; bảo hộ cá nhân (PPE).</li>
                <li>Quy trình thao tác chuẩn từng bước (SOP) theo chuẩn Gold HACCP.</li>
                <li>Checklist kiểm tra trước và sau ca làm việc.</li>
                <li>Xử lý sự cố phát sinh &amp; báo cáo cho Quản lý ca trực.</li>
              </ul>
            </div>

            <div style={{ fontSize: 11, color: '#94A3B8', borderTop: '1px dashed #CBD5E1', paddingTop: 10, display: 'flex', justifyContent: 'space-between' }}>
              <span>Ban Đào Tạo &amp; Phát Triển MMVN</span>
              <span>Lưu hành nội bộ &middot; 2026</span>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Button variant="ghost" onClick={onClose}>Đóng</Button>
          <Button
            variant="primary"
            icon="ti-download"
            onClick={() => alert(`Đang tải về: ${material.name}`)}
          >
            Tải File Về Máy ({material.size || '2.5 MB'})
          </Button>
        </div>
      </div>
    </Modal>
  );
}
