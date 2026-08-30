import React, { useState, useMemo } from 'react';
import { Modal, Button, Badge } from '../common/ui';
import {
  ASSESSMENT_TYPES,
  DELIVERY_FORMATS,
  QUESTION_TYPES,
  QUESTION_GROUPS,
  QUESTION_TYPE_METADATA,
  DEFAULT_QUESTION_MATRIX,
  CONTENT_FORMATS,
} from '../../data/assessmentData';
import {
  ASSIGNMENT_TYPES,
  assignmentTypeLabel,
  getCascadingTargetOptions,
  divisions,
  departments,
  subDepartments,
  jobLevels,
  retailStores,
} from '../../data/assignmentTargets';
import { generateAssessmentCode } from '../../utils/assessmentCatalog';
import { useCourseStore } from '../../store/CourseStore';

export default function AssessmentEditorModal({
  assessment,
  isOpen,
  onClose,
  onSave,
  courses = [],
  companyCategories = [],
  questionBanks = [],
  onAddQuestionToBank,
}) {
  const isEditing = Boolean(assessment && assessment.id && !assessment.isNew);
  const [activeTab, setActiveTab] = useState('GENERAL'); // GENERAL | CONTENT | ANTI_CHEAT | ASSIGNMENTS

  const { customGroups = [], users = [] } = useCourseStore();

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

      const initialMatrix = {
        ...DEFAULT_QUESTION_MATRIX,
        ...(assessment.questionMatrix || {}),
      };

      const initialFormats = assessment.contentFormats && assessment.contentFormats.length > 0
        ? assessment.contentFormats
        : (assessment.contentFormat ? [assessment.contentFormat] : [CONTENT_FORMATS.INTERACTIVE_BANK]);

      // Trích xuất danh sách câu hỏi tự tạo nếu có
      const existingQuestions = assessment.questions || (assessment.questionIds
        ? (questionBanks || []).filter((q) => assessment.questionIds.includes(q.id))
        : []);

      return {
        ...assessment,
        types: initialTypes,
        type: initialTypes[0] || ASSESSMENT_TYPES.QUIZ,
        categories: initialCategories,
        category: initialCategories[0] || companyCategories[0] || 'Food Safety & Hygiene',
        contentFormats: initialFormats,
        contentFormat: initialFormats[0] || CONTENT_FORMATS.INTERACTIVE_BANK,
        quizSourceMode: assessment.quizSourceMode || (existingQuestions.length > 0 ? 'DIRECT_BUILDER' : 'IMPORT'),
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
        questions: existingQuestions,
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
    const sampleSeedQuestions = (questionBanks || []).slice(0, 3);

    return {
      id: `ASM-${Date.now()}`,
      code: generateAssessmentCode(defaultTitle),
      title: '',
      description: '',
      type: ASSESSMENT_TYPES.QUIZ,
      types: [ASSESSMENT_TYPES.QUIZ],
      contentFormats: [CONTENT_FORMATS.INTERACTIVE_BANK],
      contentFormat: CONTENT_FORMATS.INTERACTIVE_BANK,
      quizSourceMode: 'IMPORT', // 'IMPORT' | 'DIRECT_BUILDER'
      uploadedFileName: 'Ngan_Hang_150_Cau_Hoi_Chuan.xlsx',
      uploadedPoolSize: 150,
      randomizeFromPool: true,
      questionMatrix: { ...DEFAULT_QUESTION_MATRIX },
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
      questionIds: sampleSeedQuestions.map((q) => q.id),
      questions: [...sampleSeedQuestions],
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

  // State search khóa học ở Bước 1
  const [courseSearch, setCourseSearch] = useState('');

  // State Question Builder (Soạn câu hỏi trực tiếp trên nền tảng)
  const [editingQuestionIndex, setEditingQuestionIndex] = useState(null); // null = đóng form soạn, -1 = tạo mới, >=0 = sửa câu cụ thể
  const [questionDraft, setQuestionDraft] = useState(null);
  const [selectedGroupTab, setSelectedGroupTab] = useState('BASIC'); // 'BASIC' | 'INTERMEDIATE' | 'ADVANCED' | 'ALL'

  // State Bước 4: Cascading Drill-Down Assignment
  const [assignScope, setAssignScope] = useState('DIVISION'); // 'DIVISION' | 'DEPARTMENT' | 'SUBDEPARTMENT' | 'LEVEL' | 'STORE' | 'USER' | 'GROUP' | 'ALL'
  const [divisionFilter, setDivisionFilter] = useState('ALL');
  const [deptFilter, setDeptFilter] = useState('ALL');
  const [subDeptFilter, setSubDeptFilter] = useState('ALL');
  const [levelFilter, setLevelFilter] = useState('ALL');
  const [storeFilter, setStoreFilter] = useState('ALL');
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

  // Khóa học khả dụng theo các Category được chọn
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
      const randomPool = Math.floor(Math.random() * 800) + 200;
      patchForm({
        uploadedFileName: file.name,
        uploadedPoolSize: randomPool,
      });
      alert(`Đã tải lên ngân hàng "${file.name}" thành công! Nhận diện ${randomPool} câu hỏi trong file.`);
    }
  }

  // ==========================================
  // QUESTION BUILDER LOGIC (TẠO CÂU HỎI TRỰC TIẾP)
  // ==========================================
  function startCreateQuestion(type = QUESTION_TYPES.SINGLE_CHOICE) {
    let initialOptions = [];
    let initialPairs = [];
    let initialSequence = [];
    let initialHotspots = [];

    if (type === QUESTION_TYPES.SINGLE_CHOICE || type === QUESTION_TYPES.MULTIPLE_CHOICE) {
      initialOptions = [
        { id: `opt-1-${Date.now()}`, text: '', isCorrect: true },
        { id: `opt-2-${Date.now()}`, text: '', isCorrect: false },
        { id: `opt-3-${Date.now()}`, text: '', isCorrect: false },
        { id: `opt-4-${Date.now()}`, text: '', isCorrect: false },
      ];
    } else if (type === QUESTION_TYPES.TRUE_FALSE) {
      initialOptions = [
        { id: 'opt-true', text: 'Đúng (True)', isCorrect: true },
        { id: 'opt-false', text: 'Sai (False)', isCorrect: false },
      ];
    } else if (type === QUESTION_TYPES.YES_NO) {
      initialOptions = [
        { id: 'opt-yes', text: 'Có / Đồng ý (Yes)', isCorrect: true },
        { id: 'opt-no', text: 'Không / Từ chối (No)', isCorrect: false },
      ];
    } else if (type === QUESTION_TYPES.MATCHING) {
      initialPairs = [
        { id: 'p1', left: 'Khái niệm A', right: 'Định nghĩa tương ứng A' },
        { id: 'p2', left: 'Khái niệm B', right: 'Định nghĩa tương ứng B' },
        { id: 'p3', left: 'Khái niệm C', right: 'Định nghĩa tương ứng C' },
      ];
    } else if (type === QUESTION_TYPES.ORDERING) {
      initialSequence = [
        { id: 'seq-1', text: 'Bước 1: Kiểm tra tiếp nhận & hồ sơ chứng từ', correctOrder: 1 },
        { id: 'seq-2', text: 'Bước 2: Đo nhiệt độ và kiểm tra cảm quan thực tế', correctOrder: 2 },
        { id: 'seq-3', text: 'Bước 3: Dán tem niêm phong và luân chuyển vào kho', correctOrder: 3 },
      ];
    } else if (type === QUESTION_TYPES.HOTSPOT) {
      initialHotspots = [
        { id: 'hs-1', label: 'Điểm vi phạm chính trên sơ đồ', isCorrect: true, x: 50, y: 50, radius: 12 },
      ];
      initialOptions = [
        { id: 'hs-opt-1', text: 'Vùng khu vực sơ chế bị nhiễm chéo', isCorrect: true },
        { id: 'hs-opt-2', text: 'Vùng rửa tay sát khuẩn', isCorrect: false },
      ];
    } else if (type === QUESTION_TYPES.RATING_SCALE) {
      initialOptions = [
        { id: 'r1', text: '1 - Rất không hài lòng', score: 1 },
        { id: 'r2', text: '2 - Không hài lòng', score: 2 },
        { id: 'r3', text: '3 - Bình thường', score: 3 },
        { id: 'r4', text: '4 - Hài lòng', score: 4 },
        { id: 'r5', text: '5 - Rất hài lòng', score: 5 },
      ];
    } else {
      // SCENARIO, CASE STUDY, IMAGE, VIDEO, SIMULATION, ESSAY
      initialOptions = [
        { id: `opt-1-${Date.now()}`, text: 'Phương án xử lý tối ưu A', isCorrect: true },
        { id: `opt-2-${Date.now()}`, text: 'Phương án B', isCorrect: false },
        { id: `opt-3-${Date.now()}`, text: 'Phương án C', isCorrect: false },
      ];
    }

    setQuestionDraft({
      id: `QB-CUSTOM-${Date.now()}`,
      question: '',
      questionType: type,
      difficulty: 'MEDIUM',
      score: 10,
      topic: formData.categories[0] || 'Food Safety & Hygiene',
      competency: 'Chuyên Môn Cốt Lõi',
      explanation: '',
      options: initialOptions,
      pairs: initialPairs,
      sequenceItems: initialSequence,
      hotspots: initialHotspots,
      correctKeywords: [''],
      placeholderTemplate: 'Nhập câu trả lời hoặc từ khóa chuẩn...',
      scenarioContext: '',
      imageUrl: 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=800&auto=format&fit=crop',
      videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
    });
    setEditingQuestionIndex(-1);
  }

  function startEditQuestion(index) {
    const q = (formData.questions || [])[index];
    if (!q) return;
    setQuestionDraft(JSON.parse(JSON.stringify(q)));
    setEditingQuestionIndex(index);
  }

  function handleSaveQuestionDraft() {
    if (!questionDraft.question.trim()) {
      alert('Vui lòng nhập nội dung câu hỏi!');
      return;
    }

    // Format lại options / pairs phù hợp trước khi lưu
    const standardized = {
      ...questionDraft,
      score: Number(questionDraft.score) || 10,
      options: questionDraft.questionType === QUESTION_TYPES.MATCHING
        ? (questionDraft.pairs || []).map((p) => ({ id: p.id, left: p.left, right: p.right, isCorrect: true }))
        : questionDraft.questionType === QUESTION_TYPES.ORDERING
          ? (questionDraft.sequenceItems || []).map((s) => ({ id: s.id, text: s.text, correctOrder: s.correctOrder, isCorrect: true }))
          : questionDraft.options,
    };

    setFormData((prev) => {
      const currentList = [...(prev.questions || [])];
      if (editingQuestionIndex === -1) {
        currentList.push(standardized);
      } else if (editingQuestionIndex >= 0) {
        currentList[editingQuestionIndex] = standardized;
      }
      const updatedIds = currentList.map((q) => q.id);
      return {
        ...prev,
        questions: currentList,
        questionIds: updatedIds,
        questionsPerAttempt: currentList.length,
      };
    });

    if (onAddQuestionToBank) {
      onAddQuestionToBank(standardized);
    }

    setEditingQuestionIndex(null);
    setQuestionDraft(null);
  }

  function handleDeleteQuestion(idx) {
    if (window.confirm('Bạn có chắc chắn muốn xóa câu hỏi này khỏi đề thi?')) {
      setFormData((prev) => {
        const next = [...(prev.questions || [])];
        next.splice(idx, 1);
        return {
          ...prev,
          questions: next,
          questionIds: next.map((q) => q.id),
          questionsPerAttempt: Math.max(1, next.length),
        };
      });
    }
  }

  function handleDuplicateQuestion(idx) {
    const q = (formData.questions || [])[idx];
    if (!q) return;
    const dup = {
      ...JSON.parse(JSON.stringify(q)),
      id: `QB-CUSTOM-${Date.now()}`,
      question: `${q.question} (Bản sao)`,
    };
    setFormData((prev) => {
      const next = [...(prev.questions || []), dup];
      return {
        ...prev,
        questions: next,
        questionIds: next.map((x) => x.id),
        questionsPerAttempt: next.length,
      };
    });
  }

  // ==========================================
  // CASCADING DRILL-DOWN ASSIGNMENT LOGIC (BƯỚC 4)
  // ==========================================
  const availableDepts = useMemo(() => {
    if (divisionFilter === 'ALL') return departments;
    return departments.filter((d) => d.divisionId === divisionFilter);
  }, [divisionFilter]);

  const availableSubDepts = useMemo(() => {
    return subDepartments.filter((s) => {
      if (deptFilter !== 'ALL') return s.departmentId === deptFilter;
      if (divisionFilter !== 'ALL') {
        const parentDept = departments.find((d) => d.id === s.departmentId);
        return parentDept && parentDept.divisionId === divisionFilter;
      }
      return true;
    });
  }, [deptFilter, divisionFilter]);

  const cascadingOptions = useMemo(() => {
    if (assignScope === 'ALL') return [];
    return getCascadingTargetOptions({
      scope: assignScope,
      divisionFilter,
      deptFilter,
      subDeptFilter,
      levelFilter,
      storeFilter,
      search: targetSearchQuery,
      customGroups,
      usersList: users,
    });
  }, [assignScope, divisionFilter, deptFilter, subDeptFilter, levelFilter, storeFilter, targetSearchQuery, customGroups, users]);

  function handleScopeChange(nextScope) {
    setAssignScope(nextScope);
    setSelectedTargetIds([]);
    setTargetSearchQuery('');
  }

  function toggleTargetId(id) {
    setSelectedTargetIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function selectAllCascadingTargets() {
    setSelectedTargetIds(cascadingOptions.map((o) => o.id));
  }

  function deselectAllCascadingTargets() {
    setSelectedTargetIds([]);
  }

  function handleAddCascadingAssignment() {
    if (assignScope === 'ALL') {
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
      alert('Vui lòng tick chọn ít nhất một đối tượng trong danh sách!');
      return;
    }

    const newItems = selectedTargetIds.map((tid) => {
      const matched = cascadingOptions.find((o) => String(o.id) === String(tid));
      return {
        assignmentType: assignScope,
        targetId: tid,
        targetName: matched ? matched.label : `${assignScope}: ${tid}`,
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

  // ==========================================
  // SUBMIT HANDLER
  // ==========================================
  function handleSubmit(e) {
    if (e) e.preventDefault();
    if (!formData.title.trim()) {
      alert('Vui lòng nhập Tiêu đề bài Assessment!');
      setActiveTab('GENERAL');
      return;
    }

    const activeFormats = formData.contentFormats && formData.contentFormats.length > 0
      ? formData.contentFormats
      : (formData.contentFormat ? [formData.contentFormat] : [CONTENT_FORMATS.INTERACTIVE_BANK]);

    // Tạo danh sách mô tả câu hỏi
    const qTypes = [];
    const matrix = formData.questionMatrix || {};
    const selectedTypes = formData.types || [ASSESSMENT_TYPES.QUIZ];

    if (selectedTypes.includes(ASSESSMENT_TYPES.QUIZ)) {
      if (formData.quizSourceMode === 'DIRECT_BUILDER') {
        const count = (formData.questions || []).length;
        qTypes.push(`${count} câu hỏi soạn trực tiếp trên hệ thống`);
      } else {
        const items = [];
        if (matrix.singleChoice > 0) items.push(`${matrix.singleChoice} Trắc nghiệm đơn`);
        if (matrix.multipleChoice > 0) items.push(`${matrix.multipleChoice} Nhiều đáp án`);
        if (matrix.trueFalse > 0) items.push(`${matrix.trueFalse} Đúng/Sai`);
        if (matrix.yesNo > 0) items.push(`${matrix.yesNo} Có/Không`);
        if (matrix.matching > 0) items.push(`${matrix.matching} Ghép đôi`);
        if (matrix.ordering > 0) items.push(`${matrix.ordering} Thứ tự`);
        if (matrix.fillInBlank > 0) items.push(`${matrix.fillInBlank} Điền chỗ trống`);
        if (matrix.shortAnswer > 0) items.push(`${matrix.shortAnswer} Trả lời ngắn`);
        if (matrix.scenarioBased > 0) items.push(`${matrix.scenarioBased} Tình huống`);
        if (matrix.caseStudy > 0) items.push(`${matrix.caseStudy} Case Study`);
        if (matrix.hotspot > 0) items.push(`${matrix.hotspot} Hotspot`);
        if (matrix.imageBase > 0) items.push(`${matrix.imageBase} Hình ảnh`);
        if (matrix.videoBased > 0) items.push(`${matrix.videoBased} Video`);
        if (matrix.simulation > 0) items.push(`${matrix.simulation} Mô phỏng`);
        if (matrix.essay > 0) items.push(`${matrix.essay} Tự luận`);
        qTypes.push(items.length > 0 ? items.join(', ') : `${formData.questionsPerAttempt || 4} câu ngẫu nhiên từ ngân hàng`);
      }
    }
    if (selectedTypes.includes(ASSESSMENT_TYPES.ASSIGNMENT)) {
      qTypes.push('File đề bài tự luận (PDF / Docx)');
    }
    if (selectedTypes.includes(ASSESSMENT_TYPES.SURVEY)) {
      qTypes.push('Biểu mẫu khảo sát Google Form / CSAT');
    }

    onSave({
      ...formData,
      contentFormats: activeFormats,
      contentFormat: activeFormats[0],
      questionTypesList: qTypes,
      questionsPerAttempt: formData.quizSourceMode === 'DIRECT_BUILDER'
        ? (formData.questions?.length || 4)
        : (Number(formData.questionsPerAttempt) || 4),
      questionIds: formData.questions && formData.questions.length > 0
        ? formData.questions.map((q) => q.id)
        : (formData.questionIds || []),
    });
  }

  const selectedTypes = formData.types || [formData.type || ASSESSMENT_TYPES.QUIZ];
  const isStandalone = formData.deliveryFormat === DELIVERY_FORMATS.STANDALONE;
  const totalMatrixCount = Object.values(formData.questionMatrix || {}).reduce((s, n) => s + (Number(n) || 0), 0);

  // Scope buttons for Step 4
  const SCOPE_BUTTONS = [
    { id: 'DIVISION', label: '1. Khối (Division)', icon: 'ti-building-skyscraper' },
    { id: 'DEPARTMENT', label: '2. Phòng Ban (Dept)', icon: 'ti-building' },
    { id: 'SUBDEPARTMENT', label: '3. Sub-Dept (Bộ Phận)', icon: 'ti-git-branch' },
    { id: 'LEVEL', label: '4. Cấp Bậc (Level)', icon: 'ti-stairs-up' },
    { id: 'STORE', label: '5. Chi Nhánh / Siêu Thị', icon: 'ti-map-pin' },
    { id: 'USER', label: '6. Từng Nhân Sự (User)', icon: 'ti-user' },
    { id: 'GROUP', label: '👥 Nhóm Tùy Chỉnh', icon: 'ti-users-group' },
    { id: 'ALL', label: '🌐 Toàn Doanh Nghiệp', icon: 'ti-world' },
  ];

  return (
    <Modal
      title={
        isEditing
          ? `Chỉnh Sửa Assessment: ${formData.title || formData.code}`
          : formData.isCourseExclusive
            ? `Tạo Assessment Mới Cho Khóa Học: ${formData.courseTitle || 'Khóa Học Mới'}`
            : 'Tạo Assessment Mới (Quiz / Assignment / Survey)'
      }
      isOpen={isOpen}
      onClose={onClose}
      maxWidth={920}
    >
      <form onSubmit={(e) => { e.preventDefault(); }}>
        {/* WIZARD STEP INDICATOR HEADER */}
        <div style={{ display: 'grid', gridTemplateColumns: isStandalone ? 'repeat(4, 1fr)' : 'repeat(3, 1fr)', gap: 8, borderBottom: '1px solid var(--line)', paddingBottom: 12, marginBottom: 16 }}>
          <button
            type="button"
            onClick={() => setActiveTab('GENERAL')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              padding: '8px 10px',
              borderRadius: 8,
              border: activeTab === 'GENERAL' ? '2px solid var(--rail)' : '1px solid var(--line)',
              background: activeTab === 'GENERAL' ? 'var(--rail-soft, rgba(0,122,56,0.08))' : 'var(--paper-sunken)',
              color: activeTab === 'GENERAL' ? 'var(--rail)' : 'var(--ink-soft)',
              fontWeight: activeTab === 'GENERAL' ? 700 : 500,
              fontSize: 12,
              cursor: 'pointer',
              textAlign: 'center',
            }}
          >
            <span style={{
              width: 18,
              height: 18,
              borderRadius: '50%',
              background: activeTab === 'GENERAL' ? 'var(--rail)' : 'var(--line)',
              color: '#fff',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 10,
              fontWeight: 800,
            }}>1</span>
            <span>Cấu Hình Chung</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('CONTENT')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              padding: '8px 10px',
              borderRadius: 8,
              border: activeTab === 'CONTENT' ? '2px solid var(--rail)' : '1px solid var(--line)',
              background: activeTab === 'CONTENT' ? 'var(--rail-soft, rgba(0,122,56,0.08))' : 'var(--paper-sunken)',
              color: activeTab === 'CONTENT' ? 'var(--rail)' : 'var(--ink-soft)',
              fontWeight: activeTab === 'CONTENT' ? 700 : 500,
              fontSize: 12,
              cursor: 'pointer',
              textAlign: 'center',
            }}
          >
            <span style={{
              width: 18,
              height: 18,
              borderRadius: '50%',
              background: activeTab === 'CONTENT' ? 'var(--rail)' : 'var(--line)',
              color: '#fff',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 10,
              fontWeight: 800,
            }}>2</span>
            <span>Định Dạng &amp; Đề Thi</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ANTI_CHEAT')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              padding: '8px 10px',
              borderRadius: 8,
              border: activeTab === 'ANTI_CHEAT' ? '2px solid var(--rail)' : '1px solid var(--line)',
              background: activeTab === 'ANTI_CHEAT' ? 'var(--rail-soft, rgba(0,122,56,0.08))' : 'var(--paper-sunken)',
              color: activeTab === 'ANTI_CHEAT' ? 'var(--rail)' : 'var(--ink-soft)',
              fontWeight: activeTab === 'ANTI_CHEAT' ? 700 : 500,
              fontSize: 12,
              cursor: 'pointer',
              textAlign: 'center',
            }}
          >
            <span style={{
              width: 18,
              height: 18,
              borderRadius: '50%',
              background: activeTab === 'ANTI_CHEAT' ? 'var(--rail)' : 'var(--line)',
              color: '#fff',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 10,
              fontWeight: 800,
            }}>3</span>
            <span>Chống Gian Lận</span>
          </button>

          {isStandalone && (
            <button
              type="button"
              onClick={() => setActiveTab('ASSIGNMENTS')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                padding: '8px 10px',
                borderRadius: 8,
                border: activeTab === 'ASSIGNMENTS' ? '2px solid var(--rail)' : '1px solid var(--line)',
                background: activeTab === 'ASSIGNMENTS' ? 'var(--rail-soft, rgba(0,122,56,0.08))' : 'var(--paper-sunken)',
                color: activeTab === 'ASSIGNMENTS' ? 'var(--rail)' : 'var(--ink-soft)',
                fontWeight: activeTab === 'ASSIGNMENTS' ? 700 : 500,
                fontSize: 12,
                cursor: 'pointer',
                textAlign: 'center',
              }}
            >
              <span style={{
                width: 18,
                height: 18,
                borderRadius: '50%',
                background: activeTab === 'ASSIGNMENTS' ? 'var(--rail)' : 'var(--line)',
                color: '#fff',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 10,
                fontWeight: 800,
              }}>4</span>
              <span>Phân Bổ ({formData.assignments?.length || 0})</span>
            </button>
          )}
        </div>

        {/* ======================================================== */}
        {/* BƯỚC 1: CẤU HÌNH CHUNG                                    */}
        {/* ======================================================== */}
        {activeTab === 'GENERAL' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Title & Code */}
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

            {/* Loại hình Assessment (Multi-select) */}
            <div className="card card-pad" style={{ background: 'var(--paper-sunken)' }}>
              <div style={{ fontWeight: 700, fontSize: 12.5, marginBottom: 8, color: 'var(--ink)' }}>
                Loại Hình Assessment (Có thể chọn nhiều loại kết hợp — Định dạng ở Bước 2 sẽ dựa theo lựa chọn này):
              </div>
              <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={selectedTypes.includes(ASSESSMENT_TYPES.QUIZ)}
                    onChange={() => toggleType(ASSESSMENT_TYPES.QUIZ)}
                  />
                  <span>📝 Trắc Nghiệm / Quiz</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={selectedTypes.includes(ASSESSMENT_TYPES.ASSIGNMENT)}
                    onChange={() => toggleType(ASSESSMENT_TYPES.ASSIGNMENT)}
                  />
                  <span>📂 Bài Tập / Assignment Tự Luận</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={selectedTypes.includes(ASSESSMENT_TYPES.SURVEY)}
                    onChange={() => toggleType(ASSESSMENT_TYPES.SURVEY)}
                  />
                  <span>📊 Khảo Sát / Survey / CSAT</span>
                </label>
              </div>
            </div>

            {/* Hình Thức Tổ Chức & Trạng Thái */}
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

            {/* Categories */}
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

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 8, maxHeight: 120, overflowY: 'auto' }}>
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

            {/* Khi Course-linked: Lọc khóa học */}
            {formData.deliveryFormat === DELIVERY_FORMATS.COURSE_LINKED && !formData.isCourseExclusive && (
              <div className="card card-pad" style={{ background: 'var(--paper-raised)', border: '1px solid var(--line)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
                  <div>
                    <span style={{ fontWeight: 700, fontSize: 12.5, color: 'var(--rail)' }}>
                      <i className="ti ti-link" style={{ marginRight: 4 }} />
                      Khóa Học E-Learning Liên Kết:
                    </span>
                    <span style={{ fontSize: 11.5, color: 'var(--ink-soft)', marginLeft: 6 }}>
                      (Đã chọn: {(formData.courseIds || []).length})
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <input
                      type="text"
                      className="field-input"
                      style={{ height: 26, fontSize: 11, width: 140 }}
                      placeholder="Tìm khóa..."
                      value={courseSearch}
                      onChange={(e) => setCourseSearch(e.target.value)}
                    />
                    <Button type="button" size="sm" variant="ghost" onClick={selectAllFilteredCourses}>Chọn Hết</Button>
                    <Button type="button" size="sm" variant="ghost" onClick={deselectAllCourses}>Bỏ Chọn</Button>
                  </div>
                </div>

                <div style={{ maxHeight: 140, overflowY: 'auto', border: '1px solid var(--line)', borderRadius: 6, padding: 6, background: 'var(--paper-sunken)' }}>
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
                          padding: '4px 8px',
                          borderRadius: 4,
                          marginBottom: 2,
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
                        <div style={{ flex: 1, minWidth: 0, fontSize: 11.5 }}>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--ink-faint)', marginRight: 4 }}>[{c.code}]</span>
                          <strong style={{ color: 'var(--ink)' }}>{c.title}</strong>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Metrics */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, borderTop: '1px solid var(--line)', paddingTop: 12 }}>
              <div className="field-group">
                <label className="field-label">Thời Gian (Phút)</label>
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
                  disabled={selectedTypes.length === 1 && selectedTypes[0] === ASSESSMENT_TYPES.SURVEY}
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
                <label className="field-label">Số Câu Bốc / Đề</label>
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

        {/* ======================================================== */}
        {/* BƯỚC 2: ĐỊNH DẠNG & ĐỀ THI (LỌC THEO BƯỚC 1)             */}
        {/* ======================================================== */}
        {activeTab === 'CONTENT' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Header info banner */}
            <div style={{ background: 'var(--paper-sunken)', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--line)', fontSize: 12.5 }}>
              <i className="ti ti-info-circle" style={{ color: 'var(--rail)', marginRight: 5 }} />
              Cấu hình nội dung đề thi cho các loại hình đã chọn ở Bước 1: <strong>{selectedTypes.map((t) => t === 'QUIZ' ? 'Trắc Nghiệm' : t === 'ASSIGNMENT' ? 'Tự Luận' : 'Khảo Sát').join(' & ')}</strong>.
            </div>

            {/* 1. SECTION: TRẮC NGHIỆM / QUIZ */}
            {selectedTypes.includes(ASSESSMENT_TYPES.QUIZ) && (
              <div className="card card-pad" style={{ background: 'var(--paper-raised)', border: '1.5px solid var(--rail)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                  <div style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--rail)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <i className="ti ti-checklist" style={{ fontSize: 18 }} />
                    <span>Nội Dung Trắc Nghiệm / Quiz:</span>
                  </div>

                  {/* Radio Switch: Import File vs Tạo Trực Tiếp */}
                  <div style={{ display: 'flex', gap: 8, background: 'var(--paper-sunken)', padding: 4, borderRadius: 8, border: '1px solid var(--line)' }}>
                    <button
                      type="button"
                      onClick={() => patchForm({ quizSourceMode: 'IMPORT' })}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 6,
                        fontSize: 12,
                        fontWeight: formData.quizSourceMode === 'IMPORT' ? 700 : 500,
                        border: 'none',
                        background: formData.quizSourceMode === 'IMPORT' ? 'var(--rail)' : 'transparent',
                        color: formData.quizSourceMode === 'IMPORT' ? '#fff' : 'var(--ink-soft)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 5,
                      }}
                    >
                      <i className="ti ti-file-upload" />
                      <span>Cách 1: Import File Ngân Hàng Đề</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => patchForm({ quizSourceMode: 'DIRECT_BUILDER' })}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 6,
                        fontSize: 12,
                        fontWeight: formData.quizSourceMode === 'DIRECT_BUILDER' ? 700 : 500,
                        border: 'none',
                        background: formData.quizSourceMode === 'DIRECT_BUILDER' ? 'var(--rail)' : 'transparent',
                        color: formData.quizSourceMode === 'DIRECT_BUILDER' ? '#fff' : 'var(--ink-soft)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 5,
                      }}
                    >
                      <i className="ti ti-edit" />
                      <span>Cách 2: Tạo Câu Hỏi Trực Tiếp Trên Nền Tảng ({formData.questions?.length || 0})</span>
                    </button>
                  </div>
                </div>

                {/* OPTION 1: IMPORT FILE & CẤU HÌNH MA TRẬN 15 DẠNG CÂU HỎI */}
                {formData.quizSourceMode === 'IMPORT' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {/* Upload File Ngân Hàng */}
                    <div style={{ border: '2px dashed var(--line)', padding: '16px', borderRadius: 8, textAlign: 'center', background: 'var(--paper-sunken)' }}>
                      <i className="ti ti-file-spreadsheet" style={{ fontSize: 32, color: 'var(--sage)', display: 'block', marginBottom: 6 }} />
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>
                        Đang sử dụng: <strong style={{ color: 'var(--rail)' }}>{formData.uploadedFileName}</strong> ({formData.uploadedPoolSize} câu hỏi có sẵn)
                      </div>
                      <div style={{ fontSize: 11.5, color: 'var(--ink-soft)', marginTop: 2 }}>
                        Hỗ trợ file .xlsx, .csv, .docx, .json. Hệ thống sẽ tự động bốc ngẫu nhiên đề thi theo ma trận bên dưới.
                      </div>
                      <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 10 }}>
                        <label className="btn btn-sm btn-primary" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                          <i className="ti ti-upload" /> Tải Lên File Ngân Hàng Mới
                          <input type="file" accept=".xlsx,.csv,.docx,.json" onChange={handleFileUpload} style={{ display: 'none' }} />
                        </label>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          icon="ti-download"
                          onClick={() => alert('Đang tải file mẫu Template_Question_Bank_15_Types_MMVN.xlsx')}
                        >
                          Tải File Excel Mẫu (15 Dạng)
                        </Button>
                      </div>
                    </div>

                    {/* Cấu Hình Ma Trận Bốc Đề Theo 3 Cấp Độ (Basic, Intermediate, Advanced) */}
                    <div className="card card-pad" style={{ background: 'var(--paper-sunken)', border: '1px solid var(--line)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--ink)' }}>
                            <i className="ti ti-adjustments-horizontal" style={{ marginRight: 5, color: 'var(--rail)' }} />
                            Cấu Hình Ma Trận Rút Câu Hỏi Ngẫu Nhiên (Đầy đủ 15 dạng câu hỏi):
                          </div>
                          <div style={{ fontSize: 11.5, color: 'var(--ink-soft)' }}>
                            Cấu hình số lượng từng dạng câu hỏi sẽ được rút ngẫu nhiên từ file ngân hàng khi học viên làm bài:
                          </div>
                        </div>
                        <Badge tone="sage" size="md">
                          Tổng: {totalMatrixCount || formData.questionsPerAttempt} câu / đề thi
                        </Badge>
                      </div>

                      {/* Group 1: BASIC */}
                      <div style={{ marginBottom: 14 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--sage)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <i className="ti ti-circle-check" />
                          <span>1. Nhóm Cơ Bản (Basic):</span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                          <div style={{ background: 'var(--paper-raised)', padding: 8, borderRadius: 6, border: '1px solid var(--line)' }}>
                            <label className="field-label" style={{ fontSize: 11, margin: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span>🔘 Trắc Nghiệm Đơn</span>
                              <input
                                type="number"
                                min="0"
                                max="50"
                                style={{ width: 50, height: 26, fontSize: 11.5, padding: '2px 4px' }}
                                className="field-input"
                                value={formData.questionMatrix?.singleChoice ?? 2}
                                onChange={(e) => patchMatrix('singleChoice', e.target.value)}
                              />
                            </label>
                          </div>
                          <div style={{ background: 'var(--paper-raised)', padding: 8, borderRadius: 6, border: '1px solid var(--line)' }}>
                            <label className="field-label" style={{ fontSize: 11, margin: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span>☑️ Nhiều Đáp Án</span>
                              <input
                                type="number"
                                min="0"
                                max="50"
                                style={{ width: 50, height: 26, fontSize: 11.5, padding: '2px 4px' }}
                                className="field-input"
                                value={formData.questionMatrix?.multipleChoice ?? 1}
                                onChange={(e) => patchMatrix('multipleChoice', e.target.value)}
                              />
                            </label>
                          </div>
                          <div style={{ background: 'var(--paper-raised)', padding: 8, borderRadius: 6, border: '1px solid var(--line)' }}>
                            <label className="field-label" style={{ fontSize: 11, margin: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span>⚖️ Đúng / Sai</span>
                              <input
                                type="number"
                                min="0"
                                max="50"
                                style={{ width: 50, height: 26, fontSize: 11.5, padding: '2px 4px' }}
                                className="field-input"
                                value={formData.questionMatrix?.trueFalse ?? 1}
                                onChange={(e) => patchMatrix('trueFalse', e.target.value)}
                              />
                            </label>
                          </div>
                          <div style={{ background: 'var(--paper-raised)', padding: 8, borderRadius: 6, border: '1px solid var(--line)' }}>
                            <label className="field-label" style={{ fontSize: 11, margin: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span>👍 Có / Không</span>
                              <input
                                type="number"
                                min="0"
                                max="50"
                                style={{ width: 50, height: 26, fontSize: 11.5, padding: '2px 4px' }}
                                className="field-input"
                                value={formData.questionMatrix?.yesNo ?? 0}
                                onChange={(e) => patchMatrix('yesNo', e.target.value)}
                              />
                            </label>
                          </div>
                        </div>
                      </div>

                      {/* Group 2: INTERMEDIATE */}
                      <div style={{ marginBottom: 14 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--amber, #d97706)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <i className="ti ti-adjustments-alt" />
                          <span>2. Nhóm Trung Cấp (Intermediate):</span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                          <div style={{ background: 'var(--paper-raised)', padding: 8, borderRadius: 6, border: '1px solid var(--line)' }}>
                            <label className="field-label" style={{ fontSize: 11, margin: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span>🧩 Ghép Đôi</span>
                              <input
                                type="number"
                                min="0"
                                max="20"
                                style={{ width: 50, height: 26, fontSize: 11.5, padding: '2px 4px' }}
                                className="field-input"
                                value={formData.questionMatrix?.matching ?? 0}
                                onChange={(e) => patchMatrix('matching', e.target.value)}
                              />
                            </label>
                          </div>
                          <div style={{ background: 'var(--paper-raised)', padding: 8, borderRadius: 6, border: '1px solid var(--line)' }}>
                            <label className="field-label" style={{ fontSize: 11, margin: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span>🔢 Thứ Tự Quy Trình</span>
                              <input
                                type="number"
                                min="0"
                                max="20"
                                style={{ width: 50, height: 26, fontSize: 11.5, padding: '2px 4px' }}
                                className="field-input"
                                value={formData.questionMatrix?.ordering ?? 0}
                                onChange={(e) => patchMatrix('ordering', e.target.value)}
                              />
                            </label>
                          </div>
                          <div style={{ background: 'var(--paper-raised)', padding: 8, borderRadius: 6, border: '1px solid var(--line)' }}>
                            <label className="field-label" style={{ fontSize: 11, margin: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span>📝 Điền Chỗ Trống</span>
                              <input
                                type="number"
                                min="0"
                                max="20"
                                style={{ width: 50, height: 26, fontSize: 11.5, padding: '2px 4px' }}
                                className="field-input"
                                value={formData.questionMatrix?.fillInBlank ?? 0}
                                onChange={(e) => patchMatrix('fillInBlank', e.target.value)}
                              />
                            </label>
                          </div>
                          <div style={{ background: 'var(--paper-raised)', padding: 8, borderRadius: 6, border: '1px solid var(--line)' }}>
                            <label className="field-label" style={{ fontSize: 11, margin: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span>💬 Trả Lời Ngắn</span>
                              <input
                                type="number"
                                min="0"
                                max="20"
                                style={{ width: 50, height: 26, fontSize: 11.5, padding: '2px 4px' }}
                                className="field-input"
                                value={formData.questionMatrix?.shortAnswer ?? 0}
                                onChange={(e) => patchMatrix('shortAnswer', e.target.value)}
                              />
                            </label>
                          </div>
                        </div>
                      </div>

                      {/* Group 3: ADVANCED */}
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--rail)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <i className="ti ti-sparkles" />
                          <span>3. Nhóm Nâng Cao (Advanced):</span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                          <div style={{ background: 'var(--paper-raised)', padding: 8, borderRadius: 6, border: '1px solid var(--line)' }}>
                            <label className="field-label" style={{ fontSize: 11, margin: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span>💼 Tình Huống</span>
                              <input
                                type="number"
                                min="0"
                                max="20"
                                style={{ width: 50, height: 26, fontSize: 11.5, padding: '2px 4px' }}
                                className="field-input"
                                value={formData.questionMatrix?.scenarioBased ?? 0}
                                onChange={(e) => patchMatrix('scenarioBased', e.target.value)}
                              />
                            </label>
                          </div>
                          <div style={{ background: 'var(--paper-raised)', padding: 8, borderRadius: 6, border: '1px solid var(--line)' }}>
                            <label className="field-label" style={{ fontSize: 11, margin: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span>📖 Case Study</span>
                              <input
                                type="number"
                                min="0"
                                max="20"
                                style={{ width: 50, height: 26, fontSize: 11.5, padding: '2px 4px' }}
                                className="field-input"
                                value={formData.questionMatrix?.caseStudy ?? 0}
                                onChange={(e) => patchMatrix('caseStudy', e.target.value)}
                              />
                            </label>
                          </div>
                          <div style={{ background: 'var(--paper-raised)', padding: 8, borderRadius: 6, border: '1px solid var(--line)' }}>
                            <label className="field-label" style={{ fontSize: 11, margin: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span>🎯 Hotspot Ảnh</span>
                              <input
                                type="number"
                                min="0"
                                max="20"
                                style={{ width: 50, height: 26, fontSize: 11.5, padding: '2px 4px' }}
                                className="field-input"
                                value={formData.questionMatrix?.hotspot ?? 0}
                                onChange={(e) => patchMatrix('hotspot', e.target.value)}
                              />
                            </label>
                          </div>
                          <div style={{ background: 'var(--paper-raised)', padding: 8, borderRadius: 6, border: '1px solid var(--line)' }}>
                            <label className="field-label" style={{ fontSize: 11, margin: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span>🖼️ Hình Ảnh</span>
                              <input
                                type="number"
                                min="0"
                                max="20"
                                style={{ width: 50, height: 26, fontSize: 11.5, padding: '2px 4px' }}
                                className="field-input"
                                value={formData.questionMatrix?.imageBase ?? 0}
                                onChange={(e) => patchMatrix('imageBase', e.target.value)}
                              />
                            </label>
                          </div>
                          <div style={{ background: 'var(--paper-raised)', padding: 8, borderRadius: 6, border: '1px solid var(--line)' }}>
                            <label className="field-label" style={{ fontSize: 11, margin: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span>🎬 Video Clip</span>
                              <input
                                type="number"
                                min="0"
                                max="20"
                                style={{ width: 50, height: 26, fontSize: 11.5, padding: '2px 4px' }}
                                className="field-input"
                                value={formData.questionMatrix?.videoBased ?? 0}
                                onChange={(e) => patchMatrix('videoBased', e.target.value)}
                              />
                            </label>
                          </div>
                          <div style={{ background: 'var(--paper-raised)', padding: 8, borderRadius: 6, border: '1px solid var(--line)' }}>
                            <label className="field-label" style={{ fontSize: 11, margin: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span>🎮 Mô Phỏng</span>
                              <input
                                type="number"
                                min="0"
                                max="20"
                                style={{ width: 50, height: 26, fontSize: 11.5, padding: '2px 4px' }}
                                className="field-input"
                                value={formData.questionMatrix?.simulation ?? 0}
                                onChange={(e) => patchMatrix('simulation', e.target.value)}
                              />
                            </label>
                          </div>
                          <div style={{ background: 'var(--paper-raised)', padding: 8, borderRadius: 6, border: '1px solid var(--line)' }}>
                            <label className="field-label" style={{ fontSize: 11, margin: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span>✍️ Tự Luận Chuyên Sâu</span>
                              <input
                                type="number"
                                min="0"
                                max="20"
                                style={{ width: 50, height: 26, fontSize: 11.5, padding: '2px 4px' }}
                                className="field-input"
                                value={formData.questionMatrix?.essay ?? 0}
                                onChange={(e) => patchMatrix('essay', e.target.value)}
                              />
                            </label>
                          </div>
                          <div style={{ background: 'var(--paper-raised)', padding: 8, borderRadius: 6, border: '1px solid var(--line)' }}>
                            <label className="field-label" style={{ fontSize: 11, margin: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span>⭐ CSAT / Likert</span>
                              <input
                                type="number"
                                min="0"
                                max="30"
                                style={{ width: 50, height: 26, fontSize: 11.5, padding: '2px 4px' }}
                                className="field-input"
                                value={formData.questionMatrix?.ratingScale ?? 0}
                                onChange={(e) => patchMatrix('ratingScale', e.target.value)}
                              />
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* OPTION 2: QUESTION BUILDER (TẠO CÂU HỎI TRỰC TIẾP TRÊN NỀN TẢNG) */}
                {formData.quizSourceMode === 'DIRECT_BUILDER' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {/* Add Question Button & Group Tabs */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <Button
                          type="button"
                          size="sm"
                          variant="primary"
                          icon="ti-plus"
                          onClick={() => startCreateQuestion(QUESTION_TYPES.SINGLE_CHOICE)}
                        >
                          Tạo Câu Hỏi Mới
                        </Button>
                      </div>

                      <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
                        Đã tạo <strong>{(formData.questions || []).length} câu hỏi</strong> cho bài assessment này
                      </div>
                    </div>

                    {/* FORM SOẠN THẢO CÂU HỎI (KHI ĐANG TẠO HOẶC SỬA) */}
                    {editingQuestionIndex !== null && questionDraft && (
                      <div className="card card-pad" style={{ background: 'var(--paper-sunken)', border: '2px solid var(--rail)', borderRadius: 8 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, borderBottom: '1px solid var(--line)', paddingBottom: 8 }}>
                          <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--rail)' }}>
                            <i className="ti ti-edit" style={{ marginRight: 4 }} />
                            {editingQuestionIndex === -1 ? 'Tạo Câu Hỏi Trực Tiếp Mới' : `Chỉnh Sửa Câu Hỏi #${editingQuestionIndex + 1}`}
                          </div>
                          <button
                            type="button"
                            onClick={() => { setEditingQuestionIndex(null); setQuestionDraft(null); }}
                            style={{ background: 'none', border: 'none', color: 'var(--ink-soft)', cursor: 'pointer', fontSize: 14 }}
                          >
                            <i className="ti ti-x" />
                          </button>
                        </div>

                        {/* Chọn Dạng Câu Hỏi trong 15 Dạng */}
                        <div style={{ marginBottom: 12 }}>
                          <label className="field-label" style={{ fontSize: 11.5 }}>
                            Chọn Dạng Câu Hỏi (15 Dạng Hỗ Trợ):
                          </label>
                          <select
                            className="field-input"
                            value={questionDraft.questionType}
                            onChange={(e) => startCreateQuestion(e.target.value)}
                          >
                            <optgroup label="🟢 Nhóm Cơ Bản (Basic)">
                              <option value={QUESTION_TYPES.SINGLE_CHOICE}>🔘 Trắc Nghiệm Đơn (Single Choice)</option>
                              <option value={QUESTION_TYPES.MULTIPLE_CHOICE}>☑️ Nhiều Đáp Án (Multiple Choice)</option>
                              <option value={QUESTION_TYPES.TRUE_FALSE}>⚖️ Đúng / Sai (True / False)</option>
                              <option value={QUESTION_TYPES.YES_NO}>👍 Có / Không (Yes / No)</option>
                            </optgroup>
                            <optgroup label="🟡 Nhóm Trung Cấp (Intermediate)">
                              <option value={QUESTION_TYPES.MATCHING}>🧩 Ghép Đôi (Matching)</option>
                              <option value={QUESTION_TYPES.ORDERING}>🔢 Sắp Xếp Thứ Tự (Ordering / Sequence)</option>
                              <option value={QUESTION_TYPES.FILL_IN_BLANK}>📝 Điền Vào Chỗ Trống (Fill in the Blank)</option>
                              <option value={QUESTION_TYPES.SHORT_ANSWER}>💬 Câu Trả Lời Ngắn (Short Answer)</option>
                            </optgroup>
                            <optgroup label="🟣 Nhóm Nâng Cao (Advanced)">
                              <option value={QUESTION_TYPES.SCENARIO_BASED}>💼 Tình Huống Thực Tế (Scenario-based)</option>
                              <option value={QUESTION_TYPES.CASE_STUDY}>📖 Nghiên Cứu Tình Huống (Case Study)</option>
                              <option value={QUESTION_TYPES.HOTSPOT}>🎯 Chọn Điểm Nóng (Hotspot Ảnh)</option>
                              <option value={QUESTION_TYPES.IMAGE_BASED}>🖼️ Câu Hỏi Dựa Trên Hình Ảnh</option>
                              <option value={QUESTION_TYPES.VIDEO_BASED}>🎬 Câu Hỏi Dựa Trên Video</option>
                              <option value={QUESTION_TYPES.SIMULATION}>🎮 Mô Phỏng Tình Huống (Simulation)</option>
                              <option value={QUESTION_TYPES.ESSAY}>✍️ Tự Luận Chuyên Sâu (Essay)</option>
                            </optgroup>
                            <optgroup label="📊 Khảo Sát &amp; Đánh Giá">
                              <option value={QUESTION_TYPES.RATING_SCALE}>⭐ Thang Điểm Đánh Giá (CSAT / Likert)</option>
                            </optgroup>
                          </select>
                        </div>

                        {/* Điểm số & Độ khó & Năng lực */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.5fr', gap: 10, marginBottom: 12 }}>
                          <div>
                            <label className="field-label" style={{ fontSize: 11 }}>Điểm Số</label>
                            <input
                              type="number"
                              min="1"
                              max="100"
                              className="field-input"
                              value={questionDraft.score}
                              onChange={(e) => setQuestionDraft((d) => ({ ...d, score: Number(e.target.value) }))}
                            />
                          </div>
                          <div>
                            <label className="field-label" style={{ fontSize: 11 }}>Độ Khó</label>
                            <select
                              className="field-input"
                              value={questionDraft.difficulty}
                              onChange={(e) => setQuestionDraft((d) => ({ ...d, difficulty: e.target.value }))}
                            >
                              <option value="EASY">Dễ (Easy)</option>
                              <option value="MEDIUM">Trung Bình (Medium)</option>
                              <option value="HARD">Khó (Hard)</option>
                              <option value="EXPERT">Chuyên Gia (Expert)</option>
                            </select>
                          </div>
                          <div>
                            <label className="field-label" style={{ fontSize: 11 }}>Năng Lực Đánh Giá (Competency)</label>
                            <input
                              type="text"
                              className="field-input"
                              placeholder="Ví dụ: HACCP & Cold-Chain"
                              value={questionDraft.competency}
                              onChange={(e) => setQuestionDraft((d) => ({ ...d, competency: e.target.value }))}
                            />
                          </div>
                        </div>

                        {/* Trường hợp đặc biệt: Bối cảnh tình huống cho SCENARIO / CASE STUDY / SIMULATION */}
                        {(questionDraft.questionType === QUESTION_TYPES.SCENARIO_BASED || questionDraft.questionType === QUESTION_TYPES.CASE_STUDY || questionDraft.questionType === QUESTION_TYPES.SIMULATION) && (
                          <div style={{ marginBottom: 10 }}>
                            <label className="field-label" style={{ fontSize: 11, color: 'var(--rail)', fontWeight: 700 }}>
                              📖 Bối Cảnh Tình Huống / Dữ Liệu Tình Huống Thực Tế:
                            </label>
                            <textarea
                              className="field-input"
                              rows={3}
                              placeholder="Mô tả chi tiết tình huống, số liệu bán hàng, sự cố phát sinh tại cửa hàng..."
                              value={questionDraft.scenarioContext || ''}
                              onChange={(e) => setQuestionDraft((d) => ({ ...d, scenarioContext: e.target.value }))}
                            />
                          </div>
                        )}

                        {/* Trường hợp đặc biệt: URL Ảnh cho IMAGE_BASED / HOTSPOT */}
                        {(questionDraft.questionType === QUESTION_TYPES.IMAGE_BASED || questionDraft.questionType === QUESTION_TYPES.HOTSPOT) && (
                          <div style={{ marginBottom: 10 }}>
                            <label className="field-label" style={{ fontSize: 11, color: 'var(--rail)', fontWeight: 700 }}>
                              🖼️ Đường Dẫn Hình Ảnh Minh Họa (URL):
                            </label>
                            <input
                              type="url"
                              className="field-input"
                              placeholder="https://..."
                              value={questionDraft.imageUrl || ''}
                              onChange={(e) => setQuestionDraft((d) => ({ ...d, imageUrl: e.target.value }))}
                            />
                            {questionDraft.imageUrl && (
                              <div style={{ marginTop: 6, maxHeight: 120, overflow: 'hidden', borderRadius: 6, border: '1px solid var(--line)' }}>
                                <img src={questionDraft.imageUrl} alt="Minh họa" style={{ width: '100%', height: 'auto', objectFit: 'cover' }} />
                              </div>
                            )}
                          </div>
                        )}

                        {/* Trường hợp đặc biệt: URL Video cho VIDEO_BASED */}
                        {questionDraft.questionType === QUESTION_TYPES.VIDEO_BASED && (
                          <div style={{ marginBottom: 10 }}>
                            <label className="field-label" style={{ fontSize: 11, color: 'var(--rail)', fontWeight: 700 }}>
                              🎬 Đường Dẫn Video (URL / MP4 / Youtube):
                            </label>
                            <input
                              type="url"
                              className="field-input"
                              placeholder="https://..."
                              value={questionDraft.videoUrl || ''}
                              onChange={(e) => setQuestionDraft((d) => ({ ...d, videoUrl: e.target.value }))}
                            />
                          </div>
                        )}

                        {/* Nội dung câu hỏi chính */}
                        <div style={{ marginBottom: 12 }}>
                          <label className="field-label" style={{ fontSize: 11.5, fontWeight: 700 }}>
                            Nội Dung Câu Hỏi <span style={{ color: 'var(--rust)' }}>*</span>
                          </label>
                          <textarea
                            className="field-input"
                            rows={2}
                            placeholder="Nhập nội dung câu hỏi hoặc yêu cầu cần giải quyết..."
                            value={questionDraft.question}
                            onChange={(e) => setQuestionDraft((d) => ({ ...d, question: e.target.value }))}
                            required
                          />
                        </div>

                        {/* Dynamic Options Editor theo từng dạng câu hỏi */}
                        {(questionDraft.questionType === QUESTION_TYPES.SINGLE_CHOICE ||
                          questionDraft.questionType === QUESTION_TYPES.MULTIPLE_CHOICE ||
                          questionDraft.questionType === QUESTION_TYPES.TRUE_FALSE ||
                          questionDraft.questionType === QUESTION_TYPES.YES_NO ||
                          questionDraft.questionType === QUESTION_TYPES.SCENARIO_BASED ||
                          questionDraft.questionType === QUESTION_TYPES.CASE_STUDY ||
                          questionDraft.questionType === QUESTION_TYPES.HOTSPOT ||
                          questionDraft.questionType === QUESTION_TYPES.IMAGE_BASED ||
                          questionDraft.questionType === QUESTION_TYPES.VIDEO_BASED ||
                          questionDraft.questionType === QUESTION_TYPES.SIMULATION) && (
                          <div style={{ marginBottom: 12 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                              <label className="field-label" style={{ fontSize: 11, margin: 0 }}>
                                Các Lựa Chọn &amp; Đáp Án Đúng (Đánh dấu vào ô để chọn đáp án đúng):
                              </label>
                              {questionDraft.questionType !== QUESTION_TYPES.TRUE_FALSE && questionDraft.questionType !== QUESTION_TYPES.YES_NO && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setQuestionDraft((d) => ({
                                      ...d,
                                      options: [...(d.options || []), { id: `opt-${Date.now()}`, text: '', isCorrect: false }],
                                    }));
                                  }}
                                  style={{ background: 'none', border: 'none', color: 'var(--rail)', fontSize: 11, cursor: 'pointer', fontWeight: 600 }}
                                >
                                  + Thêm Lựa Chọn
                                </button>
                              )}
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                              {(questionDraft.options || []).map((opt, optIdx) => (
                                <div key={opt.id || optIdx} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <input
                                    type={questionDraft.questionType === QUESTION_TYPES.MULTIPLE_CHOICE ? 'checkbox' : 'radio'}
                                    name="correct-opt-group"
                                    checked={opt.isCorrect}
                                    onChange={() => {
                                      setQuestionDraft((d) => {
                                        const nextOpts = (d.options || []).map((o, idx) => {
                                          if (d.questionType === QUESTION_TYPES.MULTIPLE_CHOICE) {
                                            return idx === optIdx ? { ...o, isCorrect: !o.isCorrect } : o;
                                          }
                                          return { ...o, isCorrect: idx === optIdx };
                                        });
                                        return { ...d, options: nextOpts };
                                      });
                                    }}
                                    style={{ cursor: 'pointer', transform: 'scale(1.15)' }}
                                    title="Đánh dấu đây là đáp án đúng"
                                  />
                                  <input
                                    type="text"
                                    className="field-input"
                                    style={{ fontSize: 12, height: 32 }}
                                    placeholder={`Đáp án ${String.fromCharCode(65 + optIdx)}...`}
                                    value={opt.text}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setQuestionDraft((d) => ({
                                        ...d,
                                        options: (d.options || []).map((o, idx) => idx === optIdx ? { ...o, text: val } : o),
                                      }));
                                    }}
                                  />
                                  {questionDraft.options.length > 2 && questionDraft.questionType !== QUESTION_TYPES.TRUE_FALSE && questionDraft.questionType !== QUESTION_TYPES.YES_NO && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setQuestionDraft((d) => ({
                                          ...d,
                                          options: (d.options || []).filter((_, idx) => idx !== optIdx),
                                        }));
                                      }}
                                      style={{ background: 'none', border: 'none', color: 'var(--rust)', cursor: 'pointer', padding: 4 }}
                                      title="Xóa lựa chọn này"
                                    >
                                      <i className="ti ti-trash" />
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* 2. MATCHING PAIRS */}
                        {questionDraft.questionType === QUESTION_TYPES.MATCHING && (
                          <div style={{ marginBottom: 12 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                              <label className="field-label" style={{ fontSize: 11, margin: 0 }}>
                                Danh Sách Cặp Ghép Nối (Cột Trái ➔ Cột Phải):
                              </label>
                              <button
                                type="button"
                                onClick={() => {
                                  setQuestionDraft((d) => ({
                                    ...d,
                                    pairs: [...(d.pairs || []), { id: `p-${Date.now()}`, left: '', right: '' }],
                                  }));
                                }}
                                style={{ background: 'none', border: 'none', color: 'var(--rail)', fontSize: 11, cursor: 'pointer', fontWeight: 600 }}
                              >
                                + Thêm Cặp Ghép Nối
                              </button>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                              {(questionDraft.pairs || []).map((p, pIdx) => (
                                <div key={p.id || pIdx} style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr auto', gap: 6, alignItems: 'center' }}>
                                  <input
                                    type="text"
                                    className="field-input"
                                    style={{ fontSize: 11.5, height: 30 }}
                                    placeholder={`Vế trái ${pIdx + 1}...`}
                                    value={p.left}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setQuestionDraft((d) => ({
                                        ...d,
                                        pairs: (d.pairs || []).map((x, idx) => idx === pIdx ? { ...x, left: val } : x),
                                      }));
                                    }}
                                  />
                                  <i className="ti ti-arrow-right" style={{ color: 'var(--ink-faint)' }} />
                                  <input
                                    type="text"
                                    className="field-input"
                                    style={{ fontSize: 11.5, height: 30 }}
                                    placeholder={`Vế phải ${pIdx + 1} (khớp đúng)...`}
                                    value={p.right}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setQuestionDraft((d) => ({
                                        ...d,
                                        pairs: (d.pairs || []).map((x, idx) => idx === pIdx ? { ...x, right: val } : x),
                                      }));
                                    }}
                                  />
                                  {questionDraft.pairs.length > 2 && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setQuestionDraft((d) => ({
                                          ...d,
                                          pairs: (d.pairs || []).filter((_, idx) => idx !== pIdx),
                                        }));
                                      }}
                                      style={{ background: 'none', border: 'none', color: 'var(--rust)', cursor: 'pointer' }}
                                    >
                                      <i className="ti ti-trash" />
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* 3. ORDERING ITEMS */}
                        {questionDraft.questionType === QUESTION_TYPES.ORDERING && (
                          <div style={{ marginBottom: 12 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                              <label className="field-label" style={{ fontSize: 11, margin: 0 }}>
                                Thứ Tự Chuẩn Các Bước (Nhập theo đúng thứ tự 1 ➔ 2 ➔ 3):
                              </label>
                              <button
                                type="button"
                                onClick={() => {
                                  setQuestionDraft((d) => {
                                    const len = (d.sequenceItems || []).length;
                                    return {
                                      ...d,
                                      sequenceItems: [...(d.sequenceItems || []), { id: `seq-${Date.now()}`, text: '', correctOrder: len + 1 }],
                                    };
                                  });
                                }}
                                style={{ background: 'none', border: 'none', color: 'var(--rail)', fontSize: 11, cursor: 'pointer', fontWeight: 600 }}
                              >
                                + Thêm Bước
                              </button>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                              {(questionDraft.sequenceItems || []).map((s, sIdx) => (
                                <div key={s.id || sIdx} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <Badge tone="slate" size="sm">Bước {sIdx + 1}</Badge>
                                  <input
                                    type="text"
                                    className="field-input"
                                    style={{ fontSize: 11.5, height: 30 }}
                                    placeholder={`Mô tả bước ${sIdx + 1}...`}
                                    value={s.text}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setQuestionDraft((d) => ({
                                        ...d,
                                        sequenceItems: (d.sequenceItems || []).map((x, idx) => idx === sIdx ? { ...x, text: val } : x),
                                      }));
                                    }}
                                  />
                                  {questionDraft.sequenceItems.length > 2 && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setQuestionDraft((d) => ({
                                          ...d,
                                          sequenceItems: (d.sequenceItems || []).filter((_, idx) => idx !== sIdx),
                                        }));
                                      }}
                                      style={{ background: 'none', border: 'none', color: 'var(--rust)', cursor: 'pointer' }}
                                    >
                                      <i className="ti ti-trash" />
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* 4. FILL IN BLANK & SHORT ANSWER */}
                        {(questionDraft.questionType === QUESTION_TYPES.FILL_IN_BLANK || questionDraft.questionType === QUESTION_TYPES.SHORT_ANSWER) && (
                          <div style={{ marginBottom: 12 }}>
                            <label className="field-label" style={{ fontSize: 11 }}>
                              Từ Khóa Đáp Án Đúng (Phân tách bằng dấu phẩy nếu có nhiều cách viết đúng):
                            </label>
                            <input
                              type="text"
                              className="field-input"
                              style={{ fontSize: 12 }}
                              placeholder="Ví dụ: FIFO, First In First Out, Nhập trước xuất trước"
                              value={(questionDraft.correctKeywords || []).join(', ')}
                              onChange={(e) => {
                                const arr = e.target.value.split(',').map((x) => x.trim()).filter(Boolean);
                                setQuestionDraft((d) => ({ ...d, correctKeywords: arr }));
                              }}
                            />
                            <div style={{ fontSize: 10.5, color: 'var(--ink-faint)', marginTop: 2 }}>
                              Hệ thống sẽ đối chiếu câu trả lời của học viên không phân biệt hoa thường và bỏ qua khoảng trắng thừa.
                            </div>
                          </div>
                        )}

                        {/* Giải thích đáp án */}
                        <div style={{ marginBottom: 12 }}>
                          <label className="field-label" style={{ fontSize: 11 }}>Giải Thích Đáp Án (Feedback sau khi nộp)</label>
                          <textarea
                            className="field-input"
                            rows={2}
                            placeholder="Giải thích cơ sở khoa học hoặc quy chuẩn MMVN cho đáp án đúng..."
                            value={questionDraft.explanation}
                            onChange={(e) => setQuestionDraft((d) => ({ ...d, explanation: e.target.value }))}
                          />
                        </div>

                        {/* Actions */}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => { setEditingQuestionIndex(null); setQuestionDraft(null); }}
                          >
                            Hủy
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="primary"
                            icon="ti-check"
                            onClick={handleSaveQuestionDraft}
                          >
                            {editingQuestionIndex === -1 ? 'Lưu & Thêm Vào Đề' : 'Cập Nhật Câu Hỏi'}
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* DANH SÁCH CÂU HỎI ĐÃ TẠO */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {(formData.questions || []).map((q, idx) => {
                        const meta = QUESTION_TYPE_METADATA[q.questionType] || {};
                        const group = QUESTION_GROUPS[meta.group] || { tone: 'slate' };

                        return (
                          <div
                            key={q.id || idx}
                            className="card card-pad"
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'flex-start',
                              gap: 12,
                              padding: '10px 14px',
                              background: 'var(--paper-raised)',
                              border: '1px solid var(--line)',
                            }}
                          >
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}>
                                <Badge tone="slate" size="sm">Câu {idx + 1}</Badge>
                                <Badge tone={group.tone} size="sm">
                                  <i className={meta.icon || 'ti-help'} style={{ marginRight: 3 }} />
                                  {meta.label || q.questionType}
                                </Badge>
                                <Badge tone="blue" size="sm">{q.score || 10} điểm</Badge>
                                <span style={{ fontSize: 11, color: 'var(--ink-faint)' }}>({q.competency || 'General'})</span>
                              </div>

                              <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--ink)', marginBottom: 4 }}>
                                {q.question}
                              </div>

                              {/* Tóm tắt đáp án */}
                              <div style={{ fontSize: 11.5, color: 'var(--ink-soft)' }}>
                                {q.questionType === QUESTION_TYPES.MATCHING ? (
                                  <span>{q.options?.length || q.pairs?.length || 0} cặp ghép nối</span>
                                ) : q.questionType === QUESTION_TYPES.ORDERING ? (
                                  <span>{q.options?.length || q.sequenceItems?.length || 0} bước thứ tự quy trình</span>
                                ) : q.questionType === QUESTION_TYPES.FILL_IN_BLANK || q.questionType === QUESTION_TYPES.SHORT_ANSWER ? (
                                  <span>Từ khóa đúng: <em>{(q.correctKeywords || []).join(', ') || 'Chưa set'}</em></span>
                                ) : (
                                  <span>{q.options?.length || 0} lựa chọn (Đáp án đúng: <strong>{(q.options || []).filter((o) => o.isCorrect).map((o) => o.text).join(' &middot; ') || 'Chưa chọn'}</strong>)</span>
                                )}
                              </div>
                            </div>

                            <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                              <button
                                type="button"
                                className="btn btn-sm"
                                onClick={() => startEditQuestion(idx)}
                                title="Chỉnh sửa câu hỏi"
                                style={{ padding: '4px 8px' }}
                              >
                                <i className="ti ti-pencil" />
                              </button>
                              <button
                                type="button"
                                className="btn btn-sm"
                                onClick={() => handleDuplicateQuestion(idx)}
                                title="Nhân bản câu hỏi"
                                style={{ padding: '4px 8px' }}
                              >
                                <i className="ti ti-copy" />
                              </button>
                              <button
                                type="button"
                                className="btn btn-sm btn-danger"
                                onClick={() => handleDeleteQuestion(idx)}
                                title="Xóa câu hỏi"
                                style={{ padding: '4px 8px' }}
                              >
                                <i className="ti ti-trash" />
                              </button>
                            </div>
                          </div>
                        );
                      })}

                      {(formData.questions || []).length === 0 && (
                        <div style={{ textAlign: 'center', padding: 24, background: 'var(--paper-sunken)', borderRadius: 8, color: 'var(--ink-soft)' }}>
                          <i className="ti ti-notes" style={{ fontSize: 32, display: 'block', marginBottom: 6, color: 'var(--ink-faint)' }} />
                          <div>Chưa có câu hỏi nào được tạo trực tiếp cho bài thi này.</div>
                          <div style={{ fontSize: 11.5, marginTop: 4 }}>Bấm nút <strong>"Tạo Câu Hỏi Mới"</strong> ở trên để bắt đầu soạn câu hỏi theo 15 dạng hỗ trợ.</div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 2. SECTION: BÀI TẬP TỰ LUẬN (ASSIGNMENT) */}
            {selectedTypes.includes(ASSESSMENT_TYPES.ASSIGNMENT) && (
              <div className="card card-pad" style={{ background: 'var(--paper-raised)', border: '1px solid var(--line)' }}>
                <div style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--amber, #d97706)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <i className="ti ti-file-text" style={{ fontSize: 18 }} />
                  <span>Đề Bài Tự Luận &amp; Case Study Nộp Bài:</span>
                </div>

                <div style={{ border: '2px dashed var(--line)', padding: '16px', borderRadius: 8, textAlign: 'center', background: 'var(--paper-sunken)', marginBottom: 10 }}>
                  <i className="ti ti-upload" style={{ fontSize: 28, color: 'var(--rail)', display: 'block', marginBottom: 4 }} />
                  <div style={{ fontSize: 12.5, fontWeight: 600 }}>Tải lên file đề bài tự luận (PDF / DOCX)</div>
                  <input
                    type="file"
                    style={{ marginTop: 8 }}
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        patchForm({ documentUrl: `https://storage.mmvn.com/assessments/${e.target.files[0].name}` });
                      }
                    }}
                  />
                </div>
                <div className="field-group">
                  <label className="field-label">Hoặc Dán URL File Đề Bài</label>
                  <input
                    type="url"
                    className="field-input"
                    placeholder="https://storage.mmvn.com/assessments/De_Thi_Case_Study.pdf"
                    value={formData.documentUrl || ''}
                    onChange={(e) => patchForm({ documentUrl: e.target.value })}
                  />
                </div>
              </div>
            )}

            {/* 3. SECTION: KHẢO SÁT / SURVEY */}
            {selectedTypes.includes(ASSESSMENT_TYPES.SURVEY) && (
              <div className="card card-pad" style={{ background: 'var(--paper-raised)', border: '1px solid var(--line)' }}>
                <div style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--rail)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <i className="ti ti-forms" style={{ fontSize: 18 }} />
                  <span>Liên Kết Biểu Mẫu Khảo Sát (Google Form / MS Forms / CSAT):</span>
                </div>
                <div className="field-group">
                  <label className="field-label">Đường Dẫn Biểu Mẫu Trực Tuyến</label>
                  <input
                    type="url"
                    className="field-input"
                    placeholder="https://docs.google.com/forms/d/e/.../viewform"
                    value={formData.googleFormUrl || ''}
                    onChange={(e) => patchForm({ googleFormUrl: e.target.value })}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* BƯỚC 3: CHỐNG GIAN LẬN (ANTI-CHEAT)                     */}
        {/* ======================================================== */}
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

        {/* ======================================================== */}
        {/* BƯỚC 4: PHÂN BỔ ĐỐI TƯỢNG (CASCADING DRILL-DOWN FORMAT)    */}
        {/* ======================================================== */}
        {activeTab === 'ASSIGNMENTS' && isStandalone && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="card card-pad" style={{ background: 'var(--paper-sunken)', border: '1px solid var(--line-strong)' }}>
              {/* Header */}
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6, color: 'var(--rail)' }}>
                <i className="ti ti-sitemap" />
                <span>Phân Bổ Phân Tầng Theo Cơ Cấu Tổ Chức (Cascading Drill-Down)</span>
              </div>

              {/* Scope Buttons */}
              <div style={{ marginBottom: 12 }}>
                <label className="field-label" style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--ink)', marginBottom: 6 }}>
                  Chọn Cấp Độ Phân Bổ Mục Tiêu (Dừng ở cấp nào &rarr; Gán đối tượng ở cấp đó):
                </label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {SCOPE_BUTTONS.map((btn) => {
                    const active = assignScope === btn.id;
                    return (
                      <button
                        key={btn.id}
                        type="button"
                        onClick={() => handleScopeChange(btn.id)}
                        style={{
                          padding: '6px 12px',
                          borderRadius: 6,
                          fontSize: 11.5,
                          fontWeight: active ? 700 : 500,
                          border: active ? '1.5px solid var(--rail, #007A38)' : '1px solid var(--line)',
                          background: active ? 'var(--rail-soft, #ECFDF5)' : '#fff',
                          color: active ? 'var(--rail, #007A38)' : 'var(--ink)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                        }}
                      >
                        <i className={btn.icon} />
                        <span>{btn.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Khi chọn Toàn Doanh Nghiệp (Public) */}
              {assignScope === 'ALL' ? (
                <div style={{ background: 'var(--paper-raised)', padding: 14, borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid var(--line)' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--ink)' }}>🌐 Toàn Doanh Nghiệp (Public / Bắt Buộc)</div>
                    <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>Gán bài assessment công khai cho toàn bộ nhân sự trong hệ thống MM Mega Market.</div>
                  </div>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <input
                      type="date"
                      className="field-input"
                      style={{ width: 140, height: 32, fontSize: 12 }}
                      value={targetDueDate}
                      onChange={(e) => setTargetDueDate(e.target.value)}
                    />
                    <Button type="button" variant="primary" icon="ti-plus" onClick={handleAddCascadingAssignment}>
                      Thêm Gán Toàn Doanh Nghiệp
                    </Button>
                  </div>
                </div>
              ) : (
                /* Khi chọn phân tầng (Division, Dept, SubDept, Level, Store, User, Group) */
                <div style={{ padding: '10px 12px', background: '#fff', border: '1px solid var(--line)', borderRadius: 8, marginBottom: 12 }}>
                  {/* Cascading Filter Controls */}
                  <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--ink)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <i className="ti ti-filter" style={{ color: 'var(--blue, #3b82f6)' }} />
                    <span>Bộ Lọc Phân Tầng Liên Hoàn (Cascading Filters):</span>
                    <span style={{ fontSize: 11, color: 'var(--ink-faint)', fontWeight: 400 }}>
                      (Chọn cấp trên sẽ tự động giới hạn danh sách cấp dưới)
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 8 }}>
                    <div>
                      <label className="field-label" style={{ fontSize: 11, color: 'var(--ink-soft)' }}>🏢 1. Khối (Division)</label>
                      <select
                        className="field-select"
                        style={{ fontSize: 11.5, height: 32, width: '100%' }}
                        value={divisionFilter}
                        onChange={(e) => {
                          setDivisionFilter(e.target.value);
                          setDeptFilter('ALL');
                          setSubDeptFilter('ALL');
                          setSelectedTargetIds([]);
                        }}
                      >
                        <option value="ALL">-- Tất Cả Khối ({divisions.length}) --</option>
                        {divisions.map((d) => (
                          <option key={d.id} value={d.id}>[{d.code}] {d.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="field-label" style={{ fontSize: 11, color: 'var(--ink-soft)' }}>🏛️ 2. Phòng Ban (Department)</label>
                      <select
                        className="field-select"
                        style={{ fontSize: 11.5, height: 32, width: '100%' }}
                        value={deptFilter}
                        onChange={(e) => {
                          setDeptFilter(e.target.value);
                          setSubDeptFilter('ALL');
                          setSelectedTargetIds([]);
                        }}
                      >
                        <option value="ALL">-- Tất Cả Phòng Ban ({availableDepts.length}) --</option>
                        {availableDepts.map((d) => (
                          <option key={d.id} value={d.id}>[{d.code}] {d.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="field-label" style={{ fontSize: 11, color: 'var(--ink-soft)' }}>🌿 3. Sub-Dept (Bộ Phận)</label>
                      <select
                        className="field-select"
                        style={{ fontSize: 11.5, height: 32, width: '100%' }}
                        value={subDeptFilter}
                        onChange={(e) => {
                          setSubDeptFilter(e.target.value);
                          setSelectedTargetIds([]);
                        }}
                      >
                        <option value="ALL">-- Tất Cả Sub-Dept ({availableSubDepts.length}) --</option>
                        {availableSubDepts.map((s) => (
                          <option key={s.id} value={s.id}>[{s.code}] {s.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 12 }}>
                    <div>
                      <label className="field-label" style={{ fontSize: 11, color: 'var(--ink-soft)' }}>🎯 4. Cấp Bậc (Job Level)</label>
                      <select
                        className="field-select"
                        style={{ fontSize: 11.5, height: 32, width: '100%' }}
                        value={levelFilter}
                        onChange={(e) => { setLevelFilter(e.target.value); setSelectedTargetIds([]); }}
                      >
                        <option value="ALL">-- Tất Cả Cấp Bậc (Level 1 - 7) --</option>
                        {jobLevels.map((l) => (
                          <option key={l.level} value={String(l.level)}>Level {l.level} — {l.title}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="field-label" style={{ fontSize: 11, color: 'var(--ink-soft)' }}>📍 5. Chi Nhánh / Siêu Thị (Location)</label>
                      <select
                        className="field-select"
                        style={{ fontSize: 11.5, height: 32, width: '100%' }}
                        value={storeFilter}
                        onChange={(e) => { setStoreFilter(e.target.value); setSelectedTargetIds([]); }}
                      >
                        <option value="ALL">-- Tất Cả Chi Nhánh ({retailStores.length}) --</option>
                        {retailStores.map((s) => (
                          <option key={s.id} value={s.id}>[{s.code}] {s.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Target Items Checklist */}
                  <div style={{ padding: '8px 12px', background: 'var(--paper-sunken)', borderRadius: 6, marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)' }}>
                      💡 Đang đứng &amp; hiển thị danh sách để gán ở cấp: <strong>{assignmentTypeLabel(assignScope)}</strong>
                      <span style={{ fontSize: 11, color: 'var(--ink-soft)', marginLeft: 6 }}>({cascadingOptions.length} mục khả dụng)</span>
                    </div>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <input
                        type="text"
                        className="field-input"
                        style={{ height: 26, fontSize: 11, width: 160 }}
                        placeholder={`Tìm trong ${cascadingOptions.length} mục...`}
                        value={targetSearchQuery}
                        onChange={(e) => setTargetSearchQuery(e.target.value)}
                      />
                      <Button type="button" size="sm" variant="ghost" onClick={selectAllCascadingTargets}>Chọn Tất Cả ({cascadingOptions.length})</Button>
                      <Button type="button" size="sm" variant="ghost" onClick={deselectAllCascadingTargets}>Bỏ Chọn</Button>
                    </div>
                  </div>

                  <div style={{ maxHeight: 160, overflowY: 'auto', border: '1px solid var(--line)', borderRadius: 6, padding: 6, background: 'var(--paper-sunken)' }}>
                    {cascadingOptions.map((opt) => {
                      const isChecked = selectedTargetIds.includes(opt.id);
                      return (
                        <div
                          key={opt.id}
                          onClick={() => toggleTargetId(opt.id)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            padding: '5px 8px',
                            borderRadius: 4,
                            marginBottom: 2,
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
                          <div style={{ flex: 1, minWidth: 0, fontSize: 11.5 }}>
                            <strong style={{ color: isChecked ? 'var(--blue, #2563eb)' : 'var(--ink)' }}>{opt.label}</strong>
                            {opt.subtitle && <span style={{ fontSize: 10.5, color: 'var(--ink-faint)', marginLeft: 6 }}>({opt.subtitle})</span>}
                          </div>
                        </div>
                      );
                    })}
                    {cascadingOptions.length === 0 && (
                      <div style={{ padding: 16, textAlign: 'center', color: 'var(--ink-faint)', fontSize: 12 }}>
                        Không có đối tượng nào phù hợp bộ lọc phân tầng hoặc từ khóa tìm kiếm.
                      </div>
                    )}
                  </div>

                  {/* Due Date & Mandatory Controls */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr auto', gap: 10, alignItems: 'center', marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--line)' }}>
                    <div>
                      <label className="field-label" style={{ fontSize: 11, margin: 0 }}>Hạn Chót Hoàn Thành (Due Date)</label>
                      <input
                        type="date"
                        className="field-input"
                        style={{ height: 30, fontSize: 11.5 }}
                        value={targetDueDate}
                        onChange={(e) => setTargetDueDate(e.target.value)}
                      />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', paddingTop: 14 }}>
                      <label style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={targetMandatory}
                          onChange={(e) => setTargetMandatory(e.target.checked)}
                        />
                        <span>Bắt buộc hoàn thành</span>
                      </label>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 14 }}>
                      <Button
                        type="button"
                        variant="primary"
                        icon="ti-plus"
                        disabled={selectedTargetIds.length === 0}
                        onClick={handleAddCascadingAssignment}
                      >
                        Thêm Gán ({selectedTargetIds.length} đã chọn)
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Danh Sách Đã Gán */}
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

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 180, overflowY: 'auto' }}>
                {(formData.assignments || []).map((asg, idx) => (
                  <div
                    key={idx}
                    className="card card-pad"
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', background: 'var(--paper-raised)' }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ fontWeight: 700, fontSize: 12, color: 'var(--ink)' }}>{asg.targetName}</span>
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
                  <div style={{ padding: 14, textAlign: 'center', color: 'var(--ink-faint)', fontSize: 12, background: 'var(--paper-sunken)', borderRadius: 6 }}>
                    Chưa có đối tượng nào được gán cho bài assessment này.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* WIZARD FOOTER NAVIGATION CONTROLS                        */}
        {/* ======================================================== */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 18, borderTop: '1px solid var(--line)', paddingTop: 12 }}>
          {/* Back Buttons */}
          <div>
            {activeTab === 'GENERAL' && (
              <Button type="button" variant="ghost" onClick={onClose}>
                Hủy Bỏ
              </Button>
            )}
            {activeTab === 'CONTENT' && (
              <Button type="button" variant="ghost" icon="ti-arrow-left" onClick={() => setActiveTab('GENERAL')}>
                Quay Lại Cấu Hình Chung
              </Button>
            )}
            {activeTab === 'ANTI_CHEAT' && (
              <Button type="button" variant="ghost" icon="ti-arrow-left" onClick={() => setActiveTab('CONTENT')}>
                Quay Lại Định Dạng &amp; Đề Thi
              </Button>
            )}
            {activeTab === 'ASSIGNMENTS' && (
              <Button type="button" variant="ghost" icon="ti-arrow-left" onClick={() => setActiveTab('ANTI_CHEAT')}>
                Quay Lại Chống Gian Lận
              </Button>
            )}
          </div>

          {/* Forward / Save Buttons */}
          <div style={{ display: 'flex', gap: 8 }}>
            {activeTab === 'GENERAL' && (
              <Button type="button" variant="primary" icon="ti-arrow-right" onClick={() => setActiveTab('CONTENT')}>
                Tiếp Tục: Định Dạng &amp; Đề Thi
              </Button>
            )}
            {activeTab === 'CONTENT' && (
              <Button type="button" variant="primary" icon="ti-arrow-right" onClick={() => setActiveTab('ANTI_CHEAT')}>
                Tiếp Tục: Chống Gian Lận
              </Button>
            )}
            {activeTab === 'ANTI_CHEAT' && (
              isStandalone ? (
                <Button type="button" variant="primary" icon="ti-arrow-right" onClick={() => setActiveTab('ASSIGNMENTS')}>
                  Tiếp Tục: Phân Bổ Đối Tượng
                </Button>
              ) : (
                <Button type="button" variant="primary" icon="ti-check" onClick={handleSubmit}>
                  Hoàn Tất &amp; Lưu Assessment
                </Button>
              )
            )}
            {activeTab === 'ASSIGNMENTS' && (
              <Button type="button" variant="primary" icon="ti-check" onClick={handleSubmit}>
                Hoàn Tất &amp; Lưu Assessment
              </Button>
            )}
          </div>
        </div>
      </form>
    </Modal>
  );
}
