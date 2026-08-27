import React, { useState, useMemo } from 'react';
import { Modal, Button, Badge } from '../ui';
import { ASSESSMENT_TYPES, DELIVERY_FORMATS, QUESTION_TYPES, CONTENT_FORMATS } from '../../data/assessmentData';
import { ASSIGNMENT_TYPES, assignmentTypeLabel, targetOptionsFor } from '../../data/assignmentTargets';
import { generateAssessmentCode } from '../../utils/assessmentCatalog';

export default function AssessmentEditorModal({
  assessment,
  isOpen,
  onClose,
  onSave,
  courses = [],
  companyCategories = [],
  questionBanks = [],
}) {
  const isEditing = Boolean(assessment && assessment.id);
  const [activeTab, setActiveTab] = useState('GENERAL'); // GENERAL | CONTENT | ANTI_CHEAT | ASSIGNMENTS

  const [formData, setFormData] = useState(() => {
    if (assessment) {
      const initialTypes = assessment.types && assessment.types.length > 0
        ? assessment.types
        : [assessment.type || ASSESSMENT_TYPES.QUIZ];

      const initialCategories = assessment.categories && assessment.categories.length > 0
        ? assessment.categories
        : assessment.category ? [assessment.category] : [companyCategories[0] || 'Food Safety & Hygiene'];

      const initialCourseIds = assessment.courseIds && assessment.courseIds.length > 0
        ? assessment.courseIds
        : assessment.courseId ? [assessment.courseId] : [];

      const initialMatrix = assessment.questionMatrix || {
        singleChoice: 2,
        multipleChoice: 1,
        trueFalse: 1,
        essay: 0,
        ratingScale: 0,
        matching: 0,
      };

      const initialFormats = assessment.contentFormats && assessment.contentFormats.length > 0
        ? assessment.contentFormats
        : (assessment.contentFormat ? [assessment.contentFormat] : [CONTENT_FORMATS.INTERACTIVE_BANK]);

      return {
        ...assessment,
        types: initialTypes,
        type: initialTypes[0] || ASSESSMENT_TYPES.QUIZ,
        categories: initialCategories,
        category: initialCategories[0] || companyCategories[0] || 'Food Safety & Hygiene',
        contentFormats: initialFormats,
        contentFormat: initialFormats[0] || CONTENT_FORMATS.INTERACTIVE_BANK,
        uploadedFileName: assessment.uploadedFileName || 'Ngan_Hang_150_Cau_Hoi_Chuan.xlsx',
        uploadedPoolSize: assessment.uploadedPoolSize || 150,
        questionMatrix: initialMatrix,
        randomizeFromPool: assessment.randomizeFromPool ?? true,
        documentUrl: assessment.documentUrl || '',
        scormUrl: assessment.scormUrl || '',
        googleFormUrl: assessment.googleFormUrl || '',
        courseIds: initialCourseIds,
        courseId: initialCourseIds[0] || '',
        assignments: assessment.assignments ? [...assessment.assignments] : [],
        questionIds: assessment.questionIds ? [...assessment.questionIds] : [],
        antiCheatSettings: {
          enforceFullscreen: true,
          detectTabSwitch: true,
          maxTabSwitches: 3,
          randomizeQuestions: true,
          randomizeOptions: true,
          showWatermark: true,
          webcamProctoringSimulation: false,
          preventCopyPaste: true,
          ...(assessment.antiCheatSettings || {}),
        },
        feedbackSettings: {
          showAnswersAfterSubmit: true,
          showExplanations: true,
          allowReview: true,
          ...(assessment.feedbackSettings || {}),
        },
      };
    }

    const defaultTitle = '';
    const initialCategories = companyCategories.length > 0 ? [companyCategories[0]] : ['Food Safety & Hygiene'];
    return {
      id: `ASM-${Date.now()}`,
      code: generateAssessmentCode(defaultTitle),
      title: '',
      description: '',
      type: ASSESSMENT_TYPES.QUIZ,
      types: [ASSESSMENT_TYPES.QUIZ],
      contentFormats: [CONTENT_FORMATS.INTERACTIVE_BANK],
      contentFormat: CONTENT_FORMATS.INTERACTIVE_BANK,
      uploadedFileName: 'Ngan_Hang_150_Cau_Hoi_Chuan.xlsx',
      uploadedPoolSize: 150,
      randomizeFromPool: true,
      questionMatrix: {
        singleChoice: 2,
        multipleChoice: 1,
        trueFalse: 1,
        essay: 0,
        ratingScale: 0,
        matching: 0,
      },
      documentUrl: '',
      scormUrl: '',
      googleFormUrl: '',
      deliveryFormat: DELIVERY_FORMATS.STANDALONE,
      categories: initialCategories,
      category: initialCategories[0],
      courseIds: [],
      courseId: '',
      courseTitle: '',
      status: 'PUBLISHED',
      timeLimitMinutes: 20,
      passingScorePercent: 80,
      maxAttempts: 3,
      questionsPerAttempt: 4,
      antiCheatSettings: {
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
      questionIds: questionBanks.slice(0, 4).map((q) => q.id),
      assignments: [
        {
          assignmentType: 'ALL',
          targetId: 'ALL',
          targetName: 'Toàn Bộ Nhân Viên (Public / Bắt Buộc)',
          dueDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
          isMandatory: true,
        },
      ],
    };
  });

  // State search & filters inside modal
  const [courseSearch, setCourseSearch] = useState('');

  // State multi-select phân bổ đối tượng
  const [selectedAssignmentType, setSelectedAssignmentType] = useState('ALL');
  const [selectedTargetIds, setSelectedTargetIds] = useState([]);
  const [targetSearchQuery, setTargetSearchQuery] = useState('');
  const [targetDueDate, setTargetDueDate] = useState(new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10));
  const [targetMandatory, setTargetMandatory] = useState(true);

  if (!isOpen) return null;

  function patchForm(patch) {
    setFormData((prev) => ({ ...prev, ...patch }));
  }

  function handleTitleChange(newTitle) {
    const patch = { title: newTitle };
    if (!isEditing) {
      patch.code = generateAssessmentCode(newTitle);
    }
    patchForm(patch);
  }

  function regenerateCode() {
    patchForm({ code: generateAssessmentCode(formData.title || 'Assessment') });
  }

  function patchAntiCheat(patch) {
    setFormData((prev) => ({
      ...prev,
      antiCheatSettings: { ...prev.antiCheatSettings, ...patch },
    }));
  }

  function patchMatrix(key, count) {
    setFormData((prev) => {
      const nextMatrix = { ...prev.questionMatrix, [key]: Math.max(0, Number(count) || 0) };
      const totalQuestions = Object.values(nextMatrix).reduce((sum, n) => sum + n, 0);
      return {
        ...prev,
        questionMatrix: nextMatrix,
        questionsPerAttempt: totalQuestions > 0 ? totalQuestions : prev.questionsPerAttempt,
      };
    });
  }

  function toggleType(typeKey) {
    setFormData((prev) => {
      const current = prev.types || [prev.type || ASSESSMENT_TYPES.QUIZ];
      let next;
      if (current.includes(typeKey)) {
        next = current.filter((t) => t !== typeKey);
        if (next.length === 0) next = [typeKey];
      } else {
        next = [...current, typeKey];
      }
      return {
        ...prev,
        types: next,
        type: next[0],
      };
    });
  }

  function toggleContentFormat(fmtKey) {
    setFormData((prev) => {
      const current = prev.contentFormats && prev.contentFormats.length > 0
        ? prev.contentFormats
        : (prev.contentFormat ? [prev.contentFormat] : [CONTENT_FORMATS.INTERACTIVE_BANK]);
      let next;
      if (current.includes(fmtKey)) {
        next = current.filter((f) => f !== fmtKey);
        if (next.length === 0) next = [fmtKey]; // Không cho bỏ chọn hết, giữ tối thiểu 1 định dạng
      } else {
        next = [...current, fmtKey];
      }
      return {
        ...prev,
        contentFormats: next,
        contentFormat: next[0],
      };
    });
  }

  function toggleCategory(cat) {
    setFormData((prev) => {
      const current = prev.categories || [prev.category || companyCategories[0]];
      let next;
      if (current.includes(cat)) {
        next = current.filter((c) => c !== cat);
        if (next.length === 0) next = [companyCategories[0]];
      } else {
        next = [...current, cat];
      }
      return {
        ...prev,
        categories: next,
        category: next[0],
      };
    });
  }

  function selectAllCategories() {
    setFormData((prev) => ({
      ...prev,
      categories: [...companyCategories],
      category: companyCategories[0],
    }));
  }

  function clearAllCategories() {
    setFormData((prev) => ({
      ...prev,
      categories: [companyCategories[0]],
      category: companyCategories[0],
    }));
  }

  // Lọc danh sách Course theo đúng các Category đã được tích chọn!
  const filteredAvailableCourses = useMemo(() => {
    const selCats = formData.categories || (formData.category ? [formData.category] : []);
    return (courses || []).filter((c) => {
      const matchCat = selCats.length === 0 || selCats.includes(c.category) || (c.categories && c.categories.some((cat) => selCats.includes(cat)));
      if (!matchCat) return false;

      if (!courseSearch.trim()) return true;
      const q = courseSearch.toLowerCase();
      return (
        (c.title && c.title.toLowerCase().includes(q)) ||
        (c.code && c.code.toLowerCase().includes(q))
      );
    });
  }, [courses, formData.categories, formData.category, courseSearch]);

  function toggleCourse(courseId) {
    setFormData((prev) => {
      const current = prev.courseIds || (prev.courseId ? [prev.courseId] : []);
      let next;
      if (current.includes(courseId)) {
        next = current.filter((id) => id !== courseId);
      } else {
        next = [...current, courseId];
      }
      const firstCourse = courses.find((c) => c.id === next[0]);
      return {
        ...prev,
        courseIds: next,
        courseId: next[0] || '',
        courseTitle: firstCourse ? firstCourse.title : '',
      };
    });
  }

  function selectAllFilteredCourses() {
    const ids = filteredAvailableCourses.map((c) => c.id);
    setFormData((prev) => {
      const combined = Array.from(new Set([...(prev.courseIds || []), ...ids]));
      const firstCourse = courses.find((c) => c.id === combined[0]);
      return {
        ...prev,
        courseIds: combined,
        courseId: combined[0] || '',
        courseTitle: firstCourse ? firstCourse.title : '',
      };
    });
  }

  function deselectAllCourses() {
    setFormData((prev) => ({
      ...prev,
      courseIds: [],
      courseId: '',
      courseTitle: '',
    }));
  }

  function handleFileUpload(e) {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const randomPool = Math.floor(Math.random() * 800) + 200; // Mô phỏng 200-1000 câu hỏi
      patchForm({
        uploadedFileName: file.name,
        uploadedPoolSize: randomPool,
      });
      alert(`Đã tải lên ngân hàng "${file.name}" thành công! Nhận diện ${randomPool} câu hỏi trong file.`);
    }
  }

  // Options đối tượng theo loại đang chọn (BU, Division, Dept, Level, Store, User...)
  const currentTargetOptions = useMemo(() => {
    if (selectedAssignmentType === 'ALL') return [];
    return targetOptionsFor(selectedAssignmentType) || [];
  }, [selectedAssignmentType]);

  const filteredTargetOptions = useMemo(() => {
    if (!targetSearchQuery.trim()) return currentTargetOptions;
    const q = targetSearchQuery.toLowerCase();
    return currentTargetOptions.filter((o) => (o.label || '').toLowerCase().includes(q) || String(o.id || '').toLowerCase().includes(q));
  }, [currentTargetOptions, targetSearchQuery]);

  function toggleTargetId(id) {
    setSelectedTargetIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((x) => x !== id);
      }
      return [...prev, id];
    });
  }

  function selectAllFilteredTargets() {
    const ids = filteredTargetOptions.map((o) => o.id);
    setSelectedTargetIds((prev) => Array.from(new Set([...prev, ...ids])));
  }

  function deselectAllTargets() {
    setSelectedTargetIds([]);
  }

  function handleAddAssignment() {
    if (selectedAssignmentType === 'ALL') {
      const newAsg = {
        assignmentType: 'ALL',
        targetId: 'ALL',
        targetName: 'Toàn Bộ Nhân Viên (Public / Bắt Buộc)',
        dueDate: targetDueDate,
        isMandatory: targetMandatory,
      };
      setFormData((prev) => {
        const current = prev.assignments || [];
        const filtered = current.filter((x) => x.assignmentType !== 'ALL');
        return { ...prev, assignments: [newAsg, ...filtered] };
      });
      return;
    }

    if (selectedTargetIds.length === 0) {
      alert(`Vui lòng tick chọn ít nhất một ${assignmentTypeLabel(selectedAssignmentType)}`);
      return;
    }

    const newItems = selectedTargetIds.map((tid) => {
      const matched = currentTargetOptions.find((o) => String(o.id) === String(tid));
      return {
        assignmentType: selectedAssignmentType,
        targetId: tid,
        targetName: matched ? matched.label : `${selectedAssignmentType}: ${tid}`,
        dueDate: targetDueDate,
        isMandatory: targetMandatory,
      };
    });

    setFormData((prev) => {
      const current = prev.assignments || [];
      const map = new Map();
      current.forEach((item) => map.set(`${item.assignmentType}-${item.targetId}`, item));
      newItems.forEach((item) => map.set(`${item.assignmentType}-${item.targetId}`, item));
      return { ...prev, assignments: Array.from(map.values()) };
    });

    setSelectedTargetIds([]);
    setTargetSearchQuery('');
  }

  function handleRemoveAssignment(idx) {
    setFormData((prev) => {
      const next = [...prev.assignments];
      next.splice(idx, 1);
      return { ...prev, assignments: next };
    });
  }

  function handleRemoveAllAssignments() {
    setFormData((prev) => ({ ...prev, assignments: [] }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!formData.title.trim()) {
      alert('Vui lòng nhập Tiêu đề bài Assessment');
      return;
    }

    const activeFormats = formData.contentFormats && formData.contentFormats.length > 0
      ? formData.contentFormats
      : (formData.contentFormat ? [formData.contentFormat] : [CONTENT_FORMATS.INTERACTIVE_BANK]);

    // Xác định questionTypesList dựa trên các hình thức được chọn & ma trận câu hỏi
    const qTypes = [];
    const matrix = formData.questionMatrix || {};
    if (activeFormats.includes(CONTENT_FORMATS.INTERACTIVE_BANK)) {
      if (matrix.singleChoice > 0) qTypes.push(`${matrix.singleChoice} Trắc nghiệm đơn`);
      if (matrix.multipleChoice > 0) qTypes.push(`${matrix.multipleChoice} Nhiều đáp án`);
      if (matrix.trueFalse > 0) qTypes.push(`${matrix.trueFalse} Đúng/Sai`);
      if (matrix.essay > 0) qTypes.push(`${matrix.essay} Tự luận`);
      if (matrix.ratingScale > 0) qTypes.push(`${matrix.ratingScale} CSAT / Likert`);
      if (matrix.matching > 0) qTypes.push(`${matrix.matching} Ghép nối`);
      if (qTypes.length === 0) qTypes.push(`${formData.questionsPerAttempt || 4} câu ngẫu nhiên từ file`);
    }
    if (activeFormats.includes(CONTENT_FORMATS.UPLOAD_DOC)) {
      qTypes.push('File đề bài tự luận (PDF / Docx)');
    }
    if (activeFormats.includes(CONTENT_FORMATS.SCORM_PACKAGE)) {
      qTypes.push('Gói bài thi tương tác SCORM');
    }
    if (activeFormats.includes(CONTENT_FORMATS.GOOGLE_FORM)) {
      qTypes.push('Biểu mẫu khảo sát Google Form');
    }

    onSave({
      ...formData,
      contentFormats: activeFormats,
      contentFormat: activeFormats[0],
      questionTypesList: qTypes,
      questionsPerAttempt: Number(formData.questionsPerAttempt) || 4,
      questionIds: formData.questionIds && formData.questionIds.length > 0 ? formData.questionIds : questionBanks.slice(0, 4).map((q) => q.id),
    });
  }

  const activeFormats = formData.contentFormats && formData.contentFormats.length > 0
    ? formData.contentFormats
    : (formData.contentFormat ? [formData.contentFormat] : [CONTENT_FORMATS.INTERACTIVE_BANK]);

  const totalMatrixCount = Object.values(formData.questionMatrix || {}).reduce((s, n) => s + (Number(n) || 0), 0);

  return (
    <Modal
      title={isEditing ? `Chỉnh Sửa Assessment: ${formData.title || formData.code}` : 'Tạo Assessment Mới (Quiz / Assignment / Survey)'}
      isOpen={isOpen}
      onClose={onClose}
      maxWidth={880}
    >
      <form onSubmit={handleSubmit}>
        {/* Sub Navigation Tabs */}
        <div style={{ display: 'flex', gap: 6, borderBottom: '1px solid var(--line)', paddingBottom: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          <Button
            type="button"
            size="sm"
            variant={activeTab === 'GENERAL' ? 'primary' : 'ghost'}
            icon="ti-settings"
            onClick={() => setActiveTab('GENERAL')}
          >
            1. Cấu Hình Chung
          </Button>
          <Button
            type="button"
            size="sm"
            variant={activeTab === 'CONTENT' ? 'primary' : 'ghost'}
            icon="ti-file-upload"
            onClick={() => setActiveTab('CONTENT')}
          >
            2. Định Dạng &amp; Đề Thi ({activeFormats.length} hình thức)
          </Button>
          <Button
            type="button"
            size="sm"
            variant={activeTab === 'ANTI_CHEAT' ? 'primary' : 'ghost'}
            icon="ti-shield-lock"
            onClick={() => setActiveTab('ANTI_CHEAT')}
          >
            3. Chống Gian Lận (Anti-Cheat)
          </Button>
          {formData.deliveryFormat === DELIVERY_FORMATS.STANDALONE && (
            <Button
              type="button"
              size="sm"
              variant={activeTab === 'ASSIGNMENTS' ? 'primary' : 'ghost'}
              icon="ti-users"
              onClick={() => setActiveTab('ASSIGNMENTS')}
            >
              4. Phân Bổ Đối Tượng ({formData.assignments?.length || 0})
            </Button>
          )}
        </div>

        {/* TAB 1: CẤU HÌNH CHUNG */}
        {activeTab === 'GENERAL' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Row: Title & Code (auto-generated) */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr', gap: 12 }}>
              <div className="field-group">
                <label className="field-label">Tiêu Đề Bài Assessment <span style={{ color: 'var(--rust)' }}>*</span></label>
                <input
                  type="text"
                  className="field-input"
                  placeholder="Ví dụ: Đánh Giá Năng Lực Chuẩn Vệ Sinh An Toàn Thực Phẩm HACCP 2026"
                  value={formData.title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  required
                />
              </div>
              <div className="field-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <label className="field-label" style={{ margin: 0 }}>Mã Định Danh (Code)</label>
                  <button
                    type="button"
                    onClick={regenerateCode}
                    style={{ background: 'none', border: 'none', color: 'var(--rail)', fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3 }}
                    title="Tự động sinh mã mới từ chữ cái đầu của tiêu đề"
                  >
                    <i className="ti ti-refresh" /> Tự sinh mã
                  </button>
                </div>
                <input
                  type="text"
                  className="field-input"
                  value={formData.code}
                  onChange={(e) => patchForm({ code: e.target.value })}
                />
              </div>
            </div>

            <div className="field-group">
              <label className="field-label">Mô Tả &amp; Mục Đích Khảo Sát / Đánh Giá</label>
              <textarea
                className="field-input"
                rows={2}
                placeholder="Tóm tắt yêu cầu, đối tượng hướng tới và chuẩn đầu ra năng lực..."
                value={formData.description}
                onChange={(e) => patchForm({ description: e.target.value })}
              />
            </div>

            {/* Loại hình Assessment (Hỗ trợ Multi-select nhiều loại cùng lúc) */}
            <div className="card card-pad" style={{ background: 'var(--paper-sunken)' }}>
              <div style={{ fontWeight: 700, fontSize: 12.5, marginBottom: 8, color: 'var(--ink)' }}>
                Loại Hình Assessment (Có thể chọn nhiều loại kết hợp):
              </div>
              <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={(formData.types || []).includes(ASSESSMENT_TYPES.QUIZ)}
                    onChange={() => toggleType(ASSESSMENT_TYPES.QUIZ)}
                  />
                  <span>📝 Trắc Nghiệm / Quiz</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={(formData.types || []).includes(ASSESSMENT_TYPES.ASSIGNMENT)}
                    onChange={() => toggleType(ASSESSMENT_TYPES.ASSIGNMENT)}
                  />
                  <span>📂 Bài Tập / Assignment Tự Luận</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={(formData.types || []).includes(ASSESSMENT_TYPES.SURVEY)}
                    onChange={() => toggleType(ASSESSMENT_TYPES.SURVEY)}
                  />
                  <span>📊 Khảo Sát / Survey / CSAT</span>
                </label>
              </div>
            </div>

            {/* Hình Thức Tổ Chức: Standalone vs Course-linked */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="field-group">
                <label className="field-label">Hình Thức Tổ Chức</label>
                {formData.isCourseExclusive ? (
                  <div style={{ background: 'var(--paper-sunken)', padding: '8px 10px', borderRadius: 6, fontSize: 12 }}>
                    <i className="ti ti-link" style={{ color: 'var(--rail)', marginRight: 5 }} />
                    <strong>Gắn Liền Khóa Học:</strong> [{formData.courseId}] {formData.courseTitle}
                    <div style={{ fontSize: 11, color: 'var(--ink-faint)', marginTop: 2 }}>
                      (Assessment được tạo từ khóa học này và gắn liền cố định)
                    </div>
                  </div>
                ) : (
                  <select
                    className="field-input"
                    value={formData.deliveryFormat}
                    onChange={(e) => {
                      const fmt = e.target.value;
                      patchForm({
                        deliveryFormat: fmt,
                        courseId: fmt === DELIVERY_FORMATS.COURSE_LINKED ? (courses[0]?.id || '') : '',
                        courseTitle: fmt === DELIVERY_FORMATS.COURSE_LINKED ? (courses[0]?.title || '') : '',
                      });
                    }}
                  >
                    <option value={DELIVERY_FORMATS.STANDALONE}>🎯 Độc Lập (Standalone Assessment)</option>
                    <option value={DELIVERY_FORMATS.COURSE_LINKED}>🔗 Gắn Khóa Học (Course-linked)</option>
                  </select>
                )}
              </div>

              <div className="field-group">
                <label className="field-label">Trạng Thái Phát Hành</label>
                <select
                  className="field-input"
                  value={formData.status}
                  onChange={(e) => patchForm({ status: e.target.value })}
                >
                  <option value="PUBLISHED">🟢 Published (Phát hành)</option>
                  <option value="DRAFT">📝 Draft (Nháp)</option>
                </select>
              </div>
            </div>

            {/* Lĩnh Vực (Categories) với Checkbox chọn nhiều & Chọn tất cả */}
            <div className="card card-pad" style={{ background: 'var(--paper-sunken)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontWeight: 700, fontSize: 12.5, color: 'var(--ink)' }}>
                  Lĩnh Vực Chuyên Môn (Category) — Đã chọn {(formData.categories || []).length}:
                </span>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    type="button"
                    onClick={selectAllCategories}
                    style={{ background: 'none', border: 'none', color: 'var(--rail)', fontSize: 11.5, cursor: 'pointer', fontWeight: 600 }}
                  >
                    Chọn Tất Cả
                  </button>
                  <span>&middot;</span>
                  <button
                    type="button"
                    onClick={clearAllCategories}
                    style={{ background: 'none', border: 'none', color: 'var(--ink-faint)', fontSize: 11.5, cursor: 'pointer' }}
                  >
                    Đặt lại
                  </button>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 8, maxHeight: 130, overflowY: 'auto' }}>
                {companyCategories.map((cat) => {
                  const isChecked = (formData.categories || []).includes(cat);
                  return (
                    <label
                      key={cat}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        fontSize: 12,
                        padding: '4px 8px',
                        borderRadius: 4,
                        background: isChecked ? 'var(--paper-raised)' : 'transparent',
                        cursor: 'pointer',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleCategory(cat)}
                      />
                      <span style={{ color: isChecked ? 'var(--ink)' : 'var(--ink-soft)' }}>{cat}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Khi chọn Course-linked: Lọc khóa học theo đúng Category & cho phép chọn nhiều / tick box */}
            {formData.deliveryFormat === DELIVERY_FORMATS.COURSE_LINKED && !formData.isCourseExclusive && (
              <div className="card card-pad" style={{ background: 'var(--paper-raised)', border: '1px solid var(--line)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
                  <div>
                    <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--rail)' }}>
                      <i className="ti ti-link" style={{ marginRight: 4 }} />
                      Khóa Học Online E-Learning Liên Kết (Khớp theo Lĩnh Vực đã chọn):
                    </span>
                    <div style={{ fontSize: 11.5, color: 'var(--ink-soft)' }}>
                      Tìm thấy <strong>{filteredAvailableCourses.length}</strong> khóa học phù hợp &middot; Đã chọn: <strong>{(formData.courseIds || []).length}</strong>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <input
                      type="text"
                      className="field-input"
                      style={{ height: 28, fontSize: 11.5, width: 160 }}
                      placeholder="Tìm khóa học..."
                      value={courseSearch}
                      onChange={(e) => setCourseSearch(e.target.value)}
                    />
                    <Button type="button" size="sm" variant="ghost" onClick={selectAllFilteredCourses}>
                      Chọn Tất Cả Khóa
                    </Button>
                    <Button type="button" size="sm" variant="ghost" onClick={deselectAllCourses}>
                      Bỏ Chọn
                    </Button>
                  </div>
                </div>

                <div style={{ maxHeight: 200, overflowY: 'auto', border: '1px solid var(--line)', borderRadius: 6, padding: 6, background: 'var(--paper-sunken)' }}>
                  {filteredAvailableCourses.map((c) => {
                    const isSelected = (formData.courseIds || []).includes(c.id);
                    return (
                      <div
                        key={c.id}
                        onClick={() => toggleCourse(c.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          padding: '6px 8px',
                          borderRadius: 4,
                          marginBottom: 3,
                          background: isSelected ? 'var(--blue-soft, rgba(37,99,235,0.08))' : 'transparent',
                          border: isSelected ? '1px solid var(--blue, #3b82f6)' : '1px solid transparent',
                          cursor: 'pointer',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          style={{ cursor: 'pointer' }}
                        />
                        <div style={{ flex: 1, minWidth: 0, fontSize: 12 }}>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-faint)', marginRight: 6 }}>[{c.code}]</span>
                          <strong style={{ color: 'var(--ink)' }}>{c.title}</strong>
                          <span style={{ fontSize: 11, color: 'var(--ink-soft)', marginLeft: 8 }}>({c.category || 'General'})</span>
                        </div>
                      </div>
                    );
                  })}
                  {filteredAvailableCourses.length === 0 && (
                    <div style={{ padding: '16px', textAlign: 'center', fontSize: 12, color: 'var(--ink-faint)' }}>
                      Không có khóa học nào thuộc các lĩnh vực đã chọn. Vui lòng tick chọn thêm lĩnh vực ở trên.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Metrics */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, borderTop: '1px solid var(--line)', paddingTop: 14 }}>
              <div className="field-group">
                <label className="field-label">Thời Gian Làm Bài (Phút)</label>
                <input
                  type="number"
                  min="1"
                  max="180"
                  className="field-input"
                  value={formData.timeLimitMinutes}
                  onChange={(e) => patchForm({ timeLimitMinutes: Number(e.target.value) })}
                />
              </div>

              <div className="field-group">
                <label className="field-label">Điểm Đạt (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  className="field-input"
                  value={formData.passingScorePercent}
                  onChange={(e) => patchForm({ passingScorePercent: Number(e.target.value) })}
                  disabled={formData.type === ASSESSMENT_TYPES.SURVEY}
                />
              </div>

              <div className="field-group">
                <label className="field-label">Số Lần Thi Tối Đa</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  className="field-input"
                  value={formData.maxAttempts}
                  onChange={(e) => patchForm({ maxAttempts: Number(e.target.value) })}
                />
              </div>

              <div className="field-group">
                <label className="field-label">Số Câu Bốc Ngẫu Nhiên</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  className="field-input"
                  value={formData.questionsPerAttempt}
                  onChange={(e) => patchForm({ questionsPerAttempt: Number(e.target.value) })}
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: ĐỊNH DẠNG & ĐỀ THI (HỖ TRỢ CHỌN NHIỀU ĐỊNH DẠNG ĐỒNG THỜI) */}
        {activeTab === 'CONTENT' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="card card-pad" style={{ background: 'var(--paper-sunken)' }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--rail)', marginBottom: 6 }}>
                Chọn Các Hình Thức Đề Bài / Nguồn Nội Dung (Có thể tick chọn nhiều hình thức cùng lúc):
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
                <label
                  className="card card-pad"
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 10,
                    cursor: 'pointer',
                    background: activeFormats.includes(CONTENT_FORMATS.INTERACTIVE_BANK) ? 'var(--paper-raised)' : 'transparent',
                    borderColor: activeFormats.includes(CONTENT_FORMATS.INTERACTIVE_BANK) ? 'var(--sage)' : 'var(--line)',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={activeFormats.includes(CONTENT_FORMATS.INTERACTIVE_BANK)}
                    onChange={() => toggleContentFormat(CONTENT_FORMATS.INTERACTIVE_BANK)}
                  />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>💡 Ngân Hàng Câu Hỏi (Upload File &amp; Bốc Đề Ngẫu Nhiên)</div>
                    <div style={{ fontSize: 11.5, color: 'var(--ink-soft)' }}>Tải file ngân hàng 100 - 1000 câu hỏi (.xlsx, .csv) và cấu hình ma trận rút câu ngẫu nhiên.</div>
                  </div>
                </label>

                <label
                  className="card card-pad"
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 10,
                    cursor: 'pointer',
                    background: activeFormats.includes(CONTENT_FORMATS.UPLOAD_DOC) ? 'var(--paper-raised)' : 'transparent',
                    borderColor: activeFormats.includes(CONTENT_FORMATS.UPLOAD_DOC) ? 'var(--sage)' : 'var(--line)',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={activeFormats.includes(CONTENT_FORMATS.UPLOAD_DOC)}
                    onChange={() => toggleContentFormat(CONTENT_FORMATS.UPLOAD_DOC)}
                  />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>📄 Đề Bài Tự Luận (File PDF / Word)</div>
                    <div style={{ fontSize: 11.5, color: 'var(--ink-soft)' }}>Tải lên file đề bài hoặc case study tự luận để học viên nộp bài / nộp file.</div>
                  </div>
                </label>

                <label
                  className="card card-pad"
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 10,
                    cursor: 'pointer',
                    background: activeFormats.includes(CONTENT_FORMATS.SCORM_PACKAGE) ? 'var(--paper-raised)' : 'transparent',
                    borderColor: activeFormats.includes(CONTENT_FORMATS.SCORM_PACKAGE) ? 'var(--sage)' : 'var(--line)',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={activeFormats.includes(CONTENT_FORMATS.SCORM_PACKAGE)}
                    onChange={() => toggleContentFormat(CONTENT_FORMATS.SCORM_PACKAGE)}
                  />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>📦 Gói Bài Thi Chuẩn SCORM (.zip)</div>
                    <div style={{ fontSize: 11.5, color: 'var(--ink-soft)' }}>Upload gói kiểm tra tương tác SCORM 1.2 / 2004 (Articulate, Captivate, iSpring).</div>
                  </div>
                </label>

                <label
                  className="card card-pad"
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 10,
                    cursor: 'pointer',
                    background: activeFormats.includes(CONTENT_FORMATS.GOOGLE_FORM) ? 'var(--paper-raised)' : 'transparent',
                    borderColor: activeFormats.includes(CONTENT_FORMATS.GOOGLE_FORM) ? 'var(--sage)' : 'var(--line)',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={activeFormats.includes(CONTENT_FORMATS.GOOGLE_FORM)}
                    onChange={() => toggleContentFormat(CONTENT_FORMATS.GOOGLE_FORM)}
                  />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>🔗 Khảo Sát / Google Form / Microsoft Forms</div>
                    <div style={{ fontSize: 11.5, color: 'var(--ink-soft)' }}>Nhúng trực tiếp liên kết khảo sát hoặc bài đánh giá qua form online bên ngoài.</div>
                  </div>
                </label>
              </div>
            </div>

            {/* 1. KHI CHỌN NGÂN HÀNG CÂU HỎI: UPLOAD FILE & CẤU HÌNH BỐC NGẪU NHIÊN */}
            {activeFormats.includes(CONTENT_FORMATS.INTERACTIVE_BANK) && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* Upload File Ngân Hàng Câu Hỏi */}
                <div className="card card-pad" style={{ background: 'var(--paper-raised)', border: '1px solid var(--line)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--rail)' }}>
                      <i className="ti ti-database-import" style={{ marginRight: 5 }} />
                      File Ngân Hàng Câu Hỏi (Upload file 100 - 1.000 câu hỏi):
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <a
                        href="#download-template"
                        onClick={(e) => {
                          e.preventDefault();
                          alert('Đang tải file mẫu Template_Question_Bank_MMVN.xlsx');
                        }}
                        style={{ fontSize: 11.5, color: 'var(--rail)', textDecoration: 'underline', cursor: 'pointer' }}
                      >
                        <i className="ti ti-download" /> Tải file Excel mẫu
                      </a>
                    </div>
                  </div>

                  <div style={{ border: '2px dashed var(--line)', padding: '16px', borderRadius: 8, textAlign: 'center', background: 'var(--paper-sunken)', marginBottom: 10 }}>
                    <i className="ti ti-file-spreadsheet" style={{ fontSize: 28, color: 'var(--sage)', display: 'block', marginBottom: 4 }} />
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink)' }}>
                      Đang sử dụng: <strong style={{ color: 'var(--rail)' }}>{formData.uploadedFileName}</strong> ({formData.uploadedPoolSize} câu hỏi có sẵn)
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--ink-soft)', marginTop: 2 }}>
                      Hỗ trợ file .xlsx, .csv, .docx, .json. Hệ thống sẽ tự động bốc ngẫu nhiên đề thi từ file này.
                    </div>
                    <label className="btn btn-sm btn-primary" style={{ marginTop: 8, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <i className="ti ti-upload" /> Tải Lên File Ngân Hàng Mới
                      <input type="file" accept=".xlsx,.csv,.docx,.json" onChange={handleFileUpload} style={{ display: 'none' }} />
                    </label>
                  </div>
                </div>

                {/* Cấu Hình Ma Trận Bốc Đề Ngẫu Nhiên */}
                <div className="card card-pad" style={{ background: 'var(--paper-raised)', border: '1px solid var(--line)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--ink)' }}>
                        <i className="ti ti-adjustments-horizontal" style={{ marginRight: 5, color: 'var(--rail)' }} />
                        Cấu Hình Bốc Ngẫu Nhiên Số Lượng &amp; Loại Câu Hỏi Cho Mỗi Đề Thi:
                      </div>
                      <div style={{ fontSize: 11.5, color: 'var(--ink-soft)' }}>
                        Mỗi học viên khi vào thi sẽ được hệ thống rút ngẫu nhiên đúng số lượng từng loại theo cấu hình dưới đây:
                      </div>
                    </div>
                    <Badge tone="sage" size="sm">
                      Tổng: {totalMatrixCount || formData.questionsPerAttempt} câu / đề thi
                    </Badge>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                    <div style={{ background: 'var(--paper-sunken)', padding: 10, borderRadius: 6, border: '1px solid var(--line)' }}>
                      <label className="field-label" style={{ fontSize: 11.5, margin: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>🔘 Trắc Nghiệm Đơn (Single)</span>
                        <input
                          type="number"
                          min="0"
                          max="50"
                          style={{ width: 60, height: 28, fontSize: 12, padding: '2px 6px' }}
                          className="field-input"
                          value={formData.questionMatrix?.singleChoice ?? 2}
                          onChange={(e) => patchMatrix('singleChoice', e.target.value)}
                        />
                      </label>
                    </div>

                    <div style={{ background: 'var(--paper-sunken)', padding: 10, borderRadius: 6, border: '1px solid var(--line)' }}>
                      <label className="field-label" style={{ fontSize: 11.5, margin: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>☑️ Nhiều Đáp Án (Multi)</span>
                        <input
                          type="number"
                          min="0"
                          max="50"
                          style={{ width: 60, height: 28, fontSize: 12, padding: '2px 6px' }}
                          className="field-input"
                          value={formData.questionMatrix?.multipleChoice ?? 1}
                          onChange={(e) => patchMatrix('multipleChoice', e.target.value)}
                        />
                      </label>
                    </div>

                    <div style={{ background: 'var(--paper-sunken)', padding: 10, borderRadius: 6, border: '1px solid var(--line)' }}>
                      <label className="field-label" style={{ fontSize: 11.5, margin: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>⚖️ Đúng / Sai (True/False)</span>
                        <input
                          type="number"
                          min="0"
                          max="50"
                          style={{ width: 60, height: 28, fontSize: 12, padding: '2px 6px' }}
                          className="field-input"
                          value={formData.questionMatrix?.trueFalse ?? 1}
                          onChange={(e) => patchMatrix('trueFalse', e.target.value)}
                        />
                      </label>
                    </div>

                    <div style={{ background: 'var(--paper-sunken)', padding: 10, borderRadius: 6, border: '1px solid var(--line)' }}>
                      <label className="field-label" style={{ fontSize: 11.5, margin: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>✍️ Tự Luận (Essay)</span>
                        <input
                          type="number"
                          min="0"
                          max="20"
                          style={{ width: 60, height: 28, fontSize: 12, padding: '2px 6px' }}
                          className="field-input"
                          value={formData.questionMatrix?.essay ?? 0}
                          onChange={(e) => patchMatrix('essay', e.target.value)}
                        />
                      </label>
                    </div>

                    <div style={{ background: 'var(--paper-sunken)', padding: 10, borderRadius: 6, border: '1px solid var(--line)' }}>
                      <label className="field-label" style={{ fontSize: 11.5, margin: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>📊 Khảo Sát CSAT (Likert)</span>
                        <input
                          type="number"
                          min="0"
                          max="30"
                          style={{ width: 60, height: 28, fontSize: 12, padding: '2px 6px' }}
                          className="field-input"
                          value={formData.questionMatrix?.ratingScale ?? 0}
                          onChange={(e) => patchMatrix('ratingScale', e.target.value)}
                        />
                      </label>
                    </div>

                    <div style={{ background: 'var(--paper-sunken)', padding: 10, borderRadius: 6, border: '1px solid var(--line)' }}>
                      <label className="field-label" style={{ fontSize: 11.5, margin: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>🧩 Ghép Đôi (Matching)</span>
                        <input
                          type="number"
                          min="0"
                          max="20"
                          style={{ width: 60, height: 28, fontSize: 12, padding: '2px 6px' }}
                          className="field-input"
                          value={formData.questionMatrix?.matching ?? 0}
                          onChange={(e) => patchMatrix('matching', e.target.value)}
                        />
                      </label>
                    </div>
                  </div>

                  <div style={{ marginTop: 12, padding: '8px 12px', background: 'var(--paper-sunken)', borderRadius: 6, fontSize: 11.5, color: 'var(--ink-soft)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <i className="ti ti-dice" style={{ color: 'var(--rail)', fontSize: 16 }} />
                    <span>Hệ thống sẽ <strong>tự động xáo trộn và bốc ngẫu nhiên đề thi</strong> theo đúng tỷ lệ số câu trên mỗi khi học viên bấm Bắt đầu làm bài.</span>
                  </div>
                </div>
              </div>
            )}

            {/* 2. KHI CHỌN UPLOAD FILE ĐỀ TỰ LUẬN */}
            {activeFormats.includes(CONTENT_FORMATS.UPLOAD_DOC) && (
              <div className="card card-pad" style={{ background: 'var(--paper-raised)', border: '1px solid var(--line)' }}>
                <label className="field-label" style={{ fontWeight: 700, color: 'var(--rail)' }}>
                  <i className="ti ti-file-text" style={{ marginRight: 4 }} />
                  Tải Lên File Đề Bài Tự Luận / Case Study (PDF, DOCX)
                </label>
                <div style={{ border: '2px dashed var(--line)', padding: '20px', borderRadius: 8, textAlign: 'center', background: 'var(--paper-sunken)', marginBottom: 12 }}>
                  <i className="ti ti-upload" style={{ fontSize: 30, color: 'var(--rail)', display: 'block', marginBottom: 6 }} />
                  <div style={{ fontSize: 13, fontWeight: 600 }}>Kéo &amp; thả file đề bài tự luận vào đây hoặc chọn từ máy tính</div>
                  <div style={{ fontSize: 11.5, color: 'var(--ink-soft)', marginTop: 3 }}>Hỗ trợ PDF, Word (.docx) tối đa 50MB</div>
                  <input
                    type="file"
                    style={{ marginTop: 10 }}
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        patchForm({ documentUrl: `https://storage.mmvn.com/assessments/${e.target.files[0].name}` });
                      }
                    }}
                  />
                </div>
                <div className="field-group">
                  <label className="field-label">Hoặc Dán URL File Đề Bài Trực Tuyến</label>
                  <input
                    type="url"
                    className="field-input"
                    placeholder="https://storage.mmvn.com/assessments/De_Thi_Case_Study_SGM.pdf"
                    value={formData.documentUrl || ''}
                    onChange={(e) => patchForm({ documentUrl: e.target.value })}
                  />
                </div>
              </div>
            )}

            {/* 3. KHI CHỌN GÓI SCORM */}
            {activeFormats.includes(CONTENT_FORMATS.SCORM_PACKAGE) && (
              <div className="card card-pad" style={{ background: 'var(--paper-raised)', border: '1px solid var(--line)' }}>
                <label className="field-label" style={{ fontWeight: 700, color: 'var(--rail)' }}>
                  <i className="ti ti-package" style={{ marginRight: 4 }} />
                  Tải Lên Gói SCORM Bài Thi (.zip)
                </label>
                <div style={{ border: '2px dashed var(--line)', padding: '20px', borderRadius: 8, textAlign: 'center', background: 'var(--paper-sunken)', marginBottom: 12 }}>
                  <i className="ti ti-package" style={{ fontSize: 30, color: 'var(--rail)', display: 'block', marginBottom: 6 }} />
                  <div style={{ fontSize: 13, fontWeight: 600 }}>Tải lên file nén .zip chuẩn SCORM 1.2 / 2004</div>
                  <input
                    type="file"
                    accept=".zip"
                    style={{ marginTop: 10 }}
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        patchForm({ scormUrl: `https://storage.mmvn.com/scorm-assessments/${e.target.files[0].name}` });
                      }
                    }}
                  />
                </div>
                <div className="field-group">
                  <label className="field-label">Đường Dẫn SCORM Cloud / CDN</label>
                  <input
                    type="text"
                    className="field-input"
                    placeholder="https://storage.mmvn.com/scorm-assessments/haccp_exam.zip"
                    value={formData.scormUrl || ''}
                    onChange={(e) => patchForm({ scormUrl: e.target.value })}
                  />
                </div>
              </div>
            )}

            {/* 4. KHI CHỌN GOOGLE FORM */}
            {activeFormats.includes(CONTENT_FORMATS.GOOGLE_FORM) && (
              <div className="card card-pad" style={{ background: 'var(--paper-raised)', border: '1px solid var(--line)' }}>
                <div className="field-group">
                  <label className="field-label" style={{ fontWeight: 700, color: 'var(--rail)' }}>
                    <i className="ti ti-forms" style={{ marginRight: 4 }} />
                    Đường Dẫn Form Khảo Sát Trực Tuyến (Google Form / MS Forms / Kobo)
                  </label>
                  <input
                    type="url"
                    className="field-input"
                    placeholder="https://docs.google.com/forms/d/e/.../viewform"
                    value={formData.googleFormUrl || ''}
                    onChange={(e) => patchForm({ googleFormUrl: e.target.value })}
                  />
                </div>
                {formData.googleFormUrl && (
                  <div style={{ marginTop: 8, fontSize: 12 }}>
                    <a href={formData.googleFormUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--rail)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <i className="ti ti-external-link" /> Xem thử liên kết biểu mẫu
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: CHỐNG GIAN LẬN (ANTI-CHEAT) */}
        {activeTab === 'ANTI_CHEAT' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="card card-pad" style={{ background: 'var(--paper-sunken)', fontSize: 13 }}>
              <div style={{ fontWeight: 700, color: 'var(--rail)', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <i className="ti ti-shield-check" style={{ fontSize: 18 }} />
                Chính Sách Giám Sát &amp; Phòng Chống Gian Lận (Enterprise Proctoring)
              </div>
              <p style={{ margin: 0, color: 'var(--ink-soft)' }}>
                Kích hoạt các cơ chế kiểm soát phiên thi, phát hiện chuyển tab màn hình, watermark tên học viên và khóa clipboard sao chép.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
              <label className="card card-pad" style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  style={{ marginTop: 3 }}
                  checked={formData.antiCheatSettings.enforceFullscreen}
                  onChange={(e) => patchAntiCheat({ enforceFullscreen: e.target.checked })}
                />
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>Bắt Buộc Toàn Màn Hình (Fullscreen Mode)</div>
                  <div style={{ fontSize: 11.5, color: 'var(--ink-soft)' }}>Tự động khóa chế độ toàn màn hình khi bắt đầu làm bài.</div>
                </div>
              </label>

              <label className="card card-pad" style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  style={{ marginTop: 3 }}
                  checked={formData.antiCheatSettings.detectTabSwitch}
                  onChange={(e) => patchAntiCheat({ detectTabSwitch: e.target.checked })}
                />
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>Giám Sát &amp; Cảnh Báo Chuyển Tab</div>
                  <div style={{ fontSize: 11.5, color: 'var(--ink-soft)' }}>Cảnh báo khi người dùng rời màn hình thi hoặc mở tab khác.</div>
                </div>
              </label>

              <label className="card card-pad" style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  style={{ marginTop: 3 }}
                  checked={formData.antiCheatSettings.randomizeQuestions}
                  onChange={(e) => patchAntiCheat({ randomizeQuestions: e.target.checked })}
                />
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>Xáo Trộn Thứ Tự Câu Hỏi</div>
                  <div style={{ fontSize: 11.5, color: 'var(--ink-soft)' }}>Mỗi học viên nhận một thứ tự câu hỏi ngẫu nhiên.</div>
                </div>
              </label>

              <label className="card card-pad" style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  style={{ marginTop: 3 }}
                  checked={formData.antiCheatSettings.randomizeOptions}
                  onChange={(e) => patchAntiCheat({ randomizeOptions: e.target.checked })}
                />
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>Xáo Trộn Đáp Án (A, B, C, D)</div>
                  <div style={{ fontSize: 11.5, color: 'var(--ink-soft)' }}>Đổi ngẫu nhiên vị trí các lựa chọn trong câu trắc nghiệm.</div>
                </div>
              </label>

              <label className="card card-pad" style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  style={{ marginTop: 3 }}
                  checked={formData.antiCheatSettings.showWatermark}
                  onChange={(e) => patchAntiCheat({ showWatermark: e.target.checked })}
                />
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>Watermark Tên Nhân Viên &amp; Thời Gian</div>
                  <div style={{ fontSize: 11.5, color: 'var(--ink-soft)' }}>In mờ họ tên + Mã NV trên màn hình nhằm chống chụp ảnh lộ đề.</div>
                </div>
              </label>

              <label className="card card-pad" style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  style={{ marginTop: 3 }}
                  checked={formData.antiCheatSettings.preventCopyPaste}
                  onChange={(e) => patchAntiCheat({ preventCopyPaste: e.target.checked })}
                />
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>Chặn Copy / Paste Nội Dung</div>
                  <div style={{ fontSize: 11.5, color: 'var(--ink-soft)' }}>Khóa thao tác bôi đen sao chép câu hỏi và dán vào AI/Search.</div>
                </div>
              </label>
            </div>

            <div className="field-group" style={{ maxWidth: 300 }}>
              <label className="field-label">Số Lần Chuyển Tab Tối Đa Cho Phép</label>
              <input
                type="number"
                min="0"
                max="10"
                className="field-input"
                value={formData.antiCheatSettings.maxTabSwitches}
                onChange={(e) => patchAntiCheat({ maxTabSwitches: Number(e.target.value) })}
              />
              <span style={{ fontSize: 11, color: 'var(--ink-faint)' }}>Vượt quá số lần này hệ thống sẽ tự động thu bài.</span>
            </div>
          </div>
        )}

        {/* TAB 4: PHÂN BỔ ĐỐI TƯỢNG (HỖ TRỢ TICK CHỌN NHIỀU ĐỐI TƯỢNG CÙNG LÚC) */}
        {activeTab === 'ASSIGNMENTS' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="card card-pad" style={{ background: 'var(--paper-sunken)', border: '1px solid var(--line)' }}>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10, color: 'var(--rail)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <i className="ti ti-user-plus" style={{ marginRight: 5 }} />
                  Gán Đối Tượng Mới (Hỗ trợ tick chọn nhiều BU, Division, Phòng ban, Cấp bậc, Siêu thị hoặc Cá nhân):
                </div>
              </div>

              {/* Controls bar: Chọn Loại Đối Tượng & Hạn Chót */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: 10, marginBottom: 12 }}>
                <div>
                  <label className="field-label" style={{ fontSize: 11.5 }}>Loại Đối Tượng</label>
                  <select
                    className="field-input"
                    value={selectedAssignmentType}
                    onChange={(e) => {
                      setSelectedAssignmentType(e.target.value);
                      setSelectedTargetIds([]);
                      setTargetSearchQuery('');
                    }}
                  >
                    <option value="ALL">Toàn Doanh Nghiệp (Public)</option>
                    {ASSIGNMENT_TYPES.map((t) => (
                      <option key={t} value={t}>{assignmentTypeLabel(t)}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="field-label" style={{ fontSize: 11.5 }}>Hạn Chót (Due Date)</label>
                  <input
                    type="date"
                    className="field-input"
                    value={targetDueDate}
                    onChange={(e) => setTargetDueDate(e.target.value)}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', paddingTop: 18 }}>
                  <label style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={targetMandatory}
                      onChange={(e) => setTargetMandatory(e.target.checked)}
                    />
                    <span>Bắt buộc hoàn thành (Mandatory)</span>
                  </label>
                </div>
              </div>

              {/* Khi chọn Toàn bộ */}
              {selectedAssignmentType === 'ALL' ? (
                <div style={{ background: 'var(--paper-raised)', padding: 12, borderRadius: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <strong style={{ color: 'var(--ink)' }}>Toàn Doanh Nghiệp (Public)</strong>
                    <div style={{ fontSize: 11.5, color: 'var(--ink-soft)' }}>Gán bài assessment cho toàn bộ nhân sự trong hệ thống.</div>
                  </div>
                  <Button type="button" variant="primary" icon="ti-plus" onClick={handleAddAssignment}>
                    Thêm Gán Toàn Bộ Nhân Viên
                  </Button>
                </div>
              ) : (
                /* Khi chọn loại cụ thể (USER, DEPT, DIV, BU, LEVEL...): Checklist chọn nhiều có tìm kiếm */
                <div style={{ background: 'var(--paper-raised)', padding: 10, borderRadius: 6, border: '1px solid var(--line)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)' }}>
                        Danh Sách {assignmentTypeLabel(selectedAssignmentType)}:
                      </span>
                      <Badge tone="sage" size="sm">
                        Đã chọn {selectedTargetIds.length} / {currentTargetOptions.length}
                      </Badge>
                    </div>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <input
                        type="text"
                        className="field-input"
                        style={{ height: 28, fontSize: 11.5, width: 170 }}
                        placeholder={`Tìm ${assignmentTypeLabel(selectedAssignmentType)}...`}
                        value={targetSearchQuery}
                        onChange={(e) => setTargetSearchQuery(e.target.value)}
                      />
                      <Button type="button" size="sm" variant="ghost" onClick={selectAllFilteredTargets}>
                        Chọn Tất Cả ({filteredTargetOptions.length})
                      </Button>
                      <Button type="button" size="sm" variant="ghost" onClick={deselectAllTargets}>
                        Bỏ Chọn
                      </Button>
                    </div>
                  </div>

                  {/* Scrollable list with checkboxes */}
                  <div style={{ maxHeight: 180, overflowY: 'auto', border: '1px solid var(--line)', borderRadius: 6, padding: 6, background: 'var(--paper-sunken)' }}>
                    {filteredTargetOptions.map((opt) => {
                      const isChecked = selectedTargetIds.includes(opt.id);
                      return (
                        <div
                          key={opt.id}
                          onClick={() => toggleTargetId(opt.id)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            padding: '6px 8px',
                            borderRadius: 4,
                            marginBottom: 3,
                            background: isChecked ? 'var(--blue-soft, rgba(37,99,235,0.08))' : 'transparent',
                            border: isChecked ? '1px solid var(--blue, #3b82f6)' : '1px solid transparent',
                            cursor: 'pointer',
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}}
                            style={{ cursor: 'pointer' }}
                          />
                          <div style={{ flex: 1, minWidth: 0, fontSize: 12, color: isChecked ? 'var(--ink)' : 'var(--ink-soft)' }}>
                            <strong style={{ color: isChecked ? 'var(--blue, #2563eb)' : 'var(--ink)' }}>{opt.label}</strong>
                          </div>
                        </div>
                      );
                    })}
                    {filteredTargetOptions.length === 0 && (
                      <div style={{ padding: '16px', textAlign: 'center', fontSize: 12, color: 'var(--ink-faint)' }}>
                        Không tìm thấy đối tượng nào phù hợp từ khóa tìm kiếm.
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
                    <Button
                      type="button"
                      variant="primary"
                      icon="ti-plus"
                      disabled={selectedTargetIds.length === 0}
                      onClick={handleAddAssignment}
                    >
                      Thêm Gán ({selectedTargetIds.length} đối tượng đã chọn)
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Danh sách đã gán */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <div style={{ fontWeight: 700, fontSize: 13 }}>
                  Danh Sách Đối Tượng Đã Phân Bổ ({formData.assignments?.length || 0}):
                </div>
                {(formData.assignments || []).length > 1 && (
                  <Button type="button" size="sm" variant="ghost" onClick={handleRemoveAllAssignments} style={{ color: 'var(--rust)', fontSize: 11.5 }}>
                    <i className="ti ti-trash" /> Xóa Tất Cả Gán
                  </Button>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 220, overflowY: 'auto' }}>
                {(formData.assignments || []).map((asg, idx) => (
                  <div
                    key={idx}
                    className="card card-pad"
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px' }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ fontWeight: 700, fontSize: 12.5, color: 'var(--ink)' }}>{asg.targetName}</span>
                      <span style={{ fontSize: 11, color: 'var(--ink-soft)', marginLeft: 8 }}>
                        (Loại: <Badge tone="slate" size="sm">{assignmentTypeLabel(asg.assignmentType) || asg.assignmentType}</Badge> &middot; Hạn: {asg.dueDate} {asg.isMandatory ? '· Bắt buộc' : ''})
                      </span>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="danger"
                      icon="ti-trash"
                      onClick={() => handleRemoveAssignment(idx)}
                    >
                      Gỡ
                    </Button>
                  </div>
                ))}
                {(formData.assignments || []).length === 0 && (
                  <div style={{ padding: 16, textAlign: 'center', color: 'var(--ink-faint)', fontSize: 12, background: 'var(--paper-sunken)', borderRadius: 6 }}>
                    Chưa có đối tượng nào được gán cho bài assessment này.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Footer actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16, borderTop: '1px solid var(--line)', paddingTop: 12 }}>
          <Button type="button" variant="ghost" onClick={onClose}>
            Hủy Bỏ
          </Button>
          <Button type="submit" variant="primary" icon="ti-check">
            Hoàn Tất &amp; Lưu Assessment
          </Button>
        </div>
      </form>
    </Modal>
  );
}
