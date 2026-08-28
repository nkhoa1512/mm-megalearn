import React, { useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { applyLessonProgress, currentUser, resolveCourseView, deriveLessonStatuses } from '../../data/mockData';
import { Badge, Button, ProgressBar, JobLevelBadge } from '../../components/ui';
import { useCourseStore } from '../../state/CourseStore';
import { computeLifecycleStatus } from '../../utils/courseCatalog';

function flattenLessons(course) {
  return course.modules.flatMap((m) => m.lessons.map((l) => ({ ...l, moduleId: m.id })));
}

function youtubeVideoId(url) {
  if (!url) return null;
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([\w-]{11})/,
    /(?:youtu\.be\/)([\w-]{11})/,
    /(?:youtube\.com\/embed\/)([\w-]{11})/,
  ];
  for (const re of patterns) {
    const m = url.match(re);
    if (m) return m[1];
  }
  return null;
}

// 5 định dạng bài giảng chuẩn hóa — xem ghi chú ở mockData.js migration.
function lessonTypeLabel(t) {
  switch (t) {
    case 'SCORM': return 'SCORM 2004 Interactive Package';
    case 'VIDEO': return 'Video Lecture';
    case 'PDF': return 'Standard Operating Procedure (SOP PDF)';
    case 'PPT': return 'PowerPoint Presentation Deck';
    case 'EXTERNAL_LINK': return 'External Platform (Udemy / LinkedIn / Coursera / YouTube)';
    default: return 'Lesson';
  }
}

export default function LessonPlayer({ basePath = '/learner/courses' }) {
  const { courseId, lessonId } = useParams();
  const navigate = useNavigate();
  const { courses, saveCourseProgress, openSurveyModal, currentUser: authUser, accessFor, myEnrollments } = useCourseStore();
  const user = authUser || currentUser;
  const rawCourse = courses.find((c) => c.id === courseId);
  // Ghi danh nằm ở ma trận HRIS + overlay của store, không nằm trong object khóa học.
  const enrollment = rawCourse ? (myEnrollments[rawCourse.id] || rawCourse.enrollment) : null;
  // Đa phiên bản: CHỈ phục vụ snapshot đóng băng cho người ĐÃ GHI DANH dưới một
  // phiên bản CŨ đã bị Admin "Phát Hành Phiên Bản Mới" thay thế — người chưa
  // ghi danh (không nên xảy ra ở trang Lesson Player, nhưng để an toàn) luôn
  // thấy nội dung mới nhất.
  const versionedCourse = rawCourse
    ? (enrollment ? resolveCourseView(rawCourse, enrollment.enrolledVersion) : rawCourse)
    : null;
  // Chuẩn hóa modules cho khớp với enrollment thật (xem ghi chú tại
  // deriveLessonStatuses() trong mockData.js) — nếu không, một khóa đã có sẵn
  // tiến độ từ seed data sẽ hiện sai bài đang học/đã xong ngay tại chính màn
  // hình học thật, dù trang chi tiết khóa học đã hiện đúng.
  const course = versionedCourse
    ? { ...versionedCourse, enrollment, modules: deriveLessonStatuses(versionedCourse.modules, enrollment) }
    : null;
  const lesson = course?.modules.flatMap((m) => m.lessons).find((l) => l.id === lessonId);

  const flat = useMemo(() => (course ? flattenLessons(course) : []), [course]);
  const currentIndex = flat.findIndex((l) => l.id === lessonId);
  const nextLesson = currentIndex >= 0 ? flat[currentIndex + 1] : null;

  if (!course || !lesson) {
    return (
      <div className="empty-state">
        <i className="ti ti-mood-empty" aria-hidden="true" />
        <p>Lesson not found.</p>
        <Link to={basePath}>Back to course list</Link>
      </div>
    );
  }

  // Quy tắc cấp bậc được kiểm tra trước cả trạng thái ghi danh: học viên vào
  // thẳng bằng URL một khóa vượt cấp phải thấy đúng lý do bị chặn.
  const access = accessFor(course, user);
  if (access.isLevelLocked) {
    return (
      <div className="card card-pad empty-state" style={{ margin: '40px auto', maxWidth: 560 }}>
        <i className="ti ti-lock" style={{ fontSize: 48, color: 'var(--rust)' }} />
        <h2 style={{ fontSize: 18, marginTop: 10 }}>Khóa học chưa mở theo quy tắc cấp bậc tuần tự</h2>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', alignItems: 'center', margin: '10px 0' }}>
          <JobLevelBadge level={access.userLevel} />
          <i className="ti ti-arrow-right" style={{ color: 'var(--ink-faint)' }} />
          <JobLevelBadge level={access.courseLevel} />
        </div>
        <p style={{ color: 'var(--ink-soft)' }}>{access.reason}</p>
        <Button variant="primary" onClick={() => navigate(`${basePath}/${course.id}`)}>Xem Chi Tiết &amp; Xin Phê Duyệt</Button>
      </div>
    );
  }

  // Khóa Đã Đóng (hết hạn ghi danh) mà chưa từng ghi danh: chặn cả truy cập
  // trực tiếp bằng URL, không chỉ ẩn link ở trang chi tiết khóa học.
  const isRegistrationClosed = !enrollment && computeLifecycleStatus(course) === 'CLOSED';
  if (isRegistrationClosed) {
    return (
      <div className="card card-pad empty-state" style={{ margin: '40px auto', maxWidth: 560 }}>
        <i className="ti ti-lock" style={{ fontSize: 48, color: 'var(--rust)' }} />
        <h2 style={{ fontSize: 18, marginTop: 10 }}>Khóa học đã qua thời gian tham gia</h2>
        <p style={{ color: 'var(--ink-soft)' }}>Cửa sổ ghi danh cho khóa học này đã hết hạn và bạn chưa từng đăng ký, nên không thể vào học.</p>
        <Button variant="primary" onClick={() => navigate(`${basePath}/${course.id}`)}>Quay Lại Chi Tiết Khóa Học</Button>
      </div>
    );
  }

  function complete(extra) {
    const updated = applyLessonProgress(course, lesson.id, { status: 'COMPLETED', progressPercent: 100, ...extra });
    saveCourseProgress(course.id, updated, user, enrollment?.enrolledVersion);
  }

  const isComplete = lesson.status === 'COMPLETED';

  return (
    <>
      <div className="page-crumb" style={{ marginBottom: 6 }}>
        <Link to={`${basePath}/${course.id}`} style={{ color: 'var(--ink-soft)', textDecoration: 'none' }}>
          {course.title}
        </Link>{' '}
        / {lesson.title}
      </div>

      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <h1>{lesson.title}</h1>
            <Badge tone={course.courseType === 'MANDATORY' ? 'amber' : 'rail'}>
              {course.courseType}
            </Badge>
          </div>
          <p>
            {lessonTypeLabel(lesson.lessonType)} &middot; {lesson.isRequired ? 'Mandatory' : 'Optional'} &middot; Version: <strong>{course.version || course.currentVersion || 'v1.0'}</strong>
            {course.isArchivedVersionView && (
              <> &middot; <span style={{ color: 'var(--amber)' }}>Bạn đang học theo cấu trúc bài giảng phiên bản này (đã ghi danh trước khi có bản cập nhật mới)</span></>
            )}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <Badge tone={isComplete ? 'sage' : 'amber'}>
            {isComplete ? 'Completed' : 'In Progress'}
          </Badge>
          <Button
            size="sm"
            variant="outline"
            icon="ti-star"
            onClick={() => openSurveyModal(course, 'L1')}
          >
            Level 1 CSAT Feedback
          </Button>
        </div>
      </div>

      {/* DYNAMIC PLAYER CANVAS — 5 định dạng chuẩn hóa, chọn player duy nhất
          theo lesson.lessonType (không còn đọc course.modality nữa). */}
      <div className="card card-pad" style={{ marginBottom: 16 }}>
        {lesson.lessonType === 'SCORM' ? (
          <ScormPlayerSimulator course={course} lesson={lesson} onComplete={complete} />
        ) : lesson.lessonType === 'PPT' ? (
          <PptSlidePlayer course={course} lesson={lesson} onComplete={complete} />
        ) : lesson.lessonType === 'EXTERNAL_LINK' ? (
          <ExternalPlatformPlayer course={course} lesson={lesson} onComplete={complete} />
        ) : lesson.lessonType === 'PDF' ? (
          <PdfViewerLesson lesson={lesson} onComplete={complete} />
        ) : (
          <VideoLesson lesson={lesson} onComplete={complete} />
        )}
      </div>

      {/* BOTTOM NAV BUTTONS */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <Button onClick={() => navigate(`${basePath}/${course.id}`)}>Back to Course Overview</Button>
        <div style={{ display: 'flex', gap: 10 }}>
          {isComplete && nextLesson && nextLesson.lessonType !== 'ASSESSMENT' && (
            <Button variant="primary" icon="ti-arrow-right" onClick={() => navigate(`${basePath}/${course.id}/lessons/${nextLesson.id}`)}>
              Next Lesson
            </Button>
          )}
          {isComplete && (!nextLesson || nextLesson.lessonType === 'ASSESSMENT') && (
            <Button variant="primary" icon="ti-writing" onClick={() => navigate(`${basePath}/${course.id}/assessment`)}>
              Start Final Assessment
            </Button>
          )}
        </div>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// 1. SCORM 2004 Interactive Simulator Component
// ---------------------------------------------------------------------------
function ScormPlayerSimulator({ course, lesson, onComplete }) {
  const [slide, setSlide] = useState(1);
  const totalSlides = 5;
  const [interactiveScore, setInteractiveScore] = useState(null);

  const slidesData = [
    {
      title: 'Slide 1/5: Introduction & Cold Chain HACCP Safety Standards',
      content: 'Welcome to this international standard SCORM 2004 module for MM Mega Market & Big C. This interactive package automatically records time spent, quiz interactions, and bookmarking resume states.',
      tip: 'Standard: Bakery and fresh food preparation areas must continuously maintain temperatures between 18°C and 22°C.',
    },
    {
      title: 'Slide 2/5: Cold-Chain Protocol & Daily Inspection Log',
      content: 'Inspect cold-storage temperature sensors every 120 minutes. If deviation exceeds ±2°C, record in Form SOP-OMD-04B and report immediately to Shift Supervisor.',
      tip: 'Never leave walk-in freezer doors open for more than 3 consecutive minutes during peak replenishment.',
    },
    {
      title: 'Slide 3/5: Interactive Store Operations Scenario',
      interactive: true,
      question: 'When discovering a freshly baked batch with a core temperature below 75°C, what is the mandatory SOP action?',
      options: [
        { text: 'Package and display immediately at a discounted rate', correct: false },
        { text: 'Isolate the batch, re-verify core temperature, and notify Supervisor for re-baking', correct: true },
        { text: 'Ignore if the exterior crust looks golden brown', correct: false },
      ],
    },
    {
      title: 'Slide 4/5: Equipment Disinfection & Surface Sanitization',
      content: 'Sanitize dough mixers and cutting tools with 100ppm chlorine solution at the end of every shift. Wipe completely dry with sterile microfiber cloths.',
      tip: 'Wear certified sanitary gloves and hairnets 100% of the time when handling exposed food items.',
    },
    {
      title: 'Slide 5/5: SCORM Package Completion & CMI5 Data Commit',
      content: 'Congratulations on completing this SCORM package. Time on task, bookmarking, and interaction results have been committed to the LMS CMI data model.',
      completed: true,
    },
  ];

  function handleAnswer(isCorrect) {
    setInteractiveScore(isCorrect ? 100 : 40);
  }

  function handleNextSlide() {
    if (slide < totalSlides) {
      setSlide(slide + 1);
    } else {
      onComplete({ progressPercent: 100 });
    }
  }

  const currentSlide = slidesData[slide - 1];

  return (
    <div style={{ background: '#0F172A', color: '#fff', borderRadius: 10, padding: 24, minHeight: 420, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
      <div>
        {/* Top SCORM Status Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.15)', paddingBottom: 12, marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ background: 'var(--bigc-green)', color: '#fff', padding: '3px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700 }}>
              SCORM 2004 4th Ed.
            </span>
            <span style={{ fontSize: 12, opacity: 0.8 }}>cmi.core.lesson_status: <strong>{lesson.status}</strong></span>
          </div>
          <div style={{ fontSize: 12, opacity: 0.8 }}>
            Slide <strong>{slide}</strong> of {totalSlides}
          </div>
        </div>

        {/* Slide Content */}
        <h3 style={{ fontSize: 18, color: '#F8FAFC', marginBottom: 12 }}>{currentSlide.title}</h3>
        <p style={{ fontSize: 14, lineHeight: 1.6, color: '#CBD5E1', marginBottom: 16 }}>
          {currentSlide.content}
        </p>

        {currentSlide.tip && (
          <div style={{ background: 'rgba(0, 158, 73, 0.25)', borderLeft: '4px solid #009E49', padding: '12px 16px', borderRadius: 6, fontSize: 13, color: '#E2E8F0', marginBottom: 16 }}>
            <i className="ti ti-bulb" style={{ color: '#009E49', marginRight: 6 }} />
            {currentSlide.tip}
          </div>
        )}

        {currentSlide.interactive && (
          <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 8, padding: 16, marginBottom: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 13.5, color: '#F59E0B', marginBottom: 10 }}>
              {currentSlide.question}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {currentSlide.options.map((opt, i) => (
                <button
                  key={i}
                  onClick={() => handleAnswer(opt.correct)}
                  style={{
                    textAlign: 'left',
                    padding: '10px 14px',
                    borderRadius: 6,
                    border: '1px solid rgba(255,255,255,0.2)',
                    background: interactiveScore === null ? 'transparent' : opt.correct ? 'rgba(0, 158, 73, 0.35)' : 'rgba(227, 27, 35, 0.25)',
                    color: '#fff',
                    cursor: 'pointer',
                    fontSize: 13,
                  }}
                >
                  {String.fromCharCode(65 + i)}. {opt.text}
                </button>
              ))}
            </div>
            {interactiveScore !== null && (
              <div style={{ marginTop: 10, fontSize: 12.5, color: interactiveScore === 100 ? '#009E49' : '#E31B23', fontWeight: 600 }}>
                {interactiveScore === 100 ? '✓ Correct! You identified the required SOP protocol.' : '✗ Incorrect. Please select the safest action compliant with MMVN hygiene standards.'}
              </div>
            )}
          </div>
        )}
      </div>

      {/* SCORM Bottom Control Bar */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.15)', paddingTop: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button
          onClick={() => setSlide(Math.max(1, slide - 1))}
          disabled={slide === 1}
          className="btn btn-sm"
          style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none' }}
        >
          ← Previous Slide
        </button>

        <div style={{ width: 140 }}>
          <ProgressBar value={Math.round((slide / totalSlides) * 100)} tone="sage" size="sm" />
        </div>

        <button
          onClick={handleNextSlide}
          className="btn btn-sm"
          style={{ background: 'var(--bigc-green)', color: '#fff', border: 'none', fontWeight: 700 }}
        >
          {slide === totalSlides ? 'Complete SCORM Package' : 'Next Slide →'}
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 2. PPT Slide Presentation Player Component
// ---------------------------------------------------------------------------
function PptSlidePlayer({ course, lesson, onComplete }) {
  const [currentSlide, setCurrentSlide] = useState(1);
  const totalSlides = 4;

  const slides = [
    { title: 'Slide 1: Standard Planogram & Shelf Layout at MM Mega Market', imgBg: 'linear-gradient(135deg, #1E3A8A 0%, #3B82F6 100%)', desc: 'FEFO (First Expired First Out) stock rotation and 90cm minimum aisle clearance.' },
    { title: 'Slide 2: Shrinkage Prevention & Electronic Article Surveillance (EAS)', imgBg: 'linear-gradient(135deg, #005BAA 0%, #008836 100%)', desc: 'Mandatory EAS security tag placement on all items with value exceeding 300,000 VND.' },
    { title: 'Slide 3: Inventory Audits & Daily Spoilage Reconciliation', imgBg: 'linear-gradient(135deg, #B45309 0%, #F59E0B 100%)', desc: 'Log write-off quantities into SAP ERP before 21:00 daily.' },
    { title: 'Slide 4: Shift Handover & Supervisory Checklist', imgBg: 'linear-gradient(135deg, #009E49 0%, #005BAA 100%)', desc: 'Signed shift handover ledger between morning and evening shift supervisors.' },
  ];

  const cur = slides[currentSlide - 1];

  return (
    <div>
      <div
        style={{
          background: cur.imgBg,
          color: '#fff',
          borderRadius: 10,
          padding: '40px 30px',
          minHeight: 300,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          textAlign: 'center',
          boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
          marginBottom: 16,
        }}
      >
        <Badge tone="slate" style={{ marginBottom: 12, background: 'rgba(0,0,0,0.3)', color: '#fff' }}>
          PowerPoint Presentation Slide {currentSlide} of {totalSlides}
        </Badge>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: '#fff', maxWidth: 640, marginBottom: 12 }}>
          {cur.title}
        </h2>
        <p style={{ fontSize: 14, color: '#F1F5F9', maxWidth: 560, lineHeight: 1.6 }}>
          {cur.desc}
        </p>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Button variant="outline" size="sm" onClick={() => setCurrentSlide(Math.max(1, currentSlide - 1))} disabled={currentSlide === 1}>
          Previous Slide
        </Button>
        <span style={{ fontSize: 13, color: 'var(--ink-soft)' }}>
          Slide <strong>{currentSlide}</strong> of {totalSlides}
        </span>
        <Button
          variant="primary"
          size="sm"
          onClick={() => {
            if (currentSlide < totalSlides) setCurrentSlide(currentSlide + 1);
            else onComplete({ progressPercent: 100 });
          }}
        >
          {currentSlide === totalSlides ? 'Complete PPT Presentation' : 'Next Slide →'}
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 3. External Platform Embed Player (Udemy / LinkedIn Learning / Coursera /
//    YouTube / Custom LMS Link) — 1 trong 5 định dạng chuẩn hóa, chi tiết
//    (platform + url) đọc từ lesson.content thay vì course.modality/platformSource.
// ---------------------------------------------------------------------------
const EXTERNAL_PLATFORM_BRANDING = {
  UDEMY: { label: 'Udemy for Business', color: '#A435F0', icon: 'ti-a-b' },
  LINKEDIN: { label: 'LinkedIn Learning Enterprise Embed', color: '#0A66C2', icon: 'ti-brand-linkedin' },
  COURSERA: { label: 'Coursera for Business Integration', color: '#0056D2', icon: 'ti-school' },
  YOUTUBE: { label: 'YouTube Training Stream', color: '#E31B23', icon: 'ti-brand-youtube' },
  CUSTOM: { label: 'External Training Link', color: '#334155', icon: 'ti-external-link' },
};

function ExternalPlatformPlayer({ lesson, onComplete }) {
  const content = lesson.content || {};
  const platform = content.platform || 'CUSTOM';
  const branding = EXTERNAL_PLATFORM_BRANDING[platform] || EXTERNAL_PLATFORM_BRANDING.CUSTOM;
  const isYoutube = platform === 'YOUTUBE';
  const videoId = isYoutube ? (youtubeVideoId(content.url) || 'dQw4w9WgXcQ') : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div
        style={{
          background: branding.color, color: '#fff', padding: '14px 20px', borderRadius: 8,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <i className={`ti ${branding.icon}`} style={{ fontSize: 24 }} />
          <div>
            <div style={{ fontWeight: 800, fontSize: 14 }}>{branding.label}</div>
            <div style={{ fontSize: 11.5, opacity: 0.9 }}>Authorized Enterprise Partnership &middot; MMVN L&amp;D Hub</div>
          </div>
        </div>
        <Badge tone="slate" style={{ background: 'rgba(255,255,255,0.2)', color: '#fff' }}>
          SSO Verified
        </Badge>
      </div>

      {isYoutube ? (
        <div style={{ background: '#000', borderRadius: 8, overflow: 'hidden', height: 380 }}>
          <iframe
            width="100%"
            height="100%"
            src={`https://www.youtube.com/embed/${videoId}`}
            title="YouTube Training Video"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      ) : (
        <div style={{ background: 'var(--paper-sunken)', borderRadius: 8, padding: 40, textAlign: 'center' }}>
          <i className={`ti ${branding.icon}`} style={{ fontSize: 40, color: branding.color, marginBottom: 12 }} />
          <p style={{ fontSize: 13, color: 'var(--ink-soft)', marginBottom: 16 }}>
            Bài học được host bên ngoài trên {branding.label}. Đăng nhập bằng tài khoản doanh nghiệp MMVN Enterprise License, hoàn thành bài học, rồi quay lại đây xác nhận để đồng bộ Transcript.
          </p>
          <Button
            variant="outline"
            icon="ti-external-link"
            onClick={() => content.url && window.open(content.url, '_blank', 'noopener,noreferrer')}
            disabled={!content.url}
          >
            Mở Bài Học Tại {branding.label}
          </Button>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--line)', paddingTop: 14 }}>
        <span style={{ fontSize: 12.5, color: 'var(--ink-soft)' }}>
          Attendance and course verification will automatically sync to your enterprise transcript upon confirmation.
        </span>
        <Button variant="primary" icon="ti-check" onClick={() => onComplete({ progressPercent: 100 })}>
          Confirm External Course Completion
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 4. Video, Document, Image, Text Lessons (Standard)
// ---------------------------------------------------------------------------
function VideoLesson({ lesson, onComplete }) {
  const videoRef = useRef(null);
  const [watchedPercent, setWatchedPercent] = useState(lesson.progressPercent || 0);
  const required = lesson.rule?.requiredWatchPercent || 90;
  const hasFile = Boolean(lesson.content?.url);

  function onTimeUpdate() {
    const v = videoRef.current;
    if (!v || !v.duration) return;
    const pct = Math.round((v.currentTime / v.duration) * 100);
    if (pct > watchedPercent) {
      setWatchedPercent(pct);
      if (pct >= required && lesson.status !== 'COMPLETED') onComplete({ progressPercent: pct });
    }
  }

  return (
    <>
      {hasFile ? (
        <video ref={videoRef} src={lesson.content.url} controls onTimeUpdate={onTimeUpdate} style={{ width: '100%', borderRadius: 8, background: '#000', maxHeight: 420 }} />
      ) : (
        <div className="empty-state" style={{ padding: 24 }}>
          <i className="ti ti-video" aria-hidden="true" />
          <p>HLS Video Lecture Stream (1080p Full HD).</p>
        </div>
      )}
      <div style={{ marginTop: 14, fontSize: 12.5, color: 'var(--ink-soft)' }}>
        Watched {watchedPercent}% &middot; Required minimum {required}%
      </div>
      {lesson.status !== 'COMPLETED' && (
        <div style={{ marginTop: 12 }}>
          <Button variant="primary" icon="ti-check" onClick={() => onComplete({ progressPercent: 100 })}>Mark as Watched</Button>
        </div>
      )}
    </>
  );
}

// PDF — 1 trong 5 định dạng chuẩn hóa: SOP/ISO/tài liệu công việc dạng PDF
// Viewer, có nút xác nhận đã đọc (thay cho DOCUMENT/SCRIPT cũ).
function PdfViewerLesson({ lesson, onComplete }) {
  const content = lesson.content || {};
  return (
    <>
      <div style={{ background: 'var(--paper-sunken)', borderRadius: 8, padding: 20, marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <i className="ti ti-file-text" style={{ fontSize: 24, color: 'var(--rail)' }} />
          <span style={{ fontWeight: 700, fontSize: 14 }}>Standard Operating Procedure (PDF): {lesson.title}</span>
        </div>
        {content.url ? (
          <a href={content.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12.5, color: 'var(--rail)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <i className="ti ti-external-link" /> {content.fileName || 'Mở tài liệu PDF'}
          </a>
        ) : (
          <p style={{ fontSize: 13, color: 'var(--ink-soft)', lineHeight: 1.5, margin: 0 }}>
            Please review the operational checklist and safety guidelines thoroughly. This document is authenticated under MMVN compliance governance.
          </p>
        )}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 12.5, color: 'var(--ink-soft)' }}>Required read: {lesson.rule?.requiredReadPercent ?? 90}%</span>
        <Button variant="primary" icon="ti-check" onClick={() => onComplete({ progressPercent: 100 })}>
          Confirm Document Understood
        </Button>
      </div>
    </>
  );
}
