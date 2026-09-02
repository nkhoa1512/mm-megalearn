import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge, ProgressBar, Button } from '../common/ui';

// The Curriculum -> Course -> Module -> Lesson tree only references
// the real courseIds, always drilling into the LIVE modules/lessons of the course in the
// store (without copying the content). Supports progress display in the Learner view.
const LESSON_ICON = {
  SCORM: 'ti-package', VIDEO: 'ti-video', PDF: 'ti-file-text',
  PPT: 'ti-presentation', EXTERNAL_LINK: 'ti-external-link', ASSESSMENT: 'ti-writing',
  QUIZ: 'ti-writing',
};

function CourseNode({ course, userEnrollment, onNavigateCourse }) {
  const [open, setOpen] = useState(false);
  if (!course) return null;
  const moduleCount = course.modules?.length || 0;
  const lessonCount = (course.modules || []).reduce((sum, m) => sum + (m.lessons?.length || 0), 0);

  const status = userEnrollment?.status || course.enrollment?.status;
  const progressPercent = userEnrollment?.progressPercent ?? course.enrollment?.progressPercent;
  const hasEnrollment = userEnrollment !== undefined || course.enrollment !== undefined;

  let statusBadge = null;
  if (status === 'COMPLETED') {
    statusBadge = <Badge tone="sage" size="sm"><i className="ti ti-check" /> Completed</Badge>;
  } else if (status === 'IN_PROGRESS') {
    statusBadge = <Badge tone="amber" size="sm"><i className="ti ti-loader" /> {progressPercent || 0}% In progress</Badge>;
  } else if (hasEnrollment) {
    statusBadge = <Badge tone="slate" size="sm">Not started</Badge>;
  }

  return (
    <div style={{ border: '1px solid var(--line)', borderRadius: 8, marginBottom: 10, overflow: 'hidden', background: 'var(--paper-raised)' }}>
      <div
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
          padding: '10px 14px',
          background: 'var(--paper-sunken)',
          flexWrap: 'wrap',
        }}
      >
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            minWidth: 0,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            textAlign: 'left',
            flex: 1,
          }}
        >
          <i className={`ti ${open ? 'ti-chevron-down' : 'ti-chevron-right'}`} style={{ color: 'var(--ink-faint)', fontSize: 13 }} aria-hidden="true" />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--ink)' }}>{course.title}</span>
              <span style={{ fontSize: 11, color: 'var(--ink-faint)', fontFamily: 'var(--font-mono)' }}>{course.code}</span>
              {course.category && <Badge tone="slate" size="sm">{course.category}</Badge>}
              {statusBadge}
            </div>
            <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 2 }}>
              {moduleCount} module &middot; {lessonCount} lessons &middot; Duration: {course.estimatedHours || '2h'}
            </div>
          </div>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {onNavigateCourse && (
            <Button
              size="sm"
              variant={status === 'COMPLETED' ? 'outline' : 'primary'}
              icon={status === 'COMPLETED' ? 'ti-rotate-2' : 'ti-player-play'}
              onClick={() => onNavigateCourse(course.id)}
            >
              {status === 'COMPLETED' ? 'Review the course' : status === 'IN_PROGRESS' ? 'Continue' : 'Start learning'}
            </Button>
          )}
        </div>
      </div>

      {hasEnrollment && progressPercent !== undefined && (
        <div style={{ padding: '0 14px 6px', background: 'var(--paper-sunken)' }}>
          <ProgressBar value={progressPercent || 0} tone={status === 'COMPLETED' ? 'sage' : 'rail'} size="sm" />
        </div>
      )}

      {open && (
        <div style={{ padding: '12px 14px 14px 34px', borderTop: '1px solid var(--line)' }}>
          {(course.modules || []).length === 0 && (
            <div style={{ fontSize: 12, color: 'var(--ink-faint)' }}>This course has no modules yet.</div>
          )}
          {(course.modules || []).map((m, mIdx) => (
            <div key={m.id || mIdx} style={{ marginBottom: 12 }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--ink-soft)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                <i className="ti ti-folder" style={{ color: 'var(--rail)', fontSize: 14 }} />
                Module {mIdx + 1}: {m.title}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5, paddingLeft: 14 }}>
                {(m.lessons || []).map((l, lIdx) => (
                  <div key={l.id || lIdx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, fontSize: 12, color: 'var(--ink)', padding: '3px 0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <i className={`ti ${LESSON_ICON[l.lessonType] || 'ti-file'}`} style={{ color: 'var(--ink-faint)' }} aria-hidden="true" />
                      <span>{l.title}</span>
                      {l.isRequired && <Badge tone="amber" size="sm">Mandatory</Badge>}
                    </div>
                    {l.duration && <span style={{ fontSize: 11, color: 'var(--ink-faint)' }}>{l.duration}</span>}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function CurriculumTree({ curriculum, courses = [], enrollmentsMap, onNavigateCourse }) {
  const navigate = useNavigate();
  const handleNavigate = onNavigateCourse || ((courseId) => navigate(`/learner/courses/${courseId}`));

  const resolved = (curriculum.courseIds || []).map((id) => courses.find((c) => c.id === id)).filter(Boolean);
  const missing = (curriculum.courseIds || []).length - resolved.length;

  return (
    <div>
      {missing > 0 && (
        <div style={{ fontSize: 12, color: 'var(--rust)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
          <i className="ti ti-alert-triangle" aria-hidden="true" /> {missing} referenced courses no longer exist in the system.
        </div>
      )}
      {resolved.length === 0 ? (
        <div style={{ padding: '20px 0', textAlign: 'center', fontSize: 13, color: 'var(--ink-faint)' }}>
          <i className="ti ti-books" style={{ fontSize: 24, display: 'block', marginBottom: 6 }} />
          This curriculum has no courses yet.
        </div>
      ) : (
        resolved.map((c) => (
          <CourseNode
            key={c.id}
            course={c}
            userEnrollment={enrollmentsMap ? enrollmentsMap[c.id] : undefined}
            onNavigateCourse={enrollmentsMap ? handleNavigate : undefined}
          />
        ))
      )}
    </div>
  );
}
