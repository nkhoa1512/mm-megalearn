import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { courseHasParticipants, userAdminUser } from '../../data/mockData';
import { Badge, Button, CourseTypeBadge, Modal, Tabs } from '../../components/ui';
import { useCourseStore } from '../../state/CourseStore';
import { canAuthorAnyCourse, hasCapability, normalizeRole } from '../../data/roles';
import { getCourseImage } from '../../data/courseImages';
import {
  courseFormatBadge, catalogSectionOf, CATALOG_SECTIONS, courseMatchesCategory,
  computeLifecycleStatus, LIFECYCLE_STATUS_META, buildCourseGroups,
  personalLifecycleStatusOf, PERSONAL_LIFECYCLE_STATUS_META,
} from '../../utils/courseCatalog';
import CurriculumTree from '../../components/catalog/CurriculumTree';
import { ASSIGNMENT_TYPES, assignmentTypeLabel, targetOptionsFor } from '../../data/assignmentTargets';
import { subDepartments } from '../../data/orgHierarchy';
import {
  assignmentTargetSummary, resolveTargetLabel,
  visibleCurriculaFor, curriculumAccessOf, CURRICULUM_ACCESS_MODE,
} from '../../utils/curriculumAssignment';

const STATUS_TONE = { PUBLISHED: 'sage', DRAFT: 'rail', ARCHIVED: 'slate' };

const CATALOG_TABS = [
  { id: 'learning-objects', label: 'Learning Objects', icon: 'ti-device-laptop', section: CATALOG_SECTIONS.LEARNING_OBJECTS },
  { id: 'online-class', label: 'Online Class', icon: 'ti-broadcast', section: CATALOG_SECTIONS.ONLINE_CLASS },
  { id: 'classroom', label: 'Classroom / In-Person', icon: 'ti-chalkboard', section: CATALOG_SECTIONS.CLASSROOM },
  { id: 'curriculum', label: 'Curriculum', icon: 'ti-books' },
  { id: 'library', label: 'Library Course', icon: 'ti-database' },
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
  return { id: `CUR-${Date.now()}`, title: '', description: '', category: defaultCat, courseIds: [], status: 'PUBLISHED', assignments: [] };
}

export default function AdminCourses() {
  const navigate = useNavigate();
  const {
    courses, updateCourse, removeCourse, currentUser, language, t,
    companyCategories, curricula, addCurriculum, updateCurriculum, deleteCurriculum,
    assignCurriculum, proposeCurriculumAssignment, removeCurriculumAssignment,
    approvals, myEnrollments,
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
  // Trainer/L&D chỉ được tạo khóa Lớp Trực Tiếp (Classroom/In-Person) — nút
  // "Create New Course" luôn tạo IN_PERSON_CLASSROOM bất kể đang ở tab nào
  // (xem onClick bên dưới), nên hiện nút đó ở tab Learning Objects / Online
  // Class dễ gây hiểu lầm là tạo được khóa E-Learning/Lớp Online. Chỉ ẩn cho
  // đúng Trainer trên 2 tab này; các role khác (User Admin, SysAdmin) và các
  // tab khác của Trainer không đổi.
  const hideCreateForTrainerTab = isAdmin && !isFullAdmin
    && (activeTabDef.section === CATALOG_SECTIONS.LEARNING_OBJECTS || activeTabDef.section === CATALOG_SECTIONS.ONLINE_CLASS);

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

  // Chỉ User Admin & SysAdmin (isFullAdmin, người thật sự tạo/quản trị danh
  // mục) mới thấy TOÀN BỘ khóa — kể cả Nháp — để còn quản lý/audit. Learner,
  // Manager, HRBP, Trainer chỉ dùng trang này để duyệt & đăng ký nên:
  //   - Nháp (DRAFT): luôn ẩn, chưa phải nội dung chính thức.
  //   - Đã Đóng (CLOSED): VẪN hiện (không ẩn hẳn như trước) để họ còn thấy lại
  //     những khóa mình từng tham gia/hoàn thành dù đã hết hạn, và để lộ đúng
  //     khóa bắt buộc nào đã hết hạn mà mình CHƯA từng đăng ký (rủi ro tuân
  //     thủ) — nhưng không cho đăng ký mới, gắn nhãn "Đã Qua Thời Gian Tham
  //     Gia" (xem personalLifecycleStatusOf trong courseCatalog.js) thay vì
  //     "Đã Đóng" như góc nhìn quản trị của Admin.
  //   - Chưa Mở (UPCOMING): khóa Lớp Trực Tiếp/Lớp Trực Tuyến vẫn hiện để đăng
  //     ký giữ chỗ trước; riêng khóa Tự Học (Learning Objects/E-Learning) ẩn
  //     tới khi thật sự mở vì không có "buổi học" nào để giữ chỗ trước cả.
  // Trainer là ngoại lệ cho riêng Nháp: khóa DRAFT do CHÍNH họ tạo (canManageCourse
  // true) vẫn phải hiện để họ soạn tiếp/sửa/publish — chỉ Nháp của người khác
  // (thuộc quyền User Admin) mới bị ẩn khỏi tầm nhìn của Trainer.
  const enrolledCourseIdSet = new Set(Object.keys(myEnrollments || {}));
  const visibleCourses = isFullAdmin
    ? courses
    : courses
      .filter((c) => {
        if (c.status === 'DRAFT' && !canManageCourse(c)) return false;
        const lifecycle = computeLifecycleStatus(c);
        if (lifecycle === 'UPCOMING' && catalogSectionOf(c) === CATALOG_SECTIONS.LEARNING_OBJECTS) return false;
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

  // Bộ lọc Trạng Thái Vòng Đời và Gộp Nhóm áp dụng cho MỌI tab liệt kê khóa
  // học (Learning Objects/Online Class/Classroom/Library), không riêng gì
  // Library — chỉ khác nhau ở chỗ Library không lọc theo section (xem hết),
  // còn 3 tab kia lọc thêm theo đúng section của tab đang mở. Với role KHÔNG
  // PHẢI Full Admin, bộ trạng thái đổi sang góc nhìn cá nhân hóa (xem
  // personalLifecycleStatusOf) thay vì Nháp/Chưa Mở/Đang Mở/Đã Đóng của Admin.
  const filtered = isCurriculum
    ? []
    : bySearchCategoryType.filter((c) => {
      if (!isLibrary && catalogSectionOf(c) !== activeTabDef.section) return false;
      const rowLifecycle = isFullAdmin ? computeLifecycleStatus(c) : personalLifecycleStatusOf(c);
      const matchLifecycle = selectedLifecycle === 'ALL' || rowLifecycle === selectedLifecycle;
      return matchLifecycle;
    });

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);
  const groups = isCurriculum ? null : buildCourseGroups(filtered, groupBy, { personal: !isFullAdmin });

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
    // Full Admin: giữ nguyên góc nhìn quản trị (Nháp/Chưa Mở/Đang Mở/Đã Đóng),
    // chỉ đổi thành "Đã Tham Gia" khi Đang Mở mà chính họ cũng đã ghi danh.
    // Các role còn lại (Learner/Manager/HRBP/Trainer): dùng thẳng trạng thái cá
    // nhân hóa (Đang Tham Gia/Đã Quá Hạn/Đã Hoàn Thành/Đã Qua Thời Gian Tham
    // Gia/Đang Mở) cho khớp với bộ lọc & gộp nhóm cùng vừa thêm ở trên.
    const isMineAndOpen = lifecycle === 'OPEN' && enrolledCourseIdSet.has(c.id);
    const lifecycleMeta = isFullAdmin
      ? (isMineAndOpen
        ? { label: 'Đã Tham Gia', labelEn: 'Joined', tone: 'rail', icon: 'ti-user-check' }
        : LIFECYCLE_STATUS_META[lifecycle])
      : PERSONAL_LIFECYCLE_STATUS_META[personalLifecycleStatusOf(c)];
    const asgCount = (c.assignments && c.assignments.length) || (c.assignment ? 1 : 0);
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
          <Badge tone={STATUS_TONE[c.status]}>
            {c.status === 'PUBLISHED' ? 'Published' : c.status === 'DRAFT' ? 'Draft' : 'Archived'}
          </Badge>
        </td>
        <td>
          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
            {!hideAllocationDetails && (
              <Button
                size="sm"
                variant="outline"
                icon="ti-list-details"
                onClick={() => setViewingCourse(c)}
              >
                Chi Tiết &amp; Phân Bổ
              </Button>
            )}
            {canManage ? (
              <>
                <Button size="sm" onClick={() => navigate(`/admin/courses/${c.id}`)}>Edit</Button>
                {c.status === 'DRAFT' && <Button size="sm" variant="primary" onClick={() => publish(c)}>Publish</Button>}
                <span title={hasParticipants ? 'Cannot delete: employees have already started this course.' : undefined}>
                  <Button size="sm" variant="danger" icon="ti-trash" disabled={hasParticipants} onClick={() => remove(c)}>Delete</Button>
                </span>
              </>
            ) : (
              <Button
                size="sm"
                variant="outline"
                icon="ti-eye"
                onClick={() => navigate(`/learner/courses/${c.id}`)}
                title={isAdmin ? 'Khóa này không do bạn tạo — chỉ xem, không sửa/xóa được.' : undefined}
              >
                View Course
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
        {isAdmin && !isCurriculum && !hideCreateForTrainerTab && (
          <Button
            variant="primary"
            icon="ti-plus"
            onClick={() => {
              if (!isFullAdmin) {
                // Trainer chỉ mở lớp Trực tiếp
                navigate('/admin/courses/new?deliveryType=IN_PERSON_CLASSROOM');
                return;
              }
              const section = activeTabDef.section;
              if (section === CATALOG_SECTIONS.CLASSROOM) navigate('/admin/courses/new?deliveryType=IN_PERSON_CLASSROOM');
              else if (section === CATALOG_SECTIONS.ONLINE_CLASS) navigate('/admin/courses/new?deliveryType=ONLINE_ELEARNING&onlineClassType=VIRTUAL_CLASS');
              else if (section === CATALOG_SECTIONS.LEARNING_OBJECTS) navigate('/admin/courses/new?deliveryType=ONLINE_ELEARNING&onlineClassType=E_LEARNING');
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
      </div>

      <Tabs
        tabs={CATALOG_TABS.map((tb) => ({
          id: tb.id,
          label: tb.label,
          icon: tb.icon,
          count: tb.id === 'curriculum' ? visibleCurricula.length : tb.id === 'library' ? visibleCourses.length : visibleCourses.filter((c) => catalogSectionOf(c) === tb.section).length,
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
          onCancel={() => setEditingCurriculum(null)}
          onSave={saveCurriculum}
        />
      )}
    </>
  );
}

function MultiTargetAssigner({ onSave, onCancel, isHrbp = false, initialAssignType = 'SUBDEPARTMENT' }) {
  const [assignType, setAssignType] = useState(initialAssignType);
  const [selectedIds, setSelectedIds] = useState([]);
  const [dueDate, setDueDate] = useState('');
  const [justification, setJustification] = useState('');
  const [userLevelFilter, setUserLevelFilter] = useState('ALL');
  const [userSubDeptFilter, setUserSubDeptFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  const targetOptions = targetOptionsFor(assignType) || [];

  const visibleOptions = useMemo(() => {
    if (assignType === 'USER') {
      return targetOptions.filter((u) => {
        const matchLvl = userLevelFilter === 'ALL' || String(u.level) === String(userLevelFilter);
        const matchSubDept = userSubDeptFilter === 'ALL' ||
          u.subDepartmentId === userSubDeptFilter ||
          u.subDepartmentCode === userSubDeptFilter;
        const matchQuery = !search ||
          (u.label && u.label.toLowerCase().includes(search.toLowerCase())) ||
          (u.fullName && u.fullName.toLowerCase().includes(search.toLowerCase())) ||
          (u.employeeCode && u.employeeCode.toLowerCase().includes(search.toLowerCase())) ||
          (u.subDepartmentName && u.subDepartmentName.toLowerCase().includes(search.toLowerCase())) ||
          (u.departmentName && u.departmentName.toLowerCase().includes(search.toLowerCase()));
        return matchLvl && matchSubDept && matchQuery;
      });
    }
    if (!search.trim()) return targetOptions;
    const q = search.toLowerCase();
    return targetOptions.filter((o) => o.label && o.label.toLowerCase().includes(q));
  }, [assignType, targetOptions, userLevelFilter, userSubDeptFilter, search]);

  function handleTypeChange(nextType) {
    setAssignType(nextType);
    setSelectedIds([]);
    setSearch('');
  }

  function toggleId(id) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function selectAll() {
    setSelectedIds(visibleOptions.map((o) => o.id));
  }

  function clearAll() {
    setSelectedIds([]);
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (selectedIds.length === 0) return;
    const targets = selectedIds.map((id) => {
      const opt = targetOptions.find((o) => o.id === id);
      return {
        targetId: id,
        targetLabel: opt ? opt.label : id,
      };
    });
    onSave({
      assignmentType: assignType,
      targets,
      dueDate,
      justification,
    });
  }

  return (
    <div className="card card-pad" style={{ background: 'var(--paper-sunken)', marginBottom: 16, border: '1px solid var(--line-strong)' }}>
      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6, color: isHrbp ? '#0369A1' : 'var(--rail)' }}>
        <i className={isHrbp ? 'ti ti-send' : 'ti-user-plus'} />
        {isHrbp ? 'Đề Xuất Phân Bổ (Gửi Lên User Admin Phê Duyệt)' : 'Gán Đối Tượng Mới (Hỗ Trợ Chọn Nhiều / Multi-Select)'}
      </div>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 12 }}>
          <label className="field-label" style={{ fontSize: 11.5 }}>Loại đối tượng (Target Type)</label>
          <select
            className="field-select"
            style={{ fontSize: 12, height: 34, width: '100%' }}
            value={assignType}
            onChange={(e) => handleTypeChange(e.target.value)}
          >
            {ASSIGNMENT_TYPES.map((t) => (
              <option key={t} value={t}>{assignmentTypeLabel(t)}</option>
            ))}
          </select>
        </div>

        {assignType === 'USER' && (
          <div className="grid grid-3" style={{ gap: 10, marginBottom: 10 }}>
            <div>
              <label className="field-label" style={{ fontSize: 11.5, color: 'var(--blue)', fontWeight: 700 }}>
                <i className="ti ti-filter" /> Lọc theo Cấp Bậc (Job Level)
              </label>
              <select
                className="field-select"
                style={{ fontSize: 12, height: 34, width: '100%', borderColor: 'var(--blue)' }}
                value={userLevelFilter}
                onChange={(e) => setUserLevelFilter(e.target.value)}
              >
                <option value="ALL">Tất Cả Cấp Bậc (Level 1 - 7)</option>
                {['1', '2', '3', '4', '5', '6', '7'].map((lvl) => (
                  <option key={lvl} value={lvl}>Level {lvl}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="field-label" style={{ fontSize: 11.5, color: 'var(--rail)', fontWeight: 700 }}>
                <i className="ti ti-git-branch" /> Lọc theo Sub-Department
              </label>
              <select
                className="field-select"
                style={{ fontSize: 12, height: 34, width: '100%', borderColor: 'var(--rail)' }}
                value={userSubDeptFilter}
                onChange={(e) => setUserSubDeptFilter(e.target.value)}
              >
                <option value="ALL">Tất Cả Sub-Departments</option>
                {subDepartments.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.code})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="field-label" style={{ fontSize: 11.5 }}>Tìm kiếm nhân sự</label>
              <div style={{ position: 'relative' }}>
                <i className="ti ti-search" style={{ position: 'absolute', left: 9, top: 9, color: 'var(--ink-faint)', fontSize: 13 }} />
                <input
                  type="text"
                  className="field-input"
                  style={{ fontSize: 12, height: 34, paddingLeft: 28, width: '100%' }}
                  placeholder="Nhập tên, mã NV, phòng ban..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
          </div>
        )}

        {assignType !== 'USER' && (
          <div style={{ marginBottom: 10 }}>
            <label className="field-label" style={{ fontSize: 11.5 }}>Tìm kiếm nhanh {assignmentTypeLabel(assignType)}</label>
            <div style={{ position: 'relative' }}>
              <i className="ti ti-search" style={{ position: 'absolute', left: 9, top: 9, color: 'var(--ink-faint)', fontSize: 13 }} />
              <input
                type="text"
                className="field-input"
                style={{ fontSize: 12, height: 34, paddingLeft: 28, width: '100%' }}
                placeholder={`Tìm kiếm trong ${targetOptions.length} ${assignmentTypeLabel(assignType)}...`}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        )}

        <div style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 8, padding: 10, marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, paddingBottom: 6, borderBottom: '1px solid var(--line-light)' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)' }}>
              Danh sách lựa chọn ({visibleOptions.length} mục) &middot; <span style={{ color: 'var(--rail, #15803d)' }}>Đã chọn: {selectedIds.length} đối tượng</span>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                type="button"
                className="btn btn-sm btn-ghost"
                style={{ fontSize: 11, padding: '2px 8px' }}
                onClick={selectAll}
                disabled={visibleOptions.length === 0}
              >
                Chọn tất cả ({visibleOptions.length})
              </button>
              <button
                type="button"
                className="btn btn-sm btn-ghost"
                style={{ fontSize: 11, padding: '2px 8px' }}
                onClick={clearAll}
                disabled={selectedIds.length === 0}
              >
                Bỏ chọn
              </button>
            </div>
          </div>

          <div style={{ maxHeight: 200, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
            {visibleOptions.map((opt) => {
              const checked = selectedIds.includes(opt.id);
              return (
                <label
                  key={opt.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '6px 8px',
                    borderRadius: 6,
                    background: checked ? 'var(--rail-soft, #f0fdf4)' : 'transparent',
                    border: checked ? '1px solid #bbf7d0' : '1px solid transparent',
                    cursor: 'pointer',
                    fontSize: 12,
                    userSelect: 'none',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleId(opt.id)}
                    style={{ cursor: 'pointer', accentColor: 'var(--rail)' }}
                  />
                  {assignType === 'USER' ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
                      <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--paper-sunken)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10.5, fontWeight: 700, color: 'var(--ink)' }}>
                        {opt.avatar || (opt.fullName ? opt.fullName.slice(0, 2).toUpperCase() : 'NV')}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ fontWeight: 600, color: 'var(--ink)' }}>{opt.fullName || opt.label}</span>
                        <span style={{ color: 'var(--ink-faint)', marginLeft: 6, fontSize: 11 }}>({opt.employeeCode || opt.id})</span>
                        <span style={{ color: 'var(--ink-soft)', marginLeft: 6, fontSize: 11 }}>· {opt.subDepartmentName || opt.departmentName || opt.position || ''}</span>
                      </div>
                      <Badge tone="rail" size="sm">Lv {opt.level || '7'}</Badge>
                    </div>
                  ) : (
                    <span style={{ fontWeight: checked ? 600 : 400, color: 'var(--ink)' }}>
                      {opt.label}
                    </span>
                  )}
                </label>
              );
            })}
            {visibleOptions.length === 0 && (
              <div style={{ padding: '16px 0', textAlign: 'center', color: 'var(--ink-faint)', fontSize: 12 }}>
                Không có đối tượng nào phù hợp bộ lọc tìm kiếm.
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-2" style={{ gap: 10, marginBottom: 14 }}>
          <div>
            <label className="field-label" style={{ fontSize: 11.5 }}>Hạn hoàn thành (Due Date)</label>
            <input
              type="date"
              className="field-input"
              style={{ fontSize: 12, height: 34, width: '100%' }}
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
          {isHrbp && (
            <div>
              <label className="field-label" style={{ fontSize: 11.5 }}>Lý do / Căn cứ đề xuất cho User Admin</label>
              <input
                type="text"
                className="field-input"
                style={{ fontSize: 12, height: 34, width: '100%' }}
                placeholder="VD: Đề xuất bổ sung năng lực cho đội ngũ kế nhiệm SGM..."
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
              />
            </div>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Button size="sm" variant="ghost" onClick={onCancel}>Hủy</Button>
          <Button size="sm" variant="primary" icon={isHrbp ? 'ti-send' : 'ti-check'} type="submit" disabled={selectedIds.length === 0}>
            {isHrbp
              ? `Gửi Đề Xuất Phân Bổ (${selectedIds.length} Đối Tượng)`
              : `Xác Nhận Phân Bổ (${selectedIds.length} Đối Tượng)`}
          </Button>
        </div>
      </form>
    </div>
  );
}

export function CurriculumDetailModal({
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
  const {
    courses: storeCourses,
    assignCourse,
    removeCourseAssignment,
  } = useCourseStore();

  const liveCourse = (storeCourses || courses || []).find((c) => c.id === initialCourse.id) || initialCourse;
  const assignments = liveCourse.assignments || (liveCourse.assignment ? [liveCourse.assignment] : []);

  const [activeTab, setActiveTab] = useState('info'); // 'info' | 'assignments'
  const [showAssignForm, setShowAssignForm] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState(null);

  const formatBadge = courseFormatBadge(liveCourse);
  const targetLevels = liveCourse.targetLevels && liveCourse.targetLevels.length > 0
    ? liveCourse.targetLevels
    : liveCourse.targetLevel ? [liveCourse.targetLevel] : ['7'];

  function handleSaveAssignment({ assignmentType, targets, dueDate }) {
    const toAdd = targets.map((t) => ({
      assignmentType,
      targetId: t.targetId,
      targetLabel: t.targetLabel,
      dueDate: dueDate || '',
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <Badge tone={formatBadge.tone}>{formatBadge.icon} {formatBadge.label}</Badge>
            <Badge tone={STATUS_TONE[liveCourse.status]}>{liveCourse.status || 'PUBLISHED'}</Badge>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {isAdmin && (
              <Button size="sm" variant="outline" icon="ti-pencil" onClick={() => onEdit(liveCourse)}>
                Chỉnh Sửa (Course Builder)
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
              </div>
            </div>
          </div>

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
                <div><strong>Giảng viên:</strong> {liveCourse.trainerName || 'Nguyen Van Hung'}</div>
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

export function CurriculumEditorModal({ draft, courses, companyCategories, onCancel, onSave }) {
  const [form, setForm] = useState(() => ({
    ...draft,
    category: draft.category || companyCategories[0] || 'Store Operations',
    assignments: draft.assignments || [],
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
