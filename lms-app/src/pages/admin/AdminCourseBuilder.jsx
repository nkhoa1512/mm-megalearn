import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
  businessUnits, divisions, departments, jobLevels, demoUsers, allUsers, createBlankCourse,
  meetingRoomsAndLabs, teachingEligibleUsers, nextMajorVersion,
} from '../../data/mockData';
import { ASSIGNMENT_TYPES, TARGET_ID_FIELD, targetOptionsFor, assignmentTypeLabel, resolveTargetLabel } from '../../data/assignmentTargets';
import { Badge, Button, CourseTypeBadge, JobLevelBadge } from '../../features/common/ui';
import { LEVEL_DEFINITIONS, normalizeLevel, levelTitle } from '../../data/levelSystem';
import { normalizeRole, hasCapability, roleDefinition } from '../../data/roles';
import { useCourseStore } from '../../store/CourseStore';
import { COURSE_IMAGE_PRESETS, getCourseImage } from '../../data/courseImages';
import { generateCourseCode } from '../../utils/courseCatalog';
import AssessmentEditorModal from '../../features/assessment/AssessmentEditorModal';
import MultiTargetAssigner from '../../features/catalog/MultiTargetAssigner';
import { QUESTION_BANK as questionBanks, CONTENT_FORMATS } from '../../data/assessmentData';
import { generateAssessmentCode } from '../../utils/assessmentCatalog';

// 5 định dạng bài giảng chuẩn hóa (thay cho DOCUMENT/SCRIPT/IMAGE/TEXT cũ và
// việc course.modality từng ghi đè loại bài giảng ở Lesson Player):
// SCORM, VIDEO, PDF, PPT, EXTERNAL_LINK (Udemy/LinkedIn Learning/Coursera/
// YouTube/Khác). ASSESSMENT là cổng thẩm định năng lực riêng, không tính vào
// 5 định dạng truyền tải nội dung này.
const LESSON_ICON = {
  SCORM: 'ti-package', VIDEO: 'ti-video', PDF: 'ti-file-text',
  PPT: 'ti-presentation', EXTERNAL_LINK: 'ti-external-link',
};
const EXTERNAL_LINK_PLATFORMS = [
  { value: 'UDEMY', label: 'Udemy' },
  { value: 'LINKEDIN', label: 'LinkedIn Learning' },
  { value: 'COURSERA', label: 'Coursera' },
  { value: 'YOUTUBE', label: 'YouTube' },
  { value: 'CUSTOM', label: 'Khác (Custom LMS Link)' },
];


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

// Khóa được biên soạn trước khi có categories[] đa lựa chọn — suy ra từ
// category đơn cũ để ô tick chọn Category luôn có sẵn dữ liệu ban đầu.
function withCategoryDefaults(course) {
  if (course.categories && course.categories.length) return course;
  return { ...course, categories: course.category ? [course.category] : [] };
}

function withLevelDefaults(course) {
  const targetLevels = course.targetLevels && course.targetLevels.length > 0
    ? course.targetLevels.map(normalizeLevel)
    : course.targetLevel ? [normalizeLevel(course.targetLevel)] : [];
  return {
    ...course,
    targetLevels,
    targetLevel: targetLevels[0] || '',
    targetLevelTitle: targetLevels.length ? targetLevels.map((l) => `Level ${l}`).join(', ') : '',
  };
}

// deliveryType + onlineClassType đã quyết định đầy đủ hình thức đào tạo (3
// nhánh: E-Learning tự học / Lớp trực tuyến Live / Đào tạo trực tiếp) — suy ra
// modality/format từ đây thay vì để Admin chọn tay qua dropdown đã bỏ.
function deriveModalityFormat(deliveryType, onlineClassType) {
  if (deliveryType === 'IN_PERSON_CLASSROOM') return { modality: 'CLASSROOM_LAB', format: 'Store Practical Lab / ILT' };
  if (onlineClassType === 'VIRTUAL_CLASS') return { modality: 'VIRTUAL_LIVE_CLASS', format: 'Live Online Class' };
  return { modality: 'SCORM_PACKAGE', format: 'SCORM 2004' };
}

function defaultRuleFor(lessonType) {
  if (lessonType === 'VIDEO') return { requiredWatchPercent: 90 };
  if (lessonType === 'PPT' || lessonType === 'SCORM') return { requireAllViewed: true };
  return { requiredReadPercent: 90 };
}

function defaultContentFor(lessonType) {
  if (lessonType === 'PPT' || lessonType === 'SCORM') return {};
  if (lessonType === 'EXTERNAL_LINK') return { platform: 'UDEMY', url: '' };
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

function CategoryMultiSelectDropdown({ id, selected = [], options = [], onChange, hasError, errorMessage }) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const filteredOptions = useMemo(() => {
    if (!search.trim()) return options;
    return options.filter((opt) => opt.toLowerCase().includes(search.toLowerCase()));
  }, [options, search]);

  const toggleOption = (cat) => {
    const next = selected.includes(cat) ? selected.filter((c) => c !== cat) : [...selected, cat];
    onChange(next);
  };

  const removeOption = (e, cat) => {
    e.stopPropagation();
    onChange(selected.filter((c) => c !== cat));
  };

  return (
    <div id={id} ref={dropdownRef} style={{ position: 'relative' }}>
      <label className="field-label" style={{ fontWeight: 700, color: 'var(--ink)', marginBottom: 6, display: 'flex', justifyContent: 'space-between' }}>
        <span>
          <i className="ti ti-tag" style={{ marginRight: 6, color: 'var(--rail)' }} />
          Danh Mục Khóa Học (Course Categories) <span style={{ color: 'var(--rust)' }}>*</span>
        </span>
        <span style={{ fontSize: 11.5, fontWeight: 600, color: selected.length > 0 ? 'var(--rail)' : 'var(--ink-faint)' }}>
          {selected.length > 0 ? `Đã chọn: ${selected.length}` : 'Chưa chọn'}
        </span>
      </label>

      {/* Input Display Box */}
      <div
        onClick={() => setIsOpen((prev) => !prev)}
        style={{
          minHeight: 42,
          padding: '6px 10px',
          background: '#fff',
          border: hasError
            ? '2px solid var(--rust, #dc2626)'
            : isOpen
            ? '1.5px solid var(--rail, #15803d)'
            : '1px solid var(--line-strong, #cbd5e1)',
          borderRadius: 8,
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 6,
          boxShadow: hasError
            ? '0 0 0 3px rgba(220, 38, 38, 0.15)'
            : isOpen
            ? '0 0 0 3px rgba(21, 128, 61, 0.12)'
            : 'none',
          transition: 'all 0.15s ease',
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, flex: 1, minWidth: 0 }}>
          {selected.length === 0 ? (
            <span style={{ color: hasError ? 'var(--rust, #dc2626)' : 'var(--ink-faint)', fontSize: 13 }}>
              Chọn danh mục khóa học... (Bắt buộc)
            </span>
          ) : (
            selected.map((cat) => (
              <span
                key={cat}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '2px 8px',
                  borderRadius: 6,
                  background: 'var(--rail-soft, #f0fdf4)',
                  color: 'var(--rail-soft-text, #166534)',
                  border: '1px solid #bbf7d0',
                  fontSize: 11.5,
                  fontWeight: 600,
                }}
              >
                {cat}
                <i
                  className="ti ti-x"
                  style={{ fontSize: 10, cursor: 'pointer', marginLeft: 2, opacity: 0.8 }}
                  onClick={(e) => removeOption(e, cat)}
                />
              </span>
            ))
          )}
        </div>
        <i className={`ti ${isOpen ? 'ti-chevron-up' : 'ti-chevron-down'}`} style={{ color: hasError ? 'var(--rust)' : 'var(--ink-faint)', fontSize: 13, flexShrink: 0 }} />
      </div>

      {hasError && errorMessage && (
        <div style={{ color: 'var(--rust, #dc2626)', fontSize: 11.5, marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
          <i className="ti ti-alert-circle" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Dropdown Menu */}
      <div
        style={{
          display: isOpen ? 'block' : 'none',
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          marginTop: 6,
          background: '#fff',
          border: '1px solid var(--line-strong, #cbd5e1)',
          borderRadius: 8,
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
          zIndex: 50,
          padding: 10,
        }}
      >
        {/* Quick Action Buttons */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6, marginBottom: 8, paddingBottom: 8, borderBottom: '1px solid var(--line)', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-soft)' }}>Thao tác nhanh:</span>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-sm btn-ghost"
              style={{ fontSize: 11, padding: '2px 6px', height: 24, background: 'var(--paper-sunken)' }}
              onClick={() => onChange([...options])}
            >
              Chọn tất cả ({options.length})
            </button>
            <button
              type="button"
              className="btn btn-sm btn-ghost"
              style={{ fontSize: 11, padding: '2px 6px', height: 24, background: 'var(--paper-sunken)' }}
              onClick={() => onChange([options[0]])}
            >
              Mặc định
            </button>
            <button
              type="button"
              className="btn btn-sm btn-ghost"
              style={{ fontSize: 11, padding: '2px 6px', height: 24, background: 'var(--paper-sunken)', color: 'var(--rust)' }}
              onClick={() => onChange([])}
            >
              Xóa chọn
            </button>
          </div>
        </div>

        {/* Quick Search */}
        <div style={{ position: 'relative', marginBottom: 8 }}>
          <i className="ti ti-search" style={{ position: 'absolute', left: 8, top: 8, color: 'var(--ink-faint)', fontSize: 12 }} />
          <input
            type="text"
            className="field-input"
            style={{ paddingLeft: 26, height: 30, fontSize: 12 }}
            placeholder="Tìm kiếm danh mục..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onClick={(e) => e.stopPropagation()}
          />
        </div>

        {/* Options List */}
        <div style={{ maxHeight: 210, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {filteredOptions.map((cat) => {
            const isChecked = selected.includes(cat);
            return (
              <div
                key={cat}
                onClick={() => toggleOption(cat)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '6px 8px',
                  borderRadius: 6,
                  cursor: 'pointer',
                  background: isChecked ? 'var(--rail-soft, #f0fdf4)' : 'transparent',
                  fontSize: 12.5,
                  color: isChecked ? 'var(--rail-soft-text, #166534)' : 'var(--ink)',
                  fontWeight: isChecked ? 600 : 400,
                }}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => {}} // handled by parent
                  style={{ cursor: 'pointer' }}
                />
                <span>{cat}</span>
              </div>
            );
          })}
          {filteredOptions.length === 0 && (
            <div style={{ padding: '12px 8px', textAlign: 'center', fontSize: 12, color: 'var(--ink-faint)' }}>
              Không tìm thấy danh mục phù hợp.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function LevelMultiSelectDropdown({ id, selected = [], onChange, hasError, errorMessage }) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const allLevels = ['1', '2', '3', '4', '5', '6', '7'];
  const filteredLevels = useMemo(() => {
    if (!search.trim()) return allLevels;
    const q = search.toLowerCase().trim();
    return allLevels.filter((lvl) => `level ${lvl}`.includes(q) || `lv ${lvl}`.includes(q) || lvl === q);
  }, [search]);

  const toggleLevel = (lvl) => {
    const next = selected.includes(lvl) ? selected.filter((l) => l !== lvl) : [...selected, lvl].sort((a, b) => Number(a) - Number(b));
    onChange(next);
  };

  const removeLevel = (e, lvl) => {
    e.stopPropagation();
    onChange(selected.filter((l) => l !== lvl));
  };

  return (
    <div id={id} ref={dropdownRef} style={{ position: 'relative' }}>
      <label className="field-label" style={{ fontWeight: 700, color: 'var(--ink)', marginBottom: 6, display: 'flex', justifyContent: 'space-between' }}>
        <span>
          <i className="ti ti-chart-arrows" style={{ marginRight: 6, color: 'var(--rail)' }} />
          Cấp Bậc Áp Dụng (Target Job Level) <span style={{ color: 'var(--rust)' }}>*</span>
        </span>
        <span style={{ fontSize: 11.5, fontWeight: 600, color: selected.length > 0 ? 'var(--rail)' : 'var(--ink-faint)' }}>
          {selected.length > 0 ? `Đã chọn: ${selected.length} Level` : 'Chưa chọn'}
        </span>
      </label>

      {/* Input Display Box */}
      <div
        onClick={() => setIsOpen((prev) => !prev)}
        style={{
          minHeight: 42,
          padding: '6px 10px',
          background: '#fff',
          border: hasError
            ? '2px solid var(--rust, #dc2626)'
            : isOpen
            ? '1.5px solid var(--rail, #15803d)'
            : '1px solid var(--line-strong, #cbd5e1)',
          borderRadius: 8,
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 6,
          boxShadow: hasError
            ? '0 0 0 3px rgba(220, 38, 38, 0.15)'
            : isOpen
            ? '0 0 0 3px rgba(21, 128, 61, 0.12)'
            : 'none',
          transition: 'all 0.15s ease',
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, flex: 1, minWidth: 0 }}>
          {selected.length === 0 ? (
            <span style={{ color: hasError ? 'var(--rust, #dc2626)' : 'var(--ink-faint)', fontSize: 13 }}>
              Chọn cấp bậc áp dụng... (Bắt buộc)
            </span>
          ) : (
            selected.map((lvl) => (
              <span
                key={lvl}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '2px 8px',
                  borderRadius: 6,
                  background: 'var(--blue-soft, #eff6ff)',
                  color: 'var(--blue, #1e40af)',
                  border: '1px solid #bfdbfe',
                  fontSize: 11.5,
                  fontWeight: 700,
                }}
              >
                Level {lvl}
                <i
                  className="ti ti-x"
                  style={{ fontSize: 10, cursor: 'pointer', marginLeft: 2, opacity: 0.8 }}
                  onClick={(e) => removeLevel(e, lvl)}
                />
              </span>
            ))
          )}
        </div>
        <i className={`ti ${isOpen ? 'ti-chevron-up' : 'ti-chevron-down'}`} style={{ color: hasError ? 'var(--rust)' : 'var(--ink-faint)', fontSize: 13, flexShrink: 0 }} />
      </div>

      {hasError && errorMessage && (
        <div style={{ color: 'var(--rust, #dc2626)', fontSize: 11.5, marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
          <i className="ti ti-alert-circle" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Dropdown Menu */}
      <div
        style={{
          display: isOpen ? 'block' : 'none',
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          marginTop: 6,
          background: '#fff',
          border: '1px solid var(--line-strong, #cbd5e1)',
          borderRadius: 8,
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
          zIndex: 50,
          padding: 10,
        }}
      >
        {/* Quick Action Presets */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 4, marginBottom: 8, paddingBottom: 8, borderBottom: '1px solid var(--line)', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-soft)' }}>Chọn nhanh:</span>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-sm btn-ghost"
              style={{ fontSize: 11, padding: '2px 6px', height: 24, background: 'var(--paper-sunken)' }}
              onClick={() => onChange([...allLevels])}
            >
              Chọn Tất Cả (Lv 1 - 7)
            </button>
            <button
              type="button"
              className="btn btn-sm btn-ghost"
              style={{ fontSize: 11, padding: '2px 6px', height: 24, background: 'var(--paper-sunken)' }}
              onClick={() => onChange(['1', '2', '3', '4'])}
            >
              Quản Lý (Lv 1 - 4)
            </button>
            <button
              type="button"
              className="btn btn-sm btn-ghost"
              style={{ fontSize: 11, padding: '2px 6px', height: 24, background: 'var(--paper-sunken)' }}
              onClick={() => onChange(['5', '6', '7'])}
            >
              Tuyến Đầu (Lv 5 - 7)
            </button>
            <button
              type="button"
              className="btn btn-sm btn-ghost"
              style={{ fontSize: 11, padding: '2px 6px', height: 24, background: 'var(--paper-sunken)', color: 'var(--rust)' }}
              onClick={() => onChange([])}
            >
              Xóa chọn
            </button>
          </div>
        </div>

        {/* Quick Search */}
        <div style={{ position: 'relative', marginBottom: 8 }}>
          <i className="ti ti-search" style={{ position: 'absolute', left: 8, top: 8, color: 'var(--ink-faint)', fontSize: 12 }} />
          <input
            type="text"
            className="field-input"
            style={{ paddingLeft: 26, height: 30, fontSize: 12 }}
            placeholder="Tìm kiếm Level (VD: 1, 2, Level 5)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onClick={(e) => e.stopPropagation()}
          />
        </div>

        {/* Level Options Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 6 }}>
          {filteredLevels.map((lvl) => {
            const isChecked = selected.includes(lvl);
            return (
              <div
                key={lvl}
                onClick={() => toggleLevel(lvl)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 10px',
                  borderRadius: 6,
                  cursor: 'pointer',
                  background: isChecked ? 'var(--blue-soft, #eff6ff)' : 'var(--paper-sunken)',
                  border: isChecked ? '1px solid var(--blue, #3b82f6)' : '1px solid var(--line)',
                  fontSize: 12.5,
                  color: isChecked ? 'var(--blue, #1e40af)' : 'var(--ink)',
                  fontWeight: isChecked ? 700 : 500,
                }}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => {}} // handled by parent
                  style={{ cursor: 'pointer' }}
                />
                <span>Level {lvl}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function PrerequisiteCoursesPicker({ courses = [], currentCourseId, selectedIds = [], onToggle, onClear }) {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [isExpanded, setIsExpanded] = useState(false);

  const availableCourses = useMemo(() => {
    return courses.filter((c) => c.id !== currentCourseId);
  }, [courses, currentCourseId]);

  const categories = useMemo(() => {
    const set = new Set(availableCourses.map((c) => c.category || 'Store Operations'));
    return Array.from(set);
  }, [availableCourses]);

  const filteredCourses = useMemo(() => {
    return availableCourses.filter((c) => {
      const matchCat = categoryFilter === 'ALL' || (c.category || 'Store Operations') === categoryFilter;
      const matchSearch = !search.trim() ||
        c.title.toLowerCase().includes(search.toLowerCase()) ||
        (c.code && c.code.toLowerCase().includes(search.toLowerCase()));
      return matchCat && matchSearch;
    });
  }, [availableCourses, categoryFilter, search]);

  const selectedCourseObjects = useMemo(() => {
    return selectedIds.map((id) => courses.find((c) => c.id === id)).filter(Boolean);
  }, [selectedIds, courses]);

  return (
    <div style={{ background: 'var(--paper-sunken)', borderRadius: 8, padding: '14px', border: '1px solid var(--line)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
        <div>
          <label className="field-label" style={{ margin: 0, fontWeight: 700, color: 'var(--ink)' }}>
            <i className="ti ti-link" style={{ marginRight: 6, color: 'var(--rail)' }} />
            Khóa Học Tiên Quyết (Prerequisite Courses) &middot; <span style={{ color: 'var(--rail)' }}>Đã chọn: {selectedIds.length} khóa</span>
          </label>
          <div style={{ fontSize: 11.5, color: 'var(--ink-soft)', marginTop: 2 }}>
            Học viên bắt buộc phải hoàn thành các khóa này trước khi bắt đầu khóa học hiện tại.
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            type="button"
            className="btn btn-sm btn-outline"
            style={{ fontSize: 11.5, display: 'flex', alignItems: 'center', gap: 5 }}
            onClick={() => setIsExpanded((v) => !v)}
          >
            <i className={`ti ${isExpanded ? 'ti-chevron-up' : 'ti-plus'}`} />
            {isExpanded ? 'Thu gọn danh sách' : 'Chọn thêm khóa tiên quyết'}
          </button>
          {selectedIds.length > 0 && (
            <button
              type="button"
              className="btn btn-sm btn-ghost"
              style={{ fontSize: 11.5, color: 'var(--rust)' }}
              onClick={onClear}
            >
              Bỏ chọn tất cả
            </button>
          )}
        </div>
      </div>

      {/* Selected Tags Display */}
      {selectedCourseObjects.length > 0 ? (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: isExpanded ? 12 : 0 }}>
          {selectedCourseObjects.map((c) => (
            <span
              key={c.id}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 10px',
                borderRadius: 6,
                background: '#fff',
                border: '1px solid var(--rail, #15803d)',
                color: 'var(--ink)',
                fontSize: 12,
                fontWeight: 600,
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
              }}
            >
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-faint)' }}>{c.code}</span>
              <span>{c.title}</span>
              <i
                className="ti ti-x"
                style={{ fontSize: 11, cursor: 'pointer', color: 'var(--rust)', marginLeft: 2 }}
                onClick={() => onToggle(c.id)}
                title="Xóa khóa tiên quyết"
              />
            </span>
          ))}
        </div>
      ) : !isExpanded && (
        <div style={{ fontSize: 12, color: 'var(--ink-faint)', fontStyle: 'italic' }}>
          Chưa có khóa học tiên quyết (học viên có thể tham gia trực tiếp).
        </div>
      )}

      {/* Filterable & Searchable Course Picker Dropdown/Panel */}
      {isExpanded && (
        <div style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 8, padding: 10, marginTop: 8 }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: '1 1 200px' }}>
              <i className="ti ti-search" style={{ position: 'absolute', left: 9, top: 8, color: 'var(--ink-faint)', fontSize: 12 }} />
              <input
                type="text"
                className="field-input"
                style={{ paddingLeft: 28, height: 32, fontSize: 12 }}
                placeholder="Tìm mã hoặc tên khóa học..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select
              className="field-select"
              style={{ width: 180, height: 32, fontSize: 12 }}
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="ALL">Tất cả danh mục ({categories.length})</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div style={{ maxHeight: 200, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
            {filteredCourses.map((c) => {
              const isSelected = selectedIds.includes(c.id);
              return (
                <div
                  key={c.id}
                  onClick={() => onToggle(c.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '6px 10px',
                    borderRadius: 6,
                    cursor: 'pointer',
                    background: isSelected ? 'var(--rail-soft, #f0fdf4)' : 'transparent',
                    border: isSelected ? '1px solid var(--rail, #15803d)' : '1px solid transparent',
                    transition: 'all 0.1s ease',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => {}}
                    style={{ cursor: 'pointer' }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: isSelected ? 700 : 500, color: 'var(--ink)' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-faint)' }}>{c.code}</span>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.title}</span>
                    </div>
                  </div>
                  <Badge tone="slate" size="sm">{c.category || 'Store Ops'}</Badge>
                  <span style={{ fontSize: 11, color: 'var(--ink-faint)' }}>Lv {c.targetLevel || c.level || '7'}</span>
                </div>
              );
            })}
            {filteredCourses.length === 0 && (
              <div style={{ padding: '16px', textAlign: 'center', fontSize: 12, color: 'var(--ink-faint)' }}>
                Không tìm thấy khóa học nào phù hợp với bộ lọc.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminCourseBuilder() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const {
    courses,
    addCourse,
    updateCourse,
    publishNewCourseVersion,
    companyCategories,
    currentUser: authUser,
    assessments,
    addAssessment,
    updateAssessment,
  } = useCourseStore();
  const isNew = !courseId || courseId === 'new';
  const existing = isNew ? null : courses.find((c) => c.id === courseId);

  // Ma trận phân quyền tạo khóa học: User Admin/SysAdmin toàn quyền cả 2 hình
  // thức; Trainer/L&D chỉ tạo được Trực tiếp (và tự động là giảng viên đứng
  // lớp — không chọn người khác); HRBP/Manager/Learner không có quyền này.
  const authRole = normalizeRole(authUser?.role);
  const canAuthorOnline = hasCapability(authRole, 'canAuthorOnlineCourses');
  const canAuthorOffline = hasCapability(authRole, 'canAuthorOfflineCourses');
  const isTrainerOnly = canAuthorOffline && !canAuthorOnline;
  // User Admin & SysAdmin đều được tạo/chỉ định Giảng viên cho Lớp Học Trực
  // Tuyến Zoom/Teams (Virtual Class) — Trainer/L&D & HRBP thì không.
  const canCreateVirtualClass = hasCapability(authRole, 'canCreateVirtualClass');
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
    // Bấm "Create New Course" từ 1 trong 3 tab Learning Objects/Online Class/
    // Classroom trên Catalog thì tự chọn sẵn đúng hình thức đào tạo tương ứng.
    const qDeliveryType = searchParams.get('deliveryType');
    const qOnlineClassType = searchParams.get('onlineClassType');
    if (!isTrainerOnly && qDeliveryType) {
      return {
        ...base,
        deliveryType: qDeliveryType,
        onlineClassType: qOnlineClassType || base.onlineClassType,
        ...deriveModalityFormat(qDeliveryType, qOnlineClassType || base.onlineClassType),
      };
    }
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

  const [draft, setDraft] = useState(() => {
    const raw = withLevelDefaults(withCategoryDefaults(withRoleDefaults(withVersionDefaults(cloneCourse(existing || createBlankCourse())))));
    if (raw.deliveryType === 'IN_PERSON_CLASSROOM' || raw.modality === 'CLASSROOM_LAB') {
      const matchTr = eligibleTrainers.find((t) => t.userId === raw.trainerId) ||
        eligibleTrainers.find((t) => t.fullName?.toLowerCase() === (raw.trainerName || raw.instructor || '').toLowerCase()) ||
        eligibleTrainers.find((t) => (raw.trainerName || raw.instructor || '').toLowerCase().includes(t.fullName?.toLowerCase())) ||
        eligibleTrainers[0];
      if (matchTr) {
        raw.trainerId = matchTr.userId;
        raw.trainerName = matchTr.fullName;
        raw.instructor = matchTr.fullName;
      }

      // Hydrate coTrainers if missing or empty (Chỉ áp dụng cho Admin, Trainer chỉ đứng lớp độc lập)
      let currentCoTrainers = raw.coTrainers && Array.isArray(raw.coTrainers) && raw.coTrainers.length > 0 ? raw.coTrainers : [];
      if (isTrainerOnly) {
        currentCoTrainers = [];
      } else {
        if (currentCoTrainers.length === 0 && raw.coTrainerIds && raw.coTrainerIds.length > 0) {
          currentCoTrainers = raw.coTrainerIds.map((id) => {
            const tr = eligibleTrainers.find((t) => t.userId === id);
            return tr ? {
              id: tr.userId,
              userId: tr.userId,
              fullName: tr.fullName,
              name: tr.fullName,
              role: tr.role,
              title: roleDefinition(tr.role).labelVi,
            } : null;
          }).filter(Boolean);
        }
        // If still empty on existing classroom course, supply 2 co-trainers
        if (currentCoTrainers.length === 0 && !isNew) {
          const others = eligibleTrainers.filter((t) => t.userId !== raw.trainerId);
          currentCoTrainers = others.slice(0, 2).map((tr) => ({
            id: tr.userId,
            userId: tr.userId,
            fullName: tr.fullName,
            name: tr.fullName,
            role: tr.role,
            title: roleDefinition(tr.role).labelVi,
          }));
        }
      }

      raw.coTrainers = currentCoTrainers;
      raw.coTrainerIds = currentCoTrainers.map((t) => t.userId || t.id);
      raw.coTrainerNames = currentCoTrainers.map((t) => t.fullName || t.name);
    }
    return raw;
  });
  const [activeModuleId, setActiveModuleId] = useState(draft.modules[0]?.id);
  const [editingQuestionId, setEditingQuestionId] = useState(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [importMessage, setImportMessage] = useState('');
  const [editingAssessment, setEditingAssessment] = useState(null);

  const courseAssessment = useMemo(() => {
    if (draft.courseAssessment) return draft.courseAssessment;
    return (assessments || []).find((a) => a.courseId === draft.id || (a.courseIds && a.courseIds.includes(draft.id)));
  }, [draft.courseAssessment, draft.id, assessments]);

  function handleOpenCreateAssessment(forceNew = false) {
    const isActuallyExisting = !forceNew && Boolean(courseAssessment);
    const defaultTitle = draft.title ? `Bài Đánh Giá Cuối Khóa: ${draft.title}` : 'Bài Đánh Giá Năng Lực Cuối Khóa';
    const newAsm = {
      isNew: !isActuallyExisting,
      id: isActuallyExisting ? courseAssessment.id : `ASM-CRS-${draft.id || Date.now()}`,
      code: isActuallyExisting ? courseAssessment.code : generateAssessmentCode(defaultTitle),
      title: isActuallyExisting ? courseAssessment.title : defaultTitle,
      description: isActuallyExisting ? courseAssessment.description : `Bài kiểm tra đánh giá kiến thức tổng hợp sau khi hoàn thành toàn bộ bài học trong khóa ${draft.title || ''}.`,
      deliveryFormat: 'COURSE_LINKED',
      courseId: draft.id,
      courseIds: [draft.id],
      courseTitle: draft.title || 'Khóa Học Mới',
      isCourseExclusive: true,
      categories: draft.categories && draft.categories.length > 0 ? draft.categories : (draft.category ? [draft.category] : ['Food Safety & Hygiene']),
      category: (draft.categories && draft.categories[0]) || draft.category || 'Food Safety & Hygiene',
      status: 'PUBLISHED',
      timeLimitMinutes: draft.config?.assessmentTimeLimit || 20,
      passingScorePercent: draft.config?.passingScorePercent || 80,
      maxAttempts: draft.config?.maxAttempts || 3,
      questionsPerAttempt: draft.config?.questionsPerAttempt || 4,
      uploadedFileName: courseAssessment?.uploadedFileName || 'Ngan_Hang_150_Cau_Hoi_Chuan.xlsx',
      uploadedPoolSize: courseAssessment?.uploadedPoolSize || 150,
      contentFormats: courseAssessment?.contentFormats || ['INTERACTIVE_BANK'],
      contentFormat: courseAssessment?.contentFormat || 'INTERACTIVE_BANK',
      questionMatrix: courseAssessment?.questionMatrix || {
        singleChoice: 2,
        multipleChoice: 1,
        trueFalse: 1,
        essay: 0,
        ratingScale: 0,
        matching: 0,
      },
      antiCheatSettings: courseAssessment?.antiCheatSettings || {
        enforceFullscreen: true,
        detectTabSwitch: true,
        maxTabSwitches: 3,
        randomizeQuestions: true,
        randomizeOptions: true,
        showWatermark: true,
        webcamProctoringSimulation: false,
        preventCopyPaste: true,
      },
      feedbackSettings: {
        showAnswersAfterSubmit: true,
        showExplanations: true,
        allowReview: true,
      },
    };
    setEditingAssessment(newAsm);
  }

  function handleSaveAssessmentFromModal(savedAsm) {
    setDraft((prev) => ({
      ...prev,
      courseAssessment: savedAsm,
      config: {
        ...prev.config,
        assessmentEnabled: true,
        assessmentTimeLimit: savedAsm.timeLimitMinutes,
        passingScorePercent: savedAsm.passingScorePercent,
        maxAttempts: savedAsm.maxAttempts,
        questionsPerAttempt: savedAsm.questionsPerAttempt,
      },
    }));
    const existingAsm = (assessments || []).find((a) => a.id === savedAsm.id || a.courseId === draft.id);
    if (existingAsm) {
      updateAssessment(savedAsm.id, savedAsm);
    } else {
      addAssessment(savedAsm);
    }
    setEditingAssessment(null);
  }

  function handleRemoveCourseAssessment() {
    if (window.confirm('Bạn có chắc chắn muốn gỡ bài Assessment này khỏi khóa học?')) {
      setDraft((prev) => ({
        ...prev,
        courseAssessment: null,
        config: {
          ...prev.config,
          assessmentEnabled: false,
        },
      }));
    }
  }

  // Syllabus & Materials State & Handlers
  const [newMaterialName, setNewMaterialName] = useState('');
  const [newMaterialType, setNewMaterialType] = useState('PDF');
  const [newMaterialSize, setNewMaterialSize] = useState('2.5 MB');

  function addSyllabusStep() {
    const newStepNum = (draft.syllabus?.length || 0) + 1;
    const newStep = {
      step: `Phần ${newStepNum}: Nội Dung Thực Hành & Nghiệp Vụ Mới (45 phút)`,
      detail: 'Mô tả chi tiết nội dung đào tạo, quy trình thao tác và chỉ tiêu cần đạt được.',
    };
    setDraft((prev) => ({
      ...prev,
      syllabus: [...(prev.syllabus || []), newStep],
    }));
  }

  function updateSyllabusStep(index, field, value) {
    setDraft((prev) => {
      const updated = [...(prev.syllabus || [])];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, syllabus: updated };
    });
  }

  function removeSyllabusStep(index) {
    setDraft((prev) => ({
      ...prev,
      syllabus: (prev.syllabus || []).filter((_, i) => i !== index),
    }));
  }

  function addMaterial() {
    if (!newMaterialName.trim()) return;
    const newMat = {
      id: genId('mat'),
      name: newMaterialName.trim(),
      type: newMaterialType,
      size: newMaterialSize || '2.0 MB',
      url: '#',
      uploadedAt: new Date().toISOString().slice(0, 10),
      uploadedBy: authUser?.fullName || 'L&D Admin',
    };
    setDraft((prev) => ({
      ...prev,
      materials: [...(prev.materials || []), newMat],
    }));
    setNewMaterialName('');
  }

  function handleSimulatedFileUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split('.').pop()?.toUpperCase() || 'PDF';
    const type = ext === 'PPT' || ext === 'PPTX' ? 'PPT' : ext === 'DOC' || ext === 'DOCX' ? 'DOC' : 'PDF';
    const sizeInMb = (file.size / (1024 * 1024)).toFixed(1) + ' MB';
    const newMat = {
      id: genId('mat'),
      name: file.name,
      type,
      size: sizeInMb === '0.0 MB' ? '1.5 MB' : sizeInMb,
      url: '#',
      uploadedAt: new Date().toISOString().slice(0, 10),
      uploadedBy: authUser?.fullName || 'L&D Admin',
    };
    setDraft((prev) => ({
      ...prev,
      materials: [...(prev.materials || []), newMat],
    }));
    e.target.value = '';
  }

  function removeMaterial(matId) {
    setDraft((prev) => ({
      ...prev,
      materials: (prev.materials || []).filter((m) => m.id !== matId),
    }));
  }

  useEffect(() => {
    const fresh = withLevelDefaults(withCategoryDefaults(withRoleDefaults(withVersionDefaults(cloneCourse(existing || createBlankCourse())))));
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
  function patchVirtualMeeting(fields) {
    setDraft((d) => ({ ...d, virtualMeeting: { ...(d.virtualMeeting || {}), ...fields } }));
  }
  function addVirtualMaterial(name) {
    if (!name || !name.trim()) return;
    setDraft((d) => ({
      ...d,
      virtualMeeting: { ...(d.virtualMeeting || {}), materials: [...((d.virtualMeeting || {}).materials || []), { name: name.trim(), url: '#' }] },
    }));
  }
  function removeVirtualMaterial(index) {
    setDraft((d) => ({
      ...d,
      virtualMeeting: { ...(d.virtualMeeting || {}), materials: ((d.virtualMeeting || {}).materials || []).filter((_, i) => i !== index) },
    }));
  }

  function setCourseType(courseType) {
    setDraft((d) => ({
      ...d,
      courseType,
      assignments: d.assignments || (d.assignment ? [d.assignment] : []),
    }));
  }

  function handleAddAssignments(newAssignments) {
    setDraft((d) => {
      const current = d.assignments || (d.assignment ? [d.assignment] : []);
      const updated = [...current, ...newAssignments];
      return {
        ...d,
        assignments: updated,
        assignment: updated[0] || null,
      };
    });
  }

  function handleRemoveAssignment(index) {
    setDraft((d) => {
      const current = d.assignments || (d.assignment ? [d.assignment] : []);
      const updated = current.filter((_, i) => i !== index);
      return {
        ...d,
        assignments: updated,
        assignment: updated[0] || null,
      };
    });
  }

  function handleClearAllAssignments() {
    setDraft((d) => ({
      ...d,
      assignments: [],
      assignment: null,
    }));
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
      id: genId('les'), title: 'New lesson', lessonType: 'PDF', isRequired: true, status: 'NOT_STARTED', progressPercent: 0,
      rule: defaultRuleFor('PDF'), content: defaultContentFor('PDF'),
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

  const [publishNoteOpen, setPublishNoteOpen] = useState(false);
  const [publishNote, setPublishNote] = useState('');

  // Đa phiên bản: đóng băng nội dung hiện tại thành snapshot bất biến rồi
  // tăng currentVersion lên 1 bậc (v1.0 -> v2.0 -> ...). Học viên đã ghi danh
  // dưới phiên bản cũ (hoàn thành hay đang học dở) không bị ảnh hưởng bởi các
  // chỉnh sửa Admin thực hiện sau lệnh Publish này (xem CourseStore.publishNewCourseVersion).
  // Cập nhật state cục bộ optimistic (không đọc lại `courses` từ store vì
  // setCourses là bất đồng bộ, đọc ngay sau khi gọi sẽ ra dữ liệu cũ).
  function handlePublishNewVersion() {
    const oldVersion = draft.currentVersion || draft.version || 'v1.0';
    const newVersion = nextMajorVersion(oldVersion);
    const note = publishNote.trim();
    publishNewCourseVersion(draft.id, note);
    setPublishNoteOpen(false);
    setPublishNote('');
    setDraft((d) => ({
      ...d,
      currentVersion: newVersion,
      version: newVersion,
      versions: { ...d.versions, [oldVersion]: { version: oldVersion, publishedAt: d.publishedAt, archivedAt: new Date().toISOString().slice(0, 10), updatedBy: authUser?.fullName, changeLog: note, modules: d.modules, configuration: d.configuration, modality: d.modality, format: d.format } },
      versionHistory: [{ version: newVersion, updatedBy: authUser?.fullName || 'L&D Admin', updatedAt: new Date().toISOString().slice(0, 10), note: note || `Phát hành phiên bản ${newVersion}.` }, ...(d.versionHistory || [])],
    }));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  // nextStatus: 'DRAFT' (nút Lưu Nháp) hoặc 'PUBLISHED' (nút Tạo Khóa Học /
  // Lưu Thay Đổi) — thay cho dropdown Status thủ công đã bỏ.
  function handleSave(nextStatus) {
    if (!draft.title.trim()) {
      setError('Vui lòng nhập tên khóa học (Course Title is required).');
      document.getElementById('builder-title-field')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    const cats = draft.categories && draft.categories.length ? draft.categories : (draft.category ? [draft.category] : []);
    if (cats.length === 0) {
      setError('Vui lòng chọn ít nhất một Danh mục khóa học (Course Category is required).');
      document.getElementById('builder-category-field')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    const lvls = (draft.targetLevels && draft.targetLevels.length ? draft.targetLevels : (draft.targetLevel ? [draft.targetLevel] : [])).map(String);
    if (lvls.length === 0) {
      setError('Vui lòng chọn ít nhất một Cấp bậc áp dụng (Target Job Level is required).');
      document.getElementById('builder-level-field')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    if (draft.startDate && draft.endDate && draft.endDate < draft.startDate) {
      setError('End date must be after start date.');
      return;
    }
    if (nextStatus === 'PUBLISHED' && draft.deliveryType === 'ONLINE_ELEARNING' && draft.onlineClassType === 'VIRTUAL_CLASS') {
      const vm = draft.virtualMeeting || {};
      if (!vm.meetingUrl?.trim()) { setError('Virtual Class cần đường dẫn phòng họp (Meeting URL).'); return; }
      if (!vm.scheduleDate) { setError('Virtual Class cần Ngày tổ chức buổi học.'); return; }
      if (!vm.scheduleTime?.trim()) { setError('Virtual Class cần Khung giờ buổi học.'); return; }
      if (!vm.instructorId) { setError('Virtual Class cần chọn Giảng viên/Người chủ trì.'); return; }
    }
    setError('');
    const { modality, format } = deriveModalityFormat(draft.deliveryType, draft.onlineClassType);
    const toSave = {
      ...draft,
      categories: cats,
      category: cats[0] || '',
      targetLevels: lvls,
      targetLevel: lvls[0] || '',
      targetLevelTitle: lvls.length === 7 ? 'Level 1 - 7' : lvls.map((l) => `Level ${l}`).join(', '),
      status: nextStatus,
      modality,
      format,
    };
    if (isNew) {
      addCourse(toSave);
    } else {
      // Sửa nội dung thông thường (typo, cập nhật nhỏ...) ghi thẳng vào phiên
      // bản đang sống — KHÔNG tăng currentVersion (chỉ nút "Phát Hành Phiên
      // Bản Mới" mới tăng). Vẫn log 1 dòng vào versionHistory để có audit trail,
      // nhưng giữ nguyên số phiên bản hiện tại.
      const entry = {
        version: draft.currentVersion || draft.version,
        updatedBy: authUser?.fullName || 'L&D Admin',
        updatedAt: new Date().toISOString().slice(0, 10),
        note: 'Content updated via Course Builder.',
      };
      const withVersion = { ...toSave, versionHistory: [entry, ...(draft.versionHistory || [])] };
      updateCourse(draft.id, withVersion);
    }

    // Đồng bộ Assessment của khóa học vào store assessments khi khóa học có bật bài kiểm tra
    if (draft.config?.assessmentEnabled) {
      const existingAsm = (assessments || []).find((a) => a.courseId === draft.id || (a.courseIds && a.courseIds.includes(draft.id)));
      const baseAsm = draft.courseAssessment || existingAsm;
      const courseAsm = {
        id: baseAsm?.id || `ASM-CRS-${draft.id}`,
        code: baseAsm?.code || `ASM-${draft.code || draft.id}`,
        title: baseAsm?.title || `Bài Đánh Giá Cuối Khóa: ${draft.title}`,
        description: baseAsm?.description || `Bài kiểm tra đánh giá kiến thức sau khi hoàn thành khóa học ${draft.title}.`,
        type: baseAsm?.type || 'QUIZ',
        types: baseAsm?.types || ['QUIZ'],
        contentFormats: baseAsm?.contentFormats || ['INTERACTIVE_BANK'],
        contentFormat: baseAsm?.contentFormat || 'INTERACTIVE_BANK',
        uploadedFileName: baseAsm?.uploadedFileName || 'Ngan_Hang_150_Cau_Hoi_Chuan.xlsx',
        uploadedPoolSize: baseAsm?.uploadedPoolSize || 150,
        questionMatrix: baseAsm?.questionMatrix || { singleChoice: 2, multipleChoice: 1, trueFalse: 1, essay: 0, ratingScale: 0, matching: 0 },
        questionTypesList: baseAsm?.questionTypesList || ['2 Trắc nghiệm đơn', '1 Nhiều đáp án', '1 Đúng/Sai'],
        deliveryFormat: 'COURSE_LINKED',
        courseId: draft.id,
        courseIds: [draft.id],
        courseTitle: draft.title,
        isCourseExclusive: true,
        category: draft.category || 'General',
        categories: draft.categories || [draft.category || 'General'],
        status: 'PUBLISHED',
        timeLimitMinutes: draft.config.assessmentTimeLimit || 20,
        passingScorePercent: draft.config.passingScorePercent || 80,
        maxAttempts: draft.config.maxAttempts || 3,
        questionsPerAttempt: draft.config.questionsPerAttempt || 4,
        antiCheatSettings: baseAsm?.antiCheatSettings || {
          enforceFullscreen: true,
          detectTabSwitch: true,
          maxTabSwitches: 3,
          randomizeQuestions: draft.config.randomizeQuestions ?? true,
          randomizeOptions: draft.config.randomizeAnswers ?? true,
          showWatermark: true,
          webcamProctoringSimulation: false,
          preventCopyPaste: true,
        },
        feedbackSettings: {
          showAnswersAfterSubmit: draft.config.showCorrectAnswers !== 'NEVER',
          showExplanations: true,
          allowReview: true,
        },
        questionIds: (draft.questionBank || []).map((q) => q.id),
        createdBy: authUser?.userId || 'USR-ADMIN',
        createdByName: authUser?.fullName || 'L&D Admin',
        updatedAt: new Date().toISOString().slice(0, 10),
      };

      if (existingAsm) {
        updateAssessment(existingAsm.id, courseAsm);
      } else {
        addAssessment(courseAsm);
      }
    }

    // Lưu xong quay về danh sách khóa học (Create lẫn Save Changes) — Admin
    // muốn sửa tiếp thì bấm Edit lại từ danh sách, không giữ lại trên form.
    navigate('/admin/courses');
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
            {draft.code || 'No code yet'} &middot; {(draft.categories && draft.categories.join(', ')) || draft.category || 'No category'} &middot; {draft.version} <CourseTypeBadge courseType={draft.courseType} />
          </p>
        </div>
        {saved && <Badge tone="sage" icon="ti-check">Saved</Badge>}
      </div>

      {/* VERSION MANAGEMENT BAR — chỉ hiện với khóa đã tồn tại. Publish New
          Version đóng băng nội dung hiện tại thành snapshot bất biến (bảo
          toàn kết quả/tiến độ của học viên đã ghi danh phiên bản cũ) rồi tăng
          currentVersion lên 1 bậc; không giới hạn số lần (v1.0 -> v2.0 ->
          v3.0 -> ...). Sửa nhỏ qua "Save changes" không tăng phiên bản. */}
      {!isNew && (
        <div className="card card-pad" style={{ marginBottom: 16, borderColor: 'var(--sage)', background: 'var(--sage-soft)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <i className="ti ti-git-branch" style={{ color: 'var(--sage-soft-text)', fontSize: 18 }} />
              <div>
                <div style={{ fontWeight: 800, fontSize: 13 }}>
                  Phiên bản đang sống: <Badge tone="sage">{draft.currentVersion || draft.version}</Badge>
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--ink-soft)' }}>
                  Học viên đã hoàn thành/đang học dở các phiên bản cũ vẫn được giữ nguyên kết quả &amp; nội dung — xem lịch sử bên dưới.
                </div>
              </div>
            </div>
            <Button variant="outline" icon="ti-versions" onClick={() => setPublishNoteOpen(true)}>
              Phát Hành Phiên Bản Mới ({nextMajorVersion(draft.currentVersion || draft.version)})
            </Button>
          </div>

          {publishNoteOpen && (
            <div style={{ marginTop: 12, background: '#fff', border: '1px solid var(--line)', borderRadius: 8, padding: 12 }}>
              <label className="field-label">Ghi chú thay đổi (Change Log) cho {nextMajorVersion(draft.currentVersion || draft.version)}</label>
              <textarea
                className="field-input"
                rows={2}
                style={{ resize: 'vertical', marginBottom: 10 }}
                placeholder="VD: Cập nhật video mới, chuẩn hóa gói SCORM và slide PPT 2026."
                value={publishNote}
                onChange={(e) => setPublishNote(e.target.value)}
              />
              <div style={{ fontSize: 11.5, color: 'var(--ink-soft)', marginBottom: 10 }}>
                <i className="ti ti-alert-triangle" style={{ marginRight: 4, color: 'var(--amber)' }} />
                Hành động này đóng băng vĩnh viễn phiên bản <strong>{draft.currentVersion || draft.version}</strong> hiện tại (bảo toàn 100% cho học viên đã ghi danh), rồi mở phiên bản <strong>{nextMajorVersion(draft.currentVersion || draft.version)}</strong> — mọi chỉnh sửa Module/Bài học sau đây (kể cả đang có trên form) sẽ thuộc về phiên bản mới.
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <Button variant="ghost" onClick={() => { setPublishNoteOpen(false); setPublishNote(''); }}>Hủy</Button>
                <Button variant="primary" icon="ti-rocket" onClick={handlePublishNewVersion}>Xác Nhận Phát Hành</Button>
              </div>
            </div>
          )}

          {Object.keys(draft.versions || {}).length > 0 && (
            <div style={{ marginTop: 12, borderTop: '1px solid var(--line)', paddingTop: 10 }}>
              <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--ink-soft)', marginBottom: 6 }}>Các phiên bản đã đóng băng (chỉ đọc):</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {Object.values(draft.versions).sort((a, b) => (a.version < b.version ? 1 : -1)).map((v) => (
                  <div key={v.version} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 12, background: '#fff', borderRadius: 6, padding: '6px 10px' }}>
                    <span><strong>{v.version}</strong> &mdash; {v.changeLog || 'Không có ghi chú.'}</span>
                    <span style={{ color: 'var(--ink-soft)', whiteSpace: 'nowrap' }}>{v.updatedBy} &middot; đóng băng {v.archivedAt}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {isTrainerOnly ? (
        <div className="card card-pad" style={{ marginBottom: 16, background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)', border: '1.5px solid #93c5fd', borderRadius: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: 10, background: 'var(--blue, #2563eb)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, boxShadow: '0 2px 8px rgba(37,99,235,0.25)', flexShrink: 0 }}>
                <i className="ti ti-school" />
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: 14.5, color: '#1e3a8a' }}>Khóa Đào Tạo Trực Tiếp &amp; Xưởng Thực Hành (In-Person Workshop)</div>
                <div style={{ fontSize: 12, color: '#2563eb', marginTop: 2 }}>
                  Giảng viên / L&amp;D chỉ tạo được khóa Trực Tiếp và tự động là người đứng lớp: <strong>{authUser.fullName}</strong> (Chính bạn &middot; Quản trị lớp học và quét mã QR Điểm danh trực tiếp)
                </div>
              </div>
            </div>
            <Badge tone="blue" icon="ti-lock">Quyền Hạn: Giảng Viên / L&amp;D (Chỉ Mở Lớp Trực Tiếp)</Badge>
          </div>
        </div>
      ) : (
        <div className="card card-pad" style={{ marginBottom: 16, background: 'var(--paper-sunken)', border: '1.5px solid var(--line)', borderRadius: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div className="section-label" style={{ margin: 0, fontSize: 13.5, fontWeight: 800, color: 'var(--ink)' }}>
              <i className="ti ti-layers-intersect" style={{ marginRight: 6, color: 'var(--rail)' }} />
              1. Hình Thức Đào Tạo (Delivery Mode)
            </div>
            <Badge tone={draft.deliveryType === 'IN_PERSON_CLASSROOM' ? 'blue' : 'sage'}>
              {draft.deliveryType === 'IN_PERSON_CLASSROOM' ? '🏢 ĐÀO TẠO TRỰC TIẾP (ILT)' : '🌐 TRỰC TUYẾN (E-LEARNING)'}
            </Badge>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
            <button
              type="button"
              onClick={() => patch({ deliveryType: 'ONLINE_ELEARNING', modality: 'SCORM_PACKAGE', format: 'SCORM 2004', onlineClassType: draft.onlineClassType || 'E_LEARNING' })}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 12,
                padding: '14px 16px',
                borderRadius: 8,
                border: (!draft.deliveryType || draft.deliveryType === 'ONLINE_ELEARNING') ? '2px solid var(--rail, #15803d)' : '1px solid var(--line)',
                background: (!draft.deliveryType || draft.deliveryType === 'ONLINE_ELEARNING') ? 'var(--rail-soft, #f0fdf4)' : '#fff',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s ease',
              }}
            >
              <div style={{ width: 40, height: 40, borderRadius: 8, background: (!draft.deliveryType || draft.deliveryType === 'ONLINE_ELEARNING') ? 'var(--rail, #15803d)' : 'var(--paper-sunken)', color: (!draft.deliveryType || draft.deliveryType === 'ONLINE_ELEARNING') ? '#fff' : 'var(--ink-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
                <i className="ti ti-device-laptop" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 13.5, color: (!draft.deliveryType || draft.deliveryType === 'ONLINE_ELEARNING') ? 'var(--rail-soft-text, #166534)' : 'var(--ink)', marginBottom: 2 }}>
                  Khóa Học Trực Tuyến (Online E-learning)
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--ink-soft)', lineHeight: 1.4 }}>
                  Học viên tự học qua Video, SCORM, Slide PPT, PDF &amp; Thi trắc nghiệm hoặc Lớp Zoom/Teams.
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => patch({
                deliveryType: 'IN_PERSON_CLASSROOM',
                modality: 'CLASSROOM_LAB',
                format: 'Store Practical Lab / ILT',
                trainerId: draft.trainerId || eligibleTrainers[0]?.userId,
                trainerName: draft.trainerName || eligibleTrainers[0]?.fullName,
                venueId: draft.venueId || meetingRoomsAndLabs[2]?.id || 'lab-ap-fresh',
                venue: draft.venue || meetingRoomsAndLabs[2]?.name || 'Fresh Food & Bakery Practical Lab (MM An Phu)',
                scheduleDate: draft.scheduleDate || '2026-08-28',
                scheduleTime: draft.scheduleTime || '08:30 - 11:30 (3.0 hours)',
                maxCapacity: draft.maxCapacity || 25,
              })}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 12,
                padding: '14px 16px',
                borderRadius: 8,
                border: draft.deliveryType === 'IN_PERSON_CLASSROOM' ? '2px solid var(--blue, #2563eb)' : '1px solid var(--line)',
                background: draft.deliveryType === 'IN_PERSON_CLASSROOM' ? 'var(--blue-soft, #eff6ff)' : '#fff',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s ease',
              }}
            >
              <div style={{ width: 40, height: 40, borderRadius: 8, background: draft.deliveryType === 'IN_PERSON_CLASSROOM' ? 'var(--blue, #2563eb)' : 'var(--paper-sunken)', color: draft.deliveryType === 'IN_PERSON_CLASSROOM' ? '#fff' : 'var(--ink-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
                <i className="ti ti-chalkboard" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 13.5, color: draft.deliveryType === 'IN_PERSON_CLASSROOM' ? '#1e40af' : 'var(--ink)', marginBottom: 2 }}>
                  Khóa Đào Tạo Trực Tiếp (In-Person Workshop)
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--ink-soft)', lineHeight: 1.4 }}>
                  Học tập trung tại xưởng/phòng thực hành có Giảng viên (Trainer) &amp; Điểm danh Live QR.
                </div>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* CLASS TYPE SELECTOR (FOR ONLINE COURSES) */}
      {draft.deliveryType === 'ONLINE_ELEARNING' && canCreateVirtualClass && (
        <div className="card card-pad" style={{ marginBottom: 16, background: 'var(--paper-sunken)', border: '1.5px solid var(--line)', borderRadius: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div className="section-label" style={{ margin: 0, fontSize: 13.5, fontWeight: 800, color: 'var(--ink)' }}>
              <i className="ti ti-broadcast" style={{ marginRight: 6, color: 'var(--rail)' }} />
              2. Phân Loại Khóa Trực Tuyến (Class Type)
            </div>
            <Badge tone={(draft.onlineClassType || 'E_LEARNING') === 'E_LEARNING' ? 'sage' : 'amber'}>
              {(draft.onlineClassType || 'E_LEARNING') === 'E_LEARNING' ? 'Tự Học (Self-Paced)' : 'Lớp Live Zoom/Teams'}
            </Badge>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
            <button
              type="button"
              onClick={() => patch({ onlineClassType: 'E_LEARNING', ...deriveModalityFormat(draft.deliveryType, 'E_LEARNING') })}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 16px', borderRadius: 8,
                border: (draft.onlineClassType || 'E_LEARNING') === 'E_LEARNING' ? '2px solid var(--rail, #15803d)' : '1px solid var(--line)',
                background: (draft.onlineClassType || 'E_LEARNING') === 'E_LEARNING' ? 'var(--rail-soft, #f0fdf4)' : '#fff',
                cursor: 'pointer', textAlign: 'left',
                transition: 'all 0.15s ease',
              }}
            >
              <div style={{ width: 40, height: 40, borderRadius: 8, background: (draft.onlineClassType || 'E_LEARNING') === 'E_LEARNING' ? 'var(--rail, #15803d)' : 'var(--paper-sunken)', color: (draft.onlineClassType || 'E_LEARNING') === 'E_LEARNING' ? '#fff' : 'var(--ink-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
                <i className="ti ti-player-play" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 13.5, color: (draft.onlineClassType || 'E_LEARNING') === 'E_LEARNING' ? 'var(--rail-soft-text, #166534)' : 'var(--ink)', marginBottom: 2 }}>
                  E-Learning (Tự Học Theo Tiến Độ)
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--ink-soft)', lineHeight: 1.4 }}>
                  Học viên tự học theo Module/Bài học (SCORM, Video, Slide PPT, PDF) kèm bài thi trắc nghiệm.
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => patch({ onlineClassType: 'VIRTUAL_CLASS', ...deriveModalityFormat(draft.deliveryType, 'VIRTUAL_CLASS') })}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 16px', borderRadius: 8,
                border: draft.onlineClassType === 'VIRTUAL_CLASS' ? '2px solid var(--amber, #d97706)' : '1px solid var(--line)',
                background: draft.onlineClassType === 'VIRTUAL_CLASS' ? 'var(--amber-soft, #fffbeb)' : '#fff',
                cursor: 'pointer', textAlign: 'left',
                transition: 'all 0.15s ease',
              }}
            >
              <div style={{ width: 40, height: 40, borderRadius: 8, background: draft.onlineClassType === 'VIRTUAL_CLASS' ? 'var(--amber, #d97706)' : 'var(--paper-sunken)', color: draft.onlineClassType === 'VIRTUAL_CLASS' ? '#fff' : 'var(--ink-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
                <i className="ti ti-video" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 13.5, color: draft.onlineClassType === 'VIRTUAL_CLASS' ? '#92400e' : 'var(--ink)', marginBottom: 2 }}>
                  Lớp Học Trực Tuyến Live (Virtual Classroom)
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--ink-soft)', lineHeight: 1.4 }}>
                  Lớp live qua Zoom / Teams / Meet có Giảng viên chủ trì theo lịch cố định &amp; điểm danh.
                </div>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* GLOBAL VALIDATION ERROR BANNER */}
      {error && (
        <div
          style={{
            background: 'var(--rust-soft, #fef2f2)',
            border: '1.5px solid var(--rust, #ef4444)',
            borderRadius: 8,
            padding: '12px 16px',
            marginBottom: 16,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            color: 'var(--rust, #b91c1c)',
            fontWeight: 600,
            fontSize: 13,
            boxShadow: '0 2px 8px rgba(239, 68, 68, 0.1)',
          }}
        >
          <i className="ti ti-alert-triangle" style={{ fontSize: 18, color: 'var(--rust, #ef4444)', flexShrink: 0 }} />
          <div style={{ flex: 1 }}>{error}</div>
          <button
            type="button"
            className="btn btn-sm btn-ghost"
            style={{ color: 'var(--rust, #b91c1c)', padding: '2px 8px' }}
            onClick={() => setError('')}
          >
            Đóng
          </button>
        </div>
      )}

      {/* BASIC INFORMATION CARD */}
      <div className="card card-pad" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, paddingBottom: 10, borderBottom: '1px solid var(--line)' }}>
          <div className="section-label" style={{ margin: 0, fontSize: 14, fontWeight: 800, color: 'var(--ink)' }}>
            <i className="ti ti-info-circle" style={{ marginRight: 6, color: 'var(--rail)' }} />
            Thông Tin Cơ Bản / Basic Information
          </div>
          <span style={{ fontSize: 11.5, color: 'var(--ink-faint)' }}>Phiên bản hiện hành: <strong>{draft.version || 'v1.0'}</strong></span>
        </div>

        {/* Row 1: Course Title & Code */}
        <div className="grid grid-3" style={{ gap: 14, marginBottom: 14 }}>
          <div id="builder-title-field" style={{ gridColumn: 'span 2' }}>
            <label className="field-label" style={{ fontWeight: 700 }}>
              Tên khóa học (Course Title) <span style={{ color: 'var(--rust)' }}>*</span>
            </label>
            <input
              className="field-input"
              style={{
                fontWeight: 600,
                fontSize: 13.5,
                border: error && !draft.title.trim() ? '2px solid var(--rust, #dc2626)' : undefined,
              }}
              placeholder="VD: Quy Trình Kiểm Soát An Toàn Vệ Sinh Thực Phẩm (HACCP)"
              value={draft.title}
              onChange={(e) => {
                const title = e.target.value;
                setDraft((d) => {
                  const next = { ...d, title };
                  if (!d.code || !d.code.trim()) {
                    next.code = generateCourseCode(title, courses.map((c) => c.code));
                  }
                  return next;
                });
                if (title.trim() && error && error.includes('tên khóa học')) {
                  setError('');
                }
              }}
            />
          </div>
          <div>
            <label className="field-label" style={{ fontWeight: 700 }}>Mã khóa học (Course Code)</label>
            <div style={{ display: 'flex', gap: 6 }}>
              <input
                className="field-input"
                style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}
                value={draft.code}
                onChange={(e) => patch({ code: e.target.value })}
              />
              <button
                type="button"
                className="icon-btn"
                aria-label="Refresh course code"
                title="Sinh mã ngẫu nhiên mới"
                onClick={() => patch({ code: generateCourseCode(draft.title, courses.map((c) => c.code)) })}
              >
                <i className="ti ti-refresh" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>

        {/* Row 2: Dates, Duration & Course Type - PERFECTLY ALIGNED 4 COLUMNS */}
        <div className="grid grid-4" style={{ gap: 14, marginBottom: 16 }}>
          <div>
            <label className="field-label">Ngày bắt đầu (Start Date)</label>
            <input
              type="date"
              className="field-input"
              value={draft.startDate || ''}
              onChange={(e) => patch({ startDate: e.target.value })}
            />
          </div>
          <div>
            <label className="field-label">Ngày kết thúc (End Date)</label>
            <input
              type="date"
              className="field-input"
              value={draft.endDate || ''}
              onChange={(e) => patch({ endDate: e.target.value })}
            />
          </div>
          <div>
            <label className="field-label">Thời lượng ước tính</label>
            <input
              type="text"
              className="field-input"
              placeholder="VD: 3h hoặc 2.5 hours"
              value={draft.estimatedHours || draft.estimatedDuration || ''}
              onChange={(e) => patch({ estimatedHours: e.target.value, estimatedDuration: e.target.value })}
            />
          </div>
          <div>
            <label className="field-label">Loại khóa (Course Type)</label>
            <select
              className="field-select"
              value={draft.courseType}
              onChange={(e) => setCourseType(e.target.value)}
            >
              <option value="OPTIONAL">Optional (Tự chọn)</option>
              <option value="MANDATORY">Mandatory (Bắt buộc)</option>
            </select>
          </div>
        </div>

        {/* Row 3: 2-Column Grid for Category & Target Job Level (Multi-Select Dropdowns) */}
        <div className="grid grid-2" style={{ gap: 14, marginBottom: 16 }}>
          <CategoryMultiSelectDropdown
            id="builder-category-field"
            selected={draft.categories || (draft.category ? [draft.category] : [])}
            options={companyCategories}
            hasError={Boolean(error && (error.includes('Danh mục') || error.includes('Category')))}
            errorMessage={error && (error.includes('Danh mục') || error.includes('Category')) ? error : ''}
            onChange={(nextCats) => {
              patch({ categories: nextCats, category: nextCats[0] || '' });
              if (nextCats.length > 0 && error && (error.includes('Danh mục') || error.includes('Category'))) {
                setError('');
              }
            }}
          />

          <LevelMultiSelectDropdown
            id="builder-level-field"
            selected={(draft.targetLevels || (draft.targetLevel ? [draft.targetLevel] : [])).map(String)}
            hasError={Boolean(error && (error.includes('Cấp bậc') || error.includes('Level')))}
            errorMessage={error && (error.includes('Cấp bậc') || error.includes('Level')) ? error : ''}
            onChange={(nextLvls) => {
              const sorted = [...nextLvls].sort((a, b) => Number(a) - Number(b));
              patch({
                targetLevels: sorted,
                targetLevel: sorted[0] || '',
                targetLevelTitle: sorted.length === 7 ? 'Level 1 - 7' : sorted.map((l) => `Level ${l}`).join(', '),
                assignment: draft.assignment ? { ...draft.assignment, targetLevel: sorted[0] || '' } : draft.assignment,
              });
              if (sorted.length > 0 && error && (error.includes('Cấp bậc') || error.includes('Level'))) {
                setError('');
              }
            }}
          />
        </div>

        {/* Row 5: Description */}
        <div style={{ marginBottom: 16 }}>
          <label className="field-label" style={{ fontWeight: 700 }}>Mô tả khóa học (Course Description)</label>
          <textarea
            className="field-input"
            value={draft.description}
            onChange={(e) => patch({ description: e.target.value })}
            rows={3}
            style={{ resize: 'vertical' }}
            placeholder="Mô tả mục tiêu khóa học, kiến thức cốt lõi và kết quả đầu ra của học viên sau khi hoàn thành..."
          />
        </div>

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

      {/* VIRTUAL CLASSROOM LOGISTICS CARD */}
      {draft.deliveryType === 'ONLINE_ELEARNING' && draft.onlineClassType === 'VIRTUAL_CLASS' && (
        <fieldset disabled={!canCreateVirtualClass} style={{ border: 'none', padding: 0, margin: 0 }}>
        <div className="card card-pad" style={{ marginBottom: 16, borderColor: 'var(--amber)', background: 'linear-gradient(180deg, #FFFFFF 0%, var(--amber-soft) 100%)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div className="section-label" style={{ margin: 0, color: 'var(--amber-soft-text)' }}>
              <i className="ti ti-device-tv" style={{ marginRight: 6 }} />
              Virtual Classroom Logistics &amp; Host Setup
            </div>
            <Badge tone="amber" icon="ti-checklist">Điểm danh qua Cổng Giảng Dạy</Badge>
          </div>

          <div className="grid grid-2" style={{ marginBottom: 14 }}>
            <div>
              <label className="field-label">Nền tảng (Platform)</label>
              <select
                className="field-select"
                value={draft.virtualMeeting?.platform || 'TEAMS'}
                onChange={(e) => patchVirtualMeeting({ platform: e.target.value })}
              >
                <option value="TEAMS">Microsoft Teams</option>
                <option value="ZOOM">Zoom</option>
                <option value="MEET">Google Meet</option>
                <option value="WEBEX">Cisco Webex</option>
                <option value="CUSTOM">Khác (Custom)</option>
              </select>
            </div>
            <div>
              <label className="field-label">Đường dẫn phòng họp (Meeting URL) *</label>
              <input
                className="field-input"
                placeholder="https://teams.microsoft.com/l/meetup-join/..."
                value={draft.virtualMeeting?.meetingUrl || ''}
                onChange={(e) => patchVirtualMeeting({ meetingUrl: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-2" style={{ marginBottom: 14 }}>
            <div>
              <label className="field-label">Giảng viên / Người chủ trì (Host Instructor) *</label>
              <select
                className="field-select"
                value={draft.virtualMeeting?.instructorId || ''}
                onChange={(e) => {
                  const tr = eligibleTrainers.find((t) => t.userId === e.target.value);
                  patchVirtualMeeting({ instructorId: tr?.userId || '', instructorName: tr?.fullName || '', instructorTitle: tr?.position || '' });
                }}
              >
                <option value="">— Chọn Giảng viên —</option>
                {eligibleTrainers.map((t) => (
                  <option key={t.userId} value={t.userId}>
                    {t.fullName} — {roleDefinition(t.role).labelVi}
                    {t.userId === authUser?.userId ? ' (chính bạn)' : ''}
                  </option>
                ))}
              </select>
              <div className="field-hint">Giảng viên được chọn sẽ thấy lớp này trong "Lớp Học Phụ Trách" tại Cổng Giảng Dạy, kèm nút Chủ Trì Lớp Học (Host Meeting).</div>
            </div>
            <div>
              <label className="field-label">Sức chứa tối đa (Max Capacity)</label>
              <input
                type="number"
                className="field-input"
                value={draft.virtualMeeting?.maxCapacity || 50}
                onChange={(e) => patchVirtualMeeting({ maxCapacity: Number(e.target.value) || 50 })}
              />
            </div>
          </div>

          <div className="grid grid-3" style={{ marginBottom: 14 }}>
            <div>
              <label className="field-label">Ngày tổ chức (Schedule Date) *</label>
              <input
                type="date"
                className="field-input"
                value={draft.virtualMeeting?.scheduleDate || draft.startDate || ''}
                onChange={(e) => patchVirtualMeeting({ scheduleDate: e.target.value })}
              />
            </div>
            <div>
              <label className="field-label">Khung giờ (Time Window) *</label>
              <input
                className="field-input"
                placeholder="14:00 - 16:00 (2.0 giờ)"
                value={draft.virtualMeeting?.scheduleTime || ''}
                onChange={(e) => patchVirtualMeeting({ scheduleTime: e.target.value })}
              />
            </div>
            <div>
              <label className="field-label">Trạng thái buổi học</label>
              <select
                className="field-select"
                value={draft.virtualMeeting?.status || 'UPCOMING'}
                onChange={(e) => patchVirtualMeeting({ status: e.target.value })}
              >
                <option value="UPCOMING">Sắp diễn ra</option>
                <option value="COMPLETED">Đã kết thúc</option>
              </select>
            </div>
          </div>

          <div className="grid grid-2" style={{ marginBottom: 14 }}>
            <div>
              <label className="field-label">Meeting ID</label>
              <input className="field-input" value={draft.virtualMeeting?.meetingId || ''} onChange={(e) => patchVirtualMeeting({ meetingId: e.target.value })} />
            </div>
            <div>
              <label className="field-label">Passcode</label>
              <input className="field-input" value={draft.virtualMeeting?.passcode || ''} onChange={(e) => patchVirtualMeeting({ passcode: e.target.value })} />
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <label className="field-label">Hướng dẫn chuẩn bị (Prep Instructions)</label>
            <textarea
              className="field-input"
              rows={2}
              style={{ resize: 'vertical' }}
              value={draft.virtualMeeting?.instructions || ''}
              onChange={(e) => patchVirtualMeeting({ instructions: e.target.value })}
            />
          </div>

          <div>
            <label className="field-label">Tài liệu đính kèm (Materials)</label>
            <VirtualMaterialsEditor
              materials={draft.virtualMeeting?.materials || []}
              onAdd={addVirtualMaterial}
              onRemove={removeVirtualMaterial}
            />
          </div>
        </div>
        </fieldset>
      )}

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
              <label className="field-label">⭐ Giảng viên Chính (Lead Trainer / Faculty) *</label>
              {isTrainerOnly ? (
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
                    setDraft((prev) => ({
                      ...prev,
                      trainerId: tr?.userId || e.target.value,
                      trainerName: tr?.fullName || tr?.name || 'Giảng Viên / L&D',
                      instructor: tr?.fullName || tr?.name || 'Giảng Viên / L&D',
                    }));
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
              <div className="field-hint">Giảng viên chính chịu trách nhiệm giáo trình và điều phối buổi đào tạo.</div>
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

          {/* CO-TRAINERS / FACULTY PANEL SECTION - Chỉ User Admin & SysAdmin mới có quyền phân công Giảng viên đồng giảng */}
          {!isTrainerOnly && (
            <div style={{ marginBottom: 16, padding: '12px 14px', background: '#F8FAFC', border: '1px solid var(--line)', borderRadius: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
                <div>
                  <label className="field-label" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <i className="ti ti-users" style={{ color: 'var(--blue)' }} />
                    🤝 Giảng Viên Đồng Giảng &amp; Trợ Giảng (Co-Trainers / Assistants)
                  </label>
                  <div style={{ fontSize: 11.5, color: 'var(--ink-soft)' }}>
                    Cho phép thêm 1 hoặc nhiều giảng viên cùng đứng lớp, mở QR điểm danh và quản lý học viên.
                  </div>
                </div>

                {/* Add co-trainer dropdown */}
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <select
                    className="field-select"
                    style={{ width: 240, fontSize: 12, height: 34, padding: '2px 8px' }}
                    value=""
                    onChange={(e) => {
                      const selId = e.target.value;
                      if (!selId) return;
                      const tr = eligibleTrainers.find((t) => t.userId === selId);
                      if (!tr) return;
                      const curList = draft.coTrainers || [];
                      if (curList.some((c) => c.userId === selId || c.id === selId) || selId === draft.trainerId) return;
                      
                      const nextList = [...curList, {
                        id: tr.userId,
                        userId: tr.userId,
                        fullName: tr.fullName,
                        name: tr.fullName,
                        role: tr.role,
                        title: roleDefinition(tr.role).labelVi,
                      }];
                      setDraft((prev) => ({
                        ...prev,
                        coTrainers: nextList,
                        coTrainerIds: nextList.map((x) => x.userId),
                        coTrainerNames: nextList.map((x) => x.fullName),
                      }));
                    }}
                  >
                    <option value="">+ Thêm Giảng Viên Đồng Giảng...</option>
                    {eligibleTrainers
                      .filter((t) => t.userId !== draft.trainerId && !(draft.coTrainers || []).some((c) => c.userId === t.userId || c.id === t.userId))
                      .map((t) => (
                        <option key={t.userId} value={t.userId}>
                          + {t.fullName} ({roleDefinition(t.role).shortVi})
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {/* List of active co-trainers */}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {(!draft.coTrainers || draft.coTrainers.length === 0) ? (
                  <div style={{ fontSize: 12, color: 'var(--ink-faint)', fontStyle: 'italic' }}>
                    Chưa có giảng viên đồng giảng. Lớp học do 1 Giảng viên chính phụ trách.
                  </div>
                ) : (
                  draft.coTrainers.map((ct) => (
                    <div
                      key={ct.userId || ct.id}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        background: '#fff',
                        border: '1px solid var(--blue)',
                        borderRadius: 20,
                        padding: '3px 10px',
                        gap: 6,
                        fontSize: 12,
                      }}
                    >
                      <i className="ti ti-user-check" style={{ color: 'var(--blue)', fontSize: 13 }} />
                      <span style={{ fontWeight: 700, color: 'var(--ink)' }}>{ct.fullName || ct.name}</span>
                      <Badge tone="blue" size="sm">{roleDefinition(ct.role || 'trainer').shortVi}</Badge>
                      <button
                        type="button"
                        onClick={() => {
                          const nextList = (draft.coTrainers || []).filter((x) => (x.userId || x.id) !== (ct.userId || ct.id));
                          setDraft((prev) => ({
                            ...prev,
                            coTrainers: nextList,
                            coTrainerIds: nextList.map((x) => x.userId),
                            coTrainerNames: nextList.map((x) => x.fullName),
                          }));
                        }}
                        title="Xóa giảng viên này khỏi lớp"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#E11D48', padding: '0 2px', display: 'flex', alignItems: 'center' }}
                      >
                        <i className="ti ti-x" style={{ fontSize: 12 }} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          <div className="grid grid-3" style={{ marginBottom: 14 }}>
            <div>
              <label className="field-label">Ngày tổ chức (Training Date)</label>
              <input
                type="date"
                className="field-input"
                value={draft.scheduleDate || draft.startDate || '2026-08-28'}
                onChange={(e) => patch({ scheduleDate: e.target.value, startDate: e.target.value })}
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
        </div>
      )}

      {/* SECTION: PHÂN BỔ ĐỐI TƯỢNG (CASCADING DRILL-DOWN ASSIGNER) */}
      {(draft.courseType === 'MANDATORY' || draft.courseType === 'OPTIONAL') && (
        <div
          className="card card-pad"
          style={{
            marginBottom: 16,
            border: draft.courseType === 'MANDATORY' ? '1.5px solid #F59E0B' : '1.5px solid var(--blue, #3B82F6)',
            background: draft.courseType === 'MANDATORY' ? '#FFFDF5' : '#F8FAFC',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, borderBottom: '1px solid var(--line)', paddingBottom: 10, flexWrap: 'wrap', gap: 8 }}>
            <div>
              <div
                className="section-label"
                style={{
                  margin: 0,
                  fontSize: 13.5,
                  fontWeight: 800,
                  color: draft.courseType === 'MANDATORY' ? '#B45309' : '#1D4ED8',
                }}
              >
                <i className="ti ti-sitemap" style={{ marginRight: 6 }} />
                {draft.courseType === 'MANDATORY'
                  ? 'Phân Bổ Đối Tượng Học Viên Bắt Buộc (Target Audience Assignment)'
                  : 'Phân Bổ Bắt Buộc Có Thời Hạn (Tùy Chọn Phân Phối Đối Tượng)'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 2 }}>
                {draft.courseType === 'MANDATORY' ? (
                  <>
                    💡 <strong>Tùy chọn lúc tạo/sửa khóa:</strong> Admin có thể chọn gán đối tượng ngay bây giờ (Khối, Phòng ban, Sub-Dept, Level, Chi nhánh, Từng User, Nhóm) <em>hoặc để trống để gán sau</em>. Khóa mandatory chưa gán đối tượng sẽ tạm ẩn khỏi học viên cho đến khi được phân bổ.
                  </>
                ) : (
                  <>
                    💡 <strong>Khóa học tự chọn (Optional):</strong> Khóa học luôn hiển thị công khai trên danh mục cho mọi học viên. Nếu Admin gán thêm Khối / Phòng ban / Cá nhân tại đây, khóa học sẽ trở thành <strong>bắt buộc kèm hạn hoàn thành</strong> riêng cho các đối tượng được gán.
                  </>
                )}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <Badge tone={(draft.assignments && draft.assignments.length) || draft.assignment ? (draft.courseType === 'MANDATORY' ? 'amber' : 'blue') : 'slate'}>
                {((draft.assignments && draft.assignments.length) || (draft.assignment ? 1 : 0))} Đối Tượng Đã Gán
              </Badge>
            </div>
          </div>

          {/* Table of Assigned Targets */}
          {((draft.assignments && draft.assignments.length > 0) || draft.assignment) && (
            <div style={{ marginBottom: 14, background: '#fff', border: '1px solid var(--line)', borderRadius: 8, overflow: 'hidden' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'var(--paper-sunken)', borderBottom: '1px solid var(--line)' }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)' }}>
                  Danh Sách Đối Tượng Được Gán ({((draft.assignments && draft.assignments.length) || (draft.assignment ? 1 : 0))})
                </span>
                <button
                  type="button"
                  className="btn btn-sm btn-ghost"
                  style={{ fontSize: 11, color: '#DC2626', padding: '2px 6px' }}
                  onClick={handleClearAllAssignments}
                >
                  Xóa tất cả
                </button>
              </div>
              <div style={{ maxHeight: 180, overflowY: 'auto' }}>
                <table className="table" style={{ margin: 0, fontSize: 12 }}>
                  <thead>
                    <tr>
                      <th>Cấp Độ Phân Bổ</th>
                      <th>Đối Tượng Mục Tiêu</th>
                      <th>Hạn Hoàn Thành</th>
                      <th>Ghi Chú</th>
                      <th style={{ width: 60, textAlign: 'center' }}>Thao Tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(draft.assignments || (draft.assignment ? [draft.assignment] : [])).map((asg, idx) => (
                      <tr key={asg.id || idx}>
                        <td>
                          <Badge tone="blue" size="sm">{assignmentTypeLabel(asg.assignmentType)}</Badge>
                        </td>
                        <td style={{ fontWeight: 600, color: 'var(--ink)' }}>
                          {asg.targetLabel || resolveTargetLabel(asg.assignmentType, asg.targetId || asg.targetDivisionId || asg.targetDepartmentId || asg.targetStoreId || asg.targetSubDepartmentId || asg.targetBusinessUnitId || asg.targetGroupId || asg.targetUserId || asg.targetLevel)}
                        </td>
                        <td>{asg.dueDate || '—'}</td>
                        <td style={{ color: 'var(--ink-soft)' }}>{asg.justification || '—'}</td>
                        <td style={{ textAlign: 'center' }}>
                          <button
                            type="button"
                            className="btn btn-sm btn-ghost"
                            style={{ color: '#DC2626', padding: '2px 6px' }}
                            onClick={() => handleRemoveAssignment(idx)}
                            title="Xóa phân bổ này"
                          >
                            <i className="ti ti-trash" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Integrated Cascading MultiTargetAssigner Component */}
          <MultiTargetAssigner
            course={draft}
            saveButtonLabel="+ Thêm Đối Tượng Phân Bổ"
            onSave={({ assignmentType, targets, dueDate, justification, groupPolicy, assignedLevelEligibility }) => {
              const toAdd = targets.map((t) => ({
                id: `asg-draft-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
                assignmentType,
                targetId: t.targetId,
                targetLabel: t.targetLabel,
                dueDate: dueDate || '',
                justification: justification || '',
                groupPolicy: groupPolicy || 'ELIGIBLE_ONLY',
                assignedLevelEligibility,
                assignedAt: new Date().toISOString().slice(0, 10),
                assignedBy: authUser?.fullName || 'User Admin',
              }));
              handleAddAssignments(toAdd);
            }}
          />
        </div>
      )}

      {/* SECTION: GIÁO TRÌNH & TÀI LIỆU GIẢNG DẠY (CHỈ ÁP DỤNG CHO KHÓA TRỰC TIẾP HOẶC LỚP TRỰC TUYẾN LIVE) */}
      {(draft.deliveryType === 'IN_PERSON_CLASSROOM' || (draft.deliveryType === 'ONLINE_ELEARNING' && draft.onlineClassType === 'VIRTUAL_CLASS')) && (
        <div className="card card-pad" style={{ marginBottom: 16, border: '1.5px solid var(--blue, #2563eb)', background: 'var(--paper-raised)', borderRadius: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, paddingBottom: 10, borderBottom: '1px solid var(--line)', flexWrap: 'wrap', gap: 10 }}>
            <div>
              <div className="section-label" style={{ margin: 0, fontSize: 14, fontWeight: 800, color: 'var(--ink)' }}>
                <i className="ti ti-notebook" style={{ marginRight: 6, color: 'var(--blue)' }} />
                Giáo Trình &amp; Tài Liệu Giảng Dạy (Session Syllabus &amp; Pre-Class Materials)
              </div>
              <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 2 }}>
                Khung chương trình bài giảng từng phần và file tài liệu (SOP PDF, Slide PPT) để học viên tải về xem trước khi bắt đầu khóa học trực tiếp / trực tuyến.
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Badge tone="blue" icon="ti-list-check">{(draft.syllabus || []).length} Phần Học</Badge>
              <Badge tone="sage" icon="ti-paperclip">{(draft.materials || []).length} File Tài Liệu</Badge>
            </div>
          </div>

          <div className="grid grid-2" style={{ gap: 20, alignItems: 'start' }}>
            {/* COLUMN 1: KHUNG CHƯƠNG TRÌNH (SYLLABUS / SESSION AGENDA) */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <label className="field-label" style={{ fontWeight: 700, margin: 0, color: 'var(--blue)' }}>
                  <i className="ti ti-list-numbers" style={{ marginRight: 4 }} /> Khung Chương Trình Buổi Học (Syllabus Agenda)
                </label>
                <Button size="sm" variant="outline" icon="ti-plus" onClick={addSyllabusStep}>
                  Thêm Phần Học
                </Button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 380, overflowY: 'auto', paddingRight: 4 }}>
                {(draft.syllabus || []).length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '24px 12px', background: 'var(--paper-sunken)', borderRadius: 8, border: '1px dashed var(--line)', color: 'var(--ink-soft)', fontSize: 12.5 }}>
                    Chưa có khung chương trình. Bấm "+ Thêm Phần Học" để thiết lập nội dung từng bước.
                  </div>
                ) : (
                  draft.syllabus.map((step, sIdx) => (
                    <div key={sIdx} style={{ background: 'var(--paper-sunken)', border: '1px solid var(--line)', borderRadius: 8, padding: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, marginRight: 8 }}>
                          <span style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--blue)', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, flexShrink: 0 }}>
                            {sIdx + 1}
                          </span>
                          <input
                            className="field-input"
                            style={{ height: 30, fontSize: 12.5, fontWeight: 700 }}
                            value={step.step}
                            onChange={(e) => updateSyllabusStep(sIdx, 'step', e.target.value)}
                            placeholder="Tên phần học (VD: Phần 1: Giới thiệu...)"
                          />
                        </div>
                        <button
                          type="button"
                          className="icon-btn"
                          style={{ color: 'var(--rust)' }}
                          onClick={() => removeSyllabusStep(sIdx)}
                          title="Xóa phần này"
                        >
                          <i className="ti ti-trash" />
                        </button>
                      </div>
                      <textarea
                        className="field-input"
                        rows={2}
                        style={{ fontSize: 12, resize: 'vertical' }}
                        value={step.detail}
                        onChange={(e) => updateSyllabusStep(sIdx, 'detail', e.target.value)}
                        placeholder="Mô tả chi tiết nội dung đào tạo và yêu cầu thực hành..."
                      />
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* COLUMN 2: TÀI LIỆU ĐÍNH KÈM & SLIDE (COURSE MATERIALS & UPLOADS) */}
            <div>
              <label className="field-label" style={{ fontWeight: 700, marginBottom: 10, color: 'var(--bigc-green, #007A38)' }}>
                <i className="ti ti-upload" style={{ marginRight: 4 }} /> File Giáo Trình, Slide &amp; Tài Liệu Đính Kèm
              </label>

              {/* Simulated Drag & Drop Upload Zone */}
              <div style={{
                background: '#f8fafc',
                border: '2px dashed #94a3b8',
                borderRadius: 8,
                padding: '16px 12px',
                textAlign: 'center',
                marginBottom: 12,
                position: 'relative',
                cursor: 'pointer',
              }}>
                <input
                  type="file"
                  accept=".pdf,.ppt,.pptx,.doc,.docx,.zip"
                  onChange={handleSimulatedFileUpload}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    opacity: 0,
                    cursor: 'pointer',
                    width: '100%',
                    height: '100%',
                  }}
                />
                <i className="ti ti-cloud-upload" style={{ fontSize: 28, color: 'var(--blue)', marginBottom: 4 }} />
                <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ink)' }}>Kéo thả file hoặc Bấm để tải lên tài liệu</div>
                <div style={{ fontSize: 11, color: 'var(--ink-soft)' }}>Hỗ trợ: PDF (SOP, Hướng dẫn), PPT/PPTX (Slide bài giảng), DOCX (Biểu mẫu)</div>
              </div>

              {/* Quick manual entry form */}
              <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
                <input
                  className="field-input"
                  style={{ flex: 1, minWidth: 160, height: 32, fontSize: 12 }}
                  placeholder="Tên tài liệu đính kèm..."
                  value={newMaterialName}
                  onChange={(e) => setNewMaterialName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addMaterial(); } }}
                />
                <select
                  className="field-select"
                  style={{ width: 80, height: 32, fontSize: 12 }}
                  value={newMaterialType}
                  onChange={(e) => setNewMaterialType(e.target.value)}
                >
                  <option value="PDF">PDF</option>
                  <option value="PPT">PPT</option>
                  <option value="DOC">DOC</option>
                  <option value="LINK">LINK</option>
                </select>
                <Button size="sm" variant="primary" icon="ti-plus" onClick={addMaterial}>
                  Thêm File
                </Button>
              </div>

              {/* List of current uploaded materials */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 220, overflowY: 'auto' }}>
                {(draft.materials || []).length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '14px', background: 'var(--paper-sunken)', borderRadius: 6, color: 'var(--ink-soft)', fontSize: 12 }}>
                    Chưa có tài liệu đính kèm. Tải file hoặc nhập tên ở trên.
                  </div>
                ) : (
                  draft.materials.map((mat) => (
                    <div key={mat.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', border: '1px solid var(--line)', borderRadius: 6, padding: '8px 10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
                        <i
                          className={mat.type === 'PDF' ? 'ti ti-file-type-pdf' : mat.type === 'PPT' ? 'ti ti-file-type-ppt' : mat.type === 'DOC' ? 'ti ti-file-type-doc' : 'ti ti-link'}
                          style={{ fontSize: 18, color: mat.type === 'PDF' ? 'var(--rust)' : mat.type === 'PPT' ? 'var(--amber)' : 'var(--blue)', flexShrink: 0 }}
                        />
                        <div style={{ overflow: 'hidden' }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{mat.name}</div>
                          <div style={{ fontSize: 10.5, color: 'var(--ink-soft)' }}>{mat.type} &middot; {mat.size || '2.0 MB'} &middot; {mat.uploadedBy || 'Admin'}</div>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="icon-btn"
                        style={{ color: 'var(--rust)' }}
                        onClick={() => removeMaterial(mat.id)}
                        title="Xóa tài liệu"
                      >
                        <i className="ti ti-x" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Module/Lesson editor & Assessment CHỈ áp dụng cho khóa Online E-Learning
          tự học — không áp dụng cho Virtual Class (lớp live qua Zoom/Teams,
          hoàn thành = đã tham gia buổi học) và cũng không áp dụng cho khóa
          Trực Tiếp/ILT (chỉ là buổi học viên đến tham dự tại phòng/xưởng thực
          hành do User Admin/SysAdmin đặt lịch — không có nội dung tự học nào cả). */}
      {draft.deliveryType === 'ONLINE_ELEARNING' && draft.onlineClassType !== 'VIRTUAL_CLASS' && (
      <>
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

      {/* KHỐI ASSESSMENT ĐÁNH GIÁ CUỐI KHÓA HỌC (TÁCH RIÊNG KHỎI MODULES) */}
      <div className="card card-pad" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, paddingBottom: 10, borderBottom: '1px solid var(--line)', flexWrap: 'wrap', gap: 10 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <i className="ti ti-shield-check" style={{ color: 'var(--rail)', fontSize: 18 }} />
            <span>Bài Kiểm Tra / Assessment Đánh Giá Cuối Khóa (Course Assessment)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <label style={{ fontSize: 12.5, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={cfg.assessmentEnabled}
                onChange={(e) => {
                  const checked = e.target.checked;
                  patchConfig({ assessmentEnabled: checked });
                  if (checked && !courseAssessment) {
                    handleOpenCreateAssessment();
                  }
                }}
              />
              <span>Bắt buộc đạt bài Assessment để hoàn thành khóa học</span>
            </label>
            {courseAssessment ? (
              <Badge tone="sage"><i className="ti ti-check" /> Đã gắn bài thi</Badge>
            ) : (
              <Badge tone="slate">Chưa có bài thi</Badge>
            )}
          </div>
        </div>

        {courseAssessment ? (
          <div style={{ background: 'var(--paper-sunken)', padding: '14px', borderRadius: 8, border: '1px solid var(--line)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 8, flexWrap: 'wrap' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-faint)', fontWeight: 600 }}>
                    [{courseAssessment.code}]
                  </span>
                  <span style={{ fontWeight: 800, fontSize: 15, color: 'var(--ink)' }}>
                    {courseAssessment.title}
                  </span>
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--ink-soft)', marginBottom: 8 }}>
                  {courseAssessment.description || 'Bài kiểm tra đánh giá kiến thức tổng hợp sau khi hoàn thành khóa học.'}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <Button size="sm" variant="primary" icon="ti-edit" onClick={handleOpenCreateAssessment}>
                  Chỉnh Sửa Assessment
                </Button>
                <Button size="sm" variant="ghost" icon="ti-trash" style={{ color: 'var(--rust)' }} onClick={handleRemoveCourseAssessment}>
                  Gỡ Bài Thi
                </Button>
              </div>
            </div>

            {/* Badges */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10, fontSize: 11.5 }}>
              <Badge tone="sage" size="sm">🎯 Gắn Liền Khóa Học (Course-linked)</Badge>
              {(courseAssessment.contentFormats || (courseAssessment.contentFormat ? [courseAssessment.contentFormat] : [])).map((fmt) => (
                <Badge key={fmt} tone="blue" size="sm">
                  {fmt === 'UPLOAD_DOC' ? '📄 File Đề Tự Luận PDF' : fmt === 'SCORM_PACKAGE' ? '📦 SCORM' : fmt === 'GOOGLE_FORM' ? '🔗 Form Online' : '💡 Ngân Hàng Câu Hỏi'}
                </Badge>
              ))}
              <Badge tone="slate" size="sm">
                ⏱️ {courseAssessment.timeLimitMinutes} phút
              </Badge>
              <Badge tone="sage" size="sm">
                🎯 Điểm đạt: {courseAssessment.passingScorePercent}%
              </Badge>
              <Badge tone="slate" size="sm">
                🔄 Tối đa {courseAssessment.maxAttempts} lần thi
              </Badge>
              <Badge tone="amber" size="sm">
                🎲 Bốc ngẫu nhiên: {courseAssessment.questionsPerAttempt} câu / đề
              </Badge>
            </div>

            {/* Matrix / Breakdown info */}
            {courseAssessment.questionTypesList && courseAssessment.questionTypesList.length > 0 && (
              <div style={{ fontSize: 12, color: 'var(--ink-soft)', background: 'var(--paper-raised)', padding: '6px 10px', borderRadius: 6, marginBottom: 8 }}>
                <i className="ti ti-list-check" style={{ marginRight: 5, color: 'var(--rail)' }} />
                <strong>Cấu hình đề thi:</strong> {courseAssessment.questionTypesList.join(' &middot; ')}
                {courseAssessment.uploadedFileName && (
                  <span style={{ marginLeft: 8, color: 'var(--ink-faint)' }}>
                    (Nguồn: {courseAssessment.uploadedFileName} - {courseAssessment.uploadedPoolSize || 150} câu)
                  </span>
                )}
              </div>
            )}

            {/* Anti-cheat features */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', fontSize: 11 }}>
              <span style={{ color: 'var(--ink-faint)', marginRight: 4 }}>Bảo mật:</span>
              {courseAssessment.antiCheatSettings?.enforceFullscreen && <span style={{ color: 'var(--sage)' }}>✓ Toàn màn hình</span>}
              {courseAssessment.antiCheatSettings?.detectTabSwitch && <span style={{ color: 'var(--amber)' }}>✓ Giám sát chuyển tab</span>}
              {courseAssessment.antiCheatSettings?.randomizeQuestions && <span style={{ color: 'var(--ink-soft)' }}>✓ Xáo trộn đề</span>}
              {courseAssessment.antiCheatSettings?.showWatermark && <span style={{ color: 'var(--ink-soft)' }}>✓ Watermark</span>}
              {courseAssessment.antiCheatSettings?.preventCopyPaste && <span style={{ color: 'var(--rust)' }}>✓ Khóa Copy/Paste</span>}
            </div>
          </div>
        ) : (
          <div style={{ padding: '24px 16px', textAlign: 'center', background: 'var(--paper-sunken)', borderRadius: 8, border: '1px dashed var(--line)' }}>
            <i className="ti ti-award" style={{ fontSize: 32, color: 'var(--rail)', display: 'block', marginBottom: 8 }} />
            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--ink)', marginBottom: 4 }}>
              Khóa học này hiện chưa có bài Assessment đánh giá cuối khóa
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--ink-soft)', maxWidth: 580, margin: '0 auto 14px' }}>
              Bài Assessment nằm riêng biệt ngoài các Module bài giảng, dùng để kiểm tra đánh giá năng lực và cấp chứng chỉ sau khi học viên học xong toàn bộ bài học. Bạn có thể bốc câu hỏi ngẫu nhiên từ file ngân hàng, đề tự luận PDF, SCORM hoặc biểu mẫu online.
            </div>
            <Button variant="primary" icon="ti-plus" onClick={handleOpenCreateAssessment}>
              Tạo Bài Assessment Riêng Cho Khóa Học Này
            </Button>
          </div>
        )}
      </div>
      </>
      )}

      {/* COMPLETION, PREREQUISITES & CERTIFICATE CARD */}
      <div className="card card-pad" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, paddingBottom: 10, borderBottom: '1px solid var(--line)' }}>
          <div className="section-label" style={{ margin: 0, fontSize: 14, fontWeight: 800, color: 'var(--ink)' }}>
            <i className="ti ti-award" style={{ marginRight: 6, color: 'var(--rail)' }} />
            Quy Tắc Hoàn Thành, Điều Kiện Tiên Quyết &amp; Chứng Chỉ (Completion &amp; Certificate)
          </div>
          <Badge tone={cfg.certificateEnabled ? 'sage' : 'slate'}>
            {cfg.certificateEnabled ? '🎓 Có cấp chứng chỉ' : 'Không cấp chứng chỉ'}
          </Badge>
        </div>

        {/* Top 2-Column: Completion Rules & Certificate Settings */}
        <div className="grid grid-2" style={{ gap: 14, marginBottom: 14 }}>
          <div>
            <label className="field-label" style={{ fontWeight: 700 }}>
              Quy tắc hoàn thành khóa học (Course Completion Rule)
            </label>
            <input
              className="field-input"
              value={cfg.completionRule}
              placeholder="VD: Complete all required lessons"
              onChange={(e) => patchConfig({ completionRule: e.target.value })}
            />
            {/* Quick preset chips */}
            <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 11, color: 'var(--ink-faint)' }}>Gợi ý:</span>
              {[
                'Complete all required lessons',
                'Hoàn thành 100% bài học & Đạt bài thi >= 80%',
                'Điểm danh đủ các buổi học trực tiếp',
              ].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  className="btn btn-sm btn-ghost"
                  style={{ fontSize: 10.5, padding: '1px 6px', background: 'var(--paper-sunken)' }}
                  onClick={() => patchConfig({ completionRule: preset })}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          <div style={{ background: 'var(--paper-sunken)', borderRadius: 8, padding: '14px', border: '1px solid var(--line)', display: 'flex', flexDirection: 'column' }}>
            <label style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: 4 }}>
              <input
                type="checkbox"
                checked={cfg.certificateEnabled}
                onChange={(e) => patchConfig({
                  certificateEnabled: e.target.checked,
                  validityPeriodMonths: cfg.validityPeriodMonths ?? 12,
                  recertificationWarningDays: cfg.recertificationWarningDays ?? 30,
                  recertificationMethod: cfg.recertificationMethod ?? 'RETAKE_FULL_COURSE',
                })}
              />
              <span style={{ fontSize: 13.5 }}>Cấp chứng chỉ tốt nghiệp có thời hạn &amp; Tái cấp (Digital Certificate &amp; Recertification)</span>
            </label>
            <div style={{ fontSize: 11.5, color: 'var(--ink-soft)', marginBottom: cfg.certificateEnabled ? 12 : 0, marginLeft: 24 }}>
              Học viên đạt tiêu chuẩn sẽ nhận chứng chỉ số có mã QR xác thực và được theo dõi chu kỳ tái đào tạo định kỳ.
            </div>

            {cfg.certificateEnabled && (
              <div style={{ marginLeft: 24, paddingTop: 12, borderTop: '1px dashed var(--line)', display: 'flex', flexDirection: 'column', gap: 12 }}>
                {/* 1. THỜI HẠN HIỆU LỰC & SỐ NGÀY BÁO TRƯỚC */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label className="field-label" style={{ fontSize: 11.5, fontWeight: 700, marginBottom: 3 }}>
                      <i className="ti ti-calendar-time" style={{ marginRight: 4, color: 'var(--blue)' }} />
                      Thời hạn hiệu lực chứng chỉ:
                    </label>
                    <select
                      className="field-input"
                      style={{ height: 32, fontSize: 12 }}
                      value={cfg.validityPeriodMonths ?? 12}
                      onChange={(e) => patchConfig({ validityPeriodMonths: parseInt(e.target.value, 10) })}
                    >
                      <option value={6}>6 Tháng (Đợt cao điểm/vệ sinh định kỳ)</option>
                      <option value={12}>12 Tháng / 1 Năm (Chuẩn ATVSTP, PCCC, An toàn)</option>
                      <option value={24}>24 Tháng / 2 Năm (Nghiệp vụ Quản lý)</option>
                      <option value={36}>36 Tháng / 3 Năm (Kỹ năng Lãnh đạo)</option>
                      <option value={0}>Vĩnh viễn (Không hết hạn / Lifetime)</option>
                    </select>
                  </div>

                  <div>
                    <label className="field-label" style={{ fontSize: 11.5, fontWeight: 700, marginBottom: 3 }}>
                      <i className="ti ti-bell-ringing" style={{ marginRight: 4, color: 'var(--amber)' }} />
                      Thông báo trước hạn tái cấp:
                    </label>
                    <select
                      className="field-input"
                      style={{ height: 32, fontSize: 12 }}
                      disabled={cfg.validityPeriodMonths === 0}
                      value={cfg.recertificationWarningDays ?? 30}
                      onChange={(e) => patchConfig({ recertificationWarningDays: parseInt(e.target.value, 10) })}
                    >
                      <option value={15}>15 ngày trước khi hết hạn</option>
                      <option value={30}>30 ngày trước khi hết hạn (Chuẩn)</option>
                      <option value={45}>45 ngày trước khi hết hạn</option>
                      <option value={60}>60 ngày trước khi hết hạn (2 tháng)</option>
                    </select>
                  </div>
                </div>

                {/* 2. HÌNH THỨC TÁI CẤP & MỞ LẠI KHÓA HỌC */}
                {cfg.validityPeriodMonths !== 0 && (
                  <div>
                    <label className="field-label" style={{ fontSize: 11.5, fontWeight: 700, marginBottom: 4 }}>
                      <i className="ti ti-refresh" style={{ marginRight: 4, color: 'var(--bigc-green)' }} />
                      Hình thức mở lại khóa học cho học viên khi đến hạn tái cấp:
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8 }}>
                      {[
                        {
                          id: 'RETAKE_FULL_COURSE',
                          label: 'Học lại bài học & Thi sát hạch',
                          desc: 'Mở lại toàn bộ video/slide bài giảng để ôn tập trước khi thi.',
                          icon: 'ti-book',
                        },
                        {
                          id: 'ASSESSMENT_ONLY',
                          label: 'Chỉ thi sát hạch (Fast-track Exam)',
                          desc: 'Bỏ qua lý thuyết, chỉ cần thi đạt điểm chuẩn để cấp mới.',
                          icon: 'ti-file-certificate',
                        },
                        {
                          id: 'IN_PERSON_WORKSHOP',
                          label: 'Lớp Workshop / Thực hành Offline',
                          desc: 'Yêu cầu tham gia lớp tập huấn thực tế tại chi nhánh.',
                          icon: 'ti-building',
                        },
                      ].map((m) => {
                        const selected = (cfg.recertificationMethod || 'RETAKE_FULL_COURSE') === m.id;
                        return (
                          <div
                            key={m.id}
                            onClick={() => patchConfig({ recertificationMethod: m.id })}
                            style={{
                              padding: '8px 10px',
                              borderRadius: 6,
                              border: selected ? '2px solid var(--bigc-green)' : '1px solid var(--line)',
                              background: selected ? 'var(--bigc-green-soft)' : 'var(--paper-raised)',
                              cursor: 'pointer',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: 12, color: selected ? 'var(--bigc-green-soft-text)' : 'var(--ink)' }}>
                              <i className={`ti ${m.icon}`} />
                              <span>{m.label}</span>
                            </div>
                            <div style={{ fontSize: 10.5, color: 'var(--ink-soft)', marginTop: 2, lineHeight: 1.3 }}>
                              {m.desc}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 3. TÓM TẮT TRẢI NGHIỆM HỌC VIÊN */}
                <div style={{ padding: '8px 10px', borderRadius: 6, background: 'rgba(0,158,73,0.06)', border: '1px solid rgba(0,158,73,0.15)', fontSize: 11.5, color: 'var(--bigc-green-soft-text)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <i className="ti ti-info-circle" style={{ fontSize: 16, flexShrink: 0 }} />
                  <span>
                    {cfg.validityPeriodMonths === 0
                      ? 'Chứng chỉ vĩnh viễn, học viên chỉ cần hoàn thành 1 lần.'
                      : `Chứng chỉ có hiệu lực ${cfg.validityPeriodMonths || 12} tháng. Trước khi hết hạn ${cfg.recertificationWarningDays || 30} ngày, khóa học sẽ mở khóa cho học viên với nhãn "Học & Tái Cấp Chứng Chỉ" để tham gia cấp lại.`}
                  </span>
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Prerequisite Courses: Compact & Filterable */}
        <PrerequisiteCoursesPicker
          courses={courses}
          currentCourseId={draft.id}
          selectedIds={draft.prerequisites || []}
          onToggle={(cid) => togglePrerequisite(cid)}
          onClear={() => patch({ prerequisites: [] })}
        />
      </div>

      {/* BOTTOM ACTION BAR — Save/Create được dời xuống cuối trang; lưu xong
          quay về danh sách khóa học (xem handleSave). */}
      <div
        className="card card-pad"
        style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 10, flexWrap: 'wrap', position: 'sticky', bottom: 0, background: 'var(--paper-raised)', zIndex: 5 }}
      >
        {error && <span style={{ fontSize: 12.5, color: 'var(--rust)', marginRight: 'auto' }}>{error}</span>}
        <Button variant="ghost" icon="ti-x" onClick={() => navigate('/admin/courses')}>Cancel</Button>
        <Button variant="outline" icon="ti-file-pencil" onClick={() => handleSave('DRAFT')}>Save as Draft</Button>
        <Button variant="primary" icon="ti-device-floppy" onClick={() => handleSave('PUBLISHED')}>{isNew ? 'Create Course' : 'Save Changes'}</Button>
      </div>

      {/* MODAL TẠO & CHỈNH SỬA ASSESSMENT CHO KHÓA HỌC */}
      {editingAssessment && (
        <AssessmentEditorModal
          isOpen={Boolean(editingAssessment)}
          assessment={editingAssessment}
          onClose={() => setEditingAssessment(null)}
          onSave={handleSaveAssessmentFromModal}
          courses={courses}
          companyCategories={companyCategories}
          questionBanks={questionBanks}
        />
      )}
    </>
  );
}

function VirtualMaterialsEditor({ materials, onAdd, onRemove }) {
  const [name, setName] = useState('');
  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        <input
          className="field-input"
          placeholder="VD: Slide bài giảng.pdf"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.preventDefault(); onAdd(name); setName(''); }
          }}
        />
        <Button size="sm" icon="ti-plus" onClick={() => { onAdd(name); setName(''); }}>Thêm</Button>
      </div>
      {materials.length === 0 ? (
        <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>Chưa có tài liệu đính kèm.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {materials.map((m, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', background: '#fff', border: '1px solid var(--line)', borderRadius: 6 }}>
              <span style={{ fontSize: 12.5, display: 'flex', alignItems: 'center', gap: 6 }}><i className="ti ti-paperclip" style={{ color: 'var(--ink-soft)' }} />{m.name}</span>
              <button type="button" className="icon-btn" aria-label="Remove material" onClick={() => onRemove(i)}>
                <i className="ti ti-x" aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
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
            {['SCORM', 'VIDEO', 'PDF', 'PPT', 'EXTERNAL_LINK'].map((t) => <option key={t} value={t}>{t}</option>)}
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

const ACCEPT_BY_TYPE = { VIDEO: 'video/*', PDF: '.pdf', SCORM: '.zip' };

// Content upload (5 định dạng chuẩn hóa): file cục bộ chỉ xem trước trong
// phiên trình duyệt này (không có media server trong bản mô phỏng — xem
// CourseStore), hoặc Admin có thể dán URL đã host sẵn để giữ nguyên sau khi tải lại.
function LessonContentFields({ lesson, onChange }) {
  const content = lesson.content || {};

  if (lesson.lessonType === 'ASSESSMENT') return null;

  if (lesson.lessonType === 'SCORM') {
    return (
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 6 }}>
        <label className="btn btn-sm" style={{ cursor: 'pointer', alignSelf: 'flex-start' }}>
          <i className="ti ti-upload" aria-hidden="true" /> Upload SCORM Package (.zip)
          <input
            type="file"
            accept={ACCEPT_BY_TYPE.SCORM}
            onChange={(e) => {
              const f = e.target.files[0];
              if (f) onChange({ content: { fileName: f.name } });
              e.target.value = '';
            }}
            style={{ display: 'none' }}
          />
        </label>
        {content.fileName && <Badge tone="sage" icon="ti-package">{content.fileName}</Badge>}
        <div className="field-hint">Gói tương tác chuẩn SCORM 1.2 / SCORM 2004, giao tiếp qua CMI Data Model — học viên sẽ thấy trình mô phỏng SCORM tương tác.</div>
      </div>
    );
  }

  if (lesson.lessonType === 'PPT') {
    return (
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 6 }}>
        <label className="btn btn-sm" style={{ cursor: 'pointer', alignSelf: 'flex-start' }}>
          <i className="ti ti-upload" aria-hidden="true" /> Upload PPT / Slide Deck
          <input
            type="file"
            accept=".ppt,.pptx,.pdf"
            onChange={(e) => {
              const f = e.target.files[0];
              if (f) onChange({ content: { fileName: f.name } });
              e.target.value = '';
            }}
            style={{ display: 'none' }}
          />
        </label>
        {content.fileName && <Badge tone="amber" icon="ti-presentation">{content.fileName}</Badge>}
        <div className="field-hint">Slide bài giảng dạng Interactive Slide Deck, học viên lật từng trang.</div>
      </div>
    );
  }

  if (lesson.lessonType === 'EXTERNAL_LINK') {
    return (
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <select
            className="field-select"
            style={{ width: 200 }}
            value={content.platform || 'UDEMY'}
            onChange={(e) => onChange({ content: { ...content, platform: e.target.value } })}
          >
            {EXTERNAL_LINK_PLATFORMS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
          <input
            className="field-input"
            style={{ flex: 1, minWidth: 240 }}
            placeholder={content.platform === 'YOUTUBE' ? 'https://www.youtube.com/watch?v=...' : 'https://...'}
            value={content.url || ''}
            onChange={(e) => onChange({ content: { ...content, url: e.target.value } })}
          />
        </div>
        <div className="field-hint">
          {content.platform === 'YOUTUBE'
            ? 'Video YouTube phát trực tiếp trong app qua Embed Player.'
            : 'Học viên bấm mở tab học tại nền tảng đối tác (SSO doanh nghiệp MMVN) rồi xác nhận hoàn thành để đồng bộ Transcript.'}
        </div>
      </div>
    );
  }

  // VIDEO / PDF: URL đã host, hoặc chọn file cục bộ để xem trước trong phiên này.
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
  if (lesson.lessonType === 'PPT' || lesson.lessonType === 'SCORM') {
    return (
      <label style={{ fontSize: 12.5, display: 'flex', alignItems: 'center', gap: 6 }}>
        <input type="checkbox" checked={rule.requireAllViewed ?? true} onChange={(e) => onChange({ rule: { ...rule, requireAllViewed: e.target.checked } })} /> Require all slides/interactions viewed
      </label>
    );
  }
  if (lesson.lessonType === 'EXTERNAL_LINK') {
    return <span style={{ fontSize: 12, color: 'var(--ink-faint)' }}>Hoàn thành = học viên bấm xác nhận đã học xong tại nền tảng đối tác.</span>;
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
