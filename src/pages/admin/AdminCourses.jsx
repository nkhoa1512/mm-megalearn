import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { courseHasParticipants, userAdminUser } from '../../data/mockData';
import { Badge, Button, CourseTypeBadge } from '../../components/ui';
import { useCourseStore } from '../../state/CourseStore';
import { canAuthorAnyCourse, hasCapability, normalizeRole } from '../../data/roles';
import { getCourseImage } from '../../data/courseImages';

const STATUS_TONE = { PUBLISHED: 'sage', DRAFT: 'rail', ARCHIVED: 'slate' };

// Huy hiệu phân biệt 3 hình thức: 🌐 E-Learning tự học, 💻 Lớp Trực Tuyến Live
// (Virtual Class), 🏢 Đào Tạo Trực Tiếp (In-Person/ILT).
function courseFormatBadge(c) {
  const isInPerson = c.deliveryType === 'IN_PERSON_CLASSROOM' || c.modality === 'CLASSROOM_LAB';
  if (isInPerson) return { icon: '🏢', label: 'Trực Tiếp (ILT)', tone: 'blue' };
  if (c.onlineClassType === 'VIRTUAL_CLASS') return { icon: '💻', label: 'Lớp Trực Tuyến Live', tone: 'amber' };
  return { icon: '🌐', label: 'E-Learning', tone: 'sage' };
}

const CATEGORIES = [
  'ALL',
  'Food Safety & Hygiene',
  'Information Security',
  'Health & Safety',
  'Cold Chain',
  'Store Operations',
  'Supply Chain & Logistics',
  'Loss Prevention & QA',
  'Leadership & Management',
  'Corporate Governance',
  'E-Commerce',
  'Merchandising & Sales',
  'Finance & Accounting',
];

export default function AdminCourses() {
  const navigate = useNavigate();
  const { courses, updateCourse, removeCourse, currentUser, language, t } = useCourseStore();
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
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedType, setSelectedType] = useState('ALL');
  const [page, setPage] = useState(1);
  const pageSize = 15;

  function publish(course) {
    updateCourse(course.id, { ...course, status: 'PUBLISHED', publishedAt: new Date().toISOString().slice(0, 10) });
  }

  function remove(course) {
    if (window.confirm(`Delete "${course.title}"? This cannot be undone.`)) {
      removeCourse(course.id);
    }
  }

  const filtered = courses.filter((c) => {
    const matchCat = selectedCategory === 'ALL' || c.category === selectedCategory;
    const matchType = selectedType === 'ALL' || c.courseType === selectedType;
    const matchSearch = !search ||
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.code.toLowerCase().includes(search.toLowerCase()) ||
      c.category.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchType && matchSearch;
  });

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

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
        {isAdmin && (
          <Button variant="primary" icon="ti-plus" onClick={() => navigate('/admin/courses/new')}>
            Create New Course
          </Button>
        )}
      </div>

      {/* Filter & Search Bar */}
      <div className="card card-pad" style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', width: 260 }}>
            <i className="ti ti-search" style={{ position: 'absolute', left: 10, top: 10, color: 'var(--ink-faint)', fontSize: 14 }} />
            <input
              type="text"
              className="field-input"
              style={{ paddingLeft: 32, height: 34, fontSize: 12.5 }}
              placeholder={language === 'en' ? 'Search 100 courses by title, code...' : 'Tìm kiếm theo tên, mã khóa...'}
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>

          <select
            className="field-select"
            style={{ height: 34, fontSize: 12 }}
            value={selectedCategory}
            onChange={(e) => { setSelectedCategory(e.target.value); setPage(1); }}
          >
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>{cat === 'ALL' ? 'All 12 Domains' : cat}</option>
            ))}
          </select>

          <select
            className="field-select"
            style={{ height: 34, fontSize: 12 }}
            value={selectedType}
            onChange={(e) => { setSelectedType(e.target.value); setPage(1); }}
          >
            <option value="ALL">All Types (Mandatory &amp; Elective)</option>
            <option value="MANDATORY">Mandatory Compliance</option>
            <option value="OPTIONAL">Optional Elective</option>
          </select>
        </div>

        <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
          Showing <strong>{paginated.length}</strong> of <strong>{filtered.length}</strong> matched courses
        </div>
      </div>

      {/* Courses Table */}
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
          <tbody>
            {paginated.map((c) => {
              const hasParticipants = courseHasParticipants(c);
              const canManage = canManageCourse(c);
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
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                          <div style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--ink)' }}>{c.title}</div>
                          <Badge tone={courseFormatBadge(c).tone}>{courseFormatBadge(c).icon} {courseFormatBadge(c).label}</Badge>
                        </div>
                        <div style={{ fontSize: 11.5, color: 'var(--ink-faint)' }}>
                          <span style={{ fontFamily: 'var(--font-mono)' }}>{c.code}</span> &middot; {c.category} &middot; Version {c.version}
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
                  <td style={{ fontSize: 12, color: 'var(--ink-soft)' }}>{c.estimatedDuration || '2h'}</td>
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
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
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
  );
}
