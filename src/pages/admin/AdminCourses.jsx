import React, { useState } from 'react';
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

function emptyCurriculumDraft() {
  return { id: `CUR-${Date.now()}`, title: '', description: '', category: '', courseIds: [], status: 'DRAFT' };
}

export default function AdminCourses() {
  const navigate = useNavigate();
  const {
    courses, updateCourse, removeCourse, currentUser, language, t,
    companyCategories, curricula, addCurriculum, updateCurriculum, deleteCurriculum,
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
          <div className="card card-pad" style={{ marginBottom: 16, fontSize: 12.5, color: 'var(--ink-soft)' }}>
            Giáo trình (Curriculum) tập hợp nhiều khóa <strong>E-Learning tự học</strong> thành một lộ trình có cấu trúc Curriculum → Courses → Modules → Lessons. Chỉ khóa E-Learning tự học mới được thêm vào giáo trình.
          </div>
          <div className="grid grid-3" style={{ gap: 14 }}>
            {curricula.map((cur) => (
              <div key={cur.id} className="card card-pad">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
                  <div style={{ fontWeight: 800, fontSize: 14 }}>{cur.title}</div>
                  <Badge tone={cur.status === 'PUBLISHED' ? 'sage' : 'rail'}>{cur.status === 'PUBLISHED' ? 'Published' : 'Draft'}</Badge>
                </div>
                <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginBottom: 10, minHeight: 34 }}>{cur.description}</div>
                <div style={{ fontSize: 11.5, color: 'var(--ink-faint)', marginBottom: 10 }}>
                  {cur.category} &middot; {(cur.courseIds || []).length} khóa học
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <Button size="sm" variant="outline" icon="ti-eye" onClick={() => setViewingCurriculum(cur)}>Xem Chi Tiết</Button>
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
            ))}
            {curricula.length === 0 && (
              <div className="empty-state">
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
        <Modal isOpen title={viewingCurriculum.title} subtitle={viewingCurriculum.description} onClose={() => setViewingCurriculum(null)} size="lg">
          <CurriculumTree curriculum={viewingCurriculum} courses={courses} />
        </Modal>
      )}

      {editingCurriculum && (
        <CurriculumEditorModal
          draft={editingCurriculum}
          courses={courses}
          onCancel={() => setEditingCurriculum(null)}
          onSave={saveCurriculum}
        />
      )}
    </>
  );
}

function CurriculumEditorModal({ draft, courses, onCancel, onSave }) {
  const [form, setForm] = useState(draft);
  const eLearningCourses = courses.filter((c) => catalogSectionOf(c) === CATALOG_SECTIONS.LEARNING_OBJECTS);
  const [pickerSearch, setPickerSearch] = useState('');

  function toggleCourse(id) {
    setForm((f) => ({
      ...f,
      courseIds: f.courseIds.includes(id) ? f.courseIds.filter((x) => x !== id) : [...f.courseIds, id],
    }));
  }

  const visiblePickerCourses = eLearningCourses.filter((c) => !pickerSearch || c.title.toLowerCase().includes(pickerSearch.toLowerCase()));

  return (
    <Modal
      isOpen
      title={courses.some(() => false) || draft.title ? 'Edit Curriculum' : 'Create Curriculum'}
      onClose={onCancel}
      size="lg"
      footer={(
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Button variant="ghost" onClick={onCancel}>Cancel</Button>
          <Button
            variant="primary"
            icon="ti-check"
            disabled={!form.title.trim() || form.courseIds.length === 0}
            onClick={() => onSave(form)}
          >
            Save Curriculum
          </Button>
        </div>
      )}
    >
      <div style={{ marginBottom: 12 }}>
        <label className="field-label">Curriculum title</label>
        <input className="field-input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
      </div>
      <div style={{ marginBottom: 12 }}>
        <label className="field-label">Description</label>
        <textarea className="field-input" rows={2} style={{ resize: 'vertical' }} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
      </div>
      <div style={{ marginBottom: 12, display: 'flex', gap: 10, alignItems: 'center' }}>
        <label style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
          <input type="checkbox" checked={form.status === 'PUBLISHED'} onChange={(e) => setForm({ ...form, status: e.target.checked ? 'PUBLISHED' : 'DRAFT' })} />
          Published
        </label>
      </div>
      <div>
        <label className="field-label">Courses (E-Learning only) — {form.courseIds.length} selected</label>
        <input
          className="field-input"
          placeholder="Search e-learning courses..."
          value={pickerSearch}
          onChange={(e) => setPickerSearch(e.target.value)}
          style={{ marginBottom: 8 }}
        />
        <div style={{ maxHeight: 260, overflowY: 'auto', border: '1px solid var(--line)', borderRadius: 8 }}>
          {visiblePickerCourses.map((c) => (
            <label key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', fontSize: 12.5, borderBottom: '1px solid var(--line)', cursor: 'pointer' }}>
              <input type="checkbox" checked={form.courseIds.includes(c.id)} onChange={() => toggleCourse(c.id)} />
              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--ink-faint)' }}>{c.code}</span>
              {c.title}
            </label>
          ))}
          {visiblePickerCourses.length === 0 && (
            <div style={{ padding: 10, fontSize: 12, color: 'var(--ink-faint)' }}>No e-learning courses match.</div>
          )}
        </div>
      </div>
    </Modal>
  );
}
