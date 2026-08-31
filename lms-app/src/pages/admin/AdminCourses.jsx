import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { courseHasParticipants, userAdminUser, isUserAssignedToCourse } from '../../data/mockData';
import { ActionsMenu, Badge, Button, CourseTypeBadge, Modal, Tabs, CertificateTemplatePicker } from '../../features/common/ui';
import { useCourseStore } from '../../store/CourseStore';
import { canAuthorAnyCourse, hasCapability, normalizeRole } from '../../data/roles';
import { getCourseImage } from '../../data/courseImages';
import {
  courseFormatBadge, catalogSectionOf, CATALOG_SECTIONS, courseMatchesCategory,
  computeLifecycleStatus, LIFECYCLE_STATUS_META, buildCourseGroups,
  personalLifecycleStatusOf, PERSONAL_LIFECYCLE_STATUS_META,
} from '../../utils/courseCatalog';
import CurriculumTree from '../../features/catalog/CurriculumTree';
import { pricingOf, formatVnd } from '../../utils/costCenter';
import MultiTargetAssigner from '../../features/catalog/MultiTargetAssigner';
import {
  ASSIGNMENT_TYPES,
  assignmentTypeLabel,
  targetOptionsFor,
  getCascadingTargetOptions,
  divisions,
  departments,
  subDepartments,
  jobLevels,
  retailStores,
} from '../../data/assignmentTargets';
import {
  assignmentTargetSummary, resolveTargetLabel,
  visibleCurriculaFor, curriculumAccessOf, CURRICULUM_ACCESS_MODE,
} from '../../utils/curriculumAssignment';
import AssessmentEditorModal from '../../features/assessment/AssessmentEditorModal';
import AssessmentDetailModal from '../../features/assessment/AssessmentDetailModal';
import {
  getAssessmentAccess, filterAssessments, buildAssessmentGroups, ASSESSMENT_GROUP_BY_OPTIONS,
} from '../../utils/assessmentCatalog';
import { DELIVERY_FORMATS, ASSESSMENT_TYPES } from '../../data/assessmentData';
import {
  getCourseTargetLevels,
  getCourseEligibleLevels,
  evaluateUserEligibilityForCourse,
  evaluateGroupEligibilityForCourse,
  ACCESS_STATE,
} from '../../data/levelSystem';

const STATUS_TONE = { PUBLISHED: 'sage', DRAFT: 'rail', ARCHIVED: 'slate' };

// "Learning Objects" (E-Learning tự học) và "Online Class" (Lớp Live) đã gộp
// làm 1 tab duy nhất — cả 2 đều là khóa online, chỉ khác nhau ở badge định
// dạng (🌐 E-Learning / 💻 Live) đã có sẵn trên mỗi dòng, không cần tách tab
// riêng nữa. "Library Course" đưa lên đầu & đổi tên "All Class" (giữ nguyên
// hành vi: xem toàn bộ khóa, không lọc theo section). "Library" mới ở cuối là
// góc nhìn tổng hợp khóa học theo Lĩnh Vực (kỹ năng cứng) — chỉ User Admin &
// System Admin thấy (adminOnly, lọc khi build danh sách tab hiển thị).
const CATALOG_TABS = [
  { id: 'library', label: 'All Class', icon: 'ti-database' },
  { id: 'online-class', label: 'Online Class', icon: 'ti-broadcast', includeSections: [CATALOG_SECTIONS.LEARNING_OBJECTS, CATALOG_SECTIONS.ONLINE_CLASS] },
  { id: 'classroom', label: 'Classroom / In-Person', icon: 'ti-chalkboard', section: CATALOG_SECTIONS.CLASSROOM },
  { id: 'curriculum', label: 'Curriculum', icon: 'ti-books' },
  { id: 'assessment', label: 'Assessment', icon: 'ti-writing' },
  { id: 'domain-library', label: 'Library', icon: 'ti-folders', adminOnly: true },
];

const COURSE_GROUP_BY_OPTIONS = [
  { id: 'NONE', label: 'Không Gộp Nhóm' },
  { id: 'CATEGORY', label: 'Lĩnh Vực (Category)' },
  { id: 'ORG_UNIT', label: 'Phòng Ban & Khối' },
  { id: 'LEVEL', label: 'Cấp Bậc' },
  { id: 'LIFECYCLE_STATUS', label: 'Trạng Thái Vòng Đời' },
  { id: 'MODALITY', label: 'Hình Thức Đào Tạo' },
];

function emptyCurriculumDraft(defaultCat = 'Food Safety & Hygiene') {
  return { id: `CUR-${Date.now()}`, title: '', description: '', category: defaultCat, courseIds: [], status: 'PUBLISHED', assignments: [], certificateTemplateId: null };
}

function emptyLibraryDraft() {
  return { id: `LIB-${Date.now()}`, name: '', description: '', domains: [] };
}

export default function AdminCourses() {
  const navigate = useNavigate();
  const {
    courses, updateCourse, removeCourse, currentUser, language, t,
    companyCategories, curricula, addCurriculum, updateCurriculum, deleteCurriculum,
    libraries, addLibrary, updateLibrary, deleteLibrary,
    certificateTemplates, addCertificateTemplate,
    assignCurriculum, proposeCurriculumAssignment, removeCurriculumAssignment,
    approvals, myEnrollments,
    assessments, addAssessment, updateAssessment, deleteAssessment,
    assignAssessmentTarget, removeAssessmentTarget,
    questionBanks, addQuestionToBank, assessmentAttempts,
    accessFor, customGroups,
  } = useCourseStore();
  const role = normalizeRole(currentUser?.role);
  const isAdmin = canAuthorAnyCourse(role);
  const isCurriculumAdmin = hasCapability(role, 'canManageCurriculum');
  const { mode: curriculumMode } = curriculumAccessOf(currentUser);
  const visibleCurricula = useMemo(() => visibleCurriculaFor(curricula, currentUser), [curricula, currentUser]);
  // User Admin & SysAdmin quản lý TOÀN BỘ khóa học (canAuthorOnlineCourses là
  // tín hiệu phân biệt họ với Trainer/L&D — chỉ 2 role này có). Trainer/L&D
  // chỉ được sửa/xóa đúng khóa do chính họ tạo; 100 khóa danh mục gốc chưa có
  // trường createdBy được coi là do User Admin thiết lập (chủ sở hữu mặc định
  // của danh mục chính thức), nên Trainer không có quyền với chúng.
  const isFullAdmin = hasCapability(role, 'canAuthorOnlineCourses');
  function ownerIdOf(course) {
    return course.createdBy || userAdminUser.userId;
  }
  function canManageCourse(course) {
    if (isFullAdmin) return true;
    if (isAdmin) return ownerIdOf(course) === currentUser?.userId;
    return false;
  }

  const [searchParams, setSearchParams] = useSearchParams();
  // Mặc định mở tab "Library Course" (toàn bộ danh mục) — Admin/Trainer bấm
  // vào trang Courses từ nav thường muốn thấy hết mọi khóa, không riêng 1
  // hình thức đào tạo cụ thể.
  const activeTab = searchParams.get('tab') || 'library';
  function setActiveTab(id) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('tab', id);
      return next;
    });
  }
  const activeTabDef = CATALOG_TABS.find((tb) => tb.id === activeTab) || CATALOG_TABS[0];
  // "Library" (domain-library) chỉ dành cho User Admin/SysAdmin — nếu ai đó
  // vào thẳng bằng URL ?tab=domain-library mà không đủ quyền thì đẩy về lại
  // "All Class" thay vì hiện 1 view rỗng/không đúng đối tượng.
  useEffect(() => {
    if (activeTab === 'domain-library' && !isFullAdmin) {
      setActiveTab('library');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, isFullAdmin]);
  // Trainer/L&D chỉ được tạo khóa Lớp Trực Tiếp (Classroom/In-Person) — nút
  // "Create New Course" luôn tạo IN_PERSON_CLASSROOM bất kể đang ở tab nào
  // (xem onClick bên dưới), nên hiện nút đó ở tab Online Class (gộp Learning
  // Objects + Live) dễ gây hiểu lầm là tạo được khóa E-Learning/Lớp Online.
  // Chỉ ẩn cho đúng Trainer trên tab này; các role khác (User Admin, SysAdmin)
  // và các tab khác của Trainer không đổi.
  const hideCreateForTrainerTab = isAdmin && !isFullAdmin && activeTabDef.id === 'online-class';

  // User Learner, Manager & HRBP không có bất kỳ quyền tạo/sửa/xóa/phát hành
  // hay xem chi tiết phân bổ nào cả — họ chỉ được duyệt danh mục (đủ 5+ cột dữ
  // liệu như User Admin thấy) và bấm "View Course" để vào đúng trang học tập
  // cá nhân (biết mình có được học khóa đó không, đăng ký/bắt đầu học tùy
  // loại khóa). Việc thêm/đề xuất giáo trình của HRBP vẫn nằm ở Dashboard
  // riêng của họ (/hrbp/curriculum), không phải trang catalog chung này.
  // hideAllocationDetails gộp thêm điều kiện hideCreateForTrainerTab ở trên vì
  // Trainer cũng không được xem "Chi Tiết & Phân Bổ" của khóa Learning
  // Objects/Online Class — họ chỉ tạo/quản lý được khóa Lớp Trực Tiếp.
  const isViewOnlyCatalogRole = role === 'learner' || role === 'manager' || role === 'hrbp';
  const hideAllocationDetails = isViewOnlyCatalogRole || hideCreateForTrainerTab;

  const enrolledCourseIdSet = new Set(Object.keys(myEnrollments || {}));
  const visibleCourses = (isFullAdmin || isAdmin)
    ? courses.filter((c) => {
        if (c.status === 'DRAFT' && !canManageCourse(c)) return false;
        return true;
      }).map((c) => ({ ...c, enrollment: myEnrollments?.[c.id] || null }))
    : courses
      .filter((c) => {
        if (c.status === 'DRAFT' && !canManageCourse(c)) return false;
        const lifecycle = computeLifecycleStatus(c);
        if (lifecycle === 'UPCOMING' && catalogSectionOf(c) === CATALOG_SECTIONS.LEARNING_OBJECTS) return false;
        if (c.courseType === 'MANDATORY') {
          const isAssigned = isUserAssignedToCourse(c, currentUser, customGroups);
          const hasEnrollment = Boolean(myEnrollments?.[c.id]);
          if (!isAssigned && !hasEnrollment && !canManageCourse(c)) return false;
        }
        return true;
      })
      // Gộp sẵn ghi danh thật của người đang xem lên mỗi khóa — cần thiết để
      // tính đúng trạng thái "cá nhân hóa" (Đang Tham Gia/Đã Quá Hạn/Đã Hoàn
      // Thành/Đã Qua Thời Gian Tham Gia) ở bộ lọc, gộp nhóm và badge bên dưới.
      .map((c) => ({ ...c, enrollment: myEnrollments?.[c.id] || null }));

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedType, setSelectedType] = useState('ALL');
  const [selectedLifecycle, setSelectedLifecycle] = useState('ALL');
  const [groupBy, setGroupBy] = useState('NONE');
  const [collapsedGroups, setCollapsedGroups] = useState(new Set());
  const [page, setPage] = useState(1);
  const pageSize = 15;

  const [editingCurriculum, setEditingCurriculum] = useState(null);
  const [viewingCurriculum, setViewingCurriculum] = useState(null);
  const [viewingCourse, setViewingCourse] = useState(null);
  const [editingLibrary, setEditingLibrary] = useState(null);

  function saveLibrary(draft) {
    const now = new Date().toISOString().slice(0, 10);
    const exists = libraries.some((l) => l.id === draft.id);
    if (exists) {
      updateLibrary(draft.id, { ...draft, updatedAt: now });
    } else {
      addLibrary({ ...draft, createdBy: currentUser?.userId, createdAt: now, updatedAt: now });
    }
    setEditingLibrary(null);
  }

  function publish(course) {
    publishNewCourseVersion(course.id, null, 'Phát hành phiên bản mới.');
  }

  function remove(course) {
    if (window.confirm(`Delete "${course.title}"? This cannot be undone.`)) {
      removeCourse(course.id);
    }
  }

  const bySearchCategoryType = visibleCourses.filter((c) => {
    const matchCat = selectedCategory === 'ALL' || courseMatchesCategory(c, selectedCategory);
    const matchType = selectedType === 'ALL' || c.courseType === selectedType;
    const matchSearch = !search ||
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.code.toLowerCase().includes(search.toLowerCase()) ||
      c.category.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchType && matchSearch;
  });

  const isLibrary = activeTabDef.id === 'library';
  const isCurriculum = activeTabDef.id === 'curriculum';
  const isAssessment = activeTabDef.id === 'assessment';
  // "Library" (domain-library) không còn là 1 view gộp-nhóm tự động — nó là
  // 1 CRUD riêng: admin tự tạo Library, thêm Lĩnh Vực & gán khóa học thủ công
  // (xem khối JSX riêng bên dưới, không dùng chung layout bảng khóa học).
  const isLibraryManager = activeTabDef.id === 'domain-library' && isFullAdmin;

  // Assessment management & catalog state
  const [editingAssessment, setEditingAssessment] = useState(null);
  const [viewingAssessment, setViewingAssessment] = useState(null);
  const [assessmentSearch, setAssessmentSearch] = useState('');
  const [selectedAssessmentType, setSelectedAssessmentType] = useState('ALL');
  const [selectedAssessmentFormat, setSelectedAssessmentFormat] = useState('ALL');
  const [selectedAssessmentCategory, setSelectedAssessmentCategory] = useState('ALL');
  const [selectedAssessmentStatus, setSelectedAssessmentStatus] = useState('ALL');
  const [assessmentGroupBy, setAssessmentGroupBy] = useState('NONE');
  const [collapsedAssessmentGroups, setCollapsedAssessmentGroups] = useState(new Set());

  const visibleAssessments = useMemo(() => {
    return (assessments || []).filter((asm) => {
      if (asm.status === 'DRAFT') {
        if (isFullAdmin) return true;
        if (role === 'trainer' && asm.createdBy === currentUser?.userId) return true;
        return false;
      }
      return true;
    });
  }, [assessments, isFullAdmin, role, currentUser]);

  const filteredAssessments = useMemo(() => {
    return filterAssessments(visibleAssessments, {
      search: assessmentSearch,
      selectedType: selectedAssessmentType,
      selectedFormat: selectedAssessmentFormat,
      selectedCategory: selectedAssessmentCategory,
      selectedStatus: selectedAssessmentStatus,
      currentUser,
      courses,
    });
  }, [visibleAssessments, assessmentSearch, selectedAssessmentType, selectedAssessmentFormat, selectedAssessmentCategory, selectedAssessmentStatus, currentUser, courses]);

  const assessmentGroups = useMemo(() => {
    return buildAssessmentGroups(filteredAssessments, assessmentGroupBy);
  }, [filteredAssessments, assessmentGroupBy]);

  function toggleAssessmentGroup(key) {
    setCollapsedAssessmentGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  const assessmentPlayerBasePath = role === 'manager'
    ? '/manager/assessment'
    : role === 'learner'
    ? '/learner/assessment'
    : '/my-learning/assessment';

  const learnerCourseBasePath = role === 'manager'
    ? '/manager/learning'
    : role === 'learner'
    ? '/learner/courses'
    : '/my-learning';

  // Bộ lọc Trạng Thái Vòng Đời và Gộp Nhóm áp dụng cho MỌI tab liệt kê khóa
  // học (Learning Objects/Online Class/Classroom/Library), không riêng gì
  // Library — chỉ khác nhau ở chỗ Library không lọc theo section (xem hết),
  // còn 3 tab kia lọc thêm theo đúng section của tab đang mở. Với role KHÔNG
  // PHẢI Full Admin, bộ trạng thái đổi sang góc nhìn cá nhân hóa (xem
  // personalLifecycleStatusOf) thay vì Nháp/Chưa Mở/Đang Mở/Đã Đóng của Admin.
  const filtered = isCurriculum || isAssessment || isLibraryManager
    ? []
    : bySearchCategoryType.filter((c) => {
      // "All Class" xem toàn bộ khóa, không lọc theo section; các tab còn lại
      // lọc theo section riêng (hoặc includeSections khi 1 tab gộp nhiều
      // section, như Online Class).
      if (!isLibrary) {
        const sectionOk = activeTabDef.includeSections
          ? activeTabDef.includeSections.includes(catalogSectionOf(c))
          : catalogSectionOf(c) === activeTabDef.section;
        if (!sectionOk) return false;
      }
      const rowLifecycle = (isFullAdmin || isAdmin) ? computeLifecycleStatus(c) : personalLifecycleStatusOf(c);
      const matchLifecycle = selectedLifecycle === 'ALL' || rowLifecycle === selectedLifecycle;
      return matchLifecycle;
    });

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);
  const groups = isCurriculum || isAssessment || isLibraryManager ? null : buildCourseGroups(filtered, groupBy, { personal: !(isFullAdmin || isAdmin) });

  function toggleGroup(key) {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  function renderCourseRow(c) {
    const hasParticipants = courseHasParticipants(c);
    const canManage = canManageCourse(c);
    const badge = courseFormatBadge(c);
    const lifecycle = computeLifecycleStatus(c);
    // Full Admin & Trainer: giữ nguyên góc nhìn quản trị (Nháp/Chưa Mở/Đang Mở/Đã Đóng),
    // chỉ đổi thành "Đã Tham Gia" khi Đang Mở mà chính họ cũng đã ghi danh.
    // Các role còn lại (Learner/Manager/HRBP): dùng thẳng trạng thái cá
    // nhân hóa (Đang Tham Gia/Đã Quá Hạn/Đã Hoàn Thành/Đã Qua Thời Gian Tham
    // Gia/Đang Mở) cho khớp với bộ lọc & gộp nhóm cùng vừa thêm ở trên.
    const isMineAndOpen = lifecycle === 'OPEN' && enrolledCourseIdSet.has(c.id);
    const lifecycleMeta = (isFullAdmin || isAdmin)
      ? (isMineAndOpen
        ? { label: 'Đã Tham Gia', labelEn: 'Joined', tone: 'rail', icon: 'ti-user-check' }
        : LIFECYCLE_STATUS_META[lifecycle])
      : PERSONAL_LIFECYCLE_STATUS_META[personalLifecycleStatusOf(c)];
    const asgCount = (c.assignments && c.assignments.length) || (c.assignment ? 1 : 0);
    const myAccess = accessFor ? accessFor(c, currentUser) : { canAccess: true, state: ACCESS_STATE.OPEN };
    const rowPricing = pricingOf(c);

    return (
      <tr key={c.id}>
        <td>
          <div
            style={{ display: 'flex', gap: 10, alignItems: 'center', cursor: 'pointer' }}
            onClick={() => (hideAllocationDetails ? navigate(`/learner/courses/${c.id}`) : setViewingCourse(c))}
            title={hideAllocationDetails ? 'Bấm để xem chi tiết khóa học' : 'Bấm để xem chi tiết & phân bổ khóa học'}
          >
            <img
              src={getCourseImage(c)}
              alt={c.title}
              style={{ width: 44, height: 44, borderRadius: 6, objectFit: 'cover', flexShrink: 0, border: '1px solid var(--line)' }}
            />
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2, flexWrap: 'wrap' }}>
                <div style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--ink)' }}>{c.title}</div>
                <Badge tone={badge.tone}>{badge.icon} {badge.label}</Badge>
                <Badge tone={lifecycleMeta.tone}>{lifecycleMeta.label}</Badge>
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--ink-faint)' }}>
                <span style={{ fontFamily: 'var(--font-mono)' }}>{c.code}</span> &middot; {(c.categories && c.categories.join(', ')) || c.category} &middot; Version {c.version}
                {c.onlineClassType === 'VIRTUAL_CLASS' && c.virtualMeeting?.instructorName && (
                  <> &middot; GV: {c.virtualMeeting.instructorName}</>
                )}
              </div>
            </div>
          </div>
        </td>
        <td><CourseTypeBadge courseType={c.courseType} /></td>
        {isFullAdmin && (
          <td style={{ color: 'var(--ink-soft)', fontSize: 12 }}>
            {c.courseType === 'MANDATORY' ? (
              <span style={{ background: 'var(--paper-sunken)', padding: '3px 8px', borderRadius: 4, display: 'inline-block' }}>
                {asgCount > 0
                  ? `${asgCount} đối tượng được gán`
                  : (c.assignment?.targetLabel || 'Assigned Division')}
              </span>
            ) : (
              <span style={{ color: 'var(--ink-faint)' }}>All MMVN Associates (Catalog)</span>
            )}
          </td>
        )}
        <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{c.modules?.length || 2}</td>
        <td style={{ fontSize: 12, color: 'var(--ink-soft)' }}>{c.estimatedDuration || c.estimatedHours || '2h'}</td>
        <td>
          {rowPricing.isFree ? (
            <Badge tone="sage" icon="ti-gift" size="sm">Miễn Phí</Badge>
          ) : (
            <Badge tone="amber" icon="ti-coin" size="sm">{formatVnd(rowPricing.price)}</Badge>
          )}
        </td>
        <td>
          <Badge tone={STATUS_TONE[c.status]}>
            {c.status === 'PUBLISHED' ? 'Published' : c.status === 'DRAFT' ? 'Draft' : 'Archived'}
          </Badge>
        </td>
        <td>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6, alignItems: 'center' }}>
            {canManage ? (
              <>
                <Button size="sm" variant="outline" icon="ti-edit" onClick={() => navigate(`/admin/courses/${c.id}`)}>Edit</Button>
                <ActionsMenu
                  label="Thao tác khác"
                  items={[
                    !hideAllocationDetails && { key: 'details', icon: 'ti-list-details', label: 'Chi Tiết & Phân Bổ', onClick: () => setViewingCourse(c) },
                    myAccess.canAccess ? {
                      key: 'learn',
                      icon: 'ti-player-play',
                      label: '🚀 Vào Học Bài (Cá Nhân)',
                      onClick: () => navigate(`/learner/courses/${c.id}`),
                    } : myAccess.state === ACCESS_STATE.REQUESTABLE ? {
                      key: 'request_learn',
                      icon: 'ti-send',
                      label: '⚠️ Xin Học Vượt Cấp',
                      onClick: () => navigate(`/learner/courses/${c.id}`),
                    } : {
                      key: 'locked_learn',
                      icon: 'ti-lock',
                      label: '🔒 Khóa học vượt cấp',
                      disabled: true,
                      title: myAccess.reason,
                    },
                    c.status === 'DRAFT' && { key: 'publish', icon: 'ti-upload', label: 'Publish', onClick: () => publish(c) },
                    {
                      key: 'delete',
                      icon: 'ti-trash',
                      label: 'Delete',
                      variant: 'danger',
                      disabled: hasParticipants,
                      title: hasParticipants ? 'Cannot delete: employees have already started this course.' : undefined,
                      onClick: () => remove(c),
                    },
                  ].filter(Boolean)}
                />
              </>
            ) : (
              <Button
                size="sm"
                variant={myAccess.canAccess ? "primary" : "outline"}
                icon={myAccess.canAccess ? "ti-player-play" : myAccess.state === ACCESS_STATE.LOCKED_LEVEL_GAP ? "ti-lock" : "ti-eye"}
                disabled={myAccess.state === ACCESS_STATE.LOCKED_LEVEL_GAP}
                onClick={() => navigate(`/learner/courses/${c.id}`)}
                title={myAccess.state === ACCESS_STATE.LOCKED_LEVEL_GAP ? myAccess.reason : (isAdmin ? 'Khóa này không do bạn tạo — chỉ xem, không sửa/xóa được.' : undefined)}
              >
                {isAdmin ? 'View Course' : (myAccess.canAccess ? 'Vào Học' : myAccess.state === ACCESS_STATE.REQUESTABLE ? 'Xin Học' : 'Khóa Bị Chặn')}
              </Button>
            )}
          </div>
        </td>
      </tr>
    );
  }

  function renderCourseTable(rows) {
    return (
      <div className="card" style={{ overflowX: 'auto' }}>
        <table className="table">
          <thead>
            <tr>
              <th>Course Program</th>
              <th style={{ width: 140 }}>Type</th>
              {isFullAdmin && <th>Assigned Target Scope</th>}
              <th style={{ width: 90 }}>Modules</th>
              <th style={{ width: 90 }}>Duration</th>
              <th style={{ width: 120 }}>Học Phí</th>
              <th style={{ width: 110 }}>Status</th>
              <th style={{ width: 150, textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>{rows.map(renderCourseRow)}</tbody>
        </table>
      </div>
    );
  }

  function saveCurriculum(draft) {
    const exists = curricula.some((c) => c.id === draft.id);
    const now = new Date().toISOString().slice(0, 10);
    if (exists) {
      updateCurriculum(draft.id, { ...draft, updatedAt: now });
    } else {
      addCurriculum({ ...draft, createdBy: currentUser?.userId, createdAt: now, updatedAt: now });
    }
    setEditingCurriculum(null);
  }

  return (
    <>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <h1>{language === 'en' ? 'Course Catalog & Program Governance' : 'Danh Mục & Quản Trị Khóa Học'}</h1>
            <Badge tone="sage">{visibleCourses.length} {language === 'en' ? 'Total Programs' : 'Khóa Học'}</Badge>
          </div>
          <p>
            {language === 'en'
              ? 'Define curriculum modules, author interactive quizzes, import question banks, and target mandatory compliance by Business Unit, Division, Department, or Job Level.'
              : 'Thiết lập mô-đun bài học, bài kiểm tra tương tác, ngân hàng câu hỏi và phân bổ đào tạo bắt buộc theo Khối, Phòng ban hoặc Cấp bậc định biên.'}
          </p>
        </div>
        {isAdmin && !isCurriculum && !isAssessment && !isLibraryManager && !hideCreateForTrainerTab && (
          <Button
            variant="primary"
            icon="ti-plus"
            onClick={() => {
              if (!isFullAdmin) {
                // Trainer chỉ mở lớp Trực tiếp
                navigate('/admin/courses/new?deliveryType=IN_PERSON_CLASSROOM');
                return;
              }
              if (activeTabDef.section === CATALOG_SECTIONS.CLASSROOM) navigate('/admin/courses/new?deliveryType=IN_PERSON_CLASSROOM');
              // Tab "Online Class" gộp cả E-Learning tự học lẫn Lớp Live —
              // mặc định tạo khóa E-Learning (đa số khóa hiện có thuộc dạng
              // này); có thể đổi sang Lớp Live ngay trong Course Builder.
              else if (activeTabDef.id === 'online-class') navigate('/admin/courses/new?deliveryType=ONLINE_ELEARNING&onlineClassType=E_LEARNING');
              else navigate('/admin/courses/new');
            }}
          >
            Create New Course
          </Button>
        )}
        {isCurriculumAdmin && isCurriculum && (
          <Button variant="primary" icon="ti-plus" onClick={() => setEditingCurriculum(emptyCurriculumDraft())}>
            Tạo Giáo Trình Mới
          </Button>
        )}
        {isFullAdmin && isAssessment && (
          <Button variant="primary" icon="ti-plus" onClick={() => setEditingAssessment({})}>
            Tạo Assessment Mới
          </Button>
        )}
        {isLibraryManager && (
          <Button variant="primary" icon="ti-plus" onClick={() => setEditingLibrary(emptyLibraryDraft())}>
            Tạo Library Mới
          </Button>
        )}
      </div>

      <Tabs
        tabs={CATALOG_TABS.filter((tb) => !tb.adminOnly || isFullAdmin).map((tb) => ({
          id: tb.id,
          label: tb.label,
          icon: tb.icon,
          count: tb.id === 'curriculum'
            ? visibleCurricula.length
            : tb.id === 'assessment'
            ? visibleAssessments.length
            : tb.id === 'domain-library'
            ? libraries.length
            : tb.id === 'library'
            ? visibleCourses.length
            : tb.includeSections
            ? visibleCourses.filter((c) => tb.includeSections.includes(catalogSectionOf(c))).length
            : visibleCourses.filter((c) => catalogSectionOf(c) === tb.section).length,
        }))}
        activeTab={activeTab}
        onChange={(id) => { setActiveTab(id); setPage(1); }}
      />

      {isCurriculum ? (
        <>
          <div className="card card-pad" style={{ marginBottom: 16, fontSize: 12.5, color: 'var(--ink-soft)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            <div>
              <i className="ti ti-info-circle" style={{ color: 'var(--rail)', marginRight: 6 }} />
              Giáo trình (Curriculum) tập hợp nhiều khóa <strong>E-Learning tự học</strong> thành một lộ trình có cấu trúc. Bạn có thể phân bổ giáo trình cho <strong>BU, Division, Department, Sub-Department, Store hoặc User cụ thể</strong>.
            </div>
            {isCurriculumAdmin && (
              <Button variant="primary" icon="ti-plus" size="sm" onClick={() => setEditingCurriculum(emptyCurriculumDraft(companyCategories[0]))}>
                Tạo Giáo Trình Mới
              </Button>
            )}
          </div>
          <div className="grid grid-3" style={{ gap: 14 }}>
            {visibleCurricula.map((cur) => {
              const asgCount = (cur.assignments || []).length;
              const asgSummary = assignmentTargetSummary(cur);
              return (
                <div key={cur.id} className="card card-pad" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
                      <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--ink)' }}>{cur.title}</div>
                      <Badge tone={cur.status === 'PUBLISHED' ? 'sage' : 'rail'}>{cur.status === 'PUBLISHED' ? 'Published' : 'Draft'}</Badge>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginBottom: 10, minHeight: 34 }}>{cur.description}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--ink-faint)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <Badge tone="slate" size="sm">{cur.category || 'Chung'}</Badge>
                      <span>&middot;</span>
                      <span>{(cur.courseIds || []).length} khóa E-Learning</span>
                    </div>
                    <div style={{ fontSize: 11.5, color: 'var(--ink-soft)', background: 'var(--paper-sunken)', padding: '6px 10px', borderRadius: 6, marginBottom: 12 }}>
                      <i className="ti ti-target" style={{ color: asgCount > 0 ? 'var(--rail)' : 'var(--ink-faint)', marginRight: 5 }} />
                      <strong>Phân bổ:</strong> {asgSummary}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', borderTop: '1px solid var(--line)', paddingTop: 10 }}>
                    <Button size="sm" variant="outline" icon="ti-eye" onClick={() => setViewingCurriculum(cur)}>
                      {curriculumMode === CURRICULUM_ACCESS_MODE.ASSIGNED_ONLY ? 'Xem Chi Tiết' : 'Chi Tiết & Phân Bổ'}
                    </Button>
                    {isCurriculumAdmin && <Button size="sm" onClick={() => setEditingCurriculum(cur)}>Sửa</Button>}
                    {isCurriculumAdmin && (
                      <Button
                        size="sm"
                        variant="danger"
                        icon="ti-trash"
                        onClick={() => { if (window.confirm(`Xóa giáo trình "${cur.title}"?`)) deleteCurriculum(cur.id); }}
                      >
                        Xóa
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
            {visibleCurricula.length === 0 && (
              <div className="empty-state" style={{ gridColumn: '1 / -1' }}>
                <i className="ti ti-books" aria-hidden="true" />
                <p>{curriculumMode === CURRICULUM_ACCESS_MODE.ASSIGNED_ONLY ? 'Bạn chưa được phân bổ giáo trình nào.' : 'Chưa có giáo trình nào.'}</p>
              </div>
            )}
          </div>
        </>
      ) : isAssessment ? (
        <>
          {/* Assessment Filter & Search Bar */}
          <div className="card card-pad" style={{ marginBottom: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ position: 'relative', width: 220, flexShrink: 0 }}>
                <i className="ti ti-search" style={{ position: 'absolute', left: 10, top: 10, color: 'var(--ink-faint)', fontSize: 14 }} />
                <input
                  type="text"
                  className="field-input"
                  style={{ paddingLeft: 32, height: 34, fontSize: 12, width: '100%' }}
                  placeholder="Tìm kiếm assessment, mã..."
                  value={assessmentSearch}
                  onChange={(e) => setAssessmentSearch(e.target.value)}
                />
              </div>

              <select
                className="field-select"
                style={{ height: 34, fontSize: 12, width: 170 }}
                value={selectedAssessmentCategory}
                onChange={(e) => setSelectedAssessmentCategory(e.target.value)}
              >
                <option value="ALL">Mọi Lĩnh Vực</option>
                {companyCategories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>

              <select
                className="field-select"
                style={{ height: 34, fontSize: 12, width: 140 }}
                value={selectedAssessmentType}
                onChange={(e) => setSelectedAssessmentType(e.target.value)}
              >
                <option value="ALL">Mọi Loại Hình</option>
                <option value={ASSESSMENT_TYPES.QUIZ}>📝 Quiz</option>
                <option value={ASSESSMENT_TYPES.ASSIGNMENT}>📂 Assignment</option>
                <option value={ASSESSMENT_TYPES.SURVEY}>📊 Survey</option>
              </select>

              <select
                className="field-select"
                style={{ height: 34, fontSize: 12, width: 160 }}
                value={selectedAssessmentFormat}
                onChange={(e) => setSelectedAssessmentFormat(e.target.value)}
              >
                <option value="ALL">Mọi Hình Thức</option>
                <option value={DELIVERY_FORMATS.STANDALONE}>🎯 Độc Lập (Standalone)</option>
                <option value={DELIVERY_FORMATS.COURSE_LINKED}>🔗 Gắn Khóa Học (Course)</option>
              </select>

              {isFullAdmin && (
                <select
                  className="field-select"
                  style={{ height: 34, fontSize: 12, width: 130 }}
                  value={selectedAssessmentStatus}
                  onChange={(e) => setSelectedAssessmentStatus(e.target.value)}
                >
                  <option value="ALL">Mọi Trạng Thái</option>
                  <option value="PUBLISHED">Published</option>
                  <option value="DRAFT">Draft</option>
                </select>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>Gộp nhóm:</span>
              <select
                className="field-select"
                style={{ height: 34, fontSize: 12, width: 160 }}
                value={assessmentGroupBy}
                onChange={(e) => setAssessmentGroupBy(e.target.value)}
              >
                {ASSESSMENT_GROUP_BY_OPTIONS.map((opt) => (
                  <option key={opt.id} value={opt.id}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Assessment List / Grouped View */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {assessmentGroups.map((grp) => {
              const isCollapsed = collapsedAssessmentGroups.has(grp.id);

              return (
                <div key={grp.id}>
                  {assessmentGroupBy !== 'NONE' && (
                    <button
                      type="button"
                      onClick={() => toggleAssessmentGroup(grp.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        width: '100%',
                        background: 'var(--paper-sunken)',
                        padding: '10px 14px',
                        borderRadius: 8,
                        marginBottom: 10,
                        border: '1px solid var(--line)',
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 13.5, color: 'var(--ink)' }}>
                        <i className={`ti ${isCollapsed ? 'ti-chevron-right' : 'ti-chevron-down'}`} />
                        <span>{grp.title}</span>
                      </div>
                      <Badge tone="sage" size="sm">{grp.items.length} bài thi</Badge>
                    </button>
                  )}

                  {!isCollapsed && (
                    <div className="grid grid-3" style={{ gap: 14 }}>
                      {grp.items.map((asm) => {
                        const access = getAssessmentAccess(asm, currentUser, courses);
                        const isOwner = isFullAdmin || (role === 'trainer' && asm.createdBy === currentUser?.userId);
                        const asgCount = (asm.assignments || []).length;
                        const asgSummary = asm.assignments && asm.assignments.length > 0
                          ? asm.assignments.map((a) => a.targetName).join(', ')
                          : 'Chưa phân bổ';

                        const typesList = asm.types || (asm.type ? [asm.type] : ['QUIZ']);
                        const catsList = asm.categories || (asm.category ? [asm.category] : ['General']);
                        const qTypes = asm.questionTypesList || [];

                        return (
                          <div
                            key={asm.id}
                            className="card card-pad"
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              justifyContent: 'space-between',
                              borderColor: !access.canTake && !isOwner ? 'var(--line)' : undefined,
                            }}
                          >
                            <div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
                                <div>
                                  <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--ink)' }}>
                                    {asm.title}
                                  </div>
                                  <div style={{ fontSize: 11, color: 'var(--ink-faint)', fontFamily: 'var(--font-mono)' }}>
                                    {asm.code}
                                  </div>
                                </div>
                                <Badge tone={asm.status === 'PUBLISHED' ? 'sage' : 'rail'}>
                                  {asm.status}
                                </Badge>
                              </div>

                              <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginBottom: 8, minHeight: 34 }}>
                                {asm.description || 'Chưa có mô tả chi tiết.'}
                              </div>

                              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 8, fontSize: 11 }}>
                                {catsList.map((c) => (
                                  <Badge key={c} tone="slate" size="sm">{c}</Badge>
                                ))}
                                {typesList.map((t) => (
                                  <Badge key={t} tone={t === 'QUIZ' ? 'sage' : t === 'ASSIGNMENT' ? 'amber' : 'rail'} size="sm">
                                    {t}
                                  </Badge>
                                ))}
                                <Badge tone={asm.deliveryFormat === DELIVERY_FORMATS.STANDALONE ? 'sage' : 'slate'} size="sm">
                                  {asm.deliveryFormat === DELIVERY_FORMATS.STANDALONE ? '🎯 Độc Lập' : '🔗 Gắn Khóa'}
                                </Badge>
                                {(asm.contentFormats || (asm.contentFormat ? [asm.contentFormat] : [])).map((fmt) => (
                                  <Badge key={fmt} tone="blue" size="sm">
                                    {fmt === 'UPLOAD_DOC' ? '📄 File Đề Tự Luận' : fmt === 'SCORM_PACKAGE' ? '📦 SCORM' : fmt === 'GOOGLE_FORM' ? '🔗 Form Online' : '💡 Ngân Hàng Câu Hỏi'}
                                  </Badge>
                                ))}
                              </div>

                              {/* Question Types breakdown */}
                              {qTypes.length > 0 && (
                                <div style={{ fontSize: 11, color: 'var(--ink-soft)', background: 'var(--paper-sunken)', padding: '5px 8px', borderRadius: 6, marginBottom: 8 }}>
                                  <i className="ti ti-list-check" style={{ marginRight: 4, color: 'var(--rail)' }} />
                                  <strong>Dạng câu hỏi:</strong> {qTypes.join(', ')}
                                </div>
                              )}

                              <div style={{ fontSize: 11.5, color: 'var(--ink-faint)', marginBottom: 8 }}>
                                <i className="ti ti-clock" style={{ marginRight: 4 }} />
                                {asm.timeLimitMinutes} phút &middot; Điểm đạt: {asm.passingScorePercent}% &middot; {(asm.questionIds || []).length} câu hỏi
                              </div>

                              {asm.deliveryFormat === DELIVERY_FORMATS.STANDALONE ? (
                                <div style={{ fontSize: 11.5, color: 'var(--ink-soft)', background: 'var(--paper-sunken)', padding: '6px 10px', borderRadius: 6, marginBottom: 8 }}>
                                  <i className="ti ti-target" style={{ color: asgCount > 0 ? 'var(--rail)' : 'var(--ink-faint)', marginRight: 5 }} />
                                  <strong>Phân bổ:</strong> {asgSummary}
                                </div>
                              ) : (
                                <div style={{ fontSize: 11.5, color: 'var(--ink-soft)', background: 'var(--paper-sunken)', padding: '6px 10px', borderRadius: 6, marginBottom: 8 }}>
                                  <i className="ti ti-link" style={{ color: 'var(--rail)', marginRight: 5 }} />
                                  <strong>Khóa học:</strong> {(asm.courseIds || [asm.courseId]).filter(Boolean).join(', ') || asm.courseTitle || 'E-Learning'}
                                </div>
                              )}

                              {!access.canTake && !isOwner && (
                                <div style={{ fontSize: 11, color: 'var(--rust)', background: 'rgba(220,38,38,0.06)', padding: '5px 8px', borderRadius: 6, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
                                  <i className="ti ti-lock" />
                                  <span>{access.reason}</span>
                                </div>
                              )}
                            </div>

                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', borderTop: '1px solid var(--line)', paddingTop: 10, marginTop: 6 }}>
                              <Button size="sm" variant="outline" icon="ti-eye" onClick={() => setViewingAssessment(asm)}>
                                Xem Chi Tiết
                              </Button>

                              {isOwner ? (
                                <>
                                  <Button size="sm" icon="ti-pencil" onClick={() => setEditingAssessment(asm)}>
                                    Sửa
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="danger"
                                    icon="ti-trash"
                                    onClick={() => {
                                      if (window.confirm(`Xóa bài assessment "${asm.title}"?`)) {
                                        deleteAssessment(asm.id);
                                      }
                                    }}
                                  >
                                    Xóa
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="primary"
                                    icon="ti-player-play"
                                    onClick={() => {
                                      if (asm.deliveryFormat === DELIVERY_FORMATS.COURSE_LINKED) {
                                        navigate(`${learnerCourseBasePath}/${asm.courseId}`);
                                      } else {
                                        navigate(`${assessmentPlayerBasePath}/${asm.id}`);
                                      }
                                    }}
                                  >
                                    Làm Thử
                                  </Button>
                                </>
                              ) : (
                                <>
                                  {asm.deliveryFormat === DELIVERY_FORMATS.STANDALONE ? (
                                    access.canTake ? (
                                      <Button
                                        size="sm"
                                        variant="primary"
                                        icon="ti-player-play"
                                        onClick={() => navigate(`${assessmentPlayerBasePath}/${asm.id}`)}
                                      >
                                        Bắt Đầu Làm Bài
                                      </Button>
                                    ) : (
                                      <Button size="sm" disabled icon="ti-lock">
                                        Không Dành Cho Bạn
                                      </Button>
                                    )
                                  ) : (
                                    access.canTake ? (
                                      <Button
                                        size="sm"
                                        variant="primary"
                                        icon="ti-arrow-right"
                                        onClick={() => navigate(`${learnerCourseBasePath}/${asm.courseId}`)}
                                      >
                                        Vào Khóa Học Để Thi
                                      </Button>
                                    ) : (
                                      <Button size="sm" disabled icon="ti-lock">
                                        Khóa Học Bị Khóa
                                      </Button>
                                    )
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}

            {filteredAssessments.length === 0 && (
              <div className="empty-state">
                <i className="ti ti-writing" aria-hidden="true" />
                <p>Không tìm thấy bài assessment nào phù hợp với bộ lọc.</p>
              </div>
            )}
          </div>
        </>
      ) : isLibraryManager ? (
        <>
          <div className="card card-pad" style={{ marginBottom: 16, fontSize: 12.5, color: 'var(--ink-soft)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <i className="ti ti-folders" style={{ color: 'var(--rail)', fontSize: 16 }} />
            <div>
              <strong>Library</strong> — tự tạo Library, thêm các <strong>Lĩnh Vực</strong> bên trong rồi gán khóa học thủ công vào từng Lĩnh Vực để dễ tra cứu. Chỉ hiển thị cho <strong>User Admin &amp; System Admin</strong>.
            </div>
          </div>
          <div className="grid grid-3" style={{ gap: 14 }}>
            {libraries.map((lib) => {
              const domainCount = (lib.domains || []).length;
              const courseCount = new Set((lib.domains || []).flatMap((d) => d.courseIds || [])).size;
              return (
                <div key={lib.id} className="card card-pad" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--ink)', marginBottom: 6 }}>{lib.name || 'Library chưa đặt tên'}</div>
                    <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginBottom: 10, minHeight: 34 }}>{lib.description}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--ink-faint)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <Badge tone="slate" size="sm">{domainCount} Lĩnh Vực</Badge>
                      <span>&middot;</span>
                      <span>{courseCount} khóa học</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', borderTop: '1px solid var(--line)', paddingTop: 10 }}>
                    <Button size="sm" icon="ti-pencil" onClick={() => setEditingLibrary(lib)}>Quản Lý</Button>
                    <Button
                      size="sm"
                      variant="danger"
                      icon="ti-trash"
                      onClick={() => { if (window.confirm(`Xóa Library "${lib.name}"? Các khóa học không bị ảnh hưởng.`)) deleteLibrary(lib.id); }}
                    >
                      Xóa
                    </Button>
                  </div>
                </div>
              );
            })}
            {libraries.length === 0 && (
              <div className="empty-state" style={{ gridColumn: '1 / -1' }}>
                <i className="ti ti-folders" aria-hidden="true" />
                <p>Chưa có Library nào. Bấm "Tạo Library Mới" để bắt đầu.</p>
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          {/* Filter & Search Bar */}
          <div className="card card-pad" style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ position: 'relative', width: 240, flexShrink: 0 }}>
                <i className="ti ti-search" style={{ position: 'absolute', left: 10, top: 10, color: 'var(--ink-faint)', fontSize: 14 }} />
                <input
                  type="text"
                  className="field-input"
                  style={{ paddingLeft: 32, height: 34, fontSize: 12.5, width: '100%' }}
                  placeholder={language === 'en' ? 'Search by title, code...' : 'Tìm kiếm theo tên, mã khóa...'}
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                />
              </div>

              <select
                className="field-select"
                style={{ height: 34, fontSize: 12, width: 190, flexShrink: 0 }}
                value={selectedCategory}
                onChange={(e) => { setSelectedCategory(e.target.value); setPage(1); }}
              >
                <option value="ALL">{language === 'en' ? `All Categories (${companyCategories.length})` : `Tất Cả Danh Mục (${companyCategories.length})`}</option>
                {companyCategories.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>

              <select
                className="field-select"
                style={{ height: 34, fontSize: 12, width: 190, flexShrink: 0 }}
                value={selectedType}
                onChange={(e) => { setSelectedType(e.target.value); setPage(1); }}
              >
                <option value="ALL">All Types (Mandatory &amp; Elective)</option>
                <option value="MANDATORY">Mandatory Compliance</option>
                <option value="OPTIONAL">Optional Elective</option>
              </select>

              <select
                className="field-select"
                style={{ height: 34, fontSize: 12, width: 170, flexShrink: 0 }}
                value={selectedLifecycle}
                onChange={(e) => { setSelectedLifecycle(e.target.value); setPage(1); }}
              >
                <option value="ALL">Tất Cả Trạng Thái</option>
                {Object.entries(isFullAdmin ? LIFECYCLE_STATUS_META : PERSONAL_LIFECYCLE_STATUS_META).map(([key, meta]) => (
                  <option key={key} value={key}>{meta.label}</option>
                ))}
              </select>

              <select
                className="field-select"
                style={{ height: 34, fontSize: 12, width: 190, flexShrink: 0 }}
                value={groupBy}
                onChange={(e) => setGroupBy(e.target.value)}
              >
                {COURSE_GROUP_BY_OPTIONS.map((opt) => (
                  <option key={opt.id} value={opt.id}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
              Showing <strong>{groups ? filtered.length : paginated.length}</strong> of <strong>{filtered.length}</strong> matched courses
            </div>
          </div>

          {groups ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {groups.map((g) => {
                const collapsed = collapsedGroups.has(g.key);
                return (
                  <div key={g.key} className="card" style={{ overflow: 'hidden' }}>
                    <button
                      type="button"
                      onClick={() => toggleGroup(g.key)}
                      style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'var(--paper-sunken)', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                    >
                      <span style={{ fontWeight: 700, fontSize: 13.5, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <i className={`ti ${collapsed ? 'ti-chevron-right' : 'ti-chevron-down'}`} aria-hidden="true" />
                        {g.icon && <i className={`ti ${g.icon}`} aria-hidden="true" />} {g.label}
                        <Badge tone="slate">{g.items.length}</Badge>
                      </span>
                    </button>
                    {!collapsed && renderCourseTable(g.items)}
                  </div>
                );
              })}
              {groups.length === 0 && (
                <div className="empty-state"><p>No courses match the current filters.</p></div>
              )}
            </div>
          ) : (
            <>
              {renderCourseTable(paginated)}
              {totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, flexWrap: 'wrap', gap: 10 }}>
                  <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
                    Page <strong>{page}</strong> of <strong>{totalPages}</strong> ({filtered.length} courses total)
                  </span>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                      &larr; Previous
                    </Button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                      .map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setPage(p)}
                          className="btn btn-sm"
                          style={{
                            background: page === p ? 'var(--rail)' : 'var(--paper-raised)',
                            color: page === p ? '#fff' : 'var(--ink)',
                            borderColor: page === p ? 'var(--rail)' : 'var(--line-strong)',
                            minWidth: 32,
                          }}
                        >
                          {p}
</button>
                      ))}
                    <Button size="sm" variant="outline" disabled={page === totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
                      Next &rarr;
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}

      {viewingCourse && (
        <CourseDetailModal
          course={viewingCourse}
          courses={courses}
          onClose={() => setViewingCourse(null)}
          onEdit={(c) => {
            setViewingCourse(null);
            navigate(`/admin/courses/${c.id}`);
          }}
          isAdmin={isAdmin}
          currentUser={currentUser}
        />
      )}

      {viewingCurriculum && (
        <CurriculumDetailModal
          curriculum={viewingCurriculum}
          courses={courses}
          curricula={curricula}
          onClose={() => setViewingCurriculum(null)}
          onAssign={assignCurriculum}
          onPropose={proposeCurriculumAssignment}
          onRemoveAssignment={removeCurriculumAssignment}
          onEdit={(cur) => {
            setViewingCurriculum(null);
            setEditingCurriculum(cur);
          }}
          isAdmin={isCurriculumAdmin}
          currentUser={currentUser}
          approvals={approvals}
        />
      )}

      {editingCurriculum && (
        <CurriculumEditorModal
          draft={editingCurriculum}
          courses={courses}
          companyCategories={companyCategories}
          certificateTemplates={certificateTemplates}
          onCreateCertificateTemplate={addCertificateTemplate}
          onCancel={() => setEditingCurriculum(null)}
          onSave={saveCurriculum}
        />
      )}

      {editingLibrary && (
        <LibraryEditorModal
          draft={editingLibrary}
          courses={courses}
          companyCategories={companyCategories}
          onCancel={() => setEditingLibrary(null)}
          onSave={saveLibrary}
        />
      )}

      {editingAssessment && (
        <AssessmentEditorModal
          assessment={editingAssessment.id ? editingAssessment : null}
          isOpen={Boolean(editingAssessment)}
          onClose={() => setEditingAssessment(null)}
          onSave={(saved) => {
            if (assessments.some((a) => a.id === saved.id)) {
              updateAssessment(saved.id, saved);
            } else {
              addAssessment(saved);
            }
            setEditingAssessment(null);
          }}
          courses={courses}
          companyCategories={companyCategories}
          questionBanks={questionBanks}
          onAddQuestionToBank={addQuestionToBank}
        />
      )}

      {viewingAssessment && (
        <AssessmentDetailModal
          assessment={viewingAssessment}
          isOpen={Boolean(viewingAssessment)}
          onClose={() => setViewingAssessment(null)}
          attempts={assessmentAttempts}
          questionBanks={questionBanks}
          courses={courses}
          canTake={getAssessmentAccess(viewingAssessment, currentUser, courses).canTake}
          accessReason={getAssessmentAccess(viewingAssessment, currentUser, courses).reason}
          onStartAssessment={() => {
            const targetId = viewingAssessment.id;
            const isCourseLinked = viewingAssessment.deliveryFormat === DELIVERY_FORMATS.COURSE_LINKED;
            const cId = viewingAssessment.courseId;
            setViewingAssessment(null);
            if (isCourseLinked && cId) {
              navigate(`${learnerCourseBasePath}/${cId}`);
            } else {
              navigate(`${assessmentPlayerBasePath}/${targetId}`);
            }
          }}
        />
      )}
    </>
  );
}



function CurriculumDetailModal({
  curriculum: initialCurriculum,
  courses,
  curricula: propCurricula,
  onClose,
  onAssign,
  onPropose,
  onRemoveAssignment,
  onEdit,
  isAdmin: propIsAdmin,
  currentUser: propCurrentUser,
  approvals: propApprovals,
}) {
  const {
    currentUser: storeCurrentUser,
    curricula: storeCurricula,
    assignCurriculum: storeAssign,
    proposeCurriculumAssignment: storePropose,
    removeCurriculumAssignment: storeRemove,
    approvals: storeApprovals,
    myEnrollments,
  } = useCourseStore();

  const currentUser = propCurrentUser || storeCurrentUser;
  const curricula = propCurricula || storeCurricula || [];
  const approvals = propApprovals || storeApprovals || [];
  const handleAssign = onAssign || storeAssign;
  const handlePropose = onPropose || storePropose;
  const handleRemove = onRemoveAssignment || storeRemove;

  const access = curriculumAccessOf(currentUser);
  const { mode: modalMode, canDirectAssign, canPropose, canEdit: isCurriculumAdmin } = access;
  const isHrbp = modalMode === CURRICULUM_ACCESS_MODE.VIEW_ALL;

  const [activeTab, setActiveTab] = useState('tree'); // 'tree' | 'assignments'
  const [showAssignForm, setShowAssignForm] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState(null);

  const liveCurriculum = curricula.find((c) => c.id === initialCurriculum.id) || initialCurriculum;
  const assignments = liveCurriculum.assignments || [];

  const pendingProposals = (approvals || []).filter(
    (a) => a.curriculumId === liveCurriculum.id && a.status === 'PENDING'
  );

  function handleSaveAssignment({ assignmentType, targets, dueDate, justification }) {
    if (canDirectAssign) {
      const toAdd = targets.map((t) => ({
        assignmentType,
        targetId: t.targetId,
        targetLabel: t.targetLabel,
        dueDate: dueDate || '',
      }));
      handleAssign(liveCurriculum.id, toAdd);
      setFeedbackMsg(`✅ Đã phân bổ giáo trình thành công cho ${targets.length} đối tượng!`);
    } else if (isHrbp && handlePropose) {
      targets.forEach((t) => {
        handlePropose(
          liveCurriculum.id,
          {
            assignmentType,
            targetId: t.targetId,
            targetLabel: t.targetLabel,
            dueDate: dueDate || '',
          },
          justification
        );
      });
      setFeedbackMsg(`📋 Đã gửi ${targets.length} đơn đề xuất phân bổ giáo trình tới User Admin để phê duyệt!`);
    }

    setShowAssignForm(false);
    setTimeout(() => setFeedbackMsg(null), 5000);
  }

  return (
    <Modal
      isOpen
      title={liveCurriculum.title}
      subtitle={`${liveCurriculum.category || 'General'} · ${(liveCurriculum.courseIds || []).length} khóa học · ${assignments.length} đối tượng chính thức · ${pendingProposals.length} đơn chờ duyệt`}
      onClose={onClose}
      size="lg"
      footer={(
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <div>
            <Badge tone={liveCurriculum.status === 'PUBLISHED' ? 'sage' : 'rail'}>
              {liveCurriculum.status === 'PUBLISHED' ? 'Published' : 'Draft'}
            </Badge>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {isCurriculumAdmin && (
              <Button size="sm" variant="outline" icon="ti-pencil" onClick={() => onEdit(liveCurriculum)}>
                Chỉnh Sửa Giáo Trình
              </Button>
            )}
            <Button variant="ghost" onClick={onClose}>Đóng</Button>
          </div>
        </div>
      )}
    >
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 13, color: 'var(--ink-soft)', marginBottom: 14, lineHeight: 1.5 }}>
          {liveCurriculum.description}
        </div>
        {modalMode !== CURRICULUM_ACCESS_MODE.ASSIGNED_ONLY && (
          <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid var(--line)', paddingBottom: 10 }}>
            <button
              type="button"
              className={`btn btn-sm ${activeTab === 'tree' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setActiveTab('tree')}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <i className="ti ti-sitemap" /> Cấu Trúc Khóa Học ({(liveCurriculum.courseIds || []).length})
            </button>
            <button
              type="button"
              className={`btn btn-sm ${activeTab === 'assignments' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setActiveTab('assignments')}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <i className="ti ti-users-group" /> Đối Tượng Được Gán ({assignments.length})
              {pendingProposals.length > 0 && (
                <Badge tone="amber" size="sm">{pendingProposals.length} Chờ Duyệt</Badge>
              )}
            </button>
          </div>
        )}
      </div>

      {modalMode === CURRICULUM_ACCESS_MODE.ASSIGNED_ONLY || activeTab === 'tree' ? (
        <CurriculumTree curriculum={liveCurriculum} courses={courses} enrollmentsMap={myEnrollments} />
      ) : (
        <div>
          {feedbackMsg && (
            <div style={{ padding: '10px 14px', borderRadius: 8, background: '#EFF6FF', border: '1px solid #BFDBFE', color: '#1E40AF', fontSize: 12.5, fontWeight: 600, marginBottom: 14 }}>
              {feedbackMsg}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
            <div style={{ fontSize: 12.5, color: 'var(--ink-soft)' }}>
              {isHrbp
                ? 'HRBP có thể gửi đơn đề xuất phân bổ giáo trình cho nhân sự/bộ phận lên User Admin duyệt:'
                : 'Phân bổ giáo trình cho đơn vị hoặc cá nhân học viên bắt buộc tuân thủ (hỗ trợ chọn nhiều):'}
            </div>
            {(canDirectAssign || canPropose) && !showAssignForm && (
              <Button size="sm" variant="primary" icon={isHrbp ? 'ti-send' : 'ti-plus'} onClick={() => setShowAssignForm(true)}>
                {isHrbp ? 'Đề Xuất Gán Giáo Trình (Gửi Duyệt)' : 'Gán Đối Tượng Mới'}
              </Button>
            )}
          </div>

          {showAssignForm && (
            <MultiTargetAssigner
              curriculum={liveCurriculum}
              onSave={handleSaveAssignment}
              onCancel={() => setShowAssignForm(false)}
              isHrbp={isHrbp}
            />
          )}

          {pendingProposals.length > 0 && (
            <div style={{ marginBottom: 16, padding: '12px 14px', borderRadius: 8, background: '#FFFBEB', border: '1px solid #FDE68A' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#92400E', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                <i className="ti ti-clock" /> Đề Xuất Đang Chờ User Admin Phê Duyệt ({pendingProposals.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {pendingProposals.map((p) => (
                  <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', padding: '8px 12px', borderRadius: 6, border: '1px solid #FEF3C7', fontSize: 12, flexWrap: 'wrap', gap: 8 }}>
                    <div>
                      <span style={{ fontWeight: 700, color: 'var(--ink)' }}>{p.targetLabel}</span>
                      <span style={{ color: 'var(--ink-soft)', marginLeft: 6 }}>({assignmentTypeLabel(p.assignmentType)})</span>
                      {p.justification && (
                        <div style={{ color: 'var(--ink-soft)', fontSize: 11.5, marginTop: 2, fontStyle: 'italic' }}>
                          Lý do: {p.justification}
                        </div>
                      )}
                    </div>
                    <Badge tone="amber" size="sm">Đang Chờ Duyệt</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {assignments.length === 0 ? (
            <div style={{ padding: '24px 16px', textAlign: 'center', fontSize: 12.5, color: 'var(--ink-faint)', background: 'var(--paper-sunken)', borderRadius: 8 }}>
              <i className="ti ti-target-arrow" style={{ fontSize: 24, display: 'block', marginBottom: 6 }} />
              Chưa có đối tượng nào được gán chính thức giáo trình này.
            </div>
          ) : (
            <div style={{ border: '1px solid var(--line)', borderRadius: 8, overflow: 'hidden' }}>
              <table className="table" style={{ margin: 0, fontSize: 12.5 }}>
                <thead>
                  <tr style={{ background: 'var(--paper-sunken)' }}>
                    <th>Phân Loại</th>
                    <th>Tên Đối Tượng Được Gán</th>
                    <th>Hạn Chót</th>
                    <th>Ngày Gán</th>
                    {isCurriculumAdmin && <th style={{ textAlign: 'right' }}>Thao Tác</th>}
                  </tr>
                </thead>
                <tbody>
                  {assignments.map((asg) => (
                    <tr key={asg.id}>
                      <td>
                        <Badge tone="rail" size="sm">{assignmentTypeLabel(asg.assignmentType)}</Badge>
                      </td>
                      <td style={{ fontWeight: 600, color: 'var(--ink)' }}>
                        {asg.targetLabel || resolveTargetLabel(asg.assignmentType, asg.targetId)}
                      </td>
                      <td>
                        {asg.dueDate ? (
                          <span style={{ color: 'var(--ink-soft)' }}>
                            <i className="ti ti-calendar" style={{ marginRight: 4 }} />
                            {asg.dueDate}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--ink-faint)' }}>Không giới hạn</span>
                        )}
                      </td>
                      <td style={{ color: 'var(--ink-faint)', fontSize: 11.5 }}>
                        {asg.assignedAt || '—'}
                      </td>
                      {isCurriculumAdmin && (
                        <td style={{ textAlign: 'right' }}>
                          <Button
                            size="sm"
                            variant="danger"
                            icon="ti-trash"
                            onClick={() => {
                              if (window.confirm(`Hủy phân bổ giáo trình này cho "${asg.targetLabel || asg.targetId}"?`)) {
                                handleRemove(liveCurriculum.id, asg.id);
                              }
                            }}
                          >
                            Xóa
                          </Button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

function CourseDetailModal({
  course: initialCourse,
  courses,
  onClose,
  onEdit,
  isAdmin,
  currentUser,
}) {
  const navigate = useNavigate();
  const {
    courses: storeCourses,
    assignCourse,
    removeCourseAssignment,
    accessFor,
  } = useCourseStore();

  const liveCourse = (storeCourses || courses || []).find((c) => c.id === initialCourse.id) || initialCourse;
  const assignments = liveCourse.assignments || (liveCourse.assignment ? [liveCourse.assignment] : []);

  const [activeTab, setActiveTab] = useState('info'); // 'info' | 'assignments'
  const [showAssignForm, setShowAssignForm] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState(null);

  const formatBadge = courseFormatBadge(liveCourse);
  const coursePricing = pricingOf(liveCourse);
  const targetLevels = liveCourse.targetLevels && liveCourse.targetLevels.length > 0
    ? liveCourse.targetLevels
    : liveCourse.targetLevel ? [liveCourse.targetLevel] : ['7'];

  // Personal Learner Access for currentUser
  const myAccess = useMemo(() => {
    if (!accessFor || !currentUser) return { canAccess: true, state: ACCESS_STATE.OPEN };
    return accessFor(liveCourse, currentUser);
  }, [accessFor, liveCourse, currentUser]);

  function handleSaveAssignment({ assignmentType, targets, dueDate, justification, groupPolicy, assignedLevelEligibility }) {
    const toAdd = targets.map((t) => ({
      assignmentType,
      targetId: t.targetId,
      targetLabel: t.targetLabel,
      dueDate: dueDate || '',
      justification: justification || '',
      groupPolicy: groupPolicy || 'ELIGIBLE_ONLY',
      assignedLevelEligibility,
    }));
    assignCourse(liveCourse.id, toAdd);
    setFeedbackMsg(`✅ Đã phân bổ khóa học thành công cho ${targets.length} đối tượng!`);
    setShowAssignForm(false);
    setTimeout(() => setFeedbackMsg(null), 5000);
  }

  return (
    <Modal
      isOpen
      title={liveCourse.title}
      subtitle={`${liveCourse.code} · ${liveCourse.category || liveCourse.domain || 'General'} · Version ${liveCourse.version || 'v1.0'} · ${assignments.length} đối tượng được gán`}
      onClose={onClose}
      size="lg"
      footer={(
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <Badge tone={formatBadge.tone}>{formatBadge.icon} {formatBadge.label}</Badge>
            <Badge tone={STATUS_TONE[liveCourse.status]}>{liveCourse.status || 'PUBLISHED'}</Badge>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            {myAccess.canAccess ? (
              <Button
                size="sm"
                variant="primary"
                icon="ti-player-play"
                onClick={() => {
                  onClose();
                  navigate(`/learner/courses/${liveCourse.id}`);
                }}
              >
                🚀 Vào Học Bài (Learner Mode)
              </Button>
            ) : myAccess.state === ACCESS_STATE.REQUESTABLE ? (
              <Button
                size="sm"
                variant="outline"
                icon="ti-send"
                onClick={() => {
                  onClose();
                  navigate(`/learner/courses/${liveCourse.id}`);
                }}
              >
                ⚠️ Xin Học Vượt Cấp
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                disabled
                icon="ti-lock"
                title={myAccess.reason}
              >
                🔒 Khóa Học Vượt Cấp
              </Button>
            )}
            {isAdmin && (
              <Button size="sm" variant="outline" icon="ti-pencil" onClick={() => onEdit(liveCourse)}>
                Chỉnh Sửa (Builder)
              </Button>
            )}
            <Button variant="ghost" onClick={onClose}>Đóng</Button>
          </div>
        </div>
      )}
    >
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid var(--line)', paddingBottom: 10 }}>
          <button
            type="button"
            className={`btn btn-sm ${activeTab === 'info' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setActiveTab('info')}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <i className="ti ti-info-circle" /> Thông Tin &amp; Nội Dung
          </button>
          <button
            type="button"
            className={`btn btn-sm ${activeTab === 'assignments' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setActiveTab('assignments')}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <i className="ti ti-users-group" /> Đối Tượng Được Gán ({assignments.length})
          </button>
        </div>
      </div>

      {activeTab === 'info' ? (
        <div>
          {/* Header Banner */}
          <div style={{ display: 'flex', gap: 14, marginBottom: 16, background: 'var(--paper-sunken)', padding: 14, borderRadius: 8, border: '1px solid var(--line)' }}>
            <img
              src={getCourseImage(liveCourse)}
              alt={liveCourse.title}
              style={{ width: 100, height: 100, borderRadius: 8, objectFit: 'cover', border: '1px solid var(--line)' }}
            />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--ink)', marginBottom: 4 }}>{liveCourse.title}</div>
              <div style={{ fontSize: 12.5, color: 'var(--ink-soft)', marginBottom: 8 }}>{liveCourse.description}</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', fontSize: 12 }}>
                <span><strong>Thời lượng:</strong> {liveCourse.estimatedDuration || liveCourse.estimatedHours || '2h'}</span>
                <span>&middot;</span>
                <span><strong>Cấp bậc mục tiêu:</strong> {targetLevels.map((l) => `Level ${l}`).join(', ')}</span>
                <span>&middot;</span>
                <span><strong>Loại khóa:</strong> <CourseTypeBadge courseType={liveCourse.courseType} /></span>
                <span>&middot;</span>
                <span>
                  <strong>Học phí:</strong>{' '}
                  {coursePricing.isFree ? (
                    <Badge tone="sage" icon="ti-gift" size="sm">Miễn Phí</Badge>
                  ) : (
                    <Badge tone="amber" icon="ti-coin" size="sm">{formatVnd(coursePricing.price)} / học viên</Badge>
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* Personal Learning Status Banner for Current User */}
          {myAccess.canAccess ? (
            <div
              style={{
                padding: '12px 14px',
                borderRadius: 8,
                background: 'linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 100%)',
                border: '1px solid #86EFAC',
                marginBottom: 16,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 10,
              }}
            >
              <div>
                <div style={{ fontWeight: 700, fontSize: 13, color: '#15803D', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <i className="ti ti-circle-check" /> Bạn Đủ Điều Kiện Tham Gia Khóa Học Này
                </div>
                <div style={{ fontSize: 12, color: '#166534', marginTop: 2 }}>
                  {myAccess.reason || `Định biên: Level ${targetLevels.join(', ')} · Cấp bậc hiện tại của bạn: Level ${currentUser?.level || 7} (${Number(currentUser?.level || 7) <= Math.max(...targetLevels.map(Number)) ? 'Đúng cấp / Cấp cao hơn' : 'Được gán trực tiếp'})`}
                </div>
              </div>
              <Button
                size="sm"
                variant="primary"
                icon="ti-player-play"
                onClick={() => {
                  onClose();
                  navigate(`/learner/courses/${liveCourse.id}`);
                }}
              >
                🚀 Vào Học Ngay (Learner Mode)
              </Button>
            </div>
          ) : myAccess.state === ACCESS_STATE.REQUESTABLE ? (
            <div
              style={{
                padding: '12px 14px',
                borderRadius: 8,
                background: '#EFF6FF',
                border: '1px solid #BFDBFE',
                marginBottom: 16,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 10,
              }}
            >
              <div>
                <div style={{ fontWeight: 700, fontSize: 13, color: '#1D4ED8', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <i className="ti ti-lock" /> Khóa Học Vượt 1 Cấp (Cần Gửi Đơn Xin Học)
                </div>
                <div style={{ fontSize: 12, color: '#1E40AF', marginTop: 2 }}>
                  {myAccess.reason}
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                icon="ti-send"
                onClick={() => {
                  onClose();
                  navigate(`/learner/courses/${liveCourse.id}`);
                }}
              >
                ⚠️ Gửi Đơn Xin Học Vượt Cấp
              </Button>
            </div>
          ) : myAccess.state === ACCESS_STATE.PENDING_APPROVAL ? (
            <div
              style={{
                padding: '12px 14px',
                borderRadius: 8,
                background: '#FFFBEB',
                border: '1px solid #FDE68A',
                marginBottom: 16,
              }}
            >
              <div style={{ fontWeight: 700, fontSize: 13, color: '#92400E', display: 'flex', alignItems: 'center', gap: 6 }}>
                <i className="ti ti-clock" /> Đơn Xin Học Vượt Cấp Đang Chờ Phê Duyệt
              </div>
              <div style={{ fontSize: 12, color: '#B45309', marginTop: 2 }}>
                {myAccess.reason}
              </div>
            </div>
          ) : (
            <div
              style={{
                padding: '12px 14px',
                borderRadius: 8,
                background: '#FEF2F2',
                border: '1px solid #FECACA',
                marginBottom: 16,
              }}
            >
              <div style={{ fontWeight: 700, fontSize: 13, color: '#B91C1C', display: 'flex', alignItems: 'center', gap: 6 }}>
                <i className="ti ti-ban" /> Khóa Học Vượt Cấp — Bị Khóa Truy Cập
              </div>
              <div style={{ fontSize: 12, color: '#991B1B', marginTop: 2 }}>
                {myAccess.reason || `Khóa học định biên Level ${targetLevels.join(', ')} — Bạn đang ở Level ${currentUser?.level || 7} (Chênh ${myAccess.gap || 2} cấp bậc). Bắt buộc phải hoàn thành lộ trình cấp bậc trước.`}
              </div>
            </div>
          )}

          {/* Module / Logistics Content */}
          {liveCourse.onlineClassType === 'VIRTUAL_CLASS' ? (
            <div className="card card-pad" style={{ background: '#FFFBEB', borderColor: '#FDE68A' }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: '#92400E', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                <i className="ti ti-broadcast" /> Thông Tin Lớp Học Trực Tuyến Live
              </div>
              <div className="grid grid-2" style={{ gap: 10, fontSize: 12.5 }}>
                <div><strong>Nền tảng:</strong> {liveCourse.virtualMeeting?.platform || 'Microsoft Teams'}</div>
                <div><strong>Giảng viên chủ trì:</strong> {liveCourse.virtualMeeting?.instructorName || 'Chưa phân công'}</div>
                <div><strong>Lịch học:</strong> {liveCourse.virtualMeeting?.scheduleDate || '—'} ({liveCourse.virtualMeeting?.scheduleTime || '—'})</div>
                <div><strong>Link phòng họp:</strong> <a href={liveCourse.virtualMeeting?.meetingUrl || '#'} target="_blank" rel="noreferrer" style={{ color: 'var(--blue)' }}>{liveCourse.virtualMeeting?.meetingUrl || '—'}</a></div>
              </div>
            </div>
          ) : (liveCourse.deliveryType === 'IN_PERSON_CLASSROOM' || liveCourse.modality === 'CLASSROOM_LAB') ? (
            <div className="card card-pad" style={{ background: '#EFF6FF', borderColor: '#BFDBFE' }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: '#1E40AF', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                <i className="ti ti-school" /> Thông Tin Khóa Đào Tạo Trực Tiếp &amp; Xưởng Thực Hành
              </div>
              <div className="grid grid-2" style={{ gap: 10, fontSize: 12.5 }}>
                <div><strong>Giảng viên chính:</strong> {liveCourse.trainerName || liveCourse.instructor || 'Chưa phân công'}</div>
                {((liveCourse.coTrainers && liveCourse.coTrainers.length > 0) || (liveCourse.coTrainerNames && liveCourse.coTrainerNames.length > 0)) && (
                  <div style={{ gridColumn: '1 / -1', background: '#DBEAFE', padding: '6px 10px', borderRadius: 6, color: '#1E40AF' }}>
                    <i className="ti ti-users" style={{ marginRight: 6 }} />
                    <strong>Đồng giảng viên / Trợ giảng:</strong> {liveCourse.coTrainerNames?.join(', ') || liveCourse.coTrainers.map(t => t.fullName || t.name).join(', ')}
                  </div>
                )}
                <div><strong>Địa điểm / Xưởng:</strong> {liveCourse.venue || 'Fresh Food & Bakery Lab'}</div>
                <div><strong>Lịch đào tạo:</strong> {liveCourse.scheduleDate || '2026-08-28'} ({liveCourse.scheduleTime || '08:30 - 11:30'})</div>
                <div><strong>Sức chứa:</strong> {liveCourse.maxCapacity || 25} học viên &middot; Live QR Attendance</div>
              </div>
            </div>
          ) : (
            <div>
              <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--ink)', marginBottom: 10 }}>
                Cấu Trúc Mô-đun &amp; Bài Học ({liveCourse.modules?.length || 2} modules)
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {(liveCourse.modules || [{ id: 'm1', title: 'Module 1: Tổng quan nội dung', lessons: [] }]).map((m, idx) => (
                  <div key={m.id || idx} style={{ border: '1px solid var(--line)', borderRadius: 8, padding: '10px 12px', background: '#fff' }}>
                    <div style={{ fontWeight: 700, fontSize: 12.5, color: 'var(--ink)', marginBottom: 6 }}>
                      {idx + 1}. {m.title}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, paddingLeft: 12 }}>
                      {(m.lessons || []).map((l, lIdx) => (
                        <div key={l.id || lIdx} style={{ fontSize: 12, color: 'var(--ink-soft)', display: 'flex', alignItems: 'center', gap: 6 }}>
                          <i className={`ti ${l.lessonType === 'VIDEO' ? 'ti-video' : l.lessonType === 'SCORM' ? 'ti-package' : l.lessonType === 'PPT' ? 'ti-presentation' : l.lessonType === 'ASSESSMENT' ? 'ti-writing' : 'ti-file-text'}`} />
                          <span>{l.title}</span>
                          <Badge tone="slate" size="sm">{l.lessonType || 'E-Learning'}</Badge>
                        </div>
                      ))}
                      {(!m.lessons || m.lessons.length === 0) && (
                        <div style={{ fontSize: 11.5, color: 'var(--ink-faint)' }}>Bao gồm học liệu trực tuyến, slide tương tác và video thực tế.</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div>
          {feedbackMsg && (
            <div style={{ padding: '10px 14px', borderRadius: 8, background: '#EFF6FF', border: '1px solid #BFDBFE', color: '#1E40AF', fontSize: 12.5, fontWeight: 600, marginBottom: 14 }}>
              {feedbackMsg}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
            <div style={{ fontSize: 12.5, color: 'var(--ink-soft)' }}>
              Phân bổ khóa học bắt buộc cho BU, Division, Department, Sub-Dept, Store hoặc nhiều nhân sự cụ thể (chọn nhiều):
            </div>
            {isAdmin && !showAssignForm && (
              <Button size="sm" variant="primary" icon="ti-plus" onClick={() => setShowAssignForm(true)}>
                Gán Đối Tượng Mới
              </Button>
            )}
          </div>

          {showAssignForm && (
            <MultiTargetAssigner
              course={liveCourse}
              onSave={handleSaveAssignment}
              onCancel={() => setShowAssignForm(false)}
            />
          )}

          {assignments.length === 0 ? (
            <div style={{ padding: '24px 16px', textAlign: 'center', fontSize: 12.5, color: 'var(--ink-faint)', background: 'var(--paper-sunken)', borderRadius: 8 }}>
              <i className="ti ti-target-arrow" style={{ fontSize: 24, display: 'block', marginBottom: 6 }} />
              Chưa có đối tượng nào được gán khóa học này. Bấm "Gán Đối Tượng Mới" để phân bổ.
            </div>
          ) : (
            <div style={{ border: '1px solid var(--line)', borderRadius: 8, overflow: 'hidden' }}>
              <table className="table" style={{ margin: 0, fontSize: 12.5 }}>
                <thead>
                  <tr style={{ background: 'var(--paper-sunken)' }}>
                    <th>Phân Loại</th>
                    <th>Tên Đối Tượng Được Gán</th>
                    <th>Hạn Chót</th>
                    <th>Ngày Gán</th>
                    {isAdmin && <th style={{ textAlign: 'right' }}>Thao Tác</th>}
                  </tr>
                </thead>
                <tbody>
                  {assignments.map((asg, index) => (
                    <tr key={asg.id || index}>
                      <td>
                        <Badge tone="rail" size="sm">{assignmentTypeLabel(asg.assignmentType)}</Badge>
                      </td>
                      <td style={{ fontWeight: 600, color: 'var(--ink)' }}>
                        {asg.targetLabel || resolveTargetLabel(asg.assignmentType, asg.targetId)}
                      </td>
                      <td>
                        {asg.dueDate ? (
                          <span style={{ color: 'var(--ink-soft)' }}>
                            <i className="ti ti-calendar" style={{ marginRight: 4 }} />
                            {asg.dueDate}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--ink-faint)' }}>Không giới hạn</span>
                        )}
                      </td>
                      <td style={{ color: 'var(--ink-faint)', fontSize: 11.5 }}>
                        {asg.assignedAt || '—'}
                      </td>
                      {isAdmin && (
                        <td style={{ textAlign: 'right' }}>
                          <Button
                            size="sm"
                            variant="danger"
                            icon="ti-trash"
                            onClick={() => {
                              if (window.confirm(`Hủy phân bổ khóa học này cho "${asg.targetLabel || asg.targetId}"?`)) {
                                removeCourseAssignment(liveCourse.id, asg.id);
                              }
                            }}
                          >
                            Xóa
                          </Button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

export function CurriculumEditorModal({ draft, courses, companyCategories, certificateTemplates = [], onCreateCertificateTemplate, onCancel, onSave }) {
  const [form, setForm] = useState(() => ({
    ...draft,
    category: draft.category || companyCategories[0] || 'Store Operations',
    assignments: draft.assignments || [],
    certificateTemplateId: draft.certificateTemplateId || null,
  }));

  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [levelFilter, setLevelFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  const eLearningCourses = useMemo(() => {
    return (courses || []).filter((c) => {
      // Ưu tiên các khóa Online E-Learning tự học
      if (c.deliveryType === 'IN_PERSON_CLASSROOM' || c.modality === 'CLASSROOM_LAB') return false;
      if (c.onlineClassType === 'VIRTUAL_CLASS') return false;
      return true;
    });
  }, [courses]);

  function toggleCourse(id) {
    setForm((f) => ({
      ...f,
      courseIds: (f.courseIds || []).includes(id)
        ? (f.courseIds || []).filter((x) => x !== id)
        : [...(f.courseIds || []), id],
    }));
  }

  function removeCourse(id) {
    setForm((f) => ({
      ...f,
      courseIds: (f.courseIds || []).filter((x) => x !== id),
    }));
  }

  // Filter available courses
  const filteredAvailable = eLearningCourses.filter((c) => {
    const matchCat = categoryFilter === 'ALL' || courseMatchesCategory(c, categoryFilter);
    const matchLevel = levelFilter === 'ALL' || String(c.targetLevel || c.level || '') === String(levelFilter);
    const matchSearch = !search ||
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.code.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchLevel && matchSearch;
  });

  function selectAllFiltered() {
    const idsToAdd = filteredAvailable.map((c) => c.id);
    setForm((f) => ({
      ...f,
      courseIds: Array.from(new Set([...f.courseIds, ...idsToAdd])),
    }));
  }

  function clearAllSelected() {
    setForm((f) => ({ ...f, courseIds: [] }));
  }

  const selectedCourses = (form.courseIds || [])
    .map((id) => courses.find((c) => c.id === id))
    .filter(Boolean);

  const totalSelectedHours = selectedCourses.reduce((sum, c) => {
    const h = parseFloat(c.estimatedHours) || 2;
    return sum + h;
  }, 0);

  return (
    <Modal
      isOpen
      title={draft.title ? 'Chỉnh Sửa Giáo Trình (Edit Curriculum)' : 'Tạo Giáo Trình Mới (Create Curriculum)'}
      subtitle="Thiết lập giáo trình lộ trình bao gồm nhiều khóa học E-Learning tự học chuẩn hóa"
      onClose={onCancel}
      size="xl"
      footer={(
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <div style={{ fontSize: 12.5, color: 'var(--ink-soft)' }}>
            Đã chọn: <strong style={{ color: 'var(--rail)' }}>{form.courseIds.length}</strong> khóa học E-Learning ({totalSelectedHours.toFixed(1)}h học)
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="ghost" onClick={onCancel}>Hủy</Button>
            <Button
              variant="primary"
              icon="ti-check"
              disabled={!form.title.trim() || form.courseIds.length === 0}
              onClick={() => onSave(form)}
            >
              Lưu Giáo Trình
            </Button>
          </div>
        </div>
      )}
    >
      <div className="grid grid-2" style={{ gap: 14, marginBottom: 12 }}>
        <div>
          <label className="field-label">Tên giáo trình (Curriculum Title) <span style={{ color: 'var(--rust)' }}>*</span></label>
          <input
            className="field-input"
            placeholder="VD: Chương Trình Nền Tảng An Toàn Thực Phẩm"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            required
          />
        </div>
        <div>
          <label className="field-label">Lĩnh vực chuyên môn (Category)</label>
          <select
            className="field-select"
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
          >
            {companyCategories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ marginBottom: 12 }}>
        <label className="field-label">Mô tả giáo trình &amp; mục tiêu đào tạo</label>
        <textarea
          className="field-input"
          rows={2}
          style={{ resize: 'vertical' }}
          placeholder="Mô tả mục tiêu, đối tượng áp dụng và kết quả đầu ra của giáo trình..."
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
      </div>

      <div style={{ marginBottom: 16, display: 'flex', gap: 16, alignItems: 'center' }}>
        <label style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontWeight: 600 }}>
          <input
            type="checkbox"
            checked={form.status === 'PUBLISHED'}
            onChange={(e) => setForm({ ...form, status: e.target.checked ? 'PUBLISHED' : 'DRAFT' })}
          />
          <span>Xuất bản ngay (Published - Sẵn sàng phân bổ cho học viên)</span>
        </label>
      </div>

      <div style={{ marginBottom: 16 }}>
        <CertificateTemplatePicker
          templateId={form.certificateTemplateId}
          onChange={(id) => setForm({ ...form, certificateTemplateId: id })}
          certificateTemplates={certificateTemplates}
          companyCategories={companyCategories}
          defaultCategory={form.category}
          onCreateTemplate={onCreateCertificateTemplate}
        />
      </div>

      {/* Course Selection Area */}
      <div style={{ borderTop: '1px solid var(--line)', paddingTop: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
          <div style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--ink)' }}>
            <i className="ti ti-books" style={{ color: 'var(--rail)', marginRight: 6 }} />
            Chọn Khóa Học E-Learning Vào Giáo Trình
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button size="sm" variant="outline" onClick={selectAllFiltered}>
              Chọn tất cả đang lọc ({filteredAvailable.length})
            </Button>
            <Button size="sm" variant="ghost" onClick={clearAllSelected}>
              Bỏ chọn tất cả
            </Button>
          </div>
        </div>

        {/* Filter bar */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', background: 'var(--paper-sunken)', padding: '10px 12px', borderRadius: 8 }}>
          <div style={{ position: 'relative', flex: '1 1 200px' }}>
            <i className="ti ti-search" style={{ position: 'absolute', left: 9, top: 9, color: 'var(--ink-faint)', fontSize: 13 }} />
            <input
              type="text"
              className="field-input"
              style={{ paddingLeft: 28, height: 32, fontSize: 12 }}
              placeholder="Tìm kiếm mã hoặc tên khóa..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <select
            className="field-select"
            style={{ width: 170, height: 32, fontSize: 12 }}
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="ALL">Tất cả danh mục ({companyCategories.length})</option>
            {companyCategories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <select
            className="field-select"
            style={{ width: 130, height: 32, fontSize: 12 }}
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
          >
            <option value="ALL">Tất cả Level</option>
            {['1', '2', '3', '4', '5', '6', '7'].map((lvl) => (
              <option key={lvl} value={lvl}>Level {lvl}</option>
            ))}
          </select>
        </div>

        {/* 2-Column Picker */}
        <div className="grid grid-2" style={{ gap: 14, alignItems: 'start' }}>
          {/* Left Column: Filtered Available E-Learning Courses */}
          <div style={{ border: '1px solid var(--line)', borderRadius: 8, overflow: 'hidden' }}>
            <div style={{ padding: '8px 12px', background: 'var(--paper-sunken)', borderBottom: '1px solid var(--line)', fontSize: 12, fontWeight: 700, display: 'flex', justifyContent: 'space-between' }}>
              <span>Danh sách khóa E-Learning ({filteredAvailable.length})</span>
              <span style={{ color: 'var(--ink-faint)' }}>Tích chọn để thêm</span>
            </div>
            <div style={{ maxHeight: 300, overflowY: 'auto', padding: 6 }}>
              {filteredAvailable.map((c) => {
                const isSelected = form.courseIds.includes(c.id);
                return (
                  <div
                    key={c.id}
                    onClick={() => toggleCourse(c.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '8px 10px',
                      borderRadius: 6,
                      marginBottom: 4,
                      background: isSelected ? 'var(--blue-soft, rgba(37,99,235,0.08))' : 'transparent',
                      border: isSelected ? '1px solid var(--blue, #3b82f6)' : '1px solid transparent',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {}} // handled by parent div
                      style={{ cursor: 'pointer' }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 2 }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-faint)', fontWeight: 600 }}>{c.code}</span>
                        <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink)' }}>{c.title}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--ink-soft)' }}>
                        <Badge tone="slate" size="sm">{c.category || 'Store Ops'}</Badge>
                        <span>Lvl {c.targetLevel || c.level || '7'}</span>
                        <span>&middot;</span>
                        <span>{c.estimatedHours || '2h'}</span>
                        <span>&middot;</span>
                        <span>{(c.modules || []).length} modules</span>
                      </div>
                    </div>
                  </div>
                );
              })}
              {filteredAvailable.length === 0 && (
                <div style={{ padding: '24px 12px', textAlign: 'center', fontSize: 12, color: 'var(--ink-faint)' }}>
                  Không tìm thấy khóa E-Learning phù hợp với bộ lọc.
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Selected Courses in Curriculum */}
          <div style={{ border: '1px solid var(--line)', borderRadius: 8, overflow: 'hidden' }}>
            <div style={{ padding: '8px 12px', background: 'var(--paper-sunken)', borderBottom: '1px solid var(--line)', fontSize: 12, fontWeight: 700, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Khóa học đã chọn ({selectedCourses.length})</span>
              <Badge tone="sage" size="sm">{totalSelectedHours.toFixed(1)} giờ học</Badge>
            </div>
            <div style={{ maxHeight: 300, overflowY: 'auto', padding: 6 }}>
              {selectedCourses.map((c, idx) => (
                <div
                  key={c.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 8,
                    padding: '8px 10px',
                    borderRadius: 6,
                    marginBottom: 4,
                    background: 'var(--paper-raised)',
                    border: '1px solid var(--line)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-faint)', width: 16 }}>{idx + 1}.</span>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={c.title}>
                        {c.title}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--ink-faint)', fontFamily: 'var(--font-mono)' }}>
                        {c.code} &middot; {c.estimatedHours || '2h'}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeCourse(c.id);
                    }}
                    className="btn btn-sm"
                    style={{ padding: '2px 6px', color: 'var(--rust)', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 14 }}
                    title="Bỏ khóa này"
                  >
                    <i className="ti ti-x" />
                  </button>
                </div>
              ))}
              {selectedCourses.length === 0 && (
                <div style={{ padding: '30px 12px', textAlign: 'center', fontSize: 12, color: 'var(--ink-faint)' }}>
                  <i className="ti ti-books" style={{ fontSize: 24, display: 'block', marginBottom: 6 }} />
                  Chưa có khóa học nào được chọn vào giáo trình.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}

// Editor 1-lần cho Library: tên/mô tả + thêm Lĩnh Vực (gắn 1 Category có sẵn)
// + gán khóa học vào từng Lĩnh Vực đều thao tác trên state cục bộ (chưa ghi
// store), chỉ commit 1 lần khi bấm "Lưu Library" (qua onSave, giống hệt
// CurriculumEditorModal) — dùng chung cho cả tạo mới lẫn sửa Library đã có,
// nên "xây" xong toàn bộ cụm Lĩnh Vực + khóa học trong 1 lần mở modal.
export function LibraryEditorModal({ draft, courses, companyCategories, onCancel, onSave }) {
  const [form, setForm] = useState(() => ({ ...draft, domains: draft.domains || [] }));
  const domains = form.domains;

  const [addingDomainCategory, setAddingDomainCategory] = useState('');
  const [openPickerFor, setOpenPickerFor] = useState(null);
  const [pickerSearch, setPickerSearch] = useState('');
  const [pickerSelected, setPickerSelected] = useState([]);

  const usedCategories = new Set(domains.map((d) => d.category));
  const availableCategories = companyCategories.filter((c) => !usedCategories.has(c));
  const totalCourses = new Set(domains.flatMap((d) => d.courseIds || [])).size;

  function setDomains(nextDomains) {
    setForm((f) => ({ ...f, domains: nextDomains }));
  }

  function addDomain() {
    if (!addingDomainCategory) return;
    setDomains([...domains, { id: `DOM-${Date.now()}`, category: addingDomainCategory, courseIds: [] }]);
    setAddingDomainCategory('');
  }

  function removeDomain(domainId) {
    if (!window.confirm('Bỏ Lĩnh Vực này khỏi Library? Khóa học bên trong không bị ảnh hưởng.')) return;
    setDomains(domains.filter((d) => d.id !== domainId));
    if (openPickerFor === domainId) setOpenPickerFor(null);
  }

  function removeCourseFromDomain(domainId, courseId) {
    setDomains(domains.map((d) => (d.id === domainId ? { ...d, courseIds: (d.courseIds || []).filter((id) => id !== courseId) } : d)));
  }

  function openPicker(domainId) {
    setOpenPickerFor(domainId === openPickerFor ? null : domainId);
    setPickerSearch('');
    setPickerSelected([]);
  }

  function togglePickerCourse(id) {
    setPickerSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function confirmAddCourses(domainId) {
    setDomains(domains.map((d) => (d.id === domainId ? { ...d, courseIds: Array.from(new Set([...(d.courseIds || []), ...pickerSelected])) } : d)));
    setOpenPickerFor(null);
    setPickerSelected([]);
    setPickerSearch('');
  }

  return (
    <Modal
      isOpen
      title={draft.name ? 'Chỉnh Sửa Library' : 'Tạo Library Mới'}
      subtitle={`${domains.length} Lĩnh Vực · ${totalCourses} khóa học — thêm Lĩnh Vực & khóa học rồi bấm Lưu để tạo 1 lần`}
      onClose={onCancel}
      size="xl"
      footer={(
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', gap: 12 }}>
          <div style={{ fontSize: 12, color: 'var(--ink-faint)' }}>
            {domains.length} Lĩnh Vực &middot; {totalCourses} khóa học đã gán
          </div>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <Button variant="ghost" onClick={onCancel}>Hủy</Button>
            <Button variant="primary" icon="ti-check" disabled={!form.name.trim()} onClick={() => onSave(form)}>
              Lưu Library
            </Button>
          </div>
        </div>
      )}
    >
      <div className="grid grid-2" style={{ gap: 14, marginBottom: 16 }}>
        <div>
          <label className="field-label">Tên Library <span style={{ color: 'var(--rust)' }}>*</span></label>
          <input
            className="field-input"
            placeholder="VD: Thư Viện Kỹ Năng Cứng"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
        </div>
        <div>
          <label className="field-label">Mô tả</label>
          <input
            className="field-input"
            placeholder="Mục đích & phạm vi của Library này..."
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {domains.map((d) => {
          const domainCourses = (d.courseIds || []).map((id) => courses.find((c) => c.id === id)).filter(Boolean);
          const isPickerOpen = openPickerFor === d.id;
          const q = pickerSearch.toLowerCase();
          const pickerCandidates = courses.filter((c) => {
            if ((d.courseIds || []).includes(c.id)) return false;
            return !q || c.title.toLowerCase().includes(q) || c.code.toLowerCase().includes(q);
          });

          return (
            <div key={d.id} className="card" style={{ overflow: 'hidden' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'var(--paper-sunken)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Badge tone="rail" icon="ti-tag">{d.category}</Badge>
                  <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>{domainCourses.length} khóa học</span>
                </div>
                <button
                  type="button"
                  onClick={() => removeDomain(d.id)}
                  className="btn btn-sm"
                  style={{ background: 'transparent', border: 'none', color: 'var(--rust)', cursor: 'pointer' }}
                  title="Xóa Lĩnh Vực"
                >
                  <i className="ti ti-trash" />
                </button>
              </div>

              <div style={{ padding: '10px 14px' }}>
                {domainCourses.map((c) => (
                  <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 8px', borderRadius: 6 }}>
                    <div style={{ fontSize: 12.5, color: 'var(--ink)' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-faint)', marginRight: 6 }}>{c.code}</span>
                      {c.title}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeCourseFromDomain(d.id, c.id)}
                      style={{ background: 'transparent', border: 'none', color: 'var(--rust)', cursor: 'pointer' }}
                      title="Bỏ khỏi Lĩnh Vực"
                    >
                      <i className="ti ti-x" />
                    </button>
                  </div>
                ))}
                {domainCourses.length === 0 && (
                  <div style={{ fontSize: 12, color: 'var(--ink-faint)', padding: '8px 0' }}>Chưa có khóa học nào trong Lĩnh Vực này.</div>
                )}

                <Button size="sm" variant="outline" icon="ti-plus" onClick={() => openPicker(d.id)} style={{ marginTop: 8 }}>
                  {isPickerOpen ? 'Đóng' : 'Thêm Khóa Học'}
                </Button>

                {isPickerOpen && (
                  <div style={{ marginTop: 10, border: '1px solid var(--line)', borderRadius: 8, padding: 10, background: 'var(--paper-sunken)' }}>
                    <input
                      type="text"
                      className="field-input"
                      style={{ height: 32, fontSize: 12, marginBottom: 8 }}
                      placeholder="Tìm khóa học theo tên hoặc mã..."
                      value={pickerSearch}
                      onChange={(e) => setPickerSearch(e.target.value)}
                    />
                    <div style={{ maxHeight: 220, overflowY: 'auto' }}>
                      {pickerCandidates.map((c) => {
                        const checked = pickerSelected.includes(c.id);
                        return (
                          <div
                            key={c.id}
                            onClick={() => togglePickerCourse(c.id)}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderRadius: 6, cursor: 'pointer',
                              background: checked ? 'var(--blue-soft, rgba(37,99,235,0.08))' : 'transparent',
                            }}
                          >
                            <input type="checkbox" checked={checked} onChange={() => {}} />
                            <div style={{ fontSize: 12, color: 'var(--ink)' }}>
                              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-faint)', marginRight: 6 }}>{c.code}</span>
                              {c.title}
                            </div>
                          </div>
                        );
                      })}
                      {pickerCandidates.length === 0 && (
                        <div style={{ fontSize: 12, color: 'var(--ink-faint)', padding: 8 }}>Không có khóa học phù hợp.</div>
                      )}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
                      <Button size="sm" variant="ghost" onClick={() => setOpenPickerFor(null)}>Hủy</Button>
                      <Button size="sm" variant="primary" disabled={pickerSelected.length === 0} onClick={() => confirmAddCourses(d.id)}>
                        Thêm {pickerSelected.length || ''} Khóa Đã Chọn
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {domains.length === 0 && (
          <div className="empty-state"><p>Chưa có Lĩnh Vực nào. Thêm Lĩnh Vực đầu tiên bên dưới.</p></div>
        )}

        <div style={{ display: 'flex', gap: 8, alignItems: 'center', borderTop: '1px solid var(--line)', paddingTop: 12 }}>
          <select
            className="field-select"
            style={{ height: 34, fontSize: 12, flex: 1 }}
            value={addingDomainCategory}
            onChange={(e) => setAddingDomainCategory(e.target.value)}
          >
            <option value="">{availableCategories.length ? 'Chọn Lĩnh Vực để thêm...' : 'Đã thêm hết Danh Mục hiện có'}</option>
            {availableCategories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <Button size="sm" variant="primary" icon="ti-plus" disabled={!addingDomainCategory} onClick={addDomain}>
            Thêm Lĩnh Vực
          </Button>
        </div>
      </div>
    </Modal>
  );
}
