import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { currentUser } from '../../data/mockData';
import { Badge, ProgressBar, Button, Modal, JobLevelBadge, LevelAccessBadge } from '../../components/ui';
import {
  ACCESS_STATE,
  LEVEL_DEFINITIONS,
  levelDefinition,
  levelShortLabel,
  nextLevelUp,
  normalizeLevel,
  isCourseVisibleInCatalog,
} from '../../data/levelSystem';
import { useCourseStore } from '../../state/CourseStore';

// Giữ lại tên export cũ để các màn hình khác tiếp tục import được.
export { JobLevelBadge };

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
  const [levelFilter, setLevelFilter] = useState('ALL');
  const [domainFilter, setDomainFilter] = useState('ALL');
  const [formatFilter, setFormatFilter] = useState('ALL');
  const [viewMode, setViewMode] = useState('TABLE');
  const [showRecommendations, setShowRecommendations] = useState(true);

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
      (statusFilter === 'LEVEL_UP' && access.state === ACCESS_STATE.REQUESTABLE) ||
      (statusFilter === 'PENDING_APPROVAL' && access.state === ACCESS_STATE.PENDING_APPROVAL) ||
      s === statusFilter;

    const matchLevel = levelFilter === 'ALL' || normalizeLevel(c.targetLevel) === String(levelFilter);
    const matchDomain = domainFilter === 'ALL' || c.domain === domainFilter || c.category === domainFilter;
    const matchFormat = formatFilter === 'ALL' || c.format?.includes(formatFilter) || c.modality === formatFilter;
    const matchSearch =
      !search ||
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.code.toLowerCase().includes(search.toLowerCase()) ||
      c.category.toLowerCase().includes(search.toLowerCase()) ||
      (c.domain && c.domain.toLowerCase().includes(search.toLowerCase()));

    return matchStatus && matchLevel && matchDomain && matchFormat && matchSearch;
  });

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
          onClick={() => { setScopeTab('MY_COURSES'); setStatusFilter('ALL'); setLevelFilter('ALL'); }}
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
          onClick={() => { setScopeTab('FULL_CATALOG'); setStatusFilter('ALL'); setLevelFilter('ALL'); }}
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
              placeholder="Tìm mã khóa, tiêu đề..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* BỘ LỌC 7 CẤP BẬC (7 thấp nhất -> 1 cao nhất) */}
          <select
            className="field-select"
            style={{ height: 34, fontSize: 12, minWidth: 230, fontWeight: 600, borderColor: 'var(--blue)' }}
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
          >
            <option value="ALL">🎯 Tất cả Cấp Bậc (Level 7 → Level 1)</option>
            {[...LEVEL_DEFINITIONS].reverse().map((def) => (
              <option key={def.level} value={def.level}>
                {def.emoji} Level {def.level}: {def.shortVi}
              </option>
            ))}
          </select>

          <select className="field-select" style={{ height: 34, fontSize: 12, minWidth: 170 }} value={domainFilter} onChange={(e) => setDomainFilter(e.target.value)}>
            <option value="ALL">Tất cả Chuyên ngành (12 Domains)</option>
            <option value="Food Safety & Hygiene">Food Safety &amp; Hygiene</option>
            <option value="Information Security">Information Security</option>
            <option value="Health & Safety">Health &amp; Safety</option>
            <option value="Cold Chain">Cold Chain</option>
            <option value="Store Operations">Store Operations</option>
            <option value="Leadership">Leadership &amp; Management</option>
            <option value="Supply Chain">Supply Chain &amp; Logistics</option>
            <option value="Merchandising">Merchandising</option>
            <option value="E-Commerce">Digital &amp; E-Commerce</option>
          </select>

          <select className="field-select" style={{ height: 34, fontSize: 12, minWidth: 140 }} value={formatFilter} onChange={(e) => setFormatFilter(e.target.value)}>
            <option value="ALL">Tất cả Định dạng</option>
            <option value="SCORM">SCORM Package</option>
            <option value="Video">Interactive Video</option>
            <option value="PPT">Interactive PPT</option>
            <option value="CLASSROOM_LAB">Thực Hành Xưởng (ILT)</option>
            <option value="EXTERNAL_PLATFORM">LinkedIn / Coursera</option>
          </select>
        </div>
      </div>

      {/* TABLE VIEW */}
      {viewMode === 'TABLE' ? (
        <div className="card" style={{ overflowX: 'auto', marginBottom: 20 }}>
          <table className="table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th>Khóa Học</th>
                <th style={{ width: 96 }}>Cấp Bậc</th>
                <th style={{ width: 118 }}>Truy Cập</th>
                <th style={{ width: 150 }}>Định Dạng</th>
                <th style={{ width: 112 }}>Tiến Độ</th>
                <th style={{ width: 104 }}>Trạng Thái</th>
                <th style={{ textAlign: 'right' }}>Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '32px 0', color: 'var(--ink-soft)' }}>
                    Không tìm thấy khóa học nào phù hợp với bộ lọc.
                  </td>
                </tr>
              ) : (
                filtered.map((c) => {
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
                      </td>

                      <td><JobLevelBadge level={c.targetLevel} title={c.targetLevelTitle} compact /></td>
                      <td><LevelAccessBadge access={access} /></td>

                      <td>
                        <div style={{ fontSize: 12, fontWeight: 600 }}>
                          {isInPerson ? (
                            <span style={{ color: 'var(--blue)' }}><i className="ti ti-building-store" style={{ marginRight: 4 }} /> Xưởng ILT</span>
                          ) : (
                            <span>{c.format || 'E-learning Online'}</span>
                          )}
                        </div>
                        {isInPerson && c.trainerName && (
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
      ) : (
        /* GRID VIEW */
        <div className="grid grid-3" style={{ gap: 16, marginBottom: 20 }}>
          {filtered.map((c) => {
            const enr = c.enrollment;
            const access = accessById[c.id];
            const isCompleted = enr?.status === 'COMPLETED';
            const def = levelDefinition(c.targetLevel);
            const isBlocked = access.state === ACCESS_STATE.LOCKED_LEVEL_GAP;

            return (
              <div
                key={c.id}
                className="card card-pad"
                style={{
                  display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                  borderTop: `3px solid ${def.colors.border}`,
                  opacity: isBlocked ? 0.62 : 1,
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--ink-faint)' }}>{c.code}</span>
                    <JobLevelBadge level={c.targetLevel} compact />
                  </div>
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
            );
          })}
        </div>
      )}

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
