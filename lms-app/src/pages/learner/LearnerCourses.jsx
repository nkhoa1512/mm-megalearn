import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { currentUser } from '../../data/mockData';
import { Badge, ProgressBar, Button, Modal, JobLevelBadge, LevelAccessBadge } from '../../features/common/ui';
import {
  ACCESS_STATE,
  levelDefinition,
  levelShortLabel,
  nextLevelUp,
  normalizeLevel,
} from '../../data/levelSystem';
import { useCourseStore } from '../../store/CourseStore';
import { getCourseImage } from '../../data/courseImages';
import {
  courseFormatBadge, courseGroupOf, courseOrgUnitGroups, buildCourseGroups, courseMatchesCategory,
} from '../../utils/courseCatalog';
import CurriculumTree from '../../features/catalog/CurriculumTree';
import { getAssignedCurriculaForUser, getCurriculumProgress } from '../../utils/curriculumAssignment';

// Tính năng Group By: gom "Khóa Học Của Tôi" thành các Section/Accordion theo
// 5 tiêu chí — Phòng Ban & Khối (nguồn giao khóa), Cấp Bậc & Lộ Trình, Trạng
// Thái Học Tập, Hình Thức Đào Tạo, Chuyên Ngành.
const GROUP_BY_OPTIONS = [
  { id: 'NONE', label: 'Không Gộp Nhóm', icon: 'ti-list' },
  { id: 'ORG_UNIT', label: 'Phòng Ban & Khối', icon: 'ti-building' },
  { id: 'LEVEL', label: 'Cấp Bậc & Lộ Trình', icon: 'ti-stairs-up' },
  { id: 'STATUS', label: 'Trạng Thái Học Tập', icon: 'ti-progress-check' },
  { id: 'MODALITY', label: 'Hình Thức Đào Tạo', icon: 'ti-device-desktop' },
  { id: 'DOMAIN', label: 'Chuyên Ngành', icon: 'ti-category' },
];

import { computeCourseRecertification, RECERTIFICATION_STATE } from '../../utils/recertification';
import { deriveCertificates } from '../../data/mockData';

// Giữ lại tên export cũ để các màn hình khác tiếp tục import được.
export { JobLevelBadge };

// courseFormatBadge / courseGroupOf / buildCourseGroups giờ dùng chung từ
// src/utils/courseCatalog.js (trước đây lặp lại y hệt ở AdminCourses.jsx).

const statusMap = {
  IN_PROGRESS: { tone: 'amber', label: 'Đang Học' },
  NOT_STARTED: { tone: 'slate', label: 'Chưa Bắt Đầu' },
  COMPLETED: { tone: 'sage', label: 'Đã Hoàn Thành' },
  FAILED: { tone: 'rust', label: 'Cần Thi Lại' },
  OVERDUE: { tone: 'rust', label: 'Quá Hạn' },
};


export default function LearnerCourses({ user: propUser, basePath = '/learner/courses' }) {
  const navigate = useNavigate();
  const {
    courses: allCourses,
    currentUser: authUser,
    enrollCourse,
    accessFor,
    requestLevelAdvanceApproval,
    myCourses,
    myEnrollments,
    language,
    t,
    curricula,
    companyCategories,
    certificateTemplates,
  } = useCourseStore();
  const [viewingCurriculum, setViewingCurriculum] = useState(null);

  const user = propUser || authUser || currentUser;
  const userLevel = normalizeLevel(user.level);
  const userLevelDef = levelDefinition(userLevel);
  const oneLevelUp = nextLevelUp(userLevel);

  const enrolledCourses = myCourses(allCourses, user);
  const assignedCurricula = getAssignedCurriculaForUser(curricula, user);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [orgUnitFilter, setOrgUnitFilter] = useState('ALL');
  const [formatFilter, setFormatFilter] = useState('ALL');
  const [viewMode, setViewMode] = useState('TABLE');
  const [groupBy, setGroupBy] = useState('NONE');
  const [showFilters, setShowFilters] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState(() => new Set());

  const activeFiltersCount = (
    (categoryFilter !== 'ALL' ? 1 : 0) +
    (orgUnitFilter !== 'ALL' ? 1 : 0) +
    (formatFilter !== 'ALL' ? 1 : 0)
  );

  function resetAllFilters() {
    setSearch('');
    setStatusFilter('ALL');
    setCategoryFilter('ALL');
    setOrgUnitFilter('ALL');
    setFormatFilter('ALL');
  }

  function toggleGroupCollapsed(key) {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  // Modal gửi đơn xin học vượt cấp
  const [requestModal, setRequestModal] = useState({ open: false, course: null, access: null });
  const [justification, setJustification] = useState('');
  const [toast, setToast] = useState(null);

  function openRequestModal(course, access) {
    setRequestModal({ open: true, course, access });
    setJustification('');
  }

  function submitRequest() {
    const { course } = requestModal;
    const result = requestLevelAdvanceApproval(course, justification, user);
    setRequestModal({ open: false, course: null, access: null });
    setToast(
      result.ok
        ? `Đã gửi đơn xin học vượt cấp khóa "${course.title}" tới Quản lý trực tiếp. Vui lòng chờ phê duyệt.`
        : result.reason
    );
    setTimeout(() => setToast(null), 6000);
  }

  function handleStart(course, access) {
    if (!access.canAccess) return;
    enrollCourse(course.id, user);
    navigate(`${basePath}/${course.id}`);
  }

  const activeCourseList = enrolledCourses;

  const userCertificates = React.useMemo(() => deriveCertificates(allCourses, user, myEnrollments, certificateTemplates), [allCourses, user, myEnrollments, certificateTemplates]);
  const recertByCourseId = React.useMemo(() => {
    const map = {};
    enrolledCourses.forEach((c) => {
      const cert = userCertificates.find((cert) => cert.courseId === c.id);
      map[c.id] = computeCourseRecertification(c, c.enrollment, cert);
    });
    return map;
  }, [enrolledCourses, userCertificates]);

  // Bảng tra cứu trạng thái truy cập theo cấp bậc cho danh sách đang hiển thị.
  const accessById = {};
  activeCourseList.forEach((c) => { accessById[c.id] = accessFor(c, user); });

  const filtered = activeCourseList.filter((c) => {
    const s = c.enrollment?.status;
    const access = accessById[c.id];
    const matchStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'RECERTIFICATION' && recertByCourseId[c.id]?.needsRecertification) ||
      (statusFilter === 'MANDATORY' && c.courseType === 'MANDATORY') ||
      (statusFilter === 'CURRICULUM' && (c.isCurriculum || Boolean(c.curriculumTitle))) ||
      (statusFilter === 'IN_PERSON' && (c.deliveryType === 'IN_PERSON_CLASSROOM' || c.modality === 'CLASSROOM_LAB')) ||
      (statusFilter === 'VIRTUAL_CLASS' && c.onlineClassType === 'VIRTUAL_CLASS') ||
      (statusFilter === 'LEVEL_UP' && access.state === ACCESS_STATE.REQUESTABLE) ||
      (statusFilter === 'PENDING_APPROVAL' && access.state === ACCESS_STATE.PENDING_APPROVAL) ||
      s === statusFilter;

    const matchCategory = courseMatchesCategory(c, categoryFilter);
    const matchOrgUnit = orgUnitFilter === 'ALL' || courseOrgUnitGroups(c).some((g) => g.key === orgUnitFilter);
    const matchFormat = formatFilter === 'ALL' || c.format?.includes(formatFilter) || c.modality === formatFilter
      || (formatFilter === 'VIRTUAL_CLASS' && c.onlineClassType === 'VIRTUAL_CLASS');
    const matchSearch =
      !search ||
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.code.toLowerCase().includes(search.toLowerCase()) ||
      c.category.toLowerCase().includes(search.toLowerCase()) ||
      (c.domain && c.domain.toLowerCase().includes(search.toLowerCase()));

    return matchStatus && matchCategory && matchOrgUnit && matchFormat && matchSearch;
  });

  const categoryOptions = [...new Set(allCourses.flatMap((c) => (c.categories && c.categories.length ? c.categories : [c.category])).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  const orgUnitOptionsMap = new Map();
  allCourses.forEach((c) => {
    const gList = courseOrgUnitGroups(c);
    gList.forEach((g) => {
      if (!orgUnitOptionsMap.has(g.key)) orgUnitOptionsMap.set(g.key, g.label);
    });
  });
  const orgUnitOptions = Array.from(orgUnitOptionsMap.entries());

  const groups = buildCourseGroups(filtered, groupBy);

  const completedCount = enrolledCourses.filter((c) => c.enrollment?.status === 'COMPLETED').length;
  const inProgressCount = enrolledCourses.filter((c) => c.enrollment?.status === 'IN_PROGRESS').length;
  const overdueCount = enrolledCourses.filter((c) => c.enrollment?.status === 'OVERDUE').length;
  const mandatoryCount = enrolledCourses.filter((c) => c.courseType === 'MANDATORY').length;
  const recertCount = enrolledCourses.filter((c) => recertByCourseId[c.id]?.needsRecertification).length;


  // Thống kê toàn thư viện theo quy tắc cấp bậc
  const catalogAccess = allCourses.map((c) => accessFor(c, user));
  const requestableCount = catalogAccess.filter((a) => a.state === ACCESS_STATE.REQUESTABLE).length;
  const pendingCount = catalogAccess.filter((a) => a.state === ACCESS_STATE.PENDING_APPROVAL).length;
  const approvedCount = catalogAccess.filter((a) => a.state === ACCESS_STATE.APPROVED).length;
  const hardLockedCount = catalogAccess.filter((a) => a.state === ACCESS_STATE.LOCKED_LEVEL_GAP).length;

  // Tiến độ chương trình cấp bậc hiện tại (điều kiện thực tế để leo lên cấp kế tiếp)
  const myLevelCourses = enrolledCourses.filter((c) => normalizeLevel(c.targetLevel) === userLevel);
  const myLevelDone = myLevelCourses.filter((c) => c.enrollment?.status === 'COMPLETED').length;
  const myLevelPct = myLevelCourses.length ? Math.round((myLevelDone / myLevelCourses.length) * 100) : 0;

  /** Nút thao tác của một khóa học, quyết định hoàn toàn bởi `access.state`. */
  function renderAction(c, access, size = 'sm') {
    const enr = c.enrollment;
    const isInPerson = c.deliveryType === 'IN_PERSON_CLASSROOM' || c.modality === 'CLASSROOM_LAB';
    const isCompleted = enr?.status === 'COMPLETED';
    const isFailed = enr?.status === 'FAILED';

    switch (access.state) {
      case ACCESS_STATE.LOCKED_LEVEL_GAP:
        return (
          <Button size={size} variant="outline" icon="ti-ban" disabled
            title={access.reason}>
            ⛔ Chặn Nhảy Cóc
          </Button>
        );
      case ACCESS_STATE.PENDING_APPROVAL:
        return (
          <Button size={size} variant="outline" icon="ti-clock" disabled title={access.reason}>
            ⏳ Chờ Duyệt
          </Button>
        );
      case ACCESS_STATE.REJECTED:
      case ACCESS_STATE.REQUESTABLE:
        return (
          <Button size={size} variant="primary" icon="ti-lock"
            onClick={() => openRequestModal(c, access)}>
            🔒 Xin Duyệt Vượt Cấp
          </Button>
        );
      default:
        break;
    }

    const recert = recertByCourseId[c.id];
    if (recert?.needsRecertification) {
      return (
        <Button
          size={size}
          variant="primary"
          tone={recert.isExpired ? 'danger' : 'primary'}
          icon="ti-refresh"
          onClick={() => navigate(`${basePath}/${c.id}`)}
        >
          {recert.actionLabel}
        </Button>
      );
    }

    if (isInPerson) {
      return (
        <Button size={size} variant="primary" icon="ti-calendar-event" onClick={() => navigate('/learner/classrooms')}>
          Xem Lịch QR
        </Button>
      );
    }
    if (enr) {
      return (
        <Button
          size={size}
          variant={isCompleted ? 'outline' : 'primary'}
          icon={isCompleted ? 'ti-rotate' : isFailed ? 'ti-reload' : 'ti-player-play'}
          onClick={() => navigate(`${basePath}/${c.id}`)}
        >
          {isCompleted ? 'Ôn Tập' : isFailed ? 'Thi Lại' : enr.progressPercent > 0 ? 'Tiếp Tục' : 'Bắt Đầu'}
        </Button>
      );
    }
    return (
      <Button
        size={size}
        variant={access.state === ACCESS_STATE.APPROVED ? 'primary' : 'outline'}
        icon={access.state === ACCESS_STATE.APPROVED ? 'ti-player-play' : 'ti-plus'}
        onClick={() => handleStart(c, access)}
      >
        {access.state === ACCESS_STATE.APPROVED ? 'Vào Học Ngay' : 'Đăng Ký Học'}
      </Button>
    );
  }


  return (
    <>
      {/* PAGE HEADER */}
      <div className="page-header" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <h1>Chương Trình Đào Tạo &amp; Khóa Học Của Tôi</h1>
          <Badge tone="rail">{enrolledCourses.length} Khóa Học Đang Theo Dõi</Badge>
        </div>
        <p style={{ margin: 0 }}>
          Học viên: <strong>{user.fullName}</strong> &middot; {user.position} &middot; Cấp bậc hiện tại:{' '}
          <strong>{levelShortLabel(userLevel)}</strong> — {userLevelDef.titleVi}
        </p>
      </div>

      {toast && (
        <div className="card card-pad" style={{ marginBottom: 16, borderLeft: '4px solid var(--sage)', background: '#F0FDF4', fontSize: 13, color: '#166534', fontWeight: 600 }}>
          <i className="ti ti-circle-check" style={{ marginRight: 6 }} />
          {toast}
        </div>
      )}

      {/* BẢNG ĐIỀU KHIỂN LỘ TRÌNH CẤP BẬC TUẦN TỰ */}
      <div className="card card-pad" style={{ marginBottom: 20, borderLeft: '4px solid var(--blue)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 12 }}>
          <div style={{ fontWeight: 800, fontSize: 14 }}>
            <i className="ti ti-stairs-up" style={{ marginRight: 6, color: 'var(--blue)' }} />
            Lộ Trình Học Vượt Cấp Tuần Tự (Sequential Level Gate)
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <JobLevelBadge level={userLevel} />
            <i className="ti ti-arrow-right" style={{ color: 'var(--ink-faint)' }} />
            {oneLevelUp ? <JobLevelBadge level={oneLevelUp} /> : <Badge tone="sage">Đã ở cấp cao nhất</Badge>}
          </div>
        </div>

        <div className="grid grid-4" style={{ gap: 12 }}>
          <div>
            <div style={{ fontSize: 11.5, color: 'var(--ink-soft)', marginBottom: 4 }}>
              Tiến độ chương trình Level {userLevel} của tôi
            </div>
            <ProgressBar value={myLevelPct} tone={myLevelPct === 100 ? 'sage' : 'blue'} size="sm" />
            <div style={{ fontSize: 11.5, fontWeight: 700, marginTop: 4 }}>
              {myLevelDone}/{myLevelCourses.length} khóa &middot; {myLevelPct}%
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11.5, color: 'var(--ink-soft)' }}>Được phép xin học vượt (Level {oneLevelUp || '—'})</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--blue)' }}>{requestableCount}</div>
          </div>
          <div>
            <div style={{ fontSize: 11.5, color: 'var(--ink-soft)' }}>Chờ duyệt / Đã được duyệt</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--amber)' }}>{pendingCount} / {approvedCount}</div>
          </div>
          <div>
            <div style={{ fontSize: 11.5, color: 'var(--ink-soft)' }}>Ẩn khỏi danh mục (nhảy cóc ≥ 2 cấp)</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--rust)' }}>{hardLockedCount}</div>
          </div>
        </div>

        <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 12, lineHeight: 1.5, background: 'var(--paper-sunken)', padding: '8px 12px', borderRadius: 6 }}>
          Khóa <strong>Level {userLevel}</strong> trở xuống: học ngay. Khóa <strong>Level {oneLevelUp || '—'}</strong> (vượt đúng 1 cấp):
          phải gửi đơn và được Quản lý phê duyệt từng khóa. Khóa từ <strong>2 cấp trở lên</strong>: ẩn hoàn toàn khỏi danh mục —
          bắt buộc hoàn thành toàn bộ chương trình Level {oneLevelUp || '—'} trước mới xuất hiện.
        </div>
      </div>

      {/* GIÁO TRÌNH BẮT BUỘC ĐƯỢC GÁN CHO BẠN (MY ASSIGNED CURRICULA) */}
      {assignedCurricula.length > 0 && (
        <div className="card card-pad" style={{ marginBottom: 20, background: 'linear-gradient(135deg, var(--paper-raised) 0%, rgba(99,102,241,0.06) 100%)', border: '1px solid var(--rail-soft, #c7d2fe)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
            <div style={{ fontWeight: 800, fontSize: 14.5, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--ink)' }}>
              <i className="ti ti-books" style={{ color: 'var(--rail)', fontSize: 18 }} />
              <span>📚 Giáo Trình Bắt Buộc Của Bạn ({assignedCurricula.length})</span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
              Các lộ trình học tập E-Learning được phân bổ theo đơn vị hoặc cấp bậc của bạn
            </div>
          </div>
          <div className="grid grid-2" style={{ gap: 12 }}>
            {assignedCurricula.map((cur) => {
              const prog = getCurriculumProgress(cur, user, myEnrollments, allCourses);
              return (
                <div key={cur.id} className="card card-pad" style={{ background: 'var(--paper-raised)', border: '1px solid var(--line)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 4 }}>
                      <div style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--ink)' }}>{cur.title}</div>
                      <Badge tone={prog.status === 'COMPLETED' ? 'sage' : prog.status === 'IN_PROGRESS' ? 'amber' : 'rail'} size="sm">
                        {prog.status === 'COMPLETED' ? 'Đã Hoàn Thành' : prog.status === 'IN_PROGRESS' ? 'Đang Học' : 'Chưa Bắt Đầu'}
                      </Badge>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginBottom: 8, lineHeight: 1.4 }}>
                      {cur.description}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--ink-faint)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <Badge tone="slate" size="sm">{cur.category || 'Giáo trình'}</Badge>
                      <span>&middot;</span>
                      <span>{prog.totalCourses} khóa học E-Learning</span>
                      {cur.assignedVia?.dueDate && (
                        <>
                          <span>&middot;</span>
                          <span style={{ color: 'var(--rust)', fontWeight: 600 }}>
                            <i className="ti ti-clock" /> Hạn chót: {cur.assignedVia.dueDate}
                          </span>
                        </>
                      )}
                    </div>
                    <div style={{ marginBottom: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--ink-soft)', marginBottom: 4 }}>
                        <span>Tiến độ giáo trình:</span>
                        <strong>{prog.completedCourses}/{prog.totalCourses} khóa ({prog.progressPercent}%)</strong>
                      </div>
                      <ProgressBar value={prog.progressPercent} tone={prog.status === 'COMPLETED' ? 'sage' : 'rail'} size="sm" />
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <Button size="sm" variant="outline" icon="ti-sitemap" onClick={() => setViewingCurriculum(cur)}>
                      Xem Lộ Trình Giáo Trình
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* STANDARDIZED FILTER TOOLBAR CARD */}
      <div className="card card-pad" style={{ marginBottom: 20, background: '#fff', borderRadius: 10, border: '1px solid var(--line)' }}>
        {/* STATUS QUICK FILTER PILLS */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14, paddingBottom: 14, borderBottom: '1px solid var(--line)' }}>
          {[
            { id: 'ALL', label: 'Tất Cả Khóa Đã Gán', count: enrolledCourses.length },
            ...(recertCount > 0 ? [{ id: 'RECERTIFICATION', label: '🔴 Cần Tái Cấp Chứng Chỉ', count: recertCount, highlight: true }] : []),
            { id: 'IN_PROGRESS', label: 'Đang Học', count: inProgressCount },
            { id: 'COMPLETED', label: 'Đã Hoàn Thành', count: completedCount },
            { id: 'OVERDUE', label: 'Quá Hạn', count: overdueCount },
            { id: 'MANDATORY', label: 'Bắt Buộc Tuân Thủ', count: mandatoryCount },
            { id: 'CURRICULUM', label: '📚 Theo Giáo Trình', count: enrolledCourses.filter((c) => c.isCurriculum || Boolean(c.curriculumTitle)).length },
            { id: 'IN_PERSON', label: '🏢 Đào Tạo Trực Tiếp (In-Person)', count: enrolledCourses.filter((c) => c.deliveryType === 'IN_PERSON_CLASSROOM' || c.modality === 'CLASSROOM_LAB').length },
            { id: 'VIRTUAL_CLASS', label: '💻 Lớp Trực Tuyến (Webinar/Live Class)', count: enrolledCourses.filter((c) => c.onlineClassType === 'VIRTUAL_CLASS').length },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              className={`btn btn-sm ${statusFilter === tab.id ? 'btn-primary' : 'btn-outline'}`}
              style={{
                fontSize: 12, display: 'flex', alignItems: 'center', gap: 6,
                borderColor: statusFilter === tab.id ? 'var(--blue)' : tab.highlight ? 'var(--rust)' : 'var(--line)',
                background: statusFilter === tab.id ? (tab.highlight ? 'var(--rust)' : 'var(--blue)') : tab.highlight ? 'var(--rust-soft)' : 'transparent',
                color: statusFilter === tab.id ? '#fff' : tab.highlight ? 'var(--rust-soft-text)' : 'var(--ink)',
                fontWeight: tab.highlight ? 700 : 600,
                borderRadius: 20,
              }}
            >
              {tab.label}
              <span style={{
                background: statusFilter === tab.id ? 'rgba(255,255,255,0.3)' : tab.highlight ? 'var(--rust)' : 'var(--paper-sunken)',
                color: statusFilter === tab.id || tab.highlight ? '#fff' : 'var(--ink-soft)',
                padding: '1px 6px', borderRadius: 10, fontSize: 10.5, fontWeight: 700,
              }}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* ROW 1: SEARCH, GROUP BY, FILTER TOGGLE, VIEW MODE */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
          {/* Search Input */}
          <div style={{ position: 'relative', flex: '1 1 280px', minWidth: 220 }}>
            <i className="ti ti-search" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-faint)', fontSize: 15 }} />
            <input
              type="text"
              className="field-input"
              style={{ paddingLeft: 36, paddingRight: search ? 32 : 12, height: 38, fontSize: 13, width: '100%', borderRadius: 8 }}
              placeholder={language === 'en' ? 'Search course code, title, domain...' : 'Tìm mã khóa, tiêu đề, chuyên ngành...'}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--ink-faint)', fontSize: 14 }}
              >
                <i className="ti ti-x" />
              </button>
            )}
          </div>

          {/* Right Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            {/* Group By Select */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--paper-sunken)', padding: '3px 10px', borderRadius: 8, border: '1px solid var(--line)', height: 38 }}>
              <span style={{ fontSize: 12, color: 'var(--ink-soft)', whiteSpace: 'nowrap', fontWeight: 600 }}>Gộp nhóm:</span>
              <select
                value={groupBy}
                onChange={(e) => { setGroupBy(e.target.value); setCollapsedGroups(new Set()); }}
                style={{
                  border: 'none',
                  background: 'transparent',
                  fontSize: 12.5,
                  fontWeight: groupBy !== 'NONE' ? 700 : 500,
                  color: groupBy !== 'NONE' ? 'var(--blue, #005BAA)' : 'var(--ink)',
                  cursor: 'pointer',
                  outline: 'none',
                }}
              >
                {GROUP_BY_OPTIONS.map((opt) => (
                  <option key={opt.id} value={opt.id}>{opt.label}</option>
                ))}
              </select>
            </div>

            {/* Filter Toggle Button */}
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className={`btn btn-sm ${activeFiltersCount > 0 ? 'btn-primary' : 'btn-outline'}`}
              style={{ height: 38, display: 'flex', alignItems: 'center', gap: 6, padding: '0 14px', borderRadius: 8 }}
            >
              <i className="ti ti-filter" />
              <span>Bộ Lọc</span>
              {activeFiltersCount > 0 && (
                <span style={{ background: '#fff', color: 'var(--rail, #005BAA)', borderRadius: 10, padding: '1px 6px', fontSize: 11, fontWeight: 800 }}>
                  {activeFiltersCount}
                </span>
              )}
              <i className={`ti ${showFilters ? 'ti-chevron-up' : 'ti-chevron-down'}`} style={{ fontSize: 12, marginLeft: 2 }} />
            </button>

            {/* View Mode Toggle */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 2, background: 'var(--paper-sunken)', padding: 3, borderRadius: 8, border: '1px solid var(--line)', height: 38 }}>
              <button
                type="button"
                onClick={() => setViewMode('TABLE')}
                className={`btn btn-sm ${viewMode === 'TABLE' ? 'btn-primary' : 'btn-ghost'}`}
                style={{ height: 30, padding: '0 10px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 5, borderRadius: 6 }}
                title="Dạng Bảng (List View)"
              >
                <i className="ti ti-list" />
                <span>Bảng</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('GRID')}
                className={`btn btn-sm ${viewMode === 'GRID' ? 'btn-primary' : 'btn-ghost'}`}
                style={{ height: 30, padding: '0 10px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 5, borderRadius: 6 }}
                title="Dạng Lưới (Grid View)"
              >
                <i className="ti ti-layout-grid" />
                <span>Lưới</span>
              </button>
            </div>
          </div>
        </div>

        {/* ROW 2: COLLAPSIBLE FILTER PANEL WITH TOP LABELS */}
        {showFilters && (
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--line)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
              {/* Filter 1: Category */}
              <div>
                <label style={{ fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--ink-soft)', marginBottom: 6, display: 'block' }}>
                  Lĩnh Vực (Category)
                </label>
                <select
                  className="field-select"
                  style={{
                    width: '100%',
                    height: 38,
                    fontSize: 12.5,
                    borderRadius: 6,
                    background: categoryFilter !== 'ALL' ? '#EFF6FF' : 'var(--paper)',
                    borderColor: categoryFilter !== 'ALL' ? '#005BAA' : 'var(--line)',
                    color: categoryFilter !== 'ALL' ? '#005BAA' : 'var(--ink)',
                    fontWeight: categoryFilter !== 'ALL' ? 700 : 500,
                  }}
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                >
                  <option value="ALL">Tất cả Danh Mục ({categoryOptions.length})</option>
                  {categoryOptions.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* Filter 2: Org Unit / Source */}
              <div>
                <label style={{ fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--ink-soft)', marginBottom: 6, display: 'block' }}>
                  Phòng Ban Giao Khóa (Org Unit / Source)
                </label>
                <select
                  className="field-select"
                  style={{
                    width: '100%',
                    height: 38,
                    fontSize: 12.5,
                    borderRadius: 6,
                    background: orgUnitFilter !== 'ALL' ? '#EFF6FF' : 'var(--paper)',
                    borderColor: orgUnitFilter !== 'ALL' ? '#005BAA' : 'var(--line)',
                    color: orgUnitFilter !== 'ALL' ? '#005BAA' : 'var(--ink)',
                    fontWeight: orgUnitFilter !== 'ALL' ? 700 : 500,
                  }}
                  value={orgUnitFilter}
                  onChange={(e) => setOrgUnitFilter(e.target.value)}
                >
                  <option value="ALL">Tất cả Phòng Ban Giao ({orgUnitOptions.length})</option>
                  {orgUnitOptions.map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>

              {/* Filter 3: Format */}
              <div>
                <label style={{ fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--ink-soft)', marginBottom: 6, display: 'block' }}>
                  Định Dạng Đào Tạo (Format)
                </label>
                <select
                  className="field-select"
                  style={{
                    width: '100%',
                    height: 38,
                    fontSize: 12.5,
                    borderRadius: 6,
                    background: formatFilter !== 'ALL' ? '#EFF6FF' : 'var(--paper)',
                    borderColor: formatFilter !== 'ALL' ? '#005BAA' : 'var(--line)',
                    color: formatFilter !== 'ALL' ? '#005BAA' : 'var(--ink)',
                    fontWeight: formatFilter !== 'ALL' ? 700 : 500,
                  }}
                  value={formatFilter}
                  onChange={(e) => setFormatFilter(e.target.value)}
                >
                  <option value="ALL">Tất cả Định dạng</option>
                  <option value="SCORM">SCORM Package</option>
                  <option value="Video">Interactive Video</option>
                  <option value="PPT">Interactive PPT</option>
                  <option value="CLASSROOM_LAB">Thực Hành Xưởng (ILT)</option>
                  <option value="EXTERNAL_PLATFORM">LinkedIn / Coursera</option>
                  <option value="VIRTUAL_CLASS">💻 Lớp Trực Tuyến (Webinar/Live Class)</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* ACTIVE FILTER TAGS & RESET BAR */}
        {(search || activeFiltersCount > 0 || statusFilter !== 'ALL' || groupBy !== 'NONE') && (
          <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px dashed var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>Đang lọc theo:</span>

              {search && (
                <span className="badge" style={{ background: '#EFF6FF', color: '#1E40AF', border: '1px solid #BFDBFE', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  Từ khóa: <strong>"{search}"</strong>
                  <i className="ti ti-x" style={{ cursor: 'pointer' }} onClick={() => setSearch('')} />
                </span>
              )}

              {statusFilter !== 'ALL' && (
                <span className="badge" style={{ background: '#EFF6FF', color: '#1E40AF', border: '1px solid #BFDBFE', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  Trạng thái: <strong>{statusFilter}</strong>
                  <i className="ti ti-x" style={{ cursor: 'pointer' }} onClick={() => setStatusFilter('ALL')} />
                </span>
              )}

              {categoryFilter !== 'ALL' && (
                <span className="badge" style={{ background: '#EFF6FF', color: '#1E40AF', border: '1px solid #BFDBFE', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  Lĩnh vực: <strong>{categoryFilter}</strong>
                  <i className="ti ti-x" style={{ cursor: 'pointer' }} onClick={() => setCategoryFilter('ALL')} />
                </span>
              )}

              {orgUnitFilter !== 'ALL' && (
                <span className="badge" style={{ background: '#EFF6FF', color: '#1E40AF', border: '1px solid #BFDBFE', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  Phòng ban: <strong>{orgUnitOptionsMap.get(orgUnitFilter) || orgUnitFilter}</strong>
                  <i className="ti ti-x" style={{ cursor: 'pointer' }} onClick={() => setOrgUnitFilter('ALL')} />
                </span>
              )}

              {formatFilter !== 'ALL' && (
                <span className="badge" style={{ background: '#EFF6FF', color: '#1E40AF', border: '1px solid #BFDBFE', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  Định dạng: <strong>{formatFilter}</strong>
                  <i className="ti ti-x" style={{ cursor: 'pointer' }} onClick={() => setFormatFilter('ALL')} />
                </span>
              )}

              {groupBy !== 'NONE' && (
                <span className="badge" style={{ background: '#F8FAFC', color: 'var(--ink-soft)', border: '1px solid var(--line)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  Gộp nhóm: <strong>{GROUP_BY_OPTIONS.find(o => o.id === groupBy)?.label}</strong>
                  <i className="ti ti-x" style={{ cursor: 'pointer' }} onClick={() => setGroupBy('NONE')} />
                </span>
              )}

              <button
                type="button"
                onClick={resetAllFilters}
                style={{ border: 'none', background: 'transparent', color: 'var(--rust, #DC2626)', fontSize: 12, cursor: 'pointer', fontWeight: 600, textDecoration: 'underline', padding: '2px 4px' }}
              >
                Xóa tất cả bộ lọc
              </button>
            </div>

            <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
              Tìm thấy <strong>{filtered.length}</strong> / {enrolledCourses.length} khóa học
            </div>
          </div>
        )}
      </div>

      {(() => {
        /** Bảng cho 1 tập khóa học (dùng lại cho cả chế độ gộp nhóm lẫn không gộp). */
        function renderTable(items) {
          return (
            <div className="card" style={{ overflowX: 'auto', marginBottom: 20 }}>
              <table className="table" style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th>{language === 'en' ? 'Course Program' : 'Khóa Học'}</th>
                    <th style={{ width: 118 }}>{language === 'en' ? 'Access' : 'Truy Cập'}</th>
                    <th style={{ width: 150 }}>{language === 'en' ? 'Format' : 'Định Dạng'}</th>
                    <th style={{ width: 112 }}>{language === 'en' ? 'Progress' : 'Tiến Độ'}</th>
                    <th style={{ width: 104 }}>{language === 'en' ? 'Status' : 'Trạng Thái'}</th>
                    <th style={{ textAlign: 'right' }}>{language === 'en' ? 'Actions' : 'Thao Tác'}</th>
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '32px 0', color: 'var(--ink-soft)' }}>
                        Không tìm thấy khóa học nào phù hợp với bộ lọc.
                      </td>
                    </tr>
                  ) : (
                    items.map((c) => {
                      const enr = c.enrollment;
                  const access = accessById[c.id];
                  const status = enr?.status || 'NOT_STARTED';
                  const stConfig = statusMap[status] || statusMap.NOT_STARTED;
                  const isCompleted = status === 'COMPLETED';
                  const isFailed = status === 'FAILED';
                  const isInPerson = c.deliveryType === 'IN_PERSON_CLASSROOM' || c.modality === 'CLASSROOM_LAB';
                  const isBlocked = access.state === ACCESS_STATE.LOCKED_LEVEL_GAP;

                  return (
                    <tr key={c.id} style={isBlocked ? { opacity: 0.62 } : undefined}>
                      <td>
                        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                          <img
                            src={getCourseImage(c)}
                            alt={c.title}
                            style={{ width: 44, height: 44, borderRadius: 6, objectFit: 'cover', flexShrink: 0, border: '1px solid var(--line)' }}
                          />
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--ink)' }}>{c.title}</div>
                            <div style={{ fontSize: 11.5, color: 'var(--ink-soft)', display: 'flex', gap: 6, alignItems: 'center', marginTop: 2, flexWrap: 'wrap' }}>
                              <span style={{ fontFamily: 'var(--font-mono)' }}>{c.code}</span>
                              <span>&middot;</span>
                              <span>{c.category || c.domain}</span>
                              <span>&middot;</span>
                              <span>{c.estimatedHours || '3h'}</span>
                              {(c.isCurriculum || c.curriculumTitle) && (
                                <Badge tone="ai" size="sm">
                                  <i className="ti ti-books" /> {c.curriculumTitle ? `Giáo trình: ${c.curriculumTitle}` : 'Theo Giáo Trình'}
                                </Badge>
                              )}
                            </div>
                            {access.isLevelLocked && (
                              <div style={{ fontSize: 11, color: isBlocked ? 'var(--rust)' : 'var(--blue)', marginTop: 4, maxWidth: 320, lineHeight: 1.4 }}>
                                <i className={`ti ${isBlocked ? 'ti-ban' : 'ti-lock'}`} style={{ marginRight: 4 }} />
                                {access.reason}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      <td><LevelAccessBadge access={access} /></td>

                      <td>
                        <div style={{ marginBottom: 3 }}>
                          <Badge tone={courseFormatBadge(c).tone}>{courseFormatBadge(c).icon} {courseFormatBadge(c).label}</Badge>
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--ink-soft)' }}>{c.format || 'E-learning Online'}</div>
                        {(isInPerson || c.onlineClassType === 'VIRTUAL_CLASS') && c.trainerName && (
                          <div style={{ fontSize: 11, color: 'var(--ink-soft)' }}>GV: {c.trainerName}</div>
                        )}
                      </td>

                      <td>
                        {enr ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ flex: 1 }}>
                              <ProgressBar value={enr.progressPercent || 0} tone={isCompleted ? 'sage' : isFailed ? 'rust' : 'amber'} size="sm" />
                            </div>
                            <span style={{ fontSize: 11.5, fontWeight: 700, minWidth: 32 }}>{enr.progressPercent || 0}%</span>
                          </div>
                        ) : (
                          <span style={{ fontSize: 11.5, color: 'var(--ink-faint)' }}>Chưa đăng ký</span>
                        )}
                      </td>

                      <td>
                        {(() => {
                          const recert = recertByCourseId[c.id];
                          if (recert?.needsRecertification) {
                            return (
                              <Badge tone={recert.badgeTone} icon={recert.isExpired ? 'ti-alert-circle' : 'ti-clock'}>
                                {recert.statusLabel}
                              </Badge>
                            );
                          }
                          return enr ? (
                            <Badge tone={stConfig.tone} icon={isCompleted ? 'ti-circle-check' : isFailed ? 'ti-alert-circle' : undefined}>
                              {stConfig.label}
                            </Badge>
                          ) : (
                            <Badge tone="slate">Chưa Ghi Danh</Badge>
                          );
                        })()}
                      </td>

                      <td style={{ textAlign: 'right' }}>{renderAction(c, access)}</td>
                    </tr>
                  );
                })
                  )}
                </tbody>
              </table>
            </div>
          );
        }

        /** Lưới thẻ cho 1 tập khóa học (dùng lại cho cả chế độ gộp nhóm lẫn không gộp). */
        function renderGrid(items) {
          return (
            <div className="grid grid-3" style={{ gap: 16, marginBottom: 20 }}>
              {items.map((c) => {
            const enr = c.enrollment;
            const access = accessById[c.id];
            const isCompleted = enr?.status === 'COMPLETED';
            const def = levelDefinition(c.targetLevel);
            const isBlocked = access.state === ACCESS_STATE.LOCKED_LEVEL_GAP;
            const courseImg = getCourseImage(c);

            return (
              <div
                key={c.id}
                className="card"
                style={{
                  display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                  borderTop: `3px solid ${def.colors.border}`,
                  opacity: isBlocked ? 0.62 : 1,
                  overflow: 'hidden',
                }}
              >
                {/* Course Banner Image */}
                <div style={{ position: 'relative', width: '100%', height: 130, background: 'var(--paper-sunken)' }}>
                  <img
                    src={courseImg}
                    alt={c.title}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  <div style={{ position: 'absolute', top: 8, left: 8 }}>
                    <Badge tone={courseFormatBadge(c).tone}>{courseFormatBadge(c).icon} {courseFormatBadge(c).label}</Badge>
                  </div>
                  <div style={{ position: 'absolute', bottom: 8, left: 8, background: 'rgba(0,0,0,0.65)', color: '#fff', padding: '2px 8px', borderRadius: 4, fontSize: 10.5, fontFamily: 'var(--font-mono)' }}>
                    {c.code}
                  </div>
                </div>

                <div style={{ padding: '14px 16px 8px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--ink)', marginBottom: 6, lineHeight: 1.4 }}>{c.title}</div>
                    {(c.isCurriculum || c.curriculumTitle) && (
                      <div style={{ marginBottom: 6 }}>
                        <Badge tone="ai" size="sm">
                          <i className="ti ti-books" /> {c.curriculumTitle ? `Giáo trình: ${c.curriculumTitle}` : 'Theo Giáo Trình'}
                        </Badge>
                      </div>
                    )}
                    <div style={{ marginBottom: 8 }}><LevelAccessBadge access={access} /></div>
                    <p style={{ fontSize: 12, color: 'var(--ink-soft)', lineHeight: 1.45, marginBottom: 12 }}>
                      {access.isLevelLocked ? access.reason : (c.description || 'Chương trình đào tạo chuyên môn theo tiêu chuẩn MM Mega Market.')}
                    </p>
                  </div>

                  <div>
                    {enr && (
                      <div style={{ marginBottom: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--ink-soft)', marginBottom: 4 }}>
                          <span>Tiến độ:</span>
                          <strong>{enr.progressPercent || 0}%</strong>
                        </div>
                        <ProgressBar value={enr.progressPercent || 0} tone={isCompleted ? 'sage' : 'amber'} size="sm" />
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--line)', paddingTop: 10, gap: 8 }}>
                      {(() => {
                        const recert = recertByCourseId[c.id];
                        if (recert?.needsRecertification) {
                          return (
                            <Badge tone={recert.badgeTone} icon={recert.isExpired ? 'ti-alert-circle' : 'ti-clock'} size="sm">
                              {recert.statusLabel}
                            </Badge>
                          );
                        }
                        return <span style={{ fontSize: 11.5, color: 'var(--ink-soft)' }}>{c.estimatedHours || '3h'}</span>;
                      })()}
                      {renderAction(c, access)}
                    </div>
                  </div>
                </div>
              </div>

            );
              })}
            </div>
          );
        }

        const renderList = viewMode === 'TABLE' ? renderTable : renderGrid;

        if (groupBy === 'NONE' || !groups) {
          return renderList(filtered);
        }

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 6 }}>
            {groups.map((g) => {
              const isCollapsed = collapsedGroups.has(g.key);
              return (
                <div key={g.key} className="card" style={{ overflow: 'hidden' }}>
                  <button
                    onClick={() => toggleGroupCollapsed(g.key)}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                      padding: '14px 18px', background: 'var(--paper-raised)', border: 'none',
                      borderBottom: isCollapsed ? 'none' : '1px solid var(--line)', cursor: 'pointer', textAlign: 'left',
                    }}
                  >
                    <i className={`ti ${isCollapsed ? 'ti-chevron-right' : 'ti-chevron-down'}`} style={{ color: 'var(--ink-faint)' }} />
                    <div style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--rail-soft)', color: 'var(--rail)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <i className={`ti ${g.icon}`} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0, fontWeight: 800, fontSize: 13.5, color: 'var(--ink)' }}>{g.label}</div>
                    <Badge tone="slate">{g.items.length} khóa</Badge>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 130 }}>
                      <div style={{ width: 80 }}>
                        <ProgressBar value={g.percent} tone={g.percent === 100 ? 'sage' : 'amber'} size="sm" />
                      </div>
                      <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--ink-soft)' }}>{g.percent}%</span>
                    </div>
                  </button>
                  {!isCollapsed && (
                    <div style={{ padding: viewMode === 'GRID' ? '16px 16px 0' : 0 }}>
                      {renderList(g.items)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );
      })()}

      {/* MODAL: GỬI ĐƠN XIN HỌC VƯỢT CẤP */}
      <Modal
        isOpen={requestModal.open}
        onClose={() => setRequestModal({ open: false, course: null, access: null })}
        title="Đơn Xin Phê Duyệt Học Vượt Cấp"
        subtitle="Đơn sẽ được gửi tới Quản lý trực tiếp của bạn để phê duyệt cho riêng khóa học này."
        size="md"
      >
        {requestModal.course && (
          <div>
            <div style={{ background: 'var(--paper-sunken)', padding: '14px 16px', borderRadius: 8, marginBottom: 16 }}>
              <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 8 }}>{requestModal.course.title}</div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 10 }}>
                <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>Cấp bậc của bạn:</span>
                <JobLevelBadge level={requestModal.access?.userLevel} />
                <i className="ti ti-arrow-right" style={{ color: 'var(--ink-faint)' }} />
                <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>Cấp bậc khóa học:</span>
                <JobLevelBadge level={requestModal.access?.courseLevel} />
              </div>
              <div style={{ fontSize: 12, color: 'var(--ink)' }}>
                Đây là khóa vượt <strong>đúng 1 cấp liền kề</strong> — hợp lệ để xin phê duyệt. Người duyệt:{' '}
                <strong>Quản lý trực tiếp ({user.managerId || 'Line Manager'})</strong>.
              </div>
            </div>

            <label className="field-label">Lý do xin học vượt cấp (gửi cho Quản lý)</label>
            <textarea
              className="field-input"
              rows={4}
              style={{ resize: 'vertical', marginBottom: 16 }}
              placeholder="Ví dụ: Em đã hoàn thành các khóa bắt buộc của Level hiện tại và muốn chuẩn bị năng lực cho vị trí Chuyên viên vận hành..."
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <Button variant="ghost" onClick={() => setRequestModal({ open: false, course: null, access: null })}>Hủy</Button>
              <Button variant="primary" icon="ti-send" onClick={submitRequest}>Gửi Đơn Cho Quản Lý</Button>
            </div>
          </div>
        )}
      </Modal>

      {viewingCurriculum && (
        <Modal isOpen title={viewingCurriculum.title} subtitle={viewingCurriculum.description} onClose={() => setViewingCurriculum(null)} size="lg">
          <CurriculumTree curriculum={viewingCurriculum} courses={allCourses} enrollmentsMap={myEnrollments} />
        </Modal>
      )}
    </>
  );
}
