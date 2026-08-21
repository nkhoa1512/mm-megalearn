import React, { useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { applyLessonProgress } from '../../data/mockData';
import { Badge, Button } from '../../components/ui';
import { useCourseStore } from '../../state/CourseStore';

function flattenLessons(course) {
  return course.modules.flatMap((m) => m.lessons.map((l) => ({ ...l, moduleId: m.id })));
}

// Opens one lesson's actual content and tracks completion against its own
// content rule (sections 10-15): video watch %, text/document read %, or
// all-images-viewed — no manager gate, the lesson completes itself.
export default function LessonPlayer({ basePath = '/learner/courses' }) {
  const { courseId, lessonId } = useParams();
  const navigate = useNavigate();
  const { courses, updateCourse } = useCourseStore();
  const course = courses.find((c) => c.id === courseId);
  const lesson = course?.modules.flatMap((m) => m.lessons).find((l) => l.id === lessonId);

  const flat = useMemo(() => (course ? flattenLessons(course) : []), [course]);
  const currentIndex = flat.findIndex((l) => l.id === lessonId);
  const nextLesson = currentIndex >= 0 ? flat[currentIndex + 1] : null;

  if (!course || !course.enrollment || !lesson) {
    return (
      <div className="empty-state">
        <i className="ti ti-mood-empty" aria-hidden="true" />
        <p>Lesson not found.</p>
        <Link to={basePath}>Back to my courses</Link>
      </div>
    );
  }

  function complete(extra) {
    const updated = applyLessonProgress(course, lesson.id, { status: 'COMPLETED', progressPercent: 100, ...extra });
    updateCourse(course.id, updated);
  }

  const isComplete = lesson.status === 'COMPLETED';

  return (
    <>
      <div className="page-crumb" style={{ marginBottom: 6 }}>
        <Link to={`${basePath}/${course.id}`} style={{ color: 'var(--ink-soft)', textDecoration: 'none' }}>{course.title}</Link> / {lesson.title}
      </div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1>{lesson.title}</h1>
          <p>{lessonTypeLabel(lesson.lessonType)} &middot; {lesson.isRequired ? 'Required' : 'Optional'}</p>
        </div>
        <Badge tone={isComplete ? 'sage' : 'amber'}>{isComplete ? 'Completed' : 'In progress'}</Badge>
      </div>

      <div className="card card-pad" style={{ marginBottom: 16 }}>
        {lesson.lessonType === 'VIDEO' && <VideoLesson lesson={lesson} onComplete={complete} />}
        {lesson.lessonType === 'DOCUMENT' && <DocumentLesson lesson={lesson} onComplete={complete} />}
        {lesson.lessonType === 'SCRIPT' && <DocumentLesson lesson={lesson} onComplete={complete} />}
        {lesson.lessonType === 'IMAGE' && <ImageLesson lesson={lesson} onComplete={complete} />}
        {lesson.lessonType === 'TEXT' && <TextLesson lesson={lesson} onComplete={complete} />}
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <Button onClick={() => navigate(`${basePath}/${course.id}`)}>Back to course</Button>
        {isComplete && nextLesson && nextLesson.lessonType !== 'ASSESSMENT' && (
          <Button variant="primary" icon="ti-arrow-right" onClick={() => navigate(`${basePath}/${course.id}/lessons/${nextLesson.id}`)}>
            Next lesson
          </Button>
        )}
        {isComplete && nextLesson && nextLesson.lessonType === 'ASSESSMENT' && (
          <Button variant="primary" icon="ti-writing" onClick={() => navigate(`${basePath}/${course.id}/assessment`)}>
            Go to assessment
          </Button>
        )}
      </div>
    </>
  );
}

function VideoLesson({ lesson, onComplete }) {
  const videoRef = useRef(null);
  const [watchedPercent, setWatchedPercent] = useState(lesson.progressPercent || 0);
  const required = lesson.rule.requiredWatchPercent;
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
        <video ref={videoRef} src={lesson.content.url} controls onTimeUpdate={onTimeUpdate} style={{ width: '100%', borderRadius: 8, background: '#000' }} />
      ) : (
        <div className="empty-state" style={{ padding: 24 }}>
          <i className="ti ti-video-off" aria-hidden="true" />
          <p>No video has been uploaded for this lesson yet.</p>
        </div>
      )}
      <div style={{ marginTop: 14, fontSize: 12.5, color: 'var(--ink-soft)' }}>
        Watched {watchedPercent}% &middot; required {required}%
      </div>
      {lesson.status !== 'COMPLETED' && (
        <div style={{ marginTop: 12 }}>
          <Button variant="primary" icon="ti-check" onClick={() => onComplete({ progressPercent: 100 })}>Mark as watched</Button>
        </div>
      )}
    </>
  );
}

function DocumentLesson({ lesson, onComplete }) {
  const url = lesson.content?.url;
  const isPdf = url && /\.pdf($|\?)/i.test(url);
  return (
    <>
      {url ? (
        isPdf ? (
          <iframe title={lesson.title} src={url} style={{ width: '100%', height: 480, border: '1px solid var(--line)', borderRadius: 8 }} />
        ) : (
          <a href={url} target="_blank" rel="noreferrer" className="btn btn-primary" style={{ textDecoration: 'none', display: 'inline-flex' }}>
            <i className="ti ti-external-link" aria-hidden="true" /> Open {lesson.content.fileName || 'document'}
          </a>
        )
      ) : (
        <div className="empty-state" style={{ padding: 24 }}>
          <i className="ti ti-file-off" aria-hidden="true" />
          <p>No document has been uploaded for this lesson yet.</p>
        </div>
      )}
      <div style={{ marginTop: 14, fontSize: 12.5, color: 'var(--ink-soft)' }}>Required read: {lesson.rule.requiredReadPercent}%</div>
      {lesson.status !== 'COMPLETED' && (
        <div style={{ marginTop: 12 }}>
          <Button variant="primary" icon="ti-check" onClick={() => onComplete({ progressPercent: 100 })}>Mark as read</Button>
        </div>
      )}
    </>
  );
}

function ImageLesson({ lesson, onComplete }) {
  const files = lesson.content?.files || [];
  const [viewed, setViewed] = useState(() => new Set());

  function view(idx) {
    const next = new Set(viewed);
    next.add(idx);
    setViewed(next);
    if (next.size >= (lesson.rule.imageCount || files.length) && lesson.status !== 'COMPLETED') {
      onComplete({ progressPercent: 100 });
    }
  }

  if (files.length === 0) {
    return (
      <>
        <div className="empty-state" style={{ padding: 24 }}>
          <i className="ti ti-photo-off" aria-hidden="true" />
          <p>No images have been uploaded for this lesson yet ({lesson.rule.imageCount} expected).</p>
        </div>
        {lesson.status !== 'COMPLETED' && (
          <Button variant="primary" icon="ti-check" onClick={() => onComplete({ progressPercent: 100 })}>Mark as viewed</Button>
        )}
      </>
    );
  }

  return (
    <>
      <div className="grid grid-auto">
        {files.map((f, i) => (
          <div key={i} className="card card-pad card-interactive" onClick={() => view(i)} style={{ cursor: 'pointer', textAlign: 'center' }}>
            <img src={f.url} alt={f.fileName || `Image ${i + 1}`} style={{ maxWidth: '100%', borderRadius: 6, marginBottom: 8 }} />
            <Badge tone={viewed.has(i) ? 'sage' : 'slate'}>{viewed.has(i) ? 'Viewed' : 'Click to view'}</Badge>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 14, fontSize: 12.5, color: 'var(--ink-soft)' }}>{viewed.size} of {files.length} viewed</div>
    </>
  );
}

function TextLesson({ lesson, onComplete }) {
  const required = lesson.rule.requiredReadPercent;
  const [readPercent, setReadPercent] = useState(lesson.progressPercent || 0);

  function onScroll(e) {
    const el = e.target;
    const scrollable = el.scrollHeight - el.clientHeight;
    const pct = scrollable <= 0 ? 100 : Math.round((el.scrollTop / scrollable) * 100);
    if (pct > readPercent) {
      setReadPercent(pct);
      if (pct >= required && lesson.status !== 'COMPLETED') onComplete({ progressPercent: pct });
    }
  }

  return (
    <>
      <div
        onScroll={onScroll}
        style={{ maxHeight: 240, overflowY: 'auto', padding: 16, border: '1px solid var(--line)', borderRadius: 8, fontSize: 13.5, lineHeight: 1.7 }}
      >
        {lesson.content?.text || 'No content has been written for this lesson yet.'}
      </div>
      <div style={{ marginTop: 14, fontSize: 12.5, color: 'var(--ink-soft)' }}>Read {readPercent}% &middot; required {required}%</div>
    </>
  );
}

function lessonTypeLabel(t) {
  return { VIDEO: 'Video', DOCUMENT: 'Document', IMAGE: 'Image', TEXT: 'Text', SCRIPT: 'Script' }[t] || t;
}
