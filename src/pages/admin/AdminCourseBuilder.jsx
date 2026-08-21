import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  businessUnits, divisions, departments, jobLevels, demoUsers, allUsers, createBlankCourse,
} from '../../data/mockData';
import { Badge, Button, CourseTypeBadge } from '../../components/ui';
import { useCourseStore } from '../../state/CourseStore';

const LESSON_ICON = {
  VIDEO: 'ti-video', DOCUMENT: 'ti-file-text', IMAGE: 'ti-photo',
  TEXT: 'ti-align-left', SCRIPT: 'ti-article', ASSESSMENT: 'ti-writing',
};

const ASSIGNMENT_TYPES = ['BUSINESS_UNIT', 'DIVISION', 'DEPARTMENT', 'LEVEL', 'ROLE', 'USER'];
const TARGET_ID_FIELD = {
  BUSINESS_UNIT: 'targetBusinessUnitId', DIVISION: 'targetDivisionId',
  DEPARTMENT: 'targetDepartmentId', LEVEL: 'targetLevel', ROLE: 'targetRole', USER: 'targetUserId',
};

function targetOptionsFor(assignmentType) {
  switch (assignmentType) {
    case 'BUSINESS_UNIT': return businessUnits.map((b) => ({ id: b.id, label: b.name }));
    case 'DIVISION': return divisions.map((d) => ({ id: d.id, label: `${d.code} - ${d.name}` }));
    case 'DEPARTMENT': return departments.map((d) => ({ id: d.id, label: `${d.code} - ${d.name}` }));
    case 'LEVEL': return jobLevels.map((l) => ({ id: l.level, label: `Level ${l.level} - ${l.title}` }));
    case 'ROLE': return [{ id: 'admin', label: 'Admin (HRD Director Level 1)' }, { id: 'manager', label: 'Line Manager (Level 4-5)' }, { id: 'learner', label: 'Learner (Level 6-7, CL, IN)' }];
    case 'USER': return (demoUsers || allUsers()).filter((u) => u.role !== 'admin').map((u) => ({ id: u.userId, label: `${u.fullName} (${u.employeeCode} · Lvl ${u.level} · ${u.divisionCode}-${u.departmentCode})` }));
    default: return [];
  }
}


function genId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.round(Math.random() * 1e4)}`;
}

function cloneCourse(course) {
  return typeof structuredClone === 'function' ? structuredClone(course) : JSON.parse(JSON.stringify(course));
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
// are skipped and counted, never silently dropped.
function parseQuestionCsv(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const rows = lines.slice(1);
  const questions = [];
  let skipped = 0;
  for (const line of rows) {
    const [qText, type, optA, optB, optC, optD, correct, category, difficulty, score, explanation] = parseCsvLine(line);
    if (!qText || !type) { skipped++; continue; }
    const letters = ['A', 'B', 'C', 'D'];
    const optionTexts = [optA, optB, optC, optD];
    const correctLetters = (correct || '').split(';').map((s) => s.trim().toUpperCase()).filter(Boolean);
    const options = letters
      .map((letter, i) => ({ id: genId('o'), text: optionTexts[i], isCorrect: correctLetters.includes(letter) }))
      .filter((o) => o.text);
    if (options.length < 2 || !options.some((o) => o.isCorrect)) { skipped++; continue; }
    const normalizedType = ['SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'TRUE_FALSE'].includes((type || '').toUpperCase())
      ? type.toUpperCase() : 'SINGLE_CHOICE';
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
  const { courses, addCourse, updateCourse } = useCourseStore();
  const isNew = !courseId || courseId === 'new';
  const existing = isNew ? null : courses.find((c) => c.id === courseId);

  const [draft, setDraft] = useState(() => cloneCourse(existing || createBlankCourse()));
  const [activeModuleId, setActiveModuleId] = useState(draft.modules[0]?.id);
  const [editingQuestionId, setEditingQuestionId] = useState(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [importMessage, setImportMessage] = useState('');

  useEffect(() => {
    const fresh = cloneCourse(existing || createBlankCourse());
    setDraft(fresh);
    setActiveModuleId(fresh.modules[0]?.id);
    setSaved(false);
    setError('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  if (!isNew && !existing) {
    return (
      <div className="empty-state">
        <i className="ti ti-mood-empty" aria-hidden="true" />
        <p>Course not found.</p>
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

  function handleSave() {
    if (!draft.title.trim()) { setError('Course title is required.'); return; }
    if (draft.courseType === 'MANDATORY' && !draft.assignment?.dueDate) { setError('Mandatory courses need a due date for their target audience.'); return; }
    setError('');
    if (isNew) {
      addCourse(draft);
      navigate(`/admin/courses/${draft.id}`, { replace: true });
    } else {
      updateCourse(draft.id, draft);
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
        <div style={{ marginBottom: 14 }}>
          <label className="field-label">Description</label>
          <textarea className="field-input" value={draft.description} onChange={(e) => patch({ description: e.target.value })} rows={2} style={{ resize: 'vertical' }} />
        </div>
        <div className="grid grid-3">
          <div>
            <label className="field-label">Course type</label>
            <select className="field-select" value={draft.courseType} onChange={(e) => setCourseType(e.target.value)}>
              <option value="OPTIONAL">Optional</option>
              <option value="MANDATORY">Mandatory</option>
            </select>
            <div className="field-hint">Only Admin can create, configure, publish and assign Mandatory courses.</div>
          </div>
          <div>
            <label className="field-label">Status</label>
            <select className="field-select" value={draft.status} onChange={(e) => patch({ status: e.target.value })}>
              <option value="DRAFT">Draft</option>
              <option value="PUBLISHED">Published</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </div>
          <div>
            <label className="field-label">Version</label>
            <input className="field-input" value={draft.version} onChange={(e) => patch({ version: e.target.value })} />
          </div>
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
              <div className="field-hint">Business Unit, Division, Department, Role, or a specific user.</div>
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

function LessonRuleFields({ lesson, onChange }) {
  if (lesson.lessonType === 'VIDEO') {
    return (
      <label style={{ fontSize: 12.5, display: 'flex', alignItems: 'center', gap: 6 }}>
        Required watch
        <input className="field-input" style={{ width: 60 }} type="number" value={lesson.rule.requiredWatchPercent}
          onChange={(e) => onChange({ rule: { ...lesson.rule, requiredWatchPercent: Number(e.target.value) } })} />%
      </label>
    );
  }
  if (lesson.lessonType === 'IMAGE') {
    return (
      <>
        <label style={{ fontSize: 12.5, display: 'flex', alignItems: 'center', gap: 6 }}>
          Image count
          <input className="field-input" style={{ width: 60 }} type="number" value={lesson.rule.imageCount}
            onChange={(e) => onChange({ rule: { ...lesson.rule, imageCount: Number(e.target.value) } })} />
        </label>
        <label style={{ fontSize: 12.5, display: 'flex', alignItems: 'center', gap: 6 }}>
          <input type="checkbox" checked={lesson.rule.requireAllViewed} onChange={(e) => onChange({ rule: { ...lesson.rule, requireAllViewed: e.target.checked } })} /> Require all viewed
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
      <input className="field-input" style={{ width: 60 }} type="number" value={lesson.rule.requiredReadPercent}
        onChange={(e) => onChange({ rule: { ...lesson.rule, requiredReadPercent: Number(e.target.value) } })} />%
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
  function removeOption(id) {
    onChange({ options: question.options.filter((o) => o.id !== id) });
  }
  function setType(type) {
    if (type === 'TRUE_FALSE') {
      onChange({ type, options: [{ id: genId('o'), text: 'True', isCorrect: true }, { id: genId('o'), text: 'False', isCorrect: false }] });
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
        <label className="field-label">Answer options ({question.type === 'MULTIPLE_CHOICE' ? 'check all correct answers' : 'select the correct answer'})</label>
        {question.options.map((o) => (
          <div key={o.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <input
              type={question.type === 'MULTIPLE_CHOICE' ? 'checkbox' : 'radio'}
              name={`correct-${question.id}`}
              checked={o.isCorrect}
              onChange={() => setCorrect(o.id)}
            />
            <input
              className="field-input"
              value={o.text}
              disabled={question.type === 'TRUE_FALSE'}
              onChange={(e) => setOptionText(o.id, e.target.value)}
              style={{ flex: 1 }}
            />
            {question.type !== 'TRUE_FALSE' && question.options.length > 2 && (
              <button className="icon-btn" aria-label="Remove option" onClick={() => removeOption(o.id)}>
                <i className="ti ti-x" aria-hidden="true" />
              </button>
            )}
          </div>
        ))}
        {question.type !== 'TRUE_FALSE' && (
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

function assignmentTypeLabel(t) {
  return { BUSINESS_UNIT: 'Business Unit', DIVISION: 'Division', DEPARTMENT: 'Department', ROLE: 'Role', USER: 'Individual User' }[t];
}
