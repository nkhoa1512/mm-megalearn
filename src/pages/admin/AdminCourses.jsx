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
} from '../../utils/courseCatalog';
import CurriculumTree from '../../components/catalog/CurriculumTree';
import { ASSIGNMENT_TYPES, assignmentTypeLabel, targetOptionsFor } from '../../data/assignmentTargets';
import { assignmentTargetSummary, resolveTargetLabel } from '../../utils/curriculumAssignment';

const STATUS_TONE = { PUBLISHED: 'sage', DRAFT: 'rail', ARCHIVED: 'slate' };

const CATALOG_TABS = [
  { id: 'learning-objects', label: 'Learning Objects', icon: 'ti-device-laptop', section: CATALOG_SECTIONS.LEARNING_OBJECTS },
  { id: 'online-class', label: 'Online Class', icon: 'ti-broadcast', section: CATALOG_SECTIONS.ONLINE_CLASS },
  { id: 'classroom', label: 'Classroom / In-Person', icon: 'ti-chalkboard', section: CATALOG_SECTIONS.CLASSROOM },
  { id: 'curriculum', label: 'Curriculum', icon: 'ti-books' },
  { id: 'library', label: 'Library Course', icon: 'ti-database' },
];

const LIBRARY_GROUP_BY_OPTIONS = [
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
    assignCurriculum, removeCurriculumAssignment,
  } = useCourseStore();
  const role = normalizeRole(currentUser?.role);
  const isAdmin = canAuthorAnyCourse(role);
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

  function publish(course) {
    updateCourse(course.id, { ...course, status: 'PUBLISHED', publishedAt: new Date().toISOString().slice(0, 10) });
  }

  function remove(course) {
    if (window.confirm(`Delete "${course.title}"? This cannot be undone.`)) {
      removeCourse(course.id);
    }
  }

  const bySearchCategoryType = courses.filter((c) => {
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

  const filtered = isCurriculum
    ? []
    : bySearchCategoryType.filter((c) => {
      if (!isLibrary) return catalogSectionOf(c) === activeTabDef.section;
      const matchLifecycle = selectedLifecycle === 'ALL' || computeLifecycleStatus(c) === selectedLifecycle;
      return matchLifecycle;
    });

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);
  const groups = isLibrary ? buildCourseGroups(filtered, groupBy) : null;

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
    const lifecycleMeta = LIFECYCLE_STATUS_META[lifecycle];
    return (
      <tr key={c.id}>
        <td>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
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
        <td style={{ color: 'var(--ink-soft)', fontSize: 12 }}>
          {c.courseType === 'MANDATORY' ? (
            <span style={{ background: 'var(--paper-sunken)', padding: '3px 8px', borderRadius: 4, display: 'inline-block' }}>
              {c.assignment?.targetLabel || 'Assigned Division'}
            </span>
          ) : (
            <span style={{ color: 'var(--ink-faint)' }}>All MMVN Associates (Catalog)</span>
          )}
        </td>
        <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{c.modules?.length || 2}</td>
        <td style={{ fontSize: 12, color: 'var(--ink-soft)' }}>{c.estimatedDuration || c.estimatedHours || '2h'}</td>
        <td>
          <Badge tone={STATUS_TONE[c.status]}>
            {c.status === 'PUBLISHED' ? 'Published' : c.status === 'DRAFT' ? 'Draft' : 'Archived'}
          </Badge>
        </td>
        <td>
          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
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
              <th>Assigned Target Scope</th>
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
            <Badge tone="sage">{courses.length} {language === 'en' ? 'Total Programs' : 'Khóa Học'}</Badge>
          </div>
          <p>
            {language === 'en'
              ? 'Define curriculum modules, author interactive quizzes, import question banks, and target mandatory compliance by Business Unit, Division, Department, or Job Level.'
              : 'Thiết lập mô-đun bài học, bài kiểm tra tương tác, ngân hàng câu hỏi và phân bổ đào tạo bắt buộc theo Khối, Phòng ban hoặc Cấp bậc định biên.'}
          </p>
        </div>
        {isAdmin && !isCurriculum && (
          <Button
            variant="primary"
            icon="ti-plus"
            onClick={() => {
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
        {isAdmin && isCurriculum && (
          <Button variant="primary" icon="ti-plus" onClick={() => setEditingCurriculum(emptyCurriculumDraft())}>
            Create Curriculum
          </Button>
        )}
      </div>

      <Tabs
        tabs={CATALOG_TABS.map((tb) => ({
          id: tb.id,
          label: tb.label,
          icon: tb.icon,
          count: tb.id === 'curriculum' ? curricula.length : tb.id === 'library' ? courses.length : courses.filter((c) => catalogSectionOf(c) === tb.section).length,
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
            {isAdmin && (
              <Button variant="primary" icon="ti-plus" size="sm" onClick={() => setEditingCurriculum(emptyCurriculumDraft(companyCategories[0]))}>
                Tạo Giáo Trình Mới
              </Button>
            )}
          </div>
          <div className="grid grid-3" style={{ gap: 14 }}>
            {curricula.map((cur) => {
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
                      Chi Tiết &amp; Phân Bổ
                    </Button>
                    {isAdmin && <Button size="sm" onClick={() => setEditingCurriculum(cur)}>Sửa</Button>}
                    {isAdmin && (
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
            {curricula.length === 0 && (
              <div className="empty-state" style={{ gridColumn: '1 / -1' }}>
                <i className="ti ti-books" aria-hidden="true" />
                <p>Chưa có giáo trình nào.</p>
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

              {isLibrary && (
                <>
                  <select
                    className="field-select"
                    style={{ height: 34, fontSize: 12, width: 170, flexShrink: 0 }}
                    value={selectedLifecycle}
                    onChange={(e) => { setSelectedLifecycle(e.target.value); setPage(1); }}
                  >
                    <option value="ALL">Tất Cả Trạng Thái</option>
                    {Object.entries(LIFECYCLE_STATUS_META).map(([key, meta]) => (
                      <option key={key} value={key}>{meta.label}</option>
                    ))}
                  </select>

                  <select
                    className="field-select"
                    style={{ height: 34, fontSize: 12, width: 190, flexShrink: 0 }}
                    value={groupBy}
                    onChange={(e) => setGroupBy(e.target.value)}
                  >
                    {LIBRARY_GROUP_BY_OPTIONS.map((opt) => (
                      <option key={opt.id} value={opt.id}>{opt.label}</option>
                    ))}
                  </select>
                </>
              )}
            </div>

            <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
              Showing <strong>{isLibrary && groups ? filtered.length : paginated.length}</strong> of <strong>{filtered.length}</strong> matched courses
            </div>
          </div>

          {isLibrary && groups ? (
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

      {viewingCurriculum && (
        <CurriculumDetailModal
          curriculum={viewingCurriculum}
          courses={courses}
          curricula={curricula}
          onClose={() => setViewingCurriculum(null)}
          onAssign={assignCurriculum}
          onRemoveAssignment={removeCurriculumAssignment}
          onEdit={(cur) => {
            setViewingCurriculum(null);
            setEditingCurriculum(cur);
          }}
          isAdmin={isAdmin}
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

function CurriculumDetailModal({ curriculum: initialCurriculum, courses, curricula, onClose, onAssign, onRemoveAssignment, onEdit, isAdmin }) {
  const [activeTab, setActiveTab] = useState('tree'); // 'tree' | 'assignments'
  const [showAssignForm, setShowAssignForm] = useState(false);
  const [assignType, setAssignType] = useState('SUBDEPARTMENT');
  const [targetId, setTargetId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [userLevelFilter, setUserLevelFilter] = useState('ALL');
  const [userSearch, setUserSearch] = useState('');

  // Always read live state from store
  const liveCurriculum = curricula.find((c) => c.id === initialCurriculum.id) || initialCurriculum;
  const assignments = liveCurriculum.assignments || [];
  const targetOptions = targetOptionsFor(assignType) || [];

  // Filter options for USER based on userLevelFilter and userSearch
  const visibleUserOptions = useMemo(() => {
    if (assignType !== 'USER') return targetOptions;
    return targetOptions.filter((u) => {
      const matchLvl = userLevelFilter === 'ALL' || String(u.level) === String(userLevelFilter);
      const matchQuery = !userSearch ||
        (u.label && u.label.toLowerCase().includes(userSearch.toLowerCase())) ||
        (u.fullName && u.fullName.toLowerCase().includes(userSearch.toLowerCase())) ||
        (u.employeeCode && u.employeeCode.toLowerCase().includes(userSearch.toLowerCase()));
      return matchLvl && matchQuery;
    });
  }, [assignType, targetOptions, userLevelFilter, userSearch]);

  // Keep targetId in sync if filtered list changes
  useEffect(() => {
    if (assignType === 'USER') {
      if (!visibleUserOptions.some((o) => o.id === targetId)) {
        setTargetId(visibleUserOptions[0]?.id || '');
      }
    }
  }, [assignType, visibleUserOptions, targetId]);

  function handleOpenAssignForm() {
    const opts = targetOptionsFor(assignType) || [];
    setTargetId(opts[0]?.id || '');
    setUserLevelFilter('ALL');
    setUserSearch('');
    setShowAssignForm(true);
  }

  function handleSaveAssignment(e) {
    e.preventDefault();
    if (!targetId) return;
    const selectedOpt = targetOptions.find((o) => o.id === targetId);
    onAssign(liveCurriculum.id, {
      assignmentType: assignType,
      targetId,
      targetLabel: selectedOpt ? selectedOpt.label : targetId,
      dueDate: dueDate || '',
    });
    setShowAssignForm(false);
    setDueDate('');
  }

  return (
    <Modal
      isOpen
      title={liveCurriculum.title}
      subtitle={`${liveCurriculum.category || 'General'} · ${(liveCurriculum.courseIds || []).length} khóa học · ${assignments.length} đối tượng được gán`}
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
            {isAdmin && (
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
          </button>
        </div>
      </div>

      {activeTab === 'tree' ? (
        <CurriculumTree curriculum={liveCurriculum} courses={courses} />
      ) : (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
            <div style={{ fontSize: 12.5, color: 'var(--ink-soft)' }}>
              Phân bổ giáo trình cho đơn vị hoặc cá nhân học viên bắt buộc tuân thủ:
            </div>
            {isAdmin && !showAssignForm && (
              <Button size="sm" variant="primary" icon="ti-plus" onClick={handleOpenAssignForm}>
                Gán Đối Tượng Mới
              </Button>
            )}
          </div>

          {showAssignForm && (
            <div className="card card-pad" style={{ background: 'var(--paper-sunken)', marginBottom: 16, border: '1px solid var(--line-strong)' }}>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                <i className="ti ti-user-plus" style={{ color: 'var(--rail)' }} /> Gán Giáo Trình Cho Đối Tượng Mới
              </div>
              <form onSubmit={handleSaveAssignment}>
                {assignType === 'USER' ? (
                  <>
                    <div className="grid grid-2" style={{ gap: 10, marginBottom: 10 }}>
                      <div>
                        <label className="field-label" style={{ fontSize: 11.5 }}>Loại đối tượng (Target Type)</label>
                        <select
                          className="field-select"
                          style={{ fontSize: 12, height: 34, width: '100%' }}
                          value={assignType}
                          onChange={(e) => {
                            const nextType = e.target.value;
                            setAssignType(nextType);
                            const nextOpts = targetOptionsFor(nextType) || [];
                            setTargetId(nextOpts[0]?.id || '');
                          }}
                        >
                          {ASSIGNMENT_TYPES.map((t) => (
                            <option key={t} value={t}>{assignmentTypeLabel(t)}</option>
                          ))}
                        </select>
                      </div>
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
                          <option value="1">Level 1 - Director / Ban Giám Đốc</option>
                          <option value="2">Level 2 - Head of Division / Trưởng Khối</option>
                          <option value="3">Level 3 - Department Manager / Trưởng Phòng</option>
                          <option value="4">Level 4 - Section Manager / Supervisor Quản Lý</option>
                          <option value="5">Level 5 - Officer / Chuyên Viên</option>
                          <option value="6">Level 6 - Senior Associate / Trưởng Nhóm</option>
                          <option value="7">Level 7 - Junior Associate / Nhân Viên</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-2" style={{ gap: 10, marginBottom: 10 }}>
                      <div>
                        <label className="field-label" style={{ fontSize: 11.5 }}>Tìm kiếm nhân sự</label>
                        <div style={{ position: 'relative' }}>
                          <i className="ti ti-search" style={{ position: 'absolute', left: 9, top: 9, color: 'var(--ink-faint)', fontSize: 13 }} />
                          <input
                            type="text"
                            className="field-input"
                            style={{ fontSize: 12, height: 34, paddingLeft: 28, width: '100%' }}
                            placeholder="Nhập tên, mã MMVN-xxxx, phòng ban..."
                            value={userSearch}
                            onChange={(e) => setUserSearch(e.target.value)}
                          />
                        </div>
                      </div>
                      <div>
                        <label className="field-label" style={{ fontSize: 11.5 }}>
                          Chọn người dùng ({visibleUserOptions.length} người phù hợp)
                        </label>
                        <select
                          className="field-select"
                          style={{ fontSize: 12, height: 34, width: '100%' }}
                          value={targetId}
                          onChange={(e) => setTargetId(e.target.value)}
                          required
                          disabled={visibleUserOptions.length === 0}
                        >
                          {visibleUserOptions.map((o) => (
                            <option key={o.id} value={o.id}>{o.label}</option>
                          ))}
                          {visibleUserOptions.length === 0 && (
                            <option value="">Không có nhân sự phù hợp bộ lọc</option>
                          )}
                        </select>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="grid grid-2" style={{ gap: 10, marginBottom: 10 }}>
                    <div>
                      <label className="field-label" style={{ fontSize: 11.5 }}>Loại đối tượng (Target Type)</label>
                      <select
                        className="field-select"
                        style={{ fontSize: 12, height: 34, width: '100%' }}
                        value={assignType}
                        onChange={(e) => {
                          const nextType = e.target.value;
                          setAssignType(nextType);
                          const nextOpts = targetOptionsFor(nextType) || [];
                          setTargetId(nextOpts[0]?.id || '');
                        }}
                      >
                        {ASSIGNMENT_TYPES.map((t) => (
                          <option key={t} value={t}>{assignmentTypeLabel(t)}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="field-label" style={{ fontSize: 11.5 }}>Chọn đối tượng cụ thể</label>
                      <select
                        className="field-select"
                        style={{ fontSize: 12, height: 34, width: '100%' }}
                        value={targetId}
                        onChange={(e) => setTargetId(e.target.value)}
                        required
                      >
                        {targetOptions.map((o) => (
                          <option key={o.id} value={o.id}>{o.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

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
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                  <Button size="sm" variant="ghost" onClick={() => setShowAssignForm(false)}>Hủy</Button>
                  <Button size="sm" variant="primary" icon="ti-check" type="submit" disabled={!targetId}>
                    Xác Nhận Phân Bổ
                  </Button>
                </div>
              </form>
            </div>
          )}

          {assignments.length === 0 ? (
            <div style={{ padding: '24px 16px', textAlign: 'center', fontSize: 12.5, color: 'var(--ink-faint)', background: 'var(--paper-sunken)', borderRadius: 8 }}>
              <i className="ti ti-target-arrow" style={{ fontSize: 24, display: 'block', marginBottom: 6 }} />
              Chưa có đối tượng nào được gán giáo trình này. Bấm <strong>"Gán Đối Tượng Mới"</strong> để phân bổ cho BU, Division, Department, Sub-Dept hoặc User.
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
                      {isAdmin && (
                        <td style={{ textAlign: 'right' }}>
                          <Button
                            size="sm"
                            variant="danger"
                            icon="ti-trash"
                            onClick={() => {
                              if (window.confirm(`Hủy phân bổ giáo trình này cho "${asg.targetLabel || asg.targetId}"?`)) {
                                onRemoveAssignment(liveCurriculum.id, asg.id);
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

function CurriculumEditorModal({ draft, courses, companyCategories, onCancel, onSave }) {
  const [form, setForm] = useState(() => ({
    ...draft,
    category: draft.category || companyCategories[0] || 'Store Operations',
    assignments: draft.assignments || [],
  }));

  const eLearningCourses = courses.filter((c) => catalogSectionOf(c) === CATALOG_SECTIONS.LEARNING_OBJECTS);

  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [levelFilter, setLevelFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  function toggleCourse(id) {
    setForm((f) => ({
      ...f,
      courseIds: f.courseIds.includes(id) ? f.courseIds.filter((x) => x !== id) : [...f.courseIds, id],
    }));
  }

  function removeCourse(id) {
    setForm((f) => ({
      ...f,
      courseIds: f.courseIds.filter((x) => x !== id),
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
