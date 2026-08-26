import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { currentUser } from '../../data/mockData';
import { Badge, ProgressBar, Button, Modal, JobLevelBadge, LevelAccessBadge } from '../../components/ui';
import {
  ACCESS_STATE,
  levelDefinition,
  levelShortLabel,
  nextLevelUp,
  normalizeLevel,
  isCourseVisibleInCatalog,
} from '../../data/levelSystem';
import { useCourseStore } from '../../state/CourseStore';
import { getCourseImage } from '../../data/courseImages';
import { divisions } from '../../data/orgHierarchy';

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

const STATUS_GROUP_META = {
  COMPLETED: { label: 'Đã Hoàn Thành', icon: 'ti-circle-check' },
  IN_PROGRESS: { label: 'Đang Học', icon: 'ti-player-play' },
  NOT_STARTED: { label: 'Chưa Bắt Đầu', icon: 'ti-circle-dashed' },
  OVERDUE: { label: 'Quá Hạn', icon: 'ti-alert-triangle' },
  FAILED: { label: 'Cần Thi Lại', icon: 'ti-reload' },
  NOT_ENROLLED: { label: 'Chưa Ghi Danh', icon: 'ti-bookmark-off' },
};

/** Khóa nhóm + nhãn hiển thị cho 1 khóa học theo tiêu chí `groupBy`. */
function courseGroupOf(c, groupBy) {
  switch (groupBy) {
    case 'ORG_UNIT': {
      const a = c.assignment;
      if (!a) return { key: 'ELECTIVE', label: 'Tự Chọn / Bổ Trợ (Elective)', icon: 'ti-sparkles' };
      if (a.assignmentType === 'BUSINESS_UNIT') return { key: 'BU', label: 'Bắt Buộc Toàn Công Ty (MMVN)', icon: 'ti-building-skyscraper' };
      if (a.assignmentType === 'DIVISION') {
        const div = divisions.find((d) => d.id === a.targetDivisionId);
        return { key: `DIV-${a.targetDivisionId}`, label: div ? `Khối ${div.name}` : 'Khối Chuyên Trách', icon: 'ti-building' };
      }
      return { key: `LVLREQ-${a.targetLevel}`, label: `Bắt Buộc Level ${a.targetLevel}`, icon: 'ti-stairs-up' };
    }
    case 'LEVEL':
      return { key: String(c.targetLevel), label: `Level ${c.targetLevel} — ${levelShortLabel(c.targetLevel)}`, icon: 'ti-stairs-up' };
    case 'STATUS': {
      const s = c.enrollment?.status || 'NOT_ENROLLED';
      const meta = STATUS_GROUP_META[s] || STATUS_GROUP_META.NOT_ENROLLED;
      return { key: s, label: meta.label, icon: meta.icon };
    }
    case 'MODALITY': {
      const b = courseFormatBadge(c);
      return { key: b.label, label: b.label, icon: 'ti-device-desktop' };
    }
    case 'DOMAIN':
      return { key: c.domain || c.category || 'Khác', label: c.domain || c.category || 'Khác', icon: 'ti-category' };
    default:
      return { key: 'ALL', label: '', icon: '' };
  }
}

/** Gom danh sách khóa học thành các nhóm hiển thị theo tiêu chí `groupBy`, kèm % tiến độ của từng nhóm. */
function buildCourseGroups(items, groupBy) {
  if (groupBy === 'NONE') return null;
  const map = new Map();
  items.forEach((c) => {
    const g = courseGroupOf(c, groupBy);
    if (!map.has(g.key)) map.set(g.key, { ...g, items: [] });
    map.get(g.key).items.push(c);
  });
  const groups = Array.from(map.values()).map((g) => {
    const completed = g.items.filter((c) => c.enrollment?.status === 'COMPLETED').length;
    const percent = g.items.length ? Math.round((completed / g.items.length) * 100) : 0;
    return { ...g, percent, completed };
  });
  if (groupBy === 'LEVEL') {
    groups.sort((a, b) => Number(b.key) - Number(a.key));
  } else {
    groups.sort((a, b) => b.items.length - a.items.length);
  }
  return groups;
}

// Giữ lại tên export cũ để các màn hình khác tiếp tục import được.
export { JobLevelBadge };

// Huy hiệu phân biệt 3 hình thức học: 🌐 E-Learning tự học, 💻 Lớp Trực Tuyến
// Trực Tiếp (Virtual Class), 🏢 Đào Tạo Trực Tiếp (In-Person/ILT).
function courseFormatBadge(c) {
  const isInPerson = c.deliveryType === 'IN_PERSON_CLASSROOM' || c.modality === 'CLASSROOM_LAB';
  if (isInPerson) return { icon: '🏢', label: 'Trực Tiếp (ILT)', tone: 'blue' };
  if (c.onlineClassType === 'VIRTUAL_CLASS') return { icon: '💻', label: 'Lớp Trực Tuyến Live', tone: 'amber' };
  return { icon: '🌐', label: 'E-Learning', tone: 'sage' };
}

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
    language,
    t,
  } = useCourseStore();

  const user = propUser || authUser || currentUser;
  const userLevel = normalizeLevel(user.level);
  const userLevelDef = levelDefinition(userLevel);
  const oneLevelUp = nextLevelUp(userLevel);

  const enrolledCourses = myCourses(allCourses, user);

  // Scope Tab: MY_COURSES (khóa đã gán) vs FULL_CATALOG (100 khóa toàn doanh nghiệp)
  const [scopeTab, setScopeTab] = useState('MY_COURSES');

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [orgUnitFilter, setOrgUnitFilter] = useState('ALL');
  const [formatFilter, setFormatFilter] = useState('ALL');
  const [viewMode, setViewMode] = useState('TABLE');
  const [showRecommendations, setShowRecommendations] = useState(true);
  const [groupBy, setGroupBy] = useState('NONE');
  const [collapsedGroups, setCollapsedGroups] = useState(() => new Set());

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

  // Full Catalog chỉ hiện khóa cùng cấp/thấp hơn hoặc vượt đúng 1 cấp liền kề —
  // khóa nhảy cóc từ 2 cấp trở lên bị ẩn hoàn toàn khỏi danh mục, không hiện
  // dạng khóa bị chặn nữa (khác với "Khóa Học Của Tôi": khóa đã gán thì luôn
  // hiện đủ, không lọc theo cấp bậc).
  const activeCourseList = scopeTab === 'MY_COURSES'
    ? enrolledCourses
    : allCourses.filter((c) => isCourseVisibleInCatalog(userLevel, c.targetLevel));

  // Bảng tra cứu trạng thái truy cập theo cấp bậc cho danh sách đang hiển thị.
  const accessById = {};
  activeCourseList.forEach((c) => { accessById[c.id] = accessFor(c, user); });

  const filtered = activeCourseList.filter((c) => {
    const s = c.enrollment?.status;
    const access = accessById[c.id];
    const matchStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'MANDATORY' && c.courseType === 'MANDATORY') ||
      (statusFilter === 'IN_PERSON' && (c.deliveryType === 'IN_PERSON_CLASSROOM' || c.modality === 'CLASSROOM_LAB')) ||
      (statusFilter === 'VIRTUAL_CLASS' && c.onlineClassType === 'VIRTUAL_CLASS') ||
      (statusFilter === 'LEVEL_UP' && access.state === ACCESS_STATE.REQUESTABLE) ||
      (statusFilter === 'PENDING_APPROVAL' && access.state === ACCESS_STATE.PENDING_APPROVAL) ||
      s === statusFilter;

    const matchCategory = categoryFilter === 'ALL' || c.category === categoryFilter;
    const matchOrgUnit = orgUnitFilter === 'ALL' || courseGroupOf(c, 'ORG_UNIT').key === orgUnitFilter;
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

  const categoryOptions = [...new Set(allCourses.map((c) => c.category).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  const orgUnitOptionsMap = new Map();
  allCourses.forEach((c) => {
    const g = courseGroupOf(c, 'ORG_UNIT');
    if (!orgUnitOptionsMap.has(g.key)) orgUnitOptionsMap.set(g.key, g.label);
  });
  const orgUnitOptions = Array.from(orgUnitOptionsMap.entries());

  const groups = buildCourseGroups(filtered, groupBy);

  const completedCount = enrolledCourses.filter((c) => c.enrollment?.status === 'COMPLETED').length;
  const inProgressCount = enrolledCourses.filter((c) => c.enrollment?.status === 'IN_PROGRESS').length;
  const overdueCount = enrolledCourses.filter((c) => c.enrollment?.status === 'OVERDUE').length;
  const mandatoryCount = enrolledCourses.filter((c) => c.courseType === 'MANDATORY').length;

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

  const isManagerBand = ['1', '2', '3', '4'].includes(userLevel);
  const isFreshFood = user?.departmentCode === 'PPF' || user?.sectionId?.includes('bakery') || user?.position?.includes('Bakery');
  const isNewHire = user?.status === 'NEW_JOINER';

  // Gợi ý chỉ lấy khóa học viên thực sự vào học được ngay (không gợi ý khóa bị khóa).
  const recommendations = allCourses
    .filter((c) => accessFor(c, user).canAccess)
    .filter((c) => {
      if (isNewHire) return c.code.includes('CULT') || c.code.includes('FSH');
      if (isManagerBand) return c.code.includes('LEAD') || c.code.includes('STOPS');
      if (isFreshFood) return c.code.includes('FSH') || c.code.includes('COLD') || c.code.includes('STOPS');
      return c.courseType === 'MANDATORY';
    })
    .slice(0, 3);

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
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <h1>Chương Trình Đào Tạo &amp; Khóa Học Của Tôi</h1>
            <Badge tone="rail">{enrolledCourses.length} Khóa Học Đang Theo Dõi</Badge>
          </div>
          <p style={{ margin: 0 }}>
            Học viên: <strong>{user.fullName}</strong> &middot; {user.position} &middot; Cấp bậc hiện tại:{' '}
            <strong>{levelShortLabel(userLevel)}</strong> — {userLevelDef.titleVi}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setShowRecommendations(!showRecommendations)} className="btn btn-sm btn-outline" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <i className="ti ti-sparkles" />
            {showRecommendations ? 'Ẩn Gợi Ý Bổ Trợ' : 'Hiện Gợi Ý Bổ Trợ'}
          </button>
          <button onClick={() => setViewMode(viewMode === 'TABLE' ? 'GRID' : 'TABLE')} className="btn btn-sm btn-outline" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <i className={`ti ${viewMode === 'TABLE' ? 'ti-layout-grid' : 'ti-list'}`} />
            {viewMode === 'TABLE' ? 'Dạng Lưới (Grid)' : 'Dạng Bảng (Table)'}
          </button>
        </div>
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

      {/* TOP SCOPE TABS */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, borderBottom: '1px solid var(--line)', paddingBottom: 10, flexWrap: 'wrap' }}>
        <button
          onClick={() => { setScopeTab('MY_COURSES'); setStatusFilter('ALL'); }}
          className="btn btn-sm"
          style={{
            background: scopeTab === 'MY_COURSES' ? 'var(--blue)' : 'var(--paper-raised)',
            color: scopeTab === 'MY_COURSES' ? '#fff' : 'var(--ink)',
            borderColor: scopeTab === 'MY_COURSES' ? 'var(--blue)' : 'var(--line-strong)',
            fontWeight: scopeTab === 'MY_COURSES' ? 700 : 500,
            display: 'flex', alignItems: 'center', gap: 6,
          }}
        >
          <i className="ti ti-bookmark" />
          <span>Khóa Học Của Tôi (Level {userLevel})</span>
          <Badge tone={scopeTab === 'MY_COURSES' ? 'slate' : 'blue'}>{enrolledCourses.length}</Badge>
        </button>

        <button
          onClick={() => { setScopeTab('FULL_CATALOG'); setStatusFilter('ALL'); }}
          className="btn btn-sm"
          style={{
            background: scopeTab === 'FULL_CATALOG' ? 'var(--blue)' : 'var(--paper-raised)',
            color: scopeTab === 'FULL_CATALOG' ? '#fff' : 'var(--ink)',
            borderColor: scopeTab === 'FULL_CATALOG' ? 'var(--blue)' : 'var(--line-strong)',
            fontWeight: scopeTab === 'FULL_CATALOG' ? 700 : 500,
            display: 'flex', alignItems: 'center', gap: 6,
          }}
        >
          <i className="ti ti-books" />
          <span>Toàn Bộ Thư Viện Doanh Nghiệp (Level 7 → Level 1)</span>
          <Badge tone={scopeTab === 'FULL_CATALOG' ? 'slate' : 'blue'}>{allCourses.length} Khóa</Badge>
        </button>
      </div>

      {/* SMART RECOMMENDATION BANNER */}
      {showRecommendations && recommendations.length > 0 && (
        <div className="card card-pad" style={{ background: 'linear-gradient(135deg, #FAFDF5 0%, #F0FDF4 100%)', borderLeft: '4px solid var(--sage)', marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--sage-soft)', color: 'var(--sage)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className="ti ti-sparkles" />
              </div>
              <span style={{ fontWeight: 800, fontSize: 13.5, color: 'var(--sage)' }}>
                Khóa Bổ Trợ Đề Xuất — vào học được ngay ở cấp bậc của bạn
              </span>
            </div>
            <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
              {isManagerBand ? 'Lộ trình Lãnh đạo & Kèm cặp 70/20/10' : 'Tiêu chuẩn Thực phẩm Tươi sống & Vận hành quầy'}
            </span>
          </div>

          <div className="grid grid-3" style={{ gap: 12 }}>
            {recommendations.map((rec) => (
              <div key={rec.id} className="card card-pad" style={{ background: '#fff', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--ink-faint)' }}>{rec.code}</span>
                    <JobLevelBadge level={rec.targetLevel} compact />
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--ink)', marginBottom: 6, lineHeight: 1.4 }}>{rec.title}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--ink-soft)', marginBottom: 10 }}>
                    Thời lượng: {rec.estimatedHours || '3h'} &middot; Điểm đạt: {rec.passingScore || 80}%
                  </div>
                </div>
                <Button size="sm" variant="outline" icon="ti-player-play" onClick={() => handleStart(rec, accessFor(rec, user))}>
                  Vào Học Ngay
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* FILTER BAR */}
      <div className="card card-pad" style={{ marginBottom: 20 }}>
        {scopeTab === 'MY_COURSES' ? (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 14 }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {[
                { id: 'ALL', label: 'Tất Cả Khóa Đã Gán', count: enrolledCourses.length },
                { id: 'IN_PROGRESS', label: 'Đang Học', count: inProgressCount },
                { id: 'COMPLETED', label: 'Đã Hoàn Thành', count: completedCount },
                { id: 'OVERDUE', label: 'Quá Hạn', count: overdueCount },
                { id: 'MANDATORY', label: 'Bắt Buộc Tuân Thủ', count: mandatoryCount },
                { id: 'IN_PERSON', label: '🏢 Đào Tạo Trực Tiếp (In-Person)', count: enrolledCourses.filter((c) => c.deliveryType === 'IN_PERSON_CLASSROOM' || c.modality === 'CLASSROOM_LAB').length },
                { id: 'VIRTUAL_CLASS', label: '💻 Lớp Trực Tuyến (Webinar/Live Class)', count: enrolledCourses.filter((c) => c.onlineClassType === 'VIRTUAL_CLASS').length },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setStatusFilter(tab.id)}
                  className={`btn btn-sm ${statusFilter === tab.id ? 'btn-primary' : 'btn-outline'}`}
                  style={{
                    fontSize: 12, display: 'flex', alignItems: 'center', gap: 6,
                    borderColor: statusFilter === tab.id ? 'var(--blue)' : 'var(--line)',
                    background: statusFilter === tab.id ? 'var(--blue)' : 'transparent',
                    color: statusFilter === tab.id ? '#fff' : 'var(--ink)',
                  }}
                >
                  {tab.label}
                  <span style={{
                    background: statusFilter === tab.id ? 'rgba(255,255,255,0.3)' : 'var(--paper-sunken)',
                    color: statusFilter === tab.id ? '#fff' : 'var(--ink-soft)',
                    padding: '1px 6px', borderRadius: 10, fontSize: 10.5, fontWeight: 700,
                  }}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 14 }}>
            <div style={{ fontSize: 13, color: 'var(--ink-soft)' }}>
              <i className="ti ti-info-circle" style={{ color: 'var(--blue)', marginRight: 4 }} />
              Hiện <strong>{activeCourseList.length}/{allCourses.length} khóa học</strong> (đã ẩn {hardLockedCount} khóa nhảy cóc ≥ 2 cấp).
              Thang cấp bậc <strong>đảo ngược</strong>: Level 7 thấp nhất → Level 1 cao nhất.
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button
                onClick={() => setStatusFilter(statusFilter === 'LEVEL_UP' ? 'ALL' : 'LEVEL_UP')}
                className={`btn btn-sm ${statusFilter === 'LEVEL_UP' ? 'btn-primary' : 'btn-outline'}`}
                style={{ fontSize: 12, fontWeight: 700 }}
              >
                🔒 Xin Học Vượt 1 Cấp (Level {oneLevelUp || '—'}) ({requestableCount})
              </button>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', width: 260 }}>
            <i className="ti ti-search" style={{ position: 'absolute', left: 10, top: 10, color: 'var(--ink-faint)', fontSize: 14 }} />
            <input
              type="text"
              className="field-input"
              style={{ paddingLeft: 32, height: 34, fontSize: 12.5 }}
              placeholder={language === 'en' ? 'Search course code, title, domain...' : 'Tìm mã khóa, tiêu đề...'}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <select className="field-select" style={{ height: 34, fontSize: 12, width: 190, flexShrink: 0 }} value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
            <option value="ALL">{language === 'en' ? `All Categories (${categoryOptions.length})` : `Tất cả Danh Mục (${categoryOptions.length})`}</option>
            {categoryOptions.map((cat) => (<option key={cat} value={cat}>{cat}</option>))}
          </select>

          <select className="field-select" style={{ height: 34, fontSize: 12, width: 190, flexShrink: 0 }} value={orgUnitFilter} onChange={(e) => setOrgUnitFilter(e.target.value)}>
            <option value="ALL">{language === 'en' ? 'All Org Units / Sources' : 'Tất cả Phòng Ban Giao'}</option>
            {orgUnitOptions.map(([key, label]) => (<option key={key} value={key}>{label}</option>))}
          </select>

          <select className="field-select" style={{ height: 34, fontSize: 12, width: 150, flexShrink: 0 }} value={formatFilter} onChange={(e) => setFormatFilter(e.target.value)}>
            <option value="ALL">{language === 'en' ? 'All Formats' : 'Tất cả Định dạng'}</option>
            <option value="SCORM">SCORM Package</option>
            <option value="Video">Interactive Video</option>
            <option value="PPT">Interactive PPT</option>
            <option value="CLASSROOM_LAB">{language === 'en' ? 'Classroom Lab (ILT)' : 'Thực Hành Xưởng (ILT)'}</option>
            <option value="EXTERNAL_PLATFORM">LinkedIn / Coursera</option>
            <option value="VIRTUAL_CLASS">💻 {language === 'en' ? 'Virtual Live Class (Webinar)' : 'Lớp Trực Tuyến (Webinar/Live Class)'}</option>
          </select>

          <select
            className="field-select"
            style={{ height: 34, fontSize: 12, width: 200, flexShrink: 0, fontWeight: 600 }}
            value={groupBy}
            onChange={(e) => { setGroupBy(e.target.value); setCollapsedGroups(new Set()); }}
            title="Gộp Nhóm (Group By)"
          >
            {GROUP_BY_OPTIONS.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.id === 'NONE' ? '📋 ' : '🗂️ '}Gộp nhóm: {opt.label}
              </option>
            ))}
          </select>
        </div>
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
                    <th style={{ width: 96 }}>{language === 'en' ? 'Level' : 'Cấp Bậc'}</th>
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
                      <td colSpan={7} style={{ textAlign: 'center', padding: '32px 0', color: 'var(--ink-soft)' }}>
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

                      <td><JobLevelBadge level={c.targetLevel} title={c.targetLevelTitle} compact /></td>
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
                        {enr ? (
                          <Badge tone={stConfig.tone} icon={isCompleted ? 'ti-circle-check' : isFailed ? 'ti-alert-circle' : undefined}>
                            {stConfig.label}
                          </Badge>
                        ) : (
                          <Badge tone="slate">Chưa Ghi Danh</Badge>
                        )}
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
                  <div style={{ position: 'absolute', top: 8, right: 8 }}>
                    <JobLevelBadge level={c.targetLevel} compact />
                  </div>
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
                      <span style={{ fontSize: 11.5, color: 'var(--ink-soft)' }}>{c.estimatedHours || '3h'}</span>
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
                    {scopeTab === 'MY_COURSES' && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 130 }}>
                        <div style={{ width: 80 }}>
                          <ProgressBar value={g.percent} tone={g.percent === 100 ? 'sage' : 'amber'} size="sm" />
                        </div>
                        <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--ink-soft)' }}>{g.percent}%</span>
                      </div>
                    )}
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
    </>
  );
}
