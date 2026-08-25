import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  businessUnits, divisions, departments, jobLevels, demoUsers, allUsers, createBlankCourse,
  meetingRoomsAndLabs, teachingEligibleUsers,
} from '../../data/mockData';
import { ASSIGNMENT_TYPES, TARGET_ID_FIELD, targetOptionsFor, assignmentTypeLabel } from '../../data/assignmentTargets';
import { Badge, Button, CourseTypeBadge, JobLevelBadge } from '../../components/ui';
import { LEVEL_DEFINITIONS, normalizeLevel, levelTitle } from '../../data/levelSystem';
import { normalizeRole, hasCapability, roleDefinition } from '../../data/roles';
import { useCourseStore } from '../../state/CourseStore';
import { COURSE_IMAGE_PRESETS, getCourseImage } from '../../data/courseImages';

const LESSON_ICON = {
  VIDEO: 'ti-video', DOCUMENT: 'ti-file-text', IMAGE: 'ti-photo',
  TEXT: 'ti-align-left', SCRIPT: 'ti-article', ASSESSMENT: 'ti-writing',
};


function genId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.round(Math.random() * 1e4)}`;
}

function cloneCourse(course) {
  return typeof structuredClone === 'function' ? structuredClone(course) : JSON.parse(JSON.stringify(course));
}

// Seed courses authored before version tracking existed have no `version` /
// `versionHistory` fields — default them so the Version History panel and
// header always have something real to show instead of "undefined".
function withVersionDefaults(course) {
  return { ...course, version: course.version || 'v1.0', versionHistory: course.versionHistory || [] };
}

function defaultRuleFor(lessonType) {
  if (lessonType === 'VIDEO') return { requiredWatchPercent: 90 };
  if (lessonType === 'IMAGE') return { requireAllViewed: true, imageCount: 1 };
  if (lessonType === 'ASSESSMENT') return {};
  return { requiredReadPercent: 90 };
}

function defaultContentFor(lessonType) {
  if (lessonType === 'IMAGE') return { files: [] };
  if (lessonType === 'TEXT') return { text: '' };
  if (lessonType === 'ASSESSMENT') return {};
  return { url: '', fileName: null, fileType: null };
}

function parseCsvLine(line) {
  const cells = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') { if (line[i + 1] === '"') { cur += '"'; i++; } else inQuotes = false; }
      else cur += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === ',') { cells.push(cur); cur = ''; }
    else cur += ch;
  }
  cells.push(cur);
  return cells.map((c) => c.trim());
}

// Question bank import (FR-ASSESS-001/002): a CSV with question, type, up to 4
// options, which are correct (letters, ";"-joined for multiple), category,
// difficulty, score, explanation. Rows missing text/options/a correct answer
// are skipped and counted, never silently dropped. For SHORT_ANSWER rows the
// "correct" column holds the accepted answer text(s) directly (";"-joined for
// alternates) instead of option letters, and optionA-D are left blank.
function parseQuestionCsv(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const rows = lines.slice(1);
  const questions = [];
  let skipped = 0;
  for (const line of rows) {
    const [qText, type, optA, optB, optC, optD, correct, category, difficulty, score, explanation] = parseCsvLine(line);
    if (!qText || !type) { skipped++; continue; }
    const normalizedType = ['SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'TRUE_FALSE', 'SHORT_ANSWER'].includes((type || '').toUpperCase())
      ? type.toUpperCase() : 'SINGLE_CHOICE';
    let options;
    if (normalizedType === 'SHORT_ANSWER') {
      options = (correct || '').split(';').map((s) => s.trim()).filter(Boolean)
        .map((answerText) => ({ id: genId('o'), text: answerText, isCorrect: true }));
      if (options.length === 0) { skipped++; continue; }
    } else {
      const letters = ['A', 'B', 'C', 'D'];
      const optionTexts = [optA, optB, optC, optD];
      const correctLetters = (correct || '').split(';').map((s) => s.trim().toUpperCase()).filter(Boolean);
      options = letters
        .map((letter, i) => ({ id: genId('o'), text: optionTexts[i], isCorrect: correctLetters.includes(letter) }))
        .filter((o) => o.text);
      if (options.length < 2 || !options.some((o) => o.isCorrect)) { skipped++; continue; }
    }
    questions.push({
      id: genId('q'), text: qText, type: normalizedType, options,
      category: category || '', difficulty: ['EASY', 'MEDIUM', 'HARD'].includes((difficulty || '').toUpperCase()) ? difficulty.toUpperCase() : 'MEDIUM',
      score: Number(score) || 5, explanation: explanation || '',
    });
  }
  return { questions, skipped };
}

function downloadQuestionCsvTemplate() {
  const csv = [
    'question,type,optionA,optionB,optionC,optionD,correct,category,difficulty,score,explanation',
    '"What is 2+2?",SINGLE_CHOICE,3,4,5,6,B,Math,EASY,5,"Basic arithmetic."',
    '"Which of these are prime numbers?",MULTIPLE_CHOICE,2,3,4,9,A;B,Math,MEDIUM,10,',
    '"The sky is blue.",TRUE_FALSE,True,False,,,A,General,EASY,5,',
    '"What temperature range should the bakery proofer be kept at?",SHORT_ANSWER,,,,,28-32 degrees;28 to 32 degrees,Food Safety,MEDIUM,5,"Accepts any listed alternative; case-insensitive."',
  ].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'question-bank-template.csv';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function blankQuestion() {
  return {
    id: genId('q'), category: '', difficulty: 'MEDIUM', score: 5,
    text: '', type: 'SINGLE_CHOICE',
    options: [{ id: genId('o'), text: '', isCorrect: true }, { id: genId('o'), text: '', isCorrect: false }],
    explanation: '',
  };
}

export default function AdminCourseBuilder() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { courses, addCourse, updateCourse, currentUser: authUser } = useCourseStore();
  const isNew = !courseId || courseId === 'new';
  const existing = isNew ? null : courses.find((c) => c.id === courseId);

  // Ma trận phân quyền tạo khóa học: User Admin/SysAdmin toàn quyền cả 2 hình
  // thức; Trainer/L&D chỉ tạo được Trực tiếp (và tự động là giảng viên đứng
  // lớp — không chọn người khác); HRBP/Manager/Learner không có quyền này.
  const authRole = normalizeRole(authUser?.role);
  const canAuthorOnline = hasCapability(authRole, 'canAuthorOnlineCourses');
  const canAuthorOffline = hasCapability(authRole, 'canAuthorOfflineCourses');
  const isTrainerOnly = canAuthorOffline && !canAuthorOnline;
  // Danh sách Giảng viên đủ chuẩn: L&D, HRBP, User Admin, SysAdmin (mọi role
  // có canBeAssignedToClass) — thay cho trainersDirectory cũ chỉ 4 hồ sơ tĩnh.
  const eligibleTrainers = teachingEligibleUsers();

  // Khóa mới do Trainer/L&D tạo phải bắt đầu ở dạng Trực tiếp với chính họ là
  // giảng viên — createBlankCourse() mặc định Online nên phải ghi đè ở đây.
  function withRoleDefaults(course) {
    if (!isNew) return course;
    // Gắn đúng người tạo thật (không phải adminUser mặc định của
    // createBlankCourse()) để trang danh mục biết khóa này thuộc quyền quản
    // lý của ai: Trainer/L&D chỉ sửa/xóa được khóa do chính họ tạo.
    const base = { ...course, createdBy: authUser?.userId };
    if (!isTrainerOnly) return base;
    return {
      ...base,
      deliveryType: 'IN_PERSON_CLASSROOM',
      modality: 'CLASSROOM_LAB',
      format: 'Store Practical Lab / ILT',
      trainerId: authUser.userId,
      trainerName: authUser.fullName,
    };
  }

  const [draft, setDraft] = useState(() => withRoleDefaults(withVersionDefaults(cloneCourse(existing || createBlankCourse()))));
  const [activeModuleId, setActiveModuleId] = useState(draft.modules[0]?.id);
  const [editingQuestionId, setEditingQuestionId] = useState(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [importMessage, setImportMessage] = useState('');

  useEffect(() => {
    const fresh = withRoleDefaults(withVersionDefaults(cloneCourse(existing || createBlankCourse())));
    setDraft(fresh);
    setActiveModuleId(fresh.modules[0]?.id);
    setSaved(false);
    setError('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  if (!canAuthorOnline && !canAuthorOffline) {
    return (
      <div className="empty-state">
        <i className="ti ti-lock" aria-hidden="true" style={{ color: 'var(--rust)' }} />
        <p>Bạn không có quyền tạo hoặc chỉnh sửa khóa học.</p>
        <Link to="/admin/courses">Back to courses</Link>
      </div>
    );
  }

  if (!isNew && !existing) {
    return (
      <div className="empty-state">
        <i className="ti ti-mood-empty" aria-hidden="true" />
        <p>Course not found.</p>
        <Link to="/admin/courses">Back to courses</Link>
      </div>
    );
  }

  // Trainer/L&D chỉ được đụng vào khóa Trực tiếp — nếu mở nhầm 1 khóa Online
  // đã có sẵn (do gõ thẳng URL) thì chặn luôn, không chỉ chặn lúc tạo mới.
  if (isTrainerOnly && draft.deliveryType === 'ONLINE_ELEARNING') {
    return (
      <div className="empty-state">
        <i className="ti ti-lock" aria-hidden="true" style={{ color: 'var(--rust)' }} />
        <p>Giảng viên / L&amp;D chỉ được tạo và chỉnh sửa khóa học Trực tiếp (ILT), không có quyền với khóa Trực tuyến.</p>
        <Link to="/admin/courses">Back to courses</Link>
      </div>
    );
  }

  const activeModule = draft.modules.find((m) => m.id === activeModuleId) || draft.modules[0] || null;
  const cfg = draft.configuration;

  function patch(fields) {
    setDraft((d) => ({ ...d, ...fields }));
  }
  function patchConfig(fields) {
    setDraft((d) => ({ ...d, configuration: { ...d.configuration, ...fields } }));
  }

  function setCourseType(courseType) {
    setDraft((d) => {
      if (courseType === 'OPTIONAL') return { ...d, courseType, assignment: null };
      const opts = targetOptionsFor('BUSINESS_UNIT');
      return {
        ...d,
        courseType,
        assignment: d.assignment || {
          assignmentType: 'BUSINESS_UNIT',
          targetBusinessUnitId: opts[0]?.id,
          targetLabel: opts[0]?.label,
          assignedBy: 'USR-1000',
          assignedAt: new Date().toISOString().slice(0, 10),
          startDate: new Date().toISOString().slice(0, 10),
          dueDate: '',
        },
      };
    });
  }

  function setAssignmentType(assignmentType) {
    const opts = targetOptionsFor(assignmentType);
    const field = TARGET_ID_FIELD[assignmentType];
    setDraft((d) => ({
      ...d,
      assignment: {
        assignmentType, assignedBy: d.assignment?.assignedBy || 'USR-1000',
        assignedAt: d.assignment?.assignedAt || new Date().toISOString().slice(0, 10),
        startDate: d.assignment?.startDate || '', dueDate: d.assignment?.dueDate || '',
        [field]: opts[0]?.id, targetLabel: opts[0]?.label,
      },
    }));
  }

  function setAssignmentTarget(targetId) {
    const opts = targetOptionsFor(draft.assignment.assignmentType);
    const label = opts.find((o) => o.id === targetId)?.label || targetId;
    const field = TARGET_ID_FIELD[draft.assignment.assignmentType];
    setDraft((d) => ({ ...d, assignment: { ...d.assignment, [field]: targetId, targetLabel: label } }));
  }

  function addModule() {
    const m = { id: genId('mod'), title: 'New module', displayOrder: draft.modules.length + 1, lessons: [] };
    setDraft((d) => ({ ...d, modules: [...d.modules, m] }));
    setActiveModuleId(m.id);
  }
  function removeModule(moduleId) {
    setDraft((d) => {
      const modules = d.modules.filter((m) => m.id !== moduleId).map((m, i) => ({ ...m, displayOrder: i + 1 }));
      if (activeModuleId === moduleId) setActiveModuleId(modules[0]?.id);
      return { ...d, modules };
    });
  }
  function updateModule(moduleId, fields) {
    setDraft((d) => ({ ...d, modules: d.modules.map((m) => (m.id === moduleId ? { ...m, ...fields } : m)) }));
  }
  function addLesson(moduleId) {
    const l = {
      id: genId('les'), title: 'New lesson', lessonType: 'DOCUMENT', isRequired: true, status: 'NOT_STARTED', progressPercent: 0,
      rule: defaultRuleFor('DOCUMENT'), content: defaultContentFor('DOCUMENT'),
    };
    setDraft((d) => ({ ...d, modules: d.modules.map((m) => (m.id === moduleId ? { ...m, lessons: [...m.lessons, l] } : m)) }));
  }
  function updateLesson(moduleId, lessonId, fields) {
    setDraft((d) => ({
      ...d,
      modules: d.modules.map((m) => (m.id !== moduleId ? m : {
        ...m, lessons: m.lessons.map((l) => (l.id === lessonId ? { ...l, ...fields } : l)),
      })),
    }));
  }
  function removeLesson(moduleId, lessonId) {
    setDraft((d) => ({
      ...d,
      modules: d.modules.map((m) => (m.id !== moduleId ? m : { ...m, lessons: m.lessons.filter((l) => l.id !== lessonId) })),
    }));
  }

  function addQuestion() {
    const q = blankQuestion();
    setDraft((d) => ({ ...d, questionBank: [...d.questionBank, q] }));
    setEditingQuestionId(q.id);
  }
  function updateQuestion(questionId, fields) {
    setDraft((d) => ({ ...d, questionBank: d.questionBank.map((q) => (q.id === questionId ? { ...q, ...fields } : q)) }));
  }
  function removeQuestion(questionId) {
    setDraft((d) => ({ ...d, questionBank: d.questionBank.filter((q) => q.id !== questionId) }));
    if (editingQuestionId === questionId) setEditingQuestionId(null);
  }
  function onImportCsv(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const { questions, skipped } = parseQuestionCsv(String(reader.result));
      setDraft((d) => ({ ...d, questionBank: [...d.questionBank, ...questions] }));
      setImportMessage(`Imported ${questions.length} question(s)${skipped ? `, skipped ${skipped} invalid row(s)` : ''}.`);
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  function togglePrerequisite(pid) {
    setDraft((d) => ({
      ...d,
      prerequisites: d.prerequisites.includes(pid) ? d.prerequisites.filter((x) => x !== pid) : [...d.prerequisites, pid],
    }));
  }

  function bumpVersion(version) {
    const m = /^v(\d+)\.(\d+)$/.exec(version || 'v1.0');
    return m ? `v${m[1]}.${Number(m[2]) + 1}` : 'v1.1';
  }

  function handleSave() {
    if (!draft.title.trim()) { setError('Course title is required.'); return; }
    if (draft.courseType === 'MANDATORY' && !draft.assignment?.dueDate) { setError('Mandatory courses need a due date for their target audience.'); return; }
    setError('');
    if (isNew) {
      addCourse(draft);
      navigate(`/admin/courses/${draft.id}`, { replace: true });
    } else {
      // Content version tracking: every save on an existing course bumps the
      // version and appends who/when to versionHistory (newest first), so the
      // Course Builder always shows which revision is current.
      const nextVersion = bumpVersion(draft.version);
      const entry = {
        version: nextVersion,
        updatedBy: authUser?.fullName || 'L&D Admin',
        updatedAt: new Date().toISOString().slice(0, 10),
        note: 'Content updated via Course Builder.',
      };
      const withVersion = { ...draft, version: nextVersion, versionHistory: [entry, ...(draft.versionHistory || [])] };
      setDraft(withVersion);
      updateCourse(draft.id, withVersion);
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <>
      <div className="page-crumb" style={{ marginBottom: 6 }}>
        <Link to="/admin/courses" style={{ color: 'var(--ink-soft)', textDecoration: 'none' }}>Courses</Link> / {isNew ? 'New course' : draft.title}
      </div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1>{draft.title || 'Untitled course'}</h1>
          <p style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {draft.code || 'No code yet'} &middot; {draft.category || 'No category'} &middot; {draft.version} <CourseTypeBadge courseType={draft.courseType} />
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {error && <span style={{ fontSize: 12.5, color: 'var(--rust)' }}>{error}</span>}
          {saved && <Badge tone="sage" icon="ti-check">Saved</Badge>}
          <Button variant="primary" icon="ti-device-floppy" onClick={handleSave}>{isNew ? 'Create course' : 'Save changes'}</Button>
        </div>
      </div>

      {/* DELIVERY MODE SWITCHER */}
      <div className="card card-pad" style={{ marginBottom: 16, background: 'var(--paper-sunken)', border: '1.5px solid var(--line)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div className="section-label" style={{ margin: 0 }}>
            <i className="ti ti-layers-intersect" style={{ marginRight: 6, color: 'var(--rail)' }} />
            Hình Thức Đào Tạo / Delivery Mode
          </div>
          <Badge tone={draft.deliveryType === 'IN_PERSON_CLASSROOM' ? 'blue' : 'sage'}>
            {draft.deliveryType === 'IN_PERSON_CLASSROOM' ? '🏢 ĐÀO TẠO TRỰC TIẾP (ILT)' : '🌐 TRỰC TUYẾN (E-LEARNING)'}
          </Badge>
        </div>

        {isTrainerOnly && (
          <div style={{ fontSize: 11.5, color: 'var(--ink-soft)', marginBottom: 10 }}>
            <i className="ti ti-info-circle" style={{ marginRight: 4 }} />
            Giảng viên / L&amp;D chỉ tạo được khóa Trực Tiếp và tự động là người đứng lớp.
          </div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: canAuthorOnline ? '1fr 1fr' : '1fr', gap: 12 }}>
          {canAuthorOnline && (
            <button
              type="button"
              onClick={() => patch({ deliveryType: 'ONLINE_ELEARNING', modality: 'SCORM_PACKAGE', format: 'SCORM 2004' })}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px 16px',
                borderRadius: 8,
                border: (!draft.deliveryType || draft.deliveryType === 'ONLINE_ELEARNING') ? '2px solid var(--rail)' : '1px solid var(--line)',
                background: (!draft.deliveryType || draft.deliveryType === 'ONLINE_ELEARNING') ? 'var(--rail-soft)' : '#fff',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <div style={{ width: 38, height: 38, borderRadius: 8, background: 'var(--rail)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                <i className="ti ti-device-laptop" />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--ink)' }}>Khóa Học Trực Tuyến (Online E-learning)</div>
                <div style={{ fontSize: 11.5, color: 'var(--ink-soft)' }}>Học viên tự học qua Video, YouTube, SCORM, Slide PPT, PDF &amp; Thi trắc nghiệm</div>
              </div>
            </button>
          )}

          <button
            type="button"
            onClick={() => patch({
              deliveryType: 'IN_PERSON_CLASSROOM',
              modality: 'CLASSROOM_LAB',
              format: 'Store Practical Lab / ILT',
              trainerId: isTrainerOnly ? authUser.userId : (draft.trainerId || eligibleTrainers[0]?.userId),
              trainerName: isTrainerOnly ? authUser.fullName : (draft.trainerName || eligibleTrainers[0]?.fullName),
              venueId: draft.venueId || meetingRoomsAndLabs[2]?.id || 'lab-ap-fresh',
              venue: draft.venue || meetingRoomsAndLabs[2]?.name || 'Fresh Food & Bakery Practical Lab (MM An Phu)',
              scheduleDate: draft.scheduleDate || '2026-08-28',
              scheduleTime: draft.scheduleTime || '08:30 - 11:30 (3.0 hours)',
              maxCapacity: draft.maxCapacity || 25,
            })}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '12px 16px',
              borderRadius: 8,
              border: draft.deliveryType === 'IN_PERSON_CLASSROOM' ? '2px solid var(--blue)' : '1px solid var(--line)',
              background: draft.deliveryType === 'IN_PERSON_CLASSROOM' ? 'var(--blue-soft)' : '#fff',
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            <div style={{ width: 38, height: 38, borderRadius: 8, background: 'var(--blue)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
              <i className="ti ti-chalkboard" />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--ink)' }}>Khóa Đào Tạo Trực Tiếp (In-Person Workshop)</div>
              <div style={{ fontSize: 11.5, color: 'var(--ink-soft)' }}>Học tập trung tại xưởng/phòng học có Giảng viên (Trainer) &amp; Điểm danh Live QR</div>
            </div>
          </button>
        </div>
      </div>

      {/* DEDICATED IN-PERSON CLASSROOM LOGISTICS CARD */}
      {draft.deliveryType === 'IN_PERSON_CLASSROOM' && (
        <div className="card card-pad" style={{ marginBottom: 16, borderColor: 'var(--blue)', background: 'linear-gradient(180deg, #FFFFFF 0%, var(--blue-soft) 100%)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div className="section-label" style={{ margin: 0, color: 'var(--blue)' }}>
              <i className="ti ti-school" style={{ marginRight: 6 }} />
              In-Person Training Logistics &amp; Faculty Assignment
            </div>
            <Badge tone="blue" icon="ti-qrcode">Live QR Attendance Enabled</Badge>
          </div>

          <div className="grid grid-2" style={{ marginBottom: 14 }}>
            <div>
              <label className="field-label">Giảng viên Đứng lớp (Assigned Trainer / Faculty)</label>
              {isTrainerOnly ? (
                // Trainer/L&D tự động là giảng viên đứng lớp — không chọn được người khác.
                <div className="field-input" style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--paper-sunken)' }}>
                  <i className="ti ti-user-check" style={{ color: 'var(--blue)' }} />
                  {authUser.fullName} — {roleDefinition(authRole).labelVi} (chính bạn)
                </div>
              ) : (
                <select
                  className="field-select"
                  value={draft.trainerId || eligibleTrainers[0]?.userId || ''}
                  onChange={(e) => {
                    const tr = eligibleTrainers.find((t) => t.userId === e.target.value);
                    patch({ trainerId: tr?.userId, trainerName: tr?.fullName });
                  }}
                >
                  {eligibleTrainers.map((t) => (
                    <option key={t.userId} value={t.userId}>
                      {t.fullName} — {roleDefinition(t.role).labelVi}
                      {t.userId === authUser?.userId ? ' (chính bạn)' : ''}
                    </option>
                  ))}
                </select>
              )}
              <div className="field-hint">Giảng viên được chọn sẽ thấy lớp này trong Cổng Giảng Dạy và mở mã QR Điểm danh tại lớp.</div>
            </div>

            <div>
              <label className="field-label">Địa điểm / Phòng Thực hành (Venue &amp; Practical Lab)</label>
              <select
                className="field-select"
                value={draft.venueId || 'lab-ap-fresh'}
                onChange={(e) => {
                  const r = meetingRoomsAndLabs.find((rm) => rm.id === e.target.value);
                  patch({ venueId: r?.id, venue: r?.name, maxCapacity: r?.capacity || 25 });
                }}
              >
                {meetingRoomsAndLabs.map((rm) => (
                  <option key={rm.id} value={rm.id}>
                    {rm.name} (Sức chứa: {rm.capacity} chỗ &middot; {rm.location})
                  </option>
                ))}
              </select>
              <div className="field-hint">Phòng học / Xưởng thực hành tổ chức buổi đào tạo thực tế.</div>
            </div>
          </div>

          <div className="grid grid-3" style={{ marginBottom: 14 }}>
            <div>
              <label className="field-label">Ngày tổ chức (Training Date)</label>
              <input
                type="date"
                className="field-input"
                value={draft.scheduleDate || '2026-08-28'}
                onChange={(e) => patch({ scheduleDate: e.target.value })}
              />
            </div>
            <div>
              <label className="field-label">Khung giờ (Time Window)</label>
              <select
                className="field-select"
                value={draft.scheduleTime || '08:30 - 11:30 (3.0 hours)'}
                onChange={(e) => patch({ scheduleTime: e.target.value })}
              >
                <option value="08:30 - 11:30 (3.0 hours)">08:30 - 11:30 (Sáng - 3.0 tiếng)</option>
                <option value="13:30 - 16:30 (3.0 hours)">13:30 - 16:30 (Chiều - 3.0 tiếng)</option>
                <option value="09:00 - 12:00 (3.0 hours)">09:00 - 12:00 (Sáng - 3.0 tiếng)</option>
                <option value="14:00 - 17:00 (3.0 hours)">14:00 - 17:00 (Chiều - 3.0 tiếng)</option>
              </select>
            </div>
            <div>
              <label className="field-label">Sức chứa tối đa (Max Capacity)</label>
              <input
                type="number"
                className="field-input"
                value={draft.maxCapacity || 25}
                onChange={(e) => patch({ maxCapacity: Number(e.target.value) || 25 })}
              />
            </div>
          </div>

          {/* Quick Target Audience Presets */}
          <div style={{ background: '#fff', borderRadius: 8, padding: '12px 14px', border: '1px solid var(--line)' }}>
            <label className="field-label" style={{ fontWeight: 700, color: 'var(--ink)', marginBottom: 6 }}>
              <i className="ti ti-users-group" style={{ marginRight: 6, color: 'var(--blue)' }} />
              Gán Nhanh Đối Tượng Học Viên Bắt Buộc Tham Gia (Target Cohort Enrollment)
            </label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {[
                { label: '👥 Tất cả Quản lý (All Managers)', type: 'ROLE', target: 'MANAGER' },
                { label: '🌱 Tất cả Nhân sự Mới (New Joiners)', type: 'STATUS', target: 'NEW_JOINER' },
                { label: '🥖 Nhân viên Quầy Bánh & Tươi sống (MM An Phú)', type: 'DEPARTMENT', target: 'dept-ppf' },
                { label: '🏢 Toàn bộ Nhân viên Siêu thị An Phú', type: 'STORE', target: 'store-an-phu' },
              ].map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    patch({
                      courseType: 'MANDATORY',
                      assignedCohortNote: preset.label,
                    });
                    if (preset.type === 'DEPARTMENT') {
                      setDraft((d) => ({
                        ...d,
                        courseType: 'MANDATORY',
                        assignment: {
                          assignmentType: 'DEPARTMENT',
                          targetDepartmentId: preset.target,
                          assignedBy: 'Sarah Nguyen (L&OD Admin)',
                          startDate: draft.scheduleDate || '2026-08-28',
                          dueDate: draft.scheduleDate || '2026-08-28',
                        },
                      }));
                    } else if (preset.type === 'STORE') {
                      setDraft((d) => ({
                        ...d,
                        courseType: 'MANDATORY',
                        assignment: {
                          assignmentType: 'STORE',
                          targetStoreId: preset.target,
                          assignedBy: 'Sarah Nguyen (L&OD Admin)',
                          startDate: draft.scheduleDate || '2026-08-28',
                          dueDate: draft.scheduleDate || '2026-08-28',
                        },
                      }));
                    }
                  }}
                  className="btn btn-sm"
                  style={{
                    background: draft.assignedCohortNote === preset.label ? 'var(--blue)' : 'var(--paper-sunken)',
                    color: draft.assignedCohortNote === preset.label ? '#fff' : 'var(--ink)',
                    borderColor: draft.assignedCohortNote === preset.label ? 'var(--blue)' : 'var(--line)',
                  }}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="card card-pad" style={{ marginBottom: 16 }}>
        <div className="section-label" style={{ margin: '0 0 14px' }}>Basic information</div>
        <div className="grid grid-3" style={{ marginBottom: 14 }}>
          <div>
            <label className="field-label">Course title</label>
            <input className="field-input" value={draft.title} onChange={(e) => patch({ title: e.target.value })} />
          </div>
          <div>
            <label className="field-label">Course code</label>
            <input className="field-input" value={draft.code} onChange={(e) => patch({ code: e.target.value })} />
          </div>
          <div>
            <label className="field-label">Category</label>
            <input className="field-input" value={draft.category} onChange={(e) => patch({ category: e.target.value })} />
          </div>
        </div>
        <div className="grid grid-2" style={{ marginBottom: 14 }}>
          <div>
            <label className="field-label">Cấp bậc mục tiêu (Target job level)</label>
            <select
              className="field-select"
              value={normalizeLevel(draft.targetLevel)}
              onChange={(e) => {
                const targetLevel = e.target.value;
                patch({
                  targetLevel,
                  targetLevelTitle: `Level ${targetLevel}: ${levelTitle(targetLevel)}`,
                  assignment: draft.assignment ? { ...draft.assignment, targetLevel } : draft.assignment,
                });
              }}
            >
              {[...LEVEL_DEFINITIONS].reverse().map((def) => (
                <option key={def.level} value={def.level}>
                  {def.emoji} Level {def.level} — {def.shortVi}
                </option>
              ))}
            </select>
            <div className="field-hint">
              Thang cấp bậc đảo ngược: <strong>Level 7 là thấp nhất</strong>, <strong>Level 1 là cao nhất</strong>. Học viên
              thấp hơn đúng 1 cấp phải được Quản lý phê duyệt mới học được; thấp hơn từ 2 cấp trở lên sẽ bị chặn cứng.
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <div style={{ background: 'var(--paper-sunken)', padding: '10px 14px', borderRadius: 8, width: '100%' }}>
              <div style={{ fontSize: 11.5, color: 'var(--ink-soft)', marginBottom: 6 }}>Xem trước huy hiệu cấp bậc trên danh mục:</div>
              <JobLevelBadge level={draft.targetLevel} />
            </div>
          </div>
        </div>
        <div style={{ marginBottom: 14 }}>
          <label className="field-label">Description</label>
          <textarea className="field-input" value={draft.description} onChange={(e) => patch({ description: e.target.value })} rows={2} style={{ resize: 'vertical' }} />
        </div>
        <div className="grid grid-3" style={{ marginBottom: 14 }}>
          <div>
            <label className="field-label">Course type</label>
            <select className="field-select" value={draft.courseType} onChange={(e) => setCourseType(e.target.value)}>
              <option value="OPTIONAL">Optional</option>
              <option value="MANDATORY">Mandatory</option>
            </select>
            <div className="field-hint">Only Admin can create, configure, publish and assign Mandatory courses.</div>
          </div>
          <div>
            <label className="field-label">Modality &amp; Format</label>
            <select
              className="field-select"
              value={draft.modality || (draft.deliveryType === 'IN_PERSON_CLASSROOM' ? 'CLASSROOM_LAB' : 'SCORM_PACKAGE')}
              onChange={(e) => {
                const modality = e.target.value;
                const format = modality === 'SCORM_PACKAGE' ? 'SCORM 2004'
                  : modality === 'PPT_PRESENTATION' ? 'Interactive PPT Slides'
                  : modality === 'EXTERNAL_PLATFORM' ? 'LinkedIn Learning / Coursera Embed'
                  : modality === 'YOUTUBE_LINK' ? 'YouTube Video (External Link)'
                  : modality === 'CLASSROOM_LAB' ? 'Store Practical Lab / ILT'
                  : 'Interactive Video';
                patch({ modality, format });
              }}
            >
              <option value="SCORM_PACKAGE">SCORM 2004 Package</option>
              <option value="INTERACTIVE_VIDEO">Interactive Video Stream</option>
              <option value="PPT_PRESENTATION">PowerPoint Slide Deck</option>
              <option value="EXTERNAL_PLATFORM">External Platform (LinkedIn / Coursera / Udemy)</option>
              <option value="YOUTUBE_LINK">YouTube Video (Link)</option>
              <option value="CLASSROOM_LAB">Store Practical Lab (ILT Workshop)</option>
            </select>
          </div>
          <div>
            <label className="field-label">Status</label>
            <select className="field-select" value={draft.status} onChange={(e) => patch({ status: e.target.value })}>
              <option value="DRAFT">Draft</option>
              <option value="PUBLISHED">Published</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </div>
        </div>

        {draft.modality === 'YOUTUBE_LINK' && (
          <div style={{ marginBottom: 14 }}>
            <label className="field-label">YouTube Video URL</label>
            <input
              className="field-input"
              placeholder="https://www.youtube.com/watch?v=..."
              value={draft.content?.youtubeUrl || ''}
              onChange={(e) => patch({ content: { ...draft.content, youtubeUrl: e.target.value } })}
            />
            <div className="field-hint">Paste a full YouTube watch/share/embed URL — learners will see it played inline on the lesson screen.</div>
          </div>
        )}

        {/* Course Thumbnail & Roadmap Milestone Visual Image */}
        <div style={{ background: 'var(--paper-sunken)', borderRadius: 10, padding: '16px', marginTop: 14, border: '1px solid var(--line)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <i className="ti ti-photo" style={{ color: 'var(--blue)', fontSize: 16 }} />
              Hình Ảnh Đại Diện Khóa Học &amp; Mốc Lộ Trình (Course Thumbnail &amp; Roadmap Milestone Image)
            </span>
            <Badge tone="blue">Sinh động hóa lộ trình học</Badge>
          </div>

          <div className="grid grid-2" style={{ gap: 16, marginBottom: 14 }}>
            <div>
              <label className="field-label">Đường dẫn ảnh (Image URL)</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="text"
                  className="field-input"
                  placeholder="https://images.unsplash.com/..."
                  value={draft.thumbnail || draft.imageUrl || ''}
                  onChange={(e) => {
                    const url = e.target.value;
                    patch({ thumbnail: url, imageUrl: url, milestoneImage: url });
                  }}
                />
                {(draft.thumbnail || draft.imageUrl) && (
                  <Button
                    size="sm"
                    variant="ghost"
                    icon="ti-x"
                    onClick={() => patch({ thumbnail: '', imageUrl: '', milestoneImage: '' })}
                    title="Xóa ảnh"
                  />
                )}
              </div>
              <div className="field-hint">
                Ảnh đại diện sẽ hiển thị trên Catalog, thẻ bài giảng và vòng tròn mốc chặng trên Lộ trình học tập (Roadmap).
              </div>

              {/* Preset Gallery Picker */}
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--ink-soft)', marginBottom: 8 }}>
                  Hoặc chọn nhanh từ thư viện ảnh mẫu MMVN:
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 8, maxHeight: 180, overflowY: 'auto', paddingRight: 4 }}>
                  {COURSE_IMAGE_PRESETS.map((preset) => {
                    const isSelected = (draft.thumbnail || draft.imageUrl) === preset.url;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => patch({ thumbnail: preset.url, imageUrl: preset.url, milestoneImage: preset.url })}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          padding: 6,
                          borderRadius: 6,
                          border: isSelected ? '2px solid var(--blue)' : '1px solid var(--line)',
                          background: isSelected ? '#eff6ff' : '#fff',
                          cursor: 'pointer',
                          textAlign: 'left',
                        }}
                      >
                        <img
                          src={preset.url}
                          alt={preset.label}
                          style={{ width: '100%', height: 50, objectFit: 'cover', borderRadius: 4, marginBottom: 4 }}
                        />
                        <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--ink)', lineHeight: 1.2, width: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={preset.label}>
                          {preset.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Live Preview Box */}
            <div style={{ background: '#fff', borderRadius: 8, padding: 14, border: '1px solid var(--line)' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                <i className="ti ti-eye" style={{ color: 'var(--sage)' }} />
                Xem trước hiển thị thực tế:
              </div>

              <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
                {/* 1. Catalog Card Preview */}
                <div style={{ width: 140, borderRadius: 8, border: '1px solid var(--line)', overflow: 'hidden', background: '#fff', boxShadow: '0 2px 6px rgba(0,0,0,0.06)' }}>
                  <img
                    src={getCourseImage(draft)}
                    alt="Preview"
                    style={{ width: '100%', height: 70, objectFit: 'cover' }}
                  />
                  <div style={{ padding: '6px 8px' }}>
                    <div style={{ fontSize: 9.5, fontFamily: 'var(--font-mono)', color: 'var(--ink-faint)' }}>{draft.code || 'CODE-001'}</div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {draft.title || 'Tên khóa học'}
                    </div>
                  </div>
                </div>

                {/* 2. Roadmap Milestone Node Preview */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <div style={{ fontSize: 9.5, fontWeight: 700, color: 'var(--blue)' }}>MỐC LỘ TRÌNH</div>
                  <div
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: '50%',
                      overflow: 'hidden',
                      border: '3px solid var(--blue)',
                      boxShadow: '0 2px 8px rgba(37, 99, 235, 0.2)',
                    }}
                  >
                    <img
                      src={getCourseImage(draft)}
                      alt="Roadmap Node Preview"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </div>
                  <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--ink-soft)' }}>Chặng học</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Version Audit Trail & Review Log */}
        <div style={{ background: 'var(--paper-sunken)', borderRadius: 8, padding: '12px 16px', marginTop: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ink)' }}>
              <i className="ti ti-history" style={{ marginRight: 6, color: 'var(--rail)' }} />
              Content Versioning &amp; Quality Audit Trail
            </span>
            <Badge tone="sage">Active Version: {draft.version}</Badge>
          </div>
          {(draft.versionHistory && draft.versionHistory.length > 0) ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}>
              {draft.versionHistory.map((h, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 12,
                    padding: '4px 0', borderTop: i > 0 ? '1px solid var(--line)' : 'none',
                  }}
                >
                  <span style={{ color: 'var(--ink)' }}>
                    <strong>{h.version}</strong>{i === 0 ? ' (latest)' : ''} &mdash; {h.note}
                  </span>
                  <span style={{ color: 'var(--ink-soft)', whiteSpace: 'nowrap' }}>{h.updatedBy} &middot; {h.updatedAt}</span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>No revision history yet — this is the original draft.</div>
          )}
        </div>
      </div>

      {draft.courseType === 'MANDATORY' && draft.assignment && (
        <div className="card card-pad" style={{ marginBottom: 16 }}>
          <div className="section-label" style={{ margin: '0 0 14px' }}>Target audience</div>
          <div className="grid grid-3" style={{ marginBottom: 14 }}>
            <div>
              <label className="field-label">Assignment type</label>
              <select className="field-select" value={draft.assignment.assignmentType} onChange={(e) => setAssignmentType(e.target.value)}>
                {ASSIGNMENT_TYPES.map((t) => (
                  <option key={t} value={t}>{assignmentTypeLabel(t)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="field-label">Target</label>
              <select
                className="field-select"
                value={draft.assignment[TARGET_ID_FIELD[draft.assignment.assignmentType]] || ''}
                onChange={(e) => setAssignmentTarget(e.target.value)}
              >
                {targetOptionsFor(draft.assignment.assignmentType).map((o) => (
                  <option key={o.id} value={o.id}>{o.label}</option>
                ))}
              </select>
              <div className="field-hint">Head Office (Business Unit / Division / Department), Operations (Area / Store Type / Cluster / Store), Level, Role, or a specific user.</div>
            </div>
            <div>
              <label className="field-label">Assigned by</label>
              <input className="field-input" value="Admin only" disabled />
            </div>
          </div>
          <div className="grid grid-2">
            <div>
              <label className="field-label">Start date</label>
              <input className="field-input" type="date" value={draft.assignment.startDate || ''} onChange={(e) => setDraft((d) => ({ ...d, assignment: { ...d.assignment, startDate: e.target.value } }))} />
            </div>
            <div>
              <label className="field-label">Due date</label>
              <input className="field-input" type="date" value={draft.assignment.dueDate || ''} onChange={(e) => setDraft((d) => ({ ...d, assignment: { ...d.assignment, dueDate: e.target.value } }))} />
            </div>
          </div>
        </div>
      )}

      <div className="grid" style={{ gridTemplateColumns: '260px 1fr', alignItems: 'start', gap: 20, marginBottom: 16 }}>
        <div className="card card-pad">
          <div className="section-label" style={{ margin: '0 0 12px' }}>Modules</div>
          {draft.modules.map((m) => (
            <button
              key={m.id}
              onClick={() => setActiveModuleId(m.id)}
              className="nav-item"
              style={{
                borderRadius: 8, marginBottom: 2,
                background: activeModule && m.id === activeModule.id ? 'var(--rail-soft)' : 'transparent',
                color: activeModule && m.id === activeModule.id ? 'var(--rail-soft-text)' : 'var(--ink)',
                borderLeft: 'none',
                fontWeight: activeModule && m.id === activeModule.id ? 600 : 400,
              }}
            >
              <span style={{
                width: 20, height: 20, borderRadius: '50%', display: 'inline-flex', alignItems: 'center',
                justifyContent: 'center', fontSize: 10.5, fontFamily: 'var(--font-mono)',
                background: activeModule && m.id === activeModule.id ? 'var(--rail)' : 'var(--slate-soft)',
                color: activeModule && m.id === activeModule.id ? '#fff' : 'var(--slate-soft-text)',
              }}>{m.displayOrder}</span>
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.title}</span>
            </button>
          ))}
          <div style={{ marginTop: 10 }}>
            <Button size="sm" block icon="ti-plus" onClick={addModule}>Add module</Button>
          </div>
        </div>

        <div>
          {!activeModule ? (
            <div className="card card-pad empty-state">
              <i className="ti ti-stack-2" aria-hidden="true" />
              <p>No modules yet. Add one to start building the syllabus.</p>
            </div>
          ) : (
            <>
              <div className="card card-pad" style={{ marginBottom: 16 }}>
                <div className="section-label" style={{ margin: '0 0 14px', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Module details</span>
                  <button className="icon-btn" aria-label="Delete module" onClick={() => removeModule(activeModule.id)}>
                    <i className="ti ti-trash" aria-hidden="true" />
                  </button>
                </div>
                <div className="grid grid-2">
                  <div>
                    <label className="field-label">Module title</label>
                    <input className="field-input" value={activeModule.title} onChange={(e) => updateModule(activeModule.id, { title: e.target.value })} />
                  </div>
                  <div>
                    <label className="field-label">Display order</label>
                    <input className="field-input" value={activeModule.displayOrder} type="number" onChange={(e) => updateModule(activeModule.id, { displayOrder: Number(e.target.value) })} />
                  </div>
                </div>
              </div>

              <div className="card" style={{ marginBottom: 16 }}>
                <div className="card-pad" style={{ paddingBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div className="section-label" style={{ margin: 0 }}>Lessons</div>
                  <Button size="sm" icon="ti-plus" onClick={() => addLesson(activeModule.id)}>Add lesson</Button>
                </div>
                <div className="card-pad" style={{ paddingTop: 4 }}>
                  {activeModule.lessons.length === 0 && (
                    <p style={{ fontSize: 13, color: 'var(--ink-soft)' }}>No lessons in this module yet.</p>
                  )}
                  {activeModule.lessons.map((l) => (
                    <LessonEditor
                      key={l.id}
                      lesson={l}
                      onChange={(fields) => updateLesson(activeModule.id, l.id, fields)}
                      onRemove={() => removeLesson(activeModule.id, l.id)}
                    />
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="card card-pad" style={{ marginBottom: 16 }}>
        <div className="section-label" style={{ margin: '0 0 14px', display: 'flex', justifyContent: 'space-between' }}>
          <span>Assessment</span>
          <label style={{ fontSize: 12.5, fontWeight: 400, display: 'flex', alignItems: 'center', gap: 6 }}>
            <input type="checkbox" checked={cfg.assessmentEnabled} onChange={(e) => patchConfig({ assessmentEnabled: e.target.checked })} /> Required to complete course
          </label>
        </div>
        {cfg.assessmentEnabled ? (
          <>
            <div className="grid grid-3" style={{ marginBottom: 14 }}>
              <div>
                <label className="field-label">Question bank size</label>
                <input className="field-input" value={cfg.questionBankSize} type="number" onChange={(e) => patchConfig({ questionBankSize: Number(e.target.value) })} />
              </div>
              <div>
                <label className="field-label">Questions per attempt</label>
                <input className="field-input" value={cfg.questionsPerAttempt} type="number" onChange={(e) => patchConfig({ questionsPerAttempt: Number(e.target.value) })} />
              </div>
              <div>
                <label className="field-label">Passing score (%)</label>
                <input className="field-input" value={cfg.passingScorePercent} type="number" onChange={(e) => patchConfig({ passingScorePercent: Number(e.target.value) })} />
              </div>
            </div>
            <div className="grid grid-3" style={{ marginBottom: 14 }}>
              <div>
                <label className="field-label">Maximum attempts</label>
                <input className="field-input" value={cfg.maxAttempts} type="number" onChange={(e) => patchConfig({ maxAttempts: Number(e.target.value) })} />
              </div>
              <div>
                <label className="field-label">Time limit (minutes)</label>
                <input className="field-input" value={cfg.assessmentTimeLimit} type="number" onChange={(e) => patchConfig({ assessmentTimeLimit: Number(e.target.value) })} />
              </div>
              <div>
                <label className="field-label">Show correct answers</label>
                <select className="field-select" value={cfg.showCorrectAnswers} onChange={(e) => patchConfig({ showCorrectAnswers: e.target.value })}>
                  <option value="IMMEDIATELY">Immediately after submission</option>
                  <option value="AFTER_PASSING">After passing</option>
                  <option value="AFTER_FINAL_ATTEMPT">After final attempt</option>
                  <option value="NEVER">Never</option>
                </select>
              </div>
            </div>
            <div className="grid grid-2" style={{ marginBottom: 18 }}>
              <label style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="checkbox" checked={cfg.randomizeQuestions} onChange={(e) => patchConfig({ randomizeQuestions: e.target.checked })} /> Randomize questions
              </label>
              <label style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="checkbox" checked={cfg.randomizeAnswers} onChange={(e) => patchConfig({ randomizeAnswers: e.target.checked })} /> Randomize answers
              </label>
            </div>

            <div style={{ borderTop: '1px solid var(--line)', paddingTop: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                <div className="section-label" style={{ margin: 0 }}>Question bank</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <Button size="sm" icon="ti-plus" onClick={addQuestion}>Add question</Button>
                  <label className="btn btn-sm" style={{ cursor: 'pointer' }}>
                    <i className="ti ti-upload" aria-hidden="true" /> Import CSV
                    <input type="file" accept=".csv" onChange={onImportCsv} style={{ display: 'none' }} />
                  </label>
                  <Button size="sm" variant="ghost" icon="ti-download" onClick={downloadQuestionCsvTemplate}>Download template</Button>
                </div>
              </div>
              {importMessage && <div style={{ fontSize: 12.5, color: 'var(--sage-soft-text)', marginBottom: 8 }}>{importMessage}</div>}
              <Badge tone={draft.questionBank.length >= cfg.questionsPerAttempt ? 'sage' : 'rust'}>
                {draft.questionBank.length} of {cfg.questionBankSize} configured questions added
              </Badge>
              <div style={{ marginTop: 12 }}>
                {draft.questionBank.length === 0 && (
                  <p style={{ fontSize: 13, color: 'var(--ink-soft)' }}>No questions yet — the assessment can't be taken until at least {cfg.questionsPerAttempt} are added.</p>
                )}
                {draft.questionBank.map((q, i) => (
                  <QuestionEditor
                    key={q.id}
                    index={i}
                    question={q}
                    editing={editingQuestionId === q.id}
                    onEdit={() => setEditingQuestionId(q.id)}
                    onDone={() => setEditingQuestionId(null)}
                    onChange={(fields) => updateQuestion(q.id, fields)}
                    onRemove={() => removeQuestion(q.id)}
                  />
                ))}
              </div>
            </div>
          </>
        ) : (
          <p style={{ fontSize: 13, color: 'var(--ink-soft)', margin: 0 }}>This course has no assessment; completion depends only on required lessons.</p>
        )}
      </div>

      <div className="card card-pad">
        <div className="section-label" style={{ margin: '0 0 14px' }}>Completion, prerequisites &amp; certificate</div>
        <div style={{ marginBottom: 14 }}>
          <label className="field-label">Course completion rule</label>
          <input className="field-input" value={cfg.completionRule} onChange={(e) => patchConfig({ completionRule: e.target.value })} />
        </div>
        <div className="grid grid-2">
          <div>
            <label className="field-label">Prerequisite courses</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
              {courses.filter((c) => c.id !== draft.id).map((c) => (
                <label key={c.id} style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input type="checkbox" checked={draft.prerequisites.includes(c.id)} onChange={() => togglePrerequisite(c.id)} /> {c.title}
                </label>
              ))}
            </div>
          </div>
          <label style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 8, marginTop: 22 }}>
            <input type="checkbox" checked={cfg.certificateEnabled} onChange={(e) => patchConfig({ certificateEnabled: e.target.checked })} /> Issue certificate on completion
          </label>
        </div>
      </div>
    </>
  );
}

function LessonEditor({ lesson, onChange, onRemove }) {
  return (
    <div className="activity-row" style={{ alignItems: 'flex-start', flexWrap: 'wrap' }}>
      <div className="activity-icon" style={{ background: 'var(--rail-soft)', color: 'var(--rail-soft-text)' }}>
        <i className={`ti ${LESSON_ICON[lesson.lessonType] || 'ti-file'}`} aria-hidden="true" />
      </div>
      <div style={{ flex: 1, minWidth: 240, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <input className="field-input" value={lesson.title} onChange={(e) => onChange({ title: e.target.value })} />
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <select
            className="field-select"
            style={{ width: 150 }}
            value={lesson.lessonType}
            onChange={(e) => onChange({ lessonType: e.target.value, rule: defaultRuleFor(e.target.value), content: defaultContentFor(e.target.value) })}
          >
            {['VIDEO', 'DOCUMENT', 'IMAGE', 'TEXT', 'SCRIPT', 'ASSESSMENT'].map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <label style={{ fontSize: 12.5, display: 'flex', alignItems: 'center', gap: 6 }}>
            <input type="checkbox" checked={lesson.isRequired} onChange={(e) => onChange({ isRequired: e.target.checked })} /> Required
          </label>
          <LessonRuleFields lesson={lesson} onChange={onChange} />
        </div>
        <LessonContentFields lesson={lesson} onChange={onChange} />
      </div>
      <button className="icon-btn" aria-label="Delete lesson" onClick={onRemove}>
        <i className="ti ti-trash" aria-hidden="true" />
      </button>
    </div>
  );
}

const ACCEPT_BY_TYPE = { VIDEO: 'video/*', DOCUMENT: '.pdf,.doc,.docx', SCRIPT: '.pdf,.doc,.docx,.txt', IMAGE: 'image/*' };

// Content upload (sections 10-12): a local file previews for this browser
// session only (no media server in this mockup — see CourseStore), or Admin can
// paste a hosted URL instead, which persists across reloads like everything else.
function LessonContentFields({ lesson, onChange }) {
  const content = lesson.content || {};

  if (lesson.lessonType === 'TEXT') {
    return (
      <div style={{ width: '100%' }}>
        <textarea
          className="field-input"
          rows={3}
          placeholder="Write the lesson text here…"
          value={content.text || ''}
          onChange={(e) => onChange({ content: { text: e.target.value } })}
          style={{ resize: 'vertical' }}
        />
      </div>
    );
  }

  if (lesson.lessonType === 'ASSESSMENT') return null;

  if (lesson.lessonType === 'IMAGE') {
    const files = content.files || [];
    function onPick(e) {
      const picked = [...e.target.files].map((f) => ({ url: URL.createObjectURL(f), fileName: f.name, fileType: f.type }));
      onChange({ content: { files: [...files, ...picked] } });
      e.target.value = '';
    }
    function removeFile(i) {
      onChange({ content: { files: files.filter((_, idx) => idx !== i) } });
    }
    return (
      <div style={{ width: '100%' }}>
        <label className="btn btn-sm" style={{ cursor: 'pointer' }}>
          <i className="ti ti-upload" aria-hidden="true" /> Choose images
          <input type="file" accept={ACCEPT_BY_TYPE.IMAGE} multiple onChange={onPick} style={{ display: 'none' }} />
        </label>
        {files.length > 0 && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
            {files.map((f, i) => (
              <div key={i} style={{ position: 'relative' }}>
                <img src={f.url} alt={f.fileName} style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 6, border: '1px solid var(--line)' }} />
                <button type="button" className="icon-btn" onClick={() => removeFile(i)} style={{ position: 'absolute', top: -8, right: -8, background: 'var(--paper-raised)' }} aria-label="Remove image">
                  <i className="ti ti-x" aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="field-hint">Uploaded images preview for this browser session only.</div>
      </div>
    );
  }

  // VIDEO / DOCUMENT / SCRIPT: a persisted URL, or a local file for a session preview.
  function onPick(e) {
    const f = e.target.files[0];
    if (!f) return;
    onChange({ content: { url: URL.createObjectURL(f), fileName: f.name, fileType: f.type } });
    e.target.value = '';
  }
  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 6 }}>
      <input
        className="field-input"
        placeholder="Hosted file URL (persists after reload)"
        value={content.fileName ? '' : (content.url || '')}
        disabled={Boolean(content.fileName)}
        onChange={(e) => onChange({ content: { url: e.target.value, fileName: null, fileType: null } })}
      />
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <label className="btn btn-sm" style={{ cursor: 'pointer' }}>
          <i className="ti ti-upload" aria-hidden="true" /> Choose file
          <input type="file" accept={ACCEPT_BY_TYPE[lesson.lessonType]} onChange={onPick} style={{ display: 'none' }} />
        </label>
        {content.fileName && (
          <>
            <Badge tone="rail" icon="ti-paperclip">{content.fileName}</Badge>
            <button type="button" className="icon-btn" onClick={() => onChange({ content: { url: '', fileName: null, fileType: null } })} aria-label="Remove file">
              <i className="ti ti-x" aria-hidden="true" />
            </button>
          </>
        )}
      </div>
      <div className="field-hint">Uploaded files preview for this browser session only — paste a hosted URL above for a link that survives a reload.</div>
    </div>
  );
}

// Seed lessons authored before per-type completion rules existed have no
// `rule` object at all (only lessons added via "Add lesson" in this editor
// get one from defaultRuleFor) — fall back to the same defaults so existing
// courses don't crash the editor when opened.
function LessonRuleFields({ lesson, onChange }) {
  const rule = lesson.rule || {};
  if (lesson.lessonType === 'VIDEO') {
    return (
      <label style={{ fontSize: 12.5, display: 'flex', alignItems: 'center', gap: 6 }}>
        Required watch
        <input className="field-input" style={{ width: 60 }} type="number" value={rule.requiredWatchPercent ?? 90}
          onChange={(e) => onChange({ rule: { ...rule, requiredWatchPercent: Number(e.target.value) } })} />%
      </label>
    );
  }
  if (lesson.lessonType === 'IMAGE') {
    return (
      <>
        <label style={{ fontSize: 12.5, display: 'flex', alignItems: 'center', gap: 6 }}>
          Image count
          <input className="field-input" style={{ width: 60 }} type="number" value={rule.imageCount ?? 1}
            onChange={(e) => onChange({ rule: { ...rule, imageCount: Number(e.target.value) } })} />
        </label>
        <label style={{ fontSize: 12.5, display: 'flex', alignItems: 'center', gap: 6 }}>
          <input type="checkbox" checked={rule.requireAllViewed ?? true} onChange={(e) => onChange({ rule: { ...rule, requireAllViewed: e.target.checked } })} /> Require all viewed
        </label>
      </>
    );
  }
  if (lesson.lessonType === 'ASSESSMENT') {
    return <span style={{ fontSize: 12, color: 'var(--ink-faint)' }}>Uses the course assessment configuration below.</span>;
  }
  return (
    <label style={{ fontSize: 12.5, display: 'flex', alignItems: 'center', gap: 6 }}>
      Required read
      <input className="field-input" style={{ width: 60 }} type="number" value={rule.requiredReadPercent ?? 90}
        onChange={(e) => onChange({ rule: { ...rule, requiredReadPercent: Number(e.target.value) } })} />%
    </label>
  );
}

function QuestionEditor({ index, question, editing, onEdit, onDone, onChange, onRemove }) {
  if (!editing) {
    return (
      <div className="card card-pad" style={{ marginBottom: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Q{index + 1}. {question.text || '(empty question)'}</div>
            <div style={{ fontSize: 11.5, color: 'var(--ink-faint)', marginTop: 4 }}>
              {question.type.replace('_', ' ')} &middot; {question.category || 'Uncategorized'} &middot; {question.difficulty} &middot; {question.score} pts &middot; {question.options.filter((o) => o.isCorrect).length} correct answer(s)
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <Button size="sm" onClick={onEdit}>Edit</Button>
            <Button size="sm" variant="ghost" icon="ti-trash" onClick={onRemove}>Remove</Button>
          </div>
        </div>
      </div>
    );
  }

  function setOptionText(id, text) {
    onChange({ options: question.options.map((o) => (o.id === id ? { ...o, text } : o)) });
  }
  function setCorrect(id) {
    if (question.type === 'MULTIPLE_CHOICE') {
      onChange({ options: question.options.map((o) => (o.id === id ? { ...o, isCorrect: !o.isCorrect } : o)) });
    } else {
      onChange({ options: question.options.map((o) => ({ ...o, isCorrect: o.id === id })) });
    }
  }
  function addOption() {
    onChange({ options: [...question.options, { id: genId('o'), text: '', isCorrect: false }] });
  }
  function addAcceptedAnswer() {
    onChange({ options: [...question.options, { id: genId('o'), text: '', isCorrect: true }] });
  }
  function removeOption(id) {
    onChange({ options: question.options.filter((o) => o.id !== id) });
  }
  function setType(type) {
    if (type === 'TRUE_FALSE') {
      onChange({ type, options: [{ id: genId('o'), text: 'True', isCorrect: true }, { id: genId('o'), text: 'False', isCorrect: false }] });
    } else if (type === 'SHORT_ANSWER') {
      onChange({ type, options: [{ id: genId('o'), text: '', isCorrect: true }] });
    } else {
      onChange({ type });
    }
  }

  return (
    <div className="card card-pad" style={{ marginBottom: 10, borderColor: 'var(--rail)' }}>
      <div style={{ marginBottom: 10 }}>
        <label className="field-label">Question text</label>
        <textarea className="field-input" rows={2} value={question.text} onChange={(e) => onChange({ text: e.target.value })} style={{ resize: 'vertical' }} />
      </div>
      <div className="grid grid-4" style={{ marginBottom: 10 }}>
        <div>
          <label className="field-label">Type</label>
          <select className="field-select" value={question.type} onChange={(e) => setType(e.target.value)}>
            <option value="SINGLE_CHOICE">Single choice</option>
            <option value="MULTIPLE_CHOICE">Multiple choice</option>
            <option value="TRUE_FALSE">True / False</option>
            <option value="SHORT_ANSWER">Short answer (free text)</option>
          </select>
        </div>
        <div>
          <label className="field-label">Category</label>
          <input className="field-input" value={question.category} onChange={(e) => onChange({ category: e.target.value })} />
        </div>
        <div>
          <label className="field-label">Difficulty</label>
          <select className="field-select" value={question.difficulty} onChange={(e) => onChange({ difficulty: e.target.value })}>
            <option value="EASY">Easy</option>
            <option value="MEDIUM">Medium</option>
            <option value="HARD">Hard</option>
          </select>
        </div>
        <div>
          <label className="field-label">Score</label>
          <input className="field-input" type="number" value={question.score} onChange={(e) => onChange({ score: Number(e.target.value) })} />
        </div>
      </div>
      <div style={{ marginBottom: 10 }}>
        <label className="field-label">
          {question.type === 'SHORT_ANSWER'
            ? 'Accepted answer(s) — learner input matches any one, case-insensitive'
            : `Answer options (${question.type === 'MULTIPLE_CHOICE' ? 'check all correct answers' : 'select the correct answer'})`}
        </label>
        {question.options.map((o) => (
          <div key={o.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            {question.type !== 'SHORT_ANSWER' && (
              <input
                type={question.type === 'MULTIPLE_CHOICE' ? 'checkbox' : 'radio'}
                name={`correct-${question.id}`}
                checked={o.isCorrect}
                onChange={() => setCorrect(o.id)}
              />
            )}
            <input
              className="field-input"
              value={o.text}
              disabled={question.type === 'TRUE_FALSE'}
              placeholder={question.type === 'SHORT_ANSWER' ? 'Accepted answer text' : undefined}
              onChange={(e) => setOptionText(o.id, e.target.value)}
              style={{ flex: 1 }}
            />
            {question.type !== 'TRUE_FALSE' && question.options.length > (question.type === 'SHORT_ANSWER' ? 1 : 2) && (
              <button className="icon-btn" aria-label="Remove option" onClick={() => removeOption(o.id)}>
                <i className="ti ti-x" aria-hidden="true" />
              </button>
            )}
          </div>
        ))}
        {question.type === 'SHORT_ANSWER' && (
          <Button size="sm" icon="ti-plus" onClick={addAcceptedAnswer}>Add alternative answer</Button>
        )}
        {question.type !== 'TRUE_FALSE' && question.type !== 'SHORT_ANSWER' && (
          <Button size="sm" icon="ti-plus" onClick={addOption}>Add option</Button>
        )}
      </div>
      <div style={{ marginBottom: 12 }}>
        <label className="field-label">Explanation (optional)</label>
        <input className="field-input" value={question.explanation} onChange={(e) => onChange({ explanation: e.target.value })} />
      </div>
      <Button size="sm" variant="primary" icon="ti-check" onClick={onDone}>Done</Button>
    </div>
  );
}
