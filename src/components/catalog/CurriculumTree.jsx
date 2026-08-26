import React, { useState } from 'react';

// Cây đọc-chỉ Curriculum -> Course -> Module -> Lesson: chỉ tham chiếu
// courseIds thật, luôn drill vào modules/lessons SỐNG của khóa học trong
// store (không sao chép lại nội dung), nên tự động cập nhật khi khóa gốc
// được Admin chỉnh sửa sau này.
const LESSON_ICON = {
  SCORM: 'ti-package', VIDEO: 'ti-video', PDF: 'ti-file-text',
  PPT: 'ti-presentation', EXTERNAL_LINK: 'ti-external-link', ASSESSMENT: 'ti-writing',
};

function CourseNode({ course }) {
  const [open, setOpen] = useState(false);
  if (!course) return null;
  const moduleCount = course.modules?.length || 0;
  const lessonCount = (course.modules || []).reduce((sum, m) => sum + (m.lessons?.length || 0), 0);
  return (
    <div style={{ border: '1px solid var(--line)', borderRadius: 8, marginBottom: 8, overflow: 'hidden' }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '10px 12px', background: 'var(--paper-sunken)', border: 'none', cursor: 'pointer', textAlign: 'left' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <i className={`ti ${open ? 'ti-chevron-down' : 'ti-chevron-right'}`} aria-hidden="true" />
          <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--ink)' }}>{course.title}</span>
          <span style={{ fontSize: 11, color: 'var(--ink-faint)', fontFamily: 'var(--font-mono)' }}>{course.code}</span>
        </div>
        <span style={{ fontSize: 11.5, color: 'var(--ink-soft)', whiteSpace: 'nowrap' }}>{moduleCount} module &middot; {lessonCount} lesson</span>
      </button>
      {open && (
        <div style={{ padding: '8px 12px 12px 30px' }}>
          {(course.modules || []).length === 0 && (
            <div style={{ fontSize: 12, color: 'var(--ink-faint)' }}>Khóa này chưa có module nào.</div>
          )}
          {(course.modules || []).map((m) => (
            <div key={m.id} style={{ marginBottom: 8 }}>
              <div style={{ fontWeight: 600, fontSize: 12.5, color: 'var(--ink-soft)', marginBottom: 4 }}>{m.title}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {(m.lessons || []).map((l) => (
                  <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--ink)' }}>
                    <i className={`ti ${LESSON_ICON[l.lessonType] || 'ti-file'}`} style={{ color: 'var(--ink-faint)' }} aria-hidden="true" />
                    {l.title}
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

export default function CurriculumTree({ curriculum, courses }) {
  const resolved = (curriculum.courseIds || []).map((id) => courses.find((c) => c.id === id)).filter(Boolean);
  const missing = (curriculum.courseIds || []).length - resolved.length;
  return (
    <div>
      {missing > 0 && (
        <div style={{ fontSize: 11.5, color: 'var(--rust)', marginBottom: 8 }}>
          <i className="ti ti-alert-triangle" aria-hidden="true" /> {missing} khóa học tham chiếu không còn tồn tại trong hệ thống.
        </div>
      )}
      {resolved.length === 0 ? (
        <div style={{ fontSize: 12.5, color: 'var(--ink-faint)' }}>Giáo trình này chưa có khóa học nào.</div>
      ) : (
        resolved.map((c) => <CourseNode key={c.id} course={c} />)
      )}
    </div>
  );
}
