import React, { useMemo, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Badge, ProgressBar, Button, ModuleList, CourseTypeBadge, Modal, JobLevelBadge, LevelAccessBadge, CertificateModal } from '../../components/ui';
import { useCourseStore } from '../../state/CourseStore';
import { currentUser, resolveCourseView, deriveCertificates } from '../../data/mockData';
import { ACCESS_STATE, levelShortLabel, nextLevelUp } from '../../data/levelSystem';
import { getCourseImage } from '../../data/courseImages';
import { getAssignedCurriculaForUser } from '../../utils/curriculumAssignment';

function statusLabel(status) {
  switch (status) {
    case 'COMPLETED': return 'Đã Hoàn Thành';
    case 'IN_PROGRESS': return 'Đang Học';
    case 'OVERDUE': return 'Quá Hạn';
    case 'FAILED': return 'Cần Thi Lại';
    default: return 'Chưa Bắt Đầu';
  }
}

// `module.lessons[].status` trong dữ liệu khóa học gốc chỉ là placeholder
// tĩnh ("Not started" cho mọi người) — không tự khớp với enrollment.status/
// progressPercent thật của từng học viên. Không suy ra lại thì một khóa đã
// Hoàn Thành 100% vẫn hiện toàn bộ bài học "Not started", còn bài thi cuối
// khóa cũng bị coi là chưa đủ điều kiện mở dù đã có chứng chỉ.
function deriveLessonStatuses(modules, enrollment) {
  if (!modules) return modules;
  const status = enrollment?.status;
  if (!enrollment || status === 'NOT_STARTED') {
    return modules.map((m) => ({
      ...m,
      lessons: m.lessons.map((l) => (l.lessonType === 'ASSESSMENT' ? l : { ...l, status: 'NOT_STARTED' })),
    }));
  }
  if (status === 'COMPLETED') {
    return modules.map((m) => ({
      ...m,
      lessons: m.lessons.map((l) => ({ ...l, status: 'COMPLETED' })),
    }));
  }
  // IN_PROGRESS / OVERDUE / FAILED: đánh dấu hoàn thành đúng số bài tương ứng
  // với progressPercent đã ghi nhận, bài kế tiếp đang học dở, phần còn lại
  // chưa bắt đầu.
  const flat = modules.flatMap((m) => m.lessons.filter((l) => l.lessonType !== 'ASSESSMENT'));
  const completedCount = flat.length ? Math.round((flat.length * (enrollment.progressPercent || 0)) / 100) : 0;
  let seen = 0;
  return modules.map((m) => ({
    ...m,
    lessons: m.lessons.map((l) => {
      if (l.lessonType === 'ASSESSMENT') return l;
      seen += 1;
      if (seen <= completedCount) return { ...l, status: 'COMPLETED' };
      if (seen === completedCount + 1) return { ...l, status: 'IN_PROGRESS' };
      return { ...l, status: 'NOT_STARTED' };
    }),
  }));
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
    return deriveCertificates(courses, user).find((cert) => cert.courseId === course.id) || null;
  }, [courses, user, course]);
  const [showCertificate, setShowCertificate] = useState(false);

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
      <div className="card" style={{ marginBottom: 20, overflow: 'hidden', border: '1px solid var(--line)' }}>
        <div style={{ position: 'relative', width: '100%', height: 180, background: 'var(--paper-sunken)' }}>
          <img
            src={getCourseImage(course)}
            alt={course.title}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.7) 100%)' }} />
          <div style={{ position: 'absolute', bottom: 14, left: 16, right: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                <span style={{ background: 'rgba(255,255,255,0.9)', color: 'var(--ink)', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
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

      {/* LỚP HỌC TRỰC TUYẾN TRỰC TIẾP (VIRTUAL CLASS) — thay thế hoàn toàn khối
          Module/Bài học/Assessment: không có nội dung tự học, hoàn thành = đã
          tham gia buổi học. Điểm danh do Giảng viên đánh dấu qua trang Điểm
          Danh hiện có ở Cổng Giảng Dạy, học viên chỉ cần bấm tham gia. */}
      {course.deliveryType === 'ONLINE_ELEARNING' && course.onlineClassType === 'VIRTUAL_CLASS' ? (
        <VirtualClassCard course={course} isLocked={isPrereqLocked || isLevelLocked} isEnrolled={Boolean(course.enrollment)} />
      ) : (
        <>
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

      <CertificateModal
        certificate={certificate}
        isOpen={showCertificate}
        onClose={() => setShowCertificate(false)}
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

function VirtualClassCard({ course, isLocked, isEnrolled }) {
  const vm = course.virtualMeeting || {};
  const isCompleted = vm.status === 'COMPLETED';

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

        {vm.instructions && (
          <div style={{ marginTop: 16, fontSize: 12.5, color: 'var(--ink-soft)', lineHeight: 1.6 }}>
            <i className="ti ti-info-circle" style={{ marginRight: 6 }} />
            <strong>Chuẩn bị trước buổi học: </strong>{vm.instructions}
          </div>
        )}

        {(vm.materials || []).length > 0 && (
          <div style={{ marginTop: 16, borderTop: '1px solid var(--line)', paddingTop: 14 }}>
            <div className="section-label" style={{ margin: '0 0 8px' }}>Tài liệu đính kèm</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {vm.materials.map((m, i) => (
                <a key={i} href={m.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12.5, color: 'var(--rail)', display: 'flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}>
                  <i className="ti ti-paperclip" /> {m.name}
                </a>
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
