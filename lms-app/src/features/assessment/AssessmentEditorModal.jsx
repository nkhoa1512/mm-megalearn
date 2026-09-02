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

      // Extract the list of authored questions if any
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
          targetName: 'All Employees (Public / Mandatory)',
          dueDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
          isMandatory: true,
        },
      ],
    };
  });

  // Step 1 course search state
  const [courseSearch, setCourseSearch] = useState('');

  // Question Builder state (authoring questions directly in the platform)
  const [editingQuestionIndex, setEditingQuestionIndex] = useState(null); // null = close the authoring form, -1 = create new, >=0 = edit a specific question
  const [questionDraft, setQuestionDraft] = useState(null);
  const [selectedGroupTab, setSelectedGroupTab] = useState('BASIC'); // 'BASIC' | 'INTERMEDIATE' | 'ADVANCED' | 'ALL'

  // Step 4 state: cascading drill-down assignment
  const [assignScope, setAssignScope] = useState('DIVISION'); // 'DIVISION' | 'DEPARTMENT' | 'SUBDEPARTMENT' | 'LEVEL' | 'STORE' | 'USER' | 'GROUP' | 'ALL'
  const [buFilter, setBuFilter] = useState('ALL');
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

  // Courses available for the selected categories
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
      alert(`Question bank "${file.name}" uploaded successfully! Detected ${randomPool} questions in the file.`);
    }
  }

  // ==========================================
  // QUESTION BUILDER LOGIC (AUTHOR QUESTIONS DIRECTLY)
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
        { id: 'opt-true', text: 'True', isCorrect: true },
        { id: 'opt-false', text: 'Sai (False)', isCorrect: false },
      ];
    } else if (type === QUESTION_TYPES.YES_NO) {
      initialOptions = [
        { id: 'opt-yes', text: 'Yes / Agree', isCorrect: true },
        { id: 'opt-no', text: 'No / Decline', isCorrect: false },
      ];
    } else if (type === QUESTION_TYPES.MATCHING) {
      initialPairs = [
        { id: 'p1', left: 'Concept A', right: 'Matching definition A' },
        { id: 'p2', left: 'Concept B', right: 'Matching definition B' },
        { id: 'p3', left: 'Concept C', right: 'Matching definition C' },
      ];
    } else if (type === QUESTION_TYPES.ORDERING) {
      initialSequence = [
        { id: 'seq-1', text: 'Step 1: Receiving inspection & document check', correctOrder: 1 },
        { id: 'seq-2', text: 'Step 2: Measure the temperature and run the sensory check', correctOrder: 2 },
        { id: 'seq-3', text: 'Step 3: Apply the seal label and move into storage', correctOrder: 3 },
      ];
    } else if (type === QUESTION_TYPES.HOTSPOT) {
      initialHotspots = [
        { id: 'hs-1', label: 'The main violation point on the diagram', isCorrect: true, x: 50, y: 50, radius: 12 },
      ];
      initialOptions = [
        { id: 'hs-opt-1', text: 'The preparation area is cross-contaminated', isCorrect: true },
        { id: 'hs-opt-2', text: 'Sanitizing hand-wash area', isCorrect: false },
      ];
    } else if (type === QUESTION_TYPES.RATING_SCALE) {
      initialOptions = [
        { id: 'r1', text: '1 - Very dissatisfied', score: 1 },
        { id: 'r2', text: '2 - Dissatisfied', score: 2 },
        { id: 'r3', text: '3 - Neutral', score: 3 },
        { id: 'r4', text: '4 - Satisfied', score: 4 },
        { id: 'r5', text: '5 - Very satisfied', score: 5 },
      ];
    } else {
      // SCENARIO, CASE STUDY, IMAGE, VIDEO, SIMULATION, ESSAY
      initialOptions = [
        { id: `opt-1-${Date.now()}`, text: 'Best response option A', isCorrect: true },
        { id: `opt-2-${Date.now()}`, text: 'Option B', isCorrect: false },
        { id: `opt-3-${Date.now()}`, text: 'Option C', isCorrect: false },
      ];
    }

    setQuestionDraft({
      id: `QB-CUSTOM-${Date.now()}`,
      question: '',
      questionType: type,
      difficulty: 'MEDIUM',
      score: 10,
      topic: formData.categories[0] || 'Food Safety & Hygiene',
      competency: 'Core Expertise',
      explanation: '',
      options: initialOptions,
      pairs: initialPairs,
      sequenceItems: initialSequence,
      hotspots: initialHotspots,
      correctKeywords: [''],
      placeholderTemplate: 'Enter the answer or the expected keyword...',
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
      alert('Please enter the question text!');
      return;
    }

    // Reformat options / pairs appropriately before saving
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
    if (window.confirm('Are you sure you want to remove this question from the exam?')) {
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
      question: `${q.question} (Copy)`,
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
  // CASCADING DRILL-DOWN ASSIGNMENT LOGIC (STEP 4)
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
        targetName: 'All Employees (Public / Mandatory)',
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
      alert('Please tick at least one audience in the list!');
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
      alert('Please enter an assessment title!');
      setActiveTab('GENERAL');
      return;
    }

    const activeFormats = formData.contentFormats && formData.contentFormats.length > 0
      ? formData.contentFormats
      : (formData.contentFormat ? [formData.contentFormat] : [CONTENT_FORMATS.INTERACTIVE_BANK]);

    // Build the question description list
    const qTypes = [];
    const matrix = formData.questionMatrix || {};
    const selectedTypes = formData.types || [ASSESSMENT_TYPES.QUIZ];

    if (selectedTypes.includes(ASSESSMENT_TYPES.QUIZ)) {
      if (formData.quizSourceMode === 'DIRECT_BUILDER') {
        const count = (formData.questions || []).length;
        qTypes.push(`${count} questions authored directly in the system`);
      } else {
        const items = [];
        if (matrix.singleChoice > 0) items.push(`${matrix.singleChoice} Single choice`);
        if (matrix.multipleChoice > 0) items.push(`${matrix.multipleChoice} Multiple choice`);
        if (matrix.trueFalse > 0) items.push(`${matrix.trueFalse} True/False`);
        if (matrix.yesNo > 0) items.push(`${matrix.yesNo} Yes/No`);
        if (matrix.matching > 0) items.push(`${matrix.matching} Matching`);
        if (matrix.ordering > 0) items.push(`${matrix.ordering} Ordering`);
        if (matrix.fillInBlank > 0) items.push(`${matrix.fillInBlank} Fill in the blank`);
        if (matrix.shortAnswer > 0) items.push(`${matrix.shortAnswer} Short answer`);
        if (matrix.scenarioBased > 0) items.push(`${matrix.scenarioBased} Scenario`);
        if (matrix.caseStudy > 0) items.push(`${matrix.caseStudy} Case Study`);
        if (matrix.hotspot > 0) items.push(`${matrix.hotspot} Hotspot`);
        if (matrix.imageBase > 0) items.push(`${matrix.imageBase} Image`);
        if (matrix.videoBased > 0) items.push(`${matrix.videoBased} Video`);
        if (matrix.simulation > 0) items.push(`${matrix.simulation} Simulation`);
        if (matrix.essay > 0) items.push(`${matrix.essay} Essay`);
        qTypes.push(items.length > 0 ? items.join(', ') : `${formData.questionsPerAttempt || 4} random questions from the bank`);
      }
    }
    if (selectedTypes.includes(ASSESSMENT_TYPES.ASSIGNMENT)) {
      qTypes.push('Essay prompt file (PDF / Docx)');
    }
    if (selectedTypes.includes(ASSESSMENT_TYPES.SURVEY)) {
      qTypes.push('Google Form / CSAT survey form');
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
    { id: 'DIVISION', label: '1. Division', icon: 'ti-building-skyscraper' },
    { id: 'DEPARTMENT', label: '2. Department (Dept)', icon: 'ti-building' },
    { id: 'SUBDEPARTMENT', label: '3. Sub-Dept', icon: 'ti-git-branch' },
    { id: 'LEVEL', label: '4. Job Level', icon: 'ti-stairs-up' },
    { id: 'STORE', label: '5. Branch / Store', icon: 'ti-map-pin' },
    { id: 'USER', label: '6. Individual User', icon: 'ti-user' },
    { id: 'GROUP', label: '👥 Custom Group', icon: 'ti-users-group' },
    { id: 'ALL', label: '🌐 Enterprise-Wide', icon: 'ti-world' },
  ];

  return (
    <Modal
      title={
        isEditing
          ? `Edit Assessment: ${formData.title || formData.code}`
          : formData.isCourseExclusive
            ? `Create New Assessment For Course: ${formData.courseTitle || 'New Course'}`
            : 'Create New Assessment (Quiz / Assignment / Survey)'
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
            <span>General Settings</span>
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
            <span>Format &amp; Exam Paper</span>
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
            <span>Anti-Cheating</span>
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
              <span>Allocation ({formData.assignments?.length || 0})</span>
            </button>
          )}
        </div>

        {/* ======================================================== */}
        {/* STEP 1: GENERAL SETTINGS                                    */}
        {/* ======================================================== */}
        {activeTab === 'GENERAL' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Title & Code */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr', gap: 12 }}>
              <div className="field-group">
                <label className="field-label">Assessment Title <span style={{ color: 'var(--rust)' }}>*</span></label>
                <input
                  type="text"
                  className="field-input"
                  placeholder="Example: HACCP 2026 Food Hygiene & Safety Competency Assessment"
                  value={formData.title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  required
                />
              </div>
              <div className="field-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <label className="field-label" style={{ margin: 0 }}>Code</label>
                  <button
                    type="button"
                    onClick={regenerateCode}
                    style={{ background: 'none', border: 'none', color: 'var(--rail)', fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3 }}
                    title="Auto-generates a new code from the title's initials"
                  >
                    <i className="ti ti-refresh" /> Auto-generate code
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
              <label className="field-label">Survey / Assessment Description &amp; Purpose</label>
              <textarea
                className="field-input"
                rows={2}
                placeholder="Summarize the objective, the target audience and the competency outcomes..."
                value={formData.description}
                onChange={(e) => patchForm({ description: e.target.value })}
              />
            </div>

            {/* Assessment type (multi-select) */}
            <div className="card card-pad" style={{ background: 'var(--paper-sunken)' }}>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8, color: 'var(--ink)' }}>
                Assessment Type (you may combine several — the format in Step 2 follows this choice):
              </div>
              <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={selectedTypes.includes(ASSESSMENT_TYPES.QUIZ)}
                    onChange={() => toggleType(ASSESSMENT_TYPES.QUIZ)}
                  />
                  <span>📝 Quiz</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={selectedTypes.includes(ASSESSMENT_TYPES.ASSIGNMENT)}
                    onChange={() => toggleType(ASSESSMENT_TYPES.ASSIGNMENT)}
                  />
                  <span>📂 Essay Assignment</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={selectedTypes.includes(ASSESSMENT_TYPES.SURVEY)}
                    onChange={() => toggleType(ASSESSMENT_TYPES.SURVEY)}
                  />
                  <span>📊 Survey / CSAT</span>
                </label>
              </div>
            </div>

            {/* Delivery Format & Status */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="field-group">
                <label className="field-label">Delivery Format</label>
                {formData.isCourseExclusive ? (
                  <div style={{ background: 'var(--paper-sunken)', padding: '8px 10px', borderRadius: 6, fontSize: 12 }}>
                    <i className="ti ti-link" style={{ color: 'var(--rail)', marginRight: 5 }} />
                    <strong>Linked Course:</strong> [{formData.courseId}] {formData.courseTitle}
                    <div style={{ fontSize: 11, color: 'var(--ink-faint)', marginTop: 2 }}>
                      (This assessment was created from this course and is permanently linked)
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
                    <option value={DELIVERY_FORMATS.STANDALONE}>🎯 Standalone Assessment</option>
                    <option value={DELIVERY_FORMATS.COURSE_LINKED}>🔗 Course-linked</option>
                  </select>
                )}
              </div>

              <div className="field-group">
                <label className="field-label">Publication Status</label>
                <select
                  className="field-input"
                  value={formData.status}
                  onChange={(e) => patchForm({ status: e.target.value })}
                >
                  <option value="PUBLISHED">🟢 Published</option>
                  <option value="DRAFT">📝 Draft</option>
                </select>
              </div>
            </div>

            {/* Categories */}
            <div className="card card-pad" style={{ background: 'var(--paper-sunken)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--ink)' }}>
                  Specialist Area (Category) — Selected{(formData.categories || []).length}:
                </span>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    type="button"
                    onClick={selectAllCategories}
                    style={{ background: 'none', border: 'none', color: 'var(--rail)', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}
                  >
                    Select All
                  </button>
                  <span>&middot;</span>
                  <button
                    type="button"
                    onClick={clearAllCategories}
                    style={{ background: 'none', border: 'none', color: 'var(--ink-faint)', fontSize: 12, cursor: 'pointer' }}
                  >
                    Reset
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

            {/* When course-linked: filter the courses */}
            {formData.deliveryFormat === DELIVERY_FORMATS.COURSE_LINKED && !formData.isCourseExclusive && (
              <div className="card card-pad" style={{ background: 'var(--paper-raised)', border: '1px solid var(--line)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
                  <div>
                    <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--rail)' }}>
                      <i className="ti ti-link" style={{ marginRight: 4 }} />
                      Linked E-Learning Course:
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--ink-soft)', marginLeft: 6 }}>
                      (Selected: {(formData.courseIds || []).length})
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <input
                      type="text"
                      className="field-input"
                      style={{ height: 26, fontSize: 11, width: 140 }}
                      placeholder="Search courses..."
                      value={courseSearch}
                      onChange={(e) => setCourseSearch(e.target.value)}
                    />
                    <Button type="button" size="sm" variant="ghost" onClick={selectAllFilteredCourses}>Select All</Button>
                    <Button type="button" size="sm" variant="ghost" onClick={deselectAllCourses}>Deselect</Button>
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
                        <div style={{ flex: 1, minWidth: 0, fontSize: 12 }}>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-faint)', marginRight: 4 }}>[{c.code}]</span>
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
                <label className="field-label">Duration (Minutes)</label>
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
                <label className="field-label">Pass Score (%)</label>
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
                <label className="field-label">Maximum Attempts</label>
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
                <label className="field-label">Questions Drawn / Paper</label>
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
        {/* STEP 2: FORMAT & EXAM PAPER (FILTERED BY STEP 1)             */}
        {/* ======================================================== */}
        {activeTab === 'CONTENT' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Header info banner */}
            <div style={{ background: 'var(--paper-sunken)', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--line)', fontSize: 13 }}>
              <i className="ti ti-info-circle" style={{ color: 'var(--rail)', marginRight: 5 }} />
              Configure the exam content for the types selected in Step 1: <strong>{selectedTypes.map((t) => t === 'QUIZ' ? 'Multiple Choice' : t === 'ASSIGNMENT' ? 'Essay' : 'Survey').join(' & ')}</strong>.
            </div>

            {/* 1. SECTION: QUIZ */}
            {selectedTypes.includes(ASSESSMENT_TYPES.QUIZ) && (
              <div className="card card-pad" style={{ background: 'var(--paper-raised)', border: '1.5px solid var(--rail)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--rail)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <i className="ti ti-checklist" style={{ fontSize: 18 }} />
                    <span>Quiz Content:</span>
                  </div>

                  {/* Radio switch: import a file vs author directly */}
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
                      <span>Method 1: Import A Question Bank File</span>
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
                      <span>Method 2: Author Questions Directly In The Platform ({formData.questions?.length || 0})</span>
                    </button>
                  </div>
                </div>

                {/* OPTION 1: IMPORT A FILE & CONFIGURE THE 15-TYPE QUESTION MATRIX */}
                {formData.quizSourceMode === 'IMPORT' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {/* Upload Question Bank File */}
                    <div style={{ border: '2px dashed var(--line)', padding: '16px', borderRadius: 8, textAlign: 'center', background: 'var(--paper-sunken)' }}>
                      <i className="ti ti-file-spreadsheet" style={{ fontSize: 32, color: 'var(--sage)', display: 'block', marginBottom: 6 }} />
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>
                        In use: <strong style={{ color: 'var(--rail)' }}>{formData.uploadedFileName}</strong> ({formData.uploadedPoolSize} questions available)
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 2 }}>
                        Supports .xlsx, .csv, .docx and .json files. The system draws exam questions at random using the matrix below.
                      </div>
                      <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 10 }}>
                        <label className="btn btn-sm btn-primary" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                          <i className="ti ti-upload" /> Upload A New Question Bank File
                          <input type="file" accept=".xlsx,.csv,.docx,.json" onChange={handleFileUpload} style={{ display: 'none' }} />
                        </label>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          icon="ti-download"
                          onClick={() => alert('Downloading the template Template_Question_Bank_15_Types_MMVN.xlsx')}
                        >
                          Download The Excel Template (15 Types)
                        </Button>
                      </div>
                    </div>

                    {/* Configure The Question Draw Matrix Across 3 Difficulty Tiers (Basic, Intermediate, Advanced) */}
                    <div className="card card-pad" style={{ background: 'var(--paper-sunken)', border: '1px solid var(--line)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--ink)' }}>
                            <i className="ti ti-adjustments-horizontal" style={{ marginRight: 5, color: 'var(--rail)' }} />
                            Configure The Random Question Draw Matrix (all 15 question types):
                          </div>
                          <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
                            Configure how many of each question type are drawn at random from the bank file when a learner takes the exam:
                          </div>
                        </div>
                        <Badge tone="sage" size="md">
                          Total: {totalMatrixCount || formData.questionsPerAttempt} questions / paper
                        </Badge>
                      </div>

                      {/* Group 1: BASIC */}
                      <div style={{ marginBottom: 14 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--sage)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <i className="ti ti-circle-check" />
                          <span>1. Basic Tier:</span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                          <div style={{ background: 'var(--paper-raised)', padding: 8, borderRadius: 6, border: '1px solid var(--line)' }}>
                            <label className="field-label" style={{ fontSize: 11, margin: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span>🔘 Single Choice</span>
                              <input
                                type="number"
                                min="0"
                                max="50"
                                style={{ width: 50, height: 26, fontSize: 12, padding: '2px 4px' }}
                                className="field-input"
                                value={formData.questionMatrix?.singleChoice ?? 2}
                                onChange={(e) => patchMatrix('singleChoice', e.target.value)}
                              />
                            </label>
                          </div>
                          <div style={{ background: 'var(--paper-raised)', padding: 8, borderRadius: 6, border: '1px solid var(--line)' }}>
                            <label className="field-label" style={{ fontSize: 11, margin: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span>☑️ Multiple Choice</span>
                              <input
                                type="number"
                                min="0"
                                max="50"
                                style={{ width: 50, height: 26, fontSize: 12, padding: '2px 4px' }}
                                className="field-input"
                                value={formData.questionMatrix?.multipleChoice ?? 1}
                                onChange={(e) => patchMatrix('multipleChoice', e.target.value)}
                              />
                            </label>
                          </div>
                          <div style={{ background: 'var(--paper-raised)', padding: 8, borderRadius: 6, border: '1px solid var(--line)' }}>
                            <label className="field-label" style={{ fontSize: 11, margin: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span>⚖️ True / False</span>
                              <input
                                type="number"
                                min="0"
                                max="50"
                                style={{ width: 50, height: 26, fontSize: 12, padding: '2px 4px' }}
                                className="field-input"
                                value={formData.questionMatrix?.trueFalse ?? 1}
                                onChange={(e) => patchMatrix('trueFalse', e.target.value)}
                              />
                            </label>
                          </div>
                          <div style={{ background: 'var(--paper-raised)', padding: 8, borderRadius: 6, border: '1px solid var(--line)' }}>
                            <label className="field-label" style={{ fontSize: 11, margin: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span>👍 Yes / No</span>
                              <input
                                type="number"
                                min="0"
                                max="50"
                                style={{ width: 50, height: 26, fontSize: 12, padding: '2px 4px' }}
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
                          <span>2. Intermediate Tier:</span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                          <div style={{ background: 'var(--paper-raised)', padding: 8, borderRadius: 6, border: '1px solid var(--line)' }}>
                            <label className="field-label" style={{ fontSize: 11, margin: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span>🧩 Matching</span>
                              <input
                                type="number"
                                min="0"
                                max="20"
                                style={{ width: 50, height: 26, fontSize: 12, padding: '2px 4px' }}
                                className="field-input"
                                value={formData.questionMatrix?.matching ?? 0}
                                onChange={(e) => patchMatrix('matching', e.target.value)}
                              />
                            </label>
                          </div>
                          <div style={{ background: 'var(--paper-raised)', padding: 8, borderRadius: 6, border: '1px solid var(--line)' }}>
                            <label className="field-label" style={{ fontSize: 11, margin: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span>🔢 Process Order</span>
                              <input
                                type="number"
                                min="0"
                                max="20"
                                style={{ width: 50, height: 26, fontSize: 12, padding: '2px 4px' }}
                                className="field-input"
                                value={formData.questionMatrix?.ordering ?? 0}
                                onChange={(e) => patchMatrix('ordering', e.target.value)}
                              />
                            </label>
                          </div>
                          <div style={{ background: 'var(--paper-raised)', padding: 8, borderRadius: 6, border: '1px solid var(--line)' }}>
                            <label className="field-label" style={{ fontSize: 11, margin: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span>📝 Fill in the Blank</span>
                              <input
                                type="number"
                                min="0"
                                max="20"
                                style={{ width: 50, height: 26, fontSize: 12, padding: '2px 4px' }}
                                className="field-input"
                                value={formData.questionMatrix?.fillInBlank ?? 0}
                                onChange={(e) => patchMatrix('fillInBlank', e.target.value)}
                              />
                            </label>
                          </div>
                          <div style={{ background: 'var(--paper-raised)', padding: 8, borderRadius: 6, border: '1px solid var(--line)' }}>
                            <label className="field-label" style={{ fontSize: 11, margin: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span>💬 Short Answer</span>
                              <input
                                type="number"
                                min="0"
                                max="20"
                                style={{ width: 50, height: 26, fontSize: 12, padding: '2px 4px' }}
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
                          <span>3. Advanced Tier:</span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                          <div style={{ background: 'var(--paper-raised)', padding: 8, borderRadius: 6, border: '1px solid var(--line)' }}>
                            <label className="field-label" style={{ fontSize: 11, margin: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span>💼 Scenario</span>
                              <input
                                type="number"
                                min="0"
                                max="20"
                                style={{ width: 50, height: 26, fontSize: 12, padding: '2px 4px' }}
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
                                style={{ width: 50, height: 26, fontSize: 12, padding: '2px 4px' }}
                                className="field-input"
                                value={formData.questionMatrix?.caseStudy ?? 0}
                                onChange={(e) => patchMatrix('caseStudy', e.target.value)}
                              />
                            </label>
                          </div>
                          <div style={{ background: 'var(--paper-raised)', padding: 8, borderRadius: 6, border: '1px solid var(--line)' }}>
                            <label className="field-label" style={{ fontSize: 11, margin: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span>🎯 Image Hotspot</span>
                              <input
                                type="number"
                                min="0"
                                max="20"
                                style={{ width: 50, height: 26, fontSize: 12, padding: '2px 4px' }}
                                className="field-input"
                                value={formData.questionMatrix?.hotspot ?? 0}
                                onChange={(e) => patchMatrix('hotspot', e.target.value)}
                              />
                            </label>
                          </div>
                          <div style={{ background: 'var(--paper-raised)', padding: 8, borderRadius: 6, border: '1px solid var(--line)' }}>
                            <label className="field-label" style={{ fontSize: 11, margin: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span>🖼️ Image</span>
                              <input
                                type="number"
                                min="0"
                                max="20"
                                style={{ width: 50, height: 26, fontSize: 12, padding: '2px 4px' }}
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
                                style={{ width: 50, height: 26, fontSize: 12, padding: '2px 4px' }}
                                className="field-input"
                                value={formData.questionMatrix?.videoBased ?? 0}
                                onChange={(e) => patchMatrix('videoBased', e.target.value)}
                              />
                            </label>
                          </div>
                          <div style={{ background: 'var(--paper-raised)', padding: 8, borderRadius: 6, border: '1px solid var(--line)' }}>
                            <label className="field-label" style={{ fontSize: 11, margin: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span>🎮 Simulation</span>
                              <input
                                type="number"
                                min="0"
                                max="20"
                                style={{ width: 50, height: 26, fontSize: 12, padding: '2px 4px' }}
                                className="field-input"
                                value={formData.questionMatrix?.simulation ?? 0}
                                onChange={(e) => patchMatrix('simulation', e.target.value)}
                              />
                            </label>
                          </div>
                          <div style={{ background: 'var(--paper-raised)', padding: 8, borderRadius: 6, border: '1px solid var(--line)' }}>
                            <label className="field-label" style={{ fontSize: 11, margin: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span>✍️ In-Depth Essay</span>
                              <input
                                type="number"
                                min="0"
                                max="20"
                                style={{ width: 50, height: 26, fontSize: 12, padding: '2px 4px' }}
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
                                style={{ width: 50, height: 26, fontSize: 12, padding: '2px 4px' }}
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

                {/* OPTION 2: QUESTION BUILDER (AUTHOR QUESTIONS DIRECTLY IN THE PLATFORM) */}
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
                          Create New Question
                        </Button>
                      </div>

                      <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
                        Created <strong>{(formData.questions || []).length} questions</strong> for this assessment
                      </div>
                    </div>

                    {/* QUESTION AUTHORING FORM (WHEN CREATING OR EDITING) */}
                    {editingQuestionIndex !== null && questionDraft && (
                      <div className="card card-pad" style={{ background: 'var(--paper-sunken)', border: '2px solid var(--rail)', borderRadius: 8 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, borderBottom: '1px solid var(--line)', paddingBottom: 8 }}>
                          <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--rail)' }}>
                            <i className="ti ti-edit" style={{ marginRight: 4 }} />
                            {editingQuestionIndex === -1 ? 'Author A New Question' : `Edit Question #${editingQuestionIndex + 1}`}
                          </div>
                          <button
                            type="button"
                            onClick={() => { setEditingQuestionIndex(null); setQuestionDraft(null); }}
                            style={{ background: 'none', border: 'none', color: 'var(--ink-soft)', cursor: 'pointer', fontSize: 14 }}
                          >
                            <i className="ti ti-x" />
                          </button>
                        </div>

                        {/* Choose one of the 15 question types */}
                        <div style={{ marginBottom: 12 }}>
                          <label className="field-label" style={{ fontSize: 12 }}>
                            Choose The Question Type (15 supported):
                          </label>
                          <select
                            className="field-input"
                            value={questionDraft.questionType}
                            onChange={(e) => startCreateQuestion(e.target.value)}
                          >
                            <optgroup label="🟢 Basic Tier">
                              <option value={QUESTION_TYPES.SINGLE_CHOICE}>🔘 Single Choice</option>
                              <option value={QUESTION_TYPES.MULTIPLE_CHOICE}>☑️ Multiple Choice</option>
                              <option value={QUESTION_TYPES.TRUE_FALSE}>⚖️ True / False</option>
                              <option value={QUESTION_TYPES.YES_NO}>👍 Yes / No</option>
                            </optgroup>
                            <optgroup label="🟡 Intermediate Tier">
                              <option value={QUESTION_TYPES.MATCHING}>🧩 Matching</option>
                              <option value={QUESTION_TYPES.ORDERING}>🔢 Ordering / Sequence</option>
                              <option value={QUESTION_TYPES.FILL_IN_BLANK}>📝 Fill in the Blank</option>
                              <option value={QUESTION_TYPES.SHORT_ANSWER}>💬 Short Answer</option>
                            </optgroup>
                            <optgroup label="🟣 Advanced Tier">
                              <option value={QUESTION_TYPES.SCENARIO_BASED}>💼 Real-World Scenario (Scenario-based)</option>
                              <option value={QUESTION_TYPES.CASE_STUDY}>📖 Case Study</option>
                              <option value={QUESTION_TYPES.HOTSPOT}>🎯 Image Hotspot</option>
                              <option value={QUESTION_TYPES.IMAGE_BASED}>🖼️ Image-Based Question</option>
                              <option value={QUESTION_TYPES.VIDEO_BASED}>🎬 Video-Based Question</option>
                              <option value={QUESTION_TYPES.SIMULATION}>🎮 Situational Simulation</option>
                              <option value={QUESTION_TYPES.ESSAY}>✍️ In-Depth Essay</option>
                            </optgroup>
                            <optgroup label="📊 Survey &amp; Assessment">
                              <option value={QUESTION_TYPES.RATING_SCALE}>⭐ Rating Scale (CSAT / Likert)</option>
                            </optgroup>
                          </select>
                        </div>

                        {/* Score & Difficulty & Competency */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.5fr', gap: 10, marginBottom: 12 }}>
                          <div>
                            <label className="field-label" style={{ fontSize: 11 }}>Score</label>
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
                            <label className="field-label" style={{ fontSize: 11 }}>Difficulty</label>
                            <select
                              className="field-input"
                              value={questionDraft.difficulty}
                              onChange={(e) => setQuestionDraft((d) => ({ ...d, difficulty: e.target.value }))}
                            >
                              <option value="EASY">Easy</option>
                              <option value="MEDIUM">Medium</option>
                              <option value="HARD">Hard</option>
                              <option value="EXPERT">Expert</option>
                            </select>
                          </div>
                          <div>
                            <label className="field-label" style={{ fontSize: 11 }}>Competency Assessed</label>
                            <input
                              type="text"
                              className="field-input"
                              placeholder="Example: HACCP & Cold-Chain"
                              value={questionDraft.competency}
                              onChange={(e) => setQuestionDraft((d) => ({ ...d, competency: e.target.value }))}
                            />
                          </div>
                        </div>

                        {/* Special case: scenario context for SCENARIO / CASE STUDY / SIMULATION */}
                        {(questionDraft.questionType === QUESTION_TYPES.SCENARIO_BASED || questionDraft.questionType === QUESTION_TYPES.CASE_STUDY || questionDraft.questionType === QUESTION_TYPES.SIMULATION) && (
                          <div style={{ marginBottom: 10 }}>
                            <label className="field-label" style={{ fontSize: 11, color: 'var(--rail)', fontWeight: 700 }}>
                              📖 Scenario Context / Real-World Case Data:
                            </label>
                            <textarea
                              className="field-input"
                              rows={3}
                              placeholder="Describe the scenario in detail, sales figures, the incident at the store..."
                              value={questionDraft.scenarioContext || ''}
                              onChange={(e) => setQuestionDraft((d) => ({ ...d, scenarioContext: e.target.value }))}
                            />
                          </div>
                        )}

                        {/* Special case: image URL for IMAGE_BASED / HOTSPOT */}
                        {(questionDraft.questionType === QUESTION_TYPES.IMAGE_BASED || questionDraft.questionType === QUESTION_TYPES.HOTSPOT) && (
                          <div style={{ marginBottom: 10 }}>
                            <label className="field-label" style={{ fontSize: 11, color: 'var(--rail)', fontWeight: 700 }}>
                              🖼️ Illustration Image URL:
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
                                <img src={questionDraft.imageUrl} alt="Illustration" style={{ width: '100%', height: 'auto', objectFit: 'cover' }} />
                              </div>
                            )}
                          </div>
                        )}

                        {/* Special case: video URL for VIDEO_BASED */}
                        {questionDraft.questionType === QUESTION_TYPES.VIDEO_BASED && (
                          <div style={{ marginBottom: 10 }}>
                            <label className="field-label" style={{ fontSize: 11, color: 'var(--rail)', fontWeight: 700 }}>
                              🎬 Video URL (URL / MP4 / YouTube):
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

                        {/* Main question text */}
                        <div style={{ marginBottom: 12 }}>
                          <label className="field-label" style={{ fontSize: 12, fontWeight: 700 }}>
                            Question Text <span style={{ color: 'var(--rust)' }}>*</span>
                          </label>
                          <textarea
                            className="field-input"
                            rows={2}
                            placeholder="Enter the question text or the task to be solved..."
                            value={questionDraft.question}
                            onChange={(e) => setQuestionDraft((d) => ({ ...d, question: e.target.value }))}
                            required
                          />
                        </div>

                        {/* Dynamic options editor per question type */}
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
                                Options &amp; Correct Answers (tick the box to mark the correct answer):
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
                                  + Add Option
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
                                    title="Mark this as the correct answer"
                                  />
                                  <input
                                    type="text"
                                    className="field-input"
                                    style={{ fontSize: 12, height: 32 }}
                                    placeholder={`Option ${String.fromCharCode(65 + optIdx)}...`}
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
                                      title="Remove this option"
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
                                Matching Pairs (left column ➔ right column):
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
                                + Add Matching Pair
                              </button>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                              {(questionDraft.pairs || []).map((p, pIdx) => (
                                <div key={p.id || pIdx} style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr auto', gap: 6, alignItems: 'center' }}>
                                  <input
                                    type="text"
                                    className="field-input"
                                    style={{ fontSize: 12, height: 30 }}
                                    placeholder={`Left side ${pIdx + 1}...`}
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
                                    style={{ fontSize: 12, height: 30 }}
                                    placeholder={`Right side ${pIdx + 1} (the match)...`}
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
                                Correct Step Order (enter them in the order 1 ➔ 2 ➔ 3):
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
                                + Add Step
                              </button>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                              {(questionDraft.sequenceItems || []).map((s, sIdx) => (
                                <div key={s.id || sIdx} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <Badge tone="slate" size="sm">Step {sIdx + 1}</Badge>
                                  <input
                                    type="text"
                                    className="field-input"
                                    style={{ fontSize: 12, height: 30 }}
                                    placeholder={`Describe step ${sIdx + 1}...`}
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
                              Correct Answer Keywords (separate with commas if several spellings are accepted):
                            </label>
                            <input
                              type="text"
                              className="field-input"
                              style={{ fontSize: 12 }}
                              placeholder="Example: FIFO, First In First Out, first in first out"
                              value={(questionDraft.correctKeywords || []).join(', ')}
                              onChange={(e) => {
                                const arr = e.target.value.split(',').map((x) => x.trim()).filter(Boolean);
                                setQuestionDraft((d) => ({ ...d, correctKeywords: arr }));
                              }}
                            />
                            <div style={{ fontSize: 11, color: 'var(--ink-faint)', marginTop: 2 }}>
                              The system compares learner answers case-insensitively and ignores extra whitespace.
                            </div>
                          </div>
                        )}

                        {/* Answer explanation */}
                        <div style={{ marginBottom: 12 }}>
                          <label className="field-label" style={{ fontSize: 11 }}>Answer Explanation (feedback shown after submission)</label>
                          <textarea
                            className="field-input"
                            rows={2}
                            placeholder="Explain the scientific basis or the MMVN standard behind the correct answer..."
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
                            Cancel
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="primary"
                            icon="ti-check"
                            onClick={handleSaveQuestionDraft}
                          >
                            {editingQuestionIndex === -1 ? 'Save & Add To Paper' : 'Update Question'}
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* AUTHORED QUESTION LIST */}
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
                                <Badge tone="slate" size="sm">Question {idx + 1}</Badge>
                                <Badge tone={group.tone} size="sm">
                                  <i className={meta.icon || 'ti-help'} style={{ marginRight: 3 }} />
                                  {meta.label || q.questionType}
                                </Badge>
                                <Badge tone="blue" size="sm">{q.score || 10} points</Badge>
                                <span style={{ fontSize: 11, color: 'var(--ink-faint)' }}>({q.competency || 'General'})</span>
                              </div>

                              <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--ink)', marginBottom: 4 }}>
                                {q.question}
                              </div>

                              {/* Answer summary */}
                              <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
                                {q.questionType === QUESTION_TYPES.MATCHING ? (
                                  <span>{q.options?.length || q.pairs?.length || 0} matching pairs</span>
                                ) : q.questionType === QUESTION_TYPES.ORDERING ? (
                                  <span>{q.options?.length || q.sequenceItems?.length || 0} ordered process steps</span>
                                ) : q.questionType === QUESTION_TYPES.FILL_IN_BLANK || q.questionType === QUESTION_TYPES.SHORT_ANSWER ? (
                                  <span>Expected keywords: <em>{(q.correctKeywords || []).join(', ') || 'Not set'}</em></span>
                                ) : (
                                  <span>{q.options?.length || 0} options (correct answer: <strong>{(q.options || []).filter((o) => o.isCorrect).map((o) => o.text).join(' &middot; ') || 'Not selected'}</strong>)</span>
                                )}
                              </div>
                            </div>

                            <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                              <button
                                type="button"
                                className="btn btn-sm"
                                onClick={() => startEditQuestion(idx)}
                                title="Edit question"
                                style={{ padding: '4px 8px' }}
                              >
                                <i className="ti ti-pencil" />
                              </button>
                              <button
                                type="button"
                                className="btn btn-sm"
                                onClick={() => handleDuplicateQuestion(idx)}
                                title="Duplicate question"
                                style={{ padding: '4px 8px' }}
                              >
                                <i className="ti ti-copy" />
                              </button>
                              <button
                                type="button"
                                className="btn btn-sm btn-danger"
                                onClick={() => handleDeleteQuestion(idx)}
                                title="Delete question"
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
                          <div>No questions have been authored directly for this exam yet.</div>
                          <div style={{ fontSize: 12, marginTop: 4 }}>Press the button <strong>"Create New Question"</strong> above to start authoring questions across the 15 supported types.</div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 2. SECTION: ESSAY ASSIGNMENT */}
            {selectedTypes.includes(ASSESSMENT_TYPES.ASSIGNMENT) && (
              <div className="card card-pad" style={{ background: 'var(--paper-raised)', border: '1px solid var(--line)' }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--amber, #d97706)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <i className="ti ti-file-text" style={{ fontSize: 18 }} />
                  <span>Essay Prompt &amp; Case Study Submission:</span>
                </div>

                <div style={{ border: '2px dashed var(--line)', padding: '16px', borderRadius: 8, textAlign: 'center', background: 'var(--paper-sunken)', marginBottom: 10 }}>
                  <i className="ti ti-upload" style={{ fontSize: 28, color: 'var(--rail)', display: 'block', marginBottom: 4 }} />
                  <div style={{ fontSize: 13, fontWeight: 600 }}>Upload the essay prompt file (PDF / DOCX)</div>
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
                  <label className="field-label">Or Paste The Prompt File URL</label>
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

            {/* 3. SECTION: SURVEY */}
            {selectedTypes.includes(ASSESSMENT_TYPES.SURVEY) && (
              <div className="card card-pad" style={{ background: 'var(--paper-raised)', border: '1px solid var(--line)' }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--rail)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <i className="ti ti-forms" style={{ fontSize: 18 }} />
                  <span>Link A Survey Form (Google Form / MS Forms / CSAT):</span>
                </div>
                <div className="field-group">
                  <label className="field-label">Online Form URL</label>
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
        {/* STEP 3: ANTI-CHEATING                     */}
        {/* ======================================================== */}
        {activeTab === 'ANTI_CHEAT' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="card card-pad" style={{ background: 'var(--paper-sunken)', fontSize: 13 }}>
              <div style={{ fontWeight: 700, color: 'var(--rail)', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <i className="ti ti-shield-check" style={{ fontSize: 18 }} />
                Proctoring &amp; Anti-Cheating Policy (Enterprise Proctoring)
              </div>
              <p style={{ margin: 0, color: 'var(--ink-soft)' }}>
                Enables exam session controls: tab-switch detection, a learner-name watermark and clipboard copy locking.
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
                  <div style={{ fontWeight: 700, fontSize: 13 }}>Force Fullscreen Mode</div>
                  <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>Automatically locks fullscreen mode when the exam starts.</div>
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
                  <div style={{ fontWeight: 700, fontSize: 13 }}>Tab-Switch Monitoring &amp; Alerts</div>
                  <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>Warns when the user leaves the exam screen or opens another tab.</div>
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
                  <div style={{ fontWeight: 700, fontSize: 13 }}>Shuffle Question Order</div>
                  <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>Every learner gets a random question order.</div>
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
                  <div style={{ fontWeight: 700, fontSize: 13 }}>Shuffle Answers (A, B, C, D)</div>
                  <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>Randomizes the position of the options in a multiple-choice question.</div>
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
                  <div style={{ fontWeight: 700, fontSize: 13 }}>Employee Name &amp; Timestamp Watermark</div>
                  <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>Watermarks the full name + employee ID on screen to deter screenshots of the paper.</div>
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
                  <div style={{ fontWeight: 700, fontSize: 13 }}>Block Copy / Paste</div>
                  <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>Blocks selecting and copying a question to paste into AI/Search.</div>
                </div>
              </label>
            </div>

            <div className="field-group" style={{ maxWidth: 300 }}>
              <label className="field-label">Maximum Tab Switches Allowed</label>
              <input
                type="number"
                min="0"
                max="10"
                className="field-input"
                value={formData.antiCheatSettings.maxTabSwitches}
                onChange={(e) => patchAntiCheat({ maxTabSwitches: Number(e.target.value) })}
              />
              <span style={{ fontSize: 11, color: 'var(--ink-faint)' }}>Beyond this count the system submits the paper automatically.</span>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* STEP 4: ALLOCATE THE AUDIENCE (CASCADING DRILL-DOWN FORMAT)    */}
        {/* ======================================================== */}
        {activeTab === 'ASSIGNMENTS' && isStandalone && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="card card-pad" style={{ background: 'var(--paper-sunken)', border: '1px solid var(--line-strong)' }}>
              {/* Header */}
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6, color: 'var(--rail)' }}>
                <i className="ti ti-sitemap" />
                <span>Cascading Drill-Down Allocation By Org Structure</span>
              </div>

              {/* Scope Buttons */}
              <div style={{ marginBottom: 12 }}>
                <label className="field-label" style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)', marginBottom: 6 }}>
                  Choose The Target Allocation Level (whichever level you stop at &rarr; assign the audience there):
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
                          fontSize: 12,
                          fontWeight: active ? 700 : 500,
                          border: active ? '1.5px solid var(--rail, #007A38)' : '1px solid var(--line)',
                          background: active ? 'var(--rail-soft, #ECFDF5)' : 'var(--paper-raised)',
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

              {/* When Enterprise-Wide (Public) is chosen */}
              {assignScope === 'ALL' ? (
                <div style={{ background: 'var(--paper-raised)', padding: 14, borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid var(--line)' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--ink)' }}>🌐 Enterprise-Wide (Public / Mandatory)</div>
                    <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>Assign this assessment publicly to every employee in the MM Mega Market system.</div>
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
                      Add An Enterprise-Wide Assignment
                    </Button>
                  </div>
                </div>
              ) : (
                /* When drilling down (Division, Dept, SubDept, Level, Store, User, Group) */
                <div>
                  {/* Case A: DEPARTMENT Scope Filter (Only Division Filter needed) */}
                  {assignScope === 'DEPARTMENT' && (
                    <div style={{ padding: '10px 12px', background: 'var(--paper-raised)', border: '1px solid var(--line)', borderRadius: 8, marginBottom: 12 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <i className="ti ti-filter" style={{ color: 'var(--blue, #3b82f6)' }} />
                        <span>Filter by Division:</span>
                        <span style={{ fontSize: 11, color: 'var(--ink-faint)', fontWeight: 400 }}>(Choose a Division to narrow the departments to assign)</span>
                      </div>
                      <div style={{ maxWidth: 450 }}>
                        <label className="field-label" style={{ fontSize: 11, color: 'var(--ink-soft)' }}>🏢 1. Filter by Division</label>
                        <select
                          className="field-select"
                          style={{ fontSize: 12, height: 32, width: '100%' }}
                          value={divisionFilter}
                          onChange={(e) => {
                            setDivisionFilter(e.target.value);
                            setDeptFilter('ALL');
                            setSubDeptFilter('ALL');
                            setSelectedTargetIds([]);
                          }}
                        >
                          <option value="ALL">-- All Division ({divisions.length}) --</option>
                          {divisions.map((d) => (
                            <option key={d.id} value={d.id}>[{d.code}] {d.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}

                  {/* Case B: SUBDEPARTMENT Scope Filters (Division & Dept Filters) */}
                  {assignScope === 'SUBDEPARTMENT' && (
                    <div style={{ padding: '10px 12px', background: 'var(--paper-raised)', border: '1px solid var(--line)', borderRadius: 8, marginBottom: 12 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <i className="ti ti-filter" style={{ color: 'var(--blue, #3b82f6)' }} />
                        <span>Parent-Level Cascading Filters:</span>
                        <span style={{ fontSize: 11, color: 'var(--ink-faint)', fontWeight: 400 }}>(Choose a Division / Department to filter Sub-Depts quickly)</span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
                        <div>
                          <label className="field-label" style={{ fontSize: 11, color: 'var(--ink-soft)' }}>🏢 1. Division</label>
                          <select
                            className="field-select"
                            style={{ fontSize: 12, height: 32, width: '100%' }}
                            value={divisionFilter}
                            onChange={(e) => {
                              setDivisionFilter(e.target.value);
                              setDeptFilter('ALL');
                              setSubDeptFilter('ALL');
                              setSelectedTargetIds([]);
                            }}
                          >
                            <option value="ALL">-- All Division ({divisions.length}) --</option>
                            {divisions.map((d) => (
                              <option key={d.id} value={d.id}>[{d.code}] {d.name}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="field-label" style={{ fontSize: 11, color: 'var(--ink-soft)' }}>🏛️ 2. Department</label>
                          <select
                            className="field-select"
                            style={{ fontSize: 12, height: 32, width: '100%' }}
                            value={deptFilter}
                            onChange={(e) => {
                              const nextDept = e.target.value;
                              setDeptFilter(nextDept);
                              if (nextDept !== 'ALL') {
                                const deptObj = departments.find((d) => d.id === nextDept);
                                if (deptObj && deptObj.divisionId) setDivisionFilter(deptObj.divisionId);
                              }
                              setSubDeptFilter('ALL');
                              setSelectedTargetIds([]);
                            }}
                          >
                            <option value="ALL">-- All Department ({availableDepts.length}) --</option>
                            {availableDepts.map((d) => (
                              <option key={d.id} value={d.id}>[{d.code}] {d.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Case C: USER Scope Filters (Full Cascading 5-Filter Matrix) */}
                  {assignScope === 'USER' && (
                    <div style={{ padding: '10px 12px', background: 'var(--paper-raised)', border: '1px solid var(--line)', borderRadius: 8, marginBottom: 12 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <i className="ti ti-filter" style={{ color: 'var(--blue, #3b82f6)' }} />
                        <span>Cascading User Filters:</span>
                        <span style={{ fontSize: 11, color: 'var(--ink-faint)', fontWeight: 400 }}>
                          (Choosing a higher level automatically narrows the list below)
                        </span>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 8 }}>
                        <div>
                          <label className="field-label" style={{ fontSize: 11, color: 'var(--ink-soft)' }}>🏢 1. Division</label>
                          <select
                            className="field-select"
                            style={{ fontSize: 12, height: 32, width: '100%' }}
                            value={divisionFilter}
                            onChange={(e) => {
                              setDivisionFilter(e.target.value);
                              setDeptFilter('ALL');
                              setSubDeptFilter('ALL');
                              setSelectedTargetIds([]);
                            }}
                          >
                            <option value="ALL">-- All Division ({divisions.length}) --</option>
                            {divisions.map((d) => (
                              <option key={d.id} value={d.id}>[{d.code}] {d.name}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="field-label" style={{ fontSize: 11, color: 'var(--ink-soft)' }}>🏛️ 2. Department</label>
                          <select
                            className="field-select"
                            style={{ fontSize: 12, height: 32, width: '100%' }}
                            value={deptFilter}
                            onChange={(e) => {
                              const nextDept = e.target.value;
                              setDeptFilter(nextDept);
                              if (nextDept !== 'ALL') {
                                const deptObj = departments.find((d) => d.id === nextDept);
                                if (deptObj && deptObj.divisionId) setDivisionFilter(deptObj.divisionId);
                              }
                              setSubDeptFilter('ALL');
                              setSelectedTargetIds([]);
                            }}
                          >
                            <option value="ALL">-- All Department ({availableDepts.length}) --</option>
                            {availableDepts.map((d) => (
                              <option key={d.id} value={d.id}>[{d.code}] {d.name}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="field-label" style={{ fontSize: 11, color: 'var(--ink-soft)' }}>🌿 3. Sub-Dept</label>
                          <select
                            className="field-select"
                            style={{ fontSize: 12, height: 32, width: '100%' }}
                            value={subDeptFilter}
                            onChange={(e) => {
                              const nextSub = e.target.value;
                              setSubDeptFilter(nextSub);
                              if (nextSub !== 'ALL') {
                                const subObj = subDepartments.find((s) => s.id === nextSub);
                                if (subObj && subObj.departmentId) {
                                  setDeptFilter(subObj.departmentId);
                                  const deptObj = departments.find((d) => d.id === subObj.departmentId);
                                  if (deptObj && deptObj.divisionId) setDivisionFilter(deptObj.divisionId);
                                }
                              }
                              setSelectedTargetIds([]);
                            }}
                          >
                            <option value="ALL">-- All Sub-Dept ({availableSubDepts.length}) --</option>
                            {availableSubDepts.map((s) => (
                              <option key={s.id} value={s.id}>[{s.code}] {s.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 12 }}>
                        <div>
                          <label className="field-label" style={{ fontSize: 11, color: 'var(--ink-soft)' }}>🎯 4. Job Level</label>
                          <select
                            className="field-select"
                            style={{ fontSize: 12, height: 32, width: '100%' }}
                            value={levelFilter}
                            onChange={(e) => { setLevelFilter(e.target.value); setSelectedTargetIds([]); }}
                          >
                            <option value="ALL">-- All Levels (Level 1 - 7) --</option>
                            {jobLevels.map((l) => (
                              <option key={l.level} value={String(l.level)}>Level {l.level} — {l.title}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="field-label" style={{ fontSize: 11, color: 'var(--ink-soft)' }}>📍 5. Branch / Store (Location)</label>
                          <select
                            className="field-select"
                            style={{ fontSize: 12, height: 32, width: '100%' }}
                            value={storeFilter}
                            onChange={(e) => { setStoreFilter(e.target.value); setSelectedTargetIds([]); }}
                          >
                            <option value="ALL">-- All Branches ({retailStores.length}) --</option>
                            {retailStores.map((s) => (
                              <option key={s.id} value={s.id}>[{s.code}] {s.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Target Items Checklist */}
                  <div style={{ padding: '8px 12px', background: 'var(--paper-sunken)', borderRadius: 6, marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)' }}>
                      💡 Currently at &amp; listing the audience to assign at level: <strong>{assignmentTypeLabel(assignScope)}</strong>
                      <span style={{ fontSize: 11, color: 'var(--ink-soft)', marginLeft: 6 }}>({cascadingOptions.length} items available)</span>
                    </div>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <input
                        type="text"
                        className="field-input"
                        style={{ height: 26, fontSize: 11, width: 160 }}
                        placeholder={`Search across ${cascadingOptions.length} items...`}
                        value={targetSearchQuery}
                        onChange={(e) => setTargetSearchQuery(e.target.value)}
                      />
                      <Button type="button" size="sm" variant="ghost" onClick={selectAllCascadingTargets}>Select All ({cascadingOptions.length})</Button>
                      <Button type="button" size="sm" variant="ghost" onClick={deselectAllCascadingTargets}>Deselect</Button>
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
                          <div style={{ flex: 1, minWidth: 0, fontSize: 12 }}>
                            <strong style={{ color: isChecked ? 'var(--blue, #2563eb)' : 'var(--ink)' }}>{opt.label}</strong>
                            {opt.subtitle && <span style={{ fontSize: 11, color: 'var(--ink-faint)', marginLeft: 6 }}>({opt.subtitle})</span>}
                          </div>
                        </div>
                      );
                    })}
                    {cascadingOptions.length === 0 && (
                      <div style={{ padding: 16, textAlign: 'center', color: 'var(--ink-faint)', fontSize: 12 }}>
                        No audience matches the drill-down filters or the search term.
                      </div>
                    )}
                  </div>

                  {/* Due Date & Mandatory Controls */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr auto', gap: 10, alignItems: 'center', marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--line)' }}>
                    <div>
                      <label className="field-label" style={{ fontSize: 11, margin: 0 }}>Completion Due Date</label>
                      <input
                        type="date"
                        className="field-input"
                        style={{ height: 30, fontSize: 12 }}
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
                        <span>Completion mandatory</span>
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
                        Add Assignment ({selectedTargetIds.length} selected)
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Assigned List */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <div style={{ fontWeight: 700, fontSize: 13 }}>
                  Allocated Audience List ({formData.assignments?.length || 0}):
                </div>
                {(formData.assignments || []).length > 1 && (
                  <Button type="button" size="sm" variant="ghost" onClick={handleRemoveAllAssignments} style={{ color: 'var(--rust)', fontSize: 12 }}>
                    <i className="ti ti-trash" /> Clear All Assignments
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
                        (Type: <Badge tone="slate" size="sm">{assignmentTypeLabel(asg.assignmentType) || asg.assignmentType}</Badge> &middot; Due: {asg.dueDate} {asg.isMandatory ? '· Mandatory' : ''})
                      </span>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="danger"
                      icon="ti-trash"
                      onClick={() => handleRemoveAssignment(idx)}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
                {(formData.assignments || []).length === 0 && (
                  <div style={{ padding: 14, textAlign: 'center', color: 'var(--ink-faint)', fontSize: 12, background: 'var(--paper-sunken)', borderRadius: 6 }}>
                    No audience has been assigned to this assessment yet.
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
                Cancel
              </Button>
            )}
            {activeTab === 'CONTENT' && (
              <Button type="button" variant="ghost" icon="ti-arrow-left" onClick={() => setActiveTab('GENERAL')}>
                Back To General Settings
              </Button>
            )}
            {activeTab === 'ANTI_CHEAT' && (
              <Button type="button" variant="ghost" icon="ti-arrow-left" onClick={() => setActiveTab('CONTENT')}>
                Back To Format &amp; Exam Paper
              </Button>
            )}
            {activeTab === 'ASSIGNMENTS' && (
              <Button type="button" variant="ghost" icon="ti-arrow-left" onClick={() => setActiveTab('ANTI_CHEAT')}>
                Back To Anti-Cheating
              </Button>
            )}
          </div>

          {/* Forward / Save Buttons */}
          <div style={{ display: 'flex', gap: 8 }}>
            {activeTab === 'GENERAL' && (
              <Button type="button" variant="primary" icon="ti-arrow-right" onClick={() => setActiveTab('CONTENT')}>
                Continue: Format &amp; Exam Paper
              </Button>
            )}
            {activeTab === 'CONTENT' && (
              <Button type="button" variant="primary" icon="ti-arrow-right" onClick={() => setActiveTab('ANTI_CHEAT')}>
                Continue: Anti-Cheating
              </Button>
            )}
            {activeTab === 'ANTI_CHEAT' && (
              isStandalone ? (
                <Button type="button" variant="primary" icon="ti-arrow-right" onClick={() => setActiveTab('ASSIGNMENTS')}>
                  Continue: Allocate The Audience
                </Button>
              ) : (
                <Button type="button" variant="primary" icon="ti-check" onClick={handleSubmit}>
                  Finish &amp; Save Assessment
                </Button>
              )
            )}
            {activeTab === 'ASSIGNMENTS' && (
              <Button type="button" variant="primary" icon="ti-check" onClick={handleSubmit}>
                Finish &amp; Save Assessment
              </Button>
            )}
          </div>
        </div>
      </form>
    </Modal>
  );
}
